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

import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Input } from '@/components/featherui/Input';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { Layers, Network, Plug, ShieldCheck } from 'lucide-react';
import { type WebNodeForm } from '../../types';

interface NetworkTabProps {
    form: WebNodeForm;
    setForm: React.Dispatch<React.SetStateAction<WebNodeForm>>;
    errors: Record<string, string>;
}

export function NetworkTab({ form, setForm, errors }: NetworkTabProps) {
    const { t } = useTranslation();

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.webNodes.form.card_host_ssl')}
                description={t('admin.webNodes.form.card_host_ssl_description')}
                icon={Network}
            >
                <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                    <div className='space-y-2 md:col-span-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.fqdn')}</Label>
                        <Input
                            placeholder='web.node.example.com'
                            value={form.fqdn}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, fqdn: e.target.value })
                            }
                            error={!!errors.fqdn}
                        />
                        {errors.fqdn && <p className='text-[10px] font-bold text-red-500 uppercase'>{errors.fqdn}</p>}
                        <p className='text-muted-foreground/70 text-xs italic'>{t('admin.webNodes.form.fqdn_help')}</p>
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.ssl')}</Label>
                        <Select
                            value={form.scheme}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setForm({ ...form, scheme: e.target.value })
                            }
                        >
                            <option value='https'>{t('admin.webNodes.form.ssl_https')}</option>
                            <option value='http'>{t('admin.webNodes.form.ssl_http')}</option>
                        </Select>
                        {form.scheme === 'https' && (
                            <p className='text-xs font-medium text-yellow-500 italic'>
                                {t('admin.node.form.ssl_warning')}
                            </p>
                        )}
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.proxy')}</Label>
                        <Select
                            value={form.behind_proxy}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setForm({ ...form, behind_proxy: e.target.value })
                            }
                        >
                            <option value='false'>{t('admin.webNodes.form.proxy_none')}</option>
                            <option value='true'>{t('admin.webNodes.form.proxy_yes')}</option>
                        </Select>
                        <p className='text-muted-foreground/70 text-xs italic'>{t('admin.node.form.proxy_help')}</p>
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.proxy_enabled')}</Label>
                        <Select
                            value={form.proxyEnabled}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setForm({ ...form, proxyEnabled: e.target.value })
                            }
                        >
                            <option value='true'>{t('common.enabled')}</option>
                            <option value='false'>{t('common.disabled')}</option>
                        </Select>
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.proxy_enabled_help')}
                        </p>
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.proxy_provider')}</Label>
                        <Select
                            value={form.proxyProvider}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setForm({ ...form, proxyProvider: e.target.value })
                            }
                            disabled={form.proxyEnabled !== 'true'}
                        >
                            <option value='caddy'>Caddy</option>
                            <option value='nginx'>Nginx</option>
                            <option value='traefik'>Traefik</option>
                        </Select>
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.acme_email')}</Label>
                        <Input
                            type='email'
                            placeholder='admin@example.com'
                            value={form.acmeEmail}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, acmeEmail: e.target.value })
                            }
                            disabled={form.proxyEnabled !== 'true'}
                        />
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.acme_email_help')}
                        </p>
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.acme_staging')}</Label>
                        <Select
                            value={form.acmeStaging}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setForm({ ...form, acmeStaging: e.target.value })
                            }
                            disabled={form.proxyEnabled !== 'true'}
                        >
                            <option value='false'>{t('common.disabled')}</option>
                            <option value='true'>{t('common.enabled')}</option>
                        </Select>
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.acme_staging_help')}
                        </p>
                    </div>
                </div>
            </PageCard>

            <PageCard
                title={t('admin.webNodes.form.card_ports')}
                description={t('admin.webNodes.form.card_ports_description')}
                icon={Plug}
            >
                <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.daemon_port')}</Label>
                        <Input
                            type='number'
                            min={1}
                            max={65535}
                            value={form.daemonListen}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, daemonListen: parseInt(e.target.value, 10) || 0 })
                            }
                            error={!!errors.daemonListen}
                        />
                        {errors.daemonListen && (
                            <p className='text-[10px] font-bold text-red-500 uppercase'>{errors.daemonListen}</p>
                        )}
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.daemon_port_help')}
                        </p>
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.sftp_port')}</Label>
                        <Input
                            type='number'
                            min={1}
                            max={65535}
                            value={form.sftpPort}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, sftpPort: parseInt(e.target.value, 10) || 0 })
                            }
                            disabled={form.sftpEnabled !== 'true'}
                            error={!!errors.sftpPort}
                        />
                        {errors.sftpPort && (
                            <p className='text-[10px] font-bold text-red-500 uppercase'>{errors.sftpPort}</p>
                        )}
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.sftp_port_help')}
                        </p>
                    </div>
                </div>
            </PageCard>

            <PageCard
                title={t('admin.webNodes.form.card_backend_ports')}
                description={t('admin.webNodes.form.card_backend_ports_description')}
                icon={Layers}
            >
                <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.backend_port_min')}</Label>
                        <Input
                            type='number'
                            min={1}
                            max={65535}
                            value={form.backendPortMin}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, backendPortMin: parseInt(e.target.value, 10) || 0 })
                            }
                            error={!!errors.backendPortMin}
                        />
                        {errors.backendPortMin && (
                            <p className='text-[10px] font-bold text-red-500 uppercase'>{errors.backendPortMin}</p>
                        )}
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.backend_port_min_help')}
                        </p>
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.backend_port_max')}</Label>
                        <Input
                            type='number'
                            min={1}
                            max={65535}
                            value={form.backendPortMax}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, backendPortMax: parseInt(e.target.value, 10) || 0 })
                            }
                            error={!!errors.backendPortMax}
                        />
                        {errors.backendPortMax && (
                            <p className='text-[10px] font-bold text-red-500 uppercase'>{errors.backendPortMax}</p>
                        )}
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.backend_port_max_help')}
                        </p>
                    </div>
                    <div className='space-y-2 sm:col-span-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.proxy_backend_host')}</Label>
                        <Input
                            placeholder='127.0.0.1'
                            value={form.proxyBackendHost}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, proxyBackendHost: e.target.value })
                            }
                        />
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.proxy_backend_host_help')}
                        </p>
                    </div>
                    <div className='space-y-2 sm:col-span-2'>
                        <Label className='text-sm font-semibold'>
                            {t('admin.webNodes.form.proxy_backend_bind_host')}
                        </Label>
                        <Input
                            placeholder='127.0.0.1'
                            value={form.proxyBackendBindHost}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, proxyBackendBindHost: e.target.value })
                            }
                        />
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.proxy_backend_bind_host_help')}
                        </p>
                    </div>
                </div>
            </PageCard>

            <PageCard
                title={t('admin.webNodes.form.card_proxy_hint')}
                description={t('admin.webNodes.form.card_proxy_hint_description')}
                icon={ShieldCheck}
                variant='warning'
            >
                <p className='text-muted-foreground text-sm leading-relaxed'>
                    {t('admin.webNodes.form.network_ports_hint')}
                </p>
            </PageCard>
        </div>
    );
}
