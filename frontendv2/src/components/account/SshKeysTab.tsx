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

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import {
    Dialog,
    DialogPanel,
    DialogTitle,
    Description as DialogDescription,
    Field,
    Label,
    Input as HeadlessInput,
} from '@headlessui/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/featherui/Input';
import { cn } from '@/lib/utils';
import { Key, Plus, Trash2, Eye, Pencil, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

interface SshKey {
    id: number;
    user_id: number;
    name: string;
    public_key?: string;
    fingerprint?: string;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

export default function SshKeysTab() {
    const { t } = useTranslation();
    const [keys, setKeys] = useState<SshKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [viewModal, setViewModal] = useState(false);
    const [editModal, setEditModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [selectedKey, setSelectedKey] = useState<SshKey | null>(null);
    const [newKeyName, setNewKeyName] = useState('');
    const [newKeyPublic, setNewKeyPublic] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchKeys = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/user/ssh-keys');
            if (data.success) {
                setKeys(data.data.ssh_keys || []);
            }
        } catch (error) {
            console.error('Error fetching SSH keys:', error);
            const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } };
            toast.error(
                axiosError.response?.data?.error_message ||
                    axiosError.response?.data?.message ||
                    t('account.sshKeys.loadError'),
            );
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchKeys();
    }, [fetchKeys]);

    const filteredKeys = keys.filter(
        (key) =>
            key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            key.fingerprint?.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const handleAddKey = async () => {
        try {
            const { data } = await axios.post('/api/user/ssh-keys', {
                name: newKeyName,
                public_key: newKeyPublic,
            });
            if (data.success) {
                toast.success(t('account.sshKeys.keyAdded'));
                setIsOpen(false);
                setNewKeyName('');
                setNewKeyPublic('');
                await fetchKeys();
            }
        } catch (error) {
            console.error('Error adding SSH key:', error);
            const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } };
            toast.error(
                axiosError.response?.data?.error_message ||
                    axiosError.response?.data?.message ||
                    t('account.sshKeys.addFailed'),
            );
        }
    };

    const handleEditKey = async () => {
        if (!selectedKey) return;
        try {
            const { data } = await axios.put(`/api/user/ssh-keys/${selectedKey.id}`, {
                name: newKeyName,
                public_key: newKeyPublic,
            });
            if (data.success) {
                toast.success(t('account.sshKeys.keyUpdated'));
                setEditModal(false);
                setSelectedKey(null);
                setNewKeyName('');
                setNewKeyPublic('');
                await fetchKeys();
            }
        } catch (error) {
            console.error('Error updating SSH key:', error);
            const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } };
            toast.error(
                axiosError.response?.data?.error_message ||
                    axiosError.response?.data?.message ||
                    t('account.sshKeys.updateFailed'),
            );
        }
    };

    const viewKey = async (key: SshKey) => {
        try {
            const { data } = await axios.get(`/api/user/ssh-keys/${key.id}`);
            if (data.success) {
                setSelectedKey(data.data);
                setViewModal(true);
            }
        } catch (error) {
            console.error('Error loading SSH key:', error);
            const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } };
            toast.error(
                axiosError.response?.data?.error_message ||
                    axiosError.response?.data?.message ||
                    t('account.sshKeys.loadSingleError'),
            );
        }
    };

    const editKey = async (key: SshKey) => {
        try {
            const { data } = await axios.get(`/api/user/ssh-keys/${key.id}`);
            if (data.success) {
                setSelectedKey(data.data);
                setNewKeyName(data.data.name);
                setNewKeyPublic(data.data.public_key || '');
                setEditModal(true);
            }
        } catch (error) {
            console.error('Error loading SSH key:', error);
            toast.error(t('account.sshKeys.loadSingleError'));
        }
    };

    const deleteKey = async () => {
        if (!selectedKey) return;
        try {
            const endpoint = selectedKey.deleted_at
                ? `/api/user/ssh-keys/${selectedKey.id}/hard-delete`
                : `/api/user/ssh-keys/${selectedKey.id}`;
            const { data } = await axios.delete(endpoint);
            if (data.success) {
                toast.success(
                    selectedKey.deleted_at
                        ? t('account.sshKeys.keyPermanentlyDeleted')
                        : t('account.sshKeys.keyDeleted'),
                );
                setDeleteModal(false);
                setSelectedKey(null);
                await fetchKeys();
            }
        } catch (error) {
            console.error('Error deleting SSH key:', error);
            const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } };
            toast.error(
                axiosError.response?.data?.error_message ||
                    axiosError.response?.data?.message ||
                    t('account.sshKeys.deleteFailed'),
            );
        }
    };

    const restoreKey = async (key: SshKey) => {
        try {
            const { data } = await axios.post(`/api/user/ssh-keys/${key.id}/restore`);
            if (data.success) {
                toast.success(t('account.sshKeys.keyRestored'));
                await fetchKeys();
            }
        } catch (error) {
            console.error('Error restoring SSH key:', error);
            const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } };
            toast.error(
                axiosError.response?.data?.error_message ||
                    axiosError.response?.data?.message ||
                    t('account.sshKeys.loadSingleError'),
            );
        }
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='flex items-center gap-3'>
                    <div className='border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent'></div>
                    <span className='text-muted-foreground'>{t('account.sshKeys.loading')}</span>
                </div>
            </div>
        );
    }

    return (
        <div className='space-y-5'>
            <div className='flex items-center justify-between'>
                <div className='border-border/50 bg-muted/20 flex-1 rounded-xl border p-4'>
                    <h3 className='text-foreground text-lg font-semibold'>{t('account.sshKeys.title')}</h3>
                    <p className='text-muted-foreground mt-1 text-sm'>{t('account.sshKeys.description')}</p>
                </div>
                <div className='ml-3 flex gap-2'>
                    <Button onClick={fetchKeys} variant='outline' size='sm'>
                        <RefreshCw className='mr-2 h-4 w-4' />
                        {t('account.sshKeys.refresh')}
                    </Button>
                    <Button onClick={() => setIsOpen(true)} size='sm'>
                        <Plus className='mr-2 h-4 w-4' />
                        {t('account.sshKeys.addKey')}
                    </Button>
                </div>
            </div>

            <div className='relative'>
                <Input
                    type='text'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('account.sshKeys.searchPlaceholder')}
                />
            </div>

            <div className='text-muted-foreground text-center text-sm'>
                {t('account.sshKeys.totalKeys', { count: String(filteredKeys.length) })}
            </div>

            {filteredKeys.length === 0 ? (
                <div className='border-border bg-muted/20 rounded-lg border-2 border-dashed p-12 text-center'>
                    <Key className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
                    <h4 className='text-foreground mb-2 text-sm font-semibold'>{t('account.sshKeys.noKeys')}</h4>
                    <p className='text-muted-foreground mb-4 text-sm'>{t('account.sshKeys.createFirst')}</p>
                    <Button onClick={() => setIsOpen(true)} variant='outline'>
                        {t('account.sshKeys.addKey')}
                    </Button>
                </div>
            ) : (
                <div className='space-y-3'>
                    {filteredKeys.map((key) => (
                        <div
                            key={key.id}
                            className='border-border/50 bg-card/50 rounded-lg border p-4 backdrop-blur-xl'
                        >
                            <div className='mb-3 flex items-start justify-between'>
                                <div className='flex-1'>
                                    <h4 className='text-foreground text-sm font-semibold'>{key.name}</h4>
                                    <p className='text-muted-foreground mt-1 truncate font-mono text-xs'>
                                        {key.fingerprint || t('common.unknown')}
                                    </p>
                                    <p className='text-muted-foreground mt-2 text-xs'>
                                        {t('account.sshKeys.createdAt')}:{' '}
                                        {new Date(key.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div
                                    className={cn(
                                        'rounded px-2 py-1 text-xs font-medium',
                                        key.deleted_at
                                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-green-200'
                                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
                                    )}
                                >
                                    {key.deleted_at
                                        ? t('account.sshKeys.statuses.deleted')
                                        : t('account.sshKeys.statuses.active')}
                                </div>
                            </div>
                            <div className='flex gap-2'>
                                <Button variant='outline' size='sm' onClick={() => viewKey(key)}>
                                    <Eye className='mr-1 h-4 w-4' />
                                    {t('account.sshKeys.viewDetails')}
                                </Button>
                                <Button variant='outline' size='sm' onClick={() => editKey(key)}>
                                    <Pencil className='mr-1 h-4 w-4' />
                                    {t('account.sshKeys.edit')}
                                </Button>
                                {key.deleted_at ? (
                                    <Button variant='outline' size='sm' onClick={() => restoreKey(key)}>
                                        {t('account.sshKeys.restore')}
                                    </Button>
                                ) : null}
                                <Button
                                    variant='destructive'
                                    size='sm'
                                    onClick={() => {
                                        setSelectedKey(key);
                                        setDeleteModal(true);
                                    }}
                                >
                                    <Trash2 className='mr-1 h-4 w-4' />
                                    {key.deleted_at
                                        ? t('account.sshKeys.permanentlyDelete')
                                        : t('account.sshKeys.delete')}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog
                open={isOpen || editModal}
                onClose={() => {
                    setIsOpen(false);
                    setEditModal(false);
                    setNewKeyName('');
                    setNewKeyPublic('');
                }}
                className='relative z-50'
            >
                <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
                <div className='fixed inset-0 flex items-center justify-center p-4'>
                    <DialogPanel className='bg-card/50 border-border/50 w-full max-w-2xl rounded-xl border p-6 backdrop-blur-xl'>
                        <DialogTitle className='text-foreground mb-2 text-lg font-semibold'>
                            {editModal ? t('account.sshKeys.editKey') : t('account.sshKeys.addKey')}
                        </DialogTitle>
                        <DialogDescription className='text-muted-foreground mb-6 text-sm'>
                            {t('account.sshKeys.modalDescription')}
                        </DialogDescription>

                        <div className='space-y-4'>
                            <Field>
                                <Label className='text-foreground text-sm font-medium'>
                                    {t('account.sshKeys.keyName')}
                                </Label>
                                <HeadlessInput
                                    value={newKeyName}
                                    onChange={(e) => setNewKeyName(e.target.value)}
                                    placeholder={t('account.sshKeys.keyNamePlaceholder')}
                                    className={cn(
                                        'border-border bg-background mt-2 block w-full rounded-lg border px-3 py-2',
                                        'text-foreground placeholder:text-muted-foreground text-sm',
                                        'focus:ring-primary focus:border-transparent focus:ring-2 focus:outline-none',
                                    )}
                                />
                            </Field>

                            <Field>
                                <Label className='text-foreground text-sm font-medium'>
                                    {t('account.sshKeys.publicKey')}
                                </Label>
                                <textarea
                                    value={newKeyPublic}
                                    onChange={(e) => setNewKeyPublic(e.target.value)}
                                    placeholder={t('account.sshKeys.publicKeyHint')}
                                    rows={8}
                                    className={cn(
                                        'border-border bg-background mt-2 block w-full rounded-lg border px-3 py-2',
                                        'text-foreground placeholder:text-muted-foreground font-mono text-sm',
                                        'focus:ring-primary custom-scrollbar resize-none focus:border-transparent focus:ring-2 focus:outline-none',
                                    )}
                                />
                            </Field>
                        </div>

                        <div className='mt-6 flex gap-3'>
                            <Button onClick={editModal ? handleEditKey : handleAddKey} className='flex-1'>
                                {editModal ? t('account.sshKeys.updateKey') : t('account.sshKeys.addKey')}
                            </Button>
                            <Button
                                onClick={() => {
                                    setIsOpen(false);
                                    setEditModal(false);
                                    setNewKeyName('');
                                    setNewKeyPublic('');
                                }}
                                variant='outline'
                                className='flex-1'
                            >
                                {t('common.cancel')}
                            </Button>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>

            <Dialog open={viewModal} onClose={() => setViewModal(false)} className='relative z-50'>
                <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
                <div className='fixed inset-0 flex items-center justify-center p-4'>
                    <DialogPanel className='bg-card/50 border-border/50 w-full max-w-2xl rounded-xl border p-6 backdrop-blur-xl'>
                        <DialogTitle className='text-foreground mb-4 text-lg font-semibold'>
                            {selectedKey?.name}
                        </DialogTitle>
                        {selectedKey && (
                            <div className='space-y-4'>
                                <div>
                                    <span className='text-muted-foreground text-sm font-medium'>
                                        {t('account.sshKeys.fingerprint')}:
                                    </span>
                                    <p className='mt-1 font-mono text-sm break-all'>{selectedKey.fingerprint}</p>
                                </div>
                                <div>
                                    <span className='text-muted-foreground text-sm font-medium'>
                                        {t('account.sshKeys.publicKey')}:
                                    </span>
                                    <div className='bg-muted custom-scrollbar mt-2 max-h-64 overflow-auto rounded-md p-3'>
                                        <pre className='font-mono text-xs break-all whitespace-pre-wrap'>
                                            {selectedKey.public_key}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogPanel>
                </div>
            </Dialog>

            <Dialog open={deleteModal} onClose={() => setDeleteModal(false)} className='relative z-50'>
                <div className='fixed inset-0 bg-black/30' aria-hidden='true' />
                <div className='fixed inset-0 flex items-center justify-center p-4'>
                    <DialogPanel className='bg-card/50 border-border/50 w-full max-w-md rounded-xl border p-6 backdrop-blur-xl'>
                        <DialogTitle className='text-foreground mb-2 text-lg font-semibold'>
                            {t('account.sshKeys.confirmDelete')}
                        </DialogTitle>
                        <DialogDescription className='text-muted-foreground mb-6 text-sm'>
                            {t('account.sshKeys.deleteWarning')}
                        </DialogDescription>
                        <div className='flex gap-3'>
                            <Button onClick={deleteKey} variant='destructive' className='flex-1'>
                                {t('account.sshKeys.confirmDelete')}
                            </Button>
                            <Button onClick={() => setDeleteModal(false)} variant='outline' className='flex-1'>
                                {t('common.cancel')}
                            </Button>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </div>
    );
}
