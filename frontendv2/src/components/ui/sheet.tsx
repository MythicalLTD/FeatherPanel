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

import * as React from 'react';
import { Dialog as HeadlessDialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface SheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
    className?: string;
}

export function Sheet({ open, onOpenChange, children, className }: SheetProps) {
    const { t } = useTranslation();

    return (
        <Transition show={open} as={React.Fragment}>
            <HeadlessDialog as='div' className='relative z-50' onClose={() => onOpenChange(false)}>
                <TransitionChild
                    as={React.Fragment}
                    enter='ease-in-out duration-500'
                    enterFrom='opacity-0'
                    enterTo='opacity-100'
                    leave='ease-in-out duration-500'
                    leaveFrom='opacity-100'
                    leaveTo='opacity-0'
                >
                    <div className='fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity' />
                </TransitionChild>

                <div className='fixed inset-0 overflow-hidden'>
                    <div className='absolute inset-0 overflow-hidden'>
                        <div className='pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10'>
                            <TransitionChild
                                as={React.Fragment}
                                enter='transform transition ease-in-out duration-500 sm:duration-700'
                                enterFrom='translate-x-full'
                                enterTo='translate-x-0'
                                leave='transform transition ease-in-out duration-500 sm:duration-700'
                                leaveFrom='translate-x-0'
                                leaveTo='translate-x-full'
                            >
                                <DialogPanel
                                    className={cn(
                                        'pointer-events-auto w-screen max-w-2xl transform transition-all',
                                        className,
                                    )}
                                >
                                    <div className='bg-background/95 border-border/50 flex h-full flex-col overflow-y-scroll border-l py-6 shadow-2xl backdrop-blur-xl'>
                                        <div className='px-4 sm:px-6'>
                                            <div className='flex items-start justify-between'>
                                                <div className='absolute top-6 right-6 z-20 ml-3 flex h-7 items-center'>
                                                    <button
                                                        type='button'
                                                        className='bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted relative rounded-xl p-2 transition-all focus:outline-hidden'
                                                        onClick={() => onOpenChange(false)}
                                                    >
                                                        <span className='absolute -inset-2.5' />
                                                        <span className='sr-only'>{t('common.closePanel')}</span>
                                                        <X className='h-5 w-5' aria-hidden='true' />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className='relative mt-6 flex-1 px-4 sm:px-8'>{children}</div>
                                    </div>
                                </DialogPanel>
                            </TransitionChild>
                        </div>
                    </div>
                </div>
            </HeadlessDialog>
        </Transition>
    );
}

export function SheetHeader({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn('mb-6', className)}>{children}</div>;
}

export function SheetTitle({ children, className }: { children: React.ReactNode; className?: string }) {
    return <h2 className={cn('text-2xl font-bold tracking-tight', className)}>{children}</h2>;
}

export function SheetDescription({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn('text-muted-foreground mt-2', className)}>{children}</div>;
}

export function SheetContent({ children }: { children: React.ReactNode; className?: string; side?: 'left' | 'right' }) {
    return <>{children}</>;
}

export function SheetFooter({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn('border-border/50 mt-auto flex gap-4 border-t pt-6', className)}>{children}</div>;
}
