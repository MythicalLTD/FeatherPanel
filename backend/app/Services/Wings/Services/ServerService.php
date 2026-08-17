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

use App\Helpers\BackupIgnoreHelper;
use App\Services\Wings\WingsResponse;
use App\Services\Wings\WingsConnection;
use App\Services\Wings\Exceptions\WingsRequestException;
use App\Services\Wings\Exceptions\WingsAuthenticationException;

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

    /**
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
     * Execute a shell command inside the server Docker container via docker exec.
     *
     * @param int $timeoutSeconds Optional timeout (1–120); Wings defaults to 30 when omitted/0
     */
    public function execInContainer(string $serverUuid, string $command, int $timeoutSeconds = 30): WingsResponse
    {
        try {
            $payload = [
                'command' => $command,
                'timeout_seconds' => $timeoutSeconds,
            ];
            $response = $this->connection->post("/api/servers/{$serverUuid}/exec", $payload, [], 3, max(35, $timeoutSeconds + 10));

            return new WingsResponse($response, 200);
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

    /**
     * Abort an in-progress install/reinstall (Calagopus).
     */
    public function abortInstall(string $serverUuid): WingsResponse
    {
        try {
            $response = $this->connection->post("/api/servers/{$serverUuid}/install/abort");

            return new WingsResponse($response, 202);
        } catch (WingsRequestException $e) {
            return new WingsResponse(['error' => $e->getMessage()], $e->getCode() > 0 ? $e->getCode() : 500);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    // ========================================
    // File Management Methods
    // ========================================

    /**
     * List items in a directory.
     *
     * @param bool $includeDirectorySizes when true, requests Wings recursive per-folder sizes (cached on the daemon)
     * @param array{page?: int, per_page?: int, sort?: string} $options
     */
    public function listDirectory(string $serverUuid, string $directory = '/', bool $includeDirectorySizes = false, array $options = []): WingsResponse
    {
        try {
            if ($this->connection->isWingsRs()) {
                return $this->listDirectoryCalagopus($serverUuid, $directory, $options);
            }

            $encodedDirectory = urlencode($directory);
            $query = "directory={$encodedDirectory}";
            if ($includeDirectorySizes) {
                $query .= '&directory_sizes=true';
            }

            try {
                $response = $this->connection->get("/api/servers/{$serverUuid}/files/list-directory?{$query}");

                return new WingsResponse($response, 200);
            } catch (WingsRequestException $e) {
                // Some daemons reject directory_sizes; retry without it.
                $status = (int) $e->getCode();
                if ($includeDirectorySizes && $status >= 400 && $status < 500) {
                    $response = $this->connection->get(
                        "/api/servers/{$serverUuid}/files/list-directory?directory={$encodedDirectory}"
                    );

                    return new WingsResponse($response, 200);
                }

                throw $e;
            }
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Search files with advanced filters.
     * FeatherWings uses GET; Calagopus wings-rs uses POST — retry with POST on 404/405/501.
     *
     * @param array<string,mixed> $filters
     */
    public function searchFiles(string $serverUuid, array $filters = []): WingsResponse
    {
        try {
            $query = http_build_query($filters);
            $endpoint = "/api/servers/{$serverUuid}/files/search" . ($query !== '' ? "?{$query}" : '');

            try {
                $response = $this->connection->get($endpoint);

                return new WingsResponse($this->normalizeSearchResults($response), 200);
            } catch (WingsRequestException $e) {
                $status = (int) $e->getCode();
                if (!in_array($status, [404, 405, 501], true)) {
                    throw $e;
                }

                $payload = $this->mapSearchFiltersToCalagopusPayload($filters);
                $response = $this->connection->post("/api/servers/{$serverUuid}/files/search", $payload);

                return new WingsResponse($this->normalizeSearchResults($response), 200);
            }
        } catch (\Exception $e) {
            $status = $e instanceof WingsRequestException ? (int) $e->getCode() : 500;

            return new WingsResponse(['error' => $e->getMessage()], $status > 0 ? $status : 500);
        }
    }

    /**
     * List one directory inside an on-disk archive without extracting (supported formats only).
     *
     * @param string $innerPath Path inside the archive (empty string = root)
     */
    public function listArchiveDirectory(string $serverUuid, string $directory, string $file, string $innerPath = ''): WingsResponse
    {
        try {
            // Calagopus mounts archives as a virtual filesystem — list the joined path.
            if ($this->connection->isWingsRs()) {
                $base = rtrim($directory === '' ? '/' : $directory, '/');
                if ($base === '') {
                    $base = '/';
                }
                $archivePath = $base === '/' ? '/' . ltrim($file, '/') : $base . '/' . ltrim($file, '/');
                if ($innerPath !== '' && $innerPath !== '/') {
                    $archivePath = rtrim($archivePath, '/') . '/' . ltrim($innerPath, '/');
                }

                $listed = $this->listDirectory($serverUuid, $archivePath, false);
                if (!$listed->isSuccessful()) {
                    return $listed;
                }
                $data = $listed->getData();
                $entries = [];
                if (is_array($data)) {
                    if (isset($data['entries']) && is_array($data['entries'])) {
                        $entries = $data['entries'];
                    } elseif (array_is_list($data)) {
                        $entries = $data;
                    }
                }

                return new WingsResponse(['contents' => $entries, 'truncated' => false], 200);
            }

            $query = http_build_query([
                'directory' => $directory,
                'file' => $file,
                'path' => $innerPath,
            ]);
            $response = $this->connection->get("/api/servers/{$serverUuid}/files/archive/list?{$query}");

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
            $encodedFile = urlencode($this->normalizeDaemonFilePath($file));
            $downloadParam = $download ? 'true' : 'false';
            $response = $this->connection->get("/api/servers/{$serverUuid}/files/contents?file={$encodedFile}&download={$downloadParam}");

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return $this->wingsErrorResponse($e);
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
            $encodedFile = urlencode($this->normalizeDaemonFilePath($file));
            $downloadParam = $download ? 'true' : 'false';
            $rawResponse = $this->connection->getRaw("/api/servers/{$serverUuid}/files/contents?file={$encodedFile}&download={$downloadParam}");

            return new WingsResponse($rawResponse, 200);
        } catch (\Exception $e) {
            return $this->wingsErrorResponse($e);
        }
    }

    /**
     * Download a file from the server.
     * This method is specifically for file downloads and returns raw content.
     */
    public function downloadFile(string $serverUuid, string $file): WingsResponse
    {
        try {
            $encodedFile = urlencode($this->normalizeDaemonFilePath($file));
            $rawResponse = $this->connection->getRaw("/api/servers/{$serverUuid}/files/contents?file={$encodedFile}&download=true");

            return new WingsResponse($rawResponse, 200);
        } catch (\Exception $e) {
            return $this->wingsErrorResponse($e);
        }
    }

    /**
     * Write file contents.
     */
    public function writeFile(string $serverUuid, string $file, string $content): WingsResponse
    {
        try {
            $encodedFile = urlencode($this->normalizeDaemonFilePath($file));
            // Send raw content to Wings (no JSON wrapper)
            $response = $this->connection->postRaw("/api/servers/{$serverUuid}/files/write?file={$encodedFile}", $content, [
                'Content-Type' => 'text/plain',
            ]);

            return new WingsResponse($response, 204);
        } catch (\Exception $e) {
            return $this->wingsErrorResponse($e);
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
     * Copy a single source file to a destination directory.
     *
     * Wings expects the source as a `file` query parameter and the destination
     * directory in the request body `location` field.
     *
     * @param string|null $name Optional destination name (Calagopus)
     * @param bool $overwrite Overwrite existing destination (Calagopus)
     */
    public function copyFiles(string $serverUuid, string $source, string $destination, ?string $name = null, bool $overwrite = false): WingsResponse
    {
        try {
            $data = [
                'location' => $destination,
            ];
            if ($name !== null && $name !== '') {
                $data['name'] = $name;
            }
            if ($overwrite) {
                $data['overwrite'] = true;
            }

            $response = $this->connection->post(
                "/api/servers/{$serverUuid}/files/copy?file=" . rawurlencode($source),
                $data
            );

            return new WingsResponse($response, 204);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete files/directories.
     *
     * @param array<string, mixed> $options Optional keys: use_trash (bool), permanent (bool), trash (array{max_size_bytes?: int, retention_days?: int})
     */
    public function deleteFiles(string $serverUuid, string $root, array $files, array $options = []): WingsResponse
    {
        try {
            $data = [
                'root' => $root,
                'files' => $files,
            ];
            if (isset($options['use_trash'])) {
                $data['use_trash'] = (bool) $options['use_trash'];
            }
            if (isset($options['permanent'])) {
                $data['permanent'] = (bool) $options['permanent'];
            }
            if (!empty($options['trash']) && is_array($options['trash'])) {
                $data['trash'] = $options['trash'];
            }
            $response = $this->connection->post("/api/servers/{$serverUuid}/files/delete", $data);

            return new WingsResponse($response, 204);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * List trashed files for a server.
     */
    public function listTrash(string $serverUuid, int $maxSizeBytes = 0, int $retentionDays = 0): WingsResponse
    {
        try {
            $query = http_build_query([
                'max_size_bytes' => $maxSizeBytes,
                'retention_days' => $retentionDays,
            ]);
            $response = $this->connection->get("/api/servers/{$serverUuid}/files/trash?{$query}");

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Restore files from trash.
     */
    public function restoreTrash(string $serverUuid, array $ids, bool $overwrite = false): WingsResponse
    {
        try {
            $this->connection->post("/api/servers/{$serverUuid}/files/trash/restore", [
                'ids' => $ids,
                'overwrite' => $overwrite,
            ]);

            return new WingsResponse([], 204);
        } catch (WingsRequestException $e) {
            return new WingsResponse(['error' => $e->getMessage()], $e->getCode());
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Permanently delete selected trash entries.
     */
    public function deleteTrashEntries(string $serverUuid, array $ids): WingsResponse
    {
        try {
            $response = $this->connection->post("/api/servers/{$serverUuid}/files/trash/delete", [
                'ids' => $ids,
            ]);

            return new WingsResponse($response, 204);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Empty the entire trash bin for a server.
     */
    public function emptyTrash(string $serverUuid): WingsResponse
    {
        try {
            $response = $this->connection->delete("/api/servers/{$serverUuid}/files/trash");

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
    public function compressFiles(
        string $serverUuid,
        string $root,
        array $files,
        string $name = '',
        string $extension = 'tar.gz',
        ?int $timeout = null,
        ?bool $foreground = null,
    ): WingsResponse {
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

            if ($this->connection->isWingsRs()) {
                $format = $this->mapCompressExtensionToCalagopusFormat($extension);
                if ($format !== null) {
                    $data['format'] = $format;
                }
            } elseif (!empty($extension)) {
                $data['extension'] = $this->mapCalagopusFormatToCompressExtension($extension);
            }
            if ($foreground !== null) {
                $data['foreground'] = $foreground;
            }

            // Use 15 minute timeout for archive operations (like pelican) if not specified
            $requestTimeout = $timeout ?? (60 * 15);
            $response = $this->connection->post("/api/servers/{$serverUuid}/files/compress", $data, [], 3, $requestTimeout);

            return new WingsResponse($response, $foreground === false ? 202 : 200);
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
    public function decompressArchive(
        string $serverUuid,
        string $file,
        string $root,
        ?int $timeout = null,
        ?bool $foreground = null,
    ): WingsResponse {
        try {
            $data = [
                'file' => $file,
                'root' => $root,
            ];
            if ($foreground !== null) {
                $data['foreground'] = $foreground;
            }

            // Use 15 minute timeout for archive operations (like pelican) if not specified
            $requestTimeout = $timeout ?? (60 * 15);
            $response = $this->connection->post("/api/servers/{$serverUuid}/files/decompress", $data, [], 3, $requestTimeout);

            return new WingsResponse($response, $foreground === false ? 202 : 204);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Extract selected paths from an on-disk archive without unpacking the whole archive (Wings 204).
     *
     * @param array<int, string> $entries Paths inside the archive (files and/or directories)
     */
    public function extractArchiveSelection(
        string $serverUuid,
        string $root,
        string $file,
        string $destination,
        array $entries,
        ?int $timeout = null,
    ): WingsResponse {
        try {
            $data = [
                'root' => $root,
                'file' => $file,
                'destination' => $destination,
                'entries' => array_values($entries),
            ];

            $requestTimeout = $timeout ?? (60 * 15);
            $response = $this->connection->post("/api/servers/{$serverUuid}/files/archive/extract", $data, [], 3, $requestTimeout);

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

            return new WingsResponse($response, $this->connection->isWingsRs() ? 200 : 204);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Copy multiple files, using Calagopus' operation endpoint where available.
     *
     * FeatherWings only exposes single-source copies, so those are attempted
     * sequentially and failed destinations are returned as skipped entries.
     */
    public function copyManyFiles(
        string $serverUuid,
        string $root,
        array $files,
        bool $overwrite = false,
        bool $foreground = false,
    ): WingsResponse {
        try {
            if ($this->connection->isWingsRs()) {
                $response = $this->connection->post("/api/servers/{$serverUuid}/files/copy-many", [
                    'root' => $root,
                    'files' => $files,
                    'overwrite' => $overwrite,
                    'foreground' => $foreground,
                ]);

                return new WingsResponse($response, 200);
            }

            $skipped = [];
            foreach ($files as $file) {
                if (!is_array($file) || !is_string($file['from'] ?? null) || !is_string($file['to'] ?? null)) {
                    if (is_array($file) && is_string($file['to'] ?? null) && $file['to'] !== '') {
                        $skipped[] = $this->skippedFileEntry($this->resolveFileOperationPath($root, $file['to']));
                    }
                    continue;
                }

                $source = $this->resolveFileOperationPath($root, $file['from']);
                $destination = $this->resolveFileOperationPath($root, $file['to']);
                $temporaryDestination = rtrim(dirname($source), '/') . '/' . basename($destination);
                $copy = $this->copyFiles(
                    $serverUuid,
                    $source,
                    rtrim(dirname($temporaryDestination), '/') === '' ? '/' : rtrim(dirname($temporaryDestination), '/'),
                    basename($destination),
                    $overwrite
                );

                if (!$copy->isSuccessful()) {
                    $skipped[] = $this->skippedFileEntry($destination);
                    continue;
                }

                if ($temporaryDestination !== $destination) {
                    $rename = $this->renameFiles($serverUuid, '/', [[
                        'from' => $temporaryDestination,
                        'to' => $destination,
                    ]]);
                    if (!$rename->isSuccessful()) {
                        // The copy succeeded but the rename to the final destination didn't —
                        // remove the orphaned temporary copy so it isn't left behind.
                        $this->deleteFiles($serverUuid, '/', [$temporaryDestination]);
                        $skipped[] = $this->skippedFileEntry($destination);
                    }
                }
            }

            return new WingsResponse(['skipped' => $skipped], 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Ask Calagopus Wings to copy files to another server/node.
     *
     * @param array<int, array{from:string,to:string}> $files
     */
    public function copyRemoteFiles(
        string $serverUuid,
        string $url,
        string $token,
        string $root,
        array $files,
        string $destinationServer,
        string $destinationPath,
        bool $foreground = true,
        string $archiveFormat = 'tar_gz',
    ): WingsResponse {
        try {
            $response = $this->connection->post(
                "/api/servers/{$serverUuid}/files/copy-remote",
                [
                    'url' => $url,
                    'token' => $token,
                    'root' => $root,
                    'files' => array_values($files),
                    'destination_server' => $destinationServer,
                    'destination_path' => $destinationPath,
                    'foreground' => $foreground,
                    'archive_format' => $archiveFormat,
                ],
                [],
                1,
                900
            );

            return new WingsResponse($response, $foreground ? 200 : 202);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Abort an asynchronous Calagopus file operation.
     */
    public function cancelFileOperation(string $serverUuid, string $operation): WingsResponse
    {
        try {
            $response = $this->connection->delete(
                "/api/servers/{$serverUuid}/files/operations/" . rawurlencode($operation)
            );

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

    /**
     * Share a server file via temp uploads (multipart upload runs on Wings).
     *
     * @param array{
     *     file: string,
     *     ttl_days: int,
     *     password?: string|null,
     *     delete_key?: string|null,
     *     token?: string|null,
     *     foreground?: bool,
     *     background?: bool
     * } $payload
     */
    public function shareFile(string $serverUuid, array $payload, int $timeout = 600): WingsResponse
    {
        try {
            $response = $this->connection->post(
                "/api/servers/{$serverUuid}/files/share",
                $payload,
                [],
                1,
                $timeout
            );

            // Background jobs return { identifier }; completed shares return public_id/url.
            $status = isset($response['identifier']) && !isset($response['public_id']) ? 202 : 200;

            return new WingsResponse($response, $status);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * List active temp upload share jobs.
     */
    public function getShareJobs(string $serverUuid): WingsResponse
    {
        try {
            $response = $this->connection->get("/api/servers/{$serverUuid}/files/share");

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Cancel a temp upload share job.
     */
    public function deleteShareJob(string $serverUuid, string $shareId): WingsResponse
    {
        try {
            $response = $this->connection->delete("/api/servers/{$serverUuid}/files/share/{$shareId}");

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
    public function createBackup(string $serverUuid, string $adapter, string $uuid, mixed $ignore = null): WingsResponse
    {
        try {
            // Calagopus requires `ignore` (even empty); FeatherWings accepts empty string too.
            $data = [
                'adapter' => $adapter,
                'uuid' => $uuid,
                'ignore' => BackupIgnoreHelper::formatForWings($ignore),
            ];

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
        } catch (WingsAuthenticationException | WingsRequestException $e) {
            return new WingsResponse(['error' => $e->getMessage()], $e->getCode() > 0 ? $e->getCode() : 500);
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
        } catch (WingsRequestException $e) {
            $status = (int) $e->getCode();
            // Soft-succeed only when the daemon does not implement deauthorize (404/405/501).
            // Other errors (401/403/other 4xx, 5xx) are real failures and must be preserved.
            if ($status === 404 || $status === 405 || $status === 501) {
                return new WingsResponse(['skipped' => true, 'reason' => $e->getMessage()], 204);
            }

            return new WingsResponse(['error' => $e->getMessage()], $status > 0 ? $status : 500);
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
     * Force Docker runtime reconciliation for a server stuck in starting/stopping
     * or desynchronized from containerd (FeatherPanel#199).
     */
    public function reconcileServer(string $serverUuid): WingsResponse
    {
        try {
            // Recovery can terminate/remove containers with Docker timeouts; allow up to 60s.
            $response = $this->connection->post("/api/servers/{$serverUuid}/reconcile", [], [], 3, 60);

            return new WingsResponse($response, 200);
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
            if ($this->connection->isWingsRs()) {
                try {
                    $response = $this->connection->get("/api/servers/{$serverUuid}/logs/install");

                    return new WingsResponse($this->normalizeInstallLogsResponse($response), 200);
                } catch (WingsRequestException $e) {
                    // Fall through to FeatherWings path for mixed/compat daemons
                    if (!in_array((int) $e->getCode(), [404, 405], true)) {
                        throw $e;
                    }
                }
            }

            $response = $this->connection->get("/api/servers/{$serverUuid}/install-logs");

            return new WingsResponse($response, 200);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Run a custom async script on the server (Calagopus).
     *
     * @param array<string, mixed> $payload
     */
    public function runServerScript(string $serverUuid, array $payload): WingsResponse
    {
        try {
            $response = $this->connection->post("/api/servers/{$serverUuid}/script", $payload);

            return new WingsResponse($response, 202);
        } catch (WingsRequestException $e) {
            return new WingsResponse(['error' => $e->getMessage()], $e->getCode() > 0 ? $e->getCode() : 500);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Live-update websocket permissions for users (Calagopus).
     *
     * @param list<array{user: string, permissions: list<string>, ignored_files?: list<string>}> $userPermissions
     */
    public function updateWsPermissions(string $serverUuid, array $userPermissions): WingsResponse
    {
        try {
            $response = $this->connection->post("/api/servers/{$serverUuid}/ws/permissions", [
                'user_permissions' => array_values($userPermissions),
            ]);

            return new WingsResponse($response, 200);
        } catch (WingsRequestException $e) {
            return new WingsResponse(['error' => $e->getMessage()], $e->getCode() > 0 ? $e->getCode() : 500);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Broadcast a websocket message to connected clients (Calagopus).
     *
     * @param array<string, mixed> $payload
     */
    public function broadcastWsMessage(string $serverUuid, array $payload): WingsResponse
    {
        try {
            $response = $this->connection->post("/api/servers/{$serverUuid}/ws/broadcast", $payload);

            return new WingsResponse($response, 200);
        } catch (WingsRequestException $e) {
            return new WingsResponse(['error' => $e->getMessage()], $e->getCode() > 0 ? $e->getCode() : 500);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get daemon-side server version hash (Calagopus).
     */
    public function getServerVersion(string $serverUuid): WingsResponse
    {
        try {
            $response = $this->connection->get("/api/servers/{$serverUuid}/version");

            return new WingsResponse($response, 200);
        } catch (WingsRequestException $e) {
            return new WingsResponse(['error' => $e->getMessage()], $e->getCode() > 0 ? $e->getCode() : 500);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Batch file fingerprints (Calagopus).
     *
     * @param list<string> $files
     */
    public function getFileFingerprints(string $serverUuid, array $files, string $algorithm = 'sha256', string $root = '/'): WingsResponse
    {
        try {
            // Wings expects repeated `files=a&files=b` query params, not PHP's
            // indexed `files[0]=a&files[1]=b` array encoding.
            $queryParts = [
                'algorithm=' . rawurlencode(strtolower($algorithm)),
                'root=' . rawurlencode($root),
            ];
            foreach (array_values($files) as $file) {
                $queryParts[] = 'files=' . rawurlencode((string) $file);
            }
            $query = implode('&', $queryParts);
            $response = $this->connection->get("/api/servers/{$serverUuid}/files/fingerprints?" . $query);

            return new WingsResponse($response, 200);
        } catch (WingsRequestException $e) {
            return new WingsResponse(['error' => $e->getMessage()], $e->getCode() > 0 ? $e->getCode() : 500);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * List file revisions (FeatherWings + Calagopus wings-rs).
     */
    public function getFileRevisions(string $serverUuid, string $file): WingsResponse
    {
        try {
            $query = http_build_query(['file' => $this->normalizeDaemonFilePath($file)]);
            $response = $this->connection->get("/api/servers/{$serverUuid}/files/revisions?{$query}");

            return new WingsResponse(is_array($response) ? $response : ['revisions' => []], 200);
        } catch (WingsRequestException $e) {
            // Older FeatherWings builds without /files/revisions.
            if (in_array($e->getCode(), [404, 405], true)) {
                return new WingsResponse(['revisions' => []], 200);
            }

            return new WingsResponse(['error' => $e->getMessage()], $e->getCode() > 0 ? $e->getCode() : 500);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Read a single file revision's contents (FeatherWings + Calagopus wings-rs).
     */
    public function getFileRevisionContents(string $serverUuid, int $revisionId, string $file = ''): WingsResponse
    {
        try {
            $endpoint = "/api/servers/{$serverUuid}/files/revisions/{$revisionId}";
            if ($file !== '') {
                $endpoint .= '?' . http_build_query(['file' => $this->normalizeDaemonFilePath($file)]);
            }
            $raw = $this->connection->getRaw($endpoint);

            return new WingsResponse($raw, 200);
        } catch (WingsRequestException $e) {
            return new WingsResponse(['error' => $e->getMessage()], $e->getCode() > 0 ? $e->getCode() : 500);
        } catch (\Exception $e) {
            return new WingsResponse(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Search files using a Calagopus-shaped JSON body (POST /files/search).
     *
     * @param array<string, mixed> $payload
     */
    public function searchFilesCalagopus(string $serverUuid, array $payload): WingsResponse
    {
        try {
            if ($this->connection->isWingsRs()) {
                if (!isset($payload['per_page'])) {
                    $payload['per_page'] = 250;
                }
                $response = $this->connection->post("/api/servers/{$serverUuid}/files/search", $payload);

                return new WingsResponse(is_array($response) ? $response : ['results' => []], 200);
            }

            $filters = [
                'directory' => (string) ($payload['root'] ?? '/'),
                'pattern' => '',
                'include' => '',
                'exclude' => '',
                'case_insensitive' => 'true',
                'content' => '',
                'content_case_insensitive' => 'true',
                'min_size' => '0',
                'max_size' => '0',
                'max_content_size' => strval(5 * 1024 * 1024),
                'include_oversized' => 'false',
            ];

            $pathFilter = $payload['path_filter'] ?? null;
            if (is_array($pathFilter)) {
                $include = $pathFilter['include'] ?? [];
                $exclude = $pathFilter['exclude'] ?? [];
                if (is_array($include) && $include !== []) {
                    $filters['include'] = (string) $include[0];
                    if (count($include) > 1) {
                        $filters['pattern'] = (string) $include[1];
                    }
                }
                if (is_array($exclude) && $exclude !== []) {
                    $filters['exclude'] = (string) $exclude[0];
                }
                if (array_key_exists('case_insensitive', $pathFilter)) {
                    $filters['case_insensitive'] = filter_var($pathFilter['case_insensitive'], FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
                }
            }

            $sizeFilter = $payload['size_filter'] ?? null;
            if (is_array($sizeFilter)) {
                $filters['min_size'] = strval((int) ($sizeFilter['min'] ?? 0));
                $filters['max_size'] = strval((int) ($sizeFilter['max'] ?? 0));
            }

            $contentFilter = $payload['content_filter'] ?? null;
            if (is_array($contentFilter)) {
                $filters['content'] = (string) ($contentFilter['query'] ?? '');
                $filters['max_content_size'] = strval((int) ($contentFilter['max_search_size'] ?? 5 * 1024 * 1024));
                $filters['include_oversized'] = filter_var($contentFilter['include_unmatched'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
                $filters['content_case_insensitive'] = filter_var($contentFilter['case_insensitive'] ?? true, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
            }

            return $this->searchFiles($serverUuid, $filters);
        } catch (WingsRequestException $e) {
            return new WingsResponse(['error' => $e->getMessage()], $e->getCode() > 0 ? $e->getCode() : 500);
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
        } catch (WingsRequestException $e) {
            // Some Wings builds expose proxy creation at /proxy instead of /proxy/create.
            if ((int) $e->getCode() === 404) {
                try {
                    $response = $this->connection->post("/api/servers/{$serverUuid}/proxy", $data);

                    return new WingsResponse($response, 202);
                } catch (\Exception $fallbackException) {
                    $statusCode = (int) $fallbackException->getCode();
                    if ($statusCode < 400 || $statusCode > 599) {
                        $statusCode = 500;
                    }

                    return new WingsResponse(['error' => $fallbackException->getMessage()], $statusCode);
                }
            }

            $statusCode = (int) $e->getCode();
            if ($statusCode < 400 || $statusCode > 599) {
                $statusCode = 500;
            }

            return new WingsResponse(['error' => $e->getMessage()], $statusCode);
        } catch (\Exception $e) {
            $statusCode = (int) $e->getCode();
            if ($statusCode < 400 || $statusCode > 599) {
                $statusCode = 500;
            }

            return new WingsResponse(['error' => $e->getMessage()], $statusCode);
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

    /**
     * Calagopus preferred listing: GET /files/list (paginated), fallback to list-directory.
     *
     * @param array{page?: int, per_page?: int, sort?: string} $options
     */
    private function listDirectoryCalagopus(string $serverUuid, string $directory, array $options = []): WingsResponse
    {
        $params = [
            'directory' => $directory === '' ? '/' : $directory,
        ];
        if (isset($options['page'])) {
            $params['page'] = (int) $options['page'];
        }
        if (isset($options['per_page'])) {
            $params['per_page'] = (int) $options['per_page'];
        }
        if (!empty($options['sort']) && is_string($options['sort'])) {
            $params['sort'] = $options['sort'];
        }

        try {
            $query = http_build_query($params);
            $response = $this->connection->get("/api/servers/{$serverUuid}/files/list?{$query}");

            return new WingsResponse($this->normalizeDirectoryListResponse($response), 200);
        } catch (WingsRequestException $e) {
            $status = (int) $e->getCode();
            if (!in_array($status, [404, 405, 501], true)) {
                throw $e;
            }

            $encodedDirectory = urlencode($directory);
            $response = $this->connection->get(
                "/api/servers/{$serverUuid}/files/list-directory?directory={$encodedDirectory}"
            );

            return new WingsResponse($response, 200);
        }
    }

    /**
     * Normalize Calagopus {entries,total,...} into a flat list the panel UI expects,
     * while preserving pagination metadata when present.
     */
    private function normalizeDirectoryListResponse($response)
    {
        if (!is_array($response)) {
            return $response;
        }

        if (isset($response['entries']) && is_array($response['entries'])) {
            // Keep metadata for clients that want it; primary payload stays entries-compatible
            // by also exposing a list-shaped top-level when controllers pass getData() through.
            return [
                'entries' => $response['entries'],
                'total' => $response['total'] ?? count($response['entries']),
                'filesystem_primary' => $response['filesystem_primary'] ?? true,
                'filesystem_writable' => $response['filesystem_writable'] ?? true,
                'filesystem_fast' => $response['filesystem_fast'] ?? false,
                // Flat alias used by existing getFiles consumers that iterate the list
                'files' => $response['entries'],
            ];
        }

        return $response;
    }

    /**
     * @param array<string, mixed> $filters
     *
     * @return array<string, mixed>
     */
    private function mapSearchFiltersToCalagopusPayload(array $filters): array
    {
        $root = (string) ($filters['directory'] ?? '/');
        $include = trim((string) ($filters['include'] ?? ''));
        $exclude = trim((string) ($filters['exclude'] ?? ''));
        $pattern = trim((string) ($filters['pattern'] ?? ''));
        $caseInsensitive = filter_var($filters['case_insensitive'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $content = trim((string) ($filters['content'] ?? ''));
        $contentCaseInsensitive = filter_var($filters['content_case_insensitive'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $minSize = (int) ($filters['min_size'] ?? 0);
        $maxSize = (int) ($filters['max_size'] ?? 0);
        $maxContentSize = (int) ($filters['max_content_size'] ?? 5 * 1024 * 1024);
        $includeOversized = filter_var($filters['include_oversized'] ?? false, FILTER_VALIDATE_BOOLEAN);

        $pathIncludes = [];
        if ($include !== '') {
            $pathIncludes[] = $include;
        }
        if ($pattern !== '') {
            $pathIncludes[] = $pattern;
        }
        if ($pathIncludes === [] && $content === '') {
            $pathIncludes[] = '*';
        }

        $pathFilter = [
            'include' => $pathIncludes,
            'exclude' => $exclude !== '' ? [$exclude] : [],
            'case_insensitive' => $caseInsensitive,
        ];

        $payload = [
            'root' => $root === '' ? '/' : $root,
            'path_filter' => $pathFilter,
            'per_page' => 250,
        ];

        if ($maxSize > 0 || $minSize > 0) {
            $payload['size_filter'] = [
                'min' => max(0, $minSize),
                'max' => $maxSize > 0 ? $maxSize : PHP_INT_MAX,
            ];
        }

        if ($content !== '') {
            $payload['content_filter'] = [
                'query' => $content,
                'max_search_size' => max(0, $maxContentSize),
                'include_unmatched' => $includeOversized,
                'case_insensitive' => $contentCaseInsensitive,
            ];
        }

        return $payload;
    }

    /**
     * @return array<int, mixed>
     */
    private function normalizeSearchResults($response): array
    {
        if (!is_array($response)) {
            return [];
        }
        if (isset($response['results']) && is_array($response['results'])) {
            return array_values($response['results']);
        }
        if (array_is_list($response)) {
            return $response;
        }

        return [];
    }

    /**
     * Normalize a daemon file path to an absolute server path (leading slash).
     * FeatherWings does this itself; Calagopus expects the panel to send /path style paths.
     */
    private function normalizeDaemonFilePath(string $file): string
    {
        $file = str_replace('\\', '/', trim($file));
        if ($file === '' || $file === '/') {
            return '/';
        }

        $file = '/' . ltrim($file, '/');
        $collapsed = preg_replace('#/+#', '/', $file);

        return is_string($collapsed) && $collapsed !== '' ? $collapsed : '/';
    }

    /**
     * Map panel/UI archive extension aliases to Calagopus ArchiveFormat snake_case.
     */
    private function mapCompressExtensionToCalagopusFormat(string $extension): ?string
    {
        $ext = strtolower(ltrim(trim($extension), '.'));

        return match ($ext) {
            'zip' => 'zip',
            '7z', 'seven_zip', 'seven-zip' => 'seven_zip',
            'tar' => 'tar',
            'tar.gz', 'tgz', 'tar_gz' => 'tar_gz',
            'tar.xz', 'txz', 'tar_xz' => 'tar_xz',
            'tar.bz2', 'tbz2', 'tar_bz2' => 'tar_bz2',
            'tar.lz4', 'tar_lz4' => 'tar_lz4',
            'tar.zst', 'tar.zstd', 'tar_zstd' => 'tar_zstd',
            'tar.lz', 'tar_lzip' => 'tar_lzip',
            default => null,
        };
    }

    /**
     * Map Calagopus archive format names back to FeatherWings extensions.
     */
    private function mapCalagopusFormatToCompressExtension(string $format): string
    {
        $normalized = strtolower(ltrim(trim($format), '.'));

        return match ($normalized) {
            'seven_zip', 'seven-zip' => '7z',
            'tar_gz' => 'tar.gz',
            'tar_xz' => 'tar.xz',
            'tar_bz2' => 'tar.bz2',
            'tar_lz4' => 'tar.lz4',
            'tar_zstd' => 'tar.zst',
            'tar_lzip' => 'tar.lz',
            default => $format,
        };
    }

    private function resolveFileOperationPath(string $root, string $path): string
    {
        if (str_starts_with($path, '/')) {
            return '/' . ltrim($path, '/');
        }

        $root = '/' . trim($root, '/');

        return rtrim($root, '/') . '/' . ltrim($path, '/');
    }

    /**
     * @return array<string, mixed>
     */
    private function skippedFileEntry(string $path): array
    {
        return [
            'name' => basename($path),
            'file' => true,
            'directory' => false,
            'path' => $path,
        ];
    }

    private function normalizeInstallLogsResponse($response)
    {
        if (is_string($response)) {
            return ['logs' => $response];
        }
        if (is_array($response)) {
            if (isset($response['logs'])) {
                return $response;
            }
            if (isset($response['data']) && is_string($response['data'])) {
                return ['logs' => $response['data']];
            }
            if (isset($response['content']) && is_string($response['content'])) {
                return ['logs' => $response['content']];
            }
        }

        return $response;
    }

    /**
     * Map Wings HTTP exceptions to a response with the correct status; other errors become 500.
     */
    private function wingsErrorResponse(\Exception $e): WingsResponse
    {
        if ($e instanceof WingsAuthenticationException) {
            $code = $e->getCode();

            return new WingsResponse(['error' => $e->getMessage()], ($code >= 400 && $code < 600) ? $code : 401);
        }
        if ($e instanceof WingsRequestException) {
            $code = $e->getCode();

            return new WingsResponse(['error' => $e->getMessage()], ($code >= 400 && $code < 600) ? $code : 503);
        }

        return new WingsResponse(['error' => $e->getMessage()], 500);
    }
}
