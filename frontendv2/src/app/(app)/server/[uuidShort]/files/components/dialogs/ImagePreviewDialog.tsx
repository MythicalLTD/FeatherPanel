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

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/featherui/Button';
import { Download, X, Loader2, AlertCircle } from 'lucide-react';
import { FileObject } from '@/types/server';
import { formatFileSize } from '@/lib/utils';
import api from '@/lib/api';
import { useTranslation } from '@/contexts/TranslationContext';

interface ImagePreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    file: FileObject | null;
    currentDirectory: string;
    onDownload: (name: string) => void;
}

export function ImagePreviewDialog({
    open,
    onOpenChange,
    uuid,
    file,
    currentDirectory,
    onDownload,
}: ImagePreviewDialogProps) {
    const { t } = useTranslation();
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !file) {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
                setBlobUrl(null);
            }
            return;
        }

        const fetchImage = async () => {
            setLoading(true);
            setError(null);
            try {
                const filePath = currentDirectory === '/' ? file.name : `${currentDirectory}/${file.name}`;
                const response = await api.get(
                    `/user/servers/${uuid}/download-file?path=${encodeURIComponent(filePath)}`,
                    {
                        responseType: 'blob',
                    },
                );

                const url = URL.createObjectURL(response.data);
                setBlobUrl(url);
            } catch (err) {
                console.error('Failed to fetch image:', err);
                setError(t('files.dialogs.preview.error'));
            } finally {
                setLoading(false);
            }
        };

        fetchImage();

        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, file?.name, uuid]);

    if (!file) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='border-border flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl'>
                <DialogHeader className='flex flex-row items-center justify-between space-y-0 p-4 text-left'>
                    <div className='flex flex-col gap-1'>
                        <DialogTitle className='text-primary text-base leading-none font-semibold tracking-tight'>
                            {file.name}
                        </DialogTitle>
                        <p className='text-muted-foreground text-sm'>{formatFileSize(file.size)}</p>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => onDownload(file.name)}
                            className='text-muted-foreground hover:text-foreground h-8 w-8'
                            title={t('files.dialogs.preview.download')}
                        >
                            <Download className='h-4 w-4' />
                            <span className='sr-only'>{t('files.dialogs.preview.download')}</span>
                        </Button>
                        <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => onOpenChange(false)}
                            className='text-muted-foreground hover:text-foreground h-8 w-8'
                        >
                            <X className='h-4 w-4' />
                            <span className='sr-only'>{t('files.dialogs.preview.close')}</span>
                        </Button>
                    </div>
                </DialogHeader>

                <div className='relative flex min-h-[400px] flex-1 items-center justify-center overflow-auto p-8'>
                    {loading && (
                        <div className='flex flex-col items-center gap-3'>
                            <Loader2 className='text-primary h-8 w-8 animate-spin opacity-50' />
                            <p className='text-muted-foreground text-xs font-medium'>
                                {t('files.dialogs.preview.loading')}
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className='flex flex-col items-center gap-3 px-4 text-center'>
                            <div className='flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10'>
                                <AlertCircle className='h-6 w-6 text-red-500' />
                            </div>
                            <p className='max-w-xs text-sm font-medium text-red-400'>{error}</p>
                        </div>
                    )}

                    {!loading && !error && blobUrl && (
                        <div className='group animate-in zoom-in-95 relative max-h-full duration-500'>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={blobUrl}
                                alt={file.name}
                                className='max-h-[70vh] max-w-full rounded-lg object-contain transition-transform duration-500 group-hover:scale-[1.02]'
                            />
                            <div className='pointer-events-none absolute inset-0 rounded-lg ring-1 ring-white/10' />
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
