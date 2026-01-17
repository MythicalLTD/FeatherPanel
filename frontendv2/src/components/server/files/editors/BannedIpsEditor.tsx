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
import { Textarea } from '@/components/featherui/Textarea';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';

interface BannedIpEntry {
    ip: string;
    created: string;
    source: string;
    expires: string;
    reason: string;
}

interface BannedIpsEditorProps {
    content: string;
    readonly?: boolean;
    saving?: boolean;
    onSave: (content: string) => void;
    onSwitchToRaw: () => void;
}

function parseContent(content: string): BannedIpEntry[] {
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
            return parsed.map((item) => ({
                ip: item?.ip ? String(item.ip) : '',
                created: item?.created ? String(item.created) : '',
                source: item?.source ? String(item.source) : '',
                expires: item?.expires ? String(item.expires) : '',
                reason: item?.reason ? String(item.reason) : '',
            }));
        }
    } catch (error) {
        console.warn('Failed to parse banned-ips.json:', error);
    }
    return [];
}

export function BannedIpsEditor({
    content,
    readonly = false,
    saving = false,
    onSave,
    onSwitchToRaw,
}: BannedIpsEditorProps) {
    const { t } = useTranslation();
    const [entries, setEntries] = useState<BannedIpEntry[]>(() => parseContent(content));

    useEffect(() => {
        setEntries(parseContent(content));
    }, [content]);

    const handleAdd = () => {
        setEntries((prev) => [
            ...prev,
            {
                ip: '',
                created: '',
                source: '(Unknown)',
                expires: 'forever',
                reason: 'Banned by an operator.',
            },
        ]);
    };

    const handleRemove = (index: number) => {
        setEntries((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        const sanitized = entries.map((entry) => ({
            ip: entry.ip.trim(),
            created: entry.created.trim(),
            source: entry.source.trim() || '(Unknown)',
            expires: entry.expires.trim() || 'forever',
            reason: entry.reason.trim() || 'Banned by an operator.',
        }));
        onSave(`${JSON.stringify(sanitized, null, 4)}\n`);
    };

    const updateEntry = (index: number, field: keyof BannedIpEntry, value: string) => {
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
                        <CardTitle className='text-2xl font-bold'>{t('files.editors.bannedIpsConfig.title')}</CardTitle>
                        <CardDescription className='text-sm text-muted-foreground'>
                            {t('files.editors.bannedIpsConfig.description')}
                        </CardDescription>
                    </div>
                    <div className='flex items-center gap-2'>
                        <Button variant='ghost' size='sm' onClick={onSwitchToRaw}>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('files.editors.bannedIpsConfig.actions.switchToRaw')}
                        </Button>
                        <Button size='sm' disabled={readonly || saving} onClick={handleSave}>
                            <Save className='mr-2 h-4 w-4' />
                            {saving
                                ? t('files.editors.bannedIpsConfig.actions.saving')
                                : t('files.editors.bannedIpsConfig.actions.save')}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <div className='p-8 space-y-8'>
                <section className='space-y-6'>
                    <div className='rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-muted-foreground'>
                        {t('files.editors.bannedIpsConfig.notice') ||
                            'Banned IPs cannot connect to the server. Be careful when managing IP bans.'}
                    </div>
                    <div className='flex justify-end'>
                        <Button size='sm' variant='outline' className='gap-2' disabled={readonly} onClick={handleAdd}>
                            <Plus className='h-4 w-4' />
                            {t('files.editors.bannedIpsConfig.actions.add')}
                        </Button>
                    </div>
                    {entries.length === 0 && (
                        <div className='rounded-xl border border-dashed border-border/30 p-8 text-sm text-muted-foreground bg-muted/10 text-center'>
                            {t('files.editors.bannedIpsConfig.emptyState')}
                        </div>
                    )}
                    {entries.map((entry, index) => (
                        <div
                            key={`banned-ip-${index}`}
                            className='space-y-6 rounded-xl bg-card/30 border border-border/30 p-6'
                        >
                            <div className='flex items-start justify-between gap-4'>
                                <div className='space-y-3 flex-1'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.bannedIpsConfig.fields.ip')}
                                    </label>
                                    <Input
                                        type='text'
                                        value={entry.ip}
                                        onChange={(e) => updateEntry(index, 'ip', e.target.value)}
                                        readOnly={readonly}
                                        placeholder='192.168.0.1'
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
                                        {t('files.editors.bannedIpsConfig.fields.created')}
                                    </label>
                                    <Input
                                        type='text'
                                        value={entry.created}
                                        onChange={(e) => updateEntry(index, 'created', e.target.value)}
                                        readOnly={readonly}
                                        placeholder='2025-01-01 12:00:00 +0000'
                                    />
                                </div>
                                <div className='space-y-3'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.bannedIpsConfig.fields.source')}
                                    </label>
                                    <Input
                                        type='text'
                                        value={entry.source}
                                        onChange={(e) => updateEntry(index, 'source', e.target.value)}
                                        readOnly={readonly}
                                        placeholder='(Unknown)'
                                    />
                                </div>
                            </div>
                            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                                <div className='space-y-3'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.bannedIpsConfig.fields.expires')}
                                    </label>
                                    <Input
                                        type='text'
                                        value={entry.expires}
                                        onChange={(e) => updateEntry(index, 'expires', e.target.value)}
                                        readOnly={readonly}
                                        placeholder='forever'
                                    />
                                </div>
                                <div className='space-y-3'>
                                    <label className='text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1'>
                                        {t('files.editors.bannedIpsConfig.fields.reason')}
                                    </label>
                                    <Textarea
                                        value={entry.reason}
                                        onChange={(e) => updateEntry(index, 'reason', e.target.value)}
                                        readOnly={readonly}
                                        rows={2}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </section>
            </div>
        </Card>
    );
}
