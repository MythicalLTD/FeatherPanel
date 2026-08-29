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

namespace App\Cli\Commands;

use App\Cli\App;
use App\Chat\Database;
use App\Chat\WebPlate;
use App\App as MainApp;
use App\Cli\CommandBuilder;

/**
 * Upsert bundled system WebPlates without running full migrations.
 */
class SeedWebPlates extends App implements CommandBuilder
{
    public static function execute(array $args): void
    {
        $cliApp = App::getInstance();
        $cliApp->send($cliApp->color1 . '&l[FeatherPanel] &r' . $cliApp->color3 . 'Seed system WebPlates');
        $cliApp->send('&7' . str_repeat('─', 50));

        if (!file_exists(__DIR__ . '/../../../storage/config/.env')) {
            $cliApp->send('&c&l❌ Error: &rThe .env file does not exist.');
            exit(1);
        }

        try {
            MainApp::getInstance(true)->loadEnv();
            new Database(
                $_ENV['DATABASE_HOST'],
                $_ENV['DATABASE_DATABASE'],
                $_ENV['DATABASE_USER'],
                $_ENV['DATABASE_PASSWORD'],
                $_ENV['DATABASE_PORT'],
            );

            $result = WebPlate::seedSystemDefaults();
            $cliApp->send(
                '&a&l✅ Done: &r&f'
                . $result['created'] . '&r&a created, &r&f'
                . $result['updated'] . '&r&a updated, &r&f'
                . $result['skipped'] . '&r&a skipped',
            );
            $cliApp->send('&7System plates keep author=system and refresh on migrate. Change author to fork.');
        } catch (\Throwable $e) {
            $cliApp->send('&c&l❌ Failed: &r' . $e->getMessage());
            exit(1);
        }
    }

    public static function getDescription(): string
    {
        return 'Upsert bundled system WebPlate templates (static, PHP, Node, Python)';
    }

    public static function getSubCommands(): array
    {
        return [];
    }
}
