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

namespace App\Services\Server;

use App\App;
use GuzzleHttp\Client;
use App\Chat\ServerActivity;
use GuzzleHttp\Psr7\Request;
use App\Services\Wings\Wings;
use App\Config\ConfigInterface;
use App\Chat\ServerLifecycleHook;
use App\Chat\ServerLifecycleHookStep;
use App\Plugins\Events\Events\ServerEvent;

/**
 * Executes lifecycle hooks before server power actions.
 */
class LifecycleHookExecutorService
{
    private Client $httpClient;

    public function __construct()
    {
        $this->httpClient = new Client([
            'timeout' => 15,
            'verify' => true,
            'http_errors' => false,
        ]);
    }

    /**
     * Execute the lifecycle hooks for a power action.
     */
    public function executeForPowerAction(array $server, array $node, string $powerAction, ?array $actor = null): array
    {
        App::getInstance(true)->getLogger()->info('Lifecycle hooks requested for server ' . ($server['uuid'] ?? 'unknown') . ' action ' . $powerAction);
        $enabled = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::SERVER_LIFECYCLE_HOOKS_ENABLED, 'false') === 'true';
        if (!$enabled) {
            App::getInstance(true)->getLogger()->info('Lifecycle hooks skipped because feature is disabled for server ' . ($server['uuid'] ?? 'unknown') . ' action ' . $powerAction);

            return [
                'attempted' => false,
                'blocked' => false,
                'blocked_reason' => null,
                'pipelines' => [],
            ];
        }

        $pipelines = [];
        if ($powerAction === 'start') {
            $pipelines[] = 'pre_start';
        } elseif ($powerAction === 'stop') {
            $pipelines[] = 'pre_stop';
        } elseif ($powerAction === 'restart') {
            // Keep restart deterministic: pre-stop then pre-start.
            $pipelines[] = 'pre_stop';
            $pipelines[] = 'pre_start';
        }

        $result = [
            'attempted' => !empty($pipelines),
            'blocked' => false,
            'blocked_reason' => null,
            'pipelines' => [],
        ];

        foreach ($pipelines as $hookType) {
            $hook = $this->getActiveHookByServerAndType((int) $server['id'], $hookType);
            if (!$hook) {
                App::getInstance(true)->getLogger()->info('Lifecycle hook pipeline ' . $hookType . ' not configured or inactive for server ' . ($server['uuid'] ?? 'unknown'));
                continue;
            }

            App::getInstance(true)->getLogger()->info('Executing lifecycle hook pipeline ' . $hookType . ' for server ' . ($server['uuid'] ?? 'unknown'));
            $pipelineResult = $this->executeHookPipeline($hook, $server, $node, $powerAction, $actor);
            $result['pipelines'][] = $pipelineResult;

            if ($pipelineResult['blocked']) {
                $result['blocked'] = true;
                $result['blocked_reason'] = $pipelineResult['blocked_reason'];
                break;
            }
        }

        return $result;
    }

    protected function executeHookPipeline(array $hook, array $server, array $node, string $powerAction, ?array $actor): array
    {
        $steps = $this->getStepsByHookId((int) $hook['id']);
        $pipelineResult = [
            'hook_id' => (int) $hook['id'],
            'hook_type' => $hook['hook_type'],
            'blocked' => false,
            'blocked_reason' => null,
            'steps' => [],
        ];

        $this->emitHookEvent(ServerEvent::onServerLifecycleHookStarted(), $server, $powerAction, $hook, $actor);
        $this->createActivity($server, 'server_lifecycle_hook_started', [
            'hook_id' => (int) $hook['id'],
            'hook_type' => $hook['hook_type'],
            'power_action' => $powerAction,
        ]);

        foreach ($steps as $step) {
            $stepResult = $this->executeStep($step, $server, $node, $powerAction, $hook, $actor);
            $pipelineResult['steps'][] = $stepResult;

            if (!$stepResult['success'] && !$stepResult['continued']) {
                $pipelineResult['blocked'] = true;
                $pipelineResult['blocked_reason'] = $stepResult['error'] ?: 'Hook step failed';
                $this->emitHookEvent(ServerEvent::onServerLifecycleHookFailed(), $server, $powerAction, $hook, $actor, [
                    'step_id' => $step['id'],
                    'error' => $pipelineResult['blocked_reason'],
                ]);
                $this->createActivity($server, 'server_lifecycle_hook_failed', [
                    'hook_id' => (int) $hook['id'],
                    'hook_type' => $hook['hook_type'],
                    'step_id' => (int) $step['id'],
                    'power_action' => $powerAction,
                    'error' => $pipelineResult['blocked_reason'],
                ]);
                break;
            }
        }

        if (!$pipelineResult['blocked']) {
            $this->emitHookEvent(ServerEvent::onServerLifecycleHookCompleted(), $server, $powerAction, $hook, $actor);
            $this->createActivity($server, 'server_lifecycle_hook_completed', [
                'hook_id' => (int) $hook['id'],
                'hook_type' => $hook['hook_type'],
                'power_action' => $powerAction,
            ]);
        }

        return $pipelineResult;
    }

    protected function executeStep(array $step, array $server, array $node, string $powerAction, array $hook, ?array $actor): array
    {
        $continueOnFailure = (int) ($step['continue_on_failure'] ?? 0) === 1;
        $result = [
            'step_id' => (int) $step['id'],
            'sequence_id' => (int) $step['sequence_id'],
            'task_type' => $step['task_type'],
            'continue_on_failure' => $continueOnFailure,
            'success' => false,
            'continued' => false,
            'error' => null,
            'meta' => [],
        ];

        $this->emitHookEvent(ServerEvent::onServerLifecycleHookStepStarted(), $server, $powerAction, $hook, $actor, [
            'step_id' => $step['id'],
            'task_type' => $step['task_type'],
            'sequence_id' => $step['sequence_id'],
        ]);

        try {
            $payload = json_decode((string) ($step['payload'] ?? '{}'), true);
            if (json_last_error() !== JSON_ERROR_NONE || !is_array($payload)) {
                throw new \Exception('Invalid hook step payload');
            }

            $taskType = (string) ($step['task_type'] ?? '');
            $meta = $this->dispatchTaskByType($taskType, $payload, $server, $node);

            $result['success'] = true;
            $result['meta'] = $meta;
            $this->emitHookEvent(ServerEvent::onServerLifecycleHookStepCompleted(), $server, $powerAction, $hook, $actor, [
                'step_id' => $step['id'],
                'task_type' => $taskType,
            ]);
        } catch (\Throwable $e) {
            $result['error'] = $e->getMessage();
            $result['continued'] = $continueOnFailure;
            $this->emitHookEvent(ServerEvent::onServerLifecycleHookStepFailed(), $server, $powerAction, $hook, $actor, [
                'step_id' => $step['id'],
                'task_type' => $step['task_type'],
                'error' => $e->getMessage(),
                'continued' => $continueOnFailure,
            ]);
            App::getInstance(true)->getLogger()->warning('Lifecycle hook step failed for server ' . $server['uuid'] . ': ' . $e->getMessage());
        }

        return $result;
    }

    protected function executeDiscordWebhook(array $payload): array
    {
        $url = trim((string) ($payload['url'] ?? ''));
        if (!$this->isSafeUrl($url)) {
            throw new \Exception('Invalid discord webhook URL');
        }

        if (!str_contains($url, 'discord.com/api/webhooks/')) {
            if (!str_contains($url, 'discordapp.com/api/webhooks/')) {
                throw new \Exception('Webhook URL must be a Discord webhook');
            }
        }

        $body = [];
        if (isset($payload['content'])) {
            $body['content'] = substr((string) $payload['content'], 0, 1800);
        }
        if (isset($payload['username'])) {
            $body['username'] = substr((string) $payload['username'], 0, 80);
        }
        if (isset($payload['embeds']) && is_array($payload['embeds'])) {
            $body['embeds'] = array_slice($payload['embeds'], 0, 10);
        }

        if (empty($body)) {
            throw new \Exception('Discord webhook payload is empty');
        }

        $request = new Request('POST', $url, ['Content-Type' => 'application/json'], json_encode($body));
        $response = $this->httpClient->send($request);
        $status = $response->getStatusCode();
        if ($status < 200 || $status >= 300) {
            throw new \Exception('Discord webhook request failed with status ' . $status);
        }
        App::getInstance(true)->getLogger()->info('Lifecycle Discord webhook delivered with status ' . $status);

        return ['status_code' => $status];
    }

    protected function executeContainerCommand(array $payload, array $server, array $node): array
    {
        $command = trim((string) ($payload['command'] ?? ''));
        if ($command === '') {
            throw new \Exception('Missing command');
        }
        if (strlen($command) > 512) {
            throw new \Exception('Command too long');
        }

        $wings = new Wings(
            $node['fqdn'],
            $node['daemonListen'],
            $node['scheme'],
            $node['daemon_token'],
            30
        );
        $response = $wings->getServer()->sendCommands($server['uuid'], [$command]);
        if (!$response->isSuccessful()) {
            throw new \Exception('Failed to run command in container: ' . $response->getError());
        }

        return ['sent' => true];
    }

    protected function executeHttpRequest(array $payload): array
    {
        $url = trim((string) ($payload['url'] ?? ''));
        if (!$this->isSafeUrl($url)) {
            throw new \Exception('Invalid HTTP request URL');
        }

        $method = strtoupper((string) ($payload['method'] ?? 'GET'));
        $allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
        if (!in_array($method, $allowedMethods, true)) {
            throw new \Exception('Unsupported HTTP method');
        }

        $headers = [];
        if (isset($payload['headers']) && is_array($payload['headers'])) {
            foreach ($payload['headers'] as $key => $value) {
                if (!is_string($key) || $key === '' || !is_scalar($value)) {
                    continue;
                }
                if (strlen($key) > 64 || strlen((string) $value) > 1024) {
                    continue;
                }
                $headers[$key] = (string) $value;
            }
        }

        $query = [];
        if (isset($payload['query']) && is_array($payload['query'])) {
            foreach ($payload['query'] as $key => $value) {
                if (is_string($key) && $key !== '' && is_scalar($value)) {
                    $query[$key] = (string) $value;
                }
            }
        }
        if (!empty($query)) {
            $url .= (str_contains($url, '?') ? '&' : '?') . http_build_query($query);
        }

        $body = null;
        if (isset($payload['body'])) {
            $body = is_scalar($payload['body']) ? (string) $payload['body'] : json_encode($payload['body']);
            if ($body !== null && strlen($body) > 10000) {
                throw new \Exception('HTTP body too large');
            }
        }

        $request = new Request($method, $url, $headers, $body);
        $response = $this->httpClient->send($request);
        $status = $response->getStatusCode();
        if ($status < 200 || $status >= 300) {
            throw new \Exception('HTTP request failed with status ' . $status);
        }

        return ['status_code' => $status];
    }

    protected function isSafeUrl(string $url): bool
    {
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
        if ($host === 'localhost' || $host === '127.0.0.1' || str_starts_with($host, '10.') || str_starts_with($host, '192.168.')) {
            return false;
        }

        return true;
    }

    protected function createActivity(array $server, string $event, array $metadata = []): void
    {
        if (!isset($server['id'], $server['node_id'])) {
            return;
        }

        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'event' => $event,
            'metadata' => json_encode($metadata),
        ]);
    }

    protected function emitHookEvent(string $eventName, array $server, string $powerAction, array $hook, ?array $actor, array $extra = []): void
    {
        global $eventManager;
        if (!isset($eventManager) || $eventManager === null) {
            return;
        }

        $payload = array_merge([
            'user_uuid' => $actor['uuid'] ?? null,
            'server_uuid' => $server['uuid'] ?? null,
            'power_action' => $powerAction,
            'hook_id' => $hook['id'] ?? null,
            'hook_type' => $hook['hook_type'] ?? null,
        ], $extra);

        $eventManager->emit($eventName, $payload);
    }

    protected function getActiveHookByServerAndType(int $serverId, string $hookType): ?array
    {
        return ServerLifecycleHook::getActiveHookByServerAndType($serverId, $hookType);
    }

    protected function getStepsByHookId(int $hookId): array
    {
        return ServerLifecycleHookStep::getStepsByHookId($hookId);
    }

    protected function dispatchTaskByType(string $taskType, array $payload, array $server, array $node): array
    {
        return match ($taskType) {
            'discord_webhook' => $this->executeDiscordWebhook($payload),
            'container_command' => $this->executeContainerCommand($payload, $server, $node),
            'http_request' => $this->executeHttpRequest($payload),
            default => throw new \Exception('Unsupported lifecycle hook task type: ' . $taskType),
        };
    }
}
