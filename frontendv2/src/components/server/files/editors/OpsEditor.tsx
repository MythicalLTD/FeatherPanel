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
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';

interface OpEntry {
    uuid: string;
    name: string;
    level: number;
    bypassesPlayerLimit: boolean;
}

interface OpsEditorProps {
    content: string;
    readonly?: boolean;
    saving?: boolean;
    onSave: (content: string) => void;
    onSwitchToRaw: () => void;
}

function parseContent(content: string): OpEntry[] {
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
            return parsed.map((item) => ({
                uuid: item?.uuid ? String(item.uuid) : '',
                name: item?.name ? String(item.name) : '',
                level: typeof item?.level === 'number' ? item.level : 0,
                bypassesPlayerLimit: typeof item?.bypassesPlayerLimit === 'boolean' ? item.bypassesPlayerLimit : false,
            }));
        }
    } catch (error) {
        console.warn('Failed to parse ops.json:', error);
    }
    return [];
}

export function OpsEditor({ content, readonly = false, saving = false, onSave, onSwitchToRaw }: OpsEditorProps) {
    const { t } = useTranslation();
    const [entries, setEntries] = useState<OpEntry[]>(() => parseContent(content));

    useEffect(() => {
        setEntries(parseContent(content));
    }, [content]);


    const handleAdd = () => {
        setEntries((prev) => [
            ...prev,
            {
                uuid: '',
                name: '',
                level: 4,
                bypassesPlayerLimit: true,
            },
        ]);
    };

    const handleRemove = (index: number) => {
        setEntries((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        const sanitized = entries.map((entry) => ({
            uuid: entry.uuid.trim(),
            name: entry.name.trim(),
            level: Number.isFinite(entry.level) ? Math.max(0, Math.min(4, Math.round(entry.level))) : 0,
            bypassesPlayerLimit: entry.bypassesPlayerLimit,
        }));
        onSave(`${JSON.stringify(sanitized, null, 4)}\n`);
    };

    const updateEntry = (index: number, field: keyof OpEntry, value: unknown) => {
        setEntries((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    return (
        <Card className='bg-card/50 backdrop-blur-3xl border border-border/50 rounded-3xl shadow-sm'>
            <CardHeader className='border-b border-border/10 pb-6'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='space-y-2'>
                        <CardTitle className='text-2xl font-bold'>{t('files.editors.opsConfig.title')}</CardTitle>
                        <CardDescription className='text-sm text-muted-foreground'>
                            {t('files.editors.opsConfig.description')}
                        </CardDescription>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Button variant='ghost' size='sm' onClick={onSwitchToRaw}>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('files.editors.opsConfig.actions.switchToRaw')}
                        </Button>
                        <Button size='sm' disabled={readonly || saving} onClick={handleSave}>
                            <Save className='mr-2 h-4 w-4' />
                            {saving
                                ? t('files.editors.opsConfig.actions.saving')
                                : t('files.editors.opsConfig.actions.save')}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <div className='p-8 space-y-8'>
                <section className='space-y-6'>
                    <div className='rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground'>
                        {t('files.editors.opsConfig.notice') ||
                            'Operators have elevated permissions on the server. Be careful when adding operators.'}
                    </div>
                    <div className='flex justify-end'>
                        <Button size='sm' variant='outline' className='gap-2' disabled={readonly} onClick={handleAdd}>
                            <Plus className='h-4 w-4' />
                            {t('files.editors.opsConfig.actions.add')}
                        </Button>
                    </div>
                    {entries.length === 0 && (
                        <div className='rounded-xl border border-dashed border-border/30 p-8 text-sm text-muted-foreground bg-muted/10 text-center'>
                            {t('files.editors.opsConfig.emptyState')}
                        </div>
                    )}
                    {entries.map((entry, index) => (
                        <div key={`op-${index}`} className='space-y-6 rounded-xl bg-card/30 border border-border/30 p-6'>
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-3 flex-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.opsConfig.fields.uuid')}
                                    </label>
                                    <Input
                                        type='text'
                                        value={entry.uuid}
                                        onChange={(e) => updateEntry(index, 'uuid', e.target.value)}
                                        readOnly={readonly}
                                        placeholder='00000000-0000-0000-0000-000000000000'
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
                            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                                <div className='space-y-3'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.opsConfig.fields.name')}
                                    </label>
                                    <Input
                                        type='text'
                                        value={entry.name}
                                        onChange={(e) => updateEntry(index, 'name', e.target.value)}
                                        readOnly={readonly}
                                        placeholder='PlayerName'
                                    />
                                </div>
                                <div className='space-y-3'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.opsConfig.fields.level')}
                                    </label>
                                    <Input
                                        type='number'
                                        value={entry.level}
                                        onChange={(e) =>
                                            updateEntry(index, 'level', Number.parseInt(e.target.value, 10) || 0)
                                        }
                                        min={0}
                                        max={4}
                                        readOnly={readonly}
                                    />
                                </div>
                            </div>
                            <div className='space-y-3'>
                                <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                    {t('files.editors.opsConfig.fields.bypassesPlayerLimit')}
                                </label>
                                <div className='flex items-center gap-3'>
                                    <Checkbox
                                        checked={entry.bypassesPlayerLimit}
                                        onCheckedChange={(checked) =>
                                            updateEntry(index, 'bypassesPlayerLimit', checked)
                                        }
                                        disabled={readonly}
                                    />
                                    <span className='text-sm text-muted-foreground'>
                                        {entry.bypassesPlayerLimit
                                            ? t('files.editors.opsConfig.fields.enabled')
                                            : t('files.editors.opsConfig.fields.disabled')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </section>
            </div>
        </Card>
    );
}
