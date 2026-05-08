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

import {
    Dialog,
    DialogPanel,
    DialogTitle,
    Transition,
    TransitionChild,
    Tab,
    TabGroup,
    TabList,
    TabPanel,
    TabPanels,
} from '@headlessui/react';
import { Fragment, useCallback, useRef, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { BackgroundAnimatedVariant, BackgroundImageFit } from '@/contexts/ThemeContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, ArrowUp, XIcon } from 'lucide-react';

interface BackgroundCustomizerProps {
    children?: React.ReactNode;
    /** When both are set, the dialog is controlled externally (no inline trigger is rendered). */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const BLUR_STEPS = [0, 4, 8, 12, 16, 24];
const IMAGE_FIT_OPTIONS: { value: BackgroundImageFit; labelKey: string }[] = [
    { value: 'cover', labelKey: 'appearance.background.imageFit.cover' },
    { value: 'contain', labelKey: 'appearance.background.imageFit.contain' },
    { value: 'fill', labelKey: 'appearance.background.imageFit.fill' },
];
export default function BackgroundCustomizer({ children, open, onOpenChange }: BackgroundCustomizerProps) {
    const {
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
        fontFamily,
        setFontFamily,
    } = useTheme();
    const { t } = useTranslation();
    const isControlled = open !== undefined && onOpenChange !== undefined;
    const [internalOpen, setInternalOpen] = useState(false);
    const dialogOpen = isControlled ? open : internalOpen;
    const setDialogOpen = useCallback(
        (next: boolean) => {
            if (isControlled) {
                onOpenChange(next);
            } else {
                setInternalOpen(next);
            }
        },
        [isControlled, onOpenChange],
    );
    const [imageUrl, setImageUrl] = useState(backgroundImage);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                setImageUrl(dataUrl);
                setBackgroundImage(dataUrl);
                setBackgroundType('image');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveUrl = () => {
        setBackgroundImage(imageUrl);
        setBackgroundType('image');
        setDialogOpen(false);
    };

    return (
        <>
            {!isControlled &&
                (children ? (
                    <div onClick={() => setDialogOpen(true)} className='contents cursor-pointer'>
                        {children}
                    </div>
                ) : (
                    <button
                        type='button'
                        onClick={() => setDialogOpen(true)}
                        className='border-border/50 bg-background/90 hover:bg-background flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-200 hover:scale-110'
                        title={t('appearance.background.customize')}
                    >
                        <ImageIcon className='h-4 w-4' aria-hidden='true' />
                    </button>
                ))}

            <Transition appear show={dialogOpen} as={Fragment}>
                <Dialog as='div' className='relative z-[60]' onClose={() => setDialogOpen(false)}>
                    <TransitionChild
                        as={Fragment}
                        enter='ease-out duration-300'
                        enterFrom='opacity-0'
                        enterTo='opacity-100'
                        leave='ease-in duration-200'
                        leaveFrom='opacity-100'
                        leaveTo='opacity-0'
                    >
                        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm' />
                    </TransitionChild>

                    <div className='fixed inset-0 overflow-y-auto'>
                        <div className='flex min-h-full items-center justify-center p-4'>
                            <TransitionChild
                                as={Fragment}
                                enter='ease-out duration-300'
                                enterFrom='opacity-0 scale-95'
                                enterTo='opacity-100 scale-100'
                                leave='ease-in duration-200'
                                leaveFrom='opacity-100 scale-100'
                                leaveTo='opacity-0 scale-95'
                            >
                                <DialogPanel className='bg-card border-border/50 w-full max-w-lg transform overflow-hidden rounded-2xl border p-6 transition-all'>
                                    <div className='mb-6 flex items-center justify-between'>
                                        <DialogTitle className='text-foreground text-lg font-semibold'>
                                            {t('appearance.background.title')}
                                        </DialogTitle>
                                        <button
                                            type='button'
                                            onClick={() => setDialogOpen(false)}
                                            className='hover:bg-accent rounded-lg p-1 transition-colors'
                                        >
                                            <XIcon className='h-5 w-5' />
                                        </button>
                                    </div>

                                    <TabGroup
                                        defaultIndex={
                                            backgroundType === 'aurora' ? 0 : backgroundType === 'gradient' ? 1 : 2
                                        }
                                    >
                                        <TabList className='bg-muted mb-6 flex space-x-1 rounded-xl p-1'>
                                            <Tab
                                                className={({ selected }) =>
                                                    `w-full rounded-lg py-2.5 text-sm font-medium transition-all ${
                                                        selected
                                                            ? 'bg-background text-foreground shadow'
                                                            : 'text-muted-foreground hover:bg-background/50'
                                                    }`
                                                }
                                            >
                                                {t('appearance.background.aurora')}
                                            </Tab>
                                            <Tab
                                                className={({ selected }) =>
                                                    `w-full rounded-lg py-2.5 text-sm font-medium transition-all ${
                                                        selected
                                                            ? 'bg-background text-foreground shadow'
                                                            : 'text-muted-foreground hover:bg-background/50'
                                                    }`
                                                }
                                            >
                                                {t('appearance.background.gradients')}
                                            </Tab>
                                            <Tab
                                                className={({ selected }) =>
                                                    `w-full rounded-lg py-2.5 text-sm font-medium transition-all ${
                                                        selected
                                                            ? 'bg-background text-foreground shadow'
                                                            : 'text-muted-foreground hover:bg-background/50'
                                                    }`
                                                }
                                            >
                                                {t('appearance.background.custom')}
                                            </Tab>
                                        </TabList>

                                        <TabPanels>
                                            <TabPanel>
                                                <p className='text-muted-foreground mb-3 text-xs'>
                                                    {t('appearance.background.auroraDescription')}
                                                </p>
                                                <div className='grid grid-cols-2 gap-3 sm:grid-cols-3'>
                                                    {(
                                                        [
                                                            'aurora',
                                                            'beams',
                                                            'colorBends',
                                                            'floatingLines',
                                                            'silk',
                                                        ] as BackgroundAnimatedVariant[]
                                                    ).map((variant) => {
                                                        const isSelected =
                                                            backgroundType === 'aurora' &&
                                                            backgroundAnimatedVariant === variant;
                                                        return (
                                                            <button
                                                                key={variant}
                                                                onClick={() => {
                                                                    setBackgroundType('aurora');
                                                                    setBackgroundAnimatedVariant(variant);
                                                                    setDialogOpen(false);
                                                                }}
                                                                className={`relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${
                                                                    isSelected
                                                                        ? 'border-primary ring-primary/20 ring-2'
                                                                        : 'border-border hover:border-primary/50'
                                                                }`}
                                                            >
                                                                <div
                                                                    className='from-primary/40 via-primary/20 to-primary/40 h-14 w-full shrink-0 rounded-lg bg-linear-to-r'
                                                                    style={{
                                                                        opacity: isSelected ? 1 : 0.8,
                                                                    }}
                                                                />
                                                                <p className='text-center text-xs font-medium'>
                                                                    {t(`appearance.background.variants.${variant}`)}
                                                                </p>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </TabPanel>
                                            <TabPanel>
                                                <button
                                                    type='button'
                                                    onClick={() => {
                                                        setBackgroundType('gradient');
                                                        setDialogOpen(false);
                                                    }}
                                                    className={`relative flex w-full items-center gap-4 rounded-xl border-2 p-4 transition-all ${
                                                        backgroundType === 'gradient'
                                                            ? 'border-primary ring-primary/20 ring-2'
                                                            : 'border-border hover:border-primary/50'
                                                    }`}
                                                >
                                                    <div
                                                        className='h-20 w-24 shrink-0 rounded-lg'
                                                        style={{
                                                            background:
                                                                'linear-gradient(135deg, hsl(var(--primary) / 0.2) 0%, hsl(var(--primary) / 0.06) 50%, hsl(var(--primary) / 0.2) 100%)',
                                                        }}
                                                    />
                                                    <div className='text-left'>
                                                        <p className='text-sm font-medium'>
                                                            {t('appearance.background.themeGradient')}
                                                        </p>
                                                        <p className='text-muted-foreground mt-0.5 text-xs'>
                                                            {t('appearance.background.themeGradientDescription')}
                                                        </p>
                                                    </div>
                                                </button>
                                            </TabPanel>

                                            <TabPanel>
                                                <div className='space-y-4'>
                                                    <div className='grid grid-cols-3 gap-3'>
                                                        <button
                                                            onClick={() => setBackgroundType('solid')}
                                                            className={`relative rounded-xl border-2 p-4 transition-all ${
                                                                backgroundType === 'solid'
                                                                    ? 'border-primary ring-primary/20 ring-2'
                                                                    : 'border-border hover:border-primary/50'
                                                            }`}
                                                        >
                                                            <div className='bg-background mb-2 h-16 rounded-lg' />
                                                            <p className='text-xs font-medium'>
                                                                {t('appearance.background.solidColor')}
                                                            </p>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setBackgroundType('pattern');
                                                                setDialogOpen(false);
                                                            }}
                                                            className={`relative rounded-xl border-2 p-4 transition-all ${
                                                                backgroundType === 'pattern'
                                                                    ? 'border-primary ring-primary/20 ring-2'
                                                                    : 'border-border hover:border-primary/50'
                                                            }`}
                                                        >
                                                            <div
                                                                className='bg-background mb-2 h-16 rounded-lg opacity-50'
                                                                style={{
                                                                    backgroundImage:
                                                                        'radial-gradient(circle, currentColor 1px, transparent 1px)',
                                                                    backgroundSize: '16px 16px',
                                                                }}
                                                            />
                                                            <p className='text-xs font-medium'>
                                                                {t('appearance.background.dotPattern')}
                                                            </p>
                                                        </button>
                                                        <button
                                                            onClick={() => setBackgroundType('image')}
                                                            className={`relative rounded-xl border-2 p-4 transition-all ${
                                                                backgroundType === 'image'
                                                                    ? 'border-primary ring-primary/20 ring-2'
                                                                    : 'border-border hover:border-primary/50'
                                                            }`}
                                                        >
                                                            <div className='bg-muted mb-2 flex h-16 items-center justify-center rounded-lg'>
                                                                <ImageIcon className='text-muted-foreground h-6 w-6' />
                                                            </div>
                                                            <p className='text-xs font-medium'>
                                                                {t('appearance.background.customImage')}
                                                            </p>
                                                        </button>
                                                    </div>

                                                    {(backgroundType === 'solid' || backgroundType === 'image') && (
                                                        <>
                                                            {backgroundType === 'solid' && (
                                                                <div>
                                                                    <label className='mb-2 block text-sm font-medium'>
                                                                        {t('appearance.background.customColor')}
                                                                    </label>
                                                                    <div className='flex items-center gap-3'>
                                                                        <input
                                                                            type='color'
                                                                            value={
                                                                                backgroundImage.startsWith('#')
                                                                                    ? backgroundImage
                                                                                    : '#000000'
                                                                            }
                                                                            onChange={(e) => {
                                                                                setBackgroundImage(e.target.value);
                                                                                setBackgroundType('solid');
                                                                            }}
                                                                            className='border-border h-10 w-14 cursor-pointer rounded-lg border'
                                                                        />
                                                                        <input
                                                                            type='text'
                                                                            value={
                                                                                backgroundImage.startsWith('#')
                                                                                    ? backgroundImage
                                                                                    : '#000000'
                                                                            }
                                                                            onChange={(e) => {
                                                                                const color = e.target.value;
                                                                                if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
                                                                                    setBackgroundImage(color);
                                                                                    setBackgroundType('solid');
                                                                                }
                                                                            }}
                                                                            placeholder='#000000'
                                                                            className='border-input bg-background text-foreground focus:ring-primary flex-1 rounded-lg border px-3 py-2 font-mono text-sm focus:ring-2 focus:outline-none'
                                                                        />
                                                                    </div>
                                                                    <p className='text-muted-foreground mt-1 text-xs'>
                                                                        {t('appearance.background.customColorHelp')}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {backgroundType === 'image' && (
                                                                <div className='space-y-3'>
                                                                    <div>
                                                                        <label className='mb-2 block text-sm font-medium'>
                                                                            {t('appearance.background.uploadLocal')}
                                                                        </label>
                                                                        <input
                                                                            ref={fileInputRef}
                                                                            type='file'
                                                                            accept='image/*'
                                                                            onChange={handleFileUpload}
                                                                            className='hidden'
                                                                        />
                                                                        <Button
                                                                            onClick={() =>
                                                                                fileInputRef.current?.click()
                                                                            }
                                                                            variant='outline'
                                                                            className='w-full'
                                                                        >
                                                                            <ArrowUp className='mr-2 h-4 w-4' />
                                                                            {t('appearance.background.chooseFile')}
                                                                        </Button>
                                                                    </div>
                                                                    <div className='relative'>
                                                                        <div className='absolute inset-0 flex items-center'>
                                                                            <div className='border-border w-full border-t' />
                                                                        </div>
                                                                        <div className='relative flex justify-center text-xs'>
                                                                            <span className='bg-card text-muted-foreground px-2'>
                                                                                {t('appearance.background.or')}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label className='mb-2 block text-sm font-medium'>
                                                                            {t('appearance.background.imageUrl')}
                                                                        </label>
                                                                        <input
                                                                            type='url'
                                                                            value={imageUrl}
                                                                            onChange={(e) =>
                                                                                setImageUrl(e.target.value)
                                                                            }
                                                                            placeholder='https://example.com/image.jpg'
                                                                            className='border-input bg-background text-foreground focus:ring-primary w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none'
                                                                        />
                                                                        <Button
                                                                            onClick={handleSaveUrl}
                                                                            className='mt-2 w-full'
                                                                        >
                                                                            {t('appearance.background.applyImage')}
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </TabPanel>
                                        </TabPanels>
                                    </TabGroup>

                                    <div className='border-border/50 mt-6 space-y-5 border-t pt-6'>
                                        <div>
                                            <label className='text-foreground mb-2 block text-sm font-medium'>
                                                {t('appearance.background.backdropBlur')}
                                            </label>
                                            <div className='flex flex-wrap gap-2'>
                                                {BLUR_STEPS.map((px) => (
                                                    <button
                                                        key={px}
                                                        type='button'
                                                        onClick={() => setBackdropBlur(px)}
                                                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                                            backdropBlur === px
                                                                ? 'bg-primary text-primary-foreground'
                                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                        }`}
                                                    >
                                                        {px === 0 ? t('appearance.background.off') : `${px}px`}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className='text-foreground mb-2 block text-sm font-medium'>
                                                {t('appearance.background.backdropDarken')} ({backdropDarken}%)
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
                                            <div>
                                                <label className='text-foreground mb-2 block text-sm font-medium'>
                                                    {t('appearance.background.imageFit.title')}
                                                </label>
                                                <div className='flex flex-wrap gap-2'>
                                                    {IMAGE_FIT_OPTIONS.map((opt) => (
                                                        <button
                                                            key={opt.value}
                                                            type='button'
                                                            onClick={() => setBackgroundImageFit(opt.value)}
                                                            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                                                backgroundImageFit === opt.value
                                                                    ? 'bg-primary text-primary-foreground'
                                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                            }`}
                                                        >
                                                            {t(opt.labelKey)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {/* Motion level controls removed – motion is now always off ('none'). */}

                                        <div>
                                            <label className='text-foreground mb-2 block text-sm font-medium'>
                                                Fonts
                                            </label>
                                            <div className='space-y-1'>
                                                {[
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
                                                ].map((option) => (
                                                    <button
                                                        key={option.value}
                                                        type='button'
                                                        onClick={() => setFontFamily(option.value)}
                                                        className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-sm transition-colors ${
                                                            fontFamily === option.value
                                                                ? 'bg-primary/10 text-primary'
                                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                        }`}
                                                        style={{ fontFamily: option.preview }}
                                                    >
                                                        <span>{option.name}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
}
