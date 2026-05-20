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
import { useSettings } from '@/contexts/SettingsContext';

type Theme = 'light' | 'dark';
type BackgroundType = 'aurora' | 'gradient' | 'solid' | 'image' | 'pattern';
export type BackgroundAnimatedVariant = 'aurora' | 'beams' | 'colorBends' | 'floatingLines' | 'silk';
export type BackgroundImageFit = 'cover' | 'contain' | 'fill';
/** Controls animations and transitions app-wide. */
export type MotionLevel = 'full' | 'reduced' | 'none';
/** UI font family preference. */
type FontFamily = 'system' | 'inter' | 'rounded';

function parseAndClamp(value: string | null, min: number, max: number, defaultValue: number): number {
    if (value == null) {
        return defaultValue;
    }
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
        return defaultValue;
    }
    return Math.min(max, Math.max(min, parsed));
}

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
    /** UI font family preference (system, Inter, rounded). */
    fontFamily: FontFamily;
    setTheme: (theme: Theme) => void;
    setAccentColor: (color: string) => void;
    setBackgroundType: (type: BackgroundType) => void;
    setBackgroundAnimatedVariant: (variant: BackgroundAnimatedVariant) => void;
    setBackgroundImage: (image: string) => void;
    setBackdropBlur: (px: number) => void;
    setBackdropDarken: (percent: number) => void;
    setBackgroundImageFit: (fit: BackgroundImageFit) => void;
    setMotionLevel: (level: MotionLevel) => void;
    setFontFamily: (font: FontFamily) => void;
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
    indigo: '245 58% 51%',
    violet: '270 75% 55%',
    cyan: '188 78% 41%',
    lime: '84 69% 35%',
    amber: '38 92% 50%',
    rose: '347 77% 50%',
    slate: '215 20% 45%',
};

const ACCENT_FOREGROUNDS: Partial<Record<keyof typeof ACCENT_COLORS, string>> = {
    orange: '0 0% 9%',
    teal: '0 0% 9%',
    yellow: '0 0% 9%',
    cyan: '0 0% 9%',
    lime: '0 0% 9%',
    amber: '0 0% 9%',
};

const USER_OVERRIDE_KEYS = {
    theme: 'themeUserOverride',
    accentColor: 'accentColorUserOverride',
    backgroundType: 'backgroundTypeUserOverride',
    backdropBlur: 'backdropBlurUserOverride',
    backdropDarken: 'backdropDarkenUserOverride',
    backgroundImageFit: 'backgroundImageFitUserOverride',
};

function hasUserOverride(key: keyof typeof USER_OVERRIDE_KEYS): boolean {
    return localStorage.getItem(USER_OVERRIDE_KEYS[key]) === 'true';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false);
    const [theme, setThemeState] = useState<Theme>('dark');
    const [accentColor, setAccentColorState] = useState('purple');
    const [backgroundType, setBackgroundTypeState] = useState<BackgroundType>('pattern');
    const [backgroundAnimatedVariant, setBackgroundAnimatedVariantState] =
        useState<BackgroundAnimatedVariant>('aurora');
    const [backgroundImage, setBackgroundImageState] = useState('');
    const [backdropBlur, setBackdropBlurState] = useState(0);
    const [backdropDarken, setBackdropDarkenState] = useState(0);
    const [backgroundImageFit, setBackgroundImageFitState] = useState<BackgroundImageFit>('cover');
    const [motionLevel, setMotionLevelState] = useState<MotionLevel>('full');
    const [fontFamily, setFontFamilyState] = useState<FontFamily>('inter');
    const { settings } = useSettings();

    useLayoutEffect(() => {
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
        const savedFontFamily = localStorage.getItem('fontFamily') as FontFamily | null;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Load initial values from localStorage until public admin settings are available.
        setThemeState(saved || (prefersDark ? 'dark' : 'light'));
        setAccentColorState(savedAccent && savedAccent in ACCENT_COLORS ? savedAccent : 'purple');
        setBackgroundTypeState(
            savedBgType === 'aurora' ||
                savedBgType === 'gradient' ||
                savedBgType === 'solid' ||
                savedBgType === 'image' ||
                savedBgType === 'pattern'
                ? savedBgType
                : 'pattern',
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
        setBackdropBlurState(parseAndClamp(savedBlur, 0, 24, 0));
        setBackdropDarkenState(parseAndClamp(savedDarken, 0, 100, 0));
        setBackgroundImageFitState(savedFit === 'contain' || savedFit === 'fill' ? savedFit : 'cover');
        const initialMotion: MotionLevel =
            savedMotion === 'full' || savedMotion === 'reduced' || savedMotion === 'none'
                ? savedMotion
                : prefersReducedMotion
                  ? 'reduced'
                  : 'full';
        setMotionLevelState(initialMotion);
        localStorage.setItem('motionLevel', initialMotion);

        const initialFont: FontFamily =
            savedFontFamily === 'system' || savedFontFamily === 'rounded' || savedFontFamily === 'inter'
                ? savedFontFamily
                : 'inter';
        setFontFamilyState(initialFont);
        localStorage.setItem('fontFamily', initialFont);
    }, []);

    // Apply admin defaults on load and when settings change.
    useEffect(() => {
        if (!mounted || !settings) return;

        const adminBgUrl = (settings.app_background_image_url ?? '').trim();
        const imageLock = settings.app_background_lock === 'true';
        const forcedTheme = settings.app_theme_default as Theme;
        const forcedAccent = settings.app_accent_color_default;
        const forcedBgType = settings.app_background_type_default as BackgroundType;
        const forcedBlur = parseAndClamp(settings.app_backdrop_blur_default ?? '0', 0, 24, 0);
        const forcedDarken = parseAndClamp(settings.app_backdrop_darken_default ?? '0', 0, 100, 0);
        const rawFit = (settings.app_background_image_fit_default ?? 'cover').toLowerCase();
        const forcedFit: BackgroundImageFit =
            rawFit === 'contain' || rawFit === 'fill' ? (rawFit as BackgroundImageFit) : 'cover';
        const validThemes: Theme[] = ['light', 'dark'];
        const validBgTypes: BackgroundType[] = ['aurora', 'gradient', 'solid', 'image', 'pattern'];

        // Locked settings always win; unlocked settings use admin defaults until the user chooses otherwise.
        const shouldUseThemeDefault = settings.app_theme_lock === 'true' || !hasUserOverride('theme');
        const shouldUseAccentDefault = settings.app_accent_color_lock === 'true' || !hasUserOverride('accentColor');
        const shouldUseBackgroundTypeDefault =
            settings.app_background_type_lock === 'true' || !hasUserOverride('backgroundType');
        const shouldUseBlurDefault = settings.app_backdrop_blur_lock === 'true' || !hasUserOverride('backdropBlur');
        const shouldUseDarkenDefault =
            settings.app_backdrop_darken_lock === 'true' || !hasUserOverride('backdropDarken');
        const shouldUseFitDefault =
            settings.app_background_image_fit_lock === 'true' || !hasUserOverride('backgroundImageFit');

        if (shouldUseThemeDefault && forcedTheme && validThemes.includes(forcedTheme) && theme !== forcedTheme) {
            setThemeState(forcedTheme);
            localStorage.setItem('theme', forcedTheme);
        }

        if (shouldUseAccentDefault && forcedAccent && forcedAccent in ACCENT_COLORS && accentColor !== forcedAccent) {
            setAccentColorState(forcedAccent);
            localStorage.setItem('accentColor', forcedAccent);
        }

        // Enforce background type: light mode limits and forced image when background URL is locked.
        const mustUseImageForLockedBg = imageLock && adminBgUrl !== '';
        if (theme === 'light') {
            if (backgroundType !== 'pattern' && backgroundType !== 'solid') {
                setBackgroundTypeState('pattern');
                localStorage.setItem('backgroundType', 'pattern');
            }
        } else if (shouldUseBackgroundTypeDefault || mustUseImageForLockedBg) {
            const targetType: BackgroundType | null = mustUseImageForLockedBg
                ? 'image'
                : forcedBgType && validBgTypes.includes(forcedBgType)
                  ? forcedBgType
                  : null;
            if (targetType && backgroundType !== targetType) {
                setBackgroundTypeState(targetType);
                localStorage.setItem('backgroundType', targetType);
            }
        }

        if (shouldUseBlurDefault && backdropBlur !== forcedBlur) {
            setBackdropBlurState(forcedBlur);
            localStorage.setItem('backdropBlur', String(forcedBlur));
        }

        if (shouldUseDarkenDefault && backdropDarken !== forcedDarken) {
            setBackdropDarkenState(forcedDarken);
            localStorage.setItem('backdropDarken', String(forcedDarken));
        }

        if (shouldUseFitDefault && backgroundImageFit !== forcedFit) {
            setBackgroundImageFitState(forcedFit);
            localStorage.setItem('backgroundImageFit', forcedFit);
        }
    }, [settings, mounted, theme, accentColor, backgroundType, backdropBlur, backdropDarken, backgroundImageFit]);

    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);

        const accentHSL = ACCENT_COLORS[accentColor as keyof typeof ACCENT_COLORS] || ACCENT_COLORS.purple;
        const primaryForeground = ACCENT_FOREGROUNDS[accentColor as keyof typeof ACCENT_FOREGROUNDS] || '0 0% 98%';
        root.style.setProperty('--color-primary', `hsl(${accentHSL})`);
        root.style.setProperty('--primary', accentHSL);
        root.style.setProperty('--color-primary-foreground', `hsl(${primaryForeground})`);
        root.style.setProperty('--primary-foreground', primaryForeground);
        localStorage.setItem('accentColor', accentColor);

        const fontStacks: Record<FontFamily, string> = {
            inter: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            system: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            rounded: "'Nunito', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        };
        const stack = fontStacks[fontFamily] || fontStacks.inter;
        root.style.setProperty('--app-font-family', stack);
        localStorage.setItem('fontFamily', fontFamily);
    }, [theme, accentColor, fontFamily, mounted]);

    // Locks are still enforced inside setter functions so user controls cannot
    // move away from admin-restricted values between settings refreshes.

    useEffect(() => {
        if (!mounted || typeof document === 'undefined') return;
        document.documentElement.dataset.motion = motionLevel;
    }, [motionLevel, mounted]);

    const setTheme = (newTheme: Theme) => {
        // If admin locked theme, ignore user changes.
        if (settings?.app_theme_lock === 'true') return;
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);
        localStorage.setItem(USER_OVERRIDE_KEYS.theme, 'true');
    };

    const setAccentColor = (color: string) => {
        // If admin locked accent color, ignore user changes.
        if (settings?.app_accent_color_lock === 'true') return;
        setAccentColorState(color);
        localStorage.setItem('accentColor', color);
        localStorage.setItem(USER_OVERRIDE_KEYS.accentColor, 'true');
    };

    const setBackgroundType = (type: BackgroundType) => {
        const adminUrl = (settings?.app_background_image_url ?? '').trim();
        const imageLocked = settings?.app_background_lock === 'true';
        const mustUseImageForLockedBg = Boolean(imageLocked && adminUrl);
        if (mustUseImageForLockedBg && type !== 'image') {
            return;
        }
        if (settings?.app_background_type_lock === 'true') {
            if (!mustUseImageForLockedBg) {
                const forced = settings.app_background_type_default as BackgroundType;
                const validBgTypes: BackgroundType[] = ['aurora', 'gradient', 'solid', 'image', 'pattern'];
                if (!forced || !validBgTypes.includes(forced) || type !== forced) {
                    return;
                }
            }
        }
        setBackgroundTypeState(type);
        localStorage.setItem('backgroundType', type);
        localStorage.setItem(USER_OVERRIDE_KEYS.backgroundType, 'true');
    };

    const setBackgroundAnimatedVariant = (variant: BackgroundAnimatedVariant) => {
        // If admin locked background type, also prevent changing the animated variant.
        if (settings?.app_background_type_lock === 'true') return;

        setBackgroundAnimatedVariantState(variant);
        localStorage.setItem('backgroundAnimatedVariant', variant);
    };

    const setBackgroundImage = (image: string) => {
        if (settings?.app_background_lock === 'true') {
            const adminUrl = (settings.app_background_image_url ?? '').trim();
            const next = image.trim();
            if (adminUrl !== '' && next !== adminUrl) {
                return;
            }
            if (adminUrl === '' && next !== '') {
                return;
            }
        }
        setBackgroundImageState(image);
        localStorage.setItem('backgroundImage', image);
    };

    const setBackdropBlur = (px: number) => {
        // If admin locked blur, ignore user changes.
        if (settings?.app_backdrop_blur_lock === 'true') return;
        const value = Math.min(24, Math.max(0, px));
        setBackdropBlurState(value);
        localStorage.setItem('backdropBlur', String(value));
        localStorage.setItem(USER_OVERRIDE_KEYS.backdropBlur, 'true');
    };

    const setBackdropDarken = (percent: number) => {
        // If admin locked darken, ignore user changes.
        if (settings?.app_backdrop_darken_lock === 'true') return;
        const value = Math.min(100, Math.max(0, percent));
        setBackdropDarkenState(value);
        localStorage.setItem('backdropDarken', String(value));
        localStorage.setItem(USER_OVERRIDE_KEYS.backdropDarken, 'true');
    };

    const setBackgroundImageFit = (fit: BackgroundImageFit) => {
        if (settings?.app_background_image_fit_lock === 'true') {
            const raw = (settings.app_background_image_fit_default ?? 'cover').toLowerCase();
            const forced: BackgroundImageFit =
                raw === 'contain' || raw === 'fill' ? (raw as BackgroundImageFit) : 'cover';
            if (fit !== forced) return;
        }
        setBackgroundImageFitState(fit);
        localStorage.setItem('backgroundImageFit', fit);
        localStorage.setItem(USER_OVERRIDE_KEYS.backgroundImageFit, 'true');
    };

    const setMotionLevel = (level: MotionLevel) => {
        setMotionLevelState(level);
        localStorage.setItem('motionLevel', level);
    };

    const setFontFamily = (font: FontFamily) => {
        setFontFamilyState(font);
        localStorage.setItem('fontFamily', font);
    };

    const toggleTheme = () => {
        const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
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
                fontFamily,
                setTheme,
                setAccentColor,
                setBackgroundType,
                setBackgroundAnimatedVariant,
                setBackgroundImage,
                setBackdropBlur,
                setBackdropDarken,
                setBackgroundImageFit,
                setMotionLevel,
                setFontFamily,
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
