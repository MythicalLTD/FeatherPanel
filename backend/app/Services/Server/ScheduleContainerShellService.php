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
use App\Chat\ServerActivity;
use App\Services\Wings\Wings;
use App\Config\ConfigInterface;
use App\Helpers\DaemonCapabilities;

/**
 * Schedule task action `container_shell`: run a Linux command inside the server's Docker
 * container, equivalent to `docker exec my_container sh -c "<command>"` (no TTY).
 *
 * The command is sent verbatim as a JSON string to the daemon's exec endpoint, which runs it
 * as `sh -c <command>`; the panel never builds a host shell command line.
 *
 * Gated by the same admin switch as the lifecycle hook Container Shell step
 * ({@see ConfigInterface::SERVER_LIFECYCLE_HOOKS_CONTAINER_SHELL_ENABLED}) and by the daemon's
 * `container_exec` capability.
 *
 * Task payload: JSON object `{"command": "...", "timeout": 30}` (timeout optional, 1–120s) or,
 * for API convenience, a plain string which is treated as the command with the default timeout.
 */
class ScheduleContainerShellService
{
    public const ACTION = 'container_shell';

    /**
     * Parse a stored task payload.
     *
     * @throws \InvalidArgumentException when the payload is not a valid container shell payload
     *
     * @return array{command: string, timeout: int}
     */
    public static function parsePayload(string $payload): array
    {
        $payload = trim($payload);
        if ($payload === '') {
            throw new \InvalidArgumentException('Container shell command is required');
        }

        $data = json_decode($payload, true);
        if (is_array($data)) {
            if (array_is_list($data)) {
                throw new \InvalidArgumentException('Container shell payload must be an object with a "command" field');
            }
            foreach (array_keys($data) as $key) {
                if (!in_array($key, ['command', 'timeout'], true)) {
                    throw new \InvalidArgumentException('Unsupported field in container shell payload');
                }
            }
            if (!isset($data['command']) || !is_string($data['command'])) {
                throw new \InvalidArgumentException('Container shell command is required');
            }
            $command = trim($data['command']);

            if (array_key_exists('timeout', $data)) {
                $raw = $data['timeout'];
                if (is_bool($raw) || is_array($raw) || is_object($raw) || $raw === null) {
                    throw new \InvalidArgumentException('Container shell timeout must be an integer number of seconds');
                }
                if (is_string($raw) && !preg_match('/^-?\d+$/', trim($raw))) {
                    throw new \InvalidArgumentException('Container shell timeout must be an integer number of seconds');
                }
                if (is_float($raw) && floor($raw) !== $raw) {
                    throw new \InvalidArgumentException('Container shell timeout must be a whole number of seconds');
                }
                $timeout = (int) $raw;
                if ($timeout < ContainerShellExec::TIMEOUT_MIN || $timeout > ContainerShellExec::TIMEOUT_MAX) {
                    throw new \InvalidArgumentException(
                        'Container shell timeout must be between ' . ContainerShellExec::TIMEOUT_MIN . ' and ' . ContainerShellExec::TIMEOUT_MAX . ' seconds'
                    );
                }
            } else {
                $timeout = ContainerShellExec::TIMEOUT_DEFAULT;
            }
        } else {
            $command = $payload;
            $timeout = ContainerShellExec::TIMEOUT_DEFAULT;
        }

        if ($command === '') {
            throw new \InvalidArgumentException('Container shell command is required');
        }
        if (strlen($command) > ContainerShellExec::COMMAND_MAX_LENGTH) {
            throw new \InvalidArgumentException('Container shell command exceeds max length of ' . ContainerShellExec::COMMAND_MAX_LENGTH . ' characters');
        }

        return ['command' => $command, 'timeout' => $timeout];
    }

    /**
     * Validate a payload when a task is created / updated.
     *
     * @return string|null error message, or null when valid and the feature is enabled
     */
    public function validateTaskInput(string $payload): ?string
    {
        if (!$this->isEnabled()) {
            return 'Container Shell schedule tasks are disabled by the administrator (security). Enable them under Admin → Settings → Servers.';
        }

        try {
            self::parsePayload($payload);
        } catch (\InvalidArgumentException $e) {
            return $e->getMessage();
        }

        return null;
    }

    /**
     * Run the task. Always records the (truncated) output in the server activity log.
     *
     * @param array<string, mixed> $server
     * @param array<string, mixed> $node
     * @param array<string, mixed> $context task_id / schedule_id etc. added to the activity metadata
     *
     * @throws \Exception when disabled, the daemon call failed, the command timed out or exited non-zero
     *
     * @return array{skipped?: bool, reason?: string, exit_code?: int, duration_ms?: int, stdout?: string, stderr?: string}
     */
    public function run(array $server, array $node, string $payload, array $context = []): array
    {
        if (!$this->isEnabled()) {
            throw new \Exception('Container Shell schedule tasks are disabled by the administrator');
        }

        if (!DaemonCapabilities::fromNode($node)->supports(DaemonCapabilities::FEATURE_CONTAINER_EXEC)) {
            $this->logWarning('Schedule container shell skipped: daemon does not support container_exec for server ' . ($server['uuid'] ?? 'unknown'));
            $this->recordActivity($server, $context + ['skipped' => true, 'reason' => 'container_exec_unsupported']);

            return ['skipped' => true, 'reason' => 'container_exec_unsupported'];
        }

        $parsed = self::parsePayload($payload);

        $wings = $this->createWingsClient($node, max(35, $parsed['timeout'] + 10));
        $response = $wings->getServer()->execInContainer((string) $server['uuid'], $parsed['command'], $parsed['timeout']);
        if (!$response->isSuccessful()) {
            $error = 'Failed to execute shell command in container: ' . $response->getError();
            $this->recordActivity($server, $context + ['error' => $error]);

            throw new \Exception($error);
        }

        $data = $response->getData();
        if (!is_array($data)) {
            $this->recordActivity($server, $context + ['error' => 'Invalid response from container shell exec']);

            throw new \Exception('Invalid response from container shell exec');
        }

        $summary = ContainerShellExec::summarize($data, $parsed['timeout']);
        $this->logInfo(sprintf(
            'Schedule container shell finished for server %s: exit=%d timed_out=%s duration_ms=%d stdout=%s stderr=%s',
            $server['uuid'] ?? 'unknown',
            $summary['exit_code'],
            $summary['timed_out'] ? 'true' : 'false',
            $summary['duration_ms'],
            json_encode($summary['stdout']),
            json_encode($summary['stderr'])
        ));
        $this->recordActivity($server, $context + [
            'exit_code' => $summary['exit_code'],
            'timed_out' => $summary['timed_out'],
            'duration_ms' => $summary['duration_ms'],
            'stdout' => $summary['stdout'],
            'stderr' => $summary['stderr'],
            'error' => $summary['error'],
        ]);

        if ($summary['error'] !== null) {
            throw new \Exception($summary['error']);
        }

        return [
            'exit_code' => $summary['exit_code'],
            'duration_ms' => $summary['duration_ms'],
            'stdout' => $summary['stdout'],
            'stderr' => $summary['stderr'],
        ];
    }

    // --- Seams (config / daemon / database access), overridden in unit tests -----------------

    protected function isEnabled(): bool
    {
        return App::getInstance(true)->getConfig()->getSetting(ConfigInterface::SERVER_LIFECYCLE_HOOKS_CONTAINER_SHELL_ENABLED, 'false') === 'true';
    }

    protected function createWingsClient(array $node, int $timeout): Wings
    {
        return Wings::fromNode($node, $timeout);
    }

    protected function logInfo(string $message): void
    {
        App::getInstance(true)->getLogger()->info($message);
    }

    protected function logWarning(string $message): void
    {
        App::getInstance(true)->getLogger()->warning($message);
    }

    protected function createActivity(array $data): void
    {
        ServerActivity::createActivity($data);
    }

    /**
     * @param array<string, mixed> $server
     * @param array<string, mixed> $metadata
     */
    private function recordActivity(array $server, array $metadata): void
    {
        if (!isset($server['id'], $server['node_id'])) {
            return;
        }

        $this->createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'event' => 'schedule_container_shell_executed',
            'metadata' => json_encode($metadata),
        ]);
    }
}
