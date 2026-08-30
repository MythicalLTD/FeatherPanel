/*
This file is part of FeatherPanel.
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

'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';

export interface DomainRoute {
    domain: string;
    type: 'primary' | 'alias' | 'redirect';
    redirect_target?: string | null;
    document_root?: string;
}

interface WebSpaceDomainsManagerProps {
    value: DomainRoute[];
    onChange: (routes: DomainRoute[]) => void;
    disabled?: boolean;
}

const emptyRoute = (): DomainRoute => ({ domain: '', type: 'alias', redirect_target: '', document_root: '' });

export function WebSpaceDomainsManager({ value, onChange, disabled }: WebSpaceDomainsManagerProps) {
    const { t } = useTranslation();
    const [routes, setRoutes] = useState<DomainRoute[]>(value.length > 0 ? value : [emptyRoute()]);

    const sync = (next: DomainRoute[]) => {
        setRoutes(next);
        onChange(next.filter((r) => r.domain.trim() !== ''));
    };

    const updateRow = (index: number, patch: Partial<DomainRoute>) => {
        const next = routes.map((row, i) => (i === index ? { ...row, ...patch } : row));
        sync(next);
    };

    const addRow = () => sync([...routes, emptyRoute()]);

    const removeRow = (index: number) => {
        const next = routes.filter((_, i) => i !== index);
        sync(next.length > 0 ? next : [emptyRoute()]);
    };

    return (
        <div className='space-y-3'>
            <div className='text-muted-foreground hidden grid-cols-12 gap-2 text-xs font-medium md:grid'>
                <div className='col-span-3'>{t('webSpaces.domains.domain')}</div>
                <div className='col-span-2'>{t('webSpaces.domains.type')}</div>
                <div className='col-span-3'>{t('webSpaces.domains.redirectTarget')}</div>
                <div className='col-span-3'>{t('webSpaces.domains.documentRoot')}</div>
                <div className='col-span-1' />
            </div>
            {routes.map((row, index) => (
                <div
                    key={index}
                    className='border-border/50 grid grid-cols-1 gap-2 rounded-xl border p-3 md:grid-cols-12 md:items-end md:border-0 md:p-0'
                >
                    <div className='md:col-span-3'>
                        <Label className='mb-1 md:sr-only'>{t('webSpaces.domains.domain')}</Label>
                        <Input
                            value={row.domain}
                            disabled={disabled}
                            placeholder='example.com'
                            onChange={(e) => updateRow(index, { domain: e.target.value })}
                        />
                    </div>
                    <div className='md:col-span-2'>
                        <Label className='mb-1 md:sr-only'>{t('webSpaces.domains.type')}</Label>
                        <Select
                            value={row.type}
                            disabled={disabled}
                            onChange={(e) =>
                                updateRow(index, {
                                    type: e.target.value as DomainRoute['type'],
                                })
                            }
                        >
                            <option value='primary'>{t('webSpaces.domains.typePrimary')}</option>
                            <option value='alias'>{t('webSpaces.domains.typeAlias')}</option>
                            <option value='redirect'>{t('webSpaces.domains.typeRedirect')}</option>
                        </Select>
                    </div>
                    <div className='md:col-span-3'>
                        <Label className='mb-1 md:sr-only'>{t('webSpaces.domains.redirectTarget')}</Label>
                        <Input
                            value={row.redirect_target ?? ''}
                            disabled={disabled || row.type !== 'redirect'}
                            placeholder='https://example.com'
                            onChange={(e) => updateRow(index, { redirect_target: e.target.value })}
                        />
                    </div>
                    <div className='md:col-span-3'>
                        <Label className='mb-1 md:sr-only'>{t('webSpaces.domains.documentRoot')}</Label>
                        <Input
                            value={row.document_root ?? ''}
                            disabled={disabled || row.type === 'redirect'}
                            placeholder='public'
                            onChange={(e) => updateRow(index, { document_root: e.target.value })}
                        />
                    </div>
                    <div className='flex justify-end md:col-span-1'>
                        <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            disabled={disabled || routes.length <= 1}
                            onClick={() => removeRow(index)}
                        >
                            <Trash2 className='h-4 w-4' />
                        </Button>
                    </div>
                </div>
            ))}
            <Button type='button' variant='outline' size='sm' disabled={disabled} onClick={addRow}>
                <Plus className='mr-2 h-4 w-4' />
                {t('webSpaces.domains.add')}
            </Button>
        </div>
    );
}
