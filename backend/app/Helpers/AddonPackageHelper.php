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
 * Extract password-protected .fpa addon packages.
 *
 * Marketplace packages from Mythic are re-encrypted with AES-256 (PKZIP 5.1).
 * Info-ZIP `unzip` only supports traditional ZipCrypto (PKZIP ≤ 4.6), so extraction
 * must use PHP ZipArchive (libzip), which handles both AES and ZipCrypto.
 */
class AddonPackageHelper
{
    /** Hard limits that legitimate addon packages stay far below. */
    public const MAX_ENTRIES = 20000;
    public const MAX_TOTAL_UNCOMPRESSED_BYTES = 1073741824; // 1 GiB

    /**
     * Extract a .fpa archive into a destination directory.
     *
     * @param string $archivePath Path to the .fpa / zip file
     * @param string $destinationDir Directory to extract into (created if missing)
     * @param string $password Archive password
     * @param list<string>|null $entries Optional subset of entries to extract (e.g. ['conf.yml'])
     */
    public static function extract(string $archivePath, string $destinationDir, string $password, ?array $entries = null): bool
    {
        if (!is_file($archivePath)) {
            return false;
        }

        if (!is_dir($destinationDir) && !@mkdir($destinationDir, 0755, true)) {
            return false;
        }

        // Fail closed: ZipArchive is required to validate entries before any extraction
        // path (including the unzip fallback) can touch the filesystem.
        if (!class_exists(\ZipArchive::class)) {
            return false;
        }

        $validator = new \ZipArchive();
        if ($validator->open($archivePath) !== true) {
            return false;
        }
        $safe = self::entriesAreSafe($validator, $entries);
        $validator->close();
        if (!$safe) {
            return false;
        }

        if (self::extractWithZipArchive($archivePath, $destinationDir, $password, $entries)) {
            return true;
        }

        // Fallback for legacy ZipCrypto packages if ZipArchive extraction fails
        // (entries already validated above).
        return self::extractWithUnzip($archivePath, $destinationDir, $password, $entries);
    }

    /**
     * Validate that the selected archive entries cannot escape the destination
     * directory (no traversal, no absolute paths, no symlinks) and stay within
     * sane count/size limits. Returns false when the archive must be rejected.
     *
     * @param list<string>|null $entries
     */
    private static function entriesAreSafe(\ZipArchive $zip, ?array $entries): bool
    {
        if ($zip->numFiles > self::MAX_ENTRIES) {
            return false;
        }

        $selected = ($entries === null || $entries === []) ? null : $entries;
        $totalSize = 0;

        for ($i = 0; $i < $zip->numFiles; ++$i) {
            $name = $zip->getNameIndex($i);
            if (!is_string($name)) {
                return false;
            }
            if ($selected !== null && !in_array($name, $selected, true)) {
                continue;
            }
            if (!self::isSafeEntryName($name)) {
                return false;
            }
            if (self::isSymlinkEntry($zip, $i)) {
                return false;
            }

            $stat = $zip->statIndex($i);
            if (is_array($stat) && isset($stat['size'])) {
                $totalSize += (int) $stat['size'];
                if ($totalSize > self::MAX_TOTAL_UNCOMPRESSED_BYTES) {
                    return false;
                }
            }
        }

        return true;
    }

    private static function isSafeEntryName(string $name): bool
    {
        if ($name === '' || str_contains($name, "\0")) {
            return false;
        }

        $normalized = str_replace('\\', '/', $name);

        if (str_starts_with($normalized, '/')) {
            return false;
        }
        // Windows drive letters (C:\...) and UNC-ish prefixes.
        if (preg_match('#^[A-Za-z]:#', $normalized) === 1) {
            return false;
        }

        foreach (explode('/', $normalized) as $segment) {
            if ($segment === '..') {
                return false;
            }
        }

        return true;
    }

    private static function isSymlinkEntry(\ZipArchive $zip, int $index): bool
    {
        if (!method_exists($zip, 'getExternalAttributesIndex')) {
            return false;
        }

        $opsys = 0;
        $attr = 0;
        if (!$zip->getExternalAttributesIndex($index, $opsys, $attr)) {
            return false;
        }

        // Unix host (3): S_IFLNK lives in the high 16 bits of the external attributes.
        return $opsys === 3 && (($attr >> 16) & 0xF000) === 0xA000;
    }

    /**
     * @param list<string>|null $entries
     */
    private static function extractWithZipArchive(string $archivePath, string $destinationDir, string $password, ?array $entries): bool
    {
        if (!class_exists(\ZipArchive::class)) {
            return false;
        }

        $zip = new \ZipArchive();
        if ($zip->open($archivePath) !== true) {
            return false;
        }

        if ($password !== '') {
            $zip->setPassword($password);
        }

        $ok = $entries === null || $entries === []
            ? $zip->extractTo($destinationDir)
            : $zip->extractTo($destinationDir, $entries);

        $zip->close();

        return $ok === true;
    }

    /**
     * @param list<string>|null $entries
     */
    private static function extractWithUnzip(string $archivePath, string $destinationDir, string $password, ?array $entries): bool
    {
        $entryArgs = '';
        if ($entries !== null && $entries !== []) {
            $entryArgs = ' ' . implode(' ', array_map('escapeshellarg', $entries));
        }

        $unzipCommand = sprintf(
            'unzip -P %s %s%s -d %s',
            escapeshellarg($password),
            escapeshellarg($archivePath),
            $entryArgs,
            escapeshellarg($destinationDir)
        );

        exec($unzipCommand, $out, $code);

        return $code === 0;
    }
}
