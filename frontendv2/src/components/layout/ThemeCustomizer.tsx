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
import { useSettings } from '@/contexts/SettingsContext';
import { Check, Globe, Image as ImageIcon, LayoutTemplate, Moon, Palette, PanelTop, Sun, XIcon } from 'lucide-react';
import { useNavbarHoverReveal } from '@/hooks/useNavbarHoverReveal';
import { useNavbarSticky } from '@/hooks/useNavbarSticky';
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
    const { navbarSticky, setNavbarSticky } = useNavbarSticky();
    const { chromeLayout, setChromeLayout } = useChromeLayout();
    const { t, availableLanguages, setLocale, locale } = useTranslation();
    const { settings } = useSettings();
    const [customizerOpen, setCustomizerOpen] = useState(false);
    const [backgroundDialogOpen, setBackgroundDialogOpen] = useState(false);

    // Check if background customization is disabled (light mode or admin locked)
    const isBackgroundDisabled = theme === 'light' || settings?.app_background_type_lock === 'true';
    const isAccentColorLocked = settings?.app_accent_color_lock === 'true';
    const isThemeLocked = settings?.app_theme_lock === 'true';

    const accentColorOptions = [
        { name: t('appearance.colors.purple'), value: 'purple', color: 'hsl(262 83% 58%)' },
        { name: t('appearance.colors.blue'), value: 'blue', color: 'hsl(217 91% 60%)' },
        { name: t('appearance.colors.green'), value: 'green', color: 'hsl(142 71% 45%)' },
        { name: t('appearance.colors.red'), value: 'red', color: 'hsl(0 84% 60%)' },
        { name: t('appearance.colors.orange'), value: 'orange', color: 'hsl(25 95% 53%)' },
        { name: t('appearance.colors.pink'), value: 'pink', color: 'hsl(330 81% 60%)' },
        { name: t('appearance.colors.teal'), value: 'teal', color: 'hsl(173 80% 40%)' },
        { name: t('appearance.colors.yellow'), value: 'yellow', color: 'hsl(48 96% 53%)' },
        { name: t('appearance.colors.indigo'), value: 'indigo', color: 'hsl(245 58% 51%)' },
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
                <div className='bg-muted/25 size-9 animate-pulse rounded-lg sm:rounded-xl' />
            </div>
        );
    }

    return (
        <>
            <button
                type='button'
                title={t('appearance.settingsMenuTitle')}
                onClick={() => setCustomizerOpen(true)}
                className='text-muted-foreground hover:bg-muted/45 hover:text-foreground active:bg-muted/55 relative flex size-9 items-center justify-center rounded-lg border-0 transition-colors sm:rounded-xl'
            >
                <Palette className='h-[1.15rem] w-[1.15rem] shrink-0' aria-hidden />
                <span
                    className='border-background pointer-events-none absolute right-0.5 bottom-0.5 box-content h-1.5 w-1.5 rounded-full border-2 shadow-sm'
                    style={{ backgroundColor: currentAccent }}
                    aria-hidden
                />
            </button>

            <Transition appear show={customizerOpen} as={Fragment}>
                <Dialog as='div' className='relative z-90' onClose={setCustomizerOpen}>
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
                                    <div className='border-border bg-background border-b px-4 py-3.5'>
                                        <div className='flex items-start justify-between gap-3'>
                                            <div>
                                                <DialogTitle className='text-foreground text-base leading-tight font-semibold'>
                                                    {t('appearance.settingsMenuTitle')}
                                                </DialogTitle>
                                                <p className='text-muted-foreground/95 text-sm'>
                                                    {t('appearance.settingsMenuSubtitle')}
                                                </p>
                                            </div>
                                            <button
                                                type='button'
                                                onClick={() => setCustomizerOpen(false)}
                                                className='text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg p-1 transition-colors'
                                            >
                                                <XIcon className='h-5 w-5' />
                                            </button>
                                        </div>
                                    </div>

                                    <div className='max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain p-3 sm:max-h-[min(32rem,78dvh)]'>
                                        <div className='mb-3 grid grid-cols-2 gap-2'>
                                            <button
                                                type='button'
                                                onClick={() => !isThemeLocked && toggleTheme()}
                                                disabled={isThemeLocked}
                                                title={
                                                    isThemeLocked
                                                        ? t('appearance.theme.lockedByAdmin')
                                                        : theme === 'dark'
                                                          ? t('appearance.theme.switchToLight')
                                                          : t('appearance.theme.switchToDark')
                                                }
                                                className={cn(
                                                    'border-border/60 bg-muted/25 flex h-12 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors sm:h-10 sm:text-xs',
                                                    isThemeLocked
                                                        ? 'cursor-not-allowed opacity-50'
                                                        : 'hover:bg-accent/50',
                                                )}
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
                                                {isThemeLocked && (
                                                    <span className='text-muted-foreground text-xs'>(Locked)</span>
                                                )}
                                            </button>

                                            <button
                                                type='button'
                                                title={
                                                    isBackgroundDisabled
                                                        ? t('appearance.background.disabledInLightMode')
                                                        : t('appearance.background.customize')
                                                }
                                                onClick={() => {
                                                    if (isBackgroundDisabled) return;
                                                    setCustomizerOpen(false);
                                                    setBackgroundDialogOpen(true);
                                                }}
                                                disabled={isBackgroundDisabled}
                                                className={cn(
                                                    'border-border/60 bg-muted/25 flex h-12 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors sm:h-10 sm:text-xs',
                                                    isBackgroundDisabled
                                                        ? 'cursor-not-allowed opacity-50'
                                                        : 'hover:bg-accent/50',
                                                )}
                                            >
                                                <ImageIcon className='text-muted-foreground h-4 w-4' aria-hidden />
                                                <span>
                                                    {theme === 'light'
                                                        ? t('appearance.background.notAvailableInLight')
                                                        : t('appearance.background.change')}
                                                </span>
                                            </button>
                                        </div>

                                        <div className='border-border divide-border bg-card divide-y rounded-2xl border'>
                                            <div className={panelSectionClass}>
                                                <p className={sectionLabelClass}>{t('appearance.accentColor')}</p>
                                                <div className='grid grid-cols-5 gap-2.5 sm:gap-2'>
                                                    {accentColorOptions.map((option) => (
                                                        <button
                                                            key={option.value}
                                                            type='button'
                                                            title={
                                                                isAccentColorLocked
                                                                    ? `${option.name} (Locked)`
                                                                    : option.name
                                                            }
                                                            onClick={() =>
                                                                !isAccentColorLocked && setAccentColor(option.value)
                                                            }
                                                            disabled={isAccentColorLocked}
                                                            className={cn(
                                                                'ring-border/60 relative mx-auto flex h-10 w-10 items-center justify-center rounded-full ring-1 transition-transform sm:h-8 sm:w-8',
                                                                accentColor === option.value &&
                                                                    'ring-primary ring-offset-card ring-2 ring-offset-1',
                                                                isAccentColorLocked
                                                                    ? 'cursor-not-allowed opacity-50'
                                                                    : 'hover:scale-105',
                                                            )}
                                                            style={{ backgroundColor: option.color }}
                                                        >
                                                            {accentColor === option.value && (
                                                                <Check
                                                                    className={cn(
                                                                        'h-3 w-3 drop-shadow-sm sm:h-2.5 sm:w-2.5',
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
                                                <p className={sectionLabelClass}>
                                                    {t('appearance.navbarSticky.title')}
                                                </p>
                                                <div className='mb-2 grid grid-cols-2 gap-2.5 sm:gap-2'>
                                                    <button
                                                        type='button'
                                                        title={t('appearance.navbarSticky.onHint')}
                                                        onClick={() => setNavbarSticky(true)}
                                                        className={segmentButtonClass(navbarSticky)}
                                                    >
                                                        {t('appearance.navbarSticky.on')}
                                                    </button>
                                                    <button
                                                        type='button'
                                                        title={t('appearance.navbarSticky.offHint')}
                                                        onClick={() => setNavbarSticky(false)}
                                                        className={segmentButtonClass(!navbarSticky)}
                                                    >
                                                        {t('appearance.navbarSticky.off')}
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
                                                                    ? 'bg-primary/15 text-primary font-medium'
                                                                    : 'text-foreground hover:bg-accent/40',
                                                            )}
                                                            style={{ fontFamily: option.preview }}
                                                        >
                                                            <span className='truncate'>{option.name}</span>
                                                            {fontFamily === option.value && (
                                                                <Check
                                                                    className='text-primary h-3 w-3 shrink-0'
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
                                                                    ? 'bg-primary/15 text-primary font-medium'
                                                                    : 'hover:bg-accent/40',
                                                            )}
                                                        >
                                                            <span className='min-w-0 flex-1 truncate'>
                                                                <span className='font-medium'>
                                                                    {language.nativeName}
                                                                </span>
                                                                {language.name !== language.nativeName && (
                                                                    <span className='text-muted-foreground ml-1'>
                                                                        ({language.name})
                                                                    </span>
                                                                )}
                                                            </span>
                                                            {locale === language.code && (
                                                                <Check
                                                                    className='text-primary h-3 w-3 shrink-0'
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
