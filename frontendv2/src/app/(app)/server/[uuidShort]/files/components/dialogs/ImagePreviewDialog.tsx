/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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
            <DialogContent className='sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-border gap-0'>
                <DialogHeader className='p-4 flex flex-row items-center justify-between space-y-0 text-left'>
                    <div className='flex flex-col gap-1'>
                        <DialogTitle className='text-base font-semibold leading-none tracking-tight text-primary'>
                            {file.name}
                        </DialogTitle>
                        <p className='text-sm text-muted-foreground'>{formatFileSize(file.size)}</p>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => onDownload(file.name)}
                            className='h-8 w-8 text-muted-foreground hover:text-foreground'
                            title={t('files.dialogs.preview.download')}
                        >
                            <Download className='h-4 w-4' />
                            <span className='sr-only'>{t('files.dialogs.preview.download')}</span>
                        </Button>
                        <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => onOpenChange(false)}
                            className='h-8 w-8 text-muted-foreground hover:text-foreground'
                        >
                            <X className='h-4 w-4' />
                            <span className='sr-only'>{t('files.dialogs.preview.close')}</span>
                        </Button>
                    </div>
                </DialogHeader>

                <div className='flex-1 overflow-auto p-8 flex items-center justify-center relative min-h-[400px]'>
                    {loading && (
                        <div className='flex flex-col items-center gap-3'>
                            <Loader2 className='h-8 w-8 animate-spin text-primary opacity-50' />
                            <p className='text-xs text-muted-foreground font-medium'>
                                {t('files.dialogs.preview.loading')}
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className='flex flex-col items-center gap-3 text-center px-4'>
                            <div className='h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center'>
                                <AlertCircle className='h-6 w-6 text-red-500' />
                            </div>
                            <p className='text-sm text-red-400 font-medium max-w-xs'>{error}</p>
                        </div>
                    )}

                    {!loading && !error && blobUrl && (
                        <div className='relative group max-h-full animate-in zoom-in-95 duration-500'>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={blobUrl}
                                alt={file.name}
                                className='max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl transition-transform group-hover:scale-[1.02] duration-500'
                            />
                            <div className='absolute inset-0 rounded-lg ring-1 ring-white/10 pointer-events-none' />
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
