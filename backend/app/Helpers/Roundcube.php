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

use App\App;

/**
 * Panel-hosted Roundcube install + token SSO (mirrors PhpMyAdmin helper shape).
 */
class Roundcube
{
    public const VERSION = '1.6.9';
    public const DOWNLOAD_URL = 'https://github.com/roundcube/roundcubemail/releases/download/'
        . self::VERSION . '/roundcubemail-' . self::VERSION . '-complete.tar.gz';

    private const INSTALLED_MARKER = 'roundcube.installed';

    public static function isInstalled(): bool
    {
        $path = self::webmailPath();

        return is_dir($path)
            && file_exists($path . '/index.php')
            && file_exists($path . '/program/include/iniset.php');
    }

    public static function ensureInstalled(): void
    {
        if (self::isInstalled()) {
            self::writeInstalledMarker();
            self::copyTokenFiles();
            self::ensureConfig();

            return;
        }

        self::downloadAndExtract();
        self::ensureConfig();
        self::copyTokenFiles();
        self::writeInstalledMarker();
    }

    public static function webmailPath(): string
    {
        return dirname(__DIR__, 2) . '/public/webmail';
    }

    private static function markerPath(): string
    {
        return dirname(__DIR__, 2) . '/storage/config/' . self::INSTALLED_MARKER;
    }

    private static function writeInstalledMarker(): void
    {
        $dir = dirname(self::markerPath());
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        @file_put_contents(self::markerPath(), self::VERSION . "\n");
    }

    private static function downloadAndExtract(): void
    {
        $logger = App::getInstance(true)->getLogger();
        $publicDir = dirname(__DIR__, 2) . '/public';
        $target = self::webmailPath();

        if (!is_dir($publicDir) && !@mkdir($publicDir, 0755, true)) {
            throw new \RuntimeException('Failed to create public directory');
        }

        if (!is_dir($target) && !@mkdir($target, 0755, true)) {
            throw new \RuntimeException('Failed to create webmail directory');
        }

        $logger->info('Downloading Roundcube ' . self::VERSION);
        $ctx = stream_context_create(['http' => ['timeout' => 300, 'ignore_errors' => true]]);
        $blob = @file_get_contents(self::DOWNLOAD_URL, false, $ctx);
        if ($blob === false) {
            throw new \RuntimeException('Failed to download Roundcube from ' . self::DOWNLOAD_URL);
        }

        $tmp = sys_get_temp_dir() . '/' . uniqid('rc_', true) . '.tar.gz';
        if (@file_put_contents($tmp, $blob) === false) {
            throw new \RuntimeException('Failed to save Roundcube archive');
        }

        try {
            $phar = new \PharData($tmp);
            $extractTo = sys_get_temp_dir() . '/' . uniqid('rc_extract_', true);
            @mkdir($extractTo, 0755, true);
            $phar->extractTo($extractTo, null, true);

            $extracted = $extractTo . '/roundcubemail-' . self::VERSION;
            if (!is_dir($extracted)) {
                $dirs = glob($extractTo . '/roundcubemail-*') ?: [];
                $extracted = $dirs[0] ?? '';
            }
            if ($extracted === '' || !is_dir($extracted)) {
                throw new \RuntimeException('Roundcube extract folder not found');
            }

            self::copyTree($extracted, $target);
            self::deleteTree($extractTo);
        } finally {
            @unlink($tmp);
        }

        $logger->info('Roundcube extracted to ' . $target);
    }

    private static function ensureConfig(): void
    {
        $configDir = self::webmailPath() . '/config';
        if (!is_dir($configDir)) {
            @mkdir($configDir, 0755, true);
        }

        $configFile = $configDir . '/config.inc.php';
        if (file_exists($configFile)) {
            return;
        }

        $desKey = bin2hex(random_bytes(12));
        $content = <<<PHP
<?php
\$config = [];
\$config['db_dsnw'] = 'sqlite:///' . __DIR__ . '/../logs/roundcube.db?mode=0646';
\$config['default_host'] = 'ssl://%n';
\$config['default_port'] = 993;
\$config['smtp_server'] = 'tls://%n';
\$config['smtp_port'] = 587;
\$config['des_key'] = '{$desKey}';
\$config['product_name'] = 'FeatherPanel Webmail';
\$config['plugins'] = ['archive', 'zipdownload'];
\$config['skin'] = 'elastic';
\$config['enable_installer'] = false;
\$config['auto_create_user'] = true;
\$config['log_driver'] = 'stdout';
\$config['temp_dir'] = __DIR__ . '/../temp';
\$config['mime_types'] = __DIR__ . '/../resources/mime.types';
PHP;

        @file_put_contents($configFile, $content);
        @mkdir(self::webmailPath() . '/logs', 0755, true);
        @mkdir(self::webmailPath() . '/temp', 0755, true);
    }

    private static function copyTokenFiles(): void
    {
        $sourceDir = dirname(__DIR__, 2) . '/storage/modules/webmail';
        $target = self::webmailPath();
        foreach (['token.php', 'token-logout.php'] as $file) {
            $src = $sourceDir . '/' . $file;
            if (file_exists($src)) {
                @copy($src, $target . '/' . $file);
            }
        }
    }

    private static function copyTree(string $src, string $dst): void
    {
        if (!is_dir($dst)) {
            mkdir($dst, 0755, true);
        }
        $it = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($src, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST
        );
        foreach ($it as $item) {
            $target = $dst . DIRECTORY_SEPARATOR . $it->getSubPathName();
            if ($item->isDir()) {
                if (!is_dir($target)) {
                    mkdir($target, 0755, true);
                }
            } else {
                copy($item->getPathname(), $target);
            }
        }
    }

    private static function deleteTree(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $it = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($it as $item) {
            $item->isDir() ? @rmdir($item->getPathname()) : @unlink($item->getPathname());
        }
        @rmdir($dir);
    }
}
