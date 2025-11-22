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
