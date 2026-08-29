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
import { Textarea } from '@/components/featherui/Textarea';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { Settings2, FolderTree, Braces, Cloud } from 'lucide-react';
import { type WebNodeForm } from '../../types';

interface ConfigurationTabProps {
    form: WebNodeForm;
    setForm: React.Dispatch<React.SetStateAction<WebNodeForm>>;
    errors: Record<string, string>;
}

export function ConfigurationTab({ form, setForm, errors }: ConfigurationTabProps) {
    const { t } = useTranslation();

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.webNodes.form.card_resources')}
                description={t('admin.webNodes.form.card_resources_description')}
                icon={Settings2}
            >
                <div className='space-y-6'>
                    <div className='max-w-md space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.daemon_type')}</Label>
                        <Input value='FeatherQuilld' disabled readOnly />
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.daemon_type_immutable_help')}
                        </p>
                    </div>
                    <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'>
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>{t('admin.webNodes.form.memory')}</Label>
                            <div className='relative'>
                                <Input
                                    type='number'
                                    value={form.memory}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({ ...form, memory: parseInt(e.target.value, 10) || 0 })
                                    }
                                />
                                <span className='text-muted-foreground/50 absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold'>
                                    {t('admin.node.form.memory_mib')}
                                </span>
                            </div>
                        </div>
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>
                                {t('admin.webNodes.form.memory_overallocate')}
                            </Label>
                            <div className='relative'>
                                <Input
                                    type='number'
                                    value={form.memory_overallocate}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({
                                            ...form,
                                            memory_overallocate: parseInt(e.target.value, 10) || 0,
                                        })
                                    }
                                />
                                <span className='text-muted-foreground/50 absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold'>
                                    %
                                </span>
                            </div>
                        </div>
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>{t('admin.webNodes.form.disk')}</Label>
                            <div className='relative'>
                                <Input
                                    type='number'
                                    value={form.disk}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({ ...form, disk: parseInt(e.target.value, 10) || 0 })
                                    }
                                />
                                <span className='text-muted-foreground/50 absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold'>
                                    {t('admin.node.form.memory_mib')}
                                </span>
                            </div>
                        </div>
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>
                                {t('admin.webNodes.form.disk_overallocate')}
                            </Label>
                            <div className='relative'>
                                <Input
                                    type='number'
                                    value={form.disk_overallocate}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({
                                            ...form,
                                            disk_overallocate: parseInt(e.target.value, 10) || 0,
                                        })
                                    }
                                />
                                <span className='text-muted-foreground/50 absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold'>
                                    %
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </PageCard>

            <PageCard
                title={t('admin.webNodes.form.card_storage_paths')}
                description={t('admin.webNodes.form.card_storage_paths_description')}
                icon={FolderTree}
            >
                <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                    <div className='space-y-2 md:col-span-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.daemon_base')}</Label>
                        <Input
                            placeholder='/var/lib/featherquilld'
                            value={form.daemonBase}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, daemonBase: e.target.value })
                            }
                            error={!!errors.daemonBase}
                        />
                        {errors.daemonBase && (
                            <p className='text-[10px] font-bold text-red-500 uppercase'>{errors.daemonBase}</p>
                        )}
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.daemon_base_help')}
                        </p>
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.websites_path')}</Label>
                        <Input
                            placeholder='/var/lib/featherquilld/volumes'
                            value={form.websitesPath}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, websitesPath: e.target.value })
                            }
                        />
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.websites_path_help')}
                        </p>
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.backups_path')}</Label>
                        <Input
                            placeholder='/var/lib/featherquilld/backups'
                            value={form.backupsPath}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, backupsPath: e.target.value })
                            }
                        />
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.backups_path_help')}
                        </p>
                    </div>
                    <div className='space-y-2 md:col-span-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.addons_path')}</Label>
                        <Input
                            placeholder='/var/lib/featherquilld/plugins'
                            value={form.addonsPath}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setForm({ ...form, addonsPath: e.target.value })
                            }
                        />
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.addons_path_help')}
                        </p>
                    </div>
                </div>
            </PageCard>

            <PageCard
                title={t('admin.webNodes.form.card_backups_provider')}
                description={t('admin.webNodes.form.card_backups_provider_description')}
                icon={Cloud}
            >
                <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                    <div className='space-y-2 md:col-span-2'>
                        <Label className='text-sm font-semibold'>{t('admin.webNodes.form.backups_provider')}</Label>
                        <Select
                            value={form.backupsProvider}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                setForm({ ...form, backupsProvider: e.target.value })
                            }
                        >
                            <option value='local'>Local</option>
                            <option value='s3'>S3-compatible</option>
                            <option value='restic'>Restic</option>
                            <option value='pbs'>Proxmox Backup Server</option>
                        </Select>
                        <p className='text-muted-foreground/70 text-xs italic'>
                            {t('admin.webNodes.form.backups_provider_help')}
                        </p>
                    </div>
                    {form.backupsProvider === 's3' && (
                        <>
                            <div className='space-y-2'>
                                <Label className='text-sm font-semibold'>
                                    {t('admin.webNodes.form.backups_s3_endpoint')}
                                </Label>
                                <Input
                                    placeholder='https://s3.amazonaws.com (empty = AWS default)'
                                    value={form.backupsS3Endpoint}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({ ...form, backupsS3Endpoint: e.target.value })
                                    }
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-sm font-semibold'>
                                    {t('admin.webNodes.form.backups_s3_region')}
                                </Label>
                                <Input
                                    placeholder='us-east-1'
                                    value={form.backupsS3Region}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({ ...form, backupsS3Region: e.target.value })
                                    }
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-sm font-semibold'>
                                    {t('admin.webNodes.form.backups_s3_bucket')}
                                </Label>
                                <Input
                                    placeholder='featherquilld-backups'
                                    value={form.backupsS3Bucket}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({ ...form, backupsS3Bucket: e.target.value })
                                    }
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-sm font-semibold'>
                                    {t('admin.webNodes.form.backups_s3_prefix')}
                                </Label>
                                <Input
                                    placeholder='webspaces/'
                                    value={form.backupsS3Prefix}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({ ...form, backupsS3Prefix: e.target.value })
                                    }
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-sm font-semibold'>
                                    {t('admin.webNodes.form.backups_s3_access_key')}
                                </Label>
                                <Input
                                    value={form.backupsS3AccessKey}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({ ...form, backupsS3AccessKey: e.target.value })
                                    }
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-sm font-semibold'>
                                    {t('admin.webNodes.form.backups_s3_secret_key')}
                                </Label>
                                <Input
                                    type='password'
                                    autoComplete='new-password'
                                    value={form.backupsS3SecretKey}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({ ...form, backupsS3SecretKey: e.target.value })
                                    }
                                />
                            </div>
                            <div className='space-y-2 md:col-span-2'>
                                <Label className='text-sm font-semibold'>
                                    {t('admin.webNodes.form.backups_s3_force_path_style')}
                                </Label>
                                <Select
                                    value={form.backupsS3ForcePathStyle}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                        setForm({ ...form, backupsS3ForcePathStyle: e.target.value })
                                    }
                                >
                                    <option value='false'>{t('common.no')}</option>
                                    <option value='true'>{t('common.yes')}</option>
                                </Select>
                                <p className='text-muted-foreground/70 text-xs italic'>
                                    {t('admin.webNodes.form.backups_s3_force_path_style_help')}
                                </p>
                            </div>
                        </>
                    )}
                    {form.backupsProvider === 'restic' && (
                        <>
                            <div className='space-y-2 md:col-span-2'>
                                <Label className='text-sm font-semibold'>
                                    {t('admin.webNodes.form.backups_restic_repository')}
                                </Label>
                                <Input
                                    placeholder='s3:s3.amazonaws.com/bucket or /var/backups/restic'
                                    value={form.backupsResticRepository}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({ ...form, backupsResticRepository: e.target.value })
                                    }
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-sm font-semibold'>
                                    {t('admin.webNodes.form.backups_restic_password')}
                                </Label>
                                <Input
                                    type='password'
                                    autoComplete='new-password'
                                    value={form.backupsResticPassword}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({ ...form, backupsResticPassword: e.target.value })
                                    }
                                />
                                <p className='text-muted-foreground/70 text-xs italic'>
                                    Leave blank on update to keep the current password.
                                </p>
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-sm font-semibold'>
                                    {t('admin.webNodes.form.backups_restic_binary')}
                                </Label>
                                <Input
                                    placeholder='restic'
                                    value={form.backupsResticBinary}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({ ...form, backupsResticBinary: e.target.value })
                                    }
                                />
                            </div>
                        </>
                    )}
                    {form.backupsProvider === 'pbs' && (
                        <>
                            <div className='space-y-2 md:col-span-2'>
                                <Label className='text-sm font-semibold'>
                                    {t('admin.webNodes.form.backups_pbs_repository')}
                                </Label>
                                <Input
                                    placeholder='user@pbs@host:datastore'
                                    value={form.backupsPbsRepository}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({ ...form, backupsPbsRepository: e.target.value })
                                    }
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-sm font-semibold'>
                                    {t('admin.webNodes.form.backups_pbs_password')}
                                </Label>
                                <Input
                                    type='password'
                                    autoComplete='new-password'
                                    value={form.backupsPbsPassword}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({ ...form, backupsPbsPassword: e.target.value })
                                    }
                                />
                                <p className='text-muted-foreground/70 text-xs italic'>
                                    Leave blank on update to keep the current password.
                                </p>
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-sm font-semibold'>
                                    {t('admin.webNodes.form.backups_pbs_fingerprint')}
                                </Label>
                                <Input
                                    placeholder='optional SHA256 fingerprint'
                                    value={form.backupsPbsFingerprint}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({ ...form, backupsPbsFingerprint: e.target.value })
                                    }
                                />
                            </div>
                            <div className='space-y-2 md:col-span-2'>
                                <Label className='text-sm font-semibold'>
                                    {t('admin.webNodes.form.backups_pbs_binary')}
                                </Label>
                                <Input
                                    placeholder='proxmox-backup-client'
                                    value={form.backupsPbsBinary}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                        setForm({ ...form, backupsPbsBinary: e.target.value })
                                    }
                                />
                            </div>
                        </>
                    )}
                </div>
            </PageCard>

            <PageCard
                title={t('admin.webNodes.form.config_overrides')}
                description={t('admin.webNodes.form.card_config_overrides_description')}
                icon={Braces}
            >
                <div className='space-y-2'>
                    <Textarea
                        value={form.quilldConfigOverrides}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setForm({ ...form, quilldConfigOverrides: e.target.value })
                        }
                        className='min-h-[160px] font-mono text-xs'
                        placeholder={'{\n  "api": { "port": 8989 },\n  "docker": { "enable_native_kvm": true }\n}'}
                    />
                    <p className='text-muted-foreground/70 text-xs italic'>
                        {t('admin.webNodes.form.config_overrides_help')}
                    </p>
                </div>
            </PageCard>
        </div>
    );
}
