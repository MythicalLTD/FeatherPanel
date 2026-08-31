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

import { useCallback, useMemo, useState } from 'react';
import axios from 'axios';
import { Copy, Loader2, Play, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { useTranslation } from '@/contexts/TranslationContext';
import { usePanelApiHistory } from '@/hooks/usePanelApiHistory';
import { entryToReplayDraft, formatPanelApiBody, type PanelApiHistoryEntry } from '@/lib/panel-api-history';
import { copyToClipboard, cn } from '@/lib/utils';
import { toast } from 'sonner';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

function methodTone(method: string): string {
    switch (method.toUpperCase()) {
        case 'GET':
            return 'bg-sky-500/15 text-sky-700 dark:text-sky-300';
        case 'POST':
            return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
        case 'PUT':
        case 'PATCH':
            return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
        case 'DELETE':
            return 'bg-red-500/15 text-red-700 dark:text-red-300';
        default:
            return 'bg-muted text-muted-foreground';
    }
}

function statusTone(status: number | null, ok: boolean): string {
    if (status === null) return 'text-muted-foreground';
    if (ok) return 'text-emerald-600';
    if (status >= 500) return 'text-red-500';
    if (status >= 400) return 'text-amber-600';
    return 'text-foreground';
}

function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

function BodyBlock({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
    return (
        <div className='border-border/60 overflow-hidden rounded-lg border'>
            <div className='border-border/60 bg-muted/30 flex items-center justify-between border-b px-3 py-1.5'>
                <p className='text-muted-foreground text-[10px] font-medium uppercase'>{label}</p>
                <Button size='sm' variant='ghost' className='h-6 px-2 text-[10px]' onClick={onCopy}>
                    <Copy className='mr-1 h-3 w-3' />
                    Copy
                </Button>
            </div>
            <pre className='custom-scrollbar text-foreground max-h-56 overflow-auto p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap'>
                {value || '—'}
            </pre>
        </div>
    );
}

export function PanelDebugApiSection() {
    const { t } = useTranslation();
    const { entries, clear, send } = usePanelApiHistory();

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [sending, setSending] = useState(false);

    const [method, setMethod] = useState('GET');
    const [url, setUrl] = useState('/api/user/session');
    const [headersText, setHeadersText] = useState('{}');
    const [bodyText, setBodyText] = useState('');

    const selected = useMemo(
        () => entries.find((entry) => entry.id === selectedId) ?? entries[0] ?? null,
        [entries, selectedId],
    );

    const filteredEntries = useMemo(() => {
        const q = filter.trim().toLowerCase();
        if (!q) return entries;
        return entries.filter(
            (entry) =>
                entry.method.toLowerCase().includes(q) ||
                entry.url.toLowerCase().includes(q) ||
                String(entry.responseStatus ?? '').includes(q) ||
                (entry.error ?? '').toLowerCase().includes(q),
        );
    }, [entries, filter]);

    const loadDraft = useCallback((entry: PanelApiHistoryEntry) => {
        const draft = entryToReplayDraft(entry);
        setMethod(draft.method);
        setUrl(draft.url);
        setHeadersText(formatPanelApiBody(draft.headers ?? {}));
        setBodyText(typeof draft.body === 'string' ? draft.body : formatPanelApiBody(draft.body));
    }, []);

    const sendRequest = useCallback(async () => {
        const trimmedUrl = url.trim();
        if (!trimmedUrl.startsWith('/api')) {
            toast.error(t('globalSearch.debug.apiInvalidUrl'));
            return;
        }

        setSending(true);
        try {
            let headers: Record<string, string> = {};
            const trimmedHeaders = headersText.trim();
            if (trimmedHeaders) {
                headers = JSON.parse(trimmedHeaders) as Record<string, string>;
            }

            const entry = await send({
                method,
                url: trimmedUrl,
                headers,
                body: bodyText,
                source: selectedId ? 'replay' : 'manual',
            });
            setSelectedId(entry.id);
            if (entry.ok) {
                toast.success(t('globalSearch.debug.apiRequestSent', { status: String(entry.responseStatus ?? '—') }));
            } else {
                toast.error(entry.error ?? t('globalSearch.debug.apiRequestFailed'));
            }
        } catch (error) {
            if (error instanceof SyntaxError) {
                toast.error(t('globalSearch.debug.apiInvalidJson'));
                return;
            }
            const message = axios.isAxiosError(error)
                ? (error.response?.data?.message ?? error.message)
                : error instanceof Error
                  ? error.message
                  : t('globalSearch.debug.apiRequestFailed');
            toast.error(typeof message === 'string' ? message : t('globalSearch.debug.apiRequestFailed'));
            if (entries[0]) {
                setSelectedId(entries[0].id);
            }
        } finally {
            setSending(false);
        }
    }, [bodyText, entries, headersText, method, selectedId, send, t, url]);

    const copyEntry = useCallback(
        async (entry: PanelApiHistoryEntry) => {
            const payload = {
                method: entry.method,
                url: entry.url,
                requestHeaders: entry.requestHeaders,
                requestBody: entry.requestBody,
                responseStatus: entry.responseStatus,
                responseBody: entry.responseBody,
                durationMs: entry.durationMs,
                error: entry.error,
            };
            await copyToClipboard(JSON.stringify(payload, null, 2), t);
        },
        [t],
    );

    return (
        <div className='flex min-h-[28rem] flex-col gap-4 xl:flex-row'>
            <aside className='border-border/60 bg-muted/15 flex w-full shrink-0 flex-col rounded-xl border xl:w-72'>
                <div className='border-border/60 flex items-center justify-between gap-2 border-b px-3 py-2'>
                    <p className='text-foreground text-xs font-medium'>
                        {t('globalSearch.debug.apiHistory', { count: String(entries.length) })}
                    </p>
                    <Button
                        size='sm'
                        variant='ghost'
                        className='h-7 px-2 text-[10px]'
                        onClick={clear}
                        disabled={entries.length === 0}
                    >
                        <Trash2 className='mr-1 h-3 w-3' />
                        {t('globalSearch.debug.apiClearHistory')}
                    </Button>
                </div>
                <div className='border-border/60 border-b p-2'>
                    <div className='relative'>
                        <Search className='text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2' />
                        <Input
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            placeholder={t('globalSearch.debug.apiFilterPlaceholder')}
                            className='h-8 pl-8 text-xs'
                        />
                        {filter ? (
                            <button
                                type='button'
                                onClick={() => setFilter('')}
                                className='text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2'
                            >
                                <X className='h-3 w-3' />
                            </button>
                        ) : null}
                    </div>
                </div>
                <ul className='custom-scrollbar max-h-[min(40vh,22rem)] flex-1 overflow-y-auto p-2'>
                    {filteredEntries.length === 0 ? (
                        <li className='text-muted-foreground px-2 py-8 text-center text-xs'>
                            {entries.length === 0
                                ? t('globalSearch.debug.apiHistoryEmpty')
                                : t('globalSearch.debug.apiFilterEmpty')}
                        </li>
                    ) : (
                        filteredEntries.map((entry) => {
                            const active = selected?.id === entry.id;
                            return (
                                <li key={entry.id}>
                                    <button
                                        type='button'
                                        onClick={() => setSelectedId(entry.id)}
                                        className={cn(
                                            'mb-1 w-full rounded-lg border px-2.5 py-2 text-left transition-colors',
                                            active
                                                ? 'border-border bg-background shadow-sm'
                                                : 'hover:bg-background/70 border-transparent',
                                        )}
                                    >
                                        <div className='flex items-center gap-2'>
                                            <span
                                                className={cn(
                                                    'rounded px-1.5 py-0.5 text-[10px] font-bold',
                                                    methodTone(entry.method),
                                                )}
                                            >
                                                {entry.method}
                                            </span>
                                            <span
                                                className={cn(
                                                    'text-xs font-semibold tabular-nums',
                                                    statusTone(entry.responseStatus, entry.ok),
                                                )}
                                            >
                                                {entry.responseStatus ?? '—'}
                                            </span>
                                            <span className='text-muted-foreground ml-auto text-[10px] tabular-nums'>
                                                {entry.durationMs} ms
                                            </span>
                                        </div>
                                        <p className='text-foreground mt-1 truncate font-mono text-[11px]'>
                                            {entry.url}
                                        </p>
                                        <p className='text-muted-foreground mt-0.5 text-[10px]'>
                                            {formatTime(entry.timestamp)}
                                            {entry.source !== 'captured' ? ` · ${entry.source}` : ''}
                                        </p>
                                    </button>
                                </li>
                            );
                        })
                    )}
                </ul>
            </aside>

            <div className='flex min-w-0 flex-1 flex-col gap-4'>
                <div className='border-border/60 bg-card rounded-xl border p-3'>
                    <p className='text-foreground mb-2 text-xs font-medium'>{t('globalSearch.debug.apiComposer')}</p>
                    <div className='flex flex-wrap items-center gap-2'>
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            className='border-border bg-background h-9 rounded-lg border px-2 text-sm font-medium'
                        >
                            {HTTP_METHODS.map((value) => (
                                <option key={value} value={value}>
                                    {value}
                                </option>
                            ))}
                        </select>
                        <Input
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder='/api/...'
                            className='h-9 min-w-[12rem] flex-1 font-mono text-xs'
                        />
                        <Button size='sm' onClick={() => void sendRequest()} disabled={sending || !url.trim()}>
                            {sending ? (
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            ) : (
                                <Play className='mr-2 h-4 w-4' />
                            )}
                            {t('globalSearch.debug.apiSend')}
                        </Button>
                        {selected ? (
                            <>
                                <Button size='sm' variant='outline' onClick={() => loadDraft(selected)}>
                                    <RotateCcw className='mr-2 h-4 w-4' />
                                    {t('globalSearch.debug.apiLoadComposer')}
                                </Button>
                                <Button
                                    size='sm'
                                    variant='outline'
                                    onClick={() => void sendRequest()}
                                    disabled={sending}
                                >
                                    {sending ? (
                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    ) : (
                                        <Play className='mr-2 h-4 w-4' />
                                    )}
                                    {t('globalSearch.debug.apiResend')}
                                </Button>
                            </>
                        ) : null}
                    </div>
                    <div className='mt-3 grid gap-3 lg:grid-cols-2'>
                        <div>
                            <p className='text-muted-foreground mb-1 text-[10px] font-medium uppercase'>
                                {t('globalSearch.debug.apiHeaders')}
                            </p>
                            <Textarea
                                value={headersText}
                                onChange={(e) => setHeadersText(e.target.value)}
                                className='min-h-[7rem] font-mono text-[11px]'
                                spellCheck={false}
                            />
                        </div>
                        <div>
                            <p className='text-muted-foreground mb-1 text-[10px] font-medium uppercase'>
                                {t('globalSearch.debug.apiBody')}
                            </p>
                            <Textarea
                                value={bodyText}
                                onChange={(e) => setBodyText(e.target.value)}
                                className='min-h-[7rem] font-mono text-[11px]'
                                spellCheck={false}
                                placeholder={t('globalSearch.debug.apiBodyPlaceholder')}
                            />
                        </div>
                    </div>
                    <p className='text-muted-foreground mt-2 text-[11px]'>{t('globalSearch.debug.apiComposerHint')}</p>
                </div>

                {selected ? (
                    <div className='space-y-3'>
                        <div className='flex flex-wrap items-center justify-between gap-2'>
                            <div className='flex flex-wrap items-center gap-2'>
                                <span
                                    className={cn('rounded px-2 py-0.5 text-xs font-bold', methodTone(selected.method))}
                                >
                                    {selected.method}
                                </span>
                                <span className='text-foreground font-mono text-xs'>{selected.url}</span>
                                <span
                                    className={cn(
                                        'text-sm font-semibold tabular-nums',
                                        statusTone(selected.responseStatus, selected.ok),
                                    )}
                                >
                                    {selected.responseStatus ?? '—'}
                                </span>
                                <span className='text-muted-foreground text-xs tabular-nums'>
                                    {selected.durationMs} ms
                                </span>
                            </div>
                            <Button size='sm' variant='ghost' onClick={() => void copyEntry(selected)}>
                                <Copy className='mr-2 h-4 w-4' />
                                {t('globalSearch.debug.apiCopyExchange')}
                            </Button>
                        </div>
                        {selected.error ? <p className='text-destructive text-xs'>{selected.error}</p> : null}
                        <div className='grid gap-3 lg:grid-cols-2'>
                            <BodyBlock
                                label={t('globalSearch.debug.apiRequestPayload')}
                                value={formatPanelApiBody(selected.requestBody)}
                                onCopy={() => void copyToClipboard(formatPanelApiBody(selected.requestBody), t)}
                            />
                            <BodyBlock
                                label={t('globalSearch.debug.apiResponsePayload')}
                                value={formatPanelApiBody(selected.responseBody)}
                                onCopy={() => void copyToClipboard(formatPanelApiBody(selected.responseBody), t)}
                            />
                        </div>
                        <BodyBlock
                            label={t('globalSearch.debug.apiRequestHeaders')}
                            value={formatPanelApiBody(selected.requestHeaders)}
                            onCopy={() => void copyToClipboard(formatPanelApiBody(selected.requestHeaders), t)}
                        />
                    </div>
                ) : (
                    <p className='text-muted-foreground text-sm'>{t('globalSearch.debug.apiSelectHint')}</p>
                )}
            </div>
        </div>
    );
}
