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

namespace Tests\Helpers;

use App\Config\PublicConfig;
use App\Config\ConfigInterface;
use PHPUnit\Framework\TestCase;
use App\Controllers\User\Server\ServerUserController;

final class StartupChangeSettingTest extends TestCase
{
    public function testCustomStartupCommandsAreOffByDefault(): void
    {
        $defaults = PublicConfig::getPublicSettingsWithDefaults();
        $this->assertSame('false', $defaults[ConfigInterface::SERVER_ALLOW_STARTUP_CHANGE]);
    }

    public function testOnlyExplicitTrueValuesAllowChanges(): void
    {
        foreach (['true', true, '1', 1] as $on) {
            $this->assertTrue(ServerUserController::isStartupChangeAllowed($on));
        }
        foreach (['false', false, '0', 0, null, '', 'yes'] as $off) {
            $this->assertFalse(ServerUserController::isStartupChangeAllowed($off));
        }
    }

    public function testExistingInstallsKeepTheirBehaviour(): void
    {
        $sql = (string) file_get_contents(dirname(__DIR__, 2) . '/storage/migrations/2026-11-23.12.00-startup-change-setting.sql');
        $this->assertStringContainsString("'server_allow_startup_change', 'true'", $sql);
        $this->assertStringContainsString('EXISTS (SELECT 1 FROM `featherpanel_users`)', $sql);
        $this->assertStringContainsString("NOT EXISTS (SELECT 1 FROM `featherpanel_settings` WHERE `name` = 'server_allow_startup_change')", $sql);
    }

    public function testDisabledChangesStillAllowTheSpellStartup(): void
    {
        $src = (string) file_get_contents(dirname(__DIR__, 2) . '/app/Controllers/User/Server/ServerUserController.php');
        $this->assertStringContainsString("getSetting(ConfigInterface::SERVER_ALLOW_STARTUP_CHANGE, 'false')", $src);
        $this->assertStringNotContainsString("getSetting(ConfigInterface::SERVER_ALLOW_STARTUP_CHANGE, 'true')", $src);
        $this->assertMatchesRegularExpression('/isStartupChangeAllowed\(\$allowStartupChange\).*?\$spellStartup.*?STARTUP_CHANGE_DISABLED/s', $src);
        // A spell change no longer skips the check.
        $this->assertStringNotContainsString("isset(\$data['startup']) && !\$isSpellChanging", $src);
    }
}
