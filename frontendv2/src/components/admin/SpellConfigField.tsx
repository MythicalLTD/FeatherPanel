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

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/featherui/Textarea';
import { Input } from '@/components/featherui/Input';
import { useTranslation } from '@/contexts/TranslationContext';

export function SpellConfigField({
    field,
    value,
    onChange,
    inheritable,
}: {
    field: 'config_files' | 'config_startup' | 'config_logs' | 'config_stop';
    value: string;
    onChange: (value: string) => void;
    inheritable: boolean;
}) {
    const { t } = useTranslation();
    const inherited = inheritable && value === '';
    const label = t(`admin.spells.form.${field}`);
    return (
        <div className='space-y-2'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
                <Label htmlFor={field}>{label}</Label>
                {inheritable && (
                    <label className='flex items-center gap-2 text-sm'>
                        <Checkbox
                            aria-label={`${t('admin.spells.form.inherit')} ${label}`}
                            checked={inherited}
                            onCheckedChange={(checked) =>
                                onChange(checked === true ? '' : field === 'config_stop' ? 'stop' : '{}')
                            }
                        />
                        {t('admin.spells.form.inherit')}
                    </label>
                )}
            </div>
            {field === 'config_stop' ? (
                <Input
                    id={field}
                    value={value}
                    disabled={inherited}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder='stop'
                />
            ) : (
                <Textarea
                    id={field}
                    value={value}
                    disabled={inherited}
                    onChange={(event) => onChange(event.target.value)}
                    placeholder={field === 'config_startup' ? '{"done": "text"}' : '{}'}
                    rows={field === 'config_files' ? 4 : 3}
                />
            )}
        </div>
    );
}
