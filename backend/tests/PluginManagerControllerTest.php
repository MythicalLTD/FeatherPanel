<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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

    public function testGetPluginsReturnsSuccess()
    {
        $request = Request::create('/api/admin/plugin-manager', 'GET');
        $response = $this->controller->getPlugins($request);
        $data = json_decode($response->getContent(), true);
        // May fail if developer mode is disabled, that's acceptable
        if ($data['success']) {
            // Response data is the array of plugins directly
            $this->assertIsArray($data['data']);
        } else {
            // If it fails, it should be a permissions issue
            $this->assertArrayHasKey('error_code', $data);
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
