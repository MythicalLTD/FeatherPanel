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
import { Label } from '@/components/ui/label';
import { Cpu, Loader2, Save } from 'lucide-react';

interface ResourcesTabProps {
    config: Record<string, unknown> | null;
    memory: number;
    setMemory: (v: number) => void;
    cpus: number;
    setCpus: (v: number) => void;
    cores: number;
    setCores: (v: number) => void;
    onBoot: boolean;
    setOnBoot: (v: boolean) => void;
    onSave: (e: React.FormEvent) => void;
    saving: boolean;
}

export function ResourcesTab({
    config,
    memory,
    setMemory,
    cpus,
    setCpus,
    cores,
    setCores,
    onBoot,
    setOnBoot,
    onSave,
    saving,
}: ResourcesTabProps) {
    const { t } = useTranslation();

    return (
        <form onSubmit={onSave}>
            <PageCard title={t('admin.vmInstances.edit_tabs.resources') ?? 'Resources'} icon={Cpu}>
                {config ? (
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                        <div>
                            <Label>{t('admin.vmInstances.memory') ?? 'Memory (MB)'}</Label>
                            <Input
                                type='number'
                                min={128}
                                value={memory}
                                onChange={(e) => setMemory(parseInt(e.target.value, 10) || 512)}
                                className='mt-1 bg-muted/30 h-11 rounded-xl'
                            />
                        </div>
                        <div>
                            <Label>{t('admin.vmInstances.cpus') ?? 'CPUs'}</Label>
                            <Input
                                type='number'
                                min={1}
                                value={cpus}
                                onChange={(e) => setCpus(parseInt(e.target.value, 10) || 1)}
                                className='mt-1 bg-muted/30 h-11 rounded-xl'
                            />
                        </div>
                        <div>
                            <Label>{t('admin.vmInstances.cores') ?? 'Cores'}</Label>
                            <Input
                                type='number'
                                min={1}
                                value={cores}
                                onChange={(e) => setCores(parseInt(e.target.value, 10) || 1)}
                                className='mt-1 bg-muted/30 h-11 rounded-xl'
                            />
                        </div>
                        <div className='flex items-center gap-2 pt-8'>
                            <input
                                type='checkbox'
                                id='onboot'
                                checked={onBoot}
                                onChange={(e) => setOnBoot(e.target.checked)}
                                className='h-4 w-4 rounded'
                            />
                            <Label htmlFor='onboot'>{t('admin.vmInstances.on_boot') ?? 'Start on boot'}</Label>
                        </div>
                    </div>
                ) : (
                    <p className='text-sm text-muted-foreground flex items-center gap-2'>
                        <Loader2 className='h-4 w-4 animate-spin' /> {t('common.loading')}
                    </p>
                )}
            </PageCard>
            <div className='flex justify-end mt-4'>
                <Button type='submit' loading={saving} disabled={!config}>
                    <Save className='h-4 w-4 mr-2' />
                    {t('common.save_changes')}
                </Button>
            </div>
        </form>
    );
}
