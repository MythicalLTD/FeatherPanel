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
use App\Services\Storage\StorageException;

/**
 * OneDrive (personal and work/school) through Microsoft Graph, limited to the app's own folder
 * (Files.ReadWrite.AppFolder): backups go to Apps/<app name>/ in the user's OneDrive.
 *
 * Uploads use a Graph upload session; its uploadUrl is pre-authorized, so Wings gets no token
 * and must not send an Authorization header to it. Downloads use the short-lived pre-authorized
 *
 * @microsoft.graph.downloadUrl.
 */
class OneDriveProvider extends OAuthProvider
{
    public const GRAPH = 'https://graph.microsoft.com/v1.0';
    public const LOGIN = 'https://login.microsoftonline.com/common/oauth2/v2.0';

    /** 10 MiB: Graph wants multiples of 320 KiB (and this is also a multiple of 256 KiB). */
    public const CHUNK = 10485760;

    public function key(): string
    {
        return 'onedrive';
    }

    public function label(): string
    {
        return 'OneDrive';
    }

    public function openUpload(array $dest, array $server, array $backup, int $size): array
    {
        $name = self::fileName($server, $backup);
        $this->deleteItem($dest, $this->itemByName($dest, $name)['id'] ?? null);
        $res = $this->authed($dest, 'POST', self::GRAPH . '/me/drive/special/approot:/' . rawurlencode($name) . ':/createUploadSession', [
            'json' => ['item' => ['@microsoft.graph.conflictBehavior' => 'replace', 'name' => $name]],
        ]);
        $url = (string) (ProviderHttp::json($res)['uploadUrl'] ?? '');
        if ($res->getStatusCode() !== 200 || $url === '') {
            throw $this->fail('Starting the OneDrive upload', $res);
        }

        return [
            'adapter' => 'resumable',
            'protocol' => 'content-range',
            'session_url' => $url,
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
        $item = $this->itemByName($dest, self::fileName($server, $backup));
        if ($item === null) {
            throw new StorageException('The uploaded file was not found on OneDrive', 'REMOTE_FILE_MISSING', 502);
        }
        // Personal OneDrive reports sha1Hash; work/school accounts only have quickXorHash (size is checked then).
        $remoteSha = strtolower((string) ($item['file']['hashes']['sha1Hash'] ?? ''));
        if ((int) ($item['size'] ?? -1) !== $size || ($remoteSha !== '' && $sha1 !== '' && !hash_equals($remoteSha, strtolower($sha1)))) {
            $this->deleteItem($dest, (string) $item['id']);
            throw new StorageException('The file on OneDrive does not match what Wings uploaded', 'REMOTE_CHECKSUM_MISMATCH', 502);
        }

        return (string) $item['id'];
    }

    public function abortUpload(array $dest, array $server, array $backup): void
    {
        try {
            $this->deleteItem($dest, $this->itemByName($dest, self::fileName($server, $backup))['id'] ?? null);
        } catch (\Throwable) {
        }
    }

    public function restoreSource(array $dest, array $server, array $backup): array
    {
        return ['download_url' => $this->downloadUrl($dest, $server, $backup), 'headers' => []];
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

        // Pre-authorized URL: no Authorization header.
        return ProviderHttp::request('GET', $this->downloadUrl($dest, $server, $backup), ['headers' => $headers, 'stream' => true, 'timeout' => 0]);
    }

    public function delete(array $dest, array $server, array $backup): void
    {
        $id = !empty($backup['remote_ref']) ? (string) $backup['remote_ref'] : ($this->itemByName($dest, self::fileName($server, $backup))['id'] ?? null);
        $this->deleteItem($dest, $id);
    }

    public function test(array $dest): array
    {
        $me = $this->authed($dest, 'GET', self::GRAPH . '/me?$select=mail,userPrincipalName');
        if ($me->getStatusCode() !== 200) {
            throw $this->fail('OneDrive check', $me);
        }
        $drive = $this->authed($dest, 'GET', self::GRAPH . '/me/drive?$select=quota');
        if ($drive->getStatusCode() !== 200) {
            throw $this->fail('Reading the OneDrive quota', $drive);
        }
        $q = ProviderHttp::json($drive)['quota'] ?? [];

        return [
            'account' => self::account(ProviderHttp::json($me)),
            'quota' => isset($q['used']) ? ['used' => (int) $q['used'], 'total' => isset($q['total']) ? (int) $q['total'] : null] : null,
        ];
    }

    public function disconnect(array $dest): void
    {
        // Microsoft has no endpoint to revoke a single refresh token; it is deleted with the destination
        // and the user can remove the app at https://account.live.com/consent/Manage (or myapps.microsoft.com).
    }

    protected function authorizeEndpoint(): string
    {
        return self::LOGIN . '/authorize';
    }

    protected function tokenEndpoint(): string
    {
        return self::LOGIN . '/token';
    }

    protected function scopes(): array
    {
        return ['offline_access', 'User.Read', 'Files.ReadWrite.AppFolder'];
    }

    protected function authorizeExtras(): array
    {
        return ['response_mode' => 'query', 'prompt' => 'select_account'];
    }

    protected function initialize(string $accessToken): array
    {
        $auth = ['Authorization' => 'Bearer ' . $accessToken];
        $me = ProviderHttp::request('GET', self::GRAPH . '/me?$select=mail,userPrincipalName', ['headers' => $auth]);
        if ($me->getStatusCode() !== 200) {
            throw $this->fail('Reading the Microsoft account', $me);
        }
        // First access to the app folder creates it.
        $root = ProviderHttp::request('GET', self::GRAPH . '/me/drive/special/approot?$select=id', ['headers' => $auth]);
        $rootId = (string) (ProviderHttp::json($root)['id'] ?? '');
        if ($root->getStatusCode() !== 200 || $rootId === '') {
            throw $this->fail('Opening the OneDrive app folder', $root);
        }

        return ['account' => (string) self::account(ProviderHttp::json($me)), 'folder_id' => $rootId];
    }

    private static function account(array $me): ?string
    {
        $a = (string) ($me['mail'] ?? '') ?: (string) ($me['userPrincipalName'] ?? '');

        return $a !== '' ? $a : null;
    }

    /** @return array<string, mixed>|null */
    private function itemByName(array $dest, string $name): ?array
    {
        $res = $this->authed($dest, 'GET', self::GRAPH . '/me/drive/special/approot:/' . rawurlencode($name) . '?$select=id,size,file');
        if ($res->getStatusCode() === 404) {
            return null;
        }
        if ($res->getStatusCode() !== 200) {
            throw $this->fail('Reading the OneDrive file', $res);
        }

        return ProviderHttp::json($res);
    }

    private function downloadUrl(array $dest, array $server, array $backup): string
    {
        $id = !empty($backup['remote_ref']) ? (string) $backup['remote_ref'] : ($this->itemByName($dest, self::fileName($server, $backup))['id'] ?? '');
        if ($id === '') {
            throw new StorageException('The backup file was not found on OneDrive', 'REMOTE_FILE_MISSING', 404);
        }
        $res = $this->authed($dest, 'GET', self::GRAPH . '/me/drive/items/' . rawurlencode($id) . '?$select=id,@microsoft.graph.downloadUrl');
        if ($res->getStatusCode() === 404) {
            throw new StorageException('The backup file was not found on OneDrive', 'REMOTE_FILE_MISSING', 404);
        }
        $url = (string) (ProviderHttp::json($res)['@microsoft.graph.downloadUrl'] ?? '');
        if ($res->getStatusCode() !== 200 || $url === '') {
            throw $this->fail('Getting a OneDrive download link', $res);
        }

        return $url;
    }

    private function deleteItem(array $dest, ?string $id): void
    {
        if ($id === null || $id === '') {
            return;
        }
        $res = $this->authed($dest, 'DELETE', self::GRAPH . '/me/drive/items/' . rawurlencode($id));
        if (!in_array($res->getStatusCode(), [200, 204, 404], true)) {
            throw $this->fail('Deleting from OneDrive', $res);
        }
    }
}
