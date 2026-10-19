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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Pin, PinOff, Search, Loader2, StickyNote, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { featherOsApi, type FeatherOsNote, type FeatherOsNoteColor } from '@/lib/featheros-api';
import { cn } from '@/lib/utils';
import { useFeatherOs } from '../FeatherOsContext';
import type { OsAppProps } from './index';

const COLORS: Record<FeatherOsNoteColor, string> = {
    yellow: 'bg-yellow-300',
    blue: 'bg-sky-400',
    green: 'bg-emerald-400',
    pink: 'bg-pink-400',
    purple: 'bg-violet-400',
    orange: 'bg-orange-400',
    gray: 'bg-zinc-400',
};

const PAPER: Record<FeatherOsNoteColor, string> = {
    yellow: 'bg-yellow-50 dark:bg-yellow-950/30',
    blue: 'bg-sky-50 dark:bg-sky-950/30',
    green: 'bg-emerald-50 dark:bg-emerald-950/30',
    pink: 'bg-pink-50 dark:bg-pink-950/30',
    purple: 'bg-violet-50 dark:bg-violet-950/30',
    orange: 'bg-orange-50 dark:bg-orange-950/30',
    gray: 'bg-zinc-50 dark:bg-zinc-900/40',
};

export default function NotesApp({ win }: OsAppProps) {
    const { t } = useTranslation();
    const { errorMessage, confirm, updateWindowProps } = useFeatherOs();
    const [notes, setNotes] = useState<FeatherOsNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeId, setActiveId] = useState<number | null>(null);
    const [query, setQuery] = useState('');
    const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
    const timers = useRef<Record<number, number>>({});
    const pendingPatch = useRef<Record<number, Partial<FeatherOsNote>>>({});

    const createNote = useCallback(async () => {
        try {
            const note = await featherOsApi.createNote({ title: '', content: '', color: 'yellow' });
            setNotes((cur) => [note, ...cur]);
            setActiveId(note.id);
        } catch (e) {
            toast.error(errorMessage(e));
        }
    }, [errorMessage]);

    useEffect(() => {
        featherOsApi
            .listNotes()
            .then((list) => {
                setNotes(list);
                setActiveId((cur) => cur ?? list[0]?.id ?? null);
            })
            .catch((e) => toast.error(errorMessage(e)))
            .finally(() => setLoading(false));
    }, [errorMessage]);

    // "New note" from the dock / spotlight opens the app with createNew set.
    useEffect(() => {
        if (!win.props?.createNew || loading) return;
        updateWindowProps(win.id, { createNew: false });
        void createNote();
    }, [win.props?.createNew, win.id, loading, updateWindowProps, createNote]);

    const flush = useCallback(
        async (id: number) => {
            const patch = pendingPatch.current[id];
            if (!patch) return;
            delete pendingPatch.current[id];
            setSaving('saving');
            try {
                const saved = await featherOsApi.updateNote(id, patch);
                setNotes((cur) => cur.map((n) => (n.id === id ? { ...n, updated_at: saved.updated_at } : n)));
                setSaving('saved');
            } catch (e) {
                setSaving('idle');
                toast.error(errorMessage(e));
            }
        },
        [errorMessage],
    );

    useEffect(() => {
        const current = timers.current;
        return () => {
            Object.entries(current).forEach(([id, timer]) => {
                window.clearTimeout(timer);
                void flush(Number(id));
            });
        };
    }, [flush]);

    const patchNote = (id: number, patch: Partial<FeatherOsNote>, immediate = false) => {
        setNotes((cur) => cur.map((n) => (n.id === id ? { ...n, ...patch } : n)));
        pendingPatch.current[id] = { ...pendingPatch.current[id], ...patch };
        window.clearTimeout(timers.current[id]);
        if (immediate) void flush(id);
        else timers.current[id] = window.setTimeout(() => void flush(id), 800);
    };

    const removeNote = async (note: FeatherOsNote) => {
        const ok = await confirm({
            title: t('featheros.notes.delete_title'),
            message: t('featheros.notes.delete_message'),
            confirmLabel: t('featheros.common.delete'),
            danger: true,
        });
        if (!ok) return;
        try {
            window.clearTimeout(timers.current[note.id]);
            delete pendingPatch.current[note.id];
            await featherOsApi.deleteNote(note.id);
            setNotes((cur) => cur.filter((n) => n.id !== note.id));
            setActiveId((cur) => (cur === note.id ? null : cur));
        } catch (e) {
            toast.error(errorMessage(e));
        }
    };

    const sorted = useMemo(() => {
        const q = query.trim().toLowerCase();
        return notes
            .filter((n) => !q || `${n.title}\n${n.content}`.toLowerCase().includes(q))
            .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at));
    }, [notes, query]);

    const active = notes.find((n) => n.id === activeId) ?? null;
    const titleOf = (n: FeatherOsNote) =>
        n.title.trim() || n.content.trim().split('\n')[0]?.slice(0, 60) || t('featheros.notes.untitled');

    return (
        <div className='flex h-full'>
            <aside className='bg-muted/40 flex w-56 shrink-0 flex-col border-r'>
                <div className='flex h-10 items-center gap-1 border-b px-2'>
                    <div className='relative flex-1'>
                        <Search className='text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2' />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t('featheros.notes.search')}
                            className='bg-background/70 h-7 w-full rounded-md pr-2 pl-7 text-[12px] outline-none'
                        />
                    </div>
                    <button
                        type='button'
                        onClick={() => void createNote()}
                        className='hover:bg-muted rounded p-1'
                        title={t('featheros.notes.new')}
                    >
                        <Plus className='h-4 w-4' />
                    </button>
                </div>
                <div className='fos-scroll min-h-0 flex-1 overflow-auto p-1'>
                    {loading && <Loader2 className='text-muted-foreground mx-auto mt-6 h-5 w-5 animate-spin' />}
                    {sorted.map((n) => (
                        <button
                            key={n.id}
                            type='button'
                            onClick={() => setActiveId(n.id)}
                            className={cn(
                                'mb-0.5 flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left',
                                activeId === n.id ? 'bg-primary/15' : 'hover:bg-muted',
                            )}
                        >
                            <span
                                className={cn(
                                    'mt-1 h-2.5 w-2.5 shrink-0 rounded-full',
                                    COLORS[n.color] ?? COLORS.yellow,
                                )}
                            />
                            <span className='min-w-0 flex-1'>
                                <span className='flex items-center gap-1 text-[12px] font-medium'>
                                    <span className='truncate'>{titleOf(n)}</span>
                                    {n.pinned && <Pin className='h-3 w-3 shrink-0 opacity-60' />}
                                </span>
                                <span className='text-muted-foreground block truncate text-[11px]'>
                                    {new Date(n.updated_at).toLocaleDateString()} ·{' '}
                                    {n.content.replace(/\s+/g, ' ').slice(0, 40)}
                                </span>
                            </span>
                        </button>
                    ))}
                    {!loading && sorted.length === 0 && (
                        <p className='text-muted-foreground p-4 text-center text-[12px]'>
                            {t('featheros.notes.empty')}
                        </p>
                    )}
                </div>
            </aside>
            {active ? (
                <div className={cn('flex min-w-0 flex-1 flex-col', PAPER[active.color] ?? PAPER.yellow)}>
                    <div className='flex h-10 shrink-0 items-center gap-1 px-3'>
                        {(Object.keys(COLORS) as FeatherOsNoteColor[]).map((c) => (
                            <button
                                key={c}
                                type='button'
                                onClick={() => patchNote(active.id, { color: c }, true)}
                                aria-label={t(`featheros.notes.color_${c}`)}
                                className={cn(
                                    'flex h-4 w-4 items-center justify-center rounded-full',
                                    COLORS[c],
                                    active.color === c && 'ring-foreground/40 ring-2 ring-offset-1',
                                )}
                            >
                                {active.color === c && <Check className='h-2.5 w-2.5 text-black/60' />}
                            </button>
                        ))}
                        <span className='text-muted-foreground ml-3 text-[11px]'>
                            {saving === 'saving'
                                ? t('featheros.notes.saving')
                                : saving === 'saved'
                                  ? t('featheros.notes.saved')
                                  : ''}
                        </span>
                        <button
                            type='button'
                            onClick={() => patchNote(active.id, { pinned: !active.pinned }, true)}
                            className='hover:bg-muted ml-auto rounded p-1'
                            title={active.pinned ? t('featheros.notes.unpin') : t('featheros.notes.pin')}
                        >
                            {active.pinned ? <PinOff className='h-4 w-4' /> : <Pin className='h-4 w-4' />}
                        </button>
                        <button
                            type='button'
                            onClick={() => void removeNote(active)}
                            className='rounded p-1 text-red-600 hover:bg-red-500/10'
                            title={t('featheros.common.delete')}
                        >
                            <Trash2 className='h-4 w-4' />
                        </button>
                    </div>
                    <input
                        value={active.title}
                        maxLength={191}
                        onChange={(e) => patchNote(active.id, { title: e.target.value })}
                        placeholder={t('featheros.notes.title_placeholder')}
                        className='bg-transparent px-5 pt-1 pb-2 text-lg font-semibold outline-none'
                    />
                    <textarea
                        value={active.content}
                        onChange={(e) => patchNote(active.id, { content: e.target.value })}
                        placeholder={t('featheros.notes.content_placeholder')}
                        className='fos-scroll min-h-0 flex-1 resize-none bg-transparent px-5 pb-5 text-[13px] leading-relaxed outline-none'
                    />
                </div>
            ) : (
                <div className='text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 text-sm'>
                    <StickyNote className='h-10 w-10 opacity-50' />
                    <button
                        type='button'
                        onClick={() => void createNote()}
                        className='bg-primary text-primary-foreground rounded-md px-3 py-1 text-xs font-medium'
                    >
                        {t('featheros.notes.new')}
                    </button>
                </div>
            )}
        </div>
    );
}
