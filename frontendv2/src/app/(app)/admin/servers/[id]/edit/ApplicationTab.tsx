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
import { Box, Wand2, Search } from 'lucide-react';
import { TabProps, SelectedEntities, SpellVariable } from './types';

interface ApplicationTabProps extends TabProps {
    selectedEntities: SelectedEntities;
    spellVariables: SpellVariable[];
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
    setRealmModalOpen,
    setSpellModalOpen,
    fetchRealms,
    fetchSpells,
}: ApplicationTabProps) {
    const { t } = useTranslation();

    const openRealmModal = () => {
        fetchRealms();
        setRealmModalOpen(true);
    };

    const openSpellModal = () => {
        if (!form.realms_id) return;
        fetchSpells();
        setSpellModalOpen(true);
    };

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.servers.edit.application.title')}
                description={t('admin.servers.edit.application.description')}
            >
                <div className='space-y-6'>
                    <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                        <div className='space-y-3'>
                            <Label className='flex items-center gap-1.5'>
                                {t('admin.servers.form.realm')}
                                <span className='font-bold text-red-500'>*</span>
                            </Label>
                            <div className='flex gap-2'>
                                <div
                                    role='button'
                                    tabIndex={0}
                                    className='bg-muted/30 border-border/50 focus-visible:ring-ring flex h-11 flex-1 cursor-pointer items-center rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                                    onClick={openRealmModal}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            openRealmModal();
                                        }
                                    }}
                                >
                                    {selectedEntities.realm ? (
                                        <div className='flex items-center gap-2'>
                                            <Box className='text-primary h-4 w-4' />
                                            <span className='text-foreground font-medium'>
                                                {selectedEntities.realm.name}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className='text-muted-foreground'>
                                            {t('admin.servers.form.select_realm')}
                                        </span>
                                    )}
                                </div>
                                <Button type='button' size='icon' onClick={openRealmModal}>
                                    <Search className='h-4 w-4' />
                                </Button>
                            </div>
                            {errors.realms_id && <p className='text-xs text-red-500'>{errors.realms_id}</p>}
                        </div>

                        <div className='space-y-3'>
                            <Label className='flex items-center gap-1.5'>
                                {t('admin.servers.form.spell')}
                                <span className='font-bold text-red-500'>*</span>
                            </Label>
                            <div className='flex gap-2'>
                                <div
                                    role='button'
                                    tabIndex={form.realms_id ? 0 : -1}
                                    className={`bg-muted/30 border-border/50 focus-visible:ring-ring flex h-11 flex-1 items-center rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${form.realms_id ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                                    onClick={openSpellModal}
                                    onKeyDown={(e) => {
                                        if (!form.realms_id) return;
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            openSpellModal();
                                        }
                                    }}
                                >
                                    {selectedEntities.spell ? (
                                        <div className='flex items-center gap-2'>
                                            <Wand2 className='text-primary h-4 w-4' />
                                            <span className='text-foreground font-medium'>
                                                {selectedEntities.spell.name}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className='text-muted-foreground'>
                                            {t('admin.servers.form.select_spell')}
                                        </span>
                                    )}
                                </div>
                                <Button type='button' size='icon' onClick={openSpellModal} disabled={!form.realms_id}>
                                    <Search className='h-4 w-4' />
                                </Button>
                            </div>
                            {errors.spell_id && <p className='text-xs text-red-500'>{errors.spell_id}</p>}
                        </div>
                    </div>
                </div>
            </PageCard>

            {spellVariables.length > 0 && (
                <PageCard
                    title={t('admin.servers.edit.application.variables_title')}
                    description={t('admin.servers.edit.application.variables_description')}
                >
                    <div className='space-y-6'>
                        <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                            {spellVariables.map((v) => (
                                <div
                                    key={v.id}
                                    className='border-border/50 bg-muted/10 space-y-4 rounded-2xl border p-4'
                                >
                                    <div className='space-y-3'>
                                        <Label className='flex items-center gap-1.5 text-base font-semibold'>
                                            {v.name}
                                            {v.rules.includes('required') && (
                                                <span className='font-bold text-red-500'>*</span>
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
                                        <p className='text-muted-foreground text-sm leading-relaxed'>{v.description}</p>
                                    </div>

                                    <div className='border-border/30 space-y-2.5 border-t pt-4'>
                                        <div className='flex items-center justify-between text-xs'>
                                            <span className='text-muted-foreground font-medium'>
                                                {t('admin.servers.edit.application.variable_startup_access')}
                                            </span>
                                            <code className='bg-muted text-primary rounded px-2 py-0.5 font-mono'>
                                                {'{{' + v.env_variable + '}}'}
                                            </code>
                                        </div>
                                        <div className='flex items-center justify-between text-xs'>
                                            <span className='text-muted-foreground font-medium'>
                                                {t('admin.servers.edit.application.variable_rules')}
                                            </span>
                                            <code className='bg-muted rounded px-2 py-0.5 font-mono'>{v.rules}</code>
                                        </div>
                                        <div className='flex items-center justify-between text-xs'>
                                            <span className='text-muted-foreground font-medium'>
                                                {t('admin.servers.edit.application.variable_field_type')}
                                            </span>
                                            <span className='font-medium capitalize'>{v.field_type}</span>
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
