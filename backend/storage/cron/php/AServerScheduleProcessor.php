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

namespace App\Cron;

/**
 * ServerScheduleProcessor - Cron task for processing server schedules.
 *
 * This cron job runs every minute and processes all due server schedules.
 * It handles:
 * - Getting all schedules that are due: new runs (next_run_at reached) and
 *   running task chains whose next task is due (chain_next_at reached)
 * - Taking an atomic per-schedule lease so overlapping cron runs never run a task twice
 * - Checking if schedules should only run when server is online (only_when_online flag)
 * - Executing tasks in sequence order; a task's time_offset is waited out across
 *   cron ticks instead of with sleep(), so other cron jobs are never blocked
 * - Updating schedule status and calculating next run time
 * - Logging all schedule and task execution activities
 */

use App\App;
use App\Chat\Node;
use App\Chat\Task;
use App\Chat\Backup;
use App\Chat\Server;
use App\Chat\TimedTask;
use App\Chat\ServerActivity;
use App\Chat\ServerSchedule;
use App\Services\Wings\Wings;
use App\Config\ConfigInterface;
use App\Services\Backup\BackupFifoEviction;
use App\Cli\Utils\MinecraftColorCodeSupport;
use App\Services\Server\LifecycleHookPowerGate;
use App\Services\Backup\ServerBackupTaskService;
use App\Services\Database\ServerDatabaseDumpService;
use App\Services\Server\LifecycleHookExecutorService;
use App\Services\Server\ScheduleContainerShellService;
use App\Services\Server\ScheduleChain\ScheduleChainRunner;
use App\Services\Server\ScheduleChain\DatabaseScheduleChainStore;

class AServerScheduleProcessor implements TimeTask
{
    /**
     * Entry point for the cron server schedule processor.
     */
    public function run()
    {
        // Runs on every cron run (forced): each run is short now, task offsets are
        // waited out across runs, and the per-schedule lease keeps runs apart.
        // A time gate measured from the end of the previous run could skip a minute.
        $cron = new Cron('server-schedule-processor', '1M');
        try {
            $cron->runIfDue(function () {
                $this->processSchedules();
                // Report cron heartbeat
                TimedTask::markRun('server-schedule-processor', true, 'Processed schedules heartbeat');
            }, true);
        } catch (\Exception $e) {
            $app = App::getInstance(false, true);
            $app->getLogger()->error('Failed to process server schedules: ' . $e->getMessage());
            TimedTask::markRun('server-schedule-processor', false, $e->getMessage());
        }
    }

    /**
     * Process all due server schedules.
     */
    private function processSchedules()
    {
        $app = App::getInstance(false, true);
        $config = $app->getConfig();
        if ($config->getSetting(ConfigInterface::SERVER_ALLOW_SCHEDULES, 'true') == 'false') {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cSchedules are disabled on this host, skipping...');

            return;
        }

        MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessing server schedules...');

        // Reset schedules stuck in processing (e.g. cron crashed or timed out).
        // Schedules waiting for their next task's offset are not touched.
        $stuckReset = ServerSchedule::resetStuckProcessing(15);
        if ($stuckReset > 0) {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&eReset ' . $stuckReset . ' schedule(s) stuck in processing');
        }

        // New runs and running task chains whose next task is due
        $dueSchedules = ServerSchedule::getDueSchedules();
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aFound ' . count($dueSchedules) . ' due schedules');

        $runner = new ScheduleChainRunner(new DatabaseScheduleChainStore());
        foreach ($dueSchedules as $schedule) {
            try {
                $this->processSchedule($runner, $schedule);
            } catch (\Throwable $e) {
                $app->getLogger()->error('Failed to process schedule ' . $schedule['id'] . ': ' . $e->getMessage());
                MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to process schedule ' . $schedule['id'] . ': ' . $e->getMessage());
            }
        }
    }

    /**
     * Handle one cron tick for a schedule.
     *
     * Tasks run in sequence_id order. Instead of sleeping for a task's
     * time_offset, the runner stores when the next task is due and a later tick
     * continues the chain, so this never blocks the cron runner.
     */
    private function processSchedule(ScheduleChainRunner $runner, array $schedule): void
    {
        $scheduleId = (int) $schedule['id'];
        $server = Server::getServerById((int) $schedule['server_id']);
        if (!$server) {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cServer not found for schedule: ' . $scheduleId);

            return;
        }

        $result = $runner->tick(
            $scheduleId,
            fn (): array => $this->getScheduleTasks($scheduleId),
            function (array $task) use ($server): void {
                try {
                    $this->executeTask($task, $server);
                    MinecraftColorCodeSupport::sendOutputWithNewLine('&aExecuted task: ' . $task['action'] . ' (Sequence: ' . $task['sequence_id'] . ')');
                } catch (\Throwable $e) {
                    App::getInstance(false, true)->getLogger()->error('Failed to execute task ' . $task['id'] . ': ' . $e->getMessage());
                    MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to execute task: ' . $task['action'] . ' - ' . $e->getMessage());
                    throw $e;
                }
            },
            // Next occurrence in the schedule's authoring timezone, so e.g.
            // "0 3 * * *" still means 03:00 local even though PHP runs in UTC.
            fn (array $row, string $reference): string => ServerSchedule::calculateNextRunTime(
                $row['cron_day_of_week'],
                $row['cron_month'],
                $row['cron_day_of_month'],
                $row['cron_hour'],
                $row['cron_minute'],
                $reference,
                $row['timezone'] ?? 'UTC'
            ),
            function (array $row) use ($server): bool {
                MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessing schedule: ' . $row['name'] . ' (ID: ' . $row['id'] . ')');
                if ((int) $row['only_when_online'] === 1 && !$this->isServerOnline($server)) {
                    MinecraftColorCodeSupport::sendOutputWithNewLine('&eServer is offline, skipping schedule: ' . $row['name']);

                    return false;
                }

                return true;
            }
        );

        switch ($result['status']) {
            case ScheduleChainRunner::STATUS_BUSY:
                MinecraftColorCodeSupport::sendOutputWithNewLine('&7Schedule ' . $scheduleId . ' is handled by another cron run, skipping');
                break;
            case ScheduleChainRunner::STATUS_LOST:
                MinecraftColorCodeSupport::sendOutputWithNewLine('&eSchedule ' . $scheduleId . ' was deleted, turned off or taken over while running, stopped');
                break;
            case ScheduleChainRunner::STATUS_SKIPPED:
                $fresh = ServerSchedule::getScheduleById($scheduleId) ?? $schedule;
                ServerActivity::createActivity([
                    'server_id' => $server['id'],
                    'node_id' => $server['node_id'],
                    'event' => 'schedule_skipped_offline',
                    'metadata' => json_encode([
                        'schedule_id' => $scheduleId,
                        'schedule_name' => $schedule['name'],
                        'reason' => 'server_offline',
                        'next_run_at' => $fresh['next_run_at'] ?? null,
                    ]),
                ]);
                break;
            case ScheduleChainRunner::STATUS_WAITING:
                $fresh = ServerSchedule::getScheduleById($scheduleId) ?? $schedule;
                MinecraftColorCodeSupport::sendOutputWithNewLine('&eSchedule ' . $schedule['name'] . ': next task due at ' . ($fresh['chain_next_at'] ?? '?') . ' UTC');
                break;
            case ScheduleChainRunner::STATUS_EMPTY:
                MinecraftColorCodeSupport::sendOutputWithNewLine('&eNo tasks found for schedule: ' . $schedule['name']);
                break;
            case ScheduleChainRunner::STATUS_FINISHED:
            case ScheduleChainRunner::STATUS_ABORTED:
                $metadata = [
                    'schedule_id' => $scheduleId,
                    'schedule_name' => $schedule['name'],
                    'executed_tasks' => $result['executed'],
                    'failed_tasks' => $result['failed'],
                    'total_tasks' => $result['total'],
                    'execution_time' => date('Y-m-d H:i:s'),
                ];
                if ($result['status'] === ScheduleChainRunner::STATUS_ABORTED) {
                    $metadata['stopped_at_task_id'] = $result['failed_task_id'];
                }
                ServerActivity::createActivity([
                    'server_id' => $server['id'],
                    'node_id' => $server['node_id'],
                    'event' => 'schedule_executed',
                    'metadata' => json_encode($metadata),
                ]);
                MinecraftColorCodeSupport::sendOutputWithNewLine(
                    '&aSchedule execution completed: ' . $result['executed'] . ' tasks executed, ' . $result['failed'] . ' failed'
                    . ($result['status'] === ScheduleChainRunner::STATUS_ABORTED ? ' (stopped: task failed without continue on failure)' : '')
                );
                break;
        }
    }

    /**
     * Execute a single task.
     */
    private function executeTask(array $task, array $server)
    {
        $app = App::getInstance(false, true);

        // Log task execution start
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'event' => 'task_executed',
            'metadata' => json_encode([
                'task_id' => $task['id'],
                'action' => $task['action'],
                'sequence_id' => $task['sequence_id'],
                'execution_time' => date('Y-m-d H:i:s'),
            ]),
        ]);

        // Execute the task based on its action
        switch ($task['action']) {
            case 'power':
                $this->executePowerAction($server, $task['payload']);
                break;
            case 'start':
                $this->executeStartServer($server);
                break;
            case 'stop':
                $this->executeStopServer($server);
                break;
            case 'restart':
                $this->executeRestartServer($server);
                break;
            case 'kill':
                $this->executeKillServer($server);
                break;
            case 'backup':
            case 'database_backup':
                $this->executeBackupTask($server, $task['payload'] ?? '', (string) $task['action']);
                break;
            case 'command':
                $this->executeCommand($server, $task['payload']);
                break;
            case 'container_shell':
                $this->executeContainerShell($server, $task);
                break;
            case 'install':
                $this->executeInstallServer($server);
                break;
            case 'update':
                $this->executeUpdateServer($server);
                break;
            default:
                MinecraftColorCodeSupport::sendOutputWithNewLine('&eUnknown task action: ' . $task['action']);
                break;
        }
    }

    /**
     * Get tasks for a schedule.
     */
    private function getScheduleTasks(int $scheduleId): array
    {
        return Task::getTasksByScheduleId($scheduleId);
    }

    /**
     * Check if a server is online.
     */
    private function isServerOnline(array $server): bool
    {
        // Check server status - assuming 'running' means online
        $status = $server['status'] ?? 'offline';

        return in_array(strtolower($status), ['running']);
    }

    /**
     * Execute start server action.
     */
    private function executeStartServer(array $server)
    {
        $app = App::getInstance(false, true);
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aStarting server: ' . $server['name']);

        try {
            $this->runLifecycleHooksForAction($server, 'start');
            $wings = $this->getWingsConnection($server);
            $response = $wings->getServer()->startServer($server['uuid']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();
                $app->getLogger()->error('Failed to start server ' . $server['name'] . ': ' . $error);
                MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to start server: ' . $error);
                throw new \Exception('Wings API error: ' . $error);
            }

            MinecraftColorCodeSupport::sendOutputWithNewLine('&aServer started successfully: ' . $server['name']);
        } catch (\Exception $e) {
            $app->getLogger()->error('Failed to start server ' . $server['name'] . ': ' . $e->getMessage());
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to start server: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Execute stop server action.
     */
    private function executeStopServer(array $server)
    {
        $app = App::getInstance(false, true);
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aStopping server: ' . $server['name']);

        try {
            $this->runLifecycleHooksForAction($server, 'stop');
            $wings = $this->getWingsConnection($server);
            $response = $wings->getServer()->stopServer($server['uuid']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();
                $app->getLogger()->error('Failed to stop server ' . $server['name'] . ': ' . $error);
                MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to stop server: ' . $error);
                throw new \Exception('Wings API error: ' . $error);
            }

            MinecraftColorCodeSupport::sendOutputWithNewLine('&aServer stopped successfully: ' . $server['name']);
        } catch (\Exception $e) {
            $app->getLogger()->error('Failed to stop server ' . $server['name'] . ': ' . $e->getMessage());
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to stop server: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Execute restart server action.
     */
    private function executeRestartServer(array $server)
    {
        $app = App::getInstance(false, true);
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aRestarting server: ' . $server['name']);

        try {
            $this->runLifecycleHooksForAction($server, 'restart');
            $wings = $this->getWingsConnection($server);
            $response = $wings->getServer()->restartServer($server['uuid']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();
                $app->getLogger()->error('Failed to restart server ' . $server['name'] . ': ' . $error);
                MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to restart server: ' . $error);
                throw new \Exception('Wings API error: ' . $error);
            }

            MinecraftColorCodeSupport::sendOutputWithNewLine('&aServer restarted successfully: ' . $server['name']);
        } catch (\Exception $e) {
            $app->getLogger()->error('Failed to restart server ' . $server['name'] . ': ' . $e->getMessage());
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to restart server: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Execute kill server action.
     */
    private function executeKillServer(array $server)
    {
        $app = App::getInstance(false, true);
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aKilling server: ' . $server['name']);

        try {
            $wings = $this->getWingsConnection($server);
            $response = $wings->getServer()->killServer($server['uuid']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();
                $app->getLogger()->error('Failed to kill server ' . $server['name'] . ': ' . $error);
                MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to kill server: ' . $error);
                throw new \Exception('Wings API error: ' . $error);
            }

            MinecraftColorCodeSupport::sendOutputWithNewLine('&aServer killed successfully: ' . $server['name']);
        } catch (\Exception $e) {
            $app->getLogger()->error('Failed to kill server ' . $server['name'] . ': ' . $e->getMessage());
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to kill server: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Execute backup server action (server files archive).
     *
     * Limit / FIFO handling and backup creation are shared with lifecycle hooks via
     * {@see ServerBackupTaskService}.
     */
    private function executeBackupServer(array $server, string $ignoredFiles = '[]', ?int $destinationId = null)
    {
        $app = App::getInstance(false, true);
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aBacking up server: ' . $server['name']);

        try {
            $wings = $this->getWingsConnection($server);
            $result = (new ServerBackupTaskService())->runFilesBackup($wings, $server, $ignoredFiles, [
                'context' => 'schedule',
                'name_prefix' => 'Scheduled',
                'destination_id' => $destinationId,
            ]);

            if ($result['status'] === ServerBackupTaskService::STATUS_SKIPPED) {
                $reason = (string) $result['reason'];
                MinecraftColorCodeSupport::sendOutputWithNewLine('&eSkipping backup (' . $reason . ') for server: ' . $server['name']);
                $app->getLogger()->info('Skipped scheduled backup for server ' . ($server['name'] ?? 'unknown') . ': ' . $reason);

                return;
            }

            MinecraftColorCodeSupport::sendOutputWithNewLine('&aBackup created successfully: ' . $result['name']);
        } catch (\Exception $e) {
            $app->getLogger()->error('Failed to create backup for server ' . $server['name'] . ': ' . $e->getMessage());
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to create backup: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Execute a backup task (server files or database dumps).
     */
    private function executeBackupTask(array $server, string $payload, string $action)
    {
        // Legacy database_backup without JSON type → treat as database payload
        if ($action === 'database_backup') {
            $trimmed = trim($payload);
            $decoded = json_decode($trimmed, true);
            if (is_array($decoded) && !isset($decoded['type'])) {
                $decoded['type'] = 'database';
                $payload = json_encode($decoded);
            } elseif ($trimmed !== '' && !is_array($decoded)) {
                throw new \Exception('Invalid database backup payload');
            }
        }

        $parsed = ServerDatabaseDumpService::parseBackupPayload($payload);
        $destinationId = \App\Services\Storage\StorageDestinationService::destinationIdFromPayload($payload);
        if ($parsed['type'] === 'database') {
            $this->executeDatabaseBackup($server, $parsed);

            return;
        }
        if ($parsed['type'] === 'full') {
            $this->executeFullBackup($server, $parsed, $destinationId);

            return;
        }

        $this->executeBackupServer($server, $parsed['ignored_files'] !== '' ? $parsed['ignored_files'] : '[]', $destinationId);
    }

    /**
     * Full backup: dump DBs, write metadata, then Wings archive.
     *
     * @param array{type: string, ignored_files: string, databases: 'all'|list<int>, directory: string, include_metadata: bool, include_encrypted: bool, include_activities: bool} $parsed
     */
    private function executeFullBackup(array $server, array $parsed, ?int $destinationId = null)
    {
        $app = App::getInstance(false, true);
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aStarting full backup for server: ' . $server['name']);

        $backupLimit = (int) ($server['backup_limit'] ?? 0);

        if ($backupLimit === 0) {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&eSkipping full backup: backups disabled for server: ' . $server['name']);
            $app->getLogger()->info('Skipped scheduled full backup for server ' . ($server['name'] ?? 'unknown') . ': backups disabled');

            return;
        }

        // Resolve the destination before FIFO eviction so an unusable destination never removes a backup.
        try {
            $destinationId = \App\Services\Storage\StorageDestinationService::resolveForServer($destinationId, $server);
        } catch (\App\Services\Storage\StorageException $e) {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&eSkipping full backup (destination_unavailable) for server: ' . $server['name']);
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'event' => 'backup_skipped_destination',
                'metadata' => json_encode(['context' => 'schedule', 'type' => 'full', 'destination_id' => $destinationId, 'reason' => $e->errorCode()]),
            ]);

            return;
        }

        // Only backups on host storage use the limit (BackupQuota); rotation stays in the same storage pool.
        $atBackupLimit = \App\Services\Backup\BackupQuota::atLimit($server, $destinationId);
        if ($atBackupLimit && !BackupFifoEviction::isFifoRollingForServer($server)) {
            MinecraftColorCodeSupport::sendOutputWithNewLine('&eSkipping full backup: limit reached for server: ' . $server['name']);

            return;
        }

        try {
            $wings = $this->getWingsConnection($server, 120);

            if ($atBackupLimit) {
                $evict = BackupFifoEviction::evictOldestWingsBackup((int) $server['id'], (string) $server['uuid'], $wings, $destinationId);
                if ($evict !== null) {
                    MinecraftColorCodeSupport::sendOutputWithNewLine('&eSkipping full backup: FIFO rotation failed for server: ' . $server['name']);

                    return;
                }
            }

            $result = \App\Services\Backup\ServerFullBackupService::run($wings, $server, $parsed, [
                'name' => 'Scheduled full backup at ' . date('Y-m-d H:i:s'),
                'destination_id' => $destinationId,
            ]);

            foreach ($result['backed_up'] as $item) {
                MinecraftColorCodeSupport::sendOutputWithNewLine(
                    '&aDatabase dump: ' . $item['database_name'] . ' → ' . $item['path']
                );
            }
            foreach ($result['dump_errors'] as $error) {
                MinecraftColorCodeSupport::sendOutputWithNewLine('&cDump error: ' . $error);
            }
            if ($result['metadata_included']) {
                MinecraftColorCodeSupport::sendOutputWithNewLine('&aMetadata pack written: ' . $result['metadata_path']);
            }

            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'event' => 'schedule_full_backup_started',
                'metadata' => json_encode([
                    'backup_uuid' => $result['wings_backup']['uuid'],
                    'backup_id' => $result['wings_backup']['id'],
                    'metadata_included' => $result['metadata_included'],
                    'schedule_triggered' => true,
                ]),
            ]);

            MinecraftColorCodeSupport::sendOutputWithNewLine('&aFull backup started: ' . $result['wings_backup']['name']);
        } catch (\Exception $e) {
            $app->getLogger()->error('Failed full backup for server ' . $server['name'] . ': ' . $e->getMessage());
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed full backup: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Dump one or more server databases to SQL files on the server filesystem.
     *
     * @param array{type: string, ignored_files: string, databases: 'all'|list<int>, directory: string} $parsed
     */
    private function executeDatabaseBackup(array $server, array $parsed)
    {
        $app = App::getInstance(false, true);
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aBacking up database(s) for server: ' . $server['name']);

        try {
            $wings = $this->getWingsConnection($server);
            $result = \App\Services\Database\ServerDatabaseFilesystemBackupService::backup($wings, $server, $parsed);

            foreach ($result['backed_up'] as $item) {
                MinecraftColorCodeSupport::sendOutputWithNewLine(
                    '&aDatabase backup written: ' . $item['database_name'] . ' → ' . $item['path']
                    . ' (' . $item['table_count'] . ' tables)'
                );
            }
            foreach ($result['errors'] as $error) {
                MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed database backup: ' . $error);
            }

            if ($result['backed_up'] === [] && $result['errors'] === []) {
                MinecraftColorCodeSupport::sendOutputWithNewLine('&eNo MySQL/MariaDB databases to back up for server: ' . $server['name']);
                ServerActivity::createActivity([
                    'server_id' => $server['id'],
                    'node_id' => $server['node_id'],
                    'event' => 'schedule_database_backup_skipped_empty',
                    'metadata' => json_encode(['directory' => $parsed['directory']]),
                ]);

                return;
            }

            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'event' => 'schedule_database_backup',
                'metadata' => json_encode([
                    'directory' => $parsed['directory'],
                    'scope' => $parsed['databases'] === 'all' ? 'all' : 'specific',
                    'backed_up' => $result['backed_up'],
                    'errors' => $result['errors'],
                ]),
            ]);

            if ($result['errors'] !== []) {
                throw new \Exception('Some database backups failed: ' . implode('; ', $result['errors']));
            }
        } catch (\Exception $e) {
            $app->getLogger()->error('Failed database backup for server ' . $server['name'] . ': ' . $e->getMessage());
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed database backup: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Execute power action (start, stop, restart, kill).
     */
    private function executePowerAction(array $server, string $powerAction)
    {
        $app = App::getInstance(false, true);
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aExecuting power action: ' . $powerAction . ' for server: ' . $server['name']);

        try {
            if (in_array($powerAction, ['start', 'stop', 'restart'], true)) {
                $this->runLifecycleHooksForAction($server, $powerAction);
            }
            $wings = $this->getWingsConnection($server);
            $response = null;

            switch ($powerAction) {
                case 'start':
                    $response = $wings->getServer()->startServer($server['uuid']);
                    break;
                case 'stop':
                    $response = $wings->getServer()->stopServer($server['uuid']);
                    break;
                case 'restart':
                    $response = $wings->getServer()->restartServer($server['uuid']);
                    break;
                case 'kill':
                    $response = $wings->getServer()->killServer($server['uuid']);
                    break;
                default:
                    throw new \Exception('Invalid power action: ' . $powerAction);
            }

            if (!$response->isSuccessful()) {
                $error = $response->getError();
                $app->getLogger()->error('Failed to execute power action ' . $powerAction . ' for server ' . $server['name'] . ': ' . $error);
                MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to execute power action: ' . $error);
                throw new \Exception('Wings API error: ' . $error);
            }

            MinecraftColorCodeSupport::sendOutputWithNewLine('&aPower action ' . $powerAction . ' executed successfully for server: ' . $server['name']);
        } catch (\Exception $e) {
            $app->getLogger()->error('Failed to execute power action ' . $powerAction . ' for server ' . $server['name'] . ': ' . $e->getMessage());
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to execute power action: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Run a Linux command inside the server's Docker container (`sh -c <command>` via the daemon).
     *
     * Admin switch, daemon capability, timeout and output capture live in
     * {@see ScheduleContainerShellService}; the output is written to the server activity log.
     */
    private function executeContainerShell(array $server, array $task)
    {
        $app = App::getInstance(false, true);
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aRunning container shell command for server: ' . $server['name']);

        try {
            $node = Node::getNodeById($server['node_id']);
            if (!$node) {
                throw new \Exception('Node not found for server: ' . $server['name']);
            }

            $result = (new ScheduleContainerShellService())->run($server, $node, (string) ($task['payload'] ?? ''), [
                'task_id' => $task['id'] ?? null,
                'schedule_id' => $task['schedule_id'] ?? null,
            ]);

            if (($result['skipped'] ?? false) === true) {
                MinecraftColorCodeSupport::sendOutputWithNewLine('&eContainer shell skipped (' . ($result['reason'] ?? 'unknown') . ') for server: ' . $server['name']);

                return;
            }

            MinecraftColorCodeSupport::sendOutputWithNewLine('&aContainer shell command finished (exit ' . $result['exit_code'] . ') for server: ' . $server['name']);
        } catch (\Exception $e) {
            $app->getLogger()->error('Failed container shell task for server ' . $server['name'] . ': ' . $e->getMessage());
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed container shell command: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Execute command on server console.
     */
    private function executeCommand(array $server, string $command)
    {
        $app = App::getInstance(false, true);
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aExecuting command on server: ' . $server['name'] . ' - Command: ' . $command);

        try {
            $wings = $this->getWingsConnection($server);
            $response = $wings->getServer()->sendCommands($server['uuid'], [$command]);

            if (!$response->isSuccessful()) {
                $error = $response->getError();
                $app->getLogger()->error('Failed to execute command on server ' . $server['name'] . ': ' . $error);
                MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to execute command: ' . $error);
                throw new \Exception('Wings API error: ' . $error);
            }

            MinecraftColorCodeSupport::sendOutputWithNewLine('&aCommand executed successfully on server: ' . $server['name']);
        } catch (\Exception $e) {
            $app->getLogger()->error('Failed to execute command on server ' . $server['name'] . ': ' . $e->getMessage());
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to execute command: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Execute install server action.
     */
    private function executeInstallServer(array $server)
    {
        $app = App::getInstance(false, true);
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aInstalling server: ' . $server['name']);

        try {
            $wings = $this->getWingsConnection($server);
            $response = $wings->getServer()->installServer($server['uuid']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();
                $app->getLogger()->error('Failed to install server ' . $server['name'] . ': ' . $error);
                MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to install server: ' . $error);
                throw new \Exception('Wings API error: ' . $error);
            }

            MinecraftColorCodeSupport::sendOutputWithNewLine('&aServer installation started successfully: ' . $server['name']);
        } catch (\Exception $e) {
            $app->getLogger()->error('Failed to install server ' . $server['name'] . ': ' . $e->getMessage());
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to install server: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Execute update server action.
     */
    private function executeUpdateServer(array $server)
    {
        $app = App::getInstance(false, true);
        MinecraftColorCodeSupport::sendOutputWithNewLine('&aUpdating server: ' . $server['name']);

        try {
            $wings = $this->getWingsConnection($server);
            $response = $wings->getServer()->reinstallServer($server['uuid']);

            if (!$response->isSuccessful()) {
                $error = $response->getError();
                $app->getLogger()->error('Failed to update server ' . $server['name'] . ': ' . $error);
                MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to update server: ' . $error);
                throw new \Exception('Wings API error: ' . $error);
            }

            MinecraftColorCodeSupport::sendOutputWithNewLine('&aServer update started successfully: ' . $server['name']);
        } catch (\Exception $e) {
            $app->getLogger()->error('Failed to update server ' . $server['name'] . ': ' . $e->getMessage());
            MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to update server: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get Wings connection for a server.
     */
    private function getWingsConnection(array $server, int $timeout = 30): Wings
    {
        // Get node information
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            throw new \Exception('Node not found for server: ' . $server['name']);
        }

        return Wings::fromNode($node, $timeout);
    }

    /**
     * Run lifecycle hooks and throw if they block action.
     */
    private function runLifecycleHooksForAction(array $server, string $powerAction): void
    {
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            throw new \Exception('Node not found for lifecycle hook execution');
        }

        $executor = new LifecycleHookExecutorService();
        $result = $executor->executeForPowerAction($server, $node, $powerAction, null);
        if (LifecycleHookPowerGate::isBlocked($result)) {
            throw new \Exception(LifecycleHookPowerGate::scheduleExceptionMessage($result));
        }
    }
}
