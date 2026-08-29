/*
This file is part of FeatherPanel.
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

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Plus, Trash2, KeyRound, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { useWebSpacePermissions } from '@/hooks/useWebSpacePermissions';
import { WebSpaceSubuserPermissions } from '@/lib/webspace-permissions';
import { Select } from '@/components/ui/select-native';
import { useWebSpace } from '@/contexts/WebSpaceContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';
import { useSettings } from '@/contexts/SettingsContext';
import { appendPmaAuthParams, preparePmaAuthContext, storePmaAuthContext } from '@/lib/pma-auth-context';

interface DatabaseRow {
    id: number;
    database: string;
    username: string;
    password?: string;
    database_host_name?: string;
    database_host?: string;
    database_port?: number;
}

interface DatabaseHost {
    id: number;
    name: string;
    database_type: string;
}

export default function WebSpaceDatabasesPage() {
    const params = useParams();
    const uuidShort = String(params.uuidShort || '');
    const { hasPermission } = useWebSpacePermissions(uuidShort);
    const { webspace } = useWebSpace();
    const { t, locale } = useTranslation();
    const { settings } = useSettings();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<DatabaseRow[]>([]);
    const [hosts, setHosts] = useState<DatabaseHost[]>([]);
    const [name, setName] = useState('');
    const [hostId, setHostId] = useState('');
    const [busy, setBusy] = useState(false);
    const [phpMyAdminInstalled, setPhpMyAdminInstalled] = useState(false);

    const canCreate = hasPermission(WebSpaceSubuserPermissions['database.create']);
    const canDelete = hasPermission(WebSpaceSubuserPermissions['database.delete']);
    const canReset = hasPermission(WebSpaceSubuserPermissions['database.update']);
    const canViewPassword = hasPermission(WebSpaceSubuserPermissions['database.view_password']);
    const databaseLimit = Number(webspace?.database_limit ?? 1);
    const atLimit = databaseLimit > 0 && rows.length >= databaseLimit;

    const load = useCallback(async () => {
        try {
            const [listRes, hostsRes, pmaRes] = await Promise.all([
                axios.get(`/api/user/webspaces/${uuidShort}/databases`),
                axios.get(`/api/user/webspaces/${uuidShort}/databases/hosts`),
                axios.get(`/api/user/webspaces/${uuidShort}/databases/phpmyadmin/check`).catch(() => null),
            ]);
            setRows((listRes.data?.data?.data || []) as DatabaseRow[]);
            setHosts((hostsRes.data?.data?.hosts || []) as DatabaseHost[]);
            setPhpMyAdminInstalled(!!pmaRes?.data?.data?.installed);
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.databases.loadFailed')
                    : t('webSpaces.databases.loadFailed'),
            );
        } finally {
            setLoading(false);
        }
    }, [uuidShort, t]);

    useEffect(() => {
        void load();
    }, [load]);

    const createDb = async () => {
        if (!hostId || !name.trim()) {
            toast.error(t('webSpaces.databases.selectHostAndName'));
            return;
        }
        setBusy(true);
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/databases`, {
                database_host_id: Number(hostId),
                database_name: name.trim(),
            });
            toast.success(t('webSpaces.databases.created'));
            if (data?.data?.password) {
                toast.message(t('webSpaces.databases.passwordToast', { password: String(data.data.password) }), {
                    duration: 10000,
                });
            }
            setName('');
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.databases.createFailed')
                    : t('webSpaces.databases.createFailed'),
            );
        } finally {
            setBusy(false);
        }
    };

    const removeDb = async (id: number) => {
        if (!confirm(t('webSpaces.databases.deleteConfirm'))) return;
        try {
            await axios.delete(`/api/user/webspaces/${uuidShort}/databases/${id}`);
            toast.success(t('webSpaces.databases.deleted'));
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.databases.deleteFailed')
                    : t('webSpaces.databases.deleteFailed'),
            );
        }
    };

    const resetPassword = async (id: number) => {
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/databases/${id}/reset-password`);
            toast.success(t('webSpaces.databases.passwordReset'));
            if (data?.data?.password) {
                toast.message(t('webSpaces.databases.newPassword', { password: String(data.data.password) }), {
                    duration: 10000,
                });
            }
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.databases.resetFailed')
                    : t('webSpaces.databases.resetFailed'),
            );
        }
    };

    const openPhpMyAdmin = async (id: number) => {
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/databases/${id}/phpmyadmin/token`);
            if (data?.success && data?.data?.url) {
                storePmaAuthContext(preparePmaAuthContext(settings, t, locale));
                window.open(appendPmaAuthParams(data.data.url, locale), '_blank');
                toast.success(t('serverDatabases.openingPhpMyAdmin'));
            } else {
                toast.error(data?.message || t('serverDatabases.failedToOpenPhpMyAdmin'));
            }
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('serverDatabases.failedToOpenPhpMyAdmin')
                    : t('serverDatabases.failedToOpenPhpMyAdmin'),
            );
        }
    };

    if (loading) return <TableSkeleton count={3} />;

    return (
        <WebSpacePageWidgets pageId='webspace-databases'>
            <div className='space-y-6'>
                <PageHeader
                    title={t('webSpaces.databases.title')}
                    description={t('webSpaces.databases.description', {
                        count: String(rows.length),
                        limit: databaseLimit > 0 ? String(databaseLimit) : '∞',
                    })}
                />

                {canCreate && hosts.length > 0 && !atLimit && (
                    <div className='flex flex-wrap items-end gap-2'>
                        <Select value={hostId} onChange={(e) => setHostId(e.target.value)} className='min-w-[200px]'>
                            <option value=''>{t('webSpaces.databases.selectHost')}</option>
                            {hosts.map((h) => (
                                <option key={h.id} value={String(h.id)}>
                                    {h.name} ({h.database_type})
                                </option>
                            ))}
                        </Select>
                        <Input
                            placeholder={t('webSpaces.databases.namePlaceholder')}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className='max-w-xs'
                        />
                        <Button loading={busy} onClick={() => void createDb()}>
                            <Plus className='mr-1 h-4 w-4' />
                            {t('webSpaces.databases.create')}
                        </Button>
                    </div>
                )}

                {canCreate && atLimit && (
                    <p className='text-muted-foreground text-sm'>
                        {t('webSpaces.databases.limitReached', {
                            count: String(rows.length),
                            limit: String(databaseLimit),
                        })}
                    </p>
                )}

                {hosts.length === 0 && (
                    <p className='text-muted-foreground text-sm'>{t('webSpaces.databases.noHosts')}</p>
                )}

                <div className='border-border divide-border divide-y overflow-hidden rounded-xl border'>
                    {rows.length === 0 && (
                        <p className='text-muted-foreground p-4 text-sm'>{t('webSpaces.databases.empty')}</p>
                    )}
                    {rows.map((row) => (
                        <div key={row.id} className='flex flex-wrap items-center justify-between gap-3 px-4 py-3'>
                            <div className='min-w-0'>
                                <p className='font-mono text-sm font-medium'>{row.database}</p>
                                <p className='text-muted-foreground text-xs'>
                                    {row.username} @ {row.database_host_name || row.database_host}
                                    {row.database_port ? `:${row.database_port}` : ''}
                                </p>
                                {row.password && row.password !== '[REDACTED]' && (
                                    <p className='text-muted-foreground mt-1 font-mono text-xs'>
                                        {t('webSpaces.databases.passwordLabel', { password: row.password })}
                                    </p>
                                )}
                            </div>
                            <div className='flex gap-1'>
                                {canViewPassword && phpMyAdminInstalled && (
                                    <Button
                                        variant='ghost'
                                        size='sm'
                                        onClick={() => void openPhpMyAdmin(row.id)}
                                        title='phpMyAdmin'
                                    >
                                        <ExternalLink className='h-4 w-4' />
                                    </Button>
                                )}
                                {canReset && (
                                    <Button variant='ghost' size='sm' onClick={() => void resetPassword(row.id)}>
                                        <KeyRound className='h-4 w-4' />
                                    </Button>
                                )}
                                {canDelete && (
                                    <Button variant='ghost' size='sm' onClick={() => void removeDb(row.id)}>
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </WebSpacePageWidgets>
    );
}
