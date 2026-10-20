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

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { ArrowRightLeft, CheckCircle2, Loader2, X, XCircle } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

export interface FileTransferJob {
    uuid: string;
    mode: 'copy' | 'move';
    files: string[];
    destination: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    stage: string;
    error: string | null;
    source_server: string;
    source_name: string;
    target_server: string;
    target_name: string;
}

/** Live list of cross server transfers that touch this server. */
export function FileTransfersPanel({
    serverUuid,
    refreshKey,
    onCompleted,
}: {
    serverUuid: string;
    refreshKey: number;
    onCompleted: () => void;
}) {
    const { t } = useTranslation();
    const [jobs, setJobs] = useState<FileTransferJob[]>([]);
    const [dismissed, setDismissed] = useState<string[]>([]);
    const seenDone = useRef<Set<string>>(new Set());

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/user/files/transfers');
            const list: FileTransferJob[] = (data.data.transfers || []).filter(
                (j: FileTransferJob) => j.source_server === serverUuid || j.target_server === serverUuid,
            );
            list.forEach((j) => {
                if (j.status === 'completed' && !seenDone.current.has(j.uuid)) {
                    if (seenDone.current.size > 0 || refreshKey > 0) onCompleted();
                    seenDone.current.add(j.uuid);
                }
            });
            setJobs(list);
        } catch {
            /* keep the last state */
        }
    }, [serverUuid, onCompleted, refreshKey]);

    useEffect(() => {
        void load();
    }, [load]);

    const active = jobs.some((j) => j.status === 'pending' || j.status === 'running');
    useEffect(() => {
        if (!active) return;
        const id = setInterval(() => void load(), 2500);
        return () => clearInterval(id);
    }, [active, load]);

    const visible = jobs.filter((j) => !dismissed.includes(j.uuid)).slice(0, 5);
    if (visible.length === 0) return null;

    return (
        <div className='fp-surface space-y-2 rounded-xl border p-3'>
            <p className='flex items-center gap-2 text-sm font-semibold'>
                <ArrowRightLeft className='text-primary h-4 w-4' />
                {t('files.transfer.panel_title')}
            </p>
            {visible.map((j) => {
                const running = j.status === 'pending' || j.status === 'running';
                return (
                    <div key={j.uuid} className='fp-surface-inset rounded-lg border px-3 py-2'>
                        <div className='flex items-center gap-2 text-sm'>
                            {running ? (
                                <Loader2 className='text-primary h-4 w-4 shrink-0 animate-spin' />
                            ) : j.status === 'completed' ? (
                                <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-500' />
                            ) : (
                                <XCircle className='h-4 w-4 shrink-0 text-red-500' />
                            )}
                            <span className='min-w-0 flex-1 truncate'>
                                {t(j.mode === 'move' ? 'files.transfer.job_move' : 'files.transfer.job_copy', {
                                    count: String(j.files.length),
                                    source: j.source_name,
                                    target: j.target_name,
                                })}
                            </span>
                            <span className='text-muted-foreground shrink-0 text-xs'>
                                {t(`files.transfer.stages.${j.stage}`)}
                            </span>
                            {!running && (
                                <button
                                    type='button'
                                    onClick={() => setDismissed((d) => [...d, j.uuid])}
                                    className='text-muted-foreground hover:text-foreground rounded-md p-1'
                                    aria-label={t('common.close')}
                                >
                                    <X className='h-3.5 w-3.5' />
                                </button>
                            )}
                        </div>
                        <div className='bg-muted mt-2 h-1.5 overflow-hidden rounded-full'>
                            <div
                                className={cn(
                                    'h-full rounded-full transition-all',
                                    j.status === 'failed' ? 'bg-red-500' : 'bg-primary',
                                )}
                                style={{ width: `${j.status === 'failed' ? 100 : j.progress}%` }}
                            />
                        </div>
                        {j.error && <p className='mt-1.5 text-xs text-red-500'>{j.error}</p>}
                    </div>
                );
            })}
        </div>
    );
}
