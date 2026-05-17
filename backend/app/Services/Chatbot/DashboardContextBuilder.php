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

namespace App\Services\Chatbot;

use App\App;
use App\Chat\Spell;
use App\Chat\Server;
use App\Permissions;
use App\Chat\Subuser;
use App\Chat\VmInstance;
use App\Helpers\PermissionHelper;

class DashboardContextBuilder
{
    private $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    public function buildContext(array $user, array $pageContext = []): string
    {
        $context = [];
        $userUuid = $user['uuid'] ?? '';
        $isAdmin = PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_ROOT);

        $context[] = '## User Information';
        $context[] = 'Username: ' . ($user['username'] ?? 'unknown');
        $context[] = 'User UUID: ' . ($user['uuid'] ?? 'unknown');
        $context[] = 'User ID: ' . ($user['id'] ?? 'unknown');
        $context[] = $isAdmin ? 'Role: Administrator (Full Access)' : 'Role: User';

        if (!empty($pageContext)) {
            $context[] = '';
            $context[] = '## Current Dashboard Page';
            $context[] = 'Route: ' . ($pageContext['route'] ?? 'unknown');
            $context[] = 'Page: ' . ($pageContext['page'] ?? $pageContext['routeName'] ?? 'unknown');
        }

        $servers = $this->getUserServers((int) ($user['id'] ?? 0));
        $context[] = '';
        $context[] = "## User's Servers";
        if (empty($servers)) {
            $context[] = 'No servers were found for this user.';
        } else {
            $context[] = 'Showing up to 8 accessible servers. Use tools for details.';
            foreach ($servers as $index => $server) {
                $context[] = sprintf(
                    '%d. %s (%s) - status: %s, type: %s, access: %s',
                    $index + 1,
                    $server['name'] ?? 'Unnamed server',
                    $server['uuidShort'] ?? $server['uuid'] ?? 'unknown',
                    $server['status'] ?? 'unknown',
                    $server['spell']['name'] ?? 'unknown',
                    !empty($server['is_subuser']) ? 'subuser' : 'owner'
                );
            }
        }

        $instances = $this->getUserVdsInstances($userUuid);
        $context[] = '';
        $context[] = "## User's VDS Instances";
        if (empty($instances)) {
            $context[] = 'No VDS instances were found for this user.';
        } else {
            $context[] = 'Showing up to 5 accessible VDS instances. Use tools for details.';
            foreach ($instances as $index => $instance) {
                $context[] = sprintf(
                    '%d. %s (ID: %s) - status: %s, type: %s',
                    $index + 1,
                    $instance['hostname'] ?? 'Unnamed VDS',
                    $instance['id'] ?? 'unknown',
                    $instance['status'] ?? 'unknown',
                    $instance['vm_type'] ?? 'unknown'
                );
            }
        }

        $context[] = '';
        $context[] = '## Context Limits';
        $context[] = 'Logs, files, credentials, backups, allocations, full resource specs, and knowledgebase articles are not included by default.';
        $context[] = 'Use tools only when the user asks for specific details or knowledgebase help.';

        return implode("\n", $context);
    }

    public static function loadSystemPrompt(): string
    {
        $promptFile = __DIR__ . '/dashboard-system-prompt.txt';

        if (file_exists($promptFile)) {
            $content = file_get_contents($promptFile);

            return trim($content);
        }

        return 'You are FeatherPanel Dashboard AI. Help users understand and navigate their dashboard, servers, VDS instances, and knowledgebase while keeping answers concise and using tools for specific details.';
    }

    private function getUserServers(int $userId): array
    {
        if ($userId <= 0) {
            return [];
        }

        try {
            $ownedServers = Server::searchServers(page: 1, limit: 8, search: '', ownerId: $userId);
            $subusers = Subuser::getSubusersByUserId($userId);
            $subuserMap = [];
            $subuserServers = [];

            foreach ($subusers as $subuser) {
                $serverId = (int) ($subuser['server_id'] ?? 0);
                if ($serverId <= 0 || isset($subuserMap[$serverId])) {
                    continue;
                }

                $subuserMap[$serverId] = $subuser;
                $server = Server::getServerById($serverId);
                if ($server) {
                    $subuserServers[] = $server;
                }
            }

            $servers = array_slice(array_merge($ownedServers, $subuserServers), 0, 8);
            foreach ($servers as &$server) {
                $serverId = (int) ($server['id'] ?? 0);
                $server['is_subuser'] = isset($subuserMap[$serverId]);
                $spell = isset($server['spell_id']) ? Spell::getSpellById((int) $server['spell_id']) : null;
                $server['spell'] = [
                    'name' => $spell['name'] ?? null,
                ];
            }
            unset($server);

            return $servers;
        } catch (\Exception $e) {
            $this->app->getLogger()->error('DashboardContextBuilder: Failed to get servers: ' . $e->getMessage());

            return [];
        }
    }

    private function getUserVdsInstances(string $userUuid): array
    {
        if ($userUuid === '') {
            return [];
        }

        try {
            $instances = VmInstance::getByUserUuid($userUuid, 1, 5);

            return is_array($instances) ? $instances : [];
        } catch (\Exception $e) {
            $this->app->getLogger()->error('DashboardContextBuilder: Failed to get VDS instances: ' . $e->getMessage());

            return [];
        }
    }
}
