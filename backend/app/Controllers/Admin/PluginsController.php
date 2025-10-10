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

namespace App\Controllers\Admin;

use App\Chat\Activity;
use App\Chat\Database;
use App\Helpers\ApiResponse;
use App\Plugins\PluginConfig;
use OpenApi\Attributes as OA;
use App\Plugins\PluginSettings;
use App\Plugins\PluginDependencies;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'PluginInfo',
    type: 'object',
    properties: [
        new OA\Property(property: 'plugin', type: 'object', properties: [
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
            new OA\Property(property: 'loaded', type: 'boolean', description: 'Whether plugin is loaded in memory'),
            new OA\Property(property: 'unmetDependencies', type: 'array', items: new OA\Items(type: 'string'), description: 'List of unmet dependencies'),
            new OA\Property(property: 'missingConfigs', type: 'array', items: new OA\Items(type: 'string'), description: 'List of missing required configurations'),
        ]),
        new OA\Property(property: 'configSchema', type: 'array', items: new OA\Items(type: 'object'), description: 'Plugin configuration schema'),
    ]
)]
#[OA\Schema(
    schema: 'OnlineAddon',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Addon ID'),
        new OA\Property(property: 'identifier', type: 'string', description: 'Addon identifier'),
        new OA\Property(property: 'name', type: 'string', description: 'Addon display name'),
        new OA\Property(property: 'description', type: 'string', description: 'Addon description'),
        new OA\Property(property: 'icon', type: 'string', description: 'Addon icon URL'),
        new OA\Property(property: 'website', type: 'string', description: 'Addon website URL'),
        new OA\Property(property: 'author', type: 'string', description: 'Addon author'),
        new OA\Property(property: 'author_email', type: 'string', description: 'Author email'),
        new OA\Property(property: 'maintainers', type: 'array', items: new OA\Items(type: 'string'), description: 'Addon maintainers'),
        new OA\Property(property: 'tags', type: 'array', items: new OA\Items(type: 'string'), description: 'Addon tags'),
        new OA\Property(property: 'verified', type: 'boolean', description: 'Whether addon is verified'),
        new OA\Property(property: 'downloads', type: 'integer', description: 'Download count'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
        new OA\Property(property: 'latest_version', type: 'object', properties: [
            new OA\Property(property: 'version', type: 'string', description: 'Latest version number'),
            new OA\Property(property: 'download_url', type: 'string', description: 'Download URL'),
            new OA\Property(property: 'file_size', type: 'integer', description: 'File size in bytes'),
            new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Version creation timestamp'),
        ]),
    ]
)]
#[OA\Schema(
    schema: 'PluginSettingUpdate',
    type: 'object',
    required: ['key', 'value'],
    properties: [
        new OA\Property(property: 'key', type: 'string', description: 'Setting key', minLength: 1),
        new OA\Property(property: 'value', type: 'string', description: 'Setting value', minLength: 1),
    ]
)]
#[OA\Schema(
    schema: 'PluginSettingRemove',
    type: 'object',
    required: ['key'],
    properties: [
        new OA\Property(property: 'key', type: 'string', description: 'Setting key to remove', minLength: 1),
    ]
)]
#[OA\Schema(
    schema: 'OnlineInstall',
    type: 'object',
    required: ['identifier'],
    properties: [
        new OA\Property(property: 'identifier', type: 'string', description: 'Addon identifier to install', pattern: '^[a-zA-Z0-9_\\-]+$'),
    ]
)]
#[OA\Schema(
    schema: 'UrlInstall',
    type: 'object',
    required: ['url'],
    properties: [
        new OA\Property(property: 'url', type: 'string', description: 'URL to download addon from', format: 'uri'),
    ]
)]
#[OA\Schema(
    schema: 'MigrationResult',
    type: 'object',
    properties: [
        new OA\Property(property: 'executed', type: 'integer', description: 'Number of migrations executed'),
        new OA\Property(property: 'skipped', type: 'integer', description: 'Number of migrations skipped'),
        new OA\Property(property: 'failed', type: 'integer', description: 'Number of migrations failed'),
        new OA\Property(property: 'lines', type: 'array', items: new OA\Items(type: 'string'), description: 'Migration execution log'),
    ]
)]
class PluginsController
{
    public const PASSWORD = 'featherpanel_development_kit_2025_addon_password';

    #[OA\Get(
        path: '/api/admin/plugins',
        summary: 'Get all installed plugins',
        description: 'Retrieve a list of all installed plugins with their configuration, status, dependencies, and missing configurations.',
        tags: ['Admin - Plugins'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Plugins retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'plugins', type: 'object', additionalProperties: new OA\AdditionalProperties(ref: '#/components/schemas/PluginInfo')),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to fetch plugins'),
        ]
    )]
    public function index(Request $request): Response
    {
        try {
            global $pluginManager;
            $loaded = $pluginManager->getLoadedMemoryPlugins();
            $allInstalled = method_exists($pluginManager, 'getPluginsWithoutLoader')
                ? $pluginManager->getPluginsWithoutLoader()
                : $loaded;

            $pluginsList = [];
            foreach ($allInstalled as $identifier) {
                // Read config even if not loaded
                $info = PluginConfig::getConfig($identifier);
                if (empty($info) || !isset($info['plugin'])) {
                    // Skip completely invalid directory entries
                    continue;
                }

                // Compute unmet dependencies
                $unmet = [];
                try {
                    $unmet = PluginDependencies::getUnmetDependencies($info);
                } catch (\Throwable $t) {
                    $unmet = [];
                }

                // Compute missing required configs
                $missingConfigs = [];
                try {
                    $required = $info['plugin']['requiredConfigs'] ?? [];
                    if (is_array($required) && !empty($required)) {
                        $settings = PluginSettings::getSettings($identifier);
                        $configuredKeys = array_column($settings, 'key');
                        foreach ($required as $reqKey) {
                            if (!in_array($reqKey, $configuredKeys, true)) {
                                $missingConfigs[] = $reqKey;
                            }
                        }
                    }
                } catch (\Throwable $t) {
                    $missingConfigs = [];
                }

                // Get enhanced config schema if available
                $configSchema = PluginConfig::getPluginRequiredAdminConfig($identifier);

                // Augment plugin info for frontend consumption
                $info['plugin']['loaded'] = in_array($identifier, $loaded, true);
                $info['plugin']['unmetDependencies'] = $unmet;
                $info['plugin']['missingConfigs'] = $missingConfigs;
                $info['configSchema'] = $configSchema;
                $pluginsList[$identifier] = $info;
            }

            return ApiResponse::success(['plugins' => $pluginsList], 'Successfully fetched plugins overview', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to fetch plugins statistics: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/plugins/{identifier}/config',
        summary: 'Get plugin configuration',
        description: 'Retrieve detailed configuration information for a specific plugin including settings and configuration schema.',
        tags: ['Admin - Plugins'],
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
                description: 'Plugin configuration retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'config', ref: '#/components/schemas/PluginInfo'),
                        new OA\Property(property: 'plugin', ref: '#/components/schemas/PluginInfo'),
                        new OA\Property(property: 'settings', type: 'object', additionalProperties: new OA\AdditionalProperties(type: 'string'), description: 'Plugin settings key-value pairs'),
                        new OA\Property(property: 'configSchema', type: 'array', items: new OA\Items(type: 'object'), description: 'Plugin configuration schema'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid plugin identifier'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Plugin not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to fetch plugin configuration'),
        ]
    )]
    public function getConfig(Request $request, string $identifier): Response
    {
        try {
            // Check if plugin exists by trying to load its config
            $info = PluginConfig::getConfig($identifier);
            if (empty($info) || !isset($info['plugin'])) {
                return ApiResponse::error('Plugin not found', 'PLUGIN_NOT_FOUND', 404, [
                    'identifier' => $identifier,
                ]);
            }

            $settings = PluginSettings::getSettings($identifier);
            $settingsList = [];
            foreach ($settings as $setting) {
                $settingsList[$setting['key']] = $setting['value'];
            }

            // Get enhanced config schema if available
            $configSchema = PluginConfig::getPluginRequiredAdminConfig($identifier);

            return ApiResponse::success([
                'config' => $info,
                'plugin' => $info,
                'settings' => $settingsList,
                'configSchema' => $configSchema,
            ], 'Plugin config fetched successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to fetch plugin config: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/plugins/{identifier}/settings/set',
        summary: 'Set plugin setting',
        description: 'Set a specific setting value for a plugin. Logs the activity and emits events for tracking.',
        tags: ['Admin - Plugins'],
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
            content: new OA\JsonContent(ref: '#/components/schemas/PluginSettingUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Plugin setting updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'identifier', type: 'string', description: 'Plugin identifier'),
                        new OA\Property(property: 'key', type: 'string', description: 'Setting key'),
                        new OA\Property(property: 'value', type: 'string', description: 'Setting value'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, missing key/value, or invalid plugin identifier'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Plugin not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update setting'),
        ]
    )]
    public function setSettings(Request $request, string $identifier): Response
    {
        try {
            // Check if plugin exists by trying to load its config
            $info = PluginConfig::getConfig($identifier);
            if (empty($info) || !isset($info['plugin'])) {
                return ApiResponse::error('Plugin not found', 'PLUGIN_NOT_FOUND', 404);
            }

            $data = json_decode($request->getContent(), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
            }

            if (!isset($data['key']) || empty($data['key'])) {
                return ApiResponse::error('Missing key parameter', 'MISSING_KEY', 400);
            }

            if (!isset($data['value']) || empty($data['value'])) {
                return ApiResponse::error('Missing value parameter', 'MISSING_VALUE', 400);
            }

            $key = $data['key'];
            $value = $data['value'];

            PluginSettings::setSettings($identifier, $key, ['value' => $value]);

            // Log activity
            $admin = $request->get('user');
            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'plugin_setting_update',
                'context' => "Updated setting $key for plugin $identifier",
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            // Emit event if event manager is available
            if (isset($GLOBALS['eventManager']) && $GLOBALS['eventManager'] !== null) {
                $GLOBALS['eventManager']->emit('PluginsSettingsEvent::onPluginSettingUpdate', [
                    'identifier' => $identifier,
                    'key' => $key,
                    'value' => $value,
                ]);
            }

            return ApiResponse::success([
                'identifier' => $identifier,
                'key' => $key,
                'value' => $value,
            ], 'Setting updated successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to update setting: ' . $e->getMessage(), 'SETTING_UPDATE_FAILED', 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/plugins/{identifier}/settings/remove',
        summary: 'Remove plugin setting',
        description: 'Remove a specific setting from a plugin. Logs the activity and emits events for tracking.',
        tags: ['Admin - Plugins'],
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
            content: new OA\JsonContent(ref: '#/components/schemas/PluginSettingRemove')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Plugin setting removed successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'identifier', type: 'string', description: 'Plugin identifier'),
                        new OA\Property(property: 'key', type: 'string', description: 'Removed setting key'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, missing key, or invalid plugin identifier'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Plugin not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to remove setting'),
        ]
    )]
    public function removeSettings(Request $request, string $identifier): Response
    {
        try {
            // Check if plugin exists by trying to load its config
            $info = PluginConfig::getConfig($identifier);
            if (empty($info) || !isset($info['plugin'])) {
                return ApiResponse::error('Plugin not found', 'PLUGIN_NOT_FOUND', 404);
            }

            $data = json_decode($request->getContent(), true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
            }

            if (!isset($data['key']) || empty($data['key'])) {
                return ApiResponse::error('Missing key parameter', 'MISSING_KEY', 400);
            }

            $key = $data['key'];

            // Log activity
            $admin = $request->get('user');
            Activity::createActivity([
                'user_uuid' => $admin['uuid'] ?? null,
                'name' => 'plugin_setting_delete',
                'context' => "Removed setting $key from plugin $identifier",
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            // Emit event if event manager is available
            if (isset($GLOBALS['eventManager']) && $GLOBALS['eventManager'] !== null) {
                $GLOBALS['eventManager']->emit('PluginsSettingsEvent::onPluginSettingDelete', [
                    'identifier' => $identifier,
                    'key' => $key,
                ]);
            }

            PluginSettings::deleteSettings($identifier, $key);

            return ApiResponse::success([
                'identifier' => $identifier,
                'key' => $key,
            ], 'Setting removed successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to remove setting: ' . $e->getMessage(), 'SETTING_REMOVE_FAILED', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/plugins/online/list',
        summary: 'Get online addons list',
        description: 'Retrieve a paginated list of available addons from the FeatherPanel packages API with search functionality.',
        tags: ['Admin - Plugins'],
        parameters: [
            new OA\Parameter(
                name: 'q',
                in: 'query',
                description: 'Search query to filter addons',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
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
                description: 'Number of addons per page',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, default: 20)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Online addons retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'addons', type: 'array', items: new OA\Items(ref: '#/components/schemas/OnlineAddon')),
                        new OA\Property(property: 'pagination', type: 'object', description: 'Pagination metadata'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to fetch online addons or invalid response'),
        ]
    )]
    public function onlineList(Request $request): Response
    {
        try {
            // New official packages API
            $base = 'https://api.featherpanel.com/packages';
            $q = trim((string) ($request->query->get('q') ?? ''));
            $page = (int) ($request->query->get('page') ?? 1);
            $perPage = (int) ($request->query->get('per_page') ?? 20);
            $query = [];
            if ($q !== '') {
                $query['search'] = $q;
            }
            if ($page > 0) {
                $query['page'] = (string) $page;
            }
            if ($perPage > 0) {
                $query['per_page'] = (string) $perPage;
            }
            $url = $base . (!empty($query) ? ('?' . http_build_query($query)) : '');
            $context = stream_context_create([
                'http' => [
                    'timeout' => 10,
                    'ignore_errors' => true,
                ],
            ]);
            $response = @file_get_contents($url, false, $context);
            if ($response === false) {
                return ApiResponse::error('Failed to fetch online addon list', 'ONLINE_LIST_FETCH_FAILED', 500);
            }

            $data = json_decode($response, true);
            if (!is_array($data) || !isset($data['data']['packages']) || !is_array($data['data']['packages'])) {
                return ApiResponse::error('Invalid response from online addon list', 'ONLINE_LIST_INVALID', 500);
            }

            $packages = $data['data']['packages'];
            $addons = array_map(static function (array $pkg): array {
                $latest = $pkg['latest_version'] ?? [];
                $downloadUrl = isset($latest['download_url']) ? ('https://api.featherpanel.com' . $latest['download_url']) : null;

                $iconUrl = $pkg['icon_url'];
                // If iconUrl is set and not empty, ensure it is https
                if (!empty($iconUrl) && is_string($iconUrl)) {
                    if (strpos($iconUrl, 'http://') === 0) {
                        $iconUrl = 'https://' . substr($iconUrl, 7);
                    }
                }

                return [
                    // Basic identity
                    'id' => $pkg['id'] ?? null,
                    'identifier' => $pkg['name'] ?? '',
                    'name' => $pkg['display_name'] ?? ($pkg['name'] ?? ''),
                    'description' => $pkg['description'] ?? null,
                    'icon' => $iconUrl,
                    'website' => $pkg['website'] ?? null,
                    // Authors/maintainers
                    'author' => $pkg['author'] ?? null,
                    'author_email' => $pkg['author_email'] ?? null,
                    'maintainers' => $pkg['maintainers'] ?? [],
                    // Meta
                    'tags' => $pkg['tags'] ?? [],
                    'verified' => isset($pkg['verified']) ? (int) $pkg['verified'] === 1 : false,
                    'downloads' => $pkg['downloads'] ?? 0,
                    'created_at' => $pkg['created_at'] ?? null,
                    'updated_at' => $pkg['updated_at'] ?? null,
                    // Latest version
                    'latest_version' => [
                        'version' => $latest['version'] ?? null,
                        'download_url' => $downloadUrl,
                        'file_size' => $latest['file_size'] ?? null,
                        'created_at' => $latest['created_at'] ?? null,
                    ],
                ];
            }, $packages);

            $pagination = $data['data']['pagination'] ?? null;

            return ApiResponse::success([
                'addons' => $addons,
                'pagination' => $pagination,
            ], 'Online addons fetched', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to fetch online addons: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/plugins/online/install',
        summary: 'Install addon from online registry',
        description: 'Download and install an addon from the FeatherPanel packages API. Downloads the latest version and extracts it to the addons directory.',
        tags: ['Admin - Plugins'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/OnlineInstall')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Addon installed successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'identifier', type: 'string', description: 'Installed addon identifier'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid identifier format'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Package not found in registry'),
            new OA\Response(response: 409, description: 'Conflict - Addon already installed'),
            new OA\Response(response: 422, description: 'Unprocessable Entity - Failed to extract addon package or migrations failed'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to install addon or download failed'),
        ]
    )]
    public function onlineInstall(Request $request): Response
    {
        try {
            $body = json_decode($request->getContent(), true);
            $identifier = $body['identifier'] ?? null;
            if (!$identifier || !preg_match('/^[a-zA-Z0-9_\-]+$/', (string) $identifier)) {
                return ApiResponse::error('Invalid identifier', 'INVALID_IDENTIFIER', 400);
            }

            if (!defined('APP_ADDONS_DIR')) {
                define('APP_ADDONS_DIR', dirname(__DIR__, 3) . '/storage/addons');
            }

            // Ensure addons dir exists
            if (!is_dir(APP_ADDONS_DIR) && !@mkdir(APP_ADDONS_DIR, 0755, true)) {
                return ApiResponse::error('Failed to prepare addons directory', 'ADDONS_DIR_CREATE_FAILED', 500);
            }

            // Fetch package metadata to get download URL from the new API
            $metaUrl = 'https://api.featherpanel.com/packages';
            $context = stream_context_create([
                'http' => [
                    'timeout' => 15,
                    'ignore_errors' => true,
                ],
            ]);
            $metaResp = @file_get_contents($metaUrl, false, $context);
            if ($metaResp === false) {
                return ApiResponse::error('Failed to query packages API', 'PACKAGES_API_FAILED', 500);
            }
            $meta = json_decode($metaResp, true);
            $packages = is_array($meta) && isset($meta['data']['packages']) && is_array($meta['data']['packages']) ? $meta['data']['packages'] : [];
            $match = null;
            foreach ($packages as $pkg) {
                if (($pkg['name'] ?? '') === $identifier) {
                    $match = $pkg;
                    break;
                }
            }
            if (!$match || !isset($match['latest_version']['download_url'])) {
                return ApiResponse::error('Package not found in registry', 'PACKAGE_NOT_FOUND', 404);
            }
            $downloadUrl = 'https://api.featherpanel.com' . $match['latest_version']['download_url'];
            $fileContent = @file_get_contents($downloadUrl, false, $context);
            if ($fileContent === false) {
                return ApiResponse::error('Failed to download addon package', 'ADDON_DOWNLOAD_FAILED', 500);
            }

            $tempFile = sys_get_temp_dir() . '/' . uniqid('featherpanel_', true) . '.fpa';
            file_put_contents($tempFile, $fileContent);

            // Extract
            $tempDir = sys_get_temp_dir() . '/' . uniqid('featherpanel_', true);
            @mkdir($tempDir, 0755, true);
            $pwd = self::PASSWORD;
            $unzipCommand = sprintf('unzip -P %s %s -d %s', escapeshellarg($pwd), escapeshellarg($tempFile), escapeshellarg($tempDir));
            exec($unzipCommand, $out, $code);
            @unlink($tempFile);
            if ($code !== 0) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Failed to extract addon package', 'ADDON_EXTRACT_FAILED', 422);
            }

            return $this->performAddonInstall($tempDir, $identifier);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to install addon: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/plugins/{identifier}/uninstall',
        summary: 'Uninstall addon',
        description: 'Completely remove an addon from the system including its files, public assets, and database migrations. Calls the plugin uninstall hook if available.',
        tags: ['Admin - Plugins'],
        parameters: [
            new OA\Parameter(
                name: 'identifier',
                in: 'path',
                description: 'Addon identifier to uninstall',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Addon uninstalled successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid addon identifier'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Addon not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to uninstall addon'),
        ]
    )]
    public function uninstall(Request $request, string $identifier): Response
    {
        try {
            if (!defined('APP_ADDONS_DIR')) {
                define('APP_ADDONS_DIR', dirname(__DIR__, 3) . '/storage/addons');
            }
            $pluginDir = APP_ADDONS_DIR . '/' . $identifier;
            if (!file_exists($pluginDir)) {
                return ApiResponse::error('Addon not found', 'ADDON_NOT_FOUND', 404);
            }

            $phpFiles = glob($pluginDir . '/*.php') ?: [];
            if (!empty($phpFiles)) {
                try {
                    require_once $phpFiles[0];
                    $className = basename($phpFiles[0], '.php');
                    $namespace = 'App\\Addons\\' . $identifier;
                    $full = $namespace . '\\' . $className;
                    if (class_exists($full) && method_exists($full, 'pluginUninstall')) {
                        $full::pluginUninstall();
                    }
                } catch (\Throwable $e) {
                    // Log the error but continue with uninstallation
                    error_log('Plugin uninstall hook failed for ' . $identifier . ': ' . $e->getMessage());
                }
            }

            @exec('rm -rf ' . escapeshellarg($pluginDir));

            // Remove exposed public assets link/dir at public/addons/{identifier}
            $publicAddonsBase = dirname(__DIR__, 3) . '/public/addons';
            $linkPath = $publicAddonsBase . '/' . $identifier;
            @exec('rm -rf ' . escapeshellarg($linkPath));

            // Remove exposed public components link/dir at public/components/{identifier}
            $publicComponentsBase = dirname(__DIR__, 3) . '/public/components';
            $linkPath = $publicComponentsBase . '/' . $identifier;
            @exec('rm -rf ' . escapeshellarg($linkPath));

            return ApiResponse::success([], 'Addon uninstalled successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to uninstall addon: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/plugins/{identifier}/export',
        summary: 'Export addon',
        description: 'Export an installed addon as a password-protected .fpa file for backup or distribution purposes.',
        tags: ['Admin - Plugins'],
        parameters: [
            new OA\Parameter(
                name: 'identifier',
                in: 'path',
                description: 'Addon identifier to export',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Addon exported successfully',
                content: new OA\MediaType(
                    mediaType: 'application/zip',
                    schema: new OA\Schema(type: 'string', format: 'binary')
                ),
                headers: [
                    new OA\Header(
                        header: 'Content-Disposition',
                        description: 'Attachment filename',
                        schema: new OA\Schema(type: 'string', example: 'attachment; filename="addon-name.fpa"')
                    ),
                ]
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid addon identifier'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Addon not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to export addon'),
        ]
    )]
    public function export(Request $request, string $identifier): Response
    {
        try {
            if (!defined('APP_ADDONS_DIR')) {
                define('APP_ADDONS_DIR', dirname(__DIR__, 3) . '/storage/addons');
            }
            $pluginDir = APP_ADDONS_DIR . '/' . $identifier;
            if (!file_exists($pluginDir)) {
                return ApiResponse::error('Addon not found', 'ADDON_NOT_FOUND', 404);
            }

            $tempDir = sys_get_temp_dir() . '/' . uniqid('featherpanel_', true);
            @mkdir($tempDir, 0755, true);
            $exportFile = $tempDir . '/' . $identifier . '.fpa';
            $pwd = self::PASSWORD;
            $zipCmd = sprintf(
                'cd %s && zip -r -P %s %s *',
                escapeshellarg($pluginDir),
                escapeshellarg($pwd),
                escapeshellarg($exportFile)
            );
            exec($zipCmd, $out, $code);
            if ($code !== 0 || !file_exists($exportFile)) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Failed to create export file', 'ADDON_EXPORT_FAILED', 500);
            }

            $content = file_get_contents($exportFile);
            @exec('rm -rf ' . escapeshellarg($tempDir));
            if ($content === false) {
                return ApiResponse::error('Failed to read export file', 'ADDON_EXPORT_READ_FAILED', 500);
            }

            return new Response(
                $content,
                200,
                [
                    'Content-Type' => 'application/zip',
                    'Content-Disposition' => 'attachment; filename="' . $identifier . '.fpa"',
                ]
            );
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to export addon: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/plugins/upload/install',
        summary: 'Install addon from uploaded file',
        description: 'Upload and install an addon from a .fpa file. Extracts the password-protected archive and installs the addon.',
        tags: ['Admin - Plugins'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    required: ['file'],
                    properties: [
                        new OA\Property(property: 'file', type: 'string', format: 'binary', description: 'Addon .fpa file to upload'),
                    ]
                )
            )
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Addon installed successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'identifier', type: 'string', description: 'Installed addon identifier'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - No file uploaded, file upload error, or invalid file type'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 409, description: 'Conflict - Addon already installed'),
            new OA\Response(response: 422, description: 'Unprocessable Entity - Failed to extract addon package or migrations failed'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to install addon'),
        ]
    )]
    public function uploadInstall(Request $request): Response
    {
        try {
            $files = $request->files->all();
            if (empty($files) || !isset($files['file'])) {
                return ApiResponse::error('No file uploaded', 'NO_FILE_UPLOADED', 400);
            }

            $file = $files['file'];
            if ($file->getError() !== UPLOAD_ERR_OK) {
                return ApiResponse::error('File upload error', 'FILE_UPLOAD_ERROR', 400);
            }

            $originalName = (string) $file->getClientOriginalName();
            if (!preg_match('/\.fpa$/i', $originalName)) {
                return ApiResponse::error('Invalid file type, expected .fpa', 'INVALID_FILE_TYPE', 400);
            }

            if (!defined('APP_ADDONS_DIR')) {
                define('APP_ADDONS_DIR', dirname(__DIR__, 3) . '/storage/addons');
            }
            if (!is_dir(APP_ADDONS_DIR) && !@mkdir(APP_ADDONS_DIR, 0755, true)) {
                return ApiResponse::error('Failed to prepare addons directory', 'ADDONS_DIR_CREATE_FAILED', 500);
            }

            // Move to a temp file
            $tempFile = sys_get_temp_dir() . '/' . uniqid('featherpanel_', true) . '.fpa';
            $file->move(dirname($tempFile), basename($tempFile));

            // Extract
            $tempDir = sys_get_temp_dir() . '/' . uniqid('featherpanel_', true);
            @mkdir($tempDir, 0755, true);
            $pwd = self::PASSWORD;
            $unzipCommand = sprintf('unzip -P %s %s -d %s', escapeshellarg($pwd), escapeshellarg($tempFile), escapeshellarg($tempDir));
            exec($unzipCommand, $out, $code);
            @unlink($tempFile);
            if ($code !== 0) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Failed to extract addon package', 'ADDON_EXTRACT_FAILED', 422);
            }

            return $this->performAddonInstall($tempDir, null);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to upload install addon: ' . $e->getMessage(), 500);
        }
    }

    #[OA\Post(
        path: '/api/admin/plugins/upload/install-url',
        summary: 'Install addon from URL',
        description: 'Download and install an addon from a remote URL. Downloads the file and extracts the password-protected archive.',
        tags: ['Admin - Plugins'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/UrlInstall')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Addon installed successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'identifier', type: 'string', description: 'Installed addon identifier'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid URL format'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 409, description: 'Conflict - Addon already installed'),
            new OA\Response(response: 422, description: 'Unprocessable Entity - Failed to extract addon package or migrations failed'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to install addon or download file from URL'),
        ]
    )]
    public function uploadInstallFromUrl(Request $request): Response
    {
        try {
            $body = json_decode($request->getContent(), true);
            $url = $body['url'] ?? null;
            if (!$url || !is_string($url) || !preg_match('/^https?:\/\//i', $url)) {
                return ApiResponse::error('Invalid URL', 'INVALID_URL', 400);
            }

            if (!defined('APP_ADDONS_DIR')) {
                define('APP_ADDONS_DIR', dirname(__DIR__, 3) . '/storage/addons');
            }
            if (!is_dir(APP_ADDONS_DIR) && !@mkdir(APP_ADDONS_DIR, 0755, true)) {
                return ApiResponse::error('Failed to prepare addons directory', 'ADDONS_DIR_CREATE_FAILED', 500);
            }

            $context = stream_context_create([
                'http' => [
                    'timeout' => 30,
                    'ignore_errors' => true,
                ],
            ]);
            $fileContent = @file_get_contents($url, false, $context);
            if ($fileContent === false) {
                return ApiResponse::error('Failed to download file from URL', 'DOWNLOAD_FAILED', 500);
            }
            $tempFile = sys_get_temp_dir() . '/' . uniqid('featherpanel_', true) . '.fpa';
            file_put_contents($tempFile, $fileContent);

            $tempDir = sys_get_temp_dir() . '/' . uniqid('featherpanel_', true);
            @mkdir($tempDir, 0755, true);
            $pwd = self::PASSWORD;
            $unzipCommand = sprintf('unzip -P %s %s -d %s', escapeshellarg($pwd), escapeshellarg($tempFile), escapeshellarg($tempDir));
            exec($unzipCommand, $out, $code);
            @unlink($tempFile);
            if ($code !== 0) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Failed to extract addon package', 'ADDON_EXTRACT_FAILED', 422);
            }

            return $this->performAddonInstall($tempDir, null);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to install from URL: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Execute addon-provided SQL migrations from the addon's Migrations directory.
     * Each script will be recorded in featherpanel_migrations with a unique key
     * in the form addon:{identifier}:{filename} to avoid collisions.
     *
     * @return array{executed:int,skipped:int,failed:int,lines:string[]}
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
            $db = new Database(
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
     * Perform the common installation routine given an extracted addon temp directory.
     * Handles identifier resolution (from conf.yml if not provided), copying files,
     * exposing public assets, running migrations, and calling the install hook.
     */
    private function performAddonInstall(string $tempDir, ?string $identifier = null): Response
    {
        try {
            if (!defined('APP_ADDONS_DIR')) {
                define('APP_ADDONS_DIR', dirname(__DIR__, 3) . '/storage/addons');
            }
            if (!is_dir(APP_ADDONS_DIR) && !@mkdir(APP_ADDONS_DIR, 0755, true)) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Failed to prepare addons directory', 'ADDONS_DIR_CREATE_FAILED', 500);
            }

            $configFile = rtrim($tempDir, '/') . '/conf.yml';
            if (!file_exists($configFile)) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Invalid addon: missing conf.yml', 'ADDON_INVALID', 422);
            }

            if ($identifier === null) {
                try {
                    $conf = \Symfony\Component\Yaml\Yaml::parseFile($configFile);
                    $identifier = $conf['plugin']['identifier'] ?? null;
                } catch (\Throwable $t) {
                    @exec('rm -rf ' . escapeshellarg($tempDir));

                    return ApiResponse::error('Failed to parse conf.yml', 'ADDON_CONF_PARSE_FAILED', 422);
                }
            }

            if (!$identifier || !preg_match('/^[a-z0-9_\-]+$/', (string) $identifier)) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Invalid addon identifier in conf.yml', 'ADDON_IDENTIFIER_INVALID', 422);
            }

            $pluginDir = APP_ADDONS_DIR . '/' . $identifier;
            if (file_exists($pluginDir)) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Addon already installed', 'ADDON_EXISTS', 409);
            }
            if (!@mkdir($pluginDir, 0755, true)) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Failed to create addon directory', 'ADDON_DIR_FAILED', 500);
            }

            $copyCmd = sprintf('cp -r %s/* %s', escapeshellarg($tempDir), escapeshellarg($pluginDir));
            exec($copyCmd);
            @exec('rm -rf ' . escapeshellarg($tempDir));

            // Expose public assets at public/addons/{identifier} using ln -s (fallback to copy)
            $pluginPublic = $pluginDir . '/Public';
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

            // Expose Frontend/Components at public/components/{identifier} using ln -s (fallback to copy)
            $pluginComponents = $pluginDir . '/Frontend/Components';
            if (is_dir($pluginComponents)) {
                $publicComponentsBase = dirname(__DIR__, 3) . '/public/components';

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

            // Run migrations
            $migrationResult = $this->runAddonMigrations($identifier, $pluginDir);
            if ($migrationResult['failed'] > 0) {
                return ApiResponse::error('Addon migrations failed', 'ADDON_MIGRATION_FAILED', 422, [
                    'output' => implode("\n", $migrationResult['lines'] ?? []),
                ]);
            }

            // Optional: call plugin install hook if present
            $phpFiles = glob($pluginDir . '/*.php') ?: [];
            if (!empty($phpFiles)) {
                require_once $phpFiles[0];
                $className = basename($phpFiles[0], '.php');
                $namespace = 'App\\Addons\\' . $identifier;
                $full = $namespace . '\\' . $className;
                if (class_exists($full) && method_exists($full, 'pluginInstall')) {
                    $full::pluginInstall();
                }
            }

            return ApiResponse::success(['identifier' => $identifier], 'Addon installed successfully', 201);
        } catch (\Exception $e) {
            @exec('rm -rf ' . escapeshellarg($tempDir));

            return ApiResponse::error('Failed to finalize addon install: ' . $e->getMessage(), 500);
        }
    }
}
