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

use App\Runtime\RequestContext;
use PHPUnit\Framework\TestCase;
use App\Helpers\PermissionHelper;

/**
 * The authenticated user's role is memoised for one request only, so a
 * long-running worker never applies one request's role to the next.
 */
class PermissionHelperMemoTest extends TestCase
{
    protected function setUp(): void
    {
        RequestContext::begin();
        PermissionHelper::resetRequestCache();
    }

    public function testRememberedUserIsUsedWithinTheRequest(): void
    {
        $this->seedRole(91, ['admin.tickets.view']);
        PermissionHelper::rememberUser(['uuid' => 'u-1', 'role_id' => 91]);

        $this->assertTrue(PermissionHelper::hasPermission('u-1', 'admin.tickets.view'));
        $this->assertFalse(PermissionHelper::hasPermission('u-1', 'admin.users.edit'));
        $this->assertSame(91, $this->memo('userRoleCache')['u-1'] ?? null);
    }

    public function testMemoIsDroppedWhenTheNextRequestStarts(): void
    {
        PermissionHelper::rememberUser(['uuid' => 'u-1', 'role_id' => 91]);
        RequestContext::begin();

        // The first use in the new request resets the memo before adding to it.
        PermissionHelper::rememberUser(['uuid' => 'u-9', 'role_id' => 5]);
        $this->assertSame(['u-9' => 5], $this->memo('userRoleCache'));
    }

    public function testRoleChangesAreNotServedFromTheMemo(): void
    {
        PermissionHelper::rememberUser(['uuid' => 'u-2', 'role_id' => 4]);
        PermissionHelper::forgetUser('u-2');
        $this->assertArrayNotHasKey('u-2', $this->memo('userRoleCache'));
    }

    public function testExplicitUserRowWins(): void
    {
        $this->seedRole(92, ['admin.root']);
        PermissionHelper::rememberUser(['uuid' => 'u-3', 'role_id' => 91]);

        $this->assertTrue(PermissionHelper::hasPermission('u-3', 'anything', ['uuid' => 'u-3', 'role_id' => 92]));
    }

    public function testRowsWithoutUsableRoleAreIgnored(): void
    {
        PermissionHelper::rememberUser(['uuid' => 'u-4']);
        PermissionHelper::rememberUser(['uuid' => 'u-5', 'role_id' => 'x']);
        $this->assertArrayNotHasKey('u-4', $this->memo('userRoleCache'));
        $this->assertArrayNotHasKey('u-5', $this->memo('userRoleCache'));
    }

    /**
     * @param list<string> $nodes
     */
    private function seedRole(int $roleId, array $nodes): void
    {
        PermissionHelper::rememberUser(['uuid' => 'seed', 'role_id' => $roleId]); // sync the generation
        $property = new \ReflectionProperty(PermissionHelper::class, 'rolePermissionCache');
        $cache = $property->getValue();
        $cache[$roleId] = $nodes;
        $property->setValue(null, $cache);
    }

    private function memo(string $name): array
    {
        return (new \ReflectionProperty(PermissionHelper::class, $name))->getValue();
    }
}
