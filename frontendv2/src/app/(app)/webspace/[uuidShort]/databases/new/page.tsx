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
import { useParams, useRouter } from 'next/navigation';
import axios, { AxiosError } from 'axios';
import { AlertTriangle, Database, Lock, Plus, Server as ServerIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { useWebSpacePermissions } from '@/hooks/useWebSpacePermissions';
import { WebSpaceSubuserPermissions } from '@/lib/webspace-permissions';
import { useWebSpace } from '@/contexts/WebSpaceContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';
import { safeBack } from '@/lib/safe-back';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { HeadlessSelect } from '@/components/ui/headless-select';

interface DatabaseHost {
    id: number;
    name: string;
    database_type: string;
    database_host?: string;
    database_port?: number;
}

export default function CreateWebSpaceDatabasePage() {
    const { uuidShort } = useParams() as { uuidShort: string };
    const router = useRouter();
    const { t } = useTranslation();
    const { hasPermission, loading: permissionsLoading } = useWebSpacePermissions(uuidShort);
    const { webspace } = useWebSpace();
    const canCreate = hasPermission(WebSpaceSubuserPermissions['database.create']);

    const [saving, setSaving] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [availableHosts, setAvailableHosts] = React.useState<DatabaseHost[]>([]);
    const [databaseCount, setDatabaseCount] = React.useState(0);
    const [form, setForm] = React.useState({
        database_host_id: '',
        database_name: '',
        remote: '%',
        max_connections: 0,
    });

    React.useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const [hostsRes, databasesRes] = await Promise.all([
                    axios.get(`/api/user/webspaces/${uuidShort}/databases/hosts`),
                    axios.get(`/api/user/webspaces/${uuidShort}/databases`),
                ]);
                const hosts = (hostsRes.data?.data?.hosts || []) as DatabaseHost[];
                setAvailableHosts(hosts);
                if (hosts.length === 1) {
                    setForm((prev) => ({ ...prev, database_host_id: String(hosts[0].id) }));
                }
                const payload = databasesRes.data?.data;
                const list = (payload?.data ?? payload ?? []) as unknown[];
                setDatabaseCount(Array.isArray(list) ? list.length : 0);
            } catch {
                toast.error(t('webSpaces.databases.loadFailed'));
            } finally {
                setLoading(false);
            }
        };
        void load();
    }, [uuidShort, t]);

    const databaseLimit = Number(webspace?.database_limit ?? 1);
    const limitReached = databaseLimit > 0 && databaseCount >= databaseLimit;
    const databasesDisabled = databaseLimit === 0;

    const handleCreate = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (databasesDisabled || limitReached) {
            toast.error(
                databasesDisabled ? t('webSpaces.databases.noHosts') : t('webSpaces.databases.databaseLimitReached'),
            );
            return;
        }
        if (!form.database_host_id) {
            toast.error(t('webSpaces.databases.selectHostAndName'));
            return;
        }
        if (!form.database_name.trim()) {
            toast.error(t('webSpaces.databases.selectHostAndName'));
            return;
        }

        setSaving(true);
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/databases`, {
                database_host_id: Number(form.database_host_id),
                database_name: form.database_name.trim(),
                remote: form.remote.trim() || '%',
                max_connections: Number(form.max_connections) || 0,
            });
            toast.success(t('webSpaces.databases.created'));
            if (data?.data?.password) {
                toast.message(t('webSpaces.databases.passwordToast', { password: String(data.data.password) }), {
                    duration: 10000,
                });
            }
            router.push(`/webspace/${uuidShort}/databases`);
        } catch (error) {
            const axiosError = error as AxiosError<{ message?: string }>;
            toast.error(axiosError.response?.data?.message || t('webSpaces.databases.createFailed'));
        } finally {
            setSaving(false);
        }
    };

    if (permissionsLoading || loading) {
        return null;
    }

    if (!canCreate) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center'>
                <div className='mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10'>
                    <Lock className='h-10 w-10 text-red-500' />
                </div>
                <h1 className='text-2xl font-black tracking-tight uppercase'>{t('common.accessDenied')}</h1>
                <p className='text-muted-foreground mt-2'>{t('common.noPermission')}</p>
                <Button variant='outline' className='mt-8' onClick={() => safeBack(router)}>
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    return (
        <WebSpacePageWidgets pageId='webspace-databases-new'>
            <div className='mx-auto max-w-4xl space-y-8 pb-16'>
                <PageHeader
                    title={t('webSpaces.databases.createDatabase')}
                    description={t('webSpaces.databases.createDatabaseDescription')}
                    actions={
                        <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                            <Button
                                variant='glass'
                                size='default'
                                onClick={() => safeBack(router)}
                                disabled={saving}
                                className='order-2 sm:order-1'
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                size='default'
                                onClick={() => void handleCreate()}
                                disabled={saving || databasesDisabled || limitReached || availableHosts.length === 0}
                                loading={saving}
                                className='order-1 w-full sm:order-2 sm:w-auto'
                            >
                                <Plus className='mr-2 h-4 w-4' />
                                {t('webSpaces.databases.create')}
                            </Button>
                        </div>
                    }
                />

                {(databasesDisabled || limitReached) && (
                    <div className='rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5'>
                        <div className='flex items-start gap-4'>
                            <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-yellow-500/30 bg-yellow-500/20'>
                                <AlertTriangle className='h-5 w-5 text-yellow-500' />
                            </div>
                            <div className='space-y-1'>
                                <h3 className='font-bold text-yellow-500'>
                                    {t('webSpaces.databases.databaseLimitReached')}
                                </h3>
                                <p className='text-sm text-yellow-500/85'>
                                    {t('webSpaces.databases.databaseLimitReachedDescription', {
                                        limit: String(databaseLimit),
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={(e) => void handleCreate(e)} className='space-y-8'>
                    <div className='bg-card/50 border-border/50 space-y-6 rounded-3xl border p-8 backdrop-blur-3xl'>
                        <div className='border-border/10 flex items-center gap-4 border-b pb-6'>
                            <div className='bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                                <ServerIcon className='text-primary h-5 w-5' />
                            </div>
                            <div className='space-y-0.5'>
                                <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                    {t('webSpaces.databases.databaseHost')}
                                </h2>
                            </div>
                        </div>
                        <div className='space-y-2.5'>
                            <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                {t('webSpaces.databases.databaseHost')} <span className='text-primary'>*</span>
                            </Label>
                            <HeadlessSelect
                                value={form.database_host_id}
                                onChange={(val) => setForm({ ...form, database_host_id: String(val) })}
                                options={availableHosts.map((h) => ({
                                    id: String(h.id),
                                    name: `${h.name} (${h.database_type})${
                                        h.database_host ? ` - ${h.database_host}:${h.database_port ?? ''}` : ''
                                    }`,
                                }))}
                                placeholder={
                                    availableHosts.length === 0
                                        ? t('webSpaces.databases.noDatabaseHosts')
                                        : t('webSpaces.databases.selectDatabaseHost')
                                }
                                disabled={saving || availableHosts.length === 0 || databasesDisabled || limitReached}
                            />
                            {availableHosts.length === 0 && (
                                <p className='mt-1 ml-1 flex items-center gap-1.5 text-xs text-yellow-500'>
                                    <AlertTriangle className='h-3.5 w-3.5' />
                                    {t('webSpaces.databases.noDatabaseHostsDescription')}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className='bg-card/50 border-border/50 space-y-6 rounded-3xl border p-8 backdrop-blur-3xl'>
                        <div className='border-border/10 flex items-center gap-4 border-b pb-6'>
                            <div className='bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                                <Database className='text-primary h-5 w-5' />
                            </div>
                            <div className='space-y-0.5'>
                                <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                    {t('serverDatabases.databaseCredentials')}
                                </h2>
                            </div>
                        </div>
                        <div className='space-y-2.5'>
                            <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                {t('webSpaces.databases.databaseName')} <span className='text-primary'>*</span>
                            </Label>
                            <Input
                                value={form.database_name}
                                onChange={(e) => setForm({ ...form, database_name: e.target.value })}
                                placeholder={t('webSpaces.databases.namePlaceholder')}
                                required
                                disabled={saving || databasesDisabled || limitReached}
                            />
                            <p className='text-muted-foreground ml-1 text-xs'>
                                {t('webSpaces.databases.databaseNameHelp')}
                            </p>
                        </div>
                        <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
                            <div className='space-y-2.5'>
                                <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                    {t('serverDatabases.remoteAccess')}
                                </Label>
                                <Input
                                    value={form.remote}
                                    onChange={(e) => setForm({ ...form, remote: e.target.value })}
                                    placeholder='%'
                                    disabled={saving || databasesDisabled || limitReached}
                                />
                                <p className='text-muted-foreground ml-1 text-xs'>
                                    {t('serverDatabases.remoteAccessHelp')}
                                </p>
                            </div>
                            <div className='space-y-2.5'>
                                <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                                    {t('serverDatabases.maxConnections')}
                                </Label>
                                <Input
                                    type='number'
                                    min={0}
                                    value={form.max_connections}
                                    onChange={(e) =>
                                        setForm({
                                            ...form,
                                            max_connections: parseInt(e.target.value, 10) || 0,
                                        })
                                    }
                                    disabled={saving || databasesDisabled || limitReached}
                                />
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </WebSpacePageWidgets>
    );
}
