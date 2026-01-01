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

namespace App\Services\Wings\Services;

use App\Services\Wings\WingsConnection;

/**
 * Module Service for Wings API.
 *
 * Handles all module-related API endpoints including:
 * - Listing modules
 * - Getting module configuration
 * - Updating module configuration
 * - Enabling/disabling modules
 */
class ModuleService
{
    private WingsConnection $connection;

    /**
     * Create a new ModuleService instance.
     */
    public function __construct(WingsConnection $connection)
    {
        $this->connection = $connection;
    }

    /**
     * List all modules.
     */
    public function listModules(): array
    {
        return $this->connection->get('/api/modules');
    }

    /**
     * Get module configuration.
     */
    public function getModuleConfig(string $module): array
    {
        return $this->connection->get("/api/modules/{$module}/config");
    }

    /**
     * Update module configuration.
     */
    public function updateModuleConfig(string $module, array $config): array
    {
        return $this->connection->put("/api/modules/{$module}/config", ['config' => $config]);
    }

    /**
     * Enable a module.
     */
    public function enableModule(string $module): array
    {
        return $this->connection->post("/api/modules/{$module}/enable");
    }

    /**
     * Disable a module.
     */
    public function disableModule(string $module): array
    {
        return $this->connection->post("/api/modules/{$module}/disable");
    }
}
