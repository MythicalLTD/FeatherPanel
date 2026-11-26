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
use PHPUnit\Framework\TestCase;
use App\Services\Webhooks\WebhookStore;
use App\Controllers\Admin\WebhooksController;
use Symfony\Component\HttpFoundation\Request;

class WebhooksControllerTest extends TestCase
{
    private WebhooksController $controller;
    /** @var array<int, int> */
    private array $created = [];

    protected function setUp(): void
    {
        App::getInstance(false, true, true);
        $this->controller = new WebhooksController();
    }

    protected function tearDown(): void
    {
        foreach ($this->created as $id) {
            WebhookStore::delete($id);
        }
        $this->created = [];
    }

    public function testIndexListsCatalogueAndSettings(): void
    {
        $data = $this->json($this->controller->index(Request::create('/api/admin/webhooks', 'GET')));
        $this->assertTrue($data['success']);
        $this->assertArrayHasKey('webhooks', $data['data']);
        $this->assertArrayHasKey('events', $data['data']);
        $this->assertNotEmpty($data['data']['events']);
        $this->assertArrayHasKey('settings', $data['data']);
    }

    public function testCreateValidateEventsAndReturnsSecretOnce(): void
    {
        $bad = $this->json($this->controller->create(Request::create(
            '/api/admin/webhooks',
            'POST',
            [],
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['url' => 'https://example.com/hook', 'events' => []]),
        )));
        $this->assertFalse($bad['success']);
        $this->assertSame('WEBHOOK_EVENTS_REQUIRED', $bad['error_code']);

        $ok = $this->json($this->controller->create(Request::create(
            '/api/admin/webhooks',
            'POST',
            [],
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([
                'url' => 'https://example.com/hook-' . bin2hex(random_bytes(3)),
                'events' => ['server.created', 'user.created'],
                'description' => 'PHPUnit',
            ]),
        )));
        $this->assertTrue($ok['success']);
        $id = (int) $ok['data']['webhook']['id'];
        $this->created[] = $id;
        $this->assertNotEmpty($ok['data']['secret']);
        $this->assertStringStartsWith('whsec_', $ok['data']['secret']);
        $this->assertSame(['server.created', 'user.created'], $ok['data']['webhook']['events']);
    }

    public function testPrivateLoopbackUrlRejectedByDefault(): void
    {
        $res = $this->json($this->controller->create(Request::create(
            '/api/admin/webhooks',
            'POST',
            [],
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['url' => 'http://127.0.0.1:9/hook', 'events' => ['*']]),
        )));
        $this->assertFalse($res['success']);
        $this->assertSame('WEBHOOK_URL_PRIVATE_ADDRESS', $res['error_code']);
    }

    public function testUpdatePatchEnabledAndDelete(): void
    {
        $id = $this->createFixture();
        $patch = $this->json($this->controller->update(Request::create(
            '/api/admin/webhooks/' . $id,
            'PATCH',
            [],
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode(['enabled' => false, 'format' => 'discord']),
        ), $id));
        $this->assertTrue($patch['success']);
        $this->assertFalse($patch['data']['webhook']['enabled']);
        $this->assertSame('discord', $patch['data']['webhook']['format']);

        $del = $this->json($this->controller->delete(Request::create('/api/admin/webhooks/' . $id, 'DELETE'), $id));
        $this->assertTrue($del['success']);
        $this->created = array_values(array_diff($this->created, [$id]));
    }

    /** @return array<string, mixed> */
    private function json(Symfony\Component\HttpFoundation\Response $response): array
    {
        $data = json_decode($response->getContent(), true);
        $this->assertIsArray($data);

        return $data;
    }

    private function createFixture(): int
    {
        $ok = $this->json($this->controller->create(Request::create(
            '/api/admin/webhooks',
            'POST',
            [],
            [],
            [],
            ['CONTENT_TYPE' => 'application/json'],
            json_encode([
                'url' => 'https://example.com/hook-' . bin2hex(random_bytes(3)),
                'events' => ['*'],
            ]),
        )));
        $id = (int) $ok['data']['webhook']['id'];
        $this->created[] = $id;

        return $id;
    }
}
