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

import { useTranslation } from '@/contexts/TranslationContext';
import { Input } from '@/components/featherui/Input';
import { Button } from '@/components/featherui/Button';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { type CustomHeaderEntry } from './types';

interface CustomHeadersEditorProps {
    entries: CustomHeaderEntry[];
    onChange: (entries: CustomHeaderEntry[]) => void;
    error?: string;
}

export function CustomHeadersEditor({ entries, onChange, error }: CustomHeadersEditorProps) {
    const { t } = useTranslation();

    const updateEntry = (index: number, patch: Partial<CustomHeaderEntry>) => {
        onChange(entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
    };

    const addEntry = () => {
        onChange([...entries, { key: '', value: '', secret: false }]);
    };

    const removeEntry = (index: number) => {
        onChange(entries.filter((_, i) => i !== index));
    };

    return (
        <div className='space-y-3'>
            <div className='flex items-center justify-between gap-3'>
                <Label className='text-sm font-semibold'>{t('admin.webNodes.form.remote_custom_headers')}</Label>
                <Button type='button' size='sm' variant='outline' onClick={addEntry}>
                    <Plus className='mr-2 h-4 w-4' />
                    {t('admin.webNodes.form.remote_custom_headers_add')}
                </Button>
            </div>

            {entries.length === 0 ? (
                <div className='border-border/60 bg-card/20 rounded-2xl border border-dashed px-4 py-8 text-center'>
                    <p className='text-muted-foreground text-xs italic'>
                        {t('admin.webNodes.form.remote_custom_headers_empty')}
                    </p>
                </div>
            ) : (
                <div className='space-y-3'>
                    {entries.map((entry, index) => (
                        <div
                            key={index}
                            className='border-border/40 bg-background/40 grid grid-cols-1 gap-3 rounded-2xl border p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_auto] md:items-center'
                        >
                            <Input
                                placeholder={t('admin.webNodes.form.remote_custom_headers_key_placeholder')}
                                value={entry.key}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    updateEntry(index, { key: e.target.value })
                                }
                                error={!!error}
                            />
                            <Input
                                type={entry.secret ? 'password' : 'text'}
                                autoComplete={entry.secret ? 'new-password' : 'off'}
                                placeholder={
                                    entry.secret && entry.keepValue
                                        ? t('admin.webNodes.form.remote_custom_headers_secret_keep')
                                        : t('admin.webNodes.form.remote_custom_headers_value_placeholder')
                                }
                                value={entry.value}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    updateEntry(index, { value: e.target.value, keepValue: false })
                                }
                                error={!!error}
                            />
                            <Select
                                value={entry.secret ? 'secret' : 'normal'}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                    const secret = e.target.value === 'secret';
                                    updateEntry(index, {
                                        secret,
                                        value: secret ? entry.value : entry.value,
                                        keepValue: secret ? entry.keepValue : false,
                                    });
                                }}
                            >
                                <option value='normal'>
                                    {t('admin.webNodes.form.remote_custom_headers_type_normal')}
                                </option>
                                <option value='secret'>
                                    {t('admin.webNodes.form.remote_custom_headers_type_secret')}
                                </option>
                            </Select>
                            <Button
                                type='button'
                                size='icon'
                                variant='ghost'
                                className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                onClick={() => removeEntry(index)}
                            >
                                <Trash2 className='h-4 w-4' />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {error && <p className='text-[10px] font-bold text-red-500 uppercase'>{error}</p>}
            <p className='text-muted-foreground/70 text-xs italic'>
                {t('admin.webNodes.form.remote_custom_headers_help')}
            </p>
        </div>
    );
}
