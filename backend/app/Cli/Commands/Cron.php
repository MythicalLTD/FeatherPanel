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
use App\Cli\CommandBuilder;

class Cron extends App implements CommandBuilder
{
    public static function execute(array $args): void
    {
        // Initialize the main app singleton to ensure DB and other services are available for cron tasks
        new \App\App(false, true);

        $app = App::getInstance();
        $app->send($app->color1 . '&l[FeatherPanel] &r' . $app->color3 . 'Cron Job Runner');
        $app->send('&7' . str_repeat('─', 50));

        $cronDir = APP_CRON_DIR . 'php/';
        if (!is_dir($cronDir)) {
            $app->send('&cError: Cron directory not found: ' . $cronDir);

            return;
        }

        $files = scandir($cronDir);
        $tasksProcessed = 0;

        foreach ($files as $file) {
            if ($file === '.' || $file === '..' || !str_ends_with($file, '.php')) {
                continue;
            }

            $className = str_replace('.php', '', $file);
            $fullClass = "\\App\\Cron\\$className";

            if (class_exists($fullClass)) {
                $app->send($app->color3 . "Running task: &f$className");
                try {
                    $task = new $fullClass();
                    if (method_exists($task, 'run')) {
                        $task->run();
                        ++$tasksProcessed;
                    } else {
                        $app->send("&eWarning: Method 'run' not found in $className");
                    }
                } catch (\Throwable $e) {
                    $app->send("&cError running $className: " . $e->getMessage());
                }
            } else {
                $app->send("&eWarning: Class $fullClass not found in $file");
            }
        }

        $app->send('&7' . str_repeat('─', 50));
        $app->send("&a&l✅ Finished! &r&7Processed $tasksProcessed tasks.");
    }

    public static function getDescription(): string
    {
        return 'Run all scheduled cron jobs';
    }

    public static function getSubCommands(): array
    {
        return [];
    }
}
