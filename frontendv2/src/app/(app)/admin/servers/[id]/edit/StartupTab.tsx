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

import type { Dispatch, SetStateAction } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/featherui/Button';
import { Plus, Trash2, Lock } from 'lucide-react';
import { DockerImageField, DockerImageOption } from '@/components/admin/DockerImageField';
import { CustomVariable, TabProps } from './types';

interface StartupTabProps extends TabProps {
    dockerImages: DockerImageOption[];
    spellDefaultDockerImage: string;
    customVariables: CustomVariable[];
    customVariableForm: {
        name: string;
        env_variable: string;
        variable_value: string;
        is_encrypted: boolean;
    };
    customVariableSaving: boolean;
    setCustomVariableForm: Dispatch<
        SetStateAction<{
            name: string;
            env_variable: string;
            variable_value: string;
            is_encrypted: boolean;
        }>
    >;
    onAddCustomVariable: () => void;
    onDeleteCustomVariable: (variable: CustomVariable) => void;
}

export function StartupTab({
    form,
    setForm,
    errors,
    dockerImages,
    spellDefaultDockerImage,
    customVariables,
    customVariableForm,
    customVariableSaving,
    setCustomVariableForm,
    onAddCustomVariable,
    onDeleteCustomVariable,
}: StartupTabProps) {
    const { t } = useTranslation();

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.servers.edit.startup.title')}
                description={t('admin.servers.edit.startup.description')}
            >
                <div className='space-y-3'>
                    <Label className='flex items-center gap-1.5'>
                        {t('admin.servers.form.startup')}
                        <span className='font-bold text-red-500'>*</span>
                    </Label>
                    <Input
                        value={form.startup}
                        onChange={(e) => setForm((prev) => ({ ...prev, startup: e.target.value }))}
                        placeholder={t('admin.servers.form.startup_placeholder')}
                        className={`bg-muted/30 h-11 font-mono ${errors.startup ? 'border-red-500' : ''}`}
                    />
                    {errors.startup && <p className='text-xs text-red-500'>{errors.startup}</p>}
                    <p className='text-muted-foreground text-xs'>{t('admin.servers.form.startup_help')}</p>

                    <div className='bg-muted/20 border-border/50 mt-4 rounded-xl border p-4'>
                        <p className='mb-2 text-sm font-medium'>
                            {t('admin.servers.edit.startup.available_variables')}
                        </p>
                        <div className='flex flex-wrap gap-2'>
                            <code className='bg-muted rounded px-2 py-1 text-xs'>{'{{SERVER_MEMORY}}'}</code>
                            <code className='bg-muted rounded px-2 py-1 text-xs'>{'{{SERVER_IP}}'}</code>
                            <code className='bg-muted rounded px-2 py-1 text-xs'>{'{{SERVER_PORT}}'}</code>
                        </div>
                    </div>
                </div>
            </PageCard>

            <PageCard
                title={t('admin.servers.form.docker_image')}
                description={t('admin.servers.edit.startup.docker_image_description')}
            >
                <DockerImageField
                    value={form.image}
                    onChange={(image) => setForm((prev) => ({ ...prev, image }))}
                    images={dockerImages}
                    defaultImage={spellDefaultDockerImage}
                    error={errors.image}
                />
            </PageCard>

            <PageCard
                title='Custom environment variables'
                description='Server-specific variables synced to Wings without a transfer.'
            >
                <div className='space-y-4'>
                    {customVariables.length > 0 && (
                        <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                            {customVariables.map((variable) => (
                                <div
                                    key={variable.id}
                                    className='border-border/50 bg-background/50 flex items-center justify-between gap-3 rounded-xl border p-3'
                                >
                                    <div className='min-w-0'>
                                        <div className='flex items-center gap-2'>
                                            <p className='truncate text-sm font-medium'>{variable.name}</p>
                                            {Number(variable.is_encrypted) === 1 && (
                                                <Lock className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
                                            )}
                                        </div>
                                        <p className='text-muted-foreground mt-1 truncate font-mono text-xs'>
                                            {variable.env_variable}={variable.variable_value}
                                        </p>
                                    </div>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() => onDeleteCustomVariable(variable)}
                                        disabled={customVariableSaving}
                                        className='shrink-0'
                                    >
                                        <Trash2 className='h-3.5 w-3.5' />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
                        <Input
                            value={customVariableForm.name}
                            onChange={(e) => setCustomVariableForm((prev) => ({ ...prev, name: e.target.value }))}
                            disabled={customVariableSaving}
                            placeholder='Display name'
                        />
                        <Input
                            value={customVariableForm.env_variable}
                            onChange={(e) =>
                                setCustomVariableForm((prev) => ({
                                    ...prev,
                                    env_variable: e.target.value.toUpperCase(),
                                }))
                            }
                            disabled={customVariableSaving}
                            placeholder='ENV_NAME'
                            className='font-mono'
                        />
                        <div className='flex gap-3'>
                            <Input
                                value={customVariableForm.variable_value}
                                onChange={(e) =>
                                    setCustomVariableForm((prev) => ({
                                        ...prev,
                                        variable_value: e.target.value,
                                    }))
                                }
                                disabled={customVariableSaving}
                                placeholder='Value'
                                className='font-mono'
                            />
                            <Button
                                variant='default'
                                size='default'
                                onClick={onAddCustomVariable}
                                disabled={customVariableSaving}
                                loading={customVariableSaving}
                                className='shrink-0'
                            >
                                <Plus className='h-4 w-4' />
                            </Button>
                        </div>
                    </div>

                    <label className='text-muted-foreground flex cursor-pointer items-start gap-2 text-xs'>
                        <input
                            type='checkbox'
                            checked={customVariableForm.is_encrypted}
                            onChange={(e) =>
                                setCustomVariableForm((prev) => ({
                                    ...prev,
                                    is_encrypted: e.target.checked,
                                }))
                            }
                            disabled={customVariableSaving}
                            className='mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5'
                        />
                        <span>Encrypt this value and hide it after save</span>
                    </label>
                </div>
            </PageCard>
        </div>
    );
}
