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

namespace App\Tests\CloudFlare;

use PHPUnit\Framework\TestCase;
use App\CloudFlare\CloudFlareRealIP;
use PHPUnit\Framework\Attributes\DataProvider;

class CloudFlareRealIPTest extends TestCase
{
    private array $server = [];

    protected function setUp(): void
    {
        $this->server = $_SERVER;
        foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_X_CLIENT_IP', 'HTTP_CLIENT_IP'] as $key) {
            unset($_SERVER[$key]);
        }
    }

    protected function tearDown(): void
    {
        $_SERVER = $this->server;
    }

    /**
     * @return iterable<string, array{string, bool}>
     */
    public static function cloudflareAddresses(): iterable
    {
        yield 'cf v4 start of range' => ['173.245.48.0', true];
        yield 'cf v4 end of 104.24.0.0/14' => ['104.27.255.255', true];
        yield 'just after 104.24.0.0/14' => ['104.28.0.0', false];
        yield 'public v4' => ['8.8.8.8', false];
        yield 'cf v6' => ['2606:4700::1111', true];
        yield 'cf v6 /29' => ['2a06:98c7:ffff::1', true];
        yield 'just outside cf v6 /29' => ['2a06:98c8::1', false];
        yield 'neighbour of cf v6 /32' => ['2606:4701::1', false];
        yield 'public v6' => ['2001:4860:4860::8888', false];
        yield 'v4-mapped v6 is not v4' => ['::ffff:173.245.48.1', false];
        yield 'garbage' => ['not-an-ip', false];
        yield 'empty' => ['', false];
    }

    #[DataProvider('cloudflareAddresses')]
    public function testIsFromCloudflare(string $ip, bool $expected): void
    {
        $method = new \ReflectionMethod(CloudFlareRealIP::class, 'isFromCloudflare');
        $this->assertSame($expected, $method->invoke(null, $ip));
        // Memoised answer stays the same.
        $this->assertSame($expected, $method->invoke(null, $ip));
    }

    public function testConnectingIpHeaderTrustedOnlyFromCloudflarePeers(): void
    {
        $_SERVER['HTTP_CF_CONNECTING_IP'] = '198.51.100.7';

        $_SERVER['REMOTE_ADDR'] = '2606:4700::1';
        $this->assertSame('198.51.100.7', CloudFlareRealIP::getRealIP());

        $_SERVER['REMOTE_ADDR'] = '8.8.4.4';
        $this->assertSame('8.8.4.4', CloudFlareRealIP::getRealIP());
    }
}
