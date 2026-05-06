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

namespace App\Controllers\User\Server;

use App\App;
use App\Chat\Server;
use App\SubuserPermissions;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use App\Chat\ServerLifecycleHook;
use App\Chat\ServerLifecycleHookStep;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ServerLifecycleHookController
{
    use CheckSubuserPermissionsTrait;

    private const ALLOWED_HOOK_TYPES = ['pre_start', 'pre_stop'];
    private const ALLOWED_TASK_TYPES = ['discord_webhook', 'container_command', 'http_request'];
    private const ALLOWED_HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

    public function getHooks(Request $request, string $serverUuid): Response
    {
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::SCHEDULE_READ);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        $hooks = ServerLifecycleHook::getHooksByServerId((int) $server['id']);
        $hookMap = [];
        foreach ($hooks as $hook) {
            $hookMap[$hook['hook_type']] = [
                ...$hook,
                'steps' => ServerLifecycleHookStep::getStepsByHookId((int) $hook['id']),
            ];
        }

        $responseHooks = [];
        foreach (self::ALLOWED_HOOK_TYPES as $hookType) {
            $responseHooks[] = $hookMap[$hookType] ?? [
                'id' => null,
                'server_id' => (int) $server['id'],
                'hook_type' => $hookType,
                'is_active' => 0,
                'steps' => [],
            ];
        }

        $featureEnabled = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::SERVER_LIFECYCLE_HOOKS_ENABLED, 'false') === 'true';

        return ApiResponse::success([
            'hooks' => $responseHooks,
            'feature_enabled' => $featureEnabled,
        ]);
    }

    public function upsertHook(Request $request, string $serverUuid, string $hookType): Response
    {
        if (!in_array($hookType, self::ALLOWED_HOOK_TYPES, true)) {
            return ApiResponse::error('Invalid hook type', 'INVALID_HOOK_TYPE', 400);
        }

        $feature = $this->requireLifecycleHooksFeatureEnabled();
        if ($feature !== null) {
            return $feature;
        }

        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::SCHEDULE_UPDATE);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }

        $isActive = (int) (($body['is_active'] ?? 1) ? 1 : 0);
        $hookId = ServerLifecycleHook::upsertHookByServerAndType((int) $server['id'], $hookType, $isActive);
        if (!$hookId) {
            return ApiResponse::error('Failed to update lifecycle hook', 'UPDATE_FAILED', 500);
        }

        $hook = ServerLifecycleHook::getHookById((int) $hookId);
        if (!$hook) {
            return ApiResponse::error('Lifecycle hook not found', 'HOOK_NOT_FOUND', 404);
        }

        return ApiResponse::success([
            'hook' => [
                ...$hook,
                'steps' => ServerLifecycleHookStep::getStepsByHookId((int) $hook['id']),
            ],
        ]);
    }

    public function createStep(Request $request, string $serverUuid, string $hookType): Response
    {
        if (!in_array($hookType, self::ALLOWED_HOOK_TYPES, true)) {
            return ApiResponse::error('Invalid hook type', 'INVALID_HOOK_TYPE', 400);
        }

        $feature = $this->requireLifecycleHooksFeatureEnabled();
        if ($feature !== null) {
            return $feature;
        }

        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::SCHEDULE_UPDATE);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }

        $taskType = trim((string) ($body['task_type'] ?? ''));
        if (!in_array($taskType, self::ALLOWED_TASK_TYPES, true)) {
            return ApiResponse::error('Invalid task type', 'INVALID_TASK_TYPE', 400);
        }

        $payload = $body['payload'] ?? null;
        if (!is_array($payload)) {
            return ApiResponse::error('Payload must be an object', 'INVALID_PAYLOAD', 400);
        }

        $validationError = $this->validateTaskPayload($taskType, $payload);
        if ($validationError !== null) {
            return ApiResponse::error($validationError, 'INVALID_PAYLOAD', 400);
        }

        $hookId = ServerLifecycleHook::upsertHookByServerAndType((int) $server['id'], $hookType, 1);
        if (!$hookId) {
            return ApiResponse::error('Failed to resolve lifecycle hook', 'HOOK_RESOLVE_FAILED', 500);
        }

        $stepId = ServerLifecycleHookStep::createStep([
            'hook_id' => (int) $hookId,
            'sequence_id' => ServerLifecycleHookStep::getNextSequenceId((int) $hookId),
            'task_type' => $taskType,
            'payload' => json_encode($payload),
            'continue_on_failure' => (int) (($body['continue_on_failure'] ?? 0) ? 1 : 0),
        ]);

        if (!$stepId) {
            return ApiResponse::error('Failed to create lifecycle hook step', 'CREATE_FAILED', 500);
        }

        $step = ServerLifecycleHookStep::getStepById((int) $stepId);

        return ApiResponse::success(['step' => $step], 'Step created', 201);
    }

    public function updateStep(Request $request, string $serverUuid, string $hookType, int $stepId): Response
    {
        if (!in_array($hookType, self::ALLOWED_HOOK_TYPES, true)) {
            return ApiResponse::error('Invalid hook type', 'INVALID_HOOK_TYPE', 400);
        }

        $feature = $this->requireLifecycleHooksFeatureEnabled();
        if ($feature !== null) {
            return $feature;
        }

        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::SCHEDULE_UPDATE);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        $hook = ServerLifecycleHook::getHookByServerAndType((int) $server['id'], $hookType);
        if (!$hook) {
            return ApiResponse::error('Lifecycle hook not found', 'HOOK_NOT_FOUND', 404);
        }

        $step = ServerLifecycleHookStep::getStepById($stepId);
        if (!$step || (int) $step['hook_id'] !== (int) $hook['id']) {
            return ApiResponse::error('Lifecycle hook step not found', 'STEP_NOT_FOUND', 404);
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }

        $taskType = isset($body['task_type']) ? trim((string) $body['task_type']) : (string) $step['task_type'];
        if (!in_array($taskType, self::ALLOWED_TASK_TYPES, true)) {
            return ApiResponse::error('Invalid task type', 'INVALID_TASK_TYPE', 400);
        }

        $existingPayload = json_decode((string) $step['payload'], true);
        if (!is_array($existingPayload)) {
            $existingPayload = [];
        }
        $payload = array_key_exists('payload', $body) ? $body['payload'] : $existingPayload;
        if (!is_array($payload)) {
            return ApiResponse::error('Payload must be an object', 'INVALID_PAYLOAD', 400);
        }

        $validationError = $this->validateTaskPayload($taskType, $payload);
        if ($validationError !== null) {
            return ApiResponse::error($validationError, 'INVALID_PAYLOAD', 400);
        }

        $updated = ServerLifecycleHookStep::updateStepById($stepId, [
            'task_type' => $taskType,
            'payload' => json_encode($payload),
            'continue_on_failure' => (int) (($body['continue_on_failure'] ?? $step['continue_on_failure']) ? 1 : 0),
        ]);
        if (!$updated) {
            return ApiResponse::error('Failed to update lifecycle hook step', 'UPDATE_FAILED', 500);
        }

        return ApiResponse::success([
            'step' => ServerLifecycleHookStep::getStepById($stepId),
        ]);
    }

    public function updateStepSequence(Request $request, string $serverUuid, string $hookType, int $stepId): Response
    {
        if (!in_array($hookType, self::ALLOWED_HOOK_TYPES, true)) {
            return ApiResponse::error('Invalid hook type', 'INVALID_HOOK_TYPE', 400);
        }

        $feature = $this->requireLifecycleHooksFeatureEnabled();
        if ($feature !== null) {
            return $feature;
        }

        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::SCHEDULE_UPDATE);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        $hook = ServerLifecycleHook::getHookByServerAndType((int) $server['id'], $hookType);
        if (!$hook) {
            return ApiResponse::error('Lifecycle hook not found', 'HOOK_NOT_FOUND', 404);
        }

        $step = ServerLifecycleHookStep::getStepById($stepId);
        if (!$step || (int) $step['hook_id'] !== (int) $hook['id']) {
            return ApiResponse::error('Lifecycle hook step not found', 'STEP_NOT_FOUND', 404);
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body) || !isset($body['sequence_id'])) {
            return ApiResponse::error('Missing required field: sequence_id', 'MISSING_REQUIRED_FIELD', 400);
        }

        $newSequenceId = (int) $body['sequence_id'];
        if ($newSequenceId <= 0) {
            return ApiResponse::error('Invalid sequence id', 'INVALID_SEQUENCE_ID', 400);
        }

        if (!ServerLifecycleHookStep::updateSequenceOrder($stepId, $newSequenceId)) {
            return ApiResponse::error('Failed to update sequence', 'UPDATE_FAILED', 500);
        }

        return ApiResponse::success(null, 'Step sequence updated');
    }

    public function deleteStep(Request $request, string $serverUuid, string $hookType, int $stepId): Response
    {
        if (!in_array($hookType, self::ALLOWED_HOOK_TYPES, true)) {
            return ApiResponse::error('Invalid hook type', 'INVALID_HOOK_TYPE', 400);
        }

        $feature = $this->requireLifecycleHooksFeatureEnabled();
        if ($feature !== null) {
            return $feature;
        }

        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::SCHEDULE_UPDATE);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        $hook = ServerLifecycleHook::getHookByServerAndType((int) $server['id'], $hookType);
        if (!$hook) {
            return ApiResponse::error('Lifecycle hook not found', 'HOOK_NOT_FOUND', 404);
        }

        $step = ServerLifecycleHookStep::getStepById($stepId);
        if (!$step || (int) $step['hook_id'] !== (int) $hook['id']) {
            return ApiResponse::error('Lifecycle hook step not found', 'STEP_NOT_FOUND', 404);
        }

        if (!ServerLifecycleHookStep::deleteStepById($stepId)) {
            return ApiResponse::error('Failed to delete lifecycle hook step', 'DELETE_FAILED', 500);
        }

        ServerLifecycleHookStep::reorderSteps((int) $hook['id']);

        return ApiResponse::success(null, 'Step deleted');
    }

    private function requireLifecycleHooksFeatureEnabled(): ?Response
    {
        $enabled = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::SERVER_LIFECYCLE_HOOKS_ENABLED, 'false') === 'true';
        if (!$enabled) {
            return ApiResponse::error('Lifecycle hooks are disabled by the administrator.', 'FEATURE_DISABLED', 403);
        }

        return null;
    }

    private function validateTaskPayload(string $taskType, array $payload): ?string
    {
        return match ($taskType) {
            'discord_webhook' => $this->validateDiscordWebhookPayload($payload),
            'container_command' => $this->validateContainerCommandPayload($payload),
            'http_request' => $this->validateHttpRequestPayload($payload),
            default => 'Unsupported task type',
        };
    }

    private function validateDiscordWebhookPayload(array $payload): ?string
    {
        foreach (array_keys($payload) as $key) {
            if (!in_array($key, ['url', 'content', 'username', 'embeds'], true)) {
                return 'Unsupported field in Discord webhook payload';
            }
        }

        $url = trim((string) ($payload['url'] ?? ''));
        if (!$this->isValidDiscordWebhookUrl($url)) {
            return 'Invalid Discord webhook URL';
        }

        $content = isset($payload['content']) ? (string) $payload['content'] : '';
        $embeds = $payload['embeds'] ?? null;
        if (trim($content) === '' && (!is_array($embeds) || $embeds === [])) {
            return 'Provide either content or embeds for Discord webhook';
        }

        if (strlen($content) > 1800) {
            return 'Discord content exceeds max length of 1800 characters';
        }

        if (isset($payload['username']) && strlen((string) $payload['username']) > 80) {
            return 'Discord username exceeds max length of 80 characters';
        }

        if ($embeds !== null) {
            if (!is_array($embeds)) {
                return 'Discord embeds must be an array';
            }
            if (count($embeds) > 10) {
                return 'Discord embeds exceed max count of 10';
            }
            $embedError = $this->validateDiscordEmbedsPayload($embeds);
            if ($embedError !== null) {
                return $embedError;
            }
        }

        return null;
    }

    /**
     * Strict validation for Discord embed objects (whitelist fields, sizes, safe URLs).
     */
    private function validateDiscordEmbedsPayload(array $embeds): ?string
    {
        $allowedTop = ['title', 'description', 'url', 'timestamp', 'color', 'footer', 'image', 'thumbnail', 'author', 'fields'];
        $totalApprox = 0;

        foreach ($embeds as $i => $embed) {
            if (!is_array($embed)) {
                return 'Invalid Discord embed format';
            }
            foreach (array_keys($embed) as $ek) {
                if (!in_array($ek, $allowedTop, true)) {
                    return 'Invalid or disallowed Discord embed property';
                }
            }

            $body = $this->discordEmbedHasRenderableBody($embed);
            if (!$body) {
                return 'Each Discord embed must include title, description, fields, URL, media, footer, author, or timestamp';
            }

            if (isset($embed['title'])) {
                if (!is_string($embed['title'])) {
                    return 'Embed title must be a string';
                }
                if (strlen($embed['title']) > 256) {
                    return 'Embed title exceeds max length';
                }
                $totalApprox += strlen($embed['title']);
            }
            if (isset($embed['description'])) {
                if (!is_string($embed['description'])) {
                    return 'Embed description must be a string';
                }
                if (strlen($embed['description']) > 4096) {
                    return 'Embed description exceeds max length';
                }
                $totalApprox += strlen($embed['description']);
            }
            if (isset($embed['url'])) {
                $u = trim((string) $embed['url']);
                if (!$this->isSafeHttpsUrl($u)) {
                    return 'Invalid embed URL (HTTPS required)';
                }
            }
            if (isset($embed['timestamp'])) {
                if (!is_string($embed['timestamp'])) {
                    return 'Embed timestamp must be a string';
                }
                $ts = trim($embed['timestamp']);
                if ($ts === '' || strlen($ts) > 40 || !preg_match('/^\d{4}-\d{2}-\d{2}T/', $ts)) {
                    return 'Embed timestamp must be ISO-8601 formatted';
                }
            }
            if (isset($embed['color'])) {
                $color = $embed['color'];
                if (is_float($color)) {
                    $color = (int) round($color);
                }
                if (!is_int($color) || $color < 0 || $color > 16777215) {
                    return 'Invalid embed color';
                }
            }

            if (isset($embed['footer'])) {
                if (!is_array($embed['footer'])) {
                    return 'Embed footer must be an object';
                }
                foreach (array_keys($embed['footer']) as $fk) {
                    if (!in_array($fk, ['text', 'icon_url'], true)) {
                        return 'Invalid embed footer property';
                    }
                }
                if (isset($embed['footer']['text'])) {
                    if (!is_string($embed['footer']['text']) || strlen($embed['footer']['text']) > 2048) {
                        return 'Embed footer text is invalid';
                    }
                    $totalApprox += strlen($embed['footer']['text']);
                }
                if (isset($embed['footer']['icon_url'])) {
                    if (!is_string($embed['footer']['icon_url']) || !$this->isSafeHttpsUrl(trim((string) $embed['footer']['icon_url']))) {
                        return 'Invalid embed footer icon URL';
                    }
                }
            }

            if (isset($embed['image'])) {
                $imgUrlOut = '';
                if (!$this->isDiscordMediaUrlOnlyObject($embed['image'], $imgUrlOut) || !$this->isSafeHttpsUrl($imgUrlOut)) {
                    return 'Embed image must be a single { "url": "https://..." } object';
                }
            }
            if (isset($embed['thumbnail'])) {
                $thumbUrlOut = '';
                if (!$this->isDiscordMediaUrlOnlyObject($embed['thumbnail'], $thumbUrlOut) || !$this->isSafeHttpsUrl($thumbUrlOut)) {
                    return 'Embed thumbnail must be a single { "url": "https://..." } object';
                }
            }

            if (isset($embed['author'])) {
                if (!is_array($embed['author'])) {
                    return 'Embed author must be an object';
                }
                foreach (array_keys($embed['author']) as $ak) {
                    if (!in_array($ak, ['name', 'url', 'icon_url'], true)) {
                        return 'Invalid embed author property';
                    }
                }
                if (isset($embed['author']['name'])) {
                    if (!is_string($embed['author']['name']) || strlen($embed['author']['name']) > 256) {
                        return 'Embed author name is invalid';
                    }
                    $totalApprox += strlen($embed['author']['name']);
                }
                if (isset($embed['author']['url'])) {
                    if (!is_string($embed['author']['url']) || !$this->isSafeHttpsUrl(trim((string) $embed['author']['url']))) {
                        return 'Invalid embed author URL';
                    }
                }
                if (isset($embed['author']['icon_url'])) {
                    if (!is_string($embed['author']['icon_url']) || !$this->isSafeHttpsUrl(trim((string) $embed['author']['icon_url']))) {
                        return 'Invalid embed author icon URL';
                    }
                }
            }

            if (isset($embed['fields'])) {
                if (!is_array($embed['fields'])) {
                    return 'Embed fields must be an array';
                }
                if (count($embed['fields']) > 25) {
                    return 'Embed fields exceed max count';
                }
                foreach ($embed['fields'] as $field) {
                    if (!is_array($field)) {
                        return 'Invalid embed field format';
                    }
                    foreach (array_keys($field) as $fldKey) {
                        if (!in_array($fldKey, ['name', 'value', 'inline'], true)) {
                            return 'Invalid embed field property';
                        }
                    }
                    if (!isset($field['name']) || !is_string($field['name']) || trim($field['name']) === '' || strlen($field['name']) > 256) {
                        return 'Embed field name is invalid';
                    }
                    if (!isset($field['value']) || !is_string($field['value']) || strlen($field['value']) > 1024) {
                        return 'Embed field value is invalid';
                    }
                    if (isset($field['inline']) && !is_bool($field['inline'])) {
                        return 'Embed field inline must be boolean';
                    }
                    $totalApprox += strlen($field['name']) + strlen($field['value']);
                }
            }
        }

        if ($totalApprox > 5500) {
            return 'Combined embed text exceeds safe limit';
        }

        return null;
    }

    /**
     * @param array<mixed,mixed> $embed
     */
    private function discordEmbedHasRenderableBody(array $embed): bool
    {
        if (!empty(trim((string) ($embed['title'] ?? '')))) {
            return true;
        }
        if (!empty(trim((string) ($embed['description'] ?? '')))) {
            return true;
        }
        if (!empty(trim((string) ($embed['url'] ?? '')))) {
            return true;
        }
        if (isset($embed['timestamp']) && is_string($embed['timestamp']) && trim($embed['timestamp']) !== '') {
            return true;
        }
        if (isset($embed['footer']) && is_array($embed['footer'])) {
            if (isset($embed['footer']['text']) && is_string($embed['footer']['text']) && trim($embed['footer']['text']) !== '') {
                return true;
            }
            if (isset($embed['footer']['icon_url']) && is_string($embed['footer']['icon_url']) && trim($embed['footer']['icon_url']) !== '') {
                return true;
            }
        }
        if (isset($embed['author']) && is_array($embed['author'])) {
            if (isset($embed['author']['name']) && is_string($embed['author']['name']) && trim($embed['author']['name']) !== '') {
                return true;
            }
            if (isset($embed['author']['url']) && is_string($embed['author']['url']) && trim($embed['author']['url']) !== '') {
                return true;
            }
            if (isset($embed['author']['icon_url']) && is_string($embed['author']['icon_url']) && trim($embed['author']['icon_url']) !== '') {
                return true;
            }
        }
        if (!empty($embed['fields'])) {
            return true;
        }
        if (isset($embed['image']) && is_array($embed['image']) && isset($embed['image']['url']) && is_string($embed['image']['url']) && trim($embed['image']['url']) !== '') {
            return true;
        }
        if (isset($embed['thumbnail']) && is_array($embed['thumbnail']) && isset($embed['thumbnail']['url']) && is_string($embed['thumbnail']['url']) && trim($embed['thumbnail']['url']) !== '') {
            return true;
        }

        return false;
    }

    private function isDiscordMediaUrlOnlyObject($o, string &$trimmedUrl): bool
    {
        if (!is_array($o) || count($o) !== 1 || !isset($o['url']) || !is_string($o['url'])) {
            return false;
        }
        foreach (array_keys($o) as $k) {
            if ($k !== 'url') {
                return false;
            }
        }
        $trimmedUrl = trim($o['url']);

        return $trimmedUrl !== '';
    }

    private function isValidDiscordWebhookUrl(string $url): bool
    {
        return $this->isSafeHttpUrl($url)
            && (str_contains($url, 'discord.com/api/webhooks/') || str_contains($url, 'discordapp.com/api/webhooks/'));
    }

    private function validateContainerCommandPayload(array $payload): ?string
    {
        $command = trim((string) ($payload['command'] ?? ''));
        if ($command === '') {
            return 'Container command is required';
        }
        if (strlen($command) > 512) {
            return 'Container command exceeds max length of 512 characters';
        }

        return null;
    }

    private function validateHttpRequestPayload(array $payload): ?string
    {
        $url = trim((string) ($payload['url'] ?? ''));
        if (!$this->isSafeHttpUrl($url)) {
            return 'Invalid HTTP request URL';
        }

        $method = strtoupper((string) ($payload['method'] ?? 'GET'));
        if (!in_array($method, self::ALLOWED_HTTP_METHODS, true)) {
            return 'Invalid HTTP request method';
        }

        if (isset($payload['headers']) && !is_array($payload['headers'])) {
            return 'HTTP headers must be an object';
        }
        if (isset($payload['headers']) && is_array($payload['headers'])) {
            foreach ($payload['headers'] as $key => $value) {
                if (!is_string($key) || trim($key) === '') {
                    return 'HTTP header keys must be non-empty strings';
                }
                if (strlen($key) > 64 || strlen((string) $value) > 1024) {
                    return 'HTTP headers exceed allowed size limits';
                }
            }
        }

        if (isset($payload['query']) && !is_array($payload['query'])) {
            return 'HTTP query parameters must be an object';
        }
        if (isset($payload['query']) && is_array($payload['query'])) {
            foreach ($payload['query'] as $key => $value) {
                if (!is_string($key) || trim($key) === '') {
                    return 'HTTP query parameter keys must be non-empty strings';
                }
                if (strlen($key) > 64 || strlen((string) $value) > 1024) {
                    return 'HTTP query parameters exceed allowed size limits';
                }
            }
        }

        if (isset($payload['body'])) {
            $body = is_scalar($payload['body']) ? (string) $payload['body'] : json_encode($payload['body']);
            if ($body === false) {
                return 'HTTP request body is invalid';
            }
            if (strlen($body) > 10000) {
                return 'HTTP request body exceeds max size of 10000 characters';
            }
        }

        return null;
    }

    /**
     * Prefer HTTPS for embed targets to reduce MITM / mixed-content issues.
     */
    private function isSafeHttpsUrl(string $url): bool
    {
        $url = trim($url);
        if ($url === '' || !str_starts_with(strtolower($url), 'https://')) {
            return false;
        }

        return $this->isSafeHttpUrl($url);
    }

    private function isSafeHttpUrl(string $url): bool
    {
        $url = trim($url);
        if ($url === '') {
            return false;
        }
        // Reject unsupported schemes early (prototype pollution / open redirects to exotic handlers).
        if (!preg_match('#^https?://#i', $url)) {
            return false;
        }

        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            return false;
        }

        $parts = parse_url($url);
        if (!is_array($parts)) {
            return false;
        }

        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        if (!in_array($scheme, ['http', 'https'], true)) {
            return false;
        }

        $host = strtolower((string) ($parts['host'] ?? ''));
        if ($host === '' || str_contains($host, "\0")) {
            return false;
        }

        if ($host === 'localhost' || $host === '::1') {
            return false;
        }

        // Block obvious private/link-local literals (mitigate SSRF from user-provided webhook targets).
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            if (!filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return false;
            }
        } else {
            if (
                preg_match('/^127\.\d+\.\d+\.\d+$/', $host)
                || str_starts_with($host, '10.')
                || str_starts_with($host, '192.168.')
                || preg_match('/^172\.(1[6-9]|2\d|3[01])\./', $host)
                || str_starts_with($host, '169.254.')
            ) {
                return false;
            }
        }

        return true;
    }
}
