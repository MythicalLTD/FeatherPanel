<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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

namespace App\Controllers\Admin;

use App\App;
use App\Helpers\ApiResponse;
use App\Plugins\PluginFlags;
use App\Plugins\PluginConfig;
use App\Plugins\PluginHelper;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\Plugins\PluginSettings;
use Symfony\Component\Yaml\Yaml;
use App\Plugins\PluginDependencies;
use App\Plugins\PluginRequiredConfigs;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Plugins\Events\Events\PluginManagerEvent;

#[OA\Schema(
    schema: 'Plugin',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Plugin name'),
        new OA\Property(property: 'identifier', type: 'string', description: 'Plugin identifier'),
        new OA\Property(property: 'description', type: 'string', description: 'Plugin description'),
        new OA\Property(property: 'version', type: 'string', description: 'Plugin version'),
        new OA\Property(property: 'target', type: 'string', description: 'Target FeatherPanel version'),
        new OA\Property(property: 'author', type: 'array', items: new OA\Items(type: 'string'), description: 'Plugin authors'),
        new OA\Property(property: 'icon', type: 'string', description: 'Plugin icon URL'),
        new OA\Property(property: 'flags', type: 'array', items: new OA\Items(type: 'string'), description: 'Plugin flags'),
        new OA\Property(property: 'dependencies', type: 'array', items: new OA\Items(type: 'string'), description: 'Plugin dependencies'),
        new OA\Property(property: 'requiredConfigs', type: 'array', items: new OA\Items(type: 'string'), description: 'Required configuration keys'),
        new OA\Property(property: 'status', type: 'string', description: 'Plugin status'),
        new OA\Property(property: 'dependencies_met', type: 'boolean', description: 'Whether dependencies are met'),
        new OA\Property(property: 'required_configs_set', type: 'boolean', description: 'Whether required configs are set'),
        new OA\Property(property: 'settings', type: 'object', description: 'Plugin settings'),
        new OA\Property(property: 'config', type: 'array', items: new OA\Items(type: 'object'), description: 'Plugin configuration schema'),
    ]
)]
#[OA\Schema(
    schema: 'PluginCreate',
    type: 'object',
    required: ['identifier', 'name'],
    properties: [
        new OA\Property(property: 'identifier', type: 'string', description: 'Plugin identifier', minLength: 1, maxLength: 255),
        new OA\Property(property: 'name', type: 'string', description: 'Plugin name', minLength: 1, maxLength: 255),
        new OA\Property(property: 'description', type: 'string', description: 'Plugin description'),
        new OA\Property(property: 'version', type: 'string', description: 'Plugin version', default: '1.0.0'),
        new OA\Property(property: 'author', type: 'array', items: new OA\Items(type: 'string'), description: 'Plugin authors'),
        new OA\Property(property: 'flags', type: 'array', items: new OA\Items(type: 'string'), description: 'Plugin flags'),
        new OA\Property(property: 'dependencies', type: 'array', items: new OA\Items(type: 'string'), description: 'Plugin dependencies'),
        new OA\Property(property: 'requiredConfigs', type: 'array', items: new OA\Items(type: 'string'), description: 'Required configuration keys'),
        new OA\Property(property: 'configSchema', type: 'array', items: new OA\Items(type: 'object'), description: 'Configuration schema'),
    ]
)]
#[OA\Schema(
    schema: 'PluginUpdate',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Plugin name'),
        new OA\Property(property: 'description', type: 'string', description: 'Plugin description'),
        new OA\Property(property: 'version', type: 'string', description: 'Plugin version'),
        new OA\Property(property: 'target', type: 'string', description: 'Target FeatherPanel version'),
        new OA\Property(property: 'author', type: 'array', items: new OA\Items(type: 'string'), description: 'Plugin authors'),
        new OA\Property(property: 'flags', type: 'array', items: new OA\Items(type: 'string'), description: 'Plugin flags'),
        new OA\Property(property: 'dependencies', type: 'array', items: new OA\Items(type: 'string'), description: 'Plugin dependencies'),
        new OA\Property(property: 'requiredConfigs', type: 'array', items: new OA\Items(type: 'string'), description: 'Required configuration keys'),
        new OA\Property(property: 'configSchema', type: 'array', items: new OA\Items(type: 'object'), description: 'Configuration schema'),
    ]
)]
#[OA\Schema(
    schema: 'PluginSettingsUpdate',
    type: 'object',
    required: ['settings'],
    properties: [
        new OA\Property(property: 'settings', type: 'object', description: 'Plugin settings key-value pairs'),
    ]
)]
#[OA\Schema(
    schema: 'PluginValidation',
    type: 'object',
    properties: [
        new OA\Property(property: 'config_valid', type: 'boolean', description: 'Whether plugin configuration is valid'),
        new OA\Property(property: 'dependencies_met', type: 'boolean', description: 'Whether dependencies are met'),
        new OA\Property(property: 'required_configs_set', type: 'boolean', description: 'Whether required configs are set'),
        new OA\Property(property: 'identifier_valid', type: 'boolean', description: 'Whether identifier is valid'),
        new OA\Property(property: 'flags_valid', type: 'boolean', description: 'Whether flags are valid'),
        new OA\Property(property: 'files_exist', type: 'boolean', description: 'Whether required files exist'),
        new OA\Property(property: 'overall_valid', type: 'boolean', description: 'Overall validation status'),
    ]
)]
#[OA\Schema(
    schema: 'PluginFileCreate',
    type: 'object',
    required: ['plugin_id', 'file_type'],
    properties: [
        new OA\Property(property: 'plugin_id', type: 'string', description: 'Plugin identifier'),
        new OA\Property(property: 'file_type', type: 'string', description: 'File type to create', enum: ['migration', 'cron', 'command', 'public_file']),
        new OA\Property(property: 'name', type: 'string', description: 'File name (required for migration, cron, command)'),
        new OA\Property(property: 'description', type: 'string', description: 'File description'),
        new OA\Property(property: 'schedule', type: 'string', description: 'Schedule for cron jobs', default: '1H'),
        new OA\Property(property: 'file', type: 'string', format: 'binary', description: 'File to upload (for public_file type)'),
    ]
)]
#[OA\Schema(
    schema: 'PluginWidget',
    type: 'object',
    required: ['id', 'component', 'page', 'location'],
    properties: [
        new OA\Property(property: 'id', type: 'string', description: 'Unique widget identifier'),
        new OA\Property(property: 'component', type: 'string', description: 'Widget HTML component file path'),
        new OA\Property(property: 'page', type: 'string', description: 'Target page identifier'),
        new OA\Property(property: 'location', type: 'string', description: 'Widget location on page'),
        new OA\Property(property: 'enabled', type: 'boolean', description: 'Whether widget is enabled', default: true),
        new OA\Property(property: 'priority', type: 'integer', description: 'Rendering priority (higher = first)', default: 100),
        new OA\Property(property: 'size', type: 'string', description: 'Widget size: full, half, third, or quarter', default: 'full'),
    ]
)]
#[OA\Schema(
    schema: 'PluginCreationOptions',
    type: 'object',
    properties: [
        new OA\Property(property: 'migration', type: 'object', properties: [
            new OA\Property(property: 'name', type: 'string'),
            new OA\Property(property: 'description', type: 'string'),
            new OA\Property(property: 'icon', type: 'string'),
            new OA\Property(property: 'fields', type: 'object'),
        ]),
        new OA\Property(property: 'cron', type: 'object', properties: [
            new OA\Property(property: 'name', type: 'string'),
            new OA\Property(property: 'description', type: 'string'),
            new OA\Property(property: 'icon', type: 'string'),
            new OA\Property(property: 'fields', type: 'object'),
        ]),
        new OA\Property(property: 'command', type: 'object', properties: [
            new OA\Property(property: 'name', type: 'string'),
            new OA\Property(property: 'description', type: 'string'),
            new OA\Property(property: 'icon', type: 'string'),
            new OA\Property(property: 'fields', type: 'object'),
        ]),
        new OA\Property(property: 'public_file', type: 'object', properties: [
            new OA\Property(property: 'name', type: 'string'),
            new OA\Property(property: 'description', type: 'string'),
            new OA\Property(property: 'icon', type: 'string'),
            new OA\Property(property: 'fields', type: 'object'),
        ]),
    ]
)]
class PluginManagerController
{
    private string $pluginsDir;
    private array $directories = ['Migrations', 'Cron', 'Commands', 'Events', 'Public', 'Frontend'];

    public function __construct()
    {
        $this->pluginsDir = PluginHelper::getPluginsDir();
    }

    #[OA\Get(
        path: '/api/admin/plugin-manager',
        summary: 'Get all plugins',
        description: 'Retrieve a list of all installed plugins with their configuration, status, dependencies, and file information. Only available in developer mode.',
        tags: ['Admin - Plugin Manager'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Plugins retrieved successfully',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: '#/components/schemas/Plugin')
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled or insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to fetch plugins'),
        ]
    )]
    public function getPlugins(Request $request): Response
    {
        $config = App::getInstance(true)->getConfig();
        if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
            return ApiResponse::error('You are not allowed to view plugins in non-developer mode', 403);
        }
        try {
            $plugins = [];

            if (empty($this->pluginsDir) || !is_dir($this->pluginsDir)) {
                return ApiResponse::success([], 'No plugins directory found', 200);
            }

            $pluginDirectories = array_filter(scandir($this->pluginsDir), function ($item) {
                return $item !== '.' && $item !== '..' && is_dir($this->pluginsDir . '/' . $item);
            });

            foreach ($pluginDirectories as $pluginDir) {
                $config = PluginHelper::getPluginConfig($pluginDir);
                if (!empty($config)) {
                    $plugin = $config['plugin'];
                    $plugin['identifier'] = $pluginDir;
                    $plugin['status'] = $this->getPluginStatus($pluginDir);
                    $plugin['dependencies_met'] = PluginDependencies::checkDependencies($config);
                    $plugin['required_configs_set'] = PluginRequiredConfigs::areRequiredConfigsSet($pluginDir);
                    $plugin['settings'] = PluginSettings::getSettings($pluginDir);
                    $plugin['config'] = $config['config'] ?? [];
                    $plugins[] = $plugin;
                }
            }

            return ApiResponse::success($plugins, 'Plugins fetched successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to fetch plugins: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/plugin-manager',
        summary: 'Create new plugin',
        description: 'Create a new plugin with complete directory structure, configuration files, and example code. Only available in developer mode.',
        tags: ['Admin - Plugin Manager'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/PluginCreate')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Plugin created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'identifier', type: 'string', description: 'Plugin identifier'),
                        new OA\Property(property: 'path', type: 'string', description: 'Plugin directory path'),
                        new OA\Property(property: 'files_created', type: 'array', items: new OA\Items(properties: [
                            new OA\Property(property: 'name', type: 'string'),
                            new OA\Property(property: 'path', type: 'string'),
                            new OA\Property(property: 'size', type: 'integer'),
                            new OA\Property(property: 'modified', type: 'string', format: 'date-time'),
                            new OA\Property(property: 'type', type: 'string'),
                        ])),
                        new OA\Property(property: 'migration_result', type: 'object', properties: [
                            new OA\Property(property: 'executed', type: 'integer'),
                            new OA\Property(property: 'skipped', type: 'integer'),
                            new OA\Property(property: 'failed', type: 'integer'),
                            new OA\Property(property: 'lines', type: 'array', items: new OA\Items(type: 'string')),
                        ]),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing required fields, invalid identifier, or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled or insufficient permissions'),
            new OA\Response(response: 409, description: 'Conflict - Plugin already exists'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create plugin'),
        ]
    )]
    public function createPlugin(Request $request): Response
    {
        $config = App::getInstance(true)->getConfig();
        if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
            return ApiResponse::error('You are not allowed to create plugins in non-developer mode', 403);
        }
        try {
            $data = json_decode($request->getContent(), true);

            $identifier = $data['identifier'] ?? '';
            $name = $data['name'] ?? '';
            $description = $data['description'] ?? '';
            $version = $data['version'] ?? '1.0.0';
            $template = $data['template'] ?? 'starter'; // Default to starter template
            $author = $data['author'] ?? [];
            $flags = $data['flags'] ?? [];
            $dependencies = $data['dependencies'] ?? [];
            $requiredConfigs = $data['requiredConfigs'] ?? [];
            $configSchema = $data['configSchema'] ?? [];

            if (empty($identifier) || empty($name)) {
                return ApiResponse::error('Identifier and name are required', 400);
            }

            // Validate template
            if (!in_array($template, ['empty', 'starter', 'fresh'], true)) {
                return ApiResponse::error('Invalid template. Must be one of: empty, starter, fresh', 400);
            }

            if (!PluginConfig::isValidIdentifier($identifier)) {
                return ApiResponse::error('Invalid plugin identifier', 400);
            }

            $pluginPath = $this->pluginsDir . '/' . $identifier;

            if (is_dir($pluginPath)) {
                return ApiResponse::error('Plugin already exists', 409);
            }

            // Create plugin directory
            if (!mkdir($pluginPath, 0755, true)) {
                return ApiResponse::error('Failed to create plugin directory', 500);
            }

            // Create conf.yml with enhanced config support
            $configSchemaData = !empty($configSchema) ? $configSchema : $this->generateEnhancedConfigSchema($requiredConfigs);

            $config = [
                'plugin' => [
                    'name' => $name,
                    'identifier' => $identifier,
                    'description' => $description,
                    'flags' => $flags,
                    'version' => $version,
                    'target' => 'v2',
                    'author' => is_array($author) ? $author : [$author],
                    'icon' => 'https://cdn.mythical.systems/featherpanel/logo.png',
                    'requiredConfigs' => $requiredConfigs,
                    'dependencies' => $dependencies,
                ],
                'config' => array_values($configSchemaData), // Ensure it's an indexed array
            ];

            $yamlContent = Yaml::dump($config, 4, 2);
            file_put_contents($pluginPath . '/conf.yml', $yamlContent);

            // Create main plugin class
            $className = $this->toCamelCase($name);
            $phpContent = $this->generatePluginClass($className, $identifier, $template);
            file_put_contents($pluginPath . '/' . $className . '.php', $phpContent);

            // Create directories and files based on template
            if ($template === 'fresh') {
                // Fresh template: Create all directories with .gitkeep files
                foreach ($this->directories as $dir) {
                    $dirPath = $pluginPath . '/' . $dir;
                    if (!is_dir($dirPath)) {
                        mkdir($dirPath, 0755, true);
                        file_put_contents($dirPath . '/.gitkeep', '');
                    }
                }
                // Also create Frontend/Components directory for frontend components
                $frontendComponentsPath = $pluginPath . '/Frontend/Components';
                if (!is_dir($frontendComponentsPath)) {
                    mkdir($frontendComponentsPath, 0755, true);
                    file_put_contents($frontendComponentsPath . '/.gitkeep', '');
                }
                // Create Routes directory (auto-registered)
                $routesPath = $pluginPath . '/Routes';
                if (!is_dir($routesPath)) {
                    mkdir($routesPath, 0755, true);
                    file_put_contents($routesPath . '/.gitkeep', '');
                }
                // Create Controllers directory (auto-registered)
                $controllersPath = $pluginPath . '/Controllers';
                if (!is_dir($controllersPath)) {
                    mkdir($controllersPath, 0755, true);
                    file_put_contents($controllersPath . '/.gitkeep', '');
                }
                // Create Chat directory for database models
                $chatPath = $pluginPath . '/Chat';
                if (!is_dir($chatPath)) {
                    mkdir($chatPath, 0755, true);
                    file_put_contents($chatPath . '/.gitkeep', '');
                }
                // Create Events/App directory
                $eventsAppPath = $pluginPath . '/Events/App';
                if (!is_dir($eventsAppPath)) {
                    mkdir($eventsAppPath, 0755, true);
                    file_put_contents($eventsAppPath . '/.gitkeep', '');
                }
                // Create minimal files
                $this->createFreshTemplate($pluginPath, $identifier, $className);
            } elseif ($template === 'starter') {
                // Starter template: Only create directories that will be used by example files
                // Don't create empty directories, let createExampleFiles create them as needed
                $this->createExampleFiles($pluginPath, $identifier, $className);
            }
            // Empty template: no directories created, no example files, just conf.yml and main class

            // Create public assets symlink (like PluginsController does)
            $this->createPublicAssetsSymlink($pluginPath, $identifier);
            $this->createComponentsSymlink($pluginPath, $identifier);

            // Run migrations (like PluginsController does)
            $migrationResult = $this->runAddonMigrations($identifier, $pluginPath);

            // Call plugin install hook if present (like PluginsController does)
            $this->callPluginInstallHook($pluginPath, $identifier, $className);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    PluginManagerEvent::onPluginCreated(),
                    [
                        'identifier' => $identifier,
                        'plugin_data' => $data,
                        'created_by' => $request->get('user'),
                    ]
                );
            }

            return ApiResponse::success([
                'identifier' => $identifier,
                'path' => $pluginPath,
                'files_created' => $this->getPluginFiles($identifier),
                'migration_result' => $migrationResult,
            ], 'Plugin created successfully', 201);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to create plugin: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Put(
        path: '/api/admin/plugin-manager/{identifier}',
        summary: 'Update plugin configuration',
        description: 'Update an existing plugin\'s configuration including metadata, dependencies, and configuration schema. Only available in developer mode.',
        tags: ['Admin - Plugin Manager'],
        parameters: [
            new OA\Parameter(
                name: 'identifier',
                in: 'path',
                description: 'Plugin identifier',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/PluginUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Plugin updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'identifier', type: 'string', description: 'Plugin identifier'),
                        new OA\Property(property: 'config', ref: '#/components/schemas/Plugin'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid plugin identifier, invalid configuration, or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled or insufficient permissions'),
            new OA\Response(response: 404, description: 'Plugin not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update plugin'),
        ]
    )]
    public function updatePlugin(Request $request): Response
    {
        try {
            $config = App::getInstance(true)->getConfig();
            if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
                return ApiResponse::error('You are not allowed to update plugins in non-developer mode', 403);
            }
            $identifier = $request->attributes->get('identifier');
            $data = json_decode($request->getContent(), true);

            if (empty($identifier)) {
                return ApiResponse::error('Plugin identifier is required', 400);
            }

            $pluginPath = $this->pluginsDir . '/' . $identifier;
            if (!is_dir($pluginPath)) {
                return ApiResponse::error('Plugin not found', 404);
            }

            $configPath = $pluginPath . '/conf.yml';
            if (!file_exists($configPath)) {
                return ApiResponse::error('Plugin configuration not found', 404);
            }

            // Load existing config
            $existingConfig = PluginHelper::getPluginConfig($identifier);
            if (empty($existingConfig)) {
                return ApiResponse::error('Invalid plugin configuration', 400);
            }

            $pluginConfig = $existingConfig['plugin'];

            // Update config with provided data (identifier cannot be changed)
            if (isset($data['name'])) {
                $pluginConfig['name'] = $data['name'];
            }
            if (isset($data['description'])) {
                $pluginConfig['description'] = $data['description'];
            }
            if (isset($data['version'])) {
                $pluginConfig['version'] = $data['version'];
            }
            if (isset($data['target'])) {
                $pluginConfig['target'] = $data['target'];
            }
            if (isset($data['author'])) {
                $pluginConfig['author'] = is_array($data['author']) ? $data['author'] : [$data['author']];
            }
            if (isset($data['flags'])) {
                $pluginConfig['flags'] = $data['flags'];
            }
            if (isset($data['dependencies'])) {
                $pluginConfig['dependencies'] = $data['dependencies'];
            }
            if (isset($data['requiredConfigs'])) {
                $pluginConfig['requiredConfigs'] = $data['requiredConfigs'];
            }

            // Prepare the complete config structure
            $newConfig = ['plugin' => $pluginConfig];
            if (isset($data['configSchema'])) {
                // Use the provided config schema from the developer
                $newConfig['config'] = array_values($data['configSchema']);
            } elseif (isset($data['requiredConfigs'])) {
                // Fallback to auto-generated schema
                $newConfig['config'] = array_values($this->generateEnhancedConfigSchema($data['requiredConfigs']));
            }

            // Validate updated config
            if (!PluginConfig::isConfigValid($newConfig)) {
                return ApiResponse::error('Invalid plugin configuration', 400);
            }

            // Save updated config
            $yamlContent = Yaml::dump($newConfig, 4, 2);
            file_put_contents($configPath, $yamlContent);

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    PluginManagerEvent::onPluginUpdated(),
                    [
                        'identifier' => $identifier,
                        'updated_data' => $data,
                        'updated_by' => $request->get('user'),
                    ]
                );
            }

            return ApiResponse::success([
                'identifier' => $identifier,
                'config' => $pluginConfig,
            ], 'Plugin updated successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to update plugin: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/plugin-manager/{identifier}',
        summary: 'Get plugin details',
        description: 'Retrieve detailed information about a specific plugin including configuration, status, dependencies, settings, and files. Only available in developer mode.',
        tags: ['Admin - Plugin Manager'],
        parameters: [
            new OA\Parameter(
                name: 'identifier',
                in: 'path',
                description: 'Plugin identifier',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Plugin details retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/Plugin')
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid plugin identifier'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled or insufficient permissions'),
            new OA\Response(response: 404, description: 'Plugin not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to fetch plugin details'),
        ]
    )]
    public function getPluginDetails(Request $request): Response
    {
        try {
            $config = App::getInstance(true)->getConfig();
            if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
                return ApiResponse::error('You are not allowed to get plugin details in non-developer mode', 403);
            }
            $identifier = $request->attributes->get('identifier');

            if (empty($identifier)) {
                return ApiResponse::error('Plugin identifier is required', 400);
            }

            $config = PluginHelper::getPluginConfig($identifier);
            if (empty($config)) {
                return ApiResponse::error('Plugin not found', 404);
            }

            $plugin = $config['plugin'];
            $plugin['identifier'] = $identifier;
            $plugin['status'] = $this->getPluginStatus($identifier);
            $plugin['dependencies_met'] = PluginDependencies::checkDependencies($config);
            $plugin['required_configs_set'] = PluginRequiredConfigs::areRequiredConfigsSet($identifier);
            $plugin['settings'] = PluginSettings::getSettings($identifier);
            $plugin['files'] = $this->getPluginFiles($identifier);
            $plugin['available_flags'] = PluginFlags::getFlags();

            // Include the config schema from conf.yml
            $plugin['config'] = $config['config'] ?? [];

            return ApiResponse::success($plugin, 'Plugin details fetched successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to fetch plugin details: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Patch(
        path: '/api/admin/plugin-manager/{identifier}/settings',
        summary: 'Update plugin settings',
        description: 'Update plugin-specific settings by providing key-value pairs. Only available in developer mode.',
        tags: ['Admin - Plugin Manager'],
        parameters: [
            new OA\Parameter(
                name: 'identifier',
                in: 'path',
                description: 'Plugin identifier',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/PluginSettingsUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Plugin settings updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'identifier', type: 'string', description: 'Plugin identifier'),
                        new OA\Property(property: 'updated_settings', type: 'array', items: new OA\Items(type: 'string'), description: 'List of updated setting keys'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid plugin identifier or missing settings data'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled or insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update plugin settings'),
        ]
    )]
    public function updatePluginSettings(Request $request): Response
    {
        try {
            $config = App::getInstance(true)->getConfig();
            if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
                return ApiResponse::error('You are not allowed to update plugin settings in non-developer mode', 403);
            }
            $identifier = $request->attributes->get('identifier');
            $data = json_decode($request->getContent(), true);

            if (empty($identifier)) {
                return ApiResponse::error('Plugin identifier is required', 400);
            }

            if (!isset($data['settings']) || !is_array($data['settings'])) {
                return ApiResponse::error('Settings data is required', 400);
            }

            // Update each setting
            foreach ($data['settings'] as $key => $value) {
                PluginSettings::setSetting($identifier, $key, $value);
            }

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    PluginManagerEvent::onPluginSettingsUpdated(),
                    [
                        'identifier' => $identifier,
                        'settings' => $data['settings'],
                        'updated_by' => $request->get('user'),
                    ]
                );
            }

            return ApiResponse::success([
                'identifier' => $identifier,
                'updated_settings' => array_keys($data['settings']),
            ], 'Plugin settings updated successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to update plugin settings: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/plugin-manager/flags',
        summary: 'Get available plugin flags',
        description: 'Retrieve a list of all available plugin flags that can be used when creating or updating plugins.',
        tags: ['Admin - Plugin Manager'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Available flags retrieved successfully',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(type: 'string')
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to fetch flags'),
        ]
    )]
    public function getAvailableFlags(Request $request): Response
    {
        try {
            $flags = PluginFlags::getFlags();

            return ApiResponse::success($flags, 'Available flags fetched successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to fetch flags: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/plugin-manager/{identifier}/validate',
        summary: 'Validate plugin',
        description: 'Validate a plugin\'s configuration, dependencies, required configs, identifier, flags, and file structure. Only available in developer mode.',
        tags: ['Admin - Plugin Manager'],
        parameters: [
            new OA\Parameter(
                name: 'identifier',
                in: 'path',
                description: 'Plugin identifier',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Plugin validation completed',
                content: new OA\JsonContent(ref: '#/components/schemas/PluginValidation')
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid plugin identifier'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled or insufficient permissions'),
            new OA\Response(response: 404, description: 'Plugin not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to validate plugin'),
        ]
    )]
    public function validatePlugin(Request $request): Response
    {
        try {
            $config = App::getInstance(true)->getConfig();
            if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
                return ApiResponse::error('You are not allowed to get available flags in non-developer mode', 403);
            }
            $identifier = $request->attributes->get('identifier');

            if (empty($identifier)) {
                return ApiResponse::error('Plugin identifier is required', 400);
            }

            $config = PluginHelper::getPluginConfig($identifier);
            if (empty($config)) {
                return ApiResponse::error('Plugin not found', 404);
            }

            $validation = [
                'config_valid' => PluginConfig::isConfigValid($config),
                'dependencies_met' => PluginDependencies::checkDependencies($config),
                'required_configs_set' => PluginRequiredConfigs::areRequiredConfigsSet($identifier),
                'identifier_valid' => PluginConfig::isValidIdentifier($identifier),
                'flags_valid' => PluginFlags::validFlags($config['plugin']['flags'] ?? []),
                'files_exist' => $this->validatePluginFiles($identifier),
            ];

            $validation['overall_valid'] = !in_array(false, $validation);

            return ApiResponse::success($validation, 'Plugin validation completed', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to validate plugin: ' . $e->getMessage(), 500);
        }
    }

    // ===== DEV TOOLS FUNCTIONALITY =====

    #[OA\Post(
        path: '/api/admin/plugin-tools/create-file',
        summary: 'Create plugin file',
        description: 'Create various types of plugin files including migrations, cron jobs, CLI commands, or upload public files. Only available in developer mode.',
        tags: ['Admin - Plugin Manager - Dev Tools'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(ref: '#/components/schemas/PluginFileCreate')
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Plugin file created successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', description: 'Whether the operation was successful'),
                        new OA\Property(property: 'filename', type: 'string', description: 'Created file name'),
                        new OA\Property(property: 'filepath', type: 'string', description: 'Full file path'),
                        new OA\Property(property: 'type', type: 'string', description: 'File type created'),
                        new OA\Property(property: 'original_name', type: 'string', description: 'Original file name (for uploads)'),
                        new OA\Property(property: 'size', type: 'integer', description: 'File size in bytes'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing required fields, invalid file type, or validation errors'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled or insufficient permissions'),
            new OA\Response(response: 404, description: 'Plugin not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create plugin file'),
        ]
    )]
    public function createPluginFile(Request $request): Response
    {
        try {
            $config = App::getInstance(true)->getConfig();
            if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
                return ApiResponse::error('You are not allowed to create plugin files in non-developer mode', 403);
            }

            $pluginId = trim($request->request->get('plugin_id', ''));
            $fileType = trim($request->request->get('file_type', ''));
            $name = trim($request->request->get('name', ''));
            $description = trim($request->request->get('description', ''));
            $schedule = trim($request->request->get('schedule', '1H'));

            if (empty($pluginId) || empty($fileType)) {
                return ApiResponse::error('Plugin ID and file type are required', 400);
            }

            // For file uploads, name is not required as it comes from the uploaded file
            if ($fileType !== 'public_file' && empty($name)) {
                return ApiResponse::error('Name is required for this file type', 400);
            }

            // Verify plugin exists
            $pluginPath = $this->pluginsDir . '/' . $pluginId;
            if (!is_dir($pluginPath)) {
                return ApiResponse::error('Plugin not found', 404);
            }

            $pluginConfig = PluginHelper::getPluginConfig($pluginId);
            if (empty($pluginConfig)) {
                return ApiResponse::error('Plugin configuration not found', 404);
            }

            $className = $this->toCamelCase($pluginConfig['plugin']['name']);

            // Sanitize name
            $sanitizedName = preg_replace('/[^a-zA-Z0-9_-]/', '-', $name);
            $sanitizedName = strtolower($sanitizedName);

            $result = [];

            switch ($fileType) {
                case 'migration':
                    $result = $this->createPluginMigration($pluginPath, $pluginId, $sanitizedName, $description);
                    break;
                case 'cron':
                    $result = $this->createPluginCron($pluginPath, $pluginId, $className, $name, $description, $schedule);
                    break;
                case 'command':
                    $result = $this->createPluginCommand($pluginPath, $pluginId, $className, $name, $description);
                    break;
                case 'public_file':
                    $result = $this->handlePluginPublicFileUpload($request, $pluginPath, $pluginId);
                    break;
                default:
                    return ApiResponse::error('Unsupported file type', 400);
            }

            if ($result['success']) {
                // Emit event
                global $eventManager;
                if (isset($eventManager) && $eventManager !== null) {
                    $eventManager->emit(
                        PluginManagerEvent::onPluginFileCreated(),
                        [
                            'identifier' => $pluginId,
                            'file_type' => $fileType,
                            'file_data' => $result,
                            'created_by' => $request->get('user'),
                        ]
                    );
                }

                return ApiResponse::success($result, ucfirst($fileType) . ' created successfully');
            }

            return ApiResponse::error($result['message'], 500);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to create plugin file: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/plugin-tools/creation-options',
        summary: 'Get plugin creation options',
        description: 'Retrieve available options for creating different types of plugin files including field definitions and validation rules. Only available in developer mode.',
        tags: ['Admin - Plugin Manager - Dev Tools'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Plugin creation options retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/PluginCreationOptions')
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled or insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to get creation options'),
        ]
    )]
    public function getPluginCreationOptions(Request $request): Response
    {
        try {
            $config = App::getInstance(true)->getConfig();
            if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
                return ApiResponse::error('You are not allowed to access dev tools in non-developer mode', 403);
            }

            $options = [
                'migration' => [
                    'name' => 'Database Migration',
                    'description' => 'Create a plugin-specific database migration',
                    'icon' => 'database',
                    'fields' => [
                        'name' => [
                            'label' => 'Migration Name',
                            'type' => 'text',
                            'required' => true,
                            'placeholder' => 'e.g., user-data-table',
                        ],
                        'description' => [
                            'label' => 'Description',
                            'type' => 'textarea',
                            'required' => false,
                            'placeholder' => 'What does this migration do?',
                        ],
                    ],
                ],
                'cron' => [
                    'name' => 'Cron Job',
                    'description' => 'Create a scheduled task for this plugin',
                    'icon' => 'clock',
                    'fields' => [
                        'name' => [
                            'label' => 'Cron Name',
                            'type' => 'text',
                            'required' => true,
                            'placeholder' => 'e.g., daily-cleanup',
                        ],
                        'description' => [
                            'label' => 'Description',
                            'type' => 'textarea',
                            'required' => false,
                            'placeholder' => 'What does this cron job do?',
                        ],
                        'schedule' => [
                            'label' => 'Schedule',
                            'type' => 'text',
                            'required' => true,
                            'placeholder' => '1H (1m=minute, 1H=hour, 1D=day)',
                            'default' => '1H',
                        ],
                    ],
                ],
                'command' => [
                    'name' => 'CLI Command',
                    'description' => 'Create a CLI command for this plugin',
                    'icon' => 'terminal',
                    'fields' => [
                        'name' => [
                            'label' => 'Command Name',
                            'type' => 'text',
                            'required' => true,
                            'placeholder' => 'e.g., process-data',
                        ],
                        'description' => [
                            'label' => 'Description',
                            'type' => 'textarea',
                            'required' => false,
                            'placeholder' => 'What does this command do?',
                        ],
                    ],
                ],
                'public_file' => [
                    'name' => 'Upload Public File',
                    'description' => 'Upload a file to the plugin\'s public directory',
                    'icon' => 'upload',
                    'fields' => [
                        'file' => [
                            'label' => 'File to Upload',
                            'type' => 'file',
                            'required' => true,
                            'placeholder' => 'Select file to upload',
                        ],
                    ],
                ],
            ];

            return ApiResponse::success($options, 'Plugin creation options retrieved successfully');
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to get creation options: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/plugin-manager/{identifier}/widgets',
        summary: 'Get plugin widgets',
        description: 'Retrieve all widgets configured for a specific plugin. Only available in developer mode.',
        tags: ['Admin - Plugin Manager'],
        parameters: [
            new OA\Parameter(
                name: 'identifier',
                in: 'path',
                description: 'Plugin identifier',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Widgets retrieved successfully',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: '#/components/schemas/PluginWidget')
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid plugin identifier'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled or insufficient permissions'),
            new OA\Response(response: 404, description: 'Plugin not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to fetch widgets'),
        ]
    )]
    public function getPluginWidgets(Request $request): Response
    {
        try {
            $config = App::getInstance(true)->getConfig();
            if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
                return ApiResponse::error('You are not allowed to get plugin widgets in non-developer mode', 403);
            }

            $identifier = $request->attributes->get('identifier');

            if (empty($identifier)) {
                return ApiResponse::error('Plugin identifier is required', 400);
            }

            $pluginPath = $this->pluginsDir . '/' . $identifier;
            if (!is_dir($pluginPath)) {
                return ApiResponse::error('Plugin not found', 404);
            }

            $widgetsJsonPath = $pluginPath . '/Frontend/widgets.json';
            $widgets = [];

            if (file_exists($widgetsJsonPath)) {
                $widgets = json_decode(file_get_contents($widgetsJsonPath), true);
                if (!is_array($widgets)) {
                    $widgets = [];
                }
            }

            return ApiResponse::success($widgets, 'Widgets fetched successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to fetch widgets: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Put(
        path: '/api/admin/plugin-manager/{identifier}/widgets',
        summary: 'Update plugin widgets',
        description: 'Update the widgets configuration for a plugin. Replaces the entire widgets.json file. Only available in developer mode.',
        tags: ['Admin - Plugin Manager'],
        parameters: [
            new OA\Parameter(
                name: 'identifier',
                in: 'path',
                description: 'Plugin identifier',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                type: 'array',
                items: new OA\Items(ref: '#/components/schemas/PluginWidget')
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Widgets updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'identifier', type: 'string', description: 'Plugin identifier'),
                        new OA\Property(property: 'widgets', type: 'array', items: new OA\Items(ref: '#/components/schemas/PluginWidget'), description: 'Updated widgets'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid widget configuration'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled or insufficient permissions'),
            new OA\Response(response: 404, description: 'Plugin not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update widgets'),
        ]
    )]
    public function updatePluginWidgets(Request $request): Response
    {
        try {
            $config = App::getInstance(true)->getConfig();
            if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
                return ApiResponse::error('You are not allowed to update plugin widgets in non-developer mode', 403);
            }

            $identifier = $request->attributes->get('identifier');
            $data = json_decode($request->getContent(), true);

            if (empty($identifier)) {
                return ApiResponse::error('Plugin identifier is required', 400);
            }

            if (!is_array($data)) {
                return ApiResponse::error('Widgets must be an array', 400);
            }

            $pluginPath = $this->pluginsDir . '/' . $identifier;
            if (!is_dir($pluginPath)) {
                return ApiResponse::error('Plugin not found', 404);
            }

            // Validate widgets
            foreach ($data as $widget) {
                if (!isset($widget['id']) || !isset($widget['component']) || !isset($widget['page']) || !isset($widget['location'])) {
                    return ApiResponse::error('Invalid widget configuration: id, component, page, and location are required', 400);
                }

                // Check if component file exists
                $componentPath = $pluginPath . '/Frontend/Components/' . $widget['component'];
                if (!file_exists($componentPath)) {
                    return ApiResponse::error('Widget component file not found: ' . $widget['component'], 400);
                }
            }

            // Ensure Frontend directory exists
            $frontendDir = $pluginPath . '/Frontend';
            if (!is_dir($frontendDir)) {
                mkdir($frontendDir, 0755, true);
            }

            // Save widgets.json
            $widgetsJsonPath = $frontendDir . '/widgets.json';
            $jsonContent = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            if (file_put_contents($widgetsJsonPath, $jsonContent) === false) {
                return ApiResponse::error('Failed to save widgets.json', 500);
            }

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    PluginManagerEvent::onPluginFileCreated(),
                    [
                        'identifier' => $identifier,
                        'file_type' => 'widget_config',
                        'file_data' => ['widgets' => $data],
                        'created_by' => $request->get('user'),
                    ]
                );
            }

            return ApiResponse::success([
                'identifier' => $identifier,
                'widgets' => $data,
            ], 'Widgets updated successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to update widgets: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Delete(
        path: '/api/admin/plugin-manager/{identifier}/widgets/{widget_id}',
        summary: 'Delete plugin widget',
        description: 'Delete a specific widget from a plugin. Removes the widget from widgets.json and optionally deletes the component file. Only available in developer mode.',
        tags: ['Admin - Plugin Manager'],
        parameters: [
            new OA\Parameter(
                name: 'identifier',
                in: 'path',
                description: 'Plugin identifier',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'widget_id',
                in: 'path',
                description: 'Widget identifier',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Widget deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'identifier', type: 'string', description: 'Plugin identifier'),
                        new OA\Property(property: 'widget_id', type: 'string', description: 'Deleted widget ID'),
                        new OA\Property(property: 'component_deleted', type: 'boolean', description: 'Whether component file was deleted'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid widget identifier'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Developer mode not enabled or insufficient permissions'),
            new OA\Response(response: 404, description: 'Plugin or widget not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete widget'),
        ]
    )]
    public function deletePluginWidget(Request $request): Response
    {
        try {
            $config = App::getInstance(true)->getConfig();
            if ($config->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false') === 'false') {
                return ApiResponse::error('You are not allowed to delete plugin widgets in non-developer mode', 403);
            }

            $identifier = $request->attributes->get('identifier');
            $widgetId = $request->attributes->get('widget_id');

            if (empty($identifier) || empty($widgetId)) {
                return ApiResponse::error('Plugin identifier and widget ID are required', 400);
            }

            $pluginPath = $this->pluginsDir . '/' . $identifier;
            if (!is_dir($pluginPath)) {
                return ApiResponse::error('Plugin not found', 404);
            }

            $widgetsJsonPath = $pluginPath . '/Frontend/widgets.json';
            if (!file_exists($widgetsJsonPath)) {
                return ApiResponse::error('Widgets configuration not found', 404);
            }

            $widgets = json_decode(file_get_contents($widgetsJsonPath), true);
            if (!is_array($widgets)) {
                return ApiResponse::error('Invalid widgets configuration', 400);
            }

            // Find and remove widget
            $widgetToDelete = null;
            $updatedWidgets = [];
            foreach ($widgets as $widget) {
                if (isset($widget['id']) && $widget['id'] === $widgetId) {
                    $widgetToDelete = $widget;
                } else {
                    $updatedWidgets[] = $widget;
                }
            }

            if ($widgetToDelete === null) {
                return ApiResponse::error('Widget not found', 404);
            }

            // Save updated widgets.json
            $jsonContent = json_encode($updatedWidgets, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
            if (file_put_contents($widgetsJsonPath, $jsonContent) === false) {
                return ApiResponse::error('Failed to update widgets.json', 500);
            }

            // Optionally delete component file
            $componentDeleted = false;
            if (isset($widgetToDelete['component'])) {
                $componentPath = $pluginPath . '/Frontend/Components/' . $widgetToDelete['component'];
                if (file_exists($componentPath)) {
                    $componentDeleted = @unlink($componentPath);
                }
            }

            // Emit event
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    PluginManagerEvent::onPluginFileCreated(),
                    [
                        'identifier' => $identifier,
                        'file_type' => 'widget_deleted',
                        'file_data' => ['widget_id' => $widgetId],
                        'created_by' => $request->get('user'),
                    ]
                );
            }

            return ApiResponse::success([
                'identifier' => $identifier,
                'widget_id' => $widgetId,
                'component_deleted' => $componentDeleted,
            ], 'Widget deleted successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to delete widget: ' . $e->getMessage(), 500);
        }
    }

    private function getPluginStatus(string $identifier): string
    {
        // This would check if the plugin is enabled/disabled in the database
        // For now, we'll just return 'installed' if the plugin exists
        return 'installed';
    }

    private function getPluginFiles(string $identifier): array
    {
        $pluginPath = $this->pluginsDir . '/' . $identifier;
        if (!is_dir($pluginPath)) {
            return [];
        }

        $files = [];
        $iterator = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($pluginPath));

        foreach ($iterator as $file) {
            if ($file->isFile()) {
                $relativePath = str_replace($pluginPath . '/', '', $file->getPathname());
                $files[] = [
                    'name' => $file->getFilename(),
                    'path' => $relativePath,
                    'size' => $file->getSize(),
                    'modified' => date('Y-m-d H:i:s', $file->getMTime()),
                    'type' => $this->getFileType($file->getExtension()),
                ];
            }
        }

        return $files;
    }

    private function getFileType(string $extension): string
    {
        return match (strtolower($extension)) {
            'php' => 'PHP Class',
            'yml', 'yaml' => 'Configuration',
            'js' => 'JavaScript',
            'css' => 'Stylesheet',
            'sql' => 'Migration',
            'json' => 'Data',
            'md' => 'Documentation',
            'txt' => 'Text',
            'gitkeep' => 'Directory Marker',
            default => 'Other',
        };
    }

    private function toCamelCase(string $string): string
    {
        // Remove all non-alphanumeric characters except spaces, hyphens, and underscores
        $sanitized = preg_replace('/[^a-zA-Z0-9\s\-_]/', '', $string);

        // Convert to camel case
        $camelCase = str_replace(' ', '', ucwords(str_replace(['-', '_'], ' ', $sanitized)));

        // Ensure class name doesn't start with a number
        if (preg_match('/^[0-9]/', $camelCase)) {
            $camelCase = 'Plugin' . $camelCase;
        }

        // Fallback if name becomes empty
        if (empty($camelCase)) {
            $camelCase = 'Plugin';
        }

        return $camelCase;
    }

    private function generateEnhancedConfigSchema(array $requiredConfigs): array
    {
        $schema = [];

        foreach ($requiredConfigs as $configKey) {
            $schema[] = [
                'name' => $configKey,
                'display_name' => $this->formatDisplayName($configKey),
                'type' => $this->guessConfigType($configKey),
                'description' => $this->generateConfigDescription($configKey),
                'required' => true,
                'validation' => $this->generateValidationRules($configKey),
                'default' => $this->generateDefaultValue($configKey),
            ];
        }

        return $schema;
    }

    private function formatDisplayName(string $configKey): string
    {
        // Convert snake_case to Title Case
        $displayName = str_replace('_', ' ', $configKey);
        $displayName = str_replace('-', ' ', $displayName);

        return ucwords($displayName);
    }

    private function guessConfigType(string $configKey): string
    {
        $lowerKey = strtolower($configKey);

        // Common patterns for different types
        if (strpos($lowerKey, 'url') !== false || strpos($lowerKey, 'endpoint') !== false) {
            return 'url';
        }
        if (strpos($lowerKey, 'email') !== false) {
            return 'email';
        }
        if (strpos($lowerKey, 'key') !== false || strpos($lowerKey, 'token') !== false || strpos($lowerKey, 'secret') !== false) {
            return 'password';
        }
        if (strpos($lowerKey, 'port') !== false || strpos($lowerKey, 'timeout') !== false || strpos($lowerKey, 'count') !== false) {
            return 'number';
        }
        if (strpos($lowerKey, 'enabled') !== false || strpos($lowerKey, 'active') !== false) {
            return 'boolean';
        }

        return 'text';
    }

    private function generateConfigDescription(string $configKey): string
    {
        $lowerKey = strtolower($configKey);
        $displayKey = str_replace('_', ' ', $configKey);

        if (strpos($lowerKey, 'api_key') !== false || strpos($lowerKey, 'apikey') !== false) {
            return 'Your secure API authentication key for external services. Keep this secure!';
        }
        if (strpos($lowerKey, 'webhook') !== false) {
            return 'The URL where important notifications from this plugin will be sent (must be HTTPS).';
        }
        if (strpos($lowerKey, 'database') !== false || strpos($lowerKey, 'db') !== false) {
            return 'The hostname or IP address of the database server this plugin connects to.';
        }
        if (strpos($lowerKey, 'retries') !== false || strpos($lowerKey, 'attempts') !== false) {
            return 'The maximum number of times the plugin will retry a failed operation (e.g., API calls).';
        }
        if (strpos($lowerKey, 'logging') !== false || strpos($lowerKey, 'enable') !== false) {
            return 'Whether to enable detailed logging for debugging and monitoring.';
        }
        if (strpos($lowerKey, 'email') !== false) {
            return 'Email address for receiving critical alerts and reports from the plugin.';
        }
        if (strpos($lowerKey, 'ttl') !== false || strpos($lowerKey, 'cache') !== false) {
            return 'Time-to-live for cached data in seconds.';
        }
        if (strpos($lowerKey, 'debug') !== false) {
            return 'Enable debug mode for detailed error reporting and development.';
        }
        if (strpos($lowerKey, 'rate') !== false || strpos($lowerKey, 'limit') !== false) {
            return 'Maximum number of requests allowed per minute.';
        }
        if (strpos($lowerKey, 'port') !== false) {
            return 'The port number used by the plugin\'s internal server (if applicable).';
        }
        if (strpos($lowerKey, 'key') !== false || strpos($lowerKey, 'token') !== false || strpos($lowerKey, 'secret') !== false) {
            return 'API key or authentication token for external services.';
        }

        return 'Configuration value for ' . $displayKey;
    }

    private function generateValidationRules(string $configKey): array
    {
        $rules = [];
        $lowerKey = strtolower($configKey);

        if (strpos($lowerKey, 'url') !== false || strpos($lowerKey, 'endpoint') !== false) {
            $rules['regex'] = '/^https:\/\/.+/';
            $rules['message'] = 'Must be a valid HTTPS URL for security';
        }
        if (strpos($lowerKey, 'email') !== false) {
            $rules['regex'] = '/^[^\s@]+@[^\s@]+\.[^\s@]+$/';
            $rules['message'] = 'Must be a valid email address';
        }
        if (strpos($lowerKey, 'key') !== false || strpos($lowerKey, 'token') !== false || strpos($lowerKey, 'secret') !== false) {
            $rules['regex'] = '/^[a-zA-Z0-9]{32,64}$/';
            $rules['message'] = 'API key must be between 32 and 64 alphanumeric characters';
        }
        if (strpos($lowerKey, 'port') !== false) {
            $rules['min'] = 1024;
            $rules['max'] = 65535;
            $rules['message'] = 'Port must be between 1024 and 65535';
        }
        if (strpos($lowerKey, 'retries') !== false || strpos($lowerKey, 'attempts') !== false) {
            $rules['min'] = 1;
            $rules['max'] = 10;
            $rules['message'] = 'Must be between 1 and 10 retry attempts';
        }
        if (strpos($lowerKey, 'ttl') !== false || strpos($lowerKey, 'cache') !== false) {
            $rules['min'] = 60;
            $rules['max'] = 86400;
            $rules['message'] = 'Cache TTL must be between 60 seconds and 24 hours';
        }
        if (strpos($lowerKey, 'rate') !== false || strpos($lowerKey, 'limit') !== false) {
            $rules['min'] = 10;
            $rules['max'] = 1000;
            $rules['message'] = 'Rate limit must be between 10 and 1000 requests per minute';
        }
        if (strpos($lowerKey, 'host') !== false || strpos($lowerKey, 'database') !== false) {
            $rules['regex'] = '/^[a-zA-Z0-9.-]+$/';
            $rules['message'] = 'Must be a valid hostname or IP address';
        }

        return $rules;
    }

    private function generateDefaultValue(string $configKey): string
    {
        $lowerKey = strtolower($configKey);

        if (strpos($lowerKey, 'port') !== false) {
            return '8080';
        }
        if (strpos($lowerKey, 'retries') !== false || strpos($lowerKey, 'attempts') !== false) {
            return '3';
        }
        if (strpos($lowerKey, 'ttl') !== false || strpos($lowerKey, 'cache') !== false) {
            return '3600';
        }
        if (strpos($lowerKey, 'rate') !== false || strpos($lowerKey, 'limit') !== false) {
            return '100';
        }
        if (strpos($lowerKey, 'host') !== false || strpos($lowerKey, 'database') !== false) {
            return 'localhost';
        }
        if (strpos($lowerKey, 'enabled') !== false || strpos($lowerKey, 'logging') !== false || strpos($lowerKey, 'debug') !== false) {
            return strpos($lowerKey, 'debug') !== false ? 'false' : 'true';
        }
        if (strpos($lowerKey, 'url') !== false) {
            return 'https://example.com/webhook';
        }

        return '';
    }

    private function generatePluginClass(string $className, string $identifier, string $template = 'starter'): string
    {
        // Generate processEvents method based on template
        $processEventsMethod = '';
        $useStatements = 'use App\\Plugins\\AppPlugin;';

        if ($template === 'starter') {
            // Starter template includes full event handling
            $useStatements .= "\nuse App\\Plugins\\Events\\Events\\AppEvent;\nuse App\\Addons\\{$identifier}\\Events\\App\\AppReadyEvent;";
            $processEventsMethod = "    /**
     * @inheritDoc
     */
    public static function processEvents(\\App\\Plugins\\PluginEvents \$event): void
    {
        // Process plugin events here
        // Routes and Controllers are automatically registered from Routes/ and Controllers/ directories
        
        // Example: Listen to router ready event
        \$event->on(AppEvent::onRouterReady(), function (\$router) {
            new AppReadyEvent(['router' => \$router]);
        });
        
        // You can listen to other events here
        // Example: \$event->on('app.boot', function() { ... });
    }";
        } else {
            // Fresh and empty templates have minimal or no event handling
            $processEventsMethod = '    /**
     * @inheritDoc
     */
    public static function processEvents(\\App\\Plugins\\PluginEvents $event): void
    {
        // Process plugin events here
        // Routes and Controllers are automatically registered from Routes/ and Controllers/ directories
        
        // Add your event listeners here as needed
    }';
        }

        return "<?php

namespace App\\Addons\\{$identifier};

{$useStatements}

class {$className} implements AppPlugin
{
{$processEventsMethod}

    /**
     * @inheritDoc
     */
    public static function pluginInstall(): void
    {
        // Plugin installation logic
        // Create tables, directories, etc.
    }

    /**
     * @inheritDoc
     */
    public static function pluginUpdate(?string \$oldVersion, ?string \$newVersion): void
    {
        // Plugin update logic
        // Migrate data, update configurations, etc.
        // \$oldVersion contains the previous version (e.g., '1.0.0')
        // \$newVersion contains the new version being installed (e.g., '1.0.1')
    }

    /**
     * @inheritDoc
     */
    public static function pluginUninstall(): void
    {
        // Plugin uninstallation logic
        // Clean up tables, files, etc.
    }
}";
    }

    private function createExampleFiles(string $pluginPath, string $identifier, string $className): void
    {
        // Create directories only as needed when writing files (not pre-created empty)
        // Create example migrations with proper timestamp naming
        $timestamp = date('Y-m-d-H.i');

        $migrationContent = "-- Example migration for {$identifier} plugin
-- This migration creates a harmless table that doesn't affect the main system

CREATE TABLE
	IF NOT EXISTS `featherpanel_{$identifier}_logs` (
		`id` INT NOT NULL AUTO_INCREMENT,
		`message` TEXT NOT NULL,
		`level` VARCHAR(20) DEFAULT 'info',
		`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		PRIMARY KEY (`id`)
	) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;

-- Insert a harmless example record
INSERT IGNORE INTO `featherpanel_{$identifier}_logs` (`message`, `level`) 
VALUES ('Plugin {$identifier} initialized successfully', 'info');";

        // Create simple cron job example
        $cronContent = "<?php

namespace App\Cron;

use App\Cron\Cron;
use App\Cron\TimeTask;
use App\Chat\TimedTask;

class {$className}CronExample implements TimeTask
{
	public function run()
	{
		\$cron = new Cron('{$identifier}-example', '1H');
		try {
			\$cron->runIfDue(function () {
				// Simple heartbeat - does nothing harmful
				TimedTask::markRun('{$identifier}-example', true, '{$className} plugin heartbeat');
			});
		} catch (\\Exception \$e) {
			\$app = \\App\\App::getInstance(false, true);
			\$app->getLogger()->error('Failed to run {$identifier} cron: ' . \$e->getMessage());
			TimedTask::markRun('{$identifier}-example', false, \$e->getMessage());
		}
	}
}";

        // Complete sidebar configuration showing all plugin capabilities
        $frontendSideBarExample = json_encode([
            'client' => [
                '/overview' => [
                    'name' => "Overview {$className}",
                    'icon' => '📊',
                    'js' => "if (window.{$className}Plugin) { window.{$className}Plugin.showDashboard(); } else { console.log('{$className} plugin not loaded'); }",
                    'description' => "View a summary of your plugin's data",
                    'category' => 'client',
                    'showBadge' => false,
                ],
            ],
            'admin' => [
                '/settings' => [
                    'name' => "Settings {$className}",
                    'icon' => '⚙️',
                    'js' => "if (window.{$className}Plugin) { window.{$className}Plugin.showSettings(); } else { console.log('{$className} plugin not loaded'); }",
                    'description' => 'Configure plugin settings',
                    'category' => 'admin',
                    'permission' => 'admin.plugin.settings',
                ],
            ],
            'server' => [
                '/logsui' => [
                    'name' => "Server Logs {$className}",
                    'icon' => '📝',
                    'redirect' => '/logsui',
                    'component' => 'serverui.html',
                    'description' => 'View server logs related to the plugin',
                    'category' => 'server',
                    'group' => 'Minecraft Java Edition',
                ],
            ],
        ], JSON_PRETTY_PRINT);

        $frontendJsExample = "// ===============================================
// {$className} Plugin - Frontend JavaScript
// ===============================================

console.log('🚀 {$className} Plugin Loading...');

// Wait for FeatherPanel API to be available
function waitForAPI() {
	return new Promise((resolve) => {
		if (window.FeatherPanel && window.FeatherPanel.api) {
			resolve();
		} else {
			// Check every 100ms until API is available
			const check = setInterval(() => {
				if (window.FeatherPanel && window.FeatherPanel.api) {
					clearInterval(check);
					resolve();
				}
			}, 100);
		}
	});
}

// Create modal/overlay system for plugin UI
class {$className}UI {
	constructor() {
		this.modals = new Map();
		this.createStyles();
	}

	createStyles() {
		const style = document.createElement('style');
		style.textContent = `
			.{$className}-overlay {
				position: fixed;
				top: 0;
				left: 0;
				width: 100%;
				height: 100%;
				background: rgba(0, 0, 0, 0.5);
				backdrop-filter: blur(4px);
				z-index: 9999;
				display: flex;
				align-items: center;
				justify-content: center;
				animation: {$className}-fade-in 0.2s ease-out;
			}

			.{$className}-modal {
				background: white;
				border-radius: 12px;
				box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
				max-width: 90vw;
				max-height: 90vh;
				overflow: hidden;
				animation: {$className}-slide-up 0.3s ease-out;
			}

			.{$className}-modal-header {
				padding: 24px 24px 16px 24px;
				border-bottom: 1px solid #e5e7eb;
				display: flex;
				align-items: center;
				justify-content: space-between;
			}

			.{$className}-modal-title {
				font-size: 1.25rem;
				font-weight: 600;
				color: #111827;
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.{$className}-modal-close {
				background: none;
				border: none;
				font-size: 1.5rem;
				cursor: pointer;
				color: #6b7280;
				padding: 4px;
				border-radius: 6px;
				transition: all 0.2s;
			}

			.{$className}-modal-close:hover {
				background: #f3f4f6;
				color: #374151;
			}

			.{$className}-modal-content {
				padding: 24px;
				max-height: 70vh;
				overflow-y: auto;
			}

			.{$className}-card {
				background: #f9fafb;
				border: 1px solid #e5e7eb;
				border-radius: 8px;
				padding: 16px;
				margin-bottom: 16px;
			}

			.{$className}-card h3 {
				margin: 0 0 8px 0;
				font-size: 1rem;
				font-weight: 600;
				color: #111827;
			}

			.{$className}-card p {
				margin: 0;
				color: #6b7280;
				font-size: 0.875rem;
			}

			.{$className}-button {
				background: #3b82f6;
				color: white;
				border: none;
				padding: 8px 16px;
				border-radius: 6px;
				cursor: pointer;
				font-size: 0.875rem;
				font-weight: 500;
				transition: background 0.2s;
			}

			.{$className}-button:hover {
				background: #2563eb;
			}

			.{$className}-button.secondary {
				background: #6b7280;
			}

			.{$className}-button.secondary:hover {
				background: #4b5563;
			}

			.{$className}-status {
				display: inline-block;
				padding: 4px 8px;
				border-radius: 4px;
				font-size: 0.75rem;
				font-weight: 500;
				text-transform: uppercase;
			}

			.{$className}-status.secure {
				background: #d1fae5;
				color: #065f46;
			}

			.{$className}-status.warning {
				background: #fef3c7;
				color: #92400e;
			}

			.{$className}-status.danger {
				background: #fee2e2;
				color: #991b1b;
			}

			.{$className}-grid {
				display: grid;
				grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
				gap: 16px;
			}

			@keyframes {$className}-fade-in {
				from { opacity: 0; }
				to { opacity: 1; }
			}

			@keyframes {$className}-slide-up {
				from { 
					opacity: 0;
					transform: translateY(20px) scale(0.95);
				}
				to { 
					opacity: 1;
					transform: translateY(0) scale(1);
				}
			}

			@media (prefers-color-scheme: dark) {
				.{$className}-modal {
					background: #1f2937;
					color: #f9fafb;
				}
				
				.{$className}-modal-header {
					border-bottom-color: #374151;
				}
				
				.{$className}-modal-title {
					color: #f9fafb;
				}
				
				.{$className}-card {
					background: #111827;
					border-color: #374151;
				}
				
				.{$className}-card h3 {
					color: #f9fafb;
				}
			}
		`;
		document.head.appendChild(style);
	}

	showModal(id, title, content, options = {}) {
		this.closeModal(id); // Close existing modal with same ID

		const overlay = document.createElement('div');
		overlay.className = '{$className}-overlay';
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) {
				this.closeModal(id);
			}
		});

		const modal = document.createElement('div');
		modal.className = '{$className}-modal';
		modal.style.width = options.width || '800px';

		const header = document.createElement('div');
		header.className = '{$className}-modal-header';

		const titleEl = document.createElement('h2');
		titleEl.className = '{$className}-modal-title';
		titleEl.innerHTML = title;

		const closeBtn = document.createElement('button');
		closeBtn.className = '{$className}-modal-close';
		closeBtn.innerHTML = '×';
		closeBtn.addEventListener('click', () => this.closeModal(id));

		header.appendChild(titleEl);
		header.appendChild(closeBtn);

		const contentEl = document.createElement('div');
		contentEl.className = '{$className}-modal-content';
		contentEl.innerHTML = content;

		modal.appendChild(header);
		modal.appendChild(contentEl);
		overlay.appendChild(modal);

		document.body.appendChild(overlay);
		this.modals.set(id, overlay);

		// Handle escape key
		const handleEscape = (e) => {
			if (e.key === 'Escape') {
				this.closeModal(id);
				document.removeEventListener('keydown', handleEscape);
			}
		};
		document.addEventListener('keydown', handleEscape);
	}

	closeModal(id) {
		const modal = this.modals.get(id);
		if (modal) {
			modal.style.animation = '{$className}-fade-in 0.2s ease-out reverse';
			setTimeout(() => {
				if (modal.parentNode) {
					modal.parentNode.removeChild(modal);
				}
				this.modals.delete(id);
			}, 200);
		}
	}

	closeAllModals() {
		for (const [id] of this.modals) {
			this.closeModal(id);
		}
	}
}

// Main {$className} Plugin Class
class {$className}Plugin {
	constructor() {
		this.ui = new {$className}UI();
		this.api = null;
	}

	async init(api) {
		this.api = api;
		console.log('🚀 {$className} Plugin initialized!');
	}

	// Dashboard Methods
	showDashboard() {
		console.log('📊 Opening {$className} Dashboard...');
		const content = `
			<div class=\"{$className}-grid\">
				<div class=\"{$className}-card\">
					<h3>📊 Dashboard Overview</h3>
					<p>Plugin status: <span class=\"{$className}-status secure\">Active</span></p>
					<p>Last update: 2 minutes ago</p>
				</div>
				<div class=\"{$className}-card\">
					<h3>✨ Features</h3>
					<p>Dashboard integration: <strong>Working</strong></p>
					<p>Modal system: <strong>Functional</strong></p>
				</div>
			</div>
			<div style=\"margin-top: 24px; text-align: right;\">
				<button class=\"{$className}-button secondary\" onclick=\"window.{$className}Plugin.ui.closeModal('dashboard')\">Close</button>
				<button class=\"{$className}-button\" onclick=\"window.{$className}Plugin.showAnalytics()\" style=\"margin-left: 8px;\">View Analytics</button>
			</div>
		`;
		this.ui.showModal('dashboard', '📊 {$className} Dashboard', content);
	}

	showAnalytics() {
		console.log('📈 Opening {$className} Analytics...');
		const content = `
			<div class=\"{$className}-card\">
				<h3>📈 Plugin Analytics</h3>
				<p>Total views: <strong>1,234</strong></p>
				<p>Active users: <strong>89</strong></p>
				<p>Success rate: <span class=\"{$className}-status secure\">99.9%</span></p>
			</div>
			<div class=\"{$className}-card\">
				<h3>📊 Performance Metrics</h3>
				<p>Response time: <strong>45ms</strong></p>
				<p>Uptime: <strong>99.9%</strong></p>
				<p>Error rate: <span class=\"{$className}-status secure\">0.1%</span></p>
			</div>
			<div style=\"margin-top: 24px; text-align: right;\">
				<button class=\"{$className}-button secondary\" onclick=\"window.{$className}Plugin.ui.closeModal('analytics')\">Close</button>
			</div>
		`;
		this.ui.showModal('analytics', '📈 {$className} Analytics', content);
	}

	// Admin Methods
	showSettings() {
		console.log('⚙️ Opening {$className} Settings...');
		const content = `
			<div class=\"{$className}-grid\">
				<div class=\"{$className}-card\">
					<h3>⚙️ Plugin Settings</h3>
					<p><label><input type=\"checkbox\" checked> Enable notifications</label></p>
					<p><label><input type=\"checkbox\" checked> Auto-update</label></p>
					<p><label><input type=\"checkbox\"> Debug mode</label></p>
				</div>
				<div class=\"{$className}-card\">
					<h3>🔧 Configuration</h3>
					<p><label><input type=\"checkbox\" checked> Feature A</label></p>
					<p><label><input type=\"checkbox\"> Feature B</label></p>
					<p><label><input type=\"checkbox\" checked> Feature C</label></p>
				</div>
			</div>
			<div style=\"margin-top: 24px; text-align: right;\">
				<button class=\"{$className}-button secondary\" onclick=\"window.{$className}Plugin.ui.closeModal('settings')\">Cancel</button>
				<button class=\"{$className}-button\" style=\"margin-left: 8px;\">Save Settings</button>
			</div>
		`;
		this.ui.showModal('settings', '⚙️ {$className} Settings', content);
	}

	showUserManagement() {
		console.log('👥 Opening {$className} User Management...');
		const content = `
			<div class=\"{$className}-card\">
				<h3>👥 User Management</h3>
				<p>Total users: <strong>156</strong></p>
				<p>Active users: <strong>89</strong></p>
				<p>Admin users: <strong>5</strong></p>
			</div>
			<div class=\"{$className}-card\">
				<h3>📋 Recent Activity</h3>
				<div style=\"margin-top: 16px;\">
					<div style=\"padding: 8px; border-bottom: 1px solid #e5e7eb;\">User 'admin' logged in</div>
					<div style=\"padding: 8px; border-bottom: 1px solid #e5e7eb;\">New user 'john' registered</div>
					<div style=\"padding: 8px;\">User 'jane' updated profile</div>
				</div>
			</div>
			<div style=\"margin-top: 24px; text-align: right;\">
				<button class=\"{$className}-button secondary\" onclick=\"window.{$className}Plugin.ui.closeModal('users')\">Close</button>
				<button class=\"{$className}-button\" style=\"margin-left: 8px;\">Add User</button>
			</div>
		`;
		this.ui.showModal('users', '👥 {$className} User Management', content);
	}

	// Server Methods
	showServerLogs() {
		console.log('📝 Opening {$className} Server Logs...');
		const content = `
			<div class=\"{$className}-card\">
				<h3>📝 Server Logs</h3>
				<div style=\"margin-top: 16px; max-height: 300px; overflow-y: auto; background: #f3f4f6; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 0.875rem;\">
					<div>[2024-01-15 14:30:25] INFO: Plugin {$className} initialized</div>
					<div>[2024-01-15 14:30:26] DEBUG: Loading configuration</div>
					<div>[2024-01-15 14:30:27] INFO: All systems operational</div>
					<div>[2024-01-15 14:31:00] INFO: Background task completed</div>
					<div>[2024-01-15 14:31:30] DEBUG: Cache updated</div>
				</div>
			</div>
			<div style=\"margin-top: 24px; text-align: right;\">
				<button class=\"{$className}-button secondary\" onclick=\"window.{$className}Plugin.ui.closeModal('logs')\">Close</button>
				<button class=\"{$className}-button\" style=\"margin-left: 8px;\">Export Logs</button>
			</div>
		`;
		this.ui.showModal('logs', '📝 {$className} Server Logs', content);
	}

	showScheduledTasks() {
		console.log('⏰ Opening {$className} Scheduled Tasks...');
		const content = `
			<div class=\"{$className}-grid\">
				<div class=\"{$className}-card\">
					<h3>⏰ Active Tasks</h3>
					<p>Daily backup: <span class=\"{$className}-status secure\">Running</span></p>
					<p>Cache cleanup: <span class=\"{$className}-status secure\">Scheduled</span></p>
					<p>Health check: <span class=\"{$className}-status secure\">Active</span></p>
				</div>
				<div class=\"{$className}-card\">
					<h3>📊 Task Statistics</h3>
					<p>Completed today: <strong>12</strong></p>
					<p>Failed today: <strong>0</strong></p>
					<p>Next run: <strong>2 hours</strong></p>
				</div>
			</div>
			<div style=\"margin-top: 24px; text-align: right;\">
				<button class=\"{$className}-button secondary\" onclick=\"window.{$className}Plugin.ui.closeModal('tasks')\">Close</button>
				<button class=\"{$className}-button\" style=\"margin-left: 8px;\">Add Task</button>
			</div>
		`;
		this.ui.showModal('tasks', '⏰ {$className} Scheduled Tasks', content);
	}
}

// Main plugin initialization
async function init{$className}Plugin() {
	await waitForAPI();

	const api = window.FeatherPanel.api;
	const {$className}PluginInstance = new {$className}Plugin();
	await {$className}PluginInstance.init(api);

	// Make plugin globally available
	window.{$className}Plugin = {$className}PluginInstance;

	console.log('🚀 {$className} Plugin API Ready!');
}

// Initialize the plugin
init{$className}Plugin();

console.log('🚀 {$className} Plugin script loaded');";

        $frontendCssExample = "/* ===============================================
{$className} Plugin - Frontend CSS
=============================================== */

.{$className}-container {
	padding: 20px;
	border-radius: 8px;
	background: #f8fafc;
	border: 1px solid #e2e8f0;
}

.{$className}-title {
	color: #1e293b;
	font-size: 1.25rem;
	font-weight: 600;
	margin-bottom: 12px;
}

.{$className}-content {
	color: #64748b;
	line-height: 1.6;
}

.{$className}-button {
	background: #6366f1;
	color: white;
	border: none;
	padding: 8px 16px;
	border-radius: 6px;
	cursor: pointer;
	font-size: 14px;
	transition: background-color 0.2s;
}

.{$className}-button:hover {
	background: #4f46e5;
}";

        $cliCommandExample = "<?php

namespace App\Addons\\{$identifier}\\Commands;

use App\Cli\App;
use App\Cli\CommandBuilder;

class {$className}Command implements CommandBuilder
{
    /**
     * @inheritDoc
     */
    public static function execute(array \$args): void
    {
        \$app = App::getInstance();
        \$app->send(\"&a{$className} plugin command executed successfully!\");
        \$app->send(\"&7This is a simple example command for the {$className} plugin.\");
    }

    /**
     * @inheritDoc
     */
    public static function getDescription(): string
    {
        return \"Execute {$className} plugin functionality via CLI\";
    }

    /**
     * @inheritDoc
     */
    public static function getSubCommands(): array
    {
        return [];
    }
}";

        // Create comprehensive README
        $readmeContent = "# {$className} Plugin

A comprehensive example plugin created with FeatherPanel Plugin Manager that demonstrates all plugin capabilities.

## What it demonstrates
- **Dashboard Integration**: Shows how plugins can add pages to the user dashboard
- **Admin Integration**: Demonstrates admin panel integration with permissions
- **Server Integration**: Shows server-side functionality and monitoring
- **Plugin Widgets**: Embeds custom HTML content into existing FeatherPanel pages
- **Database Migrations**: Creates plugin-specific tables with proper naming
- **Cron Jobs**: Runs scheduled tasks every hour
- **CLI Commands**: Provides command-line interface
- **Frontend Assets**: Includes CSS, JS, sidebar configuration, and widgets

## Files created
- `{$className}.php` - Main plugin class
- `conf.yml` - Plugin configuration with enhanced schema
- `Migrations/{timestamp}-create-{$identifier}-logs.sql` - Database migration with proper naming
- `Cron/{$className}CronExample.php` - Hourly heartbeat cron job
- `Commands/{$className}Command.php` - CLI command
- `Routes/example.php` - Example route file (auto-registered)
- `Controllers/ExampleController.php` - Example controller (auto-registered)
- `Chat/ExampleLog.php` - Example Chat model for database operations
- `Events/App/AppReadyEvent.php` - Example event handler
- `Frontend/index.css` - Plugin styling
- `Frontend/index.js` - Frontend JavaScript with modal system
- `Frontend/sidebar.json` - Sidebar configuration for all sections
- `Frontend/widgets.json` - Widget configuration file (empty by default)
- `Frontend/Components/example-widget.html` - Example widget component

## Sidebar Examples
### Dashboard Section
- **Overview**: Shows plugin data summary
- **Analytics**: Displays charts and statistics

### Admin Section
- **Settings**: Plugin configuration (requires admin.plugin.settings permission)
- **User Management**: Admin user tools (requires admin.plugin.users permission)

### Server Section
- **Server Logs**: View plugin-related logs
- **Scheduled Tasks**: Manage cron jobs and tasks

### Routes & Controllers
- **Routes**: Files in `Routes/` directory are automatically registered
- **Controllers**: Controllers in `Controllers/` directory are automatically registered
- **Chat Models**: Use `Chat/` directory for database operations (like `Chat/ExampleLog.php`)

### Events
- **Event Handlers**: Create event handlers in `Events/App/` directory
- **Event Registration**: Register event listeners in `processEvents()` method
- **Example**: See `Events/App/AppReadyEvent.php` for an example event handler

### Widgets
- **Widget Configuration**: See `Frontend/widgets.json` for widget setup (empty by default)
- **Widget Component**: See `Frontend/Components/example-widget.html` for widget HTML example

## How to use
1. **Routes**: Add route files to `Routes/` directory - they're automatically registered
2. **Controllers**: Add controllers to `Controllers/` directory - they're automatically registered
3. **Database**: Use Chat models in `Chat/` directory for database operations
4. **Dashboard**: Click sidebar buttons in dashboard to see user-facing modals
5. **Admin**: Access admin sections to see admin panel integration
6. **Server**: Check server sections for monitoring and logs
7. **Cron**: The cron job runs automatically every hour
8. **CLI**: Use the command: `php cli.php {$className}`

## Migration Naming
Migrations use timestamp format `YYYY-MM-DD-HH.MM-description.sql` to avoid conflicts with other plugins and the main system.

This is a safe, comprehensive example that demonstrates all FeatherPanel plugin capabilities!";

        $publicFileTemplate = "Hi, 
i am a public file :D 
just make sure to install me via the plugin interface :D
not the plugin manager hence that won't add the symlinks!";

        // Example Route file (auto-registered from Routes/ directory)
        $routeExample = "<?php

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
 * of this software and associated documentation files (the \"Software\"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

use App\App;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\RouteCollection;
use App\Addons\\{$identifier}\\Controllers\\ExampleController;

return function (RouteCollection \$routes): void {
    // Example route - automatically registered
    App::getInstance(true)->registerApiRoute(
        \$routes,
        '{$identifier}-example',
        '/api/addons/{$identifier}/example',
        function (Request \$request) {
            return (new ExampleController())->example(\$request);
        }
    );
};";

        // Example Controller
        $controllerExample = "<?php

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
 * of this software and associated documentation files (the \"Software\"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Addons\\{$identifier}\\Controllers;

use App\Helpers\ApiResponse;
use App\Addons\\{$identifier}\\Chat\\ExampleLog;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ExampleController
{
    /**
     * Example endpoint that demonstrates database operations using Chat models.
     */
    public function example(Request \$request): Response
    {
        try {
            // Example: Get all logs from database using Chat model
            \$logs = ExampleLog::getAll();

            return ApiResponse::success([
                'message' => 'Example endpoint working!',
                'logs_count' => count(\$logs),
                'logs' => \$logs,
            ], 'Example data retrieved successfully', 200);
        } catch (\\Exception \$e) {
            return ApiResponse::error('Failed to retrieve example data: ' . \$e->getMessage(), 500);
        }
    }
}";

        // Example Chat model for database operations
        $chatExample = "<?php

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
 * of this software and associated documentation files (the \"Software\"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Addons\\{$identifier}\\Chat;

use App\App;

class ExampleLog
{
    private static string \$table = 'featherpanel_{$identifier}_logs';

    /**
     * Get all logs.
     *
     * @return array Array of logs
     */
    public static function getAll(): array
    {
        try {
            \$db = App::getInstance(true)->getDatabase()->getPdo();
            \$stmt = \$db->query('SELECT * FROM ' . self::\$table . ' ORDER BY created_at DESC');

            return \$stmt->fetchAll(\\PDO::FETCH_ASSOC);
        } catch (\\Exception \$e) {
            App::getInstance(true)->getLogger()->error('Failed to get logs: ' . \$e->getMessage());

            return [];
        }
    }

    /**
     * Get log by ID.
     *
     * @param int \$id Log ID
     *
     * @return array|null Log data or null if not found
     */
    public static function getById(int \$id): ?array
    {
        try {
            \$db = App::getInstance(true)->getDatabase()->getPdo();
            \$stmt = \$db->prepare('SELECT * FROM ' . self::\$table . ' WHERE id = :id LIMIT 1');
            \$stmt->execute(['id' => \$id]);
            \$result = \$stmt->fetch(\\PDO::FETCH_ASSOC);

            return \$result ?: null;
        } catch (\\Exception \$e) {
            App::getInstance(true)->getLogger()->error('Failed to get log: ' . \$e->getMessage());

            return null;
        }
    }

    /**
     * Create a new log entry.
     *
     * @param string \$message Log message
     * @param string \$level Log level (default: 'info')
     *
     * @return bool Success status
     */
    public static function create(string \$message, string \$level = 'info'): bool
    {
        try {
            \$db = App::getInstance(true)->getDatabase()->getPdo();
            \$stmt = \$db->prepare('INSERT INTO ' . self::\$table . ' (message, level) VALUES (:message, :level)');
            \$stmt->execute([
                'message' => \$message,
                'level' => \$level,
            ]);

            return true;
        } catch (\\Exception \$e) {
            App::getInstance(true)->getLogger()->error('Failed to create log: ' . \$e->getMessage());

            return false;
        }
    }

    /**
     * Delete a log entry.
     *
     * @param int \$id Log ID
     *
     * @return bool Success status
     */
    public static function delete(int \$id): bool
    {
        try {
            \$db = App::getInstance(true)->getDatabase()->getPdo();
            \$stmt = \$db->prepare('DELETE FROM ' . self::\$table . ' WHERE id = :id');
            \$stmt->execute(['id' => \$id]);

            return true;
        } catch (\\Exception \$e) {
            App::getInstance(true)->getLogger()->error('Failed to delete log: ' . \$e->getMessage());

            return false;
        }
    }
}";

        $serverUiHtml = <<<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Hello World yk?</title>
    <style>
        body {
            background: #18181b;
            color: #fafafa;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
        }
        .hello-box {
            background: #27272a;
            border-radius: 1.5rem;
            box-shadow: 0 4px 32px rgba(0,0,0,0.25);
            padding: 3rem 4rem;
            text-align: center;
            border: 1px solid #3f3f46;
        }
        .hello-title {
            font-size: 2.5rem;
            font-weight: 800;
            margin-bottom: 1rem;
            color: #fbbf24;
            letter-spacing: 1px;
        }
        .hello-desc {
            font-size: 1.25rem;
            color: #a1a1aa;
        }
    </style>
</head>
<body>
    <div class="hello-box">
        <div class="hello-title">hello world yk?</div>
        <div class="hello-desc">It's a server ui component!</div>
    </div>
</body>
</html>
HTML;

        // Create example widget
        $widgetHtmlExample = "<!DOCTYPE html>
<html lang=\"en\">
    <head>
        <meta charset=\"UTF-8\" />
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
        <title>{$className} Example Widget</title>
        <style>
            .widget-container {
                background: rgba(18, 19, 21, 0.8);
                border-radius: 0.75rem;
                padding: 1.5rem;
                border: 1px solid rgba(255, 255, 255, 0.07);
                margin-bottom: 1rem;
            }

            .widget-title {
                font-size: 1.125rem;
                font-weight: 600;
                margin-bottom: 0.75rem;
                color: #fafafa;
            }

            .widget-content {
                color: #e5e5e5;
            }

            .widget-stat {
                display: inline-block;
                padding: 0.5rem 1rem;
                background: rgba(59, 130, 246, 0.1);
                border-radius: 0.5rem;
                margin-right: 0.5rem;
                margin-bottom: 0.5rem;
            }
        </style>
    </head>
    <body>
        <div class=\"widget-container\">
            <h3 class=\"widget-title\">🚀 {$className} Plugin Status</h3>
            <div class=\"widget-content\" id=\"widget-content\">
                <div class=\"widget-stat\">Status: Active</div>
                <div class=\"widget-stat\">Version: 1.0.0</div>
                <p style=\"margin-top: 1rem; color: #a1a1aa;\">This is an example widget for the {$className} plugin. You can customize this to display any information you need!</p>
            </div>
        </div>

        <script>
            // Widgets automatically receive context
            const context = window.FeatherPanel?.widgetContext || {};
            const serverUuid = context.serverUuid;
            const userUuid = context.userUuid;

            if (serverUuid) {
                console.log('Widget context - Server UUID:', serverUuid);
            }
            if (userUuid) {
                console.log('Widget context - User UUID:', userUuid);
            }
        </script>
    </body>
</html>";

        $widgetsJsonExample = json_encode([], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        // Example Event handler
        $eventExample = "<?php

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
 * of this software and associated documentation files (the \"Software\"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Addons\\{$identifier}\\Events\\App;

use App\App;

/**
 * Example event handler that listens to AppEvent::onRouterReady().
 * 
 * This demonstrates how to use events in your plugin.
 * Routes and Controllers are automatically registered, so you typically
 * use events for other purposes like logging, initialization, etc.
 */
class AppReadyEvent
{
    /**
     * Constructor called when the router is ready.
     * 
     * @param array \$eventData Event data passed from the event system
     */
    public function __construct(array \$eventData)
    {
        // Access event data
        \$router = \$eventData['router'] ?? null;
        \$logger = App::getInstance(true)->getLogger();

        // Example: Log that the plugin's event handler was triggered
        \$logger->info('{$className} plugin: Router ready event triggered');

        // Example: Perform any initialization that needs to happen after routes are registered
        // Note: Routes and Controllers are auto-registered, so you don't need to register them here
        
        // You can perform other initialization tasks here
        // For example: initialize cache, set up hooks, etc.
    }
}";

        // Helper function to ensure directory exists before writing file
        $ensureDir = function ($filePath) {
            $dir = dirname($filePath);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }
        };

        file_put_contents($pluginPath . '/README.md', $readmeContent);

        // Commands directory
        $commandsFile = $pluginPath . '/Commands/' . $className . 'Command.php';
        $ensureDir($commandsFile);
        file_put_contents($commandsFile, $cliCommandExample);

        // Frontend files
        $frontendCssFile = $pluginPath . '/Frontend/index.css';
        $ensureDir($frontendCssFile);
        file_put_contents($frontendCssFile, $frontendCssExample);

        $frontendJsFile = $pluginPath . '/Frontend/index.js';
        $ensureDir($frontendJsFile);
        file_put_contents($frontendJsFile, $frontendJsExample);

        $frontendSidebarFile = $pluginPath . '/Frontend/sidebar.json';
        $ensureDir($frontendSidebarFile);
        file_put_contents($frontendSidebarFile, $frontendSideBarExample);

        $frontendComponentsPath = $pluginPath . '/Frontend/Components';
        if (!is_dir($frontendComponentsPath)) {
            mkdir($frontendComponentsPath, 0755, true);
        }
        file_put_contents($pluginPath . '/Frontend/Components/serverui.html', $serverUiHtml);
        file_put_contents($pluginPath . '/Frontend/Components/example-widget.html', $widgetHtmlExample);

        $frontendWidgetsFile = $pluginPath . '/Frontend/widgets.json';
        $ensureDir($frontendWidgetsFile);
        file_put_contents($frontendWidgetsFile, $widgetsJsonExample);

        // Migrations directory
        $migrationFile = $pluginPath . '/Migrations/' . $timestamp . '-create-' . $identifier . '-logs.sql';
        $ensureDir($migrationFile);
        file_put_contents($migrationFile, $migrationContent);

        // Cron directory
        $cronFile = $pluginPath . '/Cron/' . $className . 'CronExample.php';
        $ensureDir($cronFile);
        file_put_contents($cronFile, $cronContent);

        // Public directory
        $publicFile = $pluginPath . '/Public/hello.txt';
        $ensureDir($publicFile);
        file_put_contents($publicFile, $publicFileTemplate);

        // Routes directory
        $routesFile = $pluginPath . '/Routes/example.php';
        $ensureDir($routesFile);
        file_put_contents($routesFile, $routeExample);

        // Controllers directory
        $controllersFile = $pluginPath . '/Controllers/ExampleController.php';
        $ensureDir($controllersFile);
        file_put_contents($controllersFile, $controllerExample);

        // Chat directory
        $chatFile = $pluginPath . '/Chat/ExampleLog.php';
        $ensureDir($chatFile);
        file_put_contents($chatFile, $chatExample);

        // Events/App directory
        $eventsFile = $pluginPath . '/Events/App/AppReadyEvent.php';
        $ensureDir($eventsFile);
        file_put_contents($eventsFile, $eventExample);
    }

    /**
     * Create fresh template with minimal examples.
     */
    private function createFreshTemplate(string $pluginPath, string $identifier, string $className): void
    {
        // Create a simple README
        $readmeContent = "# {$className} Plugin

A fresh plugin template for FeatherPanel.

## Structure

This plugin includes:
- Main plugin class: `{$className}.php`
- Configuration: `conf.yml`
- Basic directory structure

## Getting Started

1. Edit `{$className}.php` to add your plugin logic
2. Configure your plugin in `conf.yml`
3. Add routes in the `Routes/` directory
4. Add controllers in the `Controllers/` directory
";

        file_put_contents($pluginPath . '/README.md', $readmeContent);
    }

    private function validatePluginFiles(string $identifier): bool
    {
        $pluginPath = $this->pluginsDir . '/' . $identifier;
        if (!is_dir($pluginPath)) {
            return false;
        }

        $config = PluginHelper::getPluginConfig($identifier);
        if (empty($config)) {
            return false;
        }

        $className = $this->toCamelCase($config['plugin']['name']);
        $mainClassFile = $pluginPath . '/' . $className . '.php';

        return file_exists($mainClassFile) && file_exists($pluginPath . '/conf.yml');
    }

    private function createComponentsSymlink(string $pluginPath, string $identifier): void
    {
        $pluginComponents = $pluginPath . '/Frontend/Components';
        $publicComponentsBase = dirname(__DIR__, 3) . '/public/components';

        if (is_dir($pluginComponents)) {
            // Create /public/components directory if it doesn't exist
            if (!is_dir($publicComponentsBase)) {
                @mkdir($publicComponentsBase, 0755, true);
            }

            // Create symlink at /public/components/{identifier}
            $linkPath = $publicComponentsBase . '/' . $identifier;
            @exec('rm -rf ' . escapeshellarg($linkPath));
            $lnCmd = 'ln -s ' . escapeshellarg($pluginComponents) . ' ' . escapeshellarg($linkPath);
            exec($lnCmd, $lnOut, $lnCode);

            // Fallback to copy if symlink fails
            if ($lnCode !== 0) {
                @mkdir($linkPath, 0755, true);
                $copyCmd = sprintf('cp -r %s/* %s', escapeshellarg($pluginComponents), escapeshellarg($linkPath));
                exec($copyCmd);
            }
        }
    }

    /**
     * Create public assets symlink (copied from PluginsController).
     */
    private function createPublicAssetsSymlink(string $pluginPath, string $identifier): void
    {
        $pluginPublic = $pluginPath . '/Public';
        $publicAddonsBase = dirname(__DIR__, 3) . '/public/addons';

        if (is_dir($pluginPublic)) {
            if (!is_dir($publicAddonsBase)) {
                @mkdir($publicAddonsBase, 0755, true);
            }
            $linkPath = $publicAddonsBase . '/' . $identifier;
            @exec('rm -rf ' . escapeshellarg($linkPath));
            $lnCmd = 'ln -s ' . escapeshellarg($pluginPublic) . ' ' . escapeshellarg($linkPath);
            exec($lnCmd, $lnOut, $lnCode);
            if ($lnCode !== 0) {
                @mkdir($linkPath, 0755, true);
                $copyPubCmd = sprintf('cp -r %s/* %s', escapeshellarg($pluginPublic), escapeshellarg($linkPath));
                exec($copyPubCmd);
            }
        }
    }

    /**
     * Execute addon-provided SQL migrations (copied from PluginsController).
     */
    private function runAddonMigrations(string $identifier, string $pluginDir): array
    {
        $lines = [];
        $executed = 0;
        $skipped = 0;
        $failed = 0;

        try {
            $dir = rtrim($pluginDir, '/') . '/Migrations';
            if (!is_dir($dir)) {
                $lines[] = 'No migrations directory for addon: ' . $identifier;

                return compact('executed', 'skipped', 'failed', 'lines');
            }

            // Connect to database using env loaded by kernel
            $db = new \App\Chat\Database(
                $_ENV['DATABASE_HOST'] ?? '127.0.0.1',
                $_ENV['DATABASE_DATABASE'] ?? '',
                $_ENV['DATABASE_USER'] ?? '',
                $_ENV['DATABASE_PASSWORD'] ?? '',
                (int) ($_ENV['DATABASE_PORT'] ?? 3306)
            );
            $pdo = $db->getPdo();

            // Ensure migrations table exists
            $migrationsSql = "CREATE TABLE IF NOT EXISTS `featherpanel_migrations` (
				`id` INT NOT NULL AUTO_INCREMENT COMMENT 'The id of the migration!',
				`script` TEXT NOT NULL COMMENT 'The script to be migrated!',
				`migrated` ENUM('true','false') NOT NULL DEFAULT 'true' COMMENT 'Did we migrate this already?',
				`date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'The date from when this was executed!',
				PRIMARY KEY (`id`)
			) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT = 'The migrations table is table where save the sql migrations!';";
            $pdo->exec($migrationsSql);

            $files = scandir($dir) ?: [];
            $migrationFiles = array_values(array_filter($files, static function ($file) use ($dir) {
                return $file !== '.' && $file !== '..' && pathinfo($file, PATHINFO_EXTENSION) === 'sql' && is_file($dir . '/' . $file);
            }));

            foreach ($migrationFiles as $file) {
                $path = $dir . '/' . $file;
                $sql = @file_get_contents($path);
                $scriptKey = 'addon:' . $identifier . ':' . $file;
                if ($sql === false) {
                    $lines[] = '⏭️  Skipped (unreadable): ' . $file;
                    ++$skipped;
                    continue;
                }
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM featherpanel_migrations WHERE script = :script AND migrated = 'true'");
                $stmt->execute(['script' => $scriptKey]);
                if ((int) $stmt->fetchColumn() > 0) {
                    $lines[] = '⏭️  Skipped (already executed): ' . $file;
                    ++$skipped;
                    continue;
                }
                try {
                    $pdo->exec($sql);
                    $ins = $pdo->prepare('INSERT INTO featherpanel_migrations (script, migrated) VALUES (:script, :migrated)');
                    $ins->execute(['script' => $scriptKey, 'migrated' => 'true']);
                    $lines[] = '✅ Executed: ' . $file;
                    ++$executed;
                } catch (\Exception $ex) {
                    $lines[] = '❌ Failed: ' . $file . ' -> ' . $ex->getMessage();
                    ++$failed;
                }
            }
        } catch (\Exception $e) {
            $lines[] = '❌ Migration error: ' . $e->getMessage();
            ++$failed;
        }

        return compact('executed', 'skipped', 'failed', 'lines');
    }

    /**
     * Call plugin install hook if present (copied from PluginsController).
     */
    private function callPluginInstallHook(string $pluginPath, string $identifier, string $className): void
    {
        $phpFiles = glob($pluginPath . '/*.php') ?: [];
        if (!empty($phpFiles)) {
            require_once $phpFiles[0];
            $namespace = 'App\\Addons\\' . $identifier;
            $full = $namespace . '\\' . $className;
            if (class_exists($full) && method_exists($full, 'pluginInstall')) {
                $full::pluginInstall();
            }
        }
    }

    private function createPluginMigration(string $pluginPath, string $pluginId, string $name, string $description): array
    {
        $timestamp = date('Y-m-d-H.i');
        $filename = "{$timestamp}-{$name}.sql";
        $filepath = $pluginPath . '/Migrations/' . $filename;

        $template = "-- Plugin Migration: {$pluginId} - {$name}\n";
        if (!empty($description)) {
            $template .= "-- Description: {$description}\n";
        }
        $template .= '-- Created: ' . date('Y-m-d H:i:s') . "\n\n";
        $template .= "-- Plugin-specific migration for {$pluginId}\n";
        $template .= "CREATE TABLE IF NOT EXISTS `featherpanel_{$pluginId}_{$name}` (\n";
        $template .= "    `id` INT NOT NULL AUTO_INCREMENT,\n";
        $template .= "    `data` TEXT,\n";
        $template .= "    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n";
        $template .= "    PRIMARY KEY (`id`)\n";
        $template .= ") ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_general_ci;\n";

        if (file_put_contents($filepath, $template) === false) {
            return ['success' => false, 'message' => 'Failed to create migration file'];
        }

        return [
            'success' => true,
            'filename' => $filename,
            'filepath' => $filepath,
            'type' => 'migration',
        ];
    }

    private function createPluginCron(string $pluginPath, string $pluginId, string $className, string $name, string $description, string $schedule): array
    {
        $cronClassName = ucfirst(preg_replace('/[^a-zA-Z0-9]/', '', ucwords($name))) . 'Cron';
        $filename = "{$cronClassName}.php";
        $filepath = $pluginPath . '/Cron/' . $filename;

        $template = "<?php\n\n";
        $template .= "namespace App\Addons\\{$pluginId}\Cron;\n\n";
        $template .= "use App\Cron\Cron;\n";
        $template .= "use App\Cron\TimeTask;\n";
        $template .= "use App\Chat\TimedTask;\n\n";
        $template .= "class {$cronClassName} implements TimeTask\n";
        $template .= "{\n";
        if (!empty($description)) {
            $template .= "    /**\n";
            $template .= "     * {$description}\n";
            $template .= "     * Schedule: {$schedule}\n";
            $template .= "     */\n";
        }
        $template .= "    public function run()\n";
        $template .= "    {\n";
        $template .= "        \$cron = new Cron('{$pluginId}-{$name}', '{$schedule}');\n";
        $template .= "        try {\n";
        $template .= "            \$cron->runIfDue(function () {\n";
        $template .= "                // Add your cron job logic here\n";
        $template .= "                TimedTask::markRun('{$pluginId}-{$name}', true, '{$className} cron executed');\n";
        $template .= "            });\n";
        $template .= "        } catch (\\Exception \$e) {\n";
        $template .= "            \$app = \\App\\App::getInstance(false, true);\n";
        $template .= "            \$app->getLogger()->error('Failed to run {$pluginId} {$name} cron: ' . \$e->getMessage());\n";
        $template .= "            TimedTask::markRun('{$pluginId}-{$name}', false, \$e->getMessage());\n";
        $template .= "        }\n";
        $template .= "    }\n";
        $template .= "}\n";

        if (file_put_contents($filepath, $template) === false) {
            return ['success' => false, 'message' => 'Failed to create cron file'];
        }

        return [
            'success' => true,
            'filename' => $filename,
            'filepath' => $filepath,
            'type' => 'cron',
        ];
    }

    private function createPluginCommand(string $pluginPath, string $pluginId, string $className, string $name, string $description): array
    {
        $cmdClassName = ucfirst(preg_replace('/[^a-zA-Z0-9]/', '', ucwords($name))) . 'Command';
        $filename = "{$cmdClassName}.php";
        $filepath = $pluginPath . '/Commands/' . $filename;

        $template = "<?php\n\n";
        $template .= "namespace App\Addons\\{$pluginId}\Commands;\n\n";
        $template .= "use App\Cli\App;\n";
        $template .= "use App\Cli\CommandBuilder;\n\n";
        $template .= "class {$cmdClassName} implements CommandBuilder\n";
        $template .= "{\n";
        if (!empty($description)) {
            $template .= "    /**\n";
            $template .= "     * {$description}\n";
            $template .= "     */\n";
        }
        $template .= "    public static function execute(array \$args): void\n";
        $template .= "    {\n";
        $template .= "        \$app = App::getInstance();\n";
        $template .= "        \$app->send(\"&a{$className} plugin: {$name} command executed successfully!\");\n";
        $template .= "        // Add your command logic here\n";
        $template .= "    }\n\n";
        $template .= "    public static function getDescription(): string\n";
        $template .= "    {\n";
        $template .= "        return \"{$description}\";\n";
        $template .= "    }\n\n";
        $template .= "    public static function getSubCommands(): array\n";
        $template .= "    {\n";
        $template .= "        return [];\n";
        $template .= "    }\n";
        $template .= "}\n";

        if (file_put_contents($filepath, $template) === false) {
            return ['success' => false, 'message' => 'Failed to create command file'];
        }

        return [
            'success' => true,
            'filename' => $filename,
            'filepath' => $filepath,
            'type' => 'command',
        ];
    }

    private function handlePluginPublicFileUpload(Request $request, string $pluginPath, string $pluginId): array
    {
        $uploadedFile = $request->files->get('file');

        if (!$uploadedFile) {
            return ['success' => false, 'message' => 'No file was uploaded'];
        }

        if (!$uploadedFile->isValid()) {
            return ['success' => false, 'message' => 'Invalid file upload'];
        }

        // Security: Check file extension and size
        $maxFileSize = 5 * 1024 * 1024; // 5MB

        $originalName = $uploadedFile->getClientOriginalName();
        $fileSize = $uploadedFile->getSize(); // Get size BEFORE moving the file

        if ($fileSize > $maxFileSize) {
            return ['success' => false, 'message' => 'File size too large. Maximum size: 5MB'];
        }

        // Sanitize filename
        $filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $originalName);
        $filepath = $pluginPath . '/Public/' . $filename;

        // Ensure Public directory exists
        $publicDir = $pluginPath . '/Public';
        if (!is_dir($publicDir)) {
            mkdir($publicDir, 0755, true);
        }

        try {
            $uploadedFile->move($publicDir, $filename);
        } catch (\Exception $e) {
            return ['success' => false, 'message' => 'Failed to save uploaded file: ' . $e->getMessage()];
        }

        return [
            'success' => true,
            'filename' => $filename,
            'filepath' => $filepath,
            'original_name' => $originalName,
            'size' => $fileSize, // Use the size we captured earlier
            'type' => 'public_file',
        ];
    }

    private function createPluginWidget(string $pluginPath, string $pluginId, string $name, string $description, string $page, string $location, string $size, int $priority): array
    {
        // Sanitize widget name for component filename
        $componentName = preg_replace('/[^a-zA-Z0-9_-]/', '-', strtolower($name));
        $componentFilename = $componentName . '.html';
        $componentPath = $pluginPath . '/Frontend/Components/' . $componentFilename;

        // Ensure Components directory exists
        $componentsDir = $pluginPath . '/Frontend/Components';
        if (!is_dir($componentsDir)) {
            mkdir($componentsDir, 0755, true);
        }

        // Create widget HTML file
        $widgetHtml = $this->generateWidgetHtml($pluginId, $name, $description);

        if (file_put_contents($componentPath, $widgetHtml) === false) {
            return ['success' => false, 'message' => 'Failed to create widget HTML file'];
        }

        // Create or update widgets.json
        $widgetsJsonPath = $pluginPath . '/Frontend/widgets.json';
        $widgets = [];

        if (file_exists($widgetsJsonPath)) {
            $existingWidgets = json_decode(file_get_contents($widgetsJsonPath), true);
            if (is_array($existingWidgets)) {
                $widgets = $existingWidgets;
            }
        }

        // Generate unique widget ID
        $widgetId = $pluginId . '-' . $componentName;
        $widgetIndex = 0;
        while (isset(array_column($widgets, 'id')[$widgetIndex]) && in_array($widgetId, array_column($widgets, 'id'))) {
            ++$widgetIndex;
            $widgetId = $pluginId . '-' . $componentName . '-' . $widgetIndex;
        }

        // Add new widget to array
        $newWidget = [
            'id' => $widgetId,
            'component' => $componentFilename,
            'page' => $page,
            'location' => $location,
            'enabled' => true,
            'priority' => $priority,
            'size' => $size,
        ];

        $widgets[] = $newWidget;

        // Save widgets.json
        $jsonContent = json_encode($widgets, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if (file_put_contents($widgetsJsonPath, $jsonContent) === false) {
            return ['success' => false, 'message' => 'Failed to create/update widgets.json'];
        }

        return [
            'success' => true,
            'filename' => $componentFilename,
            'filepath' => $componentPath,
            'widget_id' => $widgetId,
            'widget_config' => $newWidget,
            'type' => 'widget',
        ];
    }

    private function generateWidgetHtml(string $pluginId, string $name, string $description): string
    {
        $widgetTitle = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
        $widgetDescription = htmlspecialchars($description, ENT_QUOTES, 'UTF-8');

        return "<!DOCTYPE html>
<html lang=\"en\">
    <head>
        <meta charset=\"UTF-8\" />
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
        <title>{$widgetTitle}</title>
        <style>
            .widget-container {
                background: rgba(18, 19, 21, 0.8);
                border-radius: 0.75rem;
                padding: 1.5rem;
                border: 1px solid rgba(255, 255, 255, 0.07);
                margin-bottom: 1rem;
            }

            .widget-title {
                font-size: 1.125rem;
                font-weight: 600;
                margin-bottom: 0.75rem;
                color: #fafafa;
            }

            .widget-description {
                color: #a1a1aa;
                font-size: 0.875rem;
                margin-bottom: 1rem;
            }

            .widget-content {
                color: #e5e5e5;
            }

            .widget-loading {
                color: #6b7280;
                font-style: italic;
            }
        </style>
    </head>
    <body>
        <div class=\"widget-container\">
            <h3 class=\"widget-title\">{$widgetTitle}</h3>
            " . (!empty($description) ? "<p class=\"widget-description\">{$widgetDescription}</p>" : '') . "
            <div class=\"widget-content\" id=\"widget-content\">
                <p class=\"widget-loading\">Loading widget data...</p>
            </div>
        </div>

        <script>
            // Widgets automatically receive context
            // Access via window.FeatherPanel.widgetContext

            async function loadWidgetData() {
                // Get context (automatically provided by FeatherPanel)
                const context = window.FeatherPanel?.widgetContext || {};
                const serverUuid = context.serverUuid;
                const userUuid = context.userUuid;

                const contentEl = document.getElementById('widget-content');

                if (!contentEl) {
                    return;
                }

                try {
                    // Example: Make API call to your plugin endpoint
                    // Replace with your actual endpoint
                    let apiUrl = '/api/user/addons/{$pluginId}/widget-data';
                    
                    if (serverUuid) {
                        apiUrl = `/api/user/servers/\${serverUuid}/addons/{$pluginId}/widget-data`;
                    }

                    const response = await fetch(apiUrl);
                    const result = await response.json();

                    if (result.success) {
                        // Update widget content with your data
                        contentEl.innerHTML = `
                            <p>Widget loaded successfully!</p>
                            <p>Server UUID: \${serverUuid || 'N/A'}</p>
                            <p>User UUID: \${userUuid || 'N/A'}</p>
                            <pre>\${JSON.stringify(result.data, null, 2)}</pre>
                        `;
                    } else {
                        contentEl.innerHTML = '<p>Error: ' + (result.message || 'Failed to load data') + '</p>';
                    }
                } catch (error) {
                    console.error('Failed to load widget data:', error);
                    contentEl.innerHTML = '<p class=\"widget-loading\">Error loading widget data. Check console for details.</p>';
                }
            }

            // Initialize widget when loaded
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', loadWidgetData);
            } else {
                loadWidgetData();
            }
        </script>
    </body>
</html>";
    }
}
