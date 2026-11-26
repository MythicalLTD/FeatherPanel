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
use App\Chat\Allocation;
use App\Plugins\PluginEvents;
use App\Config\ConfigInterface;
use PHPUnit\Framework\TestCase;
use App\Controllers\Admin\UsersController;
use App\Plugins\Events\Events\ServerEvent;
use App\Controllers\Admin\ServersController;
use Symfony\Component\HttpFoundation\Request;

/**
 * Once a server (or user) is saved, steps after it (activity, plugin events, emails) must not
 * turn the request into an error: billing systems would retry and create it again.
 */
class ServerCreateAfterSaveTest extends TestCase
{
    /** @var resource|null */
    private static $wings;
    private static int $wingsPort = 0;
    private static string $routerFile = '';

    private PDO $pdo;
    private array $admin;
    private array $cleanup = ['users' => [], 'servers' => [], 'allocations' => [], 'nodes' => [], 'spells' => [], 'realms' => [], 'locations' => []];
    private array $savedSettings = [];
    private mixed $savedEventManager = null;

    public static function setUpBeforeClass(): void
    {
        // A stand-in Wings that accepts every request.
        self::$routerFile = sys_get_temp_dir() . '/fp-fake-wings-' . getmypid() . '.php';
        file_put_contents(self::$routerFile, '<?php header("Content-Type: application/json"); http_response_code(202); echo "{}";');
        $sock = stream_socket_server('tcp://127.0.0.1:0');
        self::$wingsPort = (int) substr(strrchr(stream_socket_get_name($sock, false), ':'), 1);
        fclose($sock);
        self::$wings = proc_open(
            [PHP_BINARY, '-S', '127.0.0.1:' . self::$wingsPort, self::$routerFile],
            [0 => ['file', '/dev/null', 'r'], 1 => ['file', '/dev/null', 'w'], 2 => ['file', '/dev/null', 'w']],
            $pipes
        );
        for ($i = 0; $i < 50; ++$i) {
            $c = @fsockopen('127.0.0.1', self::$wingsPort, $errno, $errstr, 0.1);
            if ($c) {
                fclose($c);
                break;
            }
            usleep(100000);
        }
    }

    public static function tearDownAfterClass(): void
    {
        if (is_resource(self::$wings)) {
            proc_terminate(self::$wings);
            proc_close(self::$wings);
        }
        @unlink(self::$routerFile);
    }

    protected function setUp(): void
    {
        $app = new App(false, false, true);
        $this->pdo = $app->getDatabase()->getPdo();
        global $eventManager;
        $this->savedEventManager = $eventManager ?? null;

        $uuid = $this->uuid();
        $this->assertNotFalse(User::createUser([
            'uuid' => $uuid,
            'username' => 'casadmin' . bin2hex(random_bytes(3)),
            'first_name' => 'Create',
            'last_name' => 'Admin',
            'email' => 'casadmin' . bin2hex(random_bytes(3)) . '@example.com',
            'password' => password_hash('TestPassword123', PASSWORD_BCRYPT),
            'role_id' => 4,
        ]));
        $this->cleanup['users'][] = $uuid;
        $this->admin = User::getUserByUuid($uuid);
    }

    protected function tearDown(): void
    {
        global $eventManager;
        $eventManager = $this->savedEventManager;
        $this->pdo->exec('DROP TRIGGER IF EXISTS fp_test_refuse_mail');
        $config = App::getInstance(true)->getConfig();
        foreach ($this->savedSettings as $name => $value) {
            $config->setSetting($name, $value);
        }
        foreach ($this->cleanup['servers'] as $id) {
            Server::hardDeleteServer($id);
        }
        $tables = ['allocations' => 'featherpanel_allocations', 'nodes' => 'featherpanel_nodes', 'spells' => 'featherpanel_spells', 'realms' => 'featherpanel_realms', 'locations' => 'featherpanel_locations'];
        foreach ($tables as $key => $table) {
            foreach ($this->cleanup[$key] as $id) {
                $this->pdo->prepare('DELETE FROM ' . $table . ' WHERE id = ?')->execute([$id]);
            }
        }
        foreach ($this->cleanup['users'] as $uuid) {
            $this->pdo->prepare('DELETE FROM featherpanel_mail_list WHERE user_uuid = ?')->execute([$uuid]);
            $this->pdo->prepare('DELETE FROM featherpanel_mail_queue WHERE user_uuid = ?')->execute([$uuid]);
            $user = User::getUserByUuid($uuid);
            if ($user) {
                User::hardDeleteUser((int) $user['id']);
            }
        }
    }

    public function testServerCreateSucceedsWhenTheEmailCannotBeQueued(): void
    {
        $this->breakOutgoingMail();

        [$status, $data] = $this->createServer();

        $this->assertSame(201, $status, json_encode($data));
        $this->assertNotNull(Server::getServerById((int) $data['data']['server_id']));
    }

    public function testServerCreateSucceedsWhenAPluginListenerFails(): void
    {
        $this->failingListener(ServerEvent::onServerCreated());

        [$status, $data] = $this->createServer();

        $this->assertSame(201, $status, json_encode($data));
        $this->assertNotNull(Server::getServerById((int) $data['data']['server_id']));
    }

    public function testUserCreateSucceedsWhenTheWelcomeEmailCannotBeQueued(): void
    {
        $this->breakOutgoingMail();
        $suffix = bin2hex(random_bytes(4));
        $request = Request::create('/api/admin/users', 'PUT', [], [], [], [], json_encode([
            'username' => 'cas' . $suffix,
            'first_name' => 'Create',
            'last_name' => 'User',
            'email' => 'cas' . $suffix . '@example.com',
            'password' => 'TestPassword123',
        ]));
        $request->attributes->set('user', $this->admin);

        $response = (new UsersController())->create($request);
        $user = User::getUserByUsername('cas' . $suffix);
        if ($user) {
            $this->cleanup['users'][] = (string) $user['uuid'];
        }

        $this->assertSame(201, $response->getStatusCode(), (string) $response->getContent());
        $this->assertNotNull($user);
    }

    /**
     * Mail on, and a trigger that refuses every row in the mail queue, so queueing an email throws.
     */
    private function breakOutgoingMail(): void
    {
        $config = App::getInstance(true)->getConfig();
        $this->savedSettings[ConfigInterface::SMTP_ENABLED] = $config->getSetting(ConfigInterface::SMTP_ENABLED, null);
        $config->setSetting(ConfigInterface::SMTP_ENABLED, 'true');
        $this->pdo->exec('DROP TRIGGER IF EXISTS fp_test_refuse_mail');
        $this->pdo->exec("CREATE TRIGGER fp_test_refuse_mail BEFORE INSERT ON featherpanel_mail_queue FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'mail queue unavailable'");
    }

    private function failingListener(string $event): void
    {
        global $eventManager;
        $events = new PluginEvents();
        $events->on($event, function (): void {
            throw new RuntimeException('listener failed');
        });
        $eventManager = $events;
    }

    /**
     * @return array{0: int, 1: array}
     */
    private function createServer(): array
    {
        $suffix = bin2hex(random_bytes(3));
        $locationId = Location::create(['name' => 'cas-loc-' . $suffix]);
        $this->assertNotFalse($locationId);
        $this->cleanup['locations'][] = $locationId;

        $nodeId = Node::createNode([
            'uuid' => $this->uuid(),
            'name' => 'cas-node-' . $suffix,
            'fqdn' => '127.0.0.1',
            'location_id' => $locationId,
            'scheme' => 'http',
            'daemonListen' => self::$wingsPort,
            'daemon_token_id' => bin2hex(random_bytes(8)),
            'daemon_token' => bin2hex(random_bytes(32)),
        ]);
        $this->assertNotFalse($nodeId);
        $this->cleanup['nodes'][] = $nodeId;

        $realmId = Realm::create(['name' => 'cas-realm-' . $suffix, 'description' => 'test']);
        $this->assertNotFalse($realmId);
        $this->cleanup['realms'][] = $realmId;

        $spellId = Spell::createSpell(['uuid' => $this->uuid(), 'realm_id' => $realmId, 'author' => 'test@example.com', 'name' => 'cas-spell-' . $suffix]);
        $this->assertNotFalse($spellId);
        $this->cleanup['spells'][] = $spellId;

        $allocationId = Allocation::create(['node_id' => $nodeId, 'ip' => '127.0.0.1', 'port' => random_int(20000, 60000)]);
        $this->assertNotFalse($allocationId);
        $this->cleanup['allocations'][] = $allocationId;

        $request = Request::create('/api/admin/servers', 'PUT', [], [], [], [], json_encode([
            'node_id' => $nodeId,
            'name' => 'cas-server-' . $suffix,
            'owner_id' => (int) $this->admin['id'],
            'memory' => 512,
            'swap' => 0,
            'disk' => 1024,
            'io' => 500,
            'cpu' => 100,
            'allocation_id' => $allocationId,
            'realms_id' => $realmId,
            'spell_id' => $spellId,
            'startup' => 'echo hi',
            'image' => 'ghcr.io/example/image:latest',
        ]));
        $request->attributes->set('user', $this->admin);

        $response = (new ServersController())->create($request);
        $data = json_decode((string) $response->getContent(), true) ?? [];
        if (isset($data['data']['server_id'])) {
            $this->cleanup['servers'][] = (int) $data['data']['server_id'];
        } else {
            $row = Server::getServerByAllocationId($allocationId);
            if ($row) {
                $this->cleanup['servers'][] = (int) $row['id'];
            }
        }

        return [$response->getStatusCode(), $data];
    }

    private function uuid(): string
    {
        return sprintf('%08x-%04x-4%03x-a%03x-%012x', random_int(0, 0xFFFFFFFF), random_int(0, 0xFFFF), random_int(0, 0xFFF), random_int(0, 0xFFF), random_int(0, 0xFFFFFFFFFFFF));
    }
}
