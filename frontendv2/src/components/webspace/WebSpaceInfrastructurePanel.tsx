/*
This file is part of FeatherPanel.
 */

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

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, ChevronDown, CircleAlert, Loader2, RefreshCw, Server } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { useWebSpaceInfrastructure, type InfrastructureCheck } from '@/hooks/useWebSpaceInfrastructure';
import {
    groupInfrastructureChecks,
    infrastructureIssues,
    infrastructureSummary,
    type InfrastructureCategory,
} from '@/lib/webspace-infrastructure';

interface WebSpaceInfrastructurePanelProps {
    webNodeId?: number | string | null;
    ssl?: boolean;
    databaseLimit?: number;
    mailboxLimit?: number;
    hasDomains?: boolean;
    enabled?: boolean;
    scope?: 'admin' | 'user';
    uuidShort?: string;
    variant?: 'full' | 'compact';
    embedded?: boolean;
    className?: string;
    onNodeInfo?: (info: { expectedIps: string[]; proxyProvider?: string | null }) => void;
}

const CATEGORY_ORDER: InfrastructureCategory[] = ['core', 'proxy', 'runtime', 'services', 'console'];

function checkIcon(status: InfrastructureCheck['status']) {
    if (status === 'ok') return <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-500' />;
    if (status === 'warn') return <AlertTriangle className='h-4 w-4 shrink-0 text-amber-500' />;
    return <CircleAlert className='h-4 w-4 shrink-0 text-red-500' />;
}

function StatusBadge({ status }: { status: 'ready' | 'warning' | 'blocked' }) {
    const { t } = useTranslation();
    const styles =
        status === 'ready'
            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20'
            : status === 'warning'
              ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 ring-amber-500/20'
              : 'bg-red-500/15 text-red-700 dark:text-red-300 ring-red-500/20';
    const label =
        status === 'ready'
            ? t('webSpaces.infrastructure.statusReady')
            : status === 'warning'
              ? t('webSpaces.infrastructure.statusWarning')
              : t('webSpaces.infrastructure.statusBlocked');

    return (
        <span
            className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1', styles)}
        >
            {label}
        </span>
    );
}

export function WebSpaceInfrastructurePanel({
    webNodeId,
    ssl = false,
    databaseLimit = 0,
    mailboxLimit = 0,
    hasDomains = false,
    enabled = true,
    scope = 'admin',
    uuidShort,
    variant = 'full',
    embedded = false,
    className,
    onNodeInfo,
}: WebSpaceInfrastructurePanelProps) {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(variant !== 'compact');
    const { data, loading, error, refresh } = useWebSpaceInfrastructure({
        webNodeId,
        ssl,
        databaseLimit,
        mailboxLimit,
        hasDomains,
        enabled,
        scope,
        uuidShort,
    });

    const summary = useMemo(() => data?.summary ?? (data?.checks ? infrastructureSummary(data.checks) : null), [data]);
    const issues = useMemo(() => (data?.checks ? infrastructureIssues(data.checks) : []), [data]);
    const grouped = useMemo(
        () => (data?.checks ? groupInfrastructureChecks(variant === 'compact' ? issues : data.checks) : null),
        [data, issues, variant],
    );

    useEffect(() => {
        if (!data?.node || !onNodeInfo) return;
        onNodeInfo({
            expectedIps: data.node.expected_ips ?? [],
            proxyProvider: data.node.proxy_provider,
        });
    }, [data?.node, onNodeInfo]);

    const labelForCheck = (check: InfrastructureCheck) => {
        const key = `webSpaces.infrastructure.checks.${check.id}.message`;
        const translated = t(key);
        return translated === key ? check.message : translated;
    };

    const detailForCheck = (check: InfrastructureCheck) => {
        const key = `webSpaces.infrastructure.checks.${check.id}.detail`;
        const translated = t(key);
        if (translated !== key) return translated;
        return check.detail;
    };

    if (!enabled) return null;

    if (variant === 'compact' && data?.status === 'ready' && !loading) {
        return (
            <div
                className={cn(
                    'flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm',
                    className,
                )}
            >
                <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-500' />
                <span className='font-medium text-emerald-800 dark:text-emerald-200'>
                    {t('webSpaces.infrastructure.compactReady')}
                </span>
            </div>
        );
    }

    if (variant === 'compact' && !expanded && issues.length > 0 && data) {
        return (
            <button
                type='button'
                onClick={() => setExpanded(true)}
                className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                    data.status === 'blocked'
                        ? 'border-red-500/30 bg-red-500/10'
                        : 'border-amber-500/30 bg-amber-500/10',
                    className,
                )}
            >
                <div className='flex min-w-0 items-center gap-2'>
                    {data.status === 'blocked' ? (
                        <CircleAlert className='h-4 w-4 shrink-0 text-red-500' />
                    ) : (
                        <AlertTriangle className='h-4 w-4 shrink-0 text-amber-500' />
                    )}
                    <span className='font-medium'>
                        {t('webSpaces.infrastructure.compactIssues', { count: String(issues.length) })}
                    </span>
                </div>
                <ChevronDown className='text-muted-foreground h-4 w-4 shrink-0' />
            </button>
        );
    }

    return (
        <div
            className={cn(
                !embedded && 'border-border/50 bg-muted/20 rounded-xl border',
                data?.status === 'blocked' && !embedded && 'border-red-500/30 bg-red-500/5',
                data?.status === 'warning' && !embedded && 'border-amber-500/30 bg-amber-500/5',
                className,
            )}
        >
            {!embedded && (
                <div className='flex items-start justify-between gap-3 p-4'>
                    <div className='min-w-0 flex-1 space-y-2'>
                        <div className='flex flex-wrap items-center gap-2'>
                            <h4 className='flex items-center gap-2 text-sm font-semibold'>
                                <Server className='text-primary h-4 w-4' />
                                {t('webSpaces.infrastructure.title')}
                            </h4>
                            {data && <StatusBadge status={data.status} />}
                        </div>
                        <p className='text-muted-foreground text-xs'>{t('webSpaces.infrastructure.subtitle')}</p>
                        {summary && (
                            <p className='text-muted-foreground text-xs'>
                                {t('webSpaces.infrastructure.summaryLine', {
                                    ok: String(summary.ok),
                                    warn: String(summary.warn),
                                    fail: String(summary.fail),
                                })}
                            </p>
                        )}
                    </div>
                    <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8 shrink-0'
                        title={t('webSpaces.infrastructure.refresh')}
                        onClick={() => void refresh()}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <RefreshCw className='h-4 w-4' />}
                    </Button>
                </div>
            )}

            {embedded && (
                <div className='mb-3 flex items-center justify-between gap-2'>
                    {data && <StatusBadge status={data.status} />}
                    <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='ml-auto h-8 gap-2'
                        onClick={() => void refresh()}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : <RefreshCw className='h-4 w-4' />}
                        {t('webSpaces.infrastructure.refresh')}
                    </Button>
                </div>
            )}

            {error && <p className='text-destructive px-4 pb-4 text-sm'>{t('webSpaces.infrastructure.fetchFailed')}</p>}

            {loading && !data && (
                <p className='text-muted-foreground flex items-center gap-2 px-4 pb-4 text-sm'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    {t('webSpaces.infrastructure.loading')}
                </p>
            )}

            {grouped && (
                <div className={cn('space-y-4', !embedded && 'border-t px-4 pt-3 pb-4')}>
                    {CATEGORY_ORDER.map((category) => {
                        const items = grouped[category];
                        if (!items.length) return null;
                        return (
                            <div key={category}>
                                <p className='text-muted-foreground mb-2 text-[10px] font-bold tracking-wider uppercase'>
                                    {t(`webSpaces.infrastructure.categories.${category}`)}
                                </p>
                                <ul className='divide-border divide-y overflow-hidden rounded-lg border text-sm'>
                                    {items.map((check) => (
                                        <li
                                            key={check.id}
                                            className={cn(
                                                'flex gap-3 px-3 py-2.5',
                                                check.status === 'fail' && 'bg-red-500/5',
                                                check.status === 'warn' && 'bg-amber-500/5',
                                            )}
                                        >
                                            <div className='mt-0.5'>{checkIcon(check.status)}</div>
                                            <div className='min-w-0 flex-1 space-y-1'>
                                                <p className='leading-snug font-medium'>{labelForCheck(check)}</p>
                                                {detailForCheck(check) && (
                                                    <p className='text-muted-foreground text-xs leading-relaxed'>
                                                        {detailForCheck(check)}
                                                    </p>
                                                )}
                                                {check.action && (
                                                    <Button
                                                        asChild
                                                        variant='outline'
                                                        size='sm'
                                                        className='mt-1 h-8 rounded-lg text-xs'
                                                    >
                                                        <Link href={check.action.href}>{check.action.label}</Link>
                                                    </Button>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            )}

            {data && data.status !== 'ready' && variant === 'full' && (
                <div className='border-t px-4 py-3'>
                    <p className='text-muted-foreground text-xs leading-relaxed'>
                        {data.status === 'blocked'
                            ? t('webSpaces.infrastructure.blockedHelp')
                            : t('webSpaces.infrastructure.warningHelp')}
                    </p>
                </div>
            )}
        </div>
    );
}
