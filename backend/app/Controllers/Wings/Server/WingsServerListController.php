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

namespace App\Controllers\Wings\Server;

use App\Chat\Node;
use App\Chat\Realm;
use App\Chat\Spell;
use App\Chat\Server;
use App\Chat\Allocation;
use App\Chat\ServerVariable;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Plugins\Events\Events\WingsEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'RemoteServersResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/WingsServerConfig'), description: 'Array of server configurations'),
        new OA\Property(property: 'links', type: 'object', properties: [
            new OA\Property(property: 'first', type: 'string', description: 'First page URL'),
            new OA\Property(property: 'last', type: 'string', description: 'Last page URL'),
            new OA\Property(property: 'prev', type: 'string', nullable: true, description: 'Previous page URL'),
            new OA\Property(property: 'next', type: 'string', nullable: true, description: 'Next page URL'),
        ]),
        new OA\Property(property: 'meta', type: 'object', properties: [
            new OA\Property(property: 'current_page', type: 'integer', description: 'Current page number'),
            new OA\Property(property: 'from', type: 'integer', description: 'Starting record number'),
            new OA\Property(property: 'last_page', type: 'integer', description: 'Last page number'),
            new OA\Property(property: 'links', type: 'array', items: new OA\Items(type: 'object'), description: 'Pagination links'),
            new OA\Property(property: 'path', type: 'string', description: 'Base path'),
            new OA\Property(property: 'per_page', type: 'integer', description: 'Records per page'),
            new OA\Property(property: 'to', type: 'integer', description: 'Ending record number'),
            new OA\Property(property: 'total', type: 'integer', description: 'Total number of records'),
        ]),
    ]
)]
class WingsServerListController
{
    #[OA\Get(
        path: '/api/remote/servers',
        summary: 'Get remote servers',
        description: 'Retrieve paginated list of all servers for the authenticated Wings node with complete configuration data. Requires Wings node token authentication (token ID and secret).',
        tags: ['Wings - Server'],
        parameters: [
            new OA\Parameter(
                name: 'page',
                in: 'query',
                description: 'Page number for pagination',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, default: 1)
            ),
            new OA\Parameter(
                name: 'per_page',
                in: 'query',
                description: 'Number of records per page',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, default: 50)
            ),
            new OA\Parameter(
                name: 'search',
                in: 'query',
                description: 'Search term to filter servers',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Remote servers retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/RemoteServersResponse')
            ),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid Wings authentication'),
            new OA\Response(response: 403, description: 'Forbidden - Invalid Wings authentication'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function getRemoteServers(Request $request): Response
    {
        // Get pagination parameters
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = max(1, (int) $request->query->get('per_page', 50));
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
        $lastPage = max(1, (int) ceil($total / $perPage));

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

            // Get all allocations for this server
            $allAllocations = Allocation::getByServerId($server['id']);

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
            $environment['P_SERVER_ALLOCATION_LIMIT'] = $server['allocation_limit'] ?? 1;
            // Use 1024 MB when memory is 0 (unlimited) - Wings does env substitution at runtime and -Xmx0M is invalid for Java
            $environment['SERVER_MEMORY'] = ((int) $server['memory']) > 0 ? $server['memory'] : 1024;
            $environment['SERVER_IP'] = $allocation['ip'];
            $environment['SERVER_PORT'] = $allocation['port'];

            // Parse spell startup configuration (from spell.startup field)
            // Prefer server-specific startup command if set, otherwise fallback to spell startup
            if (!empty($server['startup'])) {
                $startupCommand = $server['startup'] . ' # Added by FeatherPanel (Server Startup)';
            } elseif (!empty($spell['startup'])) {
                $startupCommand = $spell['startup'] . ' # Added by FeatherPanel (Spell Startup)';
            } else {
                $startupCommand = '# Added by FeatherPanel (No Startup Command)';
            }

            // Replace placeholders in startup command
            $startupCommand = $this->replacePlaceholders($startupCommand, $server, $allocation, $environment);

            // Sanitize Java memory arguments to prevent invalid values like -Xmx0M
            $startupCommand = $this->sanitizeJavaMemoryArguments($startupCommand, $server['memory']);

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

            // Parse spell config files
            $configFiles = [];
            if (!empty($spell['config_files'])) {
                try {
                    // config_files is stored as JSON string in the database
                    $configs = json_decode($spell['config_files'], true);
                    if (is_array($configs)) {
                        // Convert config files to the expected format
                        foreach ($configs as $configKey => $configValue) {
                            if (is_string($configKey) && is_array($configValue)) {
                                $configEntry = [
                                    'file' => $configKey,
                                    'parser' => $configValue['parser'] ?? 'properties',
                                ];

                                // Add find/replace rules if they exist
                                if (isset($configValue['find']) && is_array($configValue['find'])) {
                                    foreach ($configValue['find'] as $match => $replaceWith) {
                                        $replaceEntry = [
                                            'match' => $match,
                                        ];

                                        // Check if replaceWith is an array (conditional replacement with if_value)
                                        if (is_array($replaceWith)) {
                                            // Handle nested structure like: "servers.*.address": { "regex:...": "replacement" }
                                            foreach ($replaceWith as $condition => $replacement) {
                                                $replaceEntry['if_value'] = $condition;

                                                // Replace placeholders with actual values
                                                $replacement = $this->replacePlaceholders($replacement, $server, $allocation, $environment);

                                                $replaceEntry['replace_with'] = $replacement;
                                                break; // Only use the first condition
                                            }
                                        } else {
                                            // Simple string replacement
                                            // Replace placeholders with actual values
                                            $replaceWith = $this->replacePlaceholders($replaceWith, $server, $allocation, $environment);

                                            $replaceEntry['replace_with'] = $replaceWith;
                                        }

                                        $configEntry['replace'][] = $replaceEntry;
                                    }
                                }

                                $configFiles[] = $configEntry;
                            }
                        }
                    }
                } catch (\Exception $e) {
                    // If config files parsing fails, use empty array
                    $configFiles = [];
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
                    $configStartup = [];
                }
            }

            // Ensure done and user_interaction are arrays
            $doneMessages = [];
            if (isset($configStartup['done'])) {
                if (is_array($configStartup['done'])) {
                    $doneMessages = $configStartup['done'];
                } elseif (is_string($configStartup['done'])) {
                    $doneMessages = [$configStartup['done']];
                }
            }

            // Only use defaults if no spell config is available
            if (empty($doneMessages) && empty($spell['config_startup'])) {
                $doneMessages = [
                    'Server is ready to accept connections',
                    'Server startup complete',
                    'Done (',
                    'For help, type "help"',
                ];
            }

            $userInteractionMessages = [];
            if (isset($configStartup['user_interaction'])) {
                if (is_array($configStartup['user_interaction'])) {
                    $userInteractionMessages = $configStartup['user_interaction'];
                } elseif (is_string($configStartup['user_interaction'])) {
                    $userInteractionMessages = [$configStartup['user_interaction']];
                }
            }

            // Only use defaults if no spell config is available
            if (empty($userInteractionMessages) && empty($spell['config_startup'])) {
                $userInteractionMessages = [
                    'Do you accept the EULA?',
                    'Please accept the terms',
                ];
            }

            // Parse spell config stop
            $configStop = $spell['config_stop'] ?? 'stop';

            // Sanitize config stop
            if (is_array($configStop)) {
                $sanitizedConfigStop = [];
                if (isset($configStop['type']) && is_string($configStop['type'])) {
                    $sanitizedConfigStop['type'] = $configStop['type'];
                }
                if (isset($configStop['value']) && (is_string($configStop['value']) || is_numeric($configStop['value']))) {
                    $sanitizedConfigStop['value'] = $configStop['value'];
                }
                $configStop = !empty($sanitizedConfigStop) ? $sanitizedConfigStop : 'stop';
            } elseif (!is_string($configStop)) {
                $configStop = 'stop';
            }

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
                    'allocations' => [
                        'force_outgoing_ip' => (bool) $spell['force_outgoing_ip'],
                        'default' => [
                            'ip' => $allocation['ip'],
                            'port' => $allocation['port'],
                        ],
                        'mappings' => $this->buildAllocationMappings($allAllocations),
                    ],
                    'build' => [
                        'memory_limit' => $server['memory'],
                        'swap' => $server['swap'],
                        'io_weight' => $server['io'],
                        'cpu_limit' => $server['cpu'],
                        'disk_space' => $server['disk'],
                        'threads' => $server['threads'] ?? null,
                        'oom_disabled' => (bool) $server['oom_disabled'],
                    ],
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
                    'configs' => $configFiles,
                    'startup' => [
                        'done' => $doneMessages,
                        'user_interaction' => $userInteractionMessages,
                        'strip_ansi' => $configStartup['strip_ansi'] ?? false,
                    ],
                    'stop' => [
                        'type' => $configStop['type'] ?? 'command',
                        'value' => $configStop['value'] ?? $configStop,
                    ],
                ],
            ];

            $data[] = $serverConfig;
        }

        // Build pagination links
        $baseUrl = $request->getSchemeAndHttpHost() . $request->getBaseUrl() . '/api/remote/servers';
        $links = [
            'first' => $baseUrl . '?page=1',
            'last' => $baseUrl . '?page=' . max(1, $lastPage),
            'prev' => $page > 1 ? $baseUrl . '?page=' . ($page - 1) : null,
            'next' => $page < $lastPage ? $baseUrl . '?page=' . ($page + 1) : null,
        ];

        // Build meta information
        $meta = [
            'current_page' => $page,
            'from' => max(1, ($page - 1) * $perPage + 1),
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
            'to' => max(0, min($page * $perPage, $total)),
            'total' => $total,
        ];

        // Emit event
        global $eventManager;
        $eventManager->emit(
            WingsEvent::onWingsRemoteServersRetrieved(),
            [
                'node' => $node,
                'servers' => $data,
                'pagination' => $meta,
                'total' => $total,
            ]
        );

        return ApiResponse::sendManualResponse([
            'data' => $data,
            'links' => $links,
            'meta' => $meta,
        ], 200);
    }

    /**
     * Replace placeholders in configuration values with actual server data.
     * Handles both modern and legacy Pterodactyl placeholders.
     *
     * @param string $value The value containing placeholders
     * @param array<string, mixed> $server Server data
     * @param array<string, mixed> $allocation Allocation data
     * @param array<string, mixed> $environment Environment variables (from server variables)
     *
     * @return string The value with placeholders replaced
     */
    private function replacePlaceholders(string $value, array $server, array $allocation, array $environment): string
    {
        // When memory is 0 (unlimited), use 1024 MB as safe default for Java -Xmx/-Xms to avoid invalid -Xmx0M
        $memoryValue = (int) $server['memory'];
        $memoryForPlaceholders = $memoryValue > 0 ? $memoryValue : 1024;

        // Modern placeholders - replace with actual values
        $replacements = [
            '{{server.build.default.port}}' => (string) $allocation['port'],
            '{{server.build.default.ip}}' => (string) $allocation['ip'],
            '{{server.build.memory}}' => (string) $memoryForPlaceholders,
        ];

        // Legacy placeholders - also replace with actual values
        $legacyReplacements = [
            '{{server.build.env.SERVER_PORT}}' => (string) $allocation['port'],
            '{{env.SERVER_PORT}}' => (string) $allocation['port'],
            '{{server.build.env.SERVER_IP}}' => (string) $allocation['ip'],
            '{{env.SERVER_IP}}' => (string) $allocation['ip'],
            '{{server.build.env.SERVER_MEMORY}}' => (string) $memoryForPlaceholders,
            '{{env.SERVER_MEMORY}}' => (string) $memoryForPlaceholders,
        ];

        // Apply all replacements
        foreach (array_merge($replacements, $legacyReplacements) as $placeholder => $replacement) {
            if (str_contains($value, $placeholder)) {
                $value = str_replace($placeholder, $replacement, $value);
            }
        }

        // Dynamic environment placeholders from server variables
        // Replace {{server.build.env.KEY}} and {{env.KEY}} with values from $environment
        foreach ($environment as $envKey => $envValue) {
            if (!is_string($envKey)) {
                continue;
            }
            if (!is_string($envValue) && !is_numeric($envValue)) {
                continue;
            }
            $envValueStr = (string) $envValue;
            // Override SERVER_MEMORY when 0 (unlimited) to avoid -Xmx0M in Java startup commands
            if ($envKey === 'SERVER_MEMORY' && (int) $envValue === 0) {
                $envValueStr = (string) $memoryForPlaceholders;
            }

            $envPlaceholders = [
                '{{server.build.env.' . $envKey . '}}',
                '{{env.' . $envKey . '}}',
            ];

            foreach ($envPlaceholders as $ph) {
                if (str_contains($value, $ph)) {
                    $value = str_replace($ph, $envValueStr, $value);
                }
            }
        }

        // Handle legacy config.docker.interface -> config.docker.network.interface conversion
        // This one stays as a placeholder for Wings to handle
        if (str_contains($value, '{{config.docker.interface}}')) {
            $value = str_replace('{{config.docker.interface}}', '{{config.docker.network.interface}}', $value);
        }

        return $value;
    }

    /**
     * Build allocation mappings grouped by IP address.
     *
     * @param array<int, array<string, mixed>> $allocations Array of allocations
     *
     * @return array<string, array<int, int>> Allocations grouped by IP with array of ports
     */
    private function buildAllocationMappings(array $allocations): array
    {
        $mappings = [];

        foreach ($allocations as $alloc) {
            $ip = $alloc['ip'];
            $port = (int) $alloc['port'];

            if (!isset($mappings[$ip])) {
                $mappings[$ip] = [];
            }

            $mappings[$ip][] = $port;
        }

        return $mappings;
    }

    /**
     * Sanitize Java memory arguments in startup command to prevent invalid values.
     * Fixes issues like -Xmx0M, -Xms0M, etc. by removing invalid arguments or replacing with valid defaults.
     *
     * @param string $startupCommand The startup command to sanitize
     * @param int $serverMemory Server memory in MB (used as fallback for -Xmx)
     *
     * @return string The sanitized startup command
     */
    private function sanitizeJavaMemoryArguments(string $startupCommand, int $serverMemory): string
    {
        // First pass: remove any -Xmx0M / -Xms0M etc. that could slip through (e.g. from variables, unlimited RAM)
        $startupCommand = preg_replace('/\s*-Xm[xs]0[kKmMgGtT]?\s*/', ' ', $startupCommand);

        // Pattern to match Java memory arguments: -Xmx128M, -Xms64M, -Xmx1024m, etc.
        // Matches: -Xmx or -Xms, followed by digits, optionally followed by unit (k, K, m, M, g, G, t, T)
        $pattern = '/(-Xm[xs])([0-9]+)([kKmMgGtT]?)/';

        $sanitizedCommand = preg_replace_callback($pattern, function ($matches) use ($serverMemory) {
            $flag = $matches[1]; // -Xmx or -Xms
            $value = (int) $matches[2]; // Numeric value
            $unit = strtoupper($matches[3] ?? 'M'); // Unit (k, m, g, t) or empty (defaults to M)

            // Convert to MB for validation
            $valueInMB = $value;
            switch ($unit) {
                case 'K':
                    $valueInMB = $value / 1024;
                    break;
                case 'G':
                    $valueInMB = $value * 1024;
                    break;
                case 'T':
                    $valueInMB = $value * 1024 * 1024;
                    break;
                    // 'M' or empty stays as-is
            }

            // Check if value is invalid (0 or negative)
            if ($valueInMB <= 0 || $value <= 0) {
                // For -Xmx with invalid value, try to replace with server memory if available
                if ($flag === '-Xmx' && $serverMemory > 0) {
                    // Use server memory, but keep original unit if specified
                    $fallbackValue = $serverMemory;
                    if ($unit === 'K') {
                        $fallbackValue = $serverMemory * 1024;
                    } elseif ($unit === 'G') {
                        $fallbackValue = max(1, (int) ($serverMemory / 1024));
                    } elseif ($unit === 'T') {
                        $fallbackValue = max(1, (int) ($serverMemory / (1024 * 1024)));
                    }

                    return $flag . $fallbackValue . $unit;
                }

                // For -Xms with invalid value or -Xmx when server memory is also invalid, remove the argument
                return '';
            }

            // Return original if valid
            return $matches[0];
        }, $startupCommand);

        // Clean up multiple spaces that might have been created
        $sanitizedCommand = preg_replace('/\s+/', ' ', $sanitizedCommand);
        $sanitizedCommand = trim($sanitizedCommand);

        return $sanitizedCommand;
    }
}
