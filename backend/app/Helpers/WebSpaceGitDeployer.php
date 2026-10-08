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

/**
 * Clone or pull a Git repository into a WebSpace document path via container exec.
 */
class WebSpaceGitDeployer
{
    private const KEY_REL = '.featherquilld/git-deploy-key';
    private const KEY_PUB_REL = '.featherquilld/git-deploy-key.pub';

    /**
     * @param array<string, mixed> $space
     * @param array<string, mixed> $webNode
     * @param array<string, mixed> $input
     *
     * @return array<string, mixed>
     */
    public static function deploy(array $space, array $webNode, array $input): array
    {
        WebSpaceAppsCatalog::requireApp($space, WebSpaceAppsCatalog::APP_GIT_DEPLOY);

        $runtime = WebSpaceAppsCatalog::resolveRuntime($space);
        $containerKey = WebSpaceAppsCatalog::containerPath($runtime, '.featherquilld/git-deploy-key');

        $repo = trim((string) ($input['repo'] ?? ''));
        if ($repo === '' || !self::isValidRepoUrl($repo)) {
            throw new \InvalidArgumentException('A https:// or git@ Git repository URL is required');
        }
        $ref = trim((string) ($input['ref'] ?? 'main'));
        if ($ref === '' || !preg_match('#^[A-Za-z0-9._/\-]+$#', $ref)) {
            throw new \InvalidArgumentException('Invalid git ref');
        }
        $directory = self::normalizeDirectory((string) ($input['directory'] ?? '/'));
        $token = trim((string) ($input['token'] ?? ''));

        $cloneUrl = $repo;
        $sshPrefix = '';
        if (self::isSshRepoUrl($repo)) {
            self::ensureDeployKey($space, $webNode);
            $sshPrefix = 'export GIT_SSH_COMMAND=' . self::shellQuote(
                'ssh -i ' . $containerKey . ' -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new'
            ) . ' && ';
        } elseif ($token !== '') {
            $cloneUrl = preg_replace('#^https://#i', 'https://x-access-token:' . rawurlencode($token) . '@', $repo) ?? $repo;
        }

        $containerPath = WebSpaceAppsCatalog::containerPath($runtime, $directory);
        $uuid = (string) $space['uuid'];

        $state = strtolower(trim((string) ($space['state'] ?? '')));
        if ($state !== 'running') {
            $power = FeatherQuilldClient::powerWebSpace($webNode, $uuid, 'start');
            if (!$power['ok']) {
                throw new \RuntimeException($power['error'] ?? 'Failed to start WebSpace');
            }
        }

        $gitDeps = 'command -v git >/dev/null 2>&1 || (apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq git)';
        if (self::isSshRepoUrl($repo)) {
            $gitDeps .= ' && (command -v ssh >/dev/null 2>&1 || DEBIAN_FRONTEND=noninteractive apt-get install -y -qq openssh-client)';
        }

        $cmd = $gitDeps
            . ' && mkdir -p ' . self::shellQuote($containerPath)
            . ' && ' . $sshPrefix . 'if [ -d ' . self::shellQuote($containerPath . '/.git') . ' ]; then'
            . ' git -C ' . self::shellQuote($containerPath) . ' fetch --depth 1 origin ' . self::shellQuote($ref)
            . ' && git -C ' . self::shellQuote($containerPath) . ' checkout -f FETCH_HEAD'
            . '; else'
            . ' TMP=' . self::shellQuote($containerPath . '/.fp-git-tmp')
            . ' && rm -rf "$TMP"'
            . ' && git clone --depth 1 --branch ' . self::shellQuote($ref) . ' ' . self::shellQuote($cloneUrl) . ' "$TMP"'
            . ' && find "$TMP" -mindepth 1 -maxdepth 1 -exec mv -t ' . self::shellQuote($containerPath) . ' {} +'
            . ' && rmdir "$TMP"'
            . '; fi';

        $result = FeatherQuilldClient::execWebSpaceCommand($webNode, $uuid, $cmd, 300);
        if (!$result['ok']) {
            throw new \RuntimeException($result['error'] ?? 'Git deploy failed');
        }
        $body = is_array($result['body']) ? $result['body'] : [];
        $exit = (int) ($body['exit_code'] ?? 0);
        $output = (string) ($body['output'] ?? '');
        if ($exit !== 0) {
            throw new \RuntimeException($output !== '' ? $output : 'Git deploy command failed');
        }

        return [
            'directory' => $directory,
            'ref' => $ref,
            'repo' => self::sanitizeRepoForDisplay($repo),
            'transport' => self::isSshRepoUrl($repo) ? 'ssh' : 'https',
            'output' => $output,
        ];
    }

    /**
     * @param array<string, mixed> $space
     * @param array<string, mixed> $webNode
     *
     * @return array{public_key: string, created: bool}
     */
    public static function ensureDeployKey(array $space, array $webNode, bool $regenerate = false): array
    {
        WebSpaceAppsCatalog::requireApp($space, WebSpaceAppsCatalog::APP_GIT_DEPLOY);

        $runtime = WebSpaceAppsCatalog::resolveRuntime($space);
        $containerKey = WebSpaceAppsCatalog::containerPath($runtime, '.featherquilld/git-deploy-key');

        $uuid = (string) $space['uuid'];
        if (!$regenerate) {
            $existing = self::loadDeployKeyPublic($space, $webNode);
            if ($existing !== '') {
                return ['public_key' => $existing, 'created' => false];
            }
        }

        $tmp = sys_get_temp_dir() . '/fp-git-key-' . bin2hex(random_bytes(8));
        $comment = 'featherquilld-deploy-' . substr($uuid, 0, 8);
        $cmd = sprintf(
            'ssh-keygen -t ed25519 -N "" -C %s -f %s -q',
            escapeshellarg($comment),
            escapeshellarg($tmp),
        );
        exec($cmd, $out, $code);
        if ($code !== 0 || !is_file($tmp) || !is_file($tmp . '.pub')) {
            throw new \RuntimeException('Failed to generate deploy key (ssh-keygen unavailable?)');
        }

        $private = (string) file_get_contents($tmp);
        $public = trim((string) file_get_contents($tmp . '.pub'));
        @unlink($tmp);
        @unlink($tmp . '.pub');

        FeatherQuilldClient::createWebSpaceDirectory($webNode, $uuid, '.featherquilld');
        $writeKey = FeatherQuilldClient::writeWebSpaceFile($webNode, $uuid, self::KEY_REL, $private . "\n");
        if (!$writeKey['ok']) {
            throw new \RuntimeException($writeKey['error'] ?? 'Failed to store deploy key');
        }
        $writePub = FeatherQuilldClient::writeWebSpaceFile($webNode, $uuid, self::KEY_PUB_REL, $public . "\n");
        if (!$writePub['ok']) {
            throw new \RuntimeException($writePub['error'] ?? 'Failed to store deploy public key');
        }

        $state = strtolower(trim((string) ($space['state'] ?? '')));
        if ($state === 'running') {
            FeatherQuilldClient::execWebSpaceCommand(
                $webNode,
                $uuid,
                'chmod 600 ' . self::shellQuote($containerKey),
                30,
            );
        }

        return ['public_key' => $public, 'created' => true];
    }

    /**
     * @param array<string, mixed> $space
     * @param array<string, mixed> $webNode
     */
    public static function loadDeployKeyPublic(array $space, array $webNode): string
    {
        $read = FeatherQuilldClient::getWebSpaceFileContents(
            $webNode,
            (string) $space['uuid'],
            self::KEY_PUB_REL,
        );
        if (!$read['ok']) {
            return '';
        }
        $body = $read['body'];
        $raw = is_string($body) ? $body : (is_array($body) ? (string) ($body['data'] ?? $body['contents'] ?? '') : '');

        return trim($raw);
    }

    /**
     * @param array<string, mixed> $space
     * @param array<string, mixed> $webNode
     * @param array<string, mixed> $input
     *
     * @return array{repo: string, ref: string, directory: string, secret: string, token: string}
     */
    public static function saveWebhookConfig(array $space, array $webNode, array $input): array
    {
        WebSpaceAppsCatalog::requireApp($space, WebSpaceAppsCatalog::APP_GIT_DEPLOY);

        $repo = trim((string) ($input['repo'] ?? ''));
        if ($repo === '' || !self::isValidRepoUrl($repo)) {
            throw new \InvalidArgumentException('A https:// or git@ Git repository URL is required');
        }
        $ref = trim((string) ($input['ref'] ?? 'main'));
        if ($ref === '' || !preg_match('#^[A-Za-z0-9._/\-]+$#', $ref)) {
            throw new \InvalidArgumentException('Invalid git ref');
        }
        $directory = self::normalizeDirectory((string) ($input['directory'] ?? '/'));
        $token = trim((string) ($input['token'] ?? ''));
        $secret = trim((string) ($input['secret'] ?? ''));
        if ($secret === '') {
            $secret = bin2hex(random_bytes(24));
        }

        $payload = [
            'repo' => $repo,
            'ref' => $ref,
            'directory' => $directory,
            'token' => $token,
            'secret' => $secret,
            'transport' => self::isSshRepoUrl($repo) ? 'ssh' : 'https',
        ];
        $uuid = (string) $space['uuid'];
        FeatherQuilldClient::createWebSpaceDirectory($webNode, $uuid, '.featherquilld');
        $write = FeatherQuilldClient::writeWebSpaceFile(
            $webNode,
            $uuid,
            '.featherquilld/git-deploy.json',
            json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n",
        );
        if (!$write['ok']) {
            throw new \RuntimeException($write['error'] ?? 'Failed to save git webhook config');
        }

        return [
            'repo' => self::sanitizeRepoForDisplay($repo),
            'ref' => $ref,
            'directory' => $directory,
            'secret' => $secret,
            'token' => $token !== '' ? '***' : '',
            'transport' => self::isSshRepoUrl($repo) ? 'ssh' : 'https',
        ];
    }

    /**
     * @param array<string, mixed> $space
     * @param array<string, mixed> $webNode
     *
     * @return array<string, mixed>|null
     */
    public static function loadWebhookConfig(array $space, array $webNode): ?array
    {
        $read = FeatherQuilldClient::getWebSpaceFileContents(
            $webNode,
            (string) $space['uuid'],
            '.featherquilld/git-deploy.json',
        );
        if (!$read['ok']) {
            return null;
        }
        $body = $read['body'];
        $raw = is_string($body) ? $body : (is_array($body) ? (string) ($body['data'] ?? $body['contents'] ?? '') : '');
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return null;
        }

        $repo = (string) ($decoded['repo'] ?? '');

        return [
            'repo' => self::sanitizeRepoForDisplay($repo),
            'ref' => (string) ($decoded['ref'] ?? 'main'),
            'directory' => (string) ($decoded['directory'] ?? '/'),
            'secret' => (string) ($decoded['secret'] ?? ''),
            'has_token' => trim((string) ($decoded['token'] ?? '')) !== '',
            'transport' => (string) ($decoded['transport'] ?? (self::isSshRepoUrl($repo) ? 'ssh' : 'https')),
        ];
    }

    /**
     * @param array<string, mixed> $space
     * @param array<string, mixed> $webNode
     * @param array<string, mixed> $stored
     *
     * @return array<string, mixed>
     */
    public static function deployFromStored(array $space, array $webNode, array $stored): array
    {
        return self::deploy($space, $webNode, [
            'repo' => (string) ($stored['repo'] ?? ''),
            'ref' => (string) ($stored['ref'] ?? 'main'),
            'directory' => (string) ($stored['directory'] ?? '/'),
            'token' => (string) ($stored['token'] ?? ''),
        ]);
    }

    private static function isValidRepoUrl(string $repo): bool
    {
        return (bool) preg_match('#^https://[^\s]+#i', $repo)
            || (bool) preg_match('#^git@[^\s]+:[^\s]+#', $repo)
            || (bool) preg_match('#^ssh://git@[^\s]+#i', $repo);
    }

    private static function isSshRepoUrl(string $repo): bool
    {
        return str_starts_with($repo, 'git@') || str_starts_with(strtolower($repo), 'ssh://');
    }

    private static function sanitizeRepoForDisplay(string $repo): string
    {
        $repo = preg_replace('#https://[^/@]+@#', 'https://', $repo) ?? $repo;

        return $repo;
    }

    private static function normalizeDirectory(string $directory): string
    {
        $directory = trim($directory);
        if ($directory === '') {
            return '/';
        }
        if (!str_starts_with($directory, '/')) {
            $directory = '/' . $directory;
        }

        return rtrim($directory, '/') === '' ? '/' : rtrim($directory, '/');
    }

    private static function shellQuote(string $value): string
    {
        return "'" . str_replace("'", "'\\''", $value) . "'";
    }
}
