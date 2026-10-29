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

namespace Tests\Helpers;

use App\Permissions;
use App\SubuserPermissions;
use PHPUnit\Framework\TestCase;
use App\Helpers\SubuserPermissionChecker as C;

/**
 * Regression: hasPermission() treated every account without a subuser row as the owner,
 * so e.g. the chatbot database tool could show passwords to anyone who got past a gateway.
 */
final class SubuserPermissionCheckerTest extends TestCase
{
    private const SERVER = 10;
    private const OWNER = 1;
    private const SUB = 2;
    private const STRANGER = 3;
    private const ADMIN = 4;
    private const ROOT = 5;
    private const SUPPORT = 6;

    protected function setUp(): void
    {
        C::$ownerResolver = fn (int $sid): ?int => $sid === self::SERVER ? self::OWNER : null;
        C::$subuserResolver = fn (int $uid, int $sid): ?array => ($uid === self::SUB && $sid === self::SERVER)
            ? ['permissions' => json_encode([SubuserPermissions::FILE_READ])] : null;
        C::$roleNodesResolver = fn (int $uid): array => match ($uid) {
            self::ADMIN => [Permissions::ADMIN_SERVERS_EDIT],
            self::ROOT => ['admin.root'],
            self::SUPPORT => ['admin.users.list'],
            default => [],
        };
    }

    protected function tearDown(): void
    {
        C::$ownerResolver = C::$subuserResolver = C::$roleNodesResolver = null;
    }

    public function testOwnerHasEverything(): void
    {
        $this->assertTrue(C::hasPermission(self::OWNER, self::SERVER, SubuserPermissions::DATABASE_VIEW_PASSWORD));
        $this->assertNull(C::getPermissions(self::OWNER, self::SERVER));
    }

    public function testServerAdminsHaveEverything(): void
    {
        foreach ([self::ADMIN, self::ROOT] as $u) {
            $this->assertTrue(C::hasPermission($u, self::SERVER, SubuserPermissions::DATABASE_VIEW_PASSWORD));
            $this->assertTrue(C::canAssignPermissions($u, self::SERVER, [SubuserPermissions::FILE_DELETE]));
        }
    }

    public function testSubuserOnlyHasGrantedPermissions(): void
    {
        $this->assertTrue(C::hasPermission(self::SUB, self::SERVER, SubuserPermissions::FILE_READ));
        $this->assertFalse(C::hasPermission(self::SUB, self::SERVER, SubuserPermissions::DATABASE_VIEW_PASSWORD));
    }

    public function testStrangersAndOtherStaffGetNothing(): void
    {
        foreach ([self::STRANGER, self::SUPPORT, 0] as $u) {
            $this->assertFalse(C::hasPermission($u, self::SERVER, SubuserPermissions::DATABASE_VIEW_PASSWORD));
            $this->assertFalse(C::hasAnyPermission($u, self::SERVER, [SubuserPermissions::FILE_READ]));
            $this->assertSame([], C::getPermissions($u, self::SERVER));
            $this->assertFalse(C::canAssignPermissions($u, self::SERVER, [SubuserPermissions::FILE_READ]));
        }
        $this->assertFalse(C::hasPermission(self::OWNER, 999, SubuserPermissions::FILE_READ), 'unknown server');
    }
}
