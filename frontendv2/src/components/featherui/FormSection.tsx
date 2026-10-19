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
import { cn } from '@/lib/utils';

export interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    /**
     * 'inset' for a section that sits inside another card (PageCard...): a flat panel instead of a
     * second glass layer, so nested sections do not stack shadows and darken.
     */
    variant?: 'surface' | 'inset';
}

/**
 * Shared wizard/form shell: same glass surface, radius and edge as PageCard.
 */
export function FormSection({ children, className, variant = 'surface', ...props }: FormSectionProps) {
    return (
        <div
            className={cn(
                variant === 'inset'
                    ? 'fp-surface-inset space-y-5 rounded-xl border p-4 sm:p-5'
                    : 'fp-surface space-y-6 rounded-xl border p-4 sm:p-6',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}
