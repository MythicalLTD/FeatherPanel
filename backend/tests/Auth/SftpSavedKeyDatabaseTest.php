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

use App\App;
use App\Chat\User;
use App\Chat\Database;
use App\Chat\UserSshKey;
use App\Helpers\UUIDUtils;
use PHPUnit\Framework\TestCase;
use App\Controllers\Wings\Sftp\SftpAuthController;

/**
 * SFTP key sign-in against real rows: only the user's saved, non-deleted keys work.
 */
class SftpSavedKeyDatabaseTest extends TestCase
{
    private const SAVED = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl laptop';
    private const OTHER = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBBBBnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl';
    private const REPLACEMENT = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICCCCnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl';

    private array $user;

    protected function setUp(): void
    {
        $app = new App(false, false, true);
        $app->getDatabase();
        $username = 'sftpkey' . bin2hex(random_bytes(4));
        User::createUser([
            'uuid' => UUIDUtils::generateV4(),
            'username' => $username,
            'first_name' => 'Sftp',
            'last_name' => 'Keys',
            'email' => $username . '@example.com',
            'password' => password_hash('Passw0rd!x', PASSWORD_BCRYPT),
            'role_id' => 1,
            'avatar' => 'https://cdn.mythical.systems/featherpanel/logo.png',
            'remember_token' => bin2hex(random_bytes(16)),
        ]);
        $user = User::getUserByUsername($username);
        $this->assertNotNull($user);
        $this->user = $user;
    }

    protected function tearDown(): void
    {
        Database::getPdoConnection()->prepare('DELETE FROM featherpanel_users WHERE id = :id')->execute(['id' => (int) $this->user['id']]);
    }

    public function testOnlySavedKeysSignIn(): void
    {
        $keyId = UserSshKey::createUserSshKey(['user_id' => (int) $this->user['id'], 'name' => 'laptop', 'public_key' => self::SAVED, 'fingerprint' => UserSshKey::generateFingerprint(self::SAVED)]);
        $this->assertNotFalse($keyId);

        $fromWings = fn (string $k): string => implode(' ', array_slice(explode(' ', $k), 0, 2)) . "\n";
        $controller = new SftpAuthController();
        $auth = new \ReflectionMethod($controller, 'authenticateUser');

        $this->assertNotNull($auth->invoke($controller, $this->user['username'], $fromWings(self::SAVED), 'public_key'));
        $this->assertNull($auth->invoke($controller, $this->user['username'], $fromWings(self::OTHER), 'public_key'));
        $this->assertNull($auth->invoke($controller, $this->user['username'], $fromWings(self::SAVED), 'keyboard-interactive'));

        // Replacing the key moves sign-in to the new key
        $this->assertTrue(UserSshKey::updateUserSshKey((int) $keyId, ['public_key' => self::REPLACEMENT]));
        $this->assertFalse(UserSshKey::userHasMatchingPublicKey((int) $this->user['id'], self::SAVED));
        $this->assertTrue(UserSshKey::userHasMatchingPublicKey((int) $this->user['id'], $fromWings(self::REPLACEMENT)));

        // Removed keys stop working
        UserSshKey::deleteUserSshKey((int) $keyId);
        $this->assertFalse(UserSshKey::userHasMatchingPublicKey((int) $this->user['id'], $fromWings(self::REPLACEMENT)));
    }

    public function testSavedPemKeyMatchesTheDaemonForm(): void
    {
        $private = \phpseclib3\Crypt\RSA::createKey(2048);
        $public = $private->getPublicKey();
        $pem = (string) $public->toString('PKCS8');
        $openSsh = (string) $public->toString('OpenSSH');

        $keyId = UserSshKey::createUserSshKey(['user_id' => (int) $this->user['id'], 'name' => 'pem', 'public_key' => $pem, 'fingerprint' => UserSshKey::generateFingerprint($pem)]);
        $this->assertNotFalse($keyId);
        $this->assertTrue(UserSshKey::userHasMatchingPublicKey((int) $this->user['id'], $openSsh));
        $this->assertFalse(UserSshKey::userHasMatchingPublicKey((int) $this->user['id'], self::OTHER));
    }
}
