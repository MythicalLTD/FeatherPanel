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

import { useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import {
    ArrowDown,
    ArrowUp,
    Check,
    EyeOff,
    GripVertical,
    LayoutGrid,
    Loader2,
    Minus,
    Plus,
    RotateCcw,
    Save,
    SlidersHorizontal,
} from 'lucide-react';

import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import type { DashboardWidgetSize } from '@/hooks/useDashboardConfig';

const SIZE_LABEL_KEYS: Record<DashboardWidgetSize, string> = {
    small: 'dashboard.customize.size_small',
    medium: 'dashboard.customize.size_medium',
    full: 'dashboard.customize.size_full',
};

function BarButton({
    onClick,
    children,
    tone = 'ghost',
    disabled,
}: {
    onClick: () => void;
    children: ReactNode;
    tone?: 'ghost' | 'primary';
    disabled?: boolean;
}) {
    return (
        <button
            type='button'
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors disabled:opacity-50',
                tone === 'primary'
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
        >
            {children}
        </button>
    );
}

/** Header shown while arranging: what to do, and Reset / Save as default / Cancel / Done. */
export function ArrangeBar({
    onReset,
    onSaveDefault,
    savingDefault,
    onOptions,
    onCancel,
    onDone,
}: {
    onReset: () => void;
    /** Only for admins: save this arrangement as the panel default. */
    onSaveDefault?: () => void;
    savingDefault?: boolean;
    onOptions: () => void;
    onCancel: () => void;
    onDone: () => void;
}) {
    const { t } = useTranslation();
    return (
        <div
            role='region'
            aria-label={t('dashboard.arrange.title')}
            className='animate-in fade-in slide-in-from-top-2 sticky top-2 z-30 duration-200'
        >
            <div className='border-border bg-card/95 flex flex-col gap-3 rounded-2xl border p-3 shadow-lg backdrop-blur-md lg:flex-row lg:items-center lg:gap-4 lg:px-4'>
                <div className='flex min-w-0 flex-1 items-start gap-3'>
                    <span className='fp-icon-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-xl'>
                        <LayoutGrid className='h-4.5 w-4.5' aria-hidden />
                    </span>
                    <div className='min-w-0'>
                        <p className='text-sm font-semibold'>{t('dashboard.arrange.title')}</p>
                        <p className='text-muted-foreground text-xs'>{t('dashboard.arrange.hint')}</p>
                    </div>
                </div>
                <div className='flex flex-wrap items-center gap-1'>
                    <BarButton onClick={onOptions}>
                        <SlidersHorizontal className='h-4 w-4' aria-hidden />
                        {t('dashboard.arrange.options')}
                    </BarButton>
                    <BarButton onClick={onReset}>
                        <RotateCcw className='h-4 w-4' aria-hidden />
                        {t('dashboard.arrange.reset')}
                    </BarButton>
                    {onSaveDefault && (
                        <BarButton onClick={onSaveDefault} disabled={savingDefault}>
                            {savingDefault ? (
                                <Loader2 className='h-4 w-4 animate-spin' aria-hidden />
                            ) : (
                                <Save className='h-4 w-4' aria-hidden />
                            )}
                            {t('dashboard.arrange.save_default')}
                        </BarButton>
                    )}
                    <BarButton onClick={onCancel}>{t('common.cancel')}</BarButton>
                    <BarButton onClick={onDone} tone='primary'>
                        <Check className='h-4 w-4' aria-hidden />
                        {t('common.done')}
                    </BarButton>
                </div>
            </div>
        </div>
    );
}

function FrameButton({
    label,
    onClick,
    disabled,
    children,
}: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    children: ReactNode;
}) {
    return (
        <button
            type='button'
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            className='text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:pointer-events-none disabled:opacity-30'
        >
            {children}
        </button>
    );
}

export interface ArrangeFrameProps {
    id: string;
    label: string;
    size: DashboardWidgetSize;
    canShrink: boolean;
    canGrow: boolean;
    isFirst: boolean;
    isLast: boolean;
    onMove: (direction: -1 | 1) => void;
    onResize: (direction: -1 | 1) => void;
    onHide: () => void;
    /** Drag and drop: called with the dragged widget id and whether to drop after this one. */
    onDropWidget: (draggedId: string, after: boolean) => void;
    children: ReactNode;
}

const DRAG_TYPE = 'application/x-featherpanel-widget';

/** Dashed outline around a card while arranging, with a handle and the per-card controls. */
export function ArrangeFrame({
    id,
    label,
    size,
    canShrink,
    canGrow,
    isFirst,
    isLast,
    onMove,
    onResize,
    onHide,
    onDropWidget,
    children,
}: ArrangeFrameProps) {
    const { t } = useTranslation();
    const [dropAt, setDropAt] = useState<'before' | 'after' | null>(null);
    const [dragging, setDragging] = useState(false);

    const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        const key = event.key;
        if (key === 'ArrowUp' || key === 'ArrowLeft') onMove(-1);
        else if (key === 'ArrowDown' || key === 'ArrowRight') onMove(1);
        else if (key === '+' || key === '=') onResize(1);
        else if (key === '-' || key === '_') onResize(-1);
        else if (key === 'Delete' || key === 'Backspace') onHide();
        else return;
        event.preventDefault();
    };

    const onDragOver = (event: DragEvent<HTMLDivElement>) => {
        if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        setDropAt(event.clientY > rect.top + rect.height / 2 ? 'after' : 'before');
    };

    const onDrop = (event: DragEvent<HTMLDivElement>) => {
        const dragged = event.dataTransfer.getData(DRAG_TYPE);
        const after = dropAt === 'after';
        setDropAt(null);
        if (!dragged || dragged === id) return;
        event.preventDefault();
        onDropWidget(dragged, after);
    };

    return (
        <div
            data-arrange-id={id}
            onDragOver={onDragOver}
            onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropAt(null);
            }}
            onDrop={onDrop}
            className={cn(
                'border-border/80 relative rounded-2xl border-2 border-dashed p-2 transition-colors',
                dragging && 'opacity-50',
                dropAt && 'border-primary/70',
            )}
        >
            {dropAt && (
                <span
                    className={cn(
                        'bg-primary absolute right-3 left-3 h-1 rounded-full',
                        dropAt === 'before' ? '-top-2.5' : '-bottom-2.5',
                    )}
                    aria-hidden
                />
            )}
            <div className='flex min-w-0 items-center gap-1 px-1 pb-2'>
                <button
                    type='button'
                    draggable
                    onDragStart={(event) => {
                        event.dataTransfer.setData(DRAG_TYPE, id);
                        event.dataTransfer.effectAllowed = 'move';
                        setDragging(true);
                    }}
                    onDragEnd={() => setDragging(false)}
                    onKeyDown={onKeyDown}
                    aria-label={t('dashboard.arrange.handle', { name: label })}
                    aria-keyshortcuts='ArrowUp ArrowDown + - Delete'
                    title={t('dashboard.arrange.handle_hint')}
                    className='text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-primary/40 inline-flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-md focus-visible:ring-2 focus-visible:outline-none active:cursor-grabbing'
                >
                    <GripVertical className='h-4 w-4' aria-hidden />
                </button>
                <span className='min-w-0 flex-1 truncate text-sm font-medium'>{label}</span>
                <span className='text-muted-foreground hidden text-[11px] sm:inline'>{t(SIZE_LABEL_KEYS[size])}</span>
                <FrameButton label={t('dashboard.arrange.smaller')} onClick={() => onResize(-1)} disabled={!canShrink}>
                    <Minus className='h-3.5 w-3.5' />
                </FrameButton>
                <FrameButton label={t('dashboard.arrange.larger')} onClick={() => onResize(1)} disabled={!canGrow}>
                    <Plus className='h-3.5 w-3.5' />
                </FrameButton>
                <FrameButton label={t('dashboard.layout.move_up')} onClick={() => onMove(-1)} disabled={isFirst}>
                    <ArrowUp className='h-3.5 w-3.5' />
                </FrameButton>
                <FrameButton label={t('dashboard.layout.move_down')} onClick={() => onMove(1)} disabled={isLast}>
                    <ArrowDown className='h-3.5 w-3.5' />
                </FrameButton>
                <FrameButton label={t('dashboard.arrange.hide')} onClick={onHide}>
                    <EyeOff className='h-3.5 w-3.5' />
                </FrameButton>
            </div>
            <div className='pointer-events-none relative max-h-80 overflow-hidden rounded-xl select-none' inert>
                {children}
                <span
                    className='from-background pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t to-transparent'
                    aria-hidden
                />
            </div>
        </div>
    );
}

/** Placeholder for a card that has nothing to show right now, so it can still be arranged. */
export function ArrangePlaceholder() {
    const { t } = useTranslation();
    return (
        <div className='fp-surface text-muted-foreground rounded-xl border px-4 py-6 text-center text-xs'>
            {t('dashboard.arrange.nothing_now')}
        </div>
    );
}

/** Cards that are not on the dashboard, ready to be added back. */
export function HiddenTray({ items, onAdd }: { items: { id: string; label: string }[]; onAdd: (id: string) => void }) {
    const { t } = useTranslation();
    return (
        <div className='border-border/80 rounded-2xl border-2 border-dashed p-3'>
            <div className='flex flex-wrap items-center gap-2'>
                <span className='text-muted-foreground mr-1 text-sm font-medium'>
                    {t('dashboard.arrange.hidden_cards')}
                </span>
                {items.length === 0 ? (
                    <span className='text-muted-foreground text-xs'>{t('dashboard.arrange.hidden_none')}</span>
                ) : (
                    items.map((item) => (
                        <button
                            key={item.id}
                            type='button'
                            onClick={() => onAdd(item.id)}
                            className='border-border/70 bg-background/40 hover:border-primary/50 hover:text-primary inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors'
                        >
                            <Plus className='h-3.5 w-3.5' aria-hidden />
                            {item.label}
                        </button>
                    ))
                )}
            </div>
        </div>
    );
}
