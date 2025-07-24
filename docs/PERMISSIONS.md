# App Permission Nodes

This document provides a comprehensive overview of all permission nodes used in App.

## Overview

- **Total Permissions:** 6
- **Categories:** 3
- **With Descriptions:** 6

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

*This documentation was auto-generated on 2025-07-24 13:55:06*
