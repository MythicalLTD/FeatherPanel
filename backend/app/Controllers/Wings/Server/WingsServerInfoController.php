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
    schema: 'WingsServerConfig',
    type: 'object',
    properties: [
        new OA\Property(property: 'settings', type: 'object', properties: [
            new OA\Property(property: 'uuid', type: 'string', description: 'Server UUID'),
            new OA\Property(property: 'meta', type: 'object', properties: [
                new OA\Property(property: 'name', type: 'string', description: 'Server name'),
                new OA\Property(property: 'description', type: 'string', description: 'Server description'),
            ]),
            new OA\Property(property: 'suspended', type: 'boolean', description: 'Server suspension status'),
            new OA\Property(property: 'invocation', type: 'string', description: 'Startup command'),
            new OA\Property(property: 'skip_egg_scripts', type: 'boolean', description: 'Skip egg scripts flag'),
            new OA\Property(property: 'environment', type: 'object', description: 'Environment variables'),
            new OA\Property(property: 'allocations', type: 'object', properties: [
                new OA\Property(property: 'force_outgoing_ip', type: 'boolean'),
                new OA\Property(property: 'default', type: 'object', properties: [
                    new OA\Property(property: 'ip', type: 'string'),
                    new OA\Property(property: 'port', type: 'integer'),
                ]),
                new OA\Property(property: 'mappings', type: 'object'),
            ]),
            new OA\Property(property: 'build', type: 'object', properties: [
                new OA\Property(property: 'memory_limit', type: 'integer'),
                new OA\Property(property: 'swap', type: 'integer'),
                new OA\Property(property: 'io_weight', type: 'integer'),
                new OA\Property(property: 'cpu_limit', type: 'integer'),
                new OA\Property(property: 'disk_space', type: 'integer'),
                new OA\Property(property: 'threads', type: 'integer', nullable: true),
                new OA\Property(property: 'oom_disabled', type: 'boolean'),
            ]),
            new OA\Property(property: 'mounts', type: 'array', items: new OA\Items(type: 'object')),
            new OA\Property(property: 'egg', type: 'object', properties: [
                new OA\Property(property: 'id', type: 'string'),
                new OA\Property(property: 'file_denylist', type: 'array', items: new OA\Items(type: 'string')),
                new OA\Property(property: 'features', type: 'object'),
            ]),
            new OA\Property(property: 'container', type: 'object', properties: [
                new OA\Property(property: 'image', type: 'string'),
                new OA\Property(property: 'oom_disabled', type: 'boolean'),
                new OA\Property(property: 'requires_rebuild', type: 'boolean'),
            ]),
        ]),
        new OA\Property(property: 'process_configuration', type: 'object', properties: [
            new OA\Property(property: 'configs', type: 'array', items: new OA\Items(type: 'object')),
            new OA\Property(property: 'startup', type: 'object', properties: [
                new OA\Property(property: 'done', type: 'array', items: new OA\Items(type: 'string')),
                new OA\Property(property: 'user_interaction', type: 'array', items: new OA\Items(type: 'string')),
                new OA\Property(property: 'strip_ansi', type: 'boolean'),
            ]),
            new OA\Property(property: 'stop', type: 'object', properties: [
                new OA\Property(property: 'type', type: 'string'),
                new OA\Property(property: 'value', type: 'string'),
            ]),
        ]),
    ]
)]
class WingsServerInfoController
{
    #[OA\Get(
        path: '/api/remote/servers/{uuid}',
        summary: 'Get server configuration',
        description: 'Retrieve complete server configuration for Wings daemon including settings, environment variables, allocations, and process configuration. Requires Wings node token authentication (token ID and secret).',
        tags: ['Wings - Server'],
        parameters: [
            new OA\Parameter(
                name: 'uuid',
                in: 'path',
                description: 'Server UUID',
                required: true,
                schema: new OA\Schema(type: 'string', format: 'uuid')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server configuration retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/WingsServerConfig')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing server UUID'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid Wings node token (token ID and secret)'),
            new OA\Response(response: 403, description: 'Forbidden - Invalid Wings node token (token ID and secret)'),
            new OA\Response(response: 404, description: 'Not found - Server, node, allocation, spell, or realm not found'),
            new OA\Response(response: 500, description: 'Internal server error - Configuration generation failed'),
        ]
    )]
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

        // Get all allocations for this server
        $allAllocations = Allocation::getByServerId($server['id']);

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

        // Parse spell startup configuration (from spell.startup field)
        // Prefer server-specific startup command if set, otherwise fallback to spell startup
        if (!empty($server['startup'])) {
            $startupCommand = $server['startup'] . ' # Added by FeatherPanel (Server Startup)';
        } elseif (!empty($spell['startup'])) {
            $startupCommand = $spell['startup'] . ' # Added by FeatherPanel (Spell Startup)';
        } else {
            $startupCommand = '# Added by FeatherPanel (No Startup Command)';
        }

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
                $spellFeatures = [];
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
                $fileDenylist = [];
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
                $dockerImage = $server['image'];
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
                $configLogs = [];
            }
        }

        // Parse spell config stop (from spell.config_stop field)
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

        // Sanitize string values to prevent JSON issues
        $serverName = is_string($server['name']) ? $server['name'] : '';
        $serverDescription = is_string($server['description']) ? $server['description'] : '';
        $startupCommand = is_string($startupCommand) ? $startupCommand : '';
        $spellName = is_string($spell['name'] ?? '') ? $spell['name'] : 'unknown';
        $realmName = is_string($realm['name'] ?? '') ? $realm['name'] : 'unknown';
        $nodeName = is_string($node['name'] ?? '') ? $node['name'] : 'unknown';
        $spellAuthor = is_string($spell['author'] ?? '') ? $spell['author'] : 'unknown';
        $dockerImage = is_string($dockerImage) ? $dockerImage : '';

        // Function to sanitize strings for JSON
        $sanitizeString = function ($str) {
            if (!is_string($str)) {
                return '';
            }
            // Remove any control characters that might cause JSON issues
            $str = preg_replace('/[\x00-\x1F\x7F]/', '', $str);
            // Ensure the string is UTF-8 valid
            if (!mb_check_encoding($str, 'UTF-8')) {
                $str = mb_convert_encoding($str, 'UTF-8', 'UTF-8');
            }

            return $str;
        };

        // Apply sanitization to all string values
        $serverName = $sanitizeString($serverName);
        $serverDescription = $sanitizeString($serverDescription);
        $startupCommand = $sanitizeString($startupCommand);
        $spellName = $sanitizeString($spellName);
        $realmName = $sanitizeString($realmName);
        $nodeName = $sanitizeString($nodeName);
        $spellAuthor = $sanitizeString($spellAuthor);
        $dockerImage = $sanitizeString($dockerImage);

        // Sanitize environment variables
        $sanitizedEnvironment = [];
        foreach ($environment as $key => $value) {
            if (is_string($key) && (is_string($value) || is_numeric($value))) {
                $sanitizedEnvironment[$key] = $value;
            }
        }

        // Sanitize startup configuration
        $doneMessages = [];
        if (isset($configStartup['done'])) {
            if (is_array($configStartup['done'])) {
                foreach ($configStartup['done'] as $message) {
                    if (is_string($message)) {
                        $doneMessages[] = $message;
                    }
                }
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
                foreach ($configStartup['user_interaction'] as $message) {
                    if (is_string($message)) {
                        $userInteractionMessages[] = $message;
                    }
                }
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

        // Build the Wings configuration format using actual database fields
        $wingsConfig = [
            'settings' => [
                'uuid' => $server['uuid'],
                'meta' => [
                    'name' => $serverName,
                    'description' => $serverDescription,
                ],
                'suspended' => $server['status'] === 'suspended',
                'invocation' => $startupCommand,
                'skip_egg_scripts' => (bool) $server['skip_scripts'],
                'environment' => $sanitizedEnvironment,
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

        // Validate that the configuration can be properly JSON encoded
        try {
            $jsonTest = json_encode($wingsConfig, JSON_PRETTY_PRINT);
            if ($jsonTest === false) {
                $jsonError = json_last_error_msg();
                throw new \Exception('Failed to encode JSON configuration: ' . $jsonError);
            }

            // Check response size to prevent truncation
            $responseSize = strlen($jsonTest);
            if ($responseSize > 1024 * 1024) { // 1MB limit
                throw new \Exception('Response too large: ' . $responseSize . ' bytes');
            }

            // Additional validation: try to decode and re-encode to catch any issues
            $decodedTest = json_decode($jsonTest, true);
            if ($decodedTest === null) {
                throw new \Exception('JSON validation failed after encoding');
            }
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to generate server configuration: ' . $e->getMessage(), 'CONFIG_ERROR', 500);
        }

        // Emit event
        global $eventManager;
        $eventManager->emit(
            WingsEvent::onWingsServerInfoRetrieved(),
            [
                'server_uuid' => $uuid,
                'server' => $server,
                'node' => $node,
                'spell' => $spell,
                'realm' => $realm,
                'allocation' => $allocation,
            ]
        );

        return ApiResponse::sendManualResponse($wingsConfig, 200);
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
}
