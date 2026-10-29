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

use phpseclib3\Net\SFTP;
use GuzzleHttp\Psr7\Response;
use GuzzleHttp\Psr7\PumpStream;
use App\Chat\UserStorageDestination;
use phpseclib3\Crypt\PublicKeyLoader;
use App\Services\Storage\EndpointGuard;
use Psr\Http\Message\ResponseInterface;
use App\Services\Storage\StorageException;

/**
 * SFTP server given by the user (password or private key). Chunks are written straight to
 * "<file>.part" at their offset and renamed when complete, so the panel stores nothing.
 * The server host key is pinned on the first successful connection (trust on first use).
 */
class SftpProvider extends RelayProvider
{
    /** @var array<int, SFTP> one connection per destination per request */
    private static array $connections = [];

    public function key(): string
    {
        return 'sftp';
    }

    public function label(): string
    {
        return 'SFTP';
    }

    public function supported(): bool
    {
        return class_exists(SFTP::class);
    }

    public function normalizeConfig(array $input, array $existing = []): array
    {
        $str = static fn (string $k, int $max): string => mb_substr(trim((string) ($input[$k] ?? ($existing[$k] ?? ''))), 0, $max);
        $config = [
            'host' => strtolower($str('host', 255)),
            'port' => (int) ($input['port'] ?? ($existing['port'] ?? 22)),
            'username' => $str('username', 128),
            'root' => self::cleanRoot($str('root', 255)),
            'password' => (string) ($input['password'] ?? '') !== '' ? (string) $input['password'] : (string) ($existing['password'] ?? ''),
            'private_key' => (string) ($input['private_key'] ?? '') !== '' ? (string) $input['private_key'] : (string) ($existing['private_key'] ?? ''),
            'host_key' => (string) ($existing['host_key'] ?? ''),
        ];
        if ($config['port'] < 1 || $config['port'] > 65535) {
            throw new StorageException('Port must be between 1 and 65535', 'PORT_INVALID', 422);
        }
        if ($config['username'] === '') {
            throw new StorageException('Username is required', 'CREDENTIALS_REQUIRED', 422);
        }
        if ($config['password'] === '' && $config['private_key'] === '') {
            throw new StorageException('A password or a private key is required', 'CREDENTIALS_REQUIRED', 422);
        }
        if ($config['private_key'] !== '') {
            try {
                PublicKeyLoader::load($config['private_key'], $config['password'] !== '' ? $config['password'] : false);
            } catch (\Throwable) {
                throw new StorageException('The private key could not be read (OpenSSH or PEM format, with its passphrase in the password field)', 'PRIVATE_KEY_INVALID', 422);
            }
        }
        EndpointGuard::resolveHost($config['host']);
        if (!empty($input['reset_host_key']) || $existing !== [] && ((($existing['host'] ?? '') !== $config['host']) || (int) ($existing['port'] ?? 22) !== $config['port'])) {
            // Another server: its key is learned again on the next connection.
            $config['host_key'] = '';
        }

        return $config;
    }

    public function locationChanged(array $a, array $b): bool
    {
        return ($a['host'] ?? '') !== ($b['host'] ?? '') || (int) ($a['port'] ?? 22) !== (int) ($b['port'] ?? 22) || ($a['root'] ?? '') !== ($b['root'] ?? '');
    }

    public function publicConfig(array $config): array
    {
        return [
            'host' => $config['host'] ?? '',
            'port' => (int) ($config['port'] ?? 22),
            'username' => $config['username'] ?? '',
            'root' => $config['root'] ?? '',
            'has_password' => !empty($config['password']),
            'has_private_key' => !empty($config['private_key']),
            'host_key' => $config['host_key'] ?? '',
        ];
    }

    public function openStream(array $dest, array $server, array $backup, ?string $range, ?string $ifRange): ResponseInterface
    {
        $sftp = $this->connect($dest);
        $path = $this->remotePath($dest, $server, $backup);
        $stat = $sftp->stat($path);
        if (!is_array($stat) || !isset($stat['size'])) {
            return new Response(404);
        }
        $size = (int) $stat['size'];
        $etag = '"' . $size . '-' . (int) ($stat['mtime'] ?? 0) . '"';
        $start = 0;
        $end = $size - 1;
        $status = 200;
        if ($range !== null && preg_match('/^bytes=(\d+)-(\d*)$/', $range, $m) && ($ifRange === null || $ifRange === '' || $ifRange === $etag)) {
            $start = (int) $m[1];
            $end = $m[2] !== '' ? min((int) $m[2], $size - 1) : $size - 1;
            if ($start >= $size || $end < $start) {
                return new Response(416, ['Content-Range' => 'bytes */' . $size]);
            }
            $status = 206;
        }
        $pos = $start;
        $stream = new PumpStream(static function (int $length) use ($sftp, $path, &$pos, $end) {
            if ($pos > $end) {
                return false;
            }
            $len = min(1048576, $end - $pos + 1);
            $data = $sftp->get($path, false, $pos, $len);
            if (!is_string($data) || $data === '') {
                return false;
            }
            $pos += strlen($data);

            return $data;
        }, ['size' => $end - $start + 1]);
        $headers = ['Content-Length' => (string) ($end - $start + 1), 'ETag' => $etag, 'Accept-Ranges' => 'bytes'];
        if ($status === 206) {
            $headers['Content-Range'] = 'bytes ' . $start . '-' . $end . '/' . $size;
        }

        return new Response($status, $headers, $stream);
    }

    public function test(array $dest): array
    {
        $sftp = $this->connect($dest);
        $config = UserStorageDestination::config($dest);
        $dir = $this->rootDir($config);
        $this->mkdirs($sftp, $dir);
        $probe = $dir . '/.featherpanel-test';
        if (!$sftp->put($probe, 'ok')) {
            throw new StorageException('Could not write to ' . $dir . ' on the SFTP server', 'SFTP_WRITE_FAILED', 502);
        }
        $sftp->delete($probe);

        return ['account' => $config['username'] . '@' . $config['host'], 'quota' => null];
    }

    protected function beginUpload(array $dest, array $server, array $backup): void
    {
        $sftp = $this->connect($dest);
        $this->mkdirs($sftp, $this->rootDir(UserStorageDestination::config($dest)));
        $path = $this->remotePath($dest, $server, $backup);
        $sftp->delete($path);
        if (!$sftp->put($path . '.part', '')) {
            throw new StorageException('Could not create the backup file on the SFTP server', 'SFTP_WRITE_FAILED', 502);
        }
    }

    protected function writeChunk(array $dest, array $server, array $backup, int $offset, string $data): void
    {
        $sftp = $this->connect($dest);
        if (!$sftp->put($this->remotePath($dest, $server, $backup) . '.part', $data, SFTP::SOURCE_STRING, $offset)) {
            throw new StorageException('Writing to the SFTP server failed', 'SFTP_WRITE_FAILED', 502);
        }
    }

    protected function finishUpload(array $dest, array $server, array $backup): void
    {
        $sftp = $this->connect($dest);
        $path = $this->remotePath($dest, $server, $backup);
        $sftp->delete($path);
        if (!$sftp->rename($path . '.part', $path)) {
            throw new StorageException('Could not finish the file on the SFTP server', 'SFTP_WRITE_FAILED', 502);
        }
    }

    protected function remoteSize(array $dest, array $server, array $backup): ?int
    {
        $stat = $this->connect($dest)->stat($this->remotePath($dest, $server, $backup));

        return is_array($stat) && isset($stat['size']) ? (int) $stat['size'] : null;
    }

    protected function deleteRemote(array $dest, array $server, array $backup): void
    {
        $sftp = $this->connect($dest);
        $path = !empty($backup['remote_ref']) ? (string) $backup['remote_ref'] : $this->remotePath($dest, $server, $backup);
        $sftp->delete($path);
        $sftp->delete($path . '.part');
    }

    protected function remotePath(array $dest, array $server, array $backup): string
    {
        return $this->rootDir(UserStorageDestination::config($dest)) . '/' . OAuthProvider::fileName($server, $backup);
    }

    private function rootDir(array $config): string
    {
        $root = (string) ($config['root'] ?? '');

        return $root === '' ? '.' : $root;
    }

    private function mkdirs(SFTP $sftp, string $dir): void
    {
        if ($dir === '.' || $sftp->is_dir($dir)) {
            return;
        }
        if (!$sftp->mkdir($dir, -1, true) && !$sftp->is_dir($dir)) {
            throw new StorageException('Could not create ' . $dir . ' on the SFTP server', 'SFTP_WRITE_FAILED', 502);
        }
    }

    private function connect(array $dest): SFTP
    {
        $id = (int) $dest['id'];
        if (isset(self::$connections[$id]) && self::$connections[$id]->isConnected()) {
            return self::$connections[$id];
        }
        $config = UserStorageDestination::config($dest);
        $ips = EndpointGuard::resolveHost((string) $config['host']);
        try {
            // Connect to the checked address, not the name (no DNS rebinding between check and use).
            $sftp = new SFTP($ips[0], (int) ($config['port'] ?? 22), 15);
            $hostKey = $sftp->getServerPublicHostKey();
        } catch (\Throwable $e) {
            throw new StorageException('Could not reach the SFTP server: ' . $e->getMessage(), 'PROVIDER_UNREACHABLE', 502);
        }
        if (!is_string($hostKey) || $hostKey === '') {
            throw new StorageException('Could not reach the SFTP server', 'PROVIDER_UNREACHABLE', 502);
        }
        $fingerprint = 'SHA256:' . rtrim(base64_encode(hash('sha256', (string) base64_decode(explode(' ', $hostKey)[1] ?? '', true), true)), '=');
        if (!empty($config['host_key']) && !hash_equals((string) $config['host_key'], $fingerprint)) {
            throw new StorageException('The SFTP server host key changed (expected ' . $config['host_key'] . ', got ' . $fingerprint . '). If this is expected, edit the storage and turn on "Trust a new host key".', 'SFTP_HOST_KEY_MISMATCH', 409);
        }
        $credential = !empty($config['private_key'])
            ? PublicKeyLoader::load((string) $config['private_key'], !empty($config['password']) ? (string) $config['password'] : false)
            : (string) ($config['password'] ?? '');
        if (!$sftp->login((string) $config['username'], $credential)) {
            throw new StorageException('The SFTP server rejected the username or password/key', 'SFTP_AUTH_FAILED', 409);
        }
        if (empty($config['host_key'])) {
            $config['host_key'] = $fingerprint;
            UserStorageDestination::update($id, ['config' => $config]);
        }

        return self::$connections[$id] = $sftp;
    }
}
