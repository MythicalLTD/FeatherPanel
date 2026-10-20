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

import { useEffect } from 'react';
import { ArrowRightLeft, CheckCircle2, XCircle, Loader2, Folder, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { useFeatherOs } from '../FeatherOsContext';
import type { OsAppProps } from './index';

export default function TransfersApp({ win }: OsAppProps) {
    void win;
    const { t } = useTranslation();
    const { transfers, refreshTransfers, openApp, getServer } = useFeatherOs();

    useEffect(() => {
        void refreshTransfers();
    }, [refreshTransfers]);

    return (
        <div className='flex h-full flex-col'>
            <div className='flex h-10 shrink-0 items-center border-b px-3'>
                <span className='text-muted-foreground flex-1 text-[12px]'>{t('featheros.transfers.hint')}</span>
                <button
                    type='button'
                    className='hover:bg-muted rounded-md p-1'
                    onClick={() => void refreshTransfers()}
                    title={t('featheros.common.refresh')}
                >
                    <RefreshCw className='h-3.5 w-3.5' />
                </button>
            </div>
            <div className='fos-scroll min-h-0 flex-1 overflow-auto p-2'>
                {transfers.map((tr) => {
                    const active = tr.status === 'pending' || tr.status === 'running';
                    return (
                        <div key={tr.uuid} className='hover:bg-muted/50 flex items-start gap-3 rounded-lg px-3 py-2'>
                            <ArrowRightLeft className='text-primary mt-0.5 h-6 w-6 shrink-0' />
                            <div className='min-w-0 flex-1'>
                                <div className='flex items-center gap-1.5 text-[13px] font-medium'>
                                    <span className='truncate'>
                                        {tr.files.length === 1
                                            ? tr.files[0]
                                            : t('featheros.transfers.items', { count: String(tr.files.length) })}
                                    </span>
                                    <span className='text-muted-foreground text-[11px] font-normal'>
                                        {tr.mode === 'move'
                                            ? t('featheros.transfers.mode_move')
                                            : t('featheros.transfers.mode_copy')}
                                    </span>
                                </div>
                                <div className='text-muted-foreground truncate text-[11px]'>
                                    {tr.source_name}:{tr.source_root} → {tr.target_name}:{tr.destination}
                                </div>
                                {active && (
                                    <div className='mt-1.5 flex items-center gap-2'>
                                        <div className='bg-muted h-1.5 flex-1 overflow-hidden rounded-full'>
                                            <div
                                                className='bg-primary h-full rounded-full transition-[width] duration-500'
                                                style={{ width: `${Math.max(3, tr.progress)}%` }}
                                            />
                                        </div>
                                        <span className='text-muted-foreground w-24 truncate text-right text-[10px]'>
                                            {t(`featheros.transfers.stage_${tr.stage}`, { defaultValue: tr.stage })} ·{' '}
                                            {tr.progress}%
                                        </span>
                                    </div>
                                )}
                                {tr.status === 'failed' && tr.error && (
                                    <div className='mt-1 text-[11px] text-red-600 dark:text-red-400'>{tr.error}</div>
                                )}
                            </div>
                            <div className='flex shrink-0 items-center gap-1'>
                                {active ? (
                                    <Loader2 className='text-muted-foreground h-4 w-4 animate-spin' />
                                ) : tr.status === 'completed' ? (
                                    <CheckCircle2 className='h-4 w-4 text-emerald-500' />
                                ) : (
                                    <XCircle className='h-4 w-4 text-red-500' />
                                )}
                                {tr.status === 'completed' && getServer(tr.target_server) && (
                                    <button
                                        type='button'
                                        className={cn('hover:bg-muted rounded-md p-1')}
                                        title={t('featheros.transfers.reveal')}
                                        onClick={() =>
                                            openApp('finder', {
                                                serverUuid: tr.target_server,
                                                props: { path: tr.destination },
                                                newWindow: true,
                                            })
                                        }
                                    >
                                        <Folder className='h-3.5 w-3.5' />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
                {transfers.length === 0 && (
                    <div className='text-muted-foreground py-12 text-center text-sm'>
                        {t('featheros.transfers.empty')}
                    </div>
                )}
            </div>
        </div>
    );
}
