<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

use App\App;
use App\Chat\User;
use App\Helpers\ServerGateway;
use PHPUnit\Framework\TestCase;

class ServerGatewayTest extends TestCase
{
    private string $testUserUuid = 'test-gateway-user-123e4567-e89b-12d3-a456-426614174000';

    protected function setUp(): void
    {
        // Ensure DB connection is initialized in test mode
        App::getInstance(false, true, true);

        // Create test user
        $existing = User::getUserByUuid($this->testUserUuid);
        if (!$existing) {
            User::createUser([
                'uuid' => $this->testUserUuid,
                'username' => 'testgatewayuser',
                'first_name' => 'Test',
                'last_name' => 'Gateway',
                'email' => 'testgateway@example.com',
                'password' => password_hash('TestPassword123', PASSWORD_BCRYPT),
                'role_id' => 1, // Regular user role
                'avatar' => 'https://cdn.mythical.systems/featherpanel/logo.png',
                'remember_token' => bin2hex(random_bytes(16)),
            ]);
        }
    }

    protected function tearDown(): void
    {
        // Remove test user
        $user = User::getUserByUuid($this->testUserUuid);
        if ($user) {
            User::hardDeleteUser($user['id']);
        }
    }

    public function testCanUserAccessServerReturnsFalseForInvalidUser()
    {
        $result = ServerGateway::canUserAccessServer('invalid-uuid', 'server-uuid');
        $this->assertFalse($result);
    }

    public function testCanUserAccessServerReturnsFalseForInvalidServer()
    {
        $result = ServerGateway::canUserAccessServer($this->testUserUuid, 'invalid-server-uuid');
        $this->assertFalse($result);
    }

    public function testCanUserAccessServerReturnsFalseWhenNoAccess()
    {
        // Test with user who has no access to any server
        $result = ServerGateway::canUserAccessServer($this->testUserUuid, 'non-existent-server');
        $this->assertFalse($result);
    }
}
