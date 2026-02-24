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

namespace App\Controllers\Admin;

use App\App;
use App\Helpers\LogHelper;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
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
        new OA\Property(property: 'type', type: 'string', description: 'Log type (web, app, mail, unknown)', enum: ['web', 'app', 'mail', 'unknown']),
    ]
)]
#[OA\Schema(
    schema: 'LogContent',
    type: 'object',
    properties: [
        new OA\Property(property: 'logs', type: 'string', description: 'Log content as string'),
        new OA\Property(property: 'file', type: 'string', description: 'Log file name'),
        new OA\Property(property: 'type', type: 'string', description: 'Log type', enum: ['web', 'app', 'mail']),
        new OA\Property(property: 'lines_count', type: 'integer', description: 'Number of lines in the log content'),
    ]
)]
#[OA\Schema(
    schema: 'LogClear',
    type: 'object',
    required: ['type'],
    properties: [
        new OA\Property(property: 'type', type: 'string', description: 'Log type to clear', enum: ['web', 'app', 'mail'], default: 'web'),
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
                schema: new OA\Schema(type: 'string', enum: ['web', 'app', 'mail'], default: 'web')
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
        description: 'Clear the contents of a specific log file. Requires ADMIN_ROOT permissions.',
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
        description: 'Upload recent web and app logs to mclo.gs paste service and get shareable URLs. Requires ADMIN_ROOT permissions.',
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

            // Limit to last lines to prevent memory issues and oversized uploads.
            // 3,000 lines is usually enough context while staying under external service limits.
            $lineLimit = 3000;

            // Helper to hard-cap very large log payloads (e.g. exceptionally long lines)
            $truncateContent = static function (string $content): string {
                $maxBytes = 500000; // ~500 KB
                $length = strlen($content);
                if ($length <= $maxBytes) {
                    return $content;
                }

                // Keep the last part of the log (most recent entries)
                return substr($content, -$maxBytes);
            };

            // Upload web logs (often missing when web server logs are external)
            $webLogFile = LogHelper::getLogFilePath('web');
            if (file_exists($webLogFile)) {
                $webContent = $truncateContent(LogHelper::readLastLines($webLogFile, $lineLimit));
                $results['web'] = LogHelper::uploadToMcloGs($webContent);
            } else {
                // Do not fail the whole upload if web logs are missing – this is expected on some setups.
                $results['web'] = [
                    'success' => false,
                    'error' => 'Web log file not found (this is normal when web server logs are external)',
                ];
            }

            // Upload app logs
            $appLogFile = LogHelper::getLogFilePath('app');
            if (file_exists($appLogFile)) {
                $appContent = $truncateContent(LogHelper::readLastLines($appLogFile, $lineLimit));
                $results['app'] = LogHelper::uploadToMcloGs($appContent);
            } else {
                $results['app'] = [
                    'success' => false,
                    'error' => 'App log file not found',
                ];
            }

            // Upload mail logs
            $mailLogFile = LogHelper::getLogFilePath('mail');
            if (file_exists($mailLogFile)) {
                $mailContent = $truncateContent(LogHelper::readLastLines($mailLogFile, $lineLimit));
                $results['mail'] = LogHelper::uploadToMcloGs($mailContent);
            } else {
                $results['mail'] = [
                    'success' => false,
                    'error' => 'Mail log file not found',
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
