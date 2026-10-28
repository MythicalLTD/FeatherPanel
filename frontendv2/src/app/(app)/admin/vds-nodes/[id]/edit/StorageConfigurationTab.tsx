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
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { getApiErrorMessage } from '@/lib/api-errors';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select-native';
import { HardDrive, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VdsNodeForm } from './page';
import { TabSection } from './TabPrimitives';

interface IsoFile {
    volid: string;
    name: string;
    storage: string;
    size: number;
}

interface StorageConfigurationTabProps {
    nodeId: string | number;
    form: VdsNodeForm;
    setForm: React.Dispatch<React.SetStateAction<VdsNodeForm>>;
    errors: Record<string, string>;
}

function parseCsv(value: string): string[] {
    return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

export function StorageConfigurationTab({ nodeId, form, setForm, errors }: StorageConfigurationTabProps) {
    const { t } = useTranslation();

    const [imageStorages, setImageStorages] = useState<string[]>([]);
    const [backupStorages, setBackupStorages] = useState<string[]>([]);
    const [isoStorages, setIsoStorages] = useState<string[]>([]);
    const [isoFiles, setIsoFiles] = useState<IsoFile[]>([]);
    const [storagesLoading, setStoragesLoading] = useState(false);
    const [storagesError, setStoragesError] = useState<string | null>(null);

    const allowedSet = useMemo(() => new Set(parseCsv(form.storage_iso_allowed)), [form.storage_iso_allowed]);

    useEffect(() => {
        if (!nodeId) return;

        const loadStorages = async () => {
            setStoragesLoading(true);
            setStoragesError(null);
            try {
                const [storageRes, backupStorageRes, isoStorageRes] = await Promise.all([
                    axios.get(`/api/admin/vm-nodes/${nodeId}/storage`),
                    axios.get(`/api/admin/vm-nodes/${nodeId}/backup-storage`),
                    axios.get(`/api/admin/vm-nodes/${nodeId}/iso-storage`),
                ]);

                setImageStorages((storageRes.data.data?.storage ?? []) as string[]);
                setBackupStorages((backupStorageRes.data.data?.storages ?? []) as string[]);
                setIsoStorages((isoStorageRes.data.data?.storages ?? []) as string[]);
                setIsoFiles((isoStorageRes.data.data?.files ?? []) as IsoFile[]);
            } catch (err) {
                setStoragesError(getApiErrorMessage(err, t, 'admin.vdsNodes.storage.fetch_failed'));
                toast.error(t('admin.vdsNodes.storage.fetch_failed'));
            } finally {
                setStoragesLoading(false);
            }
        };

        loadStorages();
    }, [nodeId, t]);

    const toggleAllowedStorage = (storage: string) => {
        const next = new Set(allowedSet);
        if (next.has(storage)) next.delete(storage);
        else next.add(storage);
        setForm({ ...form, storage_iso_allowed: [...next].sort().join(',') });
    };

    const rescueOptions = useMemo(() => {
        const allowed = parseCsv(form.storage_iso_allowed);
        const files = allowed.length === 0 ? isoFiles : isoFiles.filter((f) => allowed.includes(f.storage));
        if (form.rescue_iso && !files.some((f) => f.volid === form.rescue_iso)) {
            return [{ volid: form.rescue_iso, name: form.rescue_iso, storage: '', size: 0 }, ...files];
        }
        return files;
    }, [isoFiles, form.storage_iso_allowed, form.rescue_iso]);

    return (
        <PageCard title={t('admin.vdsNodes.form.storage_config')} icon={HardDrive}>
            <div className='space-y-6'>
                <TabSection
                    title={t('admin.vdsNodes.storage.image_storages_title')}
                    description={t('admin.vdsNodes.storage.image_storages_description')}
                >
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
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
                            <p className='text-muted-foreground/70 text-xs'>
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
                            <p className='text-muted-foreground/70 text-xs'>
                                {t('admin.vdsNodes.form.tpm_storage_help')}
                            </p>
                        </div>
                    </div>
                </TabSection>

                <div className='border-border/40 bg-muted/30 rounded-lg border p-4'>
                    <p className='text-foreground text-sm font-medium'>
                        {t('ui.admin.vdsNodes.edit.storageConfigurationTab.tipPreventQemuImgResizeTimeouts')}
                    </p>
                    <p className='text-muted-foreground mt-1 text-xs'>
                        {t('ui.admin.vdsNodes.edit.storageConfigurationTab.ifVMCreatesFailWith')}{' '}
                        <code className='text-foreground'>qemu-img resize … got timeout</code>, disable metadata
                        preallocation on the Proxmox storage that holds VM disks (replace{' '}
                        <code className='text-foreground'>raid1</code> with your storage ID from{' '}
                        <code className='text-foreground'>pvesm status</code>):
                    </p>
                    <pre className='bg-muted/60 mt-2 overflow-x-auto rounded-md p-3 text-xs'>
                        <code>pvesm set raid1 --preallocation off</code>
                    </pre>
                </div>

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
                                {storagesLoading && <Loader2 className='text-muted-foreground h-4 w-4 animate-spin' />}
                            </div>
                            <p className='text-muted-foreground/70 text-xs'>
                                {t('admin.vdsNodes.form.backup_storage_help')}
                            </p>
                            {storagesError && <p className='mt-1 text-xs font-medium text-red-500'>{storagesError}</p>}
                            {errors.storage_backups && (
                                <p className='mt-1 text-xs font-medium text-red-500'>{errors.storage_backups}</p>
                            )}
                        </div>
                    </div>
                </TabSection>

                <TabSection
                    title={t('admin.vdsNodes.storage.iso_title')}
                    description={t('admin.vdsNodes.storage.iso_description')}
                >
                    <div className='space-y-5'>
                        <div className='space-y-2'>
                            <Label className='text-sm font-medium'>{t('admin.vdsNodes.form.iso_user_storage')}</Label>
                            <Select
                                value={form.storage_iso_user}
                                disabled={storagesLoading}
                                onChange={(e) => setForm({ ...form, storage_iso_user: e.target.value })}
                            >
                                <option value=''>{t('admin.vdsNodes.form.iso_user_storage_none')}</option>
                                {isoStorages.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </Select>
                            <p className='text-muted-foreground/70 text-xs'>
                                {t('admin.vdsNodes.form.iso_user_storage_help')}
                            </p>
                        </div>

                        <div className='space-y-2'>
                            <Label className='text-sm font-medium'>
                                {t('admin.vdsNodes.form.iso_allowed_storages')}
                            </Label>
                            {isoStorages.length === 0 ? (
                                <p className='text-muted-foreground text-sm'>
                                    {storagesLoading
                                        ? t('admin.vdsNodes.storage.loading')
                                        : t('admin.vdsNodes.form.iso_allowed_storages_empty')}
                                </p>
                            ) : (
                                <div className='flex flex-wrap gap-2'>
                                    {isoStorages.map((s) => {
                                        const on = allowedSet.has(s);
                                        return (
                                            <button
                                                key={s}
                                                type='button'
                                                disabled={storagesLoading}
                                                onClick={() => toggleAllowedStorage(s)}
                                                className={cn(
                                                    'rounded-lg border px-2.5 py-1.5 font-mono text-xs transition-colors',
                                                    on
                                                        ? 'border-primary/40 bg-primary/10 text-foreground'
                                                        : 'border-border/60 bg-muted/30 text-muted-foreground hover:border-primary/25',
                                                )}
                                            >
                                                {s}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            <p className='text-muted-foreground/70 text-xs'>
                                {t('admin.vdsNodes.form.iso_allowed_storages_help')}
                            </p>
                        </div>

                        <div className='space-y-2'>
                            <Label className='text-sm font-medium'>{t('admin.vdsNodes.form.rescue_iso')}</Label>
                            <Select
                                value={form.rescue_iso}
                                disabled={storagesLoading}
                                onChange={(e) => setForm({ ...form, rescue_iso: e.target.value })}
                            >
                                <option value=''>{t('admin.vdsNodes.form.rescue_iso_none')}</option>
                                {rescueOptions.map((f) => (
                                    <option key={f.volid} value={f.volid}>
                                        {f.volid}
                                    </option>
                                ))}
                            </Select>
                            <p className='text-muted-foreground/70 text-xs'>
                                {t('admin.vdsNodes.form.rescue_iso_help')}
                            </p>
                        </div>
                    </div>
                </TabSection>
            </div>
        </PageCard>
    );
}
