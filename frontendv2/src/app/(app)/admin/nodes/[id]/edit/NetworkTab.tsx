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
