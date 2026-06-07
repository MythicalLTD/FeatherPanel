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

import { useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { RoleEditor } from '@/components/admin/RoleEditor';
import { useRoleEditor } from '@/hooks/useRoleEditor';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

export default function EditRolePage() {
    const { t } = useTranslation();
    const params = useParams();
    const searchParams = useSearchParams();
    const roleId = Number(params.id);
    const initialTab = searchParams.get('tab') === 'permissions' ? 'permissions' : 'details';

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-roles-edit');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const editor = useRoleEditor({
        mode: 'edit',
        roleId: Number.isFinite(roleId) ? roleId : undefined,
        initialTab,
    });

    return (
        <>
            <WidgetRenderer widgets={getWidgets('admin-roles-edit', 'top-of-page')} />
            <RoleEditor
                mode='edit'
                loading={editor.loading}
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
                onDelete={editor.handleDeleteRole}
                loadingPermissions={editor.loadingPermissions}
                assignedPermissionMap={editor.assignedPermissionMap}
                onTogglePermission={editor.togglePermission}
                onBulkTogglePermissions={editor.bulkTogglePermissions}
                togglingPermission={editor.togglingPermission}
                isRootLocked={editor.isRootLocked}
                canEditPermissions={editor.canEditPermissions}
                t={t}
            />
            <WidgetRenderer widgets={getWidgets('admin-roles-edit', 'bottom-of-page')} />
        </>
    );
}
