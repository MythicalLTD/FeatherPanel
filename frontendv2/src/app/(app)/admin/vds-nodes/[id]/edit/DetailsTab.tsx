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
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select-native';
import { Button } from '@/components/featherui/Button';
import { Database, Search, MapPin, Loader2 } from 'lucide-react';
import type { VdsNodeForm } from './page';

interface DetailsTabProps {
    nodeId: string | number;
    form: VdsNodeForm;
    setForm: React.Dispatch<React.SetStateAction<VdsNodeForm>>;
    errors: Record<string, string>;
    selectedLocationName: string;
    setLocationModalOpen: (open: boolean) => void;
    fetchLocations: () => void;
}

export function DetailsTab({
    nodeId,
    form,
    setForm,
    errors,
    selectedLocationName,
    setLocationModalOpen,
    fetchLocations,
}: DetailsTabProps) {
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
                toast.error(t('admin.vdsNodes.errors.fetch_failed') || 'Failed to fetch storages');
            } finally {
                setStoragesLoading(false);
            }
        };

        loadStorages();
    }, [nodeId, t]);

    return (
        <PageCard title={t('admin.vdsNodes.form.basic_details')} icon={Database}>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                <div className='space-y-6'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.name')}</Label>
                        <Input
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            error={!!errors.name}
                        />
                        {errors.name && (
                            <p className='text-[10px] uppercase font-bold text-red-500 mt-1'>{errors.name}</p>
                        )}
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.description')}</Label>
                        <Textarea
                            placeholder={t('admin.vdsNodes.form.description_placeholder')}
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            className='min-h-[120px]'
                        />
                    </div>

                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.efi_storage')}</Label>
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
                            <p className='text-xs text-muted-foreground/70 italic'>
                                {t('admin.vdsNodes.form.efi_storage_help')}
                            </p>
                        </div>

                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.tpm_storage')}</Label>
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
                            <p className='text-xs text-muted-foreground/70 italic'>
                                {t('admin.vdsNodes.form.tpm_storage_help')}
                            </p>
                        </div>
                    </div>
                </div>
                <div className='space-y-6'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.location')}</Label>
                        <div className='flex gap-2'>
                            <div className='flex-1 h-11 px-3 bg-muted/30 rounded-xl border border-border/50 text-sm flex items-center'>
                                {form.location_id && selectedLocationName ? (
                                    <div className='flex items-center gap-2'>
                                        <MapPin className='h-4 w-4 text-primary' />
                                        <span className='font-medium text-foreground'>{selectedLocationName}</span>
                                    </div>
                                ) : (
                                    <span className='text-muted-foreground'>
                                        {t('admin.vdsNodes.form.select_location')}
                                    </span>
                                )}
                            </div>
                            <Button
                                type='button'
                                size='icon'
                                onClick={() => {
                                    fetchLocations();
                                    setLocationModalOpen(true);
                                }}
                            >
                                <Search className='h-4 w-4' />
                            </Button>
                        </div>
                        {errors.location_id && (
                            <p className='text-[10px] uppercase font-bold text-red-500 mt-1'>{errors.location_id}</p>
                        )}
                        <p className='text-xs text-muted-foreground/70 italic'>
                            {t('admin.vdsNodes.form.select_location_description')}
                        </p>
                    </div>

                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.backup_storage')}</Label>
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
                        <p className='text-xs text-muted-foreground/70 italic'>
                            {t('admin.vdsNodes.form.backup_storage_help')}
                        </p>
                        {storagesError && (
                            <p className='text-[10px] uppercase font-bold text-red-500 mt-1'>{storagesError}</p>
                        )}
                    </div>
                </div>
            </div>
        </PageCard>
    );
}
