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

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Globe, Laptop, Loader2, LogOut, MonitorSmartphone, Smartphone } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage } from '@/lib/api-errors';
import { formatRelativeTime } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface SessionRow {
    id: number;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
    last_seen_at: string;
    current: boolean;
}

/** Small user agent summary: browser and OS, plus whether it looks like a phone. */
export function describeUserAgent(ua: string | null): { browser: string; os: string; mobile: boolean } {
    const s = ua || '';
    const browser = /Edg\//.test(s)
        ? 'Edge'
        : /OPR\/|Opera/.test(s)
          ? 'Opera'
          : /Firefox\//.test(s)
            ? 'Firefox'
            : /Chrome\//.test(s)
              ? 'Chrome'
              : /Safari\//.test(s)
                ? 'Safari'
                : /curl\//.test(s)
                  ? 'curl'
                  : '';
    const os = /iPhone|iPad|iOS/.test(s)
        ? 'iOS'
        : /Android/.test(s)
          ? 'Android'
          : /Windows/.test(s)
            ? 'Windows'
            : /Mac OS X|Macintosh/.test(s)
              ? 'macOS'
              : /Linux/.test(s)
                ? 'Linux'
                : '';
    return { browser, os, mobile: /Mobile|iPhone|Android/.test(s) };
}

export function ActiveSessionsCard() {
    const { t } = useTranslation();
    const [sessions, setSessions] = useState<SessionRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<number | 'others' | null>(null);

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/user/sessions');
            setSessions(Array.isArray(data?.data?.sessions) ? data.data.sessions : []);
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'account.sessions.load_failed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void load();
    }, [load]);

    const revoke = async (id: number) => {
        setBusyId(id);
        try {
            await axios.delete(`/api/user/sessions/${id}`);
            setSessions((prev) => prev.filter((s) => s.id !== id));
            toast.success(t('account.sessions.revoked'));
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'account.sessions.revoke_failed'));
        } finally {
            setBusyId(null);
        }
    };

    const revokeOthers = async () => {
        setBusyId('others');
        try {
            await axios.post('/api/user/sessions/revoke-others');
            toast.success(t('account.sessions.revoked_others'));
            await load();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'account.sessions.revoke_failed'));
        } finally {
            setBusyId(null);
        }
    };

    const others = sessions.filter((s) => !s.current).length;

    return (
        <div className='fp-surface-inset rounded-xl border p-6'>
            <div className='flex items-start gap-4'>
                <div className='bg-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg'>
                    <MonitorSmartphone className='text-primary h-6 w-6' />
                </div>
                <div className='min-w-0 flex-1 space-y-4'>
                    <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between'>
                        <div>
                            <h4 className='text-foreground text-sm font-medium'>{t('account.sessions.title')}</h4>
                            <p className='text-muted-foreground mt-1 max-w-xl text-sm'>
                                {t('account.sessions.description')}
                            </p>
                        </div>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='shrink-0'
                            onClick={() => void revokeOthers()}
                            loading={busyId === 'others'}
                            disabled={busyId !== null}
                        >
                            {busyId !== 'others' ? <LogOut className='mr-2 h-4 w-4' /> : null}
                            {t('account.sessions.revoke_others')}
                        </Button>
                    </div>

                    {loading ? (
                        <p className='text-muted-foreground flex items-center gap-2 text-sm'>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            {t('account.sessions.loading')}
                        </p>
                    ) : (
                        <ul className='space-y-2'>
                            {sessions.map((s) => {
                                const ua = describeUserAgent(s.user_agent);
                                const Icon = ua.mobile ? Smartphone : ua.browser ? Laptop : Globe;
                                const name =
                                    [ua.browser, ua.os].filter(Boolean).join(' / ') ||
                                    t('account.sessions.unknown_device');
                                return (
                                    <li
                                        key={s.id}
                                        className={cn(
                                            'flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between',
                                            s.current && 'border-primary/30 bg-primary/[0.04]',
                                        )}
                                    >
                                        <div className='flex min-w-0 items-center gap-3'>
                                            <Icon className='text-muted-foreground h-5 w-5 shrink-0' />
                                            <div className='min-w-0'>
                                                <p className='text-foreground flex flex-wrap items-center gap-2 font-medium'>
                                                    <span className='truncate'>{name}</span>
                                                    {s.current ? (
                                                        <span className='bg-primary/10 text-primary rounded-md px-1.5 py-0.5 text-xs font-medium'>
                                                            {t('account.sessions.this_device')}
                                                        </span>
                                                    ) : null}
                                                </p>
                                                <p className='text-muted-foreground mt-0.5 text-xs'>
                                                    {t('account.sessions.meta', {
                                                        ip: s.ip_address || '-',
                                                        seen: s.current
                                                            ? t('account.sessions.active_now')
                                                            : formatRelativeTime(s.last_seen_at),
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        {!s.current ? (
                                            <Button
                                                type='button'
                                                variant='ghost'
                                                size='sm'
                                                className='shrink-0'
                                                onClick={() => void revoke(s.id)}
                                                loading={busyId === s.id}
                                                disabled={busyId !== null}
                                            >
                                                {t('account.sessions.revoke')}
                                            </Button>
                                        ) : null}
                                    </li>
                                );
                            })}
                            {sessions.length === 0 ? (
                                <li className='text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm'>
                                    {t('account.sessions.legacy')}
                                </li>
                            ) : null}
                        </ul>
                    )}
                    {!loading && others === 0 && sessions.length > 0 ? (
                        <p className='text-muted-foreground text-xs'>{t('account.sessions.only_this')}</p>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
