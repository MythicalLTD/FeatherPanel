<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Cli\Commands;

use App\Cli\App;
use App\Chat\Database;
use App\Helpers\XChaCha20;
use App\Cli\CommandBuilder;
use Ifsnop\Mysqldump\Mysqldump;

class Snapshots extends App implements CommandBuilder
{
    private const BACKUPS_DIR = __DIR__ . '/../../../storage/backups';

    /**
     * Tables to exclude from backups and restore operations.
     */
    private const EXCLUDED_TABLES = [
        'featherpanel_server_activities',
        'featherpanel_featherzerotrust_scan_logs',
        'featherpanel_featherzerotrust_cron_logs',
        'featherpanel_chatbot_messages',
        'featherpanel_chatbot_conversations',
        'featherpanel_activity',
    ];

    public static function execute(array $args): void
    {
        $app = App::getInstance();

        if (!file_exists(__DIR__ . '/../../../storage/config/.env')) {
            $app->send('&cThe .env file does not exist. Please create one before running this command');
            exit;
        }

        \App\App::getInstance(true)->loadEnv();

        // Ensure backups directory exists
        if (!is_dir(self::BACKUPS_DIR)) {
            mkdir(self::BACKUPS_DIR, 0755, true);
        }

        // Route to sub-commands
        // Note: $args[0] contains the command name itself, $args[1] is the first subcommand
        if (isset($args[1])) {
            $subCommand = strtolower($args[1]);
            switch ($subCommand) {
                case 'list':
                    self::listSnapshots($app);
                    break;
                case 'create':
                    self::createSnapshot($app);
                    break;
                case 'download':
                    self::downloadSnapshot($app, $args[2] ?? null);
                    break;
                case 'restore':
                    self::restoreSnapshot($app, $args[2] ?? null, $args);
                    break;
                case 'delete':
                    self::deleteSnapshot($app, $args[2] ?? null);
                    break;
                default:
                    $app->send('&cInvalid subcommand: ' . $subCommand);
                    $app->send('&7Available subcommands: list, create, download, restore, delete');
                    $app->send('&7Usage: php fuse snapshots <subcommand> [filename]');
                    break;
            }
        } else {
            $app->send('&cPlease specify a subcommand: list, create, download, restore, delete');
            $app->send('&7Usage: php fuse snapshots <subcommand> [filename]');
        }

        exit;
    }

    public static function getDescription(): string
    {
        return 'Manage database snapshots (create, list, download, restore, delete)';
    }

    public static function getSubCommands(): array
    {
        return [
            'list' => 'List all available database snapshots',
            'create' => 'Create a new database snapshot',
            'download' => 'Download a snapshot file (usage: snapshots download <filename>)',
            'restore' => 'Restore database from a snapshot (usage: snapshots restore <filename> [-y])',
            'delete' => 'Delete a snapshot file (usage: snapshots delete <filename>)',
        ];
    }

    /**
     * List all available snapshots.
     */
    private static function listSnapshots(App $app): void
    {
        try {
            $files = glob(self::BACKUPS_DIR . '/*.fpb');
            $snapshots = [];

            foreach ($files as $file) {
                $filename = basename($file);
                $size = filesize($file);
                $createdAt = filemtime($file);

                $snapshots[] = [
                    'filename' => $filename,
                    'size' => $size,
                    'created_at' => $createdAt,
                ];
            }

            // Sort by creation date (newest first)
            usort($snapshots, function ($a, $b) {
                return $b['created_at'] <=> $a['created_at'];
            });

            if (empty($snapshots)) {
                $app->send('&7No snapshots found.');

                return;
            }

            $app->send($app->color1 . 'Available Database Snapshots:');
            $app->send('');

            foreach ($snapshots as $index => $snapshot) {
                $number = $index + 1;
                $sizeFormatted = self::formatBytes($snapshot['size']);
                $date = date('Y-m-d H:i:s', $snapshot['created_at']);
                $app->send("&7{$number}. &f{$snapshot['filename']} &7({$sizeFormatted}) - {$date}");
            }

            $app->send('');
            $app->send('&7Total: ' . count($snapshots) . ' snapshot(s)');
        } catch (\Exception $e) {
            $app->send('&cFailed to list snapshots: ' . $e->getMessage());
            \App\App::getInstance(true)->getLogger()->error('Snapshots list error: ' . $e->getMessage());
        }
    }

    /**
     * Create a new database snapshot.
     */
    private static function createSnapshot(App $app): void
    {
        try {
            $app->send($app->color1 . 'Creating database snapshot...');

            $timestamp = date('Y-m-d_H-i-s');
            $filename = "snapshot_{$timestamp}.fpb";
            $filepath = self::BACKUPS_DIR . '/' . $filename;

            // Get database configuration
            $host = $_ENV['DATABASE_HOST'] ?? '127.0.0.1';
            $database = $_ENV['DATABASE_DATABASE'] ?? '';
            $username = $_ENV['DATABASE_USER'] ?? '';
            $password = $_ENV['DATABASE_PASSWORD'] ?? '';
            $port = (int) ($_ENV['DATABASE_PORT'] ?? 3306);

            if (empty($database) || empty($username)) {
                $app->send('&cDatabase configuration is incomplete');

                return;
            }

            // Create MySQL dump
            $dumpSettings = [
                'add-drop-table' => true,
                'single-transaction' => true,
                'lock-tables' => false,
                'add-locks' => true,
                'extended-insert' => true,
                'disable-keys' => true,
                'skip-triggers' => false,
                'add-drop-trigger' => true,
                'routines' => true,
                'hex-blob' => true,
                'databases' => true,
                'add-drop-database' => false,
                'skip-tz-utc' => false,
                'no-autocommit' => true,
                'skip-comments' => false,
                'skip-dump-date' => false,
                'exclude-tables' => self::EXCLUDED_TABLES,
            ];

            $dump = new Mysqldump(
                "mysql:host={$host};port={$port};dbname={$database}",
                $username,
                $password,
                $dumpSettings
            );

            $dump->start($filepath);

            $size = filesize($filepath);
            $sizeFormatted = self::formatBytes($size);

            $app->send('&aSnapshot created successfully!');
            $app->send("&7Filename: &f{$filename}");
            $app->send("&7Size: &f{$sizeFormatted}");
        } catch (\Exception $e) {
            $app->send('&cFailed to create snapshot: ' . $e->getMessage());
            \App\App::getInstance(true)->getLogger()->error('Snapshot creation error: ' . $e->getMessage());
        }
    }

    /**
     * Download a snapshot file.
     */
    private static function downloadSnapshot(App $app, ?string $filename): void
    {
        try {
            if (empty($filename)) {
                $app->send('&cPlease specify a filename');
                $app->send('&7Usage: php fuse snapshots download <filename>');

                return;
            }

            // Sanitize filename
            $filename = basename($filename);
            $filepath = self::BACKUPS_DIR . '/' . $filename;

            if (!file_exists($filepath)) {
                $app->send('&cSnapshot not found: ' . $filename);

                return;
            }

            if (!is_file($filepath)) {
                $app->send('&cInvalid snapshot file: ' . $filename);

                return;
            }

            // Ask for destination path
            $app->send($app->color3 . 'Enter destination path (or press Enter for current directory):');
            $destination = trim(readline('> '));
            if (empty($destination)) {
                $destination = getcwd() . '/' . $filename;
            } else {
                // If it's a directory, append filename
                if (is_dir($destination)) {
                    $destination = rtrim($destination, '/') . '/' . $filename;
                }
            }

            // Copy file
            if (copy($filepath, $destination)) {
                $size = filesize($destination);
                $sizeFormatted = self::formatBytes($size);
                $app->send('&aSnapshot downloaded successfully!');
                $app->send("&7Destination: &f{$destination}");
                $app->send("&7Size: &f{$sizeFormatted}");
            } else {
                $app->send('&cFailed to copy snapshot file');
            }
        } catch (\Exception $e) {
            $app->send('&cFailed to download snapshot: ' . $e->getMessage());
            \App\App::getInstance(true)->getLogger()->error('Snapshot download error: ' . $e->getMessage());
        }
    }

    /**
     * Restore database from a snapshot.
     */
    private static function restoreSnapshot(App $app, ?string $filename, array $args = []): void
    {
        try {
            // Check for -y or --yes flag in arguments (auto-confirm)
            $autoConfirm = in_array('-y', $args, true) || in_array('--yes', $args, true);

            if (empty($filename)) {
                $app->send('&cPlease specify a filename');
                $app->send('&7Usage: php fuse snapshots restore <filename> [-y]');
                $app->send('&7  -y, --yes  Auto-confirm without prompting');

                return;
            }

            // Sanitize filename
            $filename = basename($filename);
            $filepath = self::BACKUPS_DIR . '/' . $filename;

            if (!file_exists($filepath)) {
                $app->send('&cSnapshot not found: ' . $filename);

                return;
            }

            if (!is_file($filepath)) {
                $app->send('&cInvalid snapshot file: ' . $filename);

                return;
            }

            // Warning and confirmation
            $app->send('&cWARNING: This will DELETE ALL current database data and restore from the snapshot!');
            $app->send('&cThis action CANNOT be undone!');

            if (!$autoConfirm) {
                $app->send('');
                $app->send($app->color3 . 'Are you sure you want to continue? (yes/no):');
                $confirm = strtolower(trim(readline('> ')));

                if ($confirm !== 'yes' && $confirm !== 'y') {
                    $app->send('&7Restore cancelled.');

                    return;
                }
            } else {
                $app->send('');
                $app->send('&eAuto-confirmed (--yes flag used)');
            }

            $app->send('');
            $app->send($app->color1 . 'Restoring database...');

            // Get database configuration
            $host = $_ENV['DATABASE_HOST'] ?? '127.0.0.1';
            $database = $_ENV['DATABASE_DATABASE'] ?? '';
            $username = $_ENV['DATABASE_USER'] ?? '';
            $password = $_ENV['DATABASE_PASSWORD'] ?? '';
            $port = (int) ($_ENV['DATABASE_PORT'] ?? 3306);

            if (empty($database) || empty($username)) {
                $app->send('&cDatabase configuration is incomplete');

                return;
            }

            // Connect to database
            $db = new Database($host, $database, $username, $password, $port);
            $pdo = $db->getPdo();

            // Disable foreign key checks temporarily
            $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');

            try {
                // Step 1: Get all existing table names
                $stmt = $pdo->query('SHOW TABLES');
                $tables = $stmt->fetchAll(\PDO::FETCH_COLUMN);

                // Step 2: Drop all existing tables one by one (excluding log/activity tables)
                if (!empty($tables)) {
                    $app->send($app->color3 . 'Dropping existing tables...');
                    foreach ($tables as $table) {
                        // Skip excluded tables during drop
                        if (in_array($table, self::EXCLUDED_TABLES, true)) {
                            continue;
                        }
                        // Escape table name properly
                        $tableName = str_replace('`', '``', $table);
                        $pdo->exec("DROP TABLE IF EXISTS `{$tableName}`");
                    }
                }

                // Step 3: Use mysql command line tool to import the SQL file properly
                // This handles multi-line statements, comments, and all SQL properly (like MythicalDash)
                $app->send($app->color3 . 'Importing SQL dump...');

                // Escape shell arguments
                $escapedHost = escapeshellarg($host);
                $escapedPort = escapeshellarg($port);
                $escapedDatabase = escapeshellarg($database);
                $escapedUsername = escapeshellarg($username);
                $escapedPassword = escapeshellarg($password);
                $escapedFile = escapeshellarg($filepath);

                // Build mysql command (using -p with password directly, no space after -p)
                $mysqlCmd = sprintf(
                    'mysql -h %s -P %s -u %s -p%s %s < %s 2>&1',
                    $escapedHost,
                    $escapedPort,
                    $escapedUsername,
                    $escapedPassword,
                    $escapedDatabase,
                    $escapedFile
                );

                // Execute mysql import
                $output = [];
                $returnVar = 0;
                exec($mysqlCmd, $output, $returnVar);

                if ($returnVar !== 0) {
                    $errorMsg = implode("\n", array_slice($output, 0, 10)); // Limit error output
                    throw new \Exception('MySQL import failed: ' . $errorMsg);
                }

                $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');

                $app->send('');
                $app->send('&aDatabase restored successfully!');
                $app->send('');

                // Run migrations after restore to ensure database is up to date
                $app->send($app->color3 . 'Running migrations to ensure database is up to date...');
                self::runMigrations($app, $pdo);

                $app->send('');
                $app->send('&eNote: This only protects database integrity and does not protect from deleted servers or other actions performed under Wings.');
            } catch (\Exception $e) {
                $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
                throw $e;
            }
        } catch (\Exception $e) {
            $app->send('&cFailed to restore database: ' . $e->getMessage());
            \App\App::getInstance(true)->getLogger()->error('Snapshot restore error: ' . $e->getMessage());
        }
    }

    /**
     * Delete a snapshot file.
     */
    private static function deleteSnapshot(App $app, ?string $filename): void
    {
        try {
            if (empty($filename)) {
                $app->send('&cPlease specify a filename');
                $app->send('&7Usage: php fuse snapshots delete <filename>');

                return;
            }

            // Sanitize filename
            $filename = basename($filename);
            $filepath = self::BACKUPS_DIR . '/' . $filename;

            if (!file_exists($filepath)) {
                $app->send('&cSnapshot not found: ' . $filename);

                return;
            }

            if (!is_file($filepath)) {
                $app->send('&cInvalid snapshot file: ' . $filename);

                return;
            }

            // Confirmation
            $app->send($app->color3 . 'Are you sure you want to delete this snapshot? (yes/no):');
            $confirm = strtolower(trim(readline('> ')));

            if ($confirm !== 'yes' && $confirm !== 'y') {
                $app->send('&7Deletion cancelled.');

                return;
            }

            if (unlink($filepath)) {
                $app->send('&aSnapshot deleted successfully: ' . $filename);
            } else {
                $app->send('&cFailed to delete snapshot file');
            }
        } catch (\Exception $e) {
            $app->send('&cFailed to delete snapshot: ' . $e->getMessage());
            \App\App::getInstance(true)->getLogger()->error('Snapshot deletion error: ' . $e->getMessage());
        }
    }

    /**
     * Validate that the content is actually SQL and not HTML/error pages.
     */
    private static function validateSqlContent(string $content): ?string
    {
        // Check if content is empty
        if (empty(trim($content))) {
            return 'Backup file is empty or invalid. The file does not contain any SQL data.';
        }

        // Normalize content for checking
        $contentNormalized = strtolower(trim($content));
        $contentStart = substr($contentNormalized, 0, 1000);

        // Check for HTML content
        $htmlIndicators = [
            '<!doctype',
            '<html',
            '<head',
            '<body',
            '<script',
            '<meta',
            '<title',
            'content-type: text/html',
            'http/1.1',
            'http/1.0',
            '</html>',
            '<div',
            '<span',
            '<p>',
            'error occurred',
            'not found',
            '404',
            '500',
            'internal server error',
        ];

        foreach ($htmlIndicators as $indicator) {
            if (stripos($contentStart, $indicator) !== false) {
                return 'Invalid backup file: The file appears to contain HTML content instead of SQL. This usually means the file is corrupted, was downloaded incorrectly, or is not a valid FeatherPanel Backup (.fpb) file.';
            }
        }

        // Check for JSON error responses
        if (
            preg_match('/^\s*\{.*"error".*"message"/is', $content)
            || preg_match('/^\s*\{.*"success".*false/is', $content)
            || preg_match('/^\s*\{.*"status".*\d{3}/is', $content)
        ) {
            return 'Invalid backup file: The file appears to contain an error response instead of SQL data. This usually means the download failed or the file is corrupted.';
        }

        // Check for HTTP response headers
        if (preg_match('/^(HTTP\/\d\.\d|Content-Type:|Content-Length:|Location:)/i', $content)) {
            return 'Invalid backup file: The file appears to contain HTTP response headers instead of SQL data. This usually means the file was downloaded incorrectly.';
        }

        // Check for CSS content
        $cssPatterns = ['color:', 'background:', 'font-', 'margin:', 'padding:', 'border:', 'text-', 'display:', 'position:', 'width:', 'height:'];
        foreach ($cssPatterns as $pattern) {
            if (preg_match('/\b' . preg_quote($pattern, '/') . '/i', $contentStart)) {
                return 'Invalid backup file: The file appears to contain CSS content instead of SQL. This usually means the file is corrupted or was downloaded incorrectly.';
            }
        }

        // Check for CSS hex colors
        if (preg_match('/#[0-9a-f]{3,6}/i', $contentStart)) {
            return 'Invalid backup file: The file appears to contain CSS color codes instead of SQL. This usually means the file is corrupted or was downloaded incorrectly.';
        }

        // Check for basic SQL indicators
        $sqlKeywords = ['CREATE', 'INSERT', 'DROP', 'ALTER', 'UPDATE', 'DELETE', 'SELECT', 'TABLE', 'DATABASE', 'USE ', 'SET ', 'LOCK', 'UNLOCK'];
        $hasSqlKeyword = false;
        $contentUpper = strtoupper($content);
        foreach ($sqlKeywords as $keyword) {
            if (stripos($contentUpper, $keyword) !== false) {
                $keywordPos = stripos($contentUpper, $keyword);
                $context = substr($contentUpper, max(0, $keywordPos - 50), 100);
                if (stripos($context, '<') === false && stripos($context, 'HTTP') === false) {
                    $hasSqlKeyword = true;
                    break;
                }
            }
        }

        if (!$hasSqlKeyword) {
            return 'Invalid backup file: The file does not appear to contain valid SQL statements. This usually means the file is corrupted or is not a valid FeatherPanel Backup (.fpb) file.';
        }

        return null;
    }

    /**
     * Run database migrations after restore.
     */
    private static function runMigrations(App $app, \PDO $pdo): void
    {
        try {
            // Create migrations table if it doesn't exist
            $migrationSQL = "CREATE TABLE IF NOT EXISTS `featherpanel_migrations` (
				`id` INT NOT NULL AUTO_INCREMENT COMMENT 'The id of the migration!',
				`script` TEXT NOT NULL COMMENT 'The script to be migrated!',
				`migrated` ENUM('true','false') NOT NULL DEFAULT 'true' COMMENT 'Did we migrate this already?',
				`date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'The date from when this was executed!',
				PRIMARY KEY (`id`)
			) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT = 'The migrations table is table where save the sql migrations!';";
            $pdo->exec($migrationSQL);

            // Get migration directories (core and plugins)
            $directories = self::getMigrationDirectories();
            $migrations = self::collectMigrationFiles($directories);

            $executedCount = 0;
            $skippedCount = 0;

            foreach ($migrations as $migration) {
                $migrationPath = $migration['path'];
                $migrationName = $migration['name'];
                $isCoreMigration = $migration['namespace'] === 'core';
                $addonName = $isCoreMigration ? null : substr($migration['namespace'], strlen('addon:'));
                $scriptIdentifier = $isCoreMigration
                    ? $migrationName
                    : 'addon:' . $addonName . ':' . $migrationName;

                // Check if migration already executed
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM featherpanel_migrations WHERE script = :script AND migrated = 'true'");
                $stmt->execute(['script' => $scriptIdentifier]);
                $migrationExists = $stmt->fetchColumn();

                if ($migrationExists > 0) {
                    ++$skippedCount;
                    continue; // Skip if already executed
                }

                $migrationContent = file_get_contents($migrationPath);
                if ($migrationContent === false) {
                    $app->send('&cFailed to read migration file: ' . $migrationName);
                    continue;
                }

                // Special handling for settings migration (generate encryption key)
                if ($isCoreMigration && $migrationName == '2024-11-15-22.17-create-settings.sql') {
                    $encryptionKey = XChaCha20::generateStrongKey(true);
                    \App\App::getInstance(true)->updateEnvValue('DATABASE_ENCRYPTION', 'xchacha20', false);
                    \App\App::getInstance(true)->updateEnvValue('DATABASE_ENCRYPTION_KEY', $encryptionKey, true);
                }

                // Execute migration
                $pdo->exec($migrationContent);

                // Save migration record
                $stmt = $pdo->prepare('INSERT INTO featherpanel_migrations (script, migrated) VALUES (:script, :migrated)');
                $stmt->execute([
                    'script' => $scriptIdentifier,
                    'migrated' => 'true',
                ]);

                ++$executedCount;
            }

            if ($executedCount > 0) {
                $app->send("&aExecuted {$executedCount} migration(s)");
            }
            if ($skippedCount > 0) {
                $app->send("&7Skipped {$skippedCount} migration(s) (already executed)");
            }
            if ($executedCount === 0 && $skippedCount === 0) {
                $app->send('&7No migrations to run');
            }
        } catch (\Exception $e) {
            $app->send('&cWarning: Failed to run migrations: ' . $e->getMessage());
            \App\App::getInstance(true)->getLogger()->error('Migration error after restore: ' . $e->getMessage());
        }
    }

    /**
     * Get all migration directories, including core and plugin migrations.
     *
     * @return array<string, string>
     */
    private static function getMigrationDirectories(): array
    {
        $directories = [
            'core' => __DIR__ . '/../../../storage/migrations/',
        ];

        $addonsRoot = __DIR__ . '/../../../storage/addons/';
        if (is_dir($addonsRoot)) {
            $addons = array_filter(scandir($addonsRoot) ?: [], static function (string $entry) use ($addonsRoot): bool {
                if ($entry === '.' || $entry === '..') {
                    return false;
                }

                return is_dir($addonsRoot . $entry);
            });

            sort($addons);

            foreach ($addons as $addon) {
                $migrationDirectory = $addonsRoot . $addon . '/Migrations/';
                if (is_dir($migrationDirectory)) {
                    $directories['addon:' . $addon] = $migrationDirectory;
                }
            }
        }

        return $directories;
    }

    /**
     * Collects migration files from the provided directories.
     *
     * @param array<string, string> $directories
     *
     * @return array<int, array{namespace: string, path: string, name: string}>
     */
    private static function collectMigrationFiles(array $directories): array
    {
        $migrations = [];

        foreach ($directories as $namespace => $directory) {
            if (!is_dir($directory)) {
                continue;
            }

            $files = array_filter(scandir($directory) ?: [], static function (string $file) use ($directory): bool {
                if ($file === '.' || $file === '..') {
                    return false;
                }

                if (pathinfo($file, PATHINFO_EXTENSION) !== 'sql') {
                    return false;
                }

                return is_file($directory . $file);
            });

            sort($files);

            foreach ($files as $file) {
                $migrations[] = [
                    'namespace' => $namespace,
                    'path' => $directory . $file,
                    'name' => $file,
                ];
            }
        }

        return $migrations;
    }

    /**
     * Format bytes to human-readable format.
     */
    private static function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; ++$i) {
            $bytes /= 1024;
        }

        return round($bytes, $precision) . ' ' . $units[$i];
    }
}
