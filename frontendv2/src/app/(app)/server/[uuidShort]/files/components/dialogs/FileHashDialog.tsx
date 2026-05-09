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

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { filesApi, FileHashesResponse } from '@/lib/files-api';
import { useTranslation } from '@/contexts/TranslationContext';
import { toast } from 'sonner';

interface FileHashDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    path: string;
}

export function FileHashDialog({ open, onOpenChange, uuid, path }: FileHashDialogProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [hashes, setHashes] = useState<FileHashesResponse | null>(null);

    useEffect(() => {
        let cancelled = false;

        const loadHashes = async () => {
            if (!open || !path) return;
            setLoading(true);
            setHashes(null);
            try {
                const result = await filesApi.getFileHashes(uuid, path);
                if (!cancelled) {
                    setHashes(result);
                }
            } catch {
                if (!cancelled) {
                    toast.error(t('files.dialogs.hash.error'));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadHashes();

        return () => {
            cancelled = true;
        };
    }, [open, path, t, uuid]);

    const copyValue = async (value: string) => {
        try {
            await navigator.clipboard.writeText(value);
            toast.success(t('files.dialogs.hash.copied'));
        } catch {
            toast.error(t('files.dialogs.hash.copy_error'));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-xl'>
                <DialogHeader>
                    <DialogTitle>{t('files.dialogs.hash.title')}</DialogTitle>
                    <DialogDescription>{t('files.dialogs.hash.description', { path })}</DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className='text-muted-foreground py-4 text-sm'>{t('files.dialogs.hash.calculating')}</div>
                ) : (
                    <div className='space-y-3 py-2'>
                        {[
                            { key: 'sha256', label: 'SHA-256' },
                            { key: 'sha1', label: 'SHA-1' },
                            { key: 'md5', label: 'MD5' },
                        ].map((item) => (
                            <div key={item.key} className='space-y-1'>
                                <label className='text-muted-foreground text-xs font-semibold'>{item.label}</label>
                                <div className='flex gap-2'>
                                    <Input
                                        value={(hashes?.[item.key as keyof FileHashesResponse] as string) || ''}
                                        readOnly
                                    />
                                    <Button
                                        type='button'
                                        variant='ghost'
                                        onClick={() =>
                                            copyValue((hashes?.[item.key as keyof FileHashesResponse] as string) || '')
                                        }
                                        disabled={!hashes}
                                    >
                                        {t('files.dialogs.hash.copy')}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <DialogFooter>
                    <Button variant='ghost' onClick={() => onOpenChange(false)}>
                        {t('files.dialogs.hash.close')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
