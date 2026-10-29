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
import axios from 'axios';
import { toast } from 'sonner';
import {
    BellRing,
    CheckCircle2,
    HardDrive,
    History,
    PlayCircle,
    Save,
    Send,
    ServerCrash,
    Settings2,
    ShieldAlert,
    Archive,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatDateTimeInTz, formatRelativeTime } from '@/lib/dateUtils';
import { getApiErrorMessage } from '@/lib/api-errors';
import Permissions from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { DataTable } from '@/components/featherui/DataTable';
import { ListEmptyState } from '@/components/featherui/ListEmptyState';
import { ListPagination } from '@/components/featherui/ListPagination';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { Select } from '@/components/ui/select-native';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface NodeAlert {
    id: number;
    node_id: number | null;
    node_name?: string | null;
    type: 'node_down' | 'disk_full' | 'backup_failed' | 'test';
    severity: 'critical' | 'warning' | 'info';
    status: 'open' | 'resolved';
    message: string;
    occurrences: number;
    last_notified_at: string | null;
    resolved_at: string | null;
    created_at: string;
}

interface Settings {
    enabled: boolean;
    node_down_enabled: boolean;
    node_down_after_checks: number;
    disk_enabled: boolean;
    disk_warning_percent: number;
    backup_failed_enabled: boolean;
    cooldown_minutes: number;
    notify_resolved: boolean;
    channel_inbox: boolean;
    channel_email: boolean;
    channel_webhook: boolean;
    webhook_url: string;
    webhook_secret_set: boolean;
}

const TYPE_ICONS = {
    node_down: ServerCrash,
    disk_full: HardDrive,
    backup_failed: Archive,
    test: Send,
} as const;

const SEVERITY_TONE = {
    critical: 'text-red-500 bg-red-500/10 border-red-500/20',
    warning: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    info: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
} as const;

function AlertRow({
    alert,
    onResolve,
    canResolve,
}: {
    alert: NodeAlert;
    onResolve?: (id: number) => void;
    canResolve: boolean;
}) {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const Icon = TYPE_ICONS[alert.type] ?? BellRing;
    return (
        <li className='flex flex-col gap-3 py-3 sm:flex-row sm:items-center'>
            <div className='flex min-w-0 flex-1 items-start gap-3'>
                <span
                    className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                        SEVERITY_TONE[alert.severity] ?? SEVERITY_TONE.info,
                    )}
                >
                    <Icon className='h-4 w-4' />
                </span>
                <div className='min-w-0'>
                    <p className='text-sm font-medium [overflow-wrap:anywhere]'>{alert.message}</p>
                    <p className='text-muted-foreground text-xs'>
                        {t(`adminNodeAlerts.types.${alert.type}`)} ·{' '}
                        {t('adminNodeAlerts.since', { time: formatRelativeTime(alert.created_at, dateOpts) })}
                        {alert.occurrences > 1 &&
                            ` · ${t('adminNodeAlerts.occurrences', { count: String(alert.occurrences) })}`}
                    </p>
                </div>
            </div>
            {canResolve && onResolve && (
                <Button
                    variant='outline'
                    size='sm'
                    className='self-start sm:self-center'
                    onClick={() => onResolve(alert.id)}
                >
                    <CheckCircle2 className='mr-1.5 h-4 w-4' />
                    {t('adminNodeAlerts.resolve')}
                </Button>
            )}
        </li>
    );
}

function ToggleRow({
    id,
    label,
    hint,
    checked,
    onChange,
    disabled,
}: {
    id: string;
    label: string;
    hint?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div className='flex items-center justify-between gap-4 py-2'>
            <label htmlFor={id} className='min-w-0 text-sm'>
                <span className='block'>{label}</span>
                {hint && <span className='text-muted-foreground block text-xs'>{hint}</span>}
            </label>
            <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
        </div>
    );
}

function NumberRow({
    id,
    label,
    suffix,
    value,
    min,
    max,
    onChange,
    disabled,
}: {
    id: string;
    label: string;
    suffix: string;
    value: number;
    min: number;
    max: number;
    onChange: (v: number) => void;
    disabled?: boolean;
}) {
    return (
        <div className='flex items-center justify-between gap-4 py-2'>
            <label htmlFor={id} className='text-sm'>
                {label}
            </label>
            <div className='flex items-center gap-2'>
                <Input
                    id={id}
                    type='number'
                    min={min}
                    max={max}
                    className='h-9 w-24'
                    disabled={disabled}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value) || min)}
                />
                <span className='text-muted-foreground w-14 text-xs'>{suffix}</span>
            </div>
        </div>
    );
}

function SettingsTab({ onSaved }: { onSaved: () => void }) {
    const { t } = useTranslation();
    const { hasPermission } = useSession();
    const canEdit = hasPermission(Permissions.ADMIN_SETTINGS_EDIT);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [secret, setSecret] = useState('');
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<Record<string, string> | null>(null);

    useEffect(() => {
        axios
            .get('/api/admin/node-alerts/settings')
            .then(({ data }) => setSettings(data.data.settings))
            .catch((error) => toast.error(getApiErrorMessage(error, t, 'adminNodeAlerts.settings.loadFailed')));
    }, [t]);

    const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
        setSettings((s) => (s ? { ...s, [key]: value } : s));

    const save = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const body: Record<string, unknown> = { ...settings };
            delete body.webhook_secret_set;
            if (secret !== '') body.webhook_secret = secret;
            const { data } = await axios.put('/api/admin/node-alerts/settings', body);
            setSettings(data.data.settings);
            setSecret('');
            toast.success(t('adminNodeAlerts.settings.saved'));
            onSaved();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminNodeAlerts.settings.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const clearSecret = async () => {
        try {
            const { data } = await axios.put('/api/admin/node-alerts/settings', { webhook_secret: '' });
            setSettings(data.data.settings);
            toast.success(t('adminNodeAlerts.settings.secretCleared'));
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminNodeAlerts.settings.saveFailed'));
        }
    };

    const sendTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const { data } = await axios.post('/api/admin/node-alerts/test');
            setTestResult(data.data.channels);
            toast.success(t('adminNodeAlerts.settings.testSent'));
            onSaved();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminNodeAlerts.settings.testFailed'));
        } finally {
            setTesting(false);
        }
    };

    if (!settings) return <TableSkeleton count={3} />;
    const off = !canEdit || !settings.enabled;

    return (
        <div className='space-y-4'>
            <div className='grid gap-4 lg:grid-cols-2'>
                <section className='fp-surface-inset rounded-2xl border p-4'>
                    <h3 className='mb-1 flex items-center gap-2 font-semibold'>
                        <ShieldAlert className='text-primary h-4 w-4' />
                        {t('adminNodeAlerts.settings.rulesTitle')}
                    </h3>
                    <ToggleRow
                        id='na-enabled'
                        label={t('adminNodeAlerts.settings.enabled')}
                        hint={t('adminNodeAlerts.settings.enabledHint')}
                        checked={settings.enabled}
                        onChange={(v) => update('enabled', v)}
                        disabled={!canEdit}
                    />
                    <ToggleRow
                        id='na-down'
                        label={t('adminNodeAlerts.settings.nodeDown')}
                        checked={settings.node_down_enabled}
                        onChange={(v) => update('node_down_enabled', v)}
                        disabled={off}
                    />
                    <NumberRow
                        id='na-down-checks'
                        label={t('adminNodeAlerts.settings.nodeDownAfter')}
                        suffix={t('adminNodeAlerts.settings.checks')}
                        value={settings.node_down_after_checks}
                        min={1}
                        max={30}
                        onChange={(v) => update('node_down_after_checks', v)}
                        disabled={off || !settings.node_down_enabled}
                    />
                    <ToggleRow
                        id='na-disk'
                        label={t('adminNodeAlerts.settings.disk')}
                        checked={settings.disk_enabled}
                        onChange={(v) => update('disk_enabled', v)}
                        disabled={off}
                    />
                    <NumberRow
                        id='na-disk-pct'
                        label={t('adminNodeAlerts.settings.diskAt')}
                        suffix='%'
                        value={settings.disk_warning_percent}
                        min={50}
                        max={99}
                        onChange={(v) => update('disk_warning_percent', v)}
                        disabled={off || !settings.disk_enabled}
                    />
                    <ToggleRow
                        id='na-backup'
                        label={t('adminNodeAlerts.settings.backupFailed')}
                        checked={settings.backup_failed_enabled}
                        onChange={(v) => update('backup_failed_enabled', v)}
                        disabled={off}
                    />
                    <NumberRow
                        id='na-cooldown'
                        label={t('adminNodeAlerts.settings.cooldown')}
                        suffix={t('adminNodeAlerts.settings.minutes')}
                        value={settings.cooldown_minutes}
                        min={5}
                        max={10080}
                        onChange={(v) => update('cooldown_minutes', v)}
                        disabled={off}
                    />
                    <ToggleRow
                        id='na-resolved'
                        label={t('adminNodeAlerts.settings.notifyResolved')}
                        checked={settings.notify_resolved}
                        onChange={(v) => update('notify_resolved', v)}
                        disabled={off}
                    />
                </section>
                <section className='fp-surface-inset rounded-2xl border p-4'>
                    <h3 className='mb-1 flex items-center gap-2 font-semibold'>
                        <BellRing className='text-primary h-4 w-4' />
                        {t('adminNodeAlerts.settings.channelsTitle')}
                    </h3>
                    <ToggleRow
                        id='na-inbox'
                        label={t('adminNodeAlerts.settings.inbox')}
                        hint={t('adminNodeAlerts.settings.inboxHint')}
                        checked={settings.channel_inbox}
                        onChange={(v) => update('channel_inbox', v)}
                        disabled={!canEdit}
                    />
                    <ToggleRow
                        id='na-email'
                        label={t('adminNodeAlerts.settings.email')}
                        hint={t('adminNodeAlerts.settings.emailHint')}
                        checked={settings.channel_email}
                        onChange={(v) => update('channel_email', v)}
                        disabled={!canEdit}
                    />
                    <ToggleRow
                        id='na-webhook'
                        label={t('adminNodeAlerts.settings.webhook')}
                        hint={t('adminNodeAlerts.settings.webhookHint')}
                        checked={settings.channel_webhook}
                        onChange={(v) => update('channel_webhook', v)}
                        disabled={!canEdit}
                    />
                    <div className='space-y-2 pt-2'>
                        <Input
                            aria-label={t('adminNodeAlerts.settings.webhookUrl')}
                            placeholder='https://hooks.example.com/featherpanel'
                            value={settings.webhook_url}
                            onChange={(e) => update('webhook_url', e.target.value)}
                            disabled={!canEdit}
                            className='h-10 font-mono text-sm'
                        />
                        <Input
                            type='password'
                            autoComplete='new-password'
                            aria-label={t('adminNodeAlerts.settings.webhookSecret')}
                            placeholder={
                                settings.webhook_secret_set
                                    ? t('adminNodeAlerts.settings.secretKept')
                                    : t('adminNodeAlerts.settings.secretPlaceholder')
                            }
                            value={secret}
                            onChange={(e) => setSecret(e.target.value)}
                            disabled={!canEdit}
                            className='h-10 font-mono text-sm'
                        />
                        <p className='text-muted-foreground text-xs'>{t('adminNodeAlerts.settings.signatureHint')}</p>
                        {settings.webhook_secret_set && canEdit && (
                            <Button variant='ghost' size='sm' onClick={clearSecret}>
                                {t('adminNodeAlerts.settings.clearSecret')}
                            </Button>
                        )}
                    </div>
                </section>
            </div>
            {testResult && (
                <div className='fp-surface-inset flex flex-wrap gap-2 rounded-xl border p-3 text-xs'>
                    {Object.entries(testResult).map(([channel, result]) => (
                        <span
                            key={channel}
                            className={cn(
                                'rounded-md border px-2 py-1',
                                result === 'sent'
                                    ? 'border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400'
                                    : result === 'skipped'
                                      ? 'text-muted-foreground'
                                      : 'border-red-500/20 bg-red-500/10 text-red-500',
                            )}
                        >
                            {t(`adminNodeAlerts.settings.channelNames.${channel}`)}:{' '}
                            {['sent', 'skipped', 'mail_disabled', 'no_recipients'].includes(result)
                                ? t(`adminNodeAlerts.settings.results.${result}`)
                                : result}
                        </span>
                    ))}
                </div>
            )}
            {canEdit && (
                <div className='flex flex-col-reverse gap-2 sm:flex-row sm:justify-end'>
                    <Button variant='outline' onClick={sendTest} loading={testing} disabled={testing}>
                        <Send className='mr-2 h-4 w-4' />
                        {t('adminNodeAlerts.settings.sendTest')}
                    </Button>
                    <Button onClick={save} loading={saving} disabled={saving}>
                        <Save className='mr-2 h-4 w-4' />
                        {t('common.save')}
                    </Button>
                </div>
            )}
        </div>
    );
}

function HistoryTab({ refreshKey }: { refreshKey: number }) {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const [rows, setRows] = useState<NodeAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [type, setType] = useState('');
    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const timer = setTimeout(() => {
            axios
                .get('/api/admin/node-alerts/history', { params: { page, limit: 15, type, status, search } })
                .then(({ data }) => {
                    if (cancelled) return;
                    setRows(data.data.items);
                    setTotalPages(data.data.pagination.total_pages || 1);
                })
                .catch((error) => toast.error(getApiErrorMessage(error, t, 'adminNodeAlerts.history.loadFailed')))
                .finally(() => !cancelled && setLoading(false));
        }, 200);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [page, type, status, search, refreshKey, t]);

    const filtered = type !== '' || status !== '' || search !== '';
    const clear = () => {
        setType('');
        setStatus('');
        setSearch('');
        setPage(1);
    };

    return (
        <div className='space-y-4'>
            <div className='grid gap-2 sm:grid-cols-[1fr_auto_auto]'>
                <Input
                    placeholder={t('adminNodeAlerts.history.search')}
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    className='h-10'
                />
                <Select
                    value={type}
                    onChange={(e) => {
                        setType(e.target.value);
                        setPage(1);
                    }}
                    className='rounded-xl'
                    aria-label={t('adminNodeAlerts.history.type')}
                >
                    <option value=''>{t('adminNodeAlerts.history.allTypes')}</option>
                    {(['node_down', 'disk_full', 'backup_failed', 'test'] as const).map((k) => (
                        <option key={k} value={k}>
                            {t(`adminNodeAlerts.types.${k}`)}
                        </option>
                    ))}
                </Select>
                <Select
                    value={status}
                    onChange={(e) => {
                        setStatus(e.target.value);
                        setPage(1);
                    }}
                    className='rounded-xl'
                    aria-label={t('adminNodeAlerts.history.status')}
                >
                    <option value=''>{t('adminNodeAlerts.history.allStatuses')}</option>
                    <option value='open'>{t('adminNodeAlerts.status.open')}</option>
                    <option value='resolved'>{t('adminNodeAlerts.status.resolved')}</option>
                </Select>
            </div>
            {loading ? (
                <TableSkeleton count={4} />
            ) : rows.length === 0 ? (
                <ListEmptyState
                    icon={History}
                    title={t('adminNodeAlerts.history.emptyTitle')}
                    description={t('adminNodeAlerts.history.emptyDescription')}
                    filtered={filtered}
                    onClearFilters={clear}
                />
            ) : (
                <DataTable
                    rows={rows}
                    rowKey={(row) => row.id}
                    columns={[
                        {
                            key: 'when',
                            header: t('adminNodeAlerts.history.when'),
                            className: 'text-muted-foreground whitespace-nowrap',
                            cell: (row) => formatDateTimeInTz(row.created_at, dateOpts),
                        },
                        {
                            key: 'type',
                            header: t('adminNodeAlerts.history.type'),
                            cell: (row) => (
                                <span
                                    className={cn(
                                        'rounded-md border px-2 py-0.5 text-xs whitespace-nowrap',
                                        SEVERITY_TONE[row.severity] ?? SEVERITY_TONE.info,
                                    )}
                                >
                                    {t(`adminNodeAlerts.types.${row.type}`)}
                                </span>
                            ),
                        },
                        {
                            key: 'message',
                            header: t('adminNodeAlerts.history.message'),
                            className: 'max-w-[28rem]',
                            cell: (row) => <span className='line-clamp-2'>{row.message}</span>,
                        },
                        {
                            key: 'status',
                            header: t('adminNodeAlerts.history.status'),
                            className: 'whitespace-nowrap',
                            cell: (row) =>
                                row.status === 'open' ? (
                                    <span className='text-red-500'>{t('adminNodeAlerts.status.open')}</span>
                                ) : (
                                    <span className='text-muted-foreground'>
                                        {t('adminNodeAlerts.status.resolved')}
                                        {row.resolved_at && ` · ${formatRelativeTime(row.resolved_at, dateOpts)}`}
                                    </span>
                                ),
                        },
                    ]}
                    mobileCard={(row) => (
                        <div className='min-w-0 space-y-1'>
                            <div className='flex items-center justify-between gap-2'>
                                <span
                                    className={cn(
                                        'rounded-md border px-2 py-0.5 text-xs',
                                        SEVERITY_TONE[row.severity] ?? SEVERITY_TONE.info,
                                    )}
                                >
                                    {t(`adminNodeAlerts.types.${row.type}`)}
                                </span>
                                <span
                                    className={cn(
                                        'text-xs',
                                        row.status === 'open' ? 'text-red-500' : 'text-muted-foreground',
                                    )}
                                >
                                    {t(`adminNodeAlerts.status.${row.status}`)}
                                </span>
                            </div>
                            <p className='text-sm [overflow-wrap:anywhere]'>{row.message}</p>
                            <p className='text-muted-foreground text-xs'>
                                {formatDateTimeInTz(row.created_at, dateOpts)}
                            </p>
                        </div>
                    )}
                />
            )}
            {!loading && totalPages > 1 && (
                <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />
            )}
        </div>
    );
}

/** Node alerts: open alerts, history and settings, shown on the node status page. */
export function NodeAlertsPanel({
    openAlerts,
    lastRunAt,
    monitorEnabled,
    onChanged,
}: {
    openAlerts: NodeAlert[];
    lastRunAt: string | null;
    monitorEnabled: boolean;
    onChanged: () => void;
}) {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const { hasPermission } = useSession();
    const canEditNodes = hasPermission(Permissions.ADMIN_NODES_EDIT);
    const [tab, setTab] = useState('open');
    const [checking, setChecking] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const changed = useCallback(() => {
        setRefreshKey((k) => k + 1);
        onChanged();
    }, [onChanged]);

    const resolve = async (id: number) => {
        try {
            await axios.post(`/api/admin/node-alerts/${id}/resolve`);
            toast.success(t('adminNodeAlerts.resolved'));
            changed();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminNodeAlerts.resolveFailed'));
        }
    };

    const checkNow = async () => {
        setChecking(true);
        try {
            await axios.post('/api/admin/node-alerts/evaluate');
            toast.success(t('adminNodeAlerts.checked'));
            changed();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminNodeAlerts.checkFailed'));
        } finally {
            setChecking(false);
        }
    };

    return (
        <section className='fp-surface rounded-2xl border p-4 sm:p-5'>
            <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div className='flex items-start gap-3'>
                    <div className='bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl'>
                        <BellRing className='h-4 w-4' />
                    </div>
                    <div>
                        <h2 className='font-semibold'>{t('adminNodeAlerts.title')}</h2>
                        <p className='text-muted-foreground text-sm'>
                            {!monitorEnabled
                                ? t('adminNodeAlerts.monitorOff')
                                : lastRunAt
                                  ? t('adminNodeAlerts.lastCheck', { time: formatRelativeTime(lastRunAt, dateOpts) })
                                  : t('adminNodeAlerts.neverChecked')}
                        </p>
                    </div>
                </div>
                {canEditNodes && (
                    <Button variant='outline' size='sm' onClick={checkNow} loading={checking} disabled={checking}>
                        <PlayCircle className='mr-1.5 h-4 w-4' />
                        {t('adminNodeAlerts.checkNow')}
                    </Button>
                )}
            </div>
            <Tabs value={tab} onValueChange={setTab}>
                <TabsList className='mb-4'>
                    <TabsTrigger value='open'>
                        {t('adminNodeAlerts.tabs.open')}
                        {openAlerts.length > 0 && (
                            <span className='ml-1.5 rounded-full bg-red-500/15 px-1.5 text-xs text-red-500'>
                                {openAlerts.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value='history'>{t('adminNodeAlerts.tabs.history')}</TabsTrigger>
                    <TabsTrigger value='settings'>
                        <Settings2 className='mr-1.5 h-3.5 w-3.5' />
                        {t('adminNodeAlerts.tabs.settings')}
                    </TabsTrigger>
                </TabsList>
                <TabsContent value='open'>
                    {openAlerts.length === 0 ? (
                        <div className='flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-sm'>
                            <CheckCircle2 className='h-5 w-5 shrink-0 text-green-500' />
                            {t('adminNodeAlerts.allClear')}
                        </div>
                    ) : (
                        <ul className='divide-border/60 divide-y'>
                            {openAlerts.map((alert) => (
                                <AlertRow key={alert.id} alert={alert} onResolve={resolve} canResolve={canEditNodes} />
                            ))}
                        </ul>
                    )}
                </TabsContent>
                <TabsContent value='history'>
                    <HistoryTab refreshKey={refreshKey} />
                </TabsContent>
                <TabsContent value='settings'>
                    <SettingsTab onSaved={changed} />
                </TabsContent>
            </Tabs>
        </section>
    );
}
