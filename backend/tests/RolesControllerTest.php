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
use App\Controllers\Admin\RolesController;
use Symfony\Component\HttpFoundation\Request;

class RolesControllerTest extends TestCase
{
    private RolesController $controller;
    private string $adminUuid = '123e4567-e89b-12d3-a456-426614174000';
    private string $adminEmail = 'testadmin@example.com';

    protected function setUp(): void
    {
        $this->controller = new RolesController();
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

    public function testIndexReturnsSuccess()
    {
        $request = Request::create('/api/admin/roles', 'GET');
        $response = $this->controller->index($request);
        $data = json_decode($response->getContent(), true);
        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('roles', $data['data']);
    }

    public function testShowReturnsNotFoundForInvalidId()
    {
        $request = Request::create('/api/admin/roles/999999', 'GET');
        $response = $this->controller->show($request, 999999);
        $data = json_decode($response->getContent(), true);
        $this->assertFalse($data['success']);
        $this->assertEquals('ROLE_NOT_FOUND', $data['error_code']);
    }

    public function testCreateValidationFails()
    {
        $request = Request::create('/api/admin/roles', 'PUT', [], [], [], [], json_encode([]));
        $response = $this->controller->create($request);
        $data = json_decode($response->getContent(), true);
        $this->assertFalse($data['success']);
        $this->assertEquals('MISSING_REQUIRED_FIELDS', $data['error_code']);
    }

    public function testCreateAndDeleteRole()
    {
        // Create
        $payload = [
            'name' => 'testrole',
            'display_name' => 'Test Role',
            'color' => '#123456',
        ];
        $request = Request::create('/api/admin/roles', 'PUT', [], [], [], [], json_encode($payload));
        $request->attributes->set('user', ['uuid' => $this->adminUuid]);
        $response = $this->controller->create($request);
        $data = json_decode($response->getContent(), true);
        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('role', $data['data']);
        $roleId = $data['data']['role']['id'];

        // Update
        $updatePayload = ['display_name' => 'Test Role Updated'];
        $updateRequest = Request::create('/api/admin/roles/' . $roleId, 'PATCH', [], [], [], [], json_encode($updatePayload));
        $updateRequest->attributes->set('user', ['uuid' => $this->adminUuid]);
        $updateResponse = $this->controller->update($updateRequest, $roleId);
        $updateData = json_decode($updateResponse->getContent(), true);
        $this->assertTrue($updateData['success']);
        $this->assertEquals('Test Role Updated', $updateData['data']['role']['display_name']);

        // Delete
        $deleteRequest = Request::create('/api/admin/roles/' . $roleId, 'DELETE');
        $deleteRequest->attributes->set('user', ['uuid' => $this->adminUuid]);
        $deleteResponse = $this->controller->delete($deleteRequest, $roleId);
        $deleteData = json_decode($deleteResponse->getContent(), true);
        $this->assertTrue($deleteData['success']);
    }
}
