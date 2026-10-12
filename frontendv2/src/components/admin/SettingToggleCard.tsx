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

import { useId } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface SettingToggleCardProps {
    title: string;
    description?: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    className?: string;
}

export function SettingToggleCard({ title, description, checked, onCheckedChange, className }: SettingToggleCardProps) {
    const id = useId();

    return (
        <div
            className={cn(
                'flex min-h-18 items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors',
                checked ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-muted/20',
                className,
            )}
        >
            <div className='min-w-0 space-y-1'>
                <Label htmlFor={id} className='cursor-pointer leading-snug'>
                    {title}
                </Label>
                {description && <p className='text-muted-foreground text-xs leading-relaxed'>{description}</p>}
            </div>
            <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} aria-label={title} />
        </div>
    );
}
