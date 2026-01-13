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

namespace App\Services\Pterodactyl;

/**
 * This class defines all tables that are considered required for a
 * successful migration from a Pterodactyl Panel database to FeatherPanel.
 *
 * Tables included are those containing core user, server, location, node,
 * nest, and mission-critical supporting data. It does NOT include transient
 * or non-essential tables (such as logs, sessions, tokens, cache, etc).
 *
 * The list was curated based on a standard Pterodactyl installation
 * and MAY need adjustments for custom installs or edge cases.
 */
class TableStructure
{
    /**
     * Returns a list of all database tables required for import/migration.
     * This is based on a full inventory of official Pterodactyl schema as of 2025.
     */
    public static function getRequiredTables(): array
    {
        return [
            // Core objects
            'allocations',
            'backups',
            'database_hosts',
            'databases',
            'eggs',
            'egg_variables',
            'locations',
            'nests',
            'nodes',
            'servers',
            'server_variables',
            'users',
            'user_ssh_keys',
            'settings',
        ];
    }
}
