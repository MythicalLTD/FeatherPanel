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

import * as React from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { EmptyState } from '@/components/featherui/EmptyState';
import {
    Users,
    Plus,
    RefreshCw,
    Shield,
    Trash2,
    Mail,
    Search,
    ChevronLeft,
    ChevronRight,
    Lock,
    Loader2,
    CheckCircle2,
} from 'lucide-react';

import { ResourceCard } from '@/components/featherui/ResourceCard';

import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { HeadlessModal } from '@/components/ui/headless-modal';
import { toast } from 'sonner';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { useSettings } from '@/contexts/SettingsContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { cn, isEnabled } from '@/lib/utils';
import type { Subuser, SubuserPagination, SubusersResponse, SubuserPermissionsResponse } from '@/types/server';

export default function ServerSubusersPage() {
    const { uuidShort } = useParams() as { uuidShort: string };
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useTranslation();
    const { settings, loading: settingsLoading } = useSettings();
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);
    const { getWidgets } = usePluginWidgets('server-users');

    // Permission checks
    const canRead = hasPermission('user.read');
    const canCreate = hasPermission('user.create');
    const canUpdate = hasPermission('user.update');
    const canDelete = hasPermission('user.delete');

    // State
    const [subusers, setSubusers] = React.useState<Subuser[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [pagination, setPagination] = React.useState<SubuserPagination>({
        current_page: 1,
        per_page: 20,
        total: 0,
        last_page: 1,
        from: 0,
        to: 0,
    });
    const [searchQuery, setSearchQuery] = React.useState('');

    // Modals State
    const [isAddOpen, setIsAddOpen] = React.useState(false);
    const [addEmail, setAddEmail] = React.useState('');
    const [addLoading, setAddLoading] = React.useState(false);

    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
    const [selectedSubuser, setSelectedSubuser] = React.useState<Subuser | null>(null);
    const [deleting, setDeleting] = React.useState(false);

    const [isPermissionsOpen, setIsPermissionsOpen] = React.useState(false);
    const [permissionsLoadingData, setPermissionsLoadingData] = React.useState(false);
    const [availablePermissions, setAvailablePermissions] = React.useState<string[]>([]);
    const [groupedPermissions, setGroupedPermissions] = React.useState<Record<string, { permissions: string[] }>>({});
    const [selectedPermissions, setSelectedPermissions] = React.useState<string[]>([]);
    const [savingPermissions, setSavingPermissions] = React.useState(false);

    // Fetch Data
    const fetchSubusers = React.useCallback(
        async (page = 1) => {
            if (!uuidShort || !isEnabled(settings?.server_allow_subusers)) return;
            setLoading(true);
            try {
                const { data } = await axios.get<SubusersResponse>(`/api/user/servers/${uuidShort}/subusers`, {
                    params: {
                        page,
                        per_page: 20,
                        search: searchQuery || undefined,
                    },
                });
                if (data?.success && data?.data) {
                    setSubusers(data.data.data || []);
                    setPagination(data.data.pagination);
                }
            } catch (error) {
                console.error('Failed to fetch subusers:', error);
                toast.error(t('serverSubusers.failedToFetch'));
            } finally {
                setLoading(false);
            }
        },
        [uuidShort, t, searchQuery, settings?.server_allow_subusers],
    );

    React.useEffect(() => {
        if (canRead && isEnabled(settings?.server_allow_subusers)) {
            fetchSubusers();
        } else if (!permissionsLoading && !canRead && isEnabled(settings?.server_allow_subusers)) {
            toast.error(t('serverSubusers.noSubuserManagementPermission'));
            router.push(`/server/${uuidShort}`);
        } else {
            setLoading(false);
        }
    }, [canRead, permissionsLoading, fetchSubusers, router, uuidShort, t, settings?.server_allow_subusers]);

    const handleAddSubuser = async () => {
        if (!addEmail || !addEmail.includes('@')) {
            toast.error(t('validation.email'));
            return;
        }
        setAddLoading(true);
        try {
            const { data } = await axios.post(`/api/user/servers/${uuidShort}/subusers`, {
                email: addEmail.trim(),
            });
            if (data?.success) {
                toast.success(t('serverSubusers.createSuccess'));
                setIsAddOpen(false);
                setAddEmail('');
                fetchSubusers(1);
            } else {
                toast.error(data?.message || t('serverSubusers.createFailed'));
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            const msg = axiosError.response?.data?.message || t('serverSubusers.createFailed');
            toast.error(msg);
        } finally {
            setAddLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedSubuser) return;
        setDeleting(true);
        try {
            const { data } = await axios.delete(`/api/user/servers/${uuidShort}/subusers/${selectedSubuser.id}`);
            if (data?.success) {
                toast.success(t('serverSubusers.deleteSuccess'));
                setIsDeleteOpen(false);
                fetchSubusers(pagination.current_page);
            } else {
                toast.error(data?.message || t('serverSubusers.deleteFailed'));
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            const msg = axiosError.response?.data?.message || t('serverSubusers.deleteFailed');
            toast.error(msg);
        } finally {
            setDeleting(false);
        }
    };

    const openPermissionsDialog = async (sub: Subuser) => {
        setSelectedSubuser(sub);
        setSelectedPermissions(sub.permissions || []);
        setPermissionsLoadingData(true);
        setIsPermissionsOpen(true);

        try {
            const { data } = await axios.get<SubuserPermissionsResponse>(
                `/api/user/servers/${uuidShort}/subusers/permissions`,
            );
            if (data.success) {
                setAvailablePermissions(data.data.permissions || []);
                setGroupedPermissions(data.data.grouped_permissions || {});
            }
        } catch (error) {
            console.error('Failed to fetch available permissions:', error);
            toast.error(t('serverSubusers.failedToFetch'));
        } finally {
            setPermissionsLoadingData(false);
        }
    };

    const handleSavePermissions = async () => {
        if (!selectedSubuser) return;
        setSavingPermissions(true);
        try {
            const { data } = await axios.patch(`/api/user/servers/${uuidShort}/subusers/${selectedSubuser.id}`, {
                permissions: selectedPermissions,
            });
            if (data?.success) {
                toast.success(t('serverSubusers.updateSuccess'));
                setIsPermissionsOpen(false);
                fetchSubusers(pagination.current_page);
            } else {
                toast.error(data?.message || t('serverSubusers.updateFailed'));
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            const msg = axiosError.response?.data?.message || t('serverSubusers.updateFailed');
            toast.error(msg);
        } finally {
            setSavingPermissions(false);
        }
    };

    const togglePermission = (permission: string) => {
        setSelectedPermissions((prev) =>
            prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission],
        );
    };

    const selectAllPermissions = () => {
        const allSelected = availablePermissions.every((p) => selectedPermissions.includes(p));
        if (allSelected) {
            setSelectedPermissions([]);
        } else {
            setSelectedPermissions([...availablePermissions]);
        }
    };

    const getPermissionName = (permission: string): string => {
        const parts = permission.split('.');
        if (parts.length < 2) return permission;

        const category = parts[0];
        let key = parts[1];
        // Convert kebab-case/snake_case to camelCase for translation keys if needed,
        // but here the keys in en.json match the structure
        key = key.replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());

        const translationPath = `serverSubusers.permissionCategories.${category}.permissions.${key}.name`;
        const translated = t(translationPath);
        return translated !== translationPath ? translated : permission;
    };

    const getPermissionDescription = (permission: string): string => {
        const parts = permission.split('.');
        if (parts.length < 2) return '';

        const category = parts[0];
        let key = parts[1];
        key = key.replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());

        const translationPath = `serverSubusers.permissionCategories.${category}.permissions.${key}.description`;
        const translated = t(translationPath);
        return translated !== translationPath ? translated : '';
    };

    if (permissionsLoading || settingsLoading) return null;

    if (!isEnabled(settings?.server_allow_subusers)) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center space-y-8 bg-card/40 backdrop-blur-3xl rounded-[3rem] border border-border/5'>
                <div className='relative'>
                    <div className='absolute inset-0 bg-red-500/20 blur-3xl rounded-full scale-150' />
                    <div className='relative h-32 w-32 rounded-3xl bg-red-500/10 flex items-center justify-center border-2 border-red-500/20 rotate-3'>
                        <Lock className='h-16 w-16 text-red-500' />
                    </div>
                </div>
                <div className='max-w-md space-y-3 px-4'>
                    <h2 className='text-3xl font-black uppercase tracking-tight'>
                        {t('serverSubusers.featureDisabled')}
                    </h2>
                    <p className='text-muted-foreground text-lg leading-relaxed font-medium'>
                        {t('serverSubusers.featureDisabledDescription')}
                    </p>
                </div>
                <Button
                    variant='outline'
                    size='default'
                    className='mt-8 rounded-2xl h-14 px-10'
                    onClick={() => router.push(`/server/${uuidShort}`)}
                >
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    if (loading && subusers.length === 0 && !searchQuery) {
        return (
            <div key={pathname} className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='h-12 w-12 animate-spin text-primary opacity-50' />
                <p className='mt-4 text-muted-foreground font-medium animate-pulse'>{t('common.loading')}</p>
            </div>
        );
    }

    if (!canRead) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center'>
                <div className='h-20 w-20 rounded-3xl bg-red-500/10 flex items-center justify-center mb-6'>
                    <Lock className='h-10 w-10 text-red-500' />
                </div>
                <h1 className='text-2xl font-black uppercase tracking-tight'>{t('common.accessDenied')}</h1>
                <p className='text-muted-foreground mt-2'>{t('common.noPermission')}</p>
                <Button variant='outline' className='mt-8' onClick={() => router.back()}>
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    return (
        <div key={pathname} className='space-y-8 pb-12'>
            <WidgetRenderer widgets={getWidgets('server-users', 'top-of-page')} />
            {/* Header Section */}
            <PageHeader
                title={t('serverSubusers.title')}
                description={t('serverSubusers.description')}
                actions={
                    <>
                        <Button
                            variant='glass'
                            size='default'
                            onClick={() => fetchSubusers(pagination.current_page)}
                            disabled={loading}
                        >
                            <RefreshCw className={cn('h-5 w-5 mr-2', loading && 'animate-spin')} />
                            {t('common.refresh')}
                        </Button>
                        {canCreate && (
                            <Button
                                size='default'
                                variant='default'
                                onClick={() => setIsAddOpen(true)}
                                disabled={loading}
                            >
                                <Plus className='h-5 w-5 mr-2' />
                                {t('serverSubusers.addSubuser')}
                            </Button>
                        )}
                    </>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-users', 'after-header')} />

            {/* List */}
            {subusers.length === 0 && !searchQuery ? (
                <EmptyState
                    title={t('serverSubusers.noSubusers')}
                    description={t('serverSubusers.noSubusersDescription')}
                    icon={Users}
                    action={
                        canCreate && (
                            <Button
                                size='default'
                                onClick={() => setIsAddOpen(true)}
                                className='h-14 px-10 text-lg shadow-2xl shadow-primary/20'
                            >
                                <Plus className='h-6 w-6 mr-2' />
                                {t('serverSubusers.addSubuser')}
                            </Button>
                        )
                    }
                />
            ) : (
                <div className='flex flex-col gap-6'>
                    <WidgetRenderer widgets={getWidgets('server-users', 'before-subusers-list')} />
                    {/* Search Bar */}
                    <div className='flex gap-2'>
                        <div className='relative flex-1'>
                            <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10' />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchSubusers(1)}
                                type='text'
                                placeholder={t('serverSubusers.searchPlaceholder')}
                                className='pl-12 h-14'
                            />
                        </div>
                        <Button
                            size='default'
                            onClick={() => fetchSubusers(1)}
                            disabled={loading}
                            className='h-14 px-8 rounded-2xl'
                        >
                            <Search className='h-5 w-5 mr-2' />
                            {t('common.search')}
                        </Button>
                    </div>

                    {subusers.length === 0 ? (
                        <div className='text-center py-12 bg-card/10 rounded-4xl border border-dashed border-border/60'>
                            <h3 className='text-xl font-bold'>{t('serverSubusers.noResults')}</h3>
                            <p className='text-muted-foreground mt-1'>{t('serverSubusers.noResultsDescription')}</p>
                            <Button
                                variant='outline'
                                className='mt-4'
                                onClick={() => {
                                    setSearchQuery('');
                                    fetchSubusers(1);
                                }}
                            >
                                {t('serverSubusers.clearSearch')}
                            </Button>
                        </div>
                    ) : (
                        <div className='grid grid-cols-1 gap-4'>
                            {subusers.map((sub) => (
                                <ResourceCard
                                    key={sub.id}
                                    icon={Users}
                                    iconWrapperClassName='bg-primary/10 border-primary/20 text-primary'
                                    title={sub.username || sub.email}
                                    description={
                                        <div className='flex items-center gap-2 text-xs font-medium text-muted-foreground'>
                                            <Mail className='h-3 w-3' />
                                            <span>{sub.email}</span>
                                        </div>
                                    }
                                    actions={
                                        <div className='flex items-center gap-3'>
                                            {canUpdate && (
                                                <Button
                                                    variant='ghost'
                                                    size='sm'
                                                    onClick={() => openPermissionsDialog(sub)}
                                                    className='h-8 px-3 text-xs rounded-lg hover:bg-white/10'
                                                >
                                                    <Shield className='h-3.5 w-3.5 mr-1.5' />
                                                    {t('serverSubusers.permissions')}
                                                </Button>
                                            )}
                                            {canDelete && (
                                                <Button
                                                    variant='destructive'
                                                    size='sm'
                                                    onClick={() => {
                                                        setSelectedSubuser(sub);
                                                        setIsDeleteOpen(true);
                                                    }}
                                                    className='h-8 w-8 p-0'
                                                >
                                                    <Trash2 className='h-3.5 w-3.5' />
                                                </Button>
                                            )}
                                        </div>
                                    }
                                />
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination.total > pagination.per_page && (
                        <div className='flex items-center justify-between gap-3 pt-6 border-t border-border/5'>
                            <div className='text-sm font-medium text-muted-foreground'>
                                {t('serverSubusers.showing')} {pagination.from}-{pagination.to} {t('serverSubusers.of')}{' '}
                                {pagination.total}
                            </div>
                            <div className='flex items-center gap-3'>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={pagination.current_page <= 1 || loading}
                                    onClick={() => fetchSubusers(pagination.current_page - 1)}
                                    className='rounded-xl h-10 w-10 p-0'
                                >
                                    <ChevronLeft className='h-5 w-5' />
                                </Button>
                                <div className='text-sm font-black px-4 bg-secondary/50 h-10 flex items-center rounded-xl border border-border/5'>
                                    {pagination.current_page} / {pagination.last_page}
                                </div>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={pagination.current_page >= pagination.last_page || loading}
                                    onClick={() => fetchSubusers(pagination.current_page + 1)}
                                    className='rounded-xl h-10 w-10 p-0'
                                >
                                    <ChevronRight className='h-5 w-5' />
                                </Button>
                            </div>
                        </div>
                    )}
                    <WidgetRenderer widgets={getWidgets('server-users', 'after-subusers-list')} />
                </div>
            )}

            {/* Add Subuser Modal */}
            <HeadlessModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                title={t('serverSubusers.addSubuser')}
                description={t('serverSubusers.addSubuserDialogDescription')}
            >
                <div className='space-y-4 py-4'>
                    <div className='space-y-2'>
                        <label className='text-sm font-bold uppercase tracking-wider text-muted-foreground'>
                            {t('serverSubusers.emailLabel')}
                        </label>
                        <div className='relative'>
                            <Mail className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10' />
                            <Input
                                value={addEmail}
                                onChange={(e) => setAddEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSubuser()}
                                type='email'
                                placeholder={t('serverSubusers.emailPlaceholder')}
                                className='pl-12 h-14'
                            />
                        </div>
                    </div>
                </div>
                <div className='flex justify-end gap-3 pt-4 border-t border-border/5'>
                    <Button
                        variant='outline'
                        size='default'
                        onClick={() => setIsAddOpen(false)}
                        disabled={addLoading}
                        className='rounded-2xl'
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        size='default'
                        onClick={handleAddSubuser}
                        disabled={addLoading || !addEmail}
                        className='rounded-2xl shadow-lg shadow-primary/20'
                    >
                        {addLoading ? (
                            <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                        ) : (
                            <Plus className='mr-2 h-5 w-5' />
                        )}
                        {t('serverSubusers.add')}
                    </Button>
                </div>
            </HeadlessModal>

            {/* Delete Modal */}
            <HeadlessModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title={t('serverSubusers.confirmDeleteTitle')}
                description={t('serverSubusers.confirmDeleteDescription', { email: selectedSubuser?.email || '' })}
            >
                <div className='flex justify-end gap-3 pt-6 border-t border-border/5'>
                    <Button
                        variant='outline'
                        size='default'
                        onClick={() => setIsDeleteOpen(false)}
                        disabled={deleting}
                        className='rounded-2xl'
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        variant='destructive'
                        size='default'
                        onClick={handleDelete}
                        disabled={deleting}
                        className='rounded-2xl shadow-lg shadow-red-500/20'
                    >
                        {deleting ? (
                            <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                        ) : (
                            <Trash2 className='mr-2 h-5 w-5' />
                        )}
                        {t('common.delete')}
                    </Button>
                </div>
            </HeadlessModal>

            {/* Permissions Modal */}
            <HeadlessModal
                isOpen={isPermissionsOpen}
                onClose={() => setIsPermissionsOpen(false)}
                title={t('serverSubusers.managePermissions')}
                description={t('serverSubusers.managePermissionsDescription')}
                className='max-w-3xl'
            >
                <div className='space-y-6 pt-4'>
                    <div className='flex items-center justify-between p-5 bg-card/50 rounded-3xl border border-border/5 backdrop-blur-md'>
                        <div className='flex items-center gap-4'>
                            <div className='h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20'>
                                <Mail className='h-5 w-5 text-primary' />
                            </div>
                            <div className='flex flex-col'>
                                <span className='text-xs uppercase font-black tracking-widest text-muted-foreground opacity-50'>
                                    {t('serverSubusers.user')}
                                </span>
                                <span className='font-bold text-sm tracking-tight'>{selectedSubuser?.email}</span>
                            </div>
                        </div>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={selectAllPermissions}
                            className='rounded-xl h-10 px-4 font-bold text-xs uppercase tracking-wider border-border/10 hover:bg-secondary/20'
                        >
                            {availablePermissions.every((p) => selectedPermissions.includes(p))
                                ? t('serverSubusers.deselectAll')
                                : t('serverSubusers.selectAll')}
                        </Button>
                    </div>

                    {permissionsLoadingData ? (
                        <div className='flex flex-col items-center justify-center py-12'>
                            <Loader2 className='h-10 w-10 animate-spin text-primary opacity-50' />
                            <p className='mt-4 text-muted-foreground font-medium'>{t('common.loading')}</p>
                        </div>
                    ) : (
                        <div className='max-h-[50vh] overflow-y-auto space-y-6 pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/10'>
                            {Object.entries(groupedPermissions).map(([category, data]) => (
                                <div key={category} className='space-y-4'>
                                    <div className='sticky top-0 bg-card z-10 py-3 border-b border-border/5 -mx-2 px-2'>
                                        <h4 className='text-lg font-black uppercase tracking-tight text-primary'>
                                            {t(`serverSubusers.permissionCategories.${category}.name`)}
                                        </h4>
                                        <p className='text-[10px] text-muted-foreground font-medium leading-relaxed opacity-70'>
                                            {t(`serverSubusers.permissionCategories.${category}.description`)}
                                        </p>
                                    </div>
                                    <div className='grid gap-3'>
                                        {data.permissions.map((perm) => (
                                            <label
                                                key={perm}
                                                className={cn(
                                                    'flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer group',
                                                    selectedPermissions.includes(perm)
                                                        ? 'bg-primary/5 border-primary/20'
                                                        : 'bg-card/30 border-border/5 hover:border-border/20',
                                                )}
                                            >
                                                <div className='relative mt-1 shrink-0'>
                                                    <input
                                                        type='checkbox'
                                                        checked={selectedPermissions.includes(perm)}
                                                        onChange={() => togglePermission(perm)}
                                                        className='peer sr-only'
                                                    />
                                                    <div
                                                        className={cn(
                                                            'h-6 w-6 rounded-lg border-2 transition-all flex items-center justify-center',
                                                            selectedPermissions.includes(perm)
                                                                ? 'bg-primary border-primary shadow-lg shadow-primary/20'
                                                                : 'border-border/10 group-hover:border-primary/40',
                                                        )}
                                                    >
                                                        {selectedPermissions.includes(perm) && (
                                                            <CheckCircle2 className='h-4 w-4 text-white' />
                                                        )}
                                                    </div>
                                                </div>
                                                <div className='space-y-1'>
                                                    <div className='font-bold text-sm leading-none'>
                                                        {getPermissionName(perm)}
                                                    </div>
                                                    <div className='text-xs text-muted-foreground font-medium leading-relaxed'>
                                                        {getPermissionDescription(perm)}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className='flex items-center gap-3 text-xs font-black uppercase tracking-widest text-primary/80 px-5 py-4 bg-primary/5 rounded-2xl border border-primary/10'>
                        <Shield className='h-4 w-4' />
                        {selectedPermissions.length} {t('serverSubusers.permissionsSelected')}
                    </div>

                    <div className='flex justify-end gap-3 pt-6 border-t border-border/5'>
                        <Button
                            variant='outline'
                            size='default'
                            onClick={() => setIsPermissionsOpen(false)}
                            disabled={savingPermissions}
                            className='rounded-2xl'
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            size='default'
                            onClick={handleSavePermissions}
                            disabled={savingPermissions}
                            className='rounded-2xl shadow-lg shadow-primary/20'
                        >
                            {savingPermissions ? (
                                <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                            ) : (
                                <RefreshCw className='mr-2 h-5 w-5' />
                            )}
                            {t('common.saveChanges')}
                        </Button>
                    </div>
                </div>
            </HeadlessModal>
            <WidgetRenderer widgets={getWidgets('server-users', 'bottom-of-page')} />
        </div>
    );
}
