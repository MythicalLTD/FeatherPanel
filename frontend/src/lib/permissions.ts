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

    /**
     * Returns all permission nodes with metadata.
     */
    public static getAll(): Array<{ constant: string; value: string; category: string; description: string }> {
        return [
            { constant: 'ADMIN_ROOT', value: Permissions.ADMIN_ROOT, category: 'Admin Root', description: 'Full access to everything' },
            { constant: 'ADMIN_DASHBOARD_VIEW', value: Permissions.ADMIN_DASHBOARD_VIEW, category: 'Admin Dashboard View', description: 'Access to view the admin dashboard' },
            { constant: 'ADMIN_USERS_VIEW', value: Permissions.ADMIN_USERS_VIEW, category: 'Admin Users', description: 'View the users' },
            { constant: 'ADMIN_USERS_CREATE', value: Permissions.ADMIN_USERS_CREATE, category: 'Admin Users', description: 'Create new users' },
            { constant: 'ADMIN_USERS_EDIT', value: Permissions.ADMIN_USERS_EDIT, category: 'Admin Users', description: 'Edit existing users' },
            { constant: 'ADMIN_USERS_DELETE', value: Permissions.ADMIN_USERS_DELETE, category: 'Admin Users', description: 'Delete users' },
        ];
    }
}

export default Permissions;
