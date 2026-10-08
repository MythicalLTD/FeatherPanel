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

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
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

    return (
        <ConfirmDialog
            open={open}
            onOpenChange={onOpenChange}
            title={t('files.trash.empty_dialog.title')}
            description={t('files.trash.empty_dialog.description')}
            cancelLabel={t('files.trash.empty_dialog.cancel')}
            confirmLabel={
                <>
                    <Trash2 className='mr-2 h-4 w-4' />
                    {loading ? t('files.trash.empty_dialog.confirming') : t('files.trash.empty_dialog.confirm')}
                </>
            }
            onConfirm={onConfirm}
            loading={loading}
            disabled={disabled}
        />
    );
}
