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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
    Activity,
    BookOpen,
    Bug,
    CheckCircle2,
    Copy,
    Cpu,
    Database,
    ExternalLink,
    Gauge,
    HardDrive,
    Loader2,
    Network,
    Radio,
    RefreshCw,
    Terminal,
    Trash2,
    Wrench,
    X,
    XCircle,
    Zap,
} from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Dialog } from '@/components/ui/dialog';
import { PanelDebugLogsSection } from '@/components/global-search/PanelDebugLogsSection';
import { PanelDebugApiSection } from '@/components/global-search/PanelDebugApiSection';
import { usePanelDebug } from '@/contexts/PanelDebugContext';
import { useSession } from '@/contexts/SessionContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDeveloperMode } from '@/hooks/useDeveloperMode';
import {
    runNetworkProbes,
    runPanelBenchmarkSuite,
    type BenchmarkResult,
    type NetworkProbe,
} from '@/lib/panel-debug-benchmarks';
import { buildPanelDebugSnapshot } from '@/lib/panel-debug-snapshot';
import Permissions from '@/lib/permissions';
import { copyToClipboard, cn } from '@/lib/utils';
import { toast } from 'sonner';

type DebugSection = 'overview' | 'diagnostics' | 'benchmarks' | 'logs' | 'storage' | 'network' | 'api' | 'tools';

type StorageRow = { key: string; size: number; preview: string; store: 'local' | 'session' };

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function readStorageRows(store: Storage): StorageRow[] {
    const rows: StorageRow[] = [];
    for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (!key) continue;
        const value = store.getItem(key) ?? '';
        rows.push({
            key,
            size: new Blob([value]).size,
            preview: value.length > 160 ? `${value.slice(0, 160)}…` : value,
            store: store === localStorage ? 'local' : 'session',
        });
    }
    return rows.sort((a, b) => b.size - a.size);
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div className='border-border/60 bg-card rounded-xl border p-3'>
            <p className='text-muted-foreground text-[10px] font-medium tracking-wide uppercase'>{label}</p>
            <p className='text-foreground mt-1 truncate text-lg font-semibold tabular-nums'>{value}</p>
            {hint ? <p className='text-muted-foreground mt-1 truncate text-[11px]'>{hint}</p> : null}
        </div>
    );
}

function SectionNav({
    active,
    onChange,
    items,
}: {
    active: DebugSection;
    onChange: (section: DebugSection) => void;
    items: Array<{ id: DebugSection; label: string; icon: typeof Bug }>;
}) {
    return (
        <nav className='flex flex-col gap-0.5 p-2'>
            {items.map((item) => {
                const Icon = item.icon;
                const selected = active === item.id;
                return (
                    <button
                        key={item.id}
                        type='button'
                        onClick={() => onChange(item.id)}
                        className={cn(
                            'flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                            selected
                                ? 'bg-background text-foreground border-border/60 border font-medium shadow-sm'
                                : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                        )}
                    >
                        <Icon className='h-4 w-4 shrink-0 opacity-80' />
                        {item.label}
                    </button>
                );
            })}
        </nav>
    );
}

function ProbeStatusBadge({ ok }: { ok: boolean }) {
    return ok ? (
        <span className='inline-flex items-center gap-1 text-xs font-medium text-emerald-600'>
            <CheckCircle2 className='h-3.5 w-3.5' />
            OK
        </span>
    ) : (
        <span className='text-destructive inline-flex items-center gap-1 text-xs font-medium'>
            <XCircle className='h-3.5 w-3.5' />
            Fail
        </span>
    );
}

export default function PanelDebugConsole() {
    const pathname = usePathname();
    const { open, command, closeDebugConsole } = usePanelDebug();
    const { user, hasPermission } = useSession();
    const { settings } = useSettings();
    const { locale, t } = useTranslation();
    const { isDeveloperModeEnabled, loading: devLoading } = useDeveloperMode();

    const [section, setSection] = useState<DebugSection>('overview');
    const [storageRows, setStorageRows] = useState<StorageRow[]>([]);
    const [benchmarks, setBenchmarks] = useState<BenchmarkResult[]>([]);
    const [benchRunning, setBenchRunning] = useState(false);
    const [probes, setProbes] = useState<NetworkProbe[]>([]);
    const [probesRunning, setProbesRunning] = useState(false);

    const canAdminLogs = hasPermission(Permissions.ADMIN_ROOT);

    const navItems = useMemo(
        () => [
            { id: 'overview' as const, label: t('globalSearch.debug.tabs.overview'), icon: Bug },
            { id: 'diagnostics' as const, label: t('globalSearch.debug.tabs.diagnostics'), icon: Cpu },
            { id: 'benchmarks' as const, label: t('globalSearch.debug.tabs.benchmark'), icon: Gauge },
            { id: 'network' as const, label: t('globalSearch.debug.tabs.network'), icon: Network },
            { id: 'api' as const, label: t('globalSearch.debug.tabs.api'), icon: Radio },
            { id: 'logs' as const, label: t('globalSearch.debug.tabs.logs'), icon: Terminal },
            { id: 'storage' as const, label: t('globalSearch.debug.tabs.storage'), icon: Database },
            { id: 'tools' as const, label: t('globalSearch.debug.tabs.tools'), icon: Wrench },
        ],
        [t],
    );

    const snapshot = useMemo(
        () =>
            buildPanelDebugSnapshot({
                pathname,
                locale,
                user,
                settings,
                storageKeys: storageRows.filter((r) => r.store === 'local').map((r) => r.key),
            }),
        [locale, pathname, settings, storageRows, user],
    );

    const refreshStorage = useCallback(() => {
        if (typeof window === 'undefined') return;
        setStorageRows([...readStorageRows(localStorage), ...readStorageRows(sessionStorage)]);
    }, []);

    useEffect(() => {
        if (!open) return;
        refreshStorage();
    }, [open, refreshStorage]);

    useEffect(() => {
        if (!open || !command.trim()) return;
        const q = command.trim().toLowerCase();
        const match = navItems.find((item) => item.id.includes(q) || item.label.toLowerCase().includes(q));
        if (match) setSection(match.id);
    }, [open, command, navItems]);

    const copySnapshot = useCallback(async () => {
        await copyToClipboard(JSON.stringify(snapshot, null, 2), t);
    }, [snapshot, t]);

    const copyText = useCallback(
        async (text: string) => {
            await copyToClipboard(text, t);
        },
        [t],
    );

    const runBenchmarks = useCallback(async () => {
        setBenchRunning(true);
        setBenchmarks([]);
        try {
            const results = await runPanelBenchmarkSuite(snapshot);
            setBenchmarks(results);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t('globalSearch.debug.benchmarkFailed'));
        } finally {
            setBenchRunning(false);
        }
    }, [snapshot, t]);

    const runProbes = useCallback(async () => {
        setProbesRunning(true);
        try {
            setProbes(await runNetworkProbes());
        } finally {
            setProbesRunning(false);
        }
    }, []);

    useEffect(() => {
        if (open && section === 'network' && probes.length === 0 && !probesRunning) {
            void runProbes();
        }
    }, [open, section, probes.length, probesRunning, runProbes]);

    const clearPanelStorage = useCallback(() => {
        if (typeof window === 'undefined') return;
        const keys = Object.keys(localStorage).filter((key) => key.startsWith('featherpanel'));
        keys.forEach((key) => localStorage.removeItem(key));
        refreshStorage();
        toast.success(t('globalSearch.debug.storageCleared', { count: String(keys.length) }));
    }, [refreshStorage, t]);

    const memoryUsed = (snapshot.client as { memory?: { usedJSHeapSize?: number } })?.memory?.usedJSHeapSize;

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => !next && closeDebugConsole()}
            className='flex h-[min(88vh,52rem)] max-w-5xl flex-col overflow-hidden p-0'
        >
            <div className='border-border/60 bg-muted/20 shrink-0 border-b px-5 py-4'>
                <div className='flex items-start justify-between gap-4'>
                    <div className='flex items-center gap-3'>
                        <div className='border-border/60 bg-background flex h-10 w-10 items-center justify-center rounded-lg border'>
                            <Terminal className='text-foreground h-5 w-5' />
                        </div>
                        <div>
                            <p className='text-foreground text-base font-semibold'>{t('globalSearch.debug.title')}</p>
                            <p className='text-muted-foreground text-xs'>{t('globalSearch.debug.subtitle')}</p>
                        </div>
                    </div>
                    <button
                        type='button'
                        onClick={closeDebugConsole}
                        className='text-muted-foreground hover:bg-muted/60 hover:text-foreground rounded-lg p-2 transition-colors'
                        aria-label={t('common.close')}
                    >
                        <X className='h-4 w-4' />
                    </button>
                </div>
            </div>

            {devLoading ? (
                <div className='flex flex-1 items-center justify-center gap-2 py-20'>
                    <Loader2 className='h-5 w-5 animate-spin' />
                    <span className='text-sm'>{t('globalSearch.debug.loading')}</span>
                </div>
            ) : isDeveloperModeEnabled !== true ? (
                <div className='flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16 text-center'>
                    <div className='border-border/60 bg-muted/30 flex h-14 w-14 items-center justify-center rounded-xl border'>
                        <Bug className='text-muted-foreground h-6 w-6' />
                    </div>
                    <p className='text-foreground font-medium'>{t('globalSearch.debug.disabledTitle')}</p>
                    <p className='text-muted-foreground max-w-md text-sm'>{t('globalSearch.debug.disabledHint')}</p>
                </div>
            ) : (
                <div className='grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[12.5rem_1fr]'>
                    <aside className='border-border/60 hidden border-r lg:block'>
                        <SectionNav active={section} onChange={setSection} items={navItems} />
                    </aside>

                    <div className='custom-scrollbar min-h-0 overflow-y-auto p-4 sm:p-5'>
                        <div className='mb-4 flex gap-2 overflow-x-auto lg:hidden'>
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    type='button'
                                    onClick={() => setSection(item.id)}
                                    className={cn(
                                        'shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium',
                                        section === item.id
                                            ? 'border-border bg-background text-foreground'
                                            : 'bg-muted/40 text-muted-foreground border-transparent',
                                    )}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>

                        {section === 'overview' ? (
                            <div className='space-y-4'>
                                <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                                    <MetricCard
                                        label={t('globalSearch.debug.fields.user')}
                                        value={user?.username ?? '—'}
                                    />
                                    <MetricCard
                                        label={t('globalSearch.debug.fields.path')}
                                        value={pathname.split('/').pop() || '/'}
                                        hint={pathname}
                                    />
                                    <MetricCard
                                        label={t('globalSearch.debug.fields.memory')}
                                        value={memoryUsed ? formatBytes(memoryUsed) : '—'}
                                        hint={t('globalSearch.debug.memoryHint')}
                                    />
                                    <MetricCard label={t('globalSearch.debug.fields.developerMode')} value='on' />
                                </div>
                                <div className='border-border/60 bg-muted/15 rounded-xl border'>
                                    <div className='border-border/60 flex items-center justify-between border-b px-3 py-2'>
                                        <p className='text-muted-foreground text-xs font-medium'>
                                            {t('globalSearch.debug.snapshotLabel')}
                                        </p>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            className='h-7 px-2 text-xs'
                                            onClick={() => void copySnapshot()}
                                        >
                                            <Copy className='mr-1 h-3 w-3' />
                                            {t('common.copy')}
                                        </Button>
                                    </div>
                                    <pre className='text-muted-foreground custom-scrollbar max-h-48 overflow-auto p-3 font-mono text-[11px] leading-relaxed'>
                                        {JSON.stringify(snapshot, null, 2)}
                                    </pre>
                                </div>
                                <div className='flex flex-wrap gap-2'>
                                    <Button size='sm' onClick={() => void copySnapshot()}>
                                        <Copy className='mr-2 h-4 w-4' />
                                        {t('globalSearch.debug.copySnapshot')}
                                    </Button>
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        onClick={() => void runProbes()}
                                        disabled={probesRunning}
                                    >
                                        {probesRunning ? (
                                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                        ) : (
                                            <Activity className='mr-2 h-4 w-4' />
                                        )}
                                        {t('globalSearch.debug.quickProbe')}
                                    </Button>
                                </div>
                            </div>
                        ) : null}

                        {section === 'diagnostics' ? (
                            <div className='grid gap-3 sm:grid-cols-2'>
                                {Object.entries(snapshot.client as Record<string, unknown>).map(([key, value]) => (
                                    <div key={key} className='border-border/60 bg-card rounded-xl border p-3'>
                                        <p className='text-muted-foreground text-[10px] font-medium uppercase'>{key}</p>
                                        <pre className='text-foreground mt-2 overflow-x-auto font-mono text-[11px] whitespace-pre-wrap'>
                                            {typeof value === 'object'
                                                ? JSON.stringify(value, null, 2)
                                                : String(value ?? '—')}
                                        </pre>
                                        {typeof value === 'object' && value ? (
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                className='mt-2 h-7 px-2 text-xs'
                                                onClick={() => void copyText(JSON.stringify(value, null, 2))}
                                            >
                                                <Copy className='mr-1 h-3 w-3' />
                                                {t('common.copy')}
                                            </Button>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        ) : null}

                        {section === 'benchmarks' ? (
                            <div className='space-y-4'>
                                <p className='text-muted-foreground text-sm'>{t('globalSearch.debug.benchmarkHint')}</p>
                                <Button onClick={() => void runBenchmarks()} disabled={benchRunning}>
                                    {benchRunning ? (
                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    ) : (
                                        <Gauge className='mr-2 h-4 w-4' />
                                    )}
                                    {t('globalSearch.debug.runBenchmark')}
                                </Button>
                                <div className='border-border/60 overflow-hidden rounded-xl border'>
                                    <table className='w-full text-sm'>
                                        <thead className='bg-muted/30 text-muted-foreground border-border/60 border-b text-left text-xs'>
                                            <tr>
                                                <th className='px-3 py-2 font-medium'>
                                                    {t('globalSearch.debug.benchmarkName')}
                                                </th>
                                                <th className='px-3 py-2 font-medium'>
                                                    {t('globalSearch.debug.benchmarkDetail')}
                                                </th>
                                                <th className='px-3 py-2 text-right font-medium'>
                                                    {t('globalSearch.debug.benchmarkTime')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {benchmarks.map((bench) => (
                                                <tr key={bench.id} className='border-border/40 border-b last:border-0'>
                                                    <td className='text-foreground px-3 py-2.5 font-medium'>
                                                        {bench.name}
                                                    </td>
                                                    <td className='text-muted-foreground max-w-xs truncate px-3 py-2.5 text-xs'>
                                                        {bench.detail}
                                                    </td>
                                                    <td className='text-foreground px-3 py-2.5 text-right tabular-nums'>
                                                        {bench.durationMs !== null ? `${bench.durationMs} ms` : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {!benchRunning && benchmarks.length === 0 ? (
                                        <p className='text-muted-foreground px-3 py-6 text-center text-xs'>
                                            {t('globalSearch.debug.benchmarkEmpty')}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}

                        {section === 'network' ? (
                            <div className='space-y-4'>
                                <div className='flex flex-wrap items-center justify-between gap-2'>
                                    <p className='text-muted-foreground text-sm'>
                                        {t('globalSearch.debug.networkHint')}
                                    </p>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => void runProbes()}
                                        disabled={probesRunning}
                                    >
                                        {probesRunning ? (
                                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                        ) : (
                                            <Network className='mr-2 h-4 w-4' />
                                        )}
                                        {t('globalSearch.debug.runProbes')}
                                    </Button>
                                </div>
                                <div className='border-border/60 overflow-hidden rounded-xl border'>
                                    <table className='w-full text-sm'>
                                        <thead className='bg-muted/30 text-muted-foreground border-border/60 border-b text-left text-xs'>
                                            <tr>
                                                <th className='px-3 py-2 font-medium'>
                                                    {t('globalSearch.debug.probeStatus')}
                                                </th>
                                                <th className='px-3 py-2 font-medium'>
                                                    {t('globalSearch.debug.probeEndpoint')}
                                                </th>
                                                <th className='px-3 py-2 font-medium'>
                                                    {t('globalSearch.debug.probeDetail')}
                                                </th>
                                                <th className='px-3 py-2 text-right font-medium'>
                                                    {t('globalSearch.debug.probeTime')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {probesRunning && probes.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={4}
                                                        className='text-muted-foreground px-3 py-8 text-center text-xs'
                                                    >
                                                        <Loader2 className='mr-2 inline h-4 w-4 animate-spin' />
                                                        {t('globalSearch.debug.probesRunning')}
                                                    </td>
                                                </tr>
                                            ) : (
                                                probes.map((probe) => (
                                                    <tr
                                                        key={probe.id}
                                                        className='border-border/40 border-b last:border-0'
                                                    >
                                                        <td className='px-3 py-2.5'>
                                                            <ProbeStatusBadge ok={probe.ok} />
                                                        </td>
                                                        <td className='px-3 py-2.5'>
                                                            <p className='text-foreground font-medium'>{probe.label}</p>
                                                            <p className='text-muted-foreground font-mono text-[11px]'>
                                                                {probe.url}
                                                            </p>
                                                        </td>
                                                        <td className='text-muted-foreground max-w-xs px-3 py-2.5 text-xs'>
                                                            {probe.detail}
                                                        </td>
                                                        <td className='text-foreground px-3 py-2.5 text-right tabular-nums'>
                                                            {probe.durationMs !== null ? `${probe.durationMs} ms` : '—'}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : null}

                        {section === 'logs' ? <PanelDebugLogsSection enabled={canAdminLogs} /> : null}

                        {section === 'api' ? <PanelDebugApiSection /> : null}

                        {section === 'storage' ? (
                            <div className='space-y-3'>
                                <div className='flex flex-wrap items-center justify-between gap-2'>
                                    <p className='text-muted-foreground text-sm'>
                                        {t('globalSearch.debug.storageCount', { count: String(storageRows.length) })}
                                    </p>
                                    <div className='flex gap-2'>
                                        <Button size='sm' variant='outline' onClick={refreshStorage}>
                                            <RefreshCw className='mr-2 h-4 w-4' />
                                            {t('globalSearch.debug.refreshStorage')}
                                        </Button>
                                        <Button size='sm' variant='outline' onClick={clearPanelStorage}>
                                            <Trash2 className='mr-2 h-4 w-4' />
                                            {t('globalSearch.debug.clearPanelStorage')}
                                        </Button>
                                    </div>
                                </div>
                                <ul className='space-y-2'>
                                    {storageRows.map((row) => (
                                        <li
                                            key={`${row.store}-${row.key}`}
                                            className='border-border/60 bg-card rounded-xl border px-3 py-2.5'
                                        >
                                            <div className='flex items-center justify-between gap-2'>
                                                <div className='min-w-0'>
                                                    <p className='text-foreground truncate text-xs font-medium'>
                                                        {row.key}
                                                    </p>
                                                    <p className='text-muted-foreground text-[10px] uppercase'>
                                                        {row.store}
                                                    </p>
                                                </div>
                                                <div className='flex shrink-0 items-center gap-2'>
                                                    <span className='text-muted-foreground text-[10px]'>
                                                        {formatBytes(row.size)}
                                                    </span>
                                                    <Button
                                                        size='sm'
                                                        variant='ghost'
                                                        className='h-7 px-2'
                                                        onClick={() =>
                                                            void copyText(
                                                                row.store === 'local'
                                                                    ? (localStorage.getItem(row.key) ?? '')
                                                                    : (sessionStorage.getItem(row.key) ?? ''),
                                                            )
                                                        }
                                                    >
                                                        <Copy className='h-3 w-3' />
                                                    </Button>
                                                </div>
                                            </div>
                                            <p className='text-muted-foreground mt-1 truncate font-mono text-[10px]'>
                                                {row.preview || '—'}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}

                        {section === 'tools' ? (
                            <div className='grid gap-2 sm:grid-cols-2'>
                                <Button
                                    variant='outline'
                                    className='h-auto justify-start py-3'
                                    onClick={() => window.location.reload()}
                                >
                                    <RefreshCw className='mr-2 h-4 w-4 shrink-0' />
                                    <span className='text-left'>{t('globalSearch.debug.hardReload')}</span>
                                </Button>
                                <Button
                                    variant='outline'
                                    className='h-auto justify-start py-3'
                                    onClick={() => void copySnapshot()}
                                >
                                    <Copy className='mr-2 h-4 w-4 shrink-0' />
                                    <span className='text-left'>{t('globalSearch.debug.copySnapshot')}</span>
                                </Button>
                                <Button
                                    variant='outline'
                                    className='h-auto justify-start py-3'
                                    onClick={() =>
                                        window.open('/icanhasfeatherpanel/', '_blank', 'noopener,noreferrer')
                                    }
                                >
                                    <BookOpen className='mr-2 h-4 w-4 shrink-0' />
                                    <span className='flex-1 text-left'>{t('globalSearch.debug.openDocs')}</span>
                                    <ExternalLink className='h-3.5 w-3.5 opacity-60' />
                                </Button>
                                <Button
                                    variant='outline'
                                    className='h-auto justify-start py-3'
                                    onClick={() => window.open('/admin/dev/plugins', '_blank', 'noopener,noreferrer')}
                                >
                                    <Bug className='mr-2 h-4 w-4 shrink-0' />
                                    <span className='flex-1 text-left'>{t('globalSearch.debug.openDevPlugins')}</span>
                                    <ExternalLink className='h-3.5 w-3.5 opacity-60' />
                                </Button>
                                {canAdminLogs ? (
                                    <Button
                                        variant='outline'
                                        className='h-auto justify-start py-3'
                                        onClick={() => window.open('/admin/logs', '_blank', 'noopener,noreferrer')}
                                    >
                                        <HardDrive className='mr-2 h-4 w-4 shrink-0' />
                                        <span className='flex-1 text-left'>
                                            {t('globalSearch.debug.openLogViewer')}
                                        </span>
                                        <ExternalLink className='h-3.5 w-3.5 opacity-60' />
                                    </Button>
                                ) : null}
                                <Button
                                    variant='outline'
                                    className='h-auto justify-start py-3'
                                    onClick={() => {
                                        closeDebugConsole();
                                        window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'd' }));
                                    }}
                                >
                                    <Zap className='mr-2 h-4 w-4 shrink-0' />
                                    <span className='text-left'>{t('globalSearch.debug.backToSearch')}</span>
                                </Button>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            <div className='border-border/60 bg-muted/15 text-muted-foreground shrink-0 border-t px-4 py-2.5 text-[11px]'>
                {t('globalSearch.debug.footer')}
            </div>
        </Dialog>
    );
}
