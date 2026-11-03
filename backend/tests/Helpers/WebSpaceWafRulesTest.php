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

use App\Helpers\WebSpaceWafRules;
use PHPUnit\Framework\TestCase;

class WebSpaceWafRulesTest extends TestCase
{
    public function testAcceptsOrdinaryPaths(): void
    {
        foreach (['/', '/wp-login.php', '/admin/*', '/a/b-c_d.e~f', '/search%20x', '/user@host=1+2'] as $path) {
            $this->assertTrue(WebSpaceWafRules::isValidPath($path), $path);
        }
    }

    public function testRejectsTrailingNewlineAndOtherLineBreaks(): void
    {
        // "$" without the D modifier also matches before a final newline, which would add a
        // line to the generated proxy configuration.
        foreach (["/a\n", "/a\r\n", "/a\n/b", "/a\rb", "/\n"] as $path) {
            $this->assertFalse(WebSpaceWafRules::isValidPath($path), json_encode($path));
        }
    }

    public function testRejectsUnsafePaths(): void
    {
        foreach (['', 'a', '/a b', '/a"b', "/a`b", '/a{b}', '/a;b', '/../etc', '/a/../b', '/.well-known/acme-challenge/x', '/.WELL-KNOWN/x', str_repeat('a', 300)] as $path) {
            $this->assertFalse(WebSpaceWafRules::isValidPath($path), $path);
        }
    }

    public function testIpValidationRejectsLineBreaksAndGarbage(): void
    {
        foreach (["203.0.113.4\n", "203.0.113.4/24\n", "203.0.113.4/24\nproxy_pass x", '203.0.113.4/33', '203.0.113.4/', '::1/129', 'evil.example', '', '203.0.113.4 '] as $ip) {
            $this->assertFalse(WebSpaceWafRules::isValidIp($ip), json_encode($ip));
        }
        foreach (['203.0.113.7', '198.51.100.0/24', '2001:db8::/32', '::1'] as $ip) {
            $this->assertTrue(WebSpaceWafRules::isValidIp($ip), $ip);
        }
    }
}
