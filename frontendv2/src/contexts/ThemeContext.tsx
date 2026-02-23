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
type BackgroundType = 'aurora' | 'gradient' | 'solid' | 'image' | 'pattern';
export type BackgroundAnimatedVariant = 'aurora' | 'beams' | 'colorBends' | 'floatingLines' | 'silk';
export type BackgroundImageFit = 'cover' | 'contain' | 'fill';
/** Controls animations and transitions app-wide. */
export type MotionLevel = 'full' | 'reduced' | 'none';

interface ThemeContextType {
    theme: Theme;
    accentColor: string;
    backgroundType: BackgroundType;
    backgroundAnimatedVariant: BackgroundAnimatedVariant;
    backgroundImage: string;
    /** Backdrop blur in pixels (0, 4, 8, 12, 16, 24). */
    backdropBlur: number;
    /** Backdrop dark overlay opacity 0–100. */
    backdropDarken: number;
    /** How custom background image fits (cover, contain, fill). */
    backgroundImageFit: BackgroundImageFit;
    /** Animations and transitions: full, reduced, or none. */
    motionLevel: MotionLevel;
    setTheme: (theme: Theme) => void;
    setAccentColor: (color: string) => void;
    setBackgroundType: (type: BackgroundType) => void;
    setBackgroundAnimatedVariant: (variant: BackgroundAnimatedVariant) => void;
    setBackgroundImage: (image: string) => void;
    setBackdropBlur: (px: number) => void;
    setBackdropDarken: (percent: number) => void;
    setBackgroundImageFit: (fit: BackgroundImageFit) => void;
    setMotionLevel: (level: MotionLevel) => void;
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
    white: '210 20% 92%',
    violet: '270 75% 55%',
    cyan: '188 78% 41%',
    lime: '84 69% 35%',
    amber: '38 92% 50%',
    rose: '347 77% 50%',
    slate: '215 20% 45%',
};

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false);
    const [theme, setThemeState] = useState<Theme>('dark');
    const [accentColor, setAccentColorState] = useState('purple');
    const [backgroundType, setBackgroundTypeState] = useState<BackgroundType>('aurora');
    const [backgroundAnimatedVariant, setBackgroundAnimatedVariantState] =
        useState<BackgroundAnimatedVariant>('aurora');
    const [backgroundImage, setBackgroundImageState] = useState('');
    const [backdropBlur, setBackdropBlurState] = useState(0);
    const [backdropDarken, setBackdropDarkenState] = useState(0);
    const [backgroundImageFit, setBackgroundImageFitState] = useState<BackgroundImageFit>('cover');
    const [motionLevel, setMotionLevelState] = useState<MotionLevel>('reduced');

    useLayoutEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
        const saved = localStorage.getItem('theme') as Theme | null;
        const savedAccent = localStorage.getItem('accentColor');
        const savedBgType = localStorage.getItem('backgroundType') as BackgroundType | null;
        const savedAnimatedVariant = localStorage.getItem(
            'backgroundAnimatedVariant',
        ) as BackgroundAnimatedVariant | null;
        const savedBgImage = localStorage.getItem('backgroundImage');
        const savedBlur = localStorage.getItem('backdropBlur');
        const savedDarken = localStorage.getItem('backdropDarken');
        const savedFit = localStorage.getItem('backgroundImageFit') as BackgroundImageFit | null;
        const savedMotion = localStorage.getItem('motionLevel') as MotionLevel | null;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        setThemeState(saved || (prefersDark ? 'dark' : 'light'));
        setAccentColorState(savedAccent && savedAccent in ACCENT_COLORS ? savedAccent : 'purple');
        setBackgroundTypeState(
            savedBgType === 'aurora' ||
                savedBgType === 'gradient' ||
                savedBgType === 'solid' ||
                savedBgType === 'image' ||
                savedBgType === 'pattern'
                ? savedBgType
                : 'aurora',
        );
        setBackgroundAnimatedVariantState(
            savedAnimatedVariant === 'aurora' ||
                savedAnimatedVariant === 'beams' ||
                savedAnimatedVariant === 'colorBends' ||
                savedAnimatedVariant === 'floatingLines' ||
                savedAnimatedVariant === 'silk'
                ? savedAnimatedVariant
                : 'aurora',
        );
        setBackgroundImageState(savedBgImage || '');
        setBackdropBlurState(savedBlur != null ? Math.min(24, Math.max(0, parseInt(savedBlur, 10) || 0)) : 0);
        setBackdropDarkenState(savedDarken != null ? Math.min(100, Math.max(0, parseInt(savedDarken, 10) || 0)) : 0);
        setBackgroundImageFitState(savedFit === 'contain' || savedFit === 'fill' ? savedFit : 'cover');
        setMotionLevelState(savedMotion === 'full' ? 'full' : savedMotion === 'none' ? 'none' : 'reduced');
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);

        const accentHSL = ACCENT_COLORS[accentColor as keyof typeof ACCENT_COLORS] || ACCENT_COLORS.purple;
        root.style.setProperty('--color-primary', `hsl(${accentHSL})`);
        root.style.setProperty('--primary', accentHSL);
        localStorage.setItem('accentColor', accentColor);
    }, [theme, accentColor, mounted]);

    useEffect(() => {
        if (!mounted || typeof document === 'undefined') return;
        document.documentElement.dataset.motion = motionLevel;
    }, [motionLevel, mounted]);

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

    const setBackgroundAnimatedVariant = (variant: BackgroundAnimatedVariant) => {
        setBackgroundAnimatedVariantState(variant);
        localStorage.setItem('backgroundAnimatedVariant', variant);
    };

    const setBackgroundImage = (image: string) => {
        setBackgroundImageState(image);
        localStorage.setItem('backgroundImage', image);
    };

    const setBackdropBlur = (px: number) => {
        const value = Math.min(24, Math.max(0, px));
        setBackdropBlurState(value);
        localStorage.setItem('backdropBlur', String(value));
    };

    const setBackdropDarken = (percent: number) => {
        const value = Math.min(100, Math.max(0, percent));
        setBackdropDarkenState(value);
        localStorage.setItem('backdropDarken', String(value));
    };

    const setBackgroundImageFit = (fit: BackgroundImageFit) => {
        setBackgroundImageFitState(fit);
        localStorage.setItem('backgroundImageFit', fit);
    };

    const setMotionLevel = (level: MotionLevel) => {
        setMotionLevelState(level);
        localStorage.setItem('motionLevel', level);
    };

    const toggleTheme = () => {
        setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };

    return (
        <ThemeContext.Provider
            value={{
                theme,
                accentColor,
                backgroundType,
                backgroundAnimatedVariant,
                backgroundImage,
                backdropBlur,
                backdropDarken,
                backgroundImageFit,
                motionLevel,
                setTheme,
                setAccentColor,
                setBackgroundType,
                setBackgroundAnimatedVariant,
                setBackgroundImage,
                setBackdropBlur,
                setBackdropDarken,
                setBackgroundImageFit,
                setMotionLevel,
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
