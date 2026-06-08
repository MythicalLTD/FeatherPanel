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

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import {
    Shield,
    Plus,
    Trash2,
    Search,
    ChevronLeft,
    ChevronRight,
    KeyRound,
    AlertCircle,
    Copy,
    Users,
    Pencil,
} from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { EmptyState } from '@/components/featherui/EmptyState';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { usePersistedListFilters } from '@/hooks/usePersistedListFilters';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { cn } from '@/lib/utils';
import { RoleBadge } from '@/components/RoleBadge';
import { isDefaultRole, type Role } from '@/lib/role-utils';

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
    const { filters, patchFilters, hydrated } = usePersistedListFilters(
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
                    toast.error(t('admin.roles.messages.fetch_failed'));
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
            let errorMessage = t('admin.roles.messages.delete_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
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
            let errorMessage = t('admin.roles.messages.duplicate_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
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

            <div className='bg-card/50 border-border flex flex-col items-center gap-4 rounded-2xl border p-4 shadow-sm backdrop-blur-md sm:flex-row'>
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
                <div className='border-border bg-card/50 mb-4 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={page === 1}
                        onClick={() => patchFilters({ page: page - 1 })}
                        className='gap-1.5'
                    >
                        <ChevronLeft className='h-4 w-4' />
                        {t('common.previous')}
                    </Button>
                    <span className='text-sm font-medium'>
                        {page} / {pagination.totalPages}
                    </span>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={page === pagination.totalPages}
                        onClick={() => patchFilters({ page: page + 1 })}
                        className='gap-1.5'
                    >
                        {t('common.next')}
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            )}

            {loading ? (
                <TableSkeleton count={6} />
            ) : roles.length === 0 ? (
                <EmptyState
                    icon={Shield}
                    title={t('admin.roles.no_results')}
                    description={t('admin.roles.search_placeholder')}
                    action={
                        <Button onClick={() => router.push('/admin/roles/create')}>{t('admin.roles.create')}</Button>
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                    <WidgetRenderer widgets={getWidgets('admin-roles', 'before-list')} />
                    {roles.map((role) => {
                        const permCount = permissionCounts[role.id];
                        const isYours = user?.role_id === role.id;

                        return (
                            <div
                                key={role.id}
                                className={cn(
                                    'group bg-card/50 border-border/70 relative flex flex-col overflow-hidden rounded-2xl border shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                                    isYours && 'ring-primary/30 ring-2',
                                )}
                                style={{ borderColor: `${role.color}44` }}
                            >
                                <div className='h-1.5 w-full' style={{ backgroundColor: role.color }} />

                                <button
                                    type='button'
                                    onClick={() => router.push(`/admin/roles/${role.id}/edit`)}
                                    className='flex flex-1 flex-col p-5 text-left'
                                >
                                    <div className='flex items-start gap-3'>
                                        <div
                                            className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm'
                                            style={{ backgroundColor: role.color }}
                                        >
                                            <Shield className='h-5 w-5 text-white' />
                                        </div>
                                        <div className='min-w-0 flex-1'>
                                            <div className='flex flex-wrap items-center gap-2'>
                                                <h3 className='truncate text-base font-semibold'>
                                                    {role.display_name}
                                                </h3>
                                                <RoleBadge role={role} variant='solid' className='text-[10px]' />
                                                {isYours && (
                                                    <Badge variant='secondary' className='text-[10px]'>
                                                        {t('admin.roles.labels.your_role')}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className='text-muted-foreground mt-0.5 font-mono text-xs'>
                                                {role.name}
                                            </p>
                                        </div>
                                    </div>

                                    <div className='mt-4 flex flex-wrap items-center gap-2'>
                                        <Badge variant='outline' className='gap-1 font-normal'>
                                            <KeyRound className='h-3 w-3' />
                                            {permCount !== undefined
                                                ? t('admin.roles.stats.permission_count', { count: String(permCount) })
                                                : '...'}
                                        </Badge>
                                        <span className='text-muted-foreground text-xs'>
                                            {new Date(role.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </button>

                                <div className='border-border/50 flex items-center gap-1 border-t px-3 py-2'>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        className='h-8 flex-1 text-xs'
                                        onClick={() => router.push(`/admin/roles/${role.id}/edit`)}
                                    >
                                        <Pencil className='mr-1.5 h-3.5 w-3.5' />
                                        {t('common.edit')}
                                    </Button>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        className='h-8 flex-1 text-xs'
                                        onClick={() => handleDuplicate(role)}
                                        disabled={isSubmitting}
                                    >
                                        <Copy className='mr-1.5 h-3.5 w-3.5' />
                                        {t('admin.roles.actions.duplicate')}
                                    </Button>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        className='text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2'
                                        onClick={() => handleDelete(role.id)}
                                        disabled={isSubmitting || isDefaultRole(role.id)}
                                    >
                                        <Trash2 className='h-3.5 w-3.5' />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {pagination.totalPages > 1 && (
                <div className='mt-8 flex items-center justify-center gap-2'>
                    <Button
                        variant='outline'
                        size='icon'
                        disabled={page === 1}
                        onClick={() => patchFilters({ page: page - 1 })}
                    >
                        <ChevronLeft className='h-4 w-4' />
                    </Button>
                    <span className='text-sm font-medium'>
                        {page} / {pagination.totalPages}
                    </span>
                    <Button
                        variant='outline'
                        size='icon'
                        disabled={page === pagination.totalPages}
                        onClick={() => patchFilters({ page: page + 1 })}
                    >
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            )}

            <div className='grid grid-cols-1 gap-6 pt-6 md:grid-cols-2 lg:grid-cols-3'>
                <PageCard title={t('admin.roles.help.managing.title')} icon={Shield}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.roles.help.managing.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.roles.help.permissions.title')} icon={AlertCircle}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.roles.help.permissions.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.roles.help.security.title')} icon={KeyRound} variant='danger'>
                    <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm'>
                        <li>{t('admin.roles.help.security.item1')}</li>
                        <li>{t('admin.roles.help.security.item2')}</li>
                        <li>{t('admin.roles.help.security.item3')}</li>
                    </ul>
                </PageCard>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-roles', 'bottom-of-page')} />
        </div>
    );
}
