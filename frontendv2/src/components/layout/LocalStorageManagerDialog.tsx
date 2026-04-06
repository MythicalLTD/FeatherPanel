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

import { useCallback, useMemo, useReducer, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn, copyToClipboard } from '@/lib/utils';
import {
    clearAllPanelBrowserStorage,
    readPanelBrowserStorage,
    removePanelBrowserStorageKey,
} from '@/lib/featherpanel-local-storage';
import { ChevronDown, ChevronUp, Copy, Database, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function LocalStorageManagerDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { t } = useTranslation();
    const { settings } = useSettings();
    const appName = (settings?.app_name && settings.app_name.trim()) || t('navbar.localStorageDefaultAppName');

    const [refreshTick, bumpRefresh] = useReducer((n: number) => n + 1, 0);
    const [query, setQuery] = useState('');
    const [expanded, setExpanded] = useState<string | null>(null);
    const [clearAllOpen, setClearAllOpen] = useState(false);

    const entries = useMemo(() => {
        void refreshTick;
        if (!open || typeof window === 'undefined') return [];
        return readPanelBrowserStorage();
    }, [open, refreshTick]);

    const refresh = useCallback(() => {
        bumpRefresh();
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return entries;
        return entries.filter((e) => e.key.toLowerCase().includes(q) || e.value.toLowerCase().includes(q));
    }, [entries, query]);

    const totalChars = useMemo(() => entries.reduce((n, e) => n + e.size, 0), [entries]);

    const toggleExpand = (key: string) => {
        setExpanded((k) => (k === key ? null : key));
    };

    const tx = useCallback(
        (key: string, params?: Record<string, string>) => t(key, { appName, ...params }),
        [t, appName],
    );

    const handleDelete = (key: string) => {
        removePanelBrowserStorageKey(key);
        refresh();
        setExpanded((k) => (k === key ? null : k));
        toast.message(tx('navbar.localStorageDeleted', { key }));
    };

    const handleClearAll = () => {
        const n = clearAllPanelBrowserStorage();
        setClearAllOpen(false);
        refresh();
        toast.success(tx('navbar.localStorageClearedCount', { count: String(n) }));
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange} className='max-w-2xl'>
                <DialogContent className='flex max-h-[min(90dvh,56rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl'>
                    <DialogHeader className='space-y-0 border-b border-border/50 bg-muted/15 px-4 py-4 text-left sm:px-5'>
                        <div className='flex gap-3'>
                            <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-card/80 text-primary shadow-sm'>
                                <Database className='h-5 w-5' aria-hidden />
                            </div>
                            <div className='min-w-0 flex-1 space-y-1'>
                                <DialogTitle className='text-base sm:text-lg'>
                                    {tx('navbar.localStorageTitle')}
                                </DialogTitle>
                                <DialogDescription className='text-xs leading-relaxed sm:text-sm'>
                                    {tx('navbar.localStorageDesc')}
                                </DialogDescription>
                                <p className='text-[11px] text-muted-foreground/90 pt-1'>
                                    {tx('navbar.localStorageFootnote')}
                                </p>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className='flex flex-col gap-3 border-b border-border/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5'>
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={tx('navbar.localStorageSearch')}
                            className='border-border/60 bg-background/50 sm:max-w-[220px]'
                        />
                        <div className='flex flex-wrap items-center gap-2 sm:justify-end'>
                            <span className='inline-flex items-center rounded-md border border-border/50 bg-muted/20 px-2 py-1 text-[11px] tabular-nums text-muted-foreground'>
                                {tx('navbar.localStorageSummary', {
                                    keys: String(entries.length),
                                    chars: String(totalChars),
                                })}
                            </span>
                            <Button type='button' variant='outline' size='sm' onClick={() => refresh()}>
                                <RefreshCw className='h-4 w-4 sm:mr-1' />
                                <span className='hidden sm:inline'>{tx('navbar.localStorageRefresh')}</span>
                            </Button>
                        </div>
                    </div>

                    <div className='min-h-0 flex-1 overflow-y-auto px-3 py-2 sm:px-4'>
                        <div className='rounded-xl border border-border/50 bg-card/40'>
                            {filtered.length === 0 ? (
                                <p className='p-8 text-center text-sm text-muted-foreground'>
                                    {tx('navbar.localStorageEmpty')}
                                </p>
                            ) : (
                                <ul className='divide-y divide-border/40'>
                                    {filtered.map((e) => {
                                        const isOpen = expanded === e.key;
                                        return (
                                            <li
                                                key={e.key}
                                                className='group px-3 py-3 transition-colors hover:bg-muted/20 sm:px-4'
                                            >
                                                <div className='flex items-start justify-between gap-2'>
                                                    <div className='min-w-0 flex-1'>
                                                        <p
                                                            className='font-mono text-[11px] font-semibold text-foreground break-all sm:text-xs'
                                                            title={e.key}
                                                        >
                                                            {e.key}
                                                        </p>
                                                        <p className='mt-0.5 text-[10px] text-muted-foreground'>
                                                            {tx('navbar.localStorageChars', { n: String(e.size) })}
                                                        </p>
                                                    </div>
                                                    <div className='flex shrink-0 gap-0.5 opacity-90 group-hover:opacity-100'>
                                                        <Button
                                                            type='button'
                                                            variant='ghost'
                                                            size='sm'
                                                            className='h-8 w-8 p-0'
                                                            aria-label={tx('navbar.localStorageCopy')}
                                                            onClick={() => void copyToClipboard(e.value, t)}
                                                        >
                                                            <Copy className='h-3.5 w-3.5' />
                                                        </Button>
                                                        <Button
                                                            type='button'
                                                            variant='ghost'
                                                            size='sm'
                                                            className='h-8 w-8 p-0 text-destructive hover:text-destructive'
                                                            aria-label={tx('navbar.localStorageDelete')}
                                                            onClick={() => handleDelete(e.key)}
                                                        >
                                                            <Trash2 className='h-3.5 w-3.5' />
                                                        </Button>
                                                        <Button
                                                            type='button'
                                                            variant='ghost'
                                                            size='sm'
                                                            className='h-8 w-8 p-0'
                                                            aria-expanded={isOpen}
                                                            aria-label={
                                                                isOpen
                                                                    ? tx('navbar.localStorageCollapse')
                                                                    : tx('navbar.localStorageExpand')
                                                            }
                                                            onClick={() => toggleExpand(e.key)}
                                                        >
                                                            {isOpen ? (
                                                                <ChevronUp className='h-3.5 w-3.5' />
                                                            ) : (
                                                                <ChevronDown className='h-3.5 w-3.5' />
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                                <p
                                                    className={cn(
                                                        'mt-2 rounded-md border border-border/30 bg-muted/15 px-2 py-1.5 font-mono text-[10px] text-muted-foreground break-all sm:text-[11px]',
                                                        !isOpen && 'line-clamp-2',
                                                    )}
                                                >
                                                    {e.value}
                                                </p>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>

                    <DialogFooter className='flex-col gap-2 border-t border-border/50 bg-muted/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5'>
                        <Button
                            type='button'
                            variant='destructive'
                            className='w-full sm:order-1 sm:mr-auto sm:w-auto'
                            onClick={() => setClearAllOpen(true)}
                        >
                            {tx('navbar.localStorageClearAll')}
                        </Button>
                        <Button
                            type='button'
                            variant='outline'
                            className='w-full sm:w-auto'
                            onClick={() => onOpenChange(false)}
                        >
                            {t('common.close')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tx('navbar.localStorageConfirmClearTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{tx('navbar.localStorageConfirmClearDesc')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setClearAllOpen(false)}>
                            {t('common.cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                            onClick={handleClearAll}
                        >
                            {tx('navbar.localStorageClearAll')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
