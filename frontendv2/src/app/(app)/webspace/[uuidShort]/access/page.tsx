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
import { Copy, FolderOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from '@/contexts/SessionContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';
import { useWebSpacePermissions } from '@/hooks/useWebSpacePermissions';
import { WebSpaceSubuserPermissions } from '@/lib/webspace-permissions';
import { copyToClipboard } from '@/lib/utils';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Lock } from 'lucide-react';

interface WebSpaceAccessInfo {
    uuidShort?: string;
    sftp_host?: string | null;
    sftp_port?: number | null;
    ftp_host?: string | null;
    ftp_port?: number | null;
    ftp_enabled?: boolean;
}

export default function WebSpaceAccessPage() {
    const params = useParams();
    const uuidShort = String(params.uuidShort || '');
    const { t } = useTranslation();
    const { user } = useSession();
    const { hasPermission, loading: permissionsLoading } = useWebSpacePermissions(uuidShort);
    const canAccess = hasPermission(WebSpaceSubuserPermissions['file.sftp']);

    const [loading, setLoading] = useState(true);
    const [space, setSpace] = useState<WebSpaceAccessInfo | null>(null);
    const [sftpAccounts, setSftpAccounts] = useState<
        { id: number; account_name: string; home_relative: string; enabled: boolean; login?: string }[]
    >([]);
    const [newSftpName, setNewSftpName] = useState('');
    const [newSftpHome, setNewSftpHome] = useState('');
    const [newSftpPassword, setNewSftpPassword] = useState('');
    const [savingSftp, setSavingSftp] = useState(false);

    const load = useCallback(async () => {
        try {
            const [showRes, sftpRes] = await Promise.all([
                axios.get(`/api/user/webspaces/${uuidShort}`),
                axios.get(`/api/user/webspaces/${uuidShort}/sftp-accounts`).catch(() => null),
            ]);
            setSpace(showRes.data.data.webspace as WebSpaceAccessInfo);
            setSftpAccounts((sftpRes?.data?.data?.accounts as typeof sftpAccounts) || []);
        } catch (error) {
            console.error(error);
            toast.error(t('webSpaces.settings.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [uuidShort, t]);

    useEffect(() => {
        void load();
    }, [load]);

    const createSftpAccount = async () => {
        if (!newSftpName.trim() || newSftpPassword.length < 8) {
            toast.error(t('webSpaces.settings.sftpAccountInvalid'));
            return;
        }
        setSavingSftp(true);
        try {
            await axios.post(`/api/user/webspaces/${uuidShort}/sftp-accounts`, {
                account_name: newSftpName.trim(),
                password: newSftpPassword,
                home_relative: newSftpHome.trim(),
            });
            setNewSftpName('');
            setNewSftpHome('');
            setNewSftpPassword('');
            const { data } = await axios.get(`/api/user/webspaces/${uuidShort}/sftp-accounts`);
            setSftpAccounts((data.data?.accounts as typeof sftpAccounts) || []);
            toast.success(t('webSpaces.settings.sftpAccountCreated'));
        } catch (error) {
            let msg = t('webSpaces.settings.sftpAccountCreateFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setSavingSftp(false);
        }
    };

    const deleteSftpAccount = async (id: number) => {
        if (!confirm(t('webSpaces.settings.sftpAccountDeleteConfirm'))) return;
        try {
            await axios.delete(`/api/user/webspaces/${uuidShort}/sftp-accounts/${id}`);
            setSftpAccounts((prev) => prev.filter((a) => a.id !== id));
            toast.success(t('webSpaces.settings.sftpAccountDeleted'));
        } catch (error) {
            let msg = t('webSpaces.settings.sftpAccountDeleteFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        }
    };

    if (permissionsLoading || loading) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    if (!canAccess) {
        return (
            <WebSpacePageWidgets pageId='webspace-access'>
                <EmptyState
                    icon={Lock}
                    title={t('webSpaces.accessPage.noPermissionTitle')}
                    description={t('webSpaces.accessPage.noPermissionDescription')}
                />
            </WebSpacePageWidgets>
        );
    }

    if (!space) return null;

    const username = user?.username || 'username';
    const short = space.uuidShort || uuidShort;
    const sftpUser = `${username}.${short}`;

    return (
        <WebSpacePageWidgets pageId='webspace-access'>
            <div className='mx-auto max-w-4xl space-y-8 pb-16'>
                <PageHeader
                    title={t('webSpaces.accessPage.title')}
                    description={t('webSpaces.accessPage.description')}
                />

                <PageCard
                    title={t('webSpaces.settings.sftpTitle')}
                    description={t('webSpaces.settings.sftpHelp')}
                    icon={FolderOpen}
                >
                    <div className='space-y-4'>
                        <div className='space-y-2'>
                            <Label className='text-muted-foreground ml-1 text-[10px] font-black tracking-widest uppercase'>
                                {t('webSpaces.settings.host')}
                            </Label>
                            <div className='bg-secondary/50 border-border/10 flex items-center gap-2 rounded-xl border p-1 pr-1 pl-4'>
                                <code className='text-foreground/80 flex-1 truncate font-mono text-xs'>
                                    {space.sftp_host ? `sftp://${space.sftp_host}` : t('common.not_available')}
                                </code>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='text-muted-foreground h-8 w-8 rounded-lg p-0'
                                    onClick={() =>
                                        void copyToClipboard(space.sftp_host ? `sftp://${space.sftp_host}` : '')
                                    }
                                >
                                    <Copy className='h-3.5 w-3.5' />
                                </Button>
                            </div>
                        </div>
                        <div className='space-y-2'>
                            <Label className='text-muted-foreground ml-1 text-[10px] font-black tracking-widest uppercase'>
                                {t('webSpaces.settings.port')}
                            </Label>
                            <div className='bg-secondary/50 border-border/10 flex items-center gap-2 rounded-xl border p-1 pr-1 pl-4'>
                                <code className='text-foreground/80 flex-1 truncate font-mono text-xs'>
                                    {space.sftp_port != null ? space.sftp_port : t('common.not_available')}
                                </code>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='text-muted-foreground h-8 w-8 rounded-lg p-0'
                                    onClick={() =>
                                        void copyToClipboard(space.sftp_port != null ? String(space.sftp_port) : '')
                                    }
                                >
                                    <Copy className='h-3.5 w-3.5' />
                                </Button>
                            </div>
                        </div>
                        <div className='space-y-2'>
                            <Label className='text-muted-foreground ml-1 text-[10px] font-black tracking-widest uppercase'>
                                {t('webSpaces.settings.username')}
                            </Label>
                            <div className='bg-secondary/50 border-border/10 flex items-center gap-2 rounded-xl border p-1 pr-1 pl-4'>
                                <code className='text-foreground/80 flex-1 truncate font-mono text-xs'>{sftpUser}</code>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='text-muted-foreground h-8 w-8 rounded-lg p-0'
                                    onClick={() => void copyToClipboard(sftpUser)}
                                >
                                    <Copy className='h-3.5 w-3.5' />
                                </Button>
                            </div>
                        </div>
                        <p className='text-muted-foreground text-xs'>{t('webSpaces.settings.fileAccessHelp')}</p>

                        <div className='border-border/20 space-y-3 border-t pt-4'>
                            <Label className='text-muted-foreground ml-1 text-[10px] font-black tracking-widest uppercase'>
                                {t('webSpaces.settings.sftpAccountsTitle')}
                            </Label>
                            <p className='text-muted-foreground text-xs'>{t('webSpaces.settings.sftpAccountsHelp')}</p>
                            {space.ftp_enabled && (
                                <p className='text-muted-foreground text-xs'>
                                    {t('webSpaces.settings.sftpAccountsFtpNote')}
                                </p>
                            )}
                            {sftpAccounts.length > 0 && (
                                <ul className='divide-border divide-y rounded-lg border text-sm'>
                                    {sftpAccounts.map((acct) => (
                                        <li
                                            key={acct.id}
                                            className='flex flex-wrap items-center justify-between gap-2 px-3 py-2'
                                        >
                                            <div className='min-w-0'>
                                                <code className='font-mono text-xs'>
                                                    {acct.login || acct.account_name}
                                                </code>
                                                <p className='text-muted-foreground text-xs'>
                                                    {acct.home_relative
                                                        ? `/${acct.home_relative}`
                                                        : t('webSpaces.settings.sftpAccountRoot')}
                                                </p>
                                            </div>
                                            <Button
                                                size='sm'
                                                variant='outline'
                                                onClick={() => void deleteSftpAccount(acct.id)}
                                            >
                                                {t('common.delete')}
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className='space-y-2'>
                                <Input
                                    placeholder={t('webSpaces.settings.sftpAccountName')}
                                    value={newSftpName}
                                    onChange={(e) => setNewSftpName(e.target.value)}
                                />
                                <Input
                                    placeholder={t('webSpaces.settings.sftpAccountHome')}
                                    value={newSftpHome}
                                    onChange={(e) => setNewSftpHome(e.target.value)}
                                />
                                <Input
                                    type='password'
                                    placeholder={t('webSpaces.settings.sftpAccountPassword')}
                                    value={newSftpPassword}
                                    onChange={(e) => setNewSftpPassword(e.target.value)}
                                />
                                <Button loading={savingSftp} size='sm' onClick={() => void createSftpAccount()}>
                                    {t('webSpaces.settings.sftpAccountCreate')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </PageCard>

                {space.ftp_enabled && (
                    <PageCard
                        title={t('webSpaces.settings.ftpTitle')}
                        description={t('webSpaces.settings.ftpHelp')}
                        icon={FolderOpen}
                    >
                        <div className='space-y-4'>
                            <p className='rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:text-amber-200'>
                                {t('webSpaces.settings.ftpSecurityWarning')}
                            </p>
                            <div className='space-y-2'>
                                <Label className='text-muted-foreground ml-1 text-[10px] font-black tracking-widest uppercase'>
                                    {t('webSpaces.settings.host')}
                                </Label>
                                <div className='bg-secondary/50 border-border/10 flex items-center gap-2 rounded-xl border p-1 pr-1 pl-4'>
                                    <code className='text-foreground/80 flex-1 truncate font-mono text-xs'>
                                        {space.ftp_host || t('common.not_available')}
                                    </code>
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        className='text-muted-foreground h-8 w-8 rounded-lg p-0'
                                        onClick={() =>
                                            void copyToClipboard(space.ftp_host ? String(space.ftp_host) : '')
                                        }
                                    >
                                        <Copy className='h-3.5 w-3.5' />
                                    </Button>
                                </div>
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-muted-foreground ml-1 text-[10px] font-black tracking-widest uppercase'>
                                    {t('webSpaces.settings.port')}
                                </Label>
                                <div className='bg-secondary/50 border-border/10 flex items-center gap-2 rounded-xl border p-1 pr-1 pl-4'>
                                    <code className='text-foreground/80 flex-1 truncate font-mono text-xs'>
                                        {space.ftp_port != null ? space.ftp_port : t('common.not_available')}
                                    </code>
                                </div>
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-muted-foreground ml-1 text-[10px] font-black tracking-widest uppercase'>
                                    {t('webSpaces.settings.username')}
                                </Label>
                                <div className='bg-secondary/50 border-border/10 flex items-center gap-2 rounded-xl border p-1 pr-1 pl-4'>
                                    <code className='text-foreground/80 flex-1 truncate font-mono text-xs'>
                                        {sftpUser}
                                    </code>
                                </div>
                            </div>
                            <p className='text-muted-foreground text-xs'>
                                {t('webSpaces.settings.ftpCredentialsNote')}
                            </p>
                        </div>
                    </PageCard>
                )}
            </div>
        </WebSpacePageWidgets>
    );
}
