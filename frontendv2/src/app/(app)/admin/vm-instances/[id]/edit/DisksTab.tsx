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
import { HeadlessSelect } from '@/components/ui/headless-select';
import { HardDrive, Plus, Trash2 } from 'lucide-react';

interface DisksTabProps {
    isLxc?: boolean;
    config: Record<string, unknown> | null;
    diskKeys: string[];
    storageList: string[];
    newDiskStorage: string;
    setNewDiskStorage: (v: string) => void;
    newDiskSizeGb: number;
    setNewDiskSizeGb: (v: number) => void;
    newDiskPath: string;
    setNewDiskPath: (v: string) => void;
    resizeDisk: string;
    setResizeDisk: (v: string) => void;
    resizeSize: string;
    setResizeSize: (v: string) => void;
    onCreateDisk: (e: React.FormEvent) => void;
    onResizeDisk: (e: React.FormEvent) => void;
    onDeleteDisk: (key: string) => void;
    creatingDisk: boolean;
    resizing: boolean;
    deletingDisk: string | null;
}

export function DisksTab({
    isLxc = true,
    config,
    diskKeys,
    storageList,
    newDiskStorage,
    setNewDiskStorage,
    newDiskSizeGb,
    setNewDiskSizeGb,
    newDiskPath,
    setNewDiskPath,
    resizeDisk,
    setResizeDisk,
    resizeSize,
    setResizeSize,
    onCreateDisk,
    onResizeDisk,
    onDeleteDisk,
    creatingDisk,
    resizing,
    deletingDisk,
}: DisksTabProps) {
    const { t } = useTranslation();
    const storageOptions =
        storageList.length > 0
            ? storageList.map((s) => ({ id: s, name: s }))
            : [{ id: 'local-lvm', name: 'local-lvm' }];
    const diskOptions = diskKeys.map((k) => ({ id: k, name: k }));

    // Compute protected disks so we do not show a delete action for risky devices
    // (rootfs on LXC, primary boot disk, and cloud-init/cdrom drives).
    const protectedKeys = new Set<string>();
    if (isLxc) {
        protectedKeys.add('rootfs');
    } else {
        const boot = String(config?.boot ?? '');
        if (boot) {
            const m = boot.match(/order=([^,;]+)/);
            if (m && m[1]) {
                const first = m[1].split(/[;:,]/)[0];
                if (/^(scsi|virtio|sata|ide)\d+$/.test(first)) {
                    protectedKeys.add(first);
                }
            }
        }
        diskKeys.forEach((k) => {
            const val = String(config?.[k] ?? '');
            if (val.includes('cloudinit') || val.includes('media=cdrom')) {
                protectedKeys.add(k);
            }
        });
    }

    return (
        <PageCard title={t('admin.vmInstances.edit_tabs.disks') ?? 'Disks'} icon={HardDrive}>
            <div className='space-y-6'>
                {diskKeys.length > 0 && (
                    <div>
                        <Label className='mb-2 block'>{t('admin.vmInstances.current_disks') ?? 'Current disks'}</Label>
                        <ul className='space-y-2'>
                            {diskKeys.map((k) => (
                                <li
                                    key={k}
                                    className='border-border/50 bg-muted/20 text-foreground flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm'
                                >
                                    <span className='font-mono'>{k}</span>
                                    <span className='text-foreground/90 min-w-0 flex-1 truncate'>
                                        {String(config?.[k] ?? '')}
                                    </span>
                                    {((/^mp\d+$/.test(k) && isLxc) ||
                                        (/^(scsi|virtio|sata|ide)\d+$/.test(k) && !isLxc)) &&
                                        !protectedKeys.has(k) && (
                                            <Button
                                                type='button'
                                                variant='ghost'
                                                size='sm'
                                                className='text-destructive hover:text-destructive'
                                                onClick={() => onDeleteDisk(k)}
                                                loading={deletingDisk === k}
                                                disabled={!!deletingDisk}
                                            >
                                                <Trash2 className='mr-1 h-4 w-4' />
                                                {t('common.delete') ?? 'Delete'}
                                            </Button>
                                        )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                <form
                    onSubmit={onCreateDisk}
                    className='border-border/50 bg-muted/10 flex flex-wrap items-end gap-3 rounded-xl border p-4'
                >
                    <div className='min-w-[160px]'>
                        <Label className='text-xs'>{t('admin.vmInstances.disk_storage') ?? 'Storage'}</Label>
                        <HeadlessSelect
                            value={newDiskStorage}
                            onChange={(v) => setNewDiskStorage(String(v))}
                            options={storageOptions}
                            buttonClassName='mt-1 h-10 w-full'
                        />
                    </div>
                    <div>
                        <Label className='text-xs'>{t('admin.vmInstances.disk_size_gb') ?? 'Size (GB)'}</Label>
                        <Input
                            type='number'
                            min={1}
                            value={newDiskSizeGb}
                            onChange={(e) => setNewDiskSizeGb(parseInt(e.target.value, 10) || 10)}
                            className='bg-muted/30 mt-1 h-10 w-24 rounded-xl'
                        />
                    </div>
                    {isLxc && (
                        <div>
                            <Label className='text-xs'>
                                {t('admin.vmInstances.disk_path') ?? 'Mount path (optional)'}
                            </Label>
                            <Input
                                value={newDiskPath}
                                onChange={(e) => setNewDiskPath(e.target.value)}
                                placeholder='/mnt/data'
                                className='bg-muted/30 mt-1 h-10 w-40 rounded-xl'
                            />
                        </div>
                    )}
                    <Button type='submit' size='sm' loading={creatingDisk}>
                        <Plus className='mr-2 h-4 w-4' />
                        {t('admin.vmInstances.add_disk') ?? 'Add disk'}
                    </Button>
                </form>
                <div>
                    <Label className='mb-2 block'>{t('admin.vmInstances.resize_disk') ?? 'Expand disk'}</Label>
                    <form onSubmit={onResizeDisk} className='flex flex-wrap items-end gap-3'>
                        <div className='min-w-[160px]'>
                            <Label className='text-xs'>{t('admin.vmInstances.resize_disk_label')}</Label>
                            <HeadlessSelect
                                value={resizeDisk}
                                onChange={(v) => setResizeDisk(String(v))}
                                options={diskOptions}
                                placeholder={t('common.select')}
                                buttonClassName='mt-1 h-10 w-full'
                            />
                        </div>
                        <div>
                            <Label className='text-xs'>{t('admin.vmInstances.resize_size_label')}</Label>
                            <Input
                                value={resizeSize}
                                onChange={(e) => setResizeSize(e.target.value)}
                                placeholder={t('admin.vmInstances.disk_size_placeholder') ?? '+5G or 20G'}
                                className='bg-muted/30 mt-1 h-10 w-32 rounded-xl'
                            />
                        </div>
                        <Button type='submit' size='sm' loading={resizing} disabled={!resizeDisk || !resizeSize.trim()}>
                            {t('admin.vmInstances.resize_disk') ?? 'Expand disk'}
                        </Button>
                    </form>
                    <p className='text-muted-foreground mt-2 text-xs'>
                        {t('admin.vmInstances.disk_resize_hint') ?? 'Use +5G to add 5GB, or 20G to set total to 20GB.'}
                    </p>
                </div>
            </div>
        </PageCard>
    );
}
