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

namespace Tests\Storage;

use PHPUnit\Framework\TestCase;
use App\Services\Storage\StorageException;
use App\Services\Storage\BackupStreamSigner;
use App\Services\Storage\Providers\SftpProvider;
use App\Services\Storage\Providers\WebDavProvider;

final class RelayProviderTest extends TestCase
{
    private const UUID = '0b1c2d3e-0000-4000-8000-00000000abcd';

    public function testRelaySignatureRejectsGarbage(): void
    {
        $this->assertFalse(BackupStreamSigner::verifyRelay(self::UUID, time() - 5, 'x'));
        $this->assertFalse(BackupStreamSigner::verifyRelay(self::UUID, 'soon', 'x'));
        $this->assertFalse(BackupStreamSigner::verifyRelay(self::UUID, time() + 60, null));
    }

    public function testSftpConfigKeepsSecretsAndResetsHostKeyOnMove(): void
    {
        $p = new SftpProvider();
        $existing = ['host' => '1.1.1.1', 'port' => 22, 'username' => 'fp', 'root' => 'b', 'password' => 'secret', 'private_key' => '', 'host_key' => 'SHA256:abc'];
        $same = $p->normalizeConfig(['username' => 'fp', 'root' => 'b'], $existing);
        $this->assertSame('secret', $same['password']);
        $this->assertSame('SHA256:abc', $same['host_key']);
        $moved = $p->normalizeConfig(['port' => 2222], $existing);
        $this->assertSame('', $moved['host_key']);
        $reset = $p->normalizeConfig(['reset_host_key' => true], $existing);
        $this->assertSame('', $reset['host_key']);
        $public = $p->publicConfig($same);
        $this->assertArrayNotHasKey('password', $public);
        $this->assertTrue($public['has_password']);
    }

    /** @return iterable<string, array{array<string, mixed>, string}> */
    public static function badSftp(): iterable
    {
        yield 'port' => [['host' => '1.1.1.1', 'port' => 70000, 'username' => 'a', 'password' => 'x'], 'PORT_INVALID'];
        yield 'no user' => [['host' => '1.1.1.1', 'password' => 'x'], 'CREDENTIALS_REQUIRED'];
        yield 'no secret' => [['host' => '1.1.1.1', 'username' => 'a'], 'CREDENTIALS_REQUIRED'];
        yield 'bad key' => [['host' => '1.1.1.1', 'username' => 'a', 'private_key' => 'not a key'], 'PRIVATE_KEY_INVALID'];
    }

    /** @param array<string, mixed> $input */
    #[\PHPUnit\Framework\Attributes\DataProvider('badSftp')]
    public function testSftpRejectsBadConfig(array $input, string $code): void
    {
        try {
            (new SftpProvider())->normalizeConfig($input);
            $this->fail('expected ' . $code);
        } catch (StorageException $e) {
            $this->assertSame($code, $e->errorCode());
        }
    }

    public function testWebDavPublicConfigHidesPassword(): void
    {
        $public = (new WebDavProvider())->publicConfig(['url' => 'https://dav.example.com/d', 'username' => 'u', 'password' => 'p', 'root' => 'r']);
        $this->assertSame(['url' => 'https://dav.example.com/d', 'username' => 'u', 'root' => 'r', 'has_password' => true], $public);
    }
}
