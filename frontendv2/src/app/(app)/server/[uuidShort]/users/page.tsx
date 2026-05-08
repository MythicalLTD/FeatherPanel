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

    const canRead = hasPermission('user.read');
    const canCreate = hasPermission('user.create');
    const canUpdate = hasPermission('user.update');
    const canDelete = hasPermission('user.delete');

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
    const showHeaderAddAction = canCreate && subusers.length > 0;

    if (permissionsLoading || settingsLoading) return null;

    if (!isEnabled(settings?.server_allow_subusers)) {
        return (
            <div className='bg-card/40 border-border/5 flex flex-col items-center justify-center space-y-8 rounded-[3rem] border py-24 text-center backdrop-blur-3xl'>
                <div className='relative'>
                    <div className='absolute inset-0 scale-150 rounded-full bg-red-500/20 blur-3xl' />
                    <div className='relative flex h-32 w-32 rotate-3 items-center justify-center rounded-3xl border-2 border-red-500/20 bg-red-500/10'>
                        <Lock className='h-16 w-16 text-red-500' />
                    </div>
                </div>
                <div className='max-w-md space-y-3 px-4'>
                    <h2 className='text-3xl font-black tracking-tight uppercase'>
                        {t('serverSubusers.featureDisabled')}
                    </h2>
                    <p className='text-muted-foreground text-lg leading-relaxed font-medium'>
                        {t('serverSubusers.featureDisabledDescription')}
                    </p>
                </div>
                <Button
                    variant='outline'
                    size='default'
                    className='mt-8 h-14 rounded-2xl px-10'
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
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 animate-pulse font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    if (!canRead) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center'>
                <div className='mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10'>
                    <Lock className='h-10 w-10 text-red-500' />
                </div>
                <h1 className='text-2xl font-black tracking-tight uppercase'>{t('common.accessDenied')}</h1>
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

            <PageHeader
                title={t('serverSubusers.title')}
                description={t('serverSubusers.description')}
                actions={
                    <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                        {showHeaderAddAction && (
                            <Button
                                size='default'
                                variant='default'
                                onClick={() => setIsAddOpen(true)}
                                disabled={loading}
                                className='order-1 w-full sm:order-2 sm:w-auto'
                            >
                                <Plus className='mr-2 h-5 w-5' />
                                {t('serverSubusers.addSubuser')}
                            </Button>
                        )}
                        <Button
                            variant='glass'
                            size='default'
                            onClick={() => fetchSubusers(pagination.current_page)}
                            disabled={loading}
                            className='order-2 sm:order-1'
                            aria-label={t('common.refresh')}
                        >
                            <RefreshCw className={cn('h-5 w-5 sm:mr-2', loading && 'animate-spin')} />
                            <span className='hidden sm:inline'>{t('common.refresh')}</span>
                        </Button>
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-users', 'after-header')} />

            {subusers.length === 0 && !searchQuery ? (
                <EmptyState
                    title={t('serverSubusers.noSubusers')}
                    description={t('serverSubusers.noSubusersDescription')}
                    icon={Users}
                    action={
                        canCreate && (
                            <Button size='default' onClick={() => setIsAddOpen(true)} className='h-14 px-10 text-lg'>
                                <Plus className='mr-2 h-6 w-6' />
                                {t('serverSubusers.addSubuser')}
                            </Button>
                        )
                    }
                />
            ) : (
                <div className='flex flex-col gap-6'>
                    <WidgetRenderer widgets={getWidgets('server-users', 'before-subusers-list')} />

                    <div className='flex gap-2'>
                        <div className='relative flex-1'>
                            <Search className='text-muted-foreground absolute top-1/2 left-4 z-10 h-5 w-5 -translate-y-1/2' />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && fetchSubusers(1)}
                                type='text'
                                placeholder={t('serverSubusers.searchPlaceholder')}
                                className='h-14 pl-12'
                            />
                        </div>
                        <Button
                            size='default'
                            onClick={() => fetchSubusers(1)}
                            disabled={loading}
                            className='h-14 rounded-2xl px-8'
                        >
                            <Search className='mr-2 h-5 w-5' />
                            {t('common.search')}
                        </Button>
                    </div>

                    {pagination.total > pagination.per_page && (
                        <div className='border-border bg-card/50 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={pagination.current_page <= 1 || loading}
                                onClick={() => fetchSubusers(pagination.current_page - 1)}
                                className='gap-1.5'
                            >
                                <ChevronLeft className='h-4 w-4' />
                                {t('common.previous')}
                            </Button>
                            <span className='text-sm font-medium'>
                                {pagination.current_page} / {pagination.last_page}
                            </span>
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={pagination.current_page >= pagination.last_page || loading}
                                onClick={() => fetchSubusers(pagination.current_page + 1)}
                                className='gap-1.5'
                            >
                                {t('common.next')}
                                <ChevronRight className='h-4 w-4' />
                            </Button>
                        </div>
                    )}

                    {subusers.length === 0 ? (
                        <div className='bg-card/10 border-border/60 rounded-4xl border border-dashed py-12 text-center'>
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
                                        <div className='text-muted-foreground flex items-center gap-2 text-xs font-medium'>
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
                                                    className='h-8 rounded-lg px-3 text-xs hover:bg-white/10'
                                                >
                                                    <Shield className='mr-1.5 h-3.5 w-3.5' />
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

                    {pagination.total > pagination.per_page && (
                        <div className='border-border/5 flex items-center justify-between gap-3 border-t pt-6'>
                            <div className='text-muted-foreground text-sm font-medium'>
                                {t('serverSubusers.showing')} {pagination.from}-{pagination.to} {t('serverSubusers.of')}{' '}
                                {pagination.total}
                            </div>
                            <div className='flex items-center gap-3'>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={pagination.current_page <= 1 || loading}
                                    onClick={() => fetchSubusers(pagination.current_page - 1)}
                                    className='h-10 w-10 rounded-xl p-0'
                                >
                                    <ChevronLeft className='h-5 w-5' />
                                </Button>
                                <div className='bg-secondary/50 border-border/5 flex h-10 items-center rounded-xl border px-4 text-sm font-black'>
                                    {pagination.current_page} / {pagination.last_page}
                                </div>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={pagination.current_page >= pagination.last_page || loading}
                                    onClick={() => fetchSubusers(pagination.current_page + 1)}
                                    className='h-10 w-10 rounded-xl p-0'
                                >
                                    <ChevronRight className='h-5 w-5' />
                                </Button>
                            </div>
                        </div>
                    )}
                    <WidgetRenderer widgets={getWidgets('server-users', 'after-subusers-list')} />
                </div>
            )}

            <HeadlessModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                title={t('serverSubusers.addSubuser')}
                description={t('serverSubusers.addSubuserDialogDescription')}
            >
                <div className='space-y-4 py-4'>
                    <div className='space-y-2'>
                        <label className='text-muted-foreground text-sm font-bold tracking-wider uppercase'>
                            {t('serverSubusers.emailLabel')}
                        </label>
                        <div className='relative'>
                            <Mail className='text-muted-foreground absolute top-1/2 left-4 z-10 h-5 w-5 -translate-y-1/2' />
                            <Input
                                value={addEmail}
                                onChange={(e) => setAddEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSubuser()}
                                type='email'
                                placeholder={t('serverSubusers.emailPlaceholder')}
                                className='h-14 pl-12'
                            />
                        </div>
                    </div>
                </div>
                <div className='border-border/5 flex justify-end gap-3 border-t pt-4'>
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
                        className='rounded-2xl'
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

            <HeadlessModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title={t('serverSubusers.confirmDeleteTitle')}
                description={t('serverSubusers.confirmDeleteDescription', { email: selectedSubuser?.email || '' })}
            >
                <div className='border-border/5 flex justify-end gap-3 border-t pt-6'>
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
                        className='rounded-2xl'
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

            <HeadlessModal
                isOpen={isPermissionsOpen}
                onClose={() => setIsPermissionsOpen(false)}
                title={t('serverSubusers.managePermissions')}
                description={t('serverSubusers.managePermissionsDescription')}
                className='max-w-3xl'
            >
                <div className='space-y-6 pt-4'>
                    <div className='bg-card/50 border-border/5 flex items-center justify-between rounded-3xl border p-5 backdrop-blur-md'>
                        <div className='flex items-center gap-4'>
                            <div className='bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                                <Mail className='text-primary h-5 w-5' />
                            </div>
                            <div className='flex flex-col'>
                                <span className='text-muted-foreground text-xs font-black tracking-widest uppercase opacity-50'>
                                    {t('serverSubusers.user')}
                                </span>
                                <span className='text-sm font-bold tracking-tight'>{selectedSubuser?.email}</span>
                            </div>
                        </div>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={selectAllPermissions}
                            className='border-border/10 hover:bg-secondary/20 h-10 rounded-xl px-4 text-xs font-bold tracking-wider uppercase'
                        >
                            {availablePermissions.every((p) => selectedPermissions.includes(p))
                                ? t('serverSubusers.deselectAll')
                                : t('serverSubusers.selectAll')}
                        </Button>
                    </div>

                    {permissionsLoadingData ? (
                        <div className='flex flex-col items-center justify-center py-12'>
                            <Loader2 className='text-primary h-10 w-10 animate-spin opacity-50' />
                            <p className='text-muted-foreground mt-4 font-medium'>{t('common.loading')}</p>
                        </div>
                    ) : (
                        <div className='scrollbar-thin scrollbar-thumb-muted-foreground/10 max-h-[50vh] space-y-6 overflow-y-auto pr-2'>
                            {Object.entries(groupedPermissions).map(([category, data]) => (
                                <div key={category} className='space-y-4'>
                                    <div className='bg-card/70 border-border/5 sticky top-0 z-10 -mx-2 border-b px-2 py-3 backdrop-blur-xl'>
                                        <h4 className='text-primary text-lg font-black tracking-tight uppercase'>
                                            {t(`serverSubusers.permissionCategories.${category}.name`)}
                                        </h4>
                                        <p className='text-muted-foreground text-[10px] leading-relaxed font-medium opacity-70'>
                                            {t(`serverSubusers.permissionCategories.${category}.description`)}
                                        </p>
                                    </div>
                                    <div className='grid gap-3'>
                                        {data.permissions.map((perm) => (
                                            <label
                                                key={perm}
                                                className={cn(
                                                    'group flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition-all',
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
                                                            'flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-all',
                                                            selectedPermissions.includes(perm)
                                                                ? 'bg-primary border-primary'
                                                                : 'border-border/10 group-hover:border-primary/40',
                                                        )}
                                                    >
                                                        {selectedPermissions.includes(perm) && (
                                                            <CheckCircle2 className='h-4 w-4 text-white' />
                                                        )}
                                                    </div>
                                                </div>
                                                <div className='space-y-1'>
                                                    <div className='text-sm leading-none font-bold'>
                                                        {getPermissionName(perm)}
                                                    </div>
                                                    <div className='text-muted-foreground text-xs leading-relaxed font-medium'>
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

                    <div className='text-primary/80 bg-primary/5 border-primary/10 flex items-center gap-3 rounded-2xl border px-5 py-4 text-xs font-black tracking-widest uppercase'>
                        <Shield className='h-4 w-4' />
                        {selectedPermissions.length} {t('serverSubusers.permissionsSelected')}
                    </div>

                    <div className='border-border/5 flex justify-end gap-3 border-t pt-6'>
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
                            className='rounded-2xl'
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
