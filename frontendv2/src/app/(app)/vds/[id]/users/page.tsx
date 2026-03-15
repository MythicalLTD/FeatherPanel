/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studio
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
import { useParams, useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { useVmInstance } from '@/contexts/VmInstanceContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { EmptyState } from '@/components/featherui/EmptyState';
import {
    Users,
    Plus,
    RefreshCw,
    Trash2,
    User,
    Loader2,
    AlertTriangle,
    Lock,
    Shield,
    CheckCircle2,
} from 'lucide-react';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { HeadlessModal } from '@/components/ui/headless-modal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const VM_PERMISSIONS = [
    'power',
    'console',
    'reinstall',
    'settings',
    'activity.read',
];

interface VmSubuser {
    id: number;
    user_id: number;
    vm_instance_id: number;
    permissions: string[];
    username?: string | null;
    email?: string | null;
}

export default function VdsSubusersPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { t } = useTranslation();
    const { instance, loading: instanceLoading } = useVmInstance();

    const [subusers, setSubusers] = React.useState<VmSubuser[]>([]);
    const [loading, setLoading] = React.useState(true);

    const [isAddOpen, setIsAddOpen] = React.useState(false);
    const [addEmail, setAddEmail] = React.useState('');
    const [addPermissions, setAddPermissions] = React.useState<string[]>(['power', 'console']);
    const [addLoading, setAddLoading] = React.useState(false);

    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
    const [selectedSubuser, setSelectedSubuser] = React.useState<VmSubuser | null>(null);
    const [deleting, setDeleting] = React.useState(false);

    const [isPermOpen, setIsPermOpen] = React.useState(false);
    const [permSubuser, setPermSubuser] = React.useState<VmSubuser | null>(null);
    const [editPerms, setEditPerms] = React.useState<string[]>([]);
    const [savingPerms, setSavingPerms] = React.useState(false);

    const fetchSubusers = React.useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const { data } = await axios.get<{ success: boolean; data: { subusers: VmSubuser[] } }>(
                `/api/user/vm-instances/${id}/subusers`,
            );
            if (data.success) {
                setSubusers(data.data.subusers || []);
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            // 403 means subuser trying to access — redirect
            if (axiosError.response?.status === 403) {
                toast.error('Only the VM owner can manage subusers.');
                router.push(`/vds/${id}`);
                return;
            }
            toast.error('Failed to fetch subusers');
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    React.useEffect(() => {
        if (!instanceLoading) {
            if (!instance?.is_owner) {
                toast.error('Only the VM owner can manage subusers.');
                router.push(`/vds/${id}`);
                return;
            }
            fetchSubusers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [instanceLoading]);

    const toggleAddPerm = (perm: string) => {
        setAddPermissions((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
    };

    const handleAdd = async () => {
        if (!addEmail || !addEmail.includes('@')) {
            toast.error('Please enter a valid email address.');
            return;
        }
        if (addPermissions.length === 0) {
            toast.error('Select at least one permission.');
            return;
        }
        setAddLoading(true);
        try {
            const { data } = await axios.post(`/api/user/vm-instances/${id}/subusers`, {
                email: addEmail,
                permissions: addPermissions,
            });
            if (data.success) {
                toast.success('Subuser added successfully.');
                setIsAddOpen(false);
                setAddEmail('');
                setAddPermissions(['power', 'console']);
                fetchSubusers();
            } else {
                toast.error(data.message || 'Failed to add subuser.');
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error(axiosError.response?.data?.message || 'Failed to add subuser.');
        } finally {
            setAddLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedSubuser) return;
        setDeleting(true);
        try {
            const { data } = await axios.delete(`/api/user/vm-instances/${id}/subusers/${selectedSubuser.id}`);
            if (data.success) {
                toast.success('Subuser removed.');
                setIsDeleteOpen(false);
                fetchSubusers();
            } else {
                toast.error(data.message || 'Failed to remove subuser.');
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error(axiosError.response?.data?.message || 'Failed to remove subuser.');
        } finally {
            setDeleting(false);
        }
    };

    const openPermissions = (sub: VmSubuser) => {
        setPermSubuser(sub);
        setEditPerms(sub.permissions || []);
        setIsPermOpen(true);
    };

    const toggleEditPerm = (perm: string) => {
        setEditPerms((prev) => (prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]));
    };

    const savePermissions = async () => {
        if (!permSubuser) return;
        setSavingPerms(true);
        try {
            // The VDS backend doesn't have a PATCH for subuser permissions yet, so we delete & re-add
            await axios.delete(`/api/user/vm-instances/${id}/subusers/${permSubuser.id}`);
            const { data } = await axios.post(`/api/user/vm-instances/${id}/subusers`, {
                user_id: permSubuser.user_id,
                permissions: editPerms,
            });
            if (data.success) {
                toast.success('Permissions updated.');
                setIsPermOpen(false);
                fetchSubusers();
            } else {
                toast.error(data.message || 'Failed to update permissions.');
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message: string }>;
            toast.error(axiosError.response?.data?.message || 'Failed to update permissions.');
        } finally {
            setSavingPerms(false);
        }
    };

    if (instanceLoading || loading) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='h-12 w-12 animate-spin text-primary opacity-50' />
                <p className='mt-4 text-muted-foreground font-medium animate-pulse'>Loading subusers…</p>
            </div>
        );
    }

    if (!instance) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center'>
                <AlertTriangle className='h-12 w-12 text-destructive mb-4' />
                <h2 className='text-xl font-black'>Instance Not Found</h2>
            </div>
        );
    }

    if (!instance.is_owner) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center space-y-6'>
                <div className='h-20 w-20 rounded-3xl bg-red-500/10 flex items-center justify-center'>
                    <Lock className='h-10 w-10 text-red-400' />
                </div>
                <div>
                    <h2 className='text-2xl font-black'>Access Denied</h2>
                    <p className='text-muted-foreground mt-2'>Only the VM owner can manage subusers.</p>
                </div>
                <Button variant='outline' onClick={() => router.push(`/vds/${id}`)}>
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className='space-y-8 pb-12'>
            <PageHeader
                title={t('navigation.items.users') || t('vds.subusers.title')}
                description={
                    <div className='flex items-center gap-3'>
                        <span>{t('vds.subusers.description')}</span>
                        <span className='px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/5 text-primary border border-primary/20'>
                            {subusers.length} {t('common.users') || 'users'}
                        </span>
                    </div>
                }
                actions={
                    <div className='flex items-center gap-3'>
                        <Button variant='glass' size='default' onClick={fetchSubusers} disabled={loading} className='rounded-2xl'>
                            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
                            {t('common.refresh')}
                        </Button>
                        <Button size='default' onClick={() => setIsAddOpen(true)} className='rounded-2xl shadow-lg shadow-primary/20'>
                            <Plus className='h-4 w-4 mr-2' />
                            {t('vds.subusers.add')}
                        </Button>
                    </div>
                }
            />

            {subusers.length === 0 ? (
                <EmptyState
                    title='No Subusers'
                    description='Add a subuser to grant them access to this VDS instance.'
                    icon={Users}
                    action={
                        <Button size='default' onClick={() => setIsAddOpen(true)} className='h-14 px-10 text-lg'>
                            <Plus className='h-6 w-6 mr-2' />
                            Add Subuser
                        </Button>
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    {subusers.map((sub) => (
                        <ResourceCard
                            key={sub.id}
                            icon={Users}
                            iconWrapperClassName='bg-primary/10 border-primary/20 text-primary'
                            title={sub.username || `User #${sub.user_id}`}
                            description={
                                <div className='flex flex-wrap gap-2 mt-1'>
                                    {(sub.permissions || []).map((p) => (
                                        <span
                                            key={p}
                                            className='px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/5 text-primary border border-primary/20'
                                        >
                                            {p}
                                        </span>
                                    ))}
                                </div>
                            }
                            actions={
                                <div className='flex items-center gap-3'>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        onClick={() => openPermissions(sub)}
                                        className='h-8 px-3 text-xs rounded-lg hover:bg-white/10'
                                    >
                                        <Shield className='h-3.5 w-3.5 mr-1.5' />
                                        Permissions
                                    </Button>
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
                                </div>
                            }
                        />
                    ))}
                </div>
            )}

            {/* Add subuser modal */}
            <HeadlessModal
                isOpen={isAddOpen}
                onClose={() => setIsAddOpen(false)}
                title='Add Subuser'
                description='Enter the email address of the user you want to add and select their permissions.'
            >
                <div className='space-y-6 py-4'>
                    <div className='space-y-2'>
                        <label className='text-sm font-black uppercase tracking-wider text-muted-foreground'>Email Address</label>
                        <div className='relative'>
                            <User className='absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground z-10' />
                            <Input
                                value={addEmail}
                                onChange={(e) => setAddEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                type='email'
                                placeholder={t('vds.subusers.email_placeholder') || 'e.g. admin@example.com'}
                                className='pl-12 h-14 rounded-2xl'
                            />
                        </div>
                    </div>
                    <div className='space-y-3'>
                        <label className='text-sm font-black uppercase tracking-wider text-muted-foreground'>Permissions</label>
                        <div className='space-y-2'>
                            {VM_PERMISSIONS.map((permKey) => (
                                <label
                                    key={permKey}
                                    className={cn(
                                        'flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer',
                                        addPermissions.includes(permKey)
                                            ? 'bg-primary/5 border-primary/20 shadow-[0_0_20px_-10px_rgba(var(--primary),0.2)]'
                                            : 'bg-card/30 border-border/10 hover:border-border/30',
                                    )}
                                >
                                    <div className='relative mt-1 shrink-0'>
                                        <input
                                            type='checkbox'
                                            checked={addPermissions.includes(permKey)}
                                            onChange={() => toggleAddPerm(permKey)}
                                            className='peer sr-only'
                                        />
                                        <div
                                            className={cn(
                                                'h-6 w-6 rounded-lg border-2 transition-all flex items-center justify-center',
                                                addPermissions.includes(permKey)
                                                    ? 'bg-primary border-primary'
                                                    : 'border-border/20 hover:border-primary/40',
                                            )}
                                        >
                                            {addPermissions.includes(permKey) && <CheckCircle2 className='h-4 w-4 text-white' />}
                                        </div>
                                    </div>
                                    <div>
                                        <div className='font-bold text-sm'>{t(`vds.subusers.permissions.${permKey}.label`) || permKey}</div>
                                        <div className='text-xs text-muted-foreground mt-0.5'>{t(`vds.subusers.permissions.${permKey}.description`)}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className='flex justify-end gap-3 pt-4 border-t border-border/5'>
                    <Button variant='outline' size='default' onClick={() => setIsAddOpen(false)} disabled={addLoading} className='rounded-2xl'>
                        {t('common.cancel')}
                    </Button>
                    <Button size='default' onClick={handleAdd} disabled={addLoading || !addEmail} className='rounded-2xl'>
                        {addLoading ? <Loader2 className='mr-2 h-5 w-5 animate-spin' /> : <Plus className='mr-2 h-5 w-5' />}
                        Add
                    </Button>
                </div>
            </HeadlessModal>

            {/* Delete confirm modal */}
            <HeadlessModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title='Remove Subuser'
                description={`Are you sure you want to remove ${selectedSubuser?.username || `user #${selectedSubuser?.user_id}`} from this VDS instance?`}
            >
                <div className='flex justify-end gap-3 pt-6 border-t border-border/5'>
                    <Button variant='outline' size='default' onClick={() => setIsDeleteOpen(false)} disabled={deleting} className='rounded-2xl'>
                        {t('common.cancel')}
                    </Button>
                    <Button variant='destructive' size='default' onClick={handleDelete} disabled={deleting} className='rounded-2xl'>
                        {deleting ? <Loader2 className='mr-2 h-5 w-5 animate-spin' /> : <Trash2 className='mr-2 h-5 w-5' />}
                        {t('common.delete')}
                    </Button>
                </div>
            </HeadlessModal>

            {/* Edit permissions modal */}
            <HeadlessModal
                isOpen={isPermOpen}
                onClose={() => setIsPermOpen(false)}
                title='Edit Permissions'
                description={`Manage permissions for ${permSubuser?.username || `user #${permSubuser?.user_id}`}`}
                className='max-w-lg'
            >
                <div className='space-y-4 py-4'>
                    {VM_PERMISSIONS.map((permKey) => (
                        <label
                            key={permKey}
                            className={cn(
                                'flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer',
                                editPerms.includes(permKey)
                                    ? 'bg-primary/5 border-primary/20 shadow-[0_0_20px_-10px_rgba(var(--primary),0.2)]'
                                    : 'bg-card/30 border-border/10 hover:border-border/30',
                            )}
                        >
                            <div className='relative mt-1 shrink-0'>
                                <input
                                    type='checkbox'
                                    checked={editPerms.includes(permKey)}
                                    onChange={() => toggleEditPerm(permKey)}
                                    className='peer sr-only'
                                />
                                <div
                                    className={cn(
                                        'h-6 w-6 rounded-lg border-2 transition-all flex items-center justify-center',
                                        editPerms.includes(permKey)
                                            ? 'bg-primary border-primary'
                                            : 'border-border/20 hover:border-primary/40',
                                    )}
                                >
                                    {editPerms.includes(permKey) && <CheckCircle2 className='h-4 w-4 text-white' />}
                                </div>
                            </div>
                            <div>
                                <div className='font-bold text-sm'>{t(`vds.subusers.permissions.${permKey}.label`) || permKey}</div>
                                <div className='text-xs text-muted-foreground mt-0.5'>{t(`vds.subusers.permissions.${permKey}.description`)}</div>
                            </div>
                        </label>
                    ))}
                    <div className='flex items-center gap-3 text-xs font-black uppercase tracking-widest text-primary/80 px-5 py-4 bg-primary/5 rounded-2xl border border-primary/10'>
                        <Shield className='h-4 w-4' />
                        {editPerms.length} permission{editPerms.length !== 1 ? 's' : ''} selected
                    </div>
                </div>
                <div className='flex justify-end gap-3 pt-6 border-t border-border/5'>
                    <Button variant='outline' size='default' onClick={() => setIsPermOpen(false)} disabled={savingPerms} className='rounded-2xl'>
                        {t('common.cancel')}
                    </Button>
                    <Button size='default' onClick={savePermissions} disabled={savingPerms} className='rounded-2xl'>
                        {savingPerms ? <Loader2 className='mr-2 h-5 w-5 animate-spin' /> : <RefreshCw className='mr-2 h-5 w-5' />}
                        {t('common.saveChanges')}
                    </Button>
                </div>
            </HeadlessModal>
        </div>
    );
}
