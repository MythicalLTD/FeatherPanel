<?php

/*
 * This file is part of MythicalPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Controllers\Wings;

use App\Chat\Node;
use App\Chat\Realm;
use App\Chat\Spell;
use App\Chat\Server;
use App\Chat\Allocation;
use App\Chat\ServerVariable;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class WingsServerController
{
    public function getServer(Request $request, string $uuid): Response
    {
        // Get server by UUID
        $server = Server::getServerByUuid($uuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get Wings authentication attributes from request
        $tokenId = $request->attributes->get('wings_token_id');
        $tokenSecret = $request->attributes->get('wings_token_secret');

        if (!$tokenId || !$tokenSecret) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get node info
        $node = Node::getNodeByWingsAuth($tokenId, $tokenSecret);

        if (!$node) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get server info
        $server = Server::getServerByUuidAndNodeId($uuid, (int) $node['id']);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get node information
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }

        // Get allocation information
        $allocation = Allocation::getAllocationById($server['allocation_id']);
        if (!$allocation) {
            return ApiResponse::error('Allocation not found', 'ALLOCATION_NOT_FOUND', 404);
        }

        // Get spell information
        $spell = Spell::getSpellById($server['spell_id']);
        if (!$spell) {
            return ApiResponse::error('Spell not found', 'SPELL_NOT_FOUND', 404);
        }

        // Get realm information
        $realm = Realm::getById($server['realms_id']);
        if (!$realm) {
            return ApiResponse::error('Realm not found', 'REALM_NOT_FOUND', 404);
        }

        // Get server variables with spell variable details
        $serverVariables = ServerVariable::getServerVariablesWithDetails($server['id']);
        $environment = [];

        // Build environment variables from server variables
        foreach ($serverVariables as $variable) {
            $environment[$variable['env_variable']] = $variable['variable_value'];
        }

        // Add default environment variables based on database fields
        $environment['P_SERVER_LOCATION'] = $node['location_id'] ?? '';
        $environment['P_SERVER_UUID'] = $server['uuid'];
        $environment['P_SERVER_ALLOCATION_LIMIT'] = $server['allocation_limit'] ?? 0;
        $environment['SERVER_MEMORY'] = $server['memory'];
        $environment['SERVER_IP'] = $allocation['ip'];
        $environment['SERVER_PORT'] = $allocation['port'];

        // Parse spell features if available (from spell.features JSON field)
        $spellFeatures = [];
        if (!empty($spell['features'])) {
            try {
                $features = json_decode($spell['features'], true);
                if (is_array($features)) {
                    $spellFeatures = $features;
                }
            } catch (\Exception $e) {
                // If features parsing fails, use empty array
            }
        }

        // Parse spell file denylist if available (from spell.file_denylist JSON field)
        $fileDenylist = [];
        if (!empty($spell['file_denylist'])) {
            try {
                $denylist = json_decode($spell['file_denylist'], true);
                if (is_array($denylist)) {
                    $fileDenylist = $denylist;
                }
            } catch (\Exception $e) {
                // If file denylist parsing fails, use empty array
            }
        }

        // Parse spell docker images if available (from spell.docker_images JSON field)
        $dockerImage = $server['image']; // Use server.image as fallback
        if (!empty($spell['docker_images'])) {
            try {
                $dockerImages = json_decode($spell['docker_images'], true);
                if (is_array($dockerImages) && !empty($dockerImages)) {
                    // Use the first available image from spell or fallback to server image
                    $dockerImage = $dockerImages[0] ?? $server['image'];
                }
            } catch (\Exception $e) {
                // If docker images parsing fails, use server image
            }
        }

        // Parse spell startup configuration (from spell.startup field)
        $startupCommand = $server['startup']; // Use server.startup as primary
        if (!empty($spell['startup'])) {
            $startupCommand = $spell['startup'];
        }

        // Parse spell config files (from spell.config_files field)
        $configFiles = [];
        if (!empty($spell['config_files'])) {
            try {
                $configs = json_decode($spell['config_files'], true);
                if (is_array($configs)) {
                    $configFiles = $configs;
                }
            } catch (\Exception $e) {
                // If config files parsing fails, use empty array
            }
        }

        // Parse spell config startup (from spell.config_startup field)
        $configStartup = [];
        if (!empty($spell['config_startup'])) {
            try {
                $startup = json_decode($spell['config_startup'], true);
                if (is_array($startup)) {
                    $configStartup = $startup;
                }
            } catch (\Exception $e) {
                // If config startup parsing fails, use empty array
            }
        }

        // Parse spell config logs (from spell.config_logs field)
        $configLogs = [];
        if (!empty($spell['config_logs'])) {
            try {
                $logs = json_decode($spell['config_logs'], true);
                if (is_array($logs)) {
                    $configLogs = $logs;
                }
            } catch (\Exception $e) {
                // If config logs parsing fails, use empty array
            }
        }

        // Parse spell config stop (from spell.config_stop field)
        $configStop = $spell['config_stop'] ?? 'stop';

        // Build the Wings configuration format using actual database fields
        $wingsConfig = [
            'settings' => [
                'uuid' => $server['uuid'],
                'meta' => [
                    'name' => $server['name'],
                    'description' => $server['description'],
                ],
                'suspended' => $server['status'] === 'suspended',
                'invocation' => $startupCommand,
                'skip_egg_scripts' => (bool) $server['skip_scripts'],
                'environment' => $environment,
                'labels' => [
                    'service' => $spell['name'] ?? 'unknown',
                    'realm' => $realm['name'] ?? 'unknown',
                    'node' => $node['name'] ?? 'unknown',
                    'author' => $spell['author'] ?? 'unknown',
                ],
                'allocations' => [
                    'force_outgoing_ip' => (bool) $spell['force_outgoing_ip'],
                    'default' => [
                        'ip' => $allocation['ip'],
                        'port' => $allocation['port'],
                    ],
                    'mappings' => [
                        $allocation['ip'] => [
                            $allocation['port'],
                        ],
                    ],
                ],
                'build' => [
                    'memory_limit' => $server['memory'],
                    'swap' => $server['swap'],
                    'io_weight' => $server['io'],
                    'cpu_limit' => $server['cpu'],
                    'disk_space' => $server['disk'],
                    'threads' => $server['threads'] ?? null,
                    'oom_disabled' => !(bool) $server['oom_disabled'],
                ],
                'crash_detection_enabled' => true,
                'mounts' => [],
                'egg' => [
                    'id' => $spell['uuid'] ?? $spell['id'],
                    'file_denylist' => $fileDenylist,
                    'features' => $spellFeatures,
                ],
                'container' => [
                    'image' => $dockerImage,
                    'oom_disabled' => (bool) $server['oom_disabled'],
                    'requires_rebuild' => false,
                ],
            ],
            'process_configuration' => [
                'startup' => [
                    'done' => $configStartup['done'] ?? [
                        'Server is ready to accept connections',
                        'Server startup complete',
                        'Done (',
                        'For help, type "help"',
                    ],
                    'user_interaction' => $configStartup['user_interaction'] ?? [
                        'Do you accept the EULA?',
                        'Please accept the terms',
                    ],
                    'strip_ansi' => $configStartup['strip_ansi'] ?? false,
                ],
                'stop' => [
                    'type' => $configStop['type'] ?? 'command',
                    'value' => $configStop['value'] ?? $configStop,
                ],
                'configs' => $configFiles,
            ],
        ];

        return ApiResponse::sendManualResponse($wingsConfig, 200);
    }

    public function resetServers(Request $request): Response
    {
        // Get Wings authentication attributes from request
        $tokenId = $request->attributes->get('wings_token_id');
        $tokenSecret = $request->attributes->get('wings_token_secret');

        if (!$tokenId || !$tokenSecret) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get node info
        $node = Node::getNodeByWingsAuth($tokenId, $tokenSecret);

        if (!$node) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get all servers on the node
        $servers = Server::getServersByNodeId($node['id']);

        // Reset each server's status
        Server::resetAllServerStatuses($node['id']);

        return ApiResponse::sendManualResponse([
            'success' => true,
            'message' => 'Servers reset successfully',
        ], 200);
    }

    public function remoteServers(Request $request): Response
    {
        // Get pagination parameters
        $page = (int) $request->query->get('page', 1);
        $perPage = (int) $request->query->get('per_page', 50);
        $search = $request->query->get('search', '');

        // Get Wings authentication attributes from request
        $tokenId = $request->attributes->get('wings_token_id');
        $tokenSecret = $request->attributes->get('wings_token_secret');

        if (!$tokenId || !$tokenSecret) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get node info
        $node = Node::getNodeByWingsAuth($tokenId, $tokenSecret);

        if (!$node) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get all servers with pagination
        $servers = Server::searchServers(page: $page, limit: $perPage, search: $search, fields: [], sortOrder: 'ASC', nodeId: $node['id']);
        $total = Server::getCount(search: $search, nodeId: $node['id']);
        $lastPage = ceil($total / $perPage);

        // Build the response data
        $data = [];
        foreach ($servers as $server) {
            // Get related data for each server
            $node = Node::getNodeById($server['node_id']);
            $allocation = Allocation::getAllocationById($server['allocation_id']);
            $spell = Spell::getSpellById($server['spell_id']);
            $realm = Realm::getById($server['realms_id']);

            if (!$node || !$allocation || !$spell || !$realm) {
                continue; // Skip servers with missing related data
            }

            // Get server variables
            $serverVariables = ServerVariable::getServerVariablesWithDetails($server['id']);
            $environment = [];

            // Build environment variables from server variables
            foreach ($serverVariables as $variable) {
                $environment[$variable['env_variable']] = $variable['variable_value'];
            }

            // Add default environment variables
            $environment['P_SERVER_LOCATION'] = $node['location_id'] ?? '';
            $environment['P_SERVER_UUID'] = $server['uuid'];
            $environment['P_SERVER_ALLOCATION_LIMIT'] = $server['allocation_limit'] ?? 0;
            $environment['SERVER_MEMORY'] = $server['memory'];
            $environment['SERVER_IP'] = $allocation['ip'];
            $environment['SERVER_PORT'] = $allocation['port'];

            // Parse spell features if available
            $spellFeatures = [];
            if (!empty($spell['features'])) {
                try {
                    $features = json_decode($spell['features'], true);
                    if (is_array($features)) {
                        $spellFeatures = $features;
                    }
                } catch (\Exception $e) {
                    // If features parsing fails, use empty array
                }
            }

            // Parse spell file denylist if available
            $fileDenylist = [];
            if (!empty($spell['file_denylist'])) {
                try {
                    $denylist = json_decode($spell['file_denylist'], true);
                    if (is_array($denylist)) {
                        $fileDenylist = $denylist;
                    }
                } catch (\Exception $e) {
                    // If file denylist parsing fails, use empty array
                }
            }

            // Parse spell docker images if available
            $dockerImage = $server['image'];
            if (!empty($spell['docker_images'])) {
                try {
                    $dockerImages = json_decode($spell['docker_images'], true);
                    if (is_array($dockerImages) && !empty($dockerImages)) {
                        $dockerImage = $dockerImages[0] ?? $server['image'];
                    }
                } catch (\Exception $e) {
                    // If docker images parsing fails, use server image
                }
            }

            // Parse spell startup configuration
            $startupCommand = $server['startup'];
            if (!empty($spell['startup'])) {
                $startupCommand = $spell['startup'];
            }

            // Parse spell config files
            $configFiles = [];
            if (!empty($spell['config_files'])) {
                try {
                    $configs = json_decode($spell['config_files'], true);
                    if (is_array($configs)) {
                        $configFiles = $configs;
                    }
                } catch (\Exception $e) {
                    // If config files parsing fails, use empty array
                }
            }

            // Parse spell config startup
            $configStartup = [];
            if (!empty($spell['config_startup'])) {
                try {
                    $startup = json_decode($spell['config_startup'], true);
                    if (is_array($startup)) {
                        $configStartup = $startup;
                    }
                } catch (\Exception $e) {
                    // If config startup parsing fails, use empty array
                }
            }

            // Parse spell config stop
            $configStop = $spell['config_stop'] ?? 'stop';

            // Build server configuration
            $serverConfig = [
                'uuid' => $server['uuid'],
                'settings' => [
                    'uuid' => $server['uuid'],
                    'meta' => [
                        'name' => $server['name'],
                        'description' => $server['description'],
                    ],
                    'suspended' => $server['status'] === 'suspended',
                    'invocation' => $startupCommand,
                    'skip_egg_scripts' => (bool) $server['skip_scripts'],
                    'environment' => $environment,
                    'labels' => [
                        'service' => $spell['name'] ?? 'unknown',
                        'realm' => $realm['name'] ?? 'unknown',
                        'node' => $node['name'] ?? 'unknown',
                        'author' => $spell['author'] ?? 'unknown',
                    ],
                    'allocations' => [
                        'force_outgoing_ip' => (bool) $spell['force_outgoing_ip'],
                        'default' => [
                            'ip' => $allocation['ip'],
                            'port' => $allocation['port'],
                        ],
                        'mappings' => [
                            $allocation['ip'] => [
                                $allocation['port'],
                            ],
                        ],
                    ],
                    'build' => [
                        'memory_limit' => $server['memory'],
                        'swap' => $server['swap'],
                        'io_weight' => $server['io'],
                        'cpu_limit' => $server['cpu'],
                        'disk_space' => $server['disk'],
                        'threads' => $server['threads'] ?? null,
                        'oom_killer' => !(bool) $server['oom_disabled'],
                    ],
                    'crash_detection_enabled' => true,
                    'mounts' => [],
                    'egg' => [
                        'id' => $spell['uuid'] ?? $spell['id'],
                        'file_denylist' => $fileDenylist,
                        'features' => $spellFeatures,
                    ],
                    'container' => [
                        'image' => $dockerImage,
                        'oom_disabled' => (bool) $server['oom_disabled'],
                        'requires_rebuild' => false,
                    ],
                ],
                'process_configuration' => [
                    'startup' => [
                        'done' => $configStartup['done'] ?? [
                            'Server is ready to accept connections',
                            'Server startup complete',
                            'Done (',
                            'For help, type "help"',
                        ],
                        'user_interaction' => $configStartup['user_interaction'] ?? [
                            'Do you accept the EULA?',
                            'Please accept the terms',
                        ],
                        'strip_ansi' => $configStartup['strip_ansi'] ?? true,
                    ],
                    'stop' => [
                        'type' => $configStop['type'] ?? 'command',
                        'value' => $configStop['value'] ?? $configStop,
                    ],
                    'configs' => $configFiles,
                ],
            ];

            $data[] = $serverConfig;
        }

        // Build pagination links
        $baseUrl = $request->getSchemeAndHttpHost() . $request->getBaseUrl() . '/api/remote/servers';
        $links = [
            'first' => $baseUrl . '?page=1',
            'last' => $baseUrl . '?page=' . $lastPage,
            'prev' => $page > 1 ? $baseUrl . '?page=' . ($page - 1) : null,
            'next' => $page < $lastPage ? $baseUrl . '?page=' . ($page + 1) : null,
        ];

        // Build meta information
        $meta = [
            'current_page' => $page,
            'from' => ($page - 1) * $perPage + 1,
            'last_page' => $lastPage,
            'links' => [
                [
                    'url' => $page > 1 ? $baseUrl . '?page=' . ($page - 1) : null,
                    'label' => '&laquo; Previous',
                    'active' => false,
                ],
                [
                    'url' => $baseUrl . '?page=' . $page,
                    'label' => (string) $page,
                    'active' => true,
                ],
                [
                    'url' => $page < $lastPage ? $baseUrl . '?page=' . ($page + 1) : null,
                    'label' => 'Next &raquo;',
                    'active' => false,
                ],
            ],
            'path' => $baseUrl,
            'per_page' => $perPage,
            'to' => min($page * $perPage, $total),
            'total' => $total,
        ];

        return ApiResponse::sendManualResponse([
            'data' => $data,
            'links' => $links,
            'meta' => $meta,
        ], 200);
    }
}
