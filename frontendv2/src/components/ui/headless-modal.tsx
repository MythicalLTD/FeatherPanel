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

import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface HeadlessModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    description?: string;
    className?: string;
}

/**
 * @deprecated Prefer `Dialog` / `AlertDialog` / `ConfirmDialog` directly.
 * Kept as a thin compatibility wrapper so existing callers share one modal stack.
 */
export function HeadlessModal({ isOpen, onClose, title, children, description, className }: HeadlessModalProps) {
    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            onOpenChange={(open) => !open && onClose()}
            className={cn('max-w-md p-0', className)}
        >
            <div className='bg-card/95 border-border/5 border-b px-6 pt-6 pb-4 backdrop-blur-xl'>
                <DialogHeader className='mb-0'>
                    <DialogTitle className='text-foreground mb-0 flex items-center justify-between text-lg leading-6 font-semibold'>
                        {title}
                        <button
                            type='button'
                            className='hover:bg-muted text-muted-foreground hover:text-foreground -mt-2 -mr-2 rounded-full p-2 transition-colors'
                            onClick={onClose}
                        >
                            <X className='h-4 w-4' />
                        </button>
                    </DialogTitle>
                    {description ? (
                        <DialogDescription className='text-muted-foreground mt-2 text-sm leading-relaxed'>
                            {description}
                        </DialogDescription>
                    ) : null}
                </DialogHeader>
            </div>
            <div className='p-6 pt-4'>{children}</div>
        </Dialog>
    );
}
