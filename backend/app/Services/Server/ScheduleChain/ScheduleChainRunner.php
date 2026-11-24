<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

namespace App\Services\Server\ScheduleChain;

/**
 * Runs a server schedule's tasks in sequence_id order without blocking.
 *
 * Each cron tick calls {@see tick()}. It runs every task that is due right now
 * and then stores when the next task is due (from that task's time_offset), so
 * a later tick picks the chain up where it stopped. Nothing ever sleeps, so the
 * cron runner and the other cron jobs are never held up by a long offset. A
 * time_offset is the earliest time a task may run: with a once-a-minute cron a
 * task whose offset ends between two runs is sent by the next run.
 *
 * Each run keeps the ids of the tasks it already sent, so reordering or editing
 * tasks while a run waits never sends a task twice or skips the ones left.
 * A task is recorded as sent before it is sent, so a crash or timeout never
 * makes it run twice (Wings commands and power actions cannot be de-duplicated,
 * so a lost task is preferred over a repeated restart or announcement).
 *
 * A tick only works on a schedule after taking its lease with a fresh claim
 * token ({@see ScheduleChainStore::claim()}), and every write checks the token.
 * When the schedule is deleted or turned off, or the lease ran out and another
 * run took over, the write fails and the tick stops before sending anything.
 *
 * A failed task stops the chain unless that task has continue_on_failure set.
 */
final class ScheduleChainRunner
{
    /** How long one tick may hold a schedule before another run may take it over. */
    public const LEASE_SECONDS = 600;

    public const STATUS_BUSY = 'busy';
    public const STATUS_LOST = 'lost';
    public const STATUS_SKIPPED = 'skipped';
    public const STATUS_WAITING = 'waiting';
    public const STATUS_FINISHED = 'finished';
    public const STATUS_ABORTED = 'aborted';
    public const STATUS_EMPTY = 'empty';

    /** @var \Closure(): int */
    private \Closure $clock;

    /**
     * @param (callable(): int)|null $clock returns the current Unix time
     */
    public function __construct(private ScheduleChainStore $store, ?callable $clock = null)
    {
        $this->clock = $clock !== null ? \Closure::fromCallable($clock) : static fn (): int => time();
    }

    /**
     * Handle one cron tick for a schedule.
     *
     * @param callable(): array $loadTasks returns the schedule's tasks
     * @param callable(array): void $executeTask runs one task, throws on failure
     * @param callable(array, string): string $nextRunAt next cron occurrence (UTC `Y-m-d H:i:s`) for the schedule after the given reference time
     * @param (callable(array): bool)|null $canStart called before a new run starts; false skips this occurrence
     *
     * @return array{status: string, executed: int, failed: int, total: int, ran: list<int>, failed_task_id: int|null}
     */
    public function tick(int $scheduleId, callable $loadTasks, callable $executeTask, callable $nextRunAt, ?callable $canStart = null): array
    {
        $result = ['status' => self::STATUS_BUSY, 'executed' => 0, 'failed' => 0, 'total' => 0, 'ran' => [], 'failed_task_id' => null];

        $now = $this->now();
        $token = bin2hex(random_bytes(16));
        $schedule = $this->store->claim($scheduleId, $now, $now + self::LEASE_SECONDS, $token);
        if ($schedule === null) {
            return $result;
        }

        try {
            $inChain = (int) ($schedule['is_processing'] ?? 0) === 1 && !empty($schedule['chain_next_at']);

            if (!$inChain && $canStart !== null && !$canStart($schedule)) {
                $this->save($scheduleId, $token, [
                    'next_run_at' => $nextRunAt($schedule, self::format($now)),
                    'chain_locked_until' => null,
                    'chain_claim' => null,
                ]);
                $result['status'] = self::STATUS_SKIPPED;

                return $result;
            }

            $tasks = self::sortTasks($loadTasks());
            $result['total'] = count($tasks);

            if (!$inChain) {
                // Move next_run_at on right away, so the next occurrence is already
                // known while the chain is still working through its offsets.
                $plannedNextRun = $nextRunAt($schedule, (string) ($schedule['next_run_at'] ?? self::format($now)));
                if ($tasks === []) {
                    $this->finish($scheduleId, $token, $plannedNextRun, $nextRunAt, $schedule);
                    $result['status'] = self::STATUS_EMPTY;

                    return $result;
                }

                $done = [];
                $dueAt = $now + self::offsetOf($tasks[0]);
                $this->save($scheduleId, $token, [
                    'is_processing' => 1,
                    'next_run_at' => $plannedNextRun,
                    'chain_next_at' => self::format($dueAt),
                    'chain_done_tasks' => '[]',
                    'chain_executed' => 0,
                    'chain_failed' => 0,
                ]);
            } else {
                $plannedNextRun = (string) ($schedule['next_run_at'] ?? '');
                $done = self::decodeDone($schedule['chain_done_tasks'] ?? null);
                $dueAt = self::parse((string) $schedule['chain_next_at']);
                $result['executed'] = (int) ($schedule['chain_executed'] ?? 0);
                $result['failed'] = (int) ($schedule['chain_failed'] ?? 0);
            }

            while (true) {
                $task = self::nextTask($tasks, $done);
                if ($task === null) {
                    $this->finish($scheduleId, $token, $plannedNextRun, $nextRunAt, $schedule);
                    $result['status'] = self::STATUS_FINISHED;

                    return $result;
                }

                $now = $this->now();
                if ($dueAt > $now) {
                    $this->save($scheduleId, $token, ['chain_locked_until' => null, 'chain_claim' => null]);
                    $result['status'] = self::STATUS_WAITING;

                    return $result;
                }

                // Record the task as sent before it runs (and renew the lease). If this
                // process dies while the task runs, the next tick moves on instead of
                // sending it again. If the claim is gone, nothing is sent.
                $done[] = (int) $task['id'];
                $following = self::nextTask($tasks, $done);
                $this->save($scheduleId, $token, [
                    'chain_done_tasks' => json_encode($done),
                    'chain_next_at' => self::format($now + ($following !== null ? self::offsetOf($following) : 0)),
                    'chain_locked_until' => self::format($now + self::LEASE_SECONDS),
                ]);

                $ok = true;
                try {
                    $executeTask($task);
                } catch (\Throwable $e) {
                    $ok = false;
                }
                $result['ran'][] = (int) $task['id'];

                if ($ok) {
                    ++$result['executed'];
                } else {
                    ++$result['failed'];
                    if (!self::continuesOnFailure($task)) {
                        $result['failed_task_id'] = (int) $task['id'];
                        $this->finish($scheduleId, $token, $plannedNextRun, $nextRunAt, $schedule);
                        $result['status'] = self::STATUS_ABORTED;

                        return $result;
                    }
                }

                if ($following === null) {
                    $this->finish($scheduleId, $token, $plannedNextRun, $nextRunAt, $schedule);
                    $result['status'] = self::STATUS_FINISHED;

                    return $result;
                }

                // The next offset counts from when this task finished.
                $dueAt = $this->now() + self::offsetOf($following);
                $this->save($scheduleId, $token, [
                    'chain_next_at' => self::format($dueAt),
                    'chain_executed' => $result['executed'],
                    'chain_failed' => $result['failed'],
                ]);
            }
        } catch (ScheduleChainLostException) {
            // Deleted, turned off or taken over: stop here, there is nothing of ours to release.
            $result['status'] = self::STATUS_LOST;

            return $result;
        } catch (\Throwable $e) {
            // Give the lease back so the next tick can retry without waiting for it to expire.
            try {
                $this->store->save($scheduleId, $token, ['chain_locked_until' => null, 'chain_claim' => null]);
            } catch (\Throwable) {
            }

            throw $e;
        }
    }

    /**
     * Tasks ordered by sequence_id (then id, so equal sequence ids stay stable).
     *
     * @param array<int, array> $tasks
     *
     * @return list<array>
     */
    public static function sortTasks(array $tasks): array
    {
        $tasks = array_values($tasks);
        usort($tasks, static fn (array $a, array $b): int => [(int) $a['sequence_id'], (int) $a['id']] <=> [(int) $b['sequence_id'], (int) $b['id']]);

        return $tasks;
    }

    /**
     * First task (in order) that this run has not sent yet.
     *
     * @param list<array> $sortedTasks
     * @param list<int> $doneTaskIds
     */
    public static function nextTask(array $sortedTasks, array $doneTaskIds): ?array
    {
        foreach ($sortedTasks as $task) {
            if (!in_array((int) $task['id'], $doneTaskIds, true)) {
                return $task;
            }
        }

        return null;
    }

    public static function format(int $timestamp): string
    {
        return gmdate('Y-m-d H:i:s', $timestamp);
    }

    public static function parse(string $utc): int
    {
        $parsed = \DateTimeImmutable::createFromFormat('!Y-m-d H:i:s', $utc, new \DateTimeZone('UTC'));

        return $parsed !== false ? $parsed->getTimestamp() : 0;
    }

    /**
     * @return list<int>
     */
    private static function decodeDone(mixed $raw): array
    {
        $decoded = is_string($raw) && $raw !== '' ? json_decode($raw, true) : [];
        if (!is_array($decoded)) {
            return [];
        }

        return array_values(array_map('intval', array_filter($decoded, 'is_numeric')));
    }

    private static function offsetOf(array $task): int
    {
        return max(0, (int) ($task['time_offset'] ?? 0));
    }

    private static function continuesOnFailure(array $task): bool
    {
        $value = $task['continue_on_failure'] ?? 0;

        return $value === true || (is_numeric($value) && (int) $value === 1) || $value === 'true';
    }

    private function now(): int
    {
        return ($this->clock)();
    }

    /**
     * Write through the claim; throws when the claim is gone.
     *
     * @param array<string, int|string|null> $fields
     */
    private function save(int $scheduleId, string $token, array $fields): void
    {
        if (!$this->store->save($scheduleId, $token, $fields)) {
            throw new ScheduleChainLostException();
        }
    }

    /**
     * End the run: clear the chain, store last_run_at and make sure next_run_at
     * is in the future so a long chain does not start again right away.
     */
    private function finish(int $scheduleId, string $token, string $plannedNextRun, callable $nextRunAt, array $schedule): void
    {
        $now = $this->now();
        $nextRun = $plannedNextRun;
        if ($nextRun === '' || self::parse($nextRun) <= $now) {
            $nextRun = $nextRunAt($schedule, self::format($now));
        }

        $this->save($scheduleId, $token, [
            'is_processing' => 0,
            'next_run_at' => $nextRun,
            'last_run_at' => self::format($now),
            'chain_next_at' => null,
            'chain_done_tasks' => null,
            'chain_executed' => 0,
            'chain_failed' => 0,
            'chain_locked_until' => null,
            'chain_claim' => null,
        ]);
    }
}
