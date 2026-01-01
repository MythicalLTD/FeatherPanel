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
import { Button } from '@/components/ui/button';

interface AlertDialogProps {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
    const handleClose = () => {
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
                            {children}
                        </TransitionChild>
                    </div>
                </div>
            </HeadlessDialog>
        </Transition>
    );
}

export const AlertDialogContent = React.forwardRef<HTMLDivElement, { className?: string; children: React.ReactNode }>(
    ({ className, children }, ref) => {
        return (
            <DialogPanel
                ref={ref}
                className={cn(
                    'w-full transform overflow-hidden rounded-2xl bg-card border border-border/50 p-6 text-left align-middle shadow-2xl transition-all',
                    !className?.includes('max-w-') && 'max-w-md',
                    className,
                )}
            >
                {children}
            </DialogPanel>
        );
    },
);
AlertDialogContent.displayName = 'AlertDialogContent';

export function AlertDialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn('mb-4', className)}>{children}</div>;
}

export function AlertDialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <DialogTitle className={cn('text-lg font-semibold leading-6 text-foreground', className)}>
            {children}
        </DialogTitle>
    );
}

export function AlertDialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
    return <Description className={cn('mt-2 text-sm text-muted-foreground', className)}>{children}</Description>;
}

export function AlertDialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn('mt-6 flex gap-3 justify-end', className)}>{children}</div>;
}

export function AlertDialogAction({
    children,
    className,
    onClick,
    disabled,
}: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
}) {
    return (
        <Button onClick={onClick} disabled={disabled} className={className}>
            {children}
        </Button>
    );
}

export function AlertDialogCancel({
    children,
    className,
    onClick,
}: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}) {
    return (
        <Button variant='outline' onClick={onClick} className={className}>
            {children}
        </Button>
    );
}
