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

import { useState, useEffect } from 'react';
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
import { Settings, Info, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';

interface IgnoredContentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    uuid: string;
    onSuccess: () => void;
}

export function IgnoredContentDialog({ open, onOpenChange, uuid, onSuccess }: IgnoredContentDialogProps) {
    const { t } = useTranslation();
    const [patterns, setPatterns] = useState<string[]>([]);
    const [newPattern, setNewPattern] = useState('');

    useEffect(() => {
        if (open) {
            const saved = localStorage.getItem(`feather_ignored_${uuid}`);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);

                    setTimeout(() => setPatterns(parsed), 0);
                } catch (e) {
                    console.error('Failed to parse ignored patterns', e);
                }
            } else {
                setTimeout(() => setPatterns([]), 0);
            }
        }
    }, [open, uuid]);

    const handleSave = () => {
        localStorage.setItem(`feather_ignored_${uuid}`, JSON.stringify(patterns));
        toast.success(t('files.dialogs.ignored.success'));
        onSuccess();
        onOpenChange(false);
    };

    const addPattern = () => {
        if (!newPattern.trim()) return;
        if (patterns.includes(newPattern.trim())) {
            toast.error(t('files.dialogs.ignored.exists'));
            return;
        }
        setPatterns([...patterns, newPattern.trim()]);
        setNewPattern('');
    };

    const removePattern = (pattern: string) => {
        setPatterns(patterns.filter((p) => p !== pattern));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <div className='flex items-center gap-3'>
                        <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20'>
                            <Settings className='h-5 w-5' />
                        </div>
                        <div>
                            <DialogTitle>{t('files.dialogs.ignored.title')}</DialogTitle>
                            <DialogDescription>{t('files.dialogs.ignored.description')}</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className='flex flex-col gap-4 py-4'>
                    <div className='flex items-start gap-3 bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 mb-2'>
                        <Info className='h-5 w-5 text-blue-400 shrink-0 mt-0.5' />
                        <p className='text-xs text-blue-100/70 leading-relaxed'>{t('files.dialogs.ignored.info')}</p>
                    </div>

                    <div className='flex gap-2'>
                        <Input
                            placeholder={t('files.dialogs.ignored.pattern_placeholder')}
                            value={newPattern}
                            onChange={(e) => setNewPattern(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addPattern()}
                            className='bg-white/5 border-white/10'
                        />
                        <Button variant='secondary' size='icon' onClick={addPattern} className='shrink-0'>
                            <Plus className='h-4 w-4' />
                        </Button>
                    </div>

                    <div className='flex flex-wrap gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar'>
                        {patterns.length === 0 ? (
                            <p className='text-xs text-center w-full py-8 text-muted-foreground italic bg-white/5 rounded-xl border border-dashed border-white/10'>
                                {t('files.dialogs.ignored.empty')}
                            </p>
                        ) : (
                            patterns.map((pattern) => (
                                <div
                                    key={pattern}
                                    className='flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 group'
                                >
                                    <span className='text-xs font-medium text-white/80'>{pattern}</span>
                                    <button
                                        onClick={() => removePattern(pattern)}
                                        className='text-white/40 hover:text-red-400 transition-colors'
                                    >
                                        <X className='h-3 w-3' />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant='ghost' onClick={() => onOpenChange(false)}>
                        {t('files.dialogs.ignored.cancel')}
                    </Button>
                    <Button variant='default' onClick={handleSave} className=' h-10 px-6'>
                        {t('files.dialogs.ignored.save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
