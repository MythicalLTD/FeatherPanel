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
import { useTranslation } from '@/contexts/TranslationContext';

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
    const { t } = useTranslation();
    const isHidden = hiddenWidgets.includes(widgetId);
    const isVisible = !isHidden || isCustomizing;

    if (!isVisible) {
        return null;
    }

    return (
        <div className={cn('min-w-0', className)}>
            <div className='relative'>
                {isCustomizing && (
                    <button
                        type='button'
                        onClick={() => onToggle(widgetId)}
                        className='bg-background border-border text-foreground hover:bg-accent absolute -top-2 right-2 z-20 flex h-11 w-11 items-center justify-center rounded-lg border transition-colors'
                        aria-pressed={!isHidden}
                        aria-label={isHidden ? t('admin.dashboard.show_widget') : t('admin.dashboard.hide_widget')}
                    >
                        {isHidden ? <Eye className='h-4 w-4' /> : <EyeOff className='h-4 w-4' />}
                    </button>
                )}
                <div className={cn(isHidden && 'opacity-30 grayscale')}>{children}</div>
            </div>
        </div>
    );
}
