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
import { useTranslation } from '@/contexts/TranslationContext';
import { ArchiveRestore } from 'lucide-react';

interface RestoreTrashDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    count: number;
    onConfirm: (overwrite: boolean) => void;
    loading?: boolean;
}

export function RestoreTrashDialog({ open, onOpenChange, count, onConfirm, loading = false }: RestoreTrashDialogProps) {
    const { t } = useTranslation();
    const [overwrite, setOverwrite] = useState(false);

    const handleClose = (next: boolean) => {
        if (!loading) {
            if (!next) setOverwrite(false);
            onOpenChange(next);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>{t('files.trash.restore_dialog.title')}</DialogTitle>
                    <DialogDescription>
                        {t('files.trash.restore_dialog.description', { count: String(count) })}
                    </DialogDescription>
                </DialogHeader>
                <label className='flex cursor-pointer items-start gap-3 rounded-lg border border-black/5 p-3 dark:border-white/10'>
                    <input
                        type='checkbox'
                        className='mt-0.5'
                        checked={overwrite}
                        onChange={(e) => setOverwrite(e.target.checked)}
                        disabled={loading}
                    />
                    <span className='text-sm'>
                        <span className='text-foreground font-medium'>
                            {t('files.trash.restore_dialog.overwrite_label')}
                        </span>
                        <span className='text-muted-foreground mt-1 block text-xs'>
                            {t('files.trash.restore_dialog.overwrite_hint')}
                        </span>
                    </span>
                </label>
                <DialogFooter className='gap-2 sm:gap-0'>
                    <Button variant='ghost' onClick={() => handleClose(false)} disabled={loading}>
                        {t('files.trash.restore_dialog.cancel')}
                    </Button>
                    <Button onClick={() => onConfirm(overwrite)} disabled={loading}>
                        <ArchiveRestore className='mr-2 h-4 w-4' />
                        {loading ? t('files.trash.restore_dialog.confirming') : t('files.trash.restore_dialog.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
