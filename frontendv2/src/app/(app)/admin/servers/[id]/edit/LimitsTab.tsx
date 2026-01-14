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
import { TabProps } from './types';

export function LimitsTab({ form, setForm }: TabProps) {
    const { t } = useTranslation();

    return (
        <PageCard title={t('admin.servers.edit.limits.title')} description={t('admin.servers.edit.limits.description')}>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                {/* Database Limit */}
                <div className='space-y-3'>
                    <Label>{t('admin.servers.form.database_limit')}</Label>
                    <Input
                        type='number'
                        value={form.database_limit}
                        onChange={(e) => setForm((prev) => ({ ...prev, database_limit: Number(e.target.value) }))}
                        min={0}
                        className='bg-muted/30 h-11'
                    />
                    <p className='text-xs text-muted-foreground'>{t('admin.servers.form.database_limit_help')}</p>
                </div>

                {/* Allocation Limit */}
                <div className='space-y-3'>
                    <Label>{t('admin.servers.form.allocation_limit')}</Label>
                    <Input
                        type='number'
                        value={form.allocation_limit}
                        onChange={(e) => setForm((prev) => ({ ...prev, allocation_limit: Number(e.target.value) }))}
                        min={0}
                        className='bg-muted/30 h-11'
                    />
                    <p className='text-xs text-muted-foreground'>{t('admin.servers.form.allocation_limit_help')}</p>
                </div>

                {/* Backup Limit */}
                <div className='space-y-3'>
                    <Label>{t('admin.servers.form.backup_limit')}</Label>
                    <Input
                        type='number'
                        value={form.backup_limit}
                        onChange={(e) => setForm((prev) => ({ ...prev, backup_limit: Number(e.target.value) }))}
                        min={0}
                        className='bg-muted/30 h-11'
                    />
                    <p className='text-xs text-muted-foreground'>{t('admin.servers.form.backup_limit_help')}</p>
                </div>
            </div>
        </PageCard>
    );
}
