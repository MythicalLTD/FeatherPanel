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
                    <span className='text-red-500 font-bold'>*</span>
                </Label>
                <Input
                    value={form.startup}
                    onChange={(e) => setForm((prev) => ({ ...prev, startup: e.target.value }))}
                    placeholder={t('admin.servers.form.startup_placeholder')}
                    className={`bg-muted/30 h-11 font-mono ${errors.startup ? 'border-red-500' : ''}`}
                />
                {errors.startup && <p className='text-xs text-red-500'>{errors.startup}</p>}
                <p className='text-xs text-muted-foreground'>{t('admin.servers.form.startup_help')}</p>

                <div className='mt-4 p-4 bg-muted/20 rounded-xl border border-border/50'>
                    <p className='text-sm font-medium mb-2'>{t('admin.servers.edit.startup.available_variables')}</p>
                    <div className='flex flex-wrap gap-2'>
                        <code className='px-2 py-1 bg-muted rounded text-xs'>{'{{SERVER_MEMORY}}'}</code>
                        <code className='px-2 py-1 bg-muted rounded text-xs'>{'{{SERVER_IP}}'}</code>
                        <code className='px-2 py-1 bg-muted rounded text-xs'>{'{{SERVER_PORT}}'}</code>
                    </div>
                </div>
            </div>
        </PageCard>
    );
}
