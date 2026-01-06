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
    // Since our Dialog component already renders the panel with standard styling,
    // we treat DialogContent as a pass-through or additional wrapper if needed.
    // We apply the className to the inner div to allow some customization,
    // though main layout is controlled by Dialog.
    return <div className={className}>{children}</div>;
}

export { DialogTitleComponent as DialogTitleCustom, DialogTitleComponent as DialogTitle };
