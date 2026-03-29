/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studio
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/featherui/Button';
import { Database, Search, MapPin } from 'lucide-react';
import type { VdsNodeForm } from './page';

interface DetailsTabProps {
    nodeId: string | number;
    form: VdsNodeForm;
    setForm: React.Dispatch<React.SetStateAction<VdsNodeForm>>;
    errors: Record<string, string>;
    selectedLocationName: string;
    setLocationModalOpen: (open: boolean) => void;
    fetchLocations: () => void;
}

export function DetailsTab({
    form,
    setForm,
    errors,
    selectedLocationName,
    setLocationModalOpen,
    fetchLocations,
}: DetailsTabProps) {
    const { t } = useTranslation();

    return (
        <PageCard title={t('admin.vdsNodes.form.basic_details')} icon={Database}>
            <div className='space-y-8'>
                <div className='space-y-6'>
                    <div>
                        <Label className='text-sm font-semibold block mb-2'>{t('admin.vdsNodes.form.name')}</Label>
                        <Input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            error={!!errors.name}
                            placeholder='e.g., Node-01'
                            className='text-base'
                        />
                        {errors.name && (
                            <p className='text-[10px] uppercase font-bold text-red-500 mt-2'>{errors.name}</p>
                        )}
                    </div>

                    <div>
                        <Label className='text-sm font-semibold block mb-2'>
                            {t('admin.vdsNodes.form.description')}
                        </Label>
                        <Textarea
                            placeholder={t('admin.vdsNodes.form.description_placeholder')}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className='min-h-[100px] rounded-lg'
                        />
                    </div>
                </div>

                <div className='border-t border-border/50 pt-8'>
                    <div>
                        <div className='flex items-center gap-3 mb-4'>
                            <div className='p-2 rounded-lg bg-primary/10 h-fit'>
                                <MapPin className='h-5 w-5 text-primary' />
                            </div>
                            <div>
                                <p className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                                    {t('admin.vdsNodes.form.location')}
                                </p>
                                <p className='text-xs text-muted-foreground mt-0.5'>
                                    {t('admin.vdsNodes.form.select_location_description')}
                                </p>
                            </div>
                        </div>

                        <div className='flex gap-2 ml-10'>
                            <div className='flex-1 h-11 px-3 bg-muted/30 rounded-lg border border-border/50 text-sm flex items-center'>
                                {form.location_id && selectedLocationName ? (
                                    <span className='font-medium text-foreground'>{selectedLocationName}</span>
                                ) : (
                                    <span className='text-muted-foreground italic'>
                                        {t('admin.vdsNodes.form.select_location')}
                                    </span>
                                )}
                            </div>
                            <Button
                                type='button'
                                size='icon'
                                onClick={() => {
                                    fetchLocations();
                                    setLocationModalOpen(true);
                                }}
                                className='h-11 w-11 rounded-lg'
                            >
                                <Search className='h-4 w-4' />
                            </Button>
                        </div>
                        {errors.location_id && (
                            <p className='text-[10px] uppercase font-bold text-red-500 mt-2'>{errors.location_id}</p>
                        )}
                    </div>
                </div>
            </div>
        </PageCard>
    );
}
