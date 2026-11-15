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

use App\Helpers\ApiResponse;
use App\Helpers\RequestOrigin;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

class RequestOriginTest extends TestCase
{
    private const APP_URL = 'https://panel.example.com';

    public function testSameOriginWriteIsAllowed(): void
    {
        $r = $this->request('POST', '/api/admin/users', ['Origin' => 'https://panel.example.com']);
        $this->assertNull(RequestOrigin::guard($r, self::APP_URL));
    }

    public function testOtherSiteWriteIsRefused(): void
    {
        foreach (['POST', 'PUT', 'PATCH', 'DELETE'] as $method) {
            $r = $this->request($method, '/api/admin/users', ['Origin' => 'https://other.example.net']);
            $res = RequestOrigin::guard($r, self::APP_URL);
            $this->assertNotNull($res, $method);
            $this->assertSame(403, $res->getStatusCode());
            $this->assertSame('ORIGIN_NOT_ALLOWED', json_decode((string) $res->getContent(), true)['error_code']);
        }
    }

    public function testNullOriginIsRefused(): void
    {
        $r = $this->request('POST', '/api/user/session', ['Origin' => 'null']);
        $this->assertNotNull(RequestOrigin::guard($r, self::APP_URL));
    }

    public function testRefererIsUsedWithoutOrigin(): void
    {
        $ok = $this->request('POST', '/api/user/session', ['Referer' => 'https://panel.example.com/account']);
        $this->assertNull(RequestOrigin::guard($ok, self::APP_URL));

        $bad = $this->request('POST', '/api/user/session', ['Referer' => 'https://other.example.net/x']);
        $this->assertNotNull(RequestOrigin::guard($bad, self::APP_URL));
    }

    public function testRequestsOutsideTheCheckPass(): void
    {
        $other = ['Origin' => 'https://other.example.net'];
        // Reads.
        $this->assertNull(RequestOrigin::guard($this->request('GET', '/api/user/session', $other), self::APP_URL));
        // No session cookie (login, webhooks, daemon callbacks).
        $this->assertNull(RequestOrigin::guard($this->request('POST', '/api/webhooks/x', $other, []), self::APP_URL));
        // API key / Bearer.
        $this->assertNull(RequestOrigin::guard($this->request('POST', '/api/admin/users', $other + ['Authorization' => 'Bearer k']), self::APP_URL));
        // Non-browser client: neither Origin nor Referer.
        $this->assertNull(RequestOrigin::guard($this->request('POST', '/api/admin/users'), self::APP_URL));
    }

    public function testRequestHostCountsAsPanel(): void
    {
        // APP_URL unset or different: the host the browser sent the request to is the panel.
        $r = Request::create('http://10.0.0.5:8080/api/user/x', 'POST', [], ['remember_token' => 'a'], [], [
            'HTTP_HOST' => '10.0.0.5:8080',
            'HTTP_ORIGIN' => 'http://10.0.0.5:8080',
        ]);
        $this->assertNull(RequestOrigin::guard($r, 'https://panel.example.com'));

        $proxied = Request::create('http://backend/api/user/x', 'POST', [], ['remember_token' => 'a'], [], [
            'HTTP_HOST' => 'backend',
            'HTTP_X_FORWARDED_HOST' => 'panel.example.org',
            'HTTP_ORIGIN' => 'https://panel.example.org',
        ]);
        $this->assertNull(RequestOrigin::guard($proxied, 'https://panel.example.com'));
    }

    public function testCorsEchoesPanelOriginWithCredentials(): void
    {
        $r = $this->request('GET', '/api/user/session', ['Origin' => 'https://panel.example.com']);
        $res = RequestOrigin::applyCors($r, ApiResponse::success(), self::APP_URL);

        $this->assertSame('https://panel.example.com', $res->headers->get('Access-Control-Allow-Origin'));
        $this->assertSame('true', $res->headers->get('Access-Control-Allow-Credentials'));
        $this->assertContains('Origin', $res->getVary());
    }

    public function testCorsDropsCredentialsForOtherOrigins(): void
    {
        foreach (['https://other.example.net', null] as $origin) {
            $r = $this->request('GET', '/api/settings/public', $origin === null ? [] : ['Origin' => $origin], []);
            $res = RequestOrigin::applyCors($r, ApiResponse::success(), self::APP_URL);

            $this->assertSame('*', $res->headers->get('Access-Control-Allow-Origin'));
            $this->assertFalse($res->headers->has('Access-Control-Allow-Credentials'));
        }
    }

    public function testCorsNeedsTheExactOrigin(): void
    {
        foreach (['https://panel.example.com:8443', 'http://panel.example.com', 'https://sub.panel.example.com'] as $origin) {
            $r = $this->request('GET', '/api/user/session', ['Origin' => $origin]);
            $res = RequestOrigin::applyCors($r, ApiResponse::success(), self::APP_URL);

            $this->assertSame('*', $res->headers->get('Access-Control-Allow-Origin'), $origin);
            $this->assertFalse($res->headers->has('Access-Control-Allow-Credentials'), $origin);
        }

        // Explicit default port is the same origin.
        $r = $this->request('GET', '/api/user/session', ['Origin' => 'https://panel.example.com:443']);
        $this->assertTrue(RequestOrigin::isTrustedCorsOrigin('https://panel.example.com:443', $r, self::APP_URL));

        // Request origin behind a proxy (forwarded host and scheme).
        $proxied = Request::create('http://backend/api/user/x', 'GET', [], [], [], [
            'HTTP_HOST' => 'backend',
            'HTTP_X_FORWARDED_HOST' => 'panel.example.org',
            'HTTP_X_FORWARDED_PROTO' => 'https',
        ]);
        $this->assertTrue(RequestOrigin::isTrustedCorsOrigin('https://panel.example.org', $proxied, null));
        $this->assertFalse(RequestOrigin::isTrustedCorsOrigin('http://panel.example.org', $proxied, null));
    }

    public function testCorsLeavesOtherResponsesAlone(): void
    {
        $r = $this->request('GET', '/api/x', ['Origin' => 'https://other.example.net']);
        $res = RequestOrigin::applyCors($r, new Symfony\Component\HttpFoundation\Response('x'), self::APP_URL);
        $this->assertFalse($res->headers->has('Access-Control-Allow-Origin'));
    }

    /**
     * @param array<string, string> $headers
     * @param array<string, string> $cookies
     */
    private function request(string $method, string $path, array $headers = [], array $cookies = ['remember_token' => 'abc']): Request
    {
        $server = ['HTTP_HOST' => 'panel.example.com'];
        foreach ($headers as $name => $value) {
            $server['HTTP_' . strtoupper(str_replace('-', '_', $name))] = $value;
        }

        return Request::create('https://panel.example.com' . $path, $method, [], $cookies, [], $server);
    }
}
