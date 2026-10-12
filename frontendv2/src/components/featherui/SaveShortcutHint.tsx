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

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { getSaveShortcutLabel } from '@/hooks/useSaveShortcut';

type SaveShortcutHintProps = {
    className?: string;
};

/**
 * Small kbd badge showing the platform save shortcut (Ctrl+S / ⌘S).
 */
export function SaveShortcutHint({ className }: SaveShortcutHintProps) {
    const [label, setLabel] = useState('Ctrl+S');

    useEffect(() => {
        setLabel(getSaveShortcutLabel());
    }, []);

    return (
        <kbd
            className={cn(
                'border-border/60 bg-background/70 text-muted-foreground ml-2 hidden rounded border px-1.5 py-0.5 text-[10px] font-medium sm:inline',
                className,
            )}
        >
            {label}
        </kbd>
    );
}
