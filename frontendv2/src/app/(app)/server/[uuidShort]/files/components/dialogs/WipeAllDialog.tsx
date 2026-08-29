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

'use client';

import { useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { useFileManagerApi } from '@/contexts/FileManagerApiContext';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface WipeAllDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    onSuccess: () => void;
}

export function WipeAllDialog({ open, onOpenChange, uuid, onSuccess }: WipeAllDialogProps) {
    const filesApi = useFileManagerApi();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const handleWipe = async () => {
        setLoading(true);
        const toastId = toast.loading(t('files.dialogs.wipe.wiping'));
        try {
            await filesApi.wipeAllFiles(uuid);
            toast.success(t('files.dialogs.wipe.success'), { id: toastId });
            onSuccess();
            onOpenChange(false);
        } catch {
            toast.error(t('files.dialogs.wipe.error'), { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <ConfirmDialog
            open={open}
            onOpenChange={onOpenChange}
            dangerFrame
            title={
                <span className='flex items-center gap-3'>
                    <span className='flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-500'>
                        <AlertTriangle className='h-6 w-6' />
                    </span>
                    <span className='text-xl font-bold text-red-500'>{t('files.dialogs.wipe.title')}</span>
                </span>
            }
            description={t('files.dialogs.wipe.description')}
            cancelLabel={t('files.dialogs.wipe.cancel')}
            confirmLabel={
                <>
                    <Trash2 className='mr-2 h-4 w-4' />
                    {t('files.dialogs.wipe.confirm')}
                </>
            }
            onConfirm={handleWipe}
            loading={loading}
        >
            <p className='rounded-xl border border-red-500/10 bg-red-500/5 p-4 text-sm leading-relaxed font-medium text-white/90'>
                {t('files.dialogs.wipe.confirmation')}
            </p>
        </ConfirmDialog>
    );
}
