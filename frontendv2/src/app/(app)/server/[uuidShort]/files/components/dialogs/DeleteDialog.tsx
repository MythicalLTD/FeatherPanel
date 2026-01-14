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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { filesApi } from '@/lib/files-api';
import { useTranslation } from '@/contexts/TranslationContext';

interface DeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    root: string;
    files: string[]; // List of filenames to delete
    onSuccess: () => void;
}

export function DeleteDialog({ open, onOpenChange, uuid, root, files, onSuccess }: DeleteDialogProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        try {
            await filesApi.deleteFiles(uuid, root, files);
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('files.dialogs.delete.title')}</DialogTitle>
                    <DialogDescription className='text-destructive'>
                        {t('files.dialogs.delete.description', { count: String(files.length) })}
                    </DialogDescription>
                </DialogHeader>
                <div className='max-h-32 overflow-y-auto rounded bg-muted/50 p-2 text-sm text-muted-foreground'>
                    <ul className='list-inside list-disc'>
                        {files.map((f) => (
                            <li key={f}>{f}</li>
                        ))}
                    </ul>
                </div>
                <DialogFooter>
                    <Button variant='ghost' onClick={() => onOpenChange(false)} disabled={loading}>
                        {t('files.dialogs.delete.cancel')}
                    </Button>
                    <Button variant='destructive' onClick={handleDelete} disabled={loading}>
                        {loading ? t('files.dialogs.delete.deleting') : t('files.dialogs.delete.delete')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
