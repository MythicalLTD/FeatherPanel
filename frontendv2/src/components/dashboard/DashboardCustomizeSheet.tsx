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

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, GripVertical, Plus, RotateCcw, X } from 'lucide-react';

import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import {
    ALL_WIDGET_IDS,
    METER_IDS,
    SERVER_LIMIT_OPTIONS,
    STAT_TILE_IDS,
    WIDGET_SIZES,
    type DashboardConfigApi,
    type DashboardMeter,
    type DashboardStatTileId,
    type DashboardWidgetId,
    type DashboardWidgetSize,
} from '@/hooks/useDashboardConfig';

export const WIDGET_LABEL_KEYS: Record<DashboardWidgetId, string> = {
    stats: 'dashboard.widgets.names.stats',
    attention: 'dashboard.widgets.names.attention',
    servers: 'dashboard.widgets.names.servers',
    vds: 'dashboard.widgets.names.vds',
    webspaces: 'dashboard.widgets.names.webspaces',
    usage: 'dashboard.widgets.names.usage',
    status: 'dashboard.widgets.names.status',
    uptime: 'dashboard.widgets.names.uptime',
    network: 'dashboard.widgets.names.network',
    backups: 'dashboard.widgets.names.backups',
    schedules: 'dashboard.widgets.names.schedules',
    quick_actions: 'dashboard.widgets.names.quick_actions',
    announcements: 'dashboard.widgets.names.announcements',
    activity: 'dashboard.widgets.names.activity',
    tickets: 'dashboard.widgets.names.tickets',
    knowledgebase: 'dashboard.widgets.names.knowledgebase',
    recent_mails: 'dashboard.widgets.names.recent_mails',
    profile: 'dashboard.widgets.names.profile',
    greeting: 'dashboard.widgets.names.greeting',
    pinned: 'dashboard.widgets.names.pinned',
    recent: 'dashboard.widgets.names.recent',
    notes: 'dashboard.widgets.names.notes',
    quick_links: 'dashboard.widgets.names.quick_links',
    clock: 'dashboard.widgets.names.clock',
    players: 'dashboard.widgets.names.players',
    heatmap: 'dashboard.widgets.names.heatmap',
};

export const WIDGET_DESCRIPTION_KEYS: Record<DashboardWidgetId, string> = {
    stats: 'dashboard.widgets.descriptions.stats',
    attention: 'dashboard.widgets.descriptions.attention',
    servers: 'dashboard.widgets.descriptions.servers',
    vds: 'dashboard.widgets.descriptions.vds',
    webspaces: 'dashboard.widgets.descriptions.webspaces',
    usage: 'dashboard.widgets.descriptions.usage',
    status: 'dashboard.widgets.descriptions.status',
    uptime: 'dashboard.widgets.descriptions.uptime',
    network: 'dashboard.widgets.descriptions.network',
    backups: 'dashboard.widgets.descriptions.backups',
    schedules: 'dashboard.widgets.descriptions.schedules',
    quick_actions: 'dashboard.widgets.descriptions.quick_actions',
    announcements: 'dashboard.widgets.descriptions.announcements',
    activity: 'dashboard.widgets.descriptions.activity',
    tickets: 'dashboard.widgets.descriptions.tickets',
    knowledgebase: 'dashboard.widgets.descriptions.knowledgebase',
    recent_mails: 'dashboard.widgets.descriptions.recent_mails',
    profile: 'dashboard.widgets.descriptions.profile',
    greeting: 'dashboard.widgets.descriptions.greeting',
    pinned: 'dashboard.widgets.descriptions.pinned',
    recent: 'dashboard.widgets.descriptions.recent',
    notes: 'dashboard.widgets.descriptions.notes',
    quick_links: 'dashboard.widgets.descriptions.quick_links',
    clock: 'dashboard.widgets.descriptions.clock',
    players: 'dashboard.widgets.descriptions.players',
    heatmap: 'dashboard.widgets.descriptions.heatmap',
};

const SIZE_LABEL_KEYS: Record<DashboardWidgetSize, string> = {
    small: 'dashboard.customize.size_small',
    medium: 'dashboard.customize.size_medium',
    full: 'dashboard.customize.size_full',
};

const STAT_TILE_LABEL_KEYS: Record<DashboardStatTileId, string> = {
    game: 'dashboard.home.stats.game',
    vds: 'dashboard.home.stats.vds',
    web: 'dashboard.home.stats.web',
    support: 'dashboard.home.stats.support',
};

const METER_LABEL_KEYS: Record<DashboardMeter, string> = {
    cpu: 'dashboard.home.meters.cpu',
    ram: 'dashboard.home.meters.ram',
    disk: 'dashboard.home.meters.disk',
};

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <section className='border-border/60 space-y-3 border-t pt-5 first:border-t-0 first:pt-0'>
            <div>
                <h3 className='text-sm font-semibold'>{title}</h3>
                {description && <p className='text-muted-foreground mt-0.5 text-xs'>{description}</p>}
            </div>
            {children}
        </section>
    );
}

function Segmented<T extends string>({
    value,
    options,
    onChange,
    label,
    size = 'md',
}: {
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
    label: string;
    size?: 'sm' | 'md';
}) {
    return (
        <div role='radiogroup' aria-label={label} className='bg-muted/60 inline-flex rounded-lg p-0.5'>
            {options.map((o) => (
                <button
                    key={o.value}
                    type='button'
                    role='radio'
                    aria-checked={value === o.value}
                    onClick={() => onChange(o.value)}
                    className={cn(
                        'rounded-md font-medium transition-colors',
                        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs',
                        value === o.value
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <div className='flex items-center justify-between gap-4'>
            <div className='min-w-0'>
                <p className='text-sm'>{label}</p>
                {hint && <p className='text-muted-foreground text-xs'>{hint}</p>}
            </div>
            <div className='shrink-0'>{children}</div>
        </div>
    );
}

const iconButton =
    'text-muted-foreground hover:text-foreground hover:bg-muted inline-flex h-7 w-7 items-center justify-center rounded-md disabled:pointer-events-none disabled:opacity-30';

export function DashboardCustomizeSheet({
    open,
    onOpenChange,
    api,
    availableWidgets,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    api: DashboardConfigApi;
    /** Widgets that make sense for this user and panel (disabled modules are left out). */
    availableWidgets: DashboardWidgetId[];
}) {
    const { t } = useTranslation();
    const { config } = api;
    const [dragId, setDragId] = useState<DashboardWidgetId | null>(null);
    const [dropIndex, setDropIndex] = useState<number | null>(null);

    const active = config.widgets.filter((w) => availableWidgets.includes(w.id));
    const inactive = ALL_WIDGET_IDS.filter(
        (id) => availableWidgets.includes(id) && !config.widgets.some((w) => w.id === id),
    );
    const indexOf = (id: DashboardWidgetId) => config.widgets.findIndex((w) => w.id === id);

    const endDrag = () => {
        setDragId(null);
        setDropIndex(null);
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange} className='max-w-md' enableSaveShortcut={false}>
            <SheetHeader>
                <SheetTitle className='text-xl'>{t('dashboard.customize.title')}</SheetTitle>
                <SheetDescription className='text-sm'>{t('dashboard.customize.description')}</SheetDescription>
            </SheetHeader>

            <div className='space-y-6 pb-8'>
                <Section title={t('dashboard.customize.widgets')} description={t('dashboard.customize.widgets_hint')}>
                    <ul className='space-y-1.5' onDragLeave={() => setDropIndex(null)}>
                        {active.map((w, i) => {
                            const sizes = WIDGET_SIZES[w.id];
                            return (
                                <li
                                    key={w.id}
                                    draggable
                                    onDragStart={(e) => {
                                        setDragId(w.id);
                                        e.dataTransfer.effectAllowed = 'move';
                                        e.dataTransfer.setData('text/plain', w.id);
                                    }}
                                    onDragOver={(e) => {
                                        if (!dragId) return;
                                        e.preventDefault();
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setDropIndex(e.clientY < rect.top + rect.height / 2 ? i : i + 1);
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        if (dragId && dropIndex !== null) {
                                            const target = active[dropIndex]
                                                ? indexOf(active[dropIndex].id)
                                                : config.widgets.length;
                                            const from = indexOf(dragId);
                                            api.moveWidget(dragId, from < target ? target - 1 : target);
                                        }
                                        endDrag();
                                    }}
                                    onDragEnd={endDrag}
                                    className={cn(
                                        'fp-surface relative flex items-center gap-2 rounded-lg border py-1.5 pr-1.5 pl-1',
                                        dragId === w.id && 'opacity-40',
                                        dropIndex === i &&
                                            'before:bg-primary before:absolute before:inset-x-2 before:-top-1 before:h-0.5 before:rounded-full',
                                        dropIndex === i + 1 &&
                                            i === active.length - 1 &&
                                            'after:bg-primary after:absolute after:inset-x-2 after:-bottom-1 after:h-0.5 after:rounded-full',
                                    )}
                                >
                                    <span
                                        className='text-muted-foreground hidden cursor-grab px-0.5 active:cursor-grabbing sm:inline-flex'
                                        title={t('dashboard.customize.drag')}
                                        aria-hidden
                                    >
                                        <GripVertical className='h-4 w-4' />
                                    </span>
                                    <span className='min-w-0 flex-1 truncate pl-1 text-sm font-medium sm:pl-0'>
                                        {t(WIDGET_LABEL_KEYS[w.id])}
                                    </span>
                                    {sizes.length > 1 && (
                                        <Segmented
                                            size='sm'
                                            label={t('dashboard.customize.size')}
                                            value={w.size}
                                            options={sizes
                                                .slice()
                                                .sort(
                                                    (a, b) =>
                                                        ['small', 'medium', 'full'].indexOf(a) -
                                                        ['small', 'medium', 'full'].indexOf(b),
                                                )
                                                .map((s) => ({ value: s, label: t(SIZE_LABEL_KEYS[s]) }))}
                                            onChange={(size) => api.resizeWidget(w.id, size)}
                                        />
                                    )}
                                    <button
                                        type='button'
                                        className={iconButton}
                                        disabled={i === 0}
                                        onClick={() => api.moveWidget(w.id, indexOf(active[i - 1].id))}
                                        aria-label={t('dashboard.layout.move_up')}
                                        title={t('dashboard.layout.move_up')}
                                    >
                                        <ChevronUp className='h-4 w-4' />
                                    </button>
                                    <button
                                        type='button'
                                        className={iconButton}
                                        disabled={i === active.length - 1}
                                        onClick={() => api.moveWidget(w.id, indexOf(active[i + 1].id))}
                                        aria-label={t('dashboard.layout.move_down')}
                                        title={t('dashboard.layout.move_down')}
                                    >
                                        <ChevronDown className='h-4 w-4' />
                                    </button>
                                    <button
                                        type='button'
                                        className={cn(iconButton, 'hover:text-destructive')}
                                        onClick={() => api.removeWidget(w.id)}
                                        aria-label={t('dashboard.customize.remove', {
                                            name: t(WIDGET_LABEL_KEYS[w.id]),
                                        })}
                                        title={t('dashboard.layout.remove_block')}
                                    >
                                        <X className='h-4 w-4' />
                                    </button>
                                </li>
                            );
                        })}
                        {active.length === 0 && (
                            <li className='text-muted-foreground rounded-lg border border-dashed p-3 text-sm'>
                                {t('dashboard.customize.no_widgets')}
                            </li>
                        )}
                    </ul>

                    {inactive.length > 0 && (
                        <div className='space-y-1.5 pt-2'>
                            <p className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
                                {t('dashboard.customize.add_widgets')}
                            </p>
                            <ul className='space-y-1.5'>
                                {inactive.map((id) => (
                                    <li
                                        key={id}
                                        className='border-border/70 flex items-center gap-3 rounded-lg border border-dashed px-3 py-2'
                                    >
                                        <span className='min-w-0 flex-1'>
                                            <span className='block text-sm font-medium'>
                                                {t(WIDGET_LABEL_KEYS[id])}
                                            </span>
                                            <span className='text-muted-foreground block text-xs'>
                                                {t(WIDGET_DESCRIPTION_KEYS[id])}
                                            </span>
                                        </span>
                                        <button
                                            type='button'
                                            onClick={() => api.addWidget(id)}
                                            className='bg-primary/10 text-primary hover:bg-primary/15 inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium'
                                        >
                                            <Plus className='h-3.5 w-3.5' aria-hidden />
                                            {t('dashboard.customize.add')}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </Section>

                {availableWidgets.includes('stats') && config.widgets.some((w) => w.id === 'stats') && (
                    <Section title={t('dashboard.customize.stat_tiles')}>
                        <div className='space-y-2.5'>
                            {STAT_TILE_IDS.map((id) => (
                                <Row key={id} label={t(STAT_TILE_LABEL_KEYS[id])}>
                                    <Switch
                                        checked={config.statTiles.includes(id)}
                                        onCheckedChange={() => api.toggleStatTile(id)}
                                        aria-label={t(STAT_TILE_LABEL_KEYS[id])}
                                    />
                                </Row>
                            ))}
                        </div>
                    </Section>
                )}

                {availableWidgets.includes('servers') && (
                    <Section title={t('dashboard.customize.servers')}>
                        <div className='space-y-3'>
                            <Row label={t('dashboard.customize.view')}>
                                <Segmented
                                    label={t('dashboard.customize.view')}
                                    value={config.servers.view}
                                    options={[
                                        { value: 'list', label: t('dashboard.customize.view_list') },
                                        { value: 'grid', label: t('dashboard.customize.view_grid') },
                                        { value: 'detailed', label: t('dashboard.customize.view_detailed') },
                                    ]}
                                    onChange={(view) => api.updateServers({ view })}
                                />
                            </Row>
                            <Row label={t('dashboard.customize.sort')}>
                                <Segmented
                                    label={t('dashboard.customize.sort')}
                                    value={config.servers.sort}
                                    options={[
                                        { value: 'recent', label: t('dashboard.customize.sort_recent') },
                                        { value: 'name', label: t('dashboard.customize.sort_name') },
                                        { value: 'status', label: t('dashboard.customize.sort_status') },
                                    ]}
                                    onChange={(sort) => api.updateServers({ sort })}
                                />
                            </Row>
                            <Row label={t('dashboard.customize.group')}>
                                <Segmented
                                    label={t('dashboard.customize.group')}
                                    value={config.servers.group}
                                    options={[
                                        { value: 'none', label: t('dashboard.customize.group_none') },
                                        { value: 'node', label: t('dashboard.customize.group_node') },
                                        { value: 'folder', label: t('dashboard.customize.group_folder') },
                                    ]}
                                    onChange={(group) => api.updateServers({ group })}
                                />
                            </Row>
                            <Row label={t('dashboard.customize.limit')}>
                                <Segmented
                                    label={t('dashboard.customize.limit')}
                                    value={String(config.servers.limit)}
                                    options={SERVER_LIMIT_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))}
                                    onChange={(v) => api.updateServers({ limit: Number(v) })}
                                />
                            </Row>
                            <Row
                                label={t('dashboard.customize.favorites_first')}
                                hint={t('dashboard.customize.favorites_first_hint')}
                            >
                                <Switch
                                    checked={config.servers.favoritesFirst}
                                    onCheckedChange={(favoritesFirst) => api.updateServers({ favoritesFirst })}
                                    aria-label={t('dashboard.customize.favorites_first')}
                                />
                            </Row>
                            <Row label={t('dashboard.customize.images')}>
                                <Switch
                                    checked={config.servers.images}
                                    onCheckedChange={(images) => api.updateServers({ images })}
                                    aria-label={t('dashboard.customize.images')}
                                />
                            </Row>
                            {config.servers.view !== 'list' && (
                                <Row label={t('dashboard.customize.meters')}>
                                    <div className='flex gap-1.5'>
                                        {METER_IDS.map((m) => {
                                            const on = config.servers.meters.includes(m);
                                            return (
                                                <button
                                                    key={m}
                                                    type='button'
                                                    aria-pressed={on}
                                                    onClick={() =>
                                                        api.updateServers({
                                                            meters: on
                                                                ? config.servers.meters.filter((x) => x !== m)
                                                                : METER_IDS.filter(
                                                                      (x) =>
                                                                          x === m || config.servers.meters.includes(x),
                                                                  ),
                                                        })
                                                    }
                                                    className={cn(
                                                        'rounded-md border px-2 py-0.5 text-xs font-medium transition-colors',
                                                        on
                                                            ? 'border-primary/40 bg-primary/10 text-primary'
                                                            : 'border-border text-muted-foreground hover:text-foreground',
                                                    )}
                                                >
                                                    {t(METER_LABEL_KEYS[m])}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </Row>
                            )}
                        </div>
                    </Section>
                )}

                <Section title={t('dashboard.customize.layout')}>
                    <div className='space-y-3'>
                        <Row label={t('dashboard.customize.density')}>
                            <Segmented
                                label={t('dashboard.customize.density')}
                                value={config.density}
                                options={[
                                    { value: 'comfortable', label: t('dashboard.customize.density_comfortable') },
                                    { value: 'compact', label: t('dashboard.customize.density_compact') },
                                ]}
                                onChange={(density) => api.update({ density })}
                            />
                        </Row>
                        <Row
                            label={t('dashboard.customize.side_first')}
                            hint={t('dashboard.customize.side_first_hint')}
                        >
                            <Switch
                                checked={config.sideFirst}
                                onCheckedChange={(sideFirst) => api.update({ sideFirst })}
                                aria-label={t('dashboard.customize.side_first')}
                            />
                        </Row>
                    </div>
                </Section>

                <div className='border-border/60 flex items-center justify-between gap-3 border-t pt-5'>
                    <button
                        type='button'
                        onClick={api.reset}
                        className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm'
                    >
                        <RotateCcw className='h-4 w-4' aria-hidden />
                        {t('dashboard.layout.reset')}
                    </button>
                    <button
                        type='button'
                        onClick={() => onOpenChange(false)}
                        className='bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium'
                    >
                        {t('dashboard.customize.done')}
                    </button>
                </div>
                <p className='text-muted-foreground text-xs'>{t('dashboard.customize.synced_hint')}</p>
            </div>
        </Sheet>
    );
}
