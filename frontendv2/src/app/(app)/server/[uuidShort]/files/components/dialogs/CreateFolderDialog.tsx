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
import { Input } from '@/components/featherui/Input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { filesApi } from '@/lib/files-api';
import { useTranslation } from '@/contexts/TranslationContext';

interface CreateFolderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    root: string;
    onSuccess: () => void;
}

export function CreateFolderDialog({ open, onOpenChange, uuid, root, onSuccess }: CreateFolderDialogProps) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setLoading(true);
        try {
            await filesApi.createFolder(uuid, root, name);
            toast.success(t('files.dialogs.create_folder.success'));
            setName('');
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            toast.error(t('files.dialogs.create_folder.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('files.dialogs.create_folder.title')}</DialogTitle>
                    <DialogDescription>
                        {t('files.dialogs.create_folder.description', { root: root })}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <Input
                        placeholder={t('files.dialogs.create_folder.name_placeholder')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                    />
                    <DialogFooter>
                        <Button type='button' variant='ghost' onClick={() => onOpenChange(false)}>
                            {t('files.dialogs.create_folder.cancel')}
                        </Button>
                        <Button type='submit' disabled={!name || loading}>
                            {loading
                                ? t('files.dialogs.create_folder.creating')
                                : t('files.dialogs.create_folder.create')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
