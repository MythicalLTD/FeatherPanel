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
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { PageCard } from '@/components/featherui/PageCard';
import { BackupTaskFields } from '@/components/server/backup/BackupTaskFields';
import {
    type BackupFields,
    emptyBackupFields,
    parseBackupFields,
    buildBackupPayload,
} from '@/components/server/backup/backup-payload';
import { listSupportedTimezones } from '@/lib/dateUtils';
import { useUserTimezone } from '@/contexts/PreferencesContext';
import { Archive, CalendarClock, HardDrive, Search, Settings2, Target } from 'lucide-react';

export type ScopeType = 'servers' | 'node' | 'all';

export type BackupScheduleFormState = {
    name: string;
    scope_type: ScopeType;
    node_id: number | null;
    server_ids: number[];
    cron_minute: string;
    cron_hour: string;
    cron_day_of_month: string;
    cron_month: string;
    cron_day_of_week: string;
    timezone: string;
    only_when_online: number;
    notify_on_failure: number;
    concurrency: number;
    is_active: number;
    backupFields: BackupFields;
};

export function emptyBackupScheduleForm(timezone = 'UTC'): BackupScheduleFormState {
    return {
        name: '',
        scope_type: 'all',
        node_id: null,
        server_ids: [],
        cron_minute: '0',
        cron_hour: '3',
        cron_day_of_month: '*',
        cron_month: '*',
        cron_day_of_week: '*',
        timezone,
        only_when_online: 0,
        notify_on_failure: 1,
        concurrency: 2,
        is_active: 1,
        backupFields: emptyBackupFields(),
    };
}

export function formFromPolicy(policy: Record<string, unknown>, timezoneFallback = 'UTC'): BackupScheduleFormState {
    const payload = typeof policy.backup_payload === 'string' ? policy.backup_payload : '';
    return {
        name: String(policy.name ?? ''),
        scope_type: (policy.scope_type as ScopeType) || 'all',
        node_id: policy.node_id != null ? Number(policy.node_id) : null,
        server_ids: Array.isArray(policy.server_ids) ? policy.server_ids.map(Number) : [],
        cron_minute: String(policy.cron_minute ?? '0'),
        cron_hour: String(policy.cron_hour ?? '3'),
        cron_day_of_month: String(policy.cron_day_of_month ?? '*'),
        cron_month: String(policy.cron_month ?? '*'),
        cron_day_of_week: String(policy.cron_day_of_week ?? '*'),
        timezone: String(policy.timezone ?? timezoneFallback),
        only_when_online: Number(policy.only_when_online ?? 0),
        notify_on_failure: Number(policy.notify_on_failure ?? 1),
        concurrency: Number(policy.concurrency ?? 2),
        is_active: Number(policy.is_active ?? 1),
        backupFields: parseBackupFields('backup', payload),
    };
}

export function buildScheduleRequestBody(form: BackupScheduleFormState): Record<string, unknown> | null {
    const fields =
        form.scope_type !== 'servers' || form.server_ids.length !== 1
            ? { ...form.backupFields, database_scope: 'all' as const, database_ids: [] }
            : form.backupFields;
    const backup_payload = buildBackupPayload(fields);
    if (!backup_payload) {
        return null;
    }
    return {
        name: form.name.trim(),
        scope_type: form.scope_type,
        node_id: form.scope_type === 'node' ? form.node_id : null,
        server_ids: form.scope_type === 'servers' ? form.server_ids : [],
        cron_minute: form.cron_minute,
        cron_hour: form.cron_hour,
        cron_day_of_month: form.cron_day_of_month,
        cron_month: form.cron_month,
        cron_day_of_week: form.cron_day_of_week,
        timezone: form.timezone,
        only_when_online: form.only_when_online,
        notify_on_failure: form.notify_on_failure,
        concurrency: form.concurrency,
        is_active: form.is_active,
        backup_payload,
    };
}

type ServerOption = { id: number; name: string; uuidShort: string };
type NodeOption = { id: number; name: string };

type Props = {
    form: BackupScheduleFormState;
    setForm: React.Dispatch<React.SetStateAction<BackupScheduleFormState>>;
    disabled?: boolean;
};

export function BackupScheduleFormFields({ form, setForm, disabled = false }: Props) {
    const { t } = useTranslation();
    const userTimezone = useUserTimezone();
    const [servers, setServers] = React.useState<ServerOption[]>([]);
    const [nodes, setNodes] = React.useState<NodeOption[]>([]);
    const [targetCount, setTargetCount] = React.useState<number | null>(null);
    const [serverSearch, setServerSearch] = React.useState('');
    const timezoneOptions = React.useMemo(() => listSupportedTimezones().map((tz) => ({ id: tz, name: tz })), []);

    React.useEffect(() => {
        if (form.timezone === 'UTC' && userTimezone && userTimezone !== 'UTC') {
            setForm((prev) => (prev.timezone === 'UTC' ? { ...prev, timezone: userTimezone } : prev));
        }
    }, [userTimezone, form.timezone, setForm]);

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const [serversRes, nodesRes] = await Promise.all([
                    axios.get('/api/admin/servers', { params: { page: 1, limit: 500 } }),
                    axios.get('/api/admin/nodes', { params: { page: 1, limit: 200 } }),
                ]);
                if (cancelled) return;
                const serverList = (serversRes.data?.data?.servers ?? []) as ServerOption[];
                const nodeList = (nodesRes.data?.data?.nodes ?? []) as NodeOption[];
                setServers(Array.isArray(serverList) ? serverList : []);
                setNodes(Array.isArray(nodeList) ? nodeList : []);
            } catch {
                // ignore; form still usable
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    React.useEffect(() => {
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const { data } = await axios.post('/api/admin/backup-schedules/preview-targets', {
                    scope_type: form.scope_type,
                    node_id: form.node_id,
                    server_ids: form.server_ids,
                });
                if (!cancelled) {
                    setTargetCount(typeof data?.data?.count === 'number' ? data.data.count : null);
                }
            } catch {
                if (!cancelled) setTargetCount(null);
            }
        }, 250);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [form.scope_type, form.node_id, form.server_ids]);

    const filteredServers = React.useMemo(() => {
        const q = serverSearch.trim().toLowerCase();
        if (!q) return servers;
        return servers.filter((s) => s.name.toLowerCase().includes(q) || s.uuidShort.toLowerCase().includes(q));
    }, [servers, serverSearch]);

    const toggleServer = (id: number, checked: boolean) => {
        setForm((prev) => ({
            ...prev,
            server_ids: checked
                ? Array.from(new Set([...prev.server_ids, id]))
                : prev.server_ids.filter((existing) => existing !== id),
        }));
    };

    const selectAllFiltered = () => {
        setForm((prev) => ({
            ...prev,
            server_ids: Array.from(new Set([...prev.server_ids, ...filteredServers.map((s) => s.id)])),
        }));
    };

    const clearServers = () => {
        setForm((prev) => ({ ...prev, server_ids: [] }));
    };

    return (
        <div className='space-y-8'>
            <PageCard
                title={t('adminBackupSchedules.basics')}
                description={t('adminBackupSchedules.basicsHelp')}
                icon={Target}
                className='animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
            >
                <div className='space-y-6'>
                    <div className='space-y-3'>
                        <Label className='flex items-center gap-1.5'>
                            {t('adminBackupSchedules.name')}
                            <span className='font-bold text-red-500'>*</span>
                        </Label>
                        <Input
                            value={form.name}
                            disabled={disabled}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder={t('adminBackupSchedules.namePlaceholder')}
                            className='bg-muted/30 h-11'
                        />
                    </div>

                    <div className='space-y-3'>
                        <Label>{t('adminBackupSchedules.scope')}</Label>
                        <HeadlessSelect
                            value={form.scope_type}
                            disabled={disabled}
                            onChange={(val) =>
                                setForm((prev) => ({
                                    ...prev,
                                    scope_type: String(val) as ScopeType,
                                }))
                            }
                            options={[
                                { id: 'all', name: t('adminBackupSchedules.scopeAll') },
                                { id: 'node', name: t('adminBackupSchedules.scopeNode') },
                                { id: 'servers', name: t('adminBackupSchedules.scopeServers') },
                            ]}
                            placeholder={t('adminBackupSchedules.selectScope')}
                        />
                        {targetCount != null && (
                            <p className='text-muted-foreground text-xs'>
                                {t('adminBackupSchedules.targetCount', { count: String(targetCount) })}
                            </p>
                        )}
                        <p className='text-muted-foreground text-xs'>{t('adminBackupSchedules.scopeHelp')}</p>
                    </div>

                    {form.scope_type === 'node' && (
                        <div className='space-y-3'>
                            <Label className='flex items-center gap-1.5'>
                                {t('adminBackupSchedules.node')}
                                <span className='font-bold text-red-500'>*</span>
                            </Label>
                            <HeadlessSelect
                                value={form.node_id != null ? String(form.node_id) : ''}
                                disabled={disabled}
                                onChange={(val) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        node_id: val ? Number(val) : null,
                                    }))
                                }
                                options={nodes.map((n) => ({ id: String(n.id), name: n.name }))}
                                placeholder={t('adminBackupSchedules.selectNode')}
                            />
                        </div>
                    )}

                    {form.scope_type === 'servers' && (
                        <div className='space-y-3'>
                            <div className='flex flex-wrap items-center justify-between gap-2'>
                                <Label className='flex items-center gap-1.5'>
                                    {t('adminBackupSchedules.servers')}
                                    <span className='font-bold text-red-500'>*</span>
                                </Label>
                                <div className='flex gap-2 text-xs'>
                                    <button
                                        type='button'
                                        className='text-primary hover:underline'
                                        disabled={disabled || filteredServers.length === 0}
                                        onClick={selectAllFiltered}
                                    >
                                        {t('adminBackupSchedules.selectAllVisible')}
                                    </button>
                                    <span className='text-muted-foreground'>·</span>
                                    <button
                                        type='button'
                                        className='text-muted-foreground hover:text-foreground hover:underline'
                                        disabled={disabled || form.server_ids.length === 0}
                                        onClick={clearServers}
                                    >
                                        {t('adminBackupSchedules.clearSelection')}
                                    </button>
                                </div>
                            </div>
                            <div className='group relative'>
                                <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                                <Input
                                    value={serverSearch}
                                    disabled={disabled}
                                    onChange={(e) => setServerSearch(e.target.value)}
                                    placeholder={t('adminBackupSchedules.searchServers')}
                                    className='bg-muted/30 h-11 pl-10'
                                />
                            </div>
                            <div className='bg-muted/20 border-border/50 max-h-64 space-y-1 overflow-y-auto rounded-xl border p-2'>
                                {servers.length === 0 ? (
                                    <p className='text-muted-foreground p-3 text-sm'>
                                        {t('adminBackupSchedules.noServers')}
                                    </p>
                                ) : filteredServers.length === 0 ? (
                                    <p className='text-muted-foreground p-3 text-sm'>
                                        {t('adminBackupSchedules.noServersMatch')}
                                    </p>
                                ) : (
                                    filteredServers.map((server) => {
                                        const checked = form.server_ids.includes(server.id);
                                        return (
                                            <label
                                                key={server.id}
                                                className={`hover:bg-muted/40 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                                                    checked ? 'bg-primary/5 ring-primary/20 ring-1' : ''
                                                }`}
                                            >
                                                <Checkbox
                                                    checked={checked}
                                                    disabled={disabled}
                                                    onCheckedChange={(c) => toggleServer(server.id, Boolean(c))}
                                                />
                                                <span className='min-w-0 flex-1 truncate font-medium'>
                                                    {server.name}
                                                </span>
                                                <span className='text-muted-foreground font-mono text-xs'>
                                                    {server.uuidShort}
                                                </span>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                            {form.server_ids.length > 0 && (
                                <p className='text-muted-foreground text-xs'>
                                    {t('adminBackupSchedules.selectedServers', {
                                        count: String(form.server_ids.length),
                                    })}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </PageCard>

            <PageCard
                title={t('adminBackupSchedules.schedule')}
                description={t('adminBackupSchedules.scheduleHelp')}
                icon={CalendarClock}
                className='animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
            >
                <div className='space-y-6'>
                    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-5'>
                        {(
                            [
                                ['cron_minute', 'minute'],
                                ['cron_hour', 'hour'],
                                ['cron_day_of_month', 'dayOfMonth'],
                                ['cron_month', 'month'],
                                ['cron_day_of_week', 'dayOfWeek'],
                            ] as const
                        ).map(([key, labelKey]) => (
                            <div key={key} className='space-y-3'>
                                <Label>{t(`serverSchedules.${labelKey}`)}</Label>
                                <Input
                                    value={form[key]}
                                    disabled={disabled}
                                    onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                                    className='bg-muted/30 h-11 font-mono'
                                />
                            </div>
                        ))}
                    </div>
                    <p className='text-muted-foreground text-xs'>{t('serverSchedules.cronHelp')}</p>
                    <div className='space-y-3'>
                        <Label>{t('serverSchedules.timezone')}</Label>
                        <HeadlessSelect
                            value={form.timezone}
                            disabled={disabled}
                            onChange={(val) => setForm((prev) => ({ ...prev, timezone: String(val) }))}
                            options={timezoneOptions}
                            placeholder='UTC'
                        />
                        <p className='text-muted-foreground text-xs'>{t('serverSchedules.timezoneHelp')}</p>
                    </div>
                </div>
            </PageCard>

            <PageCard
                title={t('adminBackupSchedules.backupOptions')}
                description={t('adminBackupSchedules.backupOptionsHelp')}
                icon={HardDrive}
                className='animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
            >
                <BackupTaskFields
                    fields={form.backupFields}
                    setFields={(updater) =>
                        setForm((prev) => ({
                            ...prev,
                            backupFields: typeof updater === 'function' ? updater(prev.backupFields) : updater,
                        }))
                    }
                    databases={[]}
                    disabled={disabled}
                />
            </PageCard>

            <PageCard
                title={t('adminBackupSchedules.options')}
                description={t('adminBackupSchedules.optionsHelp')}
                icon={Settings2}
                className='animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
            >
                <div className='space-y-6'>
                    <div className='max-w-xs space-y-3'>
                        <Label>{t('adminBackupSchedules.concurrency')}</Label>
                        <Input
                            type='number'
                            min={1}
                            max={5}
                            value={form.concurrency}
                            disabled={disabled}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    concurrency: Math.min(5, Math.max(1, Number(e.target.value) || 1)),
                                }))
                            }
                            className='bg-muted/30 h-11'
                        />
                        <p className='text-muted-foreground text-xs'>{t('adminBackupSchedules.concurrencyHelp')}</p>
                    </div>

                    <div className='divide-border/50 border-border/50 space-y-0 divide-y rounded-xl border'>
                        {(
                            [
                                ['is_active', 'active', 'activeHelp'],
                                ['only_when_online', 'onlyWhenOnline', 'onlyWhenOnlineHelp'],
                                ['notify_on_failure', 'notifyOnFailure', 'notifyOnFailureHelp'],
                            ] as const
                        ).map(([field, labelKey, helpKey]) => (
                            <div key={field} className='flex items-center justify-between gap-4 px-4 py-3.5'>
                                <div className='min-w-0 space-y-0.5'>
                                    <Label className='text-sm font-medium'>
                                        {t(`adminBackupSchedules.${labelKey}`)}
                                    </Label>
                                    <p className='text-muted-foreground text-xs'>
                                        {t(`adminBackupSchedules.${helpKey}`)}
                                    </p>
                                </div>
                                <Switch
                                    checked={form[field] === 1}
                                    disabled={disabled}
                                    onCheckedChange={(checked) =>
                                        setForm((prev) => ({ ...prev, [field]: checked ? 1 : 0 }))
                                    }
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </PageCard>

            <PageCard
                title={t('adminBackupSchedules.destinationNote')}
                icon={Archive}
                className='animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
            >
                <p className='text-muted-foreground text-sm leading-relaxed'>
                    {t('adminBackupSchedules.destinationHelp')}
                </p>
            </PageCard>
        </div>
    );
}
