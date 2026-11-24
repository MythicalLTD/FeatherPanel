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

namespace Tests\Services\Server;

use PHPUnit\Framework\TestCase;
use App\Services\Server\ScheduleChain\ScheduleChainStore;
use App\Services\Server\ScheduleChain\ScheduleChainRunner as Runner;

/**
 * In-memory store with the same claim rules as ServerSchedule::claimForTick().
 */
final class InMemoryScheduleChainStore implements ScheduleChainStore
{
    /** @var array<int, array<string, mixed>> */
    public array $rows = [];

    public function claim(int $scheduleId, int $now, int $leaseUntil): ?array
    {
        $row = $this->rows[$scheduleId] ?? null;
        if ($row === null || !self::isDue($row, $now)) {
            return null;
        }
        $this->rows[$scheduleId]['chain_locked_until'] = Runner::format($leaseUntil);

        return $this->rows[$scheduleId];
    }

    public function save(int $scheduleId, array $fields): void
    {
        $this->rows[$scheduleId] = array_merge($this->rows[$scheduleId], $fields);
    }

    /** Mirrors ServerSchedule::dueCondition(). */
    public static function isDue(array $row, int $now): bool
    {
        if ((int) $row['is_active'] !== 1) {
            return false;
        }
        if ($row['chain_locked_until'] !== null && Runner::parse($row['chain_locked_until']) > $now) {
            return false;
        }
        if ((int) $row['is_processing'] === 0) {
            return $row['next_run_at'] !== null && Runner::parse($row['next_run_at']) <= $now;
        }

        return $row['chain_next_at'] !== null && Runner::parse($row['chain_next_at']) <= $now;
    }
}

final class ScheduleChainRunnerTest extends TestCase
{
    private const ID = 7;
    private const START = 1_800_000_000; // a whole minute

    private InMemoryScheduleChainStore $store;
    private int $now;
    /** @var list<array{0: int, 1: int}> task id + time it ran */
    private array $log = [];
    /** @var array<int, array<string, mixed>> */
    private array $tasks = [];
    /** @var list<int> task ids that fail */
    private array $failing = [];

    protected function setUp(): void
    {
        $this->store = new InMemoryScheduleChainStore();
        $this->now = self::START;
        $this->log = [];
        $this->failing = [];
        // The schedule from issue #483: three announcements, whitelist, restart.
        $this->tasks = [
            ['id' => 11, 'sequence_id' => 1, 'action' => 'command', 'payload' => 'say closing in 30 minutes', 'time_offset' => 0, 'continue_on_failure' => 0],
            ['id' => 12, 'sequence_id' => 2, 'action' => 'command', 'payload' => 'say closing in 15 minutes', 'time_offset' => 900, 'continue_on_failure' => 0],
            ['id' => 13, 'sequence_id' => 3, 'action' => 'command', 'payload' => 'say closing in 5 minutes', 'time_offset' => 600, 'continue_on_failure' => 0],
            ['id' => 14, 'sequence_id' => 4, 'action' => 'command', 'payload' => 'whitelist on', 'time_offset' => 300, 'continue_on_failure' => 0],
            ['id' => 15, 'sequence_id' => 5, 'action' => 'restart', 'payload' => '', 'time_offset' => 0, 'continue_on_failure' => 0],
        ];
        // Daily at 03:00 UTC, due now.
        $this->store->rows[self::ID] = [
            'id' => self::ID,
            'name' => 'Nightly restart',
            'cron_minute' => '0', 'cron_hour' => '3', 'cron_day_of_month' => '*', 'cron_month' => '*', 'cron_day_of_week' => '*',
            'is_active' => 1,
            'is_processing' => 0,
            'only_when_online' => 0,
            'last_run_at' => null,
            'next_run_at' => Runner::format(self::START),
            'chain_next_at' => null,
            'chain_last_sequence' => null,
            'chain_executed' => 0,
            'chain_failed' => 0,
            'chain_locked_until' => null,
        ];
    }

    public function testIssueScheduleRunsEachTaskOnceInOrderAcrossTicks(): void
    {
        $first = $this->tick();
        $this->assertSame(Runner::STATUS_WAITING, $first['status']);
        $this->assertSame([11], $first['ran'], 'the first tick only sends the 30 minute announcement');
        $this->assertSame(self::START, $this->now, 'the tick did not wait for the offset');

        $this->runTicksFor(45 * 60);

        $this->assertSame([11, 12, 13, 14, 15], array_column($this->log, 0), 'every task runs exactly once, in order');
        $times = array_column($this->log, 1, 0);
        $this->assertSame(self::START, $times[11]);
        $this->assertSame(self::START + 900, $times[12]);
        $this->assertSame(self::START + 1500, $times[13]);
        $this->assertSame(self::START + 1800, $times[14]);
        $this->assertSame($times[14], $times[15], 'a zero offset task runs in the same tick');

        $row = $this->store->rows[self::ID];
        $this->assertSame(0, $row['is_processing']);
        $this->assertNull($row['chain_next_at']);
        $this->assertNull($row['chain_locked_until']);
        $this->assertSame(Runner::format(self::START + 1800), $row['last_run_at']);
        $this->assertGreaterThan($this->now, Runner::parse($row['next_run_at']));
    }

    public function testOffsetsAreWaitedOutBetweenCronTicksWithoutBlocking(): void
    {
        $this->tick();
        $row = $this->store->rows[self::ID];
        $this->assertSame(1, $row['is_processing'], 'the schedule shows as running for the whole chain');
        $this->assertSame(Runner::format(self::START + 900), $row['chain_next_at']);
        $this->assertSame(1, $row['chain_last_sequence']);
        $this->assertNull($row['chain_locked_until'], 'the lease is given back while waiting');

        // Ticks before the offset has passed do nothing.
        for ($i = 1; $i < 15; ++$i) {
            $this->now = self::START + $i * 60;
            $result = $this->tick();
            $this->assertSame(Runner::STATUS_BUSY, $result['status'], 'not due yet at minute ' . $i);
        }
        $this->assertCount(1, $this->log);

        $this->now = self::START + 900;
        $this->assertSame([12], $this->tick()['ran']);
    }

    public function testOverlappingCronRunCannotRunATaskTwice(): void
    {
        $second = new Runner($this->store, fn (): int => $this->now);
        $nested = null;
        $runner = new Runner($this->store, fn (): int => $this->now);
        $runner->tick(self::ID, fn (): array => $this->tasks, function (array $task) use ($second, &$nested): void {
            $this->log[] = [$task['id'], $this->now];
            // A second cron run starts while the first is still sending the task.
            $nested ??= $second->tick(self::ID, fn (): array => $this->tasks, function (array $t): void {
                $this->log[] = [$t['id'], $this->now];
            }, $this->nextRunAt(...));
        }, $this->nextRunAt(...));

        $this->assertSame(Runner::STATUS_BUSY, $nested['status']);
        $this->assertSame([11], array_column($this->log, 0));
    }

    public function testStaleRowFromAnOverlappingRunDoesNotStartTheChainAgain(): void
    {
        // Two cron runs read the schedule as due. The first one runs task 1.
        $this->tick();
        // The second one only gets to claim it afterwards: it is not due any more.
        $result = $this->tick();
        $this->assertSame(Runner::STATUS_BUSY, $result['status']);
        $this->assertSame([11], array_column($this->log, 0));
    }

    public function testCrashedRunMovesOnInsteadOfRepeatingTheTask(): void
    {
        $this->tick();
        $this->now = self::START + 900;
        // The process is killed while task 2 is being sent: keep the row exactly
        // as it was at that moment, as if nothing after it ever ran.
        $atKill = null;
        $runner = new Runner($this->store, fn (): int => $this->now);
        $runner->tick(self::ID, fn (): array => $this->tasks, function (array $task) use (&$atKill): void {
            $this->log[] = [$task['id'], $this->now];
            $atKill = $this->store->rows[self::ID];
        }, $this->nextRunAt(...));
        $this->store->rows[self::ID] = $atKill;
        $this->assertSame(2, $atKill['chain_last_sequence'], 'progress is stored before the task is sent');
        $this->assertNotNull($atKill['chain_locked_until']);

        // Nothing runs while the dead run's lease is live.
        $this->now += 300;
        $this->assertSame(Runner::STATUS_BUSY, $this->tick()['status']);

        // After the lease runs out the chain continues with task 3, not task 1 or 2.
        $this->now = self::START + 900 + Runner::LEASE_SECONDS;
        $this->assertSame([13], $this->tick()['ran']);
        $this->assertSame([11, 12, 13], array_column($this->log, 0));
    }

    public function testFailedTaskStopsTheChainWithoutContinueOnFailure(): void
    {
        $this->failing = [12];
        $this->runTicksFor(45 * 60);

        $this->assertSame([11, 12], array_column($this->log, 0));
        $row = $this->store->rows[self::ID];
        $this->assertSame(0, $row['is_processing']);
        $this->assertNull($row['chain_next_at']);
        $this->assertSame(Runner::format(self::START + 900), $row['last_run_at']);
    }

    public function testFailedTaskWithContinueOnFailureKeepsGoing(): void
    {
        $this->failing = [12];
        $this->tasks[1]['continue_on_failure'] = 1;
        $results = $this->runTicksFor(45 * 60);

        $this->assertSame([11, 12, 13, 14, 15], array_column($this->log, 0));
        $last = end($results);
        $this->assertSame(Runner::STATUS_FINISHED, $last['status']);
        $this->assertSame(4, $last['executed']);
        $this->assertSame(1, $last['failed']);
    }

    public function testContinueOnFailureAcceptsBooleans(): void
    {
        $this->failing = [11];
        $this->tasks[0]['continue_on_failure'] = true;
        $this->tick();
        $this->assertSame(1, $this->store->rows[self::ID]['is_processing']);
    }

    public function testNewRunDoesNotStartWhileTheChainIsRunning(): void
    {
        // Every minute, but the chain takes 30 minutes.
        $this->store->rows[self::ID]['cron_hour'] = '*';
        $this->store->rows[self::ID]['cron_minute'] = '*';
        $this->tick();
        $this->assertSame(Runner::format(self::START + 60), $this->store->rows[self::ID]['next_run_at']);

        for ($t = 60; $t < 1800; $t += 60) {
            $this->now = self::START + $t;
            $this->tick();
        }
        $this->now = self::START + 1800;
        $this->tick();

        $this->assertSame([11, 12, 13, 14, 15], array_column($this->log, 0));
        $this->assertGreaterThan($this->now, Runner::parse($this->store->rows[self::ID]['next_run_at']), 'missed occurrences are skipped after a long chain');
    }

    public function testTasksRunInSequenceOrderWhateverTheLoadOrder(): void
    {
        foreach ($this->tasks as &$task) {
            $task['time_offset'] = 0;
        }
        unset($task);
        $this->tasks = array_reverse($this->tasks);

        $result = $this->tick();
        $this->assertSame(Runner::STATUS_FINISHED, $result['status']);
        $this->assertSame([11, 12, 13, 14, 15], $result['ran']);
    }

    public function testEditsDuringTheChainArePickedUpBySequence(): void
    {
        $this->tick();
        // Task 2 is deleted and a new task is added at the end while waiting.
        unset($this->tasks[1]);
        $this->tasks[] = ['id' => 16, 'sequence_id' => 6, 'action' => 'command', 'payload' => 'say back soon', 'time_offset' => 0, 'continue_on_failure' => 0];
        $this->runTicksFor(45 * 60);

        $this->assertSame([11, 13, 14, 15, 16], array_column($this->log, 0));
    }

    public function testFirstTaskOffsetIsHonoured(): void
    {
        $this->tasks[0]['time_offset'] = 120;
        $result = $this->tick();
        $this->assertSame(Runner::STATUS_WAITING, $result['status']);
        $this->assertSame([], $result['ran']);
        $this->now = self::START + 120;
        $this->assertSame([11], $this->tick()['ran']);
    }

    public function testSkippedRunMovesNextRunOnAndRunsNothing(): void
    {
        $runner = new Runner($this->store, fn (): int => $this->now);
        $result = $runner->tick(self::ID, fn (): array => $this->tasks, function (array $task): void {
            $this->log[] = [$task['id'], $this->now];
        }, $this->nextRunAt(...), fn (array $row): bool => false);

        $this->assertSame(Runner::STATUS_SKIPPED, $result['status']);
        $this->assertSame([], $this->log);
        $row = $this->store->rows[self::ID];
        $this->assertSame(0, $row['is_processing']);
        $this->assertNull($row['chain_locked_until']);
        $this->assertGreaterThan(self::START, Runner::parse($row['next_run_at']));
    }

    public function testScheduleWithoutTasksJustMovesOn(): void
    {
        $this->tasks = [];
        $result = $this->tick();
        $this->assertSame(Runner::STATUS_EMPTY, $result['status']);
        $this->assertSame(0, $this->store->rows[self::ID]['is_processing']);
        $this->assertGreaterThan(self::START, Runner::parse($this->store->rows[self::ID]['next_run_at']));
    }

    public function testInactiveScheduleIsNotContinued(): void
    {
        $this->tick();
        $this->store->rows[self::ID]['is_active'] = 0;
        $this->runTicksFor(45 * 60);
        $this->assertSame([11], array_column($this->log, 0));
    }

    public function testStoreErrorGivesTheLeaseBack(): void
    {
        $runner = new Runner($this->store, fn (): int => $this->now);
        try {
            $runner->tick(self::ID, fn (): array => throw new \RuntimeException('db down'), fn () => null, $this->nextRunAt(...));
            $this->fail('expected an exception');
        } catch (\RuntimeException $e) {
            $this->assertSame('db down', $e->getMessage());
        }
        $this->assertNull($this->store->rows[self::ID]['chain_locked_until']);
        $this->assertSame([11], $this->tick()['ran'], 'the next tick retries');
    }

    /**
     * @return array{status: string, executed: int, failed: int, total: int, ran: list<int>, failed_task_id: int|null}
     */
    private function tick(): array
    {
        $runner = new Runner($this->store, fn (): int => $this->now);

        return $runner->tick(self::ID, fn (): array => $this->tasks, function (array $task): void {
            $this->log[] = [$task['id'], $this->now];
            if (in_array($task['id'], $this->failing, true)) {
                throw new \RuntimeException('Wings API error');
            }
        }, $this->nextRunAt(...));
    }

    /**
     * One tick per minute, like the panel cron.
     *
     * @return list<array>
     */
    private function runTicksFor(int $seconds): array
    {
        $results = [];
        $end = $this->now + $seconds;
        for ($t = $this->now; $t <= $end; $t += 60) {
            $this->now = $t;
            $result = $this->tick();
            if ($result['status'] !== Runner::STATUS_BUSY) {
                $results[] = $result;
            }
        }

        return $results;
    }

    /** Simple cron for the test rows: '*' minute means every minute, otherwise daily. */
    private function nextRunAt(array $row, string $reference): string
    {
        $ref = Runner::parse($reference);
        $next = intdiv($ref, 60) * 60 + 60;
        if ($row['cron_minute'] === '*') {
            return Runner::format($next);
        }

        return Runner::format($ref + 86400);
    }
}
