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

namespace App\Controllers\Admin;

use App\Chat\Database;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use OpenApi\Attributes as OA;

class DatabaseManagmentController
{
	#[OA\Get(
		path: '/api/admin/databases/management/status',
		summary: 'Get database status',
		description: 'Retrieve comprehensive database status information including MySQL version, uptime, connection statistics, and performance metrics.',
		tags: ['Admin - Database Management'],
		responses: [
			new OA\Response(
				response: 200,
				description: 'Database status retrieved successfully',
				content: new OA\JsonContent(
					properties: [
						new OA\Property(property: 'engine', type: 'string', description: 'Database engine type', example: 'mysql'),
						new OA\Property(property: 'version', type: 'string', description: 'MySQL version', example: '8.0.35'),
						new OA\Property(property: 'uptime_seconds', type: 'integer', description: 'Database uptime in seconds'),
						new OA\Property(property: 'threads_connected', type: 'integer', description: 'Number of currently connected threads'),
						new OA\Property(property: 'threads_running', type: 'integer', description: 'Number of currently running threads'),
						new OA\Property(property: 'connections_total', type: 'integer', description: 'Total number of connections made'),
						new OA\Property(property: 'aborted_connects', type: 'integer', description: 'Number of aborted connection attempts'),
						new OA\Property(property: 'queries_total', type: 'integer', description: 'Total number of queries executed'),
						new OA\Property(property: 'questions_total', type: 'integer', description: 'Total number of questions (statements) executed'),
						new OA\Property(property: 'qps', type: 'number', description: 'Queries per second (calculated)'),
						new OA\Property(property: 'bytes_received', type: 'integer', description: 'Total bytes received from clients'),
						new OA\Property(property: 'bytes_sent', type: 'integer', description: 'Total bytes sent to clients')
					]
				)
			),
			new OA\Response(response: 401, description: 'Unauthorized'),
			new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
			new OA\Response(response: 500, description: 'Internal server error - Failed to fetch database status')
		]
	)]
	public function status(Request $request): Response
	{
		try {
			// Connect using env configuration already loaded by the app kernel
			$db = new Database(
				$_ENV['DATABASE_HOST'] ?? '127.0.0.1',
				$_ENV['DATABASE_DATABASE'] ?? '',
				$_ENV['DATABASE_USER'] ?? '',
				$_ENV['DATABASE_PASSWORD'] ?? '',
				(int) ($_ENV['DATABASE_PORT'] ?? 3306)
			);

			$pdo = $db->getPdo();
			$version = $pdo->query('SELECT VERSION() as v')->fetchColumn();
			$statusRows = $pdo->query("SHOW GLOBAL STATUS WHERE `Variable_name` IN (
				'Uptime','Threads_connected','Threads_running','Connections','Aborted_connects','Questions','Queries','Slow_queries','Bytes_received','Bytes_sent'
			)")->fetchAll(\PDO::FETCH_ASSOC);
			$vars = [];
			foreach ($statusRows as $row) {
				$vars[$row['Variable_name']] = is_numeric($row['Value']) ? (int) $row['Value'] : $row['Value'];
			}
			$uptime = (int) ($vars['Uptime'] ?? 0);
			$questions = (int) ($vars['Questions'] ?? 0);
			$qps = $uptime > 0 ? $questions / $uptime : 0;

			return ApiResponse::success([
				'engine' => 'mysql',
				'version' => $version,
				'uptime_seconds' => $uptime,
				'threads_connected' => (int) ($vars['Threads_connected'] ?? 0),
				'threads_running' => (int) ($vars['Threads_running'] ?? 0),
				'connections_total' => (int) ($vars['Connections'] ?? 0),
				'aborted_connects' => (int) ($vars['Aborted_connects'] ?? 0),
				'queries_total' => (int) ($vars['Queries'] ?? 0),
				'questions_total' => (int) ($vars['Questions'] ?? 0),
				'qps' => $qps,
				'bytes_received' => (int) ($vars['Bytes_received'] ?? 0),
				'bytes_sent' => (int) ($vars['Bytes_sent'] ?? 0),
			], 'Database status fetched', 200);
		} catch (\Exception $e) {
			return ApiResponse::error('Failed to fetch database status: ' . $e->getMessage(), 500);
		}
	}

	#[OA\Post(
		path: '/api/admin/databases/management/migrate',
		summary: 'Run database migrations',
		description: 'Execute pending database migrations from the storage/migrations directory. This will run all SQL migration files that haven\'t been executed yet.',
		tags: ['Admin - Database Management'],
		responses: [
			new OA\Response(
				response: 200,
				description: 'Migrations executed successfully',
				content: new OA\JsonContent(
					properties: [
						new OA\Property(property: 'exit_code', type: 'integer', description: 'Exit code (0 for success, 1 for errors)', example: 0),
						new OA\Property(property: 'output', type: 'string', description: 'Migration execution log with detailed output')
					]
				)
			),
			new OA\Response(response: 401, description: 'Unauthorized'),
			new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
			new OA\Response(response: 500, description: 'Internal server error - Failed to run migrations')
		]
	)]
	public function migrate(Request $request): Response
	{
		try {
			// Run migrations inline (copied from CLI Migrate::execute)
			$lines = [];
			$startTime = microtime(true);

			// Load env
			\App\App::getInstance(true)->loadEnv();
			$lines[] = '⏳ Connecting to database... ' . ($_ENV['DATABASE_HOST'] ?? 'localhost') . ':' . (string) ($_ENV['DATABASE_PORT'] ?? '3306');

			$db = new Database(
				$_ENV['DATABASE_HOST'] ?? '127.0.0.1',
				$_ENV['DATABASE_DATABASE'] ?? '',
				$_ENV['DATABASE_USER'] ?? '',
				$_ENV['DATABASE_PASSWORD'] ?? '',
				(int) ($_ENV['DATABASE_PORT'] ?? 3306)
			);

			$pdo = $db->getPdo();
			$connectionTime = round((microtime(true) - $startTime) * 1000, 2);
			$lines[] = '✅ Connected to database! (' . $connectionTime . 'ms)';

			// Ensure migrations table exists
			$migrationsSql = "CREATE TABLE IF NOT EXISTS `featherpanel_migrations` (
				`id` INT NOT NULL AUTO_INCREMENT COMMENT 'The id of the migration!',
				`script` TEXT NOT NULL COMMENT 'The script to be migrated!',
				`migrated` ENUM('true','false') NOT NULL DEFAULT 'true' COMMENT 'Did we migrate this already?',
				`date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'The date from when this was executed!',
				PRIMARY KEY (`id`)
			) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT = 'The migrations table is table where save the sql migrations!';";
			$pdo->exec($migrationsSql);

			// Find migrations
			$dir = dirname(__DIR__, 3) . '/storage/migrations/';
			$files = is_dir($dir) ? scandir($dir) : [];
			$migrationFiles = array_values(array_filter($files ?: [], function ($file) {
				return $file !== '.' && $file !== '..' && pathinfo($file, PATHINFO_EXTENSION) === 'sql';
			}));
			$lines[] = '📊 Found ' . count($migrationFiles) . ' migration files';

			$executed = 0;
			$skipped = 0;
			$failed = 0;
			foreach ($migrationFiles as $migration) {
				$path = $dir . $migration;
				$sql = @file_get_contents($path);
				if ($sql === false) {
					$lines[] = '⏭️  Skipped: ' . $migration . ' (unreadable)';
					++$skipped;
					continue;
				}
				$stmt = $pdo->prepare("SELECT COUNT(*) FROM featherpanel_migrations WHERE script = :script AND migrated = 'true'");
				$stmt->execute(['script' => $migration]);
				if ((int) $stmt->fetchColumn() > 0) {
					$lines[] = '⏭️  Skipped: ' . $migration . ' (already executed)';
					++$skipped;
					continue;
				}
				$lines[] = '🔄 Executing: ' . $migration;
				$mt = microtime(true);
				try {
					$pdo->exec($sql);
					$ins = $pdo->prepare('INSERT INTO featherpanel_migrations (script, migrated) VALUES (:script, :migrated)');
					$ins->execute(['script' => $migration, 'migrated' => 'true']);
					$lines[] = '✅ Success: ' . $migration . ' (' . round((microtime(true) - $mt) * 1000, 2) . 'ms)';
					++$executed;
				} catch (\Exception $ex) {
					$lines[] = '❌ Failed: ' . $migration;
					$lines[] = '   Error: ' . $ex->getMessage();
					++$failed;
				}
			}

			$totalTime = round((microtime(true) - $startTime) * 1000, 2);
			$lines[] = '📈 Migration Summary:';
			$lines[] = '   ✅ Executed: ' . $executed . ' migrations';
			$lines[] = '   ⏭️  Skipped: ' . $skipped . ' migrations';
			$lines[] = '   ❌ Failed: ' . $failed . ' migrations';
			$lines[] = '   ⏱️  Total Time: ' . $totalTime . ' ms';

			return ApiResponse::success([
				'exit_code' => $failed > 0 ? 1 : 0,
				'output' => implode("\n", $lines),
			], $failed > 0 ? 'Migrations finished with errors' : 'Migrations executed', 200);
		} catch (\Exception $e) {
			return ApiResponse::error('Failed to run migrations: ' . $e->getMessage(), 500);
		}
	}
}
