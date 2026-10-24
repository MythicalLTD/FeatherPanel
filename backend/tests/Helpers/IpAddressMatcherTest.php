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

use PHPUnit\Framework\TestCase;
use App\Helpers\IpAddressMatcher;
use PHPUnit\Framework\Attributes\DataProvider;

class IpAddressMatcherTest extends TestCase
{
    /**
     * @return iterable<string, array{string, ?string, bool}>
     */
    public static function allowedListCases(): iterable
    {
        // Empty / null allow-list means no restriction.
        yield 'null list allows anything' => ['8.8.8.8', null, true];
        yield 'empty string allows anything' => ['8.8.8.8', '', true];
        yield 'whitespace-only list allows anything' => ['8.8.8.8', "  \n\t ", true];
        yield 'null list allows even invalid client ip' => ['not-an-ip', null, true];

        // Exact IPv4 match.
        yield 'exact ipv4 match' => ['192.168.1.10', '192.168.1.10', true];
        yield 'exact ipv4 no match' => ['192.168.1.11', '192.168.1.10', false];

        // IPv4 CIDR boundaries.
        yield 'ipv4 cidr first address' => ['10.0.0.0', '10.0.0.0/24', true];
        yield 'ipv4 cidr inside' => ['10.0.0.128', '10.0.0.0/24', true];
        yield 'ipv4 cidr last address' => ['10.0.0.255', '10.0.0.0/24', true];
        yield 'ipv4 cidr just outside' => ['10.0.1.0', '10.0.0.0/24', false];
        yield 'ipv4 cidr different subnet' => ['192.168.0.1', '10.0.0.0/24', false];

        // Edge prefixes.
        yield 'ipv4 /0 matches everything' => ['203.0.113.9', '0.0.0.0/0', true];
        yield 'ipv4 /32 matches only itself' => ['1.2.3.4', '1.2.3.4/32', true];
        yield 'ipv4 /32 rejects neighbour' => ['1.2.3.5', '1.2.3.4/32', false];
        yield 'ipv6 /0 matches everything' => ['2001:db8::1', '::/0', true];
        yield 'ipv6 /128 matches only itself' => ['2001:db8::1', '2001:db8::1/128', true];
        yield 'ipv6 /128 rejects neighbour' => ['2001:db8::2', '2001:db8::1/128', false];

        // IPv6 exact and CIDR.
        yield 'exact ipv6 match' => ['::1', '::1', true];
        yield 'ipv6 compressed equals full form' => ['2001:db8::1', '2001:0db8:0000:0000:0000:0000:0000:0001', true];
        yield 'ipv6 cidr inside' => ['2001:db8:abcd::1', '2001:db8::/32', true];
        yield 'ipv6 cidr outside' => ['2001:db9::1', '2001:db8::/32', false];

        // Multiple rules, mixed separators.
        yield 'match second rule in list' => ['5.6.7.8', "1.2.3.4\n5.6.7.8", true];
        yield 'comma separated list' => ['5.6.7.8', '1.2.3.4,5.6.7.8', true];
        yield 'semicolon separated list' => ['5.6.7.8', '1.2.3.4;5.6.7.8', true];
        yield 'no rule matches' => ['9.9.9.9', "1.2.3.4\n5.6.7.8\n10.0.0.0/8", false];

        // Invalid input.
        yield 'invalid client ip with non-empty list' => ['999.1.1.1', '1.2.3.4', false];
        yield 'garbage client ip with non-empty list' => ['abc', '1.2.3.4', false];
        yield 'invalid rule never matches' => ['1.2.3.4', '999.1.1.1', false];
        yield 'invalid cidr mask never matches' => ['10.0.0.5', '10.0.0.0/33', false];

        // IPv4-mapped IPv6 does not match IPv4 rules (current behaviour).
        yield 'ipv4-mapped ipv6 vs ipv4 rule' => ['::ffff:1.2.3.4', '1.2.3.4', false];
        yield 'ipv4-mapped ipv6 vs ipv4 cidr' => ['::ffff:10.0.0.5', '10.0.0.0/24', false];
        yield 'ipv4-mapped ipv6 vs ipv6 cidr' => ['::ffff:1.2.3.4', '::ffff:1.2.3.0/120', true];
    }

    #[DataProvider('allowedListCases')]
    public function testClientMatchesAllowedList(string $clientIp, ?string $allowedIpsRaw, bool $expected): void
    {
        $this->assertSame($expected, IpAddressMatcher::clientMatchesAllowedList($clientIp, $allowedIpsRaw));
    }

    /**
     * @return iterable<string, array{string, list<string>}>
     */
    public static function ruleListCases(): iterable
    {
        yield 'single ip' => ['1.2.3.4', ['1.2.3.4']];
        yield 'newline separated' => ["1.2.3.4\n5.6.7.8", ['1.2.3.4', '5.6.7.8']];
        yield 'comma separated' => ['1.2.3.4,5.6.7.8', ['1.2.3.4', '5.6.7.8']];
        yield 'semicolon separated' => ['1.2.3.4;5.6.7.8', ['1.2.3.4', '5.6.7.8']];
        yield 'mixed separators' => ["1.2.3.4, 5.6.7.8\n9.9.9.9 ; 10.0.0.0/8", ['1.2.3.4', '5.6.7.8', '9.9.9.9', '10.0.0.0/8']];
        yield 'duplicates removed, order preserved' => ['1.2.3.4,5.6.7.8,1.2.3.4', ['1.2.3.4', '5.6.7.8']];
        yield 'empty string' => ['', []];
        yield 'only separators' => [" , ; \n ", []];
    }

    #[DataProvider('ruleListCases')]
    public function testParseRuleList(string $raw, array $expected): void
    {
        $this->assertSame($expected, IpAddressMatcher::parseRuleList($raw));
    }

    /**
     * @return iterable<string, array{?string, string}>
     */
    public static function normalizeCases(): iterable
    {
        yield 'null' => [null, ''];
        yield 'empty string' => ['', ''];
        yield 'whitespace only' => ["  \n ", ''];
        yield 'comma list to newlines' => ['1.2.3.4,5.6.7.8', "1.2.3.4\n5.6.7.8"];
        yield 'strips extra whitespace' => ["  1.2.3.4 , \n 5.6.7.8  ", "1.2.3.4\n5.6.7.8"];
        yield 'deduplicates' => ['1.2.3.4,1.2.3.4', '1.2.3.4'];
    }

    #[DataProvider('normalizeCases')]
    public function testNormalizeAllowedIpsInput(?string $raw, string $expected): void
    {
        $this->assertSame($expected, IpAddressMatcher::normalizeAllowedIpsInput($raw));
    }

    /**
     * @return iterable<string, array{?string, ?string}>
     */
    public static function validationCases(): iterable
    {
        yield 'null is valid' => [null, null];
        yield 'empty is valid' => ['', null];
        yield 'whitespace is valid' => ['   ', null];
        yield 'single ipv4' => ['1.2.3.4', null];
        yield 'ipv4 cidr' => ['10.0.0.0/24', null];
        yield 'ipv6 cidr' => ['2001:db8::/32', null];
        yield 'mixed valid list' => ["1.2.3.4\n10.0.0.0/8, ::1", null];
        yield 'invalid ipv4' => ['999.1.1.1', 'Invalid IP address or CIDR: 999.1.1.1'];
        yield 'cidr mask out of range' => ['10.0.0.0/33', 'Invalid IP address or CIDR: 10.0.0.0/33'];
        yield 'garbage' => ['abc', 'Invalid IP address or CIDR: abc'];
        yield 'valid then invalid reports invalid entry' => ['1.2.3.4,bogus', 'Invalid IP address or CIDR: bogus'];
    }

    #[DataProvider('validationCases')]
    public function testValidateAllowedIpsInput(?string $raw, ?string $expectedError): void
    {
        $this->assertSame($expectedError, IpAddressMatcher::validateAllowedIpsInput($raw));
    }

    public function testValidateAllowedIpsInputRejectsOverlongInput(): void
    {
        $raw = str_repeat('1.2.3.4 ', IpAddressMatcher::MAX_ALLOWED_IPS_LENGTH);
        $this->assertSame('Allowed IPs list is too long', IpAddressMatcher::validateAllowedIpsInput($raw));
    }

    public function testValidateAllowedIpsInputRejectsTooManyEntries(): void
    {
        $entries = array_map(static fn (int $i): string => "10.0.0.$i", range(0, IpAddressMatcher::MAX_ALLOWED_IPS_ENTRIES));
        $raw = implode(',', $entries);
        $this->assertSame(
            'Too many allowed IP entries (maximum ' . IpAddressMatcher::MAX_ALLOWED_IPS_ENTRIES . ')',
            IpAddressMatcher::validateAllowedIpsInput($raw)
        );
    }

    /**
     * @return iterable<string, array{string, string, bool}>
     */
    public static function matchRuleCases(): iterable
    {
        yield 'exact ipv4' => ['1.2.3.4', '1.2.3.4', true];
        yield 'exact ipv4 mismatch' => ['1.2.3.4', '1.2.3.5', false];
        yield 'exact ipv6' => ['::1', '::1', true];
        yield 'ipv4 cidr in range' => ['10.0.0.5', '10.0.0.0/24', true];
        yield 'ipv4 cidr out of range' => ['10.0.1.5', '10.0.0.0/24', false];
        yield 'ipv6 cidr in range' => ['2001:db8::1', '2001:db8::/32', true];
        yield 'ipv6 cidr out of range' => ['2001:db9::1', '2001:db8::/32', false];
        yield 'ipv4 vs ipv6 rule' => ['1.2.3.4', '::1', false];
        yield 'ipv6 vs ipv4 cidr' => ['2001:db8::1', '10.0.0.0/8', false];
        yield 'invalid rule' => ['1.2.3.4', 'abc', false];
        yield 'invalid mask rejected' => ['10.0.0.5', '10.0.0.0/33', false];
    }

    #[DataProvider('matchRuleCases')]
    public function testMatchesRule(string $clientIp, string $rule, bool $expected): void
    {
        $this->assertSame($expected, IpAddressMatcher::matchesRule($clientIp, $rule));
    }

    /**
     * @return iterable<string, array{string, bool}>
     */
    public static function ipOrCidrValidityCases(): iterable
    {
        yield 'ipv4' => ['1.2.3.4', true];
        yield 'ipv6' => ['2001:db8::1', true];
        yield 'ipv4 cidr' => ['10.0.0.0/24', true];
        yield 'ipv4 /0' => ['0.0.0.0/0', true];
        yield 'ipv4 /32' => ['1.2.3.4/32', true];
        yield 'ipv6 /0' => ['::/0', true];
        yield 'ipv6 /128' => ['::1/128', true];
        yield 'ipv4 mask too big' => ['10.0.0.0/33', false];
        yield 'ipv4 negative mask' => ['10.0.0.0/-1', false];
        yield 'ipv6 mask too big' => ['::1/129', false];
        yield 'invalid ipv4' => ['999.1.1.1', false];
        yield 'garbage' => ['abc', false];
        yield 'non-numeric mask' => ['1.2.3.4/abc', false];
        yield 'empty mask' => ['1.2.3.4/', false];
        yield 'invalid cidr ip part' => ['999.1.1.1/24', false];
        yield 'empty string' => ['', false];
    }

    #[DataProvider('ipOrCidrValidityCases')]
    public function testIsValidIpOrCidr(string $ipOrCidr, bool $expected): void
    {
        $this->assertSame($expected, IpAddressMatcher::isValidIpOrCidr($ipOrCidr));
    }
}
