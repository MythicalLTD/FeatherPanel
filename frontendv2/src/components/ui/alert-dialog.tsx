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
    onClick?: (event: React.MouseEvent) => void;
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
    disabled,
}: {
    children: React.ReactNode;
    className?: string;
    onClick?: (event: React.MouseEvent) => void;
    disabled?: boolean;
}) {
    return (
        <Button variant='outline' onClick={onClick} className={className} disabled={disabled}>
            {children}
        </Button>
    );
}
