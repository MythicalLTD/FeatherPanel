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
use App\Chat\User;
use PHPUnit\Framework\TestCase;
use App\Controllers\Admin\UsersController;
use Symfony\Component\HttpFoundation\Request;

class UserExternalIdTest extends TestCase
{
    private UsersController $controller;
    private array $admin;
    /** @var array<int, string> */
    private array $created = [];

    protected function setUp(): void
    {
        $this->controller = new UsersController();
        $app = new App(false, false, true);
        $app->getDatabase();

        $uuid = $this->uuid();
        $this->assertNotFalse(User::createUser([
            'uuid' => $uuid,
            'username' => 'extadmin' . bin2hex(random_bytes(3)),
            'first_name' => 'Ext',
            'last_name' => 'Admin',
            'email' => 'extadmin' . bin2hex(random_bytes(3)) . '@example.com',
            'password' => password_hash('TestPassword123', PASSWORD_BCRYPT),
            'role_id' => 4,
        ]));
        $this->created[] = $uuid;
        $this->admin = User::getUserByUuid($uuid);
    }

    protected function tearDown(): void
    {
        foreach ($this->created as $uuid) {
            $user = User::getUserByUuid($uuid);
            if ($user) {
                User::hardDeleteUser((int) $user['id']);
            }
        }
        $this->created = [];
    }

    public function testCreateAcceptsTextExternalIdAndFindsIt(): void
    {
        $externalId = 'whmcs-client-' . bin2hex(random_bytes(4));
        [$status, $data] = $this->createUser(['external_id' => $externalId]);
        $this->assertSame(201, $status, json_encode($data));

        $found = $this->json($this->controller->showByExternalId(Request::create('/'), $externalId));
        $this->assertTrue($found['success']);
        $this->assertSame($externalId, $found['data']['user']['external_id']);
    }

    public function testCreateKeepsNumericExternalIdsWorking(): void
    {
        $externalId = random_int(100000000, 999999999);
        [$status, $data] = $this->createUser(['external_id' => $externalId]);
        $this->assertSame(201, $status, json_encode($data));
        $this->assertNotNull(User::getUserByExternalId((string) $externalId));
    }

    public function testCreateRejectsInvalidExternalIdWith400(): void
    {
        foreach (['has spaces', '../etc', str_repeat('a', 192), ['array']] as $bad) {
            [$status, $data] = $this->createUser(['external_id' => $bad]);
            $this->assertSame(400, $status, json_encode($bad));
            $this->assertSame('INVALID_EXTERNAL_ID', $data['error_code']);
        }
    }

    public function testCreateRefusesExternalIdUsedByAnotherUser(): void
    {
        $externalId = 'blesta-' . bin2hex(random_bytes(4));
        $this->assertSame(201, $this->createUser(['external_id' => $externalId])[0]);

        [$status, $data] = $this->createUser(['external_id' => $externalId]);
        $this->assertSame(409, $status);
        $this->assertSame('EXTERNAL_ID_IN_USE', $data['error_code']);
    }

    public function testUpdateSetsReplacesAndClearsTextExternalId(): void
    {
        [, $first] = $this->createUser([]);
        [, $second] = $this->createUser([]);
        $firstUuid = $this->uuidOf($first);
        $secondUuid = $this->uuidOf($second);

        $externalId = 'paymenter-' . bin2hex(random_bytes(4));
        [$status, $data] = $this->updateUser($firstUuid, ['external_id' => $externalId]);
        $this->assertSame(200, $status, json_encode($data));
        $this->assertSame($externalId, User::getUserByUuid($firstUuid)['external_id']);

        // Saving the same value on the same user is fine; another user cannot take it.
        $this->assertSame(200, $this->updateUser($firstUuid, ['external_id' => $externalId])[0]);
        [$status, $data] = $this->updateUser($secondUuid, ['external_id' => $externalId]);
        $this->assertSame(409, $status);
        $this->assertSame('EXTERNAL_ID_IN_USE', $data['error_code']);

        [$status] = $this->updateUser($firstUuid, ['external_id' => 'bad value!']);
        $this->assertSame(400, $status);

        $this->assertSame(200, $this->updateUser($firstUuid, ['external_id' => ''])[0]);
        $this->assertNull(User::getUserByUuid($firstUuid)['external_id']);
    }

    public function testLookupFindsExternalIdZero(): void
    {
        $existing = User::getUserByExternalId('0');
        if ($existing) {
            $this->markTestSkipped('external_id "0" is already used in this database');
        }
        [$status, $data] = $this->createUser(['external_id' => '0']);
        $this->assertSame(201, $status, json_encode($data));

        $response = $this->controller->showByExternalId(Request::create('/'), '0');
        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame($this->uuidOf($data), $this->json($response)['data']['user']['uuid']);
    }

    public function testUpdateAnswersInvalidExternalIdLikeCreate(): void
    {
        [, $created] = $this->createUser([]);
        [$status, $data] = $this->updateUser($this->uuidOf($created), ['external_id' => ['array']]);
        $this->assertSame(400, $status);
        $this->assertSame('INVALID_EXTERNAL_ID', $data['error_code']);
    }

    public function testExternalIdTakenAtWriteTimeAnswers409(): void
    {
        // The database refusing the value at write time stands in for another request claiming it
        // between the controller's check and the write.
        $taken = 'race-' . bin2hex(random_bytes(4));
        [, $created] = $this->createUser([]);
        $uuid = $this->uuidOf($created);

        $pdo = \App\Chat\Database::getPdoConnection();
        $table = User::getTableName();
        $signal = "SIGNAL SQLSTATE '23000' SET MYSQL_ERRNO = 1062, MESSAGE_TEXT = 'Duplicate entry for key featherpanel_users_external_id_unique'";
        $pdo->exec('DROP TRIGGER IF EXISTS fp_test_ext_id_insert');
        $pdo->exec('DROP TRIGGER IF EXISTS fp_test_ext_id_update');
        $pdo->exec("CREATE TRIGGER fp_test_ext_id_insert BEFORE INSERT ON `$table` FOR EACH ROW BEGIN IF NEW.external_id = " . $pdo->quote($taken) . " THEN $signal; END IF; END");
        $pdo->exec("CREATE TRIGGER fp_test_ext_id_update BEFORE UPDATE ON `$table` FOR EACH ROW BEGIN IF NEW.external_id = " . $pdo->quote($taken) . " THEN $signal; END IF; END");
        try {
            [$status, $data] = $this->createUser(['external_id' => $taken]);
            $this->assertSame(409, $status, json_encode($data));
            $this->assertSame('EXTERNAL_ID_IN_USE', $data['error_code']);

            [$status, $data] = $this->updateUser($uuid, ['external_id' => $taken]);
            $this->assertSame(409, $status, json_encode($data));
            $this->assertSame('EXTERNAL_ID_IN_USE', $data['error_code']);
        } finally {
            $pdo->exec('DROP TRIGGER IF EXISTS fp_test_ext_id_insert');
            $pdo->exec('DROP TRIGGER IF EXISTS fp_test_ext_id_update');
        }
    }

    /**
     * @return array{0: int, 1: array}
     */
    private function createUser(array $extra): array
    {
        $suffix = bin2hex(random_bytes(4));
        $payload = array_merge([
            'username' => 'ext' . $suffix,
            'first_name' => 'Ext',
            'last_name' => 'User',
            'email' => 'ext' . $suffix . '@example.com',
            'password' => 'TestPassword123',
        ], $extra);
        $request = Request::create('/api/admin/users', 'PUT', [], [], [], [], json_encode($payload));
        $request->attributes->set('user', $this->admin);
        $response = $this->controller->create($request);
        $data = $this->json($response);
        $user = User::getUserByUsername('ext' . $suffix);
        if ($user) {
            $this->created[] = (string) $user['uuid'];
            $data['_uuid'] = (string) $user['uuid'];
        }

        return [$response->getStatusCode(), $data];
    }

    /**
     * @return array{0: int, 1: array}
     */
    private function updateUser(string $uuid, array $payload): array
    {
        $request = Request::create('/api/admin/users/' . $uuid, 'PATCH', [], [], [], [], json_encode($payload));
        $request->attributes->set('user', $this->admin);
        $response = $this->controller->update($request, $uuid);

        return [$response->getStatusCode(), $this->json($response)];
    }

    private function uuidOf(array $createResult): string
    {
        $this->assertArrayHasKey('_uuid', $createResult);

        return $createResult['_uuid'];
    }

    private function uuid(): string
    {
        return sprintf('%08x-%04x-4%03x-a%03x-%012x', random_int(0, 0xFFFFFFFF), random_int(0, 0xFFFF), random_int(0, 0xFFF), random_int(0, 0xFFF), random_int(0, 0xFFFFFFFFFFFF));
    }

    private function json(Symfony\Component\HttpFoundation\Response $response): array
    {
        return json_decode((string) $response->getContent(), true) ?? [];
    }
}
