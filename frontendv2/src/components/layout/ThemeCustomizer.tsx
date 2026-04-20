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

import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { Check, Globe, Image as ImageIcon, LayoutTemplate, Moon, Palette, PanelTop, Sun, XIcon } from 'lucide-react';
import { useNavbarHoverReveal } from '@/hooks/useNavbarHoverReveal';
import { useChromeLayout } from '@/hooks/useChromeLayout';
import BackgroundCustomizer from '@/components/theme/BackgroundCustomizer';
import { cn } from '@/lib/utils';

const dialogPanelClass =
    'w-full overflow-hidden rounded-2xl border border-border bg-background text-card-foreground shadow-2xl shadow-black/25 focus:outline-none sm:max-w-2xl';

const sectionLabelClass = 'mb-1.5 px-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground';

const panelSectionClass = 'px-2.5 py-2';

function segmentButtonClass(active: boolean) {
    return cn(
        'flex min-h-11 w-full items-center justify-center gap-1 rounded-xl border px-3 py-2 text-sm font-medium leading-none transition-colors sm:min-h-9 sm:text-xs',
        active
            ? 'border-primary/50 bg-primary/20 text-primary'
            : 'border-transparent bg-transparent text-muted-foreground hover:text-foreground',
    );
}

export default function ThemeCustomizer() {
    const { theme, accentColor, setAccentColor, fontFamily, setFontFamily, toggleTheme, mounted } = useTheme();
    const { navbarHoverReveal, setNavbarHoverReveal } = useNavbarHoverReveal();
    const { chromeLayout, setChromeLayout } = useChromeLayout();
    const { t, availableLanguages, setLocale, locale } = useTranslation();
    const [customizerOpen, setCustomizerOpen] = useState(false);
    const [backgroundDialogOpen, setBackgroundDialogOpen] = useState(false);

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
            preview: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
        {
            name: 'System UI',
            value: 'system' as const,
            preview: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
        {
            name: 'Rounded (Nunito)',
            value: 'rounded' as const,
            preview: "'Nunito', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
    ];

    const currentAccent = accentColorOptions.find((c) => c.value === accentColor)?.color ?? 'hsl(var(--primary))';

    if (!mounted) {
        return (
            <div className='flex items-center'>
                <div className='h-9 w-9 rounded-xl border border-border/50 bg-muted/20 sm:h-10 sm:w-10' />
            </div>
        );
    }

    return (
        <>
            <button
                type='button'
                title={t('appearance.settingsMenuTitle')}
                onClick={() => setCustomizerOpen(true)}
                className='relative flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground'
            >
                <Palette className='h-5.5 w-5.5' aria-hidden />
                <span
                    className='pointer-events-none absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full ring-2 ring-card'
                    style={{ backgroundColor: currentAccent }}
                    aria-hidden
                />
            </button>

            <Transition appear show={customizerOpen} as={Fragment}>
                <Dialog as='div' className='relative z-[90]' onClose={setCustomizerOpen}>
                    <TransitionChild
                        as={Fragment}
                        enter='ease-out duration-200'
                        enterFrom='opacity-0'
                        enterTo='opacity-100'
                        leave='ease-in duration-150'
                        leaveFrom='opacity-100'
                        leaveTo='opacity-0'
                    >
                        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm' />
                    </TransitionChild>

                    <div className='fixed inset-0 overflow-y-auto'>
                        <div className='flex min-h-full items-start justify-center p-2 pt-16 sm:items-center sm:p-4'>
                            <TransitionChild
                                as={Fragment}
                                enter='ease-out duration-200'
                                enterFrom='opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95'
                                enterTo='opacity-100 translate-y-0 sm:scale-100'
                                leave='ease-in duration-150'
                                leaveFrom='opacity-100 translate-y-0 sm:scale-100'
                                leaveTo='opacity-0 translate-y-2 sm:translate-y-0 sm:scale-95'
                            >
                                <DialogPanel className={dialogPanelClass}>
                                    <div className='border-b border-border bg-background px-4 py-3.5'>
                                        <div className='flex items-start justify-between gap-3'>
                                            <div>
                                                <DialogTitle className='text-base font-semibold leading-tight text-foreground'>
                                                    {t('appearance.settingsMenuTitle')}
                                                </DialogTitle>
                                                <p className='text-sm text-muted-foreground/95'>
                                                    {t('appearance.settingsMenuSubtitle')}
                                                </p>
                                            </div>
                                            <button
                                                type='button'
                                                onClick={() => setCustomizerOpen(false)}
                                                className='rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
                                            >
                                                <XIcon className='h-5 w-5' />
                                            </button>
                                        </div>
                                    </div>

                                    <div className='max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain p-3 sm:max-h-[min(32rem,78dvh)]'>
                                        <div className='mb-3 grid grid-cols-2 gap-2'>
                                            <button
                                                type='button'
                                                onClick={toggleTheme}
                                                title={
                                                    theme === 'dark'
                                                        ? t('appearance.theme.switchToLight')
                                                        : t('appearance.theme.switchToDark')
                                                }
                                                className='flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/25 px-3 text-sm font-medium transition-colors hover:bg-accent/50 sm:h-10 sm:text-xs'
                                            >
                                                {theme === 'dark' ? (
                                                    <Sun className='h-4 w-4 text-amber-400' aria-hidden />
                                                ) : (
                                                    <Moon className='h-4 w-4 text-slate-500' aria-hidden />
                                                )}
                                                <span>
                                                    {theme === 'dark'
                                                        ? t('appearance.theme.light')
                                                        : t('appearance.theme.dark')}
                                                </span>
                                            </button>

                                            <button
                                                type='button'
                                                title={t('appearance.background.customize')}
                                                onClick={() => {
                                                    setCustomizerOpen(false);
                                                    setBackgroundDialogOpen(true);
                                                }}
                                                className='flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/25 px-3 text-sm font-medium transition-colors hover:bg-accent/50 sm:h-10 sm:text-xs'
                                            >
                                                <ImageIcon className='h-4 w-4 text-muted-foreground' aria-hidden />
                                                <span>{t('appearance.background.change')}</span>
                                            </button>
                                        </div>

                                        <div className='rounded-2xl border border-border divide-y divide-border bg-card'>
                                            <div className={panelSectionClass}>
                                                <p className={sectionLabelClass}>{t('appearance.accentColor')}</p>
                                                <div className='grid grid-cols-5 gap-2.5 sm:gap-2'>
                                                    {accentColorOptions.map((option) => (
                                                        <button
                                                            key={option.value}
                                                            type='button'
                                                            title={option.name}
                                                            onClick={() => setAccentColor(option.value)}
                                                            className={cn(
                                                                'relative mx-auto flex h-10 w-10 items-center justify-center rounded-full ring-1 ring-border/60 transition-transform hover:scale-105 sm:h-8 sm:w-8',
                                                                accentColor === option.value &&
                                                                    'ring-2 ring-primary ring-offset-1 ring-offset-card',
                                                            )}
                                                            style={{ backgroundColor: option.color }}
                                                        >
                                                            {accentColor === option.value && (
                                                                <Check
                                                                    className={cn(
                                                                        'h-3 w-3 drop-shadow-sm sm:h-2.5 sm:w-2.5',
                                                                        option.value === 'white' ||
                                                                            option.value === 'yellow'
                                                                            ? 'text-foreground'
                                                                            : 'text-white',
                                                                    )}
                                                                    strokeWidth={3}
                                                                    aria-hidden
                                                                />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className={panelSectionClass}>
                                                <p className={sectionLabelClass}>
                                                    {t('appearance.chromeLayout.title')}
                                                </p>
                                                <div className='mb-2 grid grid-cols-2 gap-2.5 sm:gap-2'>
                                                    <button
                                                        type='button'
                                                        title={t('appearance.chromeLayout.modernHint')}
                                                        onClick={() => setChromeLayout('modern')}
                                                        className={segmentButtonClass(chromeLayout === 'modern')}
                                                    >
                                                        <LayoutTemplate className='h-3 w-3 shrink-0' aria-hidden />
                                                        <span className='truncate'>
                                                            {t('appearance.chromeLayout.compactModern')}
                                                        </span>
                                                    </button>
                                                    <button
                                                        type='button'
                                                        title={t('appearance.chromeLayout.classicHint')}
                                                        onClick={() => setChromeLayout('classic')}
                                                        className={segmentButtonClass(chromeLayout === 'classic')}
                                                    >
                                                        <PanelTop className='h-3 w-3 shrink-0' aria-hidden />
                                                        <span className='truncate'>
                                                            {t('appearance.chromeLayout.compactClassic')}
                                                        </span>
                                                    </button>
                                                </div>
                                                {chromeLayout === 'modern' && (
                                                    <>
                                                        <p className={sectionLabelClass}>
                                                            {t('appearance.navbarHoverReveal.title')}
                                                        </p>
                                                        <div className='grid grid-cols-2 gap-2.5 sm:gap-2'>
                                                            <button
                                                                type='button'
                                                                title={t('appearance.navbarHoverReveal.off')}
                                                                onClick={() => setNavbarHoverReveal(false)}
                                                                className={segmentButtonClass(!navbarHoverReveal)}
                                                            >
                                                                {t('appearance.navbarHoverReveal.compactOff')}
                                                            </button>
                                                            <button
                                                                type='button'
                                                                title={t('appearance.navbarHoverReveal.onHint')}
                                                                onClick={() => setNavbarHoverReveal(true)}
                                                                className={segmentButtonClass(navbarHoverReveal)}
                                                            >
                                                                {t('appearance.navbarHoverReveal.compactOn')}
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            <div className={panelSectionClass}>
                                                <p className={sectionLabelClass}>{t('appearance.fontFamilyTitle')}</p>
                                                <div className='flex flex-col gap-1.5 sm:gap-1'>
                                                    {fontOptions.map((option) => (
                                                        <button
                                                            key={option.value}
                                                            type='button'
                                                            onClick={() => setFontFamily(option.value)}
                                                            className={cn(
                                                                'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors sm:py-2 sm:text-xs',
                                                                fontFamily === option.value
                                                                    ? 'bg-primary/15 font-medium text-primary'
                                                                    : 'text-foreground hover:bg-accent/40',
                                                            )}
                                                            style={{ fontFamily: option.preview }}
                                                        >
                                                            <span className='truncate'>{option.name}</span>
                                                            {fontFamily === option.value && (
                                                                <Check
                                                                    className='h-3 w-3 shrink-0 text-primary'
                                                                    aria-hidden
                                                                />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className={cn(panelSectionClass, 'pb-1')}>
                                                <p className={cn(sectionLabelClass, 'flex items-center gap-1')}>
                                                    <Globe className='h-3 w-3' aria-hidden />
                                                    {t('appearance.language')}
                                                </p>
                                                <div className='max-h-44 space-y-1.5 overflow-y-auto pr-0.5 sm:max-h-40 sm:space-y-1'>
                                                    {availableLanguages.map((language) => (
                                                        <button
                                                            key={language.code}
                                                            type='button'
                                                            onClick={() => setLocale(language.code)}
                                                            className={cn(
                                                                'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors sm:py-2 sm:text-xs',
                                                                locale === language.code
                                                                    ? 'bg-primary/15 font-medium text-primary'
                                                                    : 'hover:bg-accent/40',
                                                            )}
                                                        >
                                                            <span className='min-w-0 flex-1 truncate'>
                                                                <span className='font-medium'>
                                                                    {language.nativeName}
                                                                </span>
                                                                {language.name !== language.nativeName && (
                                                                    <span className='ml-1 text-muted-foreground'>
                                                                        ({language.name})
                                                                    </span>
                                                                )}
                                                            </span>
                                                            {locale === language.code && (
                                                                <Check
                                                                    className='h-3 w-3 shrink-0 text-primary'
                                                                    aria-hidden
                                                                />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            <BackgroundCustomizer open={backgroundDialogOpen} onOpenChange={setBackgroundDialogOpen} />
        </>
    );
}
