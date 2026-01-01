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
use App\App as MainApp;
use App\Helpers\XChaCha20;
use App\Cli\CommandBuilder;

class Migrate extends App implements CommandBuilder
{
    private const PLUGIN_NAMESPACE_PREFIX = 'addon:';

    public static function execute(array $args): void
    {
        $cliApp = App::getInstance();

        // Display header
        $cliApp->send($cliApp->color1 . '&l[FeatherPanel] &r' . $cliApp->color3 . 'Database Migration Tool');
        $cliApp->send('&7' . str_repeat('─', 50));

        if (!file_exists(__DIR__ . '/../../../storage/config/.env')) {
            MainApp::getInstance(true)->getLogger()->warning('Executed a command without a .env file');
            $cliApp->send('&c&l❌ Error: &rThe .env file does not exist. Please create one before running this command');
            exit;
        }

        $sqlScript = self::getMigrationSQL();
        $startTime = microtime(true);

        try {
            MainApp::getInstance(true)->loadEnv();
            $cliApp->send($cliApp->color3 . '&l⏳ Connecting to database... &r&7' . $_ENV['DATABASE_HOST'] . ':' . $_ENV['DATABASE_PORT']);

            $db = new Database($_ENV['DATABASE_HOST'], $_ENV['DATABASE_DATABASE'], $_ENV['DATABASE_USER'], $_ENV['DATABASE_PASSWORD'], $_ENV['DATABASE_PORT']);

            // --- Fix duplicate settings before running migrations that add unique constraints ---
            $pdo = $db->getPdo();
            $tableExists = $pdo->query("SHOW TABLES LIKE 'featherpanel_settings'")->rowCount() > 0;
            if ($tableExists) {
                $cliApp->send($cliApp->color3 . '&l🔧 Cleaning duplicate settings...');
                $fixSql = 'DELETE FROM featherpanel_settings WHERE id NOT IN (SELECT id FROM (SELECT MAX(id) as id FROM featherpanel_settings GROUP BY name) as keep_ids);';
                $deletedRows = $pdo->exec($fixSql);
                if ($deletedRows > 0) {
                    $cliApp->send('&a&l✅ Cleaned &r&f' . $deletedRows . '&r&a duplicate settings');
                } else {
                    $cliApp->send('&a&l✅ No duplicate settings found');
                }
            }
            // --- End fix ---
        } catch (\Exception $e) {
            $cliApp->send('&c&l❌ Database Connection Failed: &r' . $e->getMessage());
            exit;
        }

        $connectionTime = round((microtime(true) - $startTime) * 1000, 2);
        $cliApp->send('&a&l✅ Connected to database! &r&7(' . $connectionTime . 'ms)');

        /**
         * Check if the migrations table exists.
         */
        try {
            $query = $db->getPdo()->query("SHOW TABLES LIKE 'featherpanel_migrations'");
            if ($query->rowCount() > 0) {
                $cliApp->send($cliApp->color3 . '&l📋 Migrations table already exists');
            } else {
                $cliApp->send($cliApp->color3 . '&l🏗️  Creating migrations table...');
                $db->getPdo()->exec(statement: $sqlScript);
                $cliApp->send('&a&l✅ Migrations table created successfully!');
            }
        } catch (\Exception $e) {
            $cliApp->send('&c&l❌ Failed to create migrations table: &r' . $e->getMessage());
            exit;
        }

        /**
         * Get all the migration scripts.
         */
        $migrationDirectories = self::getMigrationDirectories();
        $orderedMigrations = self::collectMigrationFiles($migrationDirectories);

        $totalMigrations = count($orderedMigrations);
        $executedMigrations = 0;
        $skippedMigrations = 0;
        $failedMigrations = 0;

        $cliApp->send($cliApp->color3 . '&l📊 Found &r&f' . $totalMigrations . '&r' . $cliApp->color3 . ' migration files');
        $cliApp->send('&7' . str_repeat('─', 50));

        $currentNamespace = null;

        foreach ($orderedMigrations as $migration) {
            if ($currentNamespace !== $migration['namespace']) {
                if ($currentNamespace !== null) {
                    $cliApp->send('&7' . str_repeat('─', 50));
                }

                $currentNamespace = $migration['namespace'];

                $sourceLabel = $currentNamespace === 'core'
                    ? 'Core Migrations'
                    : 'Plugin - ' . substr($currentNamespace, strlen(self::PLUGIN_NAMESPACE_PREFIX));

                $cliApp->send($cliApp->color1 . '&l📦 Source: &r&f' . $sourceLabel);
            }

            $migrationPath = $migration['path'];
            $migrationName = $migration['name'];
            $isCoreMigration = $currentNamespace === 'core';
            $addonName = $isCoreMigration ? null : substr($currentNamespace, strlen(self::PLUGIN_NAMESPACE_PREFIX));
            $displayName = $isCoreMigration ? $migrationName : $addonName . '::' . $migrationName;
            $scriptIdentifier = $isCoreMigration
                ? $migrationName
                : self::PLUGIN_NAMESPACE_PREFIX . $addonName . ':' . $migrationName;

            /**
             * Check if the migration was already executed.
             */
            $stmt = $db->getPdo()->prepare("SELECT COUNT(*) FROM featherpanel_migrations WHERE script = :script AND migrated = 'true'");
            $stmt->execute(['script' => $scriptIdentifier]);
            $migrationExists = $stmt->fetchColumn();

            if ($migrationExists > 0) {
                $cliApp->send('&7&l⏭️  Skipped: &r&7' . $displayName . ' &8(already executed)');
                ++$skippedMigrations;
                continue;
            }

            $migrationContent = file_get_contents($migrationPath);
            if ($migrationContent === false) {
                $cliApp->send('&c&l❌ Failed to read migration file: &r&f' . $displayName);
                ++$failedMigrations;
                exit;
            }

            /**
             * Execute the migration.
             */
            $cliApp->send($cliApp->color3 . '&l🔄 Executing: &r&f' . $displayName);
            $migrationStartTime = microtime(true);

            try {
                if ($isCoreMigration && $migrationName == '2024-11-15-22.17-create-settings.sql') {
                    $cliApp->send($cliApp->color3 . '&l🔄 Generating encryption key...');
                    // Generate an encryption key for xchacha20
                    $encryptionKey = XChaCha20::generateStrongKey(true);
                    MainApp::getInstance(true)->updateEnvValue('DATABASE_ENCRYPTION', 'xchacha20', false);
                    MainApp::getInstance(true)->updateEnvValue('DATABASE_ENCRYPTION_KEY', $encryptionKey, true);
                    $cliApp->send('&a&l✅ Encryption key generated successfully!');
                }
                $db->getPdo()->exec($migrationContent);
                $migrationTime = round((microtime(true) - $migrationStartTime) * 1000, 2);
                $cliApp->send('&a&l✅ Success: &r&f' . $displayName . ' &7(' . $migrationTime . 'ms)');
                ++$executedMigrations;
            } catch (\Exception $e) {
                $cliApp->send('&c&l❌ Failed: &r&f' . $displayName);
                $cliApp->send('&c&l   Error: &r' . $e->getMessage());
                ++$failedMigrations;
                exit;
            }

            /**
             * Save the migration to the database.
             */
            try {
                $stmt = $db->getPdo()->prepare('INSERT INTO featherpanel_migrations (script, migrated) VALUES (:script, :migrated)');
                $stmt->execute([
                    'script' => $scriptIdentifier,
                    'migrated' => 'true',
                ]);
            } catch (\Exception $e) {
                $cliApp->send('&c&l❌ Failed to save migration record: &r' . $e->getMessage());
                exit;
            }
        }

        $totalTime = round((microtime(true) - $startTime) * 1000, 2);

        $cliApp->send('&7' . str_repeat('─', 50));
        $cliApp->send($cliApp->color1 . '&l📈 Migration Summary:');
        $cliApp->send('&a&l   ✅ Executed: &r&f' . $executedMigrations . '&r&a migrations');
        $cliApp->send('&7&l   ⏭️  Skipped: &r&f' . $skippedMigrations . '&r&7 migrations');
        $cliApp->send('&c&l   ❌ Failed: &r&f' . $failedMigrations . '&r&c migrations');
        $cliApp->send($cliApp->color3 . '&l   ⏱️  Total Time: &r&f' . $totalTime . '&r' . $cliApp->color3 . ' ms');

        if ($failedMigrations > 0) {
            $cliApp->send('&c&l⚠️  Some migrations failed. Please check the errors above.');
        } else {
            $cliApp->send('&a&l🎉 All migrations completed successfully!');
        }

        $cliApp->send($cliApp->color3 . '&l🔄 Please restart the server to apply the changes!');
    }

    public static function getDescription(): string
    {
        return 'Migrate the database to the latest version';
    }

    public static function getSubCommands(): array
    {
        return [];
    }

    private static function getMigrationSQL(): string
    {
        return "CREATE TABLE IF NOT EXISTS `featherpanel_migrations` (
            `id` INT NOT NULL AUTO_INCREMENT COMMENT 'The id of the migration!',
            `script` TEXT NOT NULL COMMENT 'The script to be migrated!',
            `migrated` ENUM('true','false') NOT NULL DEFAULT 'true' COMMENT 'Did we migrate this already?',
            `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'The date from when this was executed!',
            PRIMARY KEY (`id`)
        ) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT = 'The migrations table is table where save the sql migrations!';";
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
                    $directories[self::PLUGIN_NAMESPACE_PREFIX . $addon] = $migrationDirectory;
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
}
