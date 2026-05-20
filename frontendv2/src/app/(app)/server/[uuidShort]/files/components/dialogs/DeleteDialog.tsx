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

import { useMemo, useState } from 'react';
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
import { filterFeatherTrashNames } from '@/lib/feather-trash';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { isEnabled } from '@/lib/utils';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface DeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    root: string;
    files: string[];
    onSuccess: () => void;
}

function DeleteFileList({ files }: { files: string[] }) {
    if (files.length === 0) return null;
    return (
        <div className='border-border bg-muted/40 max-h-36 overflow-y-auto rounded-lg border p-3'>
            <ul className='space-y-1'>
                {files.map((f) => (
                    <li key={f} className='text-foreground truncate font-mono text-xs'>
                        {f}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function DeleteDialog({ open, onOpenChange, uuid, root, files, onSuccess }: DeleteDialogProps) {
    const { t } = useTranslation();
    const { settings } = useSettings();
    const [loading, setLoading] = useState(false);

    const trashEnabled = isEnabled(settings?.file_trash_enabled);
    const safeFiles = useMemo(() => filterFeatherTrashNames(files), [files]);

    const handleClose = (next: boolean) => {
        if (!loading) onOpenChange(next);
    };

    const handleDelete = async (permanent: boolean) => {
        if (safeFiles.length === 0) {
            toast.error(t('files.messages.delete_failed'));
            return;
        }
        setLoading(true);
        try {
            await filesApi.deleteFiles(uuid, root, safeFiles, permanent);
            toast.success(
                trashEnabled && !permanent ? t('files.messages.moved_to_trash') : t('files.messages.deleted'),
            );
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error(t('files.messages.delete_failed'));
        } finally {
            setLoading(false);
        }
    };

    if (trashEnabled) {
        return (
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className='sm:max-w-md'>
                    <DialogHeader>
                        <DialogTitle>{t('files.dialogs.delete.title_trash')}</DialogTitle>
                        <DialogDescription>
                            {t('files.dialogs.delete.description_trash', { count: String(safeFiles.length) })}
                        </DialogDescription>
                    </DialogHeader>
                    <DeleteFileList files={safeFiles} />
                    <DialogFooter className='gap-2 sm:gap-0'>
                        <Button variant='ghost' onClick={() => handleClose(false)} disabled={loading}>
                            {t('files.dialogs.delete.cancel')}
                        </Button>
                        <Button
                            variant='ghost'
                            className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                            onClick={() => handleDelete(true)}
                            disabled={loading}
                        >
                            {t('files.dialogs.delete.delete_permanent_short')}
                        </Button>
                        <Button onClick={() => handleDelete(false)} disabled={loading}>
                            {loading
                                ? t('files.dialogs.delete.moving_to_trash')
                                : t('files.dialogs.delete.move_to_trash')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>{t('files.dialogs.delete.title')}</DialogTitle>
                    <DialogDescription>
                        {t('files.dialogs.delete.description', { count: String(safeFiles.length) })}
                    </DialogDescription>
                </DialogHeader>
                <DeleteFileList files={safeFiles} />
                <DialogFooter className='gap-2 sm:gap-0'>
                    <Button variant='ghost' onClick={() => handleClose(false)} disabled={loading}>
                        {t('files.dialogs.delete.cancel')}
                    </Button>
                    <Button variant='destructive' onClick={() => handleDelete(true)} disabled={loading}>
                        <Trash2 className='mr-2 h-4 w-4' />
                        {loading ? t('files.dialogs.delete.deleting') : t('files.dialogs.delete.delete')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
