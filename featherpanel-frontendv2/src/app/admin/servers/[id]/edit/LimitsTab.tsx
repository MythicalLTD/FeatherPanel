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
