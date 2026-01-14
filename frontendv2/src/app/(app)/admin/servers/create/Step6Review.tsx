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
import {
    ClipboardCheck,
    User as UserIcon,
    MapPin,
    Server as ServerIcon,
    Plug,
    Box,
    Wand2,
    MemoryStick,
    HardDrive,
    Cpu,
    Database,
    Archive,
    Terminal,
} from 'lucide-react';
import { StepProps } from './types';

export function Step6Review({ formData, setFormData, selectedEntities }: StepProps) {
    const { t } = useTranslation();

    const formatResourceValue = (value: number, unlimited: boolean) => {
        if (unlimited || value === 0) return t('admin.servers.form.wizard.review.unlimited');
        return `${value.toLocaleString()} MiB`;
    };

    const formatCpuValue = (value: number, unlimited: boolean) => {
        if (unlimited || value === 0) return t('admin.servers.form.wizard.review.unlimited');
        return `${value}%`;
    };

    const formatSwapValue = () => {
        if (formData.swapType === 'disabled') return t('admin.servers.form.wizard.review.disabled');
        if (formData.swapType === 'unlimited') return t('admin.servers.form.wizard.review.unlimited');
        return `${formData.swap.toLocaleString()} MiB`;
    };

    const noValue = t('admin.servers.form.wizard.review.no_value');

    return (
        <div className='space-y-8'>
            <PageCard
                title={t('admin.servers.form.wizard.step6_title')}
                icon={ClipboardCheck}
                className='animate-in fade-in-0 slide-in-from-right-4 duration-300'
            >
                <div className='space-y-8'>
                    {/* Core Details Section */}
                    <div className='space-y-4'>
                        <h3 className='text-lg font-semibold flex items-center gap-2'>
                            <ServerIcon className='h-5 w-5 text-primary' />
                            {t('admin.servers.form.wizard.review.core_details')}
                        </h3>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/20 rounded-xl'>
                            <div>
                                <span className='text-sm text-muted-foreground'>
                                    {t('admin.servers.form.wizard.review.server_name')}
                                </span>
                                <p className='font-medium'>{formData.name || noValue}</p>
                            </div>
                            <div>
                                <span className='text-sm text-muted-foreground'>
                                    {t('admin.servers.form.wizard.review.owner')}
                                </span>
                                <div className='flex items-center gap-2'>
                                    <UserIcon className='h-4 w-4 text-primary' />
                                    <p className='font-medium'>
                                        {selectedEntities.owner?.username || noValue}
                                        {selectedEntities.owner?.email && (
                                            <span className='text-muted-foreground text-sm ml-1'>
                                                ({selectedEntities.owner.email})
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            {formData.description && (
                                <div className='md:col-span-2'>
                                    <span className='text-sm text-muted-foreground'>
                                        {t('admin.servers.form.wizard.review.description')}
                                    </span>
                                    <p className='font-medium'>{formData.description}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Allocation Section */}
                    <div className='space-y-4'>
                        <h3 className='text-lg font-semibold flex items-center gap-2'>
                            <Plug className='h-5 w-5 text-blue-500' />
                            {t('admin.servers.form.wizard.review.allocation')}
                        </h3>
                        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-xl'>
                            <div>
                                <span className='text-sm text-muted-foreground'>
                                    {t('admin.servers.form.wizard.review.location')}
                                </span>
                                <div className='flex items-center gap-2'>
                                    <MapPin className='h-4 w-4 text-primary' />
                                    <p className='font-medium'>{selectedEntities.location?.name || noValue}</p>
                                </div>
                            </div>
                            <div>
                                <span className='text-sm text-muted-foreground'>
                                    {t('admin.servers.form.wizard.review.node')}
                                </span>
                                <p className='font-medium'>{selectedEntities.node?.name || noValue}</p>
                            </div>
                            <div>
                                <span className='text-sm text-muted-foreground'>
                                    {t('admin.servers.form.wizard.review.allocation')}
                                </span>
                                <p className='font-medium'>
                                    {selectedEntities.allocation
                                        ? `${selectedEntities.allocation.ip}:${selectedEntities.allocation.port}`
                                        : noValue}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Application Section */}
                    <div className='space-y-4'>
                        <h3 className='text-lg font-semibold flex items-center gap-2'>
                            <Wand2 className='h-5 w-5 text-purple-500' />
                            {t('admin.servers.form.wizard.review.application')}
                        </h3>
                        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-xl'>
                            <div>
                                <span className='text-sm text-muted-foreground'>
                                    {t('admin.servers.form.wizard.review.realm')}
                                </span>
                                <div className='flex items-center gap-2'>
                                    <Box className='h-4 w-4 text-primary' />
                                    <p className='font-medium'>{selectedEntities.realm?.name || noValue}</p>
                                </div>
                            </div>
                            <div>
                                <span className='text-sm text-muted-foreground'>
                                    {t('admin.servers.form.wizard.review.spell')}
                                </span>
                                <p className='font-medium'>{selectedEntities.spell?.name || noValue}</p>
                            </div>
                            <div>
                                <span className='text-sm text-muted-foreground'>
                                    {t('admin.servers.form.wizard.review.docker_image')}
                                </span>
                                <p className='font-medium text-xs break-all'>{formData.dockerImage || noValue}</p>
                            </div>
                        </div>
                    </div>

                    {/* Resources Section */}
                    <div className='space-y-4'>
                        <h3 className='text-lg font-semibold flex items-center gap-2'>
                            <Cpu className='h-5 w-5 text-orange-500' />
                            {t('admin.servers.form.wizard.review.resource_limits')}
                        </h3>
                        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-xl'>
                            <div>
                                <span className='text-sm text-muted-foreground flex items-center gap-1'>
                                    <MemoryStick className='h-3 w-3' />
                                    {t('admin.servers.form.wizard.review.memory')}
                                </span>
                                <p className='font-medium'>
                                    {formatResourceValue(formData.memory, formData.memoryUnlimited)}
                                </p>
                            </div>
                            <div>
                                <span className='text-sm text-muted-foreground flex items-center gap-1'>
                                    <MemoryStick className='h-3 w-3' />
                                    {t('admin.servers.form.wizard.review.swap')}
                                </span>
                                <p className='font-medium'>{formatSwapValue()}</p>
                            </div>
                            <div>
                                <span className='text-sm text-muted-foreground flex items-center gap-1'>
                                    <HardDrive className='h-3 w-3' />
                                    {t('admin.servers.form.wizard.review.disk')}
                                </span>
                                <p className='font-medium'>
                                    {formatResourceValue(formData.disk, formData.diskUnlimited)}
                                </p>
                            </div>
                            <div>
                                <span className='text-sm text-muted-foreground flex items-center gap-1'>
                                    <Cpu className='h-3 w-3' />
                                    {t('admin.servers.form.wizard.review.cpu')}
                                </span>
                                <p className='font-medium'>{formatCpuValue(formData.cpu, formData.cpuUnlimited)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Feature Limits Section */}
                    <div className='space-y-4'>
                        <h3 className='text-lg font-semibold flex items-center gap-2'>
                            <Database className='h-5 w-5 text-emerald-500' />
                            {t('admin.servers.form.wizard.review.feature_limits')}
                        </h3>
                        <div className='grid grid-cols-3 gap-4 p-4 bg-muted/20 rounded-xl'>
                            <div>
                                <span className='text-sm text-muted-foreground'>
                                    {t('admin.servers.form.wizard.review.databases')}
                                </span>
                                <p className='font-medium'>{formData.databaseLimit}</p>
                            </div>
                            <div>
                                <span className='text-sm text-muted-foreground'>
                                    {t('admin.servers.form.wizard.review.allocations')}
                                </span>
                                <p className='font-medium'>{formData.allocationLimit}</p>
                            </div>
                            <div>
                                <span className='text-sm text-muted-foreground flex items-center gap-1'>
                                    <Archive className='h-3 w-3' />
                                    {t('admin.servers.form.wizard.review.backups')}
                                </span>
                                <p className='font-medium'>{formData.backupLimit}</p>
                            </div>
                        </div>
                    </div>

                    {/* Startup Command */}
                    <div className='space-y-4'>
                        <h3 className='text-lg font-semibold flex items-center gap-2'>
                            <Terminal className='h-5 w-5 text-cyan-500' />
                            {t('admin.servers.form.wizard.review.startup_command')}
                        </h3>
                        <div className='space-y-2'>
                            <Label>{t('admin.servers.form.startup_command')}</Label>
                            <Input
                                value={formData.startup}
                                onChange={(e) => setFormData((prev) => ({ ...prev, startup: e.target.value }))}
                                placeholder={t('admin.servers.form.startup_command')}
                                className='bg-muted/30 font-mono text-sm'
                            />
                            <p className='text-xs text-muted-foreground'>
                                {t('admin.servers.form.startup_command_help')}
                            </p>
                        </div>
                    </div>
                </div>
            </PageCard>
        </div>
    );
}
