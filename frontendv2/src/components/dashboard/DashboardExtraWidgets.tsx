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

import { Suspense, lazy, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
    Clock3,
    ExternalLink,
    Flame,
    History,
    Link2,
    NotebookPen,
    Pencil,
    Plus,
    Star,
    Trash2,
    Users,
} from 'lucide-react';

import { useTranslation } from '@/contexts/TranslationContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatRelativeTime } from '@/lib/dateUtils';
import { getStatusDotColor } from '@/lib/server-utils';
import { cn } from '@/lib/utils';
import { ChunkErrorBoundary } from '@/components/common/ChunkErrorBoundary';
import { DashboardPanel } from '@/components/dashboard/DashboardOverview';
import { Quiet, WidgetSkeleton, type DashboardOverviewServerItem } from '@/components/dashboard/DashboardWidgets';
import { formatClock, formatLongDate, useNow } from '@/components/dashboard/DashboardHero';
import { NOTES_MAX_LENGTH, QUICK_LINKS_MAX, isSafeLinkUrl, type DashboardQuickLink } from '@/hooks/useDashboardConfig';

const ReactMarkdown = lazy(() => import('react-markdown'));

function SmallButton({
    onClick,
    children,
    label,
    tone = 'default',
    type = 'button',
}: {
    onClick?: () => void;
    children: ReactNode;
    label?: string;
    tone?: 'default' | 'primary' | 'danger';
    type?: 'button' | 'submit';
}) {
    return (
        <button
            type={type}
            onClick={onClick}
            aria-label={label}
            title={label}
            className={cn(
                'inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                tone === 'primary'
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : tone === 'danger'
                      ? 'text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
        >
            {children}
        </button>
    );
}

/** A compact list of servers (pinned or recently opened) with status and an optional note on the right. */
export interface CompactServerItem {
    uuidShort: string;
    name: string;
    status: string;
    note?: string;
}

function CompactServerList({ items }: { items: CompactServerItem[] }) {
    const { t } = useTranslation();
    return (
        <ul className='-mx-2 space-y-0.5'>
            {items.map((item) => (
                <li key={item.uuidShort}>
                    <Link
                        href={`/server/${item.uuidShort}`}
                        className='hover:bg-muted/50 flex min-w-0 items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm'
                    >
                        <span
                            className={cn('h-2 w-2 shrink-0 rounded-full', getStatusDotColor(item.status))}
                            title={t(`servers.status.${item.status}`)}
                            aria-hidden
                        />
                        <span className='min-w-0 flex-1 truncate font-medium'>{item.name}</span>
                        <span className='text-muted-foreground shrink-0 text-xs'>
                            {item.note ?? t(`servers.status.${item.status}`)}
                        </span>
                    </Link>
                </li>
            ))}
        </ul>
    );
}

export function PinnedServersWidget({ items }: { items: CompactServerItem[] }) {
    const { t } = useTranslation();
    return (
        <DashboardPanel title={t('dashboard.widgets.names.pinned')} icon={Star} count={items.length || undefined}>
            {items.length === 0 ? (
                <Quiet>{t('dashboard.widgets.pinned.empty')}</Quiet>
            ) : (
                <CompactServerList items={items} />
            )}
        </DashboardPanel>
    );
}

export function RecentServersWidget({ items }: { items: (CompactServerItem & { viewedAt?: string })[] }) {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    return (
        <DashboardPanel title={t('dashboard.widgets.names.recent')} icon={History}>
            {items.length === 0 ? (
                <Quiet>{t('dashboard.widgets.recent.empty')}</Quiet>
            ) : (
                <CompactServerList
                    items={items.map((item) => ({
                        ...item,
                        note: item.viewedAt ? formatRelativeTime(item.viewedAt, dateOpts) : undefined,
                    }))}
                />
            )}
        </DashboardPanel>
    );
}

function Markdown({ text }: { text: string }) {
    const plain = <p className='whitespace-pre-line'>{text}</p>;
    return (
        <ChunkErrorBoundary fallback={() => plain}>
            <Suspense fallback={plain}>
                <ReactMarkdown
                    components={{
                        a: ({ href, children }) =>
                            href && isSafeLinkUrl(href) ? (
                                <a href={href} target='_blank' rel='noopener noreferrer'>
                                    {children}
                                </a>
                            ) : (
                                <span>{children}</span>
                            ),
                        img: () => null,
                    }}
                >
                    {text}
                </ReactMarkdown>
            </Suspense>
        </ChunkErrorBoundary>
    );
}

/** Private Markdown note, saved with the dashboard settings (and so synced to the account). */
export function NotesWidget({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const { t } = useTranslation();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(value);

    const start = () => {
        setDraft(value);
        setEditing(true);
    };
    const save = () => {
        onChange(draft.slice(0, NOTES_MAX_LENGTH));
        setEditing(false);
    };

    return (
        <section className='fp-surface min-w-0 overflow-hidden rounded-xl border'>
            <header className='flex items-center justify-between gap-3 px-4 pt-3.5 pb-2.5'>
                <div className='flex min-w-0 items-center gap-2'>
                    <NotebookPen className='text-muted-foreground h-4 w-4 shrink-0' aria-hidden />
                    <h2 className='truncate text-sm font-semibold'>{t('dashboard.widgets.names.notes')}</h2>
                </div>
                {!editing && (
                    <SmallButton onClick={start} label={t('dashboard.widgets.notes.edit')}>
                        <Pencil className='h-3.5 w-3.5' aria-hidden />
                    </SmallButton>
                )}
            </header>
            <div className='px-4 pb-4'>
                {editing ? (
                    <div className='space-y-2'>
                        <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value.slice(0, NOTES_MAX_LENGTH))}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save();
                                if (e.key === 'Escape') setEditing(false);
                            }}
                            rows={6}
                            autoFocus
                            aria-label={t('dashboard.widgets.names.notes')}
                            placeholder={t('dashboard.widgets.notes.placeholder')}
                            className='border-border bg-background/60 focus:border-primary/60 focus:ring-primary/20 w-full resize-y rounded-lg border px-3 py-2 font-mono text-sm outline-none focus:ring-2'
                        />
                        <div className='flex items-center justify-between gap-2'>
                            <span className='text-muted-foreground text-[11px] tabular-nums'>
                                {t('dashboard.widgets.notes.counter', {
                                    used: String(draft.length),
                                    max: String(NOTES_MAX_LENGTH),
                                })}
                            </span>
                            <div className='flex gap-1'>
                                <SmallButton onClick={() => setEditing(false)}>{t('common.cancel')}</SmallButton>
                                <SmallButton onClick={save} tone='primary'>
                                    {t('common.save')}
                                </SmallButton>
                            </div>
                        </div>
                    </div>
                ) : value.trim() === '' ? (
                    <button
                        type='button'
                        onClick={start}
                        className='border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground w-full rounded-lg border border-dashed px-3 py-4 text-left text-sm transition-colors'
                    >
                        {t('dashboard.widgets.notes.empty')}
                    </button>
                ) : (
                    <div className='prose prose-sm dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 max-w-none text-sm wrap-break-word'>
                        <Markdown text={value} />
                    </div>
                )}
            </div>
        </section>
    );
}

/** The user's own links: external sites open in a new tab, panel paths in place. */
export function QuickLinksWidget({
    links,
    onChange,
}: {
    links: DashboardQuickLink[];
    onChange: (links: DashboardQuickLink[]) => void;
}) {
    const { t } = useTranslation();
    const [editing, setEditing] = useState(false);
    const [label, setLabel] = useState('');
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);

    const add = () => {
        const cleanUrl = url.trim();
        const cleanLabel = label.trim() || cleanUrl;
        if (!isSafeLinkUrl(cleanUrl)) {
            setError(t('dashboard.widgets.quick_links.invalid_url'));
            return;
        }
        onChange([...links, { id: `l${Date.now().toString(36)}`, label: cleanLabel.slice(0, 60), url: cleanUrl }]);
        setLabel('');
        setUrl('');
        setError(null);
    };

    return (
        <section className='fp-surface min-w-0 overflow-hidden rounded-xl border'>
            <header className='flex items-center justify-between gap-3 px-4 pt-3.5 pb-2.5'>
                <div className='flex min-w-0 items-center gap-2'>
                    <Link2 className='text-muted-foreground h-4 w-4 shrink-0' aria-hidden />
                    <h2 className='truncate text-sm font-semibold'>{t('dashboard.widgets.names.quick_links')}</h2>
                </div>
                <SmallButton
                    onClick={() => setEditing((v) => !v)}
                    label={editing ? t('common.done') : t('dashboard.widgets.quick_links.edit')}
                    tone={editing ? 'primary' : 'default'}
                >
                    {editing ? t('common.done') : <Pencil className='h-3.5 w-3.5' aria-hidden />}
                </SmallButton>
            </header>
            <div className='space-y-3 px-4 pb-4'>
                {links.length === 0 && !editing && (
                    <button
                        type='button'
                        onClick={() => setEditing(true)}
                        className='border-border/70 text-muted-foreground hover:border-primary/40 hover:text-foreground w-full rounded-lg border border-dashed px-3 py-4 text-left text-sm transition-colors'
                    >
                        {t('dashboard.widgets.quick_links.empty')}
                    </button>
                )}
                {links.length > 0 && (
                    <ul className='flex flex-wrap gap-2'>
                        {links.map((link) => {
                            const external = !link.url.startsWith('/');
                            return (
                                <li key={link.id} className='flex items-center'>
                                    {editing ? (
                                        <span className='border-border bg-muted/40 inline-flex max-w-full items-center gap-1 rounded-lg border py-1 pr-1 pl-2.5 text-sm'>
                                            <span className='truncate'>{link.label}</span>
                                            <SmallButton
                                                tone='danger'
                                                label={t('dashboard.widgets.quick_links.remove', { label: link.label })}
                                                onClick={() => onChange(links.filter((l) => l.id !== link.id))}
                                            >
                                                <Trash2 className='h-3.5 w-3.5' aria-hidden />
                                            </SmallButton>
                                        </span>
                                    ) : (
                                        <a
                                            href={link.url}
                                            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                            className='border-border bg-background/40 hover:border-primary/40 hover:text-primary inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition-colors'
                                            title={link.url}
                                        >
                                            <span className='truncate'>{link.label}</span>
                                            {external && (
                                                <ExternalLink className='h-3 w-3 shrink-0 opacity-60' aria-hidden />
                                            )}
                                        </a>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
                {editing && links.length < QUICK_LINKS_MAX && (
                    <form
                        className='space-y-2'
                        onSubmit={(e) => {
                            e.preventDefault();
                            add();
                        }}
                    >
                        <div className='grid gap-2 sm:grid-cols-2'>
                            <input
                                value={label}
                                onChange={(e) => setLabel(e.target.value)}
                                maxLength={60}
                                placeholder={t('dashboard.widgets.quick_links.label_placeholder')}
                                aria-label={t('dashboard.widgets.quick_links.label')}
                                className='border-border bg-background/60 focus:border-primary/60 h-9 rounded-lg border px-3 text-sm outline-none'
                            />
                            <input
                                value={url}
                                onChange={(e) => {
                                    setUrl(e.target.value);
                                    setError(null);
                                }}
                                maxLength={500}
                                placeholder={t('dashboard.widgets.quick_links.url_placeholder')}
                                aria-label={t('dashboard.widgets.quick_links.url')}
                                className='border-border bg-background/60 focus:border-primary/60 h-9 rounded-lg border px-3 text-sm outline-none'
                            />
                        </div>
                        <div className='flex items-center justify-between gap-2'>
                            <span className='text-xs text-rose-500' role={error ? 'alert' : undefined}>
                                {error}
                            </span>
                            <SmallButton type='submit' tone='primary'>
                                <Plus className='h-3.5 w-3.5' aria-hidden />
                                {t('dashboard.widgets.quick_links.add')}
                            </SmallButton>
                        </div>
                    </form>
                )}
            </div>
        </section>
    );
}

export function ClockWidget() {
    const { t } = useTranslation();
    const { timeZone, locale } = useDateFormatOptions();
    const now = useNow(1000);
    return (
        <DashboardPanel title={t('dashboard.widgets.names.clock')} icon={Clock3}>
            <p className='text-3xl font-semibold tracking-tight tabular-nums'>
                {now ? formatClock(now, locale, timeZone, true) : '\u00a0'}
            </p>
            <p className='text-muted-foreground mt-1 text-sm'>
                {now ? formatLongDate(now, locale, timeZone) : '\u00a0'}
            </p>
            <p className='text-muted-foreground mt-3 text-xs'>
                {t('dashboard.widgets.clock.zone', { zone: timeZone })}
                {timeZone !== 'UTC' && now && (
                    <>
                        {' · '}
                        {t('dashboard.widgets.clock.utc', { time: formatClock(now, locale, 'UTC') })}
                    </>
                )}
            </p>
        </DashboardPanel>
    );
}

export function PlayersWidget({ items, loading }: { items: DashboardOverviewServerItem[]; loading: boolean }) {
    const { t } = useTranslation();
    if (loading && items.length === 0) return <WidgetSkeleton rows={2} />;
    const reporting = items.filter((s) => s.players);
    const total = reporting.reduce((sum, s) => sum + (s.players?.count ?? 0), 0);
    const ranked = [...reporting].sort((a, b) => (b.players?.count ?? 0) - (a.players?.count ?? 0));
    return (
        <DashboardPanel title={t('dashboard.widgets.names.players')} icon={Users}>
            <p className='text-sm'>
                <span className='text-2xl font-semibold tabular-nums'>{total}</span>
                <span className='text-muted-foreground'> {t('dashboard.widgets.players.online')}</span>
            </p>
            {reporting.length === 0 ? (
                <Quiet>{t('dashboard.widgets.players.none')}</Quiet>
            ) : (
                <ul className='mt-2 space-y-1.5'>
                    {ranked.slice(0, 6).map((s) => (
                        <li key={s.uuidShort}>
                            <Link
                                href={`/server/${s.uuidShort}`}
                                className='hover:bg-muted/50 -mx-2 flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-sm'
                            >
                                <span className='min-w-0 flex-1 truncate'>{s.name}</span>
                                <span className='text-muted-foreground shrink-0 text-xs tabular-nums'>
                                    {s.players?.max
                                        ? t('dashboard.widgets.players.of_max', {
                                              count: String(s.players.count),
                                              max: String(s.players.max),
                                          })
                                        : String(s.players?.count ?? 0)}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </DashboardPanel>
    );
}

export type HeatmapMetric = 'cpu' | 'ram' | 'disk';

export interface HeatmapCell {
    uuidShort: string;
    name: string;
    status: string;
    cpu: number | null;
    ram: number | null;
    disk: number | null;
}

const METRIC_LABEL_KEYS: Record<HeatmapMetric, string> = {
    cpu: 'dashboard.home.meters.cpu',
    ram: 'dashboard.home.meters.ram',
    disk: 'dashboard.home.meters.disk',
};

function heatTone(percent: number | null): string {
    if (percent === null) return 'bg-muted/50 text-muted-foreground';
    if (percent >= 90) return 'bg-rose-500/80 text-white';
    if (percent >= 70) return 'bg-amber-500/80 text-black';
    if (percent >= 40) return 'bg-emerald-500/70 text-black';
    if (percent >= 10) return 'bg-emerald-500/35 text-foreground';
    return 'bg-emerald-500/15 text-foreground';
}

/** Every server as a tile, coloured by how much of its limit it uses right now. */
export function HeatmapWidget({ cells, loading }: { cells: HeatmapCell[]; loading: boolean }) {
    const { t } = useTranslation();
    const [metric, setMetric] = useState<HeatmapMetric>('cpu');
    if (loading && cells.length === 0) return <WidgetSkeleton rows={2} />;
    return (
        <section className='fp-surface min-w-0 overflow-hidden rounded-xl border'>
            <header className='flex flex-wrap items-center justify-between gap-2 px-4 pt-3.5 pb-2.5'>
                <div className='flex min-w-0 items-center gap-2'>
                    <Flame className='text-muted-foreground h-4 w-4 shrink-0' aria-hidden />
                    <h2 className='truncate text-sm font-semibold'>{t('dashboard.widgets.names.heatmap')}</h2>
                </div>
                <div
                    role='radiogroup'
                    aria-label={t('dashboard.widgets.heatmap.metric')}
                    className='bg-muted/50 inline-flex rounded-lg p-0.5'
                >
                    {(['cpu', 'ram', 'disk'] as const).map((m) => (
                        <button
                            key={m}
                            type='button'
                            role='radio'
                            aria-checked={metric === m}
                            onClick={() => setMetric(m)}
                            className={cn(
                                'rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors',
                                metric === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                            )}
                        >
                            {t(METRIC_LABEL_KEYS[m])}
                        </button>
                    ))}
                </div>
            </header>
            <div className='px-4 pb-4'>
                {cells.length === 0 ? (
                    <Quiet>{t('dashboard.widgets.heatmap.empty')}</Quiet>
                ) : (
                    <>
                        <ul className='grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1.5'>
                            {cells.map((cell) => {
                                const value = cell[metric];
                                const label =
                                    value === null
                                        ? t('dashboard.widgets.heatmap.no_data')
                                        : t('dashboard.widgets.heatmap.percent', { value: String(Math.round(value)) });
                                return (
                                    <li key={cell.uuidShort}>
                                        <Link
                                            href={`/server/${cell.uuidShort}`}
                                            title={`${cell.name}: ${label}`}
                                            className={cn(
                                                'flex aspect-square min-w-0 flex-col justify-between rounded-lg p-1.5 text-[10px] leading-tight transition-transform hover:scale-[1.04]',
                                                heatTone(value),
                                            )}
                                        >
                                            <span className='line-clamp-2 font-medium wrap-break-word'>
                                                {cell.name}
                                            </span>
                                            <span className='text-xs font-semibold tabular-nums'>
                                                {value === null
                                                    ? t('dashboard.widgets.heatmap.dash')
                                                    : t('dashboard.widgets.heatmap.percent', {
                                                          value: String(Math.round(value)),
                                                      })}
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                        <p className='text-muted-foreground mt-3 flex items-center gap-2 text-[11px]'>
                            <span>{t('dashboard.widgets.heatmap.legend_low')}</span>
                            <span className='flex gap-0.5' aria-hidden>
                                {[5, 20, 50, 80, 95].map((p) => (
                                    <span key={p} className={cn('h-2.5 w-5 rounded-sm', heatTone(p))} />
                                ))}
                            </span>
                            <span>{t('dashboard.widgets.heatmap.legend_high')}</span>
                        </p>
                    </>
                )}
            </div>
        </section>
    );
}
