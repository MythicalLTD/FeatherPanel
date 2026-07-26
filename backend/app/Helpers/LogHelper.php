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

namespace App\Helpers;

use App\App;
use App\Config\ConfigInterface;

/**
 * LogHelper - Utility class for log file operations and uploads.
 */
class LogHelper
{
    /**
     * Get the full path to a log file by type.
     *
     * @param string $type Log type ('web', 'app', etc.)
     *
     * @return string Full path to the log file
     */
    public static function getLogFilePath(string $type): string
    {
        $logDir = dirname(__DIR__, 2) . '/storage/logs/';

        switch ($type) {
            case 'web':
                return $logDir . 'featherpanel-web.fplog';
            case 'app':
                return $logDir . 'App.fplog';
            case 'mail':
                return $logDir . 'mail.fplog';
            case 'runner':
                $configuredRunnerDir = trim((string) ($_ENV['LOG_DIR'] ?? ''));
                if ($configuredRunnerDir !== '') {
                    $configuredPath = rtrim($configuredRunnerDir, '/') . '/runner.fplog';
                    if (file_exists($configuredPath)) {
                        return $configuredPath;
                    }
                }

                // Docker runtime fallback used by async-runner image.
                $tmpRunnerPath = '/tmp/runner-logs/runner.fplog';
                if (file_exists($tmpRunnerPath)) {
                    return $tmpRunnerPath;
                }

                return $logDir . 'runner.fplog';
            default:
                return $logDir . 'featherpanel-web.fplog';
        }
    }

    /**
     * Ensure the log directory exists and the log file for the given type is
     * present on disk. Creates both with safe permissions if missing.
     * Returns the full path to the log file.
     *
     * @param string $type Log type ('web', 'app', 'mail', 'runner', …)
     *
     * @return string Full path to the (now-guaranteed) log file
     */
    public static function ensureLogFile(string $type): string
    {
        $path = self::getLogFilePath($type);
        $dir = dirname($path);

        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }

        if (!file_exists($path)) {
            file_put_contents($path, '');
            chmod($path, 0664);
        }

        return $path;
    }

    /**
     * Read the last N lines from a log file.
     *
     * @param string $filePath Path to the log file
     * @param int $lines Number of lines to read from the end
     *
     * @return string Content of the last N lines
     */
    public static function readLastLines(string $filePath, int $lines): string
    {
        $handle = fopen($filePath, 'r');
        if (!$handle) {
            return '';
        }

        $buffer = [];
        $lineCount = 0;

        // Read the file line by line and keep only the last $lines
        while (($line = fgets($handle)) !== false) {
            $buffer[] = $line;
            ++$lineCount;

            // Keep only the last $lines in memory
            if ($lineCount > $lines) {
                array_shift($buffer);
                --$lineCount;
            }
        }

        fclose($handle);

        return implode('', $buffer);
    }

    /**
     * Upload log content to Mythic Panel paste API when linked, otherwise legacy paste host.
     *
     * @param string $content Log content to upload
     *
     * @return array Upload result with 'success', 'url', 'raw', 'id' or 'error'
     */
    public static function uploadToMcloGs(string $content): array
    {
        $mythic = self::uploadToMythicPaste($content);
        if ($mythic !== null) {
            return $mythic;
        }

        return [
            'success' => false,
            'error' => 'Mythic paste upload unavailable. Link Mythic Cloud and enable pastes, or configure panel credentials.',
        ];
    }

    /**
     * Get log type from filename.
     *
     * @param string $filename The log filename
     *
     * @return string Log type ('web', 'app', or 'unknown')
     */
    public static function getLogTypeFromFileName(string $filename): string
    {
        if (strpos($filename, 'web') !== false) {
            return 'web';
        }
        if (strpos($filename, 'App') !== false) {
            return 'app';
        }
        if (strpos($filename, 'mail') !== false) {
            return 'mail';
        }
        if (strpos($filename, 'runner') !== false) {
            return 'runner';
        }

        return 'unknown';
    }

    /**
     * @return array{success: bool, id?: string, url?: string, raw?: string, error?: string}|null
     */
    private static function uploadToMythicPaste(string $content): ?array
    {
        try {
            $config = App::getInstance(true)->getConfig();
            if (($config->getSetting(ConfigInterface::FEATHERCLOUD_PASTES_ENABLED, 'true') ?? 'true') !== 'true') {
                return null;
            }

            $client = new \App\Services\FeatherCloud\FeatherCloudClient();
            if (!$client->isConfigured()) {
                return null;
            }

            $data = $client->createPaste(['content' => $content]);
            $id = (string) ($data['id'] ?? $data['key'] ?? '');
            if ($id === '') {
                return [
                    'success' => false,
                    'error' => 'Mythic paste response missing id',
                ];
            }

            $base = $client->getBaseUrl();

            return [
                'success' => true,
                'id' => $id,
                'url' => $data['url'] ?? ('https://pastes.mythicalsystems.org/p/' . $id),
                'raw' => $data['raw'] ?? ($base . '/raw/' . $id),
            ];
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->warning('Mythic paste upload failed, falling back: ' . $e->getMessage());

            return null;
        }
    }
}
