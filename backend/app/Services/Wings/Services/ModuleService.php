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
