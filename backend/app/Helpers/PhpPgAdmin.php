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
 * Panel-hosted phpPgAdmin install (mirrors {@see PhpMyAdmin} for PostgreSQL).
 */
class PhpPgAdmin
{
    public const VERSION = '7.13.0';
    public const DOWNLOAD_URL = 'https://github.com/phppgadmin/phppgadmin/archive/refs/tags/REL_7-13-0.zip';

    private const INSTALLED_MARKER = 'phppgadmin.installed';

    public static function isInstalled(): bool
    {
        $path = self::targetPath();

        return is_dir($path) && is_file($path . '/index.php');
    }

    public static function ensureInstalled(): void
    {
        if (self::isInstalled()) {
            self::writeInstalledMarker();

            return;
        }

        if (!self::hasInstalledMarker()) {
            return;
        }

        App::getInstance(true)->getLogger()->info('phpPgAdmin marker present but files missing — reinstalling');
        self::download();
    }

    public static function download(): void
    {
        $logger = App::getInstance(true)->getLogger();
        $publicDir = dirname(__DIR__, 2) . '/public';
        $targetPath = self::targetPath();

        if (self::isInstalled()) {
            $logger->info('phpPgAdmin already exists at ' . $targetPath);
            self::writeInstalledMarker();

            return;
        }

        if (!is_dir($publicDir) && !@mkdir($publicDir, 0755, true)) {
            throw new \Exception('Failed to create public directory: ' . $publicDir);
        }

        if (is_dir($targetPath)) {
            self::emptyDirectory($targetPath);
        } elseif (!@mkdir($targetPath, 0755, true) && !is_dir($targetPath)) {
            throw new \Exception('Failed to create phpPgAdmin directory: ' . $targetPath);
        }

        $logger->info('Downloading phpPgAdmin ' . self::VERSION);
        $zipContent = @file_get_contents(self::DOWNLOAD_URL, false, stream_context_create([
            'http' => ['timeout' => 300, 'ignore_errors' => true],
        ]));
        if ($zipContent === false) {
            throw new \Exception('Failed to download phpPgAdmin from ' . self::DOWNLOAD_URL);
        }

        $tempFile = sys_get_temp_dir() . '/' . uniqid('ppa_', true) . '.zip';
        if (@file_put_contents($tempFile, $zipContent) === false) {
            throw new \Exception('Failed to save phpPgAdmin zip');
        }

        try {
            $zip = new \ZipArchive();
            if ($zip->open($tempFile) !== true) {
                throw new \Exception('Failed to open phpPgAdmin zip');
            }
            $extractDir = sys_get_temp_dir() . '/' . uniqid('ppa_extract_', true);
            @mkdir($extractDir, 0755, true);
            $zip->extractTo($extractDir);
            $zip->close();

            $entries = scandir($extractDir) ?: [];
            $inner = null;
            foreach ($entries as $entry) {
                if ($entry === '.' || $entry === '..') {
                    continue;
                }
                $candidate = $extractDir . '/' . $entry;
                if (is_dir($candidate) && is_file($candidate . '/index.php')) {
                    $inner = $candidate;
                    break;
                }
            }
            if ($inner === null) {
                throw new \Exception('phpPgAdmin archive layout unexpected');
            }

            self::copyTree($inner, $targetPath);
            self::writeTokenBridge($targetPath);
            self::writeConfig($targetPath);
            self::writeInstalledMarker();
            $logger->info('phpPgAdmin installed at ' . $targetPath);
            self::deleteDirectory($extractDir);
        } finally {
            @unlink($tempFile);
        }
    }

    public static function targetPath(): string
    {
        return dirname(__DIR__, 2) . '/public/ppa';
    }

    private static function writeConfig(string $targetPath): void
    {
        $confDir = $targetPath . '/conf';
        if (!is_dir($confDir)) {
            @mkdir($confDir, 0755, true);
        }
        $config = <<<'PHP'
<?php
$conf['servers'][0]['desc'] = 'PostgreSQL';
$conf['servers'][0]['host'] = '';
$conf['servers'][0]['port'] = 5432;
$conf['servers'][0]['sslmode'] = 'allow';
$conf['servers'][0]['defaultdb'] = 'template1';
$conf['servers'][0]['pg_dump_path'] = '/usr/bin/pg_dump';
$conf['servers'][0]['pg_dumpall_path'] = '/usr/bin/pg_dumpall';
$conf['default_lang'] = 'auto';
$conf['theme'] = 'default';
$conf['left_width'] = 200;
$conf['ajax_refresh'] = 3;
$conf['extra_login_security'] = false;
$conf['owned_only'] = false;
$conf['show_comments'] = true;
$conf['show_advanced'] = false;
$conf['show_system'] = false;
$conf['min_password_length'] = 1;
$conf['max_login_attempts'] = 0;
PHP;
        @file_put_contents($confDir . '/config.inc.php', $config);
    }

    private static function writeTokenBridge(string $targetPath): void
    {
        $token = <<<'PHP'
<?php
declare(strict_types=1);

ini_set('session.use_cookies', 'true');
session_set_cookie_params(0, '/', '', (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'), true);
session_name('PpaTokenSession');
@session_start();

$host = (string) ($_GET['host'] ?? '');
$port = (string) ($_GET['port'] ?? '5432');
$user = (string) ($_GET['user'] ?? '');
$pass = (string) ($_GET['pass'] ?? '');
$db = (string) ($_GET['db'] ?? '');

if ($host === '' || $user === '') {
    http_response_code(400);
    echo 'Missing connection parameters';
    exit;
}

$_SESSION['ppa_login'] = [
    'host' => $host,
    'port' => $port,
    'user' => $user,
    'pass' => $pass,
    'db' => $db,
];
@session_write_close();

header('Location: index.php?server=0&subject=database&database=' . rawurlencode($db));
exit;
PHP;
        @file_put_contents($targetPath . '/token.php', $token);

        // Prefill login from token session when present.
        $loginHook = <<<'PHP'
<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    @session_start();
}
if (!empty($_SESSION['ppa_login']) && empty($_POST['loginServer'])) {
    $login = $_SESSION['ppa_login'];
    $_POST['loginServer'] = 0;
    $_POST['loginUsername'] = $login['user'] ?? '';
    $_POST['loginPassword'] = $login['pass'] ?? '';
    $_REQUEST['server'] = 0;
    if (!empty($login['host'])) {
        $conf['servers'][0]['host'] = $login['host'];
    }
    if (!empty($login['port'])) {
        $conf['servers'][0]['port'] = (int) $login['port'];
    }
}
PHP;
        @file_put_contents($targetPath . '/conf/featherpanel-login.php', $loginHook);
        $configPath = $targetPath . '/conf/config.inc.php';
        if (is_file($configPath)) {
            $existing = (string) file_get_contents($configPath);
            if (!str_contains($existing, 'featherpanel-login.php')) {
                file_put_contents(
                    $configPath,
                    $existing . "\nrequire_once __DIR__ . '/featherpanel-login.php';\n"
                );
            }
        }
    }

    private static function getInstalledMarkerPath(): string
    {
        return dirname(__DIR__, 2) . '/storage/config/' . self::INSTALLED_MARKER;
    }

    private static function hasInstalledMarker(): bool
    {
        return is_file(self::getInstalledMarkerPath());
    }

    private static function writeInstalledMarker(): void
    {
        $path = self::getInstalledMarkerPath();
        $dir = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        @file_put_contents($path, self::VERSION . "\n");
    }

    private static function copyTree(string $src, string $dst): void
    {
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($src, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST
        );
        foreach ($iterator as $item) {
            $target = $dst . DIRECTORY_SEPARATOR . $iterator->getSubPathName();
            if ($item->isDir()) {
                if (!is_dir($target)) {
                    @mkdir($target, 0755, true);
                }
            } else {
                @copy($item->getPathname(), $target);
            }
        }
    }

    private static function emptyDirectory(string $dir): void
    {
        if (!is_dir($dir)) {
            return;
        }
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($dir, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($iterator as $item) {
            if ($item->isDir()) {
                @rmdir($item->getPathname());
            } else {
                @unlink($item->getPathname());
            }
        }
    }

    private static function deleteDirectory(string $dir): void
    {
        self::emptyDirectory($dir);
        @rmdir($dir);
    }
}
