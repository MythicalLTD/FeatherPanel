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
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, History, RefreshCw, RotateCcw } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatDateTimeInTz, formatRelativeTime } from '@/lib/dateUtils';
import { getApiErrorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/utils';
import { Button } from '@/components/featherui/Button';
import { ListEmptyState } from '@/components/featherui/ListEmptyState';
import { ListPagination } from '@/components/featherui/ListPagination';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { Select } from '@/components/ui/select-native';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export interface WebhookDelivery {
    id: number;
    webhook_id: number;
    event_id: string;
    event: string;
    status: 'pending' | 'delivered' | 'failed';
    attempts: number;
    max_attempts: number;
    status_code: number | null;
    error: string | null;
    duration_ms: number | null;
    next_retry_at: string | null;
    last_attempt_at: string | null;
    delivered_at: string | null;
    redelivery_of: number | null;
    created_at: string;
    response_snippet?: string | null;
    payload?: Record<string, unknown> | null;
}

export const DELIVERY_TONE: Record<string, string> = {
    delivered: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    pending: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    failed: 'border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400',
};

export function eventLabel(event: string, t: (key: string) => string): string {
    const key = `admin.webhooks.events.${event.replace('.', '_')}`;
    const label = t(key);
    return label === key ? event : label;
}

/** Delivery log of one webhook, with details and redelivery. */
export function WebhookDeliveriesSheet({
    webhookId,
    webhookUrl,
    open,
    onOpenChange,
    canManage,
}: {
    webhookId: number | null;
    webhookUrl: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    canManage: boolean;
}) {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const [rows, setRows] = useState<WebhookDelivery[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [status, setStatus] = useState('');
    const [expanded, setExpanded] = useState<number | null>(null);
    const [details, setDetails] = useState<Record<number, WebhookDelivery>>({});
    const [redelivering, setRedelivering] = useState<number | null>(null);

    const load = useCallback(async () => {
        if (!webhookId) return;
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/admin/webhooks/${webhookId}/deliveries`, {
                params: { page, limit: 20, status: status || undefined },
            });
            setRows((data?.data?.items || []) as WebhookDelivery[]);
            setTotalPages(data?.data?.pagination?.total_pages || 1);
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.webhooks.deliveries.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [webhookId, page, status, t]);

    useEffect(() => {
        if (open) void load();
    }, [open, load]);

    useEffect(() => {
        setPage(1);
        setStatus('');
        setExpanded(null);
        setDetails({});
    }, [webhookId]);

    const toggle = async (row: WebhookDelivery) => {
        if (expanded === row.id) {
            setExpanded(null);
            return;
        }
        setExpanded(row.id);
        if (!details[row.id]) {
            try {
                const { data } = await axios.get(`/api/admin/webhooks/deliveries/${row.id}`);
                setDetails((d) => ({ ...d, [row.id]: data.data.delivery as WebhookDelivery }));
            } catch (err) {
                toast.error(getApiErrorMessage(err, t, 'admin.webhooks.deliveries.loadFailed'));
            }
        }
    };

    const redeliver = async (row: WebhookDelivery) => {
        setRedelivering(row.id);
        try {
            const { data } = await axios.post(`/api/admin/webhooks/deliveries/${row.id}/redeliver`);
            const d = data?.data?.delivery as WebhookDelivery | null;
            if (data?.data?.ok) {
                toast.success(t('admin.webhooks.deliveries.redelivered', { code: String(d?.status_code ?? '') }));
            } else {
                toast.error(
                    t('admin.webhooks.deliveries.redeliverFailed', {
                        error: d?.error || String(d?.status_code ?? ''),
                    }),
                );
            }
            setPage(1);
            await load();
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.webhooks.deliveries.redeliverError'));
        } finally {
            setRedelivering(null);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange} enableSaveShortcut={false}>
            <SheetContent className='overflow-y-auto sm:max-w-2xl'>
                <SheetHeader>
                    <SheetTitle>{t('admin.webhooks.deliveries.title')}</SheetTitle>
                    <SheetDescription>
                        <span className='font-mono text-xs [overflow-wrap:anywhere]'>{webhookUrl}</span>
                    </SheetDescription>
                </SheetHeader>

                <div className='mt-6 space-y-4'>
                    <div className='flex flex-wrap items-center gap-2'>
                        <Select
                            value={status}
                            onChange={(e) => {
                                setStatus(e.target.value);
                                setPage(1);
                            }}
                            className='rounded-xl'
                            aria-label={t('admin.webhooks.deliveries.status')}
                        >
                            <option value=''>{t('admin.webhooks.deliveries.allStatuses')}</option>
                            {(['delivered', 'pending', 'failed'] as const).map((s) => (
                                <option key={s} value={s}>
                                    {t(`admin.webhooks.deliveries.statuses.${s}`)}
                                </option>
                            ))}
                        </Select>
                        <Button variant='outline' size='sm' onClick={() => void load()} disabled={loading}>
                            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                            {t('navigation.items.refresh')}
                        </Button>
                    </div>

                    {loading && rows.length === 0 ? (
                        <TableSkeleton count={4} />
                    ) : rows.length === 0 ? (
                        <ListEmptyState
                            icon={History}
                            title={t('admin.webhooks.deliveries.emptyTitle')}
                            description={t('admin.webhooks.deliveries.emptyDescription')}
                            filtered={status !== ''}
                            onClearFilters={() => setStatus('')}
                        />
                    ) : (
                        <ul className='space-y-2'>
                            {rows.map((row) => {
                                const open = expanded === row.id;
                                const detail = details[row.id];
                                return (
                                    <li key={row.id} className='border-border/60 rounded-xl border'>
                                        <button
                                            type='button'
                                            onClick={() => void toggle(row)}
                                            className='flex w-full items-center gap-3 px-3 py-2.5 text-left'
                                            aria-expanded={open}
                                        >
                                            {open ? (
                                                <ChevronDown className='text-muted-foreground h-4 w-4 shrink-0' />
                                            ) : (
                                                <ChevronRight className='text-muted-foreground h-4 w-4 shrink-0' />
                                            )}
                                            <span
                                                className={cn(
                                                    'shrink-0 rounded-md border px-2 py-0.5 text-xs',
                                                    DELIVERY_TONE[row.status],
                                                )}
                                            >
                                                {t(`admin.webhooks.deliveries.statuses.${row.status}`)}
                                            </span>
                                            <span className='min-w-0 flex-1'>
                                                <span className='block truncate text-sm font-medium'>
                                                    {eventLabel(row.event, t)}
                                                </span>
                                                <span className='text-muted-foreground block text-xs'>
                                                    {formatDateTimeInTz(row.created_at, dateOpts)}
                                                    {' · '}
                                                    {t('admin.webhooks.deliveries.attemptsOf', {
                                                        attempts: String(row.attempts),
                                                        max: String(row.max_attempts),
                                                    })}
                                                    {row.status_code !== null && ` · HTTP ${row.status_code}`}
                                                    {row.duration_ms !== null && ` · ${row.duration_ms} ms`}
                                                </span>
                                            </span>
                                        </button>
                                        {open && (
                                            <div className='border-border/60 space-y-3 border-t px-3 py-3 text-sm'>
                                                {row.status === 'pending' && row.next_retry_at && (
                                                    <p className='text-muted-foreground text-xs'>
                                                        {t('admin.webhooks.deliveries.nextRetry', {
                                                            when: formatRelativeTime(row.next_retry_at, dateOpts),
                                                        })}
                                                    </p>
                                                )}
                                                {row.error && (
                                                    <p className='text-xs [overflow-wrap:anywhere] text-red-600 dark:text-red-400'>
                                                        {row.error}
                                                    </p>
                                                )}
                                                <p className='text-muted-foreground font-mono text-xs [overflow-wrap:anywhere]'>
                                                    {t('admin.webhooks.deliveries.eventId', { id: row.event_id })}
                                                </p>
                                                {detail ? (
                                                    <>
                                                        <div className='space-y-1'>
                                                            <p className='text-xs font-semibold'>
                                                                {t('admin.webhooks.deliveries.payload')}
                                                            </p>
                                                            <pre className='bg-muted/40 max-h-64 overflow-auto rounded-lg p-2 text-xs'>
                                                                {JSON.stringify(detail.payload, null, 2)}
                                                            </pre>
                                                        </div>
                                                        <div className='space-y-1'>
                                                            <p className='text-xs font-semibold'>
                                                                {t('admin.webhooks.deliveries.response')}
                                                            </p>
                                                            <pre className='bg-muted/40 max-h-40 overflow-auto rounded-lg p-2 text-xs whitespace-pre-wrap'>
                                                                {detail.response_snippet ||
                                                                    t('admin.webhooks.deliveries.noResponse')}
                                                            </pre>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <TableSkeleton count={1} />
                                                )}
                                                {canManage && row.status !== 'pending' && (
                                                    <Button
                                                        size='sm'
                                                        variant='outline'
                                                        loading={redelivering === row.id}
                                                        onClick={() => void redeliver(row)}
                                                    >
                                                        <RotateCcw className='mr-2 h-4 w-4' />
                                                        {t('admin.webhooks.deliveries.redeliver')}
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {totalPages > 1 && <ListPagination page={page} totalPages={totalPages} onPageChange={setPage} />}
                </div>
            </SheetContent>
        </Sheet>
    );
}
