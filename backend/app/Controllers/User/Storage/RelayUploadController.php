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
use App\Services\Storage\Providers\RelayProvider;

/**
 * Receives backup chunks from Wings for SFTP / WebDAV storage (signed URL from openUpload) and
 * writes them on. Speaks the same Content-Range protocol Wings uses for Google Drive / OneDrive.
 */
class RelayUploadController
{
    public function receive(Request $request, string $backupUuid): Response
    {
        if (!BackupStreamSigner::verifyRelay($backupUuid, $request->query->get('expires'), $request->query->get('signature'))) {
            return ApiResponse::error('This upload link is invalid or expired', 'UPLOAD_LINK_INVALID', 403);
        }
        $backup = Backup::getBackupByUuid($backupUuid);
        if (!$backup || !empty($backup['deleted_at']) || !empty($backup['is_successful']) || !BackupStorageService::isResumable($backup)) {
            return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
        }
        $server = Server::getServerById((int) $backup['server_id']);
        if (!$server) {
            return ApiResponse::error('Backup not found', 'BACKUP_NOT_FOUND', 404);
        }
        try {
            [$provider, $destination] = BackupStorageService::providerFor($backup);
            if (!$provider instanceof RelayProvider || !$provider->available()) {
                return ApiResponse::error('SFTP and WebDAV storage is turned off on this panel', 'RELAY_DISABLED', 403);
            }
            $length = (int) $request->headers->get('Content-Length', '0');
            if ($length > RelayProvider::CHUNK) {
                return ApiResponse::error('Chunk too large', 'RELAY_BAD_RANGE', 413);
            }
            [$status, $headers] = $provider->receive($destination, $server, $backup, (string) $request->headers->get('Content-Range', ''), (string) $request->getContent());
        } catch (StorageException $e) {
            return ApiResponse::error($e->getMessage(), $e->errorCode(), $e->status());
        }

        return new Response('', $status, $headers);
    }
}
