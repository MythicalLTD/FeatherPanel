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

namespace App\Tests\Auth;

use PHPUnit\Framework\TestCase;
use App\Controllers\User\Auth\LoginController;
use App\Controllers\User\Auth\DiscordController;

/**
 * Discord and LDAP sign-ins must follow the same account rules as the
 * password form, and Discord may only match accounts by a confirmed email.
 */
class ExternalSignInRulesTest extends TestCase
{
    public function testDiscordEmailIsOnlyUsedWhenDiscordConfirmedIt(): void
    {
        $this->assertSame('a@example.com', DiscordController::verifiedEmail(['email' => 'a@example.com', 'verified' => true]));
        $this->assertSame('', DiscordController::verifiedEmail(['email' => 'a@example.com', 'verified' => false]));
        $this->assertSame('', DiscordController::verifiedEmail(['email' => 'a@example.com']));
        $this->assertSame('', DiscordController::verifiedEmail(['email' => 'a@example.com', 'verified' => 'true']));
        $this->assertSame('', DiscordController::verifiedEmail(['email' => 'not-an-email', 'verified' => true]));
        $this->assertSame('', DiscordController::verifiedEmail(['email' => null, 'verified' => true]));
        $this->assertSame('', DiscordController::verifiedEmail(['verified' => true]));
    }

    public function testGateStopsBannedAndDeletedAccounts(): void
    {
        $login = new LoginController();

        $banned = $login->externalLoginGate(['uuid' => 'u1', 'email' => 'a@example.com', 'banned' => 'true']);
        $this->assertNotNull($banned);
        $this->assertStringContainsString('USER_BANNED', (string) $banned->getContent());

        $deleted = $login->externalLoginGate(['uuid' => 'u1', 'email' => 'a@example.com', 'deleted' => 'true']);
        $this->assertNotNull($deleted);
        $this->assertSame(403, $deleted->getStatusCode());

        $this->assertNull($login->externalLoginGate(['uuid' => 'u1', 'email' => 'a@example.com', 'banned' => 'false', 'deleted' => 'false', 'two_fa_enabled' => 'false']));
    }

    public function testGateAsksForTheSecondFactor(): void
    {
        $src = $this->read('app/Controllers/User/Auth/LoginController.php');
        $this->assertMatchesRegularExpression('/function externalLoginGate\(.*?two_fa_enabled.*?TWO_FACTOR_REQUIRED/s', $src);
        $this->assertMatchesRegularExpression('/function completeExternalLogin\(.*?externalLoginGate\(.*?completeLogin\(/s', $src);
    }

    public function testDiscordAndLdapGoThroughTheGate(): void
    {
        $login = $this->read('app/Controllers/User/Auth/LoginController.php');
        $this->assertMatchesRegularExpression('/discordController->authenticateWithToken\(.*?completeExternalLogin\(\$userInfo\)/s', $login);

        $discord = $this->read('app/Controllers/User/Auth/DiscordController.php');
        $this->assertStringNotContainsString('->completeLogin(', $discord);
        $this->assertStringContainsString('self::verifiedEmail($discordUser)', $discord);
        $this->assertStringNotContainsString("\$discordUser['email'] ?? ''", substr($discord, 0, (int) strpos($discord, 'function verifiedEmail')));

        $ldap = $this->read('app/Controllers/User/Auth/LdapController.php');
        $this->assertStringNotContainsString('->completeLogin(', $ldap);
        $this->assertStringContainsString('->completeExternalLogin(', $ldap);
    }

    private function read(string $relative): string
    {
        $src = file_get_contents(dirname(__DIR__, 2) . '/' . $relative);
        $this->assertNotFalse($src);

        return $src;
    }
}
