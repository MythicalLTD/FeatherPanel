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

import { useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
    Check,
    Globe,
    LayoutTemplate,
    Moon,
    Palette,
    PanelBottom,
    PanelLeft,
    PanelRight,
    PanelTop,
    Sparkles,
    Sun,
    Type,
    Upload,
    Zap,
} from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { FormSection } from '@/components/featherui/FormSection';
import { PageCard } from '@/components/featherui/PageCard';
import { Input } from '@/components/featherui/Input';
import { useTheme } from '@/contexts/ThemeContext';
import type { BackgroundImageFit } from '@/contexts/ThemeContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useNavbarHoverReveal } from '@/hooks/useNavbarHoverReveal';
import { useNavbarSticky } from '@/hooks/useNavbarSticky';
import { useChromeLayout } from '@/hooks/useChromeLayout';
import { useSidebarPreferences } from '@/hooks/useSidebarPreferences';
import { BACKGROUND_ANIMATED_VARIANTS, type BackgroundAnimatedVariant } from '@/lib/background-variants';
import { STATIC_BACKGROUND_PREVIEWS } from '@/lib/background-previews';
import { fontsByCategory, type AppFontCategory } from '@/lib/app-fonts';
import { ACCENT_PRESET_IDS, resolveAccentSwatchCss } from '@/lib/accent-colors';
import { formatCustomAccent, getCustomAccentHex, isCustomAccent } from '@/lib/accent-color-utils';
import { isRtlLocale } from '@/lib/locale-flags';
import LocaleFlag from '@/components/preferences/LocaleFlag';
import { cn } from '@/lib/utils';

const PREFERENCES_PATH = '/dashboard/preferences';

const BackgroundEffectPreview = dynamic(() => import('@/components/theme/BackgroundEffectPreview'), {
    ssr: false,
});

type AppearanceSection = 'theme' | 'background' | 'typography' | 'layout' | 'sidebar' | 'motion' | 'language';
type BackgroundTab = 'animated' | 'static' | 'custom';

const BLUR_STEPS = [0, 4, 8, 12, 16, 24];
const IMAGE_FIT_OPTIONS: { value: BackgroundImageFit; labelKey: string }[] = [
    { value: 'cover', labelKey: 'appearance.background.imageFit.cover' },
    { value: 'contain', labelKey: 'appearance.background.imageFit.contain' },
    { value: 'fill', labelKey: 'appearance.background.imageFit.fill' },
];

const NAV_ITEMS: { id: AppearanceSection; icon: typeof Palette; labelKey: string; descKey: string }[] = [
    { id: 'theme', icon: Palette, labelKey: 'appearance.sections.theme', descKey: 'appearance.sections.themeDesc' },
    {
        id: 'background',
        icon: Sparkles,
        labelKey: 'appearance.sections.background',
        descKey: 'appearance.sections.backgroundDesc',
    },
    {
        id: 'typography',
        icon: Type,
        labelKey: 'appearance.sections.typography',
        descKey: 'appearance.sections.typographyDesc',
    },
    {
        id: 'layout',
        icon: LayoutTemplate,
        labelKey: 'appearance.sections.layout',
        descKey: 'appearance.sections.layoutDesc',
    },
    {
        id: 'sidebar',
        icon: PanelLeft,
        labelKey: 'appearance.sections.sidebar',
        descKey: 'appearance.sections.sidebarDesc',
    },
    { id: 'motion', icon: Zap, labelKey: 'appearance.sections.motion', descKey: 'appearance.sections.motionDesc' },
    {
        id: 'language',
        icon: Globe,
        labelKey: 'appearance.sections.language',
        descKey: 'appearance.sections.languageDesc',
    },
];

function SegmentGroup({
    label,
    hint,
    children,
    columns = 2,
}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
    columns?: 2 | 3 | 4 | 5;
}) {
    return (
        <div className='space-y-2'>
            <div>
                <p className='text-foreground text-sm font-semibold'>{label}</p>
                {hint && <p className='text-muted-foreground text-xs leading-relaxed'>{hint}</p>}
            </div>
            <div
                className={cn(
                    'grid gap-2',
                    columns === 2 && 'grid-cols-2',
                    columns === 3 && 'grid-cols-3',
                    columns === 4 && 'grid-cols-2 sm:grid-cols-4',
                    columns === 5 && 'grid-cols-5',
                )}
            >
                {children}
            </div>
        </div>
    );
}

function SegmentButton({
    active,
    disabled,
    onClick,
    children,
    className,
}: {
    active: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <button
            type='button'
            disabled={disabled}
            onClick={onClick}
            className={cn(
                'border-border/60 bg-muted/20 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all',
                active && 'border-primary/50 bg-primary/15 text-primary shadow-primary/10 shadow-sm',
                !active &&
                    !disabled &&
                    'text-muted-foreground hover:border-primary/30 hover:bg-accent/40 hover:text-foreground',
                disabled && 'cursor-not-allowed opacity-50',
                className,
            )}
        >
            {children}
        </button>
    );
}

function AnimatedBackgroundTile({
    variant,
    accentColor,
    active,
    onClick,
    label,
}: {
    variant: BackgroundAnimatedVariant;
    accentColor: string;
    active: boolean;
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            type='button'
            onClick={onClick}
            className={cn(
                'group relative overflow-hidden rounded-xl border text-left transition-all',
                active ? 'border-primary ring-primary/30 ring-2' : 'border-border/50 hover:border-primary/40',
            )}
        >
            <BackgroundEffectPreview variant={variant} accentColor={accentColor} className='h-32 w-full' preview />
            <div className='absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/40 to-transparent px-3 pt-10 pb-2.5'>
                <p className='truncate text-xs font-semibold text-white'>{label}</p>
            </div>
            {active && (
                <span className='bg-primary text-primary-foreground absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full shadow-md'>
                    <Check className='h-3 w-3' strokeWidth={3} aria-hidden />
                </span>
            )}
        </button>
    );
}

function StaticPreviewTile({
    active,
    onClick,
    preview,
    label,
    subtitle,
    pattern,
}: {
    active: boolean;
    onClick: () => void;
    preview?: string;
    label: string;
    subtitle?: string;
    pattern?: boolean;
}) {
    return (
        <button
            type='button'
            onClick={onClick}
            className={cn(
                'group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all',
                active
                    ? 'border-primary shadow-primary/15 ring-primary/30 shadow-lg ring-2'
                    : 'border-border/50 hover:border-primary/35 hover:shadow-md',
            )}
        >
            <div
                className='relative h-28 w-full'
                style={{
                    background: preview ?? 'hsl(var(--muted))',
                    backgroundSize: pattern ? '16px 16px' : undefined,
                }}
            />
            <div className='border-border/40 bg-card/90 space-y-0.5 border-t px-3 py-2.5'>
                <p className='text-foreground truncate text-sm font-semibold'>{label}</p>
                {subtitle && <p className='text-muted-foreground truncate text-xs'>{subtitle}</p>}
            </div>
            {active && (
                <span className='bg-primary text-primary-foreground absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full shadow-md'>
                    <Check className='h-3.5 w-3.5' strokeWidth={3} aria-hidden />
                </span>
            )}
        </button>
    );
}

function MotionOptionCard({
    active,
    title,
    description,
    onClick,
}: {
    active: boolean;
    title: string;
    description: string;
    onClick: () => void;
}) {
    return (
        <button
            type='button'
            onClick={onClick}
            className={cn(
                'flex flex-col gap-2 rounded-2xl border p-5 text-left transition-all',
                active
                    ? 'border-primary/50 bg-primary/10 shadow-primary/10 shadow-md'
                    : 'border-border/50 bg-card/40 hover:border-primary/30 hover:bg-card/70',
            )}
        >
            <div className='flex items-center justify-between gap-2'>
                <span className='text-foreground font-semibold'>{title}</span>
                {active && <Check className='text-primary h-4 w-4 shrink-0' aria-hidden />}
            </div>
            <p className='text-muted-foreground text-sm leading-relaxed'>{description}</p>
        </button>
    );
}

function LanguageOptionCard({
    active,
    disabled,
    localeCode,
    nativeName,
    englishName,
    rtl,
    rtlLabel,
    onClick,
}: {
    active: boolean;
    disabled?: boolean;
    localeCode: string;
    nativeName: string;
    englishName?: string;
    rtl?: boolean;
    rtlLabel?: string;
    onClick: () => void;
}) {
    const showEnglishName = englishName && englishName !== nativeName;

    return (
        <button
            type='button'
            disabled={disabled}
            onClick={onClick}
            className={cn(
                'group relative flex items-center gap-3 rounded-2xl border p-4 text-left transition-all',
                active
                    ? 'border-primary/50 bg-primary/10 shadow-primary/10 ring-primary/20 shadow-md ring-2'
                    : 'border-border/50 bg-card/40 hover:border-primary/30 hover:bg-card/70',
                disabled && 'cursor-not-allowed opacity-50',
            )}
        >
            <LocaleFlag locale={localeCode} size='lg' />
            <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                    <span className='text-foreground truncate font-semibold'>{nativeName}</span>
                    {rtl && rtlLabel && (
                        <span className='bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase'>
                            {rtlLabel}
                        </span>
                    )}
                </div>
                {showEnglishName && <p className='text-muted-foreground mt-0.5 truncate text-xs'>{englishName}</p>}
                <p className='text-muted-foreground/80 mt-1 font-mono text-[11px] tracking-wide uppercase'>
                    {localeCode}
                </p>
            </div>
            {active && (
                <span className='bg-primary text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full shadow-sm'>
                    <Check className='h-3.5 w-3.5' strokeWidth={3} aria-hidden />
                </span>
            )}
        </button>
    );
}

export default function AppearanceSettingsPanel() {
    const {
        theme,
        accentColor,
        setAccentColor,
        fontFamily,
        setFontFamily,
        motionLevel,
        setMotionLevel,
        toggleTheme,
        mounted,
        backgroundType,
        backgroundImage,
        backgroundAnimatedVariant,
        backdropBlur,
        backdropDarken,
        backgroundImageFit,
        setBackgroundType,
        setBackgroundAnimatedVariant,
        setBackgroundImage,
        setBackdropBlur,
        setBackdropDarken,
        setBackgroundImageFit,
    } = useTheme();
    const { navbarHoverReveal, setNavbarHoverReveal } = useNavbarHoverReveal();
    const { navbarSticky, setNavbarSticky } = useNavbarSticky();
    const { chromeLayout, setChromeLayout } = useChromeLayout();
    const sidebar = useSidebarPreferences();
    const { t, availableLanguages, setLocale, locale, isLocaleLocked } = useTranslation();
    const { settings } = useSettings();

    const router = useRouter();
    const searchParams = useSearchParams();

    const [backgroundTab, setBackgroundTab] = useState<BackgroundTab>('animated');
    const [fontCategory, setFontCategory] = useState<AppFontCategory>('sans');
    const [imageUrl, setImageUrl] = useState(backgroundImage);
    const [customAccentHex, setCustomAccentHex] = useState('#7c3aed');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const sectionParam = searchParams.get('section');
    const section: AppearanceSection =
        sectionParam === 'theme' ||
        sectionParam === 'background' ||
        sectionParam === 'typography' ||
        sectionParam === 'layout' ||
        sectionParam === 'sidebar' ||
        sectionParam === 'motion' ||
        sectionParam === 'language'
            ? sectionParam
            : 'theme';

    const setSection = (next: AppearanceSection) => {
        router.replace(`${PREFERENCES_PATH}?section=${next}`, { scroll: false });
    };

    useEffect(() => {
        setImageUrl(backgroundImage);
    }, [backgroundImage]);

    useEffect(() => {
        if (isCustomAccent(accentColor)) {
            setCustomAccentHex(getCustomAccentHex(accentColor));
        }
    }, [accentColor]);

    const isBackgroundDisabled = theme === 'light' || settings?.app_background_type_lock === 'true';
    const isAccentColorLocked = settings?.app_accent_color_lock === 'true';
    const isThemeLocked = settings?.app_theme_lock === 'true';

    const applyCustomAccent = (hex: string) => {
        if (isAccentColorLocked) {
            return;
        }
        const normalized = hex.startsWith('#') ? hex : `#${hex}`;
        if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
            setCustomAccentHex(normalized.toLowerCase());
            setAccentColor(formatCustomAccent(normalized));
        }
    };

    const activeNav = NAV_ITEMS.find((n) => n.id === section)!;

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setImageUrl(dataUrl);
            setBackgroundImage(dataUrl);
            setBackgroundType('image');
        };
        reader.readAsDataURL(file);
    };

    if (!mounted) {
        return (
            <div className='space-y-4'>
                <div className='bg-muted/30 h-64 animate-pulse rounded-2xl' />
            </div>
        );
    }

    return (
        <div className='grid gap-6 lg:grid-cols-[minmax(0,220px)_1fr]'>
            <nav className='flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible'>
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const active = section === item.id;
                    return (
                        <button
                            key={item.id}
                            type='button'
                            onClick={() => setSection(item.id)}
                            className={cn(
                                'flex shrink-0 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition-colors lg:w-full',
                                active
                                    ? 'border-primary/40 bg-primary/10 text-primary'
                                    : 'border-border/40 bg-card/40 text-muted-foreground hover:bg-accent/40 hover:text-foreground',
                            )}
                        >
                            <Icon className='h-4 w-4 shrink-0' aria-hidden />
                            <span className='text-sm font-medium whitespace-nowrap lg:whitespace-normal'>
                                {t(item.labelKey)}
                            </span>
                        </button>
                    );
                })}
            </nav>

            <PageCard title={t(activeNav.labelKey)} description={t(activeNav.descKey)} className='p-5 sm:p-6'>
                {/* THEME */}
                {section === 'theme' && (
                    <div className='space-y-6'>
                        <FormSection>
                            <SegmentGroup label={t('appearance.theme.modeTitle')} columns={2}>
                                <SegmentButton
                                    active={theme === 'dark'}
                                    disabled={isThemeLocked}
                                    onClick={() => !isThemeLocked && theme !== 'dark' && toggleTheme()}
                                >
                                    <Moon className='h-4 w-4' aria-hidden />
                                    {t('appearance.theme.dark')}
                                </SegmentButton>
                                <SegmentButton
                                    active={theme === 'light'}
                                    disabled={isThemeLocked}
                                    onClick={() => !isThemeLocked && theme !== 'light' && toggleTheme()}
                                >
                                    <Sun className='h-4 w-4 text-amber-400' aria-hidden />
                                    {t('appearance.theme.light')}
                                </SegmentButton>
                            </SegmentGroup>
                        </FormSection>

                        <FormSection>
                            <p className='text-foreground mb-4 text-sm font-semibold'>{t('appearance.accentColor')}</p>
                            <div className='grid grid-cols-5 gap-3 sm:grid-cols-8 lg:grid-cols-10'>
                                {ACCENT_PRESET_IDS.map((presetId) => {
                                    const swatch = resolveAccentSwatchCss(presetId);
                                    const isLightSwatch =
                                        presetId === 'yellow' ||
                                        presetId === 'gold' ||
                                        presetId === 'lavender' ||
                                        presetId === 'amber';
                                    return (
                                        <button
                                            key={presetId}
                                            type='button'
                                            title={t(`appearance.colors.${presetId}`)}
                                            disabled={isAccentColorLocked}
                                            onClick={() => !isAccentColorLocked && setAccentColor(presetId)}
                                            className={cn(
                                                'ring-border/60 relative mx-auto flex h-10 w-10 items-center justify-center rounded-full ring-1 transition-transform',
                                                accentColor === presetId &&
                                                    'ring-primary ring-offset-background ring-2 ring-offset-2',
                                                !isAccentColorLocked && 'hover:scale-110',
                                                isAccentColorLocked && 'cursor-not-allowed opacity-50',
                                            )}
                                            style={{ backgroundColor: swatch }}
                                        >
                                            {accentColor === presetId && (
                                                <Check
                                                    className={cn(
                                                        'h-3.5 w-3.5',
                                                        isLightSwatch ? 'text-foreground' : 'text-white',
                                                    )}
                                                    strokeWidth={3}
                                                    aria-hidden
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </FormSection>

                        <FormSection className='space-y-4'>
                            <div>
                                <p className='text-foreground text-sm font-semibold'>
                                    {t('appearance.customAccent.title')}
                                </p>
                                <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>
                                    {t('appearance.customAccent.description')}
                                </p>
                            </div>
                            <div className='flex flex-wrap items-end gap-3'>
                                <input
                                    type='color'
                                    value={customAccentHex}
                                    disabled={isAccentColorLocked}
                                    onChange={(e) => applyCustomAccent(e.target.value)}
                                    className='border-border h-12 w-16 cursor-pointer rounded-xl border disabled:cursor-not-allowed disabled:opacity-50'
                                    aria-label={t('appearance.customAccent.pickerLabel')}
                                />
                                <Input
                                    label={t('appearance.customAccent.hexLabel')}
                                    value={customAccentHex}
                                    disabled={isAccentColorLocked}
                                    onChange={(e) => setCustomAccentHex(e.target.value)}
                                    onBlur={() => applyCustomAccent(customAccentHex)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            applyCustomAccent(customAccentHex);
                                        }
                                    }}
                                    className='max-w-xs font-mono'
                                />
                                <Button
                                    type='button'
                                    variant='outline'
                                    disabled={isAccentColorLocked}
                                    onClick={() => applyCustomAccent(customAccentHex)}
                                >
                                    {t('appearance.customAccent.apply')}
                                </Button>
                            </div>
                            {isCustomAccent(accentColor) && (
                                <div className='flex items-center gap-2'>
                                    <span
                                        className='ring-border/60 h-8 w-8 rounded-full ring-1'
                                        style={{ backgroundColor: resolveAccentSwatchCss(accentColor) }}
                                        aria-hidden
                                    />
                                    <p className='text-muted-foreground text-sm'>
                                        {t('appearance.currentlySelected')}:{' '}
                                        <span className='text-foreground font-mono font-medium'>
                                            {getCustomAccentHex(accentColor)}
                                        </span>
                                    </p>
                                </div>
                            )}
                            {isAccentColorLocked && (
                                <p className='text-muted-foreground text-xs'>
                                    {t('appearance.customAccent.lockedByAdmin')}
                                </p>
                            )}
                        </FormSection>
                    </div>
                )}

                {/* BACKGROUND */}
                {section === 'background' && (
                    <div className='space-y-6'>
                        {isBackgroundDisabled ? (
                            <FormSection className='border-amber-500/20 bg-amber-500/5'>
                                <p className='text-foreground text-sm font-medium'>
                                    {theme === 'light'
                                        ? t('appearance.background.notAvailableInLight')
                                        : t('appearance.background.lockedByAdmin')}
                                </p>
                            </FormSection>
                        ) : (
                            <>
                                <SegmentGroup label={t('appearance.background.tabsTitle')} columns={3}>
                                    {(['animated', 'static', 'custom'] as BackgroundTab[]).map((tab) => (
                                        <SegmentButton
                                            key={tab}
                                            active={backgroundTab === tab}
                                            onClick={() => setBackgroundTab(tab)}
                                        >
                                            {t(`appearance.background.tabs.${tab}`)}
                                        </SegmentButton>
                                    ))}
                                </SegmentGroup>

                                {backgroundTab === 'animated' && (
                                    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4'>
                                        {BACKGROUND_ANIMATED_VARIANTS.map((variant) => {
                                            const isActive =
                                                backgroundType === 'aurora' && backgroundAnimatedVariant === variant;
                                            return (
                                                <AnimatedBackgroundTile
                                                    key={variant}
                                                    variant={variant}
                                                    accentColor={accentColor}
                                                    active={isActive}
                                                    label={t(`appearance.background.variants.${variant}`)}
                                                    onClick={() => {
                                                        setBackgroundType('aurora');
                                                        setBackgroundAnimatedVariant(variant);
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                )}

                                {backgroundTab === 'static' && (
                                    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                                        <StaticPreviewTile
                                            active={backgroundType === 'gradient'}
                                            onClick={() => setBackgroundType('gradient')}
                                            preview={STATIC_BACKGROUND_PREVIEWS.gradient}
                                            label={t('appearance.background.themeGradient')}
                                            subtitle={t('appearance.background.themeGradientDescription')}
                                        />
                                        <StaticPreviewTile
                                            active={backgroundType === 'pattern'}
                                            onClick={() => setBackgroundType('pattern')}
                                            preview={STATIC_BACKGROUND_PREVIEWS.pattern}
                                            pattern
                                            label={t('appearance.background.dotPattern')}
                                        />
                                        <StaticPreviewTile
                                            active={backgroundType === 'solid'}
                                            onClick={() => setBackgroundType('solid')}
                                            preview={
                                                backgroundImage.startsWith('#')
                                                    ? backgroundImage
                                                    : STATIC_BACKGROUND_PREVIEWS.solid
                                            }
                                            label={t('appearance.background.solidColor')}
                                        />
                                    </div>
                                )}

                                {backgroundTab === 'custom' && (
                                    <FormSection className='space-y-5'>
                                        <StaticPreviewTile
                                            active={backgroundType === 'image'}
                                            onClick={() => setBackgroundType('image')}
                                            preview={
                                                backgroundImage && !backgroundImage.startsWith('#')
                                                    ? `url(${backgroundImage}) center/cover`
                                                    : undefined
                                            }
                                            label={t('appearance.background.customImage')}
                                            subtitle={t('appearance.background.uploadLocal')}
                                        />
                                        <input
                                            ref={fileInputRef}
                                            type='file'
                                            accept='image/*'
                                            onChange={handleFileUpload}
                                            className='hidden'
                                        />
                                        <Button
                                            type='button'
                                            variant='outline'
                                            className='w-full'
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className='mr-2 h-4 w-4' />
                                            {t('appearance.background.chooseFile')}
                                        </Button>
                                        {backgroundType === 'solid' && (
                                            <div className='flex flex-wrap items-end gap-3'>
                                                <input
                                                    type='color'
                                                    value={
                                                        backgroundImage.startsWith('#') ? backgroundImage : '#0a0a0a'
                                                    }
                                                    onChange={(e) => {
                                                        setBackgroundImage(e.target.value);
                                                        setBackgroundType('solid');
                                                    }}
                                                    className='border-border h-12 w-16 cursor-pointer rounded-xl border'
                                                />
                                                <Input
                                                    label={t('appearance.background.customColor')}
                                                    value={
                                                        backgroundImage.startsWith('#') ? backgroundImage : '#0a0a0a'
                                                    }
                                                    onChange={(e) => {
                                                        const color = e.target.value;
                                                        if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
                                                            setBackgroundImage(color);
                                                            setBackgroundType('solid');
                                                        }
                                                    }}
                                                    className='max-w-xs font-mono'
                                                />
                                            </div>
                                        )}
                                        {backgroundType === 'image' && (
                                            <>
                                                <Input
                                                    label={t('appearance.background.imageUrl')}
                                                    type='url'
                                                    value={imageUrl}
                                                    onChange={(e) => setImageUrl(e.target.value)}
                                                    placeholder={t('appearance.background.imageUrlPlaceholder')}
                                                />
                                                <Button
                                                    type='button'
                                                    onClick={() => {
                                                        setBackgroundImage(imageUrl);
                                                        setBackgroundType('image');
                                                    }}
                                                >
                                                    {t('appearance.background.applyImage')}
                                                </Button>
                                            </>
                                        )}
                                    </FormSection>
                                )}

                                <FormSection className='space-y-6'>
                                    <SegmentGroup label={t('appearance.background.backdropBlur')} columns={3}>
                                        {BLUR_STEPS.map((px) => (
                                            <SegmentButton
                                                key={px}
                                                active={backdropBlur === px}
                                                onClick={() => setBackdropBlur(px)}
                                            >
                                                {px === 0 ? t('appearance.background.off') : `${px}px`}
                                            </SegmentButton>
                                        ))}
                                    </SegmentGroup>
                                    <div>
                                        <label className='text-foreground mb-2 block text-sm font-semibold'>
                                            {t('appearance.background.backdropDarkenValue', {
                                                percent: String(backdropDarken),
                                            })}
                                        </label>
                                        <input
                                            type='range'
                                            min={0}
                                            max={100}
                                            value={backdropDarken}
                                            onChange={(e) => setBackdropDarken(Number(e.target.value))}
                                            className='bg-muted accent-primary h-2 w-full appearance-none rounded-lg'
                                        />
                                    </div>
                                    {backgroundType === 'image' && (
                                        <SegmentGroup label={t('appearance.background.imageFit.title')} columns={3}>
                                            {IMAGE_FIT_OPTIONS.map((opt) => (
                                                <SegmentButton
                                                    key={opt.value}
                                                    active={backgroundImageFit === opt.value}
                                                    onClick={() => setBackgroundImageFit(opt.value)}
                                                >
                                                    {t(opt.labelKey)}
                                                </SegmentButton>
                                            ))}
                                        </SegmentGroup>
                                    )}
                                </FormSection>
                            </>
                        )}
                    </div>
                )}

                {/* TYPOGRAPHY */}
                {section === 'typography' && (
                    <div className='space-y-5'>
                        <SegmentGroup label={t('appearance.fontCategoriesTitle')} columns={3}>
                            {(['sans', 'serif', 'mono'] as AppFontCategory[]).map((cat) => (
                                <SegmentButton
                                    key={cat}
                                    active={fontCategory === cat}
                                    onClick={() => setFontCategory(cat)}
                                >
                                    {t(`appearance.fontCategories.${cat}`)}
                                </SegmentButton>
                            ))}
                        </SegmentGroup>
                        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
                            {fontsByCategory(fontCategory).map((font) => (
                                <button
                                    key={font.value}
                                    type='button'
                                    onClick={() => setFontFamily(font.value)}
                                    className={cn(
                                        'border-border/60 bg-card/50 hover:border-primary/40 flex flex-col rounded-2xl border p-4 text-left transition-all hover:shadow-md',
                                        fontFamily === font.value &&
                                            'border-primary bg-primary/10 ring-primary/20 ring-2',
                                    )}
                                >
                                    <div className='mb-3 flex items-start justify-between gap-2'>
                                        <div>
                                            <p className='text-foreground text-sm font-bold'>{font.name}</p>
                                            {font.sampleKey && (
                                                <p className='text-muted-foreground text-xs'>
                                                    {t(`appearance.fonts.samples.${font.sampleKey}`)}
                                                </p>
                                            )}
                                        </div>
                                        {fontFamily === font.value && (
                                            <Check className='text-primary h-4 w-4 shrink-0' aria-hidden />
                                        )}
                                    </div>
                                    <p
                                        className='text-foreground text-2xl leading-none font-semibold'
                                        style={{ fontFamily: font.preview }}
                                    >
                                        Aa Bb Cc
                                    </p>
                                    <p
                                        className='text-muted-foreground mt-2 text-sm leading-snug'
                                        style={{ fontFamily: font.preview }}
                                    >
                                        {t('appearance.fontPreviewSentence')}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* LAYOUT */}
                {section === 'layout' && (
                    <div>
                        <FormSection className='space-y-6'>
                            <SegmentGroup label={t('appearance.chromeLayout.title')} columns={2}>
                                <SegmentButton
                                    active={chromeLayout === 'modern'}
                                    onClick={() => setChromeLayout('modern')}
                                >
                                    <LayoutTemplate className='h-4 w-4' aria-hidden />
                                    {t('appearance.chromeLayout.compactModern')}
                                </SegmentButton>
                                <SegmentButton
                                    active={chromeLayout === 'classic'}
                                    onClick={() => setChromeLayout('classic')}
                                >
                                    <PanelTop className='h-4 w-4' aria-hidden />
                                    {t('appearance.chromeLayout.compactClassic')}
                                </SegmentButton>
                            </SegmentGroup>
                            <SegmentGroup label={t('appearance.navbarSticky.title')} columns={2}>
                                <SegmentButton active={navbarSticky} onClick={() => setNavbarSticky(true)}>
                                    {t('appearance.navbarSticky.on')}
                                </SegmentButton>
                                <SegmentButton active={!navbarSticky} onClick={() => setNavbarSticky(false)}>
                                    {t('appearance.navbarSticky.off')}
                                </SegmentButton>
                            </SegmentGroup>
                            {chromeLayout === 'modern' && (
                                <SegmentGroup label={t('appearance.navbarHoverReveal.title')} columns={2}>
                                    <SegmentButton
                                        active={!navbarHoverReveal}
                                        onClick={() => setNavbarHoverReveal(false)}
                                    >
                                        {t('appearance.navbarHoverReveal.compactOff')}
                                    </SegmentButton>
                                    <SegmentButton
                                        active={navbarHoverReveal}
                                        onClick={() => setNavbarHoverReveal(true)}
                                    >
                                        {t('appearance.navbarHoverReveal.compactOn')}
                                    </SegmentButton>
                                </SegmentGroup>
                            )}
                        </FormSection>
                    </div>
                )}

                {/* SIDEBAR */}
                {section === 'sidebar' && (
                    <div>
                        <FormSection className='space-y-6'>
                            <SegmentGroup label={t('appearance.sidebar.positionTitle')} columns={3}>
                                <SegmentButton
                                    active={sidebar.sidebarPosition === 'left'}
                                    onClick={() => sidebar.setSidebarPosition('left')}
                                >
                                    <PanelLeft className='h-4 w-4' aria-hidden />
                                    {t('appearance.sidebar.positionLeft')}
                                </SegmentButton>
                                <SegmentButton
                                    active={sidebar.sidebarPosition === 'right'}
                                    onClick={() => sidebar.setSidebarPosition('right')}
                                >
                                    <PanelRight className='h-4 w-4' aria-hidden />
                                    {t('appearance.sidebar.positionRight')}
                                </SegmentButton>
                                <SegmentButton
                                    active={sidebar.sidebarPosition === 'bottom'}
                                    onClick={() => sidebar.setSidebarPosition('bottom')}
                                >
                                    <PanelBottom className='h-4 w-4' aria-hidden />
                                    {t('appearance.sidebar.positionBottom')}
                                </SegmentButton>
                            </SegmentGroup>
                            {sidebar.sidebarPosition === 'bottom' && (
                                <>
                                    <SegmentGroup label={t('appearance.sidebar.dockDisplayTitle')} columns={2}>
                                        <SegmentButton
                                            active={sidebar.dockDisplay === 'icons'}
                                            onClick={() => sidebar.setDockDisplay('icons')}
                                        >
                                            {t('appearance.sidebar.dockIcons')}
                                        </SegmentButton>
                                        <SegmentButton
                                            active={sidebar.dockDisplay === 'labels'}
                                            onClick={() => sidebar.setDockDisplay('labels')}
                                        >
                                            {t('appearance.sidebar.dockLabels')}
                                        </SegmentButton>
                                    </SegmentGroup>
                                    <SegmentGroup label={t('appearance.sidebar.dockSizeTitle')} columns={3}>
                                        <SegmentButton
                                            active={sidebar.dockSize === 'sm'}
                                            onClick={() => sidebar.setDockSize('sm')}
                                        >
                                            {t('appearance.sidebar.dockSizeSmall')}
                                        </SegmentButton>
                                        <SegmentButton
                                            active={sidebar.dockSize === 'md'}
                                            onClick={() => sidebar.setDockSize('md')}
                                        >
                                            {t('appearance.sidebar.dockSizeMedium')}
                                        </SegmentButton>
                                        <SegmentButton
                                            active={sidebar.dockSize === 'lg'}
                                            onClick={() => sidebar.setDockSize('lg')}
                                        >
                                            {t('appearance.sidebar.dockSizeLarge')}
                                        </SegmentButton>
                                    </SegmentGroup>
                                </>
                            )}
                            <SegmentGroup label={t('appearance.sidebar.togglePlacementTitle')} columns={3}>
                                <SegmentButton
                                    active={sidebar.sidebarTogglePlacement === 'sidebar'}
                                    onClick={() => sidebar.setSidebarTogglePlacement('sidebar')}
                                >
                                    {t('appearance.sidebar.toggleOnSidebar')}
                                </SegmentButton>
                                <SegmentButton
                                    active={sidebar.sidebarTogglePlacement === 'navbar'}
                                    onClick={() => sidebar.setSidebarTogglePlacement('navbar')}
                                >
                                    {t('appearance.sidebar.toggleOnNavbar')}
                                </SegmentButton>
                                <SegmentButton
                                    active={sidebar.sidebarTogglePlacement === 'both'}
                                    onClick={() => sidebar.setSidebarTogglePlacement('both')}
                                >
                                    {t('appearance.sidebar.toggleBoth')}
                                </SegmentButton>
                            </SegmentGroup>
                            <SegmentGroup label={t('appearance.sidebar.densityTitle')} columns={2}>
                                <SegmentButton
                                    active={sidebar.sidebarDensity === 'comfortable'}
                                    onClick={() => sidebar.setSidebarDensity('comfortable')}
                                >
                                    {t('appearance.sidebar.comfortable')}
                                </SegmentButton>
                                <SegmentButton
                                    active={sidebar.sidebarDensity === 'compact'}
                                    onClick={() => sidebar.setSidebarDensity('compact')}
                                >
                                    {t('appearance.sidebar.compact')}
                                </SegmentButton>
                            </SegmentGroup>
                            {chromeLayout === 'modern' && (
                                <SegmentGroup label={t('appearance.sidebar.styleTitle')} columns={2}>
                                    <SegmentButton
                                        active={sidebar.sidebarStyle === 'glass'}
                                        onClick={() => sidebar.setSidebarStyle('glass')}
                                    >
                                        {t('appearance.sidebar.glass')}
                                    </SegmentButton>
                                    <SegmentButton
                                        active={sidebar.sidebarStyle === 'solid'}
                                        onClick={() => sidebar.setSidebarStyle('solid')}
                                    >
                                        {t('appearance.sidebar.solid')}
                                    </SegmentButton>
                                </SegmentGroup>
                            )}
                            <SegmentGroup label={t('appearance.sidebar.glowTitle')} columns={3}>
                                <SegmentButton
                                    active={sidebar.sidebarGlow === 'none'}
                                    onClick={() => sidebar.setSidebarGlow('none')}
                                >
                                    {t('appearance.sidebar.glowNone')}
                                </SegmentButton>
                                <SegmentButton
                                    active={sidebar.sidebarGlow === 'subtle'}
                                    onClick={() => sidebar.setSidebarGlow('subtle')}
                                >
                                    <Sparkles className='h-3 w-3' aria-hidden />
                                    {t('appearance.sidebar.glowSubtle')}
                                </SegmentButton>
                                <SegmentButton
                                    active={sidebar.sidebarGlow === 'accent'}
                                    onClick={() => sidebar.setSidebarGlow('accent')}
                                >
                                    <Sparkles className='h-3 w-3' aria-hidden />
                                    {t('appearance.sidebar.glowAccent')}
                                </SegmentButton>
                            </SegmentGroup>
                            <SegmentGroup label={t('appearance.sidebar.iconLibraryTitle')} columns={2}>
                                <SegmentButton
                                    active={sidebar.iconLibrary === 'lucide'}
                                    onClick={() => sidebar.setIconLibrary('lucide')}
                                >
                                    {t('appearance.sidebar.iconLibraryLucide')}
                                </SegmentButton>
                                <SegmentButton
                                    active={sidebar.iconLibrary === 'tabler'}
                                    onClick={() => sidebar.setIconLibrary('tabler')}
                                >
                                    {t('appearance.sidebar.iconLibraryTabler')}
                                </SegmentButton>
                                <SegmentButton
                                    active={sidebar.iconLibrary === 'mdi'}
                                    onClick={() => sidebar.setIconLibrary('mdi')}
                                >
                                    {t('appearance.sidebar.iconLibraryMdi')}
                                </SegmentButton>
                                <SegmentButton
                                    active={sidebar.iconLibrary === 'phosphor'}
                                    onClick={() => sidebar.setIconLibrary('phosphor')}
                                >
                                    {t('appearance.sidebar.iconLibraryPhosphor')}
                                </SegmentButton>
                            </SegmentGroup>
                        </FormSection>
                    </div>
                )}

                {/* MOTION */}
                {section === 'motion' && (
                    <div>
                        <p className='text-muted-foreground mb-5 text-sm leading-relaxed'>
                            {t('appearance.motion.description')}
                        </p>
                        <div className='grid gap-3 sm:grid-cols-3'>
                            <MotionOptionCard
                                active={motionLevel === 'full'}
                                title={t('appearance.motion.full')}
                                description={t('appearance.motion.fullHint')}
                                onClick={() => setMotionLevel('full')}
                            />
                            <MotionOptionCard
                                active={motionLevel === 'reduced'}
                                title={t('appearance.motion.reduced')}
                                description={t('appearance.motion.reducedHint')}
                                onClick={() => setMotionLevel('reduced')}
                            />
                            <MotionOptionCard
                                active={motionLevel === 'none'}
                                title={t('appearance.motion.none')}
                                description={t('appearance.motion.noneHint')}
                                onClick={() => setMotionLevel('none')}
                            />
                        </div>
                    </div>
                )}

                {/* LANGUAGE */}
                {section === 'language' && (
                    <div className='space-y-4'>
                        {isLocaleLocked && (
                            <FormSection className='border-amber-500/20 bg-amber-500/5'>
                                <p className='text-foreground text-sm font-medium'>
                                    {t('appearance.languageLockedByAdmin')}
                                </p>
                            </FormSection>
                        )}
                        <FormSection>
                            <div className='mb-4 flex items-start gap-3'>
                                <div className='bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl'>
                                    <Globe className='h-5 w-5' aria-hidden />
                                </div>
                                <div>
                                    <p className='text-foreground text-sm font-semibold'>{t('appearance.language')}</p>
                                    <p className='text-muted-foreground mt-0.5 text-xs leading-relaxed'>
                                        {t('appearance.languageSectionHint')}
                                    </p>
                                </div>
                            </div>
                            <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                                {availableLanguages.map((language) => (
                                    <LanguageOptionCard
                                        key={language.code}
                                        localeCode={language.code}
                                        nativeName={language.nativeName}
                                        englishName={language.name}
                                        rtl={isRtlLocale(language.code)}
                                        rtlLabel={t('appearance.languageRtl')}
                                        active={locale === language.code}
                                        disabled={isLocaleLocked}
                                        onClick={() => !isLocaleLocked && setLocale(language.code)}
                                    />
                                ))}
                            </div>
                        </FormSection>
                    </div>
                )}
            </PageCard>
        </div>
    );
}
