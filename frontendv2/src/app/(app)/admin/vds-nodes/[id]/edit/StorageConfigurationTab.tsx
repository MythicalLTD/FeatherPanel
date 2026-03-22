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

import axios from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select-native';
import { HardDrive, Loader2 } from 'lucide-react';
import type { VdsNodeForm } from './page';
import { TabSection } from './TabPrimitives';

interface StorageConfigurationTabProps {
    nodeId: string | number;
    form: VdsNodeForm;
    setForm: React.Dispatch<React.SetStateAction<VdsNodeForm>>;
    errors: Record<string, string>;
}

export function StorageConfigurationTab({ nodeId, form, setForm, errors }: StorageConfigurationTabProps) {
    const { t } = useTranslation();

    const [imageStorages, setImageStorages] = useState<string[]>([]);
    const [backupStorages, setBackupStorages] = useState<string[]>([]);
    const [storagesLoading, setStoragesLoading] = useState(false);
    const [storagesError, setStoragesError] = useState<string | null>(null);

    useEffect(() => {
        if (!nodeId) return;

        const loadStorages = async () => {
            setStoragesLoading(true);
            setStoragesError(null);
            try {
                const [storageRes, backupStorageRes] = await Promise.all([
                    axios.get(`/api/admin/vm-nodes/${nodeId}/storage`),
                    axios.get(`/api/admin/vm-nodes/${nodeId}/backup-storage`),
                ]);

                setImageStorages((storageRes.data.data?.storage ?? []) as string[]);
                setBackupStorages((backupStorageRes.data.data?.storages ?? []) as string[]);
            } catch (err) {
                const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
                setStoragesError(msg);
                toast.error(t('admin.vdsNodes.storage.fetch_failed'));
            } finally {
                setStoragesLoading(false);
            }
        };

        loadStorages();
    }, [nodeId, t]);

    return (
        <PageCard title={t('admin.vdsNodes.form.storage_config')} icon={HardDrive}>
            <div className='space-y-6'>
                <TabSection
                    title={t('admin.vdsNodes.storage.image_storages_title')}
                    description={t('admin.vdsNodes.storage.image_storages_description')}
                >
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                            <Label className='text-sm font-medium'>{t('admin.vdsNodes.form.efi_storage')}</Label>
                            <Select
                                value={form.storage_efi}
                                disabled={storagesLoading}
                                onChange={(e) => setForm({ ...form, storage_efi: e.target.value })}
                            >
                                <option value=''>{t('admin.vdsNodes.form.storage_auto')}</option>
                                {imageStorages.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </Select>
                            <p className='text-xs text-muted-foreground/70'>
                                {t('admin.vdsNodes.form.efi_storage_help')}
                            </p>
                        </div>

                        <div className='space-y-2'>
                            <Label className='text-sm font-medium'>{t('admin.vdsNodes.form.tpm_storage')}</Label>
                            <Select
                                value={form.storage_tpm}
                                disabled={storagesLoading}
                                onChange={(e) => setForm({ ...form, storage_tpm: e.target.value })}
                            >
                                <option value=''>{t('admin.vdsNodes.form.storage_auto')}</option>
                                {imageStorages.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </Select>
                            <p className='text-xs text-muted-foreground/70'>
                                {t('admin.vdsNodes.form.tpm_storage_help')}
                            </p>
                        </div>
                    </div>
                </TabSection>

                <TabSection
                    title={t('admin.vdsNodes.storage.backup_storage_title')}
                    description={t('admin.vdsNodes.storage.backup_storage_description')}
                >
                    <div className='space-y-3'>
                        <div className='space-y-2'>
                            <Label className='text-sm font-medium'>{t('admin.vdsNodes.form.backup_storage')}</Label>
                            <div className='flex items-center gap-2'>
                                <Select
                                    className='flex-1'
                                    value={form.storage_backups}
                                    disabled={storagesLoading}
                                    onChange={(e) => setForm({ ...form, storage_backups: e.target.value })}
                                >
                                    <option value=''>{t('admin.vdsNodes.form.storage_auto')}</option>
                                    {backupStorages.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </Select>
                                {storagesLoading && <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />}
                            </div>
                            <p className='text-xs text-muted-foreground/70'>
                                {t('admin.vdsNodes.form.backup_storage_help')}
                            </p>
                            {storagesError && (
                                <p className='text-[10px] uppercase font-bold text-red-500 mt-1'>{storagesError}</p>
                            )}
                            {errors.storage_backups && (
                                <p className='text-[10px] uppercase font-bold text-red-500 mt-1'>
                                    {errors.storage_backups}
                                </p>
                            )}
                        </div>
                    </div>
                </TabSection>
            </div>
        </PageCard>
    );
}
