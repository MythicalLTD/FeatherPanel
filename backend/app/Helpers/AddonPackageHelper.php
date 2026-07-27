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

        if (self::extractWithZipArchive($archivePath, $destinationDir, $password, $entries)) {
            return true;
        }

        // Fallback for legacy ZipCrypto packages if ZipArchive is unavailable/broken
        return self::extractWithUnzip($archivePath, $destinationDir, $password, $entries);
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
