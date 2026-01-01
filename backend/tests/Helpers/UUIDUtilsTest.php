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
