/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import * as React from 'react';
import { Button } from '@/components/featherui/Button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: React.ReactNode;
    description?: React.ReactNode;
    /** Extra content between description and footer (e.g. checkboxes, file lists). */
    children?: React.ReactNode;
    confirmLabel: React.ReactNode;
    cancelLabel: React.ReactNode;
    onConfirm: () => void | Promise<void>;
    loading?: boolean;
    disabled?: boolean;
    /** Destructive styling for the confirm action. Default true. */
    destructive?: boolean;
    /** Danger-framed panel (wipe-style). */
    dangerFrame?: boolean;
    className?: string;
}

/**
 * Shared destructive / confirm modal built on AlertDialog.
 * Prefer this over ad-hoc Dialog shells or window.confirm.
 */
export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    children,
    confirmLabel,
    cancelLabel,
    onConfirm,
    loading = false,
    disabled = false,
    destructive = true,
    dangerFrame = false,
    className,
}: ConfirmDialogProps) {
    const handleConfirm = async () => {
        await onConfirm();
    };

    return (
        <AlertDialog
            open={open}
            onOpenChange={(next) => {
                if (!loading) onOpenChange(next);
            }}
        >
            <AlertDialogContent className={cn(dangerFrame && 'border-red-500/20 bg-red-950/10', className)}>
                <AlertDialogHeader>
                    <AlertDialogTitle className={cn(dangerFrame && 'text-red-500')}>{title}</AlertDialogTitle>
                    {description ? (
                        <AlertDialogDescription className={cn(dangerFrame && 'text-red-400/80')}>
                            {description}
                        </AlertDialogDescription>
                    ) : null}
                </AlertDialogHeader>
                {children}
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
                    {destructive ? (
                        <Button
                            variant='destructive'
                            onClick={() => void handleConfirm()}
                            disabled={loading || disabled}
                        >
                            {confirmLabel}
                        </Button>
                    ) : (
                        <AlertDialogAction onClick={() => void handleConfirm()} disabled={loading || disabled}>
                            {confirmLabel}
                        </AlertDialogAction>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
