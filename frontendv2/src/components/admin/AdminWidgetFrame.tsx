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

import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminWidgetFrameProps {
    widgetId: string;
    isCustomizing: boolean;
    hiddenWidgets: string[];
    onToggle: (widgetId: string) => void;
    children: React.ReactNode;
    className?: string;
}

export function AdminWidgetFrame({
    widgetId,
    isCustomizing,
    hiddenWidgets,
    onToggle,
    children,
    className,
}: AdminWidgetFrameProps) {
    const isHidden = hiddenWidgets.includes(widgetId);
    const isVisible = !isHidden || isCustomizing;

    if (!isVisible) {
        return null;
    }

    return (
        <div className={cn('transition-all duration-500', className)}>
            <div className='relative'>
                {isCustomizing && (
                    <button
                        type='button'
                        onClick={() => onToggle(widgetId)}
                        className='bg-background border-border text-muted-foreground absolute -top-3 -right-3 z-20 rounded-full border p-2 transition-transform hover:scale-105'
                        aria-label={isHidden ? 'Show widget' : 'Hide widget'}
                    >
                        {isHidden ? <Eye className='h-4 w-4' /> : <EyeOff className='h-4 w-4' />}
                    </button>
                )}
                <div className={cn(isHidden && 'opacity-30 grayscale')}>{children}</div>
            </div>
        </div>
    );
}
