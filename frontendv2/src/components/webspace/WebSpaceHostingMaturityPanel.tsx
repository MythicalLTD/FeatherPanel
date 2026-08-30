/*
This file is part of FeatherPanel.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    CheckCircle2,
    CircleAlert,
    Clock,
    Loader2,
    RefreshCw,
    Rocket,
    Sparkles,
    Wrench,
} from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { useWebSpaceHostingMaturity } from '@/hooks/useWebSpaceHostingMaturity';

interface WebSpaceHostingMaturityPanelProps {
    webNodeId?: number | string | null;
    className?: string;
    defaultExpanded?: boolean;
}

function tierStyles(tier: string) {
    if (tier === 'production') return 'from-emerald-500/20 to-emerald-500/5 text-emerald-700 dark:text-emerald-300';
    if (tier === 'staging') return 'from-amber-500/20 to-amber-500/5 text-amber-800 dark:text-amber-300';
    return 'from-red-500/20 to-red-500/5 text-red-700 dark:text-red-300';
}

export function WebSpaceHostingMaturityPanel({
    webNodeId,
    className,
    defaultExpanded = true,
}: WebSpaceHostingMaturityPanelProps) {
    const { t } = useTranslation();
    const { data, loading, error, refresh } = useWebSpaceHostingMaturity(webNodeId);
    const [showRoadmap, setShowRoadmap] = useState(defaultExpanded);

    const label = (prefix: string, id: string, fallback?: string | null) => {
        const key = `${prefix}.${id}`;
        const translated = t(key);
        return translated === key ? (fallback ?? id) : translated;
    };

    return (
        <div className={cn('border-border/50 bg-card/60 overflow-hidden rounded-2xl border shadow-sm', className)}>
            <div className='flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between'>
                <div className='min-w-0 flex-1 space-y-2'>
                    <div className='flex flex-wrap items-center gap-2'>
                        <Rocket className='text-primary h-5 w-5' />
                        <h3 className='text-base font-semibold'>{t('webSpaces.hosting.title')}</h3>
                        {data && (
                            <span
                                className={cn(
                                    'rounded-full bg-gradient-to-r px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ring-white/10',
                                    tierStyles(data.tier),
                                )}
                            >
                                {t(`webSpaces.hosting.tiers.${data.tier}`)}
                            </span>
                        )}
                    </div>
                    <p className='text-muted-foreground text-sm leading-relaxed'>{t('webSpaces.hosting.subtitle')}</p>
                </div>
                <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='shrink-0 gap-2'
                    onClick={() => void refresh()}
                    disabled={loading}
                >
                    {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <RefreshCw className='h-4 w-4' />}
                    {t('webSpaces.hosting.refresh')}
                </Button>
            </div>

            {error && <p className='text-destructive px-5 pb-4 text-sm'>{t('webSpaces.hosting.fetchFailed')}</p>}

            {loading && !data && (
                <p className='text-muted-foreground flex items-center gap-2 px-5 pb-5 text-sm'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    {t('webSpaces.hosting.loading')}
                </p>
            )}

            {data && (
                <>
                    <div className='px-5 pb-5'>
                        <div className='mb-2 flex items-end justify-between gap-3'>
                            <div>
                                <p className='text-3xl font-bold tabular-nums'>{data.score}%</p>
                                <p className='text-muted-foreground text-xs'>
                                    {t('webSpaces.hosting.scoreHelp', {
                                        ready: String(data.summary.ready),
                                        total: String(data.summary.ready + data.summary.setup),
                                    })}
                                </p>
                            </div>
                            <p className='text-muted-foreground max-w-xs text-right text-xs leading-relaxed'>
                                {t('webSpaces.hosting.scoreCaption')}
                            </p>
                        </div>
                        <div className='bg-muted h-2 overflow-hidden rounded-full'>
                            <div
                                className={cn(
                                    'h-full rounded-full transition-all',
                                    data.score >= 85
                                        ? 'bg-emerald-500'
                                        : data.score >= 55
                                          ? 'bg-amber-500'
                                          : 'bg-red-500',
                                )}
                                style={{ width: `${Math.max(4, data.score)}%` }}
                            />
                        </div>
                    </div>

                    <div className='grid gap-4 border-t p-5 lg:grid-cols-2'>
                        <section>
                            <h4 className='mb-3 flex items-center gap-2 text-sm font-semibold'>
                                <Wrench className='text-primary h-4 w-4' />
                                {t('webSpaces.hosting.setupTitle')}
                            </h4>
                            <ul className='divide-border divide-y rounded-xl border text-sm'>
                                {data.setup.map((item) => (
                                    <li key={item.id} className='flex gap-3 px-3 py-2.5'>
                                        {item.status === 'ready' ? (
                                            <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0 text-emerald-500' />
                                        ) : (
                                            <CircleAlert className='mt-0.5 h-4 w-4 shrink-0 text-amber-500' />
                                        )}
                                        <div className='min-w-0 flex-1'>
                                            <p className='font-medium'>{label('webSpaces.hosting.setup', item.id)}</p>
                                            {item.detail && (
                                                <p className='text-muted-foreground mt-0.5 text-xs'>{item.detail}</p>
                                            )}
                                            {item.action && (
                                                <Button asChild variant='link' className='mt-1 h-auto p-0 text-xs'>
                                                    <Link href={item.action.href}>{item.action.label}</Link>
                                                </Button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section>
                            <h4 className='mb-3 flex items-center gap-2 text-sm font-semibold'>
                                <Sparkles className='text-primary h-4 w-4' />
                                {t('webSpaces.hosting.builtinTitle')}
                            </h4>
                            <ul className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                                {data.builtin.map((item) => (
                                    <li
                                        key={item.id}
                                        className='bg-muted/30 border-border/40 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm'
                                    >
                                        <CheckCircle2
                                            className={cn(
                                                'h-4 w-4 shrink-0',
                                                item.status === 'ready' ? 'text-emerald-500' : 'text-amber-500',
                                            )}
                                        />
                                        <span>{label('webSpaces.hosting.builtin', item.id)}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    </div>

                    <div className='border-t px-5 py-4'>
                        <button
                            type='button'
                            className='flex w-full items-center justify-between gap-2 text-left'
                            onClick={() => setShowRoadmap((v) => !v)}
                        >
                            <span className='flex items-center gap-2 text-sm font-semibold'>
                                <Clock className='text-muted-foreground h-4 w-4' />
                                {t('webSpaces.hosting.roadmapTitle')}
                                <span className='text-muted-foreground text-xs font-normal'>
                                    ({data.roadmap.length} {t('webSpaces.hosting.roadmapCount')})
                                </span>
                            </span>
                            <span className='text-muted-foreground text-xs'>{showRoadmap ? '−' : '+'}</span>
                        </button>
                        {showRoadmap && (
                            <div className='mt-3 space-y-2'>
                                <p className='text-muted-foreground text-xs leading-relaxed'>
                                    {t('webSpaces.hosting.roadmapHelp')}
                                </p>
                                <ul className='grid gap-2 sm:grid-cols-2'>
                                    {data.roadmap.map((item) => (
                                        <li
                                            key={item.id}
                                            className='bg-muted/20 border-border/40 rounded-lg border px-3 py-2 text-sm'
                                        >
                                            <p className='font-medium'>{label('webSpaces.hosting.roadmap', item.id)}</p>
                                            <p className='text-muted-foreground mt-0.5 text-xs'>
                                                {label('webSpaces.hosting.roadmapDetail', item.id)}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
