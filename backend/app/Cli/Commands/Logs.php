<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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
use App\Cli\CommandBuilder;

class Logs extends App implements CommandBuilder
{
    public static function execute(array $args): void
    {
        $app = App::getInstance();
        if (!file_exists(__DIR__ . '/../../../storage/config/.env')) {
            \App\App::getInstance(true)->getLogger()->warning('Executed a command without a .env file');
            $app->send('The .env file does not exist. Please create one before running this command');
            exit;
        }

        $app->send('&aUploading logs to McloGs...');

        $lineLimit = 10000;

        // Upload web logs
        $webLogFile = self::getLogFilePath('web');
        // If the log file exists but is empty, warn and skip upload.
        if (file_exists($webLogFile) && filesize($webLogFile) > 0) {
            $app->send('&eUploading web logs...');
            $webContent = self::readLastLines($webLogFile, $lineLimit);
            $webResult = self::uploadToMcloGs($webContent);
            if ($webResult['success']) {
                $app->send('&aWeb logs uploaded: ' . $webResult['url']);
            } else {
                $app->send('&cFailed to upload web logs: ' . ($webResult['error'] ?? 'Unknown error'));
            }
        } else {
            $app->send('&cWeb log file not found or is empty');
        }

        // Upload app logs
        $appLogFile = self::getLogFilePath('app');
        if (file_exists($appLogFile) && filesize($appLogFile) > 0) {
            $app->send('&eUploading app logs...');
            $appContent = self::readLastLines($appLogFile, $lineLimit);
            $appResult = self::uploadToMcloGs($appContent);
            if ($appResult['success']) {
                $app->send('&aApp logs uploaded: ' . $appResult['url']);
            } else {
                $app->send('&cFailed to upload app logs: ' . ($appResult['error'] ?? 'Unknown error'));
            }
        } else {
            $app->send('&cApp log file not found or is empty');
        }

        $app->send('&aLog upload complete!');

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

    private static function getLogFilePath(string $type): string
    {
        $logDir = dirname(__DIR__, 3) . '/storage/logs/';

        switch ($type) {
            case 'web':
                return $logDir . 'featherpanel-web.fplog';
            case 'app':
                return $logDir . 'App.fplog';
            default:
                return $logDir . 'featherpanel-web.fplog';
        }
    }

    private static function uploadToMcloGs(string $content): array
    {
        try {
            $ch = curl_init('https://api.mclo.gs/1/log');
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(['content' => $content]));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/x-www-form-urlencoded',
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode !== 200) {
                return [
                    'success' => false,
                    'error' => 'Failed to upload to mclo.gs (HTTP ' . $httpCode . ')',
                ];
            }

            $result = json_decode($response, true);

            if (!$result || !isset($result['success']) || !$result['success']) {
                return [
                    'success' => false,
                    'error' => $result['error'] ?? 'Unknown error from mclo.gs',
                ];
            }

            return [
                'success' => true,
                'id' => $result['id'],
                'url' => $result['url'],
                'raw' => $result['raw'],
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Exception: ' . $e->getMessage(),
            ];
        }
    }

    private static function readLastLines(string $filePath, int $lines): string
    {
        $handle = fopen($filePath, 'r');
        if (!$handle) {
            return '';
        }

        $buffer = [];
        $lineCount = 0;

        while (($line = fgets($handle)) !== false) {
            $buffer[] = $line;
            ++$lineCount;

            if ($lineCount > $lines) {
                array_shift($buffer);
                --$lineCount;
            }
        }

        fclose($handle);

        return implode('', $buffer);
    }
}
