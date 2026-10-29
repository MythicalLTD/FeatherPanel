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
    Archive,
    CheckCircle2,
    Eye,
    HardDrive,
    PlayCircle,
    Save,
    Settings2,
    ShieldCheck,
    ShieldOff,
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
import { SizeInput } from '@/components/featherui/SizeInput';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Select } from '@/components/ui/select-native';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsTrigger } from '@/components/ui/tabs';
import { ScrollableTabsList } from '@/components/ui/scrollable-tabs-list';

type Action = 'notify' | 'suspend' | 'archive' | 'delete';
type Step = 'warn' | 'wait' | 'clear' | 'skip' | 'suspend' | 'archive' | 'archive_check' | 'delete';

interface Policy {
    enabled: boolean;
    action: Action;
    inactive_days: number;
    grace_days: number;
    warn_owner: boolean;
    max_actions_per_run: number;
    confirmed_action: Action | null;
    confirmed_at: string | null;
}

interface PlanItem {
    server_id: number;
    uuid_short: string;
    name: string;
    owner_username: string | null;
    exempt: boolean;
    last_activity_at: string | null;
    inactive_days: number;
    stage: string | null;
    step: Step;
    reason: string | null;
    due_at: string | null;
}

interface Plan {
    items: PlanItem[];
    token: string;
    counts: Partial<Record<Step, number>>;
    archive_available: boolean;
    total: number;
}

interface ArchiveRow {
    id: number;
    server_uuid: string;
    server_name: string;
    owner_username: string | null;
    backup_uuid: string;
    backup_disk: string;
    bytes: number | null;
    last_activity_at: string | null;
    created_at: string;
}

const ACTIONS: Action[] = ['notify', 'suspend', 'archive', 'delete'];
const DESTRUCTIVE_STEPS: Step[] = ['suspend', 'archive', 'archive_check', 'delete'];

const STEP_TONE: Record<Step, string> = {
    warn: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    wait: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    clear: 'text-green-500 bg-green-500/10 border-green-500/20',
    skip: 'text-muted-foreground bg-muted/40 border-border',
    suspend: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    archive: 'text-red-500 bg-red-500/10 border-red-500/20',
    archive_check: 'text-red-500 bg-red-500/10 border-red-500/20',
    delete: 'text-red-500 bg-red-500/10 border-red-500/20',
};

function formatBytes(bytes: number | null): string {
    if (!bytes || bytes <= 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function StepBadge({ step }: { step: Step }) {
    const { t } = useTranslation();
    return (
        <span className={cn('rounded-md border px-2 py-0.5 text-xs whitespace-nowrap', STEP_TONE[step])}>
            {t(`adminInactive.steps.${step}`)}
        </span>
    );
}

function NumberField({
    id,
    label,
    hint,
    suffix,
    value,
    min,
    max,
    onChange,
    disabled,
}: {
    id: string;
    label: string;
    hint?: string;
    suffix: string;
    value: number;
    min: number;
    max: number;
    onChange: (v: number) => void;
    disabled?: boolean;
}) {
    return (
        <div className='flex items-center justify-between gap-4 py-2'>
            <label htmlFor={id} className='min-w-0 text-sm'>
                <span className='block'>{label}</span>
                {hint && <span className='text-muted-foreground block text-xs'>{hint}</span>}
            </label>
            <div className='flex shrink-0 items-center gap-2'>
                <Input
                    id={id}
                    type='number'
                    min={min}
                    max={max}
                    className='h-9 w-24'
                    disabled={disabled}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                />
                <span className='text-muted-foreground w-10 text-xs'>{suffix}</span>
            </div>
        </div>
    );
}

function PreviewTab({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const { hasPermission } = useSession();
    const canRun = hasPermission(Permissions.ADMIN_SERVERS_DELETE);
    const canExempt = hasPermission(Permissions.ADMIN_SERVERS_EDIT);
    const [plan, setPlan] = useState<Plan | null>(null);
    const [loading, setLoading] = useState(true);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [running, setRunning] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.post('/api/admin/inactive-cleanup/preview', {});
            setPlan(data.data);
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminInactive.previewFailed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        load();
    }, [load, refreshKey]);

    const actionable = plan ? plan.items.filter((i) => !['wait', 'skip'].includes(i.step)).length : 0;
    const destructive = plan ? plan.items.filter((i) => DESTRUCTIVE_STEPS.includes(i.step)).length : 0;

    const run = async () => {
        if (!plan) return;
        setRunning(true);
        try {
            const { data } = await axios.post('/api/admin/inactive-cleanup/run', { token: plan.token });
            const r = data.data as { applied: Record<string, number>; failed: number; deferred: number };
            const applied = Object.values(r.applied ?? {}).reduce((a, b) => a + b, 0);
            toast.success(
                t('adminInactive.ran', {
                    applied: String(applied),
                    failed: String(r.failed),
                    deferred: String(r.deferred),
                }),
            );
            setConfirmOpen(false);
            onChanged();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminInactive.runFailed'));
            setConfirmOpen(false);
            load();
        } finally {
            setRunning(false);
        }
    };

    const toggleExempt = async (item: PlanItem) => {
        try {
            await axios.put(`/api/admin/inactive-cleanup/servers/${item.server_id}/exempt`, { exempt: !item.exempt });
            toast.success(item.exempt ? t('adminInactive.exemptRemoved') : t('adminInactive.exemptAdded'));
            load();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminInactive.exemptFailed'));
        }
    };

    const detail = (item: PlanItem) => {
        if (item.step === 'skip' && item.reason) return t(`adminInactive.reasons.${item.reason}`);
        if (item.due_at) return t('adminInactive.dueAt', { time: formatDateTimeInTz(item.due_at, dateOpts) });
        return '';
    };

    const exemptButton = (item: PlanItem) =>
        canExempt ? (
            <Button variant='ghost' size='sm' onClick={() => toggleExempt(item)}>
                {item.exempt ? <ShieldOff className='mr-1.5 h-4 w-4' /> : <ShieldCheck className='mr-1.5 h-4 w-4' />}
                {item.exempt ? t('adminInactive.unexempt') : t('adminInactive.exempt')}
            </Button>
        ) : null;

    return (
        <div className='space-y-4'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div className='flex flex-wrap gap-2'>
                    {plan &&
                        (Object.entries(plan.counts) as [Step, number][]).map(([step, count]) => (
                            <span key={step} className={cn('rounded-md border px-2 py-0.5 text-xs', STEP_TONE[step])}>
                                {t(`adminInactive.steps.${step}`)} · {count}
                            </span>
                        ))}
                </div>
                <div className='flex gap-2'>
                    <Button variant='outline' size='sm' onClick={load} disabled={loading}>
                        <Eye className='mr-1.5 h-4 w-4' />
                        {t('adminInactive.refreshPreview')}
                    </Button>
                    {canRun && (
                        <Button
                            size='sm'
                            variant={destructive > 0 ? 'destructive' : 'default'}
                            disabled={loading || actionable === 0}
                            onClick={() => setConfirmOpen(true)}
                        >
                            <PlayCircle className='mr-1.5 h-4 w-4' />
                            {t('adminInactive.runNow')}
                        </Button>
                    )}
                </div>
            </div>
            <p className='text-muted-foreground text-xs'>{t('adminInactive.previewHint')}</p>
            {loading ? (
                <TableSkeleton count={4} />
            ) : !plan || plan.items.length === 0 ? (
                <ListEmptyState
                    icon={CheckCircle2}
                    title={t('adminInactive.emptyTitle')}
                    description={t('adminInactive.emptyDescription')}
                />
            ) : (
                <>
                    <DataTable
                        rows={plan.items}
                        rowKey={(row) => row.server_id}
                        columns={[
                            {
                                key: 'server',
                                header: t('adminInactive.columns.server'),
                                cell: (row) => (
                                    <div className='min-w-0'>
                                        <a
                                            href={`/admin/servers/${row.server_id}/edit`}
                                            className='font-medium underline-offset-4 hover:underline'
                                        >
                                            {row.name}
                                        </a>
                                        <p className='text-muted-foreground text-xs'>{row.owner_username ?? '-'}</p>
                                    </div>
                                ),
                            },
                            {
                                key: 'inactive',
                                header: t('adminInactive.columns.inactive'),
                                className: 'whitespace-nowrap',
                                cell: (row) => (
                                    <div>
                                        <p>{t('adminInactive.days', { count: String(row.inactive_days) })}</p>
                                        {row.last_activity_at && (
                                            <p className='text-muted-foreground text-xs'>
                                                {formatRelativeTime(row.last_activity_at, dateOpts)}
                                            </p>
                                        )}
                                    </div>
                                ),
                            },
                            {
                                key: 'step',
                                header: t('adminInactive.columns.next'),
                                cell: (row) => (
                                    <div className='space-y-1'>
                                        <StepBadge step={row.step} />
                                        <p className='text-muted-foreground text-xs'>{detail(row)}</p>
                                    </div>
                                ),
                            },
                            {
                                key: 'actions',
                                header: '',
                                className: 'text-right',
                                cell: (row) => exemptButton(row),
                            },
                        ]}
                        mobileCard={(row) => (
                            <div className='min-w-0 space-y-1.5'>
                                <div className='flex items-center justify-between gap-2'>
                                    <span className='truncate font-medium'>{row.name}</span>
                                    <StepBadge step={row.step} />
                                </div>
                                <p className='text-muted-foreground text-xs'>
                                    {row.owner_username ?? '-'} ·{' '}
                                    {t('adminInactive.days', { count: String(row.inactive_days) })}
                                </p>
                                {detail(row) && <p className='text-muted-foreground text-xs'>{detail(row)}</p>}
                                {exemptButton(row)}
                            </div>
                        )}
                    />
                    {plan.total > plan.items.length && (
                        <p className='text-muted-foreground text-xs'>
                            {t('adminInactive.truncated', {
                                shown: String(plan.items.length),
                                total: String(plan.total),
                            })}
                        </p>
                    )}
                </>
            )}
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={t('adminInactive.confirmRunTitle')}
                description={
                    destructive > 0
                        ? t('adminInactive.confirmRunDestructive', { count: String(destructive) })
                        : t('adminInactive.confirmRunSafe', { count: String(actionable) })
                }
                confirmLabel={t('adminInactive.runNow')}
                cancelLabel={t('common.cancel')}
                onConfirm={run}
                loading={running}
                destructive={destructive > 0}
            />
        </div>
    );
}

function SettingsTab({ onSaved }: { onSaved: () => void }) {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const { hasPermission } = useSession();
    const canEdit = hasPermission(Permissions.ADMIN_SERVERS_DELETE);
    const [policy, setPolicy] = useState<Policy | null>(null);
    const [archiveAvailable, setArchiveAvailable] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/admin/inactive-cleanup/settings');
            setPolicy(data.data.policy);
            setArchiveAvailable(Boolean(data.data.archive_available));
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminInactive.loadFailed'));
        }
    }, [t]);

    useEffect(() => {
        load();
    }, [load]);

    if (!policy) return <TableSkeleton count={4} />;

    const set = <K extends keyof Policy>(key: K, value: Policy[K]) => setPolicy({ ...policy, [key]: value });
    const needsConfirm = policy.action !== 'notify' && policy.confirmed_action !== policy.action;

    const save = async (confirm: boolean) => {
        setSaving(true);
        try {
            const body: Record<string, unknown> = {
                enabled: policy.enabled,
                action: policy.action,
                inactive_days: policy.inactive_days,
                grace_days: policy.grace_days,
                warn_owner: policy.warn_owner,
                max_actions_per_run: policy.max_actions_per_run,
            };
            if (confirm) body.confirm_action = policy.action;
            const { data } = await axios.put('/api/admin/inactive-cleanup/settings', body);
            setPolicy(data.data.policy);
            setConfirmOpen(false);
            toast.success(t('adminInactive.saved'));
            onSaved();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminInactive.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className='max-w-2xl space-y-5'>
            <div className='divide-border/60 divide-y'>
                <div className='flex items-center justify-between gap-4 py-2'>
                    <label htmlFor='ic-enabled' className='min-w-0 text-sm'>
                        <span className='block'>{t('adminInactive.settings.enabled')}</span>
                        <span className='text-muted-foreground block text-xs'>
                            {t('adminInactive.settings.enabledHint')}
                        </span>
                    </label>
                    <Switch
                        id='ic-enabled'
                        checked={policy.enabled}
                        onCheckedChange={(v) => set('enabled', v)}
                        disabled={!canEdit}
                    />
                </div>
                <div className='flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between'>
                    <label htmlFor='ic-action' className='min-w-0 text-sm'>
                        <span className='block'>{t('adminInactive.settings.action')}</span>
                        <span className='text-muted-foreground block text-xs'>
                            {t(`adminInactive.actionHints.${policy.action}`)}
                        </span>
                    </label>
                    <Select
                        id='ic-action'
                        value={policy.action}
                        disabled={!canEdit}
                        className='rounded-xl sm:w-56'
                        onChange={(e) => set('action', e.target.value as Action)}
                    >
                        {ACTIONS.map((a) => (
                            <option key={a} value={a} disabled={a === 'archive' && !archiveAvailable}>
                                {t(`adminInactive.actions.${a}`)}
                            </option>
                        ))}
                    </Select>
                </div>
                {!archiveAvailable && (
                    <p className='text-muted-foreground py-2 text-xs'>{t('adminInactive.settings.archiveNeedsS3')}</p>
                )}
                <NumberField
                    id='ic-days'
                    label={t('adminInactive.settings.inactiveDays')}
                    hint={t('adminInactive.settings.inactiveDaysHint')}
                    suffix={t('adminInactive.settings.daysUnit')}
                    value={policy.inactive_days}
                    min={7}
                    max={3650}
                    disabled={!canEdit}
                    onChange={(v) => set('inactive_days', v)}
                />
                <NumberField
                    id='ic-grace'
                    label={t('adminInactive.settings.graceDays')}
                    hint={t('adminInactive.settings.graceDaysHint')}
                    suffix={t('adminInactive.settings.daysUnit')}
                    value={policy.grace_days}
                    min={1}
                    max={90}
                    disabled={!canEdit}
                    onChange={(v) => set('grace_days', v)}
                />
                <NumberField
                    id='ic-max'
                    label={t('adminInactive.settings.maxPerRun')}
                    hint={t('adminInactive.settings.maxPerRunHint')}
                    suffix=''
                    value={policy.max_actions_per_run}
                    min={1}
                    max={100}
                    disabled={!canEdit}
                    onChange={(v) => set('max_actions_per_run', v)}
                />
                <div className='flex items-center justify-between gap-4 py-2'>
                    <label htmlFor='ic-warn' className='min-w-0 text-sm'>
                        <span className='block'>{t('adminInactive.settings.warnOwner')}</span>
                        <span className='text-muted-foreground block text-xs'>
                            {t('adminInactive.settings.warnOwnerHint')}
                        </span>
                    </label>
                    <Switch
                        id='ic-warn'
                        checked={policy.warn_owner}
                        onCheckedChange={(v) => set('warn_owner', v)}
                        disabled={!canEdit}
                    />
                </div>
            </div>
            {policy.confirmed_action && policy.confirmed_at && policy.confirmed_action === policy.action && (
                <p className='text-muted-foreground text-xs'>
                    {t('adminInactive.settings.confirmedAt', {
                        action: t(`adminInactive.actions.${policy.confirmed_action}`),
                        time: formatDateTimeInTz(policy.confirmed_at, dateOpts),
                    })}
                </p>
            )}
            {canEdit && (
                <Button
                    onClick={() => (needsConfirm ? setConfirmOpen(true) : save(false))}
                    loading={saving}
                    disabled={saving}
                >
                    <Save className='mr-1.5 h-4 w-4' />
                    {t('common.save')}
                </Button>
            )}
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={t('adminInactive.confirmActionTitle', { action: t(`adminInactive.actions.${policy.action}`) })}
                description={t(`adminInactive.confirmAction.${policy.action}`)}
                confirmLabel={t('adminInactive.confirmActionButton')}
                cancelLabel={t('common.cancel')}
                onConfirm={() => save(true)}
                loading={saving}
                destructive
            />
        </div>
    );
}

function ArchivesTab() {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const [rows, setRows] = useState<ArchiveRow[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        axios
            .get('/api/admin/inactive-cleanup/archives', { params: { page, limit: 20 } })
            .then(({ data }) => {
                if (cancelled) return;
                setRows(data.data.items);
                setTotalPages(Math.max(1, data.data.pagination.total_pages));
            })
            .catch((error) => toast.error(getApiErrorMessage(error, t, 'adminInactive.loadFailed')))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [page, t]);

    if (loading) return <TableSkeleton count={3} />;
    if (rows.length === 0)
        return (
            <ListEmptyState
                icon={Archive}
                title={t('adminInactive.archives.emptyTitle')}
                description={t('adminInactive.archives.emptyDescription')}
            />
        );
    return (
        <div className='space-y-4'>
            <DataTable
                rows={rows}
                rowKey={(row) => row.id}
                columns={[
                    {
                        key: 'server',
                        header: t('adminInactive.columns.server'),
                        cell: (row) => (
                            <div className='min-w-0'>
                                <p className='font-medium'>{row.server_name}</p>
                                <p className='text-muted-foreground text-xs'>{row.owner_username ?? '-'}</p>
                            </div>
                        ),
                    },
                    {
                        key: 'backup',
                        header: t('adminInactive.archives.backup'),
                        cell: (row) => (
                            <div className='min-w-0'>
                                <p className='font-mono text-xs [overflow-wrap:anywhere]'>{row.backup_uuid}</p>
                                <p className='text-muted-foreground text-xs'>
                                    {row.backup_disk} · {formatBytes(row.bytes)}
                                </p>
                            </div>
                        ),
                    },
                    {
                        key: 'when',
                        header: t('adminInactive.archives.archivedAt'),
                        className: 'text-muted-foreground whitespace-nowrap',
                        cell: (row) => formatDateTimeInTz(row.created_at, dateOpts),
                    },
                ]}
                mobileCard={(row) => (
                    <div className='min-w-0 space-y-1'>
                        <p className='font-medium'>{row.server_name}</p>
                        <p className='font-mono text-xs [overflow-wrap:anywhere]'>{row.backup_uuid}</p>
                        <p className='text-muted-foreground text-xs'>
                            {row.backup_disk} · {formatBytes(row.bytes)} ·{' '}
                            {formatDateTimeInTz(row.created_at, dateOpts)}
                        </p>
                    </div>
                )}
            />
            {totalPages > 1 && <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />}
        </div>
    );
}

function QuotaTab() {
    const { t } = useTranslation();
    const { hasPermission } = useSession();
    const canEdit = hasPermission(Permissions.ADMIN_SETTINGS_EDIT);
    const [value, setValue] = useState<number | ''>('');
    const [valid, setValid] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        axios
            .get('/api/admin/disk-quota/settings')
            .then(({ data }) => setValue(Number(data.data.default_mb) || 0))
            .catch((error) => toast.error(getApiErrorMessage(error, t, 'adminInactive.loadFailed')))
            .finally(() => setLoaded(true));
    }, [t]);

    const save = async () => {
        setSaving(true);
        try {
            await axios.put('/api/admin/disk-quota/settings', { default_mb: value === '' ? 0 : value });
            toast.success(t('adminInactive.quota.saved'));
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'adminInactive.quota.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    if (!loaded) return <TableSkeleton count={2} />;
    return (
        <div className='max-w-2xl space-y-4'>
            <div className='space-y-1'>
                <p className='text-sm'>{t('adminInactive.quota.defaultLabel')}</p>
                <p className='text-muted-foreground text-xs'>{t('adminInactive.quota.defaultHint')}</p>
            </div>
            <div className='max-w-xs'>
                <SizeInput
                    value={value}
                    onValueChange={setValue}
                    unit='MiB'
                    min={0}
                    ariaLabel={t('adminInactive.quota.defaultLabel')}
                    onValidityChange={setValid}
                />
            </div>
            <p className='text-muted-foreground text-xs'>{t('adminInactive.quota.perUserHint')}</p>
            {canEdit && (
                <Button onClick={save} loading={saving} disabled={saving || !valid}>
                    <Save className='mr-1.5 h-4 w-4' />
                    {t('common.save')}
                </Button>
            )}
        </div>
    );
}

/** Inactive server cleanup (dry-run preview, confirmed runs, archives) and the default disk quota. */
export function InactiveCleanupPanel() {
    const { t } = useTranslation();
    const [tab, setTab] = useState('preview');
    const [refreshKey, setRefreshKey] = useState(0);
    const changed = useCallback(() => setRefreshKey((k) => k + 1), []);

    return (
        <section className='fp-surface rounded-2xl border p-4 sm:p-5'>
            <Tabs value={tab} onValueChange={setTab}>
                <ScrollableTabsList wrapperClassName='mb-4 max-w-full'>
                    <TabsTrigger value='preview'>
                        <Eye className='mr-1.5 h-3.5 w-3.5' />
                        {t('adminInactive.tabs.preview')}
                    </TabsTrigger>
                    <TabsTrigger value='settings'>
                        <Settings2 className='mr-1.5 h-3.5 w-3.5' />
                        {t('adminInactive.tabs.settings')}
                    </TabsTrigger>
                    <TabsTrigger value='archives'>
                        <Archive className='mr-1.5 h-3.5 w-3.5' />
                        {t('adminInactive.tabs.archives')}
                    </TabsTrigger>
                    <TabsTrigger value='quota'>
                        <HardDrive className='mr-1.5 h-3.5 w-3.5' />
                        {t('adminInactive.tabs.quota')}
                    </TabsTrigger>
                </ScrollableTabsList>
                <TabsContent value='preview'>
                    <PreviewTab refreshKey={refreshKey} onChanged={changed} />
                </TabsContent>
                <TabsContent value='settings'>
                    <SettingsTab onSaved={changed} />
                </TabsContent>
                <TabsContent value='archives'>
                    <ArchivesTab />
                </TabsContent>
                <TabsContent value='quota'>
                    <QuotaTab />
                </TabsContent>
            </Tabs>
        </section>
    );
}
