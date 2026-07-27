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

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/featherui/Button';

interface LifecycleHookCardProps {
    icon: LucideIcon;
    title: string;
    summary: string;
    stepCountLabel: string;
    isActive: boolean;
    isSelected: boolean;
    enabledLabel: string;
    disabledLabel: string;
    selectedLabel: string;
    enableLabel: string;
    disableLabel: string;
    canToggle: boolean;
    toggling: boolean;
    onSelect: () => void;
    onToggleActive: () => void;
}

export function LifecycleHookCard({
    icon: Icon,
    title,
    summary,
    stepCountLabel,
    isActive,
    isSelected,
    enabledLabel,
    disabledLabel,
    selectedLabel,
    enableLabel,
    disableLabel,
    canToggle,
    toggling,
    onSelect,
    onToggleActive,
}: LifecycleHookCardProps) {
    return (
        <div
            role='button'
            tabIndex={0}
            aria-pressed={isSelected}
            onClick={onSelect}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect();
                }
            }}
            className={cn(
                'group flex w-full cursor-pointer flex-col rounded-2xl border p-4 text-left transition-all sm:p-5',
                'bg-card/40 hover:bg-card/60 backdrop-blur-sm',
                'focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                isSelected
                    ? 'border-primary/50 ring-primary/30 shadow-primary/5 shadow-lg ring-1'
                    : 'border-border/30 hover:border-primary/25',
            )}
        >
            <div className='flex items-start gap-3 sm:gap-4'>
                <div
                    className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12',
                        isSelected ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary',
                    )}
                >
                    <Icon className='h-5 w-5 sm:h-6 sm:w-6' />
                </div>

                <div className='min-w-0 flex-1 space-y-1.5'>
                    <h3 className='text-foreground text-base leading-snug font-semibold sm:text-lg'>{title}</h3>
                    <p className='text-muted-foreground text-sm leading-relaxed'>{summary}</p>
                </div>
            </div>

            <div className='mt-4 flex flex-wrap items-center gap-2'>
                <span
                    className={cn(
                        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
                        isActive
                            ? 'border-green-500/20 bg-green-500/10 text-green-400'
                            : 'text-muted-foreground border-white/10 bg-white/5',
                    )}
                >
                    {isActive ? enabledLabel : disabledLabel}
                </span>
                {isSelected ? (
                    <span className='border-primary/30 bg-primary/15 text-primary inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium'>
                        {selectedLabel}
                    </span>
                ) : null}
            </div>

            <p className='text-muted-foreground mt-3 text-sm'>{stepCountLabel}</p>

            {canToggle ? (
                <div className='border-border/20 mt-4 border-t pt-4'>
                    <Button
                        variant='outline'
                        size='sm'
                        type='button'
                        className='w-full sm:w-auto'
                        loading={toggling}
                        disabled={toggling}
                        onClick={(event) => {
                            event.stopPropagation();
                            onToggleActive();
                        }}
                    >
                        {isActive ? disableLabel : enableLabel}
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
