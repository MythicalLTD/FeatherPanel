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
use App\Helpers\LogHelper;
use App\Cli\CommandBuilder;

class Logs extends App implements CommandBuilder
{
    public static function execute(array $args): void
    {
        $app = App::getInstance();
        if (!file_exists(__DIR__ . '/../../../storage/config/.env')) {
            \App\App::getInstance(true)->getLogger()->warning('Executed a command without a .env file');
            $app->send('&cThe .env file does not exist. Please create one before running this command');
            exit;
        }

        $app->send($app->color1 . 'Uploading logs to McloGs...');

        $lineLimit = 10000;

        // Upload web logs
        $webLogFile = LogHelper::getLogFilePath('web');
        // If the log file exists but is empty, warn and skip upload.
        if (file_exists($webLogFile) && filesize($webLogFile) > 0) {
            $app->send($app->color3 . 'Uploading web logs...');
            $webContent = LogHelper::readLastLines($webLogFile, $lineLimit);
            $webResult = LogHelper::uploadToMcloGs($webContent);
            if ($webResult['success']) {
                $app->send('&aWeb logs uploaded: &f' . $webResult['url']);
            } else {
                $app->send('&cFailed to upload web logs: ' . ($webResult['error'] ?? 'Unknown error'));
            }
        } else {
            $app->send($app->color3 . 'Web log file not found or is empty');
        }

        // Upload app logs
        $appLogFile = LogHelper::getLogFilePath('app');
        if (file_exists($appLogFile) && filesize($appLogFile) > 0) {
            $app->send($app->color3 . 'Uploading app logs...');
            $appContent = LogHelper::readLastLines($appLogFile, $lineLimit);
            $appResult = LogHelper::uploadToMcloGs($appContent);
            if ($appResult['success']) {
                $app->send('&aApp logs uploaded: &f' . $appResult['url']);
            } else {
                $app->send('&cFailed to upload app logs: ' . ($appResult['error'] ?? 'Unknown error'));
            }
        } else {
            $app->send($app->color3 . 'App log file not found or is empty');
        }

        $app->send($app->color1 . 'Log upload complete!');

        exit;
    }

    public static function getDescription(): string
    {
        return 'Upload the logs to McloGs!';
    }

    public static function getSubCommands(): array
    {
        return [];
    }
}
