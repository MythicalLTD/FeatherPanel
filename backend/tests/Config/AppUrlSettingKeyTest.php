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

use PHPUnit\Framework\TestCase;

/**
 * The panel URL setting is stored as `app_url`. Reading it with another casing
 * silently returns the hard-coded default, so webmail, phpMyAdmin and app
 * links point at the upstream demo host instead of this installation.
 */
class AppUrlSettingKeyTest extends TestCase
{
    private const APP_DIR = __DIR__ . '/../../app';

    public function testConfigKeyIsLowercase(): void
    {
        $source = (string) file_get_contents(self::APP_DIR . '/Config/ConfigInterface.php');
        $this->assertMatchesRegularExpression('/const\s+APP_URL\s*=\s*\'app_url\'\s*;/', $source);
    }

    public function testNoCodeReadsTheUppercaseKey(): void
    {
        $offenders = [];
        $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(self::APP_DIR, FilesystemIterator::SKIP_DOTS));
        foreach ($files as $file) {
            if ($file->getExtension() !== 'php') {
                continue;
            }
            $source = (string) file_get_contents($file->getPathname());
            if (preg_match('/getSetting\(\s*[\'"]APP_URL[\'"]/', $source) === 1) {
                $offenders[] = substr($file->getPathname(), strlen(self::APP_DIR) + 1);
            }
        }
        $this->assertSame([], $offenders, 'Use ConfigInterface::APP_URL (app_url), not the string APP_URL.');
    }

    public function testLinkBuildersUseTheConstant(): void
    {
        // Mailbox / apps still build absolute links from APP_URL.
        $controllers = [
            'Controllers/User/WebSpaces/WebSpaceMailboxController.php',
            'Controllers/User/WebSpaces/WebSpaceAppsController.php',
        ];
        foreach ($controllers as $controller) {
            $source = (string) file_get_contents(self::APP_DIR . '/' . $controller);
            $this->assertStringContainsString('getSetting(ConfigInterface::APP_URL', $source, $controller);
            $this->assertStringContainsString('use App\Config\ConfigInterface;', $source, $controller);
        }
    }

    public function testPhpMyAdminTokenUrlsAreSameOriginRelative(): void
    {
        // Absolute APP_URL (especially the seeded demo host) used to send browsers
        // to featherpanel.mythical.systems. Token URLs must stay same-origin.
        foreach ([
            'Controllers/User/Server/ServerDatabaseController.php',
            'Controllers/User/WebSpaces/WebSpaceDatabaseController.php',
        ] as $controller) {
            $source = (string) file_get_contents(self::APP_DIR . '/' . $controller);
            $this->assertStringContainsString("'/pma/token.php?'", $source, $controller);
            $this->assertDoesNotMatchRegularExpression(
                "/getSetting\(\s*ConfigInterface::APP_URL\s*,\s*['\"]https?:\/\/featherpanel\.mythical\.systems['\"]/",
                $source,
                $controller . ' must not fall back to the demo APP_URL for PMA links'
            );
        }
    }
}
