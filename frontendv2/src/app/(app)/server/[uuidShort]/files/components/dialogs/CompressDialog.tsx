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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { Archive } from 'lucide-react';
import { toast } from 'sonner';
import { filesApi } from '@/lib/files-api';
import { useTranslation } from '@/contexts/TranslationContext';

interface CompressDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    serverUuid: string;
    directory: string;
    files: string[];
    onSuccess: () => void;
}

export function CompressDialog({ open, onOpenChange, serverUuid, directory, files, onSuccess }: CompressDialogProps) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [extension, setExtension] = useState('tar.gz');
    const [compressing, setCompressing] = useState(false);

    const formats = [
        { id: 'zip', name: 'ZIP (.zip)' },
        { id: 'tar.gz', name: 'TAR GZIP (.tar.gz)' },
        { id: 'tgz', name: 'TAR GZIP (.tgz)' },
        { id: 'tar.bz2', name: 'TAR BZIP2 (.tar.bz2)' },
        { id: 'tbz2', name: 'TAR BZIP2 (.tbz2)' },
        { id: 'tar.xz', name: 'TAR XZ (.tar.xz)' },
        { id: 'txz', name: 'TAR XZ (.txz)' },
    ];

    const handleCompress = async () => {
        setCompressing(true);
        const toastId = toast.loading(t('files.dialogs.compress.compressing'));
        try {
            await filesApi.compressFiles(serverUuid, directory, files, name || undefined, extension);
            toast.success(t('files.dialogs.compress.success'), { id: toastId });
            onSuccess();
            onOpenChange(false);
            setName('');
        } catch (error: unknown) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : t('files.dialogs.compress.error');
            toast.error(errorMessage, { id: toastId });
        } finally {
            setCompressing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>
                        <Archive className='h-5 w-5 text-primary' />
                        {t('files.dialogs.compress.title')}
                    </DialogTitle>
                    <DialogDescription>{t('files.dialogs.compress.description')}</DialogDescription>
                </DialogHeader>

                <div className='space-y-4 py-4'>
                    <div className='space-y-2'>
                        <Label
                            htmlFor='archive-type'
                            className='text-xs font-bold uppercase tracking-widest text-muted-foreground'
                        >
                            {t('files.dialogs.compress.type_label')}
                        </Label>
                        <HeadlessSelect
                            value={extension}
                            onChange={(val) => setExtension(String(val))}
                            options={formats}
                            disabled={compressing}
                            buttonClassName='h-11 bg-white/5 border-white/10 hover:border-primary/50 rounded-xl transition-all'
                        />
                    </div>

                    <div className='space-y-2'>
                        <Label
                            htmlFor='archive-name'
                            className='text-xs font-bold uppercase tracking-widest text-muted-foreground'
                        >
                            {t('files.dialogs.compress.name_label')}
                        </Label>
                        <Input
                            id='archive-name'
                            placeholder={t('files.dialogs.compress.name_placeholder')}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={compressing}
                            className='h-11 bg-white/5 border-white/10 focus:border-primary/50 rounded-xl'
                        />
                        <p className='text-[10px] text-muted-foreground'>{t('files.dialogs.compress.name_help')}</p>
                    </div>

                    <div className='p-3 rounded-xl bg-primary/5 border border-primary/10'>
                        <p className='text-xs text-primary/80 font-medium'>
                            {t('files.dialogs.compress.info', { count: String(files.length), directory: directory })}
                        </p>
                    </div>
                </div>

                <DialogFooter className='gap-2 sm:gap-0'>
                    <Button variant='ghost' onClick={() => onOpenChange(false)} disabled={compressing}>
                        {t('files.dialogs.compress.cancel')}
                    </Button>
                    <Button onClick={handleCompress} disabled={compressing} loading={compressing}>
                        <Archive className='h-4 w-4 mr-2' />
                        {t('files.dialogs.compress.compress')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
