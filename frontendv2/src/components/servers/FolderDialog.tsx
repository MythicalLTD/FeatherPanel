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

import { Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import type { ServerFolder } from '@/types/server';

interface FolderDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    editingFolder: ServerFolder | null;
    formData: { name: string; description: string };
    setFormData: (data: { name: string; description: string }) => void;
    t: (key: string) => string;
}

export function FolderDialog({ isOpen, onClose, onSave, editingFolder, formData, setFormData, t }: FolderDialogProps) {
    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as='div' className='relative z-50' onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter='ease-out duration-300'
                    enterFrom='opacity-0'
                    enterTo='opacity-100'
                    leave='ease-in duration-200'
                    leaveFrom='opacity-100'
                    leaveTo='opacity-0'
                >
                    <div className='fixed inset-0 bg-black/70 backdrop-blur-sm' />
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
                            <DialogPanel className='bg-card border-border w-full max-w-md transform overflow-hidden rounded-3xl border shadow-2xl transition-all'>
                                <div className='p-8'>
                                    <DialogTitle className='mb-6 text-2xl font-bold'>
                                        {editingFolder ? t('servers.editFolder') : t('servers.createFolder')}
                                    </DialogTitle>

                                    <div className='space-y-4'>
                                        <div>
                                            <label className='mb-2 block text-sm font-medium'>
                                                {t('servers.folderName')}
                                            </label>
                                            <input
                                                type='text'
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder={t('servers.folderNamePlaceholder')}
                                                className='bg-background border-border focus:ring-primary w-full rounded-xl border px-4 py-3 transition-all focus:ring-2 focus:outline-none'
                                            />
                                        </div>

                                        <div>
                                            <label className='mb-2 block text-sm font-medium'>
                                                {t('servers.folderDescription')}
                                            </label>
                                            <textarea
                                                value={formData.description}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, description: e.target.value })
                                                }
                                                placeholder={t('servers.folderDescriptionPlaceholder')}
                                                rows={3}
                                                className='bg-background border-border focus:ring-primary w-full resize-none rounded-xl border px-4 py-3 transition-all focus:ring-2 focus:outline-none'
                                            />
                                        </div>
                                    </div>

                                    <div className='mt-8 flex gap-3'>
                                        <button
                                            onClick={onSave}
                                            disabled={!formData.name.trim()}
                                            className='bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-xl px-6 py-3 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'
                                        >
                                            {editingFolder ? t('servers.saveChanges') : t('servers.createFolder')}
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className='bg-muted text-foreground hover:bg-muted/80 rounded-xl px-6 py-3 font-semibold transition-colors'
                                        >
                                            {t('servers.cancel')}
                                        </button>
                                    </div>
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
