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

use App\Helpers\UUIDUtils;
use PHPUnit\Framework\TestCase;

class UUIDUtilsTest extends TestCase
{
    public function testGenerateV4ReturnsValidUUID()
    {
        $uuid = UUIDUtils::generateV4();
        $this->assertTrue(UUIDUtils::isValid($uuid));
        $this->assertEquals(4, UUIDUtils::getVersion($uuid));
    }

    public function testGenerateV4ReturnsUniqueValues()
    {
        $uuid1 = UUIDUtils::generateV4();
        $uuid2 = UUIDUtils::generateV4();
        $this->assertNotEquals($uuid1, $uuid2);
    }

    public function testGenerateV4FollowsUUIDFormat()
    {
        $uuid = UUIDUtils::generateV4();
        // Should match UUID pattern with dashes
        $this->assertMatchesRegularExpression('/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/', $uuid);
    }

    public function testGenerateV1ReturnsValidUUID()
    {
        $uuid = UUIDUtils::generateV1();
        $this->assertTrue(UUIDUtils::isValid($uuid));
        $this->assertEquals(1, UUIDUtils::getVersion($uuid));
    }

    public function testIsValidReturnsTrueForValidUUID()
    {
        $validUuid = '550e8400-e29b-41d4-a716-446655440000';
        $this->assertTrue(UUIDUtils::isValid($validUuid));
    }

    public function testIsValidReturnsFalseForInvalidUUID()
    {
        $this->assertFalse(UUIDUtils::isValid('invalid-uuid'));
        $this->assertFalse(UUIDUtils::isValid('not-a-uuid-at-all'));
        $this->assertFalse(UUIDUtils::isValid('550e8400-e29b-41d4-a716'));
        $this->assertFalse(UUIDUtils::isValid(''));
    }

    public function testIsValidWithVersionCheck()
    {
        $v4uuid = UUIDUtils::generateV4();
        $this->assertTrue(UUIDUtils::isValid($v4uuid, 4));
        $this->assertFalse(UUIDUtils::isValid($v4uuid, 1));
        $this->assertFalse(UUIDUtils::isValid($v4uuid, 2));
    }

    public function testGetVersionReturnsCorrectVersion()
    {
        $v4uuid = UUIDUtils::generateV4();
        $this->assertEquals(4, UUIDUtils::getVersion($v4uuid));

        $v1uuid = UUIDUtils::generateV1();
        $this->assertEquals(1, UUIDUtils::getVersion($v1uuid));
    }

    public function testGetVersionReturnsNullForInvalidUUID()
    {
        $this->assertNull(UUIDUtils::getVersion('invalid-uuid'));
        $this->assertNull(UUIDUtils::getVersion(''));
        $this->assertNull(UUIDUtils::getVersion('not-uuid'));
    }

    public function testFormatReturnsFormattedUUID()
    {
        $uuid = '550e8400e29b41d4a716446655440000';
        $formatted = UUIDUtils::format($uuid);
        $this->assertEquals('550e8400-e29b-41d4-a716-446655440000', $formatted);
    }

    public function testFormatHandlesUUIDWithBraces()
    {
        $uuid = '{550e8400-e29b-41d4-a716-446655440000}';
        $formatted = UUIDUtils::format($uuid);
        $this->assertEquals('550e8400-e29b-41d4-a716-446655440000', $formatted);
    }

    public function testFormatHandlesUUIDWithParentheses()
    {
        $uuid = '(550e8400-e29b-41d4-a716-446655440000)';
        $formatted = UUIDUtils::format($uuid);
        $this->assertEquals('550e8400-e29b-41d4-a716-446655440000', $formatted);
    }

    public function testFormatReturnsNullForInvalidUUID()
    {
        $this->assertNull(UUIDUtils::format('invalid'));
        $this->assertNull(UUIDUtils::format('too-short'));
        $this->assertNull(UUIDUtils::format('12345'));
    }

    public function testFormatHandlesUppercaseUUID()
    {
        $uuid = '550E8400-E29B-41D4-A716-446655440000';
        $formatted = UUIDUtils::format($uuid);
        $this->assertEquals('550e8400-e29b-41d4-a716-446655440000', $formatted);
    }
}
