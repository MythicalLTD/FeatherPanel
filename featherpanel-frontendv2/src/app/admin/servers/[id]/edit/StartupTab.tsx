/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
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

                {/* Available Variables Info */}
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
