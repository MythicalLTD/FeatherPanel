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

namespace App\Controllers\Admin;

use App\Helpers\ApiResponse;
use App\Plugins\PluginFlags;
use App\Plugins\PluginConfig;
use App\Plugins\PluginHelper;
use App\Plugins\PluginSettings;
use Symfony\Component\Yaml\Yaml;
use App\Plugins\PluginDependencies;
use App\Plugins\PluginRequiredConfigs;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class PluginManagerController
{
    private string $pluginsDir;

    public function __construct()
    {
        $this->pluginsDir = PluginHelper::getPluginsDir();
    }

    public function getPlugins(Request $request): Response
    {
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
                    $plugin['files'] = $this->getPluginFiles($pluginDir);
                    $plugin['config'] = $config['config'] ?? [];
                    $plugins[] = $plugin;
                }
            }

            return ApiResponse::success($plugins, 'Plugins fetched successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to fetch plugins: ' . $e->getMessage(), 500);
        }
    }

    public function createPlugin(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);

            $identifier = $data['identifier'] ?? '';
            $name = $data['name'] ?? '';
            $description = $data['description'] ?? '';
            $version = $data['version'] ?? '1.0.0';
            $author = $data['author'] ?? [];
            $flags = $data['flags'] ?? [];
            $dependencies = $data['dependencies'] ?? [];
            $requiredConfigs = $data['requiredConfigs'] ?? [];
            $configSchema = $data['configSchema'] ?? [];

            if (empty($identifier) || empty($name)) {
                return ApiResponse::error('Identifier and name are required', 400);
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
            $phpContent = $this->generatePluginClass($className, $identifier);
            file_put_contents($pluginPath . '/' . $className . '.php', $phpContent);

            // Create directories for different plugin assets
            $directories = ['Migrations','Cron', 'Commands', 'Events', 'Public'];
            foreach ($directories as $dir) {
                $dirPath = $pluginPath . '/' . $dir;
                if (!is_dir($dirPath)) {
                    mkdir($dirPath, 0755, true);
                    file_put_contents($dirPath . '/.gitkeep', '');
                }
            }

            // Create example files
            $this->createExampleFiles($pluginPath, $identifier, $className);

            return ApiResponse::success([
                'identifier' => $identifier,
                'path' => $pluginPath,
                'files_created' => $this->getPluginFiles($identifier),
            ], 'Plugin created successfully', 201);

        } catch (\Exception $e) {
            return ApiResponse::error('Failed to create plugin: ' . $e->getMessage(), 500);
        }
    }

    public function updatePlugin(Request $request): Response
    {
        try {
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

            return ApiResponse::success([
                'identifier' => $identifier,
                'config' => $pluginConfig,
            ], 'Plugin updated successfully', 200);

        } catch (\Exception $e) {
            return ApiResponse::error('Failed to update plugin: ' . $e->getMessage(), 500);
        }
    }

    public function getPluginDetails(Request $request): Response
    {
        try {
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

    public function updatePluginSettings(Request $request): Response
    {
        try {
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

            return ApiResponse::success([
                'identifier' => $identifier,
                'updated_settings' => array_keys($data['settings']),
            ], 'Plugin settings updated successfully', 200);

        } catch (\Exception $e) {
            return ApiResponse::error('Failed to update plugin settings: ' . $e->getMessage(), 500);
        }
    }

    public function getAvailableFlags(Request $request): Response
    {
        try {
            $flags = PluginFlags::getFlags();

            return ApiResponse::success($flags, 'Available flags fetched successfully', 200);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to fetch flags: ' . $e->getMessage(), 500);
        }
    }

    public function validatePlugin(Request $request): Response
    {
        try {
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

    private function generatePluginClass(string $className, string $identifier): string
    {
        return "<?php

namespace App\\Addons\\{$identifier};

use App\\Plugins\\Events\\Events\\AppEvent;
use App\\Plugins\\Events\\Events\\AuthEvent;
use App\\Plugins\\AppPlugin;

class {$className} implements AppPlugin
{
    /**
     * @inheritDoc
     */
    public static function processEvents(\\App\\Plugins\\PluginEvents \$event): void
    {
        // Process plugin events here
        // Example: \$event->on('app.boot', function() { ... });
    }

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
    public static function pluginUninstall(): void
    {
        // Plugin uninstallation logic
        // Clean up tables, files, etc.
    }
}";
    }

    private function createExampleFiles(string $pluginPath, string $identifier, string $className): void
    {
        // Create README
        $readmeContent = "# {$className} Plugin

## Description
This is an example plugin created with FeatherPanel Plugin Manager.

## Features
- Event handling
- Database migrations
- Cron jobs
- Asset management

## Installation
This plugin is automatically installed when created.

## Configuration
Configure this plugin through the Plugin Manager interface.

## Files
- `{$className}.php` - Main plugin class
- `conf.yml` - Plugin configuration
- `migrations/` - Database migrations
- `cron/` - Cron job files
- `assets/` - CSS, JS, and other assets
- `views/` - Template files
- `routes/` - Custom routes

## Events
This plugin can listen to various FeatherPanel events.

## Dependencies
Check the `conf.yml` file for required dependencies.
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
}
