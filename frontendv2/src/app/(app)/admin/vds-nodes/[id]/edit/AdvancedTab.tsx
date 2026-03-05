/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studio
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/featherui/Button';
import { Settings, Plus, Trash2 } from 'lucide-react';
import type { KVPair } from './page';

interface AdvancedTabProps {
    headers: KVPair[];
    params: KVPair[];
    onHeaderChange: (index: number, field: 'key' | 'value', value: string) => void;
    onAddHeader: () => void;
    onRemoveHeader: (index: number) => void;
    onParamChange: (index: number, field: 'key' | 'value', value: string) => void;
    onAddParam: () => void;
    onRemoveParam: (index: number) => void;
}

export function AdvancedTab({
    headers,
    params,
    onHeaderChange,
    onAddHeader,
    onRemoveHeader,
    onParamChange,
    onAddParam,
    onRemoveParam,
}: AdvancedTabProps) {
    const { t } = useTranslation();

    return (
        <div className='space-y-8'>
            <PageCard
                title={t('admin.vdsNodes.advanced.headers_title')}
                icon={Settings}
                description={t('admin.vdsNodes.advanced.headers_description')}
            >
                <div className='space-y-3'>
                    {headers.length === 0 && (
                        <p className='text-xs text-muted-foreground italic py-1'>
                            {t('admin.vdsNodes.advanced.no_headers')}
                        </p>
                    )}
                    {headers.map((pair, index) => (
                        <div key={index} className='flex items-center gap-2'>
                            <Input
                                className='flex-1'
                                placeholder={t('admin.vdsNodes.advanced.key_placeholder')}
                                value={pair.key}
                                onChange={(e) => onHeaderChange(index, 'key', e.target.value)}
                            />
                            <Input
                                className='flex-1'
                                placeholder={t('admin.vdsNodes.advanced.value_placeholder')}
                                value={pair.value}
                                onChange={(e) => onHeaderChange(index, 'value', e.target.value)}
                            />
                            <Button
                                type='button'
                                size='icon'
                                variant='ghost'
                                className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                onClick={() => onRemoveHeader(index)}
                            >
                                <Trash2 className='h-4 w-4' />
                            </Button>
                        </div>
                    ))}
                    <Button type='button' size='sm' variant='outline' onClick={onAddHeader} className='mt-1'>
                        <Plus className='h-4 w-4 mr-2' />
                        {t('admin.vdsNodes.advanced.add_header')}
                    </Button>
                </div>
            </PageCard>

            <PageCard
                title={t('admin.vdsNodes.advanced.params_title')}
                icon={Settings}
                description={t('admin.vdsNodes.advanced.params_description')}
            >
                <div className='space-y-3'>
                    {params.length === 0 && (
                        <p className='text-xs text-muted-foreground italic py-1'>
                            {t('admin.vdsNodes.advanced.no_params')}
                        </p>
                    )}
                    {params.map((pair, index) => (
                        <div key={index} className='flex items-center gap-2'>
                            <Input
                                className='flex-1'
                                placeholder={t('admin.vdsNodes.advanced.key_placeholder')}
                                value={pair.key}
                                onChange={(e) => onParamChange(index, 'key', e.target.value)}
                            />
                            <Input
                                className='flex-1'
                                placeholder={t('admin.vdsNodes.advanced.value_placeholder')}
                                value={pair.value}
                                onChange={(e) => onParamChange(index, 'value', e.target.value)}
                            />
                            <Button
                                type='button'
                                size='icon'
                                variant='ghost'
                                className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                onClick={() => onRemoveParam(index)}
                            >
                                <Trash2 className='h-4 w-4' />
                            </Button>
                        </div>
                    ))}
                    <Button type='button' size='sm' variant='outline' onClick={onAddParam} className='mt-1'>
                        <Plus className='h-4 w-4 mr-2' />
                        {t('admin.vdsNodes.advanced.add_param')}
                    </Button>
                </div>

                <div className='mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl'>
                    <Label className='text-xs font-bold uppercase tracking-wider text-amber-600'>
                        {t('admin.vdsNodes.advanced.warning_title')}
                    </Label>
                    <p className='text-xs text-muted-foreground mt-1 leading-relaxed'>
                        {t('admin.vdsNodes.advanced.warning_text')}
                    </p>
                </div>
            </PageCard>
        </div>
    );
}
