<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Cron;

/**
 * ServerScheduleProcessor - Cron task for processing server schedules
 * 
 * This cron job runs every minute and processes all due server schedules.
 * It handles:
 * - Getting all schedules that are due to run (is_active=1, next_run_at <= NOW(), is_processing=0)
 * - Checking if schedules should only run when server is online (only_when_online flag)
 * - Executing tasks associated with each schedule in sequence order
 * - Updating schedule status and calculating next run time
 * - Logging all schedule and task execution activities
 */

use App\App;
use App\Chat\Node;
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Chat\ServerSchedule;
use App\Chat\Task;
use App\Cli\Utils\MinecraftColorCodeSupport;
use App\Cron\Cron;
use App\Cron\TimeTask;
use App\Services\Wings\Wings;
use App\Chat\TimedTask;

class ServerScheduleProcessor implements TimeTask
{
	/**
	 * Entry point for the cron server schedule processor.
	 */
	public function run()
	{
		$cron = new Cron('server-schedule-processor', '1M');
		try {
			$cron->runIfDue(function () {
				$this->processSchedules();
				// Report cron heartbeat
				TimedTask::markRun('server-schedule-processor', true, 'Processed schedules heartbeat');
			});
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
		MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessing server schedules...');

		// Get all due schedules
		$dueSchedules = ServerSchedule::getDueSchedules();
		MinecraftColorCodeSupport::sendOutputWithNewLine('&aFound ' . count($dueSchedules) . ' due schedules');

		foreach ($dueSchedules as $schedule) {
			try {
				$this->processSchedule($schedule);
			} catch (\Exception $e) {
				$app->getLogger()->error('Failed to process schedule ' . $schedule['id'] . ': ' . $e->getMessage());
				MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to process schedule ' . $schedule['id'] . ': ' . $e->getMessage());

				// Mark schedule as not processing on error
				ServerSchedule::updateSchedule($schedule['id'], ['is_processing' => 0]);
			}
		}
	}

	/**
	 * Process a single schedule.
	 */
	private function processSchedule(array $schedule)
	{
		$app = App::getInstance(false, true);
		MinecraftColorCodeSupport::sendOutputWithNewLine('&aProcessing schedule: ' . $schedule['name'] . ' (ID: ' . $schedule['id'] . ')');

		// Mark schedule as processing
		if (!ServerSchedule::updateSchedule($schedule['id'], ['is_processing' => 1])) {
			MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to mark schedule as processing: ' . $schedule['id']);
			return;
		}

		// Get server information
		$server = Server::getServerById($schedule['server_id']);
		if (!$server) {
			MinecraftColorCodeSupport::sendOutputWithNewLine('&cServer not found for schedule: ' . $schedule['id']);
			ServerSchedule::updateSchedule($schedule['id'], ['is_processing' => 0]);
			return;
		}

		// Check if schedule should only run when server is online
		if ($schedule['only_when_online'] == 1) {
			if (!$this->isServerOnline($server)) {
				MinecraftColorCodeSupport::sendOutputWithNewLine('&eServer is offline, skipping schedule: ' . $schedule['name']);

				// Calculate next run time and update schedule
				$nextRunAt = ServerSchedule::calculateNextRunTime(
					$schedule['cron_day_of_week'],
					$schedule['cron_month'],
					$schedule['cron_day_of_month'],
					$schedule['cron_hour'],
					$schedule['cron_minute']
				);

				ServerSchedule::updateSchedule($schedule['id'], [
					'is_processing' => 0,
					'next_run_at' => $nextRunAt
				]);

				// Log activity
				ServerActivity::createActivity([
					'server_id' => $server['id'],
					'node_id' => $server['node_id'],
					'event' => 'schedule_skipped_offline',
					'metadata' => json_encode([
						'schedule_id' => $schedule['id'],
						'schedule_name' => $schedule['name'],
						'reason' => 'server_offline',
						'next_run_at' => $nextRunAt,
					]),
				]);

				return;
			}
		}

		// Execute the schedule
		$this->executeSchedule($schedule, $server);

		// Calculate next run time
		$nextRunAt = ServerSchedule::calculateNextRunTime(
			$schedule['cron_day_of_week'],
			$schedule['cron_month'],
			$schedule['cron_day_of_month'],
			$schedule['cron_hour'],
			$schedule['cron_minute']
		);

		// Update schedule with next run time and mark as not processing
		ServerSchedule::updateSchedule($schedule['id'], [
			'is_processing' => 0,
			'next_run_at' => $nextRunAt,
			'last_run_at' => date('Y-m-d H:i:s')
		]);

		MinecraftColorCodeSupport::sendOutputWithNewLine('&aSchedule processed successfully: ' . $schedule['name'] . ' (Next run: ' . $nextRunAt . ')');
	}

	/**
	 * Execute a schedule by running its associated tasks.
	 */
	private function executeSchedule(array $schedule, array $server)
	{
		$app = App::getInstance(false, true);
		MinecraftColorCodeSupport::sendOutputWithNewLine('&aExecuting schedule tasks for: ' . $schedule['name']);

		// Get tasks for this schedule
		$tasks = $this->getScheduleTasks($schedule['id']);

		if (empty($tasks)) {
			MinecraftColorCodeSupport::sendOutputWithNewLine('&eNo tasks found for schedule: ' . $schedule['name']);
			return;
		}

		// Sort tasks by sequence_id to ensure proper execution order
		usort($tasks, function ($a, $b) {
			return $a['sequence_id'] <=> $b['sequence_id'];
		});

		$executedTasks = 0;
		$failedTasks = 0;

		foreach ($tasks as $task) {
			try {
				$this->executeTask($task, $server);
				$executedTasks++;
				MinecraftColorCodeSupport::sendOutputWithNewLine('&aExecuted task: ' . $task['action'] . ' (Sequence: ' . $task['sequence_id'] . ')');
			} catch (\Exception $e) {
				$failedTasks++;
				$app->getLogger()->error('Failed to execute task ' . $task['id'] . ': ' . $e->getMessage());
				MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to execute task: ' . $task['action'] . ' - ' . $e->getMessage());
			}
		}

		// Log schedule execution activity
		ServerActivity::createActivity([
			'server_id' => $server['id'],
			'node_id' => $server['node_id'],
			'event' => 'schedule_executed',
			'metadata' => json_encode([
				'schedule_id' => $schedule['id'],
				'schedule_name' => $schedule['name'],
				'executed_tasks' => $executedTasks,
				'failed_tasks' => $failedTasks,
				'total_tasks' => count($tasks),
				'execution_time' => date('Y-m-d H:i:s'),
			]),
		]);

		MinecraftColorCodeSupport::sendOutputWithNewLine('&aSchedule execution completed: ' . $executedTasks . ' tasks executed, ' . $failedTasks . ' failed');
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
				$this->executeBackupServer($server, $task['payload'] ?? '[]');
				break;
			case 'command':
				$this->executeCommand($server, $task['payload']);
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
	 * Execute backup server action.
	 */
	private function executeBackupServer(array $server, string $ignoredFiles = '[]')
	{
		$app = App::getInstance(false, true);
		MinecraftColorCodeSupport::sendOutputWithNewLine('&aBacking up server: ' . $server['name']);

		try {
			$wings = $this->getWingsConnection($server);

			// Generate backup UUID and name
			$backupUuid = $this->generateUuid();
			$backupName = 'Scheduled backup at ' . date('Y-m-d H:i:s');
			$adapter = 'wings';

			$response = $wings->getServer()->createBackup($server['uuid'], $adapter, $backupUuid, $ignoredFiles);

			if (!$response->isSuccessful()) {
				$error = $response->getError();
				$app->getLogger()->error('Failed to create backup for server ' . $server['name'] . ': ' . $error);
				MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to create backup: ' . $error);
				throw new \Exception('Wings API error: ' . $error);
			}

			MinecraftColorCodeSupport::sendOutputWithNewLine('&aBackup created successfully: ' . $backupName);
		} catch (\Exception $e) {
			$app->getLogger()->error('Failed to create backup for server ' . $server['name'] . ': ' . $e->getMessage());
			MinecraftColorCodeSupport::sendOutputWithNewLine('&cFailed to create backup: ' . $e->getMessage());
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
	private function getWingsConnection(array $server): Wings
	{
		// Get node information
		$node = Node::getNodeById($server['node_id']);
		if (!$node) {
			throw new \Exception('Node not found for server: ' . $server['name']);
		}

		$scheme = $node['scheme'];
		$host = $node['fqdn'];
		$port = $node['daemonListen'];
		$token = $node['daemon_token'];
		$timeout = 30;

		return new Wings($host, $port, $scheme, $token, $timeout);
	}

	/**
	 * Generate a UUID for backups.
	 */
	private function generateUuid(): string
	{
		$data = random_bytes(16);
		$data[6] = chr(ord($data[6]) & 0x0f | 0x40); // set version to 0100
		$data[8] = chr(ord($data[8]) & 0x3f | 0x80); // set bits 6-7 to 10
		return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
	}
}
