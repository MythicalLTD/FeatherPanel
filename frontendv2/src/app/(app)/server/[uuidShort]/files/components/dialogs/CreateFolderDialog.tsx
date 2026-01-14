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

import { useState } from 'react';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { filesApi } from '@/lib/files-api';
import { useTranslation } from '@/contexts/TranslationContext';

interface CreateFolderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    root: string;
    onSuccess: () => void;
}

export function CreateFolderDialog({ open, onOpenChange, uuid, root, onSuccess }: CreateFolderDialogProps) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setLoading(true);
        try {
            await filesApi.createFolder(uuid, root, name);
            toast.success(t('files.dialogs.create_folder.success'));
            setName('');
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error(t('files.dialogs.create_folder.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('files.dialogs.create_folder.title')}</DialogTitle>
                    <DialogDescription>
                        {t('files.dialogs.create_folder.description', { root: root })}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <Input
                        placeholder={t('files.dialogs.create_folder.name_placeholder')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                    />
                    <DialogFooter>
                        <Button type='button' variant='ghost' onClick={() => onOpenChange(false)}>
                            {t('files.dialogs.create_folder.cancel')}
                        </Button>
                        <Button type='submit' disabled={!name || loading}>
                            {loading
                                ? t('files.dialogs.create_folder.creating')
                                : t('files.dialogs.create_folder.create')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
