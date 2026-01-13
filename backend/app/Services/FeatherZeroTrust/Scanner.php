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

namespace App\Services\FeatherZeroTrust;

use App\App;
use App\Chat\Node;
use App\Chat\Server;
use App\Services\Wings\Wings;
use App\Services\Wings\Services\ServerService;

/**
 * FeatherZeroTrust Scanner for server file scanning.
 *
 * Scans servers through Wings API and stores suspicious file hashes in FeatherPanel database.
 */
class Scanner
{
    private Wings $wings;
    private ServerService $serverService;
    private FileAnalyzer $analyzer;
    private Configuration $config;
    private int $maxFileSize;
    private array $scannedFiles = [];

    /**
     * Create a new Scanner instance.
     *
     * @param Wings $wings Wings client instance
     * @param Configuration|null $config Configuration instance (optional)
     */
    public function __construct(Wings $wings, ?Configuration $config = null)
    {
        $this->wings = $wings;
        $this->serverService = $wings->getServer();
        $this->config = $config ?? new Configuration();
        $configData = $this->config->getAll();
        $this->maxFileSize = $configData['max_file_size'];
        $this->analyzer = new FileAnalyzer($this->config);
    }

    /**
     * Scan a server for suspicious files.
     *
     * @param string $serverUuid Server UUID
     * @param string $directory Starting directory (default: '/')
     * @param int $maxDepth Maximum directory depth (default: 10)
     *
     * @return array<string, mixed> Scan results
     */
    public function scanServer(string $serverUuid, string $directory = '/', int $maxDepth = 10): array
    {
        $this->scannedFiles = [];
        $detections = [];
        $errors = [];

        try {
            // Get confirmed hashes from local database
            $confirmedHashes = $this->getConfirmedHashes();

            // Scan directory recursively
            $this->scanDirectory($serverUuid, $directory, $maxDepth, 0, $detections, $errors, $confirmedHashes);
        } catch (\Exception $e) {
            $errors[] = [
                'message' => $e->getMessage(),
                'file' => $directory,
            ];
            App::getInstance(true)->getLogger()->error("FeatherZeroTrust scan error for server {$serverUuid}: " . $e->getMessage());
        }

        return [
            'server_uuid' => $serverUuid,
            'detections' => $detections,
            'errors' => $errors,
            'files_scanned' => count($this->scannedFiles),
            'detections_count' => count($detections),
        ];
    }

    /**
     * Scan a directory recursively.
     *
     * @param string $serverUuid Server UUID
     * @param string $directory Directory path
     * @param int $maxDepth Maximum depth
     * @param int $currentDepth Current depth
     * @param array<string, mixed> $detections Detections array (by reference)
     * @param array<string, mixed> $errors Errors array (by reference)
     * @param array<string, mixed> $confirmedHashes Confirmed malicious hashes
     */
    private function scanDirectory(
        string $serverUuid,
        string $directory,
        int $maxDepth,
        int $currentDepth,
        array &$detections,
        array &$errors,
        array $confirmedHashes,
    ): void {
        if ($currentDepth >= $maxDepth) {
            return;
        }

        try {
            $response = $this->serverService->listDirectory($serverUuid, $directory);

            if (!$response->isSuccessful()) {
                $errors[] = [
                    'message' => 'Failed to list directory',
                    'directory' => $directory,
                ];

                return;
            }

            $files = $response->getData();

            if (!is_array($files)) {
                return;
            }

            foreach ($files as $file) {
                if (!is_array($file)) {
                    continue;
                }

                $fileName = $file['name'] ?? '';
                $filePath = rtrim($directory, '/') . '/' . $fileName;
                $fileType = $file['type'] ?? '';
                $fileSize = (int) ($file['size'] ?? 0);

                // Skip if already scanned
                if (in_array($filePath, $this->scannedFiles, true)) {
                    continue;
                }

                $this->scannedFiles[] = $filePath;

                // Get configuration for ignored patterns
                $configData = $this->config->getAll();

                // Check ignored paths
                $relativePath = ltrim(str_replace('/', '/', $filePath), '/');
                $isIgnoredPath = false;
                foreach ($configData['ignored_paths'] as $ignoredPath) {
                    if (strpos($relativePath, $ignoredPath) === 0 || strpos($filePath, $ignoredPath) !== false) {
                        $isIgnoredPath = true;
                        break;
                    }
                }

                if ($isIgnoredPath) {
                    continue;
                }

                // Skip directories that are too deep
                if ($fileType === 'dir') {
                    if ($currentDepth < $maxDepth - 1) {
                        $this->scanDirectory($serverUuid, $filePath, $maxDepth, $currentDepth + 1, $detections, $errors, $confirmedHashes);
                    }

                    continue;
                }

                // Check ignored files
                if (in_array($fileName, $configData['ignored_files'], true)) {
                    continue;
                }

                // Check ignored extensions
                $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
                $ignoredExts = array_map('strtolower', array_map(function ($ext) {
                    return ltrim($ext, '.');
                }, $configData['ignored_extensions']));

                if (in_array($extension, $ignoredExts, true)) {
                    continue;
                }

                // Skip files that are too large
                if ($fileSize > $this->maxFileSize) {
                    continue;
                }

                // Analyze file name
                $nameAnalysis = $this->analyzer->analyzeFileName($fileName, $fileSize);

                if ($nameAnalysis['isSuspicious']) {
                    $detection = [
                        'file_path' => $filePath,
                        'file_name' => $fileName,
                        'file_size' => $fileSize,
                        'detection_type' => $nameAnalysis['detectionType'],
                        'reason' => $nameAnalysis['reason'],
                        'detected_at' => date('Y-m-d H:i:s'),
                    ];

                    // Try to get file content and calculate hash
                    try {
                        $fileContent = $this->getFileContent($serverUuid, $filePath);
                        $hash = hash('sha256', $fileContent);

                        $detection['hash'] = $hash;

                        // Check against confirmed hashes
                        if (isset($confirmedHashes[$hash])) {
                            $detection['confirmed_malicious'] = true;
                            $detection['known_threat'] = $confirmedHashes[$hash];
                        }

                        // Analyze content
                        $contentAnalysis = $this->analyzer->analyzeFileContent($fileContent, $fileName);

                        if ($contentAnalysis['isSuspicious']) {
                            $detection['detection_type'] = $contentAnalysis['detectionType'];
                            $detection['reason'] .= '; ' . $contentAnalysis['reason'];
                        }

                        // Submit hash to local database
                        $this->submitHashToDatabase($serverUuid, $hash, $fileName, $detection['detection_type'], $filePath, $fileSize);
                    } catch (\Exception $e) {
                        $detection['hash_error'] = $e->getMessage();
                        App::getInstance(true)->getLogger()->warning("Failed to process file {$filePath}: " . $e->getMessage());
                    }

                    $detections[] = $detection;
                } else {
                    // Even if name is not suspicious, check content for known threats
                    try {
                        $fileContent = $this->getFileContent($serverUuid, $filePath);
                        $hash = hash('sha256', $fileContent);

                        // Check against confirmed hashes
                        if (isset($confirmedHashes[$hash])) {
                            $detections[] = [
                                'file_path' => $filePath,
                                'file_name' => $fileName,
                                'file_size' => $fileSize,
                                'hash' => $hash,
                                'detection_type' => 'known_malicious',
                                'reason' => 'File hash matches known malicious file',
                                'confirmed_malicious' => true,
                                'known_threat' => $confirmedHashes[$hash],
                                'detected_at' => date('Y-m-d H:i:s'),
                            ];
                        }
                    } catch (\Exception $e) {
                        // Skip files that can't be read
                    }
                }
            }
        } catch (\Exception $e) {
            $errors[] = [
                'message' => $e->getMessage(),
                'directory' => $directory,
            ];
        }
    }

    /**
     * Get file content.
     *
     * @param string $serverUuid Server UUID
     * @param string $filePath File path
     *
     * @return string File content
     */
    private function getFileContent(string $serverUuid, string $filePath): string
    {
        $response = $this->serverService->getFileContentsRaw($serverUuid, $filePath);

        if (!$response->isSuccessful()) {
            throw new \Exception('Failed to read file');
        }

        $content = $response->getData();

        return is_string($content) ? $content : '';
    }

    /**
     * Submit hash to local database.
     *
     * @param string $serverUuid Server UUID
     * @param string $hash SHA-256 hash
     * @param string $fileName File name
     * @param string $detectionType Detection type
     * @param string $filePath File path
     * @param int $fileSize File size
     */
    private function submitHashToDatabase(
        string $serverUuid,
        string $hash,
        string $fileName,
        string $detectionType,
        string $filePath,
        int $fileSize,
    ): void {
        try {
            // Get server information for metadata
            $server = Server::getServerByUuid($serverUuid);
            $serverName = $server['name'] ?? null;
            $nodeId = $server['node_id'] ?? null;
            $nodeName = null;

            if ($nodeId) {
                $node = Node::getNodeById((int) $nodeId);
                $nodeName = $node['name'] ?? null;
            }

            $metadata = [
                'file_path' => $filePath,
                'file_size' => $fileSize,
                'detected_at' => time(),
                'detected_by' => 'featherzerotrust-scanner',
                'server_name' => $serverName,
                'node_id' => $nodeId,
                'node_name' => $nodeName,
            ];

            SuspiciousFileHashService::submitHash($hash, $fileName, $detectionType, $serverUuid, $metadata);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to submit hash to database: ' . $e->getMessage());
        }
    }

    /**
     * Get confirmed malicious hashes from local database.
     *
     * @return array<string, mixed> Hash map of confirmed hashes
     */
    private function getConfirmedHashes(): array
    {
        try {
            return SuspiciousFileHashService::getHashesMap(true);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to get confirmed hashes from database: ' . $e->getMessage());

            return [];
        }
    }
}
