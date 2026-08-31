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

/**
 * Panel-side temporary file sharing for WebSpaces (streams from FeatherQuilld to disk).
 */
final class WebSpaceFileShare
{
    private const TTL_SECONDS = 86400;
    private const MAX_SHARE_BYTES = 512 * 1024 * 1024;

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{public_id: string, url: string, delete_key: string, expires_at: string, filename: string, size: int}
     */
    public static function share(array $webNode, string $uuid, string $filePath, int $ttlDays = 1): array
    {
        $publicId = bin2hex(random_bytes(16));
        $deleteKey = bin2hex(random_bytes(16));
        $expiresAt = gmdate('c', time() + max(3600, $ttlDays * 86400));

        $dir = self::storageDir();
        if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
            throw new \RuntimeException('Failed to create share storage directory');
        }

        $binPath = $dir . '/' . $publicId . '.bin';
        $stream = FeatherQuilldClient::streamWebSpaceFileToPath(
            $webNode,
            $uuid,
            $filePath,
            $binPath,
            self::MAX_SHARE_BYTES,
        );
        if (!$stream['ok']) {
            throw new \RuntimeException($stream['error'] ?? 'Failed to read file from web node');
        }

        $filename = (string) ($stream['filename'] ?? basename($filePath));
        $size = (int) ($stream['size'] ?? 0);

        $meta = [
            'public_id' => $publicId,
            'delete_key' => $deleteKey,
            'filename' => $filename,
            'expires_at' => $expiresAt,
            'size' => $size,
            'webspace_uuid' => $uuid,
            'file_path' => $filePath,
            'content_type' => (string) ($stream['content_type'] ?? 'application/octet-stream'),
        ];
        file_put_contents($dir . '/' . $publicId . '.meta.json', json_encode($meta, JSON_THROW_ON_ERROR));

        $base = AppUrlHelper::baseUrl();

        return [
            'public_id' => $publicId,
            'url' => $base . '/api/public/webspace-shares/' . $publicId,
            'delete_key' => $deleteKey,
            'expires_at' => $expiresAt,
            'filename' => $filename,
            'size' => $size,
        ];
    }

    /**
     * @return list<array{identifier: string, file: string, status: string, progress: int, error?: string, result?: array<string, mixed>}>
     */
    public static function listForWebSpace(string $uuid): array
    {
        $dir = self::storageDir();
        if (!is_dir($dir)) {
            return [];
        }

        $shares = [];
        foreach (glob($dir . '/*.meta.json') ?: [] as $metaPath) {
            /** @var array<string, mixed>|null $meta */
            $meta = json_decode((string) file_get_contents($metaPath), true);
            if (!is_array($meta)) {
                continue;
            }
            if ((string) ($meta['webspace_uuid'] ?? '') !== $uuid) {
                continue;
            }

            $publicId = (string) ($meta['public_id'] ?? basename($metaPath, '.meta.json'));
            $expiresAt = (string) ($meta['expires_at'] ?? '');
            if ($expiresAt !== '' && strtotime($expiresAt) !== false && strtotime($expiresAt) < time()) {
                self::delete($publicId);
                continue;
            }

            $binPath = $dir . '/' . $publicId . '.bin';
            if (!is_file($binPath)) {
                continue;
            }

            $base = AppUrlHelper::baseUrl();
            $shares[] = [
                'identifier' => $publicId,
                'file' => (string) ($meta['file_path'] ?? $meta['filename'] ?? ''),
                'status' => 'completed',
                'progress' => 100,
                'result' => [
                    'public_id' => $publicId,
                    'url' => $base . '/api/public/webspace-shares/' . $publicId,
                    'delete_key' => (string) ($meta['delete_key'] ?? ''),
                    'expires_at' => $expiresAt,
                    'filename' => (string) ($meta['filename'] ?? 'download'),
                    'size' => (int) ($meta['size'] ?? 0),
                ],
            ];
        }

        usort($shares, static fn (array $a, array $b): int => strcmp($b['identifier'], $a['identifier']));

        return $shares;
    }

    /**
     * @return ?array{filename: string, path: string, delete_key: string, expires_at: string, content_type: string, size: int}
     */
    public static function resolve(string $publicId): ?array
    {
        $metaPath = self::storageDir() . '/' . $publicId . '.meta.json';
        $binPath = self::storageDir() . '/' . $publicId . '.bin';
        if (!is_file($metaPath) || !is_file($binPath)) {
            return null;
        }

        /** @var array<string, mixed> $meta */
        $meta = json_decode((string) file_get_contents($metaPath), true) ?: [];
        $expiresAt = (string) ($meta['expires_at'] ?? '');
        if ($expiresAt !== '' && strtotime($expiresAt) !== false && strtotime($expiresAt) < time()) {
            self::delete($publicId);

            return null;
        }

        return [
            'filename' => (string) ($meta['filename'] ?? 'download'),
            'path' => $binPath,
            'delete_key' => (string) ($meta['delete_key'] ?? ''),
            'expires_at' => $expiresAt,
            'content_type' => (string) ($meta['content_type'] ?? 'application/octet-stream'),
            'size' => (int) ($meta['size'] ?? filesize($binPath)),
        ];
    }

    public static function delete(string $publicId, ?string $deleteKey = null): bool
    {
        $metaPath = self::storageDir() . '/' . $publicId . '.meta.json';
        if (is_file($metaPath)) {
            if ($deleteKey !== null) {
                /** @var array<string, mixed> $meta */
                $meta = json_decode((string) file_get_contents($metaPath), true) ?: [];
                if (!hash_equals((string) ($meta['delete_key'] ?? ''), $deleteKey)) {
                    return false;
                }
            }
            @unlink($metaPath);
        }
        @unlink(self::storageDir() . '/' . $publicId . '.bin');

        return true;
    }

    private static function storageDir(): string
    {
        return dirname(__DIR__, 2) . '/storage/webspace-shares';
    }
}
