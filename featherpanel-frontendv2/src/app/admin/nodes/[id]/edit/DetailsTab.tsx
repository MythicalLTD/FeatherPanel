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

import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { Database } from 'lucide-react';

import { type NodeForm } from './page';

interface Location {
    id: number;
    name: string;
}

interface DetailsTabProps {
    form: NodeForm;
    setForm: React.Dispatch<React.SetStateAction<NodeForm>>;
    locations: Location[];
    errors: Record<string, string>;
}

export function DetailsTab({ form, setForm, locations, errors }: DetailsTabProps) {
    const { t } = useTranslation();

    return (
        <PageCard title={t('admin.node.form.basic_details')} icon={Database}>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                <div className='space-y-6'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.node.form.name')}</Label>
                        <Input
                            placeholder='My Production Node'
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
                            placeholder='A brief description of this node...'
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
                        <Select
                            value={form.location_id}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setForm({ ...form, location_id: e.target.value })
                            }
                            className={errors.location_id ? 'border-red-500' : ''}
                        >
                            <option value=''>{t('admin.node.form.select_location')}</option>
                            {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                    {loc.name}
                                </option>
                            ))}
                        </Select>
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
