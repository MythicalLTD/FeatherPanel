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

class AdminUserMailHistoryTest extends TestCase
{
    private const BODY_MARKER = 'mail-history-content-marker';

    private UsersController $controller;
    private PDO $pdo;
    /** @var array<int, string> */
    private array $users = [];

    protected function setUp(): void
    {
        $this->controller = new UsersController();
        App::getInstance(false, true, true);
        $this->pdo = \App\Chat\Database::getPdoConnection();
    }

    protected function tearDown(): void
    {
        foreach ($this->users as $uuid) {
            $this->pdo->prepare('DELETE FROM featherpanel_mail_list WHERE user_uuid = ?')->execute([$uuid]);
            $this->pdo->prepare('DELETE FROM featherpanel_mail_queue WHERE user_uuid = ?')->execute([$uuid]);
            $user = User::getUserByUuid($uuid);
            if ($user) {
                User::hardDeleteUser((int) $user['id']);
            }
        }
        $this->users = [];
    }

    public function testUserDetailListsMailsWithoutBodies(): void
    {
        [$uuid] = $this->makeUserWithMail('mh-detail');

        $data = $this->json($this->controller->show(Request::create('/api/admin/users/' . $uuid, 'GET'), $uuid));

        $this->assertTrue($data['success']);
        $this->assertCount(1, $data['data']['user']['mails']);
        $mail = $data['data']['user']['mails'][0];
        $this->assertSame(['id', 'subject', 'status', 'created_at'], array_keys($mail));
        $this->assertSame('Your server is ready', $mail['subject']);
        $this->assertStringNotContainsString(self::BODY_MARKER, json_encode($data));
    }

    public function testUserDetailByExternalIdListsMailsWithoutBodies(): void
    {
        [$uuid] = $this->makeUserWithMail('mh-ext', (string) random_int(900000000, 999999999));
        $externalId = (string) User::getUserByUuid($uuid)['external_id'];

        $data = $this->json($this->controller->showByExternalId(Request::create('/api/admin/users/external/' . $externalId, 'GET'), $externalId));

        $this->assertTrue($data['success']);
        $this->assertSame(['id', 'subject', 'status', 'created_at'], array_keys($data['data']['user']['mails'][0]));
        $this->assertStringNotContainsString(self::BODY_MARKER, json_encode($data));
    }

    public function testShowMailReturnsBodyForThatUserOnly(): void
    {
        [$uuid, $mailId] = $this->makeUserWithMail('mh-one');
        [$otherUuid] = $this->makeUserWithMail('mh-two');

        $data = $this->json($this->controller->showMail(Request::create('/', 'GET'), $uuid, $mailId));
        $this->assertTrue($data['success']);
        $this->assertSame($mailId, $data['data']['mail']['id']);
        $this->assertStringContainsString(self::BODY_MARKER, $data['data']['mail']['body']);

        $data = $this->json($this->controller->showMail(Request::create('/', 'GET'), $otherUuid, $mailId));
        $this->assertFalse($data['success']);
        $this->assertSame('MAIL_NOT_FOUND', $data['error_code']);
    }

    /**
     * @return array{0: string, 1: int}
     */
    private function makeUserWithMail(string $prefix, ?string $externalId = null): array
    {
        $uuid = sprintf('%08x-%04x-4%03x-a%03x-%012x', random_int(0, 0xFFFFFFFF), random_int(0, 0xFFFF), random_int(0, 0xFFF), random_int(0, 0xFFF), random_int(0, 0xFFFFFFFFFFFF));
        $suffix = bin2hex(random_bytes(3));
        $data = [
            'uuid' => $uuid,
            'username' => $prefix . $suffix,
            'first_name' => 'Mail',
            'last_name' => 'History',
            'email' => $prefix . $suffix . '@example.com',
            'password' => password_hash('TestPassword123', PASSWORD_BCRYPT),
        ];
        if ($externalId !== null) {
            $data['external_id'] = $externalId;
        }
        $this->assertNotFalse(User::createUser($data));
        $this->users[] = $uuid;

        $this->pdo->prepare('INSERT INTO featherpanel_mail_queue (user_uuid, subject, body, status) VALUES (?, ?, ?, ?)')
            ->execute([$uuid, 'Your server is ready', '<p>' . self::BODY_MARKER . '</p>', 'sent']);
        $queueId = (int) $this->pdo->lastInsertId();
        $this->pdo->prepare('INSERT INTO featherpanel_mail_list (queue_id, user_uuid) VALUES (?, ?)')->execute([$queueId, $uuid]);

        return [$uuid, (int) $this->pdo->lastInsertId()];
    }

    private function json(Symfony\Component\HttpFoundation\Response $response): array
    {
        return json_decode((string) $response->getContent(), true);
    }
}
