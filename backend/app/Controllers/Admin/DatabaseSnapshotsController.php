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
use App\Chat\User;
use App\Chat\Database;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use Ifsnop\Mysqldump\Mysqldump;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class DatabaseSnapshotsController
{
    private const BACKUPS_DIR = __DIR__ . '/../../../storage/backups';

    /**
     * Tables to exclude from backups and restore operations.
     * These tables contain transient data (logs, activities) that don't need to be backed up.
     */
    private const EXCLUDED_TABLES = [
        'featherpanel_server_activities',
        'featherpanel_featherzerotrust_scan_logs',
        'featherpanel_featherzerotrust_cron_logs',
        'featherpanel_chatbot_messages',
        'featherpanel_chatbot_conversations',
        'featherpanel_activity',
    ];

    public function __construct()
    {
        // Ensure backups directory exists
        if (!is_dir(self::BACKUPS_DIR)) {
            mkdir(self::BACKUPS_DIR, 0755, true);
        }
    }

    #[OA\Get(
        path: '/api/admin/database-snapshots',
        summary: 'List all database snapshots',
        description: 'Retrieve a list of all available database snapshots with metadata.',
        tags: ['Admin - Database Snapshots'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Snapshots retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(
                            property: 'snapshots',
                            type: 'array',
                            items: new OA\Items(
                                type: 'object',
                                properties: [
                                    new OA\Property(property: 'filename', type: 'string', example: 'snapshot_2025-01-15_14-30-00.fpb'),
                                    new OA\Property(property: 'size', type: 'integer', description: 'File size in bytes', example: 1048576),
                                    new OA\Property(property: 'created_at', type: 'string', format: 'date-time', example: '2025-01-15T14:30:00Z'),
                                    new OA\Property(property: 'size_formatted', type: 'string', example: '1.00 MB'),
                                ]
                            )
                        ),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function index(Request $request): Response
    {
        try {
            $devModeCheck = $this->checkDeveloperMode();
            if ($devModeCheck !== null) {
                return $devModeCheck;
            }

            $snapshots = [];
            $files = glob(self::BACKUPS_DIR . '/*.fpb');

            foreach ($files as $file) {
                $filename = basename($file);
                $size = filesize($file);
                $createdAt = filemtime($file);

                $snapshots[] = [
                    'filename' => $filename,
                    'size' => $size,
                    'size_formatted' => $this->formatBytes($size),
                    'created_at' => date('Y-m-d\TH:i:s\Z', $createdAt),
                ];
            }

            // Sort by creation date (newest first)
            usort($snapshots, function ($a, $b) {
                return strcmp($b['created_at'], $a['created_at']);
            });

            return ApiResponse::success(['snapshots' => $snapshots], 'Snapshots retrieved successfully');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to list snapshots: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/database-snapshots',
        summary: 'Create a new database snapshot',
        description: 'Create a complete SQL dump of the entire database and save it as a FeatherPanel Backup (.fpb) file.',
        tags: ['Admin - Database Snapshots'],
        requestBody: new OA\RequestBody(
            description: 'Password verification required',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'password',
                        type: 'string',
                        description: 'Current user password for security verification',
                        example: 'your-password'
                    ),
                ],
                required: ['password']
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Snapshot created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'filename', type: 'string', example: 'snapshot_2025-01-15_14-30-00.fpb'),
                        new OA\Property(property: 'size', type: 'integer', description: 'File size in bytes', example: 1048576),
                        new OA\Property(property: 'size_formatted', type: 'string', example: '1.00 MB'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing password'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid password or not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions or developer mode not enabled'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create snapshot'),
        ]
    )]
    public function create(Request $request): Response
    {
        try {
            $devModeCheck = $this->checkDeveloperMode();
            if ($devModeCheck !== null) {
                return $devModeCheck;
            }

            // Verify password
            $body = json_decode($request->getContent(), true);
            $password = $body['password'] ?? null;
            $passwordCheck = $this->verifyPassword($request, $password);
            if ($passwordCheck !== null) {
                return $passwordCheck;
            }

            $timestamp = date('Y-m-d_H-i-s');
            $filename = "snapshot_{$timestamp}.fpb";
            $filepath = self::BACKUPS_DIR . '/' . $filename;

            // Get database configuration
            $host = $_ENV['DATABASE_HOST'] ?? '127.0.0.1';
            $database = $_ENV['DATABASE_DATABASE'] ?? '';
            $username = $_ENV['DATABASE_USER'] ?? '';
            $password = $_ENV['DATABASE_PASSWORD'] ?? '';
            $port = (int) ($_ENV['DATABASE_PORT'] ?? 3306);

            if (empty($database) || empty($username)) {
                return ApiResponse::error('Database configuration is incomplete', 'INVALID_CONFIG', 500);
            }

            // Create MySQL dump
            $dumpSettings = [
                'add-drop-table' => true,
                'single-transaction' => true,
                'lock-tables' => false,
                'add-locks' => true,
                'extended-insert' => true,
                'disable-keys' => true,
                'skip-triggers' => false,
                'add-drop-trigger' => true,
                'routines' => true,
                'hex-blob' => true,
                'databases' => true,
                'add-drop-database' => false,
                'skip-tz-utc' => false,
                'no-autocommit' => true,
                'skip-comments' => false,
                'skip-dump-date' => false,
                'exclude-tables' => self::EXCLUDED_TABLES,
            ];

            $dump = new Mysqldump(
                "mysql:host={$host};port={$port};dbname={$database}",
                $username,
                $password,
                $dumpSettings
            );

            $dump->start($filepath);

            $size = filesize($filepath);

            return ApiResponse::success([
                'filename' => $filename,
                'size' => $size,
                'size_formatted' => $this->formatBytes($size),
            ], 'Snapshot created successfully');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to create snapshot: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/database-snapshots/{filename}/download',
        summary: 'Download a database snapshot',
        description: 'Download a specific database snapshot file. Password verification required.',
        tags: ['Admin - Database Snapshots'],
        parameters: [
            new OA\Parameter(
                name: 'filename',
                in: 'path',
                required: true,
                description: 'The filename of the snapshot to download',
                schema: new OA\Schema(type: 'string', example: 'snapshot_2025-01-15_14-30-00.fpb')
            ),
            new OA\Parameter(
                name: 'password',
                in: 'query',
                required: true,
                description: 'Current user password for security verification',
                schema: new OA\Schema(type: 'string', example: 'your-password')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Snapshot file downloaded',
                content: new OA\MediaType(mediaType: 'application/sql')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing password or invalid snapshot'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid password or not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions or developer mode not enabled'),
            new OA\Response(response: 404, description: 'Snapshot not found'),
        ]
    )]
    public function download(Request $request, string $filename): Response
    {
        try {
            $devModeCheck = $this->checkDeveloperMode();
            if ($devModeCheck !== null) {
                return $devModeCheck;
            }

            // Verify password
            $password = $request->query->get('password');
            $passwordCheck = $this->verifyPassword($request, $password);
            if ($passwordCheck !== null) {
                return $passwordCheck;
            }

            // Sanitize filename to prevent directory traversal
            $filename = basename($filename);
            $filepath = self::BACKUPS_DIR . '/' . $filename;

            if (!file_exists($filepath)) {
                return ApiResponse::error('Snapshot not found', 'NOT_FOUND', 404);
            }

            if (!is_file($filepath)) {
                return ApiResponse::error('Invalid snapshot file', 'INVALID_FILE', 400);
            }

            $content = file_get_contents($filepath);
            if ($content === false) {
                return ApiResponse::error('Failed to read snapshot file', 'READ_ERROR', 500);
            }

            return new Response($content, 200, [
                'Content-Type' => 'application/sql',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
                'Content-Length' => strlen($content),
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0',
                'X-File-Extension' => 'fpb',
            ]);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to download snapshot: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/database-snapshots/{filename}/restore',
        summary: 'Restore database from snapshot',
        description: 'Wipe the current database and restore it from a snapshot file. WARNING: This will delete all current data!',
        tags: ['Admin - Database Snapshots'],
        parameters: [
            new OA\Parameter(
                name: 'filename',
                in: 'path',
                required: true,
                description: 'The filename of the snapshot to restore',
                schema: new OA\Schema(type: 'string', example: 'snapshot_2025-01-15_14-30-00.fpb')
            ),
        ],
        requestBody: new OA\RequestBody(
            description: 'Restore confirmation with password verification',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'confirm',
                        type: 'boolean',
                        description: 'Must be true to confirm restoration',
                        example: true
                    ),
                    new OA\Property(
                        property: 'password',
                        type: 'string',
                        description: 'Current user password for security verification',
                        example: 'your-password'
                    ),
                ],
                required: ['confirm', 'password']
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Database restored successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'Database restored successfully'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing confirmation, password, or invalid snapshot'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid password or not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions or developer mode not enabled'),
            new OA\Response(response: 404, description: 'Snapshot not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to restore database'),
        ]
    )]
    public function restore(Request $request, string $filename): Response
    {
        try {
            $devModeCheck = $this->checkDeveloperMode();
            if ($devModeCheck !== null) {
                return $devModeCheck;
            }

            $body = json_decode($request->getContent(), true);
            if (!isset($body['confirm']) || $body['confirm'] !== true) {
                return ApiResponse::error('Restoration must be confirmed', 'CONFIRMATION_REQUIRED', 400);
            }

            // Verify password
            $password = $body['password'] ?? null;
            $passwordCheck = $this->verifyPassword($request, $password);
            if ($passwordCheck !== null) {
                return $passwordCheck;
            }

            // Sanitize filename
            $filename = basename($filename);
            $filepath = self::BACKUPS_DIR . '/' . $filename;

            if (!file_exists($filepath)) {
                return ApiResponse::error('Snapshot not found', 'NOT_FOUND', 404);
            }

            if (!is_file($filepath)) {
                return ApiResponse::error('Invalid snapshot file', 'INVALID_FILE', 400);
            }

            // Read SQL file
            $sql = file_get_contents($filepath);
            if ($sql === false) {
                return ApiResponse::error('Failed to read snapshot file', 'READ_ERROR', 500);
            }

            return $this->performRestore($sql);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to restore database: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Delete(
        path: '/api/admin/database-snapshots/{filename}',
        summary: 'Delete a database snapshot',
        description: 'Delete a specific database snapshot file.',
        tags: ['Admin - Database Snapshots'],
        parameters: [
            new OA\Parameter(
                name: 'filename',
                in: 'path',
                required: true,
                description: 'The filename of the snapshot to delete',
                schema: new OA\Schema(type: 'string', example: 'snapshot_2025-01-15_14-30-00.fpb')
            ),
        ],
        requestBody: new OA\RequestBody(
            description: 'Delete confirmation with password verification',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'password',
                        type: 'string',
                        description: 'Current user password for security verification',
                        example: 'your-password'
                    ),
                ],
                required: ['password']
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Snapshot deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'Snapshot deleted successfully'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing password or invalid snapshot'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid password or not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions or developer mode not enabled'),
            new OA\Response(response: 404, description: 'Snapshot not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete snapshot'),
        ]
    )]
    public function delete(Request $request, string $filename): Response
    {
        try {
            $devModeCheck = $this->checkDeveloperMode();
            if ($devModeCheck !== null) {
                return $devModeCheck;
            }

            // Verify password
            $body = json_decode($request->getContent(), true);
            $password = $body['password'] ?? null;
            $passwordCheck = $this->verifyPassword($request, $password);
            if ($passwordCheck !== null) {
                return $passwordCheck;
            }

            // Sanitize filename
            $filename = basename($filename);
            $filepath = self::BACKUPS_DIR . '/' . $filename;

            if (!file_exists($filepath)) {
                return ApiResponse::error('Snapshot not found', 'NOT_FOUND', 404);
            }

            if (!is_file($filepath)) {
                return ApiResponse::error('Invalid snapshot file', 'INVALID_FILE', 400);
            }

            if (!unlink($filepath)) {
                return ApiResponse::error('Failed to delete snapshot file', 'DELETE_ERROR', 500);
            }

            return ApiResponse::success(['message' => 'Snapshot deleted successfully'], 'Snapshot deleted successfully');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to delete snapshot: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/database-snapshots/restore-upload',
        summary: 'Restore database from uploaded snapshot file',
        description: 'Upload and restore a FeatherPanel Backup (.fpb) file. WARNING: This will wipe all tables and delete all current data!',
        tags: ['Admin - Database Snapshots'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    required: ['file', 'confirm', 'password'],
                    properties: [
                        new OA\Property(property: 'file', type: 'string', format: 'binary', description: 'FeatherPanel Backup (.fpb) file to restore'),
                        new OA\Property(property: 'confirm', type: 'boolean', description: 'Must be true to confirm restoration'),
                        new OA\Property(property: 'password', type: 'string', description: 'Current user password for security verification'),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Database restored successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'Database restored successfully'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing confirmation, password, or invalid file'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid password or not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions or developer mode not enabled'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to restore database'),
        ]
    )]
    public function restoreUpload(Request $request): Response
    {
        try {
            $devModeCheck = $this->checkDeveloperMode();
            if ($devModeCheck !== null) {
                return $devModeCheck;
            }

            // Check confirmation
            $confirm = $request->request->get('confirm');
            if ($confirm !== 'true' && $confirm !== true) {
                return ApiResponse::error('Restoration must be confirmed', 'CONFIRMATION_REQUIRED', 400);
            }

            // Verify password
            $password = $request->request->get('password');
            $passwordCheck = $this->verifyPassword($request, $password);
            if ($passwordCheck !== null) {
                return $passwordCheck;
            }

            // Check if file was uploaded
            if (!$request->files->has('file')) {
                return ApiResponse::error('No backup file provided', 'NO_FILE_PROVIDED', 400);
            }

            $file = $request->files->get('file');
            if (!$file->isValid()) {
                return ApiResponse::error('Invalid file upload', 'INVALID_FILE', 400);
            }

            // Validate file extension
            $extension = strtolower(pathinfo($file->getClientOriginalName(), PATHINFO_EXTENSION));
            if ($extension !== 'fpb') {
                return ApiResponse::error('Invalid file type. Only .fpb (FeatherPanel Backup) files are allowed', 'INVALID_FILE_TYPE', 400);
            }

            // Check file size (max 1GB for safety)
            $maxSize = 1024 * 1024 * 1024; // 1GB
            if ($file->getSize() > $maxSize) {
                return ApiResponse::error('File size too large. Maximum size is 1GB', 'FILE_TOO_LARGE', 400);
            }

            // Read SQL content from uploaded file
            $sql = file_get_contents($file->getPathname());
            if ($sql === false) {
                return ApiResponse::error('Failed to read uploaded file', 'READ_ERROR', 500);
            }

            return $this->performRestore($sql);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to restore database: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/database-snapshots/fresh-restore',
        summary: 'Restore database to fresh state',
        description: 'Wipe the entire database clean, run migrations, and recreate the current user with the same session token. WARNING: This will delete ALL data including users, servers, and all other records!',
        tags: ['Admin - Database Snapshots'],
        requestBody: new OA\RequestBody(
            description: 'Fresh restore confirmation with password verification',
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(
                        property: 'confirm',
                        type: 'boolean',
                        description: 'Must be true to confirm fresh restore',
                        example: true
                    ),
                    new OA\Property(
                        property: 'password',
                        type: 'string',
                        description: 'Current user password for security verification',
                        example: 'your-password'
                    ),
                ],
                required: ['confirm', 'password']
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Database restored to fresh state successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'Database restored to fresh state successfully'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing confirmation or password'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid password or not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions or developer mode not enabled'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to restore database'),
        ]
    )]
    public function freshRestore(Request $request): Response
    {
        $app = App::getInstance(true);
        try {
            $devModeCheck = $this->checkDeveloperMode();
            if ($devModeCheck !== null) {
                return $devModeCheck;
            }

            $body = json_decode($request->getContent(), true);
            if (!isset($body['confirm']) || $body['confirm'] !== true) {
                return ApiResponse::error('Fresh restore must be confirmed', 'CONFIRMATION_REQUIRED', 400);
            }

            // Verify password
            $password = $body['password'] ?? null;
            $passwordCheck = $this->verifyPassword($request, $password);
            if ($passwordCheck !== null) {
                return $passwordCheck;
            }

            // Get current user info before wiping
            $currentUser = $request->get('user');
            if (!$currentUser || !isset($currentUser['id'])) {
                return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
            }

            // Get full user record to preserve all fields
            $userInfo = User::getUserById((int) $currentUser['id']);
            if (!$userInfo) {
                return ApiResponse::error('Failed to retrieve user information', 'USER_NOT_FOUND', 400);
            }

            // Preserve important user fields
            $preservedUserData = [
                'username' => $userInfo['username'],
                'email' => $userInfo['email'],
                'password' => $userInfo['password'], // Already hashed
                'first_name' => $userInfo['first_name'],
                'last_name' => $userInfo['last_name'],
                'uuid' => $userInfo['uuid'],
                'remember_token' => $userInfo['remember_token'] ?? null, // Preserve session token!
                'role_id' => 4, // Preserve role (default to 4 = User if not set)
                'first_ip' => $userInfo['first_ip'] ?? null,
                'last_ip' => $userInfo['last_ip'] ?? null,
            ];

            // Get database configuration
            $host = $_ENV['DATABASE_HOST'] ?? '127.0.0.1';
            $database = $_ENV['DATABASE_DATABASE'] ?? '';
            $username = $_ENV['DATABASE_USER'] ?? '';
            $dbPassword = $_ENV['DATABASE_PASSWORD'] ?? '';
            $port = (int) ($_ENV['DATABASE_PORT'] ?? 3306);

            if (empty($database) || empty($username)) {
                return ApiResponse::error('Database configuration is incomplete', 'INVALID_CONFIG', 500);
            }

            // Connect to database
            $db = new Database($host, $database, $username, $dbPassword, $port);
            $pdo = $db->getPdo();

            // Disable foreign key checks temporarily
            $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
            $pdo->exec('SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO"');
            $pdo->exec('SET AUTOCOMMIT = 0');
            $pdo->exec('START TRANSACTION');

            try {
                // Step 1: Get all existing table names
                $stmt = $pdo->query('SHOW TABLES');
                $tables = $stmt->fetchAll(\PDO::FETCH_COLUMN);

                // Step 2: Drop ALL existing tables (no exclusions for fresh restore)
                if (!empty($tables)) {
                    foreach ($tables as $table) {
                        $tableName = str_replace('`', '``', $table);
                        $pdo->exec("DROP TABLE IF EXISTS `{$tableName}`");
                    }
                }

                $pdo->exec('COMMIT');
                $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
                $pdo->exec('SET AUTOCOMMIT = 1');

                // Step 3: Run migrations
                $this->runMigrations($pdo);

                // Step 4: Recreate user with preserved data (including remember_token)
                $userId = User::createUser($preservedUserData);
                if (!$userId) {
                    return ApiResponse::error('Failed to recreate user after fresh restore', 'USER_RECREATE_FAILED', 500);
                }

                // Step 5: If this was the first user (ID 1), ensure they have admin role (role_id 1 = Admin)
                if ($userId == 1) {
                    User::updateUser($preservedUserData['uuid'], ['role_id' => 4]);
                }

                // Make sure to enable developer mode back after restore!
                $app->getConfig()->setSetting(ConfigInterface::APP_DEVELOPER_MODE, 'true');

                return ApiResponse::success(
                    ['message' => 'Database restored to fresh state successfully'],
                    'Database has been wiped clean, migrations have been run, and your user account has been recreated with the same session token. You should remain logged in. Note: Wings daemon, server files, and server data remain completely untouched and safe - only the database was affected.'
                );
            } catch (\Exception $e) {
                $pdo->exec('ROLLBACK');
                $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
                $pdo->exec('SET AUTOCOMMIT = 1');

                throw $e;
            }
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to perform fresh restore: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Check if developer mode and debug mode are enabled.
     * Database snapshots are only available in developer mode with debug mode enabled for security.
     */
    private function checkDeveloperMode(): ?Response
    {
        $config = App::getInstance(true)->getConfig();
        if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
            return ApiResponse::error('Bruh... you really thought you could just waltz in here and nuke the database? 😂 Nice try, but you need to enable developer mode first. Go touch some grass and come back when you\'re ready.', 'DEVELOPER_MODE_REQUIRED', 403);
        }

        // Check if APP_DEBUG is defined and true
        if (!defined('APP_DEBUG') || APP_DEBUG !== true) {
            return ApiResponse::error('WOAHHH SKRRRRRRRRR SKDIOOO YOU TRYING TO NUKE SOMETHING TODAY?? NAHHHH 😤 You think you\'re slick? Debug mode is OFF, my guy. Turn it on first before you try to delete everything. This ain\'t a drill, this is REAL LIFE! 💀', 'DEBUG_MODE_REQUIRED', 403);
        }

        return null;
    }

    /**
     * Verify the current user's password for risky operations.
     */
    private function verifyPassword(Request $request, ?string $password): ?Response
    {
        // Get current user from request
        $currentUser = $request->get('user');
        if (!$currentUser || !isset($currentUser['id'])) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        // Check if password was provided
        if (empty($password)) {
            return ApiResponse::error('Password is required to perform this action', 'PASSWORD_REQUIRED', 400);
        }

        // Get full user record with password hash
        $userInfo = User::getUserById((int) $currentUser['id']);
        if (!$userInfo || !isset($userInfo['password'])) {
            return ApiResponse::error('Failed to verify user credentials', 'USER_NOT_FOUND', 400);
        }

        // Verify password
        if (!password_verify($password, $userInfo['password'])) {
            return ApiResponse::error('Invalid password', 'INVALID_PASSWORD', 401);
        }

        return null;
    }

    /**
     * Validate that the content is actually SQL and not HTML/error pages.
     */
    private function validateSqlContent(string $content): ?Response
    {
        // Check if content is empty
        if (empty(trim($content))) {
            return ApiResponse::error('Backup file is empty or invalid. The file does not contain any SQL data.', 'INVALID_SQL_CONTENT', 400);
        }

        // Check for HTML content (common error page indicators)
        $htmlIndicators = ['<!DOCTYPE', '<html', '<head', '<body', '<script', 'Content-Type: text/html'];
        $contentStart = substr(trim($content), 0, 500); // Check first 500 chars
        foreach ($htmlIndicators as $indicator) {
            if (stripos($contentStart, $indicator) !== false) {
                return ApiResponse::error('Invalid backup file: The file appears to contain HTML content instead of SQL. This usually means the file is corrupted, was downloaded incorrectly, or is not a valid FeatherPanel Backup (.fpb) file. Please try downloading the backup again or create a new snapshot.', 'INVALID_SQL_CONTENT', 400);
            }
        }

        // Check for JSON error responses
        if (preg_match('/^\s*\{.*"error".*"message"/is', $content)) {
            return ApiResponse::error('Invalid backup file: The file appears to contain an error response instead of SQL data. This usually means the download failed or the file is corrupted. Please try downloading the backup again or create a new snapshot.', 'INVALID_SQL_CONTENT', 400);
        }

        // Check for basic SQL indicators (at least one SQL keyword should be present)
        $sqlKeywords = ['CREATE', 'INSERT', 'DROP', 'ALTER', 'UPDATE', 'DELETE', 'SELECT', 'TABLE', 'DATABASE'];
        $hasSqlKeyword = false;
        foreach ($sqlKeywords as $keyword) {
            if (stripos($content, $keyword) !== false) {
                $hasSqlKeyword = true;
                break;
            }
        }

        if (!$hasSqlKeyword) {
            return ApiResponse::error('Invalid backup file: The file does not appear to contain valid SQL statements. This usually means the file is corrupted or is not a valid FeatherPanel Backup (.fpb) file. Please try downloading the backup again or create a new snapshot.', 'INVALID_SQL_CONTENT', 400);
        }

        return null;
    }

    /**
     * Perform the actual database restore from SQL content.
     */
    private function performRestore(string $sql): Response
    {
        // Validate SQL content first
        $validationError = $this->validateSqlContent($sql);
        if ($validationError !== null) {
            return $validationError;
        }

        // Get database configuration
        $host = $_ENV['DATABASE_HOST'] ?? '127.0.0.1';
        $database = $_ENV['DATABASE_DATABASE'] ?? '';
        $username = $_ENV['DATABASE_USER'] ?? '';
        $password = $_ENV['DATABASE_PASSWORD'] ?? '';
        $port = (int) ($_ENV['DATABASE_PORT'] ?? 3306);

        if (empty($database) || empty($username)) {
            return ApiResponse::error('Database configuration is incomplete', 'INVALID_CONFIG', 500);
        }

        // Connect to database
        $db = new Database($host, $database, $username, $password, $port);
        $pdo = $db->getPdo();

        // Disable foreign key checks temporarily
        $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
        $pdo->exec('SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO"');
        $pdo->exec('SET AUTOCOMMIT = 0');
        $pdo->exec('START TRANSACTION');

        try {
            // Step 1: Get all existing table names
            $stmt = $pdo->query('SHOW TABLES');
            $tables = $stmt->fetchAll(\PDO::FETCH_COLUMN);

            // Step 2: Drop all existing tables one by one (excluding log/activity tables)
            if (!empty($tables)) {
                foreach ($tables as $table) {
                    // Skip excluded tables during drop (these tables are not in the backup)
                    if (in_array($table, self::EXCLUDED_TABLES, true)) {
                        continue;
                    }
                    // Escape table name properly
                    $tableName = str_replace('`', '``', $table);
                    $pdo->exec("DROP TABLE IF EXISTS `{$tableName}`");
                }
            }

            // Step 3: Split SQL into individual statements
            $statements = array_filter(
                array_map('trim', explode(';', $sql)),
                function ($stmt) {
                    return !empty($stmt) && !preg_match('/^--/', $stmt) && !preg_match('/^\/\*/', $stmt);
                }
            );

            // Step 4: Execute each statement from the backup
            foreach ($statements as $statement) {
                if (!empty($statement)) {
                    $pdo->exec($statement);
                }
            }

            $pdo->exec('COMMIT');
            $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
            $pdo->exec('SET AUTOCOMMIT = 1');

            return ApiResponse::success(
                ['message' => 'Database restored successfully'],
                'Database restored successfully. Please note: This only protects database integrity and does not protect from deleted servers or other actions performed under Wings. Restoring from this backup might corrupt your database and unsync your panel with Wings!'
            );
        } catch (\Exception $e) {
            $pdo->exec('ROLLBACK');
            $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
            $pdo->exec('SET AUTOCOMMIT = 1');

            throw $e;
        }
    }

    /**
     * Format bytes to human-readable format.
     */
    private function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; ++$i) {
            $bytes /= 1024;
        }

        return round($bytes, $precision) . ' ' . $units[$i];
    }

    /**
     * Run database migrations (similar to Migrate.php command).
     */
    private function runMigrations(\PDO $pdo): void
    {
        // Create migrations table if it doesn't exist
        $migrationSQL = "CREATE TABLE IF NOT EXISTS `featherpanel_migrations` (
            `id` INT NOT NULL AUTO_INCREMENT COMMENT 'The id of the migration!',
            `script` TEXT NOT NULL COMMENT 'The script to be migrated!',
            `migrated` ENUM('true','false') NOT NULL DEFAULT 'true' COMMENT 'Did we migrate this already?',
            `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'The date from when this was executed!',
            PRIMARY KEY (`id`)
        ) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT = 'The migrations table is table where save the sql migrations!';";
        $pdo->exec($migrationSQL);

        // Get migration directories (core and plugins)
        $directories = $this->getMigrationDirectories();
        $migrations = $this->collectMigrationFiles($directories);

        // Execute each migration
        foreach ($migrations as $migration) {
            $migrationPath = $migration['path'];
            $migrationName = $migration['name'];
            $isCoreMigration = $migration['namespace'] === 'core';
            $addonName = $isCoreMigration ? null : substr($migration['namespace'], strlen('addon:'));
            $scriptIdentifier = $isCoreMigration
                ? $migrationName
                : 'addon:' . $addonName . ':' . $migrationName;

            // Check if migration already executed (shouldn't happen in fresh restore, but check anyway)
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM featherpanel_migrations WHERE script = :script AND migrated = 'true'");
            $stmt->execute(['script' => $scriptIdentifier]);
            $migrationExists = $stmt->fetchColumn();

            if ($migrationExists > 0) {
                continue; // Skip if already executed
            }

            $migrationContent = file_get_contents($migrationPath);
            if ($migrationContent === false) {
                throw new \Exception("Failed to read migration file: {$migrationName}");
            }

            // Special handling for settings migration (generate encryption key)
            if ($isCoreMigration && $migrationName == '2024-11-15-22.17-create-settings.sql') {
                $encryptionKey = \App\Helpers\XChaCha20::generateStrongKey(true);
                App::getInstance(true)->updateEnvValue('DATABASE_ENCRYPTION', 'xchacha20', false);
                App::getInstance(true)->updateEnvValue('DATABASE_ENCRYPTION_KEY', $encryptionKey, true);
            }

            // Execute migration
            $pdo->exec($migrationContent);

            // Save migration record
            $stmt = $pdo->prepare('INSERT INTO featherpanel_migrations (script, migrated) VALUES (:script, :migrated)');
            $stmt->execute([
                'script' => $scriptIdentifier,
                'migrated' => 'true',
            ]);
        }
    }

    /**
     * Get all migration directories, including core and plugin migrations.
     *
     * @return array<string, string>
     */
    private function getMigrationDirectories(): array
    {
        $directories = [
            'core' => __DIR__ . '/../../../storage/migrations/',
        ];

        $addonsRoot = __DIR__ . '/../../../storage/addons/';
        if (is_dir($addonsRoot)) {
            $addons = array_filter(scandir($addonsRoot) ?: [], static function (string $entry) use ($addonsRoot): bool {
                if ($entry === '.' || $entry === '..') {
                    return false;
                }

                return is_dir($addonsRoot . $entry);
            });

            sort($addons);

            foreach ($addons as $addon) {
                $migrationDirectory = $addonsRoot . $addon . '/Migrations/';
                if (is_dir($migrationDirectory)) {
                    $directories['addon:' . $addon] = $migrationDirectory;
                }
            }
        }

        return $directories;
    }

    /**
     * Collects migration files from the provided directories.
     *
     * @param array<string, string> $directories
     *
     * @return array<int, array{namespace: string, path: string, name: string}>
     */
    private function collectMigrationFiles(array $directories): array
    {
        $migrations = [];

        foreach ($directories as $namespace => $directory) {
            if (!is_dir($directory)) {
                continue;
            }

            $files = array_filter(scandir($directory) ?: [], static function (string $file) use ($directory): bool {
                if ($file === '.' || $file === '..') {
                    return false;
                }

                if (pathinfo($file, PATHINFO_EXTENSION) !== 'sql') {
                    return false;
                }

                return is_file($directory . $file);
            });

            sort($files);

            foreach ($files as $file) {
                $migrations[] = [
                    'namespace' => $namespace,
                    'path' => $directory . $file,
                    'name' => $file,
                ];
            }
        }

        return $migrations;
    }
}
