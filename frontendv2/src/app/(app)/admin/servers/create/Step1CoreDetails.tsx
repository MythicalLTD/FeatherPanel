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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Search, UserCircle } from 'lucide-react';
import { StepProps, User } from './types';

interface Step1Props extends StepProps {
    owners: User[];
    ownerSearch: string;
    setOwnerSearch: (val: string) => void;
    ownerModalOpen: boolean;
    setOwnerModalOpen: (val: boolean) => void;
    fetchOwners: () => void;
}

export function Step1CoreDetails({
    formData,
    setFormData,
    selectedEntities,
    setOwnerModalOpen,
    fetchOwners,
}: Step1Props) {
    const { t } = useTranslation();

    return (
        <div className='space-y-8'>
            <PageCard
                title={t('admin.servers.form.wizard.step1_title')}
                icon={Settings}
                className='animate-in fade-in-0 slide-in-from-right-4 duration-300'
            >
                <div className='space-y-6'>
                    <div className='space-y-3'>
                        <Label className='flex items-center gap-1.5'>
                            {t('admin.servers.form.name')}
                            <span className='text-red-500 font-bold'>*</span>
                        </Label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder='My Server'
                            className='bg-muted/30 h-11'
                        />
                        <p className='text-xs text-muted-foreground'>{t('admin.servers.form.name_help')}</p>
                    </div>

                    <div className='space-y-3'>
                        <Label className='flex items-center gap-1.5'>{t('admin.servers.form.description')}</Label>
                        <Input
                            value={formData.description}
                            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                            placeholder='A brief description'
                            className='bg-muted/30 h-11'
                        />
                        <p className='text-xs text-muted-foreground'>{t('admin.servers.form.description_help')}</p>
                    </div>

                    <div className='space-y-3'>
                        <Label className='flex items-center gap-1.5'>
                            {t('admin.servers.form.owner')}
                            <span className='text-red-500 font-bold'>*</span>
                        </Label>
                        <div className='flex gap-2'>
                            <div className='flex-1 h-11 px-3 bg-muted/30 rounded-xl border border-border/50 text-sm flex items-center'>
                                {selectedEntities.owner ? (
                                    <div className='flex items-center gap-2'>
                                        <UserCircle className='h-4 w-4 text-primary' />
                                        <span className='font-medium text-foreground'>
                                            {selectedEntities.owner.username}
                                        </span>
                                        <span className='text-muted-foreground'>({selectedEntities.owner.email})</span>
                                    </div>
                                ) : (
                                    <span className='text-muted-foreground'>
                                        {t('admin.servers.form.select_owner')}
                                    </span>
                                )}
                            </div>
                            <Button
                                type='button'
                                size='icon'
                                onClick={() => {
                                    fetchOwners();
                                    setOwnerModalOpen(true);
                                }}
                            >
                                <Search className='h-4 w-4' />
                            </Button>
                        </div>
                        <p className='text-xs text-muted-foreground'>{t('admin.servers.form.owner_help')}</p>
                    </div>

                    <div className='flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50'>
                        <div className='space-y-0.5'>
                            <Label>{t('admin.servers.form.skip_scripts')}</Label>
                            <p className='text-xs text-muted-foreground'>{t('admin.servers.form.skip_scripts_help')}</p>
                        </div>
                        <Switch
                            checked={formData.skipScripts}
                            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, skipScripts: checked }))}
                        />
                    </div>
                </div>
            </PageCard>
        </div>
    );
}
