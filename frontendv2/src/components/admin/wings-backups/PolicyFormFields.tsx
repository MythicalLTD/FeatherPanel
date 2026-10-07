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
import { listSupportedTimezones } from '@/lib/dateUtils';
import { useUserTimezone } from '@/contexts/PreferencesContext';
import { CalendarClock, HardDrive, Search, Settings2, Target } from 'lucide-react';

export type PolicyMode = 'full' | 'volumes' | 'user_backups_only';
export type PolicyScope = 'all_nodes' | 'nodes';

export type PolicyFormState = {
    name: string;
    mode: PolicyMode;
    scope_type: PolicyScope;
    primary_destination_id: number | null;
    mirror_destination_ids: number[];
    node_ids: number[];
    retention_days: number;
    delete_local_after_upload: number;
    is_active: number;
    cron_minute: string;
    cron_hour: string;
    cron_day_of_month: string;
    cron_month: string;
    cron_day_of_week: string;
    timezone: string;
};

export function emptyPolicyForm(timezone = 'UTC'): PolicyFormState {
    return {
        name: '',
        mode: 'full',
        scope_type: 'all_nodes',
        primary_destination_id: null,
        mirror_destination_ids: [],
        node_ids: [],
        retention_days: 90,
        delete_local_after_upload: 1,
        is_active: 1,
        cron_minute: '0',
        cron_hour: '3',
        cron_day_of_month: '*',
        cron_month: '*',
        cron_day_of_week: '*',
        timezone,
    };
}

export function formFromPolicy(policy: Record<string, unknown>, timezoneFallback = 'UTC'): PolicyFormState {
    return {
        name: String(policy.name ?? ''),
        mode: (policy.mode as PolicyMode) || 'full',
        scope_type: (policy.scope_type as PolicyScope) || 'all_nodes',
        primary_destination_id: policy.primary_destination_id != null ? Number(policy.primary_destination_id) : null,
        mirror_destination_ids: Array.isArray(policy.mirror_destination_ids)
            ? policy.mirror_destination_ids.map(Number)
            : [],
        node_ids: Array.isArray(policy.node_ids) ? policy.node_ids.map(Number) : [],
        retention_days: Number(policy.retention_days ?? 90),
        delete_local_after_upload: Number(policy.delete_local_after_upload ?? 1),
        is_active: Number(policy.is_active ?? 1),
        cron_minute: String(policy.cron_minute ?? '0'),
        cron_hour: String(policy.cron_hour ?? '3'),
        cron_day_of_month: String(policy.cron_day_of_month ?? '*'),
        cron_month: String(policy.cron_month ?? '*'),
        cron_day_of_week: String(policy.cron_day_of_week ?? '*'),
        timezone: String(policy.timezone ?? timezoneFallback),
    };
}

export function buildPolicyRequestBody(form: PolicyFormState): Record<string, unknown> {
    return {
        name: form.name.trim(),
        mode: form.mode,
        scope_type: form.scope_type,
        primary_destination_id: form.primary_destination_id,
        mirror_destination_ids: form.mirror_destination_ids,
        node_ids: form.scope_type === 'nodes' ? form.node_ids : [],
        retention_days: form.retention_days,
        delete_local_after_upload: form.delete_local_after_upload,
        is_active: form.is_active,
        cron_minute: form.cron_minute,
        cron_hour: form.cron_hour,
        cron_day_of_month: form.cron_day_of_month,
        cron_month: form.cron_month,
        cron_day_of_week: form.cron_day_of_week,
        timezone: form.timezone,
    };
}

type DestinationOption = { id: number; name: string; type: string };
type NodeOption = { id: number; name: string };

type Props = {
    form: PolicyFormState;
    setForm: React.Dispatch<React.SetStateAction<PolicyFormState>>;
    disabled?: boolean;
    /** When true, hide schedule/scope pickers that cannot be changed on edit. */
    editMode?: boolean;
};

export function PolicyFormFields({ form, setForm, disabled = false, editMode = false }: Props) {
    const { t } = useTranslation();
    const userTimezone = useUserTimezone();
    const [destinations, setDestinations] = React.useState<DestinationOption[]>([]);
    const [nodes, setNodes] = React.useState<NodeOption[]>([]);
    const [nodeSearch, setNodeSearch] = React.useState('');
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
                const [d, n] = await Promise.all([
                    axios.get('/api/admin/wings-backups/destinations', { params: { limit: 100 } }),
                    axios.get('/api/admin/nodes', { params: { page: 1, limit: 200 } }),
                ]);
                if (cancelled) return;
                setDestinations(d.data?.data?.destinations ?? []);
                setNodes(n.data?.data?.nodes ?? []);
            } catch {
                // form still usable
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const filteredNodes = React.useMemo(() => {
        const q = nodeSearch.trim().toLowerCase();
        if (!q) return nodes;
        return nodes.filter((n) => n.name.toLowerCase().includes(q));
    }, [nodes, nodeSearch]);

    const toggleNode = (id: number, checked: boolean) => {
        setForm((prev) => ({
            ...prev,
            node_ids: checked ? Array.from(new Set([...prev.node_ids, id])) : prev.node_ids.filter((x) => x !== id),
        }));
    };

    const toggleMirror = (id: number, checked: boolean) => {
        setForm((prev) => ({
            ...prev,
            mirror_destination_ids: checked
                ? Array.from(new Set([...prev.mirror_destination_ids, id]))
                : prev.mirror_destination_ids.filter((x) => x !== id),
        }));
    };

    const destinationOptions = destinations.map((d) => ({
        id: String(d.id),
        name: `${d.name} (${d.type.toUpperCase()})`,
    }));

    return (
        <div className='space-y-8'>
            <PageCard
                title={t('adminWingsBackups.policyBasics')}
                description={t('adminWingsBackups.policyBasicsHelp')}
                icon={Target}
                className='animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
            >
                <div className='space-y-6'>
                    <div className='space-y-3'>
                        <Label className='flex items-center gap-1.5'>
                            {t('adminWingsBackups.name')}
                            <span className='font-bold text-red-500'>*</span>
                        </Label>
                        <Input
                            value={form.name}
                            disabled={disabled}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder={t('adminWingsBackups.policyNamePlaceholder')}
                            className='bg-muted/30 h-11'
                        />
                    </div>

                    <div className='space-y-3'>
                        <Label>{t('adminWingsBackups.mode')}</Label>
                        <HeadlessSelect
                            value={form.mode}
                            disabled={disabled}
                            onChange={(val) => setForm((prev) => ({ ...prev, mode: String(val) as PolicyMode }))}
                            options={[
                                { id: 'full', name: t('adminWingsBackups.modeFull') },
                                { id: 'volumes', name: t('adminWingsBackups.modeVolumes') },
                                { id: 'user_backups_only', name: t('adminWingsBackups.modeUserBackups') },
                            ]}
                            placeholder={t('adminWingsBackups.selectMode')}
                        />
                        <p className='text-muted-foreground text-xs'>{t('adminWingsBackups.modeHelp')}</p>
                    </div>

                    {!editMode && (
                        <>
                            <div className='space-y-3'>
                                <Label>{t('adminWingsBackups.scope')}</Label>
                                <HeadlessSelect
                                    value={form.scope_type}
                                    disabled={disabled}
                                    onChange={(val) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            scope_type: String(val) as PolicyScope,
                                        }))
                                    }
                                    options={[
                                        { id: 'all_nodes', name: t('adminWingsBackups.scopeAllNodes') },
                                        { id: 'nodes', name: t('adminWingsBackups.scopeSelectedNodes') },
                                    ]}
                                    placeholder={t('adminWingsBackups.selectScope')}
                                />
                                <p className='text-muted-foreground text-xs'>{t('adminWingsBackups.scopeHelp')}</p>
                            </div>

                            {form.scope_type === 'nodes' && (
                                <div className='space-y-3'>
                                    <Label className='flex items-center gap-1.5'>
                                        {t('adminWingsBackups.nodes')}
                                        <span className='font-bold text-red-500'>*</span>
                                    </Label>
                                    <div className='group relative'>
                                        <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                                        <Input
                                            value={nodeSearch}
                                            disabled={disabled}
                                            onChange={(e) => setNodeSearch(e.target.value)}
                                            placeholder={t('adminWingsBackups.searchNodes')}
                                            className='bg-muted/30 h-11 pl-10'
                                        />
                                    </div>
                                    <div className='bg-muted/20 border-border/50 max-h-64 space-y-1 overflow-y-auto rounded-xl border p-2'>
                                        {nodes.length === 0 ? (
                                            <p className='text-muted-foreground p-3 text-sm'>
                                                {t('adminWingsBackups.noNodes')}
                                            </p>
                                        ) : filteredNodes.length === 0 ? (
                                            <p className='text-muted-foreground p-3 text-sm'>
                                                {t('adminWingsBackups.noNodesMatch')}
                                            </p>
                                        ) : (
                                            filteredNodes.map((node) => {
                                                const checked = form.node_ids.includes(node.id);
                                                return (
                                                    <label
                                                        key={node.id}
                                                        className={`hover:bg-muted/40 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                                                            checked ? 'bg-primary/5 ring-primary/20 ring-1' : ''
                                                        }`}
                                                    >
                                                        <Checkbox
                                                            checked={checked}
                                                            disabled={disabled}
                                                            onCheckedChange={(c) => toggleNode(node.id, Boolean(c))}
                                                        />
                                                        <span className='min-w-0 flex-1 truncate font-medium'>
                                                            {node.name}
                                                        </span>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                    {form.node_ids.length > 0 && (
                                        <p className='text-muted-foreground text-xs'>
                                            {t('adminWingsBackups.selectedNodes', {
                                                count: String(form.node_ids.length),
                                            })}
                                        </p>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </PageCard>

            {!editMode && (
                <PageCard
                    title={t('adminWingsBackups.destinations')}
                    description={t('adminWingsBackups.destinationsHelp')}
                    icon={HardDrive}
                    className='animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
                >
                    <div className='space-y-6'>
                        <div className='space-y-3'>
                            <Label className='flex items-center gap-1.5'>
                                {t('adminWingsBackups.primaryDestination')}
                                <span className='font-bold text-red-500'>*</span>
                            </Label>
                            <HeadlessSelect
                                value={form.primary_destination_id != null ? String(form.primary_destination_id) : ''}
                                disabled={disabled || destinations.length === 0}
                                onChange={(val) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        primary_destination_id: val ? Number(val) : null,
                                        mirror_destination_ids: prev.mirror_destination_ids.filter(
                                            (id) => id !== Number(val),
                                        ),
                                    }))
                                }
                                options={destinationOptions}
                                placeholder={t('adminWingsBackups.selectPrimaryDestination')}
                            />
                            {destinations.length === 0 && (
                                <p className='text-muted-foreground text-xs'>{t('adminWingsBackups.noDestinations')}</p>
                            )}
                        </div>

                        <div className='space-y-3'>
                            <Label>{t('adminWingsBackups.mirrorDestinations')}</Label>
                            <div className='bg-muted/20 border-border/50 max-h-48 space-y-1 overflow-y-auto rounded-xl border p-2'>
                                {destinations.filter((d) => d.id !== form.primary_destination_id).length === 0 ? (
                                    <p className='text-muted-foreground p-3 text-sm'>
                                        {t('adminWingsBackups.noMirrorOptions')}
                                    </p>
                                ) : (
                                    destinations
                                        .filter((d) => d.id !== form.primary_destination_id)
                                        .map((dest) => {
                                            const checked = form.mirror_destination_ids.includes(dest.id);
                                            return (
                                                <label
                                                    key={dest.id}
                                                    className={`hover:bg-muted/40 flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                                                        checked ? 'bg-primary/5 ring-primary/20 ring-1' : ''
                                                    }`}
                                                >
                                                    <Checkbox
                                                        checked={checked}
                                                        disabled={disabled}
                                                        onCheckedChange={(c) => toggleMirror(dest.id, Boolean(c))}
                                                    />
                                                    <span className='min-w-0 flex-1 truncate font-medium'>
                                                        {dest.name}
                                                    </span>
                                                    <span className='text-muted-foreground font-mono text-xs uppercase'>
                                                        {dest.type}
                                                    </span>
                                                </label>
                                            );
                                        })
                                )}
                            </div>
                            <p className='text-muted-foreground text-xs'>{t('adminWingsBackups.mirrorHelp')}</p>
                        </div>
                    </div>
                </PageCard>
            )}

            {!editMode && (
                <PageCard
                    title={t('adminWingsBackups.schedule')}
                    description={t('adminWingsBackups.scheduleHelp')}
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
            )}

            <PageCard
                title={t('adminWingsBackups.options')}
                description={t('adminWingsBackups.optionsHelp')}
                icon={Settings2}
                className='animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
            >
                <div className='space-y-6'>
                    <div className='max-w-xs space-y-3'>
                        <Label>{t('adminWingsBackups.retentionDays')}</Label>
                        <Input
                            type='number'
                            min={1}
                            max={3650}
                            value={form.retention_days}
                            disabled={disabled}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    retention_days: Math.max(1, Number(e.target.value) || 90),
                                }))
                            }
                            className='bg-muted/30 h-11'
                        />
                        <p className='text-muted-foreground text-xs'>{t('adminWingsBackups.retentionHelp')}</p>
                    </div>

                    <div className='divide-border/50 border-border/50 space-y-0 divide-y rounded-xl border'>
                        <div className='flex items-center justify-between gap-4 px-4 py-3.5'>
                            <div className='min-w-0 space-y-0.5'>
                                <Label className='text-sm font-medium'>{t('adminWingsBackups.active')}</Label>
                                <p className='text-muted-foreground text-xs'>{t('adminWingsBackups.activeHelp')}</p>
                            </div>
                            <Switch
                                checked={form.is_active === 1}
                                disabled={disabled}
                                onCheckedChange={(checked) =>
                                    setForm((prev) => ({ ...prev, is_active: checked ? 1 : 0 }))
                                }
                            />
                        </div>
                        {!editMode && (
                            <div className='flex items-center justify-between gap-4 px-4 py-3.5'>
                                <div className='min-w-0 space-y-0.5'>
                                    <Label className='text-sm font-medium'>{t('adminWingsBackups.deleteLocal')}</Label>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('adminWingsBackups.deleteLocalHelp')}
                                    </p>
                                </div>
                                <Switch
                                    checked={form.delete_local_after_upload === 1}
                                    disabled={disabled}
                                    onCheckedChange={(checked) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            delete_local_after_upload: checked ? 1 : 0,
                                        }))
                                    }
                                />
                            </div>
                        )}
                    </div>
                </div>
            </PageCard>
        </div>
    );
}
