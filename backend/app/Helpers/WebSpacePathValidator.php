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
 * Defense-in-depth path validation for WebSpace file-manager operations.
 *
 * FeatherQuilld (the daemon that actually touches the filesystem) is
 * expected to normalize/contain every path it receives, but this panel
 * proxies raw, user-controlled path strings straight through to it with
 * no validation of its own. That leaves a single point of failure: any
 * traversal/normalization bug in the daemon has no second line of
 * defense here.
 *
 * This helper adds that second line: it rejects the input classes that
 * make path traversal, NUL-byte injection, and symlink-target escapes
 * possible, without needing to know anything about the daemon's own
 * filesystem layout. It is intentionally conservative - a legitimate
 * WebSpace-relative path never needs `..`, a NUL byte, or (for most
 * operations) to start with `/` pointing outside the space.
 */
class WebSpacePathValidator
{
    /**
     * Validate a single WebSpace-relative path (file or directory).
     *
     * Rejects:
     *  - empty strings (caller should already require non-empty; this is
     *    a second check for callers that reuse this validator directly).
     *  - NUL bytes (classic PHP/C string-truncation attack).
     *  - any path segment equal to `..` (parent-directory traversal).
     *  - backslashes (Windows-style traversal / ambiguous separators
     *    that some downstream parsers treat differently than `/`).
     *
     * A leading `/` is allowed and normalized away, since the WebSpace
     * file API already treats paths as rooted at the space's own root
     * (see `directory=/` defaults throughout WebSpaceFilesController) -
     * it does NOT mean "absolute path on the host/daemon filesystem".
     *
     * @return string|null the normalized (leading-slash-stripped) path, or null if invalid
     */
    public static function sanitizeRelativePath(string $path): ?string
    {
        if ($path === '') {
            return null;
        }

        if (str_contains($path, "\0")) {
            return null;
        }

        if (str_contains($path, '\\')) {
            return null;
        }

        // Normalize a leading slash away; the value is always relative to
        // the WebSpace root as far as this panel is concerned.
        $normalized = ltrim($path, '/');

        if ($normalized === '') {
            // Path was just "/" (or a run of slashes) - valid, means root.
            return '';
        }

        foreach (explode('/', $normalized) as $segment) {
            if ($segment === '..') {
                return null;
            }
        }

        return $normalized;
    }

    /**
     * Validate a path and return an ApiResponse error Response on failure,
     * or null if the path is valid. Convenience wrapper for controllers
     * that want a one-line guard clause.
     */
    public static function reject(string $path, string $fieldName = 'path'): ?\Symfony\Component\HttpFoundation\Response
    {
        if (self::sanitizeRelativePath($path) === null) {
            return ApiResponse::error(
                "Invalid {$fieldName}: must not contain '..', backslashes, or NUL bytes",
                'INVALID_PATH',
                400,
            );
        }

        return null;
    }

    /**
     * Validate a whole array of WebSpace-relative paths (e.g. bulk
     * copy/delete/compress operations). Returns the first offending path,
     * or null if all paths are valid.
     *
     * @param string[] $paths
     */
    public static function firstInvalid(array $paths): ?string
    {
        foreach ($paths as $path) {
            if (self::sanitizeRelativePath((string) $path) === null) {
                return $path;
            }
        }

        return null;
    }

    /**
     * Validate a filename component only (no directory separators at
     * all allowed) - used for uploaded-file original names and
     * newly-created directory/symlink names, where a path separator of
     * any kind is never legitimate input.
     */
    public static function isSafeFilename(string $name): bool
    {
        if ($name === '' || $name === '.' || $name === '..') {
            return false;
        }

        if (str_contains($name, "\0") || str_contains($name, '/') || str_contains($name, '\\')) {
            return false;
        }

        return true;
    }
}
