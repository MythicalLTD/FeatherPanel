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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios, { isAxiosError } from 'axios';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import dynamic from 'next/dynamic';
import {
    Activity,
    Ban,
    Bot,
    ChevronDown,
    Gauge,
    Code2,
    Cpu,
    FileImage,
    Globe2,
    KeyRound,
    LayoutTemplate,
    ScrollText,
    ShieldHalf,
    Eye,
    ListChecks,
    Loader2,
    RefreshCw,
    SlidersHorizontal,
    ShieldAlert,
    ShieldCheck,
    ShieldOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import {
    AllowDenyView,
    AntiBotView,
    ModeView,
    RateLimitView,
    makeId,
    normalizeSettings,
    type WafCategory,
    type SettingsPatch,
    type WafSettings,
} from '@/components/webspace/WafSettingsViews';
import {
    BlockPageView,
    CustomRulesView,
    EngineView,
    ExceptionsView,
    GeoView,
    HeadersView,
    HotlinkView,
    HttpView,
    LoginView,
    type WafErrorPage,
} from '@/components/webspace/WafAdvancedViews';

const WafGlobe = dynamic(() => import('@/components/webspace/WafGlobe').then((m) => m.WafGlobe), {
    ssr: false,
    loading: () => (
        <div className='flex h-[340px] items-center justify-center'>
            <Loader2 className='text-primary h-6 w-6 animate-spin opacity-60' />
        </div>
    ),
});

const REGION_NAMES =
    typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;

/** The node reports countries as ISO codes; show their names. */
function countryLabel(code: string): string {
    if (!/^[A-Z]{2}$/.test(code)) return code;
    try {
        return REGION_NAMES?.of(code) ?? code;
    } catch {
        return code;
    }
}

export type WafMode = 'off' | 'detect' | 'block';
type Range = '24h' | '7d' | '30d';
type Tab =
    | 'traffic'
    | 'attacks'
    | 'allowdeny'
    | 'geo'
    | 'exceptions'
    | 'engine'
    | 'custom'
    | 'ratelimit'
    | 'login'
    | 'antibot'
    | 'http'
    | 'headers'
    | 'hotlink'
    | 'blockpage'
    | 'settings';

interface NamedCount {
    name: string;
    count: number;
}

interface Overview {
    mode: WafMode;
    engine_available: boolean;
    /** The panel could not get numbers from the node (offline, outdated or erroring). */
    daemon_unreachable?: boolean;
    /** Seconds covered by one point of `series` (used for requests per second). */
    bucket_seconds: number;
    totals: {
        requests: number;
        blocked: number;
        detected: number;
        unique_ips: number;
        blocked_ips: number;
        status_4xx: number;
        status_5xx: number;
    };
    series: { ts: string; requests: number; blocked: number }[];
    status_codes: { code: string; count: number }[];
    top_ips: { ip: string; count: number }[];
    top_categories: { category: string; count: number }[];
    top_paths: { path: string; count: number }[];
    top_hosts?: NamedCount[];
    referrers?: NamedCount[];
    browsers?: NamedCount[];
    systems?: NamedCount[];
    /** Only present when the node has a GeoIP database. */
    countries?: NamedCount[];
}

interface WafEvent {
    id: string;
    time: string;
    ip: string;
    method: string;
    host: string;
    path: string;
    rule_id: string;
    rule_msg: string;
    category: string;
    action: 'blocked' | 'detected';
}

const RANGES: Range[] = ['24h', '7d', '30d'];
const REFRESH_MS = 15000;

function emptyOverview(mode: WafMode): Overview {
    return {
        mode,
        engine_available: false,
        daemon_unreachable: true,
        bucket_seconds: 3600,
        totals: { requests: 0, blocked: 0, detected: 0, unique_ips: 0, blocked_ips: 0, status_4xx: 0, status_5xx: 0 },
        series: [],
        status_codes: [],
        top_ips: [],
        top_categories: [],
        top_paths: [],
    };
}
const TEAL = 'hsl(var(--primary))';
const RED = '#f87171';
const BLUE = '#60a5fa';
const YELLOW = '#fbbf24';
const PALETTE = ['hsl(var(--primary))', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa', '#94a3b8'];

function formatNumber(n: number): string {
    return new Intl.NumberFormat().format(n);
}

function compact(n: number): string {
    return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

function ratio(part: number, total: number): number {
    return total > 0 ? (part / total) * 100 : 0;
}

function fmtPercent(v: number): string {
    return v > 0 && v < 0.01 ? '<0.01%' : `${v.toFixed(2)}%`;
}

function formatTick(ts: string, range: Range): string {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return range === '24h'
        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    borderColor: 'hsl(var(--border))',
    borderRadius: '0.5rem',
    fontSize: 12,
};

const CATEGORY_IDS: WafCategory[] = ['sqli', 'xss', 'rce', 'lfi', 'php', 'protocol', 'scanner', 'leakage'];

function pick(from: WafSettings, patch: SettingsPatch): SettingsPatch {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(patch)) out[key] = (from as unknown as Record<string, unknown>)[key];
    return out as SettingsPatch;
}

const WAF_CSS = `
@keyframes wafRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.waf-view>*,.waf-rise{animation:wafRise .55s cubic-bezier(.2,.7,.2,1) both}
.waf-view>*:nth-child(2){animation-delay:.07s}.waf-view>*:nth-child(3){animation-delay:.14s}
.waf-view>*:nth-child(4){animation-delay:.21s}.waf-view>*:nth-child(5){animation-delay:.28s}
.waf-view>*:nth-child(6){animation-delay:.35s}.waf-view>*:nth-child(7){animation-delay:.42s}
@keyframes wafGlow{0%,100%{box-shadow:0 0 0 0 hsl(var(--primary) / 0)}50%{box-shadow:0 0 22px -6px hsl(var(--primary) / .55)}}
.waf-glow{animation:wafGlow 3.2s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.waf-view>*,.waf-rise,.waf-glow{animation:none}}
`;

function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
    const [shown, setShown] = useState(0);
    const from = useRef(0);
    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setShown(value);
            return;
        }
        const start = from.current;
        const t0 = performance.now();
        let raf = 0;
        const tick = (now: number) => {
            const k = Math.min(1, (now - t0) / 900);
            const eased = 1 - Math.pow(1 - k, 3);
            setShown(start + (value - start) * eased);
            if (k < 1) raf = requestAnimationFrame(tick);
            else from.current = value;
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [value]);
    return <>{format(shown)}</>;
}

function Panel({
    title,
    right,
    children,
    className,
}: {
    title?: string;
    right?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn(
                'waf-rise border-border/50 bg-card/50 hover:border-primary/30 rounded-xl border p-5 backdrop-blur-xl transition duration-300',
                className,
            )}
        >
            {title ? (
                <header className='mb-4 flex items-center justify-between gap-2'>
                    <h3 className='text-sm font-medium'>{title}</h3>
                    {right}
                </header>
            ) : null}
            {children}
        </section>
    );
}

function Stat({
    label,
    value,
    tone,
    format,
}: {
    label: string;
    value: number;
    tone?: 'danger' | 'warn';
    format: (n: number) => string;
}) {
    return (
        <div className='border-border/40 min-w-0 border-r px-5 py-4 last:border-r-0'>
            <p className='text-muted-foreground flex items-center gap-1.5 text-xs'>
                <span
                    className={cn(
                        'inline-block h-1.5 w-1.5 rounded-full',
                        tone === 'danger' ? 'bg-red-400' : tone === 'warn' ? 'bg-amber-400' : 'bg-primary',
                    )}
                />
                {label}
            </p>
            <p
                className={cn(
                    'mt-1 truncate text-2xl font-semibold tracking-tight',
                    tone === 'danger' && 'text-red-400',
                    tone === 'warn' && 'text-amber-400',
                )}
            >
                <CountUp value={value} format={format} />
            </p>
        </div>
    );
}

function StatRow({ children }: { children: React.ReactNode }) {
    return (
        <div className='waf-rise border-border/50 bg-card/50 grid grid-cols-2 overflow-hidden rounded-xl border backdrop-blur-xl sm:grid-cols-4'>
            {children}
        </div>
    );
}

function GrowBar({ pct, color }: { pct: number; color: string }) {
    const [on, setOn] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() => setOn(true));
        return () => cancelAnimationFrame(id);
    }, []);
    return (
        <div
            className='h-full rounded-full transition-[width] duration-1000 ease-out'
            style={{ width: on ? `${pct}%` : '0%', backgroundColor: color }}
        />
    );
}

function BarList({
    rows,
    color,
    empty,
    mono,
    action,
}: {
    rows: NamedCount[];
    color: string;
    empty: string;
    mono?: boolean;
    action?: (name: string) => React.ReactNode;
}) {
    const max = rows.reduce((m, r) => Math.max(m, r.count), 0);
    if (rows.length === 0) return <p className='text-muted-foreground text-sm'>{empty}</p>;
    return (
        <ul className='space-y-3'>
            {rows.map((r) => (
                <li key={r.name} className='text-xs'>
                    <div className='flex items-center justify-between gap-3'>
                        <span className={cn('truncate', mono && 'font-mono')} title={r.name}>
                            {r.name || '-'}
                        </span>
                        <span className='flex shrink-0 items-center gap-2 font-semibold tabular-nums'>
                            {formatNumber(r.count)}
                            {action ? action(r.name) : null}
                        </span>
                    </div>
                    <div className='bg-secondary/60 mt-1.5 h-1.5 overflow-hidden rounded-full'>
                        <GrowBar pct={max > 0 ? Math.max(3, (r.count / max) * 100) : 0} color={color} />
                    </div>
                </li>
            ))}
        </ul>
    );
}

function Donut({ rows, empty }: { rows: NamedCount[]; empty: string }) {
    const total = rows.reduce((s, r) => s + r.count, 0);
    if (rows.length === 0 || total === 0) return <p className='text-muted-foreground text-sm'>{empty}</p>;
    return (
        <div className='flex items-center gap-5'>
            <div className='h-32 w-32 shrink-0'>
                <ResponsiveContainer width='100%' height='100%'>
                    <PieChart>
                        <Pie data={rows} dataKey='count' nameKey='name' innerRadius={38} outerRadius={60} stroke='none'>
                            {rows.map((r, i) => (
                                <Cell key={r.name} fill={PALETTE[i % PALETTE.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <ul className='min-w-0 flex-1 space-y-1.5 text-xs'>
                {rows.map((r, i) => (
                    <li key={r.name} className='flex items-center justify-between gap-2'>
                        <span className='flex min-w-0 items-center gap-2'>
                            <span
                                className='h-2 w-2 shrink-0 rounded-full'
                                style={{ backgroundColor: PALETTE[i % PALETTE.length] }}
                            />
                            <span className='truncate'>{r.name || '-'}</span>
                        </span>
                        <span className='shrink-0 font-semibold tabular-nums'>{formatNumber(r.count)}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function LineCard({
    title,
    max,
    data,
    dataKey,
    color,
    gradientId,
}: {
    title: string;
    max: string;
    data: { label: string; requests: number; blocked: number; qps: number }[];
    dataKey: 'requests' | 'blocked';
    color: string;
    gradientId: string;
}) {
    return (
        <Panel
            title={title}
            right={
                <span className='text-muted-foreground text-xs'>
                    Max <strong className='text-foreground'>{max}</strong>
                </span>
            }
        >
            <div className='h-44'>
                <ResponsiveContainer width='100%' height='100%'>
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id={gradientId} x1='0' y1='0' x2='0' y2='1'>
                                <stop offset='5%' stopColor={color} stopOpacity={0.45} />
                                <stop offset='95%' stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray='3 3' stroke='#ffffff10' vertical={false} />
                        <XAxis dataKey='label' tick={{ fontSize: 10 }} stroke='#71717a' minTickGap={28} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke='#71717a' width={34} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Area
                            type='monotone'
                            dataKey={dataKey}
                            stroke={color}
                            strokeWidth={2}
                            fill={`url(#${gradientId})`}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </Panel>
    );
}

export function WebSpaceWafDashboard({
    uuidShort,
    onDenyIp,
}: {
    uuidShort: string;
    /** Adds an IP to the existing deny list (handled by the parent page). */
    onDenyIp?: (ip: string) => Promise<void>;
}) {
    const { t } = useTranslation();
    const [tab, setTab] = useState<Tab>('traffic');
    const [range, setRange] = useState<Range>('24h');
    const [overviewData, setOverview] = useState<Overview | null>(null);
    const [events, setEvents] = useState<WafEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingMode, setSavingMode] = useState(false);
    const [settings, setSettings] = useState<WafSettings | null>(null);
    // Without statistics (older node, 404/501) the page still works: an empty overview carries the mode from
    // the settings and flags the node as unreachable, which the page already explains in a banner.
    const overview = useMemo(
        () => overviewData ?? emptyOverview(settings?.mode ?? 'off'),
        [overviewData, settings?.mode],
    );
    const hasData = useRef(false);
    const [closed, setClosed] = useState<Set<string>>(new Set());
    const toggleGroup = (id: string) =>
        setClosed((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const base = `/api/user/webspaces/${uuidShort}/waf`;

    // Bumped when a save starts and again when it ends, so a settings GET that began before (or during)
    // a save can never replace newer data with an older snapshot.
    const settingsGeneration = useRef(0);
    const pendingSaves = useRef(0);
    // Every load takes a ticket; only the newest one may write state, so a slow older response
    // (other range, earlier poll) can never overwrite newer data.
    const loadSeq = useRef(0);

    const load = useCallback(
        async (silent = false) => {
            const ticket = ++loadSeq.current;
            if (!silent && !hasData.current) setLoading(true);
            const generation = settingsGeneration.current;
            // Statistics and settings are independent: one failing must not hide the other.
            const [stats, st] = await Promise.allSettled([
                Promise.all([
                    axios.get(`${base}/overview`, { params: { range } }),
                    axios.get(`${base}/events`, { params: { range, limit: 50 } }),
                ]),
                axios.get(`${base}/settings`),
            ]);
            if (ticket !== loadSeq.current) return;

            if (stats.status === 'fulfilled') {
                const [ov, ev] = stats.value;
                setOverview(ov.data.data as Overview);
                hasData.current = true;
                setEvents((ev.data.data?.events as WafEvent[]) ?? []);
            } else {
                const error = stats.reason;
                if (isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 501)) {
                    setOverview(null);
                    setEvents([]);
                } else if (!silent) {
                    toast.error(t('webSpaces.wafDashboard.loadFailed'));
                }
            }

            if (st.status === 'fulfilled' && generation === settingsGeneration.current && pendingSaves.current === 0) {
                setSettings(normalizeSettings(st.value.data.data as Partial<WafSettings>));
            }
            setLoading(false);
        },
        [base, range, t],
    );

    useEffect(() => {
        void load();
        const id = window.setInterval(() => void load(true), REFRESH_MS);
        return () => window.clearInterval(id);
    }, [load]);

    const setMode = async (mode: WafMode) => {
        if (overview.mode === mode) return;
        setSavingMode(true);
        try {
            await axios.patch(`${base}/mode`, { mode });
            setOverview({ ...overview, mode });
            toast.success(t('webSpaces.wafDashboard.modeSaved'));
        } catch (error) {
            toast.error(
                isAxiosError(error) && error.response?.status === 403
                    ? t('webSpaces.settings.noPermission')
                    : t('webSpaces.wafDashboard.modeFailed'),
            );
        } finally {
            setSavingMode(false);
        }
    };

    const settingsRef = useRef<WafSettings | null>(null);
    settingsRef.current = settings;

    const saveSettings = async (patch: SettingsPatch) => {
        const current = settingsRef.current;
        if (!current) return;
        const next = normalizeSettings({ ...current, ...patch });
        settingsRef.current = next;
        setSettings(next);
        pendingSaves.current += 1;
        settingsGeneration.current += 1;
        try {
            await axios.patch(`${base}/settings`, patch);
            toast.success(t('webSpaces.wafDashboard.saved'));
        } catch (error) {
            // Undo only this change, keep anything saved in the meantime.
            const reverted = normalizeSettings({ ...(settingsRef.current ?? current), ...pick(current, patch) });
            settingsRef.current = reverted;
            setSettings(reverted);
            toast.error(
                isAxiosError(error) && error.response?.status === 403
                    ? t('webSpaces.settings.noPermission')
                    : t('webSpaces.wafDashboard.saveFailed'),
            );
        } finally {
            pendingSaves.current -= 1;
            settingsGeneration.current += 1;
        }
    };

    const allowEvent = async (e: WafEvent) => {
        const current = settingsRef.current;
        if (!current) return;
        const path = e.path.split('?')[0] || '/';
        if (path === '/') {
            toast.error(t('webSpaces.wafDashboard.exceptionRoot'));
            return;
        }
        if (!window.confirm(t('webSpaces.wafDashboard.allowConfirm', { path }))) return;
        const cat = (CATEGORY_IDS as string[]).includes(e.category) ? [e.category as WafCategory] : [];
        const same = current.exceptions.find((x) => x.path === path);
        // An empty list means "every category": never narrow it to one, and never widen a scoped exception
        // because the event's category is unknown.
        let merged: WafCategory[];
        if (!same) merged = cat;
        else if (same.categories.length === 0) merged = [];
        else if (cat.length === 0) merged = same.categories;
        else merged = [...new Set([...same.categories, ...cat])];
        if (same && merged.length === same.categories.length && merged.every((c) => same.categories.includes(c))) {
            toast.info(t('webSpaces.wafDashboard.allowNoChange'));
            return;
        }
        const next = { id: same?.id ?? makeId(), path, categories: merged };
        await saveSettings({
            exceptions: same
                ? current.exceptions.map((x) => (x.id === same.id ? next : x))
                : [...current.exceptions, next],
        });
    };

    const checks: { id: string; ok: boolean; tab: Tab }[] = settings
        ? [
              { id: 'mode', ok: overview?.mode === 'block', tab: 'settings' },
              {
                  id: 'engine',
                  ok: Object.values(settings.engine.categories).filter(Boolean).length >= 6,
                  tab: 'engine',
              },
              { id: 'rate', ok: settings.rate_limit.enabled, tab: 'ratelimit' },
              { id: 'login', ok: settings.login.enabled, tab: 'login' },
              { id: 'scanner', ok: settings.anti_bot.scanner_paths, tab: 'antibot' },
              { id: 'headers', ok: settings.headers.nosniff && settings.headers.referrer, tab: 'headers' },
          ]
        : [];

    const exportEvents = () => {
        const esc = (v: string) =>
            `"${String(v)
                .replace(/"/g, '""')
                .replace(/^([=+\-@])/, "'$1")}"`;
        const rows = [['time', 'ip', 'method', 'host', 'path', 'category', 'rule', 'action'].join(',')].concat(
            events.map((e) =>
                [e.time, e.ip, e.method, e.host, e.path, e.category, e.rule_id, e.action].map(esc).join(','),
            ),
        );
        const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `waf-attacks-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const loadErrorPages = useCallback(async (): Promise<WafErrorPage[]> => {
        const res = await axios.get(`${base}/error-pages`);
        return (res.data.data?.pages ?? []) as WafErrorPage[];
    }, [base]);

    const chartData = useMemo(() => {
        const bucket = Math.max(1, overview?.bucket_seconds ?? 3600);
        return (overview?.series ?? []).map((p) => ({
            label: formatTick(p.ts, range),
            requests: p.requests,
            blocked: p.blocked,
            qps: Number((p.requests / bucket).toFixed(3)),
        }));
    }, [overview, range]);

    if (loading) {
        return (
            <div className='flex items-center justify-center py-16'>
                <Loader2 className='text-primary h-8 w-8 animate-spin opacity-50' />
            </div>
        );
    }

    if (!overviewData && !settings) {
        return (
            <Panel title={t('webSpaces.wafDashboard.title')}>
                <p className='text-muted-foreground flex items-center gap-2 text-sm'>
                    <ShieldAlert className='h-4 w-4' />
                    {t('webSpaces.wafDashboard.unavailable')}
                </p>
            </Panel>
        );
    }

    const tot = overview.totals;
    const modes: { id: WafMode; label: string; hint: string; icon: typeof ShieldOff }[] = [
        {
            id: 'off',
            label: t('webSpaces.wafDashboard.modeOff'),
            hint: t('webSpaces.wafDashboard.modeOffHint'),
            icon: ShieldOff,
        },
        {
            id: 'detect',
            label: t('webSpaces.wafDashboard.modeDetect'),
            hint: t('webSpaces.wafDashboard.modeDetectHint'),
            icon: Eye,
        },
        {
            id: 'block',
            label: t('webSpaces.wafDashboard.modeBlock'),
            hint: t('webSpaces.wafDashboard.modeBlockHint'),
            icon: ShieldCheck,
        },
    ];
    const activeHint = modes.find((m) => m.id === overview.mode)?.hint ?? '';
    const peakQps = chartData.reduce((m, p) => Math.max(m, p.qps), 0);
    const peakReq = chartData.reduce((m, p) => Math.max(m, p.requests), 0);
    const peakBlk = chartData.reduce((m, p) => Math.max(m, p.blocked), 0);

    const statusRows: NamedCount[] = overview.status_codes.map((s) => ({ name: s.code, count: s.count }));

    const denyAction = onDenyIp
        ? (ip: string) => (
              <button
                  type='button'
                  title={t('webSpaces.wafDashboard.denyIp')}
                  className='text-muted-foreground hover:text-red-400'
                  onClick={() => void onDenyIp(ip)}
              >
                  <Ban className='h-3.5 w-3.5' />
              </button>
          )
        : undefined;

    const menu: {
        id: string;
        label: string;
        children: { id: Tab; label: string; hint: string; icon: typeof Activity }[];
    }[] = [
        {
            id: 'stats',
            label: t('webSpaces.wafDashboard.menuStats'),
            children: [
                {
                    id: 'traffic',
                    label: t('webSpaces.wafDashboard.tabTraffic'),
                    hint: t('webSpaces.wafDashboard.hintTraffic'),
                    icon: Activity,
                },
                {
                    id: 'attacks',
                    label: t('webSpaces.wafDashboard.tabAttacks'),
                    hint: t('webSpaces.wafDashboard.hintAttacks'),
                    icon: ShieldAlert,
                },
            ],
        },
        {
            id: 'access',
            label: t('webSpaces.wafDashboard.menuAccess'),
            children: [
                {
                    id: 'allowdeny',
                    label: t('webSpaces.wafDashboard.menuAllowDeny'),
                    hint: t('webSpaces.wafDashboard.hintAllowDeny'),
                    icon: ListChecks,
                },
                {
                    id: 'geo',
                    label: t('webSpaces.wafDashboard.menuGeo'),
                    hint: t('webSpaces.wafDashboard.hintGeo'),
                    icon: Globe2,
                },
            ],
        },
        {
            id: 'engine',
            label: t('webSpaces.wafDashboard.menuEngine'),
            children: [
                {
                    id: 'engine',
                    label: t('webSpaces.wafDashboard.menuEngineLevel'),
                    hint: t('webSpaces.wafDashboard.hintEngineLevel'),
                    icon: Cpu,
                },
                {
                    id: 'custom',
                    label: t('webSpaces.wafDashboard.menuCustom'),
                    hint: t('webSpaces.wafDashboard.hintCustom'),
                    icon: Code2,
                },
                {
                    id: 'exceptions',
                    label: t('webSpaces.wafDashboard.menuExceptions'),
                    hint: t('webSpaces.wafDashboard.hintExceptions'),
                    icon: ShieldOff,
                },
            ],
        },
        {
            id: 'protect',
            label: t('webSpaces.wafDashboard.menuProtection'),
            children: [
                {
                    id: 'ratelimit',
                    label: t('webSpaces.wafDashboard.menuRateLimit'),
                    hint: t('webSpaces.wafDashboard.hintRateLimit'),
                    icon: Gauge,
                },
                {
                    id: 'login',
                    label: t('webSpaces.wafDashboard.menuLogin'),
                    hint: t('webSpaces.wafDashboard.hintLogin'),
                    icon: KeyRound,
                },
                {
                    id: 'antibot',
                    label: t('webSpaces.wafDashboard.menuAntiBot'),
                    hint: t('webSpaces.wafDashboard.hintAntiBot'),
                    icon: Bot,
                },
            ],
        },
        {
            id: 'http',
            label: t('webSpaces.wafDashboard.menuHttp'),
            children: [
                {
                    id: 'http',
                    label: t('webSpaces.wafDashboard.menuHttpRules'),
                    hint: t('webSpaces.wafDashboard.hintHttpRules'),
                    icon: ScrollText,
                },
                {
                    id: 'headers',
                    label: t('webSpaces.wafDashboard.menuHeaders'),
                    hint: t('webSpaces.wafDashboard.hintHeaders'),
                    icon: ShieldHalf,
                },
                {
                    id: 'hotlink',
                    label: t('webSpaces.wafDashboard.menuHotlink'),
                    hint: t('webSpaces.wafDashboard.hintHotlink'),
                    icon: FileImage,
                },
            ],
        },
        {
            id: 'conf',
            label: t('webSpaces.wafDashboard.menuSettings'),
            children: [
                {
                    id: 'blockpage',
                    label: t('webSpaces.wafDashboard.menuBlockPage'),
                    hint: t('webSpaces.wafDashboard.hintBlockPage'),
                    icon: LayoutTemplate,
                },
                {
                    id: 'settings',
                    label: t('webSpaces.wafDashboard.menuMode'),
                    hint: t('webSpaces.wafDashboard.hintMode'),
                    icon: SlidersHorizontal,
                },
            ],
        },
    ];
    const activeItem = menu.flatMap((g) => g.children).find((c) => c.id === tab);
    const needsSettings = tab !== 'traffic' && tab !== 'attacks';

    return (
        <div className='space-y-4'>
            <style>{WAF_CSS}</style>

            {overview.daemon_unreachable ? (
                <p className='rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300'>
                    {t('webSpaces.wafDashboard.nodeUnreachable')}
                </p>
            ) : !overview.engine_available ? (
                <p className='rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300'>
                    {t('webSpaces.wafDashboard.engineMissing')}
                </p>
            ) : null}

            <div className='flex flex-col gap-4 lg:flex-row lg:items-start'>
                <aside className='waf-rise border-border/40 bg-card/40 rounded-2xl border p-2 backdrop-blur-xl lg:sticky lg:top-4 lg:w-60 lg:shrink-0'>
                    <nav className='custom-scrollbar flex gap-1 overflow-x-auto lg:block lg:space-y-4 lg:overflow-visible lg:py-1'>
                        {menu.map((g) => {
                            const isOpen = !closed.has(g.id);
                            return (
                                <div key={g.id} className='flex shrink-0 gap-1 lg:block'>
                                    <button
                                        type='button'
                                        onClick={() => toggleGroup(g.id)}
                                        className='text-muted-foreground hover:text-foreground mb-1 hidden w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs font-semibold tracking-wider uppercase transition-colors lg:flex'
                                    >
                                        {g.label}
                                        <ChevronDown
                                            className={cn(
                                                'h-4 w-4 transition-transform duration-200',
                                                !isOpen && '-rotate-90',
                                            )}
                                        />
                                    </button>
                                    <div
                                        className={cn(
                                            'flex gap-1 lg:block lg:space-y-0.5 lg:overflow-hidden lg:transition-all lg:duration-200',
                                            isOpen ? 'lg:max-h-96 lg:opacity-100' : 'lg:max-h-0 lg:opacity-0',
                                        )}
                                    >
                                        {g.children.map((c) => {
                                            const Icon = c.icon;
                                            const active = tab === c.id;
                                            return (
                                                <button
                                                    key={c.id}
                                                    type='button'
                                                    onClick={() => setTab(c.id)}
                                                    title={c.hint}
                                                    aria-current={active ? 'page' : undefined}
                                                    className={cn(
                                                        'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium whitespace-nowrap transition-[background-color,color] duration-200',
                                                        active
                                                            ? 'bg-primary/10 text-primary before:bg-primary before:absolute before:top-1/2 before:left-1.5 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full'
                                                            : 'text-muted-foreground hover:bg-muted/55 hover:text-foreground dark:hover:bg-muted/20',
                                                    )}
                                                >
                                                    <Icon className='h-4 w-4 shrink-0' />
                                                    <span className='min-w-0'>
                                                        <span className='block truncate'>{c.label}</span>
                                                        <span className='text-muted-foreground/80 hidden truncate text-[11px] font-normal lg:block'>
                                                            {c.hint}
                                                        </span>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </nav>
                </aside>

                <div className='@container min-w-0 flex-1 space-y-4'>
                    <div className='waf-rise flex flex-wrap items-center justify-between gap-3'>
                        <div className='min-w-0'>
                            <h2 className='truncate text-lg font-semibold'>{activeItem?.label}</h2>
                            <p className='text-muted-foreground truncate text-sm'>{activeItem?.hint}</p>
                        </div>
                        <div className='flex flex-wrap items-center gap-2'>
                            <span
                                className={cn(
                                    'h-2 w-2 rounded-full',
                                    overview.mode === 'block'
                                        ? 'bg-primary animate-pulse'
                                        : overview.mode === 'detect'
                                          ? 'animate-pulse bg-amber-400'
                                          : 'bg-zinc-500',
                                )}
                                title={activeHint}
                            />
                            <div className='border-border/50 flex overflow-hidden rounded-lg border text-xs'>
                                {modes.map((m) => {
                                    const Icon = m.icon;
                                    return (
                                        <button
                                            key={m.id}
                                            type='button'
                                            disabled={savingMode}
                                            title={m.hint}
                                            onClick={() => void setMode(m.id)}
                                            className={cn(
                                                'flex items-center gap-1.5 px-3 py-1.5 transition',
                                                overview.mode === m.id
                                                    ? m.id === 'block'
                                                        ? 'bg-primary text-primary-foreground'
                                                        : m.id === 'detect'
                                                          ? 'bg-amber-400 text-black'
                                                          : 'bg-secondary text-foreground'
                                                    : 'text-muted-foreground hover:text-foreground',
                                            )}
                                        >
                                            <Icon className='h-3.5 w-3.5' />
                                            {m.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className='border-border/50 flex overflow-hidden rounded-lg border text-xs'>
                                {RANGES.map((r) => (
                                    <button
                                        key={r}
                                        type='button'
                                        onClick={() => setRange(r)}
                                        className={cn(
                                            'px-3 py-1.5 transition',
                                            range === r
                                                ? 'bg-secondary text-foreground'
                                                : 'text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        {t(`webSpaces.wafDashboard.range_${r}`)}
                                    </button>
                                ))}
                            </div>
                            <Button size='sm' variant='outline' onClick={() => void load()}>
                                <RefreshCw className='h-4 w-4' />
                            </Button>
                        </div>
                    </div>

                    {needsSettings && !settings ? (
                        <Panel title={t('webSpaces.wafDashboard.title')}>
                            <p className='text-muted-foreground flex items-center gap-2 text-sm'>
                                <ShieldAlert className='h-4 w-4' />
                                {t('webSpaces.wafDashboard.unavailable')}
                            </p>
                        </Panel>
                    ) : null}
                    {settings && tab === 'allowdeny' ? <AllowDenyView s={settings} save={saveSettings} /> : null}
                    {settings && tab === 'ratelimit' ? (
                        <RateLimitView key={JSON.stringify(settings.rate_limit)} s={settings} save={saveSettings} />
                    ) : null}
                    {settings && tab === 'antibot' ? <AntiBotView s={settings} save={saveSettings} /> : null}
                    {settings && tab === 'exceptions' ? <ExceptionsView s={settings} save={saveSettings} /> : null}
                    {settings && tab === 'geo' ? <GeoView s={settings} save={saveSettings} /> : null}
                    {settings && tab === 'engine' ? <EngineView s={settings} save={saveSettings} /> : null}
                    {settings && tab === 'custom' ? <CustomRulesView s={settings} save={saveSettings} /> : null}
                    {settings && tab === 'login' ? (
                        <LoginView key={JSON.stringify(settings.login)} s={settings} save={saveSettings} />
                    ) : null}
                    {settings && tab === 'http' ? (
                        <HttpView key={JSON.stringify(settings.http)} s={settings} save={saveSettings} />
                    ) : null}
                    {settings && tab === 'headers' ? <HeadersView s={settings} save={saveSettings} /> : null}
                    {settings && tab === 'hotlink' ? <HotlinkView s={settings} save={saveSettings} /> : null}
                    {settings && tab === 'blockpage' ? (
                        <BlockPageView
                            key={JSON.stringify(settings.block_page)}
                            s={settings}
                            save={saveSettings}
                            loadPages={loadErrorPages}
                        />
                    ) : null}
                    {settings && tab === 'settings' ? (
                        <ModeView
                            s={{ ...settings, mode: overview.mode }}
                            engineAvailable={overview.engine_available}
                            setMode={setMode}
                        />
                    ) : null}

                    {tab === 'traffic' ? (
                        <>
                            {checks.length > 0 ? (
                                <Panel
                                    title={t('webSpaces.wafDashboard.protectionTitle')}
                                    right={
                                        <span className='text-muted-foreground text-xs'>
                                            <strong className='text-foreground'>
                                                {checks.filter((x) => x.ok).length}
                                            </strong>{' '}
                                            / {checks.length}
                                        </span>
                                    }
                                >
                                    <div className='bg-secondary/40 mb-4 h-1.5 overflow-hidden rounded-full'>
                                        <div
                                            className='bg-primary h-full rounded-full transition-all duration-700'
                                            style={{
                                                width: `${(checks.filter((x) => x.ok).length / checks.length) * 100}%`,
                                            }}
                                        />
                                    </div>
                                    <div className='grid gap-x-6 gap-y-2 @2xl:grid-cols-2 @4xl:grid-cols-3'>
                                        {checks.map((x) => (
                                            <div key={x.id} className='flex items-center justify-between gap-3 text-sm'>
                                                <span className='flex min-w-0 items-center gap-2'>
                                                    <span
                                                        className={cn(
                                                            'h-2 w-2 shrink-0 rounded-full',
                                                            x.ok ? 'bg-primary' : 'bg-amber-400',
                                                        )}
                                                    />
                                                    <span className={cn('truncate', x.ok && 'text-muted-foreground')}>
                                                        {t(`webSpaces.wafDashboard.check_${x.id}`)}
                                                    </span>
                                                </span>
                                                {x.ok ? null : (
                                                    <button
                                                        type='button'
                                                        onClick={() => setTab(x.tab)}
                                                        className='text-primary shrink-0 text-xs hover:underline'
                                                    >
                                                        {t('webSpaces.wafDashboard.fixIt')}
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </Panel>
                            ) : null}
                            <div className='grid gap-4 @4xl:grid-cols-3'>
                                <div className='space-y-4 @4xl:col-span-2'>
                                    <StatRow>
                                        <Stat
                                            label={t('webSpaces.wafDashboard.requests')}
                                            value={tot.requests}
                                            format={compact}
                                        />
                                        <Stat
                                            label={t('webSpaces.wafDashboard.uniqueIps')}
                                            value={tot.unique_ips}
                                            format={compact}
                                        />
                                        <Stat
                                            label={t('webSpaces.wafDashboard.blocked')}
                                            value={tot.blocked}
                                            format={compact}
                                            tone={tot.blocked > 0 ? 'danger' : undefined}
                                        />
                                        <Stat
                                            label={t('webSpaces.wafDashboard.blockedRate')}
                                            value={ratio(tot.blocked, tot.requests)}
                                            format={fmtPercent}
                                            tone={tot.blocked > 0 ? 'danger' : undefined}
                                        />
                                    </StatRow>
                                    <StatRow>
                                        <Stat
                                            label={t('webSpaces.wafDashboard.errors4xx')}
                                            value={tot.status_4xx}
                                            format={compact}
                                            tone='warn'
                                        />
                                        <Stat
                                            label={t('webSpaces.wafDashboard.errorRate')}
                                            value={ratio(tot.status_4xx, tot.requests)}
                                            format={fmtPercent}
                                            tone='warn'
                                        />
                                        <Stat
                                            label={t('webSpaces.wafDashboard.errors5xx')}
                                            value={tot.status_5xx}
                                            format={compact}
                                            tone='danger'
                                        />
                                        <Stat
                                            label={t('webSpaces.wafDashboard.errorRate')}
                                            value={ratio(tot.status_5xx, tot.requests)}
                                            format={fmtPercent}
                                            tone='danger'
                                        />
                                    </StatRow>
                                </div>
                                <Panel
                                    title={t('webSpaces.wafDashboard.qps')}
                                    right={
                                        <span className='text-muted-foreground text-xs'>
                                            Max <strong className='text-foreground'>{peakQps.toFixed(2)}</strong>
                                        </span>
                                    }
                                >
                                    <div className='h-24'>
                                        <ResponsiveContainer width='100%' height='100%'>
                                            <AreaChart data={chartData}>
                                                <Tooltip contentStyle={tooltipStyle} />
                                                <Area
                                                    type='monotone'
                                                    dataKey='qps'
                                                    stroke={TEAL}
                                                    strokeDasharray='4 3'
                                                    strokeWidth={2}
                                                    fill='none'
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Panel>
                            </div>

                            <div className='grid gap-4 @4xl:grid-cols-12'>
                                <div className='grid gap-4 @2xl:grid-cols-2 @4xl:col-span-7'>
                                    <LineCard
                                        title={t('webSpaces.wafDashboard.requestsStatus')}
                                        max={compact(peakReq)}
                                        data={chartData}
                                        dataKey='requests'
                                        color={BLUE}
                                        gradientId='wafReq'
                                    />
                                    <LineCard
                                        title={t('webSpaces.wafDashboard.blockingStatus')}
                                        max={compact(peakBlk)}
                                        data={chartData}
                                        dataKey='blocked'
                                        color={RED}
                                        gradientId='wafBlk'
                                    />
                                </div>
                                <Panel title={t('webSpaces.wafDashboard.responseStatus')} className='@4xl:col-span-5'>
                                    <Donut rows={statusRows} empty={t('webSpaces.wafDashboard.none')} />
                                </Panel>
                            </div>

                            <div className='grid gap-4 @4xl:grid-cols-12'>
                                <Panel title={t('webSpaces.wafDashboard.geo')} className='@4xl:col-span-7'>
                                    {overview.countries && overview.countries.length > 0 ? (
                                        <div className='grid items-center gap-4 @2xl:grid-cols-[1fr_200px]'>
                                            <WafGlobe rows={overview.countries} />
                                            <BarList
                                                rows={overview.countries
                                                    .slice(0, 7)
                                                    .map((c) => ({ ...c, name: countryLabel(c.name) }))}
                                                color={TEAL}
                                                empty={t('webSpaces.wafDashboard.none')}
                                            />
                                        </div>
                                    ) : (
                                        <p className='text-muted-foreground text-sm'>
                                            {t('webSpaces.wafDashboard.noGeo')}
                                        </p>
                                    )}
                                </Panel>
                                <Panel title={t('webSpaces.wafDashboard.clients')} className='@4xl:col-span-5'>
                                    <div className='space-y-4'>
                                        <Donut rows={overview.systems ?? []} empty={t('webSpaces.wafDashboard.none')} />
                                        <Donut
                                            rows={overview.browsers ?? []}
                                            empty={t('webSpaces.wafDashboard.none')}
                                        />
                                    </div>
                                </Panel>
                            </div>

                            <div className='grid gap-4 @2xl:grid-cols-2 @4xl:grid-cols-4'>
                                <Panel title={t('webSpaces.wafDashboard.referrers')}>
                                    <BarList
                                        rows={overview.referrers ?? []}
                                        color={BLUE}
                                        empty={t('webSpaces.wafDashboard.none')}
                                    />
                                </Panel>
                                <Panel title={t('webSpaces.wafDashboard.popularPages')}>
                                    <BarList
                                        rows={overview.top_paths.map((r) => ({ name: r.path, count: r.count }))}
                                        color={YELLOW}
                                        empty={t('webSpaces.wafDashboard.none')}
                                        mono
                                    />
                                </Panel>
                                <Panel title={t('webSpaces.wafDashboard.popularHosts')}>
                                    <BarList
                                        rows={overview.top_hosts ?? []}
                                        color={BLUE}
                                        empty={t('webSpaces.wafDashboard.none')}
                                    />
                                </Panel>
                                <Panel title={t('webSpaces.wafDashboard.topIps')}>
                                    <BarList
                                        rows={overview.top_ips.map((r) => ({ name: r.ip, count: r.count }))}
                                        color={RED}
                                        empty={t('webSpaces.wafDashboard.none')}
                                        mono
                                        action={denyAction}
                                    />
                                </Panel>
                            </div>
                        </>
                    ) : null}
                    {tab === 'attacks' ? (
                        <>
                            <div className='grid gap-4 lg:grid-cols-2'>
                                <Panel title={t('webSpaces.wafDashboard.topCategories')}>
                                    <BarList
                                        rows={overview.top_categories.map((r) => ({
                                            name: r.category,
                                            count: r.count,
                                        }))}
                                        color={RED}
                                        empty={t('webSpaces.wafDashboard.none')}
                                    />
                                </Panel>
                                <Panel title={t('webSpaces.wafDashboard.topIps')}>
                                    <BarList
                                        rows={overview.top_ips.map((r) => ({ name: r.ip, count: r.count }))}
                                        color={RED}
                                        empty={t('webSpaces.wafDashboard.none')}
                                        mono
                                        action={denyAction}
                                    />
                                </Panel>
                            </div>

                            <Panel
                                title={t('webSpaces.wafDashboard.eventsTitle')}
                                right={
                                    events.length > 0 ? (
                                        <Button size='sm' variant='outline' onClick={exportEvents}>
                                            {t('webSpaces.wafDashboard.exportCsv')}
                                        </Button>
                                    ) : undefined
                                }
                            >
                                {events.length === 0 ? (
                                    <p className='text-muted-foreground text-sm'>
                                        {t('webSpaces.wafDashboard.noEvents')}
                                    </p>
                                ) : (
                                    <div className='overflow-x-auto'>
                                        <table className='w-full text-left text-sm'>
                                            <thead>
                                                <tr className='text-muted-foreground border-border/40 border-b text-xs uppercase'>
                                                    <th className='py-2 pr-3'>{t('webSpaces.wafDashboard.colTime')}</th>
                                                    <th className='py-2 pr-3'>{t('webSpaces.wafDashboard.colIp')}</th>
                                                    <th className='py-2 pr-3'>
                                                        {t('webSpaces.wafDashboard.colRequest')}
                                                    </th>
                                                    <th className='py-2 pr-3'>{t('webSpaces.wafDashboard.colRule')}</th>
                                                    <th className='py-2 pr-3'>
                                                        {t('webSpaces.wafDashboard.colAction')}
                                                    </th>
                                                    <th className='py-2' />
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {events.map((e) => (
                                                    <tr key={e.id} className='border-border/20 border-b align-top'>
                                                        <td className='py-2 pr-3 whitespace-nowrap'>
                                                            {new Date(e.time).toLocaleString()}
                                                        </td>
                                                        <td className='py-2 pr-3 font-mono text-xs'>{e.ip}</td>
                                                        <td className='max-w-xs py-2 pr-3'>
                                                            <span className='font-mono text-xs break-all'>
                                                                {e.method} {e.path}
                                                            </span>
                                                        </td>
                                                        <td className='py-2 pr-3'>
                                                            <div className='text-xs'>{e.rule_msg || e.category}</div>
                                                            <div className='text-muted-foreground font-mono text-[11px]'>
                                                                {e.rule_id}
                                                            </div>
                                                        </td>
                                                        <td className='py-2 pr-3'>
                                                            <span
                                                                className={cn(
                                                                    'rounded-full px-2 py-0.5 text-xs',
                                                                    e.action === 'blocked'
                                                                        ? 'bg-red-500/15 text-red-300'
                                                                        : 'bg-amber-500/15 text-amber-300',
                                                                )}
                                                            >
                                                                {t(`webSpaces.wafDashboard.action_${e.action}`)}
                                                            </span>
                                                        </td>
                                                        <td className='py-2 text-right whitespace-nowrap'>
                                                            <Button
                                                                size='sm'
                                                                variant='outline'
                                                                onClick={() => void allowEvent(e)}
                                                            >
                                                                {t('webSpaces.wafDashboard.allowThis')}
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Panel>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
