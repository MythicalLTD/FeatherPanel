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

import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { Check, Palette, Image as ImageIcon, Moon, Sun } from 'lucide-react';
import BackgroundCustomizer from '@/components/theme/BackgroundCustomizer';
import LanguageSelector from '@/components/layout/LanguageSelector';

export default function ThemeCustomizer() {
    const { theme, accentColor, setAccentColor, fontFamily, setFontFamily, toggleTheme, mounted } = useTheme();
    const { t, availableLanguages, setLocale, locale } = useTranslation();

    const accentColorOptions = [
        { name: t('appearance.colors.purple'), value: 'purple', color: 'hsl(262 83% 58%)' },
        { name: t('appearance.colors.blue'), value: 'blue', color: 'hsl(217 91% 60%)' },
        { name: t('appearance.colors.green'), value: 'green', color: 'hsl(142 71% 45%)' },
        { name: t('appearance.colors.red'), value: 'red', color: 'hsl(0 84% 60%)' },
        { name: t('appearance.colors.orange'), value: 'orange', color: 'hsl(25 95% 53%)' },
        { name: t('appearance.colors.pink'), value: 'pink', color: 'hsl(330 81% 60%)' },
        { name: t('appearance.colors.teal'), value: 'teal', color: 'hsl(173 80% 40%)' },
        { name: t('appearance.colors.yellow'), value: 'yellow', color: 'hsl(48 96% 53%)' },
        { name: t('appearance.colors.white'), value: 'white', color: 'hsl(210 20% 92%)' },
        { name: t('appearance.colors.violet'), value: 'violet', color: 'hsl(270 75% 55%)' },
        { name: t('appearance.colors.cyan'), value: 'cyan', color: 'hsl(188 78% 41%)' },
        { name: t('appearance.colors.lime'), value: 'lime', color: 'hsl(84 69% 35%)' },
        { name: t('appearance.colors.amber'), value: 'amber', color: 'hsl(38 92% 50%)' },
        { name: t('appearance.colors.rose'), value: 'rose', color: 'hsl(347 77% 50%)' },
        { name: t('appearance.colors.slate'), value: 'slate', color: 'hsl(215 20% 45%)' },
    ];

    const fontOptions = [
        {
            name: 'Modern (Inter)',
            value: 'inter' as const,
            preview:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
        {
            name: 'System UI',
            value: 'system' as const,
            preview:
                "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
        {
            name: 'Rounded (Nunito)',
            value: 'rounded' as const,
            preview:
                "'Nunito', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
    ];

    if (!mounted) {
        return (
            <div className='flex items-center gap-2'>
                <div className='h-10 w-10 rounded-full border border-border/50 bg-background/90 backdrop-blur-md' />
                <div className='h-10 w-10 rounded-full border border-border/50 bg-background/90 backdrop-blur-md' />
                <div className='h-10 w-10 rounded-full border border-border/50 bg-background/90 backdrop-blur-md' />
                <div className='h-10 w-10 rounded-full border border-border/50 bg-background/90 backdrop-blur-md' />
            </div>
        );
    }

    return (
        <div className='flex items-center gap-2'>
            <div className='hidden sm:flex items-center gap-2'>
                <LanguageSelector />

                <BackgroundCustomizer />

                <button
                    onClick={toggleTheme}
                    className='h-10 w-10 rounded-full border border-border/50 bg-background/90 backdrop-blur-md hover:bg-background hover:scale-105 transition-all duration-200 flex items-center justify-center'
                    title={theme === 'dark' ? t('appearance.theme.switchToLight') : t('appearance.theme.switchToDark')}
                >
                    {theme === 'dark' ? <Sun className='h-4 w-4' /> : <Moon className='h-4 w-4' />}
                </button>

                <Menu as='div' className='relative'>
                    <MenuButton className='h-10 w-10 rounded-full border border-border/50 bg-background/90 backdrop-blur-md hover:bg-background hover:scale-105 transition-all duration-200 flex items-center justify-center'>
                        <div
                            className='h-5 w-5 rounded-full border-2 border-white'
                            style={{ backgroundColor: accentColorOptions.find((c) => c.value === accentColor)?.color }}
                        />
                    </MenuButton>

                    <Transition
                        as={Fragment}
                        enter='transition ease-out duration-100'
                        enterFrom='transform opacity-0 scale-95'
                        enterTo='transform opacity-100 scale-100'
                        leave='transition ease-in duration-75'
                        leaveFrom='transform opacity-100 scale-100'
                        leaveTo='transform opacity-0 scale-95'
                    >
                        <MenuItems className='absolute right-0 mt-2 w-52 origin-top-right rounded-xl bg-card border border-border/50 ring-1 ring-black ring-opacity-5 focus:outline-none backdrop-blur-xl p-2 z-50'>
                            <div className='px-3 py-2 text-sm font-semibold text-foreground border-b border-border/50 mb-2'>
                                {t('appearance.accentColor')}
                            </div>
                            {accentColorOptions.map((option) => (
                                <MenuItem key={option.value}>
                                    {({ focus }) => (
                                        <button
                                            onClick={() => setAccentColor(option.value)}
                                            className={`${
                                                focus ? 'bg-accent' : ''
                                            } group flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors`}
                                        >
                                            <div
                                                className='h-5 w-5 rounded-full border-2 border-white mr-3'
                                                style={{ backgroundColor: option.color }}
                                            />
                                            <span className='flex-1 text-left'>{option.name}</span>
                                            {accentColor === option.value && <Check className='h-4 w-4 text-primary' />}
                                        </button>
                                    )}
                                </MenuItem>
                            ))}
                            <div className='my-2 border-t border-border/50' />
                            <div className='px-3 py-1 text-xs font-semibold text-muted-foreground'>
                                Fonts
                            </div>
                            {fontOptions.map((option) => (
                                <MenuItem key={option.value}>
                                    {({ focus }) => (
                                        <button
                                            onClick={() => setFontFamily(option.value)}
                                            className={`${
                                                focus ? 'bg-accent' : ''
                                            } group flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors`}
                                        >
                                            <span
                                                className='flex-1 text-left'
                                                style={{ fontFamily: option.preview }}
                                            >
                                                {option.name}
                                            </span>
                                            {fontFamily === option.value && (
                                                <Check className='h-4 w-4 text-primary' />
                                            )}
                                        </button>
                                    )}
                                </MenuItem>
                            ))}
                            {/* Motion level selector removed – motion is now always off ('none'). */}
                        </MenuItems>
                    </Transition>
                </Menu>
            </div>

            <div className='sm:hidden'>
                <Menu as='div' className='relative'>
                    <MenuButton className='h-10 w-10 rounded-full border border-border/50 bg-background/90 backdrop-blur-md flex items-center justify-center'>
                        <Palette className='h-5 w-5' />
                    </MenuButton>

                    <Transition
                        as={Fragment}
                        enter='transition ease-out duration-100'
                        enterFrom='transform opacity-0 scale-95'
                        enterTo='transform opacity-100 scale-100'
                        leave='transition ease-in duration-75'
                        leaveFrom='transform opacity-100 scale-100'
                        leaveTo='transform opacity-0 scale-95'
                    >
                        <MenuItems className='absolute right-0 mt-2 w-64 origin-top-right rounded-xl bg-card border border-border/50 ring-1 ring-black ring-opacity-5 focus:outline-none backdrop-blur-xl p-2 z-50 max-h-[80vh] overflow-y-auto'>
                            <MenuItem>
                                {({ focus }) => (
                                    <button
                                        onClick={toggleTheme}
                                        className={`${focus ? 'bg-accent' : ''} flex w-full items-center rounded-lg px-3 py-2.5 text-sm transition-colors`}
                                    >
                                        {theme === 'dark' ? (
                                            <Sun className='h-4 w-4 mr-3' />
                                        ) : (
                                            <Moon className='h-4 w-4 mr-3' />
                                        )}
                                        {theme === 'dark' ? t('appearance.theme.light') : t('appearance.theme.dark')}
                                    </button>
                                )}
                            </MenuItem>

                            <MenuItem>
                                {({ focus }) => (
                                    <BackgroundCustomizer>
                                        <div
                                            className={`${focus ? 'bg-accent' : ''} flex w-full items-center rounded-lg px-3 py-2.5 text-sm transition-colors cursor-pointer`}
                                        >
                                            <ImageIcon className='h-4 w-4 mr-3' />
                                            {t('appearance.background.change')}
                                        </div>
                                    </BackgroundCustomizer>
                                )}
                            </MenuItem>

                            {/* Motion level selector removed – motion is now always off ('none'). */}

                            <div className='my-2 border-t border-border/50' />

                            <div className='px-3 py-2'>
                                <div className='text-xs font-semibold text-muted-foreground mb-2'>
                                    {t('appearance.accentColor')}
                                </div>
                                <div className='grid grid-cols-4 gap-2'>
                                    {accentColorOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setAccentColor(option.value)}
                                            className='relative h-8 w-8 rounded-full border-2 border-white flex items-center justify-center transition-transform hover:scale-110'
                                            style={{ backgroundColor: option.color }}
                                        >
                                            {accentColor === option.value && <Check className='h-4 w-4 text-white' />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className='my-2 border-t border-border/50' />

                            <div className='px-3 py-1'>
                                <div className='text-xs font-semibold text-muted-foreground mb-2'>
                                    Fonts
                                </div>
                                <div className='space-y-1'>
                                    {fontOptions.map((option) => (
                                        <MenuItem key={option.value}>
                                            {({ focus }) => (
                                                <button
                                                    onClick={() => setFontFamily(option.value)}
                                                    className={`${focus ? 'bg-accent' : ''} flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors ${
                                                        fontFamily === option.value ? 'text-primary' : ''
                                                    }`}
                                                    style={{ fontFamily: option.preview }}
                                                >
                                                    <span>{option.name}</span>
                                                    {fontFamily === option.value && (
                                                        <Check className='h-3 w-3' />
                                                    )}
                                                </button>
                                            )}
                                        </MenuItem>
                                    ))}
                                </div>
                            </div>

                            <div className='my-2 border-t border-border/50' />

                            <div className='px-3 py-1'>
                                <div className='text-xs font-semibold text-muted-foreground mb-2'>
                                    {t('appearance.language')}
                                </div>
                                <div className='space-y-1'>
                                    {availableLanguages.map((language) => (
                                        <MenuItem key={language.code}>
                                            {({ focus }) => (
                                                <button
                                                    onClick={() => setLocale(language.code)}
                                                    className={`${focus ? 'bg-accent' : ''} flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors ${locale === language.code ? 'text-primary' : ''}`}
                                                >
                                                    <span>{language.nativeName}</span>
                                                    {locale === language.code && <Check className='h-3 w-3' />}
                                                </button>
                                            )}
                                        </MenuItem>
                                    ))}
                                </div>
                            </div>
                        </MenuItems>
                    </Transition>
                </Menu>
            </div>
        </div>
    );
}
