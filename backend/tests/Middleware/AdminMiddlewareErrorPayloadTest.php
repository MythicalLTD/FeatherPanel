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

namespace App\Tests\Middleware;

use PHPUnit\Framework\TestCase;
use App\Helpers\PermissionHelper;
use App\Middleware\AdminMiddleware;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * When an admin route is refused, the error payload should only name the
 * permission that was required, not the authenticated user record.
 */
class AdminMiddlewareErrorPayloadTest extends TestCase
{
    protected function tearDown(): void
    {
        PermissionHelper::resetRequestCache();
        parent::tearDown();
    }

    public function testForbiddenResponseIncludesOnlyThePermissionName(): void
    {
        $passwordHash = 'unused-hash-marker';
        $rememberToken = 'unused-token-marker';
        $twoFaKey = 'unused-two-factor-marker';

        $user = [
            'uuid' => '11111111-1111-1111-1111-111111111111',
            'username' => 'fixture-user',
            'role_id' => 0,
            'password' => $passwordHash,
            'remember_token' => $rememberToken,
            'two_fa_key' => $twoFaKey,
        ];

        PermissionHelper::rememberUser($user);

        $request = Request::create('/api/admin/users', 'GET');
        $request->attributes->set('user', $user);
        $request->attributes->set('permission', 'admin.users.view');

        $response = (new AdminMiddleware())->handle($request, static function (): Response {
            return new Response('should-not-run');
        });

        $this->assertSame(403, $response->getStatusCode());

        $body = $response->getContent();
        $this->assertIsString($body);
        $this->assertStringNotContainsString('remember_token', $body);
        $this->assertStringNotContainsString($passwordHash, $body);
        $this->assertStringNotContainsString($rememberToken, $body);
        $this->assertStringNotContainsString($twoFaKey, $body);

        $payload = json_decode($body, true);
        $this->assertIsArray($payload);
        $this->assertSame('NOT_AUTHORIZED', $payload['error_code']);
        $this->assertSame(['permission' => 'admin.users.view'], $payload['data']);
        $this->assertArrayNotHasKey('user', $payload['data']);
        $this->assertArrayNotHasKey('userId', $payload['data']);
        $this->assertArrayNotHasKey('remember_token', $payload['data']);
    }
}
