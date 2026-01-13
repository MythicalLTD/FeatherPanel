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
import { Label } from '@/components/ui/label';
import { Settings2 } from 'lucide-react';

import { type NodeForm } from './page';

interface ConfigurationTabProps {
    form: NodeForm;
    setForm: React.Dispatch<React.SetStateAction<NodeForm>>;
    errors: Record<string, string>;
}

export function ConfigurationTab({ form, setForm, errors }: ConfigurationTabProps) {
    const { t } = useTranslation();

    return (
        <PageCard title={t('admin.node.form.configuration')} icon={Settings2}>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                <div className='space-y-6'>
                    <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>{t('admin.node.form.memory')}</Label>
                            <div className='relative'>
                                <Input
                                    type='number'
                                    value={form.memory}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({ ...form, memory: parseInt(e.target.value) || 0 })
                                    }
                                />
                                <span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/50'>
                                    {t('admin.node.form.memory_mib')}
                                </span>
                            </div>
                        </div>
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>{t('admin.node.form.memory_overallocate')}</Label>
                            <div className='relative'>
                                <Input
                                    type='number'
                                    value={form.memory_overallocate}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({
                                            ...form,
                                            memory_overallocate: parseInt(e.target.value) || 0,
                                        })
                                    }
                                />
                                <span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/50'>
                                    %
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>{t('admin.node.form.disk')}</Label>
                            <div className='relative'>
                                <Input
                                    type='number'
                                    value={form.disk}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({ ...form, disk: parseInt(e.target.value) || 0 })
                                    }
                                />
                                <span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/50'>
                                    {t('admin.node.form.memory_mib')}
                                </span>
                            </div>
                        </div>
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>{t('admin.node.form.disk_overallocate')}</Label>
                            <div className='relative'>
                                <Input
                                    type='number'
                                    value={form.disk_overallocate}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({
                                            ...form,
                                            disk_overallocate: parseInt(e.target.value) || 0,
                                        })
                                    }
                                />
                                <span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/50'>
                                    %
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='space-y-6'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.node.form.daemon_base')}</Label>
                        <Input
                            placeholder='/var/lib/featherpanel/volumes'
                            value={form.daemonBase}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, daemonBase: e.target.value })
                            }
                            error={!!errors.daemonBase}
                        />
                        <p className='text-xs text-muted-foreground/70 italic'>
                            {t('admin.node.form.daemon_base_help')}
                        </p>
                    </div>
                </div>
            </div>
        </PageCard>
    );
}
