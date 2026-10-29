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

namespace App\Tests\Helpers;

use App\Helpers\LogRedactor;
use PHPUnit\Framework\TestCase;

class LogRedactorTest extends TestCase
{
    public function testMasksSecretKeysRecursively(): void
    {
        $out = LogRedactor::redact([
            'name' => 'node-1',
            'daemon_token' => 'abc',
            'daemon_token_id' => 'id1',
            'database_password' => 's3cret',
            'api_key' => 'k',
            'nested' => ['client_secret' => 'x', 'fqdn' => 'n.example.com'],
            'empty_password' => '',
        ]);
        $this->assertSame('node-1', $out['name']);
        $this->assertSame('[redacted]', $out['daemon_token']);
        $this->assertSame('[redacted]', $out['daemon_token_id']);
        $this->assertSame('[redacted]', $out['database_password']);
        $this->assertSame('[redacted]', $out['api_key']);
        $this->assertSame('[redacted]', $out['nested']['client_secret']);
        $this->assertSame('n.example.com', $out['nested']['fqdn']);
        $this->assertSame('', $out['empty_password']);
    }

    public function testJsonNeverContainsSecret(): void
    {
        $this->assertStringNotContainsString('s3cret', LogRedactor::json(['password' => 's3cret', 'id' => 5]));
    }
}
