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

import {
    ChevronLeft,
    ChevronRight,
    ChevronsDown,
    ChevronsUp,
    PanelLeft,
    PanelLeftClose,
    PanelRight,
    PanelRightClose,
} from 'lucide-react';
import type { SidebarPosition } from '@/hooks/useSidebarPreferences';
import { cn } from '@/lib/utils';
import { toggleSidebarCollapsed } from '@/lib/sidebarChrome';

type SidebarCollapseToggleProps = {
    position: SidebarPosition;
    collapsed: boolean;
    t: (key: string, params?: Record<string, string>) => string;
    variant?: 'rail' | 'dock' | 'navbar';
    className?: string;
    tooltipLabel?: string;
};

export function SidebarCollapseToggle({
    position,
    collapsed,
    t,
    variant = 'rail',
    className,
    tooltipLabel,
}: SidebarCollapseToggleProps) {
    const isDock = variant === 'dock' || position === 'bottom';
    const isRight = position === 'right';

    const title = collapsed ? t('navbar.expandSidebar') : t('navbar.collapseSidebar');

    let Icon = PanelLeftClose;
    if (collapsed) {
        Icon = isRight ? PanelRight : isDock ? ChevronsUp : PanelLeft;
    } else if (isRight) {
        Icon = PanelRightClose;
    } else if (isDock) {
        Icon = ChevronsDown;
    }

    return (
        <button
            type='button'
            onClick={toggleSidebarCollapsed}
            {...(tooltipLabel ? { 'data-sidebar-tooltip': tooltipLabel } : {})}
            className={cn(
                'text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:ring-ring shrink-0 touch-manipulation rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none',
                variant === 'rail' && 'w-full px-3 py-2 text-sm font-medium',
                variant === 'dock' && 'flex h-10 w-10 items-center justify-center',
                variant === 'navbar' && 'flex h-9 w-9 items-center justify-center p-2',
                className,
            )}
            title={title}
            aria-label={t('navbar.toggleSidebar')}
            aria-pressed={collapsed}
        >
            {variant === 'rail' ? (
                <span className='flex w-full items-center justify-center gap-2'>
                    {isRight ? (
                        <ChevronRight className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
                    ) : (
                        <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
                    )}
                    <span className='truncate'>
                        {collapsed ? t('navbar.expandSidebar') : t('navbar.collapseSidebar')}
                    </span>
                </span>
            ) : (
                <Icon className='h-4 w-4' aria-hidden />
            )}
        </button>
    );
}
