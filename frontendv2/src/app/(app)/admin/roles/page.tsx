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

import { useState, useEffect, useMemo } from 'react';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import {
    Shield,
    Plus,
    Pencil,
    Trash2,
    Search,
    RefreshCw,
    X,
    ChevronLeft,
    ChevronRight,
    KeyRound,
    AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { ResourceCard, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { EmptyState } from '@/components/featherui/EmptyState';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import Permissions from '@/lib/permissions';
import { Badge } from '@/components/ui/badge';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

interface Role {
    id: number;
    name: string;
    display_name: string;
    color: string;
    created_at: string;
    updated_at: string;
}

interface Permission {
    id: number;
    role_id: number;
    permission: string;
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export default function RolesPage() {
    const { t } = useTranslation();
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-roles');
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [permissionsOpen, setPermissionsOpen] = useState(false);

    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [permissionsRole, setPermissionsRole] = useState<Role | null>(null);
    const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
    const [loadingPermissions, setLoadingPermissions] = useState(false);

    const [newRole, setNewRole] = useState({
        name: '',
        display_name: '',
        color: '#5B8DEF',
    });
    const [roleColorHex, setRoleColorHex] = useState('#5B8DEF');

    const [isSubmitting, setIsSubmitting] = useState(false);

    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    const [permissionSearch, setPermissionSearch] = useState('');
    const allPermissions = useMemo(() => Permissions.getAll(), []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== debouncedSearchQuery) {
                setPagination((prev) => ({ ...prev, page: 1 }));
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [debouncedSearchQuery, searchQuery]);

    useEffect(() => {
        const controller = new AbortController();
        const fetchRoles = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/admin/roles', {
                    params: {
                        page: pagination.page,
                        limit: pagination.pageSize,
                        search: debouncedSearchQuery || undefined,
                    },
                    signal: controller.signal,
                });

                setRoles(data.data.roles || []);
                const apiPagination = data.data.pagination;
                setPagination((prev) => ({
                    ...prev,
                    page: apiPagination.current_page,
                    pageSize: apiPagination.per_page,
                    total: apiPagination.total_records,
                    totalPages: Math.ceil(apiPagination.total_records / apiPagination.per_page),
                    hasNext: apiPagination.has_next,
                    hasPrev: apiPagination.has_prev,
                }));
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
    }, [pagination.page, pagination.pageSize, debouncedSearchQuery, refreshKey, t, fetchWidgets]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.put('/api/admin/roles', newRole);
            toast.success(t('admin.roles.messages.created'));
            setCreateOpen(false);
            resetNewRole();
            setRefreshKey((prev) => prev + 1);
        } catch (error: unknown) {
            console.error('Error creating role:', error);
            let errorMessage = t('admin.roles.messages.create_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRole) return;

        setIsSubmitting(true);
        try {
            const payload = {
                name: editingRole.name,
                display_name: editingRole.display_name,
                color: editingRole.color,
            };

            await axios.patch(`/api/admin/roles/${editingRole.id}`, payload);
            toast.success(t('admin.roles.messages.updated'));
            setEditOpen(false);
            setEditingRole(null);
            setRefreshKey((prev) => prev + 1);
        } catch (error: unknown) {
            console.error('Error updating role:', error);
            let errorMessage = t('admin.roles.messages.update_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

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

    const fetchPermissions = async (roleId: number) => {
        setLoadingPermissions(true);
        try {
            const { data } = await axios.get('/api/admin/permissions', {
                // Fetch the full role permission set for the sidebar list.
                params: { role_id: roleId, limit: 100 },
            });
            setRolePermissions(data.data.permissions || []);
        } catch (error) {
            console.error('Error fetching permissions:', error);
        } finally {
            setLoadingPermissions(false);
        }
    };

    const handleAddPermission = async (permissionValue: string) => {
        if (!permissionsRole) return;
        try {
            const { data } = await axios.put('/api/admin/permissions', {
                role_id: permissionsRole.id,
                permission: permissionValue,
            });
            if (data.success) {
                toast.success(t('admin.roles.messages.permission_added'));
                await fetchPermissions(permissionsRole.id);
            }
        } catch (error: unknown) {
            let errorMessage = t('admin.roles.messages.permission_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
        }
    };

    const handleDeletePermission = async (permissionId: number) => {
        if (!permissionsRole) return;
        try {
            const { data } = await axios.delete(`/api/admin/permissions/${permissionId}`);
            if (data.success) {
                toast.success(t('admin.roles.messages.permission_removed'));
                await fetchPermissions(permissionsRole.id);
            }
        } catch (error: unknown) {
            let errorMessage = t('admin.roles.messages.permission_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
        }
    };

    const resetNewRole = () => {
        setNewRole({
            name: '',
            display_name: '',
            color: '#5B8DEF',
        });
        setRoleColorHex('#5B8DEF');
    };

    const openEdit = (role: Role) => {
        setEditingRole({ ...role });
        setEditOpen(true);
    };

    const openPermissions = (role: Role) => {
        setPermissionsRole(role);
        fetchPermissions(role.id);
        setPermissionsOpen(true);
        setPermissionSearch('');
    };

    const filteredAvailablePermissions = useMemo(() => {
        const assigned = new Set(rolePermissions.map((p) => p.permission));
        const search = permissionSearch.toLowerCase();

        return allPermissions.filter((p) => {
            const isAssigned = assigned.has(p.value);
            const matchesSearch =
                p.value.toLowerCase().includes(search) ||
                p.description.toLowerCase().includes(search) ||
                p.category.toLowerCase().includes(search);
            return !isAssigned && matchesSearch;
        });
    }, [rolePermissions, allPermissions, permissionSearch]);

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-roles', 'top-of-page')} />
            <PageHeader
                title={t('admin.roles.title')}
                description={t('admin.roles.subtitle')}
                icon={Shield}
                actions={
                    <Button
                        onClick={() => {
                            resetNewRole();
                            setCreateOpen(true);
                        }}
                    >
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
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='h-11 w-full pl-10'
                    />
                </div>
            </div>

            {pagination.totalPages > 1 && !loading && (
                <div className='border-border bg-card/50 mb-4 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={!pagination.hasPrev}
                        onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                        className='gap-1.5'
                    >
                        <ChevronLeft className='h-4 w-4' />
                        {t('common.previous')}
                    </Button>
                    <span className='text-sm font-medium'>
                        {pagination.page} / {pagination.totalPages}
                    </span>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={!pagination.hasNext}
                        onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                        className='gap-1.5'
                    >
                        {t('common.next')}
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            )}

            {loading ? (
                <TableSkeleton count={3} />
            ) : roles.length === 0 ? (
                <EmptyState
                    icon={Shield}
                    title={t('admin.roles.no_results')}
                    description={t('admin.roles.search_placeholder')}
                    action={
                        <Button
                            onClick={() => {
                                resetNewRole();
                                setCreateOpen(true);
                            }}
                        >
                            {t('admin.roles.create')}
                        </Button>
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    <WidgetRenderer widgets={getWidgets('admin-roles', 'before-list')} />
                    {roles.map((role) => {
                        const badges: ResourceBadge[] = [
                            {
                                label: role.name,
                                className: 'bg-secondary text-secondary-foreground font-mono',
                            },
                        ];

                        return (
                            <ResourceCard
                                key={role.id}
                                icon={Shield}
                                title={role.display_name}
                                subtitle={`${t('admin.roles.form.color')}: ${role.color}`}
                                badges={badges}
                                iconClassName='text-primary'
                                style={{
                                    borderColor: role.color,
                                    boxShadow: `0 0 10px -5px ${role.color}`,
                                }}
                                description={
                                    <div className='mt-2 flex items-center gap-2'>
                                        <div
                                            className='border-border h-6 w-6 rounded-md border'
                                            style={{ backgroundColor: role.color }}
                                        />
                                        <span className='text-muted-foreground text-sm'>
                                            {t('admin.roles.labels.created')}:{' '}
                                            {new Date(role.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </span>
                                    </div>
                                }
                                actions={
                                    <div className='flex items-center gap-2'>
                                        <Button size='sm' variant='outline' onClick={() => openPermissions(role)}>
                                            <Shield className='mr-2 h-4 w-4' />
                                            {t('admin.roles.form.permissions')}
                                        </Button>
                                        <Button size='sm' variant='ghost' onClick={() => openEdit(role)}>
                                            <Pencil className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                            onClick={() => handleDelete(role.id)}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <RefreshCw className='h-4 w-4 animate-spin' />
                                            ) : (
                                                <Trash2 className='h-4 w-4' />
                                            )}
                                        </Button>
                                    </div>
                                }
                            />
                        );
                    })}
                </div>
            )}

            {pagination.totalPages > 1 && (
                <div className='mt-8 flex items-center justify-center gap-2'>
                    <Button
                        variant='outline'
                        size='icon'
                        disabled={!pagination.hasPrev}
                        onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                    >
                        <ChevronLeft className='h-4 w-4' />
                    </Button>
                    <div className='flex items-center gap-2'>
                        <span className='text-sm font-medium'>
                            {pagination.page} / {pagination.totalPages}
                        </span>
                    </div>
                    <Button
                        variant='outline'
                        size='icon'
                        disabled={!pagination.hasNext}
                        onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    >
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            )}

            <div className='grid grid-cols-1 gap-6 pt-10 md:grid-cols-2 lg:grid-cols-3'>
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

            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.roles.form.create_title')}</SheetTitle>
                        <SheetDescription>{t('admin.roles.create_description')}</SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleCreate} className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='create-name'>{t('admin.roles.form.name')}</Label>
                            <Input
                                id='create-name'
                                value={newRole.name}
                                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                                required
                                placeholder='admin'
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='create-display-name'>{t('admin.roles.form.display_name')}</Label>
                            <Input
                                id='create-display-name'
                                value={newRole.display_name}
                                onChange={(e) => setNewRole({ ...newRole, display_name: e.target.value })}
                                required
                                placeholder='Administrator'
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='create-color'>{t('admin.roles.form.color')}</Label>
                            <div className='flex items-center gap-2'>
                                <Input
                                    type='color'
                                    id='create-color-picker'
                                    value={newRole.color}
                                    onChange={(e) => {
                                        setNewRole({ ...newRole, color: e.target.value });
                                        setRoleColorHex(e.target.value.toUpperCase());
                                    }}
                                    className='h-10 w-12 cursor-pointer p-1'
                                />
                                <Input
                                    id='create-color'
                                    value={roleColorHex}
                                    onChange={(e) => {
                                        setRoleColorHex(e.target.value);
                                        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                                            setNewRole({ ...newRole, color: e.target.value });
                                        }
                                    }}
                                    required
                                    placeholder='#5B8DEF'
                                    className='flex-1'
                                />
                            </div>
                        </div>

                        <SheetFooter>
                            <Button type='submit' loading={isSubmitting}>
                                {t('admin.roles.form.submit_create')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>

            <Sheet open={editOpen} onOpenChange={setEditOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.roles.form.edit_title')}</SheetTitle>
                        <SheetDescription>{t('admin.roles.edit_description')}</SheetDescription>
                    </SheetHeader>

                    {editingRole && (
                        <form onSubmit={handleUpdate} className='space-y-4'>
                            <div className='space-y-2'>
                                <Label htmlFor='edit-name'>{t('admin.roles.form.name')}</Label>
                                <Input
                                    id='edit-name'
                                    value={editingRole.name}
                                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor='edit-display-name'>{t('admin.roles.form.display_name')}</Label>
                                <Input
                                    id='edit-display-name'
                                    value={editingRole.display_name}
                                    onChange={(e) => setEditingRole({ ...editingRole, display_name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor='edit-color'>{t('admin.roles.form.color')}</Label>
                                <div className='flex items-center gap-2'>
                                    <Input
                                        type='color'
                                        id='edit-color-picker'
                                        value={editingRole.color}
                                        onChange={(e) => setEditingRole({ ...editingRole, color: e.target.value })}
                                        className='h-10 w-12 cursor-pointer p-1'
                                    />
                                    <Input
                                        id='edit-color'
                                        value={editingRole.color}
                                        onChange={(e) => setEditingRole({ ...editingRole, color: e.target.value })}
                                        required
                                        className='flex-1'
                                    />
                                </div>
                            </div>

                            <SheetFooter>
                                <Button type='submit' loading={isSubmitting}>
                                    {t('admin.roles.form.submit_update')}
                                </Button>
                            </SheetFooter>
                        </form>
                    )}
                </div>
            </Sheet>

            <Sheet open={permissionsOpen} onOpenChange={setPermissionsOpen}>
                <div className='flex h-full flex-col'>
                    <SheetHeader>
                        <SheetTitle className='flex items-center gap-2'>
                            {t('admin.roles.permissions.title')}
                            {permissionsRole && (
                                <Badge
                                    className='font-mono text-xs'
                                    style={{ backgroundColor: permissionsRole.color, color: '#fff' }}
                                >
                                    {permissionsRole.display_name}
                                </Badge>
                            )}
                        </SheetTitle>
                        <SheetDescription>{t('admin.roles.permissions.description')}</SheetDescription>
                    </SheetHeader>

                    <div className='mt-6 flex flex-1 flex-col gap-4 overflow-hidden'>
                        <div className='group relative'>
                            <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                            <Input
                                placeholder={t('admin.roles.permissions.search')}
                                value={permissionSearch}
                                onChange={(e) => setPermissionSearch(e.target.value)}
                                className='bg-background/20 focus-visible:ring-primary/30 h-11 border-none pl-10 focus-visible:ring-1'
                            />

                            {permissionSearch && (
                                <div className='bg-popover absolute top-[calc(100%+4px)] right-0 left-0 z-50 max-h-[280px] overflow-auto rounded-xl border-none p-1'>
                                    {filteredAvailablePermissions.length === 0 ? (
                                        <div className='text-muted-foreground p-4 text-center text-sm'>
                                            {t('admin.roles.no_results')}
                                        </div>
                                    ) : (
                                        <div className='space-y-0.5'>
                                            {filteredAvailablePermissions.map((perm) => (
                                                <div
                                                    key={perm.value}
                                                    className='hover:bg-accent hover:text-accent-foreground group/item flex cursor-pointer flex-col rounded-lg p-2 transition-colors'
                                                    onClick={() => {
                                                        handleAddPermission(perm.value);
                                                        setPermissionSearch('');
                                                    }}
                                                >
                                                    <div className='flex items-center justify-between'>
                                                        <span className='font-mono text-sm font-bold'>
                                                            {perm.value}
                                                        </span>
                                                        <Plus className='h-3 w-3 opacity-0 transition-opacity group-hover/item:opacity-100' />
                                                    </div>
                                                    <span className='text-muted-foreground line-clamp-1 text-xs'>
                                                        {perm.description}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className='bg-card/20 flex-1 overflow-y-auto rounded-xl'>
                            {loadingPermissions ? (
                                <div className='flex h-full flex-col items-center justify-center gap-2 p-4'>
                                    <RefreshCw className='text-muted-foreground h-5 w-5 animate-spin' />
                                    <span className='text-muted-foreground text-xs'>
                                        {t('admin.roles.permissions.syncing')}
                                    </span>
                                </div>
                            ) : rolePermissions.length === 0 ? (
                                <div className='text-muted-foreground flex h-full items-center justify-center p-8 text-center text-sm'>
                                    {t('admin.roles.form.no_permissions')}
                                </div>
                            ) : (
                                <div className='divide-border/20 divide-y'>
                                    {rolePermissions.map((perm) => (
                                        <div
                                            key={perm.id}
                                            className='hover:bg-muted/30 group/row flex items-center justify-between p-3 transition-colors'
                                        >
                                            <div className='flex min-w-0 flex-col pr-2'>
                                                <span className='truncate font-mono text-sm font-medium'>
                                                    {perm.permission}
                                                </span>
                                            </div>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                className='text-destructive/50 hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0'
                                                onClick={() => handleDeletePermission(perm.id)}
                                            >
                                                <X className='h-4 w-4' />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <SheetFooter className='pt-6'>
                        <Button variant='secondary' onClick={() => setPermissionsOpen(false)} className='w-full'>
                            {t('common.close')}
                        </Button>
                    </SheetFooter>
                </div>
            </Sheet>
            <WidgetRenderer widgets={getWidgets('admin-roles', 'bottom-of-page')} />
        </div>
    );
}
