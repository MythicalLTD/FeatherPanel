<?php

/*
 * This file is part of FeatherPanel.
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
 * Auto-generated from permission_nodes.txt.
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

    // Admin Users Permissions
    /** View the users */
    public const ADMIN_USERS_VIEW = 'admin.users.list';
    /** Create new users */
    public const ADMIN_USERS_CREATE = 'admin.users.create';
    /** Edit existing users */
    public const ADMIN_USERS_EDIT = 'admin.users.edit';
    /** Delete users */
    public const ADMIN_USERS_DELETE = 'admin.users.delete';

    // Admin Locations Permissions
    /** View locations */
    public const ADMIN_LOCATIONS_VIEW = 'admin.locations.view';
    /** Create new locations */
    public const ADMIN_LOCATIONS_CREATE = 'admin.locations.create';
    /** Edit existing locations */
    public const ADMIN_LOCATIONS_EDIT = 'admin.locations.edit';
    /** Delete locations */
    public const ADMIN_LOCATIONS_DELETE = 'admin.locations.delete';

    // Admin Realms Permissions
    /** View realms */
    public const ADMIN_REALMS_VIEW = 'admin.realms.view';
    /** Create new realms */
    public const ADMIN_REALMS_CREATE = 'admin.realms.create';
    /** Edit existing realms */
    public const ADMIN_REALMS_EDIT = 'admin.realms.edit';
    /** Delete realms */
    public const ADMIN_REALMS_DELETE = 'admin.realms.delete';

    // Admin Spells Permissions
    /** View spells */
    public const ADMIN_SPELLS_VIEW = 'admin.spells.view';
    /** Create new spells */
    public const ADMIN_SPELLS_CREATE = 'admin.spells.create';
    /** Edit existing spells */
    public const ADMIN_SPELLS_EDIT = 'admin.spells.edit';
    /** Delete spells */
    public const ADMIN_SPELLS_DELETE = 'admin.spells.delete';

    // Admin Nodes Permissions
    /** View nodes */
    public const ADMIN_NODES_VIEW = 'admin.nodes.view';
    /** Create new nodes */
    public const ADMIN_NODES_CREATE = 'admin.nodes.create';
    /** Edit existing nodes */
    public const ADMIN_NODES_EDIT = 'admin.nodes.edit';
    /** Delete nodes */
    public const ADMIN_NODES_DELETE = 'admin.nodes.delete';

    // Admin Roles Permissions
    /** View roles */
    public const ADMIN_ROLES_VIEW = 'admin.roles.view';
    /** Create new roles */
    public const ADMIN_ROLES_CREATE = 'admin.roles.create';
    /** Edit existing roles */
    public const ADMIN_ROLES_EDIT = 'admin.roles.edit';
    /** Delete roles */
    public const ADMIN_ROLES_DELETE = 'admin.roles.delete';

    // Admin Databases Permissions
    /** View databases */
    public const ADMIN_DATABASES_VIEW = 'admin.databases.view';
    /** Create new databases */
    public const ADMIN_DATABASES_CREATE = 'admin.databases.create';
    /** Edit existing databases */
    public const ADMIN_DATABASES_EDIT = 'admin.databases.edit';
    /** Delete databases */
    public const ADMIN_DATABASES_DELETE = 'admin.databases.delete';

    // Admin Role Permissions Permissions
    /** View role permissions */
    public const ADMIN_ROLES_PERMISSIONS_VIEW = 'admin.roles.permissions.view';
    /** Create new role permissions */
    public const ADMIN_ROLES_PERMISSIONS_CREATE = 'admin.roles.permissions.create';
    /** Edit existing role permissions */
    public const ADMIN_ROLES_PERMISSIONS_EDIT = 'admin.roles.permissions.edit';
    /** Delete role permissions */
    public const ADMIN_ROLES_PERMISSIONS_DELETE = 'admin.roles.permissions.delete';

    // Admin Settings Permissions
    /** View settings */
    public const ADMIN_SETTINGS_VIEW = 'admin.settings.view';
    /** Edit and manage settings */
    public const ADMIN_SETTINGS_EDIT = 'admin.settings.edit';

    // Admin Allocations Permissions
    /** View allocations */
    public const ADMIN_ALLOCATIONS_VIEW = 'admin.allocations.view';
    /** Create new allocations */
    public const ADMIN_ALLOCATIONS_CREATE = 'admin.allocations.create';
    /** Edit existing allocations */
    public const ADMIN_ALLOCATIONS_EDIT = 'admin.allocations.edit';
    /** Delete allocations */
    public const ADMIN_ALLOCATIONS_DELETE = 'admin.allocations.delete';

    // Admin Servers Permissions
    /** View all servers */
    public const ADMIN_SERVERS_VIEW = 'admin.servers.view';
    /** Create new servers */
    public const ADMIN_SERVERS_CREATE = 'admin.servers.create';
    /** Edit existing servers */
    public const ADMIN_SERVERS_EDIT = 'admin.servers.edit';
    /** Delete servers */
    public const ADMIN_SERVERS_DELETE = 'admin.servers.delete';
    /** Install servers */
    public const ADMIN_SERVERS_INSTALL = 'admin.servers.install';
    /** Reinstall servers */
    public const ADMIN_SERVERS_REINSTALL = 'admin.servers.reinstall';
    /** Suspend servers */
    public const ADMIN_SERVERS_SUSPEND = 'admin.servers.suspend';
    /** Unsuspend servers */
    public const ADMIN_SERVERS_UNSUSPEND = 'admin.servers.unsuspend';

    /**
     * Returns all permission nodes with metadata.
     */
    public static function getAll(): array
    {
        return [
            [
                'constant' => 'ADMIN_ROOT',
                'value' => self::ADMIN_ROOT,
                'category' => 'Admin Root',
                'description' => 'Full access to everything',
            ],
            [
                'constant' => 'ADMIN_DASHBOARD_VIEW',
                'value' => self::ADMIN_DASHBOARD_VIEW,
                'category' => 'Admin Dashboard View',
                'description' => 'Access to view the admin dashboard',
            ],
            [
                'constant' => 'ADMIN_USERS_VIEW',
                'value' => self::ADMIN_USERS_VIEW,
                'category' => 'Admin Users',
                'description' => 'View the users',
            ],
            [
                'constant' => 'ADMIN_USERS_CREATE',
                'value' => self::ADMIN_USERS_CREATE,
                'category' => 'Admin Users',
                'description' => 'Create new users',
            ],
            [
                'constant' => 'ADMIN_USERS_EDIT',
                'value' => self::ADMIN_USERS_EDIT,
                'category' => 'Admin Users',
                'description' => 'Edit existing users',
            ],
            [
                'constant' => 'ADMIN_USERS_DELETE',
                'value' => self::ADMIN_USERS_DELETE,
                'category' => 'Admin Users',
                'description' => 'Delete users',
            ],
            [
                'constant' => 'ADMIN_LOCATIONS_VIEW',
                'value' => self::ADMIN_LOCATIONS_VIEW,
                'category' => 'Admin Locations',
                'description' => 'View locations',
            ],
            [
                'constant' => 'ADMIN_LOCATIONS_CREATE',
                'value' => self::ADMIN_LOCATIONS_CREATE,
                'category' => 'Admin Locations',
                'description' => 'Create new locations',
            ],
            [
                'constant' => 'ADMIN_LOCATIONS_EDIT',
                'value' => self::ADMIN_LOCATIONS_EDIT,
                'category' => 'Admin Locations',
                'description' => 'Edit existing locations',
            ],
            [
                'constant' => 'ADMIN_LOCATIONS_DELETE',
                'value' => self::ADMIN_LOCATIONS_DELETE,
                'category' => 'Admin Locations',
                'description' => 'Delete locations',
            ],
            [
                'constant' => 'ADMIN_REALMS_VIEW',
                'value' => self::ADMIN_REALMS_VIEW,
                'category' => 'Admin Realms',
                'description' => 'View realms',
            ],
            [
                'constant' => 'ADMIN_REALMS_CREATE',
                'value' => self::ADMIN_REALMS_CREATE,
                'category' => 'Admin Realms',
                'description' => 'Create new realms',
            ],
            [
                'constant' => 'ADMIN_REALMS_EDIT',
                'value' => self::ADMIN_REALMS_EDIT,
                'category' => 'Admin Realms',
                'description' => 'Edit existing realms',
            ],
            [
                'constant' => 'ADMIN_REALMS_DELETE',
                'value' => self::ADMIN_REALMS_DELETE,
                'category' => 'Admin Realms',
                'description' => 'Delete realms',
            ],
            [
                'constant' => 'ADMIN_SPELLS_VIEW',
                'value' => self::ADMIN_SPELLS_VIEW,
                'category' => 'Admin Spells',
                'description' => 'View spells',
            ],
            [
                'constant' => 'ADMIN_SPELLS_CREATE',
                'value' => self::ADMIN_SPELLS_CREATE,
                'category' => 'Admin Spells',
                'description' => 'Create new spells',
            ],
            [
                'constant' => 'ADMIN_SPELLS_EDIT',
                'value' => self::ADMIN_SPELLS_EDIT,
                'category' => 'Admin Spells',
                'description' => 'Edit existing spells',
            ],
            [
                'constant' => 'ADMIN_SPELLS_DELETE',
                'value' => self::ADMIN_SPELLS_DELETE,
                'category' => 'Admin Spells',
                'description' => 'Delete spells',
            ],
            [
                'constant' => 'ADMIN_NODES_VIEW',
                'value' => self::ADMIN_NODES_VIEW,
                'category' => 'Admin Nodes',
                'description' => 'View nodes',
            ],
            [
                'constant' => 'ADMIN_NODES_CREATE',
                'value' => self::ADMIN_NODES_CREATE,
                'category' => 'Admin Nodes',
                'description' => 'Create new nodes',
            ],
            [
                'constant' => 'ADMIN_NODES_EDIT',
                'value' => self::ADMIN_NODES_EDIT,
                'category' => 'Admin Nodes',
                'description' => 'Edit existing nodes',
            ],
            [
                'constant' => 'ADMIN_NODES_DELETE',
                'value' => self::ADMIN_NODES_DELETE,
                'category' => 'Admin Nodes',
                'description' => 'Delete nodes',
            ],
            [
                'constant' => 'ADMIN_ROLES_VIEW',
                'value' => self::ADMIN_ROLES_VIEW,
                'category' => 'Admin Roles',
                'description' => 'View roles',
            ],
            [
                'constant' => 'ADMIN_ROLES_CREATE',
                'value' => self::ADMIN_ROLES_CREATE,
                'category' => 'Admin Roles',
                'description' => 'Create new roles',
            ],
            [
                'constant' => 'ADMIN_ROLES_EDIT',
                'value' => self::ADMIN_ROLES_EDIT,
                'category' => 'Admin Roles',
                'description' => 'Edit existing roles',
            ],
            [
                'constant' => 'ADMIN_ROLES_DELETE',
                'value' => self::ADMIN_ROLES_DELETE,
                'category' => 'Admin Roles',
                'description' => 'Delete roles',
            ],
            [
                'constant' => 'ADMIN_DATABASES_VIEW',
                'value' => self::ADMIN_DATABASES_VIEW,
                'category' => 'Admin Databases',
                'description' => 'View databases',
            ],
            [
                'constant' => 'ADMIN_DATABASES_CREATE',
                'value' => self::ADMIN_DATABASES_CREATE,
                'category' => 'Admin Databases',
                'description' => 'Create new databases',
            ],
            [
                'constant' => 'ADMIN_DATABASES_EDIT',
                'value' => self::ADMIN_DATABASES_EDIT,
                'category' => 'Admin Databases',
                'description' => 'Edit existing databases',
            ],
            [
                'constant' => 'ADMIN_DATABASES_DELETE',
                'value' => self::ADMIN_DATABASES_DELETE,
                'category' => 'Admin Databases',
                'description' => 'Delete databases',
            ],
            [
                'constant' => 'ADMIN_ROLES_PERMISSIONS_VIEW',
                'value' => self::ADMIN_ROLES_PERMISSIONS_VIEW,
                'category' => 'Admin Role Permissions',
                'description' => 'View role permissions',
            ],
            [
                'constant' => 'ADMIN_ROLES_PERMISSIONS_CREATE',
                'value' => self::ADMIN_ROLES_PERMISSIONS_CREATE,
                'category' => 'Admin Role Permissions',
                'description' => 'Create new role permissions',
            ],
            [
                'constant' => 'ADMIN_ROLES_PERMISSIONS_EDIT',
                'value' => self::ADMIN_ROLES_PERMISSIONS_EDIT,
                'category' => 'Admin Role Permissions',
                'description' => 'Edit existing role permissions',
            ],
            [
                'constant' => 'ADMIN_ROLES_PERMISSIONS_DELETE',
                'value' => self::ADMIN_ROLES_PERMISSIONS_DELETE,
                'category' => 'Admin Role Permissions',
                'description' => 'Delete role permissions',
            ],
            [
                'constant' => 'ADMIN_SETTINGS_VIEW',
                'value' => self::ADMIN_SETTINGS_VIEW,
                'category' => 'Admin Settings',
                'description' => 'View settings',
            ],
            [
                'constant' => 'ADMIN_SETTINGS_EDIT',
                'value' => self::ADMIN_SETTINGS_EDIT,
                'category' => 'Admin Settings',
                'description' => 'Edit and manage settings',
            ],
            [
                'constant' => 'ADMIN_ALLOCATIONS_VIEW',
                'value' => self::ADMIN_ALLOCATIONS_VIEW,
                'category' => 'Admin Allocations',
                'description' => 'View allocations',
            ],
            [
                'constant' => 'ADMIN_ALLOCATIONS_CREATE',
                'value' => self::ADMIN_ALLOCATIONS_CREATE,
                'category' => 'Admin Allocations',
                'description' => 'Create new allocations',
            ],
            [
                'constant' => 'ADMIN_ALLOCATIONS_EDIT',
                'value' => self::ADMIN_ALLOCATIONS_EDIT,
                'category' => 'Admin Allocations',
                'description' => 'Edit existing allocations',
            ],
            [
                'constant' => 'ADMIN_ALLOCATIONS_DELETE',
                'value' => self::ADMIN_ALLOCATIONS_DELETE,
                'category' => 'Admin Allocations',
                'description' => 'Delete allocations',
            ],
            [
                'constant' => 'ADMIN_SERVERS_VIEW',
                'value' => self::ADMIN_SERVERS_VIEW,
                'category' => 'Admin Servers',
                'description' => 'View all servers',
            ],
            [
                'constant' => 'ADMIN_SERVERS_CREATE',
                'value' => self::ADMIN_SERVERS_CREATE,
                'category' => 'Admin Servers',
                'description' => 'Create new servers',
            ],
            [
                'constant' => 'ADMIN_SERVERS_EDIT',
                'value' => self::ADMIN_SERVERS_EDIT,
                'category' => 'Admin Servers',
                'description' => 'Edit existing servers',
            ],
            [
                'constant' => 'ADMIN_SERVERS_DELETE',
                'value' => self::ADMIN_SERVERS_DELETE,
                'category' => 'Admin Servers',
                'description' => 'Delete servers',
            ],
            [
                'constant' => 'ADMIN_SERVERS_INSTALL',
                'value' => self::ADMIN_SERVERS_INSTALL,
                'category' => 'Admin Servers',
                'description' => 'Install servers',
            ],
            [
                'constant' => 'ADMIN_SERVERS_REINSTALL',
                'value' => self::ADMIN_SERVERS_REINSTALL,
                'category' => 'Admin Servers',
                'description' => 'Reinstall servers',
            ],
            [
                'constant' => 'ADMIN_SERVERS_SUSPEND',
                'value' => self::ADMIN_SERVERS_SUSPEND,
                'category' => 'Admin Servers',
                'description' => 'Suspend servers',
            ],
            [
                'constant' => 'ADMIN_SERVERS_UNSUSPEND',
                'value' => self::ADMIN_SERVERS_UNSUSPEND,
                'category' => 'Admin Servers',
                'description' => 'Unsuspend servers',
            ],
        ];
    }
}
