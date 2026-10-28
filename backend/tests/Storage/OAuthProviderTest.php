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

use GuzzleHttp\Client;
use GuzzleHttp\Middleware;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Psr7\Response;
use PHPUnit\Framework\TestCase;
use GuzzleHttp\Handler\MockHandler;
use App\Services\Storage\StorageException;
use App\Services\Storage\BackupStreamSigner;
use App\Services\Storage\Providers\ProviderHttp;
use App\Services\Storage\Providers\GoogleDriveProvider;

final class OAuthProviderTest extends TestCase
{
    private const BACKUP = ['uuid' => '0b1c2d3e-0000-4000-8000-00000000abcd', 'name' => 'Nightly world'];
    private const SERVER = ['uuid' => 'b70b70b7-0000-4000-8000-0000000000b1'];
    private const DEST = ['id' => 1, 'status' => 'active', 'config' => ''];
    /** @var list<array{request: \Psr\Http\Message\RequestInterface}> */
    private array $history = [];

    protected function tearDown(): void
    {
        ProviderHttp::$client = null;
        putenv(ProviderHttp::MOCK_ENV);
    }

    public function testMockUrlRewriteKeepsHostPathAndQuery(): void
    {
        $this->assertSame('https://www.googleapis.com/drive/v3/about?x=1', ProviderHttp::url('https://www.googleapis.com/drive/v3/about?x=1'));
        putenv(ProviderHttp::MOCK_ENV . '=http://127.0.0.1:9300/');
        $this->assertSame('http://127.0.0.1:9300/www.googleapis.com/drive/v3/about?x=1', ProviderHttp::url('https://www.googleapis.com/drive/v3/about?x=1'));
    }

    public function testDescribeIsShortAndSafe(): void
    {
        $this->assertSame('HTTP 400: Token has been expired or revoked.', ProviderHttp::describe(new Response(400, [], json_encode(['error' => 'invalid_grant', 'error_description' => 'Token has been expired or revoked.']))));
        $this->assertSame('HTTP 404: File not found', ProviderHttp::describe(new Response(404, [], json_encode(['error' => ['code' => 404, 'message' => 'File not found']]))));
        $this->assertSame('HTTP 502', ProviderHttp::describe(new Response(502, [], '<html>')));
    }

    public function testUnreachableProviderBecomesStorageException(): void
    {
        $this->mock([new \GuzzleHttp\Exception\ConnectException('down', new \GuzzleHttp\Psr7\Request('GET', 'https://x'))]);
        try {
            ProviderHttp::request('GET', 'https://www.googleapis.com/drive/v3/about');
            $this->fail('expected exception');
        } catch (StorageException $e) {
            $this->assertSame('PROVIDER_UNREACHABLE', $e->errorCode());
        }
    }

    public function testOpenUploadReturnsWingsResumablePayload(): void
    {
        $this->mock([
            new Response(200, [], json_encode(['files' => []])),
            new Response(200, ['Location' => 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=abc']),
        ]);
        $info = $this->drive()->openUpload(self::DEST, self::SERVER, self::BACKUP, 52441145);
        $this->assertSame('resumable', $info['adapter']);
        $this->assertSame('content-range', $info['protocol']);
        $this->assertSame('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=abc', $info['session_url']);
        $this->assertSame(52441145, $info['total_size']);
        $this->assertSame(0, $info['chunk_size'] % 262144);
        // The session URL carries its own authorization: no token is handed to Wings.
        $this->assertSame('{}', json_encode($info['headers']));

        $start = $this->history[1]['request'];
        $this->assertSame('POST', $start->getMethod());
        $this->assertStringContainsString('uploadType=resumable', (string) $start->getUri());
        $this->assertSame('52441145', $start->getHeaderLine('X-Upload-Content-Length'));
        $this->assertSame('Bearer cached-token', $start->getHeaderLine('Authorization'));
        $meta = json_decode((string) $start->getBody(), true);
        $this->assertSame('Nightly_world-0b1c2d3e.tar.gz', $meta['name']);
        $this->assertSame(self::BACKUP['uuid'], $meta['appProperties']['fp_backup']);
        $search = urldecode((string) $this->history[0]['request']->getUri());
        $this->assertStringContainsString("appProperties has { key='fp_backup' and value='" . self::BACKUP['uuid'] . "' }", $search);
    }

    public function testUnauthorizedIsRetriedOnceWithAFreshToken(): void
    {
        $this->mock([
            new Response(401, [], json_encode(['error' => ['code' => 401, 'message' => 'Invalid Credentials']])),
            new Response(200, [], json_encode(['user' => ['emailAddress' => 'a@example.com'], 'storageQuota' => ['limit' => '100', 'usage' => '40']])),
        ]);
        $p = $this->drive();
        $out = $p->test(self::DEST);
        $this->assertSame(['account' => 'a@example.com', 'quota' => ['used' => 40, 'total' => 100]], $out);
        $this->assertSame(1, $p->refreshes);
        $this->assertSame('Bearer fresh-token', $this->history[1]['request']->getHeaderLine('Authorization'));
    }

    public function testUnlimitedQuotaHasNoTotal(): void
    {
        $this->mock([new Response(200, [], json_encode(['user' => ['emailAddress' => 'w@example.com'], 'storageQuota' => ['usage' => '5']]))]);
        $this->assertSame(['used' => 5, 'total' => null], $this->drive()->test(self::DEST)['quota']);
    }

    public function testCompleteUploadVerifiesSizeAndSha1(): void
    {
        $sha = sha1('archive');
        $this->mock([new Response(200, [], json_encode(['files' => [['id' => 'F1', 'size' => '7', 'sha1Checksum' => $sha]]]))]);
        $this->assertSame('F1', $this->drive()->completeUpload(self::DEST, self::SERVER, self::BACKUP, 7, strtoupper($sha)));

        // Mismatch: the bad file is deleted and the backup fails.
        $this->mock([
            new Response(200, [], json_encode(['files' => [['id' => 'F2', 'size' => '7', 'sha1Checksum' => sha1('other')]]])),
            new Response(204),
        ]);
        try {
            $this->drive()->completeUpload(self::DEST, self::SERVER, self::BACKUP, 7, $sha);
            $this->fail('expected exception');
        } catch (StorageException $e) {
            $this->assertSame('REMOTE_CHECKSUM_MISMATCH', $e->errorCode());
        }
        $this->assertSame('DELETE', $this->history[1]['request']->getMethod());
        $this->assertStringEndsWith('/files/F2', $this->history[1]['request']->getUri()->getPath());
    }

    public function testRestoreSourceUsesBearerAndMediaUrl(): void
    {
        $src = $this->drive()->restoreSource(self::DEST, self::SERVER, self::BACKUP + ['remote_ref' => 'F9']);
        $this->assertSame('https://www.googleapis.com/drive/v3/files/F9?alt=media', $src['download_url']);
        $this->assertSame(['Authorization' => 'Bearer cached-token'], $src['headers']);
    }

    public function testDeleteToleratesMissingFile(): void
    {
        $this->mock([new Response(404, [], json_encode(['error' => ['code' => 404]]))]);
        $this->drive()->delete(self::DEST, self::SERVER, self::BACKUP + ['remote_ref' => 'gone']);
        $this->assertCount(1, $this->history);
    }

    public function testStreamSignatureRejectsTamperingAndExpiry(): void
    {
        $_ENV['DATABASE_ENCRYPTION_KEY'] = 'unit-test-key';
        $sign = new \ReflectionMethod(BackupStreamSigner::class, 'sign');
        $uuid = self::BACKUP['uuid'];
        $exp = time() + 60;
        $sig = $sign->invoke(null, $uuid, $exp);
        $this->assertTrue(BackupStreamSigner::verify($uuid, (string) $exp, $sig));
        $this->assertFalse(BackupStreamSigner::verify($uuid, (string) ($exp + 1), $sig));
        $this->assertFalse(BackupStreamSigner::verify('0b1c2d3e-0000-4000-8000-00000000abce', (string) $exp, $sig));
        $this->assertFalse(BackupStreamSigner::verify($uuid, (string) (time() - 1), $sign->invoke(null, $uuid, time() - 1)));
        $this->assertFalse(BackupStreamSigner::verify($uuid, 'soon', $sig));
        $this->assertFalse(BackupStreamSigner::verify($uuid, (string) $exp, null));
    }

    /** @param list<Response> $responses */
    private function mock(array $responses): void
    {
        $this->history = [];
        $stack = HandlerStack::create(new MockHandler($responses));
        $stack->push(Middleware::history($this->history));
        ProviderHttp::$client = new Client(['handler' => $stack, 'http_errors' => false]);
    }

    /** A Drive provider with a fixed access token, so no database row is needed. */
    private function drive(): GoogleDriveProvider
    {
        return new class () extends GoogleDriveProvider {
            public int $refreshes = 0;

            public function accessToken(array $dest, int $minLifetime = 120, bool $forceRefresh = false): string
            {
                if ($forceRefresh) {
                    ++$this->refreshes;
                }

                return $forceRefresh ? 'fresh-token' : 'cached-token';
            }
        };
    }
}
