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
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Shield, Database, Plug, Archive } from 'lucide-react';
import { StepProps } from './types';

export function Step5FeatureLimits({ formData, setFormData }: StepProps) {
    const { t } = useTranslation();

    return (
        <div className='space-y-8'>
            <PageCard
                title={t('admin.servers.form.wizard.step5_title')}
                icon={Shield}
                className='animate-in fade-in-0 slide-in-from-right-4 duration-300'
            >
                <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
                    <div className='space-y-4'>
                        <div className='flex items-center gap-3'>
                            <div className='p-2 bg-primary/10 rounded-lg'>
                                <Database className='h-5 w-5 text-primary' />
                            </div>
                            <Label className='text-base font-semibold'>{t('admin.servers.form.database_limit')}</Label>
                        </div>
                        <Input
                            type='number'
                            value={formData.databaseLimit}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, databaseLimit: parseInt(e.target.value) || 0 }))
                            }
                            placeholder='0'
                            min={0}
                            className='bg-muted/30'
                        />
                        <p className='text-xs text-muted-foreground'>{t('admin.servers.form.database_limit_help')}</p>
                    </div>

                    <div className='space-y-4'>
                        <div className='flex items-center gap-3'>
                            <div className='p-2 bg-blue-500/10 rounded-lg'>
                                <Plug className='h-5 w-5 text-blue-500' />
                            </div>
                            <Label className='text-base font-semibold'>
                                {t('admin.servers.form.allocation_limit')}
                            </Label>
                        </div>
                        <Input
                            type='number'
                            value={formData.allocationLimit}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, allocationLimit: parseInt(e.target.value) || 0 }))
                            }
                            placeholder='0'
                            min={0}
                            className='bg-muted/30'
                        />
                        <p className='text-xs text-muted-foreground'>{t('admin.servers.form.allocation_limit_help')}</p>
                    </div>

                    <div className='space-y-4'>
                        <div className='flex items-center gap-3'>
                            <div className='p-2 bg-emerald-500/10 rounded-lg'>
                                <Archive className='h-5 w-5 text-emerald-500' />
                            </div>
                            <Label className='text-base font-semibold'>{t('admin.servers.form.backup_limit')}</Label>
                        </div>
                        <Input
                            type='number'
                            value={formData.backupLimit}
                            onChange={(e) =>
                                setFormData((prev) => ({ ...prev, backupLimit: parseInt(e.target.value) || 0 }))
                            }
                            placeholder='0'
                            min={0}
                            className='bg-muted/30'
                        />
                        <p className='text-xs text-muted-foreground'>{t('admin.servers.form.backup_limit_help')}</p>
                    </div>
                </div>
            </PageCard>
        </div>
    );
}
