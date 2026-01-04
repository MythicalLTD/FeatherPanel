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
                    {/* Server Name */}
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

                    {/* Server Description */}
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

                    {/* Server Owner */}
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

                    {/* Skip Scripts */}
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
