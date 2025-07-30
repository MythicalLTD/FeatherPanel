<?php

/*
 * This file is part of App.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Services\Wings\Services;

use App\Services\Wings\WingsConnection;

/**
 * File Service for Wings API.
 *
 * Handles all file-related API endpoints including:
 * - File operations (list, read, write, delete)
 * - Directory management
 * - File upload/download
 * - File search
 */
class FileService
{
    private WingsConnection $connection;

    /**
     * Create a new FileService instance.
     */
    public function __construct(WingsConnection $connection)
    {
        $this->connection = $connection;
    }

    /**
     * List files in a directory.
     *
     * @param string $path Directory path (default: /)
     */
    public function listFiles(string $serverUuid, string $path = '/'): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/files/list?directory=" . urlencode($path));
    }

    /**
     * Get file contents.
     */
    public function getFileContents(string $serverUuid, string $filePath): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/files/contents?file=" . urlencode($filePath));
    }

    /**
     * Write file contents.
     */
    public function writeFileContents(string $serverUuid, string $filePath, string $contents): array
    {
        return $this->connection->post("/api/servers/{$serverUuid}/files/write", [
            'root' => '/',
            'files' => [
                [
                    'path' => $filePath,
                    'contents' => $contents,
                ],
            ],
        ]);
    }

    /**
     * Create a new file.
     */
    public function createFile(string $serverUuid, string $filePath, string $contents = ''): array
    {
        return $this->writeFileContents($serverUuid, $filePath, $contents);
    }

    /**
     * Delete a file.
     */
    public function deleteFile(string $serverUuid, string $filePath): array
    {
        return $this->connection->post("/api/servers/{$serverUuid}/files/delete", [
            'root' => '/',
            'files' => [$filePath],
        ]);
    }

    /**
     * Create a directory.
     */
    public function createDirectory(string $serverUuid, string $directoryPath): array
    {
        return $this->connection->post("/api/servers/{$serverUuid}/files/create-folder", [
            'root' => '/',
            'folder' => $directoryPath,
        ]);
    }

    /**
     * Delete a directory.
     */
    public function deleteDirectory(string $serverUuid, string $directoryPath): array
    {
        return $this->deleteFile($serverUuid, $directoryPath);
    }

    /**
     * Copy files.
     *
     * @param array $files Array of file paths to copy
     * @param string $location Destination location
     */
    public function copyFiles(string $serverUuid, array $files, string $location): array
    {
        return $this->connection->post("/api/servers/{$serverUuid}/files/copy", [
            'root' => '/',
            'files' => $files,
            'location' => $location,
        ]);
    }

    /**
     * Rename files.
     *
     * @param array $files Array of file paths to rename
     * @param array $renames Array of new names
     */
    public function renameFiles(string $serverUuid, array $files, array $renames): array
    {
        return $this->connection->post("/api/servers/{$serverUuid}/files/rename", [
            'root' => '/',
            'files' => $files,
            'renames' => $renames,
        ]);
    }

    /**
     * Get file download URL.
     */
    public function getFileDownloadUrl(string $serverUuid, string $filePath): string
    {
        $tokenGenerator = $this->connection->getTokenGenerator();
        $baseUrl = $this->connection->getBaseUrl();

        return $tokenGenerator->generateFileDownloadUrl($baseUrl, $serverUuid, $filePath);
    }

    /**
     * Get file upload URL.
     */
    public function getFileUploadUrl(string $serverUuid, string $userUuid): string
    {
        $tokenGenerator = $this->connection->getTokenGenerator();
        $baseUrl = $this->connection->getBaseUrl();

        return $tokenGenerator->generateFileUploadUrl($baseUrl, $serverUuid, $userUuid);
    }

    /**
     * Search files.
     *
     * @param string $query Search query
     * @param string $directory Directory to search in (default: /)
     */
    public function searchFiles(string $serverUuid, string $query, string $directory = '/'): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/files/search?query=" . urlencode($query) . '&directory=' . urlencode($directory));
    }

    /**
     * Get file permissions.
     */
    public function getFilePermissions(string $serverUuid, string $filePath): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/files/permissions?file=" . urlencode($filePath));
    }

    /**
     * Set file permissions.
     *
     * @param int $permissions Octal permissions (e.g., 755)
     */
    public function setFilePermissions(string $serverUuid, string $filePath, int $permissions): array
    {
        return $this->connection->post("/api/servers/{$serverUuid}/files/chmod", [
            'root' => '/',
            'file' => $filePath,
            'mode' => $permissions,
        ]);
    }

    /**
     * Get file size.
     */
    public function getFileSize(string $serverUuid, string $filePath): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/files/size?file=" . urlencode($filePath));
    }

    /**
     * Compress files.
     *
     * @param array $files Array of file paths to compress
     * @param string $archiveName Name of the archive
     */
    public function compressFiles(string $serverUuid, array $files, string $archiveName): array
    {
        return $this->connection->post("/api/servers/{$serverUuid}/files/compress", [
            'root' => '/',
            'files' => $files,
            'archive' => $archiveName,
        ]);
    }

    /**
     * Decompress archive.
     *
     * @param string $archivePath Path to the archive
     * @param string $destination Destination directory
     */
    public function decompressArchive(string $serverUuid, string $archivePath, string $destination): array
    {
        return $this->connection->post("/api/servers/{$serverUuid}/files/decompress", [
            'root' => '/',
            'file' => $archivePath,
            'destination' => $destination,
        ]);
    }

    /**
     * Get file preview (first few lines).
     *
     * @param int $lines Number of lines to preview (default: 50)
     */
    public function getFilePreview(string $serverUuid, string $filePath, int $lines = 50): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/files/contents?file=" . urlencode($filePath) . "&lines={$lines}");
    }

    /**
     * Get file information.
     */
    public function getFileInfo(string $serverUuid, string $filePath): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/files/info?file=" . urlencode($filePath));
    }

    /**
     * Check if file exists.
     */
    public function fileExists(string $serverUuid, string $filePath): bool
    {
        try {
            $this->getFileInfo($serverUuid, $filePath);

            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get directory size.
     */
    public function getDirectorySize(string $serverUuid, string $directoryPath): array
    {
        return $this->connection->get("/api/servers/{$serverUuid}/files/size?file=" . urlencode($directoryPath));
    }
}
