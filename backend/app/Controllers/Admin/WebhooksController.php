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

namespace App\Controllers\Admin;

use App\App;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use App\Middleware\AuthMiddleware;
use App\CloudFlare\CloudFlareRealIP;
use App\Services\Webhooks\WebhookStore;
use App\Services\Webhooks\WebhookEvents;
use App\Services\Webhooks\WebhookSender;
use App\Services\Webhooks\WebhookPayloads;
use App\Services\Webhooks\WebhookDispatcher;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\Webhooks\WebhookDeliveryProcessor;

/**
 * Admin webhooks: panel events sent to outside URLs, signed with a per-webhook secret,
 * with a delivery log, test sends and redelivery.
 */
class WebhooksController
{
    public const MAX_WEBHOOKS = 50;

    public function index(Request $request): Response
    {
        return ApiResponse::success([
            'webhooks' => array_map(fn (array $row): array => $this->present($row, true), WebhookStore::all()),
            'events' => WebhookEvents::catalogue(),
            'formats' => WebhookSender::FORMATS,
            'settings' => $this->settingsData(),
        ], 'Webhooks loaded');
    }

    public function show(Request $request, int $id): Response
    {
        $row = WebhookStore::find($id);
        if ($row === null) {
            return $this->notFound();
        }

        return ApiResponse::success(['webhook' => $this->present($row, true)], 'Webhook loaded');
    }

    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }
        if (count(WebhookStore::all()) >= self::MAX_WEBHOOKS) {
            return ApiResponse::error('You can have at most ' . self::MAX_WEBHOOKS . ' webhooks', 'WEBHOOK_LIMIT_REACHED', 422);
        }
        [$fields, $error] = $this->validate($data, null);
        if ($error !== null) {
            return $error;
        }
        $secret = isset($fields['secret']) ? (string) $fields['secret'] : self::newSecret();
        $admin = AuthMiddleware::getCurrentUser($request);
        $id = WebhookStore::create([
            'url' => (string) $fields['url'],
            'secret' => $secret,
            'events' => (array) $fields['events'],
            'format' => (string) ($fields['format'] ?? WebhookSender::FORMAT_JSON),
            'enabled' => (bool) ($fields['enabled'] ?? true),
            'description' => $fields['description'] ?? null,
            'created_by_uuid' => $admin['uuid'] ?? null,
        ]);
        $row = WebhookStore::find($id);
        if ($row === null) {
            return ApiResponse::error('Failed to create webhook', 'WEBHOOK_CREATE_FAILED', 500);
        }
        $this->log($request, 'webhook_create', 'Created webhook #' . $id . ' for ' . self::hostOf((string) $row['url']));

        return ApiResponse::success(['webhook' => $this->present($row, true), 'secret' => $secret], 'Webhook created', 201);
    }

    public function update(Request $request, int $id): Response
    {
        $row = WebhookStore::find($id);
        if ($row === null) {
            return $this->notFound();
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }
        [$fields, $error] = $this->validate($data, $row);
        if ($error !== null) {
            return $error;
        }
        if (!WebhookStore::update($id, $fields)) {
            return ApiResponse::error('Failed to update webhook', 'WEBHOOK_UPDATE_FAILED', 500);
        }
        $this->log($request, 'webhook_update', 'Updated webhook #' . $id);

        return ApiResponse::success(['webhook' => $this->present((array) WebhookStore::find($id), true)], 'Webhook updated');
    }

    public function delete(Request $request, int $id): Response
    {
        $row = WebhookStore::find($id);
        if ($row === null) {
            return $this->notFound();
        }
        WebhookStore::delete($id);
        $this->log($request, 'webhook_delete', 'Deleted webhook #' . $id . ' for ' . self::hostOf((string) $row['url']));

        return ApiResponse::success([], 'Webhook deleted');
    }

    public function secret(Request $request, int $id): Response
    {
        $row = WebhookStore::find($id);
        if ($row === null) {
            return $this->notFound();
        }
        $this->log($request, 'webhook_secret_view', 'Viewed the secret of webhook #' . $id);

        return ApiResponse::success(['secret' => WebhookStore::secretOf($row)], 'Webhook secret loaded');
    }

    public function rotateSecret(Request $request, int $id): Response
    {
        if (WebhookStore::find($id) === null) {
            return $this->notFound();
        }
        $secret = self::newSecret();
        if (!WebhookStore::update($id, ['secret' => $secret])) {
            return ApiResponse::error('Failed to rotate the secret', 'WEBHOOK_UPDATE_FAILED', 500);
        }
        $this->log($request, 'webhook_secret_rotate', 'Rotated the secret of webhook #' . $id);

        return ApiResponse::success(['secret' => $secret, 'webhook' => $this->present((array) WebhookStore::find($id), true)], 'Webhook secret rotated');
    }

    public function test(Request $request, int $id): Response
    {
        $row = WebhookStore::find($id);
        if ($row === null) {
            return $this->notFound();
        }
        $admin = AuthMiddleware::getCurrentUser($request);
        $payload = WebhookDispatcher::envelope(WebhookEvents::TEST, [
            'message' => 'Test delivery from FeatherPanel',
            'webhook_id' => $id,
            'actor' => WebhookPayloads::actor($admin),
        ]);
        $deliveryId = WebhookStore::queue($id, $payload['id'], WebhookEvents::TEST, WebhookDispatcher::encode($payload), 1);
        $outcome = WebhookDeliveryProcessor::attempt($deliveryId, true);
        $this->log($request, 'webhook_test', 'Sent a test delivery to webhook #' . $id);

        return $this->outcomeResponse($deliveryId, $outcome, 'Test delivery sent');
    }

    public function deliveries(Request $request, int $id): Response
    {
        if (WebhookStore::find($id) === null) {
            return $this->notFound();
        }
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(1, (int) $request->query->get('limit', 20)));
        $status = (string) $request->query->get('status', '');
        $status = in_array($status, [WebhookStore::STATUS_PENDING, WebhookStore::STATUS_DELIVERED, WebhookStore::STATUS_FAILED], true) ? $status : null;
        $event = (string) $request->query->get('event', '');
        $event = ($event === WebhookEvents::TEST || WebhookEvents::isKnown($event)) ? $event : null;
        $result = WebhookStore::deliveries($id, $page, $limit, $status, $event);

        return ApiResponse::success([
            'items' => array_map([$this, 'presentDelivery'], $result['items']),
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $result['total'],
                'total_pages' => (int) ceil($result['total'] / $limit),
                'has_next' => $page * $limit < $result['total'],
                'has_prev' => $page > 1,
            ],
        ], 'Webhook deliveries loaded');
    }

    public function delivery(Request $request, int $deliveryId): Response
    {
        $row = WebhookStore::findDelivery($deliveryId);
        if ($row === null) {
            return ApiResponse::error('Delivery not found', 'WEBHOOK_DELIVERY_NOT_FOUND', 404);
        }
        $out = $this->presentDelivery($row);
        $payload = json_decode((string) $row['payload'], true);
        $out['payload'] = is_array($payload) ? $payload : null;
        $out['response_snippet'] = $row['response_snippet'];

        return ApiResponse::success(['delivery' => $out], 'Webhook delivery loaded');
    }

    public function redeliver(Request $request, int $deliveryId): Response
    {
        $row = WebhookStore::findDelivery($deliveryId);
        if ($row === null) {
            return ApiResponse::error('Delivery not found', 'WEBHOOK_DELIVERY_NOT_FOUND', 404);
        }
        $webhookId = (int) $row['webhook_id'];
        $newId = WebhookStore::queue($webhookId, (string) $row['event_id'], (string) $row['event'], (string) $row['payload'], $row['event'] === WebhookEvents::TEST ? 1 : 5, $deliveryId);
        $outcome = WebhookDeliveryProcessor::attempt($newId, true);
        $this->log($request, 'webhook_redeliver', 'Redelivered webhook delivery #' . $deliveryId . ' to webhook #' . $webhookId);

        return $this->outcomeResponse($newId, $outcome, 'Delivery sent again');
    }

    public function settings(Request $request): Response
    {
        return ApiResponse::success(['settings' => $this->settingsData()], 'Webhook settings loaded');
    }

    public function updateSettings(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !array_key_exists('allow_private_targets', $data) || !is_bool($data['allow_private_targets'])) {
            return ApiResponse::error('allow_private_targets must be true or false', 'INVALID_REQUEST_BODY', 400);
        }
        $value = $data['allow_private_targets'] ? 'true' : 'false';
        if (!App::getInstance(true)->getConfig()->setSetting(ConfigInterface::WEBHOOKS_ALLOW_PRIVATE_TARGETS, $value)) {
            return ApiResponse::error('Failed to save webhook settings', 'WEBHOOK_SETTINGS_SAVE_FAILED', 500);
        }
        $this->log($request, 'webhook_settings_update', ($data['allow_private_targets'] ? 'Allowed' : 'Blocked') . ' private webhook targets');

        return ApiResponse::success(['settings' => $this->settingsData()], 'Webhook settings saved');
    }

    public static function newSecret(): string
    {
        return 'whsec_' . bin2hex(random_bytes(24));
    }

    /**
     * Validate a create (row = null) or partial update body.
     *
     * @param array<string, mixed> $data
     * @param array<string, mixed>|null $row
     *
     * @return array{0: array<string, mixed>, 1: Response|null}
     */
    private function validate(array $data, ?array $row): array
    {
        $creating = $row === null;
        $fields = [];

        if ($creating || array_key_exists('url', $data)) {
            $url = is_string($data['url'] ?? null) ? trim($data['url']) : '';
            $shape = WebhookSender::shapeError($url);
            if ($shape !== null) {
                return [[], ApiResponse::error(WebhookSender::errorMessage($shape), $shape, 422)];
            }
            [$pin, $code] = WebhookSender::pin($url);
            if ($pin === null) {
                return [[], ApiResponse::error(WebhookSender::errorMessage($code), (string) $code, 422)];
            }
            $fields['url'] = $url;
        }

        if ($creating || array_key_exists('events', $data)) {
            $events = WebhookEvents::normalize($data['events'] ?? null);
            if ($events === []) {
                return [[], ApiResponse::error('Pick at least one event', 'WEBHOOK_EVENTS_REQUIRED', 422)];
            }
            $fields['events'] = $events;
        }

        if (array_key_exists('format', $data)) {
            if (!is_string($data['format']) || !in_array($data['format'], WebhookSender::FORMATS, true)) {
                return [[], ApiResponse::error('Format must be json or discord', 'WEBHOOK_FORMAT_INVALID', 422)];
            }
            $fields['format'] = $data['format'];
        }

        if (array_key_exists('enabled', $data)) {
            if (!is_bool($data['enabled'])) {
                return [[], ApiResponse::error('enabled must be true or false', 'INVALID_REQUEST_BODY', 400)];
            }
            $fields['enabled'] = $data['enabled'];
        }

        if (array_key_exists('description', $data)) {
            if ($data['description'] !== null && !is_string($data['description'])) {
                return [[], ApiResponse::error('Description must be text', 'INVALID_REQUEST_BODY', 400)];
            }
            $description = trim((string) ($data['description'] ?? ''));
            if (mb_strlen($description) > 255) {
                return [[], ApiResponse::error('Description must be at most 255 characters', 'WEBHOOK_DESCRIPTION_TOO_LONG', 422)];
            }
            $fields['description'] = $description === '' ? null : $description;
        }

        if (array_key_exists('secret', $data) && $data['secret'] !== null && $data['secret'] !== '') {
            if (!is_string($data['secret']) || strlen($data['secret']) < 16 || strlen($data['secret']) > 255 || preg_match('/\s/', $data['secret'])) {
                return [[], ApiResponse::error('The secret must be 16 to 255 characters without spaces', 'WEBHOOK_SECRET_INVALID', 422)];
            }
            $fields['secret'] = $data['secret'];
        }

        return [$fields, null];
    }

    /**
     * @param array{status: string, attempts: int, result: array{ok: bool, status_code: int|null, response: string|null, error: string|null, duration_ms: int}}|null $outcome
     */
    private function outcomeResponse(int $deliveryId, ?array $outcome, string $message): Response
    {
        $delivery = WebhookStore::findDelivery($deliveryId);
        $data = [
            'delivery' => $delivery !== null ? $this->presentDelivery($delivery) + ['response_snippet' => $delivery['response_snippet']] : null,
            'ok' => $outcome !== null && $outcome['result']['ok'],
        ];

        return ApiResponse::success($data, $message);
    }

    /** @param array<string, mixed> $row */
    private function present(array $row, bool $withStats): array
    {
        $secret = WebhookStore::secretOf($row);
        $out = [
            'id' => (int) $row['id'],
            'url' => (string) $row['url'],
            'events' => WebhookStore::eventsOf($row),
            'format' => (string) $row['format'],
            'enabled' => (int) $row['enabled'] === 1,
            'description' => $row['description'],
            'secret_set' => $secret !== '',
            'secret_hint' => $secret !== '' ? '…' . substr($secret, -4) : null,
            'last_delivery_at' => $row['last_delivery_at'],
            'last_delivery_status' => $row['last_delivery_status'],
            'created_at' => $row['created_at'],
            'updated_at' => $row['updated_at'],
        ];
        if ($withStats) {
            $out['stats_24h'] = WebhookStore::stats((int) $row['id']);
        }

        return $out;
    }

    /** @param array<string, mixed> $row */
    private function presentDelivery(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'webhook_id' => (int) $row['webhook_id'],
            'event_id' => (string) $row['event_id'],
            'event' => (string) $row['event'],
            'status' => $row['status'] === WebhookStore::STATUS_SENDING ? WebhookStore::STATUS_PENDING : (string) $row['status'],
            'attempts' => (int) $row['attempts'],
            'max_attempts' => (int) $row['max_attempts'],
            'status_code' => $row['status_code'] !== null ? (int) $row['status_code'] : null,
            'error' => $row['error'],
            'duration_ms' => $row['duration_ms'] !== null ? (int) $row['duration_ms'] : null,
            'next_retry_at' => $row['next_retry_at'],
            'last_attempt_at' => $row['last_attempt_at'],
            'delivered_at' => $row['delivered_at'],
            'redelivery_of' => $row['redelivery_of'] !== null ? (int) $row['redelivery_of'] : null,
            'created_at' => $row['created_at'],
        ];
    }

    private function settingsData(): array
    {
        $env = strtolower((string) (App::env(WebhookSender::ENV_ALLOW_PRIVATE, '') ?? ''));
        $value = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::WEBHOOKS_ALLOW_PRIVATE_TARGETS, 'false');

        return [
            'allow_private_targets' => in_array(strtolower((string) $value), ['1', 'true', 'yes'], true),
            'allow_private_env' => in_array($env, ['1', 'true', 'yes'], true),
            'max_attempts' => 5,
            'backoff_seconds' => array_slice(WebhookDeliveryProcessor::BACKOFF, 0, 4),
        ];
    }

    private function notFound(): Response
    {
        return ApiResponse::error('Webhook not found', 'WEBHOOK_NOT_FOUND', 404);
    }

    private static function hostOf(string $url): string
    {
        return (string) (parse_url($url, PHP_URL_HOST) ?: 'unknown host');
    }

    private function log(Request $request, string $name, string $context): void
    {
        try {
            $admin = AuthMiddleware::getCurrentUser($request);
            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => $name,
                'context' => $context,
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);
        } catch (\Throwable) {
        }
    }
}
