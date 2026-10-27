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
 * Staging store for resumable chunked uploads that go through the panel
 * (WebSpaces). Same protocol as FeatherWings' /upload/chunk:
 * parts are appended in order at an offset, a part past the stored size is
 * refused with 409 and the stored offset, an already stored part is
 * acknowledged, and complete() checks size and optional SHA-256.
 *
 * Every method returns [httpStatus, body].
 */
class ChunkedUploadStore
{
    public const EXPIRY_SECONDS = 86400;
    public const MAX_OPEN_PER_USER = 8;
    private const ID_PATTERN = '/^[A-Za-z0-9_-]{8,128}$/';

    public function __construct(private string $baseDir)
    {
    }

    public static function defaultBaseDir(): string
    {
        $storage = defined('APP_STORAGE_DIR') ? (string) APP_STORAGE_DIR : dirname(__DIR__, 2) . '/storage/';

        return rtrim($storage, '/') . '/chunked-uploads';
    }

    public static function isValidId(string $id): bool
    {
        return preg_match(self::ID_PATTERN, $id) === 1;
    }

    /** Converts a php.ini size ("8M", "1G", "0") to bytes; 0 means unlimited. */
    public static function iniBytes(string $value): int
    {
        $value = trim($value);
        if ($value === '' || !preg_match('/^(\d+)\s*([KMG]?)/i', $value, $m)) {
            return 0;
        }
        $n = (int) $m[1];

        return match (strtoupper($m[2])) {
            'G' => $n * 1024 ** 3,
            'M' => $n * 1024 ** 2,
            'K' => $n * 1024,
            default => $n,
        };
    }

    /**
     * Part size for uploads through PHP: the panel setting (clamped 5-90 MB, under
     * Cloudflare's 100 MB) but never above post_max_size, which also limits raw bodies.
     */
    public static function chunkSizeBytes(mixed $settingMb, ?string $postMaxSize = null): int
    {
        $mb = is_numeric($settingMb) ? (int) $settingMb : 50;
        $size = max(5, min(90, $mb)) * 1024 * 1024;
        $post = self::iniBytes($postMaxSize ?? (string) ini_get('post_max_size'));
        if ($post > 0) {
            $size = min($size, max(256 * 1024, $post - 64 * 1024));
        }

        return $size;
    }

    public function dirFor(string $scope, string $userUuid, string $uploadId): string
    {
        $hash = substr(hash('sha256', $scope . "\0" . $userUuid . "\0" . $uploadId), 0, 32);

        return $this->baseDir . '/' . preg_replace('/[^A-Za-z0-9_-]/', '', $scope) . '/' . $hash;
    }

    /** @return array{0:int,1:array<string,mixed>} */
    public function status(string $dir, int $maxChunk): array
    {
        $meta = $this->meta($dir);
        if ($meta === null) {
            return [200, ['exists' => false, 'offset' => 0, 'max_chunk_size' => $maxChunk]];
        }

        return [200, [
            'exists' => true,
            'offset' => $this->stored($dir),
            'total_size' => (int) $meta['total_size'],
            'file_name' => (string) $meta['file_name'],
            'directory' => (string) $meta['directory'],
            'max_chunk_size' => $maxChunk,
        ]];
    }

    /**
     * @param resource $body
     * @param int|null $maxTotal largest allowed file in bytes (null = no limit)
     *
     * @return array{0:int,1:array<string,mixed>}
     */
    public function append(string $dir, string $userUuid, string $fileName, string $directory, int $total, int $offset, $body, ?int $contentLength, int $maxChunk, ?int $maxTotal = null): array
    {
        if ($offset < 0 || $total < 0) {
            return [400, ['error' => 'Invalid offset or total_size.']];
        }
        if ($contentLength !== null && $contentLength > $maxChunk) {
            return [413, ['error' => 'Chunk is larger than the maximum chunk size.', 'max_chunk_size' => $maxChunk]];
        }
        if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
            return [500, ['error' => 'Failed to create upload staging directory.']];
        }
        $lock = fopen($dir . '/.lock', 'c');
        if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
            return [409, ['error' => 'Another chunk of this upload is being written.', 'offset' => $this->stored($dir)]];
        }
        try {
            $meta = $this->meta($dir);
            if ($meta === null) {
                if (!WebSpacePathValidator::isSafeFilename($fileName)) {
                    return [400, ['error' => 'Invalid file_name.']];
                }
                if ($maxTotal !== null && $total > $maxTotal) {
                    return [413, ['error' => 'File is larger than the available space.']];
                }
                if ($this->openUploadsFor(dirname($dir), $userUuid) >= self::MAX_OPEN_PER_USER) {
                    return [429, ['error' => 'Too many unfinished uploads. Finish or cancel some first.']];
                }
                $meta = ['file_name' => $fileName, 'directory' => $directory, 'total_size' => $total, 'user_uuid' => $userUuid, 'created_at' => time()];
                file_put_contents($dir . '/meta.json', json_encode($meta), LOCK_EX);
            } elseif ((int) $meta['total_size'] !== $total) {
                return [409, ['error' => 'total_size does not match the existing upload.']];
            }

            $stored = $this->stored($dir);
            if ($offset > $stored) {
                return [409, ['error' => 'Chunk offset is ahead of the stored data.', 'offset' => $stored]];
            }
            if ($offset < $stored) {
                if ($contentLength !== null && $offset + $contentLength <= $stored) {
                    return [200, ['offset' => $stored, 'total_size' => $total]];
                }

                return [409, ['error' => 'Chunk overlaps stored data.', 'offset' => $stored]];
            }

            $limit = min($maxChunk, $total - $offset);
            $out = fopen($dir . '/data', 'c');
            if ($out === false) {
                return [500, ['error' => 'Failed to open staging file.']];
            }
            fseek($out, $offset);
            $written = 0;
            $tooLarge = false;
            while (!feof($body)) {
                $buf = fread($body, 1048576);
                if ($buf === false) {
                    break;
                }
                if ($buf === '') {
                    continue;
                }
                if ($written + strlen($buf) > $limit) {
                    $tooLarge = true;
                    break;
                }
                if (fwrite($out, $buf) !== strlen($buf)) {
                    ftruncate($out, $offset);
                    fclose($out);

                    return [507, ['error' => 'Failed to store chunk.', 'offset' => $offset]];
                }
                $written += strlen($buf);
            }
            if ($tooLarge || ($contentLength !== null && $written !== $contentLength)) {
                ftruncate($out, $offset);
                fclose($out);

                return $tooLarge
                    ? [413, ['error' => 'Chunk is larger than allowed or past total_size.', 'offset' => $offset]]
                    : [400, ['error' => 'Chunk body was incomplete.', 'offset' => $offset]];
            }
            fclose($out);

            return [200, ['offset' => $this->stored($dir), 'total_size' => $total]];
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    /**
     * Verifies the staged file and hands it to $deliver(path, meta), which must
     * return [status, body]. Staging is removed after a successful delivery.
     *
     * @param callable(string, array<string,mixed>): array{0:int,1:array<string,mixed>} $deliver
     *
     * @return array{0:int,1:array<string,mixed>}
     */
    public function complete(string $dir, ?string $sha256, callable $deliver): array
    {
        $meta = $this->meta($dir);
        if ($meta === null) {
            return [404, ['error' => 'Upload not found.']];
        }
        $lock = fopen($dir . '/.lock', 'c');
        if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) {
            return [409, ['error' => 'The upload is busy.']];
        }
        try {
            $stored = $this->stored($dir);
            $total = (int) $meta['total_size'];
            if ($stored !== $total) {
                return [409, ['error' => 'Upload is incomplete.', 'offset' => $stored, 'total_size' => $total]];
            }
            $data = $dir . '/data';
            if (!is_file($data)) {
                touch($data);
            }
            $sum = (string) hash_file('sha256', $data);
            if ($sha256 !== null && $sha256 !== '' && strtolower($sha256) !== $sum) {
                return [422, ['error' => 'Checksum mismatch.', 'sha256' => $sum]];
            }
            [$status, $body] = $deliver($data, $meta);
            if ($status >= 200 && $status < 300) {
                self::removeDir($dir);

                return [200, array_merge(['file' => rtrim((string) $meta['directory'], '/') . '/' . $meta['file_name'], 'size' => $total, 'sha256' => $sum], $body)];
            }

            return [$status, $body];
        } finally {
            flock($lock, LOCK_UN);
            fclose($lock);
        }
    }

    /** @return array{0:int,1:array<string,mixed>} */
    public function cancel(string $dir): array
    {
        if (is_dir($dir)) {
            self::removeDir($dir);
        }

        return [204, []];
    }

    /** Removes staged uploads untouched for longer than the expiry. Returns how many were removed. */
    public function cleanupStale(?int $now = null): int
    {
        $now ??= time();
        $removed = 0;
        foreach (glob($this->baseDir . '/*/*', GLOB_ONLYDIR) ?: [] as $dir) {
            $latest = 0;
            foreach (['meta.json', 'data'] as $f) {
                $t = @filemtime($dir . '/' . $f);
                if ($t !== false && $t > $latest) {
                    $latest = $t;
                }
            }
            if ($now - $latest >= self::EXPIRY_SECONDS) {
                self::removeDir($dir);
                ++$removed;
            }
        }

        return $removed;
    }

    /** @return array<string, mixed>|null */
    private function meta(string $dir): ?array
    {
        $raw = @file_get_contents($dir . '/meta.json');
        $meta = is_string($raw) ? json_decode($raw, true) : null;

        return is_array($meta) ? $meta : null;
    }

    private function stored(string $dir): int
    {
        clearstatcache(true, $dir . '/data');
        $size = @filesize($dir . '/data');

        return $size === false ? 0 : $size;
    }

    private function openUploadsFor(string $scopeDir, string $userUuid): int
    {
        $n = 0;
        foreach (glob($scopeDir . '/*/meta.json') ?: [] as $file) {
            $meta = json_decode((string) @file_get_contents($file), true);
            if (is_array($meta) && ($meta['user_uuid'] ?? '') === $userUuid) {
                ++$n;
            }
        }

        return $n;
    }

    private static function removeDir(string $dir): void
    {
        foreach (scandir($dir) ?: [] as $f) {
            if ($f !== '.' && $f !== '..') {
                @unlink($dir . '/' . $f);
            }
        }
        @rmdir($dir);
    }
}
