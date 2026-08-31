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

class WebSpaceMagentoInstaller
{
    use WebSpacePhpAppInstallerTrait;

    /**
     * @param array<string, mixed> $space
     * @param array<string, mixed> $webNode
     * @param array<string, mixed> $input
     *
     * @return array<string, mixed>
     */
    public static function install(array $space, array $webNode, array $input): array
    {
        WebSpaceAppsCatalog::requireApp($space, WebSpaceAppsCatalog::APP_MAGENTO);
        if (self::phpRuntime($space) !== 'php') {
            throw new \InvalidArgumentException('Magento requires a PHP WebSpace');
        }

        $directory = self::normalizeAppDirectory((string) ($input['directory'] ?? '/'));
        $adminUser = trim((string) ($input['admin_user'] ?? 'admin'));
        $adminPassword = (string) ($input['admin_password'] ?? '');
        if ($adminPassword === '') {
            $adminPassword = RemoteDatabaseProvisioner::generateRandomString(16);
        }
        $adminEmail = trim((string) ($input['admin_email'] ?? 'admin@example.com'));

        $uuid = (string) $space['uuid'];
        self::ensureWebSpaceRunning($webNode, $space);
        $containerPath = WebSpaceAppsCatalog::containerPath('php', $directory);
        $parentPath = dirname($containerPath);
        if ($parentPath === $containerPath) {
            $parentPath = '/var/www/html';
        }

        $db = self::provisionAppDatabase($space, array_merge($input, [
            'database_name' => (string) ($input['database_name'] ?? 'magento'),
        ]), 'magento');

        $domain = self::primaryAppDomain($space) ?: 'localhost';
        $scheme = !empty($space['ssl']) ? 'https' : 'http';
        $url = $directory === '/' ? $scheme . '://' . $domain . '/' : rtrim($scheme . '://' . $domain, '/') . $directory . '/';

        $cmd = 'mkdir -p ' . self::shellQuoteApp($parentPath)
            . ' && cd ' . self::shellQuoteApp($parentPath)
            . ' && rm -rf ' . self::shellQuoteApp(basename($containerPath))
            . ' && composer create-project magento/project-community-edition '
            . self::shellQuoteApp(basename($containerPath))
            . ' --no-interaction --prefer-dist'
            . ' && cd ' . self::shellQuoteApp($containerPath)
            . ' && php bin/magento setup:install'
            . ' --base-url=' . self::shellQuoteApp($url)
            . ' --db-host=' . self::shellQuoteApp($db['host'])
            . ' --db-name=' . self::shellQuoteApp($db['database'])
            . ' --db-user=' . self::shellQuoteApp($db['username'])
            . ' --db-password=' . self::shellQuoteApp($db['password'])
            . ' --admin-firstname=Admin --admin-lastname=User'
            . ' --admin-email=' . self::shellQuoteApp($adminEmail)
            . ' --admin-user=' . self::shellQuoteApp($adminUser)
            . ' --admin-password=' . self::shellQuoteApp($adminPassword)
            . ' --language=en_US --currency=USD --timezone=UTC --use-rewrites=1 --backend-frontname=admin';

        $output = self::execInWebSpace($webNode, $uuid, $cmd, 1200, 'Magento install failed');

        return [
            'directory' => $directory,
            'url' => rtrim($url, '/'),
            'admin_user' => $adminUser,
            'admin_password' => $adminPassword,
            'admin_email' => $adminEmail,
            'database' => $db['database'],
            'username' => $db['username'],
            'password' => $db['password'],
            'output' => $output,
            'setup_note' => 'Magento is memory-heavy; increase WebSpace memory if install fails.',
        ];
    }
}
