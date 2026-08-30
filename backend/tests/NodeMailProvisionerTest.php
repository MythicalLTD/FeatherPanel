<?php

/*
 * This file is part of FeatherPanel.
 */

use PHPUnit\Framework\TestCase;
use App\Helpers\DnsProvisioner;
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
        $this->expectException(\InvalidArgumentException::class);
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
