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

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { CheckCircle2, Circle, Loader2, ListChecks, X } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

type StepState = 'checking' | 'done' | 'todo';

interface NodeSetupChecklistProps {
    nodeId: string;
    /** Switch the node page to a tab ("wings", "allocations"). */
    onOpenTab: (tab: string) => void;
    /** Changes when the user switches tabs, so progress refreshes after e.g. adding allocations. */
    refreshKey?: string;
}

const dismissKey = (nodeId: string) => `fp:node-setup-dismissed:${nodeId}`;

/**
 * Setup guide on a node's page until it can host servers: Wings reachable, at least one
 * allocation, a first server. Hides itself when everything is done, or when dismissed.
 */
export function NodeSetupChecklist({ nodeId, onOpenTab, refreshKey }: NodeSetupChecklistProps) {
    const { t } = useTranslation();
    const [dismissed, setDismissed] = useState(true);
    const [wings, setWings] = useState<StepState>('checking');
    const [allocations, setAllocations] = useState<number | null>(null);
    const [servers, setServers] = useState<number | null>(null);

    useEffect(() => {
        try {
            setDismissed(window.localStorage.getItem(dismissKey(nodeId)) === '1');
        } catch {
            setDismissed(false);
        }
    }, [nodeId]);

    const load = useCallback(async () => {
        const count = async (url: string, params: Record<string, unknown>) => {
            try {
                const { data } = await axios.get(url, { params: { ...params, page: 1, limit: 1 } });
                return Number(data?.data?.pagination?.total_records ?? 0);
            } catch {
                return null;
            }
        };
        const [wingsOk, allocationCount, serverCount] = await Promise.all([
            axios
                .get(`/api/wings/admin/node/${nodeId}/system`)
                .then(({ data }) => data?.success !== false)
                .catch(() => false),
            count('/api/admin/allocations', { node_id: nodeId }),
            count('/api/admin/servers', { node_id: nodeId }),
        ]);
        setWings(wingsOk ? 'done' : 'todo');
        setAllocations(allocationCount);
        setServers(serverCount);
    }, [nodeId]);

    useEffect(() => {
        if (dismissed) return;
        void load();
    }, [dismissed, load, refreshKey]);

    if (dismissed) return null;

    const allocationState: StepState = allocations === null ? 'checking' : allocations > 0 ? 'done' : 'todo';
    const serverState: StepState = servers === null ? 'checking' : servers > 0 ? 'done' : 'todo';
    const states = [wings, allocationState, serverState];
    if (states.every((s) => s === 'done')) return null;
    const doneCount = states.filter((s) => s === 'done').length;

    const dismiss = () => {
        try {
            window.localStorage.setItem(dismissKey(nodeId), '1');
        } catch {
            // ignore: hidden for this visit anyway
        }
        setDismissed(true);
    };

    const steps: Array<{ state: StepState; title: string; description: string; action: React.ReactNode }> = [
        {
            state: wings,
            title: t('admin.node.setup.wings.title'),
            description: wings === 'done' ? t('admin.node.setup.wings.done') : t('admin.node.setup.wings.description'),
            action:
                wings === 'done' ? null : (
                    <Button size='sm' variant='outline' onClick={() => onOpenTab('wings')}>
                        {t('admin.node.setup.wings.action')}
                    </Button>
                ),
        },
        {
            state: allocationState,
            title: t('admin.node.setup.allocations.title'),
            description:
                allocationState === 'done'
                    ? t('admin.node.setup.allocations.done', { count: String(allocations ?? 0) })
                    : t('admin.node.setup.allocations.description'),
            action:
                allocationState === 'done' ? null : (
                    <Button size='sm' variant='outline' onClick={() => onOpenTab('allocations')}>
                        {t('admin.node.setup.allocations.action')}
                    </Button>
                ),
        },
        {
            state: serverState,
            title: t('admin.node.setup.server.title'),
            description: t('admin.node.setup.server.description'),
            action:
                serverState === 'done' ? null : (
                    <Button size='sm' asChild>
                        <Link href='/admin/servers/create'>{t('admin.node.setup.server.action')}</Link>
                    </Button>
                ),
        },
    ];

    return (
        <section
            aria-labelledby='node-setup-title'
            className='bg-card border-border rounded-xl border p-4 shadow-xs sm:p-5'
        >
            <div className='mb-3 flex items-start justify-between gap-3'>
                <div className='flex min-w-0 items-center gap-3'>
                    <div className='bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg'>
                        <ListChecks className='h-5 w-5' />
                    </div>
                    <div className='min-w-0'>
                        <h2 id='node-setup-title' className='text-base font-semibold tracking-tight'>
                            {t('admin.node.setup.title')}
                        </h2>
                        <p className='text-muted-foreground text-sm'>
                            {t('admin.node.setup.progress', { done: String(doneCount), total: String(states.length) })}
                        </p>
                    </div>
                </div>
                <Button
                    size='icon'
                    variant='ghost'
                    onClick={dismiss}
                    aria-label={t('admin.node.setup.dismiss')}
                    title={t('admin.node.setup.dismiss')}
                >
                    <X className='h-4 w-4' />
                </Button>
            </div>
            <ol className='divide-border divide-y'>
                {steps.map((step, i) => (
                    <li key={i} className='flex flex-wrap items-center gap-3 py-3 first:pt-1 last:pb-0'>
                        {step.state === 'done' ? (
                            <CheckCircle2
                                className='h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400'
                                aria-hidden
                            />
                        ) : step.state === 'checking' ? (
                            <Loader2 className='text-muted-foreground h-5 w-5 shrink-0 animate-spin' aria-hidden />
                        ) : (
                            <Circle className='text-muted-foreground h-5 w-5 shrink-0' aria-hidden />
                        )}
                        <div className='min-w-48 flex-1'>
                            <p className={cn('text-sm font-medium', step.state === 'done' && 'text-muted-foreground')}>
                                <span className='sr-only'>
                                    {step.state === 'done'
                                        ? t('admin.node.setup.stateDone')
                                        : t('admin.node.setup.stateTodo')}
                                </span>
                                {step.title}
                            </p>
                            <p className='text-muted-foreground text-sm'>{step.description}</p>
                        </div>
                        {step.action && <div className='ml-8 sm:ml-0'>{step.action}</div>}
                    </li>
                ))}
            </ol>
        </section>
    );
}
