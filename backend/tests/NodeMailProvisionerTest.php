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

use App\Helpers\DnsProvisioner;
use PHPUnit\Framework\TestCase;
use App\Services\Mail\NodeMailProvisioner;

class NodeMailProvisionerTest extends TestCase
{
    public function testProvisionMailRecordsSkipsInventoryMode(): void
    {
        $result = DnsProvisioner::provisionMailRecords(
            ['id' => 1, 'web_node_id' => 1],
            ['provision_mode' => 'inventory', 'id' => 1],
            'example.com',
        );

        $this->assertTrue($result['ok']);
        $this->assertTrue($result['skipped'] ?? false);
        $this->assertSame([], $result['results']);
    }

    public function testNodeMailProvisionerRequiresWebNodeId(): void
    {
        $this->expectException(InvalidArgumentException::class);
        NodeMailProvisioner::dispatch(
            ['provision_mode' => 'node'],
            'create',
            ['email' => 'user@example.com', 'password' => 'secret'],
        );
    }

    public function testProvisionMailRecordsRejectsEmptyDomainForNodeMode(): void
    {
        $result = DnsProvisioner::provisionMailRecords(
            ['id' => 1, 'web_node_id' => 1],
            ['provision_mode' => 'node', 'id' => 1],
            '',
        );

        $this->assertFalse($result['ok']);
        $this->assertSame('domain is required', $result['error'] ?? null);
    }
}
