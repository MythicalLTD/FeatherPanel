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
use App\Plugins\Events\Events\WingsEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class WingsServerInfoController
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

        // Parse spell startup configuration (from spell.startup field)
        $startupCommand = $server['startup']; // Use server.startup as primary
        if (!empty($spell['startup'])) {
            $startupCommand = $spell['startup'];
        }

        // Ensure we have a proper startup command
        if (empty($startupCommand)) {
            $startupCommand = 'java -Xms128M -XX:MaxRAMPercentage=95.0 -Dterminal.jline=false -Dterminal.ansi=true -jar {{SERVER_JARFILE}}';
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
                                    // Replace server port placeholder with actual default port
                                    if ($replaceWith === '{{server.build.default.port}}') {
                                        $replaceWith = (string) $allocation['port'];
                                    }
                                    $configEntry['replace'][] = [
                                        'match' => $match,
                                        'replace_with' => $replaceWith,
                                    ];
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
}
