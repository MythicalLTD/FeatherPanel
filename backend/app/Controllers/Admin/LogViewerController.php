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

namespace App\Controllers\Admin;

use App\App;
use App\Helpers\LogHelper;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\Plugins\Events\Events\LogViewerEvent;
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

            $logFile = LogHelper::getLogFilePath($logType);

            if (!file_exists($logFile)) {
                return ApiResponse::error('Log file not found', 404);
            }

            $content = LogHelper::readLastLines($logFile, $lines);

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
            $logFile = LogHelper::getLogFilePath($logType);

            if (!file_exists($logFile)) {
                return ApiResponse::error('Log file not found', 404);
            }

            file_put_contents($logFile, '');

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    LogViewerEvent::onLogCleared(),
                    [
                        'log_type' => $logType,
                        'log_file' => basename($logFile),
                        'cleared_by' => $request->get('user'),
                    ]
                );
            }

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
                            'type' => LogHelper::getLogTypeFromFileName($file),
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

    #[OA\Post(
        path: '/api/admin/log-viewer/upload',
        summary: 'Upload logs to mclo.gs',
        description: 'Upload web and app logs to mclo.gs paste service and get shareable URLs. Only available in developer mode and requires ADMIN_ROOT permissions.',
        tags: ['Admin - Log Viewer'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Logs uploaded successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: 'web',
                            type: 'object',
                            properties: [
                                new OA\Property(property: 'success', type: 'boolean'),
                                new OA\Property(property: 'url', type: 'string'),
                                new OA\Property(property: 'raw', type: 'string'),
                                new OA\Property(property: 'id', type: 'string'),
                            ]
                        ),
                        new OA\Property(
                            property: 'app',
                            type: 'object',
                            properties: [
                                new OA\Property(property: 'success', type: 'boolean'),
                                new OA\Property(property: 'url', type: 'string'),
                                new OA\Property(property: 'raw', type: 'string'),
                                new OA\Property(property: 'id', type: 'string'),
                            ]
                        ),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled or insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to upload logs'),
        ]
    )]
    public function uploadLogs(Request $request): Response
    {
        try {
            $results = [];

            // Limit to last 10,000 lines to prevent memory issues
            $lineLimit = 10000;

            // Upload web logs
            $webLogFile = LogHelper::getLogFilePath('web');
            if (file_exists($webLogFile)) {
                $webContent = LogHelper::readLastLines($webLogFile, $lineLimit);
                $webResult = LogHelper::uploadToMcloGs($webContent);
                $results['web'] = $webResult;
            } else {
                $results['web'] = [
                    'success' => false,
                    'error' => 'Web log file not found',
                ];
            }

            // Upload app logs
            $appLogFile = LogHelper::getLogFilePath('app');
            if (file_exists($appLogFile)) {
                $appContent = LogHelper::readLastLines($appLogFile, $lineLimit);
                $appResult = LogHelper::uploadToMcloGs($appContent);
                $results['app'] = $appResult;
            } else {
                $results['app'] = [
                    'success' => false,
                    'error' => 'App log file not found',
                ];
            }

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    LogViewerEvent::onLogsUploaded(),
                    [
                        'results' => $results,
                        'uploaded_by' => $request->get('user'),
                    ]
                );
            }

            return ApiResponse::success($results, 'Logs uploaded successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to upload logs: ' . $e->getMessage(), 500);
        }
    }
}
