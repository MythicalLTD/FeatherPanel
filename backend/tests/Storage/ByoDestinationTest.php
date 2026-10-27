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

namespace Tests\Storage;

use PHPUnit\Framework\TestCase;
use App\Services\Storage\EndpointGuard;
use App\Services\Storage\StorageException;
use App\Services\Storage\StorageDestinationService;

final class ByoDestinationTest extends TestCase
{
    /** @var array<string, list<string>> */
    private array $dns = [];

    protected function setUp(): void
    {
        putenv(EndpointGuard::ENV_ALLOW_PRIVATE);
        unset($_ENV[EndpointGuard::ENV_ALLOW_PRIVATE], $_SERVER[EndpointGuard::ENV_ALLOW_PRIVATE]);
        $this->dns = [
            's3.example.com' => ['93.184.216.34'],
            'evil.example.com' => ['93.184.216.34', '10.0.0.5'],
            'meta.example.com' => ['169.254.169.254'],
            'v6.example.com' => ['::1'],
            'mapped.example.com' => ['::ffff:127.0.0.1'],
            'cgnat.example.com' => ['100.64.1.1'],
        ];
        EndpointGuard::$resolver = fn (string $h): array => $this->dns[$h] ?? (filter_var($h, FILTER_VALIDATE_IP) ? [$h] : []);
    }

    protected function tearDown(): void
    {
        EndpointGuard::$resolver = null;
    }

    public function testPinsPublicHost(): void
    {
        $opts = EndpointGuard::pin(['https://s3.example.com']);
        $this->assertSame(['s3.example.com:443:93.184.216.34'], $opts['curl'][CURLOPT_RESOLVE]);
    }

    /** @return iterable<string, array{string, string}> */
    public static function rejected(): iterable
    {
        yield 'http' => ['http://s3.example.com', 'ENDPOINT_NOT_HTTPS'];
        yield 'credentials' => ['https://a:b@s3.example.com', 'ENDPOINT_INVALID'];
        yield 'not a url' => ['s3.example.com', 'ENDPOINT_INVALID'];
        yield 'loopback ip' => ['https://127.0.0.1', 'ENDPOINT_PRIVATE_ADDRESS'];
        yield 'mixed answers' => ['https://evil.example.com', 'ENDPOINT_PRIVATE_ADDRESS'];
        yield 'metadata' => ['https://meta.example.com', 'ENDPOINT_PRIVATE_ADDRESS'];
        yield 'ipv6 loopback' => ['https://v6.example.com', 'ENDPOINT_PRIVATE_ADDRESS'];
        yield 'mapped v4' => ['https://mapped.example.com', 'ENDPOINT_PRIVATE_ADDRESS'];
        yield 'cgnat' => ['https://cgnat.example.com', 'ENDPOINT_PRIVATE_ADDRESS'];
        yield 'unresolvable' => ['https://nope.example.com', 'ENDPOINT_UNRESOLVABLE'];
    }

    /** @dataProvider rejected */
    public function testRejectsUnsafeEndpoints(string $url, string $code): void
    {
        $this->assertSame($code, $this->code(fn () => EndpointGuard::pin([$url])));
    }

    public function testNormalizeKeepsSecretAndValidates(): void
    {
        $existing = ['endpoint' => 'https://s3.example.com', 'bucket' => 'bk1', 'region' => 'eu-1', 'access_key' => 'AK', 'secret_key' => 'old', 'path_style' => true];
        $cfg = StorageDestinationService::normalizeS3Config(['name' => 'x', 'secret_key' => '', 'prefix' => '/a/b/'], $existing);
        $this->assertSame('old', $cfg['secret_key']);
        $this->assertSame('a/b', $cfg['prefix']);
        $this->assertSame('BUCKET_INVALID', $this->code(fn () => StorageDestinationService::normalizeS3Config(['bucket' => '!'] + $existing)));
        $this->assertSame('CREDENTIALS_REQUIRED', $this->code(fn () => StorageDestinationService::normalizeS3Config(['endpoint' => 'https://s3.example.com', 'bucket' => 'bb1'])));
        $this->assertSame('ENDPOINT_PRIVATE_ADDRESS', $this->code(fn () => StorageDestinationService::normalizeS3Config(['endpoint' => 'https://meta.example.com'], $existing)));
    }

    public function testDestinationIdFromPayload(): void
    {
        $this->assertSame(7, StorageDestinationService::destinationIdFromPayload('{"type":"files","destination_id":7}'));
        $this->assertNull(StorageDestinationService::destinationIdFromPayload('{"type":"files"}'));
        $this->assertNull(StorageDestinationService::destinationIdFromPayload('garbage'));
        $this->assertNull(StorageDestinationService::destinationIdFromPayload('{"destination_id":-3}'));
    }

    private function code(callable $fn): ?string
    {
        try {
            $fn();
        } catch (StorageException $e) {
            return $e->errorCode();
        }

        return null;
    }
}
