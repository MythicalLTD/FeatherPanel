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
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select-native';
import { Network } from 'lucide-react';
import type { VdsNodeForm } from './page';
import { TabHintCard } from './TabPrimitives';

interface ConnectionTabProps {
    form: VdsNodeForm;
    setForm: React.Dispatch<React.SetStateAction<VdsNodeForm>>;
    errors: Record<string, string>;
}

export function ConnectionTab({ form, setForm, errors }: ConnectionTabProps) {
    const { t } = useTranslation();

    return (
        <div className='space-y-8'>
            <PageCard title={t('admin.vdsNodes.form.proxmox')} icon={Network}>
                <div className='space-y-8'>
                    <div className='space-y-6'>
                        <div>
                            <Label className='text-sm font-semibold block mb-2'>{t('admin.vdsNodes.form.user')}</Label>
                            <Input
                                placeholder='root@pam'
                                value={form.user}
                                onChange={(e) => setForm({ ...form, user: e.target.value })}
                                error={!!errors.user}
                                className='text-base'
                            />
                            {errors.user && (
                                <p className='text-[10px] uppercase font-bold text-red-500 mt-2'>{errors.user}</p>
                            )}
                            <p className='text-xs text-muted-foreground mt-2'>{t('admin.vdsNodes.form.user_help')}</p>
                        </div>

                        <div>
                            <Label className='text-sm font-semibold block mb-2'>
                                {t('admin.vdsNodes.form.token_id')}
                            </Label>
                            <Input
                                placeholder='mytoken'
                                value={form.token_id}
                                onChange={(e) => setForm({ ...form, token_id: e.target.value })}
                                error={!!errors.token_id}
                                className='text-base'
                            />
                            {errors.token_id && (
                                <p className='text-[10px] uppercase font-bold text-red-500 mt-2'>{errors.token_id}</p>
                            )}
                            <p className='text-xs text-muted-foreground mt-2'>
                                {t('admin.vdsNodes.form.token_id_help')}
                            </p>
                        </div>

                        <div>
                            <Label className='text-sm font-semibold block mb-2'>
                                {t('admin.vdsNodes.form.secret')}
                            </Label>
                            <Input
                                type='password'
                                placeholder='••••••••'
                                value={form.secret}
                                onChange={(e) => setForm({ ...form, secret: e.target.value })}
                                className='text-base'
                            />
                            <p className='text-xs text-muted-foreground mt-2'>{t('admin.vdsNodes.form.secret_help')}</p>
                        </div>
                    </div>

                    <div className='border-t border-border/50 pt-8'>
                        <div className='space-y-6'>
                            <div>
                                <Label className='text-sm font-semibold block mb-2'>
                                    {t('admin.vdsNodes.form.fqdn')}
                                </Label>
                                <Input
                                    placeholder='proxmox.example.com'
                                    value={form.fqdn}
                                    onChange={(e) => setForm({ ...form, fqdn: e.target.value })}
                                    error={!!errors.fqdn}
                                    className='text-base'
                                />
                                {errors.fqdn && (
                                    <p className='text-[10px] uppercase font-bold text-red-500 mt-2'>{errors.fqdn}</p>
                                )}
                            </div>

                            <div className='grid grid-cols-2 gap-4'>
                                <div>
                                    <Label className='text-sm font-semibold block mb-2'>
                                        {t('admin.vdsNodes.form.scheme')}
                                    </Label>
                                    <Select
                                        value={form.scheme}
                                        onChange={(e) =>
                                            setForm({ ...form, scheme: e.target.value as 'http' | 'https' })
                                        }
                                        className='text-base h-11 px-3 rounded-lg'
                                    >
                                        <option value='https'>{t('admin.vdsNodes.form.scheme_https')}</option>
                                        <option value='http'>{t('admin.vdsNodes.form.scheme_http')}</option>
                                    </Select>
                                </div>
                                <div>
                                    <Label className='text-sm font-semibold block mb-2'>
                                        {t('admin.vdsNodes.form.port')}
                                    </Label>
                                    <Input
                                        type='number'
                                        value={form.port}
                                        onChange={(e) => setForm({ ...form, port: parseInt(e.target.value, 10) || 0 })}
                                        error={!!errors.port}
                                        className='text-base'
                                    />
                                    {errors.port && (
                                        <p className='text-[10px] uppercase font-bold text-red-500 mt-2'>
                                            {errors.port}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label className='text-sm font-semibold block mb-2'>
                                    {t('admin.vdsNodes.form.tls_no_verify')}
                                </Label>
                                <Select
                                    value={form.tls_no_verify}
                                    onChange={(e) =>
                                        setForm({ ...form, tls_no_verify: e.target.value as 'true' | 'false' })
                                    }
                                    className='text-base h-11 px-3 rounded-lg'
                                >
                                    <option value='false'>{t('admin.vdsNodes.form.tls_no_verify_false')}</option>
                                    <option value='true'>{t('admin.vdsNodes.form.tls_no_verify_true')}</option>
                                </Select>
                            </div>

                            <div>
                                <Label className='text-sm font-semibold block mb-2'>
                                    {t('admin.vdsNodes.form.timeout')}
                                </Label>
                                <Input
                                    type='number'
                                    value={form.timeout}
                                    onChange={(e) => setForm({ ...form, timeout: parseInt(e.target.value, 10) || 0 })}
                                    error={!!errors.timeout}
                                    className='text-base'
                                />
                                {errors.timeout && (
                                    <p className='text-[10px] uppercase font-bold text-red-500 mt-2'>
                                        {errors.timeout}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <TabHintCard
                        icon={Network}
                        title={t('admin.vdsNodes.connection.token_setup_reminder_title')}
                        description={t('admin.vdsNodes.connection.token_setup_reminder_description')}
                    />
                </div>
            </PageCard>
        </div>
    );
}
