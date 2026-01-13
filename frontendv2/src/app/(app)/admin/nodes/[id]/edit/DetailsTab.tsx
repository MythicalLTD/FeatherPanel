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

import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/featherui/Button';
import { Database, Search, MapPin } from 'lucide-react';
import { Select } from '@/components/ui/select-native';
import { useMemo } from 'react';

import { type NodeForm } from './page';

interface Location {
    id: number;
    name: string;
    description?: string;
}

interface DetailsTabProps {
    form: NodeForm;
    setForm: React.Dispatch<React.SetStateAction<NodeForm>>;
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

    // Get location name from selectedLocationName or find in locations array
    const displayLocationName = useMemo(() => {
        if (selectedLocationName) return selectedLocationName;
        if (form.location_id) {
            const found = locations.find((loc) => loc.id.toString() === form.location_id);
            return found?.name || '';
        }
        return '';
    }, [selectedLocationName, form.location_id, locations]);

    return (
        <PageCard title={t('admin.node.form.basic_details')} icon={Database}>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                <div className='space-y-6'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.node.form.name')}</Label>
                        <Input
                            placeholder={t('admin.node.form.name_placeholder')}
                            value={form.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, name: e.target.value })
                            }
                            error={!!errors.name}
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.node.form.description')}</Label>
                        <Textarea
                            placeholder={t('admin.node.form.description_placeholder')}
                            value={form.description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                setForm({ ...form, description: e.target.value })
                            }
                            className='min-h-[120px]'
                        />
                    </div>
                </div>
                <div className='space-y-6'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.node.form.location')}</Label>
                        <div className='flex gap-2'>
                            <div className='flex-1 h-11 px-3 bg-muted/30 rounded-xl border border-border/50 text-sm flex items-center'>
                                {form.location_id && displayLocationName ? (
                                    <div className='flex items-center gap-2'>
                                        <MapPin className='h-4 w-4 text-primary' />
                                        <span className='font-medium text-foreground'>{displayLocationName}</span>
                                    </div>
                                ) : (
                                    <span className='text-muted-foreground'>
                                        {t('admin.node.form.select_location')}
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
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.node.form.visibility')}</Label>
                        <Select
                            value={form.public}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setForm({ ...form, public: e.target.value })
                            }
                        >
                            <option value='true'>{t('admin.node.form.visibility_public')}</option>
                            <option value='false'>{t('admin.node.form.visibility_private')}</option>
                        </Select>
                        <p className='text-xs text-muted-foreground/70 italic'>
                            {t('admin.node.form.visibility_help')}
                        </p>
                    </div>
                </div>
            </div>
        </PageCard>
    );
}
