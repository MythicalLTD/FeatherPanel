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

import { useMemo } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/featherui/Button';
import { Select } from '@/components/ui/select-native';
import { Database, Search, MapPin } from 'lucide-react';
import { type WebNodeForm } from '../../types';

interface Location {
    id: number;
    name: string;
    description?: string;
}

interface DetailsTabProps {
    form: WebNodeForm;
    setForm: React.Dispatch<React.SetStateAction<WebNodeForm>>;
    errors: Record<string, string>;
    selectedLocationName: string;
    locations: Location[];
    setLocationModalOpen: (open: boolean) => void;
    fetchLocations: () => void;
}

export function DetailsTab({
    form,
    setForm,
    errors,
    selectedLocationName,
    locations,
    setLocationModalOpen,
    fetchLocations,
}: DetailsTabProps) {
    const { t } = useTranslation();

    const displayLocationName = useMemo(() => {
        if (selectedLocationName) return selectedLocationName;
        if (form.location_id) {
            const found = locations.find((loc) => loc.id.toString() === form.location_id);
            return found?.name || '';
        }
        return '';
    }, [selectedLocationName, form.location_id, locations]);

    const openLocationModal = () => {
        fetchLocations();
        setLocationModalOpen(true);
    };

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.webNodes.form.card_identity')}
                description={t('admin.webNodes.form.card_identity_description')}
                icon={Database}
            >
                <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.name')}</Label>
                        <Input
                            placeholder={t('admin.webNodes.form.name_placeholder')}
                            value={form.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, name: e.target.value })
                            }
                            error={!!errors.name}
                        />
                        {errors.name && <p className='text-[10px] font-bold text-red-500 uppercase'>{errors.name}</p>}
                    </div>
                    <div className='space-y-2 md:col-span-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.description')}</Label>
                        <Textarea
                            placeholder={t('admin.webNodes.form.description_placeholder')}
                            value={form.description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                setForm({ ...form, description: e.target.value })
                            }
                            className='min-h-[120px]'
                        />
                    </div>
                </div>
            </PageCard>

            <PageCard
                title={t('admin.webNodes.form.card_location_access')}
                description={t('admin.webNodes.form.card_location_access_description')}
                icon={MapPin}
            >
                <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.location')}</Label>
                        <div className='flex gap-2'>
                            <div
                                role='button'
                                tabIndex={0}
                                className='bg-muted/30 border-border/50 focus-visible:ring-ring flex h-11 flex-1 cursor-pointer items-center rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                                onClick={openLocationModal}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        openLocationModal();
                                    }
                                }}
                            >
                                {form.location_id && displayLocationName ? (
                                    <div className='flex items-center gap-2'>
                                        <MapPin className='text-primary h-4 w-4' />
                                        <span className='text-foreground font-medium'>{displayLocationName}</span>
                                    </div>
                                ) : (
                                    <span className='text-muted-foreground'>
                                        {t('admin.webNodes.form.select_location')}
                                    </span>
                                )}
                            </div>
                            <Button type='button' size='icon' onClick={openLocationModal}>
                                <Search className='h-4 w-4' />
                            </Button>
                        </div>
                        {errors.location_id && (
                            <p className='mt-1 text-[10px] font-bold text-red-500 uppercase'>{errors.location_id}</p>
                        )}
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.visibility')}</Label>
                        <Select
                            value={form.public}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setForm({ ...form, public: e.target.value })
                            }
                        >
                            <option value='true'>{t('admin.webNodes.form.visibility_public')}</option>
                            <option value='false'>{t('admin.webNodes.form.visibility_private')}</option>
                        </Select>
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.node.form.visibility_help')}
                        </p>
                    </div>
                </div>
            </PageCard>
        </div>
    );
}
