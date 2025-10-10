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

namespace App\Helpers;

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
