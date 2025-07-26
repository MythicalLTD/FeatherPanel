# App Permission Nodes

This document provides a comprehensive overview of all permission nodes used in App.

## Overview

- **Total Permissions:** 22
- **Categories:** 7
- **With Descriptions:** 22

## Format

Each permission node follows this format:
```
CONSTANT_NAME=permission.node.value | Category | Description
```

## Usage

### PHP
```php
use App\Permissions;

// Check if user has permission
if (auth()->user()->hasPermission(Permissions::ADMIN_DASHBOARD_VIEW)) {
    // User can view dashboard
}
```

### TypeScript/JavaScript
```typescript
import Permissions from '@/App/Permissions';

// Check if user has permission
if (auth.user.hasPermission(Permissions.ADMIN_DASHBOARD_VIEW)) {
    // User can view dashboard
}
```

## Admin Root

| Permission | Node | Description |
|------------|------|-------------|
| `ADMIN_ROOT` | `admin.root` | Full access to everything |

## Admin Dashboard View

| Permission | Node | Description |
|------------|------|-------------|
| `ADMIN_DASHBOARD_VIEW` | `admin.dashboard.view` | Access to view the admin dashboard |

## Admin Users

| Permission | Node | Description |
|------------|------|-------------|
| `ADMIN_USERS_VIEW` | `admin.users.list` | View the users |
| `ADMIN_USERS_CREATE` | `admin.users.create` | Create new users |
| `ADMIN_USERS_EDIT` | `admin.users.edit` | Edit existing users |
| `ADMIN_USERS_DELETE` | `admin.users.delete` | Delete users |

## Admin Locations

| Permission | Node | Description |
|------------|------|-------------|
| `ADMIN_LOCATIONS_VIEW` | `admin.locations.view` | View locations |
| `ADMIN_LOCATIONS_CREATE` | `admin.locations.create` | Create new locations |
| `ADMIN_LOCATIONS_EDIT` | `admin.locations.edit` | Edit existing locations |
| `ADMIN_LOCATIONS_DELETE` | `admin.locations.delete` | Delete locations |

## Admin Realms

| Permission | Node | Description |
|------------|------|-------------|
| `ADMIN_REALMS_VIEW` | `admin.realms.view` | View realms |
| `ADMIN_REALMS_CREATE` | `admin.realms.create` | Create new realms |
| `ADMIN_REALMS_EDIT` | `admin.realms.edit` | Edit existing realms |
| `ADMIN_REALMS_DELETE` | `admin.realms.delete` | Delete realms |

## Admin Roles

| Permission | Node | Description |
|------------|------|-------------|
| `ADMIN_ROLES_VIEW` | `admin.roles.view` | View roles |
| `ADMIN_ROLES_CREATE` | `admin.roles.create` | Create new roles |
| `ADMIN_ROLES_EDIT` | `admin.roles.edit` | Edit existing roles |
| `ADMIN_ROLES_DELETE` | `admin.roles.delete` | Delete roles |

## Admin Role Permissions

| Permission | Node | Description |
|------------|------|-------------|
| `ADMIN_ROLES_PERMISSIONS_VIEW` | `admin.roles.permissions.view` | View role permissions |
| `ADMIN_ROLES_PERMISSIONS_CREATE` | `admin.roles.permissions.create` | Create new role permissions |
| `ADMIN_ROLES_PERMISSIONS_EDIT` | `admin.roles.permissions.edit` | Edit existing role permissions |
| `ADMIN_ROLES_PERMISSIONS_DELETE` | `admin.roles.permissions.delete` | Delete role permissions |

## Adding New Permissions

To add a new permission node:

1. Edit `permission_nodes.txt` in the root directory
2. Add your permission in the format: `CONSTANT_NAME=permission.node.value | Category | Description`
3. Run `php App permissionExport` to regenerate all files
4. Rebuild the frontend if necessary

## File Locations

- **Source:** `permission_nodes.txt` (root directory)
- **PHP:** `backend/app/Permissions.php`
- **TypeScript:** `frontend/src/App/Permissions.ts`
- **Documentation:** `docs/PERMISSIONS.md` (this file)

## Auto-Generation

⚠️ **Important:** All generated files are automatically created from `permission_nodes.txt`. Manual modifications to the generated files will be overwritten when the export command is run.

---

*This documentation was auto-generated on 2025-07-25 18:49:07*
