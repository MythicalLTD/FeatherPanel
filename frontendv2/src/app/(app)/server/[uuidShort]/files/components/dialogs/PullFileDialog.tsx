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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { toast } from 'sonner';
import { filesApi } from '@/lib/files-api';
import { Download } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface PullFileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    root: string;
    onSuccess: () => void;
}

export function PullFileDialog({ open, onOpenChange, uuid, root, onSuccess }: PullFileDialogProps) {
    const { t } = useTranslation();
    const [url, setUrl] = useState('');
    const [filename, setFilename] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePull = async () => {
        if (!url) {
            toast.error(t('files.dialogs.pull.url_required'));
            return;
        }

        setLoading(true);
        const toastId = toast.loading(t('files.dialogs.pull.starting'));
        try {
            await filesApi.pullFile(uuid, root, url, filename || undefined);
            toast.success(t('files.dialogs.pull.success'), { id: toastId });
            onSuccess();
            onOpenChange(false);
            setUrl('');
            setFilename('');
        } catch {
            toast.error(t('files.dialogs.pull.error'), { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <div className='flex items-center gap-3'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20'>
                            <Download className='h-5 w-5' />
                        </div>
                        <div>
                            <DialogTitle>{t('files.dialogs.pull.title')}</DialogTitle>
                            <DialogDescription>{t('files.dialogs.pull.description')}</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className='flex flex-col gap-4 py-4'>
                    <div className='space-y-2'>
                        <label className='text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1'>
                            {t('files.dialogs.pull.url_label')}
                        </label>
                        <Input
                            placeholder={t('files.dialogs.pull.url_placeholder')}
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className='bg-white/5 border-white/10 focus:border-primary/50'
                        />
                    </div>
                    <div className='space-y-2'>
                        <label className='text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1'>
                            {t('files.dialogs.pull.name_label')}
                        </label>
                        <Input
                            placeholder={t('files.dialogs.pull.name_placeholder')}
                            value={filename}
                            onChange={(e) => setFilename(e.target.value)}
                            className='bg-white/5 border-white/10 focus:border-primary/50'
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant='ghost' onClick={() => onOpenChange(false)}>
                        {t('files.dialogs.pull.cancel')}
                    </Button>
                    <Button
                        variant='default'
                        onClick={handlePull}
                        disabled={loading || !url}
                        className='shadow-lg shadow-primary/20'
                    >
                        {t('files.dialogs.pull.pull_button')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
