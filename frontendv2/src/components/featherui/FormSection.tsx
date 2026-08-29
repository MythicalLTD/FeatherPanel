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
}

/**
 * Shared wizard/form shell — sober glass without backdrop-blur-3xl / jumbo radii.
 */
export function FormSection({ children, className, ...props }: FormSectionProps) {
    return (
        <div
            className={cn('bg-card/50 border-border/50 space-y-6 rounded-2xl border p-6 sm:p-8', className)}
            {...props}
        >
            {children}
        </div>
    );
}
