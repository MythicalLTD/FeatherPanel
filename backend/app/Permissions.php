<?php

/*
 * This file is part of App.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

/**
 * Permission Nodes Constants
 * Auto-generated from permission_nodes.txt
 */

/**
 * ⚠️  WARNING: Do not modify this file manually!
 * This file is auto-generated from permission_nodes.txt
 * Use 'php App permissionExport' to regenerate this file
 * Manual modifications will be overwritten on next generation.
 */

namespace App;

class Permissions
{
    // Admin Root Permissions
    /** Full access to everything */
    public const ADMIN_ROOT = 'admin.root';

    // Admin Dashboard View Permissions
    /** Access to view the admin dashboard */
    public const ADMIN_DASHBOARD_VIEW = 'admin.dashboard.view';

    /**
     * Returns all permission nodes with metadata.
     * @return array
     */
    public static function getAll(): array
    {
        return [
            [
                'constant' => 'ADMIN_ROOT',
                'value' => self::ADMIN_ROOT,
                'category' => 'Admin Root',
                'description' => 'Full access to everything'
            ],
            [
                'constant' => 'ADMIN_DASHBOARD_VIEW',
                'value' => self::ADMIN_DASHBOARD_VIEW,
                'category' => 'Admin Dashboard View',
                'description' => 'Access to view the admin dashboard'
            ],
        ];
    }
}
