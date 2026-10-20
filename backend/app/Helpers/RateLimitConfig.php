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

namespace App\Helpers;

use App\App;
use RateLimit\Rate;

class RateLimitConfig
{
    /**
     * Namespaces whose code default (e.g. Rate::perMinute(10) on the login
     * route) is enforced even without a matching ratelimit.json entry.
     *
     * Deliberately limited to authentication, public webhooks and API-client
     * endpoints - the brute-force and abuse targets. Other routes stay opt-in
     * as before, so a running installation does not suddenly answer HTTP 429
     * on busy UI polling routes.
     */
    private const DEFAULT_ENFORCED_NAMESPACES = [
        'user-auth',
        'user-auth-verify-email',
        'user-api-clients',
        'user-api-clients-validate',
        'public-webhooks',
    ];
    private static ?array $config = null;
    /** mtime/size of the config file when it was loaded, to notice edits by other processes. */
    private static ?string $configSignature = null;
    private static string $configPath = __DIR__ . '/../../storage/config/ratelimit.json';

    /**
     * Get the config file path.
     *
     * @return string The absolute path to the config file
     */
    public static function getConfigPath(): string
    {
        return self::$configPath;
    }

    /**
     * Check if rate limiting is globally enabled.
     *
     * @return bool True if rate limiting is globally enabled
     */
    public static function isGloballyEnabled(): bool
    {
        $config = self::loadConfig();

        // Check global _enabled flag. An explicit value wins (installs that
        // deliberately switched rate limiting off keep it off); without the
        // flag rate limiting is now ON, because an "opt-in" default left the
        // login/2FA limits inactive on every untouched installation.
        if (isset($config['_enabled'])) {
            return $config['_enabled'] === true;
        }

        return true;
    }

    /**
     * Get the rate limit configuration for a specific route.
     * Rate limits are OPT-IN only - they must be explicitly enabled in config.
     *
     * @param string $routeName The name of the route
     * @param Rate|null $defaultRate The default rate limit (ignored - only used for auto-population)
     * @param string|null $defaultNamespace The default namespace if not configured (optional)
     *
     * @return array|null Returns ['rate' => Rate, 'namespace' => string] or null if not configured/enabled
     */
    public static function getRateLimit(string $routeName, ?Rate $defaultRate = null, ?string $defaultNamespace = null): ?array
    {
        // Check global enable flag first
        if (!self::isGloballyEnabled()) {
            return null;
        }

        $config = self::loadConfig();

        // Check if route has custom configuration
        if (isset($config['routes'][$routeName])) {
            $routeConfig = $config['routes'][$routeName];

            // Rate limiting is OPT-IN only
            // Check if explicitly enabled: _enabled must be true OR (for backward compatibility) if values exist without _enabled flag
            $hasValues = isset($routeConfig['per_second'])
                         || isset($routeConfig['per_minute'])
                         || isset($routeConfig['per_hour'])
                         || isset($routeConfig['per_day']);

            // Individual routes are enabled by default if they have values
            // If _enabled is explicitly set, use that value
            // If _enabled is not set but values exist, enable it (default behavior)
            // If _enabled is explicitly false, disable it
            $isEnabled = isset($routeConfig['_enabled'])
                ? $routeConfig['_enabled'] === true
                : $hasValues; // Default: if no _enabled flag but has values, enable it

            // Only return config if enabled
            if (!$isEnabled || !$hasValues) {
                // An explicit per-route `_enabled: false` stays an admin decision.
                if (isset($routeConfig['_enabled']) && $routeConfig['_enabled'] === false) {
                    return null;
                }

                return self::defaultRateFor($defaultRate, $defaultNamespace, $routeConfig);
            }

            $rate = self::parseRateConfig($routeConfig);

            if ($rate !== null) {
                return [
                    'rate' => $rate,
                    'namespace' => $routeConfig['namespace'] ?? $defaultNamespace ?? 'rate_limit',
                ];
            }
        }

        return self::defaultRateFor($defaultRate, $defaultNamespace);
    }

    /**
     * Check if a route exists in the configuration.
     *
     * @param string $routeName The route name
     *
     * @return bool True if route exists in config
     */
    public static function routeExistsInConfig(string $routeName): bool
    {
        $config = self::loadConfig();

        return isset($config['routes'][$routeName]);
    }

    /**
     * Convert a Rate object to configuration format.
     *
     * @param Rate $rate The Rate object
     *
     * @return array|null Returns config array or null if invalid
     */
    public static function rateToConfig(Rate $rate): ?array
    {
        // Use reflection to get the rate values
        try {
            $reflection = new \ReflectionClass($rate);
            $operationsProperty = $reflection->getProperty('operations');
            $operations = $operationsProperty->getValue($rate);

            $intervalProperty = $reflection->getProperty('interval');
            $interval = $intervalProperty->getValue($rate);

            // Convert interval (in seconds) to appropriate config key
            $config = [];
            if ($interval === 1) {
                $config['per_second'] = $operations;
            } elseif ($interval === 60) {
                $config['per_minute'] = $operations;
            } elseif ($interval === 3600) {
                $config['per_hour'] = $operations;
            } elseif ($interval === 86400) {
                $config['per_day'] = $operations;
            } else {
                // Fallback: try to determine the best match
                if ($interval < 60) {
                    $config['per_second'] = (int) ($operations / $interval);
                } elseif ($interval < 3600) {
                    $config['per_minute'] = (int) ($operations / ($interval / 60));
                } elseif ($interval < 86400) {
                    $config['per_hour'] = (int) ($operations / ($interval / 3600));
                } else {
                    $config['per_day'] = (int) ($operations / ($interval / 86400));
                }
            }

            return $config;
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to convert Rate to config: ' . $e->getMessage());

            return null;
        }
    }

    /**
     * Get rate limit configuration or return default.
     * This is a convenience method that always returns a rate limit config.
     *
     * @param string $routeName The name of the route
     * @param Rate $defaultRate The default rate limit to use if not configured
     * @param string|null $defaultNamespace The default namespace
     *
     * @return array Returns ['rate' => Rate, 'namespace' => string]
     */
    public static function getRateLimitOrDefault(string $routeName, Rate $defaultRate, ?string $defaultNamespace = null): array
    {
        $config = self::getRateLimit($routeName, $defaultRate, $defaultNamespace);

        // This should never be null because we pass a default, but just in case
        return $config ?? [
            'rate' => $defaultRate,
            'namespace' => $defaultNamespace ?? 'rate_limit',
        ];
    }

    /**
     * Reload the configuration (useful after admin updates).
     */
    public static function reloadConfig(): void
    {
        self::$config = null;
        self::loadConfig();
    }

    /**
     * Get all route configurations.
     *
     * @return array All route rate limit configurations
     */
    public static function getAllConfigs(): array
    {
        $config = self::loadConfig();

        // Do not manufacture `_enabled: false` when the key is absent - callers
        // that need the effective flag should use isGloballyEnabled().
        if (!isset($config['routes'])) {
            $config['routes'] = [];
        }

        return $config;
    }

    /**
     * Update rate limit configuration for a route.
     * Automatically creates the file and directory if they don't exist.
     *
     * @param string $routeName The route name
     * @param array $config The configuration array
     *
     * @return bool True if successful
     */
    public static function updateRouteConfig(string $routeName, array $config): bool
    {
        // Force reload from file to get latest state (don't use cache)
        self::reloadConfig();

        // Load config (this will create file if it doesn't exist)
        $allConfig = self::loadConfig();

        // Preserve an explicit `_enabled` only when it was set; do not invent false.
        $hasExplicitEnabled = array_key_exists('_enabled', $allConfig);
        $existingEnabled = $hasExplicitEnabled ? $allConfig['_enabled'] : null;
        $existingExplicitMarker = $allConfig['_enabled_explicit'] ?? null;

        // Ensure routes key exists
        if (!isset($allConfig['routes'])) {
            $allConfig['routes'] = [];
        }

        $allConfig['routes'][$routeName] = $config;

        try {
            $dir = dirname(self::$configPath);

            // Ensure directory exists
            if (!is_dir($dir)) {
                if (!mkdir($dir, 0755, true)) {
                    App::getInstance(true)->getLogger()->error('Failed to create rate limit config directory: ' . $dir);

                    return false;
                }
            }

            // Ensure directory is writable
            if (!is_writable($dir)) {
                App::getInstance(true)->getLogger()->error('Rate limit config directory is not writable: ' . $dir);

                return false;
            }

            // Ensure file exists (create if it doesn't)
            if (!file_exists(self::$configPath)) {
                self::createDefaultConfig();
                // Reload to get the default structure
                self::reloadConfig();
                $allConfig = self::loadConfig();
                $hasExplicitEnabled = array_key_exists('_enabled', $allConfig);
                $existingEnabled = $hasExplicitEnabled ? $allConfig['_enabled'] : null;
                $existingExplicitMarker = $allConfig['_enabled_explicit'] ?? null;
                if (!isset($allConfig['routes'])) {
                    $allConfig['routes'] = [];
                }
                $allConfig['routes'][$routeName] = $config;
            }

            // Ensure file is writable
            if (!is_writable(self::$configPath)) {
                App::getInstance(true)->getLogger()->error('Rate limit config file is not writable: ' . self::$configPath);

                return false;
            }

            if ($hasExplicitEnabled) {
                $allConfig['_enabled'] = $existingEnabled;
            } else {
                unset($allConfig['_enabled']);
            }
            if ($existingExplicitMarker !== null) {
                $allConfig['_enabled_explicit'] = $existingExplicitMarker;
            }

            // Write the updated config with preserved explicit _enabled (if any)
            $result = file_put_contents(
                self::$configPath,
                json_encode($allConfig, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n",
                LOCK_EX
            );

            if ($result !== false) {
                // Set proper permissions
                chmod(self::$configPath, 0644);
                self::reloadConfig();

                return true;
            }
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to update rate limit config: ' . $e->getMessage());
        }

        return false;
    }

    /**
     * Load the rate limit configuration from JSON file.
     *
     * @return array The configuration array
     */
    /**
     * Drop the cached config when the file changed since it was loaded (an
     * admin edit handled by another worker or php-fpm process). Called once
     * per request; costs one stat().
     */
    public static function refreshIfChanged(): void
    {
        if (self::$config !== null && self::fileSignature() !== self::$configSignature) {
            self::$config = null;
        }
    }

    /**
     * Resolve the developer default for namespaces that are enforced without
     * a config entry.
     *
     * @param array<string, mixed> $routeConfig Existing (but disabled/empty) route entry, if any
     *
     * @return array{rate: Rate, namespace: string}|null
     */
    private static function defaultRateFor(?Rate $defaultRate, ?string $defaultNamespace, array $routeConfig = []): ?array
    {
        if (!$defaultRate instanceof Rate) {
            return null;
        }

        $namespace = (string) ($routeConfig['namespace'] ?? $defaultNamespace ?? 'rate_limit');

        if (!in_array($namespace, self::DEFAULT_ENFORCED_NAMESPACES, true)) {
            return null;
        }

        return [
            'rate' => $defaultRate,
            'namespace' => $namespace,
        ];
    }

    private static function fileSignature(): string
    {
        clearstatcache(true, self::$configPath);
        $mtime = @filemtime(self::$configPath);
        $size = @filesize(self::$configPath);

        return $mtime === false ? 'missing' : $mtime . ':' . (int) $size;
    }

    private static function loadConfig(): array
    {
        if (self::$config !== null) {
            return self::$config;
        }

        self::$configSignature = self::fileSignature();

        // Absent `_enabled` means enabled-by-default (see isGloballyEnabled()).
        self::$config = [
            'routes' => [],
        ];

        if (!file_exists(self::$configPath)) {
            // Create default config file if it doesn't exist
            self::createDefaultConfig();

            return self::$config;
        }

        try {
            $content = file_get_contents(self::$configPath);
            if ($content === false) {
                App::getInstance(true)->getLogger()->warning('Failed to read rate limit config file');

                return self::$config;
            }

            $decoded = json_decode($content, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                App::getInstance(true)->getLogger()->error('Invalid JSON in rate limit config: ' . json_last_error_msg());

                return self::$config;
            }

            // Do not inject `_enabled: false` when missing - leave the key absent
            // so isGloballyEnabled() can apply enabled-by-default.
            if (!isset($decoded['routes'])) {
                $decoded['routes'] = [];
            }

            self::$config = self::migrateAutoWrittenDisabledFlag($decoded);
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Error loading rate limit config: ' . $e->getMessage());
        }

        return self::$config;
    }

    /**
     * One-time migration: older createDefaultConfig() auto-wrote `_enabled: false`
     * without an admin opt-out marker. Those values are cleared so the new
     * enabled-by-default behaviour applies. Deliberate admin toggles set
     * `_enabled_explicit` and are left alone.
     *
     * @param array<string, mixed> $config
     *
     * @return array<string, mixed>
     */
    private static function migrateAutoWrittenDisabledFlag(array $config): array
    {
        if (!empty($config['_enabled_explicit'])) {
            return $config;
        }

        if (!array_key_exists('_enabled', $config) || $config['_enabled'] !== false) {
            return $config;
        }

        unset($config['_enabled']);
        $config['_enabled_migrated'] = true;

        try {
            $dir = dirname(self::$configPath);
            if (is_dir($dir) && is_writable($dir) && (is_writable(self::$configPath) || !file_exists(self::$configPath))) {
                file_put_contents(
                    self::$configPath,
                    json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n",
                    LOCK_EX
                );
            }
        } catch (\Throwable $e) {
            // Migration is best-effort; in-memory config still has the flag cleared.
        }

        return $config;
    }

    /**
     * Parse rate configuration from config array.
     *
     * @param array $config The route configuration
     *
     * @return Rate|null The Rate object or null if invalid
     */
    private static function parseRateConfig(array $config): ?Rate
    {
        // Support multiple formats:
        // 1. { "per_second": 10 }
        // 2. { "per_minute": 60 }
        // 3. { "per_hour": 1000 }
        // 4. { "per_day": 10000 }
        // 5. { "rate": 60, "unit": "minute" }

        if (isset($config['per_second'])) {
            return Rate::perSecond((int) $config['per_second']);
        }

        if (isset($config['per_minute'])) {
            return Rate::perMinute((int) $config['per_minute']);
        }

        if (isset($config['per_hour'])) {
            return Rate::perHour((int) $config['per_hour']);
        }

        if (isset($config['per_day'])) {
            return Rate::perDay((int) $config['per_day']);
        }

        // Legacy format: { "rate": 60, "unit": "minute" }
        if (isset($config['rate']) && isset($config['unit'])) {
            $rate = (int) $config['rate'];
            $unit = strtolower($config['unit']);

            return match ($unit) {
                'second', 'seconds' => Rate::perSecond($rate),
                'minute', 'minutes' => Rate::perMinute($rate),
                'hour', 'hours' => Rate::perHour($rate),
                'day', 'days' => Rate::perDay($rate),
                default => null,
            };
        }

        return null;
    }

    /**
     * Create default configuration file.
     * Ensures directory exists and creates the file with proper structure.
     */
    private static function createDefaultConfig(): void
    {
        // Omit `_enabled` so isGloballyEnabled() defaults to on. Admins who
        // deliberately opt out set the key via the rate-limit UI (with marker).
        $defaultConfig = [
            'routes' => [],
            '_comment' => 'Rate limit configuration for routes. Use route names as keys.',
            '_documentation' => [
                '_enabled' => 'Optional global flag. Absent = enabled by default; set false with admin UI to opt out.',
                'per_second' => 'Rate limit per second',
                'per_minute' => 'Rate limit per minute',
                'per_hour' => 'Rate limit per hour',
                'per_day' => 'Rate limit per day',
                'namespace' => 'Optional namespace for rate limiting (defaults to \'rate_limit\')',
            ],
        ];

        try {
            $dir = dirname(self::$configPath);

            // Ensure directory exists
            if (!is_dir($dir)) {
                if (!mkdir($dir, 0755, true)) {
                    App::getInstance(true)->getLogger()->error('Failed to create rate limit config directory: ' . $dir);

                    return;
                }
            }

            // Ensure directory is writable
            if (!is_writable($dir)) {
                App::getInstance(true)->getLogger()->error('Rate limit config directory is not writable: ' . $dir);

                return;
            }

            // Write the config file
            $result = file_put_contents(
                self::$configPath,
                json_encode($defaultConfig, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n"
            );

            if ($result === false) {
                App::getInstance(true)->getLogger()->error('Failed to write default rate limit config file');
            } else {
                // Set proper permissions
                chmod(self::$configPath, 0644);
            }
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('Failed to create default rate limit config: ' . $e->getMessage());
        }
    }
}
