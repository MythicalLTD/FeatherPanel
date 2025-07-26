<?php

/*
 * This file is part of App.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Cli\Commands;

use App\Cli\App;
use App\Chat\Database;
use App\Cli\CommandBuilder;

class Migrate extends App implements CommandBuilder
{
    public static function execute(array $args): void
    {
        $cliApp = App::getInstance();
        if (!file_exists(__DIR__ . '/../../../storage/.env')) {
            \App\App::getInstance(true)->getLogger()->warning('Executed a command without a .env file');
            $cliApp->send('The .env file does not exist. Please create one before running this command');
            exit;
        }
        $sqlScript = self::getMigrationSQL();
        try {
            \App\App::getInstance(true)->loadEnv();
            $db = new Database($_ENV['DATABASE_HOST'], $_ENV['DATABASE_DATABASE'], $_ENV['DATABASE_USER'], $_ENV['DATABASE_PASSWORD'], $_ENV['DATABASE_PORT']);

            // --- Fix duplicate settings before running migrations that add unique constraints ---
            $pdo = $db->getPdo();
            $tableExists = $pdo->query("SHOW TABLES LIKE 'mythicalpanel_settings'")->rowCount() > 0;
            if ($tableExists) {
                $fixSql = 'DELETE FROM mythicalpanel_settings WHERE id NOT IN (SELECT id FROM (SELECT MAX(id) as id FROM mythicalpanel_settings GROUP BY name) as keep_ids);';
                $pdo->exec($fixSql);
            }
            // --- End fix ---
        } catch (\Exception $e) {
            $cliApp->send('&cFailed to connect to the database: &r' . $e->getMessage());
            exit;
        }
        $cliApp->send('&aConnected to the database!');

        /**
         * Check if the migrations table exists.
         */
        try {
            $query = $db->getPdo()->query("SHOW TABLES LIKE 'mythicalpanel_migrations'");
            if ($query->rowCount() > 0) {
            } else {
                $db->getPdo()->exec(statement: $sqlScript);
                $cliApp->send('&7The migrations table has been created!');
            }
        } catch (\Exception $e) {
            $cliApp->send('&cFailed to create the migrations table: &r' . $e->getMessage());
            exit;
        }
        /**
         * Get all the migration scripts.
         */
        $migrations = scandir(__DIR__ . '/../../../storage/migrations/');
        foreach ($migrations as $migration) {
            /**
             * Skip the . and .. directories.
             */
            if ($migration == '.' || $migration == '..') {
                continue;
            }
            /**
             * Get the migration content.
             */
            $migration = __DIR__ . "/../../../storage/migrations/$migration";
            $migrationContent = file_get_contents($migration);
            $migrationName = explode('/', $migration);
            $migrationName = end($migrationName);

            /**
             * Check if the migration was already executed.
             */
            $stmt = $db->getPdo()->prepare("SELECT COUNT(*) FROM mythicalpanel_migrations WHERE script = :script AND migrated = 'true'");
            $stmt->execute(['script' => $migrationName]);
            $migrationExists = $stmt->fetchColumn();

            if ($migrationExists > 0) {
                continue;
            }

            /**
             * Execute the migration.
             */
            try {
                $db->getPdo()->exec($migrationContent);
                $cliApp->send("&7Migration executed successfully: &e$migrationName");
            } catch (\Exception $e) {
                $cliApp->send('&cFailed to execute migration: &8[&4' . $migrationName . '&8] &r' . $e->getMessage());
                exit;
            }

            /**
             * Save the migration to the database.
             */
            try {
                $stmt = $db->getPdo()->prepare('INSERT INTO mythicalpanel_migrations (script, migrated) VALUES (:script, :migrated)');
                $stmt->execute([
                    'script' => $migrationName,
                    'migrated' => 'true',
                ]);
                $cliApp->send('&aMigration saved to the database!');
            } catch (\Exception $e) {
                $cliApp->send('&cFailed to save the migration to the database: &r' . $e->getMessage());
                exit;
            }
        }
        $cliApp->send('&aAll migrations have been executed!');
        $cliApp->send('&aPlease restart the server to apply the changes!');
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
        return "CREATE TABLE IF NOT EXISTS `mythicalpanel_migrations` (
            `id` INT NOT NULL AUTO_INCREMENT COMMENT 'The id of the migration!',
            `script` TEXT NOT NULL COMMENT 'The script to be migrated!',
            `migrated` ENUM('true','false') NOT NULL DEFAULT 'true' COMMENT 'Did we migrate this already?',
            `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'The date from when this was executed!',
            PRIMARY KEY (`id`)
        ) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT = 'The migrations table is table where save the sql migrations!';";
    }
}
