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

import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Checkbox } from '@/components/ui/checkbox';
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
        <ConfirmDialog
            open={open}
            onOpenChange={handleClose}
            destructive={false}
            title={t('files.trash.restore_dialog.title')}
            description={t('files.trash.restore_dialog.description', { count: String(count) })}
            cancelLabel={t('files.trash.restore_dialog.cancel')}
            confirmLabel={
                <>
                    <ArchiveRestore className='mr-2 h-4 w-4' />
                    {loading ? t('files.trash.restore_dialog.confirming') : t('files.trash.restore_dialog.confirm')}
                </>
            }
            onConfirm={() => onConfirm(overwrite)}
            loading={loading}
        >
            <label className='flex cursor-pointer items-start gap-3 rounded-lg border border-black/5 p-3 dark:border-white/10'>
                <Checkbox
                    checked={overwrite}
                    onCheckedChange={(c) => setOverwrite(c)}
                    disabled={loading}
                    className='mt-0.5'
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
        </ConfirmDialog>
    );
}
