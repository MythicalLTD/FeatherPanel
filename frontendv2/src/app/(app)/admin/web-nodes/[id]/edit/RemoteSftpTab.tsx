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
import { useSettings } from '@/contexts/SettingsContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Input } from '@/components/featherui/Input';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { Globe, KeyRound } from 'lucide-react';
import { CustomHeadersEditor } from '../../CustomHeadersEditor';
import { type WebNodeForm } from '../../types';

interface RemoteSftpTabProps {
    form: WebNodeForm;
    setForm: React.Dispatch<React.SetStateAction<WebNodeForm>>;
    errors: Record<string, string>;
}

export function RemoteSftpTab({ form, setForm, errors }: RemoteSftpTabProps) {
    const { t } = useTranslation();
    const { settings } = useSettings();
    const panelAppName = settings?.app_name?.trim() || 'FeatherPanel';

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.webNodes.form.card_remote_panel')}
                description={t('admin.webNodes.form.card_remote_panel_description')}
                icon={Globe}
            >
                <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                    <div className='space-y-2 md:col-span-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.remote_app_name')}</Label>
                        <Input value={panelAppName} readOnly disabled />
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.remote_app_name_help')}
                        </p>
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.remote_timeout')}</Label>
                        <div className='relative'>
                            <Input
                                type='number'
                                min={1}
                                value={form.remoteTimeout}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setForm({ ...form, remoteTimeout: parseInt(e.target.value, 10) || 0 })
                                }
                                error={!!errors.remoteTimeout}
                            />
                            <span className='text-muted-foreground/50 absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold'>
                                {t('admin.webNodes.form.seconds')}
                            </span>
                        </div>
                        {errors.remoteTimeout && (
                            <p className='text-[10px] font-bold text-red-500 uppercase'>{errors.remoteTimeout}</p>
                        )}
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.remote_timeout_help')}
                        </p>
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.remote_retry_limit')}</Label>
                        <Input
                            type='number'
                            min={0}
                            value={form.remoteRetryLimit}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, remoteRetryLimit: parseInt(e.target.value, 10) || 0 })
                            }
                            error={!!errors.remoteRetryLimit}
                        />
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.remote_retry_limit_help')}
                        </p>
                    </div>
                    <div className='md:col-span-2'>
                        <CustomHeadersEditor
                            entries={form.remoteCustomHeaderEntries}
                            onChange={(remoteCustomHeaderEntries) => setForm({ ...form, remoteCustomHeaderEntries })}
                            error={errors.remoteCustomHeaders}
                        />
                    </div>
                </div>
            </PageCard>

            <PageCard
                title={t('admin.webNodes.form.card_sftp_auth')}
                description={t('admin.webNodes.form.card_sftp_auth_description')}
                icon={KeyRound}
            >
                <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.sftp_enabled')}</Label>
                        <Select
                            value={form.sftpEnabled}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setForm({ ...form, sftpEnabled: e.target.value })
                            }
                        >
                            <option value='true'>{t('admin.webNodes.form.sftp_enabled_yes')}</option>
                            <option value='false'>{t('admin.webNodes.form.sftp_enabled_no')}</option>
                        </Select>
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.sftp_enabled_help')}
                        </p>
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.sftp_key_algorithm')}</Label>
                        <Select
                            value={form.sftpKeyAlgorithm}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setForm({ ...form, sftpKeyAlgorithm: e.target.value })
                            }
                            disabled={form.sftpEnabled !== 'true'}
                        >
                            <option value='ssh-ed25519'>ssh-ed25519</option>
                            <option value='rsa-sha2-512'>rsa-sha2-512</option>
                            <option value='rsa-sha2-256'>rsa-sha2-256</option>
                            <option value='ecdsa-sha2-nistp256'>ecdsa-sha2-nistp256</option>
                        </Select>
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.sftp_key_algorithm_help')}
                        </p>
                    </div>
                    <div className='space-y-2 md:col-span-2'>
                        <Label className='text-sm font-semibold'>
                            {t('admin.webNodes.form.sftp_disable_password_auth')}
                        </Label>
                        <Select
                            value={form.sftpDisablePasswordAuth}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setForm({ ...form, sftpDisablePasswordAuth: e.target.value })
                            }
                            disabled={form.sftpEnabled !== 'true'}
                        >
                            <option value='false'>{t('admin.webNodes.form.sftp_disable_password_auth_no')}</option>
                            <option value='true'>{t('admin.webNodes.form.sftp_disable_password_auth_yes')}</option>
                        </Select>
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.sftp_disable_password_auth_help')}
                        </p>
                    </div>
                </div>
            </PageCard>

            <PageCard
                title={t('admin.webNodes.form.card_classic_ftp')}
                description={t('admin.webNodes.form.card_classic_ftp_description')}
                icon={KeyRound}
            >
                <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                    <div className='space-y-2 md:col-span-2'>
                        <p className='text-muted-foreground rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs leading-relaxed'>
                            {t('admin.webNodes.form.ftp_security_note')}
                        </p>
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.ftp_enabled')}</Label>
                        <Select
                            value={form.ftpEnabled}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setForm({ ...form, ftpEnabled: e.target.value })
                            }
                        >
                            <option value='false'>{t('admin.webNodes.form.ftp_enabled_no')}</option>
                            <option value='true'>{t('admin.webNodes.form.ftp_enabled_yes')}</option>
                        </Select>
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.ftp_enabled_help')}
                        </p>
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.ftp_port')}</Label>
                        <Input
                            type='number'
                            min={1}
                            max={65535}
                            value={form.ftpPort}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, ftpPort: parseInt(e.target.value, 10) || 21 })
                            }
                            disabled={form.ftpEnabled !== 'true'}
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.ftp_passive_min')}</Label>
                        <Input
                            type='number'
                            min={1024}
                            max={65535}
                            value={form.ftpPassivePortMin}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, ftpPassivePortMin: parseInt(e.target.value, 10) || 50000 })
                            }
                            disabled={form.ftpEnabled !== 'true'}
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.ftp_passive_max')}</Label>
                        <Input
                            type='number'
                            min={1024}
                            max={65535}
                            value={form.ftpPassivePortMax}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, ftpPassivePortMax: parseInt(e.target.value, 10) || 50100 })
                            }
                            disabled={form.ftpEnabled !== 'true'}
                        />
                    </div>
                </div>
            </PageCard>
        </div>
    );
}
