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

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
    Bell,
    CalendarClock,
    ChevronDown,
    ChevronsDownUp,
    ChevronsUpDown,
    Camera,
    Disc3,
    ExternalLink,
    LineChart,
    MonitorPlay,
    Network,
    Palette,
    Shield,
    ShieldCheck,
    Shuffle,
    SlidersHorizontal,
    TimerOff,
    type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';
import type { Setting } from '@/lib/admin-settings-api';

interface GroupDef {
    id: string;
    icon: LucideIcon;
    /** Master toggle shown as an On/Off pill in the section header. */
    master?: string;
    match: (key: string) => boolean;
}

const starts =
    (...prefixes: string[]) =>
    (key: string) =>
        prefixes.some((p) => key.startsWith(p));

/** Order matters: the first matching group wins. */
const GROUPS: GroupDef[] = [
    { id: 'branding', icon: Palette, match: starts('vds_console_brand_') },
    {
        id: 'console',
        icon: MonitorPlay,
        match: starts('vnc_', 'vds_console_', 'vds_ctrl_alt_del'),
    },
    { id: 'graphs', icon: LineChart, master: 'vds_graphs_enabled', match: starts('vds_graphs_') },
    { id: 'iso', icon: Disc3, match: starts('vds_iso_', 'vds_rescue_') },
    { id: 'snapshots', icon: Camera, master: 'vds_snapshots_enabled', match: starts('vds_snapshots_') },
    { id: 'firewall', icon: Shield, master: 'vds_firewall_enabled', match: starts('vds_firewall_') },
    { id: 'schedules', icon: CalendarClock, master: 'vds_schedules_enabled', match: starts('vds_schedules_') },
    { id: 'bandwidth', icon: Network, master: 'vds_bandwidth_enabled', match: starts('vds_bandwidth_') },
    {
        id: 'alerts',
        icon: Bell,
        master: 'vds_monitor_enabled',
        match: starts('vds_monitor_', 'vds_notify_', 'vds_high_cpu_'),
    },
    { id: 'security', icon: ShieldCheck, match: starts('vds_reauth_') },
    { id: 'expiry', icon: TimerOff, match: starts('vds_expiry_', 'vds_suspend_') },
    { id: 'placement', icon: Shuffle, match: starts('vds_placement_', 'vds_migration_') },
];

/** Display order (branding is matched first but shown last). */
const DISPLAY_ORDER = [...GROUPS.filter((g) => g.id !== 'branding'), ...GROUPS.filter((g) => g.id === 'branding')];

const OTHER: GroupDef = { id: 'other', icon: SlidersHorizontal, match: () => true };

const isOn = (s?: Setting) => !!s && (s.value === true || s.value === 'true' || s.value === 1);

export function VdsSettingsSections({
    entries,
    settings,
    searching,
    renderField,
}: {
    entries: [string, Setting][];
    settings: Record<string, Setting>;
    searching: boolean;
    renderField: (key: string, setting: Setting) => ReactNode;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState<Record<string, boolean>>({ console: true });

    const grouped = useMemo(() => {
        const out = new Map<string, { def: GroupDef; items: [string, Setting][] }>();
        for (const def of [...DISPLAY_ORDER, OTHER]) out.set(def.id, { def, items: [] });
        for (const entry of entries) {
            const def = GROUPS.find((g) => g.match(entry[0])) ?? OTHER;
            out.get(def.id)!.items.push(entry);
        }
        return [...out.values()].filter((g) => g.items.length > 0);
    }, [entries]);

    const allOpen = grouped.every((g) => open[g.def.id]);
    const toggleAll = () => {
        const next: Record<string, boolean> = {};
        for (const g of grouped) next[g.def.id] = !allOpen;
        setOpen(next);
    };

    return (
        <div className='space-y-3'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <p className='text-muted-foreground text-sm'>
                    {t('admin.settings.vds_groups.intro', { count: String(grouped.length) })}
                </p>
                {!searching && (
                    <button
                        type='button'
                        onClick={toggleAll}
                        className='text-muted-foreground hover:text-foreground hover:bg-muted/60 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors'
                    >
                        {allOpen ? (
                            <ChevronsDownUp className='h-3.5 w-3.5' />
                        ) : (
                            <ChevronsUpDown className='h-3.5 w-3.5' />
                        )}
                        {allOpen
                            ? t('admin.settings.vds_groups.collapse_all')
                            : t('admin.settings.vds_groups.expand_all')}
                    </button>
                )}
            </div>
            {grouped.map(({ def, items }) => {
                const Icon = def.icon;
                const expanded = searching || !!open[def.id];
                const master = def.master ? settings[def.master] : undefined;
                const showPill = !!def.master && !!master;
                const on = isOn(master);
                return (
                    <section
                        key={def.id}
                        className={cn(
                            'border-border/60 bg-card/40 overflow-hidden rounded-2xl border transition-colors',
                            expanded ? 'border-primary/20' : 'hover:border-primary/20',
                        )}
                    >
                        <button
                            type='button'
                            aria-expanded={expanded}
                            onClick={() => setOpen((o) => ({ ...o, [def.id]: !expanded }))}
                            className='hover:bg-muted/30 flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors sm:px-5'
                        >
                            <span className='bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl'>
                                <Icon className='h-4.5 w-4.5' />
                            </span>
                            <span className='min-w-0 flex-1'>
                                <span className='text-foreground flex flex-wrap items-center gap-2 text-sm font-semibold'>
                                    {t(`admin.settings.vds_groups.${def.id}.title`)}
                                    {showPill && (
                                        <span
                                            className={cn(
                                                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
                                                on
                                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                    : 'border-border bg-muted/50 text-muted-foreground',
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    'h-1.5 w-1.5 rounded-full',
                                                    on ? 'bg-emerald-500' : 'bg-muted-foreground/60',
                                                )}
                                            />
                                            {on ? t('common.enabled') : t('common.disabled')}
                                        </span>
                                    )}
                                </span>
                                <span className='text-muted-foreground mt-0.5 line-clamp-2 block text-xs sm:line-clamp-1'>
                                    {t(`admin.settings.vds_groups.${def.id}.description`)}
                                </span>
                            </span>
                            <span className='text-muted-foreground bg-muted/50 hidden rounded-md px-1.5 py-0.5 font-mono text-[10px] sm:inline'>
                                {items.length}
                            </span>
                            <ChevronDown
                                className={cn(
                                    'text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200',
                                    expanded && 'rotate-180',
                                )}
                            />
                        </button>
                        {expanded && (
                            <div className='border-border/50 space-y-5 border-t px-4 py-5 sm:px-5'>
                                {def.id === 'iso' && (
                                    <div className='border-border/60 bg-muted/30 flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
                                        <p className='text-muted-foreground text-sm'>
                                            {t('admin.settings.vds_groups.iso.node_callout')}
                                        </p>
                                        <Link
                                            href='/admin/vds-nodes'
                                            className='text-primary inline-flex shrink-0 items-center gap-1.5 text-xs font-medium hover:underline'
                                        >
                                            {t('admin.settings.vds_groups.iso.node_link')}
                                            <ExternalLink className='h-3.5 w-3.5' />
                                        </Link>
                                    </div>
                                )}
                                {items.map(([key, setting]) => (
                                    <div key={key}>{renderField(key, settings[key] || setting)}</div>
                                ))}
                            </div>
                        )}
                    </section>
                );
            })}
        </div>
    );
}
