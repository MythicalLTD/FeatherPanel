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

use App\App;
use App\Helpers\ApiResponse;
use App\Plugins\PluginFlags;
use App\Plugins\PluginConfig;
use App\Plugins\PluginHelper;
use App\Config\ConfigInterface;
use App\Plugins\PluginSettings;
use Symfony\Component\Yaml\Yaml;
use App\Plugins\PluginDependencies;
use App\Plugins\PluginRequiredConfigs;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class PluginManagerController
{
    private string $pluginsDir;
    private array $directories = ['Migrations', 'Cron', 'Commands', 'Events', 'Public', 'Frontend'];

    public function __construct()
    {
        $this->pluginsDir = PluginHelper::getPluginsDir();
    }

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
            foreach ($this->directories as $dir) {
                $dirPath = $pluginPath . '/' . $dir;
                if (!is_dir($dirPath)) {
                    mkdir($dirPath, 0755, true);
                    file_put_contents($dirPath . '/.gitkeep', '');
                    if ($dir === 'Events') {
                        mkdir($dirPath . '/App', 0755, true);
                        file_put_contents($dirPath . '/App/.gitkeep', '');
                    }
                }
            }

            // Create example files
            $this->createExampleFiles($pluginPath, $identifier, $className);

            // Create public assets symlink (like PluginsController does)
            $this->createPublicAssetsSymlink($pluginPath, $identifier);

            // Run migrations (like PluginsController does)
            $migrationResult = $this->runAddonMigrations($identifier, $pluginPath);

            // Call plugin install hook if present (like PluginsController does)
            $this->callPluginInstallHook($pluginPath, $identifier, $className);

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
use App\\Plugins\\AppPlugin;
use App\\Addons\\{$identifier}\\Events\\App\\AppReadyEvent;

class {$className} implements AppPlugin
{
    /**
     * @inheritDoc
     */
    public static function processEvents(\\App\\Plugins\\PluginEvents \$event): void
    {
        \$event->on(AppEvent::onRouterReady(), function (\$eventInstance) {
            new AppReadyEvent(\$eventInstance);
        });
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

class {$className}Example implements TimeTask
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
            'dashboard' => [
                '/overview' => [
                    'name' => "Overview {$className}",
                    'icon' => '📊',
                    'js' => "if (window.{$className}Plugin) { window.{$className}Plugin.showDashboard(); } else { console.log('{$className} plugin not loaded'); }",
                    'description' => "View a summary of your plugin's data",
                    'category' => 'general',
                ],
                '/analytics' => [
                    'name' => "Analytics {$className}",
                    'icon' => '📈',
                    'js' => "if (window.{$className}Plugin) { window.{$className}Plugin.showAnalytics(); } else { console.log('{$className} plugin not loaded'); }",
                    'description' => 'View plugin analytics and statistics',
                    'category' => 'general',
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
                '/users' => [
                    'name' => "User Management {$className}",
                    'icon' => '👥',
                    'js' => "if (window.{$className}Plugin) { window.{$className}Plugin.showUserManagement(); } else { console.log('{$className} plugin not loaded'); }",
                    'description' => 'Manage users for this plugin',
                    'category' => 'admin',
                    'permission' => 'admin.plugin.users',
                ],
            ],
            'server' => [
                '/logs' => [
                    'name' => "Server Logs {$className}",
                    'icon' => '📝',
                    'js' => "if (window.{$className}Plugin) { window.{$className}Plugin.showServerLogs(); } else { console.log('{$className} plugin not loaded'); }",
                    'description' => 'View server logs related to the plugin',
                    'category' => 'server',
                ],
                '/tasks' => [
                    'name' => "Scheduled Tasks {$className}",
                    'icon' => '⏰',
                    'js' => "if (window.{$className}Plugin) { window.{$className}Plugin.showScheduledTasks(); } else { console.log('{$className} plugin not loaded'); }",
                    'description' => 'Manage scheduled tasks for the plugin',
                    'category' => 'server',
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
- **Database Migrations**: Creates plugin-specific tables with proper naming
- **Cron Jobs**: Runs scheduled tasks every hour
- **CLI Commands**: Provides command-line interface
- **Frontend Assets**: Includes CSS, JS, and sidebar configuration

## Files created
- `{$className}.php` - Main plugin class
- `conf.yml` - Plugin configuration with enhanced schema
- `migrations/{timestamp}-create-{$identifier}-logs.sql` - Database migration with proper naming
- `cron/ExampleCron.php` - Hourly heartbeat cron job
- `Commands/{$className}Command.php` - CLI command
- `Frontend/index.css` - Plugin styling
- `Frontend/index.js` - Frontend JavaScript with modal system
- `Frontend/sidebar.json` - Sidebar configuration for all sections

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

## How to use
1. **Dashboard**: Click sidebar buttons in dashboard to see user-facing modals
2. **Admin**: Access admin sections to see admin panel integration
3. **Server**: Check server sections for monitoring and logs
4. **Cron**: The cron job runs automatically every hour
5. **CLI**: Use the command: `php cli.php {$className}`

## Migration Naming
Migrations use timestamp format `YYYY-MM-DD-HH.MM-description.sql` to avoid conflicts with other plugins and the main system.

This is a safe, comprehensive example that demonstrates all FeatherPanel plugin capabilities!";

        $publicFileTemplate = "Hi, 
i am a public file :D 
just make sure to install me via the plugin interface :D
not the plugin manager hence that won't add the symlinks!";

        $appReadyEvent = "<?php

namespace App\Addons\\{$identifier}\\Events\App;

use Symfony\Component\Routing\Route;
use App\Middleware\AuthMiddleware;
use Symfony\Component\HttpFoundation\Response;

class AppReadyEvent
{
	public function __construct(\$router) 
	{
		\$router->add('{$identifier}-settings', new Route(
            '/api/{$identifier}-settings',
            [
                '_controller' => function (\$request, \$parameters) {
                    return new Response('Hello, world!', 200, ['Content-Type' => 'text/plain']);
                },
                '_middleware' => [
                    AuthMiddleware::class,
                ],
                '_permission' => 'admin.plugin.settings',
            ],
            [], // requirements
            [], // options
            '', // host
            [], // schemes
            ['GET']
        ));
    }
}";

        file_put_contents($pluginPath . '/README.md', $readmeContent);
        file_put_contents($pluginPath . '/Commands/' . $className . 'Command.php', $cliCommandExample);
        file_put_contents($pluginPath . '/Frontend/index.css', $frontendCssExample);
        file_put_contents($pluginPath . '/Frontend/index.js', $frontendJsExample);
        file_put_contents($pluginPath . '/Frontend/sidebar.json', $frontendSideBarExample);
        file_put_contents($pluginPath . '/Migrations/' . $timestamp . '-create-' . $identifier . '-logs.sql', $migrationContent);
        file_put_contents($pluginPath . '/Cron/ExampleCron.php', $cronContent);
        file_put_contents($pluginPath . '/Public/hello.txt', $publicFileTemplate);
        file_put_contents($pluginPath . '/Events/App/AppReadyEvent.php', $appReadyEvent);
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
}
