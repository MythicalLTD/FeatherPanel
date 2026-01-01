/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
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
    const { theme, accentColor, toggleTheme, setAccentColor, mounted } = useTheme();
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
    ];

    // Don't render until mounted to avoid hydration mismatch
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
            {/* Desktop View */}
            <div className='hidden sm:flex items-center gap-2'>
                {/* Language Selector */}
                <LanguageSelector />

                {/* Background Customizer */}
                <BackgroundCustomizer />

                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className='h-10 w-10 rounded-full border border-border/50 bg-background/90 backdrop-blur-md hover:bg-background hover:scale-110 hover:shadow-lg transition-all duration-200 flex items-center justify-center'
                    title={theme === 'dark' ? t('appearance.theme.switchToLight') : t('appearance.theme.switchToDark')}
                >
                    {theme === 'dark' ? <Sun className='h-4 w-4' /> : <Moon className='h-4 w-4' />}
                </button>

                {/* Accent Color Picker */}
                <Menu as='div' className='relative'>
                    <MenuButton className='h-10 w-10 rounded-full border border-border/50 bg-background/90 backdrop-blur-md hover:bg-background hover:scale-110 hover:shadow-lg transition-all duration-200 flex items-center justify-center'>
                        <div
                            className='h-5 w-5 rounded-full border-2 border-white shadow-sm'
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
                        <MenuItems className='absolute right-0 mt-2 w-48 origin-top-right rounded-xl bg-card border border-border/50 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none backdrop-blur-xl p-2 z-50'>
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
                                                className='h-5 w-5 rounded-full border-2 border-white shadow-sm mr-3'
                                                style={{ backgroundColor: option.color }}
                                            />
                                            <span className='flex-1 text-left'>{option.name}</span>
                                            {accentColor === option.value && <Check className='h-4 w-4 text-primary' />}
                                        </button>
                                    )}
                                </MenuItem>
                            ))}
                        </MenuItems>
                    </Transition>
                </Menu>
            </div>

            {/* Mobile View - Consolidated Menu */}
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
                        <MenuItems className='absolute right-0 mt-2 w-64 origin-top-right rounded-xl bg-card border border-border/50 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none backdrop-blur-xl p-2 z-50 max-h-[80vh] overflow-y-auto'>
                            {/* Theme Toggle */}
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

                            {/* Background */}
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

                            <div className='my-2 border-t border-border/50' />

                            {/* Accent Colors Grid */}
                            <div className='px-3 py-2'>
                                <div className='text-xs font-semibold text-muted-foreground mb-2'>
                                    {t('appearance.accentColor')}
                                </div>
                                <div className='grid grid-cols-4 gap-2'>
                                    {accentColorOptions.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setAccentColor(option.value)}
                                            className='relative h-8 w-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center transition-transform hover:scale-110'
                                            style={{ backgroundColor: option.color }}
                                        >
                                            {accentColor === option.value && <Check className='h-4 w-4 text-white' />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className='my-2 border-t border-border/50' />

                            {/* Language List */}
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
