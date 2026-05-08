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

export function StartupTab({ form, setForm, errors }: TabProps) {
    const { t } = useTranslation();

    return (
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
                    <p className='mb-2 text-sm font-medium'>{t('admin.servers.edit.startup.available_variables')}</p>
                    <div className='flex flex-wrap gap-2'>
                        <code className='bg-muted rounded px-2 py-1 text-xs'>{'{{SERVER_MEMORY}}'}</code>
                        <code className='bg-muted rounded px-2 py-1 text-xs'>{'{{SERVER_IP}}'}</code>
                        <code className='bg-muted rounded px-2 py-1 text-xs'>{'{{SERVER_PORT}}'}</code>
                    </div>
                </div>
            </div>
        </PageCard>
    );
}
