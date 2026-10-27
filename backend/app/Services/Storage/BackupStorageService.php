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

use App\Chat\Backup;
use App\Services\Backup\BackupAdapterResolver;

/**
 * Panel-side coordination of remote (object storage) backups.
 *
 * Wings uploads directly to the provider using presigned URLs that this
 * service hands out; credentials never leave the panel.
 */
class BackupStorageService
{
    /** @var (callable(array<string, mixed>): ?S3ObjectStore)|null test seam */
    public static $storeFactory = null;

    public static function isRemote(array $backup): bool
    {
        return BackupAdapterResolver::normalizeStored($backup['disk'] ?? '') === BackupAdapterResolver::ADAPTER_S3;
    }

    /**
     * Object store for a backup, or null when no storage is configured.
     */
    public static function storeFor(array $backup): ?S3ObjectStore
    {
        if (self::$storeFactory !== null) {
            return (self::$storeFactory)($backup);
        }
        if (!StorageSettings::globalS3Configured()) {
            return null;
        }

        return new S3ObjectStore(StorageSettings::globalS3Config());
    }

    public static function objectKey(S3ObjectStore $store, array $server, array $backup): string
    {
        return $store->keyFor((string) $server['uuid'] . '/' . (string) $backup['uuid'] . '.tar.gz');
    }

    /**
     * Start (or restart) a multipart upload and return the payload Wings expects
     * from GET /api/remote/backups/{uuid}.
     *
     * @return array<string, mixed>
     */
    public static function uploadInfo(array $backup, array $server, int $size): array
    {
        $store = self::storeFor($backup);
        if ($store === null) {
            throw new StorageException('S3 backup storage is not configured on the panel', 'S3_NOT_CONFIGURED', 503);
        }
        $key = self::objectKey($store, $server, $backup);

        // Wings retries the whole upload on failure: drop any previous half-finished multipart upload.
        if (!empty($backup['upload_id'])) {
            try {
                $store->abortMultipartUpload($key, (string) $backup['upload_id']);
            } catch (\Throwable) {
                // best effort
            }
        }

        $partSize = S3ObjectStore::choosePartSize($size, StorageSettings::partSizeBytes());
        $count = max(1, (int) ceil($size / $partSize));
        $uploadId = $store->createMultipartUpload($key);
        Backup::updateBackup((int) $backup['id'], ['upload_id' => $uploadId]);

        $ttl = StorageSettings::presignTtlSeconds();
        $parts = [];
        for ($i = 1; $i <= $count; ++$i) {
            $parts[] = $store->presignUploadPart($key, $uploadId, $i, $ttl);
        }

        return [
            'parts' => $parts,
            'part_size' => $partSize,
            'max_concurrent_uploads' => StorageSettings::maxConcurrentUploads(),
        ];
    }

    /**
     * Finish or abort the multipart upload after Wings reports the result.
     *
     * @param array<string, mixed> $body Wings completion body
     */
    public static function finalize(array $backup, array $server, array $body): void
    {
        $uploadId = (string) ($backup['upload_id'] ?? '');
        if ($uploadId === '') {
            throw new StorageException('No multipart upload is in progress for this backup', 'NO_UPLOAD_IN_PROGRESS', 400);
        }
        $store = self::storeFor($backup);
        if ($store === null) {
            throw new StorageException('S3 backup storage is not configured on the panel', 'S3_NOT_CONFIGURED', 503);
        }
        $key = self::objectKey($store, $server, $backup);

        if (empty($body['successful'])) {
            $store->abortMultipartUpload($key, $uploadId);

            return;
        }

        $parts = [];
        foreach ((array) ($body['parts'] ?? []) as $p) {
            if (!is_array($p) || !isset($p['etag'], $p['part_number'])) {
                continue;
            }
            $parts[] = ['etag' => (string) $p['etag'], 'part_number' => (int) $p['part_number']];
        }
        if ($parts === []) {
            $store->abortMultipartUpload($key, $uploadId);
            throw new StorageException('Wings reported success without any uploaded parts', 'NO_PARTS', 400);
        }
        $store->completeMultipartUpload($key, $uploadId, $parts);
    }

    public static function downloadUrl(array $backup, array $server): string
    {
        $store = self::storeFor($backup);
        if ($store === null) {
            throw new StorageException('S3 backup storage is not configured on the panel', 'S3_NOT_CONFIGURED', 503);
        }
        $name = preg_replace('/[^A-Za-z0-9._-]+/', '_', (string) ($backup['name'] ?? 'backup')) . '.tar.gz';

        return $store->presignGet(self::objectKey($store, $server, $backup), StorageSettings::presignTtlSeconds(), $name);
    }

    public static function deleteObject(array $backup, array $server): void
    {
        $store = self::storeFor($backup);
        if ($store === null) {
            return;
        }
        $key = self::objectKey($store, $server, $backup);
        if (!empty($backup['upload_id']) && empty($backup['is_successful'])) {
            try {
                $store->abortMultipartUpload($key, (string) $backup['upload_id']);
            } catch (\Throwable) {
            }
        }
        $store->deleteObject($key);
    }
}
