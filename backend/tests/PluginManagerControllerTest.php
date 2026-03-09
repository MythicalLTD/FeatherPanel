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
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\Admin\PluginManagerController;

class PluginManagerControllerTest extends TestCase
{
    private PluginManagerController $controller;
    private string $adminUuid = '123e4567-e89b-12d3-a456-426614174000';
    private string $adminEmail = 'testadmin@example.com';

    protected function setUp(): void
    {
        // Define required constants
        if (!defined('APP_ADDONS_DIR')) {
            define('APP_ADDONS_DIR', dirname(__DIR__) . '/storage/addons');
        }
        if (!defined('APP_DEBUG')) {
            define('APP_DEBUG', false);
        }

        $this->controller = new PluginManagerController();
        // Ensure DB connection is initialized in test mode
        App::getInstance(false, true, true);
        // Ensure test admin user exists
        $existing = User::getUserByUuid($this->adminUuid);
        if (!$existing) {
            User::createUser([
                'uuid' => $this->adminUuid,
                'username' => 'testadmin',
                'first_name' => 'Test',
                'last_name' => 'Admin',
                'email' => $this->adminEmail,
                'password' => password_hash('TestPassword123', PASSWORD_BCRYPT),
                'role_id' => 4,
                'avatar' => 'https://cdn.mythical.systems/featherpanel/logo.png',
                'remember_token' => bin2hex(random_bytes(16)),
            ]);
        }
    }

    protected function tearDown(): void
    {
        // Remove test admin user
        $admin = User::getUserByUuid($this->adminUuid);
        if ($admin) {
            User::hardDeleteUser($admin['id']);
        }
    }

    public function testGetPluginDetailsReturnsErrorForInvalidPlugin()
    {
        $request = Request::create('/api/admin/plugin-manager/invalid-plugin', 'GET');
        $response = $this->controller->getPluginDetails($request);
        $data = json_decode($response->getContent(), true);
        $this->assertFalse($data['success']);
        // Just check that we get an error, don't care about the specific code
        $this->assertArrayHasKey('error_code', $data);
    }
}
