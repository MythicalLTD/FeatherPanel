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
 * Dropbox ("App folder" access): backups go to /FeatherPanel Backups inside the app's own folder.
 *
 * Wings uploads with an upload session the panel starts (upload_session/start), appending
 * with upload_session/append_v2 and committing with upload_session/finish. Dropbox has no
 * pre-authorized session URLs, so Wings gets a short-lived access token (never the refresh token).
 */
class DropboxProvider extends OAuthProvider
{
    public const API = 'https://api.dropboxapi.com/2';
    public const CONTENT = 'https://content.dropboxapi.com/2';
    public const ROOT = '/FeatherPanel Backups';

    /** 64 MiB: append_v2 takes up to 150 MiB; a multiple of 4 MiB keeps Dropbox's fast path. */
    public const CHUNK = 67108864;

    public function key(): string
    {
        return 'dropbox';
    }

    public function label(): string
    {
        return 'Dropbox';
    }

    public function openUpload(array $dest, array $server, array $backup, int $size): array
    {
        $path = $this->path($dest, $server, $backup);
        $this->deletePath($dest, $path);
        $res = $this->authed($dest, 'POST', self::CONTENT . '/files/upload_session/start', [
            'headers' => ['Content-Type' => 'application/octet-stream', 'Dropbox-API-Arg' => json_encode(['close' => false])],
            'body' => '',
        ]);
        $sessionId = (string) (ProviderHttp::json($res)['session_id'] ?? '');
        if ($res->getStatusCode() !== 200 || $sessionId === '') {
            throw $this->fail('Starting the Dropbox upload', $res);
        }

        return [
            'adapter' => 'resumable',
            'protocol' => 'dropbox-append',
            'session_url' => ProviderHttp::url(self::CONTENT . '/files/upload_session/append_v2'),
            'chunk_size' => self::CHUNK,
            'total_size' => $size,
            // Dropbox tokens last 4 hours; hand out one with at least 3 left (a fresh one if needed).
            'headers' => ['Authorization' => 'Bearer ' . $this->accessToken($dest, 10800)],
            'complete_url' => null,
            'session_id' => $sessionId,
            'finish' => [
                'url' => ProviderHttp::url(self::CONTENT . '/files/upload_session/finish'),
                'headers' => (object) [],
                'arg' => ['commit' => ['path' => $path, 'mode' => 'overwrite', 'autorename' => false, 'mute' => true]],
            ],
        ];
    }

    public function completeUpload(array $dest, array $server, array $backup, int $size, string $sha1): string
    {
        $path = $this->path($dest, $server, $backup);
        $meta = $this->metadata($dest, $path);
        if ($meta === null) {
            throw new StorageException('The uploaded file was not found on Dropbox', 'REMOTE_FILE_MISSING', 502);
        }
        // Dropbox exposes its own content_hash (not sha1): the size is compared here and
        // verifyContentHash() compares the hash when Wings reports it.
        if ((int) ($meta['size'] ?? -1) !== $size) {
            $this->deletePath($dest, $path);
            throw new StorageException('The file on Dropbox does not match what Wings uploaded', 'REMOTE_CHECKSUM_MISMATCH', 502);
        }

        return (string) $meta['id'];
    }

    /**
     * Compare Dropbox's content_hash of the committed file with the one Wings computed.
     * An empty $expected (older FeatherWings) keeps the size-only check.
     */
    public function verifyContentHash(array $dest, array $server, array $backup, string $expected): void
    {
        if ($expected === '') {
            return;
        }
        if (preg_match('/^[a-f0-9]{64}$/', $expected) !== 1) {
            throw new StorageException('Wings reported an invalid Dropbox content hash', 'REMOTE_CHECKSUM_MISMATCH', 502);
        }
        $path = $this->path($dest, $server, $backup);
        $meta = $this->metadata($dest, $path);
        $actual = strtolower((string) ($meta['content_hash'] ?? ''));
        if ($actual === '' || !hash_equals($actual, $expected)) {
            $this->deletePath($dest, $path);
            throw new StorageException('The file on Dropbox does not match what Wings uploaded', 'REMOTE_CHECKSUM_MISMATCH', 502);
        }
    }

    public function abortUpload(array $dest, array $server, array $backup): void
    {
        try {
            $this->deletePath($dest, $this->path($dest, $server, $backup));
        } catch (\Throwable) {
        }
    }

    public function restoreSource(array $dest, array $server, array $backup): array
    {
        // A temporary link is valid for 4 hours, needs no token and supports Range.
        return ['download_url' => $this->temporaryLink($dest, $server, $backup), 'headers' => []];
    }

    public function browserDownloadUrl(array $dest, array $server, array $backup, string $filename): ?string
    {
        return null;
    }

    public function openStream(array $dest, array $server, array $backup, ?string $range, ?string $ifRange): ResponseInterface
    {
        $headers = ['Dropbox-API-Arg' => json_encode(['path' => $this->ref($dest, $server, $backup)])];
        if ($range !== null && $range !== '') {
            $headers['Range'] = $range;
            if ($ifRange !== null && $ifRange !== '') {
                $headers['If-Range'] = $ifRange;
            }
        }

        return $this->authed($dest, 'POST', self::CONTENT . '/files/download', ['headers' => $headers, 'stream' => true, 'timeout' => 0]);
    }

    public function delete(array $dest, array $server, array $backup): void
    {
        $this->deletePath($dest, $this->ref($dest, $server, $backup));
    }

    public function test(array $dest): array
    {
        $account = $this->rpc($dest, '/users/get_current_account');
        if ($account->getStatusCode() !== 200) {
            throw $this->fail('Dropbox check', $account);
        }
        $usage = $this->rpc($dest, '/users/get_space_usage');
        if ($usage->getStatusCode() !== 200) {
            throw $this->fail('Reading Dropbox space usage', $usage);
        }
        $u = ProviderHttp::json($usage);

        return [
            'account' => (string) (ProviderHttp::json($account)['email'] ?? '') ?: null,
            'quota' => isset($u['used']) ? ['used' => (int) $u['used'], 'total' => isset($u['allocation']['allocated']) ? (int) $u['allocation']['allocated'] : null] : null,
        ];
    }

    public function disconnect(array $dest): void
    {
        try {
            $this->rpc($dest, '/auth/token/revoke');
        } catch (StorageException) {
            // Already revoked or unreachable: the tokens are dropped with the destination anyway.
        }
    }

    protected function authorizeEndpoint(): string
    {
        return 'https://www.dropbox.com/oauth2/authorize';
    }

    protected function tokenEndpoint(): string
    {
        return 'https://api.dropboxapi.com/oauth2/token';
    }

    protected function scopes(): array
    {
        return ['account_info.read', 'files.metadata.read', 'files.content.read', 'files.content.write'];
    }

    protected function authorizeExtras(): array
    {
        // offline: return a refresh token (access tokens are short-lived).
        return ['token_access_type' => 'offline'];
    }

    protected function initialize(string $accessToken): array
    {
        $auth = ['Authorization' => 'Bearer ' . $accessToken, 'Content-Type' => 'application/json'];
        $account = ProviderHttp::request('POST', self::API . '/users/get_current_account', ['headers' => $auth, 'body' => 'null']);
        if ($account->getStatusCode() !== 200) {
            throw $this->fail('Reading the Dropbox account', $account);
        }
        $folder = ProviderHttp::request('POST', self::API . '/files/create_folder_v2', ['headers' => $auth, 'body' => json_encode(['path' => self::ROOT, 'autorename' => false])]);
        // 409 path/conflict: the folder is already there (reconnect, or created earlier).
        if ($folder->getStatusCode() !== 200 && !($folder->getStatusCode() === 409 && str_contains((string) $folder->getBody(), 'conflict'))) {
            throw $this->fail('Creating the backup folder', $folder);
        }

        return ['account' => (string) (ProviderHttp::json($account)['email'] ?? ''), 'root' => self::ROOT];
    }

    private function rpc(array $dest, string $endpoint, mixed $arg = null): ResponseInterface
    {
        return $this->authed($dest, 'POST', self::API . $endpoint, ['headers' => ['Content-Type' => 'application/json'], 'body' => json_encode($arg)]);
    }

    private function path(array $dest, array $server, array $backup): string
    {
        $root = (string) (UserStorageDestination::config($dest)['root'] ?? self::ROOT);

        return rtrim($root, '/') . '/' . self::fileName($server, $backup);
    }

    /** The file id when known (survives renames), else the path. */
    private function ref(array $dest, array $server, array $backup): string
    {
        return !empty($backup['remote_ref']) ? (string) $backup['remote_ref'] : $this->path($dest, $server, $backup);
    }

    /** @return array<string, mixed>|null */
    private function metadata(array $dest, string $path): ?array
    {
        $res = $this->rpc($dest, '/files/get_metadata', ['path' => $path]);
        if ($res->getStatusCode() === 409 && str_contains((string) $res->getBody(), 'not_found')) {
            return null;
        }
        if ($res->getStatusCode() !== 200) {
            throw $this->fail('Reading the Dropbox file', $res);
        }

        return ProviderHttp::json($res);
    }

    private function temporaryLink(array $dest, array $server, array $backup): string
    {
        $res = $this->rpc($dest, '/files/get_temporary_link', ['path' => $this->ref($dest, $server, $backup)]);
        if ($res->getStatusCode() === 409 && str_contains((string) $res->getBody(), 'not_found')) {
            throw new StorageException('The backup file was not found on Dropbox', 'REMOTE_FILE_MISSING', 404);
        }
        $link = (string) (ProviderHttp::json($res)['link'] ?? '');
        if ($res->getStatusCode() !== 200 || $link === '') {
            throw $this->fail('Getting a Dropbox download link', $res);
        }

        return $link;
    }

    private function deletePath(array $dest, string $path): void
    {
        $res = $this->rpc($dest, '/files/delete_v2', ['path' => $path]);
        if ($res->getStatusCode() === 200 || ($res->getStatusCode() === 409 && str_contains((string) $res->getBody(), 'not_found'))) {
            return;
        }
        throw $this->fail('Deleting from Dropbox', $res);
    }
}
