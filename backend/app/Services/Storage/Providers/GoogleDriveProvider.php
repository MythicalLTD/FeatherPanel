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

use App\Chat\UserStorageDestination;
use Psr\Http\Message\ResponseInterface;
use App\Services\Storage\StorageException;

/**
 * Google Drive, with the drive.file scope: the panel only sees files it created itself.
 *
 * Uploads use a Drive resumable session (the session URL carries its own authorization, so
 * Wings gets no token for uploads). Each file is tagged with appProperties.fp_backup = backup uuid,
 * which is how the panel finds and verifies it (size and sha1Checksum) when Wings reports success.
 */
class GoogleDriveProvider extends OAuthProvider
{
    public const API = 'https://www.googleapis.com/drive/v3';
    public const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
    public const FOLDER_NAME = 'FeatherPanel Backups';

    /** 16 MiB: a multiple of 256 KiB as Drive requires. */
    public const CHUNK = 16777216;

    public function key(): string
    {
        return 'gdrive';
    }

    public function label(): string
    {
        return 'Google Drive';
    }

    public function openUpload(array $dest, array $server, array $backup, int $size): array
    {
        // A Wings retry starts over: drop a file left by an earlier attempt.
        $this->deleteByTag($dest, (string) $backup['uuid']);
        $config = UserStorageDestination::config($dest);
        $meta = [
            'name' => self::fileName($server, $backup),
            'mimeType' => 'application/gzip',
            'appProperties' => ['fp_backup' => (string) $backup['uuid'], 'fp_server' => (string) $server['uuid']],
        ];
        if (!empty($config['folder_id'])) {
            $meta['parents'] = [(string) $config['folder_id']];
        }
        $res = $this->authed($dest, 'POST', self::UPLOAD . '?uploadType=resumable&fields=id,size,sha1Checksum', [
            'headers' => [
                'Content-Type' => 'application/json; charset=UTF-8',
                'X-Upload-Content-Type' => 'application/gzip',
                'X-Upload-Content-Length' => (string) $size,
            ],
            'body' => json_encode($meta),
        ]);
        $session = $res->getHeaderLine('Location');
        if ($res->getStatusCode() !== 200 || $session === '') {
            throw $this->fail('Starting the Google Drive upload', $res);
        }

        return [
            'adapter' => 'resumable',
            'protocol' => 'content-range',
            'session_url' => $session,
            'chunk_size' => self::CHUNK,
            'total_size' => $size,
            'headers' => (object) [],
            'complete_url' => null,
            'session_id' => null,
            'finish' => null,
        ];
    }

    public function completeUpload(array $dest, array $server, array $backup, int $size, string $sha1): string
    {
        $file = $this->findByTag($dest, (string) $backup['uuid']);
        if ($file === null) {
            throw new StorageException('The uploaded file was not found on Google Drive', 'REMOTE_FILE_MISSING', 502);
        }
        $remoteSize = (int) ($file['size'] ?? -1);
        $remoteSha = strtolower((string) ($file['sha1Checksum'] ?? ''));
        if ($remoteSize !== $size || ($remoteSha !== '' && $sha1 !== '' && !hash_equals($remoteSha, strtolower($sha1)))) {
            $this->deleteId($dest, (string) $file['id']);
            throw new StorageException('The file on Google Drive does not match what Wings uploaded', 'REMOTE_CHECKSUM_MISMATCH', 502);
        }

        return (string) $file['id'];
    }

    public function abortUpload(array $dest, array $server, array $backup): void
    {
        try {
            $this->deleteByTag($dest, (string) $backup['uuid']);
        } catch (\Throwable) {
        }
    }

    public function restoreSource(array $dest, array $server, array $backup): array
    {
        return [
            'download_url' => ProviderHttp::url(self::API . '/files/' . rawurlencode($this->fileId($dest, $backup)) . '?alt=media'),
            // Google access tokens last an hour; ask for one that still has most of it.
            'headers' => ['Authorization' => 'Bearer ' . $this->accessToken($dest, 3000)],
        ];
    }

    public function browserDownloadUrl(array $dest, array $server, array $backup, string $filename): ?string
    {
        return null;
    }

    public function openStream(array $dest, array $server, array $backup, ?string $range, ?string $ifRange): ResponseInterface
    {
        $headers = [];
        if ($range !== null && $range !== '') {
            $headers['Range'] = $range;
            if ($ifRange !== null && $ifRange !== '') {
                $headers['If-Range'] = $ifRange;
            }
        }

        return $this->authed($dest, 'GET', self::API . '/files/' . rawurlencode($this->fileId($dest, $backup)) . '?alt=media', ['headers' => $headers, 'stream' => true, 'timeout' => 0]);
    }

    public function delete(array $dest, array $server, array $backup): void
    {
        if (!empty($backup['remote_ref'])) {
            $this->deleteId($dest, (string) $backup['remote_ref']);

            return;
        }
        $this->deleteByTag($dest, (string) $backup['uuid']);
    }

    public function test(array $dest): array
    {
        $res = $this->authed($dest, 'GET', self::API . '/about?fields=' . rawurlencode('user(emailAddress),storageQuota(limit,usage)'));
        if ($res->getStatusCode() !== 200) {
            throw $this->fail('Google Drive check', $res);
        }
        $data = ProviderHttp::json($res);
        $q = $data['storageQuota'] ?? [];

        return [
            'account' => isset($data['user']['emailAddress']) ? (string) $data['user']['emailAddress'] : null,
            'quota' => isset($q['usage']) ? ['used' => (int) $q['usage'], 'total' => isset($q['limit']) ? (int) $q['limit'] : null] : null,
        ];
    }

    public function disconnect(array $dest): void
    {
        $config = UserStorageDestination::config($dest);
        $token = (string) ($config['refresh_token'] ?? '');
        if ($token === '') {
            return;
        }
        ProviderHttp::request('POST', 'https://oauth2.googleapis.com/revoke', ['form_params' => ['token' => $token]]);
    }

    protected function authorizeEndpoint(): string
    {
        return 'https://accounts.google.com/o/oauth2/v2/auth';
    }

    protected function tokenEndpoint(): string
    {
        return 'https://oauth2.googleapis.com/token';
    }

    protected function scopes(): array
    {
        return ['https://www.googleapis.com/auth/drive.file'];
    }

    protected function authorizeExtras(): array
    {
        // offline + consent: Google only returns a refresh token on a fresh consent.
        return ['access_type' => 'offline', 'prompt' => 'consent'];
    }

    protected function initialize(string $accessToken): array
    {
        $auth = ['Authorization' => 'Bearer ' . $accessToken];
        $about = ProviderHttp::request('GET', self::API . '/about?fields=' . rawurlencode('user(emailAddress,displayName)'), ['headers' => $auth]);
        if ($about->getStatusCode() !== 200) {
            throw $this->fail('Reading the Google account', $about);
        }
        $folder = ProviderHttp::request('POST', self::API . '/files?fields=id', [
            'headers' => $auth,
            'json' => ['name' => self::FOLDER_NAME, 'mimeType' => 'application/vnd.google-apps.folder', 'appProperties' => ['fp_folder' => '1']],
        ]);
        $folderId = (string) (ProviderHttp::json($folder)['id'] ?? '');
        if ($folder->getStatusCode() !== 200 || $folderId === '') {
            throw $this->fail('Creating the backup folder', $folder);
        }

        return ['account' => (string) (ProviderHttp::json($about)['user']['emailAddress'] ?? ''), 'folder_id' => $folderId];
    }

    private function fileId(array $dest, array $backup): string
    {
        if (!empty($backup['remote_ref'])) {
            return (string) $backup['remote_ref'];
        }
        $file = $this->findByTag($dest, (string) $backup['uuid']);
        if ($file === null) {
            throw new StorageException('The backup file was not found on Google Drive', 'REMOTE_FILE_MISSING', 404);
        }

        return (string) $file['id'];
    }

    /** @return array<string, mixed>|null */
    private function findByTag(array $dest, string $backupUuid): ?array
    {
        if (!preg_match('/^[a-f0-9-]{36}$/i', $backupUuid)) {
            return null;
        }
        $q = "appProperties has { key='fp_backup' and value='" . $backupUuid . "' } and trashed = false";
        $res = $this->authed($dest, 'GET', self::API . '/files?' . http_build_query([
            'q' => $q,
            'spaces' => 'drive',
            'fields' => 'files(id,size,sha1Checksum)',
            'pageSize' => 10,
        ], '', '&', PHP_QUERY_RFC3986));
        if ($res->getStatusCode() !== 200) {
            throw $this->fail('Searching Google Drive', $res);
        }
        $files = ProviderHttp::json($res)['files'] ?? [];

        return is_array($files) && isset($files[0]['id']) ? $files[0] : null;
    }

    private function deleteByTag(array $dest, string $backupUuid): void
    {
        $file = $this->findByTag($dest, $backupUuid);
        if ($file !== null) {
            $this->deleteId($dest, (string) $file['id']);
        }
    }

    private function deleteId(array $dest, string $id): void
    {
        $res = $this->authed($dest, 'DELETE', self::API . '/files/' . rawurlencode($id));
        if (!in_array($res->getStatusCode(), [200, 204, 404], true)) {
            throw $this->fail('Deleting from Google Drive', $res);
        }
    }
}
