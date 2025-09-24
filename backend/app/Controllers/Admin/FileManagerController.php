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

class FileManagerController
{
    private string $rootPath;

    public function __construct()
    {
        // Set root path to the project root (one level up from backend)
        $this->rootPath = dirname(__DIR__, 3);
    }

    public function browse(Request $request): Response
    {
        try {
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

    public function readFile(Request $request): Response
    {
        try {
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

    public function saveFile(Request $request): Response
    {
        try {
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

            return ApiResponse::success([
                'path' => $path,
                'size' => $result,
                'modified' => filemtime($fullPath),
            ], 'File saved successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to save file: ' . $e->getMessage(), 500);
        }
    }

    public function createFile(Request $request): Response
    {
        try {
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

            return ApiResponse::success([
                'path' => $path,
                'isDirectory' => $isDirectory,
                'created' => filemtime($fullPath),
            ], ($isDirectory ? 'Directory' : 'File') . ' created successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to create ' . ($isDirectory ? 'directory' : 'file') . ': ' . $e->getMessage(), 500);
        }
    }

    public function deleteFile(Request $request): Response
    {
        try {
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

            if (is_dir($fullPath)) {
                $this->deleteDirectory($fullPath);
            } else {
                unlink($fullPath);
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
