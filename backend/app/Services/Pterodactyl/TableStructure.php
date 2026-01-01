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
