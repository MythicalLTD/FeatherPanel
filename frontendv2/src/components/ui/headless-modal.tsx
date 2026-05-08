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

import { Fragment, ReactNode } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeadlessModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    description?: string;
    className?: string;
}

export function HeadlessModal({ isOpen, onClose, title, children, description, className }: HeadlessModalProps) {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as='div' className='relative z-50' onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter='ease-out duration-300'
                    enterFrom='opacity-0'
                    enterTo='opacity-100'
                    leave='ease-in duration-200'
                    leaveFrom='opacity-100'
                    leaveTo='opacity-0'
                >
                    <div className='fixed inset-0 bg-black/25 backdrop-blur-sm' />
                </Transition.Child>

                <div className='fixed inset-0 overflow-y-auto'>
                    <div className='flex min-h-full items-center justify-center p-4 text-center'>
                        <Transition.Child
                            as={Fragment}
                            enter='ease-out duration-300'
                            enterFrom='opacity-0 scale-95'
                            enterTo='opacity-100 scale-100'
                            leave='ease-in duration-200'
                            leaveFrom='opacity-100 scale-100'
                            leaveTo='opacity-0 scale-95'
                        >
                            <Dialog.Panel
                                className={cn(
                                    'bg-card border-border/50 relative w-full max-w-md transform overflow-hidden rounded-2xl border text-left align-middle shadow-2xl transition-all',
                                    className,
                                )}
                            >
                                <div className='bg-card/95 border-border/5 border-b px-6 pt-6 pb-4 backdrop-blur-xl'>
                                    <Dialog.Title
                                        as='h3'
                                        className='text-foreground mb-2 flex items-center justify-between text-lg leading-6 font-semibold'
                                    >
                                        {title}
                                        <button
                                            type='button'
                                            className='hover:bg-muted text-muted-foreground hover:text-foreground -mt-2 -mr-2 rounded-full p-2 transition-colors'
                                            onClick={onClose}
                                        >
                                            <X className='h-4 w-4' />
                                        </button>
                                    </Dialog.Title>
                                    {description && (
                                        <div className='mt-2'>
                                            <p className='text-muted-foreground text-sm leading-relaxed'>
                                                {description}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className='p-6 pt-4'>{children}</div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
