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
use App\Helpers\ChunkedUploadStore;

class ChunkedUploadStoreTest extends TestCase
{
    private string $base;
    private ChunkedUploadStore $store;

    protected function setUp(): void
    {
        $this->base = sys_get_temp_dir() . '/fp-chunk-test-' . bin2hex(random_bytes(4));
        $this->store = new ChunkedUploadStore($this->base);
    }

    protected function tearDown(): void
    {
        exec('rm -rf ' . escapeshellarg($this->base));
    }

    public function testFullFlowWithResumeAndChecksum(): void
    {
        $dir = $this->store->dirFor('ws', 'u1', 'upload-00000001');
        $this->assertSame(false, $this->store->status($dir, 4)[1]['exists']);
        $this->assertSame([200, ['offset' => 4, 'total_size' => 10]], $this->put($dir, 'abcd', 0, 10));
        // ahead of stored data -> 409 with the real offset
        [$s, $b] = $this->put($dir, 'ijkl', 8, 10);
        $this->assertSame(409, $s);
        $this->assertSame(4, $b['offset']);
        // repeated part is acknowledged
        $this->assertSame(200, $this->put($dir, 'abcd', 0, 10)[0]);
        $this->assertSame(4, $this->store->status($dir, 4)[1]['offset']);
        $this->put($dir, 'efgh', 4, 10);
        $this->assertSame(409, $this->store->complete($dir, null, fn () => [200, []])[0]);
        $this->put($dir, 'ij', 8, 10);

        $this->assertSame(422, $this->store->complete($dir, str_repeat('0', 64), fn () => [200, []])[0]);
        $got = null;
        [$s, $b] = $this->store->complete($dir, hash('sha256', 'abcdefghij'), function (string $p, array $m) use (&$got) {
            $got = file_get_contents($p);

            return [200, []];
        });
        $this->assertSame(200, $s);
        $this->assertSame('abcdefghij', $got);
        $this->assertSame('/a.txt', $b['file']);
        $this->assertDirectoryDoesNotExist($dir);
    }

    public function testFailedDeliveryKeepsStaging(): void
    {
        $dir = $this->store->dirFor('ws', 'u1', 'upload-00000002');
        $this->put($dir, 'ab', 0, 2);
        $this->assertSame(507, $this->store->complete($dir, null, fn () => [507, ['error' => 'quota']])[0]);
        $this->assertDirectoryExists($dir);
    }

    public function testRejectsOversizedChunksAndFiles(): void
    {
        $dir = $this->store->dirFor('ws', 'u1', 'upload-00000003');
        $this->assertSame(413, $this->put($dir, 'abcdef', 0, 10)[0]);
        $this->assertSame(413, $this->put($dir, 'ab', 0, 100, 4, 'u1', 50)[0]);
        // past total_size
        $this->put($dir, 'ab', 0, 3);
        $this->assertSame(413, $this->put($dir, 'cd', 2, 3)[0]);
        $this->assertSame(2, $this->store->status($dir, 4)[1]['offset']);
        // total_size change
        $this->assertSame(409, $this->put($dir, 'c', 2, 4)[0]);
    }

    public function testUnsafeFileNameRejected(): void
    {
        $dir = $this->store->dirFor('ws', 'u1', 'upload-00000004');
        $r = $this->store->append($dir, 'u1', '../x', '/', 2, 0, $this->stream('ab'), 2, 4);
        $this->assertSame(400, $r[0]);
    }

    public function testPerUserCapAndCancel(): void
    {
        for ($i = 0; $i < ChunkedUploadStore::MAX_OPEN_PER_USER; ++$i) {
            $this->assertSame(200, $this->put($this->store->dirFor('ws', 'u1', "upload-cap-$i"), 'a', 0, 2)[0]);
        }
        $extra = $this->store->dirFor('ws', 'u1', 'upload-cap-x');
        $this->assertSame(429, $this->put($extra, 'a', 0, 2)[0]);
        $this->assertSame(200, $this->put($this->store->dirFor('ws', 'u2', 'upload-cap-x'), 'a', 0, 2, 4, 'u2')[0]);
        $this->store->cancel($this->store->dirFor('ws', 'u1', 'upload-cap-0'));
        $this->assertSame(200, $this->put($extra, 'a', 0, 2)[0]);
    }

    public function testScopedPerUserAndCleanup(): void
    {
        $this->assertNotSame($this->store->dirFor('ws', 'u1', 'upload-1234'), $this->store->dirFor('ws', 'u2', 'upload-1234'));
        $dir = $this->store->dirFor('ws', 'u1', 'upload-old-1');
        $this->put($dir, 'a', 0, 2);
        $this->assertSame(0, $this->store->cleanupStale());
        $this->assertSame(1, $this->store->cleanupStale(time() + ChunkedUploadStore::EXPIRY_SECONDS + 1));
        $this->assertDirectoryDoesNotExist($dir);
    }

    public function testChunkSizeAndIds(): void
    {
        $this->assertSame(50 * 1048576, ChunkedUploadStore::chunkSizeBytes('50', '0'));
        $this->assertSame(90 * 1048576, ChunkedUploadStore::chunkSizeBytes('500', '1G'));
        $this->assertSame(5 * 1048576, ChunkedUploadStore::chunkSizeBytes('1', '0'));
        $this->assertSame(8 * 1048576 - 65536, ChunkedUploadStore::chunkSizeBytes('50', '8M'));
        $this->assertTrue(ChunkedUploadStore::isValidId('abc_DEF-123'));
        $this->assertFalse(ChunkedUploadStore::isValidId('../../etc'));
        $this->assertFalse(ChunkedUploadStore::isValidId('short'));
    }

    /** @return resource */
    private function stream(string $s)
    {
        $h = fopen('php://memory', 'w+');
        fwrite($h, $s);
        rewind($h);

        return $h;
    }

    private function put(string $dir, string $data, int $offset, int $total, int $max = 4, string $user = 'u1', ?int $maxTotal = null): array
    {
        return $this->store->append($dir, $user, 'a.txt', '/', $total, $offset, $this->stream($data), strlen($data), $max, $maxTotal);
    }
}
