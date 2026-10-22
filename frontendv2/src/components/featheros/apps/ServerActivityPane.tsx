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
import axios from 'axios';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { formatRelativeTime } from '@/lib/dateUtils';
import { useFeatherOs } from '../FeatherOsContext';
import type { OsAppProps } from './index';

interface ActivityRow {
    id: number;
    event?: string;
    message?: string | null;
    timestamp?: string;
    created_at?: string;
    user?: { username?: string } | null;
    ip?: string | null;
}

const PAGE_SIZE = 30;

/** Server activity log, same endpoint as the panel activities page. */
export default function ServerActivityPane({ win }: OsAppProps) {
    const { t } = useTranslation();
    const { errorMessage } = useFeatherOs();
    const uuid = win.serverUuid as string;
    const [rows, setRows] = useState<ActivityRow[]>([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [loading, setLoading] = useState(true);

    const load = useCallback(
        async (target: number) => {
            setLoading(true);
            try {
                const { data } = await axios.get(`/api/user/servers/${uuid}/activities`, {
                    params: { page: target, per_page: PAGE_SIZE },
                });
                const list = data?.data?.activities?.data ?? data?.data?.activities ?? [];
                setRows(Array.isArray(list) ? list : []);
                const p = data?.data?.pagination ?? {};
                setPages(p.total_pages || p.last_page || 1);
            } catch (error) {
                toast.error(errorMessage(error));
            } finally {
                setLoading(false);
            }
        },
        [uuid, errorMessage],
    );

    useEffect(() => {
        void load(page);
    }, [load, page]);

    return (
        <div className='flex h-full min-h-0 flex-col'>
            <div className='fos-server-ws-toolbar'>
                <span className='text-[13px] font-semibold'>{t('featheros.server_workspace.section_activity')}</span>
                <div className='ml-auto flex items-center gap-1'>
                    <button
                        type='button'
                        className='fos-server-ws-icon'
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        <ChevronLeft className='h-4 w-4' />
                    </button>
                    <span className='text-[12px] text-[var(--fos-secondary)] tabular-nums'>
                        {page} / {pages}
                    </span>
                    <button
                        type='button'
                        className='fos-server-ws-icon'
                        disabled={page >= pages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        <ChevronRight className='h-4 w-4' />
                    </button>
                    <button type='button' className='fos-server-ws-icon' onClick={() => void load(page)}>
                        <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
                    </button>
                </div>
            </div>
            <div className='fos-scroll min-h-0 flex-1 overflow-y-auto'>
                {loading && rows.length === 0 ? (
                    <div className='flex h-full items-center justify-center'>
                        <Loader2 className='h-5 w-5 animate-spin opacity-60' />
                    </div>
                ) : rows.length === 0 ? (
                    <div className='flex h-full items-center justify-center text-[13px] text-[var(--fos-secondary)]'>
                        {t('featheros.server_workspace.activity_empty')}
                    </div>
                ) : (
                    <ul className='divide-y divide-[var(--fos-hairline)]'>
                        {rows.map((r) => {
                            const when = r.timestamp ?? r.created_at;
                            return (
                                <li key={r.id} className='flex items-start gap-3 px-4 py-2.5 text-[12.5px]'>
                                    <div className='min-w-0 flex-1'>
                                        <div className='truncate font-medium'>{r.event ?? r.message ?? ''}</div>
                                        {r.message && r.event && (
                                            <div className='truncate text-[var(--fos-secondary)]'>{r.message}</div>
                                        )}
                                    </div>
                                    <div className='shrink-0 text-right text-[11.5px] text-[var(--fos-secondary)]'>
                                        <div>{r.user?.username ?? t('featheros.server_workspace.system')}</div>
                                        {when && <div>{formatRelativeTime(when)}</div>}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
