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

namespace App\Plugins;

use App\App;

class PluginConfig
{
    public static function getRequired(): array
    {
        return [
            'name' => 'string',
            'identifier' => 'string',
            'description' => 'string',
            'flags' => 'array',
            'version' => 'string',
            'target' => 'string',
            'author' => 'array',
            'icon' => 'string',
            'dependencies' => 'array',
            'requiredConfigs' => 'array',
        ];
    }

    /**
     * Get optional plugin config fields and their expected types.
     *
     * @return array Optional fields with their types
     */
    public static function getOptional(): array
    {
        return [
            'plugin_cloud_id' => ['string', 'integer'],
            'minimum_panel_version' => 'string',
            'maximum_panel_version' => 'string',
        ];
    }

    /**
     * Check if the plugin config is valid.
     *
     * @param string $identifier The plugin identifier
     *
     * @return bool If the plugin identifier is valid
     */
    public static function isValidIdentifier(string $identifier): bool
    {
        App::getInstance(true)->getLogger()->debug('Checking identifier: ' . $identifier);
        if (empty($identifier)) {
            return false;
        }
        if (preg_match('/\s/', $identifier)) {
            return false;
        }
        if (preg_match('/^[a-zA-Z0-9_]+$/', $identifier) === 1) {
            App::getInstance(true)->getLogger()->debug('Plugin id is allowed: ' . $identifier);

            return true;
        }
        App::getInstance(true)->getLogger()->warning('Plugin id is not allowed: ' . $identifier);

        return false;
    }

    /**
     * Check if the plugin config is valid.
     *
     * @param array $config The plugin config
     *
     * @return bool If the plugin config is valid
     */
    public static function isConfigValid(array $config): bool
    {
        try {
            $app = App::getInstance(true);
            if (empty($config)) {
                $app->getLogger()->warning('Plugin config is empty.');

                return false;
            }

            $config_Requirements = self::getRequired();
            $config = $config['plugin'];

            if (!array_key_exists('identifier', $config)) {
                $app->getLogger()->warning('Missing identifier for plugin.');

                return false;
            }

            foreach ($config_Requirements as $key => $value) {
                if (!array_key_exists($key, $config)) {
                    $app->getLogger()->warning('Missing key for plugin: ' . $config['identifier'] . ' key: ' . $key);

                    return false;
                }

                if (gettype($config[$key]) !== $value) {
                    $app->getLogger()->warning('Invalid type for plugin: ' . $config['identifier'] . ' key: ' . $key);

                    return false;
                }
            }

            if (!PluginFlags::validFlags($config['flags'])) {
                $app->getLogger()->warning('Invalid flags for plugin: ' . $config['identifier']);

                return false;
            }

            if (self::isValidIdentifier($config['identifier']) == false) {
                $app->getLogger()->warning('Invalid identifier for plugin.');

                return false;
            }

            // Validate mixins if they exist
            if (isset($config['mixins']) && !self::validateMixins($config['mixins'], $config['identifier'])) {
                $app->getLogger()->warning('Invalid mixins configuration for plugin: ' . $config['identifier']);

                return false;
            }

            // Validate optional fields if they exist
            if (!self::validateOptionalFields($config, $config['identifier'])) {
                return false;
            }

            $app->getLogger()->debug('Done processing: ' . $config['name']);

            return true;
        } catch (\Exception $e) {
            $app->getLogger()->error('Error processing plugin config: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Get the mixins configuration for a plugin.
     *
     * @param string $identifier The plugin identifier
     *
     * @return array The mixins configuration
     */
    public static function getPluginMixinsConfig(string $identifier): array
    {
        $config = self::getConfig($identifier);

        return $config['mixins'] ?? [];
    }

    /**
     * Get the plugin config.
     *
     * @param string $identifier The plugin identifier
     *
     * @return array The plugin config
     */
    public static function getConfig(string $identifier): array
    {
        return PluginHelper::getPluginConfig($identifier);
    }

    /**
     * Get the required configuration fields for plugin admin setup.
     *
     * @param string $identifier The plugin identifier
     *
     * @return array The required config fields with their specifications
     */
    public static function getPluginRequiredAdminConfig(string $identifier): array
    {
        $config = self::getConfig($identifier);

        return $config['config'] ?? [];
    }

    /**
     * Validate a specific config value against its definition.
     *
     * @param array $configDef The config field definition
     * @param mixed $value The value to validate
     *
     * @return bool Whether the value is valid
     */
    public static function validateConfigValue(array $configDef, mixed $value): bool
    {
        // Handle nullable fields
        if ($value === null) {
            return $configDef['nullable'] ?? false;
        }

        // Validate type
        return match ($configDef['type']) {
            'string' => is_string($value),
            'integer', 'int' => is_int($value),
            'float', 'double' => is_float($value),
            'boolean', 'bool' => is_bool($value),
            'array' => is_array($value),
            default => false,
        };
    }

    /**
     * Validate the provided admin configuration against the required fields.
     *
     * @param string $identifier The plugin identifier
     * @param array $providedConfig The configuration to validate
     *
     * @return array Array with validation result and errors if any
     */
    public static function validateAdminConfig(string $identifier, array $providedConfig): array
    {
        $requiredConfig = self::getPluginRequiredAdminConfig($identifier);
        $errors = [];

        foreach ($requiredConfig as $field) {
            $fieldName = $field['name'];

            // Check if required field is provided
            if (!isset($providedConfig[$fieldName])) {
                if (!($field['nullable'] ?? false)) {
                    $errors[] = "Missing required field: {$fieldName}";
                }
                continue;
            }

            // Validate the value
            if (!self::validateConfigValue($field, $providedConfig[$fieldName])) {
                $errors[] = "Invalid value for field {$fieldName}: expected {$field['type']}";
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Get default values for plugin configuration.
     *
     * @param string $identifier The plugin identifier
     *
     * @return array The default configuration values
     */
    public static function getDefaultConfig(string $identifier): array
    {
        $requiredConfig = self::getPluginRequiredAdminConfig($identifier);
        $defaults = [];

        foreach ($requiredConfig as $field) {
            $defaults[$field['name']] = $field['default'] ?? null;
        }

        return $defaults;
    }

    /**
     * Get the plugin cloud ID (package manager ID).
     *
     * @param string $identifier The plugin identifier
     *
     * @return string|int|null The plugin cloud ID or null if not set
     */
    public static function getPluginCloudId(string $identifier): string | int | null
    {
        $config = self::getConfig($identifier);
        $pluginConfig = $config['plugin'] ?? [];

        return $pluginConfig['plugin_cloud_id'] ?? null;
    }

    /**
     * Get the minimum panel version requirement.
     *
     * @param string $identifier The plugin identifier
     *
     * @return string|null The minimum panel version or null if not set
     */
    public static function getMinimumPanelVersion(string $identifier): ?string
    {
        $config = self::getConfig($identifier);
        $pluginConfig = $config['plugin'] ?? [];

        return $pluginConfig['minimum_panel_version'] ?? null;
    }

    /**
     * Get the maximum panel version requirement.
     *
     * @param string $identifier The plugin identifier
     *
     * @return string|null The maximum panel version or null if not set
     */
    public static function getMaximumPanelVersion(string $identifier): ?string
    {
        $config = self::getConfig($identifier);
        $pluginConfig = $config['plugin'] ?? [];

        return $pluginConfig['maximum_panel_version'] ?? null;
    }

    /**
     * Get the current panel version (without 'v' prefix).
     *
     * @return string The current panel version
     */
    public static function getCurrentPanelVersion(): string
    {
        $version = defined('APP_VERSION') ? APP_VERSION : '0.0.0';

        // Remove 'v' prefix if present
        return ltrim($version, 'vV');
    }

    /**
     * Check if the current panel version is compatible with the plugin's version requirements.
     *
     * @param string $identifier The plugin identifier
     *
     * @return array Array with 'compatible' boolean and 'message' string
     */
    public static function isPanelVersionCompatible(string $identifier): array
    {
        $minVersion = self::getMinimumPanelVersion($identifier);
        $maxVersion = self::getMaximumPanelVersion($identifier);

        // If no version requirements, always compatible
        if ($minVersion === null && $maxVersion === null) {
            return [
                'compatible' => true,
                'message' => null,
            ];
        }

        $currentVersion = self::getCurrentPanelVersion();
        $normalizeVersion = static function (string $version): string {
            return ltrim($version, 'vV');
        };

        $currentNormalized = $normalizeVersion($currentVersion);

        // Check minimum version
        if ($minVersion !== null) {
            $minNormalized = $normalizeVersion($minVersion);
            if (version_compare($currentNormalized, $minNormalized, '<')) {
                return [
                    'compatible' => false,
                    'message' => "Requires panel version {$minVersion} or higher (current: {$currentVersion})",
                ];
            }
        }

        // Check maximum version
        if ($maxVersion !== null) {
            $maxNormalized = $normalizeVersion($maxVersion);
            if (version_compare($currentNormalized, $maxNormalized, '>')) {
                return [
                    'compatible' => false,
                    'message' => "Requires panel version {$maxVersion} or lower (current: {$currentVersion})",
                ];
            }
        }

        return [
            'compatible' => true,
            'message' => null,
        ];
    }

    /**
     * Validate optional plugin config fields.
     *
     * @param array $config The plugin config
     * @param string $pluginIdentifier The plugin identifier
     *
     * @return bool True if valid, false otherwise
     */
    private static function validateOptionalFields(array $config, string $pluginIdentifier): bool
    {
        try {
            $app = App::getInstance(true);
            $logger = $app->getLogger();
            $optionalFields = self::getOptional();

            foreach ($optionalFields as $field => $expectedTypes) {
                if (!isset($config[$field])) {
                    continue;
                }

                $value = $config[$field];
                $isValid = false;

                // Handle fields that can be multiple types
                if (is_array($expectedTypes)) {
                    foreach ($expectedTypes as $type) {
                        if (self::validateType($value, $type)) {
                            $isValid = true;
                            break;
                        }
                    }
                } else {
                    $isValid = self::validateType($value, $expectedTypes);
                }

                if (!$isValid) {
                    $expectedTypeStr = is_array($expectedTypes) ? implode(' or ', $expectedTypes) : $expectedTypes;
                    $logger->warning("Invalid type for optional field '{$field}' in plugin: {$pluginIdentifier}. Expected: {$expectedTypeStr}");

                    return false;
                }

                // Additional validation for version fields
                if ($field === 'minimum_panel_version' || $field === 'maximum_panel_version') {
                    if (!self::isValidVersionFormat($value)) {
                        $logger->warning("Invalid version format for '{$field}' in plugin: {$pluginIdentifier}. Value: {$value}");

                        return false;
                    }
                }

                // Additional validation for plugin_cloud_id
                if ($field === 'plugin_cloud_id') {
                    if (is_string($value) && empty(trim($value))) {
                        $logger->warning("plugin_cloud_id cannot be empty in plugin: {$pluginIdentifier}");

                        return false;
                    }
                    if (is_int($value) && $value <= 0) {
                        $logger->warning("plugin_cloud_id must be a positive integer in plugin: {$pluginIdentifier}");

                        return false;
                    }
                }
            }

            // Validate version range if both are present
            if (isset($config['minimum_panel_version']) && isset($config['maximum_panel_version'])) {
                if (version_compare($config['minimum_panel_version'], $config['maximum_panel_version'], '>')) {
                    $logger->warning("minimum_panel_version cannot be greater than maximum_panel_version in plugin: {$pluginIdentifier}");

                    return false;
                }
            }

            return true;
        } catch (\Exception $e) {
            $app->getLogger()->error('Error validating optional fields: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Validate a value against an expected type.
     *
     * @param mixed $value The value to validate
     * @param string $type The expected type
     *
     * @return bool True if valid, false otherwise
     */
    private static function validateType(mixed $value, string $type): bool
    {
        return match ($type) {
            'string' => is_string($value),
            'integer', 'int' => is_int($value),
            'float', 'double' => is_float($value),
            'boolean', 'bool' => is_bool($value),
            'array' => is_array($value),
            default => false,
        };
    }

    /**
     * Validate version format (semantic versioning).
     *
     * @param string $version The version string
     *
     * @return bool True if valid format, false otherwise
     */
    private static function isValidVersionFormat(string $version): bool
    {
        // Basic semantic version validation (e.g., 2.0.0, 2.1.0-beta, 2.0.0-alpha.1)
        return (bool) preg_match('/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$/', $version);
    }

    /**
     * Validate mixins configuration.
     *
     * @param array $mixins The mixins configuration
     * @param string $pluginIdentifier The plugin identifier
     *
     * @return bool True if valid, false otherwise
     */
    private static function validateMixins(array $mixins, string $pluginIdentifier): bool
    {
        try {
            $app = App::getInstance(true);
            $logger = $app->getLogger();

            // Mixins must be defined as an associative array
            foreach ($mixins as $mixinId => $mixinConfig) {
                if (!is_string($mixinId)) {
                    $logger->warning("Mixin identifier must be a string in plugin: {$pluginIdentifier}");

                    return false;
                }

                // If mixin config is provided, it must be an array
                if ($mixinConfig !== null && !is_array($mixinConfig)) {
                    $logger->warning("Mixin configuration must be an array in plugin: {$pluginIdentifier}, mixin: {$mixinId}");

                    return false;
                }
            }

            return true;
        } catch (\Exception $e) {
            $app->getLogger()->error('Error validating mixins: ' . $e->getMessage());

            return false;
        }
    }
}
