/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
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

    // Pagination state
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    // Drawer states
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [permissionsOpen, setPermissionsOpen] = useState(false);

    // Selected items
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [permissionsRole, setPermissionsRole] = useState<Role | null>(null);
    const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
    const [loadingPermissions, setLoadingPermissions] = useState(false);

    // Form states
    const [newRole, setNewRole] = useState({
        name: '',
        display_name: '',
        color: '#5B8DEF',
    });
    const [roleColorHex, setRoleColorHex] = useState('#5B8DEF');

    const [isSubmitting, setIsSubmitting] = useState(false);

    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    // Permissions management state
    const [permissionSearch, setPermissionSearch] = useState('');
    const allPermissions = useMemo(() => Permissions.getAll(), []);

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== debouncedSearchQuery) {
                setPagination((prev) => ({ ...prev, page: 1 }));
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [debouncedSearchQuery, searchQuery]);

    // Fetch roles
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
                params: { role_id: roleId },
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
                        <Plus className='h-4 w-4 mr-2' />
                        {t('admin.roles.create')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-roles', 'after-header')} />

            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/50 backdrop-blur-md p-4 rounded-2xl border border-border shadow-sm'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.roles.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='pl-10 h-11 w-full'
                    />
                </div>
            </div>

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
                                    <div className='flex items-center gap-2 mt-2'>
                                        <div
                                            className='w-6 h-6 rounded-md border border-border'
                                            style={{ backgroundColor: role.color }}
                                        />
                                        <span className='text-sm text-muted-foreground'>
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
                                            <Shield className='h-4 w-4 mr-2' />
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
                <div className='flex items-center justify-center gap-2 mt-8'>
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

            {/* Help Cards */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10'>
                <PageCard title={t('admin.roles.help.managing.title')} icon={Shield}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.roles.help.managing.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.roles.help.permissions.title')} icon={AlertCircle}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.roles.help.permissions.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.roles.help.security.title')} icon={KeyRound} variant='danger'>
                    <ul className='list-disc list-inside space-y-1 text-sm text-muted-foreground'>
                        <li>{t('admin.roles.help.security.item1')}</li>
                        <li>{t('admin.roles.help.security.item2')}</li>
                        <li>{t('admin.roles.help.security.item3')}</li>
                    </ul>
                </PageCard>
            </div>

            {/* Create Sheet */}
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
                                    className='w-12 h-10 p-1 cursor-pointer'
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

            {/* Edit Sheet */}
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
                                        className='w-12 h-10 p-1 cursor-pointer'
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

            {/* Permissions Sheet */}
            <Sheet open={permissionsOpen} onOpenChange={setPermissionsOpen}>
                <div className='h-full flex flex-col'>
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

                    <div className='flex-1 overflow-hidden flex flex-col gap-4 mt-6'>
                        <div className='relative group'>
                            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                            <Input
                                placeholder={t('admin.roles.permissions.search')}
                                value={permissionSearch}
                                onChange={(e) => setPermissionSearch(e.target.value)}
                                className='pl-10 h-11 bg-background/20 border-none focus-visible:ring-1 focus-visible:ring-primary/30'
                            />

                            {permissionSearch && (
                                <div className='absolute left-0 right-0 top-[calc(100%+4px)] z-50 rounded-xl max-h-[280px] overflow-auto bg-popover shadow-2xl p-1 border-none'>
                                    {filteredAvailablePermissions.length === 0 ? (
                                        <div className='p-4 text-sm text-muted-foreground text-center'>
                                            {t('admin.roles.no_results')}
                                        </div>
                                    ) : (
                                        <div className='space-y-0.5'>
                                            {filteredAvailablePermissions.map((perm) => (
                                                <div
                                                    key={perm.value}
                                                    className='flex flex-col p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-lg transition-colors group/item'
                                                    onClick={() => {
                                                        handleAddPermission(perm.value);
                                                        setPermissionSearch('');
                                                    }}
                                                >
                                                    <div className='flex items-center justify-between'>
                                                        <span className='font-bold text-sm font-mono'>
                                                            {perm.value}
                                                        </span>
                                                        <Plus className='h-3 w-3 opacity-0 group-hover/item:opacity-100 transition-opacity' />
                                                    </div>
                                                    <span className='text-xs text-muted-foreground line-clamp-1'>
                                                        {perm.description}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className='flex-1 overflow-y-auto rounded-xl bg-card/20'>
                            {loadingPermissions ? (
                                <div className='h-full flex flex-col items-center justify-center p-4 gap-2'>
                                    <RefreshCw className='h-5 w-5 animate-spin text-muted-foreground' />
                                    <span className='text-xs text-muted-foreground'>
                                        {t('admin.roles.permissions.syncing')}
                                    </span>
                                </div>
                            ) : rolePermissions.length === 0 ? (
                                <div className='h-full flex items-center justify-center p-8 text-center text-muted-foreground text-sm'>
                                    {t('admin.roles.form.no_permissions')}
                                </div>
                            ) : (
                                <div className='divide-y divide-border/20'>
                                    {rolePermissions.map((perm) => (
                                        <div
                                            key={perm.id}
                                            className='p-3 flex items-center justify-between hover:bg-muted/30 transition-colors group/row'
                                        >
                                            <div className='flex flex-col min-w-0 pr-2'>
                                                <span className='font-mono text-sm font-medium truncate'>
                                                    {perm.permission}
                                                </span>
                                            </div>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                className='h-8 w-8 p-0 text-destructive/50 hover:text-destructive hover:bg-destructive/10'
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
