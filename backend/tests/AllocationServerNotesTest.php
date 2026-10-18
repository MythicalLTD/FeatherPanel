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

use App\App;
use App\Chat\Node;
use App\Chat\Location;
use App\Chat\Allocation;
use PHPUnit\Framework\TestCase;

/**
 * The note a server's users keep on an allocation belongs to that assignment only: every way an
 * allocation leaves (or changes) its server must clear it, while the admin `notes` stay untouched.
 */
class AllocationServerNotesTest extends TestCase
{
    private const SERVER_A = 2147480001;
    private const SERVER_B = 2147480002;

    private int $locationId = 0;
    private int $nodeId = 0;
    private int $allocationId = 0;

    protected function setUp(): void
    {
        App::getInstance(false, true, true);

        $locationId = Location::create(['name' => 'notes-test-' . bin2hex(random_bytes(4)), 'description' => 'test']);
        if ($locationId === false) {
            $this->markTestSkipped('Could not create a test location');
        }
        $this->locationId = (int) $locationId;

        $nodeId = Node::createNode([
            'uuid' => sprintf('%08x-0000-4000-8000-%012x', random_int(0, 0xFFFFFFFF), random_int(0, 0xFFFFFFFFFFFF)),
            'name' => 'notes-test-node',
            'fqdn' => 'notes-test.invalid',
            'location_id' => $this->locationId,
            'daemon_token_id' => bin2hex(random_bytes(8)),
            'daemon_token' => bin2hex(random_bytes(32)),
        ]);
        if ($nodeId === false) {
            $this->markTestSkipped('Could not create a test node');
        }
        $this->nodeId = (int) $nodeId;

        $allocationId = Allocation::create([
            'node_id' => $this->nodeId,
            'ip' => '192.0.2.10',
            'port' => random_int(20000, 60000),
            'notes' => 'admin note',
        ]);
        $this->assertNotFalse($allocationId);
        $this->allocationId = (int) $allocationId;
    }

    protected function tearDown(): void
    {
        if ($this->allocationId > 0) {
            Allocation::unassignFromServer($this->allocationId);
            Allocation::delete($this->allocationId);
        }
        if ($this->nodeId > 0) {
            Node::hardDeleteNode($this->nodeId);
        }
        if ($this->locationId > 0) {
            Location::delete($this->locationId);
        }
    }

    public function testUnassignClearsNoteButKeepsAdminNote(): void
    {
        $this->assignWithNote(self::SERVER_A, 'voice chat');

        $this->assertTrue(Allocation::unassignFromServer($this->allocationId));
        $row = Allocation::getById($this->allocationId);
        $this->assertNull($row['server_id']);
        $this->assertNull($row['server_notes']);
        $this->assertSame('admin note', $row['notes']);
    }

    public function testBulkAndServerWideUnassignClearNotes(): void
    {
        $this->assignWithNote(self::SERVER_A, 'bulk');
        $this->assertTrue(Allocation::unassignMultiple([$this->allocationId]));
        $this->assertNull(Allocation::getById($this->allocationId)['server_notes']);

        $this->assignWithNote(self::SERVER_A, 'server deleted');
        $this->assertTrue(Allocation::unassignAllByServerId(self::SERVER_A));
        $this->assertNull(Allocation::getById($this->allocationId)['server_notes']);
    }

    public function testMovingToAnotherServerClearsNoteButSameServerKeepsIt(): void
    {
        $this->assignWithNote(self::SERVER_A, 'keep me');

        $this->assertTrue(Allocation::update($this->allocationId, ['server_id' => self::SERVER_A, 'notes' => 'edited']));
        $this->assertSame('keep me', Allocation::getById($this->allocationId)['server_notes']);

        $this->assertTrue(Allocation::update($this->allocationId, ['server_id' => self::SERVER_B]));
        $row = Allocation::getById($this->allocationId);
        $this->assertSame(self::SERVER_B, (int) $row['server_id']);
        $this->assertNull($row['server_notes']);
    }

    public function testNoteOnlyChangesForTheOwningServer(): void
    {
        $this->assignWithNote(self::SERVER_A, 'mine');

        $this->assertTrue(Allocation::updateServerNotes($this->allocationId, self::SERVER_B, 'not yours'));
        $this->assertSame('mine', Allocation::getById($this->allocationId)['server_notes']);

        $this->assertTrue(Allocation::updateServerNotes($this->allocationId, self::SERVER_A, null));
        $this->assertNull(Allocation::getById($this->allocationId)['server_notes']);
    }

    private function assignWithNote(int $serverId, string $note): void
    {
        $this->assertTrue(Allocation::assignToServer($this->allocationId, $serverId));
        $this->assertTrue(Allocation::updateServerNotes($this->allocationId, $serverId, $note));
        $this->assertSame($note, Allocation::getById($this->allocationId)['server_notes']);
    }
}
