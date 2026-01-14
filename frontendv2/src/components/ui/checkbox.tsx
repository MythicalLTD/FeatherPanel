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

import * as React from 'react';
import { Checkbox as HeadlessCheckbox } from '@headlessui/react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckboxProps {
    id?: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    className?: string;
    disabled?: boolean;
}

export function Checkbox({ id, checked, onCheckedChange, className, disabled }: CheckboxProps) {
    return (
        <HeadlessCheckbox
            id={id}
            checked={checked}
            onChange={onCheckedChange}
            disabled={disabled}
            className={cn(
                'group flex h-5 w-5 items-center justify-center rounded-md border border-primary/40 bg-background/50 transition-all focus:outline-none data-checked:bg-primary data-checked:border-primary data-disabled:opacity-50 data-disabled:cursor-not-allowed',
                className,
            )}
        >
            <Check
                className='h-3.5 w-3.5 text-white opacity-0 transition-opacity group-data-checked:opacity-100'
                strokeWidth={4}
            />
        </HeadlessCheckbox>
    );
}
