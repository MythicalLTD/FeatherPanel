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
