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

use App\App;
use App\Chat\Activity;
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
    schema: 'UrlInstall',
    type: 'object',
    required: ['url'],
    properties: [
        new OA\Property(property: 'url', type: 'string', description: 'URL to download addon from', format: 'uri'),
    ]
)]
class PluginsController
{
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
                    App::getInstance(true)->getLogger()->error('Plugin uninstall hook failed for ' . $identifier . ': ' . $e->getMessage());
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
            $pwd = CloudPluginsController::PASSWORD;

            // Parse .featherexport file for exclusions
            $exclusions = $this->parseFeatherExportIgnore($pluginDir);

            // Always exclude .featherexport itself from the export
            $exclusions[] = '.featherexport';

            // Build zip command with exclusions
            $zipCmd = sprintf(
                'cd %s && zip -r -P %s %s *',
                escapeshellarg($pluginDir),
                escapeshellarg($pwd),
                escapeshellarg($exportFile)
            );

            // Add exclusion patterns
            if (!empty($exclusions)) {
                $exclusionArgs = [];
                foreach ($exclusions as $pattern) {
                    // Escape the pattern for shell but preserve glob characters
                    $exclusionArgs[] = escapeshellarg($pattern);
                }
                if (!empty($exclusionArgs)) {
                    $zipCmd = sprintf(
                        'cd %s && zip -r -P %s %s * -x %s',
                        escapeshellarg($pluginDir),
                        escapeshellarg($pwd),
                        escapeshellarg($exportFile),
                        implode(' -x ', $exclusionArgs)
                    );
                }
            }

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
            $pwd = CloudPluginsController::PASSWORD;
            $unzipCommand = sprintf('unzip -P %s %s -d %s', escapeshellarg($pwd), escapeshellarg($tempFile), escapeshellarg($tempDir));
            exec($unzipCommand, $out, $code);
            @unlink($tempFile);
            if ($code !== 0) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Failed to extract addon package', 'ADDON_EXTRACT_FAILED', 422);
            }

            return CloudPluginsController::getInstance()->performAddonInstall($tempDir, null);
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
            $pwd = CloudPluginsController::PASSWORD;
            $unzipCommand = sprintf('unzip -P %s %s -d %s', escapeshellarg($pwd), escapeshellarg($tempFile), escapeshellarg($tempDir));
            exec($unzipCommand, $out, $code);
            @unlink($tempFile);
            if ($code !== 0) {
                @exec('rm -rf ' . escapeshellarg($tempDir));

                return ApiResponse::error('Failed to extract addon package', 'ADDON_EXTRACT_FAILED', 422);
            }

            return CloudPluginsController::getInstance()->performAddonInstall($tempDir, null);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to install from URL: ' . $e->getMessage(), 500);
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
    /**
     * Parse .featherexport file to get exclusion patterns.
     * Supports comments (lines starting with #), blank lines, and glob patterns.
     *
     * @return array<string> Array of exclusion patterns
     */
    private function parseFeatherExportIgnore(string $pluginDir): array
    {
        $ignoreFile = rtrim($pluginDir, '/') . '/.featherexport';
        if (!file_exists($ignoreFile)) {
            return [];
        }

        $patterns = [];
        $lines = file($ignoreFile, FILE_IGNORE_NEW_LINES);
        if ($lines === false) {
            return [];
        }

        foreach ($lines as $line) {
            // Trim whitespace
            $line = trim($line);

            // Skip empty lines and comments
            if ($line === '' || strpos($line, '#') === 0) {
                continue;
            }

            // Remove inline comments
            $commentPos = strpos($line, '#');
            if ($commentPos !== false) {
                $line = trim(substr($line, 0, $commentPos));
            }

            if ($line !== '') {
                $patterns[] = $line;
            }
        }

        return $patterns;
    }
}
