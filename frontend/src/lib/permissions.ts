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

    // Admin Subdomains Permissions
    /** View subdomains */
    public static ADMIN_SUBDOMAINS_VIEW = 'admin.subdomains.view';
    /** Create new subdomains */
    public static ADMIN_SUBDOMAINS_CREATE = 'admin.subdomains.create';
    /** Edit subdomains */
    public static ADMIN_SUBDOMAINS_EDIT = 'admin.subdomains.edit';
    /** Delete subdomains */
    public static ADMIN_SUBDOMAINS_DELETE = 'admin.subdomains.delete';

    // Admin FeatherZeroTrust Permissions
    /** View FeatherZeroTrust scanner */
    public static ADMIN_FEATHERZEROTRUST_VIEW = 'admin.featherzerotrust.view';
    /** Run scans with FeatherZeroTrust */
    public static ADMIN_FEATHERZEROTRUST_SCAN = 'admin.featherzerotrust.scan';
    /** Configure FeatherZeroTrust settings */
    public static ADMIN_FEATHERZEROTRUST_CONFIGURE = 'admin.featherzerotrust.configure';
    /** Manage FeatherZeroTrust */
    public static ADMIN_FEATHERZEROTRUST_MANAGE = 'admin.featherzerotrust.manage';

    // Admin Notifications Permissions
    /** View notifications */
    public static ADMIN_NOTIFICATIONS_VIEW = 'admin.notifications.view';
    /** Create new notifications */
    public static ADMIN_NOTIFICATIONS_CREATE = 'admin.notifications.create';
    /** Edit existing notifications */
    public static ADMIN_NOTIFICATIONS_EDIT = 'admin.notifications.edit';
    /** Delete notifications */
    public static ADMIN_NOTIFICATIONS_DELETE = 'admin.notifications.delete';

    // Admin Database Snapshots Permissions
    /** View database snapshots */
    public static ADMIN_BACKUPS_VIEW = 'admin.backups.view';
    /** Create database snapshots */
    public static ADMIN_BACKUPS_CREATE = 'admin.backups.create';
    /** Delete database snapshots */
    public static ADMIN_BACKUPS_DELETE = 'admin.backups.delete';
    /** Restore database from snapshot */
    public static ADMIN_BACKUPS_RESTORE = 'admin.backups.restore';
    /** Download database snapshots */
    public static ADMIN_BACKUPS_DOWNLOAD = 'admin.backups.download';

    // Admin Knowledgebase Categories Permissions
    /** View knowledgebase categories */
    public static ADMIN_KNOWLEDGEBASE_CATEGORIES_VIEW = 'admin.knowledgebase.categories.view';
    /** Create new knowledgebase categories */
    public static ADMIN_KNOWLEDGEBASE_CATEGORIES_CREATE = 'admin.knowledgebase.categories.create';
    /** Edit existing knowledgebase categories */
    public static ADMIN_KNOWLEDGEBASE_CATEGORIES_EDIT = 'admin.knowledgebase.categories.edit';
    /** Delete knowledgebase categories */
    public static ADMIN_KNOWLEDGEBASE_CATEGORIES_DELETE = 'admin.knowledgebase.categories.delete';

    // Admin Knowledgebase Articles Permissions
    /** View knowledgebase articles */
    public static ADMIN_KNOWLEDGEBASE_ARTICLES_VIEW = 'admin.knowledgebase.articles.view';
    /** Create new knowledgebase articles */
    public static ADMIN_KNOWLEDGEBASE_ARTICLES_CREATE = 'admin.knowledgebase.articles.create';
    /** Edit existing knowledgebase articles */
    public static ADMIN_KNOWLEDGEBASE_ARTICLES_EDIT = 'admin.knowledgebase.articles.edit';
    /** Delete knowledgebase articles */
    public static ADMIN_KNOWLEDGEBASE_ARTICLES_DELETE = 'admin.knowledgebase.articles.delete';

    // Admin API Permissions
    /** Bypass API rate limits and restrictions */
    public static ADMIN_API_BYPASS_RESTRICTIONS = 'admin.api.bypass_restrictions';

    // Admin Tickets Permissions
    /** View support tickets */
    public static ADMIN_TICKETS_VIEW = 'admin.tickets.view';
    /** Create support tickets */
    public static ADMIN_TICKETS_CREATE = 'admin.tickets.create';
    /** Edit support tickets */
    public static ADMIN_TICKETS_EDIT = 'admin.tickets.edit';
    /** Delete support tickets */
    public static ADMIN_TICKETS_DELETE = 'admin.tickets.delete';
    /** Manage all aspects of support tickets */
    public static ADMIN_TICKETS_MANAGE = 'admin.tickets.manage';

    // Admin Ticket Categories Permissions
    /** View ticket categories */
    public static ADMIN_TICKET_CATEGORIES_VIEW = 'admin.ticket_categories.view';
    /** Create ticket categories */
    public static ADMIN_TICKET_CATEGORIES_CREATE = 'admin.ticket_categories.create';
    /** Edit ticket categories */
    public static ADMIN_TICKET_CATEGORIES_EDIT = 'admin.ticket_categories.edit';
    /** Delete ticket categories */
    public static ADMIN_TICKET_CATEGORIES_DELETE = 'admin.ticket_categories.delete';

    // Admin Ticket Priorities Permissions
    /** View ticket priorities */
    public static ADMIN_TICKET_PRIORITIES_VIEW = 'admin.ticket_priorities.view';
    /** Create ticket priorities */
    public static ADMIN_TICKET_PRIORITIES_CREATE = 'admin.ticket_priorities.create';
    /** Edit ticket priorities */
    public static ADMIN_TICKET_PRIORITIES_EDIT = 'admin.ticket_priorities.edit';
    /** Delete ticket priorities */
    public static ADMIN_TICKET_PRIORITIES_DELETE = 'admin.ticket_priorities.delete';

    // Admin Ticket Statuses Permissions
    /** View ticket statuses */
    public static ADMIN_TICKET_STATUSES_VIEW = 'admin.ticket_statuses.view';
    /** Create ticket statuses */
    public static ADMIN_TICKET_STATUSES_CREATE = 'admin.ticket_statuses.create';
    /** Edit ticket statuses */
    public static ADMIN_TICKET_STATUSES_EDIT = 'admin.ticket_statuses.edit';
    /** Delete ticket statuses */
    public static ADMIN_TICKET_STATUSES_DELETE = 'admin.ticket_statuses.delete';

    // Admin Ticket Attachments Permissions
    /** View ticket attachments */
    public static ADMIN_TICKET_ATTACHMENTS_VIEW = 'admin.ticket_attachments.view';
    /** Manage ticket attachments */
    public static ADMIN_TICKET_ATTACHMENTS_MANAGE = 'admin.ticket_attachments.manage';

    // Admin Ticket Messages Permissions
    /** View ticket messages */
    public static ADMIN_TICKET_MESSAGES_VIEW = 'admin.ticket_messages.view';
    /** Manage ticket messages */
    public static ADMIN_TICKET_MESSAGES_MANAGE = 'admin.ticket_messages.manage';

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
            {
                constant: 'ADMIN_SUBDOMAINS_VIEW',
                value: Permissions.ADMIN_SUBDOMAINS_VIEW,
                category: 'Admin Subdomains',
                description: 'View subdomains',
            },
            {
                constant: 'ADMIN_SUBDOMAINS_CREATE',
                value: Permissions.ADMIN_SUBDOMAINS_CREATE,
                category: 'Admin Subdomains',
                description: 'Create new subdomains',
            },
            {
                constant: 'ADMIN_SUBDOMAINS_EDIT',
                value: Permissions.ADMIN_SUBDOMAINS_EDIT,
                category: 'Admin Subdomains',
                description: 'Edit subdomains',
            },
            {
                constant: 'ADMIN_SUBDOMAINS_DELETE',
                value: Permissions.ADMIN_SUBDOMAINS_DELETE,
                category: 'Admin Subdomains',
                description: 'Delete subdomains',
            },
            {
                constant: 'ADMIN_FEATHERZEROTRUST_VIEW',
                value: Permissions.ADMIN_FEATHERZEROTRUST_VIEW,
                category: 'Admin FeatherZeroTrust',
                description: 'View FeatherZeroTrust scanner',
            },
            {
                constant: 'ADMIN_FEATHERZEROTRUST_SCAN',
                value: Permissions.ADMIN_FEATHERZEROTRUST_SCAN,
                category: 'Admin FeatherZeroTrust',
                description: 'Run scans with FeatherZeroTrust',
            },
            {
                constant: 'ADMIN_FEATHERZEROTRUST_CONFIGURE',
                value: Permissions.ADMIN_FEATHERZEROTRUST_CONFIGURE,
                category: 'Admin FeatherZeroTrust',
                description: 'Configure FeatherZeroTrust settings',
            },
            {
                constant: 'ADMIN_FEATHERZEROTRUST_MANAGE',
                value: Permissions.ADMIN_FEATHERZEROTRUST_MANAGE,
                category: 'Admin FeatherZeroTrust',
                description: 'Manage FeatherZeroTrust',
            },
            {
                constant: 'ADMIN_NOTIFICATIONS_VIEW',
                value: Permissions.ADMIN_NOTIFICATIONS_VIEW,
                category: 'Admin Notifications',
                description: 'View notifications',
            },
            {
                constant: 'ADMIN_NOTIFICATIONS_CREATE',
                value: Permissions.ADMIN_NOTIFICATIONS_CREATE,
                category: 'Admin Notifications',
                description: 'Create new notifications',
            },
            {
                constant: 'ADMIN_NOTIFICATIONS_EDIT',
                value: Permissions.ADMIN_NOTIFICATIONS_EDIT,
                category: 'Admin Notifications',
                description: 'Edit existing notifications',
            },
            {
                constant: 'ADMIN_NOTIFICATIONS_DELETE',
                value: Permissions.ADMIN_NOTIFICATIONS_DELETE,
                category: 'Admin Notifications',
                description: 'Delete notifications',
            },
            {
                constant: 'ADMIN_BACKUPS_VIEW',
                value: Permissions.ADMIN_BACKUPS_VIEW,
                category: 'Admin Database Snapshots',
                description: 'View database snapshots',
            },
            {
                constant: 'ADMIN_BACKUPS_CREATE',
                value: Permissions.ADMIN_BACKUPS_CREATE,
                category: 'Admin Database Snapshots',
                description: 'Create database snapshots',
            },
            {
                constant: 'ADMIN_BACKUPS_DELETE',
                value: Permissions.ADMIN_BACKUPS_DELETE,
                category: 'Admin Database Snapshots',
                description: 'Delete database snapshots',
            },
            {
                constant: 'ADMIN_BACKUPS_RESTORE',
                value: Permissions.ADMIN_BACKUPS_RESTORE,
                category: 'Admin Database Snapshots',
                description: 'Restore database from snapshot',
            },
            {
                constant: 'ADMIN_BACKUPS_DOWNLOAD',
                value: Permissions.ADMIN_BACKUPS_DOWNLOAD,
                category: 'Admin Database Snapshots',
                description: 'Download database snapshots',
            },
            {
                constant: 'ADMIN_KNOWLEDGEBASE_CATEGORIES_VIEW',
                value: Permissions.ADMIN_KNOWLEDGEBASE_CATEGORIES_VIEW,
                category: 'Admin Knowledgebase Categories',
                description: 'View knowledgebase categories',
            },
            {
                constant: 'ADMIN_KNOWLEDGEBASE_CATEGORIES_CREATE',
                value: Permissions.ADMIN_KNOWLEDGEBASE_CATEGORIES_CREATE,
                category: 'Admin Knowledgebase Categories',
                description: 'Create new knowledgebase categories',
            },
            {
                constant: 'ADMIN_KNOWLEDGEBASE_CATEGORIES_EDIT',
                value: Permissions.ADMIN_KNOWLEDGEBASE_CATEGORIES_EDIT,
                category: 'Admin Knowledgebase Categories',
                description: 'Edit existing knowledgebase categories',
            },
            {
                constant: 'ADMIN_KNOWLEDGEBASE_CATEGORIES_DELETE',
                value: Permissions.ADMIN_KNOWLEDGEBASE_CATEGORIES_DELETE,
                category: 'Admin Knowledgebase Categories',
                description: 'Delete knowledgebase categories',
            },
            {
                constant: 'ADMIN_KNOWLEDGEBASE_ARTICLES_VIEW',
                value: Permissions.ADMIN_KNOWLEDGEBASE_ARTICLES_VIEW,
                category: 'Admin Knowledgebase Articles',
                description: 'View knowledgebase articles',
            },
            {
                constant: 'ADMIN_KNOWLEDGEBASE_ARTICLES_CREATE',
                value: Permissions.ADMIN_KNOWLEDGEBASE_ARTICLES_CREATE,
                category: 'Admin Knowledgebase Articles',
                description: 'Create new knowledgebase articles',
            },
            {
                constant: 'ADMIN_KNOWLEDGEBASE_ARTICLES_EDIT',
                value: Permissions.ADMIN_KNOWLEDGEBASE_ARTICLES_EDIT,
                category: 'Admin Knowledgebase Articles',
                description: 'Edit existing knowledgebase articles',
            },
            {
                constant: 'ADMIN_KNOWLEDGEBASE_ARTICLES_DELETE',
                value: Permissions.ADMIN_KNOWLEDGEBASE_ARTICLES_DELETE,
                category: 'Admin Knowledgebase Articles',
                description: 'Delete knowledgebase articles',
            },
            {
                constant: 'ADMIN_API_BYPASS_RESTRICTIONS',
                value: Permissions.ADMIN_API_BYPASS_RESTRICTIONS,
                category: 'Admin API',
                description: 'Bypass API rate limits and restrictions',
            },
            {
                constant: 'ADMIN_TICKETS_VIEW',
                value: Permissions.ADMIN_TICKETS_VIEW,
                category: 'Admin Tickets',
                description: 'View support tickets',
            },
            {
                constant: 'ADMIN_TICKETS_CREATE',
                value: Permissions.ADMIN_TICKETS_CREATE,
                category: 'Admin Tickets',
                description: 'Create support tickets',
            },
            {
                constant: 'ADMIN_TICKETS_EDIT',
                value: Permissions.ADMIN_TICKETS_EDIT,
                category: 'Admin Tickets',
                description: 'Edit support tickets',
            },
            {
                constant: 'ADMIN_TICKETS_DELETE',
                value: Permissions.ADMIN_TICKETS_DELETE,
                category: 'Admin Tickets',
                description: 'Delete support tickets',
            },
            {
                constant: 'ADMIN_TICKETS_MANAGE',
                value: Permissions.ADMIN_TICKETS_MANAGE,
                category: 'Admin Tickets',
                description: 'Manage all aspects of support tickets',
            },
            {
                constant: 'ADMIN_TICKET_CATEGORIES_VIEW',
                value: Permissions.ADMIN_TICKET_CATEGORIES_VIEW,
                category: 'Admin Ticket Categories',
                description: 'View ticket categories',
            },
            {
                constant: 'ADMIN_TICKET_CATEGORIES_CREATE',
                value: Permissions.ADMIN_TICKET_CATEGORIES_CREATE,
                category: 'Admin Ticket Categories',
                description: 'Create ticket categories',
            },
            {
                constant: 'ADMIN_TICKET_CATEGORIES_EDIT',
                value: Permissions.ADMIN_TICKET_CATEGORIES_EDIT,
                category: 'Admin Ticket Categories',
                description: 'Edit ticket categories',
            },
            {
                constant: 'ADMIN_TICKET_CATEGORIES_DELETE',
                value: Permissions.ADMIN_TICKET_CATEGORIES_DELETE,
                category: 'Admin Ticket Categories',
                description: 'Delete ticket categories',
            },
            {
                constant: 'ADMIN_TICKET_PRIORITIES_VIEW',
                value: Permissions.ADMIN_TICKET_PRIORITIES_VIEW,
                category: 'Admin Ticket Priorities',
                description: 'View ticket priorities',
            },
            {
                constant: 'ADMIN_TICKET_PRIORITIES_CREATE',
                value: Permissions.ADMIN_TICKET_PRIORITIES_CREATE,
                category: 'Admin Ticket Priorities',
                description: 'Create ticket priorities',
            },
            {
                constant: 'ADMIN_TICKET_PRIORITIES_EDIT',
                value: Permissions.ADMIN_TICKET_PRIORITIES_EDIT,
                category: 'Admin Ticket Priorities',
                description: 'Edit ticket priorities',
            },
            {
                constant: 'ADMIN_TICKET_PRIORITIES_DELETE',
                value: Permissions.ADMIN_TICKET_PRIORITIES_DELETE,
                category: 'Admin Ticket Priorities',
                description: 'Delete ticket priorities',
            },
            {
                constant: 'ADMIN_TICKET_STATUSES_VIEW',
                value: Permissions.ADMIN_TICKET_STATUSES_VIEW,
                category: 'Admin Ticket Statuses',
                description: 'View ticket statuses',
            },
            {
                constant: 'ADMIN_TICKET_STATUSES_CREATE',
                value: Permissions.ADMIN_TICKET_STATUSES_CREATE,
                category: 'Admin Ticket Statuses',
                description: 'Create ticket statuses',
            },
            {
                constant: 'ADMIN_TICKET_STATUSES_EDIT',
                value: Permissions.ADMIN_TICKET_STATUSES_EDIT,
                category: 'Admin Ticket Statuses',
                description: 'Edit ticket statuses',
            },
            {
                constant: 'ADMIN_TICKET_STATUSES_DELETE',
                value: Permissions.ADMIN_TICKET_STATUSES_DELETE,
                category: 'Admin Ticket Statuses',
                description: 'Delete ticket statuses',
            },
            {
                constant: 'ADMIN_TICKET_ATTACHMENTS_VIEW',
                value: Permissions.ADMIN_TICKET_ATTACHMENTS_VIEW,
                category: 'Admin Ticket Attachments',
                description: 'View ticket attachments',
            },
            {
                constant: 'ADMIN_TICKET_ATTACHMENTS_MANAGE',
                value: Permissions.ADMIN_TICKET_ATTACHMENTS_MANAGE,
                category: 'Admin Ticket Attachments',
                description: 'Manage ticket attachments',
            },
            {
                constant: 'ADMIN_TICKET_MESSAGES_VIEW',
                value: Permissions.ADMIN_TICKET_MESSAGES_VIEW,
                category: 'Admin Ticket Messages',
                description: 'View ticket messages',
            },
            {
                constant: 'ADMIN_TICKET_MESSAGES_MANAGE',
                value: Permissions.ADMIN_TICKET_MESSAGES_MANAGE,
                category: 'Admin Ticket Messages',
                description: 'Manage ticket messages',
            },
        ];
    }
}

export default Permissions;
