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

namespace App\Services\Wings\Services;

use App\Services\Wings\WingsConnection;

/**
 * Configuration Service for Wings API.
 *
 * Handles all configuration-related API endpoints including:
 * - Getting raw YAML configuration
 * - Replacing entire configuration
 * - Patching specific configuration values
 * - Getting configuration schema
 */
class ConfigService
{
    private WingsConnection $connection;

    /**
     * Create a new ConfigService instance.
     */
    public function __construct(WingsConnection $connection)
    {
        $this->connection = $connection;
    }

    /**
     * Get the raw Wings configuration file as YAML.
     *
     * @return string The raw YAML configuration
     */
    public function getConfig(): string
    {
        $headers = [
            'Accept' => 'application/x-yaml, text/yaml, application/json',
        ];

        return $this->connection->getRaw('/api/config', $headers);
    }

    /**
     * Replace the entire Wings configuration file.
     *
     * Wings API expects:
     * {
     *   "content": "yaml content here",
     *   "restart": true/false
     * }
     *
     * @param string $yamlContent The complete YAML configuration content
     * @param bool $restart Whether to restart Wings after update (default: false)
     *
     * @return array The response data
     */
    public function putConfig(string $yamlContent, bool $restart = false): array
    {
        $headers = [
            'Content-Type' => 'application/json',
        ];

        $data = [
            'content' => $yamlContent,
            'restart' => $restart,
        ];

        return $this->connection->put('/api/config', $data, $headers);
    }

    /**
     * Patch specific configuration values using dot notation.
     *
     * Wings API expects:
     * {
     *   "updates": {
     *     "api.port": 8080,
     *     "system.timezone": "UTC"
     *   },
     *   "restart": true/false
     * }
     *
     * @param array $updates Associative array of config paths to values (e.g., ['api.port' => 8080])
     * @param bool $restart Whether to restart Wings after update (default: false)
     *
     * @return array The response data
     */
    public function patchConfig(array $updates, bool $restart = false): array
    {
        $data = [
            'updates' => $updates,
            'restart' => $restart,
        ];

        return $this->connection->patch('/api/config/patch', $data);
    }

    /**
     * Get the configuration schema.
     *
     * @return array The configuration schema
     */
    public function getConfigSchema(): array
    {
        return $this->connection->get('/api/config/schema');
    }
}
