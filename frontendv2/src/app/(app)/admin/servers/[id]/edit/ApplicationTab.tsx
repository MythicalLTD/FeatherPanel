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
import { PageCard } from '@/components/featherui/PageCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/featherui/Button';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { Box, Wand2, Search } from 'lucide-react';
import { TabProps, SelectedEntities, Spell, SpellVariable } from './types';

interface ApplicationTabProps extends TabProps {
    selectedEntities: SelectedEntities;
    spellDetails: Spell | null;
    spellVariables: SpellVariable[];
    dockerImages: string[];
    setRealmModalOpen: (open: boolean) => void;
    setSpellModalOpen: (open: boolean) => void;
    fetchRealms: () => void;
    fetchSpells: () => void;
}

export function ApplicationTab({
    form,
    setForm,
    errors,
    selectedEntities,
    spellVariables,
    dockerImages,
    setRealmModalOpen,
    setSpellModalOpen,
    fetchRealms,
    fetchSpells,
}: ApplicationTabProps) {
    const { t } = useTranslation();

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.servers.edit.application.title')}
                description={t('admin.servers.edit.application.description')}
            >
                <div className='space-y-6'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                        <div className='space-y-3'>
                            <Label className='flex items-center gap-1.5'>
                                {t('admin.servers.form.realm')}
                                <span className='text-red-500 font-bold'>*</span>
                            </Label>
                            <div className='flex gap-2'>
                                <div className='flex-1 h-11 px-3 bg-muted/30 rounded-xl border border-border/50 text-sm flex items-center'>
                                    {selectedEntities.realm ? (
                                        <div className='flex items-center gap-2'>
                                            <Box className='h-4 w-4 text-primary' />
                                            <span className='font-medium text-foreground'>
                                                {selectedEntities.realm.name}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className='text-muted-foreground'>
                                            {t('admin.servers.form.select_realm')}
                                        </span>
                                    )}
                                </div>
                                <Button
                                    type='button'
                                    size='icon'
                                    onClick={() => {
                                        fetchRealms();
                                        setRealmModalOpen(true);
                                    }}
                                >
                                    <Search className='h-4 w-4' />
                                </Button>
                            </div>
                            {errors.realms_id && <p className='text-xs text-red-500'>{errors.realms_id}</p>}
                        </div>

                        <div className='space-y-3'>
                            <Label className='flex items-center gap-1.5'>
                                {t('admin.servers.form.spell')}
                                <span className='text-red-500 font-bold'>*</span>
                            </Label>
                            <div className='flex gap-2'>
                                <div className='flex-1 h-11 px-3 bg-muted/30 rounded-xl border border-border/50 text-sm flex items-center'>
                                    {selectedEntities.spell ? (
                                        <div className='flex items-center gap-2'>
                                            <Wand2 className='h-4 w-4 text-primary' />
                                            <span className='font-medium text-foreground'>
                                                {selectedEntities.spell.name}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className='text-muted-foreground'>
                                            {t('admin.servers.form.select_spell')}
                                        </span>
                                    )}
                                </div>
                                <Button
                                    type='button'
                                    size='icon'
                                    onClick={() => {
                                        fetchSpells();
                                        setSpellModalOpen(true);
                                    }}
                                    disabled={!form.realms_id}
                                >
                                    <Search className='h-4 w-4' />
                                </Button>
                            </div>
                            {errors.spell_id && <p className='text-xs text-red-500'>{errors.spell_id}</p>}
                        </div>
                    </div>

                    {dockerImages.length > 0 && (
                        <div className='space-y-3'>
                            <Label className='flex items-center gap-1.5'>
                                {t('admin.servers.form.docker_image')}
                                <span className='text-red-500 font-bold'>*</span>
                            </Label>
                            <HeadlessSelect
                                value={form.image}
                                onChange={(val) => setForm((prev) => ({ ...prev, image: String(val) }))}
                                options={dockerImages.map((img) => ({ id: img, name: img }))}
                                placeholder={t('admin.servers.form.select_docker_image')}
                            />
                            <p className='text-xs text-muted-foreground'>{t('admin.servers.form.docker_image_help')}</p>
                        </div>
                    )}
                </div>
            </PageCard>

            {spellVariables.length > 0 && (
                <PageCard
                    title={t('admin.servers.edit.application.variables_title')}
                    description={t('admin.servers.edit.application.variables_description')}
                >
                    <div className='space-y-6'>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                            {spellVariables.map((v) => (
                                <div
                                    key={v.id}
                                    className='p-4 border border-border/50 rounded-2xl bg-muted/10 space-y-4'
                                >
                                    <div className='space-y-3'>
                                        <Label className='flex items-center gap-1.5 font-semibold text-base'>
                                            {v.name}
                                            {v.rules.includes('required') && (
                                                <span className='text-red-500 font-bold'>*</span>
                                            )}
                                        </Label>
                                        <Input
                                            value={form.variables[v.env_variable] || ''}
                                            onChange={(e) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    variables: {
                                                        ...prev.variables,
                                                        [v.env_variable]: e.target.value,
                                                    },
                                                }))
                                            }
                                            placeholder={v.default_value}
                                            className={`bg-card h-11 ${errors[v.env_variable] ? 'border-red-500' : ''}`}
                                            required={v.rules.includes('required')}
                                        />
                                        {errors[v.env_variable] && (
                                            <p className='text-xs text-red-500'>{errors[v.env_variable]}</p>
                                        )}
                                        <p className='text-sm text-muted-foreground leading-relaxed'>{v.description}</p>
                                    </div>

                                    <div className='pt-4 border-t border-border/30 space-y-2.5'>
                                        <div className='flex items-center justify-between text-xs'>
                                            <span className='text-muted-foreground font-medium'>
                                                {t('admin.servers.edit.application.variable_startup_access')}
                                            </span>
                                            <code className='bg-muted px-2 py-0.5 rounded text-primary font-mono'>
                                                {'{{' + v.env_variable + '}}'}
                                            </code>
                                        </div>
                                        <div className='flex items-center justify-between text-xs'>
                                            <span className='text-muted-foreground font-medium'>
                                                {t('admin.servers.edit.application.variable_rules')}
                                            </span>
                                            <code className='bg-muted px-2 py-0.5 rounded font-mono'>{v.rules}</code>
                                        </div>
                                        <div className='flex items-center justify-between text-xs'>
                                            <span className='text-muted-foreground font-medium'>
                                                {t('admin.servers.edit.application.variable_field_type')}
                                            </span>
                                            <span className='capitalize font-medium'>{v.field_type}</span>
                                        </div>
                                        <div className='flex items-center justify-between text-xs'>
                                            <span className='text-muted-foreground font-medium'>
                                                {t('admin.servers.edit.application.variable_user_editable')}
                                            </span>
                                            <span
                                                className={`font-medium ${v.user_editable ? 'text-emerald-500' : 'text-amber-500'}`}
                                            >
                                                {v.user_editable ? t('common.yes') : t('common.no')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </PageCard>
            )}
        </div>
    );
}
