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
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { SizeInput } from '@/components/featherui/SizeInput';
import { SettingToggleCard } from '@/components/admin/SettingToggleCard';
import { Label } from '@/components/ui/label';
import { Cpu, MemoryStick, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SERVER_RESOURCE_LIMITS } from '@/lib/server-utils';
import { StepProps } from './types';

interface Step4ResourcesProps extends StepProps {
    onSizeValidityChange: (field: 'memory' | 'swap' | 'disk', valid: boolean) => void;
}

export function Step4Resources({ formData, setFormData, onSizeValidityChange }: Step4ResourcesProps) {
    const { t } = useTranslation();

    return (
        <div className='space-y-8'>
            <PageCard
                title={t('admin.servers.form.wizard.step4_title')}
                icon={Cpu}
                className='animate-in fade-in-0 slide-in-from-right-4 duration-300'
            >
                <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
                    <div className='space-y-4'>
                        <div className='flex items-center gap-3'>
                            <div className='bg-primary/10 rounded-lg p-2'>
                                <MemoryStick className='text-primary h-5 w-5' />
                            </div>
                            <Label className='text-base font-semibold'>{t('admin.servers.form.memory')}</Label>
                        </div>
                        <div className='flex gap-2'>
                            <Button
                                type='button'
                                size='sm'
                                variant={formData.memoryUnlimited ? 'default' : 'outline'}
                                className={cn(formData.memoryUnlimited && 'bg-emerald-600 hover:bg-emerald-700')}
                                onClick={() => {
                                    setFormData((prev) => ({ ...prev, memoryUnlimited: true, memory: 0 }));
                                    onSizeValidityChange('memory', true);
                                }}
                            >
                                {t('admin.servers.form.unlimited')}
                            </Button>
                            <Button
                                type='button'
                                size='sm'
                                variant={!formData.memoryUnlimited ? 'default' : 'outline'}
                                className={cn(!formData.memoryUnlimited && 'bg-amber-600 hover:bg-amber-700')}
                                onClick={() => {
                                    setFormData((prev) => ({
                                        ...prev,
                                        memoryUnlimited: false,
                                        memory: prev.memory === 0 ? 1024 : prev.memory,
                                    }));
                                }}
                            >
                                {t('admin.servers.form.limited')}
                            </Button>
                        </div>
                        {!formData.memoryUnlimited && (
                            <SizeInput
                                value={formData.memory}
                                onValueChange={(value) => setFormData((prev) => ({ ...prev, memory: Number(value) }))}
                                unit='MiB'
                                ariaLabel={t('admin.servers.form.memory')}
                                min={SERVER_RESOURCE_LIMITS.memory.min}
                                max={SERVER_RESOURCE_LIMITS.memory.max}
                                onValidityChange={(valid) => onSizeValidityChange('memory', valid)}
                            />
                        )}
                        <p className='text-muted-foreground text-xs'>{t('admin.servers.form.memory_help')}</p>
                    </div>

                    <div className='space-y-4'>
                        <div className='flex items-center gap-3'>
                            <div className='rounded-lg bg-orange-500/10 p-2'>
                                <MemoryStick className='h-5 w-5 text-orange-500' />
                            </div>
                            <Label className='text-base font-semibold'>{t('admin.servers.form.swap')}</Label>
                        </div>
                        <div className='flex gap-2'>
                            <Button
                                type='button'
                                size='sm'
                                variant={formData.swapType === 'disabled' ? 'default' : 'outline'}
                                className={cn(formData.swapType === 'disabled' && 'bg-red-600 hover:bg-red-700')}
                                onClick={() => {
                                    setFormData((prev) => ({ ...prev, swapType: 'disabled', swap: 0 }));
                                    onSizeValidityChange('swap', true);
                                }}
                            >
                                {t('admin.servers.form.disabled')}
                            </Button>
                            <Button
                                type='button'
                                size='sm'
                                variant={formData.swapType === 'limited' ? 'default' : 'outline'}
                                className={cn(formData.swapType === 'limited' && 'bg-amber-600 hover:bg-amber-700')}
                                onClick={() =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        swapType: 'limited',
                                        swap: prev.swap <= 0 ? 256 : prev.swap,
                                    }))
                                }
                            >
                                {t('admin.servers.form.limited')}
                            </Button>
                            <Button
                                type='button'
                                size='sm'
                                variant={formData.swapType === 'unlimited' ? 'default' : 'outline'}
                                className={cn(
                                    formData.swapType === 'unlimited' && 'bg-emerald-600 hover:bg-emerald-700',
                                )}
                                onClick={() => {
                                    setFormData((prev) => ({ ...prev, swapType: 'unlimited', swap: -1 }));
                                    onSizeValidityChange('swap', true);
                                }}
                            >
                                {t('admin.servers.form.unlimited')}
                            </Button>
                        </div>
                        {formData.swapType === 'limited' && (
                            <SizeInput
                                value={formData.swap}
                                onValueChange={(value) => setFormData((prev) => ({ ...prev, swap: Number(value) }))}
                                unit='MiB'
                                ariaLabel={t('admin.servers.form.swap')}
                                min={1}
                                max={SERVER_RESOURCE_LIMITS.swap.max}
                                onValidityChange={(valid) => onSizeValidityChange('swap', valid)}
                            />
                        )}
                        <p className='text-muted-foreground text-xs'>{t('admin.servers.form.swap_help')}</p>
                    </div>

                    <div className='space-y-4'>
                        <div className='flex items-center gap-3'>
                            <div className='rounded-lg bg-blue-500/10 p-2'>
                                <HardDrive className='h-5 w-5 text-blue-500' />
                            </div>
                            <Label className='text-base font-semibold'>{t('admin.servers.form.disk')}</Label>
                        </div>
                        <div className='flex gap-2'>
                            <Button
                                type='button'
                                size='sm'
                                variant={formData.diskUnlimited ? 'default' : 'outline'}
                                className={cn(formData.diskUnlimited && 'bg-emerald-600 hover:bg-emerald-700')}
                                onClick={() => {
                                    setFormData((prev) => ({ ...prev, diskUnlimited: true, disk: 0 }));
                                    onSizeValidityChange('disk', true);
                                }}
                            >
                                {t('admin.servers.form.unlimited')}
                            </Button>
                            <Button
                                type='button'
                                size='sm'
                                variant={!formData.diskUnlimited ? 'default' : 'outline'}
                                className={cn(!formData.diskUnlimited && 'bg-amber-600 hover:bg-amber-700')}
                                onClick={() =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        diskUnlimited: false,
                                        disk: prev.disk === 0 ? 5120 : prev.disk,
                                    }))
                                }
                            >
                                {t('admin.servers.form.limited')}
                            </Button>
                        </div>
                        {!formData.diskUnlimited && (
                            <SizeInput
                                value={formData.disk}
                                onValueChange={(value) => setFormData((prev) => ({ ...prev, disk: Number(value) }))}
                                unit='MiB'
                                ariaLabel={t('admin.servers.form.disk')}
                                min={SERVER_RESOURCE_LIMITS.disk.min}
                                max={SERVER_RESOURCE_LIMITS.disk.max}
                                onValidityChange={(valid) => onSizeValidityChange('disk', valid)}
                            />
                        )}
                        <p className='text-muted-foreground text-xs'>{t('admin.servers.form.disk_help')}</p>
                    </div>

                    <div className='space-y-4'>
                        <div className='flex items-center gap-3'>
                            <div className='bg-primary/10 rounded-lg p-2'>
                                <Cpu className='text-primary h-5 w-5' />
                            </div>
                            <Label className='text-base font-semibold'>{t('admin.servers.form.cpu')}</Label>
                        </div>
                        <div className='flex gap-2'>
                            <Button
                                type='button'
                                size='sm'
                                variant={formData.cpuUnlimited ? 'default' : 'outline'}
                                className={cn(formData.cpuUnlimited && 'bg-emerald-600 hover:bg-emerald-700')}
                                onClick={() => setFormData((prev) => ({ ...prev, cpuUnlimited: true, cpu: 0 }))}
                            >
                                {t('admin.servers.form.unlimited')}
                            </Button>
                            <Button
                                type='button'
                                size='sm'
                                variant={!formData.cpuUnlimited ? 'default' : 'outline'}
                                className={cn(!formData.cpuUnlimited && 'bg-amber-600 hover:bg-amber-700')}
                                onClick={() =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        cpuUnlimited: false,
                                        cpu: prev.cpu === 0 ? 100 : prev.cpu,
                                    }))
                                }
                            >
                                {t('admin.servers.form.limited')}
                            </Button>
                        </div>
                        {!formData.cpuUnlimited && (
                            <Input
                                type='number'
                                value={formData.cpu}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, cpu: parseInt(e.target.value) || 0 }))
                                }
                                placeholder='100'
                                min={SERVER_RESOURCE_LIMITS.cpu.min}
                                className='bg-muted/30'
                            />
                        )}
                        <p className='text-muted-foreground text-xs'>{t('admin.servers.form.cpu_help')}</p>
                    </div>

                    <div className='space-y-4'>
                        <Label className='text-base font-semibold'>{t('admin.servers.form.io')}</Label>
                        <Input
                            type='number'
                            value={formData.io}
                            onChange={(e) => setFormData((prev) => ({ ...prev, io: parseInt(e.target.value) || 500 }))}
                            placeholder='500'
                            min={10}
                            max={1000}
                            className='bg-muted/30'
                        />
                        <p className='text-muted-foreground text-xs'>{t('admin.servers.form.io_help')}</p>
                    </div>

                    <div className='space-y-4'>
                        <Label className='text-base font-semibold'>{t('admin.servers.form.threads')}</Label>
                        <Input
                            value={formData.threads}
                            onChange={(e) => setFormData((prev) => ({ ...prev, threads: e.target.value }))}
                            placeholder='Leave empty for all threads'
                            className='bg-muted/30'
                        />
                        <p className='text-muted-foreground text-xs'>{t('admin.servers.form.threads_help')}</p>
                    </div>
                </div>

                <SettingToggleCard
                    className='mt-8'
                    title={t('admin.servers.form.oom_killer')}
                    description={t('admin.servers.form.oom_killer_help')}
                    checked={formData.oomKiller}
                    onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, oomKiller: checked }))}
                />
            </PageCard>
        </div>
    );
}
