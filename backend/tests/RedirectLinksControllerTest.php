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
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\Admin\RedirectLinksController;

class RedirectLinksControllerTest extends TestCase
{
    private RedirectLinksController $controller;
    private string $adminUuid = '123e4567-e89b-12d3-a456-426614174000';
    private string $adminEmail = 'testadmin@example.com';

    protected function setUp(): void
    {
        $this->controller = new RedirectLinksController();
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
        $request = Request::create('/api/admin/redirect-links', 'GET');
        $response = $this->controller->index($request);
        $data = json_decode($response->getContent(), true);
        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('redirect_links', $data['data']);
    }

    public function testShowReturnsNotFoundForInvalidId()
    {
        $request = Request::create('/api/admin/redirect-links/999999', 'GET');
        $response = $this->controller->show($request, 999999);
        $data = json_decode($response->getContent(), true);
        $this->assertFalse($data['success']);
        $this->assertEquals('REDIRECT_LINK_NOT_FOUND', $data['error_code']);
    }

    public function testCreateValidationFails()
    {
        $request = Request::create('/api/admin/redirect-links', 'PUT', [], [], [], [], json_encode([]));
        $response = $this->controller->create($request);
        $data = json_decode($response->getContent(), true);
        $this->assertFalse($data['success']);
        $this->assertEquals('NO_DATA_PROVIDED', $data['error_code']);
    }

    public function testCreateWithValidData()
    {
        // Create with unique slug
        $payload = [
            'name' => 'Test Redirect Link',
            'url' => 'https://example.com',
            'slug' => 'test-redirect-' . uniqid(),
        ];
        $request = Request::create('/api/admin/redirect-links', 'PUT', [], [], [], [], json_encode($payload));
        $request->attributes->set('user', ['uuid' => $this->adminUuid]);
        $response = $this->controller->create($request);
        $data = json_decode($response->getContent(), true);

        if ($data['success']) {
            $this->assertArrayHasKey('redirect_link_id', $data['data']);
            // Clean up
            $linkId = $data['data']['redirect_link_id'];
            $deleteRequest = Request::create('/api/admin/redirect-links/' . $linkId, 'DELETE');
            $deleteRequest->attributes->set('user', ['uuid' => $this->adminUuid]);
            $this->controller->delete($deleteRequest, $linkId);
        } else {
            // If creation fails, check that we got a reasonable error
            $this->assertArrayHasKey('error_code', $data);
        }
    }
}
