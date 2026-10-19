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

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { menuSurface } from './ContextMenu';

export type OsSelectOption = {
    value: string;
    label: string;
    disabled?: boolean;
};

export function OsSelect({
    value,
    options,
    onChange,
    ariaLabel,
    className,
    size = 'default',
    disabled,
}: {
    value: string;
    options: OsSelectOption[];
    onChange: (value: string) => void;
    ariaLabel?: string;
    className?: string;
    size?: 'default' | 'toolbar';
    disabled?: boolean;
}) {
    const listId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const [flipUp, setFlipUp] = useState(false);

    const selected = useMemo(() => options.find((o) => o.value === value) ?? options[0], [options, value]);

    useLayoutEffect(() => {
        if (!open || !rootRef.current) return;
        const rect = rootRef.current.getBoundingClientRect();
        setFlipUp(rect.bottom + 220 > window.innerHeight && rect.top > 240);
        const idx = Math.max(
            0,
            options.findIndex((o) => o.value === value),
        );
        setActive(idx);
    }, [open, options, value]);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                setOpen(false);
            }
        };
        window.addEventListener('mousedown', onDown);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('keydown', onKey);
        };
    }, [open]);

    const moveActive = (delta: number) => {
        if (options.length === 0) return;
        let next = active;
        for (let i = 0; i < options.length; i++) {
            next = (next + delta + options.length) % options.length;
            if (!options[next]?.disabled) break;
        }
        setActive(next);
    };

    const commit = (idx: number) => {
        const opt = options[idx];
        if (!opt || opt.disabled) return;
        onChange(opt.value);
        setOpen(false);
    };

    return (
        <div ref={rootRef} className={cn('fos-select', className)}>
            <button
                type='button'
                className={cn('fos-select-trigger', size === 'toolbar' && 'is-toolbar', open && 'is-open')}
                aria-haspopup='listbox'
                aria-expanded={open}
                aria-controls={listId}
                aria-label={ariaLabel}
                disabled={disabled}
                onClick={() => !disabled && setOpen((v) => !v)}
                onKeyDown={(e) => {
                    if (disabled) return;
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        if (!open) setOpen(true);
                        else moveActive(e.key === 'ArrowDown' ? 1 : -1);
                    } else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!open) setOpen(true);
                        else commit(active);
                    }
                }}
            >
                <span className='fos-select-label'>{selected?.label ?? value}</span>
                <ChevronDown className='fos-select-chevron h-3.5 w-3.5' strokeWidth={2} />
            </button>
            {open && (
                <div
                    id={listId}
                    role='listbox'
                    aria-label={ariaLabel}
                    className={cn(menuSurface, 'fos-select-menu fos-scroll', flipUp && 'is-up')}
                >
                    {options.map((opt, i) => (
                        <button
                            key={opt.value}
                            type='button'
                            role='option'
                            aria-selected={opt.value === value}
                            disabled={opt.disabled}
                            className={cn(
                                'fos-select-option',
                                opt.value === value && 'is-selected',
                                i === active && 'is-active',
                                opt.disabled && 'opacity-40',
                            )}
                            onMouseEnter={() => setActive(i)}
                            onClick={() => commit(i)}
                        >
                            <span className='fos-select-check'>
                                {opt.value === value ? <Check className='h-3.5 w-3.5' /> : null}
                            </span>
                            <span className='truncate'>{opt.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
