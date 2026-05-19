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
import { Trash2 } from 'lucide-react';

interface EmptyTrashDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    loading?: boolean;
    disabled?: boolean;
}

export function EmptyTrashDialog({
    open,
    onOpenChange,
    onConfirm,
    loading = false,
    disabled = false,
}: EmptyTrashDialogProps) {
    const { t } = useTranslation();

    const handleClose = (next: boolean) => {
        if (!loading) onOpenChange(next);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>{t('files.trash.empty_dialog.title')}</DialogTitle>
                    <DialogDescription>{t('files.trash.empty_dialog.description')}</DialogDescription>
                </DialogHeader>
                <DialogFooter className='gap-2 sm:gap-0'>
                    <Button variant='ghost' onClick={() => handleClose(false)} disabled={loading}>
                        {t('files.trash.empty_dialog.cancel')}
                    </Button>
                    <Button variant='destructive' onClick={onConfirm} disabled={loading || disabled}>
                        <Trash2 className='mr-2 h-4 w-4' />
                        {loading ? t('files.trash.empty_dialog.confirming') : t('files.trash.empty_dialog.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
