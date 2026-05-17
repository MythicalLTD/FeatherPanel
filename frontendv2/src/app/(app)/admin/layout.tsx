/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

import DashboardShell from '@/components/layout/DashboardShell';
import PermissionGuard from '@/components/auth/PermissionGuard';
import Permissions from '@/lib/permissions';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <PermissionGuard permission={Permissions.ADMIN_DASHBOARD_VIEW}>
            <DashboardShell>{children}</DashboardShell>
        </PermissionGuard>
    );
}
