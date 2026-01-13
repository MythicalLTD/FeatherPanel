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

        // User Information (sanitized - no sensitive tokens or passwords)
        $context[] = '## User Information';
        $context[] = "Username: {$user['username']}";
        $context[] = "User UUID: {$user['uuid']}";
        $context[] = "User ID: {$user['id']}";

        if (isset($user['email'])) {
            $context[] = "Email: {$user['email']}";
        }

        if (isset($user['first_name']) || isset($user['last_name'])) {
            $name = trim(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? ''));
            if (!empty($name)) {
                $context[] = "Name: {$name}";
            }
        }

        if (isset($user['avatar']) && !empty($user['avatar'])) {
            $context[] = "Avatar: {$user['avatar']}";
        }

        if (isset($user['two_fa_enabled'])) {
            $context[] = '2FA Enabled: ' . ($user['two_fa_enabled'] === 'true' ? 'Yes' : 'No');
        }

        if (isset($user['last_seen'])) {
            $context[] = "Last Seen: {$user['last_seen']}";
        }

        // User Role/Permissions
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

        // Note: Sensitive fields like remember_token, password, two_fa_key, etc. are NOT included for security

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

                // Server Resource Limits
                if (isset($server['memory'])) {
                    $memoryMB = (int) $server['memory'];
                    $memoryGB = round($memoryMB / 1024, 2);
                    $context[] = "- Memory Limit: {$memoryMB} MB ({$memoryGB} GB)";
                }

                if (isset($server['swap'])) {
                    $swapMB = (int) $server['swap'];
                    $swapGB = round($swapMB / 1024, 2);
                    $context[] = "- Swap Limit: {$swapMB} MB ({$swapGB} GB)";
                }

                if (isset($server['disk'])) {
                    $diskMB = (int) $server['disk'];
                    $diskGB = round($diskMB / 1024, 2);
                    $context[] = "- Disk Limit: {$diskMB} MB ({$diskGB} GB)";
                }

                if (isset($server['cpu'])) {
                    $context[] = "- CPU Limit: {$server['cpu']}%";
                }

                if (isset($server['io'])) {
                    $context[] = "- IO Limit: {$server['io']}";
                }

                // Allocation Information (IP and Port)
                if (isset($server['allocation'])) {
                    $allocation = $server['allocation'];
                    if (isset($allocation['ip'])) {
                        $ipInfo = $allocation['ip'];
                        if (isset($allocation['ip_alias']) && !empty($allocation['ip_alias'])) {
                            $ipInfo .= " (Alias: {$allocation['ip_alias']})";
                        }
                        $context[] = "- IP Address: {$ipInfo}";
                    }
                    if (isset($allocation['port'])) {
                        $context[] = "- Port: {$allocation['port']}";
                        // Show connection info if both IP and port are available
                        if (isset($allocation['ip'])) {
                            $context[] = "- Connection: {$allocation['ip']}:{$allocation['port']}";
                        }
                    }
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

                    // Server Resource Limits
                    if (isset($serverData['memory'])) {
                        $memoryMB = (int) $serverData['memory'];
                        $memoryGB = round($memoryMB / 1024, 2);
                        $context[] = "Memory Limit: {$memoryMB} MB ({$memoryGB} GB)";
                    }

                    if (isset($serverData['swap'])) {
                        $swapMB = (int) $serverData['swap'];
                        $swapGB = round($swapMB / 1024, 2);
                        $context[] = "Swap Limit: {$swapMB} MB ({$swapGB} GB)";
                    }

                    if (isset($serverData['disk'])) {
                        $diskMB = (int) $serverData['disk'];
                        $diskGB = round($diskMB / 1024, 2);
                        $context[] = "Disk Limit: {$diskMB} MB ({$diskGB} GB)";
                    }

                    if (isset($serverData['cpu'])) {
                        $context[] = "CPU Limit: {$serverData['cpu']}%";
                    }

                    if (isset($serverData['io'])) {
                        $context[] = "IO Limit: {$serverData['io']}";
                    }

                    // Allocation Information (IP and Port)
                    if (isset($serverData['allocation_id'])) {
                        $allocation = Allocation::getAllocationById((int) $serverData['allocation_id']);
                        if ($allocation) {
                            if (isset($allocation['ip'])) {
                                $ipInfo = $allocation['ip'];
                                if (isset($allocation['ip_alias']) && !empty($allocation['ip_alias'])) {
                                    $ipInfo .= " (Alias: {$allocation['ip_alias']})";
                                }
                                $context[] = "IP Address: {$ipInfo}";
                            }
                            if (isset($allocation['port'])) {
                                $context[] = "Port: {$allocation['port']}";
                                // Show connection info if both IP and port are available
                                if (isset($allocation['ip'])) {
                                    $context[] = "Connection: {$allocation['ip']}:{$allocation['port']}";
                                }
                            }
                        }
                    }

                    // Startup Command
                    if (isset($serverData['startup']) && !empty($serverData['startup'])) {
                        $context[] = "Startup Command: {$serverData['startup']}";
                    }

                    // Docker Image
                    if (isset($serverData['image']) && !empty($serverData['image'])) {
                        $context[] = "Docker Image: {$serverData['image']}";
                    }

                    // Fetch server logs if:
                    // 1. Server is running or starting (to see current activity)
                    // 2. User is on logs page (to see logs regardless of status)
                    // 3. User is on console page (to see console output)
                    $shouldFetchLogs = in_array(strtolower($serverStatus), ['running', 'starting', 'stopping', 'stopped']);
                    $isOnLogsPage = isset($pageContext['page']) && in_array(strtolower($pageContext['page']), ['logs', 'console']);

                    if ($shouldFetchLogs || $isOnLogsPage) {
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

                // Add allocation info (IP, port, alias)
                $allocation = Allocation::getAllocationById($server['allocation_id']);
                $server['allocation'] = [
                    'ip' => $allocation['ip'] ?? null,
                    'ip_alias' => $allocation['ip_alias'] ?? null,
                    'port' => $allocation['port'] ?? null,
                ];

                // Add server resource limits
                if (isset($server['memory'])) {
                    $server['memory'] = (int) $server['memory'];
                }
                if (isset($server['swap'])) {
                    $server['swap'] = (int) $server['swap'];
                }
                if (isset($server['disk'])) {
                    $server['disk'] = (int) $server['disk'];
                }
                if (isset($server['cpu'])) {
                    $server['cpu'] = (int) $server['cpu'];
                }
                if (isset($server['io'])) {
                    $server['io'] = (int) $server['io'];
                }
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
