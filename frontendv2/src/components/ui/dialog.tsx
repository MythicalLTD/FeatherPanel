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
import {
    Dialog as HeadlessDialog,
    DialogPanel,
    DialogTitle,
    Description,
    Transition,
    TransitionChild,
} from '@headlessui/react';
import { cn } from '@/lib/utils';

interface DialogProps {
    open: boolean;
    onClose?: () => void;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
    className?: string;
    /** Full viewport sheet — for settings-style panels. */
    fullscreen?: boolean;
}

export function Dialog({ open, onClose, onOpenChange, children, className, fullscreen = false }: DialogProps) {
    const handleClose = () => {
        onClose?.();
        onOpenChange?.(false);
    };

    return (
        <Transition show={open} as={React.Fragment}>
            <HeadlessDialog as='div' className='relative z-50' onClose={handleClose}>
                <TransitionChild
                    as={React.Fragment}
                    enter='ease-out duration-300'
                    enterFrom='opacity-0'
                    enterTo='opacity-100'
                    leave='ease-in duration-200'
                    leaveFrom='opacity-100'
                    leaveTo='opacity-0'
                >
                    <div className={cn('fixed inset-0 bg-black/50 backdrop-blur-sm', fullscreen && 'bg-black/60')} />
                </TransitionChild>

                <div className={cn('fixed inset-0', fullscreen ? 'overflow-hidden' : 'overflow-y-auto')}>
                    <div
                        className={cn(
                            'flex min-h-full text-center',
                            fullscreen ? 'h-dvh items-stretch justify-stretch p-0' : 'items-center justify-center p-4',
                        )}
                    >
                        <TransitionChild
                            as={React.Fragment}
                            enter='ease-out duration-300'
                            enterFrom={fullscreen ? 'opacity-0 translate-y-2' : 'opacity-0 scale-95'}
                            enterTo={fullscreen ? 'opacity-100 translate-y-0' : 'opacity-100 scale-100'}
                            leave='ease-in duration-200'
                            leaveFrom={fullscreen ? 'opacity-100 translate-y-0' : 'opacity-100 scale-100'}
                            leaveTo={fullscreen ? 'opacity-0 translate-y-2' : 'opacity-0 scale-95'}
                        >
                            <DialogPanel
                                className={cn(
                                    'bg-card border-border/50 w-full transform text-left align-middle shadow-2xl transition-all',
                                    fullscreen
                                        ? 'flex h-dvh max-h-dvh max-w-none flex-col overflow-hidden rounded-none border-0 p-0'
                                        : 'overflow-hidden rounded-2xl border p-6',
                                    !fullscreen && !className?.includes('max-w-') && 'max-w-md',
                                    className,
                                )}
                            >
                                {children}
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </HeadlessDialog>
        </Transition>
    );
}

interface DialogHeaderProps {
    children: React.ReactNode;
    className?: string;
}

export function DialogHeader({ children, className }: DialogHeaderProps) {
    return <div className={cn('mb-4', className)}>{children}</div>;
}

interface DialogTitleProps {
    children: React.ReactNode;
    className?: string;
}

export function DialogTitleComponent({ children, className }: DialogTitleProps) {
    return (
        <DialogTitle className={cn('text-foreground text-lg leading-6 font-semibold', className)}>
            {children}
        </DialogTitle>
    );
}

interface DialogDescriptionProps {
    children: React.ReactNode;
    className?: string;
}

export function DialogDescription({ children, className }: DialogDescriptionProps) {
    return <Description className={cn('text-muted-foreground mt-2 text-sm', className)}>{children}</Description>;
}

interface DialogFooterProps {
    children: React.ReactNode;
    className?: string;
}

export function DialogFooter({ children, className }: DialogFooterProps) {
    return <div className={cn('mt-6 flex justify-end gap-3', className)}>{children}</div>;
}

export function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
    return <div className={className}>{children}</div>;
}

export { DialogTitleComponent as DialogTitleCustom, DialogTitleComponent as DialogTitle };
