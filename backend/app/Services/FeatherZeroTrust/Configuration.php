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

namespace App\Services\FeatherZeroTrust;

use App\App;

/**
 * FeatherZeroTrust Configuration Manager.
 *
 * Manages configuration for FeatherZeroTrust scanner from database settings.
 */
class Configuration
{
    private App $app;
    private array $cache = [];

    /**
     * Create a new Configuration instance.
     */
    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    /**
     * Get all configuration with defaults.
     *
     * @return array<string, mixed> Configuration array
     */
    public function getAll(): array
    {
        $config = $this->app->getConfig();

        return [
            'enabled' => $config->getSetting('featherzerotrust.enabled', 'false') === 'true',
            'scan_interval' => (int) $config->getSetting('featherzerotrust.scan_interval', '15'), // minutes
            'max_file_size' => (int) $config->getSetting('featherzerotrust.max_file_size', '10485760'), // bytes (10MB)
            'max_depth' => (int) $config->getSetting('featherzerotrust.max_depth', '10'),
            'auto_suspend' => $config->getSetting('featherzerotrust.auto_suspend', 'false') === 'true',
            'webhook_enabled' => $config->getSetting('featherzerotrust.webhook_enabled', 'false') === 'true',
            'webhook_url' => $config->getSetting('featherzerotrust.webhook_url', ''),
            'ignored_extensions' => $this->getJsonSetting('featherzerotrust.ignored_extensions', [
                '.jar',
                '.phar',
                '.rar',
                '.zip',
                '.tar.gz',
                '.7z',
                '.gz',
                '.xz',
                '.bz2',
                '.log',
                '.logs',
                '.txt',
                '.yml',
                '.yaml',
                '.json',
                '.properties',
                '.db',
                '.toml',
                '.mca',
            ]),
            'ignored_files' => $this->getJsonSetting('featherzerotrust.ignored_files', [
                'velocity.toml',
                'server.jar.old',
                'latest.log',
                'debug.log',
                'error.log',
                'access.log',
                'server.log',
                'usermap.bin',
                'forbidden-players.txt',
                'help.yml',
                'commands.yml',
                'permissions.yml',
            ]),
            'ignored_paths' => $this->getJsonSetting('featherzerotrust.ignored_paths', [
                'proxy.log.0',
                'proxy.log',
                'plugins/.paper-remapped',
                'plugins/CoreProtect/database.db',
                'plugins/PlaceholderAPI/javascripts/example.js',
                'plugins/Geyser-Spigot/locales',
                'plugins/Geyser-Velocity/locales',
                'plugins/Essentials',
                'plugins/ViaVersion/cache',
                'cache',
                'logs',
                'crash-reports',
                'world/playerdata',
                'world/stats',
                'world/advancements',
                'world/region',
            ]),
            'suspicious_extensions' => $this->getJsonSetting('featherzerotrust.suspicious_extensions', [
                '.sh',
                '.bat',
                '.cmd',
                '.exe',
                '.jar',
                '.dll',
                '.so',
            ]),
            'suspicious_names' => $this->getJsonSetting('featherzerotrust.suspicious_names', [
                'mine.sh',
                'proxies.txt',
                'proxy.txt',
                'whatsapp.js',
                'wa_bot.js',
                'start.sh',
                'run.sh',
                'crypto',
                'miner',
                'bot',
                'hack',
                'exploit',
            ]),
            'suspicious_cache' => $this->getJsonSetting('featherzerotrust.suspicious_cache', [
                'cpuminer',
                'cpuminer-avx2',
                'xmrig',
            ]),
            'max_jar_size' => (int) $config->getSetting('featherzerotrust.max_jar_size', '5242880'), // 5MB
            'suspicious_patterns' => $this->getJsonSetting('featherzerotrust.suspicious_patterns', [
                'stratum+tcp://',
                'pool.',
                'miningpool',
                'proxy.*=.*http',
                'socks.*=.*http',
                'eval(',
                'base64_decode(',
                'gzinflate(',
                'whatsapp',
                '@whastapp',
                'baileys',
            ]),
            'malicious_processes' => $this->getJsonSetting('featherzerotrust.malicious_processes', [
                'xmrig',
                'earnfm',
                'mcstorm.jar',
                'proot',
                'destine',
                'hashvault',
            ]),
            'whatsapp_indicators' => $this->getJsonSetting('featherzerotrust.whatsapp_indicators', [
                'whatsapp-web.js',
                'whatsapp-web-js',
                'webwhatsapi',
                'yowsup',
                'wa-automate',
                'baileys',
            ]),
            'miner_indicators' => $this->getJsonSetting('featherzerotrust.miner_indicators', [
                'xmrig',
                'ethminer',
                'cpuminer',
                'bfgminer',
                'cgminer',
                'minerd',
                'cryptonight',
                'stratum+tcp',
                'minexmr',
                'nanopool',
                'minergate',
            ]),
            'suspicious_ports' => $this->getJsonSetting('featherzerotrust.suspicious_ports', [
                1080,
                3128,
                8080,
                8118,
                9150,
                9001,
                9030,
            ]),
            'suspicious_words' => $this->getJsonSetting('featherzerotrust.suspicious_words', [
                'new job from',
                'noVNC',
                'Downloading fresh proxies...',
                'FAILED TO APPLY MSR MOD',
                'Tor server\'s identity key',
                'Stratum - Connected',
                'eth.2miners.com:2020',
                'whatsapp',
                'wa-automate',
                'whatsapp-web.js',
                'baileys',
                'port 3000',
            ]),
            'suspicious_content' => $this->getJsonSetting('featherzerotrust.suspicious_content', [
                'stratum',
                'cryptonight',
                'proxies...',
                'const _0x1a1f74=',
                'app[\'listen\']',
                'minexmr.com',
                'herominers',
                'hashvault',
                'xmrig',
                'nanopool.org',
                'ethpool.org',
                '2miners.com',
            ]),
            'legitimate_log_patterns' => $this->getJsonSetting('featherzerotrust.legitimate_log_patterns', [
                'Done (',
                'Starting minecraft server version',
                'Preparing spawn area',
                'Loading libraries',
                'For help, type "help"',
                'Loaded ',
                'Preparing start region',
                'Time elapsed',
                'Startup script',
            ]),
            'high_cpu_threshold' => (float) $config->getSetting('featherzerotrust.high_cpu_threshold', '0.96'),
            'high_network_usage' => (int) $config->getSetting('featherzerotrust.high_network_usage', '4294967296'), // 4GB
            'small_volume_size' => (float) $config->getSetting('featherzerotrust.small_volume_size', '3.5'), // MB
            'recent_account_threshold' => (int) $config->getSetting('featherzerotrust.recent_account_threshold', '604800000'), // 7 days in ms
        ];
    }

    /**
     * Update configuration.
     *
     * @param array<string, mixed> $config Configuration to update
     *
     * @return bool Success status
     */
    public function update(array $config): bool
    {
        $configManager = $this->app->getConfig();

        try {
            foreach ($config as $key => $value) {
                $settingKey = 'featherzerotrust.' . $key;

                if (is_array($value)) {
                    $value = json_encode($value);
                } elseif (is_bool($value)) {
                    $value = $value ? 'true' : 'false';
                } else {
                    $value = (string) $value;
                }

                $configManager->setSetting($settingKey, $value);
            }

            // Clear cache
            $this->cache = [];

            return true;
        } catch (\Exception $e) {
            $this->app->getLogger()->error('Failed to update FeatherZeroTrust configuration: ' . $e->getMessage());

            return false;
        }
    }

    /**
     * Get a JSON setting and decode it.
     *
     * @param string $key Setting key
     * @param array<mixed> $default Default value
     *
     * @return array<mixed> Decoded JSON array
     */
    private function getJsonSetting(string $key, array $default): array
    {
        $value = $this->app->getConfig()->getSetting($key, null);

        if ($value === null) {
            return $default;
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : $default;
    }
}
