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

use App\Chat\UserSshKey;
use PHPUnit\Framework\TestCase;

/**
 * SFTP key sign-in must only accept keys the user saved in the panel.
 */
class SftpPublicKeyMatchTest extends TestCase
{
    private const KEY_BLOB = 'AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl';

    public function testDaemonKeyLineMatchesTheSavedKeyFingerprint(): void
    {
        $saved = UserSshKey::generateFingerprint('ssh-ed25519 ' . self::KEY_BLOB . ' laptop');
        // Wings sends ssh.MarshalAuthorizedKey(): "<type> <blob>\n" without a comment
        $offered = UserSshKey::candidateFingerprints('ssh-ed25519 ' . self::KEY_BLOB . "\n");
        $this->assertContains($saved, $offered);

        // Bare wire blob form
        $this->assertContains($saved, UserSshKey::candidateFingerprints(self::KEY_BLOB));
    }

    public function testOtherKeysDoNotMatch(): void
    {
        $saved = UserSshKey::generateFingerprint('ssh-ed25519 ' . self::KEY_BLOB);
        $other = UserSshKey::candidateFingerprints('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBBBBnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl');
        $this->assertNotContains($saved, $other);
        $this->assertSame([], UserSshKey::candidateFingerprints('   '));
        $this->assertFalse(UserSshKey::userHasMatchingPublicKey(0, 'ssh-ed25519 ' . self::KEY_BLOB));
    }

    public function testWingsSftpAuthChecksSavedKeys(): void
    {
        $src = file_get_contents(dirname(__DIR__, 2) . '/app/Controllers/Wings/Sftp/SftpAuthController.php');
        $this->assertNotFalse($src);
        $this->assertMatchesRegularExpression('/function userHasPublicKey\([^)]*\): bool\s*\{\s*return UserSshKey::userHasMatchingPublicKey\(/s', $src);
        $this->assertDoesNotMatchRegularExpression('/function userHasPublicKey\([^)]*\): bool\s*\{[^}]*return true;/s', $src);
        // Unknown auth types are refused
        $this->assertMatchesRegularExpression('/elseif \\(\\$type === .public_key.\\).*?\\} else \\{\\s*return null;/s', $src);

        $quilld = file_get_contents(dirname(__DIR__, 2) . '/app/Controllers/Quilld/Sftp/SftpAuthController.php');
        $this->assertNotFalse($quilld);
        $this->assertStringContainsString('UserSshKey::userHasMatchingPublicKey(', $quilld);
    }
}
