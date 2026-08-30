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

namespace App\Helpers;

use GuzzleHttp\Client;

/**
 * Thin HTTP client from FeatherPanel → FeatherQuilld daemon.
 */
class FeatherQuilldClient
{
    public const DEFAULT_TIMEOUT = 30;

    /**
     * @param array<string, mixed> $webNode decrypted web node row
     * @param array<string, mixed>|null $jsonBody
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function request(
        array $webNode,
        string $method,
        string $path,
        ?array $jsonBody = null,
        int $timeout = self::DEFAULT_TIMEOUT,
    ): array {
        $baseUrl = WingsUrlHelper::buildFromNode($webNode);
        $tokenId = trim((string) ($webNode['daemon_token_id'] ?? ''));
        $token = trim((string) ($webNode['daemon_token'] ?? ''));

        if ($tokenId === '' || $token === '') {
            return [
                'ok' => false,
                'status' => 0,
                'body' => null,
                'error' => 'Web node is missing daemon credentials',
            ];
        }

        $url = rtrim($baseUrl, '/') . '/' . ltrim($path, '/');

        try {
            $client = new Client([
                'timeout' => $timeout,
                'connect_timeout' => min(10, $timeout),
                'verify' => false,
                'http_errors' => false,
            ]);

            $options = [
                'headers' => [
                    'Authorization' => 'Bearer ' . $tokenId . '.' . $token,
                    'Accept' => 'application/json',
                    'User-Agent' => 'FeatherPanel/v1.0.0',
                ],
            ];

            if ($jsonBody !== null) {
                $options['json'] = $jsonBody;
            }

            $response = $client->request(strtoupper($method), $url, $options);
            $status = $response->getStatusCode();
            $raw = (string) $response->getBody();
            $decoded = json_decode($raw, true);

            return [
                'ok' => $status >= 200 && $status < 300,
                'status' => $status,
                'body' => is_array($decoded) ? $decoded : $raw,
                'error' => $status >= 200 && $status < 300 ? null : 'Daemon returned HTTP ' . $status,
            ];
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'status' => 0,
                'body' => null,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function createWebSpace(
        array $webNode,
        string $uuid,
        bool $startOnCompletion = false,
        bool $skipScripts = false,
        int $timeout = 30,
    ): array {
        return self::request($webNode, 'POST', '/api/webspaces', [
            'uuid' => $uuid,
            'start_on_completion' => $startOnCompletion,
            'skip_scripts' => $skipScripts,
        ], $timeout);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function deleteWebSpace(array $webNode, string $uuid): array
    {
        return self::request($webNode, 'DELETE', '/api/webspaces/' . $uuid);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function getSystem(array $webNode, int $timeout = 10): array
    {
        return self::request($webNode, 'GET', '/api/system', null, $timeout);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function getUtilization(array $webNode, int $timeout = 10): array
    {
        return self::request($webNode, 'GET', '/api/system/utilization', null, $timeout);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function getDiagnostics(array $webNode, int $timeout = 15): array
    {
        return self::request($webNode, 'GET', '/api/system/diagnostics', null, $timeout);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function getSystemLogs(array $webNode, int $timeout = 15): array
    {
        return self::request($webNode, 'GET', '/api/system/logs', null, $timeout);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function getSystemLogFile(array $webNode, string $fileName, int $lines = 200, int $timeout = 30): array
    {
        $safe = rawurlencode($fileName);

        return self::request(
            $webNode,
            'GET',
            '/api/system/logs/' . $safe . '?lines=' . max(1, min(5000, $lines)),
            null,
            $timeout,
        );
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function getSystemInfo(array $webNode, int $timeout = 10): array
    {
        return self::request($webNode, 'GET', '/api/system/info', null, $timeout);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function getSystemPlugins(array $webNode, int $timeout = 10): array
    {
        return self::request($webNode, 'GET', '/api/system/plugins', null, $timeout);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function getPackages(array $webNode, int $timeout = 30): array
    {
        return self::request($webNode, 'GET', '/api/system/packages', null, $timeout);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function installPackage(array $webNode, string $packageId, int $timeout = 300): array
    {
        return self::request(
            $webNode,
            'POST',
            '/api/system/packages/' . rawurlencode($packageId) . '/install',
            [],
            $timeout,
        );
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function removePackage(array $webNode, string $packageId, bool $purgeConfig = false, int $timeout = 300): array
    {
        $query = $purgeConfig ? '?purge_config=1' : '';

        return self::request(
            $webNode,
            'POST',
            '/api/system/packages/' . rawurlencode($packageId) . '/remove' . $query,
            [],
            $timeout,
        );
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function getVersionStatus(array $webNode, int $timeout = 15): array
    {
        return self::request($webNode, 'GET', '/api/system/version-status', null, $timeout);
    }

    /**
     * @param array<string, mixed> $webNode
     * @param array<string, mixed> $options
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function triggerSelfUpdate(array $webNode, array $options, int $timeout = 120): array
    {
        return self::request($webNode, 'POST', '/api/system/self-update', $options, $timeout);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function powerWebSpace(array $webNode, string $uuid, string $action): array
    {
        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/power', [
            'action' => $action,
        ]);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function getWebSpaceStatus(array $webNode, string $uuid): array
    {
        return self::request($webNode, 'GET', '/api/webspaces/' . $uuid . '/status');
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function getWebSpaceLogs(array $webNode, string $uuid, int $lines = 100): array
    {
        return self::request($webNode, 'GET', '/api/webspaces/' . $uuid . '/logs?lines=' . max(1, $lines));
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function getWebSpaceInstallLogs(array $webNode, string $uuid): array
    {
        return self::request($webNode, 'GET', '/api/webspaces/' . $uuid . '/logs/install');
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function reinstallWebSpace(
        array $webNode,
        string $uuid,
        bool $wipeFiles = true,
        bool $startOnCompletion = false,
    ): array {
        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/reinstall', [
            'wipe_files' => $wipeFiles,
            'start_on_completion' => $startOnCompletion,
        ], 300);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function getWebSpaceSsl(array $webNode, string $uuid): array
    {
        return self::request($webNode, 'GET', '/api/webspaces/' . $uuid . '/ssl');
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function renewWebSpaceSsl(array $webNode, string $uuid): array
    {
        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/ssl/renew', [], 180);
    }

    /**
     * @param array<string, mixed> $webNode
     * @param list<string> $webspaceUuids
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function deauthorizeUser(array $webNode, string $userUuid, array $webspaceUuids): array
    {
        return self::request($webNode, 'POST', '/api/deauthorize-user', [
            'user' => $userUuid,
            'webspaces' => array_values($webspaceUuids),
        ], 15);
    }

    /**
     * @param array<string, mixed> $webNode
     * @param list<string> $permissions
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function pushWebSpaceWsPermissions(
        array $webNode,
        string $webspaceUuid,
        string $userUuid,
        array $permissions,
    ): array {
        return self::request($webNode, 'POST', '/api/webspaces/' . $webspaceUuid . '/ws/permissions', [
            'user' => $userUuid,
            'webspace' => $webspaceUuid,
            'permissions' => array_values($permissions),
        ], 15);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function syncWebSpace(array $webNode, string $uuid): array
    {
        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/sync', [], 120);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function recreateRuntime(array $webNode, string $uuid): array
    {
        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/recreate-runtime', [], 300);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function getCustomSsl(array $webNode, string $uuid): array
    {
        return self::request($webNode, 'GET', '/api/webspaces/' . $uuid . '/ssl/custom', null, 30);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function deleteCustomSsl(array $webNode, string $uuid): array
    {
        return self::request($webNode, 'DELETE', '/api/webspaces/' . $uuid . '/ssl/custom', null, 60);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function uploadCustomSsl(array $webNode, string $uuid, string $certPath, string $keyPath): array
    {
        $baseUrl = WingsUrlHelper::buildFromNode($webNode);
        $tokenId = trim((string) ($webNode['daemon_token_id'] ?? ''));
        $token = trim((string) ($webNode['daemon_token'] ?? ''));
        if ($tokenId === '' || $token === '') {
            return ['ok' => false, 'status' => 0, 'body' => null, 'error' => 'Web node is missing daemon credentials'];
        }

        $url = rtrim($baseUrl, '/') . '/api/webspaces/' . $uuid . '/ssl/custom';
        try {
            $client = new Client([
                'timeout' => 60,
                'connect_timeout' => 10,
                'verify' => false,
                'http_errors' => false,
            ]);
            $response = $client->request('PUT', $url, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $tokenId . '.' . $token,
                    'Accept' => 'application/json',
                ],
                'multipart' => [
                    [
                        'name' => 'cert',
                        'contents' => fopen($certPath, 'r'),
                        'filename' => 'cert.pem',
                    ],
                    [
                        'name' => 'key',
                        'contents' => fopen($keyPath, 'r'),
                        'filename' => 'key.pem',
                    ],
                ],
            ]);
            $status = $response->getStatusCode();
            $raw = (string) $response->getBody();
            $decoded = json_decode($raw, true);

            return [
                'ok' => $status >= 200 && $status < 300,
                'status' => $status,
                'body' => is_array($decoded) ? $decoded : $raw,
                'error' => $status >= 200 && $status < 300 ? null : 'Daemon returned HTTP ' . $status,
            ];
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'status' => 0,
                'body' => null,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function getTransferStatus(array $webNode, string $uuid): array
    {
        return self::request($webNode, 'GET', '/api/transfers/' . $uuid . '/status', null, 15);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function importWebSpaceBackup(
        array $webNode,
        string $uuid,
        string $tmpPath,
        string $filename,
        string $mime = 'application/gzip',
    ): array {
        $baseUrl = WingsUrlHelper::buildFromNode($webNode);
        $tokenId = trim((string) ($webNode['daemon_token_id'] ?? ''));
        $token = trim((string) ($webNode['daemon_token'] ?? ''));
        if ($tokenId === '' || $token === '') {
            return ['ok' => false, 'status' => 0, 'body' => null, 'error' => 'Web node is missing daemon credentials'];
        }

        $url = rtrim($baseUrl, '/') . '/api/webspaces/' . $uuid . '/backups/import';

        try {
            $client = new Client([
                'timeout' => 600,
                'connect_timeout' => 10,
                'verify' => false,
                'http_errors' => false,
            ]);
            $response = $client->request('POST', $url, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $tokenId . '.' . $token,
                    'Accept' => 'application/json',
                ],
                'multipart' => [
                    [
                        'name' => 'archive',
                        'contents' => fopen($tmpPath, 'r'),
                        'filename' => $filename,
                        'headers' => ['Content-Type' => $mime],
                    ],
                ],
            ]);
            $status = $response->getStatusCode();
            $raw = (string) $response->getBody();
            $decoded = json_decode($raw, true);

            return [
                'ok' => $status >= 200 && $status < 300,
                'status' => $status,
                'body' => is_array($decoded) ? $decoded : $raw,
                'error' => $status >= 200 && $status < 300 ? null : 'Daemon returned HTTP ' . $status,
            ];
        } catch (\Throwable $e) {
            return ['ok' => false, 'status' => 0, 'body' => null, 'error' => $e->getMessage()];
        }
    }

    /**
     * @param array<string, mixed> $webNode
     * @param array<string, mixed>|null $body
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function createWebSpaceBackup(array $webNode, string $uuid, ?array $body = null): array
    {
        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/backup', $body ?? [], 600);
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function getWebSpaceBackupJobStatus(array $webNode, string $uuid, string $jobId): array
    {
        return self::request($webNode, 'GET', '/api/webspaces/' . $uuid . '/backups/jobs/' . $jobId, null, 30);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function startWebSpaceMalwareScan(array $webNode, string $uuid, ?array $body = null): array
    {
        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/malware-scan', $body ?? ['async' => true], 600);
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function getWebSpaceMalwareScanJob(array $webNode, string $uuid, string $jobId): array
    {
        return self::request($webNode, 'GET', '/api/webspaces/' . $uuid . '/malware-scan/jobs/' . $jobId, null, 30);
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function getWebSpaceMalwareScanLast(array $webNode, string $uuid): array
    {
        return self::request($webNode, 'GET', '/api/webspaces/' . $uuid . '/malware-scan/last', null, 30);
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function probeWebSpaceMalwareScan(array $webNode): array
    {
        return self::request($webNode, 'GET', '/api/webspaces/malware-scan/probe', null, 15);
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function getWebSpaceUtilization(array $webNode, string $uuid): array
    {
        return self::request($webNode, 'GET', '/api/webspaces/' . $uuid . '/utilization', null, 15);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function listWebSpaceBackups(array $webNode, string $uuid): array
    {
        return self::request($webNode, 'GET', '/api/webspaces/' . $uuid . '/backups');
    }

    /**
     * Rebuild local sidecar backup index from remote provider (restic/PBS).
     *
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function reconcileWebSpaceBackups(array $webNode, string $uuid): array
    {
        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/backups/reconcile', [], 120);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function deleteWebSpaceBackup(array $webNode, string $uuid, string $backupUuid): array
    {
        return self::request($webNode, 'DELETE', '/api/webspaces/' . $uuid . '/backups/' . $backupUuid);
    }

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function restoreWebSpaceBackup(
        array $webNode,
        string $uuid,
        string $backupUuid,
        ?array $body = null,
    ): array {
        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/backups/' . $backupUuid . '/restore', $body ?? [], 600);
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function listWebSpaceBackupFiles(
        array $webNode,
        string $uuid,
        string $backupUuid,
        string $directory = '/',
    ): array {
        $q = http_build_query(['directory' => $directory]);

        return self::request($webNode, 'GET', '/api/webspaces/' . $uuid . '/backups/' . $backupUuid . '/files?' . $q);
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function downloadWebSpaceBackup(array $webNode, string $uuid, string $backupUuid): array
    {
        $baseUrl = WingsUrlHelper::buildFromNode($webNode);
        $tokenId = trim((string) ($webNode['daemon_token_id'] ?? ''));
        $token = trim((string) ($webNode['daemon_token'] ?? ''));
        if ($tokenId === '' || $token === '') {
            return ['ok' => false, 'status' => 0, 'body' => null, 'error' => 'Web node is missing daemon credentials'];
        }

        $url = rtrim($baseUrl, '/') . '/api/webspaces/' . $uuid . '/backups/' . $backupUuid . '/download';

        try {
            $client = new Client([
                'timeout' => 600,
                'connect_timeout' => 10,
                'verify' => false,
                'http_errors' => false,
            ]);
            $response = $client->request('GET', $url, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $tokenId . '.' . $token,
                    'Accept' => '*/*',
                ],
            ]);
            $status = $response->getStatusCode();
            $raw = (string) $response->getBody();
            if ($status < 200 || $status >= 300) {
                return [
                    'ok' => false,
                    'status' => $status,
                    'body' => $raw,
                    'error' => 'Daemon returned HTTP ' . $status,
                ];
            }

            return [
                'ok' => true,
                'status' => $status,
                'body' => [
                    'contents' => $raw,
                    'filename' => $backupUuid . '.tar.gz',
                    'content_type' => $response->getHeaderLine('Content-Type') ?: 'application/gzip',
                ],
                'error' => null,
            ];
        } catch (\Throwable $e) {
            return ['ok' => false, 'status' => 0, 'body' => null, 'error' => $e->getMessage()];
        }
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function listWebSpaceFiles(array $webNode, string $uuid, string $directory = '/'): array
    {
        $q = http_build_query(['directory' => $directory]);

        return self::request($webNode, 'GET', '/api/webspaces/' . $uuid . '/files/list?' . $q);
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function getWebSpaceFileContents(array $webNode, string $uuid, string $file): array
    {
        $q = http_build_query(['file' => $file]);

        return self::request($webNode, 'GET', '/api/webspaces/' . $uuid . '/files/contents?' . $q);
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function writeWebSpaceFile(array $webNode, string $uuid, string $file, string $contents): array
    {
        $baseUrl = WingsUrlHelper::buildFromNode($webNode);
        $tokenId = trim((string) ($webNode['daemon_token_id'] ?? ''));
        $token = trim((string) ($webNode['daemon_token'] ?? ''));
        if ($tokenId === '' || $token === '') {
            return ['ok' => false, 'status' => 0, 'body' => null, 'error' => 'Web node is missing daemon credentials'];
        }

        $url = rtrim($baseUrl, '/') . '/api/webspaces/' . $uuid . '/files/write?' . http_build_query(['file' => $file]);

        try {
            $client = new Client([
                'timeout' => 60,
                'connect_timeout' => 10,
                'verify' => false,
                'http_errors' => false,
            ]);
            $response = $client->request('POST', $url, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $tokenId . '.' . $token,
                    'Content-Type' => 'text/plain; charset=utf-8',
                    'Accept' => 'application/json',
                ],
                'body' => $contents,
            ]);
            $status = $response->getStatusCode();
            $raw = (string) $response->getBody();
            $decoded = json_decode($raw, true);

            return [
                'ok' => $status >= 200 && $status < 300,
                'status' => $status,
                'body' => is_array($decoded) ? $decoded : $raw,
                'error' => $status >= 200 && $status < 300 ? null : 'Daemon returned HTTP ' . $status,
            ];
        } catch (\Throwable $e) {
            return ['ok' => false, 'status' => 0, 'body' => null, 'error' => $e->getMessage()];
        }
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function createWebSpaceDirectory(array $webNode, string $uuid, string $name): array
    {
        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/files/create-directory', [
            'name' => $name,
        ]);
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function renameWebSpaceFile(array $webNode, string $uuid, string $from, string $to): array
    {
        return self::request($webNode, 'PUT', '/api/webspaces/' . $uuid . '/files/rename', [
            'from' => $from,
            'to' => $to,
        ]);
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function copyWebSpaceFile(array $webNode, string $uuid, string $from, ?string $to = null): array
    {
        $payload = ['from' => $from];
        if ($to !== null && $to !== '') {
            $payload['to'] = $to;
        }

        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/files/copy', $payload);
    }

    /**
     * @param list<string> $files
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function copyManyWebSpaceFiles(
        array $webNode,
        string $uuid,
        array $files,
        ?string $destination = null,
    ): array {
        $payload = ['files' => array_values($files)];
        if ($destination !== null && $destination !== '') {
            $payload['destination'] = $destination;
        }

        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/files/copy-many', $payload, 300);
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function createWebSpaceSymlink(array $webNode, string $uuid, string $link, string $target): array
    {
        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/files/create-symlink', [
            'link' => $link,
            'target' => $target,
        ]);
    }

    /**
     * @param list<string> $files
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function fingerprintWebSpaceFiles(
        array $webNode,
        string $uuid,
        array $files,
        string $algorithm = 'sha256',
    ): array {
        $queryParts = [
            'algorithm=' . rawurlencode(strtolower($algorithm)),
        ];
        foreach (array_values($files) as $file) {
            $queryParts[] = 'files=' . rawurlencode((string) $file);
        }

        return self::request(
            $webNode,
            'GET',
            '/api/webspaces/' . $uuid . '/files/fingerprints?' . implode('&', $queryParts),
            null,
            120,
        );
    }

    /**
     * @param list<string> $files
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function deleteWebSpaceFiles(array $webNode, string $uuid, array $files): array
    {
        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/files/delete', [
            'files' => array_values($files),
        ]);
    }

    /**
     * @param list<string> $files
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function compressWebSpaceFiles(
        array $webNode,
        string $uuid,
        string $root,
        array $files,
        ?string $name = null,
        string $extension = 'tar.gz',
    ): array {
        $payload = [
            'root' => $root,
            'files' => array_values($files),
            'extension' => $extension,
        ];
        if ($name !== null && $name !== '') {
            $payload['name'] = $name;
        }

        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/files/compress', $payload, 300);
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function decompressWebSpaceFile(array $webNode, string $uuid, string $file, string $root = '/'): array
    {
        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/files/decompress', [
            'file' => $file,
            'root' => $root,
        ], 300);
    }

    /**
     * @param list<array{file: string, mode: string}> $files
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function chmodWebSpaceFiles(array $webNode, string $uuid, array $files): array
    {
        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/files/chmod', [
            'files' => array_values($files),
        ]);
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function searchWebSpaceFiles(
        array $webNode,
        string $uuid,
        string $query,
        string $directory = '/',
        int $limit = 100,
    ): array {
        $q = http_build_query([
            'query' => $query,
            'directory' => $directory,
            'limit' => $limit,
        ]);

        return self::request($webNode, 'GET', '/api/webspaces/' . $uuid . '/files/search?' . $q);
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function getWebSpaceProxyLogs(
        array $webNode,
        string $uuid,
        ?string $domain = null,
        int $lines = 200,
        int $days = 0,
    ): array {
        $query = ['lines' => $lines];
        if ($domain !== null && $domain !== '') {
            $query['domain'] = $domain;
        }
        if ($days > 0) {
            $query['days'] = $days;
        }

        return self::request($webNode, 'GET', '/api/webspaces/' . $uuid . '/proxy-logs?' . http_build_query($query));
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function execWebSpaceCommand(array $webNode, string $uuid, string $command, int $timeout = 180): array
    {
        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/exec', [
            'command' => $command,
        ], $timeout);
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function pullWebSpaceFile(
        array $webNode,
        string $uuid,
        string $url,
        string $directory = '/',
        ?string $fileName = null,
    ): array {
        $payload = [
            'url' => $url,
            'directory' => $directory,
        ];
        if ($fileName !== null && $fileName !== '') {
            $payload['file_name'] = $fileName;
        }

        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/files/pull', $payload, 300);
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function downloadWebSpaceFile(array $webNode, string $uuid, string $file): array
    {
        $baseUrl = WingsUrlHelper::buildFromNode($webNode);
        $tokenId = trim((string) ($webNode['daemon_token_id'] ?? ''));
        $token = trim((string) ($webNode['daemon_token'] ?? ''));
        if ($tokenId === '' || $token === '') {
            return ['ok' => false, 'status' => 0, 'body' => null, 'error' => 'Web node is missing daemon credentials'];
        }

        $url = rtrim($baseUrl, '/') . '/api/webspaces/' . $uuid . '/files/download?' . http_build_query(['file' => $file]);

        try {
            $client = new Client([
                'timeout' => 120,
                'connect_timeout' => 10,
                'verify' => false,
                'http_errors' => false,
            ]);
            $response = $client->request('GET', $url, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $tokenId . '.' . $token,
                    'Accept' => '*/*',
                ],
            ]);
            $status = $response->getStatusCode();
            $raw = (string) $response->getBody();
            if ($status < 200 || $status >= 300) {
                $decoded = json_decode($raw, true);

                return [
                    'ok' => false,
                    'status' => $status,
                    'body' => is_array($decoded) ? $decoded : $raw,
                    'error' => 'Daemon returned HTTP ' . $status,
                ];
            }

            $disposition = $response->getHeaderLine('Content-Disposition');
            $filename = basename($file);
            if (preg_match('/filename="?([^";]+)"?/i', $disposition, $m)) {
                $filename = $m[1];
            }

            return [
                'ok' => true,
                'status' => $status,
                'body' => [
                    'contents' => $raw,
                    'filename' => $filename,
                    'content_type' => $response->getHeaderLine('Content-Type') ?: 'application/octet-stream',
                ],
                'error' => null,
            ];
        } catch (\Throwable $e) {
            return ['ok' => false, 'status' => 0, 'body' => null, 'error' => $e->getMessage()];
        }
    }

    /**
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function uploadWebSpaceFile(
        array $webNode,
        string $uuid,
        string $directory,
        string $filename,
        string $tmpPath,
        string $mime = 'application/octet-stream',
    ): array {
        $baseUrl = WingsUrlHelper::buildFromNode($webNode);
        $tokenId = trim((string) ($webNode['daemon_token_id'] ?? ''));
        $token = trim((string) ($webNode['daemon_token'] ?? ''));
        if ($tokenId === '' || $token === '') {
            return ['ok' => false, 'status' => 0, 'body' => null, 'error' => 'Web node is missing daemon credentials'];
        }

        $url = rtrim($baseUrl, '/') . '/api/webspaces/' . $uuid . '/files/upload?' . http_build_query(['directory' => $directory]);

        try {
            $client = new Client([
                'timeout' => 300,
                'connect_timeout' => 10,
                'verify' => false,
                'http_errors' => false,
            ]);
            $response = $client->request('POST', $url, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $tokenId . '.' . $token,
                    'Accept' => 'application/json',
                ],
                'multipart' => [
                    [
                        'name' => 'files',
                        'contents' => fopen($tmpPath, 'r'),
                        'filename' => $filename,
                        'headers' => ['Content-Type' => $mime],
                    ],
                ],
            ]);
            $status = $response->getStatusCode();
            $raw = (string) $response->getBody();
            $decoded = json_decode($raw, true);

            return [
                'ok' => $status >= 200 && $status < 300,
                'status' => $status,
                'body' => is_array($decoded) ? $decoded : $raw,
                'error' => $status >= 200 && $status < 300 ? null : 'Daemon returned HTTP ' . $status,
            ];
        } catch (\Throwable $e) {
            return ['ok' => false, 'status' => 0, 'body' => null, 'error' => $e->getMessage()];
        }
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function syncWebSpaceSchedules(array $webNode, string $uuid): array
    {
        // Keep this short — panel CRUD must not hang waiting on a slow/unreachable daemon.
        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/schedules/sync', null, 10);
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function triggerWebSpaceSchedule(array $webNode, string $uuid, int $scheduleId): array
    {
        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/schedules/' . $scheduleId . '/trigger');
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function abortWebSpaceSchedules(array $webNode, string $uuid): array
    {
        return self::request($webNode, 'POST', '/api/webspaces/' . $uuid . '/schedules/abort');
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function probeDns(array $webNode): array
    {
        return self::request($webNode, 'GET', '/api/dns/probe');
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function listDnsZones(array $webNode): array
    {
        return self::request($webNode, 'GET', '/api/dns/zones');
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function createDnsZone(array $webNode, string $zoneName, ?string $nodeIp = null): array
    {
        $payload = ['name' => $zoneName];
        if ($nodeIp !== null && trim($nodeIp) !== '') {
            $payload['node_ip'] = trim($nodeIp);
        }

        return self::request($webNode, 'POST', '/api/dns/zones', $payload);
    }

    /**
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function listDnsRecords(
        array $webNode,
        string $zone,
        ?string $type = null,
        ?string $name = null,
        int $page = 1,
        int $perPage = 100,
    ): array {
        $query = array_filter([
            'type' => $type,
            'name' => $name,
            'page' => $page,
            'per_page' => $perPage,
        ], static fn ($v) => $v !== null && $v !== '');

        $path = '/api/dns/zones/' . rawurlencode($zone) . '/records';
        if ($query !== []) {
            $path .= '?' . http_build_query($query);
        }

        return self::request($webNode, 'GET', $path);
    }

    /**
     * @param array<string, mixed> $payload
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function createDnsRecord(array $webNode, string $zone, array $payload): array
    {
        return self::request($webNode, 'POST', '/api/dns/zones/' . rawurlencode($zone) . '/records', $payload);
    }

    /**
     * @param array<string, mixed> $payload
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function updateDnsRecord(array $webNode, string $zone, string $recordId, array $payload): array
    {
        return self::request(
            $webNode,
            'PATCH',
            '/api/dns/zones/' . rawurlencode($zone) . '/records/' . rawurlencode($recordId),
            $payload,
        );
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function deleteDnsRecord(array $webNode, string $zone, string $recordId): array
    {
        return self::request(
            $webNode,
            'DELETE',
            '/api/dns/zones/' . rawurlencode($zone) . '/records/' . rawurlencode($recordId),
        );
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function upsertDnsTxt(
        array $webNode,
        string $zone,
        string $name,
        string $content,
        int $ttl = 120,
    ): array {
        return self::request($webNode, 'POST', '/api/dns/zones/' . rawurlencode($zone) . '/txt', [
            'name' => $name,
            'content' => $content,
            'ttl' => $ttl,
        ]);
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function deleteDnsTxt(
        array $webNode,
        string $zone,
        string $name,
        ?string $content = null,
    ): array {
        $query = ['name' => $name];
        if ($content !== null && $content !== '') {
            $query['content'] = $content;
        }

        return self::request(
            $webNode,
            'DELETE',
            '/api/dns/zones/' . rawurlencode($zone) . '/txt?' . http_build_query($query),
        );
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function probeMail(array $webNode): array
    {
        return self::request($webNode, 'GET', '/api/mail/probe');
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function listMailDomains(array $webNode): array
    {
        return self::request($webNode, 'GET', '/api/mail/domains');
    }

    /**
     * @param array<string, mixed> $payload
     *
     * @return array{ok: bool, status: int, body: mixed, error: ?string}
     */
    public static function mailProvision(array $webNode, array $payload): array
    {
        return self::request($webNode, 'POST', '/api/mail/provision', $payload);
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function getMailDnsHints(array $webNode, string $domain): array
    {
        return self::request($webNode, 'GET', '/api/mail/dns-hints/' . rawurlencode($domain));
    }

    /** @return array{ok: bool, status: int, body: mixed, error: ?string} */
    public static function addMailDomain(array $webNode, string $domain): array
    {
        return self::request($webNode, 'POST', '/api/mail/domains', ['name' => $domain]);
    }
}
