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

import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Label } from '@/components/ui/label';
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
        <Dialog open={isOpen} onClose={onClose} onOpenChange={(open) => !open && onClose()} className='max-w-md'>
            <DialogHeader>
                <DialogTitle className='text-2xl font-bold'>
                    {editingFolder ? t('servers.editFolder') : t('servers.createFolder')}
                </DialogTitle>
            </DialogHeader>

            <div className='space-y-4 py-2'>
                <div>
                    <Label className='mb-2 block'>{t('servers.folderName')}</Label>
                    <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t('servers.folderNamePlaceholder')}
                    />
                </div>
                <div>
                    <Label className='mb-2 block'>{t('servers.folderDescription')}</Label>
                    <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder={t('servers.folderDescriptionPlaceholder')}
                        rows={3}
                    />
                </div>
            </div>

            <DialogFooter className='gap-3'>
                <Button onClick={onSave} disabled={!formData.name.trim()} className='flex-1'>
                    {editingFolder ? t('servers.saveChanges') : t('servers.createFolder')}
                </Button>
                <Button variant='secondary' onClick={onClose}>
                    {t('servers.cancel')}
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
