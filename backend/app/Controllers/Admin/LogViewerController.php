<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Controllers\Admin;

use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class LogViewerController
{
    public function getLogs(Request $request): Response
    {
        try {
            $logType = $request->query->get('type', 'web');
            $lines = (int) $request->query->get('lines', 100);

            $logFile = $this->getLogFilePath($logType);

            if (!file_exists($logFile)) {
                return ApiResponse::error('Log file not found', 404);
            }

            $content = $this->readLastLines($logFile, $lines);

            return ApiResponse::success([
                'logs' => $content,
                'file' => basename($logFile),
                'type' => $logType,
                'lines_count' => count(explode("\n", $content)),
            ], 'Logs fetched successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to fetch logs: ' . $e->getMessage(), 500);
        }
    }

    public function clearLogs(Request $request): Response
    {
        try {
            $logType = $request->request->get('type', 'web');
            $logFile = $this->getLogFilePath($logType);

            if (!file_exists($logFile)) {
                return ApiResponse::error('Log file not found', 404);
            }

            file_put_contents($logFile, '');

            return ApiResponse::success([], 'Logs cleared successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to clear logs: ' . $e->getMessage(), 500);
        }
    }

    public function getLogFiles(Request $request): Response
    {
        try {
            $logDir = dirname(__DIR__, 3) . '/storage/logs/';
            $files = [];

            if (is_dir($logDir)) {
                $logFiles = scandir($logDir);
                foreach ($logFiles as $file) {
                    if ($file !== '.' && $file !== '..' && pathinfo($file, PATHINFO_EXTENSION) === 'fplog') {
                        $filePath = $logDir . $file;
                        $files[] = [
                            'name' => $file,
                            'size' => filesize($filePath),
                            'modified' => filemtime($filePath),
                            'type' => $this->getLogTypeFromFileName($file),
                        ];
                    }
                }
            }

            // Sort by modification time (newest first)
            usort($files, function ($a, $b) {
                return $b['modified'] - $a['modified'];
            });

            return ApiResponse::success([
                'files' => $files,
            ], 'Log files fetched successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to fetch log files: ' . $e->getMessage(), 500);
        }
    }

    private function getLogFilePath(string $type): string
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

    private function getLogTypeFromFileName(string $filename): string
    {
        if (strpos($filename, 'web') !== false) {
            return 'web';
        }
        if (strpos($filename, 'App') !== false) {
            return 'app';
        }

        return 'unknown';
    }

    private function readLastLines(string $filePath, int $lines): string
    {
        $handle = fopen($filePath, 'r');
        if (!$handle) {
            return '';
        }

        $content = '';
        $lineCount = 0;
        $buffer = [];

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
}
