/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import {
    Boxes,
    CheckCircle2,
    Copy,
    Cpu,
    Crown,
    Flag,
    Loader2,
    Radio,
    RefreshCw,
    Rocket,
    Server,
    Tag,
    Trash2,
    XCircle,
} from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage } from '@/lib/api-errors';
import { reopenSetup } from '@/lib/setup-wizard';
import { copyToClipboard, cn } from '@/lib/utils';

type Check = { status?: string; message?: string; details?: Record<string, unknown> };
type Health = { status?: string; checks?: Record<string, Check>; versions?: Record<string, string | null> };
type Runtime = {
    build?: Record<string, unknown>;
    php?: Record<string, unknown>;
    frankenphp?: Record<string, unknown>;
    mercure?: { enabled?: boolean; public_url?: string | null };
    flags?: Record<string, string | null>;
    setup_completed?: string | null;
    nodes?: { id: number; name: string; daemon_type: string; features: string[] }[];
};
type Premium = {
    active?: boolean;
    paid_active?: boolean;
    free_claim?: { active?: boolean; expires_at?: string | null };
};

function fmt(value: unknown): string {
    if (value === null || value === undefined || value === '') return '-';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number' && value > 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    return String(value);
}

function StatusDot({ status }: { status?: string | boolean }) {
    const ok = status === true || status === 'ok';
    const warn = status === 'warn';
    return (
        <span className='relative flex h-2.5 w-2.5'>
            {ok ? (
                <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/50 [animation-iteration-count:3] motion-reduce:hidden' />
            ) : null}
            <span
                className={cn(
                    'relative inline-flex h-2.5 w-2.5 rounded-full',
                    ok ? 'bg-emerald-500' : warn ? 'bg-amber-500' : 'bg-destructive',
                )}
            />
        </span>
    );
}

function Card({
    icon: Icon,
    title,
    children,
    delay = 0,
    className,
}: {
    icon: ComponentType<{ className?: string }>;
    title: string;
    children: ReactNode;
    delay?: number;
    className?: string;
}) {
    return (
        <section
            style={delay ? { animationDelay: `${delay}ms` } : undefined}
            className={cn(
                'border-border/60 bg-card animate-in fade-in slide-in-from-bottom-2 fill-mode-both rounded-xl border p-4 duration-500 motion-reduce:animate-none',
                className,
            )}
        >
            <div className='mb-3 flex items-center gap-2'>
                <span className='bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-lg'>
                    <Icon className='h-3.5 w-3.5' />
                </span>
                <h3 className='text-sm font-semibold'>{title}</h3>
            </div>
            {children}
        </section>
    );
}

function Rows({ rows }: { rows: [string, unknown][] }) {
    return (
        <dl className='space-y-1.5 text-xs'>
            {rows.map(([k, v]) => (
                <div key={k} className='flex items-center justify-between gap-3'>
                    <dt className='text-muted-foreground font-mono'>{k}</dt>
                    <dd className='text-foreground truncate text-right font-mono tabular-nums'>{fmt(v)}</dd>
                </div>
            ))}
        </dl>
    );
}

/** Admin-root panel diagnostics and actions for the debug console. */
export function PanelDebugServerSection({ enabled }: { enabled: boolean }) {
    const { t } = useTranslation();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [health, setHealth] = useState<Health | null>(null);
    const [runtime, setRuntime] = useState<Runtime | null>(null);
    const [premium, setPremium] = useState<Premium | null>(null);
    const [confirm, setConfirm] = useState<'cache' | 'oobe' | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const [h, r, p] = await Promise.all([
            axios.get('/api/admin/health').catch(() => null),
            axios.get('/api/admin/debug/runtime').catch(() => null),
            axios.get('/api/admin/featherpanel-premium', { params: { refresh: '0' } }).catch(() => null),
        ]);
        setHealth(h?.data?.data ?? null);
        setRuntime(r?.data?.data ?? null);
        setPremium(p?.data?.data?.premium ?? null);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (enabled) void load();
    }, [enabled, load]);

    if (!enabled) {
        return <p className='text-muted-foreground text-sm'>{t('globalSearch.debug.panel.adminOnly')}</p>;
    }

    const copyDiagnostics = () =>
        void copyToClipboard(
            JSON.stringify({ captured_at: new Date().toISOString(), health, runtime, premium }, null, 2),
            t,
        );

    const runConfirmed = async () => {
        setBusy(true);
        try {
            if (confirm === 'cache') {
                await axios.post('/api/admin/dashboard/cache/clear');
                toast.success(t('globalSearch.debug.panel.cacheCleared'));
                void load();
            } else if (confirm === 'oobe') {
                await reopenSetup();
                toast.success(t('globalSearch.debug.panel.oobeReset'));
                router.push('/setup');
            }
            setConfirm(null);
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'globalSearch.debug.panel.actionFailed'));
        } finally {
            setBusy(false);
        }
    };

    const checks = health?.checks ?? {};
    const connectivity: [string, string | boolean | undefined, string][] = [
        ['Database', checks.database?.status, checks.database?.message ?? ''],
        ['Redis', checks.redis?.status, fmt(checks.redis?.details?.version)],
        [
            'Mercure',
            runtime?.mercure?.enabled ? 'ok' : 'warn',
            runtime?.mercure?.enabled ? t('globalSearch.debug.panel.enabled') : t('globalSearch.debug.panel.disabled'),
        ],
        [
            'Nodes',
            checks.nodes?.status,
            t('globalSearch.debug.panel.nodesDetail', {
                total: fmt(checks.nodes?.details?.total),
                unhealthy: fmt(checks.nodes?.details?.unhealthy),
            }),
        ],
        ['Cron', checks.crons?.status, fmt(checks.crons?.details?.last_heartbeat_at)],
        [
            'Queue',
            checks.queue?.status,
            t('globalSearch.debug.panel.queueDetail', { count: fmt(checks.queue?.details?.mail_pending) }),
        ],
    ];

    return (
        <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-2'>
                <Button size='sm' onClick={copyDiagnostics} disabled={loading}>
                    <Copy className='mr-2 h-4 w-4' />
                    {t('globalSearch.debug.panel.copyDiagnostics')}
                </Button>
                <Button size='sm' variant='outline' onClick={() => void load()} disabled={loading}>
                    {loading ? (
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    ) : (
                        <RefreshCw className='mr-2 h-4 w-4' />
                    )}
                    {t('globalSearch.debug.panel.refresh')}
                </Button>
                <Button size='sm' variant='outline' onClick={() => setConfirm('cache')}>
                    <Trash2 className='mr-2 h-4 w-4' />
                    {t('globalSearch.debug.panel.clearCache')}
                </Button>
                <Button size='sm' variant='outline' onClick={() => setConfirm('oobe')}>
                    <Rocket className='mr-2 h-4 w-4' />
                    {t('globalSearch.debug.panel.forceOobe')}
                </Button>
            </div>

            {loading && !runtime && !health ? (
                <div className='grid gap-3 sm:grid-cols-2'>
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className='bg-muted/40 h-32 animate-pulse rounded-xl' />
                    ))}
                </div>
            ) : (
                <div className='grid gap-3 sm:grid-cols-2'>
                    <Card icon={Radio} title={t('globalSearch.debug.panel.connectivity')} className='sm:col-span-2'>
                        <ul className='grid gap-2 sm:grid-cols-3'>
                            {connectivity.map(([name, status, detail]) => (
                                <li
                                    key={name}
                                    className='bg-muted/20 flex items-center gap-2.5 rounded-lg border px-3 py-2'
                                >
                                    <StatusDot status={status} />
                                    <div className='min-w-0'>
                                        <p className='text-xs font-medium'>{name}</p>
                                        <p className='text-muted-foreground truncate text-[11px]'>
                                            {detail || fmt(status)}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                    <Card icon={Tag} title={t('globalSearch.debug.panel.build')} delay={60}>
                        <Rows
                            rows={[
                                ['version', runtime?.build?.version ?? health?.versions?.panel],
                                ['upstream', runtime?.build?.upstream],
                                ['commit', runtime?.build?.commit],
                                ['database', health?.versions?.database],
                                ['os', health?.versions?.os],
                                ['setup_completed', runtime?.setup_completed],
                            ]}
                        />
                    </Card>
                    <Card icon={Cpu} title={t('globalSearch.debug.panel.runtime')} delay={120}>
                        <Rows
                            rows={[
                                ['php', runtime?.php?.version],
                                ['sapi', runtime?.php?.sapi],
                                ['memory_limit', runtime?.php?.memory_limit],
                                ['memory_usage', runtime?.php?.memory_usage],
                                ['opcache', runtime?.php?.opcache],
                                ['frankenphp', runtime?.frankenphp?.active],
                                ['workers', runtime?.frankenphp?.workers],
                                ['max_threads', runtime?.frankenphp?.max_threads],
                                ['worker_max_memory', runtime?.frankenphp?.worker_max_memory],
                            ]}
                        />
                    </Card>
                    <Card icon={Flag} title={t('globalSearch.debug.panel.flags')} delay={180}>
                        <Rows rows={Object.entries(runtime?.flags ?? {})} />
                    </Card>
                    <Card icon={Crown} title={t('globalSearch.debug.panel.premium')} delay={240}>
                        <Rows
                            rows={[
                                ['active', premium?.active],
                                ['paid_active', premium?.paid_active],
                                ['free_claim', premium?.free_claim?.active],
                                ['free_expires_at', premium?.free_claim?.expires_at],
                            ]}
                        />
                    </Card>
                    <Card
                        icon={Server}
                        title={t('globalSearch.debug.panel.nodes')}
                        delay={300}
                        className='sm:col-span-2'
                    >
                        {runtime?.nodes?.length ? (
                            <ul className='space-y-2'>
                                {runtime.nodes.map((node) => (
                                    <li key={node.id} className='bg-muted/20 rounded-lg border px-3 py-2'>
                                        <div className='flex items-center justify-between gap-2'>
                                            <p className='text-xs font-medium'>
                                                {node.name} <span className='text-muted-foreground'>#{node.id}</span>
                                            </p>
                                            <span className='bg-primary/10 text-primary rounded-md px-2 py-0.5 font-mono text-[10px]'>
                                                {node.daemon_type}
                                            </span>
                                        </div>
                                        <p className='text-muted-foreground mt-1 flex flex-wrap gap-1 font-mono text-[10px]'>
                                            {node.features.map((f) => (
                                                <span key={f} className='bg-background rounded border px-1.5 py-0.5'>
                                                    {f}
                                                </span>
                                            ))}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className='text-muted-foreground text-xs'>{t('globalSearch.debug.panel.noNodes')}</p>
                        )}
                    </Card>
                    {health === null && runtime === null ? (
                        <p className='text-destructive flex items-center gap-1.5 text-xs sm:col-span-2'>
                            <XCircle className='h-3.5 w-3.5' />
                            {t('globalSearch.debug.panel.loadFailed')}
                        </p>
                    ) : health?.status ? (
                        <p className='text-muted-foreground flex items-center gap-1.5 text-xs sm:col-span-2'>
                            {health.status === 'ok' ? (
                                <CheckCircle2 className='h-3.5 w-3.5 text-emerald-500' />
                            ) : (
                                <Boxes className='h-3.5 w-3.5 text-amber-500' />
                            )}
                            {t('globalSearch.debug.panel.overall', { status: health.status })}
                        </p>
                    ) : null}
                </div>
            )}

            <ConfirmDialog
                open={confirm !== null}
                onOpenChange={(o) => !o && setConfirm(null)}
                title={
                    confirm === 'oobe'
                        ? t('globalSearch.debug.panel.forceOobeTitle')
                        : t('globalSearch.debug.panel.clearCacheTitle')
                }
                description={
                    confirm === 'oobe'
                        ? t('globalSearch.debug.panel.forceOobeBody')
                        : t('globalSearch.debug.panel.clearCacheBody')
                }
                confirmLabel={t('globalSearch.debug.panel.confirm')}
                cancelLabel={t('common.cancel')}
                onConfirm={runConfirmed}
                loading={busy}
                destructive
            />
        </div>
    );
}
