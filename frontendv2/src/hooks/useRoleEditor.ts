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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios, { isAxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import Permissions from '@/lib/permissions';
import { pickDefaultRoleColor, slugifyRoleName, type Role, type RoleForm, type RolePermission } from '@/lib/role-utils';

interface UseRoleEditorOptions {
    mode: 'create' | 'edit';
    roleId?: number;
    defaultRoleCount?: number;
    initialTab?: 'details' | 'permissions';
}

export function useRoleEditor({ mode, roleId, defaultRoleCount = 0, initialTab = 'details' }: UseRoleEditorOptions) {
    const { t } = useTranslation();
    const { user, refreshSession } = useSession();
    const router = useRouter();

    const [loading, setLoading] = useState(mode === 'edit');
    const [form, setForm] = useState<RoleForm>({
        name: '',
        display_name: '',
        custom_badge: '',
        color: pickDefaultRoleColor(defaultRoleCount),
    });
    const nameManuallyEdited = useRef(false);

    const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
    const [loadingPermissions, setLoadingPermissions] = useState(false);
    const [togglingPermission, setTogglingPermission] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'permissions'>(initialTab);

    const editorRoleId = roleId ?? null;

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab, roleId]);

    useEffect(() => {
        if (mode === 'create' && !nameManuallyEdited.current && form.display_name === '' && form.name === '') {
            setForm((prev) => ({
                ...prev,
                color: pickDefaultRoleColor(defaultRoleCount),
            }));
        }
    }, [defaultRoleCount, mode, form.display_name, form.name]);

    const fetchPermissions = useCallback(
        async (targetRoleId: number) => {
            setLoadingPermissions(true);
            try {
                const { data } = await axios.get('/api/admin/permissions', {
                    params: { role_id: targetRoleId, limit: 500 },
                });
                setRolePermissions(data.data.permissions || []);
            } catch (error) {
                console.error('Error fetching permissions:', error);
                toast.error(t('admin.roles.messages.permission_failed'));
            } finally {
                setLoadingPermissions(false);
            }
        },
        [t],
    );

    useEffect(() => {
        if (mode !== 'edit' || !roleId) return;

        const loadRole = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get(`/api/admin/roles/${roleId}`);
                const role = data.data.role as Role;
                nameManuallyEdited.current = true;
                setForm({
                    name: role.name,
                    display_name: role.display_name,
                    custom_badge: role.custom_badge ?? '',
                    color: role.color,
                });
                await fetchPermissions(roleId);
            } catch (error) {
                console.error('Error loading role:', error);
                toast.error(t('admin.roles.messages.fetch_failed'));
                router.push('/admin/roles');
            } finally {
                setLoading(false);
            }
        };

        loadRole();
    }, [mode, roleId, fetchPermissions, router, t]);

    const assignedPermissionMap = useMemo(() => {
        const map = new Map<string, number>();
        for (const perm of rolePermissions) {
            map.set(perm.permission, perm.id);
        }
        return map;
    }, [rolePermissions]);

    const isRootLocked = useCallback(
        (permissionValue: string, targetRoleId: number | null = editorRoleId ?? null) => {
            return (
                permissionValue === Permissions.ADMIN_ROOT &&
                targetRoleId !== null &&
                user?.role_id !== undefined &&
                targetRoleId === user.role_id
            );
        },
        [editorRoleId, user?.role_id],
    );

    const handleAddPermission = async (permissionValue: string, targetRoleId: number) => {
        try {
            const { data } = await axios.put('/api/admin/permissions', {
                role_id: targetRoleId,
                permission: permissionValue,
            });
            if (data.success) {
                await fetchPermissions(targetRoleId);
            }
        } catch (error: unknown) {
            let errorMessage = t('admin.roles.messages.permission_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
            throw error;
        }
    };

    const handleDeletePermission = async (permissionId: number, targetRoleId: number) => {
        try {
            const { data } = await axios.delete(`/api/admin/permissions/${permissionId}`);
            if (data.success) {
                await fetchPermissions(targetRoleId);
            }
        } catch (error: unknown) {
            let errorMessage = t('admin.roles.messages.permission_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
            throw error;
        }
    };

    const bulkTogglePermissions = async (items: Array<{ value: string; enable: boolean }>) => {
        if (!editorRoleId) return;

        const workingMap = new Map(assignedPermissionMap);

        try {
            for (const item of items) {
                if (!item.enable && isRootLocked(item.value, editorRoleId)) continue;

                if (item.enable && !workingMap.has(item.value)) {
                    const { data } = await axios.put('/api/admin/permissions', {
                        role_id: editorRoleId,
                        permission: item.value,
                    });
                    const created = data.data?.permission as RolePermission | undefined;
                    if (created?.id) {
                        workingMap.set(item.value, created.id);
                    }
                } else if (!item.enable) {
                    const permissionId = workingMap.get(item.value);
                    if (permissionId) {
                        await axios.delete(`/api/admin/permissions/${permissionId}`);
                        workingMap.delete(item.value);
                    }
                }
            }
            await fetchPermissions(editorRoleId);
        } catch (error: unknown) {
            let errorMessage = t('admin.roles.messages.permission_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
            throw error;
        }
    };

    const togglePermission = async (permissionValue: string, checked: boolean) => {
        if (!editorRoleId) return;

        if (!checked && isRootLocked(permissionValue, editorRoleId)) {
            toast.error(t('admin.roles.messages.cannot_remove_own_admin_root'));
            return;
        }

        setTogglingPermission(permissionValue);
        try {
            if (checked) {
                await handleAddPermission(permissionValue, editorRoleId);
            } else {
                const permissionId = assignedPermissionMap.get(permissionValue);
                if (permissionId) {
                    await handleDeletePermission(permissionId, editorRoleId);
                }
            }
        } catch {
            // Error toast already shown
        } finally {
            setTogglingPermission(null);
        }
    };

    const handleDisplayNameChange = (value: string) => {
        setForm((prev) => {
            const next = { ...prev, display_name: value };
            if (!nameManuallyEdited.current) {
                next.name = slugifyRoleName(value);
            }
            return next;
        });
    };

    const handleSaveRole = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            name: form.name.trim(),
            display_name: form.display_name.trim(),
            custom_badge: form.custom_badge.trim(),
            color: form.color,
        };

        try {
            if (mode === 'create') {
                const { data } = await axios.put('/api/admin/roles', payload);
                const createdRole = data.data.role as Role;
                toast.success(t('admin.roles.messages.created'));
                router.push(`/admin/roles/${createdRole.id}/edit?tab=permissions`);
            } else if (editorRoleId) {
                await axios.patch(`/api/admin/roles/${editorRoleId}`, payload);
                if (user?.role_id === editorRoleId) {
                    await refreshSession();
                }
                toast.success(t('admin.roles.messages.updated'));
            }
        } catch (error: unknown) {
            console.error('Error saving role:', error);
            const messageKey =
                mode === 'create' ? 'admin.roles.messages.create_failed' : 'admin.roles.messages.update_failed';
            let errorMessage = t(messageKey);
            if (isAxiosError(error) && error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRole = async () => {
        if (!editorRoleId || !confirm(t('admin.roles.delete_confirm'))) return;

        setIsSubmitting(true);
        try {
            await axios.delete(`/api/admin/roles/${editorRoleId}`);
            toast.success(t('admin.roles.messages.deleted'));
            router.push('/admin/roles');
        } catch (error: unknown) {
            console.error('Error deleting role:', error);
            let errorMessage = t('admin.roles.messages.delete_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return {
        loading,
        form,
        setForm,
        activeTab,
        setActiveTab,
        editorRoleId,
        isSubmitting,
        loadingPermissions,
        assignedPermissionMap,
        togglingPermission,
        isYourRole: editorRoleId !== null && user?.role_id === editorRoleId,
        nameManuallyEdited,
        handleDisplayNameChange,
        handleSaveRole,
        handleDeleteRole,
        togglePermission,
        bulkTogglePermissions,
        isRootLocked: (value: string) => isRootLocked(value, editorRoleId),
        canEditPermissions: mode === 'edit' && editorRoleId !== null,
    };
}
