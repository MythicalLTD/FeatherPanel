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
 * Panel-side temporary file sharing for WebSpaces (copies from FeatherQuilld).
 */
final class WebSpaceFileShare
{
    private const TTL_SECONDS = 86400;

    /**
     * @param array<string, mixed> $webNode
     *
     * @return array{public_id: string, url: string, delete_key: string, expires_at: string, filename: string, size: int}
     */
    public static function share(array $webNode, string $uuid, string $filePath, int $ttlDays = 1): array
    {
        $download = FeatherQuilldClient::downloadWebSpaceFile($webNode, $uuid, $filePath);
        if (!$download['ok']) {
            throw new \RuntimeException($download['error'] ?? 'Failed to read file from web node');
        }

        $body = is_array($download['body']) ? $download['body'] : [];
        $contents = (string) ($body['contents'] ?? '');
        $filename = (string) ($body['filename'] ?? basename($filePath));
        $publicId = bin2hex(random_bytes(16));
        $deleteKey = bin2hex(random_bytes(16));
        $expiresAt = gmdate('c', time() + max(3600, $ttlDays * 86400));

        $dir = self::storageDir();
        if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
            throw new \RuntimeException('Failed to create share storage directory');
        }

        $meta = [
            'public_id' => $publicId,
            'delete_key' => $deleteKey,
            'filename' => $filename,
            'expires_at' => $expiresAt,
            'size' => strlen($contents),
        ];
        file_put_contents($dir . '/' . $publicId . '.meta.json', json_encode($meta, JSON_THROW_ON_ERROR));
        file_put_contents($dir . '/' . $publicId . '.bin', $contents);

        $base = AppUrlHelper::baseUrl();

        return [
            'public_id' => $publicId,
            'url' => $base . '/api/public/webspace-shares/' . $publicId,
            'delete_key' => $deleteKey,
            'expires_at' => $expiresAt,
            'filename' => $filename,
            'size' => strlen($contents),
        ];
    }

    /**
     * @return ?array{filename: string, contents: string, delete_key: string, expires_at: string}
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
            'contents' => (string) file_get_contents($binPath),
            'delete_key' => (string) ($meta['delete_key'] ?? ''),
            'expires_at' => $expiresAt,
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
