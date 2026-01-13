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
            default:
                return $logDir . 'featherpanel-web.fplog';
        }
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
     * Upload log content to mclo.gs paste service.
     *
     * @param string $content Log content to upload
     *
     * @return array Upload result with 'success', 'url', 'raw', 'id' or 'error'
     */
    public static function uploadToMcloGs(string $content): array
    {
        try {
            $ch = curl_init('https://api.featherpanel.com/1/log');
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query(['content' => $content]));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30); // 30 second timeout
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10); // 10 second connection timeout
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/x-www-form-urlencoded',
            ]);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);

            if ($curlError) {
                App::getInstance(true)->getLogger()->error('mclo.gs curl error: ' . $curlError);

                return [
                    'success' => false,
                    'error' => 'Failed to connect to mclo.gs: ' . $curlError,
                ];
            }

            if ($response === false) {
                App::getInstance(true)->getLogger()->error('mclo.gs curl_exec returned false');

                return [
                    'success' => false,
                    'error' => 'Failed to execute curl request to mclo.gs',
                ];
            }

            if ($httpCode !== 200) {
                App::getInstance(true)->getLogger()->error('mclo.gs HTTP error: ' . $httpCode . ', Response: ' . substr($response, 0, 500));

                return [
                    'success' => false,
                    'error' => 'Failed to upload to mclo.gs (HTTP ' . $httpCode . ')',
                ];
            }

            $result = json_decode($response, true);
            $jsonError = json_last_error();

            if ($jsonError !== JSON_ERROR_NONE) {
                App::getInstance(true)->getLogger()->error('mclo.gs JSON decode error: ' . json_last_error_msg() . ', Response: ' . substr($response, 0, 500));

                return [
                    'success' => false,
                    'error' => 'Invalid response from mclo.gs: ' . json_last_error_msg(),
                ];
            }

            if (!$result || !isset($result['success']) || !$result['success']) {
                $errorMsg = $result['error'] ?? ($result['message'] ?? 'Unknown error from mclo.gs');
                App::getInstance(true)->getLogger()->error('mclo.gs API error: ' . $errorMsg . ', Full response: ' . json_encode($result));

                return [
                    'success' => false,
                    'error' => $errorMsg,
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

        return 'unknown';
    }
}
