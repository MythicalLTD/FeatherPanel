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
import { Plus, Trash2, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
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
        return <TableSkeleton count={3} />;
    }

    return (
        <WebSpacePageWidgets pageId='webspace-users'>
            <div className='space-y-6'>
                <PageHeader title={t('webSpaces.users.title')} description={t('webSpaces.users.description')} />

                <div className='space-y-3'>
                    {canCreate && (
                        <div className='flex flex-wrap gap-2'>
                            <Input
                                className='max-w-sm'
                                placeholder={t('webSpaces.users.emailPlaceholder')}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <Button loading={busy} onClick={() => void addUser()}>
                                <Plus className='mr-1 h-4 w-4' />
                                {t('webSpaces.users.add')}
                            </Button>
                        </div>
                    )}
                    {canCreate && allPermissions.length > 0 && (
                        <div className='flex flex-wrap gap-2'>
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

                <div className='border-border divide-border divide-y overflow-hidden rounded-xl border'>
                    {subusers.length === 0 && (
                        <p className='text-muted-foreground p-4 text-sm'>{t('webSpaces.users.empty')}</p>
                    )}
                    {subusers.map((su) => (
                        <div key={su.id} className='flex items-center justify-between gap-3 px-4 py-3'>
                            <div className='min-w-0'>
                                <p className='truncate text-sm font-medium'>{su.username || su.email}</p>
                                <p className='text-muted-foreground truncate text-xs'>{su.email}</p>
                                <p className='text-muted-foreground mt-1 text-xs'>
                                    {(su.permissions || []).join(', ') || t('webSpaces.users.noPermissions')}
                                </p>
                            </div>
                            <div className='flex gap-1'>
                                {canUpdate && (
                                    <Button variant='ghost' size='sm' onClick={() => openEdit(su)}>
                                        <Pencil className='h-4 w-4' />
                                    </Button>
                                )}
                                {canDelete && (
                                    <Button variant='ghost' size='sm' onClick={() => void removeUser(su.id)}>
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

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
