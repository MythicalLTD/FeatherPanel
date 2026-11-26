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

namespace App\Tests\Billing;

use App\App;
use App\Chat\VmTask;
use App\Chat\Database;
use App\Chat\WebSpace;
use App\Chat\VmInstance;
use App\Helpers\UUIDUtils;
use App\Helpers\ExternalId;
use PHPUnit\Framework\TestCase;
use App\Controllers\Admin\ServersController;
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\Admin\WebSpacesController;
use App\Controllers\Admin\VmInstancesController;

/**
 * Billing modules (WHMCS, Blesta, Paymenter) find what they provisioned by external_id
 * and must never get a second VDS, WebSpace or server for the same ID.
 */
class ExternalIdLookupTest extends TestCase
{
    private \PDO $pdo;
    /** @var array<string, list<int>> */
    private array $created = ['featherpanel_vm_instances' => [], 'featherpanel_webspaces' => [], 'featherpanel_vm_tasks' => [], 'featherpanel_servers' => []];

    protected function setUp(): void
    {
        $app = new App(false, false, true);
        $app->getDatabase();
        $this->pdo = Database::getPdoConnection();
    }

    protected function tearDown(): void
    {
        $this->pdo->exec('SET FOREIGN_KEY_CHECKS=0');
        foreach ($this->created as $table => $ids) {
            foreach ($ids as $id) {
                $this->pdo->prepare('DELETE FROM ' . $table . ' WHERE id = :id')->execute(['id' => $id]);
            }
        }
        $this->pdo->exec('SET FOREIGN_KEY_CHECKS=1');
    }

    public function testNormalizeAcceptsBillingIdsAndRejectsUnsafeOnes(): void
    {
        $this->assertSame(['ok' => true, 'value' => 'whmcs-42'], ExternalId::normalize(' whmcs-42 '));
        $this->assertSame(['ok' => true, 'value' => '42'], ExternalId::normalize(42));
        $this->assertSame(['ok' => true, 'value' => null], ExternalId::normalize(null));
        $this->assertSame(['ok' => true, 'value' => null], ExternalId::normalize('  '));
        $this->assertFalse(ExternalId::normalize('a/b')['ok']);
        $this->assertFalse(ExternalId::normalize('a b')['ok']);
        $this->assertFalse(ExternalId::normalize(str_repeat('a', 192))['ok']);
        $this->assertFalse(ExternalId::normalize(['x'])['ok']);
    }

    public function testVmInstanceLookupAndDuplicateCreateIsRefused(): void
    {
        $externalId = 'test-vm-' . bin2hex(random_bytes(4));
        $vm = $this->insertRow('featherpanel_vm_instances', ['external_id' => $externalId, 'vmid' => random_int(100000, 999999)]);
        $controller = new VmInstancesController();

        $found = $controller->showByExternalId(new Request(), $externalId);
        $this->assertSame(200, $found->getStatusCode());
        $this->assertSame((int) $vm['id'], (int) $this->json($found)['data']['instance']['id']);
        $this->assertSame((int) $vm['id'], (int) VmInstance::getByExternalId($externalId)['id']);

        $this->assertSame(404, $controller->showByExternalId(new Request(), $externalId . '-missing')->getStatusCode());
        $this->assertSame(400, $controller->showByExternalId(new Request(), 'bad id')->getStatusCode());

        $dup = $controller->create($this->jsonRequest(['external_id' => $externalId, 'vm_node_id' => 1, 'template_id' => 1]));
        $this->assertSame(409, $dup->getStatusCode());
        $body = $this->json($dup);
        $this->assertSame('EXTERNAL_ID_IN_USE', $body['error_code']);
        $this->assertSame((int) $vm['id'], (int) $body['data']['instance_id']);

        $bad = $controller->create($this->jsonRequest(['external_id' => 'no spaces', 'vm_node_id' => 1]));
        $this->assertSame('INVALID_EXTERNAL_ID', $this->json($bad)['error_code']);
    }

    public function testVmCreationInProgressIsReportedAndNotDuplicated(): void
    {
        $externalId = 'test-vmq-' . bin2hex(random_bytes(4));
        $taskId = bin2hex(random_bytes(16));
        $this->insertRow('featherpanel_vm_tasks', [
            'task_id' => $taskId,
            'task_type' => 'create',
            'status' => 'pending',
            'data' => json_encode(['external_id' => $externalId, 'hostname' => 'x']),
        ]);
        $controller = new VmInstancesController();

        $lookup = $controller->showByExternalId(new Request(), $externalId);
        $this->assertSame(404, $lookup->getStatusCode());
        $body = $this->json($lookup);
        $this->assertSame('CREATION_IN_PROGRESS', $body['error_code']);
        $this->assertSame($taskId, $body['data']['creation_id']);

        $dup = $controller->create($this->jsonRequest(['external_id' => $externalId, 'vm_node_id' => 1, 'template_id' => 1]));
        $this->assertSame(409, $dup->getStatusCode());
        $this->assertSame($taskId, $this->json($dup)['data']['creation_id']);

        // A failed attempt no longer blocks a retry.
        VmTask::update($taskId, ['status' => 'failed']);
        $this->assertNull(VmTask::getActiveCreateByExternalId($externalId));
    }

    public function testVmExternalIdCanBeSetButNotStolen(): void
    {
        $taken = 'test-vmt-' . bin2hex(random_bytes(4));
        $this->insertRow('featherpanel_vm_instances', ['external_id' => $taken, 'vmid' => random_int(100000, 999999)]);
        $vm = $this->insertRow('featherpanel_vm_instances', ['vmid' => random_int(100000, 999999)]);
        $controller = new VmInstancesController();

        $steal = $controller->update($this->jsonRequest(['external_id' => $taken], 'PATCH'), (int) $vm['id']);
        $this->assertSame(409, $steal->getStatusCode());

        $own = 'test-vmo-' . bin2hex(random_bytes(4));
        $set = $controller->update($this->jsonRequest(['external_id' => $own], 'PATCH'), (int) $vm['id']);
        $this->assertSame(200, $set->getStatusCode());
        $this->assertSame($own, VmInstance::getById((int) $vm['id'])['external_id']);
    }

    public function testWebSpaceLookupDuplicateAndUpdate(): void
    {
        $externalId = 'test-ws-' . bin2hex(random_bytes(4));
        $space = $this->insertRow('featherpanel_webspaces', ['external_id' => $externalId]);
        $other = $this->insertRow('featherpanel_webspaces', []);
        $controller = new WebSpacesController();

        $found = $controller->showByExternalId(new Request(), $externalId);
        $this->assertSame(200, $found->getStatusCode());
        $this->assertSame($space['uuid'], $this->json($found)['data']['uuid']);
        $this->assertSame(404, $controller->showByExternalId(new Request(), $externalId . '-x')->getStatusCode());

        $dup = $controller->create($this->jsonRequest(['external_id' => $externalId, 'name' => 'x', 'web_node_id' => 1, 'webplate_id' => 1, 'owner_id' => 1]));
        $this->assertSame(409, $dup->getStatusCode());
        $this->assertSame($space['uuid'], $this->json($dup)['data']['uuid']);

        $steal = $controller->update($this->jsonRequest(['external_id' => $externalId], 'PATCH'), (string) $other['uuid']);
        $this->assertSame(409, $steal->getStatusCode());

        $own = 'test-wso-' . bin2hex(random_bytes(4));
        $set = $controller->update($this->jsonRequest(['external_id' => $own], 'PATCH'), (string) $other['uuid']);
        $this->assertSame(200, $set->getStatusCode());
        $this->assertSame($own, WebSpace::getByUuid((string) $other['uuid'])['external_id']);

        $clear = $controller->update($this->jsonRequest(['external_id' => null], 'PATCH'), (string) $other['uuid']);
        $this->assertSame(200, $clear->getStatusCode());
        $this->assertNull(WebSpace::getByUuid((string) $other['uuid'])['external_id']);

        $missingPackage = $controller->update($this->jsonRequest(['hosting_package_id' => 99999999], 'PATCH'), (string) $other['uuid']);
        $this->assertSame(404, $missingPackage->getStatusCode());
    }

    public function testServerExternalIdCannotBeTakenFromAnotherServer(): void
    {
        $taken = 'test-srv-' . bin2hex(random_bytes(4));
        $this->insertRow('featherpanel_servers', ['external_id' => $taken]);
        $server = $this->insertRow('featherpanel_servers', []);

        $response = (new ServersController())->update($this->jsonRequest(['external_id' => $taken], 'PATCH'), (int) $server['id']);
        $this->assertSame(409, $response->getStatusCode());
        $this->assertSame('EXTERNAL_ID_IN_USE', $this->json($response)['error_code']);
    }

    /**
     * Insert a row with fillers for every NOT NULL column without a default (foreign keys off).
     *
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    private function insertRow(string $table, array $row): array
    {
        foreach ($this->pdo->query('SHOW COLUMNS FROM ' . $table)->fetchAll(\PDO::FETCH_ASSOC) as $col) {
            $field = (string) $col['Field'];
            if (array_key_exists($field, $row) || str_contains((string) $col['Extra'], 'auto')) {
                continue;
            }
            if ($field === 'uuid') {
                $row[$field] = UUIDUtils::generateV4();

                continue;
            }
            if ($field === 'uuidShort') {
                $row[$field] = bin2hex(random_bytes(4));

                continue;
            }
            if ($col['Null'] === 'YES' || $col['Default'] !== null) {
                continue;
            }
            $type = (string) $col['Type'];
            if (preg_match('/int|decimal|float|double/', $type)) {
                $row[$field] = random_int(100000, 999999);
            } elseif (str_starts_with($type, 'enum')) {
                $row[$field] = trim(explode(',', substr($type, 5))[0], "')");
            } elseif (str_contains($type, 'json') || str_contains($type, 'text')) {
                $row[$field] = '[]';
            } else {
                $row[$field] = 'test-' . bin2hex(random_bytes(4));
            }
        }
        $this->pdo->exec('SET FOREIGN_KEY_CHECKS=0');
        $columns = implode(',', array_map(static fn (string $c): string => '`' . $c . '`', array_keys($row)));
        $this->pdo->prepare('INSERT INTO ' . $table . ' (' . $columns . ') VALUES (' . implode(',', array_fill(0, count($row), '?')) . ')')->execute(array_values($row));
        $id = (int) $this->pdo->lastInsertId();
        $this->pdo->exec('SET FOREIGN_KEY_CHECKS=1');
        $this->created[$table][] = $id;

        $stored = $this->pdo->query('SELECT * FROM ' . $table . ' WHERE id = ' . $id)->fetch(\PDO::FETCH_ASSOC);
        $this->assertIsArray($stored);

        return $stored;
    }

    /** @param array<string, mixed> $body */
    private function jsonRequest(array $body, string $method = 'PUT'): Request
    {
        $request = Request::create('/', $method, [], [], [], ['CONTENT_TYPE' => 'application/json'], (string) json_encode($body));
        $request->attributes->set('user', ['uuid' => UUIDUtils::generateV4(), 'id' => 0, 'username' => 'billing-test']);

        return $request;
    }

    /** @return array<string, mixed> */
    private function json(\Symfony\Component\HttpFoundation\Response $response): array
    {
        $decoded = json_decode((string) $response->getContent(), true);
        $this->assertIsArray($decoded);

        return $decoded;
    }
}
