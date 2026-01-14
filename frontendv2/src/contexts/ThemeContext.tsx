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

import { createContext, useContext, useEffect, useLayoutEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';
type BackgroundType = 'gradient' | 'solid' | 'image' | 'pattern';

interface ThemeContextType {
    theme: Theme;
    accentColor: string;
    backgroundType: BackgroundType;
    backgroundImage: string;
    setTheme: (theme: Theme) => void;
    setAccentColor: (color: string) => void;
    setBackgroundType: (type: BackgroundType) => void;
    setBackgroundImage: (image: string) => void;
    toggleTheme: () => void;
    mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const ACCENT_COLORS = {
    purple: '262 83% 58%',
    blue: '217 91% 60%',
    green: '142 71% 45%',
    red: '0 84% 60%',
    orange: '25 95% 53%',
    pink: '330 81% 60%',
    teal: '173 80% 40%',
    yellow: '48 96% 53%',
};

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false);
    const [theme, setThemeState] = useState<Theme>('dark');
    const [accentColor, setAccentColorState] = useState('purple');
    const [backgroundType, setBackgroundTypeState] = useState<BackgroundType>('gradient');
    const [backgroundImage, setBackgroundImageState] = useState('');

    // Only run on client side after mount - useLayoutEffect runs synchronously before paint
    useLayoutEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
        const saved = localStorage.getItem('theme') as Theme | null;
        const savedAccent = localStorage.getItem('accentColor');
        const savedBgType = localStorage.getItem('backgroundType') as BackgroundType | null;
        const savedBgImage = localStorage.getItem('backgroundImage');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        setThemeState(saved || (prefersDark ? 'dark' : 'light'));
        setAccentColorState(savedAccent || 'purple');
        setBackgroundTypeState(savedBgType || 'gradient');
        setBackgroundImageState(savedBgImage || '');
    }, []);

    useEffect(() => {
        if (!mounted) return;

        // Apply theme to document
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);

        // Apply accent color
        const accentHSL = ACCENT_COLORS[accentColor as keyof typeof ACCENT_COLORS] || ACCENT_COLORS.purple;
        root.style.setProperty('--color-primary', `hsl(${accentHSL})`);
        root.style.setProperty('--primary', accentHSL);
        localStorage.setItem('accentColor', accentColor);
    }, [theme, accentColor, mounted]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    const setAccentColor = (color: string) => {
        setAccentColorState(color);
    };

    const setBackgroundType = (type: BackgroundType) => {
        setBackgroundTypeState(type);
        localStorage.setItem('backgroundType', type);
    };

    const setBackgroundImage = (image: string) => {
        setBackgroundImageState(image);
        localStorage.setItem('backgroundImage', image);
    };

    const toggleTheme = () => {
        setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };

    // Prevent flash by rendering children immediately but with default values
    return (
        <ThemeContext.Provider
            value={{
                theme,
                accentColor,
                backgroundType,
                backgroundImage,
                setTheme,
                setAccentColor,
                setBackgroundType,
                setBackgroundImage,
                toggleTheme,
                mounted,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}

export { ACCENT_COLORS };
