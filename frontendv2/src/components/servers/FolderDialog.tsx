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
                            <DialogPanel className='w-full max-w-md transform overflow-hidden rounded-3xl bg-card border border-border shadow-2xl transition-all'>
                                <div className='p-8'>
                                    <DialogTitle className='text-2xl font-bold mb-6'>
                                        {editingFolder ? t('servers.editFolder') : t('servers.createFolder')}
                                    </DialogTitle>

                                    <div className='space-y-4'>
                                        <div>
                                            <label className='block text-sm font-medium mb-2'>
                                                {t('servers.folderName')}
                                            </label>
                                            <input
                                                type='text'
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder={t('servers.folderNamePlaceholder')}
                                                className='w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all'
                                            />
                                        </div>

                                        <div>
                                            <label className='block text-sm font-medium mb-2'>
                                                {t('servers.folderDescription')}
                                            </label>
                                            <textarea
                                                value={formData.description}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, description: e.target.value })
                                                }
                                                placeholder={t('servers.folderDescriptionPlaceholder')}
                                                rows={3}
                                                className='w-full px-4 py-3 bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none'
                                            />
                                        </div>
                                    </div>

                                    <div className='flex gap-3 mt-8'>
                                        <button
                                            onClick={onSave}
                                            disabled={!formData.name.trim()}
                                            className='flex-1 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                                        >
                                            {editingFolder ? t('servers.saveChanges') : t('servers.createFolder')}
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className='px-6 py-3 bg-muted text-foreground rounded-xl font-semibold hover:bg-muted/80 transition-colors'
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
