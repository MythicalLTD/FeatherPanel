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
import { Fragment, useState, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { BackgroundAnimatedVariant, BackgroundImageFit, MotionLevel } from '@/contexts/ThemeContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, ArrowUp, XIcon, Sparkles } from 'lucide-react';

interface BackgroundCustomizerProps {
    children?: React.ReactNode;
}

const BLUR_STEPS = [0, 4, 8, 12, 16, 24];
const IMAGE_FIT_OPTIONS: { value: BackgroundImageFit; labelKey: string }[] = [
    { value: 'cover', labelKey: 'appearance.background.imageFit.cover' },
    { value: 'contain', labelKey: 'appearance.background.imageFit.contain' },
    { value: 'fill', labelKey: 'appearance.background.imageFit.fill' },
];
const MOTION_OPTIONS: { value: MotionLevel; labelKey: string }[] = [
    { value: 'full', labelKey: 'appearance.motion.full' },
    { value: 'reduced', labelKey: 'appearance.motion.reduced' },
    { value: 'none', labelKey: 'appearance.motion.none' },
];

export default function BackgroundCustomizer({ children }: BackgroundCustomizerProps) {
    const {
        backgroundType,
        backgroundImage,
        backgroundAnimatedVariant,
        backdropBlur,
        backdropDarken,
        backgroundImageFit,
        motionLevel,
        setBackgroundType,
        setBackgroundAnimatedVariant,
        setBackgroundImage,
        setBackdropBlur,
        setBackdropDarken,
        setBackgroundImageFit,
        setMotionLevel,
    } = useTheme();
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
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
        setIsOpen(false);
    };

    return (
        <>
            {children ? (
                <div onClick={() => setIsOpen(true)} className='contents cursor-pointer'>
                    {children}
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    className='h-10 w-10 rounded-full border border-border/50 bg-background/90 backdrop-blur-md hover:bg-background hover:scale-110 hover:shadow-lg transition-all duration-200 flex items-center justify-center'
                    title={t('appearance.background.customize')}
                >
                    <ImageIcon className='h-4 w-4' aria-hidden='true' />
                </button>
            )}

            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as='div' className='relative z-50' onClose={() => setIsOpen(false)}>
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
                                <DialogPanel className='w-full max-w-lg transform overflow-hidden rounded-2xl bg-card border border-border/50 p-6 shadow-xl transition-all'>
                                    <div className='flex items-center justify-between mb-6'>
                                        <DialogTitle className='text-lg font-semibold text-foreground'>
                                            {t('appearance.background.title')}
                                        </DialogTitle>
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className='rounded-lg p-1 hover:bg-accent transition-colors'
                                        >
                                            <XIcon className='h-5 w-5' />
                                        </button>
                                    </div>

                                    <TabGroup
                                        defaultIndex={
                                            backgroundType === 'aurora' ? 0 : backgroundType === 'gradient' ? 1 : 2
                                        }
                                    >
                                        <TabList className='flex space-x-1 rounded-xl bg-muted p-1 mb-6'>
                                            <Tab
                                                className={({ selected }) =>
                                                    `w-full rounded-lg py-2.5 text-sm font-medium transition-all
                        ${
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
                                                    `w-full rounded-lg py-2.5 text-sm font-medium transition-all
                        ${
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
                                                    `w-full rounded-lg py-2.5 text-sm font-medium transition-all
                        ${
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
                                                <p className='text-xs text-muted-foreground mb-3'>
                                                    {t('appearance.background.auroraDescription')}
                                                </p>
                                                <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
                                                    {(
                                                        [
                                                            'aurora',
                                                            'beams',
                                                            'colorBends',
                                                            'darkVeil',
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
                                                                    setIsOpen(false);
                                                                }}
                                                                className={`relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                                                    isSelected
                                                                        ? 'border-primary ring-2 ring-primary/20'
                                                                        : 'border-border hover:border-primary/50'
                                                                }`}
                                                            >
                                                                <div
                                                                    className='h-14 w-full rounded-lg shrink-0 bg-linear-to-r from-primary/40 via-primary/20 to-primary/40'
                                                                    style={{
                                                                        opacity: isSelected ? 1 : 0.8,
                                                                    }}
                                                                />
                                                                <p className='text-xs font-medium text-center'>
                                                                    {t(`appearance.background.variants.${variant}`)}
                                                                </p>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </TabPanel>
                                            <TabPanel>
                                                <button
                                                    onClick={() => {
                                                        setBackgroundType('gradient');
                                                        setIsOpen(false);
                                                    }}
                                                    className={`relative w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                                                        backgroundType === 'gradient'
                                                            ? 'border-primary ring-2 ring-primary/20'
                                                            : 'border-border hover:border-primary/50'
                                                    }`}
                                                >
                                                    <div
                                                        className='h-20 w-24 rounded-lg shrink-0'
                                                        style={{
                                                            background:
                                                                'linear-gradient(135deg, hsl(var(--primary) / 0.2) 0%, hsl(var(--primary) / 0.06) 50%, hsl(var(--primary) / 0.2) 100%)',
                                                        }}
                                                    />
                                                    <div className='text-left'>
                                                        <p className='text-sm font-medium'>
                                                            {t('appearance.background.themeGradient')}
                                                        </p>
                                                        <p className='text-xs text-muted-foreground mt-0.5'>
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
                                                            className={`relative p-4 rounded-xl border-2 transition-all ${
                                                                backgroundType === 'solid'
                                                                    ? 'border-primary ring-2 ring-primary/20'
                                                                    : 'border-border hover:border-primary/50'
                                                            }`}
                                                        >
                                                            <div className='h-16 rounded-lg mb-2 bg-background' />
                                                            <p className='text-xs font-medium'>
                                                                {t('appearance.background.solidColor')}
                                                            </p>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setBackgroundType('pattern');
                                                                setIsOpen(false);
                                                            }}
                                                            className={`relative p-4 rounded-xl border-2 transition-all ${
                                                                backgroundType === 'pattern'
                                                                    ? 'border-primary ring-2 ring-primary/20'
                                                                    : 'border-border hover:border-primary/50'
                                                            }`}
                                                        >
                                                            <div
                                                                className='h-16 rounded-lg mb-2 bg-background opacity-50'
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
                                                            className={`relative p-4 rounded-xl border-2 transition-all ${
                                                                backgroundType === 'image'
                                                                    ? 'border-primary ring-2 ring-primary/20'
                                                                    : 'border-border hover:border-primary/50'
                                                            }`}
                                                        >
                                                            <div className='h-16 rounded-lg mb-2 bg-muted flex items-center justify-center'>
                                                                <ImageIcon className='h-6 w-6 text-muted-foreground' />
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
                                                                    <label className='block text-sm font-medium mb-2'>
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
                                                                            className='h-10 w-14 rounded-lg border border-border cursor-pointer'
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
                                                                            className='flex-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary'
                                                                        />
                                                                    </div>
                                                                    <p className='text-xs text-muted-foreground mt-1'>
                                                                        {t('appearance.background.customColorHelp')}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {backgroundType === 'image' && (
                                                                <div className='space-y-3'>
                                                                    <div>
                                                                        <label className='block text-sm font-medium mb-2'>
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
                                                                            <ArrowUp className='h-4 w-4 mr-2' />
                                                                            {t('appearance.background.chooseFile')}
                                                                        </Button>
                                                                    </div>
                                                                    <div className='relative'>
                                                                        <div className='absolute inset-0 flex items-center'>
                                                                            <div className='w-full border-t border-border' />
                                                                        </div>
                                                                        <div className='relative flex justify-center text-xs'>
                                                                            <span className='bg-card px-2 text-muted-foreground'>
                                                                                {t('appearance.background.or')}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label className='block text-sm font-medium mb-2'>
                                                                            {t('appearance.background.imageUrl')}
                                                                        </label>
                                                                        <input
                                                                            type='url'
                                                                            value={imageUrl}
                                                                            onChange={(e) =>
                                                                                setImageUrl(e.target.value)
                                                                            }
                                                                            placeholder='https://example.com/image.jpg'
                                                                            className='w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary'
                                                                        />
                                                                        <Button
                                                                            onClick={handleSaveUrl}
                                                                            className='w-full mt-2'
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

                                    <div className='mt-6 pt-6 border-t border-border/50 space-y-5'>
                                        <div>
                                            <label className='block text-sm font-medium text-foreground mb-2'>
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
                                            <label className='block text-sm font-medium text-foreground mb-2'>
                                                {t('appearance.background.backdropDarken')} ({backdropDarken}%)
                                            </label>
                                            <input
                                                type='range'
                                                min={0}
                                                max={100}
                                                value={backdropDarken}
                                                onChange={(e) => setBackdropDarken(Number(e.target.value))}
                                                className='w-full h-2 rounded-lg appearance-none bg-muted accent-primary'
                                            />
                                        </div>
                                        {backgroundType === 'image' && (
                                            <div>
                                                <label className='block text-sm font-medium text-foreground mb-2'>
                                                    {t('appearance.background.imageFit')}
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
                                        <div>
                                            <label className='block text-sm font-medium text-foreground mb-2'>
                                                <span className='flex items-center gap-1.5'>
                                                    <Sparkles className='h-4 w-4' />
                                                    {t('appearance.motion.title')}
                                                </span>
                                            </label>
                                            <p className='text-xs text-muted-foreground mb-2'>
                                                {t('appearance.motion.description')}
                                            </p>
                                            <div className='flex flex-wrap gap-2'>
                                                {MOTION_OPTIONS.map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        type='button'
                                                        onClick={() => setMotionLevel(opt.value)}
                                                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                                            motionLevel === opt.value
                                                                ? 'bg-primary text-primary-foreground'
                                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                        }`}
                                                    >
                                                        {t(opt.labelKey)}
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
