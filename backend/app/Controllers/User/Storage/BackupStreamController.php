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

namespace App\Controllers\User\Storage;

use App\Chat\Backup;
use App\Chat\Server;
use App\Helpers\ApiResponse;
use App\Services\Storage\StorageException;
use App\Services\Storage\BackupStreamSigner;
use Symfony\Component\HttpFoundation\Request;
use App\Services\Storage\BackupStorageService;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Streams a backup from a cloud provider to the browser through the panel (signed, expiring link).
 * Range and If-Range are passed through, so downloads can be resumed.
 */
class BackupStreamController
{
    public function download(Request $request, string $backupUuid): Response
    {
        if (!BackupStreamSigner::verify($backupUuid, $request->query->get('expires'), $request->query->get('signature'))) {
            return ApiResponse::error('This download link is invalid or expired', 'DOWNLOAD_LINK_INVALID', 403);
        }
        $backup = Backup::getBackupByUuid($backupUuid);
        if (!$backup || !empty($backup['deleted_at']) || empty($backup['is_successful']) || !BackupStorageService::isResumable($backup)) {
            return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
        }
        $server = Server::getServerById((int) $backup['server_id']);
        if (!$server) {
            return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
        }
        try {
            [$provider, $destination] = BackupStorageService::providerFor($backup);
            $upstream = $provider->openStream($destination, $server, $backup, $request->headers->get('Range'), $request->headers->get('If-Range'));
        } catch (StorageException $e) {
            return ApiResponse::error($e->getMessage(), $e->errorCode(), $e->status());
        }
        $status = $upstream->getStatusCode();
        if (!in_array($status, [200, 206, 416], true)) {
            return ApiResponse::error('The storage provider refused the download (HTTP ' . $status . ')', 'PROVIDER_DOWNLOAD_FAILED', 502);
        }
        $headers = [
            'Content-Type' => 'application/gzip',
            'Content-Disposition' => 'attachment; filename="' . BackupStorageService::downloadName($backup) . '"',
            'Accept-Ranges' => 'bytes',
            'Cache-Control' => 'private, no-store',
            'X-Accel-Buffering' => 'no',
        ];
        foreach (['Content-Length', 'Content-Range', 'ETag', 'Last-Modified'] as $h) {
            if ($upstream->hasHeader($h)) {
                $headers[$h] = $upstream->getHeaderLine($h);
            }
        }
        $body = $upstream->getBody();

        return new StreamedResponse(static function () use ($body): void {
            while (!$body->eof()) {
                echo $body->read(1048576);
                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
                if (connection_aborted()) {
                    break;
                }
            }
            $body->close();
        }, $status, $headers);
    }
}
