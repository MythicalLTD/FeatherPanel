<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Services\Chatbot;

use App\App;
use App\Chat\Node;
use App\Chat\Realm;
use App\Chat\Spell;
use App\Chat\Server;
use App\Permissions;
use App\Chat\Subuser;
use App\Chat\Allocation;
use App\Chat\Permission;
use App\Services\Wings\Wings;
use App\Helpers\PermissionHelper;

class ContextBuilder
{
    private $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    /**
     * Build comprehensive context for the AI including user info, servers, and current page.
     *
     * @param array $user Current user data
     * @param array $pageContext Current page context (route, server, etc.)
     *
     * @return string Formatted context string
     */
    public function buildContext(array $user, array $pageContext = []): string
    {
        $context = [];

        // Check user permissions
        $userUuid = $user['uuid'] ?? '';
        $isAdmin = PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_ROOT);

        // Get user permissions list
        $userPermissions = [];
        if (isset($user['role_id'])) {
            $permissions = Permission::getPermissionsByRoleId((int) $user['role_id']);
            $userPermissions = array_column($permissions, 'permission');
        }

        // User Information (basic info only - no sensitive data)
        $context[] = '## User Information';
        $context[] = "Username: {$user['username']}";
        $context[] = "User UUID: {$user['uuid']}";
        // Note: Email and other sensitive information are NOT included for security

        if (isset($user['first_name']) || isset($user['last_name'])) {
            $name = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
            if (!empty($name)) {
                $context[] = "Name: {$name}";
            }
        }

        // User Role/Permissions (only mention if admin)
        if ($isAdmin) {
            $context[] = 'Role: Administrator (Full Access)';
        } else {
            $context[] = 'Role: User';
            // Only include permissions if user has specific server permissions
            if (!empty($userPermissions)) {
                $serverPermissions = array_filter($userPermissions, fn ($p) => strpos($p, 'server.') === 0);
                if (!empty($serverPermissions)) {
                    $context[] = 'Note: User has limited server permissions';
                }
            }
        }

        // Get User's Servers (only servers they have access to)
        $servers = $this->getUserServers($user['id']);
        if (!empty($servers)) {
            $context[] = '';
            $context[] = "## User's Servers";
            $context[] = 'Total Servers: ' . count($servers);
            $context[] = '';

            foreach ($servers as $index => $server) {
                $serverNum = $index + 1;
                $context[] = "### Server {$serverNum}: {$server['name']}";
                $context[] = "- UUID: {$server['uuidShort']}";
                $context[] = '- Status: ' . ($server['status'] ?? 'unknown');

                if (isset($server['description']) && !empty($server['description'])) {
                    $context[] = "- Description: {$server['description']}";
                }

                // Only include node/realm/spell info if user is admin or has access
                if ($isAdmin || isset($server['node']['name'])) {
                    if (isset($server['node']['name'])) {
                        $context[] = "- Node: {$server['node']['name']}";
                    }
                }

                if (isset($server['realm']['name'])) {
                    $context[] = "- Realm: {$server['realm']['name']}";
                }

                if (isset($server['spell']['name'])) {
                    $context[] = "- Spell/Type: {$server['spell']['name']}";
                }

                // Only include port if user has access to allocations
                if (isset($server['allocation']['port']) && ($isAdmin || isset($server['is_subuser']))) {
                    $context[] = "- Port: {$server['allocation']['port']}";
                }

                if (isset($server['is_subuser']) && $server['is_subuser']) {
                    $context[] = '- Access: Subuser (Limited Permissions)';
                    // Only include specific permissions if user is admin
                    if ($isAdmin && isset($server['subuser_permissions']) && !empty($server['subuser_permissions'])) {
                        $perms = implode(', ', array_slice($server['subuser_permissions'], 0, 5)); // Limit to 5
                        $context[] = "- Permissions: {$perms}";
                    }
                } else {
                    $context[] = '- Access: Owner (Full Control)';
                }

                $context[] = '';
            }
        } else {
            $context[] = '';
            $context[] = "## User's Servers";
            $context[] = 'The user has no servers yet.';
            $context[] = '';
        }

        // Current Page/Route Context
        if (!empty($pageContext)) {
            $context[] = '## Current Context';

            if (isset($pageContext['route'])) {
                $context[] = "Current Route: {$pageContext['route']}";
            }

            if (isset($pageContext['routeName'])) {
                $context[] = "Route Name: {$pageContext['routeName']}";
            }

            if (isset($pageContext['page'])) {
                $context[] = "Current Page: {$pageContext['page']}";
            }

            // If user is viewing a specific server (only if they have access)
            if (isset($pageContext['server'])) {
                $server = $pageContext['server'];
                $serverUuid = $server['uuidShort'] ?? '';

                // Verify user has access to this server
                $hasAccess = false;
                if (!empty($serverUuid)) {
                    $serverData = Server::getServerByUuidShort($serverUuid);
                    if ($serverData) {
                        // Check if user owns it or is subuser
                        $hasAccess = ((int) $serverData['owner_id'] === (int) $user['id']);
                        if (!$hasAccess) {
                            $subuser = Subuser::getSubuserByUserAndServer((int) $user['id'], (int) $serverData['id']);
                            $hasAccess = ($subuser !== null);
                        }
                        // Admins always have access
                        if ($isAdmin) {
                            $hasAccess = true;
                        }
                    }
                }

                if ($hasAccess) {
                    $context[] = '';
                    $context[] = '### Currently Viewing Server';
                    $context[] = "Server Name: {$server['name']}";
                    $context[] = "Server UUID: {$server['uuidShort']}";
                    $serverStatus = $server['status'] ?? 'unknown';
                    $context[] = "Status: {$serverStatus}";

                    if (isset($server['description'])) {
                        $context[] = "Description: {$server['description']}";
                    }

                    // Only include node info if admin
                    if ($isAdmin && isset($server['node']['name'])) {
                        $context[] = "Node: {$server['node']['name']}";
                    }

                    if (isset($server['spell']['name'])) {
                        $context[] = "Spell/Type: {$server['spell']['name']}";
                    }

                    // Fetch server logs if server is running or starting
                    if (in_array(strtolower($serverStatus), ['running', 'starting'])) {
                        $serverLogs = $this->getServerLogs($serverData);
                        if (!empty($serverLogs)) {
                            $context[] = '';
                            $context[] = '### Recent Server Logs';
                            $context[] = 'The following are the most recent server logs (last 50 lines):';
                            $context[] = '';
                            $context[] = '```';
                            // Limit to last 50 lines to avoid token limits
                            $logLines = is_array($serverLogs) ? array_slice($serverLogs, -50) : explode("\n", $serverLogs);
                            $logLines = array_slice($logLines, -50);
                            $context[] = implode("\n", $logLines);
                            $context[] = '```';
                        }
                    }
                }
            }
        }

        return implode("\n", $context);
    }

    /**
     * Load system prompt from file.
     *
     * @return string System prompt content
     */
    public static function loadSystemPrompt(): string
    {
        $promptFile = __DIR__ . '/system-prompt.txt';

        if (file_exists($promptFile)) {
            $content = file_get_contents($promptFile);

            return trim($content);
        }

        // Fallback default prompt
        return 'You are FeatherPanel AI, an intelligent assistant for FeatherPanel - a modern server management panel. Help users manage their servers, configure settings, and troubleshoot issues.';
    }

    /**
     * Get user's servers (owned and subuser).
     *
     * @param int $userId User ID
     *
     * @return array Array of server data
     */
    private function getUserServers(int $userId): array
    {
        try {
            // Get owned servers
            $ownedServers = Server::searchServers(
                page: 1,
                limit: 50,
                search: '',
                ownerId: $userId
            );

            // Get subuser servers
            $subusers = Subuser::getSubusersByUserId($userId);
            $subuserServerIds = array_map(static fn ($subuser) => (int) $subuser['server_id'], $subusers);

            $subuserMap = [];
            foreach ($subusers as $subuser) {
                $subuserMap[(int) $subuser['server_id']] = $subuser;
            }

            $subuserServers = [];
            foreach ($subuserServerIds as $serverId) {
                $server = Server::getServerById($serverId);
                if ($server) {
                    $subuserServers[] = $server;
                }
            }

            // Combine and enrich with related data
            $allServers = array_merge($ownedServers, $subuserServers);

            // Limit to 20 most recent to avoid token limits
            $allServers = array_slice($allServers, 0, 20);

            foreach ($allServers as &$server) {
                // Check if subuser
                $isSubuser = isset($subuserMap[(int) $server['id']]);
                $server['is_subuser'] = $isSubuser;

                if ($isSubuser) {
                    $subuserData = $subuserMap[(int) $server['id']];
                    $server['subuser_permissions'] = json_decode($subuserData['permissions'] ?? '[]', true) ?: [];
                } else {
                    $server['subuser_permissions'] = [];
                }

                // Add node info
                $node = Node::getNodeById($server['node_id']);
                $server['node'] = [
                    'name' => $node['name'] ?? null,
                ];

                // Add realm info
                $realm = Realm::getById($server['realms_id']);
                $server['realm'] = [
                    'name' => $realm['name'] ?? null,
                ];

                // Add spell info
                $spell = Spell::getSpellById($server['spell_id']);
                $server['spell'] = [
                    'name' => $spell['name'] ?? null,
                ];

                // Add allocation info
                $allocation = Allocation::getAllocationById($server['allocation_id']);
                $server['allocation'] = [
                    'port' => $allocation['port'] ?? null,
                ];
            }

            return $allServers;
        } catch (\Exception $e) {
            $this->app->getLogger()->error('Failed to fetch user servers for context: ' . $e->getMessage());

            return [];
        }
    }

    /**
     * Get server logs for a specific server.
     *
     * @param array $server Server data
     *
     * @return array|string Server logs or empty array/string
     */
    private function getServerLogs(array $server): array | string
    {
        try {
            // Get node information
            $node = Node::getNodeById($server['node_id']);
            if (!$node) {
                return [];
            }

            $scheme = $node['scheme'] ?? 'http';
            $host = $node['fqdn'] ?? '';
            $port = $node['daemonListen'] ?? 8080;
            $token = $node['daemon_token'] ?? '';

            if (empty($host) || empty($token)) {
                return [];
            }

            $wings = new Wings($host, $port, $scheme, $token, 30);
            $response = $wings->getServer()->getServerLogs($server['uuid']);

            if (!$response->isSuccessful()) {
                $this->app->getLogger()->debug('Failed to fetch server logs for context: ' . $response->getError());

                return [];
            }

            $logData = $response->getData();
            if (empty($logData)) {
                return [];
            }

            // Convert to array of lines
            if (is_array($logData)) {
                // Flatten array
                $logLines = [];
                array_walk_recursive($logData, function ($value) use (&$logLines) {
                    if (is_scalar($value)) {
                        $logLines[] = (string) $value;
                    }
                });

                return $logLines;
            } elseif (is_string($logData)) {
                return explode("\n", $logData);
            }

            return [];
        } catch (\Exception $e) {
            $this->app->getLogger()->error('Failed to fetch server logs for context: ' . $e->getMessage());

            return [];
        }
    }
}
