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

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, error, ...props }, ref) => {
    return (
        <textarea
            className={cn(
                'bg-muted/30 placeholder:text-muted-foreground/50 text-foreground custom-scrollbar flex min-h-[120px] w-full rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-md focus:shadow-lg focus:ring-4 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                error
                    ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                    : 'border-border/50 focus:border-primary focus:ring-primary/20 hover:border-border',
                className,
            )}
            ref={ref}
            {...props}
        />
    );
});
Textarea.displayName = 'Textarea';

export { Textarea };
