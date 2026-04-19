/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

/** Lowercase extensions that must not open in Monaco / text IDE (binaries, archives, common media). */
const BINARY_LIKE_EXTENSIONS = new Set([
    '7z',
    'aac',
    'avi',
    'bin',
    'bmp',
    'bz2',
    'class',
    'db',
    'dll',
    'dmg',
    'dylib',
    'ear',
    'exe',
    'flac',
    'gif',
    'gz',
    'ico',
    'iso',
    'jar',
    'jpeg',
    'jpg',
    'lzma',
    'm4a',
    'm4v',
    'mca',
    'mkv',
    'mov',
    'mp3',
    'mp4',
    'nbt',
    'o',
    'ogg',
    'otf',
    'pak',
    'pdf',
    'png',
    'pptx',
    'pyc',
    'pyo',
    'rar',
    'so',
    'sqlite',
    'sqlite3',
    'swf',
    'tar',
    'tgz',
    'tif',
    'tiff',
    'ttf',
    'wasm',
    'wav',
    'webm',
    'webp',
    'woff',
    'woff2',
    'xlsx',
    'xz',
    'zip',
    'zst',
]);

/**
 * True when the file should not be opened in a browser text editor (Feather IDE / Monaco),
 * based on extension only.
 */
export function isBinaryLikeFileName(fileName: string): boolean {
    const lower = fileName.trim().toLowerCase();
    if (/\.(tar\.gz|tar\.bz2|tar\.xz)$/i.test(lower)) return true;
    const dot = lower.lastIndexOf('.');
    if (dot === -1 || dot === lower.length - 1) return false;
    const ext = lower.slice(dot + 1);
    return BINARY_LIKE_EXTENSIONS.has(ext);
}

/** Archives that the panel may offer to extract (zip-like and common bundles). */
export function isDecompressibleArchiveFileName(fileName: string): boolean {
    return /\.(zip|jar|war|ear|7z|tar|tar\.gz|tgz|rar)$/i.test(fileName.trim());
}
