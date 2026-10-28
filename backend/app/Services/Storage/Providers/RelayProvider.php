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

namespace App\Services\Storage\Providers;

use App\Services\Storage\StorageSettings;
use App\Services\Storage\StorageException;
use App\Services\Storage\BackupStreamSigner;

/**
 * Storage that Wings cannot reach itself (SFTP, WebDAV): Wings uploads Content-Range chunks to a
 * signed panel URL (the same resumable contract as Google Drive) and the panel writes them on.
 * Downloads and restores stream through the panel too. Off unless the admin enables the relay.
 *
 * Upload state per backup lives in storage/byo-relay/<backup uuid>.json: bytes received and a
 * running SHA-1 (so the panel can check Wings' checksum without reading the file back).
 */
abstract class RelayProvider implements StorageProviderInterface
{
    /** 8 MiB chunks: small enough for PHP request limits and reverse proxies, multiple of 256 KiB. */
    public const CHUNK = 8388608;

    public function isOAuth(): bool
    {
        return false;
    }

    public function available(): bool
    {
        return StorageSettings::relayEnabled() && $this->supported();
    }

    /** Whether this panel can serve the provider at all (library / staging disk present). */
    abstract public function supported(): bool;

    /**
     * Validate and complete user input (secrets kept from $existing when left empty).
     *
     * @return array<string, mixed>
     */
    abstract public function normalizeConfig(array $input, array $existing = []): array;

    /** Whether existing backups would no longer be found after this config change. */
    abstract public function locationChanged(array $a, array $b): bool;

    /**
     * Safe fields for the UI (no secrets).
     *
     * @return array<string, mixed>
     */
    abstract public function publicConfig(array $config): array;

    public function openUpload(array $dest, array $server, array $backup, int $size): array
    {
        if (!$this->available()) {
            throw new StorageException('SFTP and WebDAV storage is turned off on this panel', 'RELAY_DISABLED', 403);
        }
        self::clearState((string) $backup['uuid']);
        self::purgeStale();
        $this->beginUpload($dest, $server, $backup);
        self::saveState((string) $backup['uuid'], ['size' => $size, 'received' => 0, 'hash' => base64_encode(serialize(hash_init('sha1'))), 'done' => false]);

        return [
            'adapter' => 'resumable',
            'protocol' => 'content-range',
            'session_url' => BackupStreamSigner::relayUrl((string) $backup['uuid']),
            'chunk_size' => self::CHUNK,
            'total_size' => $size,
            'headers' => (object) [],
            'complete_url' => null,
            'session_id' => null,
            'finish' => null,
        ];
    }

    /**
     * Handle one relay request (Content-Range chunk or "bytes star/total" status query).
     *
     * @return array{0: int, 1: array<string, string>} HTTP status and headers (308 + Range while incomplete, 201 when done)
     */
    public function receive(array $dest, array $server, array $backup, string $contentRange, string $body): array
    {
        $uuid = (string) $backup['uuid'];
        $lock = fopen(self::dir() . '/' . $uuid . '.lock', 'c');
        if ($lock === false || !flock($lock, LOCK_EX)) {
            throw new StorageException('Could not lock the relay upload', 'RELAY_LOCK_FAILED', 503);
        }
        try {
            $state = self::state($uuid);
            if ($state === null) {
                throw new StorageException('No relay upload is in progress for this backup', 'NO_UPLOAD_IN_PROGRESS', 404);
            }
            $progress = static fn (array $st): array => [308, $st['received'] > 0 ? ['Range' => 'bytes=0-' . ($st['received'] - 1)] : []];
            if (preg_match('#^bytes \*/(\d+)$#', $contentRange, $m)) {
                return $state['done'] ? [201, []] : $progress($state);
            }
            if (!preg_match('#^bytes (\d+)-(\d+)/(\d+)$#', $contentRange, $m)) {
                throw new StorageException('Invalid Content-Range', 'RELAY_BAD_RANGE', 400);
            }
            [$a, $b, $total] = [(int) $m[1], (int) $m[2], (int) $m[3]];
            if ($total !== (int) $state['size'] || $b < $a || strlen($body) !== $b - $a + 1 || strlen($body) > self::CHUNK) {
                throw new StorageException('The chunk does not match the upload', 'RELAY_BAD_RANGE', 400);
            }
            if ($state['done']) {
                return [201, []];
            }
            if ($a !== (int) $state['received']) {
                // Out of order / repeated: tell Wings where to continue.
                return $progress($state);
            }
            $this->writeChunk($dest, $server, $backup, $a, $body);
            $ctx = unserialize((string) base64_decode((string) $state['hash']), ['allowed_classes' => [\HashContext::class]]);
            hash_update($ctx, $body);
            $state['received'] = $b + 1;
            $state['hash'] = base64_encode(serialize($ctx));
            if ($state['received'] === $total) {
                $this->finishUpload($dest, $server, $backup);
                $state['done'] = true;
                $state['sha1'] = hash_final($ctx);
                unset($state['hash']);
            }
            self::saveState($uuid, $state);

            return $state['done'] ? [201, []] : $progress($state);
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    public function completeUpload(array $dest, array $server, array $backup, int $size, string $sha1): string
    {
        $uuid = (string) $backup['uuid'];
        $state = self::state($uuid);
        $remote = $this->remoteSize($dest, $server, $backup);
        $ok = $state !== null && !empty($state['done']) && (int) $state['received'] === $size && $remote === $size
            && ($sha1 === '' || hash_equals((string) ($state['sha1'] ?? ''), strtolower($sha1)));
        self::clearState($uuid);
        if (!$ok) {
            try {
                $this->deleteRemote($dest, $server, $backup);
            } catch (\Throwable) {
            }
            throw new StorageException('The stored file does not match what Wings uploaded', 'REMOTE_CHECKSUM_MISMATCH', 502);
        }

        return $this->remotePath($dest, $server, $backup);
    }

    public function abortUpload(array $dest, array $server, array $backup): void
    {
        self::clearState((string) $backup['uuid']);
        try {
            $this->deleteRemote($dest, $server, $backup);
        } catch (\Throwable) {
        }
    }

    public function restoreSource(array $dest, array $server, array $backup): array
    {
        if (!$this->available()) {
            throw new StorageException('SFTP and WebDAV storage is turned off on this panel', 'RELAY_DISABLED', 403);
        }

        return ['download_url' => BackupStreamSigner::url((string) $backup['uuid']), 'headers' => []];
    }

    public function browserDownloadUrl(array $dest, array $server, array $backup, string $filename): ?string
    {
        return null;
    }

    public function delete(array $dest, array $server, array $backup): void
    {
        $this->deleteRemote($dest, $server, $backup);
    }

    public function disconnect(array $dest): void
    {
    }

    public static function dir(): string
    {
        $storage = defined('APP_STORAGE_DIR') ? (string) APP_STORAGE_DIR : dirname(__DIR__, 4) . '/storage/';
        $dir = rtrim($storage, '/') . '/byo-relay';
        if (!is_dir($dir)) {
            @mkdir($dir, 0700, true);
        }

        return $dir;
    }

    /** Called when an upload (re)starts at byte 0. */
    abstract protected function beginUpload(array $dest, array $server, array $backup): void;

    /** Write one chunk at $offset (chunks always arrive in order). */
    abstract protected function writeChunk(array $dest, array $server, array $backup, int $offset, string $data): void;

    /** All bytes received: make the file final on the remote. */
    abstract protected function finishUpload(array $dest, array $server, array $backup): void;

    /** Size of the stored backup on the remote, or null when it is missing. */
    abstract protected function remoteSize(array $dest, array $server, array $backup): ?int;

    abstract protected function deleteRemote(array $dest, array $server, array $backup): void;

    abstract protected function remotePath(array $dest, array $server, array $backup): string;

    /** Relative path inside the user's folder; rejects traversal. */
    protected static function cleanRoot(string $root): string
    {
        $root = trim(str_replace('\\', '/', $root), '/');
        foreach (explode('/', $root) as $seg) {
            if ($seg === '..' || $seg === '.') {
                throw new StorageException('Folder must not contain . or .. segments', 'PATH_INVALID', 422);
            }
        }
        if (strlen($root) > 255 || preg_match('/[\x00-\x1f]/', $root)) {
            throw new StorageException('Folder is invalid', 'PATH_INVALID', 422);
        }

        return $root;
    }

    protected static function clearState(string $uuid): void
    {
        foreach (['.json', '.part', '.lock'] as $ext) {
            @unlink(self::dir() . '/' . $uuid . $ext);
        }
    }

    protected static function stagingFile(string $uuid): string
    {
        return self::dir() . '/' . $uuid . '.part';
    }

    /** Drop state and staged data of uploads abandoned for more than two days. */
    private static function purgeStale(): void
    {
        foreach (glob(self::dir() . '/*.{json,part,lock}', GLOB_BRACE) ?: [] as $file) {
            if (@filemtime($file) < time() - 172800) {
                @unlink($file);
            }
        }
    }

    /** @return array<string, mixed>|null */
    private static function state(string $uuid): ?array
    {
        $file = self::dir() . '/' . $uuid . '.json';
        $data = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;

        return is_array($data) ? $data : null;
    }

    private static function saveState(string $uuid, array $state): void
    {
        $file = self::dir() . '/' . $uuid . '.json';
        file_put_contents($file . '.tmp', json_encode($state, JSON_THROW_ON_ERROR));
        rename($file . '.tmp', $file);
    }
}
