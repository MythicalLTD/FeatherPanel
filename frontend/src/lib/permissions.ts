/*
MIT License

Copyright (c) 2025 MythicalSystems
Copyright (c) 2025 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/**
 * Permission Nodes Constants
 * Auto-generated from permission_nodes.fpperm
 */

/**
 * ⚠️  WARNING: Do not modify this file manually!
 * This file is auto-generated from permission_nodes.fpperm
 * Use 'php App permissionExport' to regenerate this file
 * Manual modifications will be overwritten on next generation.
 */

class Permissions {
    // Admin Root Permissions
    /** Full access to everything */
    public static ADMIN_ROOT = 'admin.root';

    // Admin Dashboard View Permissions
    /** Access to view the admin dashboard */
    public static ADMIN_DASHBOARD_VIEW = 'admin.dashboard.view';

    // Admin Users Permissions
    /** View the users */
    public static ADMIN_USERS_VIEW = 'admin.users.list';
    /** Create new users */
    public static ADMIN_USERS_CREATE = 'admin.users.create';
    /** Edit existing users */
    public static ADMIN_USERS_EDIT = 'admin.users.edit';
    /** Delete users */
    public static ADMIN_USERS_DELETE = 'admin.users.delete';

    // Admin Locations Permissions
    /** View locations */
    public static ADMIN_LOCATIONS_VIEW = 'admin.locations.view';
    /** Create new locations */
    public static ADMIN_LOCATIONS_CREATE = 'admin.locations.create';
    /** Edit existing locations */
    public static ADMIN_LOCATIONS_EDIT = 'admin.locations.edit';
    /** Delete locations */
    public static ADMIN_LOCATIONS_DELETE = 'admin.locations.delete';

    // Admin Realms Permissions
    /** View realms */
    public static ADMIN_REALMS_VIEW = 'admin.realms.view';
    /** Create new realms */
    public static ADMIN_REALMS_CREATE = 'admin.realms.create';
    /** Edit existing realms */
    public static ADMIN_REALMS_EDIT = 'admin.realms.edit';
    /** Delete realms */
    public static ADMIN_REALMS_DELETE = 'admin.realms.delete';

    // Admin Spells Permissions
    /** View spells */
    public static ADMIN_SPELLS_VIEW = 'admin.spells.view';
    /** Create new spells */
    public static ADMIN_SPELLS_CREATE = 'admin.spells.create';
    /** Edit existing spells */
    public static ADMIN_SPELLS_EDIT = 'admin.spells.edit';
    /** Delete spells */
    public static ADMIN_SPELLS_DELETE = 'admin.spells.delete';

    // Admin Nodes Permissions
    /** View nodes */
    public static ADMIN_NODES_VIEW = 'admin.nodes.view';
    /** Create new nodes */
    public static ADMIN_NODES_CREATE = 'admin.nodes.create';
    /** Edit existing nodes */
    public static ADMIN_NODES_EDIT = 'admin.nodes.edit';
    /** Delete nodes */
    public static ADMIN_NODES_DELETE = 'admin.nodes.delete';

    // Admin Roles Permissions
    /** View roles */
    public static ADMIN_ROLES_VIEW = 'admin.roles.view';
    /** Create new roles */
    public static ADMIN_ROLES_CREATE = 'admin.roles.create';
    /** Edit existing roles */
    public static ADMIN_ROLES_EDIT = 'admin.roles.edit';
    /** Delete roles */
    public static ADMIN_ROLES_DELETE = 'admin.roles.delete';

    // Admin Databases Permissions
    /** View databases */
    public static ADMIN_DATABASES_VIEW = 'admin.databases.view';
    /** Create new databases */
    public static ADMIN_DATABASES_CREATE = 'admin.databases.create';
    /** Edit existing databases */
    public static ADMIN_DATABASES_EDIT = 'admin.databases.edit';
    /** Delete databases */
    public static ADMIN_DATABASES_DELETE = 'admin.databases.delete';
    /** Manage database */
    public static ADMIN_DATABASES_MANAGE = 'admin.databases.manage';

    // Admin Role Permissions Permissions
    /** View role permissions */
    public static ADMIN_ROLES_PERMISSIONS_VIEW = 'admin.roles.permissions.view';
    /** Create new role permissions */
    public static ADMIN_ROLES_PERMISSIONS_CREATE = 'admin.roles.permissions.create';
    /** Edit existing role permissions */
    public static ADMIN_ROLES_PERMISSIONS_EDIT = 'admin.roles.permissions.edit';
    /** Delete role permissions */
    public static ADMIN_ROLES_PERMISSIONS_DELETE = 'admin.roles.permissions.delete';

    // Admin Settings Permissions
    /** View settings */
    public static ADMIN_SETTINGS_VIEW = 'admin.settings.view';
    /** Edit and manage settings */
    public static ADMIN_SETTINGS_EDIT = 'admin.settings.edit';

    // Admin Allocations Permissions
    /** View allocations */
    public static ADMIN_ALLOCATIONS_VIEW = 'admin.allocations.view';
    /** Create new allocations */
    public static ADMIN_ALLOCATIONS_CREATE = 'admin.allocations.create';
    /** Edit existing allocations */
    public static ADMIN_ALLOCATIONS_EDIT = 'admin.allocations.edit';
    /** Delete allocations */
    public static ADMIN_ALLOCATIONS_DELETE = 'admin.allocations.delete';

    // Admin Servers Permissions
    /** View all servers */
    public static ADMIN_SERVERS_VIEW = 'admin.servers.view';
    /** Create new servers */
    public static ADMIN_SERVERS_CREATE = 'admin.servers.create';
    /** Edit existing servers */
    public static ADMIN_SERVERS_EDIT = 'admin.servers.edit';
    /** Delete servers */
    public static ADMIN_SERVERS_DELETE = 'admin.servers.delete';
    /** Install servers */
    public static ADMIN_SERVERS_INSTALL = 'admin.servers.install';
    /** Reinstall servers */
    public static ADMIN_SERVERS_REINSTALL = 'admin.servers.reinstall';
    /** Suspend servers */
    public static ADMIN_SERVERS_SUSPEND = 'admin.servers.suspend';
    /** Unsuspend servers */
    public static ADMIN_SERVERS_UNSUSPEND = 'admin.servers.unsuspend';

    // Admin Email Templates Permissions
    /** View email templates */
    public static ADMIN_TEMPLATE_EMAIL_VIEW = 'admin.email.templates.view';
    /** Create new email templates */
    public static ADMIN_TEMPLATE_EMAIL_CREATE = 'admin.email.templates.create';
    /** Edit existing email templates */
    public static ADMIN_TEMPLATE_EMAIL_EDIT = 'admin.email.templates.edit';
    /** Delete email templates */
    public static ADMIN_TEMPLATE_EMAIL_DELETE = 'admin.email.templates.delete';

    // Admin Images Permissions
    /** View images */
    public static ADMIN_IMAGES_VIEW = 'admin.images.view';
    /** Create new images */
    public static ADMIN_IMAGES_CREATE = 'admin.images.create';
    /** Edit existing images */
    public static ADMIN_IMAGES_EDIT = 'admin.images.edit';
    /** Delete images */
    public static ADMIN_IMAGES_DELETE = 'admin.images.delete';

    // Admin Redirect Links Permissions
    /** View redirect links */
    public static ADMIN_REDIRECT_LINKS_VIEW = 'admin.redirect_links.view';
    /** Create new redirect links */
    public static ADMIN_REDIRECT_LINKS_CREATE = 'admin.redirect_links.create';
    /** Edit existing redirect links */
    public static ADMIN_REDIRECT_LINKS_EDIT = 'admin.redirect_links.edit';
    /** Delete redirect links */
    public static ADMIN_REDIRECT_LINKS_DELETE = 'admin.redirect_links.delete';

    // Admin Plugins Permissions
    /** View plugins */
    public static ADMIN_PLUGINS_VIEW = 'admin.plugins.view';
    /** Install plugins */
    public static ADMIN_PLUGINS_INSTALL = 'admin.plugins.install';
    /** Uninstall plugins */
    public static ADMIN_PLUGINS_UNINSTALL = 'admin.plugins.uninstall';
    /** Manage plugins */
    public static ADMIN_PLUGINS_MANAGE = 'admin.plugins.manage';

    // Admin Statistics Permissions
    /** View statistics */
    public static ADMIN_STATISTICS_VIEW = 'admin.statistics.view';

    /**
     * Returns all permission nodes with metadata.
     */
    public static getAll(): Array<{ constant: string; value: string; category: string; description: string }> {
        return [
            {
                constant: 'ADMIN_ROOT',
                value: Permissions.ADMIN_ROOT,
                category: 'Admin Root',
                description: 'Full access to everything',
            },
            {
                constant: 'ADMIN_DASHBOARD_VIEW',
                value: Permissions.ADMIN_DASHBOARD_VIEW,
                category: 'Admin Dashboard View',
                description: 'Access to view the admin dashboard',
            },
            {
                constant: 'ADMIN_USERS_VIEW',
                value: Permissions.ADMIN_USERS_VIEW,
                category: 'Admin Users',
                description: 'View the users',
            },
            {
                constant: 'ADMIN_USERS_CREATE',
                value: Permissions.ADMIN_USERS_CREATE,
                category: 'Admin Users',
                description: 'Create new users',
            },
            {
                constant: 'ADMIN_USERS_EDIT',
                value: Permissions.ADMIN_USERS_EDIT,
                category: 'Admin Users',
                description: 'Edit existing users',
            },
            {
                constant: 'ADMIN_USERS_DELETE',
                value: Permissions.ADMIN_USERS_DELETE,
                category: 'Admin Users',
                description: 'Delete users',
            },
            {
                constant: 'ADMIN_LOCATIONS_VIEW',
                value: Permissions.ADMIN_LOCATIONS_VIEW,
                category: 'Admin Locations',
                description: 'View locations',
            },
            {
                constant: 'ADMIN_LOCATIONS_CREATE',
                value: Permissions.ADMIN_LOCATIONS_CREATE,
                category: 'Admin Locations',
                description: 'Create new locations',
            },
            {
                constant: 'ADMIN_LOCATIONS_EDIT',
                value: Permissions.ADMIN_LOCATIONS_EDIT,
                category: 'Admin Locations',
                description: 'Edit existing locations',
            },
            {
                constant: 'ADMIN_LOCATIONS_DELETE',
                value: Permissions.ADMIN_LOCATIONS_DELETE,
                category: 'Admin Locations',
                description: 'Delete locations',
            },
            {
                constant: 'ADMIN_REALMS_VIEW',
                value: Permissions.ADMIN_REALMS_VIEW,
                category: 'Admin Realms',
                description: 'View realms',
            },
            {
                constant: 'ADMIN_REALMS_CREATE',
                value: Permissions.ADMIN_REALMS_CREATE,
                category: 'Admin Realms',
                description: 'Create new realms',
            },
            {
                constant: 'ADMIN_REALMS_EDIT',
                value: Permissions.ADMIN_REALMS_EDIT,
                category: 'Admin Realms',
                description: 'Edit existing realms',
            },
            {
                constant: 'ADMIN_REALMS_DELETE',
                value: Permissions.ADMIN_REALMS_DELETE,
                category: 'Admin Realms',
                description: 'Delete realms',
            },
            {
                constant: 'ADMIN_SPELLS_VIEW',
                value: Permissions.ADMIN_SPELLS_VIEW,
                category: 'Admin Spells',
                description: 'View spells',
            },
            {
                constant: 'ADMIN_SPELLS_CREATE',
                value: Permissions.ADMIN_SPELLS_CREATE,
                category: 'Admin Spells',
                description: 'Create new spells',
            },
            {
                constant: 'ADMIN_SPELLS_EDIT',
                value: Permissions.ADMIN_SPELLS_EDIT,
                category: 'Admin Spells',
                description: 'Edit existing spells',
            },
            {
                constant: 'ADMIN_SPELLS_DELETE',
                value: Permissions.ADMIN_SPELLS_DELETE,
                category: 'Admin Spells',
                description: 'Delete spells',
            },
            {
                constant: 'ADMIN_NODES_VIEW',
                value: Permissions.ADMIN_NODES_VIEW,
                category: 'Admin Nodes',
                description: 'View nodes',
            },
            {
                constant: 'ADMIN_NODES_CREATE',
                value: Permissions.ADMIN_NODES_CREATE,
                category: 'Admin Nodes',
                description: 'Create new nodes',
            },
            {
                constant: 'ADMIN_NODES_EDIT',
                value: Permissions.ADMIN_NODES_EDIT,
                category: 'Admin Nodes',
                description: 'Edit existing nodes',
            },
            {
                constant: 'ADMIN_NODES_DELETE',
                value: Permissions.ADMIN_NODES_DELETE,
                category: 'Admin Nodes',
                description: 'Delete nodes',
            },
            {
                constant: 'ADMIN_ROLES_VIEW',
                value: Permissions.ADMIN_ROLES_VIEW,
                category: 'Admin Roles',
                description: 'View roles',
            },
            {
                constant: 'ADMIN_ROLES_CREATE',
                value: Permissions.ADMIN_ROLES_CREATE,
                category: 'Admin Roles',
                description: 'Create new roles',
            },
            {
                constant: 'ADMIN_ROLES_EDIT',
                value: Permissions.ADMIN_ROLES_EDIT,
                category: 'Admin Roles',
                description: 'Edit existing roles',
            },
            {
                constant: 'ADMIN_ROLES_DELETE',
                value: Permissions.ADMIN_ROLES_DELETE,
                category: 'Admin Roles',
                description: 'Delete roles',
            },
            {
                constant: 'ADMIN_DATABASES_VIEW',
                value: Permissions.ADMIN_DATABASES_VIEW,
                category: 'Admin Databases',
                description: 'View databases',
            },
            {
                constant: 'ADMIN_DATABASES_CREATE',
                value: Permissions.ADMIN_DATABASES_CREATE,
                category: 'Admin Databases',
                description: 'Create new databases',
            },
            {
                constant: 'ADMIN_DATABASES_EDIT',
                value: Permissions.ADMIN_DATABASES_EDIT,
                category: 'Admin Databases',
                description: 'Edit existing databases',
            },
            {
                constant: 'ADMIN_DATABASES_DELETE',
                value: Permissions.ADMIN_DATABASES_DELETE,
                category: 'Admin Databases',
                description: 'Delete databases',
            },
            {
                constant: 'ADMIN_ROLES_PERMISSIONS_VIEW',
                value: Permissions.ADMIN_ROLES_PERMISSIONS_VIEW,
                category: 'Admin Role Permissions',
                description: 'View role permissions',
            },
            {
                constant: 'ADMIN_ROLES_PERMISSIONS_CREATE',
                value: Permissions.ADMIN_ROLES_PERMISSIONS_CREATE,
                category: 'Admin Role Permissions',
                description: 'Create new role permissions',
            },
            {
                constant: 'ADMIN_ROLES_PERMISSIONS_EDIT',
                value: Permissions.ADMIN_ROLES_PERMISSIONS_EDIT,
                category: 'Admin Role Permissions',
                description: 'Edit existing role permissions',
            },
            {
                constant: 'ADMIN_ROLES_PERMISSIONS_DELETE',
                value: Permissions.ADMIN_ROLES_PERMISSIONS_DELETE,
                category: 'Admin Role Permissions',
                description: 'Delete role permissions',
            },
            {
                constant: 'ADMIN_SETTINGS_VIEW',
                value: Permissions.ADMIN_SETTINGS_VIEW,
                category: 'Admin Settings',
                description: 'View settings',
            },
            {
                constant: 'ADMIN_SETTINGS_EDIT',
                value: Permissions.ADMIN_SETTINGS_EDIT,
                category: 'Admin Settings',
                description: 'Edit and manage settings',
            },
            {
                constant: 'ADMIN_ALLOCATIONS_VIEW',
                value: Permissions.ADMIN_ALLOCATIONS_VIEW,
                category: 'Admin Allocations',
                description: 'View allocations',
            },
            {
                constant: 'ADMIN_ALLOCATIONS_CREATE',
                value: Permissions.ADMIN_ALLOCATIONS_CREATE,
                category: 'Admin Allocations',
                description: 'Create new allocations',
            },
            {
                constant: 'ADMIN_ALLOCATIONS_EDIT',
                value: Permissions.ADMIN_ALLOCATIONS_EDIT,
                category: 'Admin Allocations',
                description: 'Edit existing allocations',
            },
            {
                constant: 'ADMIN_ALLOCATIONS_DELETE',
                value: Permissions.ADMIN_ALLOCATIONS_DELETE,
                category: 'Admin Allocations',
                description: 'Delete allocations',
            },
            {
                constant: 'ADMIN_SERVERS_VIEW',
                value: Permissions.ADMIN_SERVERS_VIEW,
                category: 'Admin Servers',
                description: 'View all servers',
            },
            {
                constant: 'ADMIN_SERVERS_CREATE',
                value: Permissions.ADMIN_SERVERS_CREATE,
                category: 'Admin Servers',
                description: 'Create new servers',
            },
            {
                constant: 'ADMIN_SERVERS_EDIT',
                value: Permissions.ADMIN_SERVERS_EDIT,
                category: 'Admin Servers',
                description: 'Edit existing servers',
            },
            {
                constant: 'ADMIN_SERVERS_DELETE',
                value: Permissions.ADMIN_SERVERS_DELETE,
                category: 'Admin Servers',
                description: 'Delete servers',
            },
            {
                constant: 'ADMIN_SERVERS_INSTALL',
                value: Permissions.ADMIN_SERVERS_INSTALL,
                category: 'Admin Servers',
                description: 'Install servers',
            },
            {
                constant: 'ADMIN_SERVERS_REINSTALL',
                value: Permissions.ADMIN_SERVERS_REINSTALL,
                category: 'Admin Servers',
                description: 'Reinstall servers',
            },
            {
                constant: 'ADMIN_SERVERS_SUSPEND',
                value: Permissions.ADMIN_SERVERS_SUSPEND,
                category: 'Admin Servers',
                description: 'Suspend servers',
            },
            {
                constant: 'ADMIN_SERVERS_UNSUSPEND',
                value: Permissions.ADMIN_SERVERS_UNSUSPEND,
                category: 'Admin Servers',
                description: 'Unsuspend servers',
            },
            {
                constant: 'ADMIN_TEMPLATE_EMAIL_VIEW',
                value: Permissions.ADMIN_TEMPLATE_EMAIL_VIEW,
                category: 'Admin Email Templates',
                description: 'View email templates',
            },
            {
                constant: 'ADMIN_TEMPLATE_EMAIL_CREATE',
                value: Permissions.ADMIN_TEMPLATE_EMAIL_CREATE,
                category: 'Admin Email Templates',
                description: 'Create new email templates',
            },
            {
                constant: 'ADMIN_TEMPLATE_EMAIL_EDIT',
                value: Permissions.ADMIN_TEMPLATE_EMAIL_EDIT,
                category: 'Admin Email Templates',
                description: 'Edit existing email templates',
            },
            {
                constant: 'ADMIN_TEMPLATE_EMAIL_DELETE',
                value: Permissions.ADMIN_TEMPLATE_EMAIL_DELETE,
                category: 'Admin Email Templates',
                description: 'Delete email templates',
            },
            {
                constant: 'ADMIN_IMAGES_VIEW',
                value: Permissions.ADMIN_IMAGES_VIEW,
                category: 'Admin Images',
                description: 'View images',
            },
            {
                constant: 'ADMIN_IMAGES_CREATE',
                value: Permissions.ADMIN_IMAGES_CREATE,
                category: 'Admin Images',
                description: 'Create new images',
            },
            {
                constant: 'ADMIN_IMAGES_EDIT',
                value: Permissions.ADMIN_IMAGES_EDIT,
                category: 'Admin Images',
                description: 'Edit existing images',
            },
            {
                constant: 'ADMIN_IMAGES_DELETE',
                value: Permissions.ADMIN_IMAGES_DELETE,
                category: 'Admin Images',
                description: 'Delete images',
            },
            {
                constant: 'ADMIN_REDIRECT_LINKS_VIEW',
                value: Permissions.ADMIN_REDIRECT_LINKS_VIEW,
                category: 'Admin Redirect Links',
                description: 'View redirect links',
            },
            {
                constant: 'ADMIN_REDIRECT_LINKS_CREATE',
                value: Permissions.ADMIN_REDIRECT_LINKS_CREATE,
                category: 'Admin Redirect Links',
                description: 'Create new redirect links',
            },
            {
                constant: 'ADMIN_REDIRECT_LINKS_EDIT',
                value: Permissions.ADMIN_REDIRECT_LINKS_EDIT,
                category: 'Admin Redirect Links',
                description: 'Edit existing redirect links',
            },
            {
                constant: 'ADMIN_REDIRECT_LINKS_DELETE',
                value: Permissions.ADMIN_REDIRECT_LINKS_DELETE,
                category: 'Admin Redirect Links',
                description: 'Delete redirect links',
            },
            {
                constant: 'ADMIN_PLUGINS_VIEW',
                value: Permissions.ADMIN_PLUGINS_VIEW,
                category: 'Admin Plugins',
                description: 'View plugins',
            },
            {
                constant: 'ADMIN_PLUGINS_INSTALL',
                value: Permissions.ADMIN_PLUGINS_INSTALL,
                category: 'Admin Plugins',
                description: 'Install plugins',
            },
            {
                constant: 'ADMIN_PLUGINS_UNINSTALL',
                value: Permissions.ADMIN_PLUGINS_UNINSTALL,
                category: 'Admin Plugins',
                description: 'Uninstall plugins',
            },
            {
                constant: 'ADMIN_PLUGINS_MANAGE',
                value: Permissions.ADMIN_PLUGINS_MANAGE,
                category: 'Admin Plugins',
                description: 'Manage plugins',
            },
            {
                constant: 'ADMIN_DATABASES_MANAGE',
                value: Permissions.ADMIN_DATABASES_MANAGE,
                category: 'Admin Databases',
                description: 'Manage database',
            },
            {
                constant: 'ADMIN_STATISTICS_VIEW',
                value: Permissions.ADMIN_STATISTICS_VIEW,
                category: 'Admin Statistics',
                description: 'View statistics',
            },
        ];
    }
}

export default Permissions;
