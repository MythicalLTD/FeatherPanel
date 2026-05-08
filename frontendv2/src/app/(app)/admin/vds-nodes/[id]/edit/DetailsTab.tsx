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

    const openLocationModal = () => {
        fetchLocations();
        setLocationModalOpen(true);
    };

    return (
        <PageCard title={t('admin.vdsNodes.form.basic_details')} icon={Database}>
            <div className='space-y-8'>
                <div className='space-y-6'>
                    <div>
                        <Label className='mb-2 block text-sm font-semibold'>{t('admin.vdsNodes.form.name')}</Label>
                        <Input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            error={!!errors.name}
                            placeholder='e.g., Node-01'
                            className='text-base'
                        />
                        {errors.name && (
                            <p className='mt-2 text-[10px] font-bold text-red-500 uppercase'>{errors.name}</p>
                        )}
                    </div>

                    <div>
                        <Label className='mb-2 block text-sm font-semibold'>
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

                <div className='border-border/50 border-t pt-8'>
                    <div>
                        <div className='mb-4 flex items-center gap-3'>
                            <div className='bg-primary/10 h-fit rounded-lg p-2'>
                                <MapPin className='text-primary h-5 w-5' />
                            </div>
                            <div>
                                <p className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                                    {t('admin.vdsNodes.form.location')}
                                </p>
                                <p className='text-muted-foreground mt-0.5 text-xs'>
                                    {t('admin.vdsNodes.form.select_location_description')}
                                </p>
                            </div>
                        </div>

                        <div className='ml-10 flex gap-2'>
                            <div
                                role='button'
                                tabIndex={0}
                                className='bg-muted/30 border-border/50 focus-visible:ring-ring flex h-11 flex-1 cursor-pointer items-center rounded-lg border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                                onClick={openLocationModal}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        openLocationModal();
                                    }
                                }}
                            >
                                {form.location_id && selectedLocationName ? (
                                    <span className='text-foreground font-medium'>{selectedLocationName}</span>
                                ) : (
                                    <span className='text-muted-foreground italic'>
                                        {t('admin.vdsNodes.form.select_location')}
                                    </span>
                                )}
                            </div>
                            <Button
                                type='button'
                                size='icon'
                                onClick={openLocationModal}
                                className='h-11 w-11 rounded-lg'
                            >
                                <Search className='h-4 w-4' />
                            </Button>
                        </div>
                        {errors.location_id && (
                            <p className='mt-2 text-[10px] font-bold text-red-500 uppercase'>{errors.location_id}</p>
                        )}
                    </div>
                </div>
            </div>
        </PageCard>
    );
}
