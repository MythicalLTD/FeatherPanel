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
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { filesApi } from '@/lib/files-api';
import { useTranslation } from '@/contexts/TranslationContext';

interface RenameDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    root: string;
    fileName: string;
    onSuccess: () => void;
}

export function RenameDialog({ open, onOpenChange, uuid, root, fileName, onSuccess }: RenameDialogProps) {
    const { t } = useTranslation();
    const [newName, setNewName] = useState(fileName);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setNewName(fileName);
        }
    }, [open, fileName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName || newName === fileName) return;

        setLoading(true);
        try {
            await filesApi.renameFile(uuid, root, [{ from: fileName, to: newName }]);
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
                    <DialogTitle>{t('files.dialogs.rename.title')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
                    <DialogFooter>
                        <Button type='button' variant='ghost' onClick={() => onOpenChange(false)}>
                            {t('files.dialogs.rename.cancel')}
                        </Button>
                        <Button type='submit' disabled={!newName || newName === fileName || loading}>
                            {loading ? t('files.dialogs.rename.renaming') : t('files.dialogs.rename.rename')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
