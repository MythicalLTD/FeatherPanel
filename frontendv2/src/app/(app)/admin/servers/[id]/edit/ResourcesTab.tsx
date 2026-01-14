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
import { TabProps } from './types';

export function ResourcesTab({ form, setForm, errors }: TabProps) {
    const { t } = useTranslation();

    return (
        <PageCard
            title={t('admin.servers.edit.resources.title')}
            description={t('admin.servers.edit.resources.description')}
        >
            <div className='space-y-6'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    {/* Memory */}
                    <div className='space-y-3'>
                        <Label>{t('admin.servers.form.memory')}</Label>
                        <div className='flex items-center gap-2 mb-2'>
                            <Button
                                type='button'
                                size='sm'
                                variant={form.memory === 0 ? 'default' : 'outline'}
                                className={form.memory === 0 ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                                onClick={() => setForm((prev) => ({ ...prev, memory: 0 }))}
                            >
                                {t('admin.servers.form.unlimited')}
                            </Button>
                            <Button
                                type='button'
                                size='sm'
                                variant={form.memory !== 0 ? 'default' : 'outline'}
                                className={form.memory !== 0 ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                                onClick={() => {
                                    if (form.memory === 0) setForm((prev) => ({ ...prev, memory: 1024 }));
                                }}
                            >
                                {t('admin.servers.form.limited')}
                            </Button>
                        </div>
                        {form.memory !== 0 && (
                            <Input
                                type='number'
                                value={form.memory}
                                onChange={(e) => setForm((prev) => ({ ...prev, memory: Number(e.target.value) }))}
                                min={0}
                                className={`bg-muted/30 h-11 ${errors.memory ? 'border-red-500' : ''}`}
                            />
                        )}
                        <p className='text-xs text-muted-foreground'>{t('admin.servers.form.memory_help')}</p>
                    </div>

                    {/* Swap */}
                    <div className='space-y-3'>
                        <Label>{t('admin.servers.form.swap')}</Label>
                        <div className='flex items-center gap-2 mb-2'>
                            <Button
                                type='button'
                                size='sm'
                                variant={form.swap === 0 ? 'default' : 'outline'}
                                className={form.swap === 0 ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                                onClick={() => setForm((prev) => ({ ...prev, swap: 0 }))}
                            >
                                {t('admin.servers.form.disabled')}
                            </Button>
                            <Button
                                type='button'
                                size='sm'
                                variant={form.swap !== 0 && form.swap !== -1 ? 'default' : 'outline'}
                                className={
                                    form.swap !== 0 && form.swap !== -1
                                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                        : ''
                                }
                                onClick={() => {
                                    if (form.swap === 0 || form.swap === -1)
                                        setForm((prev) => ({ ...prev, swap: 256 }));
                                }}
                            >
                                {t('admin.servers.form.limited')}
                            </Button>
                            <Button
                                type='button'
                                size='sm'
                                variant={form.swap === -1 ? 'default' : 'outline'}
                                className={form.swap === -1 ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                                onClick={() => setForm((prev) => ({ ...prev, swap: -1 }))}
                            >
                                {t('admin.servers.form.unlimited')}
                            </Button>
                        </div>
                        {form.swap !== 0 && form.swap !== -1 && (
                            <Input
                                type='number'
                                value={form.swap}
                                onChange={(e) => setForm((prev) => ({ ...prev, swap: Number(e.target.value) }))}
                                min={1}
                                className={`bg-muted/30 h-11 ${errors.swap ? 'border-red-500' : ''}`}
                            />
                        )}
                        <p className='text-xs text-muted-foreground'>{t('admin.servers.form.swap_help')}</p>
                    </div>

                    {/* Disk */}
                    <div className='space-y-3'>
                        <Label>{t('admin.servers.form.disk')}</Label>
                        <div className='flex items-center gap-2 mb-2'>
                            <Button
                                type='button'
                                size='sm'
                                variant={form.disk === 0 ? 'default' : 'outline'}
                                className={form.disk === 0 ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                                onClick={() => setForm((prev) => ({ ...prev, disk: 0 }))}
                            >
                                {t('admin.servers.form.unlimited')}
                            </Button>
                            <Button
                                type='button'
                                size='sm'
                                variant={form.disk !== 0 ? 'default' : 'outline'}
                                className={form.disk !== 0 ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                                onClick={() => {
                                    if (form.disk === 0) setForm((prev) => ({ ...prev, disk: 1024 }));
                                }}
                            >
                                {t('admin.servers.form.limited')}
                            </Button>
                        </div>
                        {form.disk !== 0 && (
                            <Input
                                type='number'
                                value={form.disk}
                                onChange={(e) => setForm((prev) => ({ ...prev, disk: Number(e.target.value) }))}
                                min={0}
                                className={`bg-muted/30 h-11 ${errors.disk ? 'border-red-500' : ''}`}
                            />
                        )}
                        <p className='text-xs text-muted-foreground'>{t('admin.servers.form.disk_help')}</p>
                    </div>

                    {/* CPU */}
                    <div className='space-y-3'>
                        <Label>{t('admin.servers.form.cpu')}</Label>
                        <div className='flex items-center gap-2 mb-2'>
                            <Button
                                type='button'
                                size='sm'
                                variant={form.cpu === 0 ? 'default' : 'outline'}
                                className={form.cpu === 0 ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                                onClick={() => setForm((prev) => ({ ...prev, cpu: 0 }))}
                            >
                                {t('admin.servers.form.unlimited')}
                            </Button>
                            <Button
                                type='button'
                                size='sm'
                                variant={form.cpu !== 0 ? 'default' : 'outline'}
                                className={form.cpu !== 0 ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                                onClick={() => {
                                    if (form.cpu === 0) setForm((prev) => ({ ...prev, cpu: 100 }));
                                }}
                            >
                                {t('admin.servers.form.limited')}
                            </Button>
                        </div>
                        {form.cpu !== 0 && (
                            <Input
                                type='number'
                                value={form.cpu}
                                onChange={(e) => setForm((prev) => ({ ...prev, cpu: Number(e.target.value) }))}
                                min={0}
                                className={`bg-muted/30 h-11 ${errors.cpu ? 'border-red-500' : ''}`}
                            />
                        )}
                        <p className='text-xs text-muted-foreground'>{t('admin.servers.form.cpu_help')}</p>
                    </div>

                    {/* IO */}
                    <div className='space-y-3'>
                        <Label>{t('admin.servers.form.io')}</Label>
                        <Input
                            type='number'
                            value={form.io}
                            onChange={(e) => setForm((prev) => ({ ...prev, io: Number(e.target.value) }))}
                            min={10}
                            max={1000}
                            className={`bg-muted/30 h-11 ${errors.io ? 'border-red-500' : ''}`}
                        />
                        <p className='text-xs text-muted-foreground'>{t('admin.servers.form.io_help')}</p>
                    </div>

                    {/* OOM Killer */}
                    <div className='space-y-3'>
                        <Label>{t('admin.servers.form.oom_killer')}</Label>
                        <div className='flex items-center gap-2'>
                            <Button
                                type='button'
                                size='sm'
                                variant={form.oom_killer ? 'default' : 'outline'}
                                className={form.oom_killer ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                                onClick={() => setForm((prev) => ({ ...prev, oom_killer: true }))}
                            >
                                {t('admin.servers.form.enabled')}
                            </Button>
                            <Button
                                type='button'
                                size='sm'
                                variant={!form.oom_killer ? 'default' : 'outline'}
                                className={!form.oom_killer ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
                                onClick={() => setForm((prev) => ({ ...prev, oom_killer: false }))}
                            >
                                {t('admin.servers.form.disabled')}
                            </Button>
                        </div>
                        <p className='text-xs text-muted-foreground'>{t('admin.servers.form.oom_killer_help')}</p>
                    </div>
                </div>

                {/* CPU Threads */}
                <div className='space-y-3'>
                    <Label>{t('admin.servers.form.threads')}</Label>
                    <Input
                        value={form.threads}
                        onChange={(e) => setForm((prev) => ({ ...prev, threads: e.target.value }))}
                        placeholder={t('admin.servers.form.threads_placeholder')}
                        className='bg-muted/30 h-11'
                    />
                    <p className='text-xs text-muted-foreground'>{t('admin.servers.form.threads_help')}</p>
                </div>
            </div>
        </PageCard>
    );
}
