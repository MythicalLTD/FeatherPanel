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

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Pause, Play, Trash2, AlertTriangle } from 'lucide-react';

interface ActionsTabProps {
    serverId: string;
    serverName: string;
    isSuspended: boolean;
    onRefresh: () => void;
}

export function ActionsTab({ serverId, serverName, isSuspended, onRefresh }: ActionsTabProps) {
    const { t } = useTranslation();
    const router = useRouter();
    const [suspending, setSuspending] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Dialog states
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const handleSuspend = async () => {
        setSuspending(true);
        try {
            await axios.post(`/api/admin/servers/${serverId}/suspend`);
            toast.success(t('admin.servers.edit.actions.suspend_success'));
            onRefresh();
        } catch (error) {
            console.error('Error suspending server:', error);
            toast.error(t('admin.servers.edit.actions.suspend_failed'));
        } finally {
            setSuspending(false);
        }
    };

    const handleUnsuspend = async () => {
        setSuspending(true);
        try {
            await axios.post(`/api/admin/servers/${serverId}/unsuspend`);
            toast.success(t('admin.servers.edit.actions.unsuspend_success'));
            onRefresh();
        } catch (error) {
            console.error('Error unsuspending server:', error);
            toast.error(t('admin.servers.edit.actions.unsuspend_failed'));
        } finally {
            setSuspending(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await axios.delete(`/api/admin/servers/${serverId}`);
            toast.success(t('admin.servers.edit.actions.delete_success'));
            router.push('/admin/servers');
        } catch (error) {
            console.error('Error deleting server:', error);
            toast.error(t('admin.servers.edit.actions.delete_failed'));
            setDeleting(false);
        }
    };

    return (
        <div className='space-y-6'>
            {/* Suspension Status */}
            <PageCard
                title={t('admin.servers.edit.actions.suspension_title')}
                description={t('admin.servers.edit.actions.suspension_description')}
            >
                <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                        <span className='text-sm'>{t('admin.servers.edit.actions.status')}:</span>
                        <Badge variant={isSuspended ? 'destructive' : 'default'}>
                            {isSuspended
                                ? t('admin.servers.edit.actions.suspended')
                                : t('admin.servers.edit.actions.active')}
                        </Badge>
                    </div>
                    {isSuspended ? (
                        <Button variant='outline' onClick={handleUnsuspend} loading={suspending}>
                            <Play className='h-4 w-4 mr-2' />
                            {t('admin.servers.edit.actions.unsuspend')}
                        </Button>
                    ) : (
                        <Button variant='destructive' onClick={handleSuspend} loading={suspending}>
                            <Pause className='h-4 w-4 mr-2' />
                            {t('admin.servers.edit.actions.suspend')}
                        </Button>
                    )}
                </div>
            </PageCard>

            {/* Delete Server */}
            <PageCard
                title={t('admin.servers.edit.actions.delete_title')}
                description={t('admin.servers.edit.actions.delete_description')}
            >
                <Button variant='destructive' onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className='h-4 w-4 mr-2' />
                    {t('admin.servers.edit.actions.delete')}
                </Button>

                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className='flex items-center gap-2'>
                                <AlertTriangle className='h-5 w-5 text-red-500' />
                                {t('admin.servers.edit.actions.delete_confirm_title')}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                {t('admin.servers.edit.actions.delete_confirm_description', { name: serverName })}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
                                {t('common.cancel')}
                            </AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className='bg-red-600 hover:bg-red-700'
                                disabled={deleting}
                            >
                                {deleting ? t('common.loading') : t('admin.servers.edit.actions.delete')}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </PageCard>
        </div>
    );
}
