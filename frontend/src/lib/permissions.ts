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

    // Admin Roles Permissions
    /** View roles */
    public static ADMIN_ROLES_VIEW = 'admin.roles.view';
    /** Create new roles */
    public static ADMIN_ROLES_CREATE = 'admin.roles.create';
    /** Edit existing roles */
    public static ADMIN_ROLES_EDIT = 'admin.roles.edit';
    /** Delete roles */
    public static ADMIN_ROLES_DELETE = 'admin.roles.delete';

    // Admin Role Permissions Permissions
    /** View role permissions */
    public static ADMIN_ROLES_PERMISSIONS_VIEW = 'admin.roles.permissions.view';
    /** Create new role permissions */
    public static ADMIN_ROLES_PERMISSIONS_CREATE = 'admin.roles.permissions.create';
    /** Edit existing role permissions */
    public static ADMIN_ROLES_PERMISSIONS_EDIT = 'admin.roles.permissions.edit';
    /** Delete role permissions */
    public static ADMIN_ROLES_PERMISSIONS_DELETE = 'admin.roles.permissions.delete';

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
        ];
    }
}

export default Permissions;
