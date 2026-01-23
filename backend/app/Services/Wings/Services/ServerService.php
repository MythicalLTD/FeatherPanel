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
            // Increase timeout for kill action as it may take longer
            $response = $this->connection->post("/api/servers/{$serverUuid}/power", ['action' => 'kill', 'wait_seconds' => 60]);

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
     * @param int|null $timeout Optional timeout in seconds (default: 15 minutes for large archives)
     */
    public function compressFiles(string $serverUuid, string $root, array $files, string $name = '', string $extension = 'tar.gz', ?int $timeout = null): WingsResponse
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

            // Use 15 minute timeout for archive operations (like pelican) if not specified
            $requestTimeout = $timeout ?? (60 * 15);
            $response = $this->connection->post("/api/servers/{$serverUuid}/files/compress", $data, [], 3, $requestTimeout);

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Decompress archive.
     *
     * @param string $serverUuid The server UUID
     * @param string $file The archive file path
     * @param string $root The root directory path
     * @param int|null $timeout Optional timeout in seconds (default: 15 minutes for large archives)
     */
    public function decompressArchive(string $serverUuid, string $file, string $root, ?int $timeout = null): WingsResponse
    {
        try {
            $data = [
                'file' => $file,
                'root' => $root,
            ];

            // Use 15 minute timeout for archive operations (like pelican) if not specified
            $requestTimeout = $timeout ?? (60 * 15);
            $response = $this->connection->post("/api/servers/{$serverUuid}/files/decompress", $data, [], 3, $requestTimeout);

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
     *
     * @deprecated Use deAuthUser instead
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

    /**
     * Deauthorizes a user (disconnects websockets and SFTP) on the Wings instance for the server.
     *
     * @param string $user The user to deauthorize
     * @param string $serverUuid The server UUID
     */
    public function deAuthUser(string $user, string $serverUuid): WingsResponse
    {
        try {
            $data = [
                'user' => $user,
                'servers' => [$serverUuid],
            ];
            $response = $this->connection->post('/api/deauthorize-user', $data);

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

    // ========================================
    // Firewall Management
    // ========================================

    /**
     * Get all firewall rules for a server.
     */
    public function getFirewallRules(string $serverUuid): WingsResponse
    {
        try {
            $response = $this->connection->get("/api/servers/{$serverUuid}/firewall");

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get a specific firewall rule by ID.
     */
    public function getFirewallRule(string $serverUuid, int $ruleId): WingsResponse
    {
        try {
            $response = $this->connection->get("/api/servers/{$serverUuid}/firewall/{$ruleId}");

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Create a new firewall rule.
     *
     * @param array<string,mixed> $data
     */
    public function createFirewallRule(string $serverUuid, array $data): WingsResponse
    {
        try {
            $response = $this->connection->post("/api/servers/{$serverUuid}/firewall", $data);

            return new WingsResponse($response, 201);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update an existing firewall rule.
     *
     * @param array<string,mixed> $data
     */
    public function updateFirewallRule(string $serverUuid, int $ruleId, array $data): WingsResponse
    {
        try {
            $response = $this->connection->put("/api/servers/{$serverUuid}/firewall/{$ruleId}", $data);

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete a firewall rule.
     */
    public function deleteFirewallRule(string $serverUuid, int $ruleId): WingsResponse
    {
        try {
            $response = $this->connection->delete("/api/servers/{$serverUuid}/firewall/{$ruleId}");

            return new WingsResponse($response, 204);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get firewall rules for a specific port.
     */
    public function getFirewallRulesByPort(string $serverUuid, int $port): WingsResponse
    {
        try {
            $response = $this->connection->get("/api/servers/{$serverUuid}/firewall/port/{$port}");

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Sync firewall rules for a server to iptables.
     */
    public function syncFirewallRules(string $serverUuid): WingsResponse
    {
        try {
            $response = $this->connection->post("/api/servers/{$serverUuid}/firewall/sync");

            return new WingsResponse($response, 202);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    // ========================================
    // Proxy Management
    // ========================================

    /**
     * Create a reverse proxy configuration.
     *
     * @param array<string,mixed> $data
     */
    public function createProxy(string $serverUuid, array $data): WingsResponse
    {
        try {
            $response = $this->connection->post("/api/servers/{$serverUuid}/proxy/create", $data);

            return new WingsResponse($response, 202);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete a reverse proxy configuration.
     */
    public function deleteProxy(string $serverUuid, string $domain, string $port): WingsResponse
    {
        try {
            $response = $this->connection->post("/api/servers/{$serverUuid}/proxy/delete", [
                'domain' => $domain,
                'port' => $port,
            ]);

            return new WingsResponse($response, 202);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    // ========================================
    // Server Import Management
    // ========================================

    /**
     * Import server files from a remote SFTP or FTP server.
     *
     * @param array<string,mixed> $data Import configuration data
     */
    public function importServer(string $serverUuid, array $data): WingsResponse
    {
        try {
            $response = $this->connection->post("/api/servers/{$serverUuid}/import", $data);

            return new WingsResponse($response, 202);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    // ========================================
    // FastDL Management
    // ========================================

    /**
     * Get FastDL configuration for a server.
     */
    public function getFastDl(string $serverUuid): WingsResponse
    {
        try {
            $response = $this->connection->get("/api/servers/{$serverUuid}/fastdl");

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Enable FastDL for a server.
     *
     * @param array<string,mixed> $data FastDL configuration data (optional directory)
     */
    public function enableFastDl(string $serverUuid, array $data = []): WingsResponse
    {
        try {
            $response = $this->connection->post("/api/servers/{$serverUuid}/fastdl/enable", $data);

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Disable FastDL for a server.
     */
    public function disableFastDl(string $serverUuid): WingsResponse
    {
        try {
            $response = $this->connection->post("/api/servers/{$serverUuid}/fastdl/disable");

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update FastDL configuration for a server.
     *
     * @param array<string,mixed> $data FastDL configuration data
     */
    public function updateFastDl(string $serverUuid, array $data): WingsResponse
    {
        try {
            $response = $this->connection->put("/api/servers/{$serverUuid}/fastdl", $data);

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }
}
