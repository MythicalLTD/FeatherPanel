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

import { AdminPageTips } from '@/components/admin/AdminPageTips';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage } from '@/lib/api-errors';
import { useSession } from '@/contexts/SessionContext';
import { Shield, Plus, Trash2, Search, KeyRound, Copy, Users, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { ListEmptyState } from '@/components/featherui/ListEmptyState';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { DataTable, RowActionsMenu } from '@/components/featherui/DataTable';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { usePersistedListFilters } from '@/hooks/usePersistedListFilters';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { RoleBadge, RoleIconAvatar } from '@/components/RoleBadge';
import { isDefaultRole, type Role } from '@/lib/role-utils';
import { ListPagination } from '@/components/featherui/ListPagination';

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

const ROLES_LIST_FILTERS_KEY = 'featherpanel_admin_roles_filters_v1';
const ROLES_LIST_FILTERS_DEFAULTS = {
    searchQuery: '',
    page: 1,
    pageSize: 12,
};

export default function RolesPage() {
    const { t } = useTranslation();
    const { user } = useSession();
    const router = useRouter();
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-roles');
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissionCounts, setPermissionCounts] = useState<Record<number, number>>({});
    const [loading, setLoading] = useState(true);
    const { filters, patchFilters, hydrated, resetFilters, isFiltered } = usePersistedListFilters(
        ROLES_LIST_FILTERS_KEY,
        ROLES_LIST_FILTERS_DEFAULTS,
    );
    const { searchQuery, page, pageSize } = filters;
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [pagination, setPagination] = useState<Omit<Pagination, 'page' | 'pageSize'>>({
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== debouncedSearchQuery) {
                patchFilters({ page: 1 });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [debouncedSearchQuery, patchFilters, searchQuery]);

    useEffect(() => {
        if (!hydrated) {
            return;
        }

        const controller = new AbortController();
        const fetchRoles = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/admin/roles', {
                    params: {
                        page,
                        limit: pageSize,
                        search: debouncedSearchQuery || undefined,
                    },
                    signal: controller.signal,
                });

                const fetchedRoles: Role[] = data.data.roles || [];
                setRoles(fetchedRoles);
                const apiPagination = data.data.pagination;
                setPagination({
                    total: apiPagination.total_records,
                    totalPages: Math.ceil(apiPagination.total_records / apiPagination.per_page),
                    hasNext: apiPagination.has_next,
                    hasPrev: apiPagination.has_prev,
                });

                if (fetchedRoles.length > 0) {
                    const counts = await Promise.all(
                        fetchedRoles.map(async (role) => {
                            try {
                                const permRes = await axios.get('/api/admin/permissions', {
                                    params: { role_id: role.id, limit: 1 },
                                    signal: controller.signal,
                                });
                                return {
                                    id: role.id,
                                    count: permRes.data.data.pagination?.total_records ?? 0,
                                };
                            } catch {
                                return { id: role.id, count: 0 };
                            }
                        }),
                    );
                    setPermissionCounts(Object.fromEntries(counts.map((entry) => [entry.id, entry.count])));
                } else {
                    setPermissionCounts({});
                }
            } catch (error) {
                if (!axios.isCancel(error)) {
                    console.error('Error fetching roles:', error);
                    toast.error(getApiErrorMessage(error, t, 'admin.roles.messages.fetch_failed'));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchRoles();
        fetchWidgets();
        return () => {
            controller.abort();
        };
    }, [page, pageSize, debouncedSearchQuery, refreshKey, t, fetchWidgets, hydrated]);

    const handleDelete = async (id: number) => {
        if (!confirm(t('admin.roles.delete_confirm'))) return;

        setIsSubmitting(true);
        try {
            await axios.delete(`/api/admin/roles/${id}`);
            toast.success(t('admin.roles.messages.deleted'));
            setRefreshKey((prev) => prev + 1);
        } catch (error: unknown) {
            console.error('Error deleting role:', error);
            toast.error(getApiErrorMessage(error, t, 'admin.roles.messages.delete_failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDuplicate = async (role: Role) => {
        setIsSubmitting(true);
        try {
            const { data: createData } = await axios.put('/api/admin/roles', {
                name: `${role.name}_copy`,
                display_name: `${role.display_name} (Copy)`,
                custom_badge: role.custom_badge ?? '',
                badge_icon: role.badge_icon ?? '',
                color: role.color,
            });
            const newRole = createData.data.role as Role;

            const { data: permData } = await axios.get('/api/admin/permissions', {
                params: { role_id: role.id, limit: 500 },
            });
            const sourcePermissions = permData.data.permissions || [];

            await Promise.all(
                sourcePermissions.map((perm: { permission: string }) =>
                    axios.put('/api/admin/permissions', {
                        role_id: newRole.id,
                        permission: perm.permission,
                    }),
                ),
            );

            toast.success(t('admin.roles.messages.duplicated'));
            router.push(`/admin/roles/${newRole.id}/edit`);
        } catch (error: unknown) {
            console.error('Error duplicating role:', error);
            toast.error(getApiErrorMessage(error, t, 'admin.roles.messages.duplicate_failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-roles', 'top-of-page')} />
            <PageHeader
                title={t('admin.roles.title')}
                description={t('admin.roles.subtitle')}
                icon={Shield}
                actions={
                    <Button onClick={() => router.push('/admin/roles/create')}>
                        <Plus className='mr-2 h-4 w-4' />
                        {t('admin.roles.create')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-roles', 'after-header')} />

            <div className='fp-surface flex flex-col items-center gap-4 rounded-2xl border p-4 sm:flex-row'>
                <div className='group relative w-full flex-1'>
                    <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                    <Input
                        placeholder={t('admin.roles.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => patchFilters({ searchQuery: e.target.value })}
                        className='h-11 w-full pl-10'
                    />
                </div>
                {!loading && (
                    <div className='text-muted-foreground flex items-center gap-2 text-sm whitespace-nowrap'>
                        <Users className='h-4 w-4' />
                        {t('admin.roles.stats.role_count', { count: String(pagination.total) })}
                    </div>
                )}
            </div>

            {pagination.totalPages > 1 && !loading && (
                <ListPagination
                    page={page}
                    totalPages={pagination.totalPages}
                    onPageChange={(nextPage) => patchFilters({ page: nextPage })}
                    className='mb-4'
                />
            )}

            {loading ? (
                <TableSkeleton count={6} />
            ) : roles.length === 0 ? (
                <ListEmptyState
                    icon={Shield}
                    title={t('emptyStates.roles.title')}
                    description={t('emptyStates.roles.description')}
                    action={
                        <Button onClick={() => router.push('/admin/roles/create')}>{t('admin.roles.create')}</Button>
                    }
                    filtered={isFiltered}
                    onClearFilters={resetFilters}
                />
            ) : (
                <>
                    <WidgetRenderer widgets={getWidgets('admin-roles', 'before-list')} />
                    <DataTable
                        rows={roles}
                        rowKey={(role) => role.id}
                        onRowClick={(role) => router.push(`/admin/roles/${role.id}/edit`)}
                        columns={[
                            {
                                key: 'role',
                                header: t('admin.roles.table.role'),
                                className: 'w-[34%]',
                                cell: (role) => (
                                    <div className='flex min-w-0 items-center gap-3'>
                                        <RoleIconAvatar
                                            role={role}
                                            className='h-9 w-9'
                                            iconClassName='h-4 w-4'
                                            fallbackIcon={Shield}
                                        />
                                        <div className='min-w-0'>
                                            <div className='flex items-center gap-2'>
                                                <span className='truncate font-medium'>{role.display_name}</span>
                                                {user?.role_id === role.id ? (
                                                    <Badge variant='secondary' className='text-[10px]'>
                                                        {t('admin.roles.labels.your_role')}
                                                    </Badge>
                                                ) : null}
                                            </div>
                                            <div className='text-muted-foreground truncate font-mono text-xs'>
                                                {role.name}
                                            </div>
                                        </div>
                                    </div>
                                ),
                            },
                            {
                                key: 'badge',
                                header: t('admin.roles.table.badge'),
                                cell: (role) => <RoleBadge role={role} variant='solid' className='text-[10px]' />,
                            },
                            {
                                key: 'permissions',
                                header: t('admin.roles.table.permissions'),
                                className: 'text-muted-foreground text-xs',
                                cell: (role) => (
                                    <span className='inline-flex items-center gap-1.5'>
                                        <KeyRound className='h-3.5 w-3.5' />
                                        {permissionCounts[role.id] !== undefined
                                            ? t('admin.roles.stats.permission_count', {
                                                  count: String(permissionCounts[role.id]),
                                              })
                                            : '...'}
                                    </span>
                                ),
                            },
                            {
                                key: 'created',
                                header: t('admin.roles.table.created'),
                                className: 'text-muted-foreground text-xs whitespace-nowrap',
                                cell: (role) => new Date(role.created_at).toLocaleDateString(),
                            },
                        ]}
                        mobileCard={(role) => (
                            <div className='space-y-2.5'>
                                <div className='flex items-center gap-3'>
                                    <RoleIconAvatar
                                        role={role}
                                        className='h-9 w-9'
                                        iconClassName='h-4 w-4'
                                        fallbackIcon={Shield}
                                    />
                                    <div className='min-w-0'>
                                        <div className='truncate font-medium'>{role.display_name}</div>
                                        <div className='text-muted-foreground truncate font-mono text-xs'>
                                            {role.name}
                                        </div>
                                    </div>
                                </div>
                                <div className='flex flex-wrap items-center gap-2'>
                                    <RoleBadge role={role} variant='solid' className='text-[10px]' />
                                    {permissionCounts[role.id] !== undefined ? (
                                        <span className='text-muted-foreground text-xs'>
                                            {t('admin.roles.stats.permission_count', {
                                                count: String(permissionCounts[role.id]),
                                            })}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        )}
                        actions={(role) => (
                            <RowActionsMenu
                                items={[
                                    { label: t('common.edit'), icon: Pencil, href: `/admin/roles/${role.id}/edit` },
                                    {
                                        label: t('admin.roles.actions.duplicate'),
                                        icon: Copy,
                                        disabled: isSubmitting,
                                        onClick: () => handleDuplicate(role),
                                    },
                                    {
                                        label: t('common.delete'),
                                        icon: Trash2,
                                        destructive: true,
                                        separated: true,
                                        disabled: isSubmitting || isDefaultRole(role.id),
                                        onClick: () => handleDelete(role.id),
                                    },
                                ]}
                            />
                        )}
                    />
                </>
            )}

            {pagination.totalPages > 1 && (
                <ListPagination
                    page={page}
                    totalPages={pagination.totalPages}
                    onPageChange={(nextPage) => patchFilters({ page: nextPage })}
                    className='mt-4'
                />
            )}

            <AdminPageTips page='roles' />

            <WidgetRenderer widgets={getWidgets('admin-roles', 'bottom-of-page')} />
        </div>
    );
}
