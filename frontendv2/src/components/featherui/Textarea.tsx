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
                'flex min-h-[120px] w-full rounded-xl border bg-muted/30 px-4 py-3 text-sm transition-all duration-200 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-muted-foreground/50 shadow-sm hover:shadow-md focus:shadow-lg font-semibold text-foreground custom-scrollbar',
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
