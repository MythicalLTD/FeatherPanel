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
