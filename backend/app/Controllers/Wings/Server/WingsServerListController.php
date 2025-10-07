<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
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
            $environment['SERVER_MEMORY'] = $server['memory'];
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
                                                $replacement = $this->replacePlaceholders($replacement, $server, $allocation);

                                                $replaceEntry['replace_with'] = $replacement;
                                                break; // Only use the first condition
                                            }
                                        } else {
                                            // Simple string replacement
                                            // Replace placeholders with actual values
                                            $replaceWith = $this->replacePlaceholders($replaceWith, $server, $allocation);

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
     *
     * @return string The value with placeholders replaced
     */
    private function replacePlaceholders(string $value, array $server, array $allocation): string
    {
        // Modern placeholders - replace with actual values
        $replacements = [
            '{{server.build.default.port}}' => (string) $allocation['port'],
            '{{server.build.default.ip}}' => (string) $allocation['ip'],
            '{{server.build.memory}}' => (string) $server['memory'],
        ];

        // Legacy placeholders - also replace with actual values
        $legacyReplacements = [
            '{{server.build.env.SERVER_PORT}}' => (string) $allocation['port'],
            '{{env.SERVER_PORT}}' => (string) $allocation['port'],
            '{{server.build.env.SERVER_IP}}' => (string) $allocation['ip'],
            '{{env.SERVER_IP}}' => (string) $allocation['ip'],
            '{{server.build.env.SERVER_MEMORY}}' => (string) $server['memory'],
            '{{env.SERVER_MEMORY}}' => (string) $server['memory'],
        ];

        // Apply all replacements
        foreach (array_merge($replacements, $legacyReplacements) as $placeholder => $replacement) {
            if (str_contains($value, $placeholder)) {
                $value = str_replace($placeholder, $replacement, $value);
            }
        }

        // Handle legacy config.docker.interface -> config.docker.network.interface conversion
        // This one stays as a placeholder for Wings to handle
        if (str_contains($value, '{{config.docker.interface}}')) {
            $value = str_replace('{{config.docker.interface}}', '{{config.docker.network.interface}}', $value);
        }

        return $value;
    }
}
