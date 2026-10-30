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
import { ChevronDown, ChevronsDownUp, ChevronsUpDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';
import type { Setting } from '@/lib/admin-settings-api';
import { getGroupsForCategory, OTHER_GROUP, type SettingsGroupDef } from '@/lib/admin-settings-groups';

const isOn = (s?: Setting) => !!s && (s.value === true || s.value === 'true' || s.value === 1);

function defaultOpenState(groups: SettingsGroupDef[]): Record<string, boolean> {
    const next: Record<string, boolean> = {};
    for (const g of groups) {
        if (g.alwaysOpen || g.defaultOpen) next[g.id] = true;
    }
    return next;
}

export function SettingsAccordionSections({
    categoryKey,
    entries,
    settings,
    searching,
    renderField,
}: {
    categoryKey: string;
    entries: [string, Setting][];
    settings: Record<string, Setting>;
    searching: boolean;
    renderField: (key: string, setting: Setting) => ReactNode;
}) {
    const { t } = useTranslation();
    const groups = useMemo(() => getGroupsForCategory(categoryKey), [categoryKey]);
    const [open, setOpen] = useState<Record<string, boolean>>(() => defaultOpenState(groups));

    const grouped = useMemo(() => {
        const out = new Map<string, { def: SettingsGroupDef; items: [string, Setting][] }>();
        for (const def of groups) out.set(def.id, { def, items: [] });
        if (!out.has(OTHER_GROUP.id)) out.set(OTHER_GROUP.id, { def: OTHER_GROUP, items: [] });

        for (const entry of entries) {
            const def = groups.find((g) => g.match(entry[0])) ?? OTHER_GROUP;
            if (!out.has(def.id)) out.set(def.id, { def, items: [] });
            out.get(def.id)!.items.push(entry);
        }
        return [...out.values()].filter((g) => g.items.length > 0);
    }, [entries, groups]);

    const collapsibleGroups = grouped.filter((g) => !g.def.alwaysOpen);
    const showToggleAll = collapsibleGroups.length > 1;
    const allOpen = collapsibleGroups.length > 0 && collapsibleGroups.every((g) => open[g.def.id]);
    const toggleAll = () => {
        const next: Record<string, boolean> = { ...open };
        for (const g of collapsibleGroups) next[g.def.id] = !allOpen;
        setOpen(next);
    };

    const introKey = 'admin.settings.groups.shared.intro';
    const introRaw = t(introKey, { count: String(grouped.length) });
    const intro =
        introRaw !== introKey
            ? introRaw
            : t('admin.settings.vds_groups.intro', { count: String(grouped.length) });

    return (
        <div className='space-y-3'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <p className='text-muted-foreground text-sm'>{intro}</p>
                {!searching && showToggleAll && (
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
                            ? t('admin.settings.groups.shared.collapse_all')
                            : t('admin.settings.groups.shared.expand_all')}
                    </button>
                )}
            </div>
            {grouped.map(({ def, items }) => {
                const Icon = def.icon;
                const expanded = searching || def.alwaysOpen || !!open[def.id];
                const master = def.master ? settings[def.master] : undefined;
                const showPill = !!def.master && !!master;
                const on = isOn(master);
                const titleKey = `admin.settings.groups.${categoryKey}.${def.id}.title`;
                const descKey = `admin.settings.groups.${categoryKey}.${def.id}.description`;
                const legacyTitleKey = `admin.settings.vds_groups.${def.id}.title`;
                const legacyDescKey = `admin.settings.vds_groups.${def.id}.description`;
                let title = t(titleKey);
                if (title === titleKey) {
                    const legacy = t(legacyTitleKey);
                    title = legacy !== legacyTitleKey ? legacy : def.id;
                }
                let description = t(descKey);
                if (description === descKey) {
                    const legacy = t(legacyDescKey);
                    description = legacy !== legacyDescKey ? legacy : '';
                }

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
                            disabled={def.alwaysOpen}
                            onClick={() => {
                                if (def.alwaysOpen) return;
                                setOpen((o) => ({ ...o, [def.id]: !expanded }));
                            }}
                            className={cn(
                                'flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors sm:px-5',
                                def.alwaysOpen ? 'cursor-default' : 'hover:bg-muted/30',
                            )}
                        >
                            <span className='bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl'>
                                <Icon className='h-4.5 w-4.5' />
                            </span>
                            <span className='min-w-0 flex-1'>
                                <span className='text-foreground flex flex-wrap items-center gap-2 text-sm font-semibold'>
                                    {title}
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
                                {description ? (
                                    <span className='text-muted-foreground mt-0.5 line-clamp-2 block text-xs sm:line-clamp-1'>
                                        {description}
                                    </span>
                                ) : null}
                            </span>
                            <span className='text-muted-foreground bg-muted/50 hidden rounded-md px-1.5 py-0.5 font-mono text-[10px] sm:inline'>
                                {items.length}
                            </span>
                            {!def.alwaysOpen && (
                                <ChevronDown
                                    className={cn(
                                        'text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200',
                                        expanded && 'rotate-180',
                                    )}
                                />
                            )}
                        </button>
                        {expanded && (
                            <div className='border-border/50 space-y-5 border-t px-4 py-5 sm:px-5'>
                                {categoryKey === 'vds' && def.id === 'iso' && (
                                    <div className='border-border/60 bg-muted/30 flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
                                        <p className='text-muted-foreground text-sm'>
                                            {t('admin.settings.groups.vds.iso.node_callout') !==
                                            'admin.settings.groups.vds.iso.node_callout'
                                                ? t('admin.settings.groups.vds.iso.node_callout')
                                                : t('admin.settings.vds_groups.iso.node_callout')}
                                        </p>
                                        <Link
                                            href='/admin/vds-nodes'
                                            className='text-primary inline-flex shrink-0 items-center gap-1.5 text-xs font-medium hover:underline'
                                        >
                                            {t('admin.settings.groups.vds.iso.node_link') !==
                                            'admin.settings.groups.vds.iso.node_link'
                                                ? t('admin.settings.groups.vds.iso.node_link')
                                                : t('admin.settings.vds_groups.iso.node_link')}
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
