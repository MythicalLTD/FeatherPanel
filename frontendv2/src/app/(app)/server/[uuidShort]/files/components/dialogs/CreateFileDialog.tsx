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
import { filesApi } from '@/lib/files-api';
import { useTranslation } from '@/contexts/TranslationContext';
import { Textarea } from '@/components/featherui/Textarea';

interface CreateFileDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    root: string;
    onSuccess: () => void;
}

export function CreateFileDialog({ open, onOpenChange, uuid, root, onSuccess }: CreateFileDialogProps) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        setLoading(true);
        try {
            // Need to handle path join correctly
            const path = root === '/' ? name : `${root}/${name}`;
            await filesApi.saveFileContent(uuid, path, content);
            setName('');
            setContent('');
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
            <DialogContent className='sm:max-w-xl'>
                <DialogHeader>
                    <DialogTitle>{t('files.dialogs.create_file.title')}</DialogTitle>
                    <DialogDescription>{t('files.dialogs.create_file.description', { root: root })}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <div className='space-y-2'>
                        <label className='text-sm font-medium'>{t('files.dialogs.create_file.name_label')}</label>
                        <Input
                            placeholder={t('files.dialogs.create_file.name_placeholder')}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className='space-y-2'>
                        <label className='text-sm font-medium'>{t('files.dialogs.create_file.content_label')}</label>
                        {/* Fallback to textarea usually implies standard HTML textarea styled with Tailwind */}
                        <Textarea
                            className='flex min-h-[150px] w-full rounded-md border border-input px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
                            placeholder={t('files.dialogs.create_file.content_placeholder')}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type='button' variant='ghost' onClick={() => onOpenChange(false)}>
                            {t('files.dialogs.create_file.cancel')}
                        </Button>
                        <Button type='submit' disabled={!name || loading}>
                            {loading ? t('files.dialogs.create_file.creating') : t('files.dialogs.create_file.create')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
