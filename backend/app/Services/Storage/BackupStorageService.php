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
use App\Chat\UserStorageDestination;
use App\Services\Backup\BackupAdapterResolver;
use App\Services\Storage\Providers\DropboxProvider;
use App\Services\Storage\Providers\ProviderRegistry;
use App\Services\Storage\Providers\StorageProviderInterface;

/**
 * Panel-side coordination of remote (object storage) backups.
 *
 * Wings uploads directly to the provider using presigned URLs that this
 * service hands out; credentials never leave the panel.
 */
class BackupStorageService
{
    /** @var (callable(array<string, mixed>): ?S3ObjectStore)|null test seam */
    public static $storeFactory;

    public static function isRemote(array $backup): bool
    {
        return in_array(BackupAdapterResolver::normalizeStored($backup['disk'] ?? ''), [BackupAdapterResolver::ADAPTER_S3, BackupAdapterResolver::ADAPTER_RESUMABLE], true);
    }

    /** Stored on a cloud provider (Google Drive, ...) through the Wings resumable adapter. */
    public static function isResumable(array $backup): bool
    {
        return BackupAdapterResolver::normalizeStored($backup['disk'] ?? '') === BackupAdapterResolver::ADAPTER_RESUMABLE;
    }

    /**
     * The usable destination row of a backup (throws when it was removed or disconnected).
     */
    public static function destinationFor(array $backup): array
    {
        $destination = !empty($backup['destination_id']) ? UserStorageDestination::getById((int) $backup['destination_id'], true) : null;
        if ($destination === null || $destination['deleted_at'] !== null) {
            throw new StorageException('The storage destination of this backup was removed; the backup is orphaned', 'DESTINATION_ORPHANED', 409);
        }
        if ((string) $destination['status'] === UserStorageDestination::STATUS_REVOKED) {
            throw new StorageException('The storage destination of this backup was disconnected; reconnect it to use this backup', 'DESTINATION_REVOKED', 409);
        }

        return $destination;
    }

    /**
     * @return array{0: StorageProviderInterface, 1: array<string, mixed>}
     */
    public static function providerFor(array $backup): array
    {
        $destination = self::destinationFor($backup);

        return [ProviderRegistry::get((string) $destination['provider']), $destination];
    }

    /**
     * Object store for a backup, or null when no storage is configured.
     */
    public static function storeFor(array $backup): ?S3ObjectStore
    {
        if (self::$storeFactory !== null) {
            return (self::$storeFactory)($backup);
        }
        if (!empty($backup['destination_id'])) {
            return StorageDestinationService::storeFor(self::destinationFor($backup));
        }
        if (!StorageSettings::globalS3Configured()) {
            return null;
        }

        return new S3ObjectStore(StorageSettings::globalS3Config());
    }

    /**
     * Adapter for a new backup: a user destination or the admin "use S3 by default"
     * switch means presigned S3; otherwise the node's own adapter.
     */
    public static function chooseAdapter(\App\Services\Wings\Wings $wings, ?int $destinationId): string
    {
        if ($destinationId !== null && $destinationId > 0) {
            $destination = UserStorageDestination::getById($destinationId);
            if ($destination !== null && ProviderRegistry::has((string) $destination['provider'])) {
                if (!self::nodeSupportsResumable($wings)) {
                    throw new StorageException('This node runs a FeatherWings version without resumable backup uploads, so it cannot send backups to ' . ProviderRegistry::get((string) $destination['provider'])->label() . '. Ask an administrator to update Wings.', 'NODE_RESUMABLE_UNSUPPORTED', 422);
                }

                return BackupAdapterResolver::ADAPTER_RESUMABLE;
            }

            return BackupAdapterResolver::ADAPTER_S3;
        }
        if (StorageSettings::bool(StorageSettings::S3_USE_BY_DEFAULT) && StorageSettings::globalS3Configured()) {
            return BackupAdapterResolver::ADAPTER_S3;
        }

        return BackupAdapterResolver::resolveDefault($wings);
    }

    /** GET /api/system features.resumable_backup_upload; a missing key means unsupported. */
    public static function nodeSupportsResumable(\App\Services\Wings\Wings $wings): bool
    {
        try {
            $info = $wings->getSystem()->getSystemInfo();
        } catch (\Throwable) {
            return false;
        }
        $features = $info['features'] ?? ($info['data']['features'] ?? []);

        return is_array($features) && !empty($features['resumable_backup_upload']);
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
        if (self::isResumable($backup)) {
            [$provider, $destination] = self::providerFor($backup);

            return $provider->openUpload($destination, $server, $backup, $size);
        }
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
        if (self::isResumable($backup)) {
            [$provider, $destination] = self::providerFor($backup);
            if (empty($body['successful'])) {
                $provider->abortUpload($destination, $server, $backup);

                return;
            }
            $ref = $provider->completeUpload($destination, $server, $backup, (int) ($body['size'] ?? -1), strtolower((string) ($body['checksum'] ?? '')));
            if ($provider instanceof DropboxProvider) {
                // FeatherWings with the Dropbox content_hash change reports it; older Wings only allow the size check.
                $provider->verifyContentHash($destination, $server, $backup, strtolower(trim((string) ($body['content_hash'] ?? ''))));
            }
            Backup::updateBackup((int) $backup['id'], ['remote_ref' => $ref]);

            return;
        }
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
        if (self::isResumable($backup)) {
            [$provider, $destination] = self::providerFor($backup);
            $direct = $provider->browserDownloadUrl($destination, $server, $backup, self::downloadName($backup));

            return $direct ?? BackupStreamSigner::url((string) $backup['uuid']);
        }
        $store = self::storeFor($backup);
        if ($store === null) {
            throw new StorageException('S3 backup storage is not configured on the panel', 'S3_NOT_CONFIGURED', 503);
        }

        return $store->presignGet(self::objectKey($store, $server, $backup), StorageSettings::presignTtlSeconds(), self::downloadName($backup));
    }

    public static function downloadName(array $backup): string
    {
        return preg_replace('/[^A-Za-z0-9._-]+/', '_', (string) ($backup['name'] ?? 'backup')) . '.tar.gz';
    }

    /**
     * What Wings needs to fetch the archive for a restore.
     *
     * @return array{download_url: string, headers: array<string, string>}
     */
    public static function restoreSource(array $backup, array $server): array
    {
        if (self::isResumable($backup)) {
            [$provider, $destination] = self::providerFor($backup);

            return $provider->restoreSource($destination, $server, $backup);
        }

        return ['download_url' => self::downloadUrl($backup, $server), 'headers' => []];
    }

    /**
     * Destination state for the UI: null (node / admin storage), 'active', 'error', 'revoked' or 'orphaned'.
     */
    public static function destinationState(array $backup): ?string
    {
        if (empty($backup['destination_id'])) {
            return null;
        }
        $destination = UserStorageDestination::getById((int) $backup['destination_id'], true);
        if ($destination === null || $destination['deleted_at'] !== null) {
            return 'orphaned';
        }

        return (string) $destination['status'];
    }

    public static function deleteObject(array $backup, array $server): void
    {
        if (in_array(self::destinationState($backup), ['orphaned', 'revoked'], true)) {
            // The panel can no longer reach that storage; only the record is removed.
            return;
        }
        if (self::isResumable($backup)) {
            [$provider, $destination] = self::providerFor($backup);
            $provider->delete($destination, $server, $backup);

            return;
        }
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
