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

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
    ArrowLeft,
    ArrowRight,
    BookOpen,
    CheckCircle2,
    CircleAlert,
    ExternalLink,
    Loader2,
    Sparkles,
} from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

interface WizardStep {
    step: number;
    id: string;
    status: string;
    detail?: string | null;
    action_href?: string | null;
    action_label?: string | null;
    doc_anchor?: string | null;
}

interface WizardPayload {
    tier: string;
    score: number;
    doc_path: string;
    sample_node_id?: number | null;
    steps: WizardStep[];
}

interface WebSpaceHostingSetupWizardProps {
    webNodeId?: number | string | null;
    className?: string;
}

export function WebSpaceHostingSetupWizard({ webNodeId, className }: WebSpaceHostingSetupWizardProps) {
    const { t } = useTranslation();
    const [data, setData] = useState<WizardPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [current, setCurrent] = useState(0);

    const storageKey = useMemo(
        () => `fq-hosting-wizard-${webNodeId != null && String(webNodeId) !== '' ? webNodeId : 'global'}`,
        [webNodeId],
    );

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const nodeId = webNodeId != null && String(webNodeId) !== '' ? Number(webNodeId) : 0;
            const { data: res } = await axios.get('/api/admin/webspaces/hosting-setup/wizard', {
                params: nodeId > 0 ? { web_node_id: nodeId } : undefined,
            });
            const payload = (res.data?.data ?? res.data) as WizardPayload;
            setData(payload);
            const saved = Number(localStorage.getItem(storageKey) || '0');
            const firstIncomplete = payload.steps.findIndex((s) => s.status !== 'ready');
            setCurrent(Math.max(0, firstIncomplete >= 0 ? firstIncomplete : saved > 0 ? saved - 1 : 0));
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [webNodeId, storageKey]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (data && data.steps[current]) {
            localStorage.setItem(storageKey, String(data.steps[current].step));
        }
    }, [current, data, storageKey]);

    const step = data?.steps[current];
    const label = (id: string) => {
        const key = `webSpaces.hosting.setup.${id}`;
        const translated = t(key);
        return translated === key ? id : translated;
    };

    if (loading && !data) {
        return (
            <div
                className={cn('border-border/50 bg-card/60 flex items-center gap-2 rounded-2xl border p-5', className)}
            >
                <Loader2 className='h-4 w-4 animate-spin' />
                <span className='text-muted-foreground text-sm'>{t('webSpaces.hosting.loading')}</span>
            </div>
        );
    }

    if (!data || !step) {
        return null;
    }

    const docUrl = step.doc_anchor
        ? `https://github.com/MythicalSystems/FeatherPanel/blob/main/${data.doc_path}#${step.doc_anchor}`
        : `https://github.com/MythicalSystems/FeatherPanel/blob/main/${data.doc_path}`;

    return (
        <div className={cn('border-border/50 bg-card/60 overflow-hidden rounded-2xl border shadow-sm', className)}>
            <div className='flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between'>
                <div className='space-y-2'>
                    <div className='flex flex-wrap items-center gap-2'>
                        <Sparkles className='text-primary h-5 w-5' />
                        <h3 className='text-base font-semibold'>{t('webSpaces.hosting.wizardTitle')}</h3>
                        <span className='text-muted-foreground text-xs'>
                            {t('webSpaces.hosting.wizardProgress', {
                                current: String(step.step),
                                total: String(data.steps.length),
                            })}
                        </span>
                    </div>
                    <p className='text-muted-foreground text-sm'>{t('webSpaces.hosting.wizardSubtitle')}</p>
                </div>
                <Button type='button' variant='outline' size='sm' onClick={() => void load()} disabled={loading}>
                    {loading ? <Loader2 className='h-4 w-4 animate-spin' /> : t('webSpaces.hosting.refresh')}
                </Button>
            </div>

            <div className='grid gap-4 p-5 lg:grid-cols-[220px_1fr]'>
                <ol className='space-y-1 text-sm'>
                    {data.steps.map((item, idx) => (
                        <li key={item.id}>
                            <button
                                type='button'
                                onClick={() => setCurrent(idx)}
                                className={cn(
                                    'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                                    idx === current ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60',
                                )}
                            >
                                {item.status === 'ready' ? (
                                    <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-500' />
                                ) : (
                                    <CircleAlert className='h-4 w-4 shrink-0 text-amber-500' />
                                )}
                                <span className='truncate'>{label(item.id)}</span>
                            </button>
                        </li>
                    ))}
                </ol>

                <div className='border-border/40 bg-muted/20 space-y-4 rounded-xl border p-4'>
                    <div className='flex items-start gap-3'>
                        {step.status === 'ready' ? (
                            <CheckCircle2 className='mt-0.5 h-5 w-5 shrink-0 text-emerald-500' />
                        ) : (
                            <CircleAlert className='mt-0.5 h-5 w-5 shrink-0 text-amber-500' />
                        )}
                        <div className='min-w-0 flex-1'>
                            <h4 className='font-semibold'>{label(step.id)}</h4>
                            {step.detail && <p className='text-muted-foreground mt-1 text-sm'>{step.detail}</p>}
                        </div>
                    </div>

                    <div className='flex flex-wrap gap-2'>
                        {step.action_href && (
                            <Button asChild size='sm'>
                                <Link href={step.action_href}>
                                    {step.action_label || t('webSpaces.hosting.wizardOpenStep')}
                                    <ExternalLink className='ml-2 h-4 w-4' />
                                </Link>
                            </Button>
                        )}
                        <Button asChild variant='outline' size='sm'>
                            <a href={docUrl} target='_blank' rel='noreferrer'>
                                <BookOpen className='mr-2 h-4 w-4' />
                                {t('webSpaces.hosting.wizardReadDocs')}
                            </a>
                        </Button>
                    </div>

                    <div className='flex flex-wrap items-center justify-between gap-2 border-t pt-4'>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            disabled={current <= 0}
                            onClick={() => setCurrent((v) => Math.max(0, v - 1))}
                        >
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('webSpaces.hosting.wizardBack')}
                        </Button>
                        <Button
                            type='button'
                            size='sm'
                            disabled={current >= data.steps.length - 1}
                            onClick={() => setCurrent((v) => Math.min(data.steps.length - 1, v + 1))}
                        >
                            {t('webSpaces.hosting.wizardNext')}
                            <ArrowRight className='ml-2 h-4 w-4' />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
