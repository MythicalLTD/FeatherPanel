<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studio
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
use App\Chat\VmSubuser;
use App\Chat\VmInstance;
use App\Helpers\VmGateway;
use App\Helpers\PermissionHelper;
use App\Permissions;

class VdsContextBuilder
{
    private $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    /**
     * Build comprehensive context for the VDS AI including user info, VDS instances, and current page.
     *
     * @param array $user Current user data
     * @param array $pageContext Current page context (route, vdsInstance, etc.)
     *
     * @return string Formatted context string
     */
    public function buildContext(array $user, array $pageContext = []): string
    {
        $context = [];

        $userUuid = $user['uuid'] ?? '';
        $isAdmin = PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_ROOT);

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

        if ($isAdmin) {
            $context[] = 'Role: Administrator (Full Access)';
        } else {
            $context[] = 'Role: User';
        }

        // Get User's VDS Instances
        $instances = $this->getUserVdsInstances($userUuid);
        if (!empty($instances)) {
            $context[] = '';
            $context[] = "## User's VDS Instances";
            $context[] = 'Total Instances: ' . count($instances);
            $context[] = '';

            foreach ($instances as $index => $instance) {
                $num = $index + 1;
                $hostname = $instance['hostname'] ?? "Instance #{$instance['id']}";
                $context[] = "### VDS {$num}: {$hostname}";
                $context[] = "- ID: {$instance['id']}";
                $context[] = '- Status: ' . ($instance['status'] ?? 'unknown');
                $context[] = '- Type: ' . ($instance['vm_type'] ?? 'unknown');

                if (!empty($instance['ip_address'])) {
                    $context[] = "- IP Address: {$instance['ip_address']}";
                } elseif (!empty($instance['ip_pool_address'])) {
                    $context[] = "- IP Address: {$instance['ip_pool_address']}";
                }

                if (!empty($instance['memory'])) {
                    $memoryMB = (int) $instance['memory'];
                    $memoryGB = round($memoryMB / 1024, 2);
                    $context[] = "- Memory: {$memoryMB} MB ({$memoryGB} GB)";
                }

                if (!empty($instance['cpus'])) {
                    $context[] = "- CPUs: {$instance['cpus']}";
                }

                if (!empty($instance['disk_gb'])) {
                    $context[] = "- Disk: {$instance['disk_gb']} GB";
                }

                if (!empty($instance['node_name'])) {
                    $context[] = "- Node: {$instance['node_name']}";
                }

                $context[] = '';
            }
        } else {
            $context[] = '';
            $context[] = "## User's VDS Instances";
            $context[] = 'The user has no VDS instances yet.';
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

            // If user is viewing a specific VDS instance
            if (isset($pageContext['vdsInstance'])) {
                $vdsInstance = $pageContext['vdsInstance'];
                $instanceId = (int) ($vdsInstance['id'] ?? 0);

                // Verify user has access to this VDS instance
                $hasAccess = false;
                if ($instanceId > 0) {
                    $hasAccess = VmGateway::canUserAccessVmInstance($userUuid, $instanceId);
                }

                if ($hasAccess) {
                    $context[] = '';
                    $context[] = '### Currently Viewing VDS Instance';
                    $context[] = "Hostname: " . ($vdsInstance['hostname'] ?? "Instance #{$instanceId}");
                    $context[] = "Instance ID: {$instanceId}";
                    $context[] = "Status: " . ($vdsInstance['status'] ?? 'unknown');
                    $context[] = "Type: " . ($vdsInstance['vm_type'] ?? 'unknown');

                    if (!empty($vdsInstance['ip_address'])) {
                        $context[] = "IP Address: {$vdsInstance['ip_address']}";
                    } elseif (!empty($vdsInstance['ip_pool_address'])) {
                        $context[] = "IP Address: {$vdsInstance['ip_pool_address']}";
                    }

                    if (!empty($vdsInstance['memory'])) {
                        $memoryMB = (int) $vdsInstance['memory'];
                        $memoryGB = round($memoryMB / 1024, 2);
                        $context[] = "Memory: {$memoryMB} MB ({$memoryGB} GB)";
                    }

                    if (!empty($vdsInstance['cpus'])) {
                        $context[] = "CPUs: {$vdsInstance['cpus']}";
                    }

                    if (!empty($vdsInstance['disk_gb'])) {
                        $context[] = "Disk: {$vdsInstance['disk_gb']} GB";
                    }

                    if (!empty($vdsInstance['node_name'])) {
                        $context[] = "Node: {$vdsInstance['node_name']}";
                    }

                    if (!empty($vdsInstance['created_at'])) {
                        $context[] = "Created: {$vdsInstance['created_at']}";
                    }

                    // Check if user is a subuser
                    $dbInstance = VmInstance::getById($instanceId);
                    if ($dbInstance) {
                        $isOwner = isset($dbInstance['user_uuid']) && $dbInstance['user_uuid'] === $userUuid;
                        if (!$isOwner && !$isAdmin) {
                            $context[] = 'Access: Subuser';
                            // Show which permissions the subuser has for this instance
                            foreach (['power', 'backup', 'console', 'settings', 'users'] as $perm) {
                                if (VmGateway::hasVmPermission($userUuid, $instanceId, $perm)) {
                                    $context[] = "  - Permission: {$perm}";
                                }
                            }
                        } else {
                            $context[] = 'Access: Owner (Full Control)';
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
        $promptFile = __DIR__ . '/vds-system-prompt.txt';

        if (file_exists($promptFile)) {
            $content = file_get_contents($promptFile);

            return trim($content);
        }

        // Fallback default prompt
        return 'You are FeatherPanel VDS AI, an intelligent assistant for FeatherPanel - a modern server management panel with Virtual Dedicated Server (VDS) support. Help users manage their VDS instances, configure settings, and troubleshoot issues.';
    }

    /**
     * Get the user's VDS instances (up to 10).
     *
     * @param string $userUuid User UUID
     *
     * @return array Array of VDS instance data
     */
    public function getUserVdsInstances(string $userUuid): array
    {
        try {
            $instances = VmInstance::getByUserUuid($userUuid, 1, 10);

            return is_array($instances) ? $instances : [];
        } catch (\Exception $e) {
            $this->app->getLogger()->error('VdsContextBuilder: Failed to get VDS instances: ' . $e->getMessage());

            return [];
        }
    }
}
