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
import { HeadlessSelect } from '@/components/ui/headless-select';
import { Wifi, Plus, Trash2, Save } from 'lucide-react';
import type { FreeIp, NetworkRow } from './types';

interface NetworkTabProps {
    isLxc: boolean;
    networks: NetworkRow[];
    setNetworks: React.Dispatch<React.SetStateAction<NetworkRow[]>>;
    removedNetKeys: Set<string>;
    setRemovedNetKeys: React.Dispatch<React.SetStateAction<Set<string>>>;
    newNetworkRow: NetworkRow | null;
    setNewNetworkRow: React.Dispatch<React.SetStateAction<NetworkRow | null>>;
    freeIps: FreeIp[];
    bridges: string[];
    assignedIpMap: Record<number, string>;
    getRowIpOptions: (row: NetworkRow) => FreeIp[];
    onSave: (e: React.FormEvent) => void;
    saving: boolean;
}

export function NetworkTab({
    isLxc,
    networks,
    setNetworks,
    removedNetKeys,
    setRemovedNetKeys,
    newNetworkRow,
    setNewNetworkRow,
    freeIps,
    bridges,
    assignedIpMap,
    getRowIpOptions,
    onSave,
    saving,
}: NetworkTabProps) {
    const { t } = useTranslation();
    const bridgeOptions = (bridges.length ? bridges : ['vmbr0']).map((b) => ({ id: b, name: b }));

    return (
        <form onSubmit={onSave}>
            <PageCard title={t('admin.vmInstances.edit_tabs.network') ?? 'Network'} icon={Wifi}>
                <div className='space-y-4'>
                    <p className='text-sm text-muted-foreground'>
                        {isLxc
                            ? (t('admin.vmInstances.network_multi_hint') ??
                              'Add or remove IPs (Proxmox net0, net1, …). Select IP from pool for each interface.')
                            : (t('admin.vmInstances.network_multi_qemu_hint') ??
                              'Add or remove IPs for this VM. FeatherPanel will keep net0/net1 interfaces and matching cloud-init ipconfig0/ipconfig1 entries aligned.')}
                    </p>
                    {networks
                        .filter((n) => !removedNetKeys.has(n.key))
                        .map((n) => {
                            const rowIp =
                                n.vm_ip_id != null
                                    ? (assignedIpMap[n.vm_ip_id] ??
                                      getRowIpOptions(n).find((i) => i.id === n.vm_ip_id)?.ip)
                                    : null;
                            const ipOptions = getRowIpOptions(n).map((ip) => ({ id: ip.id, name: ip.ip }));
                            return (
                                <div
                                    key={n.key}
                                    className='flex flex-wrap items-center gap-2 rounded-xl border border-border/50 p-3 bg-muted/20'
                                >
                                    <div className='w-20 shrink-0'>
                                        <span className='font-mono text-sm'>{n.key}</span>
                                        <p className='text-[10px] text-muted-foreground mt-1'>
                                            {n.key === 'net0'
                                                ? (t('admin.vmInstances.primary_ip') ?? 'Primary')
                                                : (t('admin.vmInstances.secondary_ip') ?? 'Secondary')}
                                        </p>
                                    </div>
                                    <div className='flex flex-col gap-1 min-w-[180px]'>
                                        {rowIp && (
                                            <span
                                                className='text-foreground font-semibold text-base tabular-nums'
                                                title={rowIp}
                                            >
                                                {rowIp}
                                            </span>
                                        )}
                                        <HeadlessSelect
                                            value={n.vm_ip_id ?? ''}
                                            onChange={(v) =>
                                                setNetworks((prev) =>
                                                    prev.map((r) =>
                                                        r.key === n.key
                                                            ? { ...r, vm_ip_id: v === '' ? null : Number(v) }
                                                            : r,
                                                    ),
                                                )
                                            }
                                            options={ipOptions}
                                            placeholder='Select IP…'
                                            buttonClassName='h-10'
                                        />
                                    </div>
                                    <HeadlessSelect
                                        value={n.bridge ?? 'vmbr0'}
                                        onChange={(v) =>
                                            setNetworks((prev) =>
                                                prev.map((r) => (r.key === n.key ? { ...r, bridge: String(v) } : r)),
                                            )
                                        }
                                        options={bridgeOptions}
                                        buttonClassName='w-28 h-10'
                                    />
                                    <Button
                                        type='button'
                                        variant='ghost'
                                        size='icon'
                                        className='h-10 w-10 shrink-0'
                                        onClick={() => setRemovedNetKeys((prev) => new Set(prev).add(n.key))}
                                        disabled={
                                            n.key === 'net0' &&
                                            networks.filter((row) => !removedNetKeys.has(row.key)).length <= 1
                                        }
                                    >
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                </div>
                            );
                        })}
                    {newNetworkRow && (
                        <div className='flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 p-3 bg-primary/5'>
                            <span className='font-mono text-sm w-12 shrink-0'>{newNetworkRow.key}</span>
                            <div className='flex flex-col gap-1 min-w-[180px]'>
                                {newNetworkRow.vm_ip_id != null &&
                                    (() => {
                                        const ip = freeIps.find((i) => i.id === newNetworkRow.vm_ip_id)?.ip;
                                        return ip ? (
                                            <span className='text-foreground font-semibold text-base tabular-nums'>
                                                {ip}
                                            </span>
                                        ) : null;
                                    })()}
                                <HeadlessSelect
                                    value={newNetworkRow.vm_ip_id ?? ''}
                                    onChange={(v) =>
                                        setNewNetworkRow((prev) =>
                                            prev ? { ...prev, vm_ip_id: v === '' ? null : Number(v) } : null,
                                        )
                                    }
                                    options={freeIps.map((ip) => ({ id: ip.id, name: ip.ip }))}
                                    placeholder='Select IP…'
                                    buttonClassName='h-10'
                                />
                            </div>
                            <HeadlessSelect
                                value={newNetworkRow.bridge ?? 'vmbr0'}
                                onChange={(v) =>
                                    setNewNetworkRow((prev) => (prev ? { ...prev, bridge: String(v) } : null))
                                }
                                options={bridgeOptions}
                                buttonClassName='w-28 h-10'
                            />
                            <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='h-10 w-10 shrink-0'
                                onClick={() => setNewNetworkRow(null)}
                            >
                                ×
                            </Button>
                        </div>
                    )}
                    <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => {
                            const allKeys = [...networks.map((n) => n.key), newNetworkRow?.key].filter(
                                Boolean,
                            ) as string[];
                            const indices = allKeys.map((k) => parseInt(k.replace(/\D/g, ''), 10));
                            const next = 'net' + (indices.length ? Math.max(...indices) + 1 : 0);
                            setNewNetworkRow({ key: next, vm_ip_id: null, bridge: bridges[0] || 'vmbr0' });
                        }}
                    >
                        <Plus className='h-4 w-4 mr-2' />
                        {t('admin.vmInstances.add_ip') ?? 'Add IP'}
                    </Button>
                </div>
            </PageCard>
            <div className='flex justify-end mt-4'>
                <Button type='submit' loading={saving}>
                    <Save className='h-4 w-4 mr-2' />
                    {t('common.save_changes')}
                </Button>
            </div>
        </form>
    );
}
