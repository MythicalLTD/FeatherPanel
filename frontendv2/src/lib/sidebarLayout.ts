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

import { cn } from '@/lib/utils';
import type { ChromeLayout } from '@/hooks/useChromeLayout';
import {
    DOCK_PANEL_COLLAPSED_CLASS,
    DOCK_PANEL_LABELS_CLASS,
    DOCK_SHELL_INSET_COLLAPSED_CLASS,
    DOCK_SHELL_INSET_LABELS_CLASS,
} from '@/components/sidebar/MacDock';
import type { DockDisplay, DockSize, SidebarGlow, SidebarPosition, SidebarStyle } from '@/hooks/useSidebarPreferences';

export function getChromeGlowClass(glow: SidebarGlow): string {
    if (glow === 'accent') return 'fp-chrome-glow';
    if (glow === 'subtle') return 'fp-chrome-glow-subtle';
    return '';
}

export function getSidebarSurfaceClass(sidebarStyle: SidebarStyle, sidebarGlow: SidebarGlow): string {
    const base = sidebarStyle === 'solid' ? 'border-border/50 bg-card' : 'border-border/40 bg-card/55 backdrop-blur-xl';

    const glowClass = getChromeGlowClass(sidebarGlow);
    if (glowClass) {
        return cn(base, glowClass);
    }
    return base;
}

export function getShellContentInset(options: {
    chromeLayout: ChromeLayout;
    sidebarPosition: SidebarPosition;
    sidebarCollapsed: boolean;
    dockDisplay?: DockDisplay;
    dockSize?: DockSize;
}): string {
    const { chromeLayout, sidebarPosition, sidebarCollapsed, dockSize = 'md' } = options;
    const isClassic = chromeLayout === 'classic';

    if (sidebarPosition === 'bottom') {
        if (sidebarCollapsed) {
            return DOCK_SHELL_INSET_COLLAPSED_CLASS;
        }
        return DOCK_SHELL_INSET_LABELS_CLASS[dockSize];
    }

    if (sidebarPosition === 'right') {
        if (isClassic) {
            return sidebarCollapsed ? 'lg:pr-16' : 'lg:pr-64';
        }
        return sidebarCollapsed ? 'lg:pr-[4.25rem]' : 'lg:pr-[14.75rem]';
    }

    if (isClassic) {
        return sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64';
    }
    return sidebarCollapsed ? 'lg:pl-[4.25rem]' : 'lg:pl-[14.75rem]';
}

export function getDesktopSidebarShellClass(sidebarPosition: SidebarPosition, chromeLayout: ChromeLayout): string {
    if (sidebarPosition === 'bottom') {
        return 'fp-desktop-sidebar pointer-events-none hidden lg:fixed lg:inset-x-0 lg:bottom-0 lg:z-40 lg:flex lg:justify-center lg:p-3 lg:pt-0';
    }
    if (sidebarPosition === 'right') {
        return cn(
            'fp-desktop-sidebar pointer-events-none hidden lg:fixed lg:inset-y-0 lg:right-0 lg:left-auto lg:z-40 lg:flex',
            chromeLayout === 'modern' ? 'lg:p-3' : 'lg:h-svh lg:max-h-svh',
        );
    }
    return cn(
        'fp-desktop-sidebar pointer-events-none hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex',
        chromeLayout === 'modern' ? 'lg:p-3' : 'lg:h-svh lg:max-h-svh',
    );
}

export function getDesktopSidebarPanelClass(options: {
    chromeLayout: ChromeLayout;
    sidebarPosition: SidebarPosition;
    sidebarStyle: SidebarStyle;
    sidebarGlow?: SidebarGlow;
    collapsed: boolean;
    dockDisplay?: DockDisplay;
    dockSize?: DockSize;
}): string {
    const { chromeLayout, sidebarPosition, sidebarStyle, sidebarGlow = 'none', collapsed } = options;
    const glassPanel = getSidebarSurfaceClass(sidebarStyle, sidebarGlow);

    if (sidebarPosition === 'bottom') {
        const heightClass = collapsed ? DOCK_PANEL_COLLAPSED_CLASS : DOCK_PANEL_LABELS_CLASS;
        return cn(
            'pointer-events-auto flex h-full min-h-0 w-full flex-col overflow-visible rounded-2xl border transition-[height] duration-200 ease-out',
            glassPanel,
            heightClass,
            'max-w-[min(100vw-1.5rem,64rem)]',
            'py-1',
        );
    }

    if (chromeLayout === 'classic') {
        return cn(
            'pointer-events-auto flex h-full min-h-0 flex-col overflow-hidden transition-[width] duration-300 ease-out',
            'bg-card lg:border-border/80',
            sidebarPosition === 'right' ? 'lg:border-l' : 'lg:border-r',
            collapsed ? 'w-16' : 'w-64',
        );
    }

    return cn(
        'pointer-events-auto flex h-full min-h-0 flex-col overflow-hidden transition-[width] duration-300 ease-out',
        'rounded-2xl border',
        glassPanel,
        collapsed ? 'w-14' : 'w-56',
    );
}
