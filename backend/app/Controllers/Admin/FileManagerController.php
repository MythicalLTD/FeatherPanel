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
use App\Plugins\Events\Events\FileManagerEvent;

#[OA\Schema(
    schema: 'FileItem',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'File or directory name'),
        new OA\Property(property: 'path', type: 'string', description: 'Relative path from project root'),
        new OA\Property(property: 'isDirectory', type: 'boolean', description: 'Whether the item is a directory'),
        new OA\Property(property: 'size', type: 'integer', nullable: true, description: 'File size in bytes (null for directories)'),
        new OA\Property(property: 'modified', type: 'integer', description: 'Last modification timestamp'),
        new OA\Property(property: 'permissions', type: 'string', description: 'File permissions in octal format'),
    ]
)]
#[OA\Schema(
    schema: 'FileContent',
    type: 'object',
    properties: [
        new OA\Property(property: 'path', type: 'string', description: 'File path'),
        new OA\Property(property: 'content', type: 'string', nullable: true, description: 'File content (null for binary files)'),
        new OA\Property(property: 'isBinary', type: 'boolean', description: 'Whether the file is binary'),
        new OA\Property(property: 'mimeType', type: 'string', description: 'MIME type of the file'),
        new OA\Property(property: 'extension', type: 'string', description: 'File extension'),
        new OA\Property(property: 'size', type: 'integer', description: 'File size in bytes'),
        new OA\Property(property: 'modified', type: 'integer', description: 'Last modification timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'FileSave',
    type: 'object',
    required: ['path', 'content'],
    properties: [
        new OA\Property(property: 'path', type: 'string', description: 'File path to save'),
        new OA\Property(property: 'content', type: 'string', description: 'File content to write'),
    ]
)]
#[OA\Schema(
    schema: 'FileCreate',
    type: 'object',
    required: ['path'],
    properties: [
        new OA\Property(property: 'path', type: 'string', description: 'Path for the new file or directory'),
        new OA\Property(property: 'isDirectory', type: 'boolean', description: 'Whether to create a directory (default: false)', default: false),
    ]
)]
#[OA\Schema(
    schema: 'FileDelete',
    type: 'object',
    required: ['path'],
    properties: [
        new OA\Property(property: 'path', type: 'string', description: 'Path of the file or directory to delete'),
    ]
)]
class FileManagerController
{
    private string $rootPath;

    public function __construct()
    {
        // Set root path to the project root (one level up from backend)
        $this->rootPath = dirname(__DIR__, 3);
    }

    #[OA\Get(
        path: '/api/admin/file-manager/browse',
        summary: 'Browse directory contents',
        description: 'Browse the contents of a directory in the project filesystem. Only available in developer mode and requires ADMIN_ROOT permissions.',
        tags: ['Admin - File Manager'],
        parameters: [
            new OA\Parameter(
                name: 'path',
                in: 'query',
                description: 'Directory path to browse (relative to project root)',
                required: false,
                schema: new OA\Schema(type: 'string', default: '')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Directory contents retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'path', type: 'string', description: 'Current directory path'),
                        new OA\Property(property: 'items', type: 'array', items: new OA\Items(ref: '#/components/schemas/FileItem')),
                        new OA\Property(property: 'parent', type: 'string', nullable: true, description: 'Parent directory path'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled or insufficient permissions'),
            new OA\Response(response: 404, description: 'Directory not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to browse directory'),
        ]
    )]
    public function browse(Request $request): Response
    {
        try {
            $config = App::getInstance(true)->getConfig();
            if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
                return ApiResponse::error('You are not allowed to browse files in non-developer mode', 403);
            }
            $path = $request->query->get('path', '');
            $fullPath = $this->resolvePath($path);

            if (!is_dir($fullPath)) {
                return ApiResponse::error('Directory not found', 404);
            }

            $items = [];
            $files = scandir($fullPath);

            foreach ($files as $file) {
                if ($file === '.' || $file === '..') {
                    continue;
                }

                $itemPath = $fullPath . DIRECTORY_SEPARATOR . $file;
                $relativePath = $path ? $path . DIRECTORY_SEPARATOR . $file : $file;

                $items[] = [
                    'name' => $file,
                    'path' => $relativePath,
                    'isDirectory' => is_dir($itemPath),
                    'size' => is_file($itemPath) ? filesize($itemPath) : null,
                    'modified' => filemtime($itemPath),
                    'permissions' => substr(sprintf('%o', fileperms($itemPath)), -4),
                ];
            }

            // Sort directories first, then files, both alphabetically
            usort($items, function ($a, $b) {
                if ($a['isDirectory'] === $b['isDirectory']) {
                    return strcmp($a['name'], $b['name']);
                }

                return $a['isDirectory'] ? -1 : 1;
            });

            return ApiResponse::success([
                'path' => $path,
                'items' => $items,
                'parent' => $path ? dirname($path) : null,
            ], 'Directory contents fetched successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to browse directory: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/file-manager/read',
        summary: 'Read file contents',
        description: 'Read the contents of a file. Binary files will return null content with isBinary flag set to true. Only available in developer mode and requires ADMIN_ROOT permissions.',
        tags: ['Admin - File Manager'],
        parameters: [
            new OA\Parameter(
                name: 'path',
                in: 'query',
                description: 'File path to read (relative to project root)',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'File content retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/FileContent')
            ),
            new OA\Response(response: 400, description: 'Bad request - Path is not a file'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled or insufficient permissions'),
            new OA\Response(response: 404, description: 'File not found'),
            new OA\Response(response: 413, description: 'File too large (max 5MB)'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to read file'),
        ]
    )]
    public function readFile(Request $request): Response
    {
        try {
            $config = App::getInstance(true)->getConfig();
            if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
                return ApiResponse::error('You are not allowed to read files in non-developer mode', 403);
            }
            $path = $request->query->get('path', '');
            $fullPath = $this->resolvePath($path);

            if (!file_exists($fullPath)) {
                return ApiResponse::error('File not found', 404);
            }

            if (!is_file($fullPath)) {
                return ApiResponse::error('Path is not a file', 400);
            }

            // Check file size (limit to 5MB for safety)
            $fileSize = filesize($fullPath);
            if ($fileSize > 5 * 1024 * 1024) {
                return ApiResponse::error('File too large (max 5MB)', 413);
            }

            $content = file_get_contents($fullPath);
            $mimeType = mime_content_type($fullPath);
            $extension = pathinfo($fullPath, PATHINFO_EXTENSION);

            // Check if file is binary
            $isBinary = $this->isBinary($content);

            return ApiResponse::success([
                'path' => $path,
                'content' => $isBinary ? null : $content,
                'isBinary' => $isBinary,
                'mimeType' => $mimeType,
                'extension' => $extension,
                'size' => $fileSize,
                'modified' => filemtime($fullPath),
            ], 'File content fetched successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to read file: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/file-manager/save',
        summary: 'Save file contents',
        description: 'Save content to a file. Creates backup of existing files before overwriting. Only available in developer mode and requires ADMIN_ROOT permissions.',
        tags: ['Admin - File Manager'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/FileSave')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'File saved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'path', type: 'string', description: 'File path'),
                        new OA\Property(property: 'size', type: 'integer', description: 'Number of bytes written'),
                        new OA\Property(property: 'modified', type: 'integer', description: 'Last modification timestamp'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled, insufficient permissions, or access denied to path'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to save file'),
        ]
    )]
    public function saveFile(Request $request): Response
    {
        try {
            $config = App::getInstance(true)->getConfig();
            if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
                return ApiResponse::error('You are not allowed to save files in non-developer mode', 403);
            }
            $path = $request->request->get('path', '');
            $content = $request->request->get('content', '');
            $fullPath = $this->resolvePath($path);

            // Validate path is within project bounds
            if (!$this->isPathAllowed($fullPath)) {
                return ApiResponse::error('Access denied to this path', 403);
            }

            // Create directory if it doesn't exist
            $dir = dirname($fullPath);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            // Backup original file
            if (file_exists($fullPath)) {
                $backupPath = $fullPath . '.backup.' . time();
                copy($fullPath, $backupPath);
            }

            // Write new content
            $result = file_put_contents($fullPath, $content);

            if ($result === false) {
                return ApiResponse::error('Failed to save file', 500);
            }

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    FileManagerEvent::onFileSaved(),
                    [
                        'path' => $path,
                        'size' => $result,
                        'saved_by' => $request->get('user'),
                    ]
                );
            }

            return ApiResponse::success([
                'path' => $path,
                'size' => $result,
                'modified' => filemtime($fullPath),
            ], 'File saved successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to save file: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/file-manager/create',
        summary: 'Create file or directory',
        description: 'Create a new file or directory. Only available in developer mode and requires ADMIN_ROOT permissions.',
        tags: ['Admin - File Manager'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/FileCreate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'File or directory created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'path', type: 'string', description: 'Created file or directory path'),
                        new OA\Property(property: 'isDirectory', type: 'boolean', description: 'Whether a directory was created'),
                        new OA\Property(property: 'created', type: 'integer', description: 'Creation timestamp'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled, insufficient permissions, or access denied to path'),
            new OA\Response(response: 409, description: 'Conflict - File or directory already exists'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create file or directory'),
        ]
    )]
    public function createFile(Request $request): Response
    {
        try {
            $config = App::getInstance(true)->getConfig();
            if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
                return ApiResponse::error('You are not allowed to create files in non-developer mode', 403);
            }
            $path = $request->request->get('path', '');
            $isDirectory = $request->request->getBoolean('isDirectory', false);
            $fullPath = $this->resolvePath($path);

            // Validate path is within project bounds
            if (!$this->isPathAllowed($fullPath)) {
                return ApiResponse::error('Access denied to this path', 403);
            }

            if (file_exists($fullPath)) {
                return ApiResponse::error('File or directory already exists', 409);
            }

            // Create directory if it doesn't exist
            $dir = dirname($fullPath);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            if ($isDirectory) {
                mkdir($fullPath, 0755);
            } else {
                file_put_contents($fullPath, '');
            }

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    FileManagerEvent::onFileCreated(),
                    [
                        'path' => $path,
                        'is_directory' => $isDirectory,
                        'created_by' => $request->get('user'),
                    ]
                );
            }

            return ApiResponse::success([
                'path' => $path,
                'isDirectory' => $isDirectory,
                'created' => filemtime($fullPath),
            ], ($isDirectory ? 'Directory' : 'File') . ' created successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to create ' . ($isDirectory ? 'directory' : 'file') . ': ' . $e->getMessage(), 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/file-manager/delete',
        summary: 'Delete file or directory',
        description: 'Delete a file or directory (recursively for directories). Prevents deletion of critical system directories. Only available in developer mode and requires ADMIN_ROOT permissions.',
        tags: ['Admin - File Manager'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/FileDelete')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'File or directory deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled, insufficient permissions, access denied to path, or critical system directory'),
            new OA\Response(response: 404, description: 'File or directory not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete file or directory'),
        ]
    )]
    public function deleteFile(Request $request): Response
    {
        try {
            $config = App::getInstance(true)->getConfig();
            if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
                return ApiResponse::error('You are not allowed to delete files in non-developer mode', 403);
            }
            $path = $request->request->get('path', '');
            $fullPath = $this->resolvePath($path);

            // Validate path is within project bounds
            if (!$this->isPathAllowed($fullPath)) {
                return ApiResponse::error('Access denied to this path', 403);
            }

            if (!file_exists($fullPath)) {
                return ApiResponse::error('File or directory not found', 404);
            }

            // Prevent deletion of critical directories
            $criticalPaths = [
                'backend/storage',
                'backend/vendor',
                'frontend/node_modules',
                '.git',
            ];

            foreach ($criticalPaths as $criticalPath) {
                if (strpos($fullPath, $this->rootPath . DIRECTORY_SEPARATOR . $criticalPath) === 0) {
                    return ApiResponse::error('Cannot delete critical system directory', 403);
                }
            }

            $isDirectory = is_dir($fullPath);

            if ($isDirectory) {
                $this->deleteDirectory($fullPath);
            } else {
                unlink($fullPath);
            }

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    FileManagerEvent::onFileDeleted(),
                    [
                        'path' => $path,
                        'was_directory' => $isDirectory,
                        'deleted_by' => $request->get('user'),
                    ]
                );
            }

            return ApiResponse::success([], 'File or directory deleted successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to delete file or directory: ' . $e->getMessage(), 500);
        }
    }

    private function resolvePath(string $path): string
    {
        // Clean the path and remove any path traversal attempts
        $path = str_replace(['../', '..\\', './', '.\\'], '', $path);
        $path = trim($path, '/\\');

        $fullPath = $this->rootPath . DIRECTORY_SEPARATOR . $path;

        // Resolve the real path to handle symlinks and normalize separators
        $resolvedPath = realpath($fullPath);
        if ($resolvedPath === false) {
            // If realpath fails, construct the path manually
            $resolvedPath = $fullPath;
        }

        // Ensure the resolved path is within the project root
        $realRoot = realpath($this->rootPath);
        if ($realRoot === false) {
            $realRoot = $this->rootPath;
        }

        // Check if the resolved path is within the project root
        if (strpos($resolvedPath, $realRoot) !== 0) {
            throw new \Exception('Path traversal detected');
        }

        return $resolvedPath;
    }

    private function isPathAllowed(string $fullPath): bool
    {
        $realPath = realpath(dirname($fullPath));
        if ($realPath === false) {
            $realPath = dirname($fullPath);
        }

        $realRoot = realpath($this->rootPath);
        if ($realRoot === false) {
            $realRoot = $this->rootPath;
        }

        return strpos($realPath, $realRoot) === 0;
    }

    private function isBinary(string $content): bool
    {
        return preg_match('~[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]~', $content) === 1;
    }

    private function deleteDirectory(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }

        $files = array_diff(scandir($dir), ['.', '..']);
        foreach ($files as $file) {
            $path = $dir . DIRECTORY_SEPARATOR . $file;
            is_dir($path) ? $this->deleteDirectory($path) : unlink($path);
        }
        rmdir($dir);
    }
}
