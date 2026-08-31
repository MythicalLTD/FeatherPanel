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

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { IconLibrary } from '@/lib/iconLibrary';

export type { IconLibrary } from '@/lib/iconLibrary';

export type SidebarDensity = 'compact' | 'comfortable';
export type SidebarStyle = 'glass' | 'solid';
export type SidebarPosition = 'left' | 'right' | 'bottom';
export type DockDisplay = 'icons' | 'labels';
export type DockSize = 'sm' | 'md' | 'lg';
export type SidebarTogglePlacement = 'sidebar' | 'navbar' | 'both';
export type SidebarGlow = 'none' | 'subtle' | 'accent';

const DENSITY_KEY = 'featherpanel_sidebar_density';
const STYLE_KEY = 'featherpanel_sidebar_style';
const POSITION_KEY = 'featherpanel_sidebar_position';
const DOCK_DISPLAY_KEY = 'featherpanel_dock_display';
const DOCK_SIZE_KEY = 'featherpanel_dock_size';
const TOGGLE_PLACEMENT_KEY = 'featherpanel_sidebar_toggle_placement';
const SIDEBAR_GLOW_KEY = 'featherpanel_chrome_glow';
const ICON_LIBRARY_KEY = 'featherpanel_icon_library';
const EVENT_NAME = 'featherpanel-sidebar-preferences-change';

const listeners = new Set<() => void>();

function notifyListeners() {
    listeners.forEach((listener) => listener());
}

function readDensity(): SidebarDensity {
    if (typeof window === 'undefined') return 'comfortable';
    try {
        const raw = localStorage.getItem(DENSITY_KEY);
        return raw === 'compact' ? 'compact' : 'comfortable';
    } catch {
        return 'comfortable';
    }
}

function readStyle(): SidebarStyle {
    if (typeof window === 'undefined') return 'glass';
    try {
        const raw = localStorage.getItem(STYLE_KEY);
        return raw === 'solid' ? 'solid' : 'glass';
    } catch {
        return 'glass';
    }
}

function readPosition(): SidebarPosition {
    if (typeof window === 'undefined') return 'left';
    try {
        const raw = localStorage.getItem(POSITION_KEY);
        if (raw === 'right' || raw === 'bottom') return raw;
        return 'left';
    } catch {
        return 'left';
    }
}

function readDockDisplay(): DockDisplay {
    if (typeof window === 'undefined') return 'icons';
    try {
        const raw = localStorage.getItem(DOCK_DISPLAY_KEY);
        return raw === 'labels' ? 'labels' : 'icons';
    } catch {
        return 'icons';
    }
}

function readDockSize(): DockSize {
    if (typeof window === 'undefined') return 'md';
    try {
        const raw = localStorage.getItem(DOCK_SIZE_KEY);
        if (raw === 'sm' || raw === 'lg') return raw;
        return 'md';
    } catch {
        return 'md';
    }
}

function readSidebarGlow(): SidebarGlow {
    if (typeof window === 'undefined') return 'none';
    try {
        const raw = localStorage.getItem(SIDEBAR_GLOW_KEY);
        if (raw === 'subtle' || raw === 'accent') return raw;
        return 'none';
    } catch {
        return 'none';
    }
}

function readIconLibrary(): IconLibrary {
    if (typeof window === 'undefined') return 'lucide';
    try {
        const raw = localStorage.getItem(ICON_LIBRARY_KEY);
        if (raw === 'tabler' || raw === 'mdi' || raw === 'phosphor') return raw;
        return 'lucide';
    } catch {
        return 'lucide';
    }
}

function readTogglePlacement(): SidebarTogglePlacement {
    if (typeof window === 'undefined') return 'sidebar';
    try {
        const raw = localStorage.getItem(TOGGLE_PLACEMENT_KEY);
        if (raw === 'navbar' || raw === 'both') return raw;
        return 'sidebar';
    } catch {
        return 'sidebar';
    }
}

export function useSidebarPreferences() {
    const [sidebarDensity, setSidebarDensityState] = useState<SidebarDensity>(() =>
        typeof window === 'undefined' ? 'comfortable' : readDensity(),
    );
    const [sidebarStyle, setSidebarStyleState] = useState<SidebarStyle>(() =>
        typeof window === 'undefined' ? 'glass' : readStyle(),
    );
    const [sidebarPosition, setSidebarPositionState] = useState<SidebarPosition>(() =>
        typeof window === 'undefined' ? 'left' : readPosition(),
    );
    const [dockDisplay, setDockDisplayState] = useState<DockDisplay>(() =>
        typeof window === 'undefined' ? 'icons' : readDockDisplay(),
    );
    const [dockSize, setDockSizeState] = useState<DockSize>(() =>
        typeof window === 'undefined' ? 'md' : readDockSize(),
    );
    const [sidebarGlow, setSidebarGlowState] = useState<SidebarGlow>(() =>
        typeof window === 'undefined' ? 'none' : readSidebarGlow(),
    );
    const [iconLibrary, setIconLibraryState] = useState<IconLibrary>(() =>
        typeof window === 'undefined' ? 'lucide' : readIconLibrary(),
    );
    const [sidebarTogglePlacement, setSidebarTogglePlacementState] = useState<SidebarTogglePlacement>(() =>
        typeof window === 'undefined' ? 'sidebar' : readTogglePlacement(),
    );

    useLayoutEffect(() => {
        const sync = () => {
            setSidebarDensityState(readDensity());
            setSidebarStyleState(readStyle());
            setSidebarPositionState(readPosition());
            setDockDisplayState(readDockDisplay());
            setDockSizeState(readDockSize());
            setSidebarGlowState(readSidebarGlow());
            setIconLibraryState(readIconLibrary());
            setSidebarTogglePlacementState(readTogglePlacement());
        };
        listeners.add(sync);
        sync();
        return () => {
            listeners.delete(sync);
        };
    }, []);

    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (
                e.key === DENSITY_KEY ||
                e.key === STYLE_KEY ||
                e.key === POSITION_KEY ||
                e.key === DOCK_DISPLAY_KEY ||
                e.key === DOCK_SIZE_KEY ||
                e.key === TOGGLE_PLACEMENT_KEY ||
                e.key === SIDEBAR_GLOW_KEY ||
                e.key === ICON_LIBRARY_KEY
            ) {
                notifyListeners();
            }
        };
        const onCustom = () => notifyListeners();
        window.addEventListener('storage', onStorage);
        window.addEventListener(EVENT_NAME, onCustom);
        return () => {
            window.removeEventListener('storage', onStorage);
            window.removeEventListener(EVENT_NAME, onCustom);
        };
    }, []);

    const setSidebarDensity = useCallback((next: SidebarDensity) => {
        try {
            localStorage.setItem(DENSITY_KEY, next);
        } catch {
            // ignore
        }
        window.dispatchEvent(new Event(EVENT_NAME));
        notifyListeners();
    }, []);

    const setSidebarStyle = useCallback((next: SidebarStyle) => {
        try {
            localStorage.setItem(STYLE_KEY, next);
        } catch {
            // ignore
        }
        window.dispatchEvent(new Event(EVENT_NAME));
        notifyListeners();
    }, []);

    const setSidebarPosition = useCallback((next: SidebarPosition) => {
        try {
            localStorage.setItem(POSITION_KEY, next);
        } catch {
            // ignore
        }
        window.dispatchEvent(new Event(EVENT_NAME));
        notifyListeners();
    }, []);

    const setDockDisplay = useCallback((next: DockDisplay) => {
        try {
            localStorage.setItem(DOCK_DISPLAY_KEY, next);
        } catch {
            // ignore
        }
        window.dispatchEvent(new Event(EVENT_NAME));
        notifyListeners();
    }, []);

    const setDockSize = useCallback((next: DockSize) => {
        try {
            localStorage.setItem(DOCK_SIZE_KEY, next);
        } catch {
            // ignore
        }
        window.dispatchEvent(new Event(EVENT_NAME));
        notifyListeners();
    }, []);

    const setSidebarGlow = useCallback((next: SidebarGlow) => {
        try {
            localStorage.setItem(SIDEBAR_GLOW_KEY, next);
        } catch {
            // ignore
        }
        window.dispatchEvent(new Event(EVENT_NAME));
        notifyListeners();
    }, []);

    const setIconLibrary = useCallback((next: IconLibrary) => {
        try {
            localStorage.setItem(ICON_LIBRARY_KEY, next);
        } catch {
            // ignore
        }
        window.dispatchEvent(new Event(EVENT_NAME));
        notifyListeners();
    }, []);

    const setSidebarTogglePlacement = useCallback((next: SidebarTogglePlacement) => {
        try {
            localStorage.setItem(TOGGLE_PLACEMENT_KEY, next);
        } catch {
            // ignore
        }
        window.dispatchEvent(new Event(EVENT_NAME));
        notifyListeners();
    }, []);

    return {
        sidebarDensity,
        setSidebarDensity,
        sidebarStyle,
        setSidebarStyle,
        sidebarPosition,
        setSidebarPosition,
        dockDisplay,
        setDockDisplay,
        dockSize,
        setDockSize,
        sidebarGlow,
        setSidebarGlow,
        iconLibrary,
        setIconLibrary,
        sidebarTogglePlacement,
        setSidebarTogglePlacement,
    };
}
