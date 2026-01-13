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
                        <textarea
                            className='flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'
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
