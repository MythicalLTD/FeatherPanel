<?php

/*
 * This file is part of MythicalPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

use App\App;
use App\Chat\Role;
use App\Chat\User;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\Admin\PermissionsController;

class PermissionsControllerTest extends TestCase
{
    private PermissionsController $controller;
    private string $adminUuid = '123e4567-e89b-12d3-a456-426614174000';
    private string $adminEmail = 'testadmin@example.com';
    private int $testRoleId;

    protected function setUp(): void
    {
        $this->controller = new PermissionsController();
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
                'avatar' => 'https://github.com/mythicalltd.png',
                'remember_token' => bin2hex(random_bytes(16)),
            ]);
        }
        // Ensure a test role exists
        $roleId = null;
        $roles = Role::getAll('testrole', 1, 0);
        if (!empty($roles)) {
            $roleId = $roles[0]['id'];
        } else {
            $roleId = Role::createRole([
                'name' => 'testrole',
                'display_name' => 'Test Role',
                'color' => '#123456',
            ]);
        }
        $this->testRoleId = $roleId;
    }

    protected function tearDown(): void
    {
        // Remove test admin user
        $admin = User::getUserByUuid($this->adminUuid);
        if ($admin) {
            User::hardDeleteUser($admin['id']);
        }
        // Remove test role
        if ($this->testRoleId) {
            Role::deleteRole($this->testRoleId);
        }
    }

    public function testIndexReturnsSuccess()
    {
        $request = Request::create('/api/admin/permissions', 'GET');
        $response = $this->controller->index($request);
        $data = json_decode($response->getContent(), true);
        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('permissions', $data['data']);
    }

    public function testShowReturnsNotFoundForInvalidId()
    {
        $request = Request::create('/api/admin/permissions/999999', 'GET');
        $response = $this->controller->show($request, 999999);
        $data = json_decode($response->getContent(), true);
        $this->assertFalse($data['success']);
        $this->assertEquals('PERMISSION_NOT_FOUND', $data['error_code']);
    }

    public function testCreateValidationFails()
    {
        $request = Request::create('/api/admin/permissions', 'PUT', [], [], [], [], json_encode([]));
        $response = $this->controller->create($request);
        $data = json_decode($response->getContent(), true);
        $this->assertFalse($data['success']);
        $this->assertEquals('MISSING_REQUIRED_FIELDS', $data['error_code']);
    }

    public function testCreateAndDeletePermission()
    {
        // Create
        $payload = [
            'role_id' => $this->testRoleId,
            'permission' => 'test.permission',
        ];
        $request = Request::create('/api/admin/permissions', 'PUT', [], [], [], [], json_encode($payload));
        $request->attributes->set('user', ['uuid' => $this->adminUuid]);
        $response = $this->controller->create($request);
        $data = json_decode($response->getContent(), true);
        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('permission', $data['data']);
        $permissionId = $data['data']['permission']['id'];

        // Update
        $updatePayload = ['permission' => 'test.permission.updated'];
        $updateRequest = Request::create('/api/admin/permissions/' . $permissionId, 'PATCH', [], [], [], [], json_encode($updatePayload));
        $updateRequest->attributes->set('user', ['uuid' => $this->adminUuid]);
        $updateResponse = $this->controller->update($updateRequest, $permissionId);
        $updateData = json_decode($updateResponse->getContent(), true);
        $this->assertTrue($updateData['success']);
        $this->assertEquals('test.permission.updated', $updateData['data']['permission']['permission']);

        // Delete
        $deleteRequest = Request::create('/api/admin/permissions/' . $permissionId, 'DELETE');
        $deleteRequest->attributes->set('user', ['uuid' => $this->adminUuid]);
        $deleteResponse = $this->controller->delete($deleteRequest, $permissionId);
        $deleteData = json_decode($deleteResponse->getContent(), true);
        $this->assertTrue($deleteData['success']);
    }
}
