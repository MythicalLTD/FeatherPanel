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

use Psr\Http\Message\ResponseInterface;

/**
 * A bring-your-own backup storage that FeatherWings reaches with the "resumable" backup adapter.
 *
 * $dest is a featherpanel_user_storage_destinations row, $server a server row, $backup a
 * featherpanel_server_backups row. Methods throw StorageException with a stable error code.
 */
interface StorageProviderInterface
{
    public function key(): string;

    public function label(): string;

    /** Connected through an OAuth consent screen instead of a credentials form. */
    public function isOAuth(): bool;

    /** The admin side is ready (client credentials set, required PHP features present). */
    public function available(): bool;

    /**
     * Start an upload session for a backup of $size bytes and return the upload-info payload for Wings:
     * {adapter: "resumable", protocol, session_url, chunk_size, total_size, headers?, session_id?, finish?}.
     *
     * @return array<string, mixed>
     */
    public function openUpload(array $dest, array $server, array $backup, int $size): array;

    /**
     * Wings reported success: check the stored file (size, checksum when the provider exposes one)
     * and return the provider reference saved as the backup's remote_ref.
     */
    public function completeUpload(array $dest, array $server, array $backup, int $size, string $sha1): string;

    /** Wings reported failure: drop whatever partial upload state the provider keeps. Best effort. */
    public function abortUpload(array $dest, array $server, array $backup): void;

    /**
     * Where Wings downloads the archive for a restore.
     *
     * @return array{download_url: string, headers: array<string, string>}
     */
    public function restoreSource(array $dest, array $server, array $backup): array;

    /** A direct browser download link, or null when the panel must stream the file (see openStream). */
    public function browserDownloadUrl(array $dest, array $server, array $backup, string $filename): ?string;

    /** Raw provider response for the archive, honouring an optional Range / If-Range request. */
    public function openStream(array $dest, array $server, array $backup, ?string $range, ?string $ifRange): ResponseInterface;

    public function delete(array $dest, array $server, array $backup): void;

    /**
     * Check the connection. Returns account details for the UI.
     *
     * @return array{account: ?string, quota: ?array{used: int, total: ?int}}
     */
    public function test(array $dest): array;

    /** The user removes this storage: revoke the panel's access where the provider supports it. */
    public function disconnect(array $dest): void;
}
