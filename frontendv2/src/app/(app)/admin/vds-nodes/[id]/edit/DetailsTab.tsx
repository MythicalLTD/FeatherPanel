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
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                <div className='space-y-6'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.name')}</Label>
                        <Input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            error={!!errors.name}
                        />
                        {errors.name && (
                            <p className='text-[10px] uppercase font-bold text-red-500 mt-1'>{errors.name}</p>
                        )}
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.description')}</Label>
                        <Textarea
                            placeholder={t('admin.vdsNodes.form.description_placeholder')}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className='min-h-[120px]'
                        />
                    </div>
                </div>
                <div className='space-y-6'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.location')}</Label>
                        <div className='flex gap-2'>
                            <div className='flex-1 h-11 px-3 bg-muted/30 rounded-xl border border-border/50 text-sm flex items-center'>
                                {form.location_id && selectedLocationName ? (
                                    <div className='flex items-center gap-2'>
                                        <MapPin className='h-4 w-4 text-primary' />
                                        <span className='font-medium text-foreground'>{selectedLocationName}</span>
                                    </div>
                                ) : (
                                    <span className='text-muted-foreground'>
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
                            >
                                <Search className='h-4 w-4' />
                            </Button>
                        </div>
                        {errors.location_id && (
                            <p className='text-[10px] uppercase font-bold text-red-500 mt-1'>{errors.location_id}</p>
                        )}
                        <p className='text-xs text-muted-foreground/70 italic'>
                            {t('admin.vdsNodes.form.select_location_description')}
                        </p>
                    </div>
                </div>
            </div>
        </PageCard>
    );
}
