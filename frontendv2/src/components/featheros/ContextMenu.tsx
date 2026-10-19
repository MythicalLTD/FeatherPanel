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

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeatherOs } from './FeatherOsContext';
import type { OsContextMenuItem } from './types';

export function MenuList({ items, onDone }: { items: OsContextMenuItem[]; onDone: () => void }) {
    return (
        <div className='flex min-w-[220px] flex-col p-1 text-[13px]'>
            {items.map((item) =>
                item.separator ? (
                    <div key={item.id} className='fos-menu-sep my-1 h-px' />
                ) : (
                    <button
                        key={item.id}
                        type='button'
                        disabled={item.disabled}
                        onClick={() => {
                            onDone();
                            item.onSelect?.();
                        }}
                        className={cn(
                            'flex items-center gap-2 rounded-[6px] px-2.5 py-[4px] text-left outline-none',
                            item.disabled
                                ? 'cursor-default opacity-40'
                                : item.danger
                                  ? 'text-red-600 hover:bg-red-500 hover:text-white dark:text-red-400'
                                  : 'hover:bg-[#0a84ff] hover:text-white',
                        )}
                    >
                        <span className='flex w-4 shrink-0 justify-center'>
                            {item.checked ? (
                                <Check className='h-3.5 w-3.5' />
                            ) : item.icon ? (
                                <item.icon className='h-3.5 w-3.5 opacity-80' />
                            ) : null}
                        </span>
                        <span className='flex-1 truncate'>{item.label}</span>
                        {item.shortcut && <span className='ml-4 text-xs opacity-50'>{item.shortcut}</span>}
                    </button>
                ),
            )}
        </div>
    );
}

export const menuSurface = 'fos-glass-menu rounded-[12px] overflow-hidden';

/** The single right-click menu of the desktop, opened through openContextMenu(). */
export function OsContextMenu() {
    const { contextMenu, closeContextMenu } = useFeatherOs();
    const ref = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ x: 0, y: 0 });

    useLayoutEffect(() => {
        if (!contextMenu || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = Math.min(contextMenu.x, window.innerWidth - rect.width - 6);
        const y = Math.min(contextMenu.y, window.innerHeight - rect.height - 6);
        setPos({ x: Math.max(4, x), y: Math.max(4, y) });
    }, [contextMenu]);

    useEffect(() => {
        if (!contextMenu) return;
        const onDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) closeContextMenu();
        };
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeContextMenu();
        window.addEventListener('mousedown', onDown, true);
        window.addEventListener('keydown', onKey);
        window.addEventListener('blur', closeContextMenu);
        return () => {
            window.removeEventListener('mousedown', onDown, true);
            window.removeEventListener('keydown', onKey);
            window.removeEventListener('blur', closeContextMenu);
        };
    }, [contextMenu, closeContextMenu]);

    if (!contextMenu) return null;
    return (
        <div
            ref={ref}
            className={cn('fos-pop fixed z-[10000]', menuSurface)}
            style={{ left: pos.x || contextMenu.x, top: pos.y || contextMenu.y }}
            onContextMenu={(e) => e.preventDefault()}
        >
            <MenuList items={contextMenu.items} onDone={closeContextMenu} />
        </div>
    );
}
