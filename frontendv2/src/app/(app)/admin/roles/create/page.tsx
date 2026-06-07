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

'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { RoleEditor } from '@/components/admin/RoleEditor';
import { useRoleEditor } from '@/hooks/useRoleEditor';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';

export default function CreateRolePage() {
    const { t } = useTranslation();
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-roles-create');
    const [roleCount, setRoleCount] = useState(0);
    const [countLoaded, setCountLoaded] = useState(false);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const { data } = await axios.get('/api/admin/roles', { params: { limit: 1, page: 1 } });
                setRoleCount(data.data.pagination?.total_records ?? 0);
            } catch {
                setRoleCount(0);
            } finally {
                setCountLoaded(true);
            }
        };
        fetchCount();
    }, []);

    const editor = useRoleEditor({
        mode: 'create',
        defaultRoleCount: roleCount,
    });

    if (!countLoaded) {
        return <TableSkeleton count={4} />;
    }

    return (
        <>
            <WidgetRenderer widgets={getWidgets('admin-roles-create', 'top-of-page')} />
            <RoleEditor
                mode='create'
                loading={false}
                form={editor.form}
                onFormChange={editor.setForm}
                onDisplayNameChange={editor.handleDisplayNameChange}
                onNameManualEdit={() => {
                    editor.nameManuallyEdited.current = true;
                }}
                activeTab={editor.activeTab}
                onTabChange={editor.setActiveTab}
                roleId={editor.editorRoleId}
                isYourRole={editor.isYourRole}
                isSubmitting={editor.isSubmitting}
                onSave={editor.handleSaveRole}
                loadingPermissions={editor.loadingPermissions}
                assignedPermissionMap={editor.assignedPermissionMap}
                onTogglePermission={editor.togglePermission}
                onBulkTogglePermissions={editor.bulkTogglePermissions}
                togglingPermission={editor.togglingPermission}
                isRootLocked={editor.isRootLocked}
                canEditPermissions={editor.canEditPermissions}
                t={t}
            />
            <WidgetRenderer widgets={getWidgets('admin-roles-create', 'bottom-of-page')} />
        </>
    );
}
