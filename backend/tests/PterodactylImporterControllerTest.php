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
use App\Chat\User;
use App\Chat\Realm;
use App\Chat\Spell;
use App\Chat\Server;
use App\Chat\Location;
use App\Chat\MailList;
use App\Chat\MailQueue;
use App\Chat\Allocation;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;
use App\Controllers\Admin\PterodactylImporterController;

class PterodactylImporterControllerTest extends TestCase
{
    private PterodactylImporterController $controller;
    private string $adminUuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    private string $importedUserUuid = '11111111-2222-3333-4444-555555555555';
    private string $nodeUuid = 'a0de0000-0000-4000-8000-000000000001';
    private string $eggUuid = 'e9900000-0000-4000-8000-000000000001';
    private string $serverUuid = '5e7f0000-0000-4000-8000-000000000001';
    private string $bcryptHash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

    /** @var list<int> */
    private array $createdServerIds = [];
    /** @var list<int> */
    private array $createdAllocationIds = [];
    /** @var list<int> */
    private array $createdNodeIds = [];
    /** @var list<int> */
    private array $createdSpellIds = [];
    /** @var list<int> */
    private array $createdRealmIds = [];
    /** @var list<int> */
    private array $createdLocationIds = [];
    /** @var list<int> */
    private array $createdUserIds = [];

    protected function setUp(): void
    {
        $this->controller = new PterodactylImporterController();
        App::getInstance(false, true, true);

        if (!User::getUserByUuid($this->adminUuid)) {
            User::createUser([
                'uuid' => $this->adminUuid,
                'username' => 'importeradmin',
                'first_name' => 'Import',
                'last_name' => 'Admin',
                'email' => 'importeradmin@example.com',
                'password' => password_hash('TestPassword123', PASSWORD_BCRYPT),
                'role_id' => 4,
                'avatar' => 'https://cdn.mythical.systems/featherpanel/logo.png',
                'remember_token' => bin2hex(random_bytes(16)),
            ]);
        }
    }

    protected function tearDown(): void
    {
        foreach ($this->createdServerIds as $id) {
            $server = Server::getServerById($id);
            if ($server) {
                Server::hardDeleteServer($id);
            }
        }
        foreach ($this->createdAllocationIds as $id) {
            if (Allocation::getById($id)) {
                Allocation::delete($id);
            }
        }
        foreach ($this->createdNodeIds as $id) {
            if (Node::getNodeById($id)) {
                Node::hardDeleteNode($id);
            }
        }
        foreach ($this->createdSpellIds as $id) {
            if (Spell::getSpellById($id)) {
                Spell::hardDeleteSpell($id);
            }
        }
        foreach ($this->createdRealmIds as $id) {
            if (Realm::getById($id)) {
                Realm::delete($id);
            }
        }
        foreach ($this->createdLocationIds as $id) {
            if (Location::getById($id)) {
                Location::delete($id);
            }
        }
        foreach ($this->createdUserIds as $id) {
            $user = User::getUserById($id);
            if ($user) {
                MailList::deleteAllMailListsByUserId($user['uuid']);
                MailQueue::deleteAllMailQueueByUserId($user['uuid']);
                User::hardDeleteUser($id);
            }
        }

        $imported = User::getUserByUuid($this->importedUserUuid);
        if ($imported) {
            MailList::deleteAllMailListsByUserId($imported['uuid']);
            MailQueue::deleteAllMailQueueByUserId($imported['uuid']);
            User::hardDeleteUser($imported['id']);
        }

        $admin = User::getUserByUuid($this->adminUuid);
        if ($admin) {
            MailList::deleteAllMailListsByUserId($admin['uuid']);
            MailQueue::deleteAllMailQueueByUserId($admin['uuid']);
            User::hardDeleteUser($admin['id']);
        }
    }

    public function testDeprecatedBulkImportReturns410(): void
    {
        $response = $this->controller->import($this->adminRequest('POST', '/api/admin/pterodactyl-importer/import'));
        $data = json_decode($response->getContent(), true);

        $this->assertSame(410, $response->getStatusCode());
        $this->assertFalse($data['success']);
        $this->assertSame('PTERODACTYL_IMPORT_DEPRECATED', $data['error_code']);
    }

    public function testPrerequisitesReportsCounts(): void
    {
        $response = $this->controller->prerequisites($this->adminRequest('GET', '/api/admin/pterodactyl-importer/prerequisites'));
        $data = json_decode($response->getContent(), true);

        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('panel_clean', $data['data']);
        $this->assertArrayHasKey('users_count', $data['data']);
    }

    public function testImportUserSkipsReservedIdOne(): void
    {
        $payload = [
            'user' => [
                'id' => 1,
                'uuid' => $this->importedUserUuid,
                'username' => 'skippedroot',
                'email' => 'skippedroot@example.com',
                'password' => $this->bcryptHash,
                'name_first' => 'Skip',
                'name_last' => 'Root',
                'root_admin' => true,
            ],
        ];

        $response = $this->controller->importUser(
            $this->adminRequest('POST', '/api/admin/pterodactyl-importer/import-user', $payload)
        );
        $data = json_decode($response->getContent(), true);

        $this->assertFalse($data['success']);
        $this->assertSame('RESERVED_ID', $data['error_code']);
    }

    public function testImportPipelineUserEggNodeAllocationServer(): void
    {
        $locationId = Location::create([
            'name' => 'CI Import Loc',
            'description' => 'pterodactyl importer test',
            'flag_code' => 'us',
        ]);
        $this->assertNotFalse($locationId);
        $this->createdLocationIds[] = (int) $locationId;

        $realmId = Realm::create([
            'name' => 'CI Import Realm',
            'description' => 'pterodactyl importer test',
        ]);
        $this->assertNotFalse($realmId);
        $this->createdRealmIds[] = (int) $realmId;

        $passwordHash = $this->bcryptHash;
        $userResponse = $this->controller->importUser($this->adminRequest('POST', '/api/admin/pterodactyl-importer/import-user', [
            'user' => [
                'id' => 42,
                'uuid' => $this->importedUserUuid,
                'username' => 'pteroimported',
                'email' => 'pteroimported@example.com',
                'password' => $passwordHash,
                'name_first' => 'Ptero',
                'name_last' => 'User',
                'root_admin' => false,
            ],
        ]));
        $userData = json_decode($userResponse->getContent(), true);
        $this->assertTrue($userData['success'], $userResponse->getContent());
        $this->assertSame(201, $userResponse->getStatusCode());
        $importedUserId = (int) $userData['data']['user']['id'];
        $this->createdUserIds[] = $importedUserId;

        $stored = User::getUserById($importedUserId);
        $this->assertNotNull($stored);
        $this->assertSame($passwordHash, $stored['password']);

        $eggResponse = $this->controller->importEgg($this->adminRequest('POST', '/api/admin/pterodactyl-importer/import-egg', [
            'egg' => [
                'id' => 7,
                'uuid' => $this->eggUuid,
                'nest_id' => 3,
                'author' => 'ci@featherpanel.test',
                'name' => 'CI Vanilla',
                'description' => 'Importer egg fixture',
                'docker_images' => json_encode(['ghcr.io/pterodactyl/yolks:java_21' => 'ghcr.io/pterodactyl/yolks:java_21']),
                'startup' => 'java -jar server.jar',
                'script_container' => 'ghcr.io/pterodactyl/installers:debian',
                'script_entry' => 'bash',
                'script_is_privileged' => true,
                'force_outgoing_ip' => false,
            ],
            'variables' => [
                [
                    'id' => 1,
                    'name' => 'Server Jar File',
                    'description' => 'Jar name',
                    'env_variable' => 'SERVER_JARFILE',
                    'default_value' => 'server.jar',
                    'user_viewable' => true,
                    'user_editable' => true,
                    'rules' => 'required|string',
                ],
            ],
            'nest_to_realm_mapping' => ['3' => $realmId],
        ]));
        $eggData = json_decode($eggResponse->getContent(), true);
        $this->assertTrue($eggData['success'], $eggResponse->getContent());
        $spellId = (int) $eggData['data']['spell']['id'];
        $this->createdSpellIds[] = $spellId;
        $this->assertSame(1, (int) $eggData['data']['variables_imported']);

        $nodeResponse = $this->controller->importNode($this->adminRequest('POST', '/api/admin/pterodactyl-importer/import-node', [
            'node' => [
                'id' => 9,
                'uuid' => $this->nodeUuid,
                'public' => true,
                'name' => 'CI Node',
                'description' => 'Importer node',
                'location_id' => 1,
                'fqdn' => 'node.ci.local',
                'scheme' => 'https',
                'behind_proxy' => false,
                'maintenance_mode' => false,
                'memory' => 4096,
                'memory_overallocate' => 0,
                'disk' => 20480,
                'disk_overallocate' => 0,
                'upload_size' => 100,
                'daemonListen' => 8080,
                'daemonSFTP' => 2022,
                'daemonBase' => '/var/lib/pterodactyl/volumes',
            ],
            'location_to_location_mapping' => ['1' => $locationId],
            'generate_new_tokens' => true,
        ]));
        $nodeData = json_decode($nodeResponse->getContent(), true);
        $this->assertTrue($nodeData['success'], $nodeResponse->getContent());
        $nodeId = (int) $nodeData['data']['node']['id'];
        $this->createdNodeIds[] = $nodeId;

        $allocResponse = $this->controller->importAllocation($this->adminRequest('POST', '/api/admin/pterodactyl-importer/import-allocation', [
            'allocation' => [
                'id' => 11,
                'node_id' => 9,
                'ip' => '127.0.0.1',
                'port' => 25565,
                'ip_alias' => null,
                'server_id' => null,
            ],
            'node_to_node_mapping' => ['9' => $nodeId],
        ]));
        $allocData = json_decode($allocResponse->getContent(), true);
        $this->assertTrue($allocData['success'], $allocResponse->getContent());
        $allocationId = (int) $allocData['data']['allocation']['id'];
        $this->createdAllocationIds[] = $allocationId;

        $serverResponse = $this->controller->importServer($this->adminRequest('POST', '/api/admin/pterodactyl-importer/import-server', [
            'server' => [
                'id' => 13,
                'uuid' => $this->serverUuid,
                'uuidShort' => 'c1000001',
                'name' => 'CI Server',
                'description' => 'Imported',
                'status' => null,
                'skip_scripts' => false,
                'owner_id' => 42,
                'memory' => 1024,
                'swap' => 0,
                'disk' => 5120,
                'io' => 500,
                'cpu' => 100,
                'threads' => null,
                'oom_disabled' => 1,
                'allocation_id' => 11,
                'nest_id' => 3,
                'egg_id' => 7,
                'startup' => 'java -jar server.jar',
                'image' => 'ghcr.io/pterodactyl/yolks:java_21',
                'allocation_limit' => 0,
                'database_limit' => 0,
                'backup_limit' => 0,
                'node_id' => 9,
            ],
            'server_variables' => [],
            'nest_to_realm_mapping' => ['3' => $realmId],
            'egg_to_spell_mapping' => ['7' => $spellId],
            'node_to_node_mapping' => ['9' => $nodeId],
            'user_to_user_mapping' => ['42' => $importedUserId],
            'allocation_to_allocation_mapping' => ['11' => $allocationId],
        ]));
        $serverData = json_decode($serverResponse->getContent(), true);
        $this->assertTrue($serverData['success'], $serverResponse->getContent());
        $serverId = (int) $serverData['data']['server']['id'];
        $this->createdServerIds[] = $serverId;

        $createdServer = Server::getServerById($serverId);
        $this->assertNotNull($createdServer);
        $this->assertSame('CI Server', $createdServer['name']);
        $this->assertSame($spellId, (int) $createdServer['spell_id']);
        $this->assertSame($nodeId, (int) $createdServer['node_id']);
    }

    private function adminRequest(string $method, string $uri, array $payload = []): Request
    {
        $admin = User::getUserByUuid($this->adminUuid);
        $this->assertNotNull($admin);

        $request = Request::create(
            $uri,
            $method,
            [],
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            $payload === [] ? null : json_encode($payload, JSON_THROW_ON_ERROR)
        );
        $request->attributes->set('user', $admin);

        return $request;
    }
}
