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
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/featherui/Input';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';

interface WhitelistEditorProps {
    content: string;
    readonly?: boolean;
    saving?: boolean;
    onSave: (content: string) => void;
    onSwitchToRaw: () => void;
}

function parseContent(content: string): string[] {
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
            return parsed.map((item) => (item ? String(item).trim() : '')).filter(Boolean);
        }
    } catch (error) {
        console.warn('Failed to parse whitelist.json:', error);
    }
    return [];
}

export function WhitelistEditor({
    content,
    readonly = false,
    saving = false,
    onSave,
    onSwitchToRaw,
}: WhitelistEditorProps) {
    const { t } = useTranslation();
    const [entries, setEntries] = useState<string[]>(() => parseContent(content));

    useEffect(() => {
        setEntries(parseContent(content));
    }, [content]);

    const handleAdd = () => {
        setEntries((prev) => [...prev, '']);
    };

    const handleRemove = (index: number) => {
        setEntries((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        const sanitized = entries.map((entry) => entry.trim()).filter(Boolean);
        onSave(`${JSON.stringify(sanitized, null, 4)}\n`);
    };

    const updateEntry = (index: number, value: string) => {
        setEntries((prev) => {
            const updated = [...prev];
            updated[index] = value;
            return updated;
        });
    };

    return (
        <Card className='bg-card/50 border-border/50 flex flex-col overflow-hidden rounded-3xl border shadow-sm backdrop-blur-3xl'>
            <CardHeader className='border-border/10 shrink-0 border-b pb-6'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='space-y-2'>
                        <CardTitle className='text-2xl font-bold'>{t('files.editors.whitelistConfig.title')}</CardTitle>
                        <CardDescription className='text-muted-foreground text-sm'>
                            {t('files.editors.whitelistConfig.description')}
                        </CardDescription>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Button variant='ghost' size='sm' onClick={onSwitchToRaw}>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('files.editors.whitelistConfig.actions.switchToRaw')}
                        </Button>
                        <Button size='sm' disabled={readonly || saving} onClick={handleSave}>
                            <Save className='mr-2 h-4 w-4' />
                            {saving
                                ? t('files.editors.whitelistConfig.actions.saving')
                                : t('files.editors.whitelistConfig.actions.save')}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <div className='flex-1 space-y-6 overflow-y-auto p-6'>
                <section className='space-y-3'>
                    <div className='border-primary/20 bg-primary/5 text-muted-foreground rounded-lg border p-4 text-sm'>
                        {t('files.editors.whitelistConfig.notice')}
                    </div>
                    <div className='flex justify-end'>
                        <Button size='sm' variant='outline' className='gap-2' disabled={readonly} onClick={handleAdd}>
                            <Plus className='h-4 w-4' />
                            {t('files.editors.whitelistConfig.actions.add')}
                        </Button>
                    </div>
                    {entries.length === 0 && (
                        <div className='border-border/30 text-muted-foreground bg-muted/10 rounded-xl border border-dashed p-8 text-center text-sm'>
                            {t('files.editors.whitelistConfig.emptyState')}
                        </div>
                    )}
                    {entries.map((entry, index) => (
                        <div
                            key={`whitelist-${index}`}
                            className='bg-muted/10 border-border/20 hover:border-border/40 space-y-4 rounded-xl border p-5 transition-all'
                        >
                            <div className='flex items-start justify-between gap-4'>
                                <div className='flex-1 space-y-2'>
                                    <Input
                                        type='text'
                                        value={entry}
                                        onChange={(e) => updateEntry(index, e.target.value)}
                                        readOnly={readonly}
                                        placeholder={
                                            t('files.editors.whitelistConfig.fields.playerName') || 'PlayerName'
                                        }
                                    />
                                </div>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='text-muted-foreground hover:text-destructive'
                                    disabled={readonly}
                                    onClick={() => handleRemove(index)}
                                >
                                    <Trash2 className='h-4 w-4' />
                                </Button>
                            </div>
                        </div>
                    ))}
                </section>
            </div>
        </Card>
    );
}
