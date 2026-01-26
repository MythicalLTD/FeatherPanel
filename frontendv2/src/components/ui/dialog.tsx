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
}

export function Dialog({ open, onClose, onOpenChange, children, className }: DialogProps) {
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
                    <div className='fixed inset-0 bg-black/50 backdrop-blur-sm' />
                </TransitionChild>

                <div className='fixed inset-0 overflow-y-auto'>
                    <div className='flex min-h-full items-center justify-center p-4 text-center'>
                        <TransitionChild
                            as={React.Fragment}
                            enter='ease-out duration-300'
                            enterFrom='opacity-0 scale-95'
                            enterTo='opacity-100 scale-100'
                            leave='ease-in duration-200'
                            leaveFrom='opacity-100 scale-100'
                            leaveTo='opacity-0 scale-95'
                        >
                            <DialogPanel
                                className={cn(
                                    'w-full transform overflow-hidden rounded-2xl bg-card border border-border/50 p-6 text-left align-middle shadow-2xl transition-all',
                                    !className?.includes('max-w-') && 'max-w-md',
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
        <DialogTitle className={cn('text-lg font-semibold leading-6 text-foreground', className)}>
            {children}
        </DialogTitle>
    );
}

interface DialogDescriptionProps {
    children: React.ReactNode;
    className?: string;
}

export function DialogDescription({ children, className }: DialogDescriptionProps) {
    return <Description className={cn('mt-2 text-sm text-muted-foreground', className)}>{children}</Description>;
}

interface DialogFooterProps {
    children: React.ReactNode;
    className?: string;
}

export function DialogFooter({ children, className }: DialogFooterProps) {
    return <div className={cn('mt-6 flex gap-3 justify-end', className)}>{children}</div>;
}

export function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
    return <div className={className}>{children}</div>;
}

export { DialogTitleComponent as DialogTitleCustom, DialogTitleComponent as DialogTitle };
