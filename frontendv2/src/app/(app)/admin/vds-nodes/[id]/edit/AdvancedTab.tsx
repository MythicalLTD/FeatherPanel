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
import { Button } from '@/components/featherui/Button';
import { Settings, Plus, Trash2 } from 'lucide-react';
import type { KVPair } from './page';
import { TabHintCard, TabSection } from './TabPrimitives';

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

interface KeyValueListProps {
    title: string;
    description: string;
    emptyLabel: string;
    addLabel: string;
    keyPlaceholder: string;
    valuePlaceholder: string;
    pairs: KVPair[];
    onChange: (index: number, field: 'key' | 'value', value: string) => void;
    onAdd: () => void;
    onRemove: (index: number) => void;
}

function KeyValueList({
    title,
    description,
    emptyLabel,
    addLabel,
    keyPlaceholder,
    valuePlaceholder,
    pairs,
    onChange,
    onAdd,
    onRemove,
}: KeyValueListProps) {
    return (
        <PageCard title={title} icon={Settings} description={description}>
            <TabSection
                action={
                    <Button type='button' size='sm' variant='outline' onClick={onAdd}>
                        <Plus className='h-4 w-4 mr-2' />
                        {addLabel}
                    </Button>
                }
            >
                {pairs.length === 0 ? (
                    <div className='rounded-2xl border border-dashed border-border/60 bg-card/20 px-4 py-8 text-center'>
                        <p className='text-xs text-muted-foreground italic'>{emptyLabel}</p>
                    </div>
                ) : (
                    <div className='space-y-3'>
                        {pairs.map((pair, index) => (
                            <div
                                key={index}
                                className='grid grid-cols-1 gap-3 rounded-2xl border border-border/40 bg-background/40 p-3 md:grid-cols-[1fr_1fr_auto] md:items-center'
                            >
                                <Input
                                    className='flex-1'
                                    placeholder={keyPlaceholder}
                                    value={pair.key}
                                    onChange={(e) => onChange(index, 'key', e.target.value)}
                                />
                                <Input
                                    type='password'
                                    autoComplete='new-password'
                                    className='flex-1'
                                    placeholder={valuePlaceholder}
                                    value={pair.value}
                                    onChange={(e) => onChange(index, 'value', e.target.value)}
                                />
                                <Button
                                    type='button'
                                    size='icon'
                                    variant='ghost'
                                    className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                    onClick={() => onRemove(index)}
                                >
                                    <Trash2 className='h-4 w-4' />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </TabSection>
        </PageCard>
    );
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
            <KeyValueList
                title={t('admin.vdsNodes.advanced.headers_title')}
                description={t('admin.vdsNodes.advanced.headers_description')}
                emptyLabel={t('admin.vdsNodes.advanced.no_headers')}
                addLabel={t('admin.vdsNodes.advanced.add_header')}
                keyPlaceholder={t('admin.vdsNodes.advanced.key_placeholder')}
                valuePlaceholder={t('admin.vdsNodes.advanced.value_placeholder')}
                pairs={headers}
                onChange={onHeaderChange}
                onAdd={onAddHeader}
                onRemove={onRemoveHeader}
            />

            <PageCard
                title={t('admin.vdsNodes.advanced.params_title')}
                icon={Settings}
                description={t('admin.vdsNodes.advanced.params_description')}
            >
                <TabSection
                    action={
                        <Button type='button' size='sm' variant='outline' onClick={onAddParam}>
                            <Plus className='h-4 w-4 mr-2' />
                            {t('admin.vdsNodes.advanced.add_param')}
                        </Button>
                    }
                >
                    {params.length === 0 ? (
                        <div className='rounded-2xl border border-dashed border-border/60 bg-card/20 px-4 py-8 text-center'>
                            <p className='text-xs text-muted-foreground italic'>
                                {t('admin.vdsNodes.advanced.no_params')}
                            </p>
                        </div>
                    ) : (
                        <div className='space-y-3'>
                            {params.map((pair, index) => (
                                <div
                                    key={index}
                                    className='grid grid-cols-1 gap-3 rounded-2xl border border-border/40 bg-background/40 p-3 md:grid-cols-[1fr_1fr_auto] md:items-center'
                                >
                                    <Input
                                        className='flex-1'
                                        placeholder={t('admin.vdsNodes.advanced.key_placeholder')}
                                        value={pair.key}
                                        onChange={(e) => onParamChange(index, 'key', e.target.value)}
                                    />
                                    <Input
                                        type='password'
                                        autoComplete='new-password'
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
                        </div>
                    )}
                </TabSection>

                <TabHintCard
                    icon={Settings}
                    title={t('admin.vdsNodes.advanced.warning_title')}
                    description={t('admin.vdsNodes.advanced.warning_text')}
                    className='border-amber-500/20 bg-amber-500/5'
                />
            </PageCard>
        </div>
    );
}
