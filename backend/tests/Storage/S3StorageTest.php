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
use App\Services\Storage\S3SigV4;
use GuzzleHttp\Handler\MockHandler;
use App\Services\Storage\S3ObjectStore;

final class S3StorageTest extends TestCase
{
    /** Reference values produced by botocore (boto3) generate_presigned_url with the same inputs. */
    public function testPresignMatchesBotocoreForUploadPart(): void
    {
        $t = gmmktime(23, 7, 26, 10, 27, 2026);
        $s = new S3SigV4('AKIDEXAMPLE', 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY', 'eu-central-1');
        $url = $s->presign('PUT', 'https://s3.example.com/my-bucket/backups/srv%20uuid/b.tar.gz', ['partNumber' => '3', 'uploadId' => 'abc/def+=='], 3600, $t);
        $this->assertStringEndsWith('X-Amz-Signature=979b51a754509065a43157e62f0c8a82987148ee4813689b52b059f648c4c1c5', $url);
        $this->assertStringContainsString('uploadId=abc%2Fdef%2B%3D%3D', $url);
    }

    public function testPresignMatchesBotocoreForGetWithDisposition(): void
    {
        $t = gmmktime(23, 7, 26, 10, 27, 2026);
        $s = new S3SigV4('AKIDEXAMPLE', 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY', 'eu-central-1');
        $url = $s->presign('GET', 'https://s3.example.com/my-bucket/backups/a/b.tar.gz', ['response-content-disposition' => 'attachment; filename="My_Backup.tar.gz"'], 600, $t);
        $this->assertStringEndsWith('X-Amz-Signature=4bc639798cc237c95dcf25dd703e7a2b6a78e8a46e368bf5e65546535a8f3a95', $url);
    }

    public function testPartSizeRespectsS3Limits(): void
    {
        $this->assertSame(S3ObjectStore::MIN_PART_SIZE, S3ObjectStore::choosePartSize(100, 1024));
        $this->assertSame(100 * 1048576, S3ObjectStore::choosePartSize(1024 * 1048576, 100 * 1048576));
        $huge = 2 * 1024 * 1024 * 1048576; // 2 TiB
        $part = S3ObjectStore::choosePartSize($huge, 5 * 1048576);
        $this->assertLessThanOrEqual(S3ObjectStore::MAX_PARTS, (int) ceil($huge / $part));
        $this->assertSame(0, $part % 1048576);
    }

    public function testMultipartLifecycleSendsSignedRequests(): void
    {
        $history = [];
        $mock = new MockHandler([
            new Response(200, [], '<InitiateMultipartUploadResult><UploadId>UP-1</UploadId></InitiateMultipartUploadResult>'),
            new Response(200, [], '<CompleteMultipartUploadResult><ETag>"x"</ETag></CompleteMultipartUploadResult>'),
            new Response(204),
        ]);
        $stack = HandlerStack::create($mock);
        $stack->push(Middleware::history($history));
        $store = new S3ObjectStore(['endpoint' => 'https://s3.test', 'bucket' => 'b', 'prefix' => 'pre', 'access_key' => 'k', 'secret_key' => 's'], [], new Client(['handler' => $stack, 'http_errors' => false]));

        $key = $store->keyFor('srv/bk.tar.gz');
        $this->assertSame('pre/srv/bk.tar.gz', $key);
        $this->assertSame('UP-1', $store->createMultipartUpload($key));
        $store->completeMultipartUpload($key, 'UP-1', [['etag' => 'e2', 'part_number' => 2], ['etag' => '"e1"', 'part_number' => 1]]);
        $store->abortMultipartUpload($key, 'UP-1');

        $this->assertSame('POST', $history[0]['request']->getMethod());
        $this->assertSame('https://s3.test/b/pre/srv/bk.tar.gz?uploads=', (string) $history[0]['request']->getUri());
        $this->assertStringStartsWith('AWS4-HMAC-SHA256 Credential=k/', $history[0]['request']->getHeaderLine('authorization'));
        $body = (string) $history[1]['request']->getBody();
        $this->assertLessThan(strpos($body, '<PartNumber>2'), strpos($body, '<PartNumber>1'), 'parts must be sorted');
        $this->assertStringContainsString('<ETag>"e1"</ETag>', $body);
        $this->assertSame('DELETE', $history[2]['request']->getMethod());
    }

    public function testCompleteFailsOnErrorBodyWith200(): void
    {
        $mock = new MockHandler([new Response(200, [], '<Error><Code>InvalidPart</Code><Message>bad etag</Message></Error>')]);
        $store = new S3ObjectStore(['bucket' => 'b', 'access_key' => 'k', 'secret_key' => 's'], [], new Client(['handler' => HandlerStack::create($mock), 'http_errors' => false]));
        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('InvalidPart');
        $store->completeMultipartUpload('k', 'u', [['etag' => 'x', 'part_number' => 1]]);
    }

    public function testRejectsNonHttpEndpoint(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        new S3ObjectStore(['endpoint' => 'file:///etc', 'bucket' => 'b', 'access_key' => 'k', 'secret_key' => 's']);
    }

    public function testVirtualHostedUrl(): void
    {
        $store = new S3ObjectStore(['endpoint' => 'https://s3.eu-central-1.amazonaws.com', 'bucket' => 'bk', 'access_key' => 'k', 'secret_key' => 's', 'path_style' => 'false']);
        $this->assertSame('https://bk.s3.eu-central-1.amazonaws.com/a%20b/c', $store->objectUrl('a b/c'));
    }
}
