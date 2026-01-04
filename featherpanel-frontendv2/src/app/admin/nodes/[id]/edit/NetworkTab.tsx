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
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { Network } from 'lucide-react';

import { type NodeForm } from './page';

interface NetworkTabProps {
    form: NodeForm;
    setForm: React.Dispatch<React.SetStateAction<NodeForm>>;
    errors: Record<string, string>;
}

export function NetworkTab({ form, setForm, errors }: NetworkTabProps) {
    const { t } = useTranslation();

    return (
        <PageCard title={t('admin.node.form.network')} icon={Network}>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                <div className='space-y-6'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.node.form.fqdn')}</Label>
                        <Input
                            placeholder='node.example.com'
                            value={form.fqdn}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, fqdn: e.target.value })
                            }
                            error={!!errors.fqdn}
                        />
                        <p className='text-xs text-muted-foreground/70 italic'>{t('admin.node.form.fqdn_help')}</p>
                    </div>
                </div>
                <div className='space-y-6'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.node.form.ssl')}</Label>
                        <Select
                            value={form.scheme}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setForm({ ...form, scheme: e.target.value })
                            }
                        >
                            <option value='https'>{t('admin.node.form.ssl_https')}</option>
                            <option value='http'>{t('admin.node.form.ssl_http')}</option>
                        </Select>
                        {form.scheme === 'https' && (
                            <p className='text-xs text-yellow-500 font-medium italic'>
                                {t('admin.node.form.ssl_warning')}
                            </p>
                        )}
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.node.form.proxy')}</Label>
                        <Select
                            value={form.behind_proxy}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setForm({ ...form, behind_proxy: e.target.value })
                            }
                        >
                            <option value='false'>{t('admin.node.form.proxy_none')}</option>
                            <option value='true'>{t('admin.node.form.proxy_yes')}</option>
                        </Select>
                        <p className='text-xs text-muted-foreground/70 italic'>{t('admin.node.form.proxy_help')}</p>
                    </div>
                </div>
            </div>
        </PageCard>
    );
}
