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
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { safeBack } from '@/lib/safe-back';

import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { HeadlessSelect } from '@/components/ui/headless-select';
import type { DatabaseHost, Server } from '@/types/server';

export default function CreateDatabasePage() {
    const { uuidShort } = useParams() as { uuidShort: string };
    const router = useRouter();
    const { t } = useTranslation();
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);
    const canCreate = hasPermission('database.create');

    const [saving, setSaving] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [server, setServer] = React.useState<Server | null>(null);
    const [availableHosts, setAvailableHosts] = React.useState<DatabaseHost[]>([]);
    const [databaseCount, setDatabaseCount] = React.useState(0);
    const [form, setForm] = React.useState({
        database_host_id: '',
        database_name: '',
        remote: '%',
        max_connections: 0,
    });

    const { getWidgets, fetchWidgets } = usePluginWidgets('server-databases-new');

    React.useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    React.useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const [serverRes, hostsRes, databasesRes] = await Promise.all([
                    axios.get<{ success: boolean; data: Server }>(`/api/user/servers/${uuidShort}`),
                    axios.get<{ success: boolean; data: DatabaseHost[] }>(
                        `/api/user/servers/${uuidShort}/databases/hosts`,
                    ),
                    axios.get<{ success: boolean; data: { pagination?: { total?: number } } }>(
                        `/api/user/servers/${uuidShort}/databases`,
                        { params: { page: 1, per_page: 1 } },
                    ),
                ]);
                if (serverRes.data?.success) {
                    setServer(serverRes.data.data);
                }
                if (hostsRes.data?.success) {
                    const hosts = hostsRes.data.data || [];
                    setAvailableHosts(hosts);
                    if (hosts.length === 1) {
                        setForm((prev) => ({ ...prev, database_host_id: String(hosts[0].id) }));
                    }
                }
                const total = databasesRes.data?.data?.pagination?.total;
                if (typeof total === 'number') {
                    setDatabaseCount(total);
                }
            } catch (error) {
                console.error('Failed to load create database context:', error);
                toast.error(t('serverDatabases.failedToFetch'));
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [uuidShort, t]);

    const limitReached = !!server && server.database_limit > 0 && databaseCount >= server.database_limit;
    const databasesDisabled = !!server && server.database_limit === 0;

    const handleCreate = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (databasesDisabled || limitReached) {
            toast.error(
                databasesDisabled ? t('serverDatabases.noDatabasesNoLimit') : t('serverDatabases.databaseLimitReached'),
            );
            return;
        }
        if (!form.database_host_id) {
            toast.error(t('serverDatabases.noHostSelected'));
            return;
        }
        if (!form.database_name.trim()) {
            toast.error(t('serverDatabases.databaseNameRequired'));
            return;
        }

        setSaving(true);
        try {
            const { data } = await axios.post(`/api/user/servers/${uuidShort}/databases`, {
                database_host_id: Number(form.database_host_id),
                database_name: form.database_name.trim(),
                remote: form.remote.trim() || '%',
                max_connections: Number(form.max_connections) || 0,
            });
            if (data?.success) {
                toast.success(t('serverDatabases.createSuccess'));
                router.push(`/server/${uuidShort}/databases`);
            } else {
                toast.error(data?.message || t('serverDatabases.createFailed'));
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ message?: string; error_message?: string }>;
            toast.error(
                axiosError.response?.data?.message ||
                    axiosError.response?.data?.error_message ||
                    t('serverDatabases.createFailed'),
            );
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
        <div className='mx-auto max-w-4xl space-y-8 pb-16'>
            <WidgetRenderer widgets={getWidgets('server-databases-new', 'top-of-page')} />
            <PageHeader
                title={t('serverDatabases.createDatabase')}
                description={t('serverDatabases.createDatabaseDescription')}
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
                            onClick={() => handleCreate()}
                            disabled={saving || databasesDisabled || limitReached || availableHosts.length === 0}
                            loading={saving}
                            className='order-1 w-full sm:order-2 sm:w-auto'
                        >
                            <Plus className='mr-2 h-4 w-4' />
                            {t('serverDatabases.create')}
                        </Button>
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-databases-new', 'after-header')} />

            {(databasesDisabled || limitReached) && (
                <div className='rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-5'>
                    <div className='flex items-start gap-4'>
                        <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-yellow-500/30 bg-yellow-500/20'>
                            <AlertTriangle className='h-5 w-5 text-yellow-500' />
                        </div>
                        <div className='space-y-1'>
                            <h3 className='font-bold text-yellow-500'>
                                {databasesDisabled ? t('common.disabled') : t('serverDatabases.databaseLimitReached')}
                            </h3>
                            <p className='text-sm text-yellow-500/85'>
                                {databasesDisabled
                                    ? t('serverDatabases.noDatabasesNoLimit')
                                    : t('serverDatabases.databaseLimitReachedDescription', {
                                          limit: String(server?.database_limit || 0),
                                      })}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleCreate} className='space-y-8'>
                <div className='bg-card/50 border-border/50 space-y-6 rounded-3xl border p-8 backdrop-blur-3xl'>
                    <div className='border-border/10 flex items-center gap-4 border-b pb-6'>
                        <div className='bg-primary/10 border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                            <ServerIcon className='text-primary h-5 w-5' />
                        </div>
                        <div className='space-y-0.5'>
                            <h2 className='text-xl font-black tracking-tight uppercase italic'>
                                {t('serverDatabases.databaseHost')}
                            </h2>
                            <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase opacity-50'>
                                {t('serverDatabases.createDatabaseDescription')}
                            </p>
                        </div>
                    </div>

                    <div className='space-y-2.5'>
                        <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                            {t('serverDatabases.databaseHost')} <span className='text-primary'>*</span>
                        </Label>
                        <HeadlessSelect
                            value={form.database_host_id}
                            onChange={(val) => setForm({ ...form, database_host_id: String(val) })}
                            options={availableHosts.map((h) => ({
                                id: String(h.id),
                                name: `${h.name} (${h.database_type}) - ${h.database_subdomain || h.database_host}:${h.database_port}`,
                            }))}
                            placeholder={
                                availableHosts.length === 0
                                    ? t('serverDatabases.noDatabaseHosts')
                                    : t('serverDatabases.selectDatabaseHost')
                            }
                            disabled={saving || availableHosts.length === 0 || databasesDisabled || limitReached}
                        />
                        {availableHosts.length === 0 && (
                            <p className='mt-1 ml-1 flex items-center gap-1.5 text-xs text-yellow-500'>
                                <AlertTriangle className='h-3.5 w-3.5' />
                                {t('serverDatabases.noDatabaseHostsDescription')}
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
                            <p className='text-muted-foreground text-[9px] font-bold tracking-widest uppercase opacity-50'>
                                Configuration
                            </p>
                        </div>
                    </div>

                    <div className='space-y-2.5'>
                        <Label className='text-muted-foreground ml-1 text-[9px] font-black tracking-[0.2em] uppercase'>
                            {t('serverDatabases.databaseName')} <span className='text-primary'>*</span>
                        </Label>
                        <Input
                            value={form.database_name}
                            onChange={(e) => setForm({ ...form, database_name: e.target.value })}
                            placeholder={t('serverDatabases.databaseNamePlaceholder')}
                            required
                            disabled={saving || databasesDisabled || limitReached}
                        />
                        <p className='text-muted-foreground ml-1 text-xs'>{t('serverDatabases.databaseNameHelp')}</p>
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
                            <p className='text-muted-foreground ml-1 text-xs'>
                                {t('serverDatabases.maxConnectionsHelp')}
                            </p>
                        </div>
                    </div>
                </div>
            </form>
            <WidgetRenderer widgets={getWidgets('server-databases-new', 'bottom-of-page')} />
        </div>
    );
}
