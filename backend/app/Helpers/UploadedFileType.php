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

use Symfony\Component\HttpFoundation\File\UploadedFile;

/**
 * Extension and content type rules for files users upload into public/attachments.
 *
 * An upload is accepted only when its extension is listed and the type detected
 * from its content is one of the types listed for that extension.
 */
final class UploadedFileType
{
    /** Raster image types; the web server lets these display inline. */
    public const IMAGE_TYPES = [
        'jpg' => ['image/jpeg'],
        'jpeg' => ['image/jpeg'],
        'png' => ['image/png'],
        'gif' => ['image/gif'],
        'webp' => ['image/webp'],
    ];

    /** Types accepted as ticket attachments. */
    public const TICKET_ATTACHMENT_TYPES = self::IMAGE_TYPES + [
        'bmp' => ['image/bmp', 'image/x-ms-bmp'],
        'pdf' => ['application/pdf'],
        'doc' => ['application/msword'],
        'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        'txt' => ['text/plain'],
        'csv' => ['text/csv', 'text/plain'],
        'xls' => ['application/vnd.ms-excel'],
        'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        'zip' => ['application/zip'],
        'rar' => ['application/x-rar-compressed', 'application/x-rar', 'application/vnd.rar'],
        'tar' => ['application/x-tar'],
        'gz' => ['application/gzip', 'application/x-gzip'],
    ];

    /** Lower-case extension of a client file name with anything but [a-z0-9] removed. */
    public static function extensionOf(string $fileName): string
    {
        $ext = strtolower((string) pathinfo($fileName, PATHINFO_EXTENSION));

        return (string) preg_replace('/[^a-z0-9]/', '', $ext);
    }

    /** Content type detected from the file contents (fileinfo), falling back to Symfony's guess. */
    public static function detect(UploadedFile $file): ?string
    {
        $detected = null;
        $path = $file->getPathname();
        if (extension_loaded('fileinfo') && $path !== '' && is_file($path)) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo !== false) {
                $detected = finfo_file($finfo, $path) ?: null;
            }
        }
        if ($detected === null) {
            $detected = $file->getMimeType();
        }

        return $detected !== null && $detected !== '' ? strtolower($detected) : null;
    }

    /**
     * @param array<string, list<string>> $types extension => accepted content types
     */
    public static function matches(string $extension, ?string $detectedType, array $types): bool
    {
        if ($extension === '' || $detectedType === null || !isset($types[$extension])) {
            return false;
        }

        return in_array(strtolower($detectedType), $types[$extension], true);
    }

    /** Whether files with this extension are shown inline (raster images) rather than downloaded. */
    public static function isInlineImage(string $extension): bool
    {
        return isset(self::IMAGE_TYPES[strtolower($extension)]);
    }
}
