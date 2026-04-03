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
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Cpu, Loader2, Save } from 'lucide-react';

interface ResourcesTabProps {
    vmBackupLimit?: number;
    setVmBackupLimit?: (v: number) => void;
    vmBackupRetention?: 'inherit' | 'hard_limit' | 'fifo_rolling';
    setVmBackupRetention?: (v: 'inherit' | 'hard_limit' | 'fifo_rolling') => void;
    config: Record<string, unknown> | null;
    memory: number;
    setMemory: (v: number) => void;
    cpus: number;
    setCpus: (v: number) => void;
    cores: number;
    setCores: (v: number) => void;
    onBoot: boolean;
    setOnBoot: (v: boolean) => void;
    isQemu: boolean;
    storageList: string[];
    biosMode: string;
    setBiosMode: (v: string) => void;
    efiEnabled: boolean;
    setEfiEnabled: (v: boolean) => void;
    efiStorage: string;
    setEfiStorage: (v: string) => void;
    nodeEfiStorageDefault: string;
    tpmEnabled: boolean;
    setTpmEnabled: (v: boolean) => void;
    tpmStorage: string;
    setTpmStorage: (v: string) => void;
    nodeTpmStorageDefault: string;
    onSave: (e: React.FormEvent) => void;
    saving: boolean;
}

export function ResourcesTab({
    vmBackupLimit,
    setVmBackupLimit,
    vmBackupRetention,
    setVmBackupRetention,
    config,
    memory,
    setMemory,
    cpus,
    setCpus,
    cores,
    setCores,
    onBoot,
    setOnBoot,
    isQemu,
    storageList,
    biosMode,
    setBiosMode,
    efiEnabled,
    setEfiEnabled,
    nodeEfiStorageDefault,
    tpmEnabled,
    setTpmEnabled,
    nodeTpmStorageDefault,
    onSave,
    saving,
}: ResourcesTabProps) {
    const { t } = useTranslation();
    const showBackup =
        vmBackupLimit !== undefined && setVmBackupLimit && vmBackupRetention !== undefined && setVmBackupRetention;

    return (
        <form onSubmit={onSave}>
            <PageCard title={t('admin.vmInstances.edit_tabs.resources') ?? 'Resources'} icon={Cpu}>
                {config ? (
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                        <div>
                            <Label>{t('admin.vmInstances.memory') ?? 'Memory (MB)'}</Label>
                            <Input
                                type='number'
                                min={128}
                                value={memory}
                                onChange={(e) => setMemory(parseInt(e.target.value, 10) || 512)}
                                className='mt-1 bg-muted/30 h-11 rounded-xl'
                            />
                        </div>
                        <div>
                            <Label>{t('admin.vmInstances.cpus') ?? 'CPUs'}</Label>
                            <Input
                                type='number'
                                min={1}
                                value={cpus}
                                onChange={(e) => setCpus(parseInt(e.target.value, 10) || 1)}
                                className='mt-1 bg-muted/30 h-11 rounded-xl'
                            />
                        </div>
                        <div>
                            <Label>{t('admin.vmInstances.cores') ?? 'Cores'}</Label>
                            <Input
                                type='number'
                                min={1}
                                value={cores}
                                onChange={(e) => setCores(parseInt(e.target.value, 10) || 1)}
                                className='mt-1 bg-muted/30 h-11 rounded-xl'
                            />
                        </div>
                        <div className='flex items-center gap-2 pt-8'>
                            <input
                                type='checkbox'
                                id='onboot'
                                checked={onBoot}
                                onChange={(e) => setOnBoot(e.target.checked)}
                                className='h-4 w-4 rounded'
                            />
                            <Label htmlFor='onboot'>{t('admin.vmInstances.on_boot') ?? 'Start on boot'}</Label>
                        </div>

                        {isQemu && (
                            <>
                                <div className='space-y-2'>
                                    <Label>{t('admin.vmInstances.bios_mode') ?? 'BIOS / Firmware'}</Label>
                                    <select
                                        className='mt-1 bg-muted/30 h-11 rounded-xl px-3 text-sm'
                                        value={biosMode}
                                        onChange={(e) => setBiosMode(e.target.value)}
                                    >
                                        <option value='seabios'>Legacy (SeaBIOS)</option>
                                        <option value='ovmf'>UEFI (OVMF)</option>
                                    </select>
                                </div>
                                <div className='space-y-2'>
                                    <Label>{t('admin.vmInstances.efi_settings') ?? 'EFI disk'}</Label>
                                    <div className='flex items-center gap-2'>
                                        <input
                                            type='checkbox'
                                            id='efi-enabled'
                                            checked={efiEnabled}
                                            onChange={(e) => setEfiEnabled(e.target.checked)}
                                            className='h-4 w-4 rounded'
                                        />
                                        <Label htmlFor='efi-enabled'>
                                            {t('admin.vmInstances.efi_enable') ?? 'Enable EFI disk'}
                                        </Label>
                                    </div>
                                    {efiEnabled && (
                                        <select
                                            className='mt-1 bg-muted/30 h-11 rounded-xl px-3 text-sm'
                                            value={nodeEfiStorageDefault}
                                            disabled
                                        >
                                            {!storageList.includes(nodeEfiStorageDefault) && (
                                                <option value={nodeEfiStorageDefault}>{nodeEfiStorageDefault}</option>
                                            )}
                                            {storageList.map((s) => (
                                                <option key={s} value={s}>
                                                    {s}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                                <div className='space-y-2'>
                                    <Label>{t('admin.vmInstances.tpm_settings') ?? 'TPM'}</Label>
                                    <div className='flex items-center gap-2'>
                                        <input
                                            type='checkbox'
                                            id='tpm-enabled'
                                            checked={tpmEnabled}
                                            onChange={(e) => setTpmEnabled(e.target.checked)}
                                            className='h-4 w-4 rounded'
                                        />
                                        <Label htmlFor='tpm-enabled'>
                                            {t('admin.vmInstances.tpm_enable') ?? 'Enable TPM 2.0'}
                                        </Label>
                                    </div>
                                    {tpmEnabled && (
                                        <select
                                            className='mt-1 bg-muted/30 h-11 rounded-xl px-3 text-sm'
                                            value={nodeTpmStorageDefault}
                                            disabled
                                        >
                                            {!storageList.includes(nodeTpmStorageDefault) && (
                                                <option value={nodeTpmStorageDefault}>{nodeTpmStorageDefault}</option>
                                            )}
                                            {storageList.map((s) => (
                                                <option key={s} value={s}>
                                                    {s}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </>
                        )}

                        {showBackup && (
                            <>
                                <div className='sm:col-span-2 border-t border-border/40 pt-4 mt-2'>
                                    <p className='text-sm font-medium mb-3'>
                                        {t('admin.vmInstances.backups.policy_section') ?? 'Backup policy'}
                                    </p>
                                </div>
                                <div className='space-y-3'>
                                    <Label>{t('admin.vmInstances.backups.limit_label_create') ?? 'Backup limit'}</Label>
                                    <Input
                                        type='number'
                                        min={0}
                                        max={100}
                                        value={vmBackupLimit}
                                        onChange={(e) =>
                                            setVmBackupLimit(
                                                Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)),
                                            )
                                        }
                                        className='bg-muted/30 h-11 rounded-xl'
                                    />
                                    <p className='text-xs text-muted-foreground'>
                                        {t('admin.vmInstances.backups.limit_help')}
                                    </p>
                                </div>
                                <div className='space-y-3'>
                                    <Label>
                                        {t('admin.vmInstances.backups.retention_label_edit') ?? 'Retention override'}
                                    </Label>
                                    <select
                                        className='w-full h-11 rounded-xl border border-input bg-muted/30 px-3 text-sm'
                                        value={vmBackupRetention}
                                        onChange={(e) =>
                                            setVmBackupRetention(
                                                e.target.value as 'inherit' | 'hard_limit' | 'fifo_rolling',
                                            )
                                        }
                                    >
                                        <option value='inherit'>
                                            {t('admin.servers.form.backup_retention_inherit')}
                                        </option>
                                        <option value='hard_limit'>
                                            {t('admin.servers.form.backup_retention_hard_limit')}
                                        </option>
                                        <option value='fifo_rolling'>
                                            {t('admin.servers.form.backup_retention_fifo')}
                                        </option>
                                    </select>
                                    <p className='text-xs text-muted-foreground'>
                                        {t('admin.vmInstances.backups.retention_help_edit')}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <p className='text-sm text-muted-foreground flex items-center gap-2'>
                        <Loader2 className='h-4 w-4 animate-spin' /> {t('common.loading')}
                    </p>
                )}
            </PageCard>
            <div className='flex justify-end mt-4'>
                <Button type='submit' loading={saving} disabled={!config}>
                    <Save className='h-4 w-4 mr-2' />
                    {t('common.save_changes')}
                </Button>
            </div>
        </form>
    );
}
