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

namespace App\Tests\Vm;

use App\App;
use App\Chat\User;
use App\Chat\Database;
use App\Chat\VmSubuser;
use App\Helpers\UUIDUtils;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\User\Vds\VmUserSubuserController;

/**
 * Removing a subuser through one VM never touches subusers of another VM.
 */
class VmSubuserRemovalDatabaseTest extends TestCase
{
    private \PDO $pdo;
    /** @var list<int> */
    private array $userIds = [];
    /** @var list<int> */
    private array $vmIds = [];

    protected function setUp(): void
    {
        $app = new App(false, false, true);
        $app->getDatabase();
        $this->pdo = Database::getPdoConnection();
    }

    protected function tearDown(): void
    {
        $this->pdo->exec('SET FOREIGN_KEY_CHECKS=0');
        foreach ($this->vmIds as $id) {
            $this->pdo->prepare('DELETE FROM featherpanel_vm_subusers WHERE vm_instance_id = :id')->execute(['id' => $id]);
            $this->pdo->prepare('DELETE FROM featherpanel_vm_instance_activities WHERE vm_instance_id = :id')->execute(['id' => $id]);
            $this->pdo->prepare('DELETE FROM featherpanel_vm_instances WHERE id = :id')->execute(['id' => $id]);
        }
        foreach ($this->userIds as $id) {
            $this->pdo->prepare('DELETE FROM featherpanel_users WHERE id = :id')->execute(['id' => $id]);
        }
        $this->pdo->exec('SET FOREIGN_KEY_CHECKS=1');
    }

    public function testCrossVmRemovalIsRefusedAndOwnRemovalWorks(): void
    {
        $owner = $this->user();
        $otherOwner = $this->user();
        $member = $this->user();
        $ownVm = $this->vm($owner);
        $otherVm = $this->vm($otherOwner);

        $foreign = VmSubuser::create(['user_id' => (int) $member['id'], 'vm_instance_id' => (int) $otherVm['id'], 'permissions' => '[]']);
        $mine = VmSubuser::create(['user_id' => (int) $member['id'], 'vm_instance_id' => (int) $ownVm['id'], 'permissions' => '[]']);
        $this->assertNotNull($foreign);
        $this->assertNotNull($mine);

        $controller = new VmUserSubuserController();
        $request = new Request();
        $request->attributes->set('user', $owner);
        $request->attributes->set('vmInstance', $ownVm);

        $response = $controller->deleteSubuser($request, (int) $ownVm['id'], (int) $foreign['id']);
        $this->assertSame(404, $response->getStatusCode());
        $this->assertNotNull(VmSubuser::getById((int) $foreign['id']));
        $this->assertNotNull(VmSubuser::getById((int) $mine['id']));
        $this->assertFalse(VmSubuser::deleteForVmInstance((int) $foreign['id'], (int) $ownVm['id']));

        $this->pdo->exec('SET FOREIGN_KEY_CHECKS=0'); // activity rows point at a VM node this fixture does not create
        $response = $controller->deleteSubuser($request, (int) $ownVm['id'], (int) $mine['id']);
        $this->pdo->exec('SET FOREIGN_KEY_CHECKS=1');
        $this->assertSame(200, $response->getStatusCode());
        $this->assertNull(VmSubuser::getById((int) $mine['id']));
        $this->assertNotNull(VmSubuser::getById((int) $foreign['id']));
    }

    private function user(): array
    {
        $username = 'vmsub' . bin2hex(random_bytes(4));
        User::createUser([
            'uuid' => UUIDUtils::generateV4(),
            'username' => $username,
            'first_name' => 'Vm',
            'last_name' => 'Subuser',
            'email' => $username . '@example.com',
            'password' => password_hash('Passw0rd!x', PASSWORD_BCRYPT),
            'role_id' => 1,
            'avatar' => 'https://cdn.mythical.systems/featherpanel/logo.png',
            'remember_token' => bin2hex(random_bytes(16)),
        ]);
        $user = User::getUserByUsername($username);
        $this->assertNotNull($user);
        $this->userIds[] = (int) $user['id'];

        return $user;
    }

    private function vm(array $owner): array
    {
        $row = ['user_uuid' => $owner['uuid'], 'vmid' => random_int(100000, 999999)];
        foreach ($this->pdo->query('SHOW COLUMNS FROM featherpanel_vm_instances')->fetchAll(\PDO::FETCH_ASSOC) as $col) {
            if (isset($row[$col['Field']]) || $col['Null'] === 'YES' || $col['Default'] !== null || str_contains((string) $col['Extra'], 'auto')) {
                continue;
            }
            if (preg_match('/int|decimal|float|double/', (string) $col['Type'])) {
                $row[$col['Field']] = 1;
            } elseif (str_starts_with((string) $col['Type'], 'enum')) {
                $row[$col['Field']] = trim(explode(',', substr((string) $col['Type'], 5))[0], "')");
            } else {
                $row[$col['Field']] = 'test-' . bin2hex(random_bytes(4));
            }
        }
        $this->pdo->exec('SET FOREIGN_KEY_CHECKS=0');
        $columns = implode(',', array_map(static fn (string $c): string => '`' . $c . '`', array_keys($row)));
        $this->pdo->prepare('INSERT INTO featherpanel_vm_instances (' . $columns . ') VALUES (' . implode(',', array_fill(0, count($row), '?')) . ')')->execute(array_values($row));
        $id = (int) $this->pdo->lastInsertId();
        $this->pdo->exec('SET FOREIGN_KEY_CHECKS=1');
        $this->vmIds[] = $id;

        $vm = $this->pdo->query('SELECT * FROM featherpanel_vm_instances WHERE id = ' . $id)->fetch(\PDO::FETCH_ASSOC);
        $this->assertIsArray($vm);

        return $vm;
    }
}
