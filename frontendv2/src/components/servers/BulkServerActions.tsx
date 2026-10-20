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

import { useState } from 'react';
import { Loader2, MoreHorizontal, Play, RefreshCcw, RotateCw, Skull, Square, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/featherui/Button';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage, getApiErrorMessageFromPayload } from '@/lib/api-errors';
import {
    BULK_MAX_REINSTALL_SERVERS,
    BULK_MAX_SERVERS,
    bulkLimitFor,
    runBulkServerAction,
    type BulkServerAction,
    type BulkServerResponse,
} from '@/lib/server-bulk';
import { cn } from '@/lib/utils';

export interface BulkSelectableServer {
    uuidShort: string;
    name: string;
}

const DONE_KEYS: Record<BulkServerAction, string> = {
    start: 'servers.bulk.done.start',
    stop: 'servers.bulk.done.stop',
    restart: 'servers.bulk.done.restart',
    kill: 'servers.bulk.done.kill',
    reinstall: 'servers.bulk.done.reinstall',
};

const NAME_PREVIEW = 6;
const FAILURE_PREVIEW = 3;

interface BulkSelectionRowProps {
    selectedCount: number;
    visibleCount: number;
    onSelectAll: () => void;
    onClear: () => void;
    className?: string;
}

/** Inline row above a server list: select every server on the page, or clear the selection. */
export function BulkSelectionRow({
    selectedCount,
    visibleCount,
    onSelectAll,
    onClear,
    className,
}: BulkSelectionRowProps) {
    const { t } = useTranslation();
    const allSelected = visibleCount > 0 && selectedCount >= visibleCount;

    return (
        <div
            className={cn(
                'border-border bg-card/60 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-2.5 text-sm',
                className,
            )}
        >
            <div className='flex items-center gap-2.5'>
                <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => (checked ? onSelectAll() : onClear())}
                    aria-label={t('servers.bulk.selectAllPage')}
                />
                <button
                    type='button'
                    onClick={() => (allSelected ? onClear() : onSelectAll())}
                    className='text-foreground hover:text-primary text-xs font-medium transition-colors sm:text-sm'
                >
                    {t('servers.bulk.selectAllPage')}
                </button>
            </div>
            <span className='text-muted-foreground text-xs sm:text-sm'>
                {selectedCount > 0
                    ? t('servers.bulk.selectedCount', { count: String(selectedCount) })
                    : t('servers.bulk.hint')}
            </span>
        </div>
    );
}

interface BulkServerActionsProps {
    selected: BulkSelectableServer[];
    onClear: () => void;
    /** Called after a run with the servers that failed, so they can stay selected for a retry. */
    onFinished?: (failedUuidShorts: string[], response: BulkServerResponse) => void;
    className?: string;
}

/**
 * Bar pinned to the bottom of the viewport while servers are selected. Place it as the last
 * child of the page. Start, stop and restart run straight away; kill and reinstall ask first.
 */
export function BulkServerActions({ selected, onClear, onFinished, className }: BulkServerActionsProps) {
    const { t } = useTranslation();
    const [running, setRunning] = useState<BulkServerAction | null>(null);
    const [confirm, setConfirm] = useState<'kill' | 'reinstall' | null>(null);

    const count = selected.length;
    const overLimit = count > BULK_MAX_SERVERS;
    const reinstallOverLimit = count > BULK_MAX_REINSTALL_SERVERS;
    const busy = running !== null;

    const run = async (action: BulkServerAction) => {
        if (count === 0 || count > bulkLimitFor(action)) return;
        setRunning(action);
        try {
            const response = await runBulkServerAction(
                action,
                selected.map((server) => server.uuidShort),
            );
            const failures = response.results.filter((result) => !result.success);
            const nameOf = (uuidShort: string, fallback: string | null) =>
                selected.find((server) => server.uuidShort === uuidShort)?.name ?? fallback ?? uuidShort;
            const lines =
                failures.length > 0
                    ? [
                          ...failures
                              .slice(0, FAILURE_PREVIEW)
                              .map(
                                  (failure) =>
                                      `${nameOf(failure.uuidShort, failure.name)}: ${getApiErrorMessageFromPayload(
                                          failure,
                                          t,
                                          'servers.bulk.error',
                                      )}`,
                              ),
                          ...(failures.length > FAILURE_PREVIEW
                              ? [t('servers.bulk.more_failed', { count: String(failures.length - FAILURE_PREVIEW) })]
                              : []),
                      ]
                    : [];
            const description =
                lines.length > 0 ? <span className='block whitespace-pre-line'>{lines.join('\n')}</span> : undefined;

            if (failures.length === 0) {
                toast.success(t(DONE_KEYS[action]));
            } else if (response.succeeded === 0) {
                toast.error(t('servers.bulk.all_failed'), { description });
            } else {
                toast.warning(
                    t('servers.bulk.partial', {
                        succeeded: String(response.succeeded),
                        total: String(response.results.length),
                    }),
                    { description },
                );
            }
            onFinished?.(
                failures.map((failure) => failure.uuidShort),
                response,
            );
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'servers.bulk.error'));
        } finally {
            setRunning(null);
            setConfirm(null);
        }
    };

    const preview = selected.slice(0, NAME_PREVIEW);
    const hidden = count - preview.length;
    const iconFor = (action: BulkServerAction, Icon: typeof Play, tone: string) =>
        running === action ? (
            <Loader2 className='h-4 w-4 animate-spin' aria-hidden='true' />
        ) : (
            <Icon className={cn('h-4 w-4', tone)} aria-hidden='true' />
        );

    return (
        <>
            {count > 0 && (
                <div
                    role='region'
                    aria-label={t('servers.bulk.title')}
                    className={cn(
                        'animate-in fade-in slide-in-from-bottom-2 sticky bottom-3 z-30 mt-6 duration-200 sm:bottom-4',
                        className,
                    )}
                >
                    <div className='border-border bg-card/95 mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border p-3 shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:gap-4 sm:px-4'>
                        <div className='flex min-w-0 flex-1 items-center gap-2' aria-live='polite'>
                            <button
                                type='button'
                                onClick={onClear}
                                disabled={busy}
                                className='text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-50'
                                aria-label={t('servers.bulk.clearSelection')}
                                title={t('servers.bulk.clearSelection')}
                            >
                                <X className='h-4 w-4' />
                            </button>
                            <div className='min-w-0'>
                                <p className='text-foreground text-sm font-semibold'>
                                    {t('servers.bulk.selectedCount', { count: String(count) })}
                                </p>
                                {overLimit && (
                                    <p className='text-xs text-amber-500'>
                                        {t('servers.bulk.limit', { count: String(BULK_MAX_SERVERS) })}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className='grid shrink-0 grid-cols-4 gap-2 sm:flex'>
                            <Button
                                type='button'
                                variant='glass'
                                className='h-10 gap-2 px-3'
                                disabled={busy || overLimit}
                                onClick={() => void run('start')}
                            >
                                {iconFor('start', Play, 'text-emerald-500')}
                                <span className='hidden sm:inline'>{t('servers.start')}</span>
                                <span className='sr-only sm:hidden'>{t('servers.start')}</span>
                            </Button>
                            <Button
                                type='button'
                                variant='glass'
                                className='h-10 gap-2 px-3'
                                disabled={busy || overLimit}
                                onClick={() => void run('restart')}
                            >
                                {iconFor('restart', RotateCw, 'text-amber-500')}
                                <span className='hidden sm:inline'>{t('servers.restart')}</span>
                                <span className='sr-only sm:hidden'>{t('servers.restart')}</span>
                            </Button>
                            <Button
                                type='button'
                                variant='glass'
                                className='h-10 gap-2 px-3'
                                disabled={busy || overLimit}
                                onClick={() => void run('stop')}
                            >
                                {iconFor('stop', Square, 'text-orange-500')}
                                <span className='hidden sm:inline'>{t('servers.stop')}</span>
                                <span className='sr-only sm:hidden'>{t('servers.stop')}</span>
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger
                                    disabled={busy || overLimit}
                                    aria-label={t('servers.bulk.more')}
                                    title={t('servers.bulk.more')}
                                    className='border-border/70 bg-background/70 text-foreground hover:border-primary/40 hover:bg-background/90 inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium shadow-sm backdrop-blur-md transition-colors disabled:pointer-events-none disabled:opacity-50'
                                >
                                    {running === 'kill' || running === 'reinstall' ? (
                                        <Loader2 className='h-4 w-4 animate-spin' aria-hidden='true' />
                                    ) : (
                                        <MoreHorizontal className='h-4 w-4' aria-hidden='true' />
                                    )}
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end' className='w-64'>
                                    <DropdownMenuItem
                                        onClick={() => setConfirm('reinstall')}
                                        disabled={reinstallOverLimit}
                                        className='gap-2'
                                    >
                                        <RefreshCcw className='h-4 w-4 text-sky-500' aria-hidden='true' />
                                        <span className='flex min-w-0 flex-col items-start'>
                                            <span>{t('servers.bulk.reinstall')}</span>
                                            {reinstallOverLimit && (
                                                <span className='text-muted-foreground text-xs font-normal'>
                                                    {t('servers.bulk.limit', {
                                                        count: String(BULK_MAX_REINSTALL_SERVERS),
                                                    })}
                                                </span>
                                            )}
                                        </span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => setConfirm('kill')}
                                        className='text-destructive focus:text-destructive gap-2'
                                    >
                                        <Skull className='h-4 w-4' aria-hidden='true' />
                                        {t('servers.bulk.kill')}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={confirm !== null}
                onOpenChange={(open) => {
                    if (!open) setConfirm(null);
                }}
                title={confirm === 'reinstall' ? t('servers.bulk.reinstall_title') : t('servers.bulk.kill_title')}
                description={
                    confirm === 'reinstall'
                        ? t('servers.bulk.reinstall_description')
                        : t('servers.bulk.kill_confirm_description', { count: String(count) })
                }
                confirmLabel={confirm === 'reinstall' ? t('servers.bulk.reinstall') : t('servers.bulk.kill')}
                cancelLabel={t('common.cancel')}
                loading={busy}
                onConfirm={() => (confirm ? run(confirm) : undefined)}
            >
                <ul className='border-border/60 bg-muted/30 max-h-48 space-y-1 overflow-y-auto rounded-xl border p-3 text-sm'>
                    {preview.map((server) => (
                        <li key={server.uuidShort} className='text-foreground truncate'>
                            {server.name}
                        </li>
                    ))}
                    {hidden > 0 && (
                        <li className='text-muted-foreground text-xs'>
                            {t('servers.bulk.and_more', { count: String(hidden) })}
                        </li>
                    )}
                </ul>
            </ConfirmDialog>
        </>
    );
}
