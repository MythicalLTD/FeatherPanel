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

class WebSpacePrestaShopInstaller
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
        WebSpaceAppsCatalog::requireApp($space, WebSpaceAppsCatalog::APP_PRESTASHOP);
        if (self::phpRuntime($space) !== 'php') {
            throw new \InvalidArgumentException('PrestaShop requires a PHP WebSpace');
        }

        $directory = self::normalizeAppDirectory((string) ($input['directory'] ?? '/'));
        $shopName = trim((string) ($input['shop_name'] ?? 'PrestaShop'));
        $adminEmail = trim((string) ($input['admin_email'] ?? 'admin@example.com'));
        $adminPassword = (string) ($input['admin_password'] ?? '');
        if ($adminPassword === '') {
            $adminPassword = RemoteDatabaseProvisioner::generateRandomString(16);
        }

        $uuid = (string) $space['uuid'];
        self::ensureWebSpaceRunning($webNode, $space);
        $containerPath = WebSpaceAppsCatalog::containerPath('php', $directory);
        $parentPath = dirname($containerPath);
        if ($parentPath === $containerPath) {
            $parentPath = '/var/www/html';
        }

        $db = self::provisionAppDatabase($space, array_merge($input, [
            'database_name' => (string) ($input['database_name'] ?? 'prestashop'),
        ]), 'prestashop');

        $domain = self::primaryAppDomain($space) ?: 'localhost';
        $scheme = !empty($space['ssl']) ? 'https' : 'http';
        $url = $directory === '/' ? $scheme . '://' . $domain : rtrim($scheme . '://' . $domain, '/') . $directory;

        $cmd = 'mkdir -p ' . self::shellQuoteApp($parentPath)
            . ' && cd ' . self::shellQuoteApp($parentPath)
            . ' && rm -rf ' . self::shellQuoteApp(basename($containerPath))
            . ' && composer create-project prestashop/prestashop '
            . self::shellQuoteApp(basename($containerPath))
            . ' --no-interaction --prefer-dist'
            . ' && cd ' . self::shellQuoteApp($containerPath)
            . ' && php install/index_cli.php'
            . ' --domain=' . self::shellQuoteApp(parse_url($url, PHP_URL_HOST) ?: $domain)
            . ' --db_server=' . self::shellQuoteApp($db['host'] . ':' . $db['port'])
            . ' --db_name=' . self::shellQuoteApp($db['database'])
            . ' --db_user=' . self::shellQuoteApp($db['username'])
            . ' --db_password=' . self::shellQuoteApp($db['password'])
            . ' --prefix=ps_'
            . ' --email=' . self::shellQuoteApp($adminEmail)
            . ' --password=' . self::shellQuoteApp($adminPassword)
            . ' --name=' . self::shellQuoteApp($shopName)
            . ' --country=us --language=en --newsletter=0';

        $output = self::execInWebSpace($webNode, $uuid, $cmd, 900, 'PrestaShop install failed');

        return [
            'directory' => $directory,
            'url' => $url,
            'admin_email' => $adminEmail,
            'admin_password' => $adminPassword,
            'database' => $db['database'],
            'username' => $db['username'],
            'password' => $db['password'],
            'output' => $output,
        ];
    }
}
