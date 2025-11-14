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

namespace App\Services\Wings\Services;

use App\Services\Wings\WingsResponse;
use App\Services\Wings\WingsConnection;

/**
 * Server Service for Wings API.
 *
 * Handles all server-related API endpoints including:
 * - Server management (create, delete, list)
 * - Server power operations (start, stop, restart, kill)
 * - Server logs and console
 * - Server configuration
 */
class ServerService
{
    private WingsConnection $connection;

    /**dasjkl
     * Create a new ServerService instance.
     */
    public function __construct(WingsConnection $connection)
    {
        $this->connection = $connection;
    }

    /**
     * Get all servers.
     */
    public function getAllServers(): WingsResponse
    {
        try {
            $response = $this->connection->get('/api/servers');

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get a specific server by UUID.
     */
    public function getServer(string $serverUuid): WingsResponse
    {
        try {
            $response = $this->connection->get("/api/servers/{$serverUuid}");

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Create a new server.
     */
    public function createServer(array $serverData): WingsResponse
    {
        try {
            $response = $this->connection->post('/api/servers', $serverData);

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete a server.
     */
    public function deleteServer(string $serverUuid): WingsResponse
    {
        try {
            $response = $this->connection->delete("/api/servers/{$serverUuid}");

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Start a server.
     */
    public function startServer(string $serverUuid): WingsResponse
    {
        try {
            $response = $this->connection->post("/api/servers/{$serverUuid}/power", ['action' => 'start', 'wait_seconds' => 30]);

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Stop a server.
     */
    public function stopServer(string $serverUuid): WingsResponse
    {
        try {
            $response = $this->connection->post("/api/servers/{$serverUuid}/power", ['action' => 'stop', 'wait_seconds' => 30]);

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Restart a server.
     */
    public function restartServer(string $serverUuid): WingsResponse
    {
        try {
            $response = $this->connection->post("/api/servers/{$serverUuid}/power", ['action' => 'restart', 'wait_seconds' => 30]);

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Kill a server.
     */
    public function killServer(string $serverUuid): WingsResponse
    {
        try {
            $response = $this->connection->post("/api/servers/{$serverUuid}/power", ['action' => 'kill', 'wait_seconds' => 30]);

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get server logs.
     *
     * @param int $lines Number of lines to get (default: 100)
     */
    public function getServerLogs(string $serverUuid, int $lines = 100): WingsResponse
    {
        try {
            $response = $this->connection->get("/api/servers/{$serverUuid}/logs?lines={$lines}");

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Send a single command to server console.
     */
    public function sendCommand(string $serverUuid, string $command): WingsResponse
    {
        return $this->sendCommands($serverUuid, [$command]);
    }

    /**
     * Send commands to server console.
     */
    public function sendCommands(string $serverUuid, array $commands): WingsResponse
    {
        try {
            $response = $this->connection->post("/api/servers/{$serverUuid}/commands", ['commands' => $commands]);

            return new WingsResponse($response, 204);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Install server.
     */
    public function installServer(string $serverUuid): WingsResponse
    {
        try {
            $response = $this->connection->post("/api/servers/{$serverUuid}/install");

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Reinstall server.
     */
    public function reinstallServer(string $serverUuid): WingsResponse
    {
        try {
            $response = $this->connection->post("/api/servers/{$serverUuid}/reinstall");

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    // ========================================
    // File Management Methods
    // ========================================

    /**
     * List items in a directory.
     */
    public function listDirectory(string $serverUuid, string $directory = '/'): WingsResponse
    {
        try {
            $encodedDirectory = urlencode($directory);
            $response = $this->connection->get("/api/servers/{$serverUuid}/files/list-directory?directory={$encodedDirectory}");

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get file contents.
     */
    public function getFileContents(string $serverUuid, string $file, bool $download = false): WingsResponse
    {
        try {
            $encodedFile = urlencode($file);
            $downloadParam = $download ? 'true' : 'false';
            $response = $this->connection->get("/api/servers/{$serverUuid}/files/contents?file={$encodedFile}&download={$downloadParam}");

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get file contents as raw string.
     * This method bypasses JSON decoding and returns the raw file content.
     * Useful for file downloads and when you need the actual file content.
     */
    public function getFileContentsRaw(string $serverUuid, string $file, bool $download = false): WingsResponse
    {
        try {
            $encodedFile = urlencode($file);
            $downloadParam = $download ? 'true' : 'false';
            $rawResponse = $this->connection->getRaw("/api/servers/{$serverUuid}/files/contents?file={$encodedFile}&download={$downloadParam}");

            return new WingsResponse($rawResponse, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Download a file from the server.
     * This method is specifically for file downloads and returns raw content.
     */
    public function downloadFile(string $serverUuid, string $file): WingsResponse
    {
        try {
            $encodedFile = urlencode($file);
            $rawResponse = $this->connection->getRaw("/api/servers/{$serverUuid}/files/contents?file={$encodedFile}&download=true");

            return new WingsResponse($rawResponse, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Write file contents.
     */
    public function writeFile(string $serverUuid, string $file, string $content): WingsResponse
    {
        try {
            $encodedFile = urlencode($file);
            // Send raw content to Wings (no JSON wrapper)
            $response = $this->connection->postRaw("/api/servers/{$serverUuid}/files/write?file={$encodedFile}", $content, [
                'Content-Type' => 'text/plain',
            ]);

            return new WingsResponse($response, 204);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Rename files/folders.
     */
    public function renameFiles(string $serverUuid, string $root, array $files): WingsResponse
    {
        try {
            $data = [
                'root' => $root,
                'files' => $files,
            ];
            $response = $this->connection->put("/api/servers/{$serverUuid}/files/rename", $data);

            return new WingsResponse($response, 204);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Copy files/directories.
     */
    public function copyFiles(string $serverUuid, string $location, array $files): WingsResponse
    {
        try {
            $data = [
                'location' => $location,
                'files' => $files,
            ];
            $response = $this->connection->post("/api/servers/{$serverUuid}/files/copy", $data);

            return new WingsResponse($response, 204);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete files/directories.
     */
    public function deleteFiles(string $serverUuid, string $root, array $files): WingsResponse
    {
        try {
            $data = [
                'root' => $root,
                'files' => $files,
            ];
            $response = $this->connection->post("/api/servers/{$serverUuid}/files/delete", $data);

            return new WingsResponse($response, 204);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Create directory.
     */
    public function createDirectory(string $serverUuid, string $name, string $path): WingsResponse
    {
        try {
            $data = [
                'name' => $name,
                'path' => $path,
            ];
            $response = $this->connection->post("/api/servers/{$serverUuid}/files/create-directory", $data);

            return new WingsResponse($response, 204);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Compress files into a single archive.
     *
     * According to Wings API documentation:
     * - POST /api/servers/:uuid/files/compress
     * - Compresses one or more files into a SINGLE archive
     * - Body: { "root": "string", "files": ["file1", "file2", ...], "name": "string", "extension": "string" }
     * - Supported extensions: zip, tar.gz, tgz, tar.bz2, tbz2, tar.xz, txz
     * - Returns: 200 with the new archive file object
     *
     * @param string $serverUuid The server UUID
     * @param string $root The root directory path
     * @param array $files Array of file names (relative to root)
     * @param string $name Optional archive name (empty for auto-generated)
     * @param string $extension Archive extension (zip, tar.gz, tgz, tar.bz2, tbz2, tar.xz, txz)
     */
    public function compressFiles(string $serverUuid, string $root, array $files, string $name = '', string $extension = 'tar.gz'): WingsResponse
    {
        try {
            // Ensure $files is an array
            if (!is_array($files)) {
                return new WingsResponse(['error' => 'Files must be provided as an array'], 422);
            }

            // Ensure all files are strings (file names only, not paths)
            $files = array_values(array_filter($files, 'is_string'));

            if (empty($files)) {
                return new WingsResponse(['error' => 'No valid file names provided'], 422);
            }

            // Filter out empty strings and whitespace-only entries
            $files = array_filter($files, fn ($file) => !empty(trim($file)));

            if (empty($files)) {
                return new WingsResponse(['error' => 'No valid file names after filtering'], 422);
            }

            // Reset array keys after filtering
            $files = array_values($files);

            $data = [
                'root' => $root,
                'files' => $files,
            ];

            // Add optional name and extension if provided
            if (!empty($name)) {
                $data['name'] = $name;
            }

            if (!empty($extension)) {
                $data['extension'] = $extension;
            }

            $response = $this->connection->post("/api/servers/{$serverUuid}/files/compress", $data);

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Decompress archive.
     */
    public function decompressArchive(string $serverUuid, string $file, string $root): WingsResponse
    {
        try {
            $data = [
                'file' => $file,
                'root' => $root,
            ];
            $response = $this->connection->post("/api/servers/{$serverUuid}/files/decompress", $data);

            return new WingsResponse($response, 204);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Change file permissions (chmod).
     */
    public function changeFilePermissions(string $serverUuid, string $root, array $files): WingsResponse
    {
        try {
            $data = [
                'root' => $root,
                'files' => $files,
            ];
            $response = $this->connection->post("/api/servers/{$serverUuid}/files/chmod", $data);

            return new WingsResponse($response, 204);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get downloads list.
     */
    public function getDownloadsList(string $serverUuid): WingsResponse
    {
        try {
            $response = $this->connection->get("/api/servers/{$serverUuid}/files/pull");

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Pull file from remote URL.
     */
    public function pullFile(string $serverUuid, string $url, string $root, ?string $fileName = null, bool $foreground = false, bool $useHeader = true): WingsResponse
    {
        try {
            $data = [
                'url' => $url,
                'root' => $root,
                'foreground' => $foreground,
                'use_header' => $useHeader,
            ];

            if ($fileName) {
                $data['file_name'] = $fileName;
            }

            $response = $this->connection->post("/api/servers/{$serverUuid}/files/pull", $data);

            return new WingsResponse($response, $foreground ? 200 : 204);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete/stop pull process.
     */
    public function deletePullProcess(string $serverUuid, string $pullId): WingsResponse
    {
        try {
            $response = $this->connection->delete("/api/servers/{$serverUuid}/files/pull/{$pullId}");

            return new WingsResponse($response, 204);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    // ========================================
    // Backup Methods
    // ========================================

    /**
     * Create backup.
     */
    public function createBackup(string $serverUuid, string $adapter, string $uuid, ?string $ignore = null): WingsResponse
    {
        try {
            $data = [
                'adapter' => $adapter,
                'uuid' => $uuid,
            ];

            if ($ignore) {
                $data['ignore'] = $ignore;
            }

            $response = $this->connection->post("/api/servers/{$serverUuid}/backup", $data);

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Restore backup.
     */
    public function restoreBackup(string $serverUuid, string $backupId, string $adapter, bool $truncateDirectory, ?string $downloadUrl = null): WingsResponse
    {
        try {
            $data = [
                'adapter' => $adapter,
                'truncate_directory' => $truncateDirectory,
            ];

            if ($downloadUrl) {
                $data['download_url'] = $downloadUrl;
            }

            $response = $this->connection->post("/api/servers/{$serverUuid}/backup/{$backupId}/restore", $data);

            return new WingsResponse($response, 204);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete backup.
     */
    public function deleteBackup(string $serverUuid, string $backupId): WingsResponse
    {
        try {
            $response = $this->connection->delete("/api/servers/{$serverUuid}/backup/{$backupId}");

            return new WingsResponse($response, 204);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    // ========================================
    // WebSocket JWT Management
    // ========================================

    /**
     * Add JWT tokens to WebSocket deny list.
     */
    public function denyWebSocketJWT(string $serverUuid, array $jtis): WingsResponse
    {
        try {
            $data = [
                'jtis' => $jtis,
            ];
            $response = $this->connection->post("/api/servers/{$serverUuid}/ws/deny", $data);

            return new WingsResponse($response, 204);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    // ========================================
    // Server Sync
    // ========================================

    /**
     * Synchronize server configuration.
     */
    public function syncServer(string $serverUuid): WingsResponse
    {
        try {
            $response = $this->connection->post("/api/servers/{$serverUuid}/sync");

            return new WingsResponse($response, 204);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get server install logs.
     */
    public function getServerInstallLogs(string $serverUuid): WingsResponse
    {
        try {
            $response = $this->connection->get("/api/servers/{$serverUuid}/install-logs");

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }
}
