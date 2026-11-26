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

use PHPUnit\Framework\TestCase;
use App\Services\Webhooks\WebhookEvents;
use App\Services\Webhooks\WebhookSender;
use App\Services\Webhooks\WebhookDispatcher;
use App\Services\Webhooks\WebhookDeliveryProcessor;

class WebhooksTest extends TestCase
{
    protected function tearDown(): void
    {
        WebhookSender::$allowPrivateOverride = null;
    }

    public function testEventsNormalizeAndMatch(): void
    {
        $this->assertSame(['*'], WebhookEvents::normalize(['server.created', '*']));
        $this->assertSame(['server.created', 'user.created'], WebhookEvents::normalize(['user.created', 'server.created', 'bogus', 'server.created']));
        $this->assertSame([], WebhookEvents::normalize('not-an-array'));
        $this->assertTrue(WebhookEvents::matches(['*'], 'backup.failed'));
        $this->assertTrue(WebhookEvents::matches(['server.created'], 'server.created'));
        $this->assertFalse(WebhookEvents::matches(['server.created'], 'user.deleted'));
        $this->assertCount(count(WebhookEvents::EVENTS), WebhookEvents::catalogue());
    }

    public function testSignatureRoundTrip(): void
    {
        $secret = 'whsec_' . bin2hex(random_bytes(8));
        $body = '{"id":"evt","event":"server.created","timestamp":"2026-01-01T00:00:00Z","data":{}}';
        $ts = 1_700_000_000;
        $sig = WebhookSender::sign($secret, $ts, $body);
        $this->assertStringStartsWith('sha256=', $sig);
        $this->assertTrue(WebhookSender::verify($secret, (string) $ts, $body, $sig, 300, $ts));
        $this->assertFalse(WebhookSender::verify($secret, (string) $ts, $body . 'x', $sig, 300, $ts));
        $this->assertFalse(WebhookSender::verify($secret, (string) $ts, $body, $sig, 300, $ts + 400));
    }

    public function testUrlShapeAndPrivateAddresses(): void
    {
        $this->assertNull(WebhookSender::shapeError('https://hooks.example.test/event'));
        $this->assertSame('WEBHOOK_URL_INVALID', WebhookSender::shapeError('ftp://hooks.example.test/x'));
        $this->assertSame('WEBHOOK_URL_INVALID', WebhookSender::shapeError('https://user:pass@hooks.example.test/x'));
        $this->assertTrue(WebhookSender::addressAllowed('8.8.8.8', false));
        $this->assertFalse(WebhookSender::addressAllowed('127.0.0.1', false));
        $this->assertTrue(WebhookSender::addressAllowed('127.0.0.1', true));
        $this->assertFalse(WebhookSender::addressAllowed('169.254.169.254', true));
    }

    public function testDiscordBodyBuilder(): void
    {
        $payload = WebhookDispatcher::envelope('server.created', [
            'server' => ['uuid' => 'abc', 'name' => 'Survival', 'status' => 'installing'],
            'actor' => ['username' => 'admin'],
        ]);
        $json = WebhookSender::body($payload, WebhookSender::FORMAT_JSON);
        $discord = WebhookSender::body($payload, WebhookSender::FORMAT_DISCORD);
        $this->assertStringContainsString('server.created', $json);
        $decoded = json_decode($discord, true);
        $this->assertIsArray($decoded);
        $this->assertArrayHasKey('embeds', $decoded);
        $this->assertStringContainsString('server.created', (string) $decoded['embeds'][0]['title']);
    }

    public function testDispatcherEnvelope(): void
    {
        $payload = WebhookDispatcher::envelope('user.updated', ['user' => ['uuid' => 'u']]);
        $this->assertSame('user.updated', $payload['event']);
        $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}$/i', $payload['id']);
        $this->assertSame($payload, json_decode(WebhookDispatcher::encode($payload), true));
    }

    public function testDeliveryBackoff(): void
    {
        $this->assertSame(60, WebhookDeliveryProcessor::backoffFor(1));
        $this->assertSame(300, WebhookDeliveryProcessor::backoffFor(2));
        $this->assertSame(7200, WebhookDeliveryProcessor::backoffFor(4));
        $this->assertSame(21600, WebhookDeliveryProcessor::backoffFor(99));
    }
}
