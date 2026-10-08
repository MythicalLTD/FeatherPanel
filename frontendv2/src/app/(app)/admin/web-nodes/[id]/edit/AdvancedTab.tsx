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
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { Shield, Upload, Wrench } from 'lucide-react';
import { type WebNodeForm } from '../../types';

interface AdvancedTabProps {
    form: WebNodeForm;
    setForm: React.Dispatch<React.SetStateAction<WebNodeForm>>;
    errors: Record<string, string>;
}

export function AdvancedTab({ form, setForm, errors }: AdvancedTabProps) {
    const { t } = useTranslation();

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.webNodes.form.card_maintenance')}
                description={t('admin.webNodes.form.card_maintenance_description')}
                icon={Wrench}
            >
                <div className='max-w-md space-y-2'>
                    <Label className='text-sm font-semibold'>{t('admin.webNodes.form.maintenance')}</Label>
                    <Select
                        value={form.maintenance_mode}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            setForm({ ...form, maintenance_mode: e.target.value })
                        }
                    >
                        <option value='false'>{t('admin.webNodes.form.maintenance_disabled')}</option>
                        <option value='true'>{t('admin.webNodes.form.maintenance_enabled')}</option>
                    </Select>
                    <p className='text-muted-foreground/70 text-xs italic'>{t('admin.node.form.maintenance_help')}</p>
                </div>
            </PageCard>

            <PageCard
                title={t('admin.webNodes.form.card_upload_limits')}
                description={t('admin.webNodes.form.card_upload_limits_description')}
                icon={Upload}
            >
                <div className='max-w-md space-y-2'>
                    <Label className='text-sm font-semibold'>{t('admin.webNodes.form.upload_size')}</Label>
                    <div className='relative'>
                        <Input
                            type='number'
                            min={1}
                            value={form.upload_size}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, upload_size: parseInt(e.target.value, 10) || 0 })
                            }
                            error={!!errors.upload_size}
                        />
                        <span className='text-muted-foreground/50 absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold'>
                            {t('admin.node.form.memory_mib')}
                        </span>
                    </div>
                    <p className='text-muted-foreground/70 text-xs italic'>{t('admin.node.form.upload_size_help')}</p>
                </div>
            </PageCard>

            <PageCard
                title={t('admin.webNodes.form.advanced')}
                description={t('admin.webNodes.form.card_advanced_note_description')}
                icon={Shield}
            >
                <p className='text-muted-foreground text-sm leading-relaxed'>
                    {t('admin.webNodes.form.advanced_note')}
                </p>
            </PageCard>
        </div>
    );
}
