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

namespace App\Services\NodeBackup;

/**
 * SFTP destination using OpenSSH sftp/scp batch mode.
 *
 * Credentials keys: host, port, username, password?, private_key?, passphrase?, base_path?
 */
class SftpDestinationClient implements DestinationClientInterface
{
    private string $host;
    private int $port;
    private string $username;
    private string $password;
    private string $privateKey;
    private string $passphrase;
    private string $basePath;
    private ?string $keyFile = null;

    /**
     * @param array<string, mixed> $credentials
     */
    public function __construct(array $credentials)
    {
        $this->host = trim((string) ($credentials['host'] ?? ''));
        $this->port = (int) ($credentials['port'] ?? 22);
        if ($this->port <= 0) {
            $this->port = 22;
        }
        $this->username = trim((string) ($credentials['username'] ?? ''));
        $this->password = (string) ($credentials['password'] ?? '');
        $this->privateKey = (string) ($credentials['private_key'] ?? '');
        $this->passphrase = (string) ($credentials['passphrase'] ?? '');
        $this->basePath = rtrim((string) ($credentials['base_path'] ?? ''), '/');

        if ($this->host === '' || $this->username === '') {
            throw new \InvalidArgumentException('SFTP destination requires host and username');
        }
    }

    public function upload(string $localPath, string $remotePath): void
    {
        if (!is_file($localPath)) {
            throw new \RuntimeException('Local file missing: ' . $localPath);
        }
        $remote = $this->joinRemote($remotePath);
        $remoteDir = dirname($remote);
        $batch = "mkdir -p {$this->escapeSftpPath($remoteDir)}\n"
            . "put {$this->escapeSftpPath($localPath)} {$this->escapeSftpPath($remote)}\n"
            . "bye\n";
        $this->runSftpBatch($batch);
    }

    public function test(): void
    {
        $remote = $this->joinRemote('.featherpanel_node_backup_probe');
        $tmp = tempnam(sys_get_temp_dir(), 'fpnb');
        if ($tmp === false) {
            throw new \RuntimeException('Unable to create temp file for SFTP probe');
        }
        file_put_contents($tmp, 'ok');
        try {
            $batch = "mkdir -p {$this->escapeSftpPath($this->basePath !== '' ? $this->basePath : '.')}\n"
                . "put {$this->escapeSftpPath($tmp)} {$this->escapeSftpPath($remote)}\n"
                . "rm {$this->escapeSftpPath($remote)}\n"
                . "bye\n";
            $this->runSftpBatch($batch);
        } finally {
            @unlink($tmp);
        }
    }

    public function listObjects(string $prefix = ''): array
    {
        $remote = $this->joinRemote($prefix);
        $batch = "ls -1 {$this->escapeSftpPath($remote)}\nbye\n";
        $output = $this->runSftpBatch($batch, true);
        $items = [];
        foreach (preg_split('/\r?\n/', $output) ?: [] as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, 'sftp>') || str_contains($line, 'Connecting')) {
                continue;
            }
            // Best-effort: filename only from ls
            $name = basename($line);
            if ($name === '.' || $name === '..') {
                continue;
            }
            $path = rtrim($prefix, '/') . '/' . $name;
            $items[] = [
                'path' => ltrim($path, '/'),
                'mtime' => 0,
                'size' => 0,
            ];
        }

        return $items;
    }

    public function delete(string $remotePath): void
    {
        $remote = $this->joinRemote($remotePath);
        $batch = "rm {$this->escapeSftpPath($remote)}\nbye\n";
        $this->runSftpBatch($batch);
    }

    private function joinRemote(string $path): string
    {
        $path = ltrim(str_replace('\\', '/', $path), '/');
        if ($this->basePath === '') {
            return $path;
        }

        return $this->basePath . '/' . $path;
    }

    private function escapeSftpPath(string $path): string
    {
        return '"' . str_replace('"', '\\"', $path) . '"';
    }

    private function runSftpBatch(string $batch, bool $capture = false): string
    {
        $batchFile = tempnam(sys_get_temp_dir(), 'fpnb_batch');
        if ($batchFile === false) {
            throw new \RuntimeException('Unable to create SFTP batch file');
        }
        file_put_contents($batchFile, $batch);

        $identityArgs = [];
        if ($this->privateKey !== '') {
            $this->keyFile = tempnam(sys_get_temp_dir(), 'fpnb_key');
            if ($this->keyFile === false) {
                @unlink($batchFile);
                throw new \RuntimeException('Unable to create temp key file');
            }
            file_put_contents($this->keyFile, $this->privateKey);
            chmod($this->keyFile, 0600);
            $identityArgs[] = '-i';
            $identityArgs[] = $this->keyFile;
        }

        $cmd = ['sftp', '-o', 'StrictHostKeyChecking=accept-new', '-o', 'BatchMode=' . ($this->password !== '' ? 'no' : 'yes'), '-P', (string) $this->port];
        $cmd = array_merge($cmd, $identityArgs);
        $cmd[] = '-b';
        $cmd[] = $batchFile;
        $cmd[] = $this->username . '@' . $this->host;

        $env = [];
        $descriptors = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w'],
        ];

        if ($this->password !== '' && $this->privateKey === '') {
            // Prefer SSH_ASKPASS when available; otherwise fail with clear message.
            if (!$this->commandExists('sshpass')) {
                @unlink($batchFile);
                $this->cleanupKey();
                throw new \RuntimeException('SFTP password auth requires the sshpass binary on the panel host (or use a private key)');
            }
            $cmd = array_merge(['sshpass', '-p', $this->password], $cmd);
        }

        $proc = proc_open($cmd, $descriptors, $pipes, null, $env);
        if (!is_resource($proc)) {
            @unlink($batchFile);
            $this->cleanupKey();
            throw new \RuntimeException('Failed to start sftp process');
        }
        fclose($pipes[0]);
        $stdout = stream_get_contents($pipes[1]) ?: '';
        $stderr = stream_get_contents($pipes[2]) ?: '';
        fclose($pipes[1]);
        fclose($pipes[2]);
        $code = proc_close($proc);
        @unlink($batchFile);
        $this->cleanupKey();

        if ($code !== 0) {
            throw new \RuntimeException('SFTP command failed: ' . trim($stderr !== '' ? $stderr : $stdout));
        }

        return $capture ? $stdout : '';
    }

    private function cleanupKey(): void
    {
        if ($this->keyFile !== null) {
            @unlink($this->keyFile);
            $this->keyFile = null;
        }
    }

    private function commandExists(string $bin): bool
    {
        $path = explode(PATH_SEPARATOR, getenv('PATH') ?: '/usr/bin:/bin');
        foreach ($path as $dir) {
            if (is_executable(rtrim($dir, '/') . '/' . $bin)) {
                return true;
            }
        }

        return false;
    }
}
