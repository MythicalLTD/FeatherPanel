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
 * cron runner and the other cron jobs are never held up by a long offset.
 *
 * Progress is written before a task is sent, so a crash or timeout can never
 * make a task run twice, and a tick lease (see {@see ScheduleChainStore::claim()})
 * stops two overlapping cron runs from handling the same schedule.
 *
 * A failed task stops the chain unless that task has continue_on_failure set.
 */
final class ScheduleChainRunner
{
    /** How long one tick may hold a schedule before another run may take it over. */
    public const LEASE_SECONDS = 600;

    public const STATUS_BUSY = 'busy';
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
        $schedule = $this->store->claim($scheduleId, $now, $now + self::LEASE_SECONDS);
        if ($schedule === null) {
            return $result;
        }

        try {
            $inChain = (int) ($schedule['is_processing'] ?? 0) === 1 && !empty($schedule['chain_next_at']);

            if (!$inChain) {
                if ($canStart !== null && !$canStart($schedule)) {
                    $this->store->save($scheduleId, [
                        'next_run_at' => $nextRunAt($schedule, self::format($now)),
                        'chain_locked_until' => null,
                    ]);
                    $result['status'] = self::STATUS_SKIPPED;

                    return $result;
                }
            }

            $tasks = self::sortTasks($loadTasks());
            $result['total'] = count($tasks);

            if (!$inChain) {
                // Move next_run_at on right away, so the next occurrence is already
                // known while the chain is still working through its offsets.
                $plannedNextRun = $nextRunAt($schedule, (string) ($schedule['next_run_at'] ?? self::format($now)));
                if ($tasks === []) {
                    $this->finish($scheduleId, $plannedNextRun, $nextRunAt, $schedule);
                    $result['status'] = self::STATUS_EMPTY;

                    return $result;
                }

                $lastSequence = null;
                $dueAt = $now + self::offsetOf($tasks[0]);
                $this->store->save($scheduleId, [
                    'is_processing' => 1,
                    'next_run_at' => $plannedNextRun,
                    'chain_next_at' => self::format($dueAt),
                    'chain_last_sequence' => null,
                    'chain_executed' => 0,
                    'chain_failed' => 0,
                ]);
            } else {
                $plannedNextRun = (string) ($schedule['next_run_at'] ?? '');
                $lastSequence = $schedule['chain_last_sequence'] !== null ? (int) $schedule['chain_last_sequence'] : null;
                $dueAt = self::parse((string) $schedule['chain_next_at']);
                $result['executed'] = (int) ($schedule['chain_executed'] ?? 0);
                $result['failed'] = (int) ($schedule['chain_failed'] ?? 0);
            }

            while (true) {
                $task = self::nextTask($tasks, $lastSequence);
                if ($task === null) {
                    $this->finish($scheduleId, $plannedNextRun, $nextRunAt, $schedule);
                    $result['status'] = self::STATUS_FINISHED;

                    return $result;
                }

                $now = $this->now();
                if ($dueAt > $now) {
                    $this->store->save($scheduleId, ['chain_locked_until' => null]);
                    $result['status'] = self::STATUS_WAITING;

                    return $result;
                }

                // Record the task as taken before it runs. If this process dies while
                // the task runs, the next tick moves on instead of sending it again.
                $sequence = (int) $task['sequence_id'];
                $following = self::nextTask($tasks, $sequence);
                $this->store->save($scheduleId, [
                    'chain_last_sequence' => $sequence,
                    'chain_next_at' => self::format($now + ($following !== null ? self::offsetOf($following) : 0)),
                    'chain_locked_until' => self::format($now + self::LEASE_SECONDS),
                ]);
                $lastSequence = $sequence;

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
                        $this->finish($scheduleId, $plannedNextRun, $nextRunAt, $schedule);
                        $result['status'] = self::STATUS_ABORTED;

                        return $result;
                    }
                }

                if ($following === null) {
                    $this->finish($scheduleId, $plannedNextRun, $nextRunAt, $schedule);
                    $result['status'] = self::STATUS_FINISHED;

                    return $result;
                }

                // The next offset counts from when this task finished.
                $dueAt = $this->now() + self::offsetOf($following);
                $this->store->save($scheduleId, [
                    'chain_next_at' => self::format($dueAt),
                    'chain_executed' => $result['executed'],
                    'chain_failed' => $result['failed'],
                ]);
            }
        } catch (\Throwable $e) {
            // Give the lease back so the next tick can retry without waiting for it to expire.
            try {
                $this->store->save($scheduleId, ['chain_locked_until' => null]);
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
     * First task after the given sequence id (the first task when null).
     *
     * @param list<array> $sortedTasks
     */
    public static function nextTask(array $sortedTasks, ?int $afterSequence): ?array
    {
        foreach ($sortedTasks as $task) {
            if ($afterSequence === null || (int) $task['sequence_id'] > $afterSequence) {
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
     * End the run: clear the chain, store last_run_at and make sure next_run_at
     * is in the future so a long chain does not start again right away.
     */
    private function finish(int $scheduleId, string $plannedNextRun, callable $nextRunAt, array $schedule): void
    {
        $now = $this->now();
        $nextRun = $plannedNextRun;
        if ($nextRun === '' || self::parse($nextRun) <= $now) {
            $nextRun = $nextRunAt($schedule, self::format($now));
        }

        $this->store->save($scheduleId, [
            'is_processing' => 0,
            'next_run_at' => $nextRun,
            'last_run_at' => self::format($now),
            'chain_next_at' => null,
            'chain_last_sequence' => null,
            'chain_executed' => 0,
            'chain_failed' => 0,
            'chain_locked_until' => null,
        ]);
    }
}
