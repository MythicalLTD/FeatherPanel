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

use GuzzleHttp\Client;
use GuzzleHttp\Psr7\Response;
use App\Chat\UserStorageDestination;
use App\Services\Storage\EndpointGuard;
use Psr\Http\Message\ResponseInterface;
use App\Services\Storage\StorageException;

/**
 * WebDAV server given by the user (Nextcloud, ownCloud, a NAS...), basic auth over HTTPS.
 * WebDAV has no standard partial upload, so chunks are staged on the panel disk and PUT
 * in one request when complete; the staging file is removed afterwards.
 */
class WebDavProvider extends RelayProvider
{
    /** Keep this much space free on the panel disk besides the staged backup. */
    private const DISK_MARGIN = 536870912;

    public function key(): string
    {
        return 'webdav';
    }

    public function label(): string
    {
        return 'WebDAV';
    }

    public function supported(): bool
    {
        return is_writable(self::dir());
    }

    public function normalizeConfig(array $input, array $existing = []): array
    {
        $url = trim((string) ($input['url'] ?? ($existing['url'] ?? '')));
        $config = [
            'url' => rtrim($url, '/'),
            'username' => mb_substr(trim((string) ($input['username'] ?? ($existing['username'] ?? ''))), 0, 128),
            'password' => (string) ($input['password'] ?? '') !== '' ? (string) $input['password'] : (string) ($existing['password'] ?? ''),
            'root' => self::cleanRoot(mb_substr(trim((string) ($input['root'] ?? ($existing['root'] ?? ''))), 0, 255)),
        ];
        EndpointGuard::assertShape($config['url']);
        EndpointGuard::pin([$config['url']]);
        if ($config['username'] === '' || $config['password'] === '') {
            throw new StorageException('Username and password are required', 'CREDENTIALS_REQUIRED', 422);
        }

        return $config;
    }

    public function locationChanged(array $a, array $b): bool
    {
        return ($a['url'] ?? '') !== ($b['url'] ?? '') || ($a['root'] ?? '') !== ($b['root'] ?? '');
    }

    public function publicConfig(array $config): array
    {
        return [
            'url' => $config['url'] ?? '',
            'username' => $config['username'] ?? '',
            'root' => $config['root'] ?? '',
            'has_password' => !empty($config['password']),
        ];
    }

    public function openUpload(array $dest, array $server, array $backup, int $size): array
    {
        $free = @disk_free_space(self::dir());
        if ($free !== false && $free < $size + self::DISK_MARGIN) {
            throw new StorageException('Not enough free disk space on the panel to relay this backup', 'RELAY_DISK_FULL', 507);
        }

        return parent::openUpload($dest, $server, $backup, $size);
    }

    public function openStream(array $dest, array $server, array $backup, ?string $range, ?string $ifRange): ResponseInterface
    {
        $headers = [];
        if ($range !== null) {
            $headers['Range'] = $range;
            if ($ifRange !== null && $ifRange !== '') {
                $headers['If-Range'] = $ifRange;
            }
        }
        $res = $this->request($dest, 'GET', $this->fileUrl($dest, $server, $backup), ['headers' => $headers, 'stream' => true, 'timeout' => 0, 'read_timeout' => 120]);
        if ($res->getStatusCode() === 404) {
            return new Response(404);
        }

        return $res;
    }

    public function test(array $dest): array
    {
        $config = UserStorageDestination::config($dest);
        $this->ensureCollections($dest);
        $probe = $this->dirUrl($config) . '/.featherpanel-test';
        $res = $this->request($dest, 'PUT', $probe, ['body' => 'ok']);
        $this->check($res, 'Writing a test file');
        $this->request($dest, 'DELETE', $probe);
        $quota = null;
        $res = $this->request($dest, 'PROPFIND', $this->dirUrl($config) . '/', [
            'headers' => ['Depth' => '0', 'Content-Type' => 'application/xml'],
            'body' => '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:quota-used-bytes/><d:quota-available-bytes/></d:prop></d:propfind>',
        ]);
        if ($res->getStatusCode() === 207) {
            $xml = (string) $res->getBody();
            $used = preg_match('#quota-used-bytes>(\d+)<#', $xml, $u) ? (int) $u[1] : null;
            $avail = preg_match('#quota-available-bytes>(\d+)<#', $xml, $a) ? (int) $a[1] : null;
            if ($used !== null && $avail !== null) {
                $quota = ['used' => $used, 'total' => $used + $avail];
            }
        }

        return ['account' => $config['username'] . ' @ ' . (string) parse_url((string) $config['url'], PHP_URL_HOST), 'quota' => $quota];
    }

    protected function beginUpload(array $dest, array $server, array $backup): void
    {
        $this->ensureCollections($dest);
        if (file_put_contents(self::stagingFile((string) $backup['uuid']), '') === false) {
            throw new StorageException('Could not stage the backup on the panel', 'RELAY_STAGING_FAILED', 500);
        }
    }

    protected function writeChunk(array $dest, array $server, array $backup, int $offset, string $data): void
    {
        $fh = fopen(self::stagingFile((string) $backup['uuid']), 'c');
        if ($fh === false || fseek($fh, $offset) !== 0 || fwrite($fh, $data) !== strlen($data)) {
            throw new StorageException('Could not stage the backup on the panel', 'RELAY_STAGING_FAILED', 500);
        }
        fclose($fh);
    }

    protected function finishUpload(array $dest, array $server, array $backup): void
    {
        $file = self::stagingFile((string) $backup['uuid']);
        $fh = fopen($file, 'rb');
        if ($fh === false) {
            throw new StorageException('The staged backup is missing', 'RELAY_STAGING_FAILED', 500);
        }
        try {
            $res = $this->request($dest, 'PUT', $this->fileUrl($dest, $server, $backup), [
                'body' => $fh,
                'headers' => ['Content-Length' => (string) filesize($file), 'Content-Type' => 'application/gzip'],
                'timeout' => 0,
            ]);
            $this->check($res, 'Uploading the backup');
        } finally {
            if (is_resource($fh)) {
                fclose($fh);
            }
            @unlink($file);
        }
    }

    protected function remoteSize(array $dest, array $server, array $backup): ?int
    {
        $res = $this->request($dest, 'HEAD', $this->fileUrl($dest, $server, $backup));
        if ($res->getStatusCode() !== 200) {
            return null;
        }
        $len = $res->getHeaderLine('Content-Length');

        return is_numeric($len) ? (int) $len : null;
    }

    protected function deleteRemote(array $dest, array $server, array $backup): void
    {
        $url = !empty($backup['remote_ref']) ? (string) $backup['remote_ref'] : $this->fileUrl($dest, $server, $backup);
        $res = $this->request($dest, 'DELETE', $url);
        if ($res->getStatusCode() !== 404) {
            $this->check($res, 'Deleting the backup');
        }
    }

    protected function remotePath(array $dest, array $server, array $backup): string
    {
        return $this->fileUrl($dest, $server, $backup);
    }

    private function fileUrl(array $dest, array $server, array $backup): string
    {
        return $this->dirUrl(UserStorageDestination::config($dest)) . '/' . rawurlencode(OAuthProvider::fileName($server, $backup));
    }

    private function dirUrl(array $config): string
    {
        $url = (string) $config['url'];
        foreach (array_filter(explode('/', (string) ($config['root'] ?? ''))) as $seg) {
            $url .= '/' . rawurlencode($seg);
        }

        return $url;
    }

    private function ensureCollections(array $dest): void
    {
        $config = UserStorageDestination::config($dest);
        $url = (string) $config['url'];
        foreach (array_filter(explode('/', (string) ($config['root'] ?? ''))) as $seg) {
            $url .= '/' . rawurlencode($seg);
            $res = $this->request($dest, 'MKCOL', $url . '/');
            // 201 created, 405 already exists.
            if (!in_array($res->getStatusCode(), [201, 405], true)) {
                $this->check($res, 'Creating the folder');
            }
        }
    }

    private function check(ResponseInterface $res, string $what): void
    {
        $code = $res->getStatusCode();
        if ($code >= 200 && $code < 300) {
            return;
        }
        if ($code === 401 || $code === 403) {
            throw new StorageException('The WebDAV server rejected the username or password', 'WEBDAV_AUTH_FAILED', 409);
        }
        if ($code === 507) {
            throw new StorageException('The WebDAV server is out of space', 'PROVIDER_QUOTA_EXCEEDED', 507);
        }
        throw new StorageException($what . ' failed on the WebDAV server (HTTP ' . $code . ')', 'PROVIDER_ERROR', 502);
    }

    private function request(array $dest, string $method, string $url, array $options = []): ResponseInterface
    {
        $config = UserStorageDestination::config($dest);
        // Same address checks as S3 endpoints, pinned for this request (no redirects).
        $client = new Client(['http_errors' => false, 'allow_redirects' => false, 'connect_timeout' => 10, 'timeout' => 120] + EndpointGuard::pin([(string) $config['url']]));
        try {
            return $client->request($method, $url, $options + ['auth' => [(string) $config['username'], (string) $config['password']]]);
        } catch (\Throwable $e) {
            throw new StorageException('Could not reach the WebDAV server: ' . $e->getMessage(), 'PROVIDER_UNREACHABLE', 502);
        }
    }
}
