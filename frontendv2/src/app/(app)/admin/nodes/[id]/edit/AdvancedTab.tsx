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
import { Shield } from 'lucide-react';

import { type NodeForm } from './page';

interface AdvancedTabProps {
    form: NodeForm;
    setForm: React.Dispatch<React.SetStateAction<NodeForm>>;
    errors: Record<string, string>;
}

export function AdvancedTab({ form, setForm, errors }: AdvancedTabProps) {
    const { t } = useTranslation();

    return (
        <PageCard title={t('admin.node.form.advanced')} icon={Shield}>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                <div className='space-y-6'>
                    <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>{t('admin.node.form.daemon_port')}</Label>
                            <Input
                                type='number'
                                value={form.daemonListen}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setForm({ ...form, daemonListen: parseInt(e.target.value) || 0 })
                                }
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>{t('admin.node.form.daemon_sftp_port')}</Label>
                            <Input
                                type='number'
                                value={form.daemonSFTP}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setForm({ ...form, daemonSFTP: parseInt(e.target.value) || 0 })
                                }
                            />
                        </div>
                    </div>
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>{t('admin.node.form.ipv4')}</Label>
                            <Input
                                placeholder='127.0.0.1'
                                value={form.public_ip_v4}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setForm({ ...form, public_ip_v4: e.target.value })
                                }
                                error={!!errors.public_ip_v4}
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>{t('admin.node.form.ipv6')}</Label>
                            <Input
                                placeholder='::1'
                                value={form.public_ip_v6}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setForm({ ...form, public_ip_v6: e.target.value })
                                }
                                error={!!errors.public_ip_v6}
                            />
                        </div>
                    </div>
                </div>
                <div className='space-y-6'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.node.form.maintenance')}</Label>
                        <Select
                            value={form.maintenance_mode}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setForm({ ...form, maintenance_mode: e.target.value })
                            }
                        >
                            <option value='false'>{t('admin.node.form.maintenance_disabled')}</option>
                            <option value='true'>{t('admin.node.form.maintenance_enabled')}</option>
                        </Select>
                        <p className='text-xs text-muted-foreground/70 italic'>
                            {t('admin.node.form.maintenance_help')}
                        </p>
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.node.form.upload_size')}</Label>
                        <div className='relative'>
                            <Input
                                type='number'
                                value={form.upload_size}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setForm({ ...form, upload_size: parseInt(e.target.value) || 0 })
                                }
                            />
                            <span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/50'>
                                {t('admin.node.form.memory_mib')}
                            </span>
                        </div>
                        <p className='text-xs text-muted-foreground/70 italic'>
                            {t('admin.node.form.upload_size_help')}
                        </p>
                    </div>
                </div>
            </div>
        </PageCard>
    );
}
