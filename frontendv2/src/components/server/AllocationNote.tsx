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

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Check, Loader2, Pencil, Plus, StickyNote, X } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/utils';

/** Keep in sync with Allocation::SERVER_NOTES_MAX_LENGTH on the backend. */
export const ALLOCATION_NOTE_MAX_LENGTH = 255;

interface AllocationNoteProps {
    uuidShort: string;
    allocationId: number;
    note: string | null | undefined;
    canEdit: boolean;
    onSaved: (note: string | null) => void;
}

/** Inline view/edit of the note a server's users keep on one allocation. */
export function AllocationNote({ uuidShort, allocationId, note, canEdit, onSaved }: AllocationNoteProps) {
    const { t } = useTranslation();
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(note ?? '');
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing) inputRef.current?.focus();
    }, [editing]);

    const startEditing = () => {
        setDraft(note ?? '');
        setEditing(true);
    };

    const save = async () => {
        const next = draft.trim();
        if (next === (note ?? '')) {
            setEditing(false);
            return;
        }
        setSaving(true);
        try {
            const { data } = await axios.patch<{ success: boolean; data: { server_notes: string | null } }>(
                `/api/user/servers/${uuidShort}/allocations/${allocationId}/notes`,
                { notes: next === '' ? null : next },
            );
            const saved = data.data?.server_notes ?? null;
            onSaved(saved);
            toast.success(t(saved === null ? 'serverAllocations.notes.cleared' : 'serverAllocations.notes.saved'));
            setEditing(false);
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'serverAllocations.notes.saveFailed'));
        } finally {
            setSaving(false);
        }
    };

    if (editing) {
        return (
            <div className='flex w-full min-w-0 flex-col gap-1.5 sm:max-w-xl'>
                <div className='flex min-w-0 items-center gap-2'>
                    <input
                        ref={inputRef}
                        type='text'
                        value={draft}
                        maxLength={ALLOCATION_NOTE_MAX_LENGTH}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                void save();
                            } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setEditing(false);
                            }
                        }}
                        disabled={saving}
                        placeholder={t('serverAllocations.notes.placeholder')}
                        aria-label={t('serverAllocations.notes.label')}
                        className='border-border bg-background/60 focus:border-primary focus:ring-primary/20 h-10 min-w-0 flex-1 rounded-lg border px-3 text-sm outline-none focus:ring-2'
                    />
                    <button
                        type='button'
                        onClick={() => void save()}
                        disabled={saving}
                        className='bg-primary text-primary-foreground hover:bg-primary/90 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-60'
                        aria-label={t('serverAllocations.notes.save')}
                    >
                        {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : <Check className='h-4 w-4' />}
                    </button>
                    <button
                        type='button'
                        onClick={() => setEditing(false)}
                        disabled={saving}
                        className='border-border text-muted-foreground hover:bg-accent hover:text-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors'
                        aria-label={t('serverAllocations.notes.cancel')}
                    >
                        <X className='h-4 w-4' />
                    </button>
                </div>
                <p
                    className={cn(
                        'text-muted-foreground text-xs',
                        draft.length >= ALLOCATION_NOTE_MAX_LENGTH && 'text-amber-500',
                    )}
                >
                    {t('serverAllocations.notes.counter', {
                        count: String(draft.length),
                        max: String(ALLOCATION_NOTE_MAX_LENGTH),
                    })}
                </p>
            </div>
        );
    }

    if (note) {
        return (
            <div className='flex max-w-full min-w-0 items-center gap-2'>
                <StickyNote className='text-muted-foreground h-4 w-4 shrink-0' aria-hidden='true' />
                <span className='text-foreground/80 min-w-0 text-sm break-words' title={note}>
                    {note}
                </span>
                {canEdit && (
                    <button
                        type='button'
                        onClick={startEditing}
                        className='text-muted-foreground hover:bg-accent hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors'
                        aria-label={t('serverAllocations.notes.edit')}
                        title={t('serverAllocations.notes.edit')}
                    >
                        <Pencil className='h-3.5 w-3.5' />
                    </button>
                )}
            </div>
        );
    }

    if (!canEdit) return null;

    return (
        <button
            type='button'
            onClick={startEditing}
            className='text-muted-foreground hover:bg-accent hover:text-foreground -ml-2 flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm transition-colors'
        >
            <Plus className='h-3.5 w-3.5' aria-hidden='true' />
            {t('serverAllocations.notes.add')}
        </button>
    );
}
