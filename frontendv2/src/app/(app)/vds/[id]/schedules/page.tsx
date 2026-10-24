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

import { VdsUsagePill } from '@/components/vds/VdsUsagePill';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import { Camera, CalendarClock, Loader2, Pencil, Plus, RefreshCw, RotateCw, Trash2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { useVmInstance } from '@/contexts/VmInstanceContext';
import { formatDateTimeInTz } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-errors';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { EmptyState } from '@/components/featherui/EmptyState';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { VdsPageHeader } from '@/components/vds/VdsPageHeader';
import { VdsPageLoading } from '@/components/vds/VdsPageLoading';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Select } from '@/components/ui/select-native';
import { Switch } from '@/components/ui/switch';

interface Schedule {
    id: number;
    name: string;
    action: 'reboot' | 'snapshot';
    frequency: 'hourly' | 'daily' | 'weekly';
    minute: number;
    hour: number;
    weekday: number;
    keep: number;
    enabled: boolean;
    next_run_at: string | null;
    last_run_at: string | null;
    last_status: 'ok' | 'failed' | 'skipped' | null;
    last_error: string | null;
}

interface Features {
    enabled: boolean;
    max: number;
    actions: string[];
    allow_hourly: boolean;
    max_keep: number;
}

type Draft = Omit<Schedule, 'id' | 'next_run_at' | 'last_run_at' | 'last_status' | 'last_error'>;

const STATUS_STYLE: Record<string, string> = {
    ok: 'bg-green-500/10 text-green-600 dark:text-green-400',
    failed: 'bg-red-500/10 text-red-600 dark:text-red-400',
    skipped: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
};

const pad = (n: number) => String(n).padStart(2, '0');

export default function VdsSchedulesPage() {
    const { id } = useParams() as { id: string };
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const { instance, loading: instanceLoading, hasPermission } = useVmInstance();
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [features, setFeatures] = useState<Features | null>(null);
    const [timezone, setTimezone] = useState('UTC');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState<{ id: number | null; draft: Draft } | null>(null);
    const [remove, setRemove] = useState<Schedule | null>(null);
    const canManage = hasPermission('schedules');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/user/vm-instances/${id}/schedules`);
            setSchedules(data.data.schedules ?? []);
            setFeatures(data.data.features);
            setTimezone(data.data.timezone ?? 'UTC');
            setError(null);
        } catch (err) {
            setError(getApiErrorMessage(err, t, 'vds.schedules.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [id, t]);

    useEffect(() => {
        if (!instanceLoading && instance) void load();
    }, [instanceLoading, instance, load]);

    const save = async (scheduleId: number | null, body: Partial<Draft>) => {
        setBusy(true);
        try {
            if (scheduleId === null) await axios.post(`/api/user/vm-instances/${id}/schedules`, body);
            else await axios.patch(`/api/user/vm-instances/${id}/schedules/${scheduleId}`, body);
            toast.success(t('vds.schedules.saved'));
            await load();
            return true;
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'vds.schedules.save_failed'));
            return false;
        } finally {
            setBusy(false);
        }
    };

    const describe = (s: Draft) => {
        const time = `${pad(s.hour)}:${pad(s.minute)}`;
        if (s.frequency === 'hourly') return t('vds.schedules.every_hour', { minute: pad(s.minute) });
        if (s.frequency === 'weekly')
            return t('vds.schedules.every_week', { day: t(`vds.schedules.weekdays.${s.weekday}`), time });
        return t('vds.schedules.every_day', { time });
    };

    if (instanceLoading || (loading && !features && !error)) {
        return <VdsPageLoading label={t('common.loading')} />;
    }

    if (!features) {
        return (
            <div className='space-y-6 pb-12'>
                <VdsPageHeader title={t('vds.schedules.title')} description={t('vds.schedules.description')} />
                <EmptyState icon={CalendarClock} title={t('vds.schedules.unavailable')} description={error ?? ''} />
            </div>
        );
    }

    const limitReached = schedules.length >= features.max;
    const newDraft = (): Draft => ({
        name: '',
        action: (features.actions[0] as Draft['action']) ?? 'reboot',
        frequency: 'daily',
        minute: 0,
        hour: 4,
        weekday: 0,
        keep: Math.min(3, features.max_keep),
        enabled: true,
    });
    const d = editing?.draft;
    const setDraft = (patch: Partial<Draft>) =>
        editing && setEditing({ ...editing, draft: { ...editing.draft, ...patch } });

    return (
        <div className='space-y-6 pb-12'>
            <VdsPageHeader
                title={t('vds.schedules.title')}
                description={
                    <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
                        <span>{t('vds.schedules.description', { timezone })}</span>
                        <VdsUsagePill used={schedules.length} max={features.max} />
                    </div>
                }
                actions={
                    <div className='flex items-center gap-2'>
                        <Button variant='outline' onClick={() => void load()} disabled={loading}>
                            <RefreshCw className={cn('h-4 w-4 sm:mr-2', loading && 'animate-spin')} />
                            <span className='hidden sm:inline'>{t('navigation.items.refresh')}</span>
                        </Button>
                        <Button
                            onClick={() => setEditing({ id: null, draft: newDraft() })}
                            disabled={!canManage || limitReached || features.actions.length === 0}
                        >
                            <Plus className='mr-2 h-4 w-4' />
                            {t('vds.schedules.create')}
                        </Button>
                    </div>
                }
            />

            {schedules.length === 0 ? (
                <EmptyState
                    icon={CalendarClock}
                    title={t('vds.schedules.empty_title')}
                    description={
                        features.max === 0 ? t('vds.schedules.no_quota') : t('vds.schedules.empty_description')
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-3'>
                    {schedules.map((s) => (
                        <ResourceCard
                            key={s.id}
                            icon={s.action === 'snapshot' ? Camera : RotateCw}
                            title={s.name}
                            description={
                                <div className='text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 text-sm'>
                                    <span>
                                        {t(`vds.schedules.actions.${s.action}`)} · {describe(s)}
                                        {s.action === 'snapshot' &&
                                            ` · ${t('vds.schedules.keeps', { count: String(s.keep) })}`}
                                    </span>
                                    <span>
                                        {t('vds.schedules.next_run')}:{' '}
                                        {s.enabled && s.next_run_at ? formatDateTimeInTz(s.next_run_at, dateOpts) : '-'}
                                    </span>
                                    {s.last_run_at && (
                                        <span title={s.last_error ?? undefined}>
                                            {t('vds.schedules.last_run')}: {formatDateTimeInTz(s.last_run_at, dateOpts)}
                                        </span>
                                    )}
                                </div>
                            }
                            badges={
                                s.last_status ? (
                                    <span
                                        className={cn(
                                            'rounded-full px-2.5 py-0.5 text-xs font-medium',
                                            STATUS_STYLE[s.last_status],
                                        )}
                                        title={s.last_error ?? undefined}
                                    >
                                        {t(`vds.schedules.status.${s.last_status}`)}
                                    </span>
                                ) : undefined
                            }
                            actions={
                                <div className='flex items-center gap-2'>
                                    <Switch
                                        checked={s.enabled}
                                        disabled={!canManage || busy}
                                        onCheckedChange={(v) => void save(s.id, { enabled: v })}
                                        aria-label={t('vds.schedules.enabled')}
                                    />
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        disabled={!canManage}
                                        onClick={() => setEditing({ id: s.id, draft: { ...s } })}
                                        aria-label={t('vds.schedules.edit')}
                                    >
                                        <Pencil className='h-4 w-4' />
                                    </Button>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        disabled={!canManage}
                                        className='text-red-500 hover:bg-red-500/10'
                                        onClick={() => setRemove(s)}
                                        aria-label={t('vds.schedules.delete')}
                                    >
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                </div>
                            }
                        />
                    ))}
                </div>
            )}

            <Dialog
                open={editing !== null}
                onOpenChange={(o) => !busy && !o && setEditing(null)}
                className='max-w-md space-y-4'
            >
                <DialogHeader>
                    <DialogTitle>{editing?.id ? t('vds.schedules.edit') : t('vds.schedules.create')}</DialogTitle>
                    <DialogDescription>{t('vds.schedules.timezone_hint', { timezone })}</DialogDescription>
                </DialogHeader>
                {d && (
                    <div className='grid grid-cols-2 gap-3'>
                        <div className='col-span-2 space-y-1.5'>
                            <label className='text-sm font-semibold'>{t('vds.schedules.name')}</label>
                            <Input value={d.name} maxLength={80} onChange={(e) => setDraft({ name: e.target.value })} />
                        </div>
                        <Select
                            label={t('vds.schedules.action')}
                            value={d.action}
                            onChange={(e) => setDraft({ action: e.target.value as Draft['action'] })}
                        >
                            {features.actions.map((a) => (
                                <option key={a} value={a}>
                                    {t(`vds.schedules.actions.${a}`)}
                                </option>
                            ))}
                        </Select>
                        <Select
                            label={t('vds.schedules.frequency')}
                            value={d.frequency}
                            onChange={(e) => setDraft({ frequency: e.target.value as Draft['frequency'] })}
                        >
                            {(features.allow_hourly ? ['hourly', 'daily', 'weekly'] : ['daily', 'weekly']).map((f) => (
                                <option key={f} value={f}>
                                    {t(`vds.schedules.frequencies.${f}`)}
                                </option>
                            ))}
                        </Select>
                        {d.frequency === 'weekly' && (
                            <Select
                                label={t('vds.schedules.weekday')}
                                value={d.weekday}
                                onChange={(e) => setDraft({ weekday: Number(e.target.value) })}
                            >
                                {[1, 2, 3, 4, 5, 6, 0].map((w) => (
                                    <option key={w} value={w}>
                                        {t(`vds.schedules.weekdays.${w}`)}
                                    </option>
                                ))}
                            </Select>
                        )}
                        {d.frequency !== 'hourly' && (
                            <Select
                                label={t('vds.schedules.hour')}
                                value={d.hour}
                                onChange={(e) => setDraft({ hour: Number(e.target.value) })}
                            >
                                {Array.from({ length: 24 }, (_, h) => (
                                    <option key={h} value={h}>
                                        {pad(h)}
                                    </option>
                                ))}
                            </Select>
                        )}
                        <Select
                            label={t('vds.schedules.minute')}
                            value={d.minute}
                            onChange={(e) => setDraft({ minute: Number(e.target.value) })}
                        >
                            {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                                <option key={m} value={m}>
                                    {pad(m)}
                                </option>
                            ))}
                        </Select>
                        {d.action === 'snapshot' && (
                            <Select
                                label={t('vds.schedules.keep')}
                                value={d.keep}
                                onChange={(e) => setDraft({ keep: Number(e.target.value) })}
                            >
                                {Array.from({ length: features.max_keep }, (_, i) => i + 1).map((k) => (
                                    <option key={k} value={k}>
                                        {k}
                                    </option>
                                ))}
                            </Select>
                        )}
                        <p className='text-muted-foreground col-span-2 text-sm'>{describe(d)}</p>
                    </div>
                )}
                <DialogFooter>
                    <Button variant='outline' onClick={() => setEditing(null)} disabled={busy}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        disabled={busy || !d?.name.trim()}
                        onClick={async () => {
                            if (!editing) return;
                            if (await save(editing.id, editing.draft)) setEditing(null);
                        }}
                    >
                        {busy && <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />}
                        {t('common.save')}
                    </Button>
                </DialogFooter>
            </Dialog>

            <ConfirmDialog
                open={remove !== null}
                onOpenChange={(o) => !o && setRemove(null)}
                title={t('vds.schedules.delete')}
                description={t('vds.schedules.delete_confirm', { name: remove?.name ?? '' })}
                confirmLabel={t('vds.schedules.delete')}
                cancelLabel={t('common.cancel')}
                loading={busy}
                destructive
                onConfirm={async () => {
                    if (!remove) return;
                    setBusy(true);
                    try {
                        await axios.delete(`/api/user/vm-instances/${id}/schedules/${remove.id}`);
                        toast.success(t('vds.schedules.deleted'));
                        setRemove(null);
                        await load();
                    } catch (err) {
                        toast.error(getApiErrorMessage(err, t, 'vds.schedules.delete_failed'));
                    } finally {
                        setBusy(false);
                    }
                }}
            />
        </div>
    );
}
