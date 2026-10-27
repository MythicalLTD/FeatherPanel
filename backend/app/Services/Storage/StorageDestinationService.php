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

namespace App\Services\Storage;

use App\Chat\UserStorageDestination;

/**
 * Bring-your-own storage destinations: validation, client construction and the
 * browser-safe view of a destination.
 */
final class StorageDestinationService
{
    /** @var (callable(array<string, mixed>): S3ObjectStore)|null test seam */
    public static $storeFactory;

    /**
     * Validate a create/update payload for an S3 destination.
     *
     * @param array<string, mixed> $input
     * @param array<string, mixed> $existing current config (keeps the secret when left blank)
     *
     * @return array<string, mixed>
     */
    public static function normalizeS3Config(array $input, array $existing = []): array
    {
        $str = static fn (string $k, int $max): string => mb_substr(trim((string) ($input[$k] ?? ($existing[$k] ?? ''))), 0, $max);
        $config = [
            'endpoint' => rtrim($str('endpoint', 255), '/'),
            'region' => $str('region', 64) ?: 'us-east-1',
            'bucket' => $str('bucket', 255),
            'prefix' => trim($str('prefix', 255), '/'),
            'access_key' => $str('access_key', 255),
            'secret_key' => '',
            'path_style' => array_key_exists('path_style', $input) ? filter_var($input['path_style'], FILTER_VALIDATE_BOOL) : (bool) ($existing['path_style'] ?? true),
        ];
        $secret = (string) ($input['secret_key'] ?? '');
        $config['secret_key'] = $secret !== '' ? $secret : (string) ($existing['secret_key'] ?? '');

        if ($config['endpoint'] === '') {
            $config['endpoint'] = 'https://s3.' . $config['region'] . '.amazonaws.com';
        }
        EndpointGuard::assertShape($config['endpoint']);
        if (!preg_match('/^[a-z0-9][a-z0-9.\-_]{1,253}[a-z0-9]$/i', $config['bucket'])) {
            throw new StorageException('Bucket name is missing or invalid', 'BUCKET_INVALID', 422);
        }
        if (!preg_match('/^[a-z0-9-]{1,64}$/i', $config['region'])) {
            throw new StorageException('Region is invalid', 'REGION_INVALID', 422);
        }
        if ($config['access_key'] === '' || $config['secret_key'] === '') {
            throw new StorageException('Access key and secret key are required', 'CREDENTIALS_REQUIRED', 422);
        }
        // Reject private targets up front too; the check is repeated on every use.
        EndpointGuard::pin([$config['endpoint']]);

        return $config;
    }

    /**
     * S3 client for a destination; re-checks and pins DNS on every call.
     */
    public static function storeFor(array $destination): S3ObjectStore
    {
        $config = UserStorageDestination::config($destination);
        if (self::$storeFactory !== null) {
            return (self::$storeFactory)($destination);
        }
        $endpoint = (string) ($config['endpoint'] ?? '');
        $urls = [$endpoint];
        if (empty($config['path_style'])) {
            $p = parse_url($endpoint);
            $urls[] = ($p['scheme'] ?? 'https') . '://' . ($config['bucket'] ?? '') . '.' . ($p['host'] ?? '') . (isset($p['port']) ? ':' . $p['port'] : '');
        }

        return new S3ObjectStore($config, EndpointGuard::pin($urls));
    }

    /**
     * Upload and delete a probe object; records the result on the destination.
     *
     * @return array{ok: bool, error: string|null}
     */
    public static function test(array $destination): array
    {
        try {
            self::storeFor($destination)->test();
            UserStorageDestination::update((int) $destination['id'], [
                'status' => UserStorageDestination::STATUS_ACTIVE,
                'last_error' => null,
                'last_tested_at' => date('Y-m-d H:i:s'),
            ]);

            return ['ok' => true, 'error' => null];
        } catch (\Throwable $e) {
            UserStorageDestination::update((int) $destination['id'], [
                'status' => UserStorageDestination::STATUS_ERROR,
                'last_error' => $e->getMessage(),
                'last_tested_at' => date('Y-m-d H:i:s'),
            ]);

            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Destination a new backup may use, or null for the default (node / admin S3).
     *
     * @throws StorageException when the destination cannot be used by this user
     */
    public static function resolveForBackup(mixed $destinationId, int $userId): ?array
    {
        if ($destinationId === null || $destinationId === '' || $destinationId === 0 || $destinationId === '0') {
            return null;
        }
        if (!StorageSettings::byoEnabled()) {
            throw new StorageException('Bring-your-own backup storage is disabled on this panel', 'BYO_STORAGE_DISABLED', 403);
        }
        $id = filter_var($destinationId, FILTER_VALIDATE_INT);
        $row = $id ? UserStorageDestination::getForUser((int) $id, $userId) : null;
        if ($row === null) {
            throw new StorageException('Storage destination not found', 'DESTINATION_NOT_FOUND', 404);
        }
        if (!in_array((string) $row['provider'], StorageSettings::allowedProviders(), true)) {
            throw new StorageException('This storage provider is not allowed on this panel', 'PROVIDER_NOT_ALLOWED', 403);
        }
        if ((string) $row['status'] === UserStorageDestination::STATUS_REVOKED) {
            throw new StorageException('This storage destination was disconnected; reconnect it first', 'DESTINATION_REVOKED', 409);
        }

        return $row;
    }

    /**
     * destination_id from a schedule backup payload (JSON), if any.
     */
    public static function destinationIdFromPayload(string $payload): ?int
    {
        $data = json_decode(trim($payload), true);
        $id = is_array($data) ? (int) ($data['destination_id'] ?? 0) : 0;

        return $id > 0 ? $id : null;
    }

    /**
     * Scheduled / unattended backups may only use a destination of the server owner.
     *
     * @throws StorageException
     */
    public static function resolveForServer(?int $destinationId, array $server): ?int
    {
        if ($destinationId === null) {
            return null;
        }
        $row = self::resolveForBackup($destinationId, (int) ($server['owner_id'] ?? 0));

        return $row !== null ? (int) $row['id'] : null;
    }

    /**
     * Browser-safe summary (no secrets).
     *
     * @return array<string, mixed>
     */
    public static function view(array $row): array
    {
        $config = UserStorageDestination::config($row);
        $access = (string) ($config['access_key'] ?? '');

        return [
            'id' => (int) $row['id'],
            'uuid' => (string) $row['uuid'],
            'name' => (string) $row['name'],
            'provider' => (string) $row['provider'],
            'status' => (string) $row['status'],
            'last_error' => $row['last_error'] ?? null,
            'last_tested_at' => $row['last_tested_at'] ?? null,
            'created_at' => $row['created_at'] ?? null,
            'backups_count' => UserStorageDestination::countBackups((int) $row['id']),
            'config' => [
                'endpoint' => $config['endpoint'] ?? '',
                'region' => $config['region'] ?? '',
                'bucket' => $config['bucket'] ?? '',
                'prefix' => $config['prefix'] ?? '',
                'path_style' => (bool) ($config['path_style'] ?? true),
                'access_key_hint' => $access === '' ? '' : '…' . substr($access, -4),
                'has_secret' => !empty($config['secret_key']),
            ],
        ];
    }
}
