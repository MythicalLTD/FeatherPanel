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

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Plus, Trash2, Users, Mail, Loader2, RefreshCw, Shield } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { EmptyState } from '@/components/featherui/EmptyState';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useWebSpacePermissions } from '@/hooks/useWebSpacePermissions';
import { WebSpaceSubuserPermissions } from '@/lib/webspace-permissions';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';

interface SubuserRow {
    id: number;
    email?: string;
    username?: string;
    permissions?: string[];
}

export default function WebSpaceUsersPage() {
    const params = useParams();
    const uuidShort = String(params.uuidShort || '');
    const { t } = useTranslation();
    const { hasPermission } = useWebSpacePermissions(uuidShort);
    const canUpdate = hasPermission(WebSpaceSubuserPermissions['user.update']);
    const canCreate = hasPermission(WebSpaceSubuserPermissions['user.create']);
    const canDelete = hasPermission(WebSpaceSubuserPermissions['user.delete']);
    const [loading, setLoading] = useState(true);
    const [subusers, setSubusers] = useState<SubuserRow[]>([]);
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [allPermissions, setAllPermissions] = useState<string[]>([]);
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [editUser, setEditUser] = useState<SubuserRow | null>(null);
    const [editPermissions, setEditPermissions] = useState<string[]>([]);
    const [isAddOpen, setIsAddOpen] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/user/webspaces/${uuidShort}/users`);
            setSubusers((data.data?.subusers || []) as SubuserRow[]);
            const perms = (data.data?.permissions || []) as string[];
            setAllPermissions(perms);
            setSelectedPermissions((prev) =>
                prev.length
                    ? prev
                    : ['file.read', 'file.read-content'].filter((p) => perms.includes(p) || perms.length === 0),
            );
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.users.loadFailed')
                    : t('webSpaces.users.loadFailed'),
            );
        } finally {
            setLoading(false);
        }
    }, [uuidShort, t]);

    useEffect(() => {
        void load();
    }, [load]);

    const addUser = async () => {
        if (!email.includes('@')) {
            toast.error(t('webSpaces.users.invalidEmail'));
            return;
        }
        setBusy(true);
        try {
            await axios.post(`/api/user/webspaces/${uuidShort}/users`, {
                email: email.trim(),
                permissions: selectedPermissions.length ? selectedPermissions : ['file.read'],
            });
            toast.success(t('webSpaces.users.added'));
            setEmail('');
            setIsAddOpen(false);
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.users.addFailed')
                    : t('webSpaces.users.addFailed'),
            );
        } finally {
            setBusy(false);
        }
    };

    const removeUser = async (id: number) => {
        if (!confirm(t('webSpaces.users.removeConfirm'))) return;
        try {
            await axios.delete(`/api/user/webspaces/${uuidShort}/users/${id}`);
            toast.success(t('webSpaces.users.removed'));
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.users.deleteFailed')
                    : t('webSpaces.users.deleteFailed'),
            );
        }
    };

    const togglePermission = (perm: string) => {
        setSelectedPermissions((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
    };

    const openEdit = (su: SubuserRow) => {
        setEditUser(su);
        setEditPermissions([...(su.permissions || [])]);
    };

    const saveEdit = async () => {
        if (!editUser) return;
        setBusy(true);
        try {
            await axios.put(`/api/user/webspaces/${uuidShort}/users/${editUser.id}`, {
                permissions: editPermissions,
            });
            toast.success(t('webSpaces.users.permissionsUpdated'));
            setEditUser(null);
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.users.updateFailed')
                    : t('webSpaces.users.updateFailed'),
            );
        } finally {
            setBusy(false);
        }
    };

    const toggleEditPermission = (perm: string) => {
        setEditPermissions((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
    };

    if (loading) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <WebSpacePageWidgets pageId='webspace-users'>
            <div className='space-y-8 pb-12'>
                <PageHeader
                    title={t('webSpaces.users.title')}
                    description={t('webSpaces.users.description')}
                    actions={
                        <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                            {canCreate && subusers.length > 0 && (
                                <Button onClick={() => setIsAddOpen(true)}>
                                    <Plus className='mr-2 h-5 w-5' />
                                    {t('webSpaces.users.add')}
                                </Button>
                            )}
                            <Button variant='glass' onClick={() => void load()} aria-label={t('common.refresh')}>
                                <RefreshCw className='h-5 w-5 sm:mr-2' />
                                <span className='hidden sm:inline'>{t('common.refresh')}</span>
                            </Button>
                        </div>
                    }
                />

                {subusers.length === 0 ? (
                    <EmptyState
                        title={t('webSpaces.users.empty')}
                        description={t('webSpaces.users.description')}
                        icon={Users}
                        action={
                            canCreate ? (
                                <Button
                                    size='default'
                                    onClick={() => setIsAddOpen(true)}
                                    className='h-14 px-10 text-lg'
                                >
                                    <Plus className='mr-2 h-6 w-6' />
                                    {t('webSpaces.users.add')}
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className='grid grid-cols-1 gap-4'>
                        {subusers.map((su) => (
                            <ResourceCard
                                key={su.id}
                                icon={Users}
                                iconWrapperClassName='bg-primary/10 border-primary/20 text-primary'
                                title={su.username || su.email || ''}
                                description={
                                    <div className='text-muted-foreground flex items-center gap-2 text-xs font-medium'>
                                        <Mail className='h-3 w-3' />
                                        <span>{su.email}</span>
                                    </div>
                                }
                                actions={
                                    <div className='flex items-center gap-3'>
                                        {canUpdate && (
                                            <Button
                                                variant='ghost'
                                                size='sm'
                                                onClick={() => openEdit(su)}
                                                className='h-8 rounded-lg px-3 text-xs hover:bg-white/10'
                                            >
                                                <Shield className='mr-1.5 h-3.5 w-3.5' />
                                                {t('webSpaces.users.editPermissions')}
                                            </Button>
                                        )}
                                        {canDelete && (
                                            <Button
                                                variant='destructive'
                                                size='sm'
                                                onClick={() => void removeUser(su.id)}
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

                <Dialog
                    open={isAddOpen}
                    onOpenChange={(open) => {
                        if (!open) setIsAddOpen(false);
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>{t('webSpaces.users.add')}</DialogTitle>
                    </DialogHeader>
                    <div className='space-y-4 py-4'>
                        <div className='relative'>
                            <Mail className='text-muted-foreground absolute top-1/2 left-4 z-10 h-5 w-5 -translate-y-1/2' />
                            <Input
                                className='h-14 pl-12'
                                placeholder={t('webSpaces.users.emailPlaceholder')}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && void addUser()}
                            />
                        </div>
                        {allPermissions.length > 0 && (
                            <div className='flex max-h-60 flex-wrap gap-2 overflow-y-auto'>
                                {allPermissions.map((perm) => (
                                    <label
                                        key={perm}
                                        className='border-border flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs'
                                    >
                                        <input
                                            type='checkbox'
                                            checked={selectedPermissions.includes(perm)}
                                            onChange={() => togglePermission(perm)}
                                        />
                                        {perm}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant='outline' onClick={() => setIsAddOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button loading={busy} disabled={!email} onClick={() => void addUser()}>
                            <Plus className='mr-2 h-4 w-4' />
                            {t('webSpaces.users.add')}
                        </Button>
                    </DialogFooter>
                </Dialog>

                <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
                    <DialogHeader>
                        <DialogTitle>{t('webSpaces.users.editPermissions')}</DialogTitle>
                    </DialogHeader>
                    {editUser && (
                        <div className='space-y-3 px-1'>
                            <p className='text-sm'>{editUser.email || editUser.username}</p>
                            <div className='flex max-h-60 flex-wrap gap-2 overflow-y-auto'>
                                {allPermissions.map((perm) => (
                                    <label
                                        key={perm}
                                        className='border-border flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs'
                                    >
                                        <input
                                            type='checkbox'
                                            checked={editPermissions.includes(perm)}
                                            onChange={() => toggleEditPermission(perm)}
                                        />
                                        {perm}
                                    </label>
                                ))}
                            </div>
                            <DialogFooter>
                                <Button variant='outline' onClick={() => setEditUser(null)}>
                                    {t('common.cancel')}
                                </Button>
                                <Button loading={busy} onClick={() => void saveEdit()}>
                                    {t('common.save')}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </Dialog>
            </div>
        </WebSpacePageWidgets>
    );
}
