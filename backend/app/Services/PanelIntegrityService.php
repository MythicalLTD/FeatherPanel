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

namespace App\Services;

/**
 * SHA-256 file scans for core panel code (backend/app, bootstrap, composer metadata).
 */
class PanelIntegrityService
{
    public const BASELINE_RELATIVE_PATH = 'storage/config/panel_integrity_baseline.json';

    /** Skip hashing single files larger than this (bytes). */
    public const MAX_FILE_BYTES = 8_388_608;

    public function __construct(
        private readonly string $appRoot,
    ) {}

    public static function fromEnvironment(): self
    {
        $root = defined('APP_DIR') ? rtrim(APP_DIR, "/\\") : dirname(__DIR__, 2);

        return new self($root);
    }

    /**
     * @return array{
     *   scanned_at: string,
     *   duration_ms: float,
     *   app_root_label: string,
     *   files_scanned: int,
     *   total_bytes_hashed: int,
     *   skipped_large_files: list<array{path: string, bytes: int}>,
     *   read_errors: list<array{path: string, message: string}>,
     *   files: list<array{path: string, sha256: string, bytes: int}>,
     *   baseline_present: bool,
     *   baseline_created_at: ?string,
     *   baseline_panel_version: ?string,
     *   comparison: ?array{
     *     matches: int,
     *     modified: list<array{path: string, expected: string, actual: string}>,
     *     missing: list<array{path: string, expected: string}>,
     *     extra: list<array{path: string, actual: string}>
     *   }
     * }
     */
    public function run(bool $includeFileList = true): array
    {
        $t0 = microtime(true);
        $absolutePaths = $this->collectAbsolutePaths();
        $files = [];
        $readErrors = [];
        $skippedLarge = [];
        $totalBytes = 0;

        foreach ($absolutePaths as $abs) {
            $rel = $this->toRelativePath($abs);
            if (!is_readable($abs)) {
                $readErrors[] = ['path' => $rel, 'message' => 'not_readable'];

                continue;
            }
            $size = filesize($abs);
            if ($size === false) {
                $readErrors[] = ['path' => $rel, 'message' => 'filesize_failed'];

                continue;
            }
            if ($size > self::MAX_FILE_BYTES) {
                $skippedLarge[] = ['path' => $rel, 'bytes' => $size];

                continue;
            }
            $hash = hash_file('sha256', $abs);
            if ($hash === false) {
                $readErrors[] = ['path' => $rel, 'message' => 'hash_failed'];

                continue;
            }
            $totalBytes += $size;
            $files[] = ['path' => $rel, 'sha256' => $hash, 'bytes' => $size];
        }

        usort($files, fn (array $a, array $b): int => strcmp($a['path'], $b['path']));

        $baseline = $this->loadBaselineMeta();
        $comparison = $this->compareToBaseline($files, $baseline['files'] ?? null);

        $durationMs = round((microtime(true) - $t0) * 1000, 2);

        return [
            'scanned_at' => gmdate('c'),
            'duration_ms' => $durationMs,
            'app_root_label' => 'backend',
            'files_scanned' => count($files),
            'total_bytes_hashed' => $totalBytes,
            'skipped_large_files' => $skippedLarge,
            'read_errors' => $readErrors,
            'files' => $includeFileList ? $files : [],
            'baseline_present' => $baseline['present'],
            'baseline_created_at' => $baseline['created_at'],
            'baseline_panel_version' => $baseline['panel_version'],
            'comparison' => $comparison,
        ];
    }

    /**
     * @param list<array{path: string, sha256: string, bytes: int}> $files
     *
     * @throws \RuntimeException
     */
    public function writeBaselineFromScan(array $files): void
    {
        $configDir = $this->appRoot . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'config';
        if (!is_dir($configDir)) {
            throw new \RuntimeException('storage/config directory does not exist');
        }
        if (!is_writable($configDir)) {
            throw new \RuntimeException('storage/config is not writable');
        }

        $map = [];
        foreach ($files as $f) {
            $map[$f['path']] = $f['sha256'];
        }
        ksort($map);

        $payload = [
            'created_at' => gmdate('c'),
            'panel_version' => defined('APP_VERSION') ? APP_VERSION : null,
            'files' => $map,
        ];

        $target = $configDir . DIRECTORY_SEPARATOR . basename(self::BASELINE_RELATIVE_PATH);
        $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new \RuntimeException('failed_to_encode_baseline');
        }
        if (file_put_contents($target, $json) === false) {
            throw new \RuntimeException('failed_to_write_baseline');
        }
    }

    /**
     * @return list<string>
     */
    private function collectAbsolutePaths(): array
    {
        $paths = [];
        $appCodeDir = $this->appRoot . DIRECTORY_SEPARATOR . 'app';
        if (is_dir($appCodeDir)) {
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($appCodeDir, \FilesystemIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::SELF_FIRST
            );
            foreach ($iterator as $fileInfo) {
                if (!$fileInfo instanceof \SplFileInfo || !$fileInfo->isFile()) {
                    continue;
                }
                $paths[] = $fileInfo->getPathname();
            }
        }

        foreach (['public' . DIRECTORY_SEPARATOR . 'index.php', 'composer.json', 'composer.lock'] as $rel) {
            $full = $this->appRoot . DIRECTORY_SEPARATOR . $rel;
            if (is_file($full)) {
                $paths[] = $full;
            }
        }

        $paths = array_values(array_unique($paths));
        sort($paths);

        return $paths;
    }

    private function toRelativePath(string $absolute): string
    {
        $root = rtrim($this->appRoot, "/\\") . DIRECTORY_SEPARATOR;
        $rel = str_starts_with($absolute, $root) ? substr($absolute, strlen($root)) : $absolute;

        return str_replace('\\', '/', $rel);
    }

    /**
     * @return array{present: bool, created_at: ?string, panel_version: ?string, files: ?array<string, string>}
     */
    private function loadBaselineMeta(): array
    {
        $path = $this->appRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, self::BASELINE_RELATIVE_PATH);
        if (!is_readable($path)) {
            return ['present' => false, 'created_at' => null, 'panel_version' => null, 'files' => null];
        }
        $raw = file_get_contents($path);
        if ($raw === false) {
            return ['present' => true, 'created_at' => null, 'panel_version' => null, 'files' => null];
        }
        $data = json_decode($raw, true);
        if (!is_array($data) || !isset($data['files']) || !is_array($data['files'])) {
            return ['present' => true, 'created_at' => null, 'panel_version' => null, 'files' => null];
        }
        /** @var array<string, string> $fileMap */
        $fileMap = [];
        foreach ($data['files'] as $k => $v) {
            if (is_string($k) && is_string($v)) {
                $fileMap[str_replace('\\', '/', $k)] = $v;
            }
        }

        return [
            'present' => true,
            'created_at' => isset($data['created_at']) && is_string($data['created_at']) ? $data['created_at'] : null,
            'panel_version' => isset($data['panel_version']) && is_string($data['panel_version']) ? $data['panel_version'] : null,
            'files' => $fileMap,
        ];
    }

    /**
     * @param list<array{path: string, sha256: string, bytes: int}> $scanned
     * @param ?array<string, string> $baseline
     *
     * @return ?array{
     *   matches: int,
     *   modified: list<array{path: string, expected: string, actual: string}>,
     *   missing: list<array{path: string, expected: string}>,
     *   extra: list<array{path: string, actual: string}>
     * }
     */
    private function compareToBaseline(array $scanned, ?array $baseline): ?array
    {
        if ($baseline === null || $baseline === []) {
            return null;
        }

        $actual = [];
        foreach ($scanned as $row) {
            $actual[$row['path']] = $row['sha256'];
        }

        $modified = [];
        $matches = 0;
        foreach ($baseline as $path => $expectedHash) {
            if (!array_key_exists($path, $actual)) {
                continue;
            }
            if ($actual[$path] === $expectedHash) {
                ++$matches;
            } else {
                $modified[] = [
                    'path' => $path,
                    'expected' => $expectedHash,
                    'actual' => $actual[$path],
                ];
            }
        }

        $missing = [];
        foreach ($baseline as $path => $expectedHash) {
            if (!array_key_exists($path, $actual)) {
                $missing[] = ['path' => $path, 'expected' => $expectedHash];
            }
        }

        $extra = [];
        foreach ($actual as $path => $hash) {
            if (!array_key_exists($path, $baseline)) {
                $extra[] = ['path' => $path, 'actual' => $hash];
            }
        }

        return [
            'matches' => $matches,
            'modified' => $modified,
            'missing' => $missing,
            'extra' => $extra,
        ];
    }
}
