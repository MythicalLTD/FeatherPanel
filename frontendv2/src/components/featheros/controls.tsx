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

export function OsSwitch({
    checked,
    onChange,
    disabled,
    size = 'md',
    className,
    ...aria
}: {
    checked: boolean;
    onChange: (next: boolean) => void;
    disabled?: boolean;
    size?: 'sm' | 'md';
    className?: string;
    'aria-label'?: string;
    title?: string;
}) {
    return (
        <button
            type='button'
            role='switch'
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn('fos-switch', size === 'sm' && 'is-sm', className)}
            {...aria}
        >
            <span />
        </button>
    );
}

export function OsRange({
    value,
    min,
    max,
    step = 1,
    onChange,
    className,
    ...aria
}: {
    value: number;
    min: number;
    max: number;
    step?: number;
    onChange: (next: number) => void;
    className?: string;
    'aria-label'?: string;
}) {
    const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
    return (
        <input
            type='range'
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className={className}
            style={{ ['--fos-range-fill' as string]: `${Math.max(0, Math.min(100, fill))}%` }}
            {...aria}
        />
    );
}
