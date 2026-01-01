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
import { filesApi } from '@/lib/files-api';
import { useTranslation } from '@/contexts/TranslationContext';

interface DeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    root: string;
    files: string[]; // List of filenames to delete
    onSuccess: () => void;
}

export function DeleteDialog({ open, onOpenChange, uuid, root, files, onSuccess }: DeleteDialogProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        try {
            await filesApi.deleteFiles(uuid, root, files);
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('files.dialogs.delete.title')}</DialogTitle>
                    <DialogDescription className='text-destructive'>
                        {t('files.dialogs.delete.description', { count: String(files.length) })}
                    </DialogDescription>
                </DialogHeader>
                <div className='max-h-32 overflow-y-auto rounded bg-muted/50 p-2 text-sm text-muted-foreground'>
                    <ul className='list-inside list-disc'>
                        {files.map((f) => (
                            <li key={f}>{f}</li>
                        ))}
                    </ul>
                </div>
                <DialogFooter>
                    <Button variant='ghost' onClick={() => onOpenChange(false)} disabled={loading}>
                        {t('files.dialogs.delete.cancel')}
                    </Button>
                    <Button variant='destructive' onClick={handleDelete} disabled={loading}>
                        {loading ? t('files.dialogs.delete.deleting') : t('files.dialogs.delete.delete')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
