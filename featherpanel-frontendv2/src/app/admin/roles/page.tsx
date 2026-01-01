/*
MIT License
Copyright (c) 2024-2026 MythicalSystems and Contributors
*/

'use client';

import { useState, useEffect } from 'react';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import {
    Users as UsersIcon,
    Plus,
    Eye,
    Pencil,
    Trash2,
    Search,
    RefreshCw,
    Shield,
    X,
    KeyRound,
    Palette,
    HelpCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Role {
    id: number;
    name: string;
    display_name: string;
    color: string;
    created_at: string;
    updated_at: string;
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

interface Permission {
    id: number;
    role_id: number;
    permission: string;
}

export default function RolesPage() {
    const { t } = useTranslation();
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    // Pagination state
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    // Sheet states
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [permissionsOpen, setPermissionsOpen] = useState(false);

    // Data states
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [permissionsRole, setPermissionsRole] = useState<Role | null>(null);

    // Form states
    const [newRole, setNewRole] = useState({
        name: '',
        display_name: '',
        color: '#000000',
    });

    // Permission states
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [newPermission, setNewPermission] = useState('');
    const [loadingPermissions, setLoadingPermissions] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

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

        return () => {
            controller.abort();
        };
    }, [pagination.page, pagination.pageSize, debouncedSearchQuery, refreshKey, t]);

    // Fetch permissions
    useEffect(() => {
        if (!permissionsOpen || !permissionsRole) return;

        const controller = new AbortController();
        const fetchPermissions = async () => {
            setLoadingPermissions(true);
            try {
                const { data } = await axios.get('/api/admin/permissions', {
                    params: { role_id: permissionsRole.id },
                    signal: controller.signal,
                });
                setPermissions(data.data.permissions || []);
            } catch (error) {
                if (!axios.isCancel(error)) {
                    console.error('Error fetching permissions:', error);
                    toast.error(t('admin.roles.messages.fetch_failed'));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingPermissions(false);
                }
            }
        };

        fetchPermissions();
        return () => controller.abort();
    }, [permissionsOpen, permissionsRole, t]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.put('/api/admin/roles', newRole);
            toast.success(t('admin.roles.messages.created'));
            setCreateOpen(false);
            setNewRole({ name: '', display_name: '', color: '#000000' });
            setRefreshKey((prev) => prev + 1);
        } catch (error: unknown) {
            console.error('Error creating role:', error);
            let errorMessage = t('admin.roles.messages.create_failed');
            if (isAxiosError(error) && error.response?.data?.error_message) {
                errorMessage = error.response.data.error_message;
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
            await axios.patch(`/api/admin/roles/${editingRole.id}`, {
                name: editingRole.name,
                display_name: editingRole.display_name,
                color: editingRole.color,
            });
            toast.success(t('admin.roles.messages.updated'));
            setEditOpen(false);
            setEditingRole(null);
            setRefreshKey((prev) => prev + 1);
        } catch (error: unknown) {
            console.error('Error updating role:', error);
            let errorMessage = t('admin.roles.messages.update_failed');
            if (isAxiosError(error) && error.response?.data?.error_message) {
                errorMessage = error.response.data.error_message;
            }
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (role: Role) => {
        if (!confirm(t('admin.roles.messages.delete_confirm'))) return;

        setDeletingId(role.id);
        try {
            await axios.delete(`/api/admin/roles/${role.id}`);
            toast.success(t('admin.roles.messages.deleted'));
            setRefreshKey((prev) => prev + 1);
        } catch (error: unknown) {
            console.error('Error deleting role:', error);
            let errorMessage = t('admin.roles.messages.delete_failed');
            if (isAxiosError(error) && error.response?.data?.error_message) {
                errorMessage = error.response.data.error_message;
            }
            toast.error(errorMessage);
        } finally {
            setDeletingId(null);
        }
    };

    const handleAddPermission = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!permissionsRole || !newPermission.trim()) return;

        try {
            const { data } = await axios.put('/api/admin/permissions', {
                role_id: permissionsRole.id,
                permission: newPermission.trim(),
            });

            if (data?.success) {
                toast.success(t('admin.roles.permissions.added'));
                setNewPermission('');
                // Refresh permissions
                const refreshData = await axios.get('/api/admin/permissions', {
                    params: { role_id: permissionsRole.id },
                });
                setPermissions(refreshData.data.data.permissions || []);
            } else {
                toast.error(data?.message || t('admin.roles.permissions.add_failed'));
            }
        } catch (error: unknown) {
            let errorMessage = t('admin.roles.permissions.add_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
        }
    };

    const handleDeletePermission = async (id: number) => {
        try {
            const { data } = await axios.delete(`/api/admin/permissions/${id}`);
            if (data?.success) {
                toast.success(t('admin.roles.permissions.deleted'));
                // Optimistic update
                setPermissions(permissions.filter((p) => p.id !== id));
            } else {
                toast.error(data?.message || t('admin.roles.permissions.delete_failed'));
            }
        } catch (error: unknown) {
            let errorMessage = t('admin.roles.permissions.delete_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }
            toast.error(errorMessage);
        }
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.roles.title')}
                description={t('admin.roles.subtitle')}
                icon={UsersIcon}
                actions={
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className='h-4 w-4 mr-2' />
                        {t('admin.roles.create')}
                    </Button>
                }
            />

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
                <TableSkeleton count={5} />
            ) : (
                <div className='rounded-md border bg-card'>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('admin.roles.table.name')}</TableHead>
                                <TableHead>{t('admin.roles.table.display_name')}</TableHead>
                                <TableHead>{t('admin.roles.table.color')}</TableHead>
                                <TableHead>{t('admin.roles.table.created_at')}</TableHead>
                                <TableHead className='text-right'>{t('admin.roles.table.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {roles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className='h-24 text-center'>
                                        {t('admin.roles.no_results')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                roles.map((role) => (
                                    <TableRow key={role.id}>
                                        <TableCell className='font-medium'>{role.name}</TableCell>
                                        <TableCell>{role.display_name}</TableCell>
                                        <TableCell>
                                            <Badge
                                                style={{ backgroundColor: role.color, color: '#fff' }}
                                                className='border-transparent hover:opacity-90'
                                            >
                                                {role.color}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{new Date(role.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className='text-right'>
                                            <div className='flex justify-end gap-2'>
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    onClick={() => {
                                                        setSelectedRole(role);
                                                        setViewOpen(true);
                                                    }}
                                                >
                                                    <Eye className='h-4 w-4' />
                                                </Button>
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    onClick={() => {
                                                        setEditingRole(role);
                                                        setEditOpen(true);
                                                    }}
                                                >
                                                    <Pencil className='h-4 w-4' />
                                                </Button>
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    onClick={() => {
                                                        setPermissionsRole(role);
                                                        setPermissionsOpen(true);
                                                    }}
                                                >
                                                    <Shield className='h-4 w-4' />
                                                </Button>
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                                    onClick={() => handleDelete(role)}
                                                    disabled={deletingId === role.id}
                                                >
                                                    {deletingId === role.id ? (
                                                        <RefreshCw className='h-4 w-4 animate-spin' />
                                                    ) : (
                                                        <Trash2 className='h-4 w-4' />
                                                    )}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {pagination.totalPages > 1 && (
                <div className='flex justify-center gap-2 mt-4'>
                    <Button
                        variant='outline'
                        disabled={!pagination.hasPrev}
                        onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                    >
                        Previous
                    </Button>
                    <span className='flex items-center text-sm text-muted-foreground'>
                        Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                        variant='outline'
                        disabled={!pagination.hasNext}
                        onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    >
                        Next
                    </Button>
                </div>
            )}

            {/* Help Cards */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6'>
                <Card>
                    <CardContent className='pt-6'>
                        <div className='flex items-start gap-3 text-sm text-muted-foreground'>
                            <UsersIcon className='h-5 w-5 shrink-0 mt-0.5' />
                            <div>
                                <div className='font-semibold text-foreground mb-1'>Managing Roles</div>
                                <p>
                                    Create, view, edit, and delete roles. Use search and pagination to quickly find
                                    roles by name or display name.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className='pt-6'>
                        <div className='flex items-start gap-3 text-sm text-muted-foreground'>
                            <KeyRound className='h-5 w-5 shrink-0 mt-0.5' />
                            <div>
                                <div className='font-semibold text-foreground mb-1'>Permissions</div>
                                <p>
                                    Assign granular permissions to each role. Use the Manage Permissions action to add
                                    or remove capabilities safely.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className='pt-6'>
                        <div className='flex items-start gap-3 text-sm text-muted-foreground'>
                            <Palette className='h-5 w-5 shrink-0 mt-0.5' />
                            <div>
                                <div className='font-semibold text-foreground mb-1'>Role Color & Badges</div>
                                <p>
                                    Choose a color to visually distinguish roles across the UI (badges, labels, and
                                    detail views).
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className='md:col-span-2 lg:col-span-3'>
                    <CardContent className='pt-6'>
                        <div className='flex items-start gap-3 text-sm text-muted-foreground'>
                            <HelpCircle className='h-5 w-5 shrink-0 mt-0.5' />
                            <div>
                                <div className='font-semibold text-foreground mb-1'>Tips & Best Practices</div>
                                <ul className='list-disc list-inside space-y-1'>
                                    <li>Follow least-privilege: grant only what is necessary.</li>
                                    <li>Use descriptive display names so staff understands intent.</li>
                                    <li>Test role changes with a non-admin account before rollout.</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Create Sheet */}
            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.roles.form.create_title')}</SheetTitle>
                        <SheetDescription>{t('admin.roles.form.create_description')}</SheetDescription>
                    </SheetHeader>

                    <form onSubmit={handleCreate} className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='create-name'>{t('admin.roles.form.name')}</Label>
                            <Input
                                id='create-name'
                                value={newRole.name}
                                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                                required
                            />
                            <p className='text-xs text-muted-foreground'>{t('admin.roles.form.name_help')}</p>
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='create-display-name'>{t('admin.roles.form.display_name')}</Label>
                            <Input
                                id='create-display-name'
                                value={newRole.display_name}
                                onChange={(e) => setNewRole({ ...newRole, display_name: e.target.value })}
                                required
                            />
                            <p className='text-xs text-muted-foreground'>{t('admin.roles.form.display_name_help')}</p>
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='create-color'>{t('admin.roles.form.color')}</Label>
                            <div className='flex items-center gap-3'>
                                <input
                                    id='create-color'
                                    type='color'
                                    value={newRole.color}
                                    onChange={(e) => setNewRole({ ...newRole, color: e.target.value })}
                                    className='h-10 w-10 rounded border border-input'
                                />
                                <Input
                                    value={newRole.color}
                                    onChange={(e) => setNewRole({ ...newRole, color: e.target.value })}
                                />
                                <Badge
                                    style={{ backgroundColor: newRole.color, color: '#fff' }}
                                    className='border-transparent h-8 px-3'
                                >
                                    {t('admin.roles.form.preview')}
                                </Badge>
                            </div>
                            <p className='text-xs text-muted-foreground'>{t('admin.roles.form.color_help')}</p>
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
                        <SheetDescription>
                            {t('admin.roles.form.edit_description', { name: editingRole?.name || '' })}
                        </SheetDescription>
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
                                <p className='text-xs text-muted-foreground'>{t('admin.roles.form.name_help')}</p>
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor='edit-display-name'>{t('admin.roles.form.display_name')}</Label>
                                <Input
                                    id='edit-display-name'
                                    value={editingRole.display_name}
                                    onChange={(e) => setEditingRole({ ...editingRole, display_name: e.target.value })}
                                    required
                                />
                                <p className='text-xs text-muted-foreground'>
                                    {t('admin.roles.form.display_name_help')}
                                </p>
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor='edit-color'>{t('admin.roles.form.color')}</Label>
                                <div className='flex items-center gap-3'>
                                    <input
                                        id='edit-color'
                                        type='color'
                                        value={editingRole.color}
                                        onChange={(e) => setEditingRole({ ...editingRole, color: e.target.value })}
                                        className='h-10 w-10 rounded border border-input'
                                    />
                                    <Input
                                        value={editingRole.color}
                                        onChange={(e) => setEditingRole({ ...editingRole, color: e.target.value })}
                                    />
                                    <Badge
                                        style={{ backgroundColor: editingRole.color, color: '#fff' }}
                                        className='border-transparent h-8 px-3'
                                    >
                                        {t('admin.roles.form.preview')}
                                    </Badge>
                                </div>
                                <p className='text-xs text-muted-foreground'>{t('admin.roles.form.color_help')}</p>
                            </div>

                            <div className='flex justify-between items-center pt-4'>
                                <Button
                                    type='button'
                                    variant='ghost'
                                    onClick={() => {
                                        setPermissionsRole(editingRole);
                                        setPermissionsOpen(true);
                                    }}
                                >
                                    <Shield className='h-4 w-4 mr-2' />
                                    {t('admin.roles.form.manage_permissions')}
                                </Button>
                                <Button type='submit' loading={isSubmitting}>
                                    {t('admin.roles.form.submit_update')}
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </Sheet>

            {/* View Sheet */}
            <Sheet open={viewOpen} onOpenChange={setViewOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>Role Info</SheetTitle>
                        <SheetDescription>Viewing details for role: {selectedRole?.name}</SheetDescription>
                    </SheetHeader>

                    {selectedRole && (
                        <div className='space-y-4'>
                            <div>
                                <div className='font-semibold text-sm text-muted-foreground'>Name</div>
                                <div>{selectedRole.name}</div>
                            </div>
                            <div>
                                <div className='font-semibold text-sm text-muted-foreground'>Display Name</div>
                                <div>{selectedRole.display_name}</div>
                            </div>
                            <div>
                                <div className='font-semibold text-sm text-muted-foreground'>Color</div>
                                <div className='flex items-center gap-2 mt-1'>
                                    <Badge
                                        style={{ backgroundColor: selectedRole.color, color: '#fff' }}
                                        className='border-transparent'
                                    >
                                        {selectedRole.color}
                                    </Badge>
                                </div>
                            </div>
                            <div>
                                <div className='font-semibold text-sm text-muted-foreground'>Created At</div>
                                <div>{new Date(selectedRole.created_at).toLocaleString()}</div>
                            </div>
                            <div>
                                <div className='font-semibold text-sm text-muted-foreground'>Updated At</div>
                                <div>{new Date(selectedRole.updated_at).toLocaleString()}</div>
                            </div>
                        </div>
                    )}
                </div>
            </Sheet>

            {/* Permissions Sheet */}
            <Sheet open={permissionsOpen} onOpenChange={setPermissionsOpen}>
                <div className='space-y-6 flex flex-col h-full'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.roles.permissions.title')}</SheetTitle>
                        <SheetDescription>
                            {t('admin.roles.permissions.description', { name: permissionsRole?.name || '' })}
                        </SheetDescription>
                    </SheetHeader>

                    <Card className='flex-1 overflow-hidden flex flex-col'>
                        <CardHeader>
                            <CardTitle>{t('admin.roles.permissions.card_title')}</CardTitle>
                            <CardDescription>{t('admin.roles.permissions.card_description')}</CardDescription>
                        </CardHeader>
                        <CardContent className='flex-1 flex flex-col min-h-0'>
                            <div className='flex-1 overflow-auto rounded-md border'>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('admin.roles.permissions.table_permission')}</TableHead>
                                            <TableHead className='text-right w-[100px]'>
                                                {t('admin.roles.permissions.table_actions')}
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingPermissions ? (
                                            <TableRow>
                                                <TableCell colSpan={2} className='text-center py-4'>
                                                    {t('common.loading')}
                                                </TableCell>
                                            </TableRow>
                                        ) : permissions.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={2}
                                                    className='text-center py-4 text-muted-foreground'
                                                >
                                                    {t('admin.roles.permissions.no_permissions')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            permissions.map((perm) => (
                                                <TableRow key={perm.id}>
                                                    <TableCell className='font-mono text-xs'>
                                                        {perm.permission}
                                                    </TableCell>
                                                    <TableCell className='text-right'>
                                                        <Button
                                                            size='sm'
                                                            variant='destructive'
                                                            className='h-8 w-8 p-0'
                                                            onClick={() => handleDeletePermission(perm.id)}
                                                        >
                                                            <X className='h-4 w-4' />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            <form onSubmit={handleAddPermission} className='mt-4 flex gap-2 items-end'>
                                <div className='flex-1 space-y-2'>
                                    <Label htmlFor='add-permission'>{t('admin.roles.permissions.add_label')}</Label>
                                    <Input
                                        id='add-permission'
                                        value={newPermission}
                                        onChange={(e) => setNewPermission(e.target.value)}
                                        placeholder={t('admin.roles.permissions.add_placeholder')}
                                    />
                                </div>
                                <Button type='submit' disabled={!newPermission.trim()}>
                                    {t('admin.roles.permissions.add_button')}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </Sheet>
        </div>
    );
}
