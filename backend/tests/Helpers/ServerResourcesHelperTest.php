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

use PHPUnit\Framework\TestCase;
use App\Helpers\ServerResourcesHelper;

class ServerResourcesHelperTest extends TestCase
{
    private const UUID = 'AAAAAAAA-1111-2222-3333-444444444444';

    public function testParsesUsageAndDropsConfiguration(): void
    {
        $parsed = ServerResourcesHelper::parseServerList([$this->wingsServer(self::UUID)]);

        $this->assertArrayHasKey(strtolower(self::UUID), $parsed);
        $usage = $parsed[strtolower(self::UUID)];
        $this->assertSame('running', $usage['state']);
        $this->assertSame(42.5, $usage['cpu_absolute']);
        $this->assertSame(536870912, $usage['memory_bytes']);
        $this->assertSame(2147483648, $usage['disk_bytes']);
        $this->assertSame(10, $usage['network_rx_bytes']);
        $this->assertSame(3600000, $usage['uptime']);
        $this->assertStringNotContainsString('secret', json_encode($parsed));
    }

    public function testAcceptsWrappedListsAndSkipsInvalidEntries(): void
    {
        $parsed = ServerResourcesHelper::parseServerList([
            'data' => [
                $this->wingsServer('bbbbbbbb-1111-2222-3333-444444444444', 'offline'),
                ['utilization' => []],
                'garbage',
            ],
        ]);

        $this->assertCount(1, $parsed);
        $this->assertSame('offline', $parsed['bbbbbbbb-1111-2222-3333-444444444444']['state']);
    }

    public function testMissingUtilizationDefaultsToZeroAndOffline(): void
    {
        $parsed = ServerResourcesHelper::parseServerList([['configuration' => ['uuid' => 'c-1']]]);

        $this->assertSame('offline', $parsed['c-1']['state']);
        $this->assertSame(0.0, $parsed['c-1']['cpu_absolute']);
        $this->assertSame(0, $parsed['c-1']['memory_bytes']);
    }

    public function testProbeNodesMarksUnreachableNodesOffline(): void
    {
        $calls = 0;
        $fetcher = function (array $nodes) use (&$calls): array {
            ++$calls;
            $this->assertCount(3, $nodes);

            return [
                1 => ['data' => [$this->wingsServer(self::UUID)], 'error' => null],
                2 => ['data' => null, 'error' => 'Connection refused'],
            ];
        };

        $result = ServerResourcesHelper::probeNodes([['id' => 1], ['id' => 2], ['id' => 0]], 3, $fetcher);

        $this->assertSame(1, $calls, 'all nodes are fetched in one batch');
        $this->assertTrue($result[1]['online']);
        $this->assertArrayHasKey(strtolower(self::UUID), $result[1]['servers']);
        $this->assertFalse($result[2]['online']);
        $this->assertSame('Connection refused', $result[2]['error']);
        $this->assertSame([], $result[2]['servers']);
        $this->assertArrayNotHasKey(0, $result);
    }

    private function wingsServer(string $uuid, string $state = 'running'): array
    {
        return [
            'state' => $state,
            'is_suspended' => false,
            'utilization' => [
                'memory_bytes' => 536870912,
                'memory_limit_bytes' => 1073741824,
                'cpu_absolute' => 42.5,
                'network' => ['rx_bytes' => 10, 'tx_bytes' => 20],
                'uptime' => 3600000,
                'state' => $state,
                'disk_bytes' => 2147483648,
            ],
            'configuration' => [
                'uuid' => $uuid,
                'environment' => ['DB_PASSWORD' => 'secret'],
                'build' => ['memory_limit' => 1024],
            ],
        ];
    }
}
