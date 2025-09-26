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

use App\App;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'LogFile',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Log file name'),
        new OA\Property(property: 'size', type: 'integer', description: 'File size in bytes'),
        new OA\Property(property: 'modified', type: 'integer', description: 'Last modification timestamp'),
        new OA\Property(property: 'type', type: 'string', description: 'Log type (web, app, unknown)', enum: ['web', 'app', 'unknown']),
    ]
)]
#[OA\Schema(
    schema: 'LogContent',
    type: 'object',
    properties: [
        new OA\Property(property: 'logs', type: 'string', description: 'Log content as string'),
        new OA\Property(property: 'file', type: 'string', description: 'Log file name'),
        new OA\Property(property: 'type', type: 'string', description: 'Log type', enum: ['web', 'app']),
        new OA\Property(property: 'lines_count', type: 'integer', description: 'Number of lines in the log content'),
    ]
)]
#[OA\Schema(
    schema: 'LogClear',
    type: 'object',
    required: ['type'],
    properties: [
        new OA\Property(property: 'type', type: 'string', description: 'Log type to clear', enum: ['web', 'app'], default: 'web'),
    ]
)]
class LogViewerController
{
    #[OA\Get(
        path: '/api/admin/log-viewer/get',
        summary: 'Get log content',
        description: 'Retrieve the last N lines from a specific log file. Only available in developer mode and requires ADMIN_ROOT permissions.',
        tags: ['Admin - Log Viewer'],
        parameters: [
            new OA\Parameter(
                name: 'type',
                in: 'query',
                description: 'Log type to retrieve',
                required: false,
                schema: new OA\Schema(type: 'string', enum: ['web', 'app'], default: 'web')
            ),
            new OA\Parameter(
                name: 'lines',
                in: 'query',
                description: 'Number of lines to retrieve from the end of the log file',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 10000, default: 100)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Log content retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/LogContent')
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled or insufficient permissions'),
            new OA\Response(response: 404, description: 'Log file not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to fetch logs'),
        ]
    )]
    public function getLogs(Request $request): Response
    {
        try {
            $config = App::getInstance(true)->getConfig();
            if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
                return ApiResponse::error('You are not allowed to view logs in non-developer mode', 403);
            }
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

    #[OA\Post(
        path: '/api/admin/log-viewer/clear',
        summary: 'Clear log file',
        description: 'Clear the contents of a specific log file. Only available in developer mode and requires ADMIN_ROOT permissions.',
        tags: ['Admin - Log Viewer'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/LogClear')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Log file cleared successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled or insufficient permissions'),
            new OA\Response(response: 404, description: 'Log file not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to clear logs'),
        ]
    )]
    public function clearLogs(Request $request): Response
    {
        try {
            $config = App::getInstance(true)->getConfig();
            if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
                return ApiResponse::error('You are not allowed to clear logs in non-developer mode', 403);
            }
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

    #[OA\Get(
        path: '/api/admin/log-viewer/files',
        summary: 'Get log files list',
        description: 'Retrieve a list of all available log files with metadata. Only available in developer mode and requires ADMIN_ROOT permissions.',
        tags: ['Admin - Log Viewer'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Log files retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'files', type: 'array', items: new OA\Items(ref: '#/components/schemas/LogFile')),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled or insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to fetch log files'),
        ]
    )]
    public function getLogFiles(Request $request): Response
    {
        try {
            $config = App::getInstance(true)->getConfig();
            if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
                return ApiResponse::error('You are not allowed to view log files in non-developer mode', 403);
            }
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
