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

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import {
    Server,
    ArrowLeft,
    Loader2,
    Wifi,
    Cpu,
    HardDrive,
    History,
    Search as SearchIcon,
    Ban,
    ShieldCheck,
} from 'lucide-react';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

import { DetailsTab } from './DetailsTab';
import { HistoryTab } from './HistoryTab';
import { NetworkTab } from './NetworkTab';
import { ResourcesTab } from './ResourcesTab';
import { DisksTab } from './DisksTab';
import type { OwnerUser, FreeIp, NetworkRow } from './types';

export default function VmInstanceEditPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const params = useParams();
    const id = Number(params?.id);

    const [instance, setInstance] = useState<Record<string, unknown> | null>(null);
    const [config, setConfig] = useState<Record<string, unknown> | null>(null);
    const [freeIps, setFreeIps] = useState<FreeIp[]>([]);
    const [hostname, setHostname] = useState('');
    const [notes, setNotes] = useState('');
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [selectedOwner, setSelectedOwner] = useState<OwnerUser | null>(null);
    const [vmIpId, setVmIpId] = useState<number | null>(null);
    const [memory, setMemory] = useState(512);
    const [cpus, setCpus] = useState(1);
    const [cores, setCores] = useState(1);
    const [onBoot, setOnBoot] = useState(false);
    const [loading, setLoading] = useState(true);
    const [ownerModalOpen, setOwnerModalOpen] = useState(false);
    const [owners, setOwners] = useState<OwnerUser[]>([]);
    const [ownerSearch, setOwnerSearch] = useState('');
    const [ownerPagination, setOwnerPagination] = useState({
        current_page: 1,
        per_page: 10,
        total_records: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false,
    });
    const [resizeDisk, setResizeDisk] = useState('');
    const [resizeSize, setResizeSize] = useState('');
    const [resizing, setResizing] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [savingTab, setSavingTab] = useState<string | null>(null);
    const [networks, setNetworks] = useState<NetworkRow[]>([]);
    const [removedNetKeys, setRemovedNetKeys] = useState<Set<string>>(new Set());
    const [newNetworkRow, setNewNetworkRow] = useState<NetworkRow | null>(null);
    const [newDiskStorage, setNewDiskStorage] = useState('local-lvm');
    const [newDiskSizeGb, setNewDiskSizeGb] = useState(10);
    const [newDiskPath, setNewDiskPath] = useState('');
    const [creatingDisk, setCreatingDisk] = useState(false);
    const [deletingDisk, setDeletingDisk] = useState<string | null>(null);
    const [bridges, setBridges] = useState<string[]>([]);
    const [storageList, setStorageList] = useState<string[]>([]);
    const [dnsNameserver, setDnsNameserver] = useState('');
    const [dnsSearchDomain, setDnsSearchDomain] = useState('');
    const [biosMode, setBiosMode] = useState('seabios');
    const [efiEnabled, setEfiEnabled] = useState(false);
    const [efiStorage, setEfiStorage] = useState('');
    const [tpmEnabled, setTpmEnabled] = useState(false);
    const [tpmStorage, setTpmStorage] = useState('');
    const [nodeEfiStorageDefault, setNodeEfiStorageDefault] = useState('');
    const [nodeTpmStorageDefault, setNodeTpmStorageDefault] = useState('');
    const [suspending, setSuspending] = useState(false);
    const [vmBackupLimit, setVmBackupLimit] = useState(5);
    const [vmBackupRetention, setVmBackupRetention] = useState<'inherit' | 'hard_limit' | 'fifo_rolling'>('inherit');

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-vm-instance-edit');

    const vmType = (instance?.vm_type as string) ?? 'qemu';
    const isLxc = vmType === 'lxc';
    const nodeId = instance ? Number((instance as Record<string, unknown>).vm_node_id) : 0;

    const fetchInstance = useCallback(async () => {
        if (!id || Number.isNaN(id)) return;
        const res = await axios.get(`/api/admin/vm-instances/${id}`);
        const inst = res.data.data?.instance as Record<string, unknown>;
        if (inst) {
            setInstance(inst);
            setHostname((inst.hostname as string) ?? '');
            setNotes((inst.notes as string) ?? '');
            setVmBackupLimit(Math.max(0, Math.min(100, Number(inst.backup_limit ?? 5))));
            const br = (inst.backup_retention_mode as string) || '';
            setVmBackupRetention(
                br === 'fifo_rolling' || br === 'hard_limit' ? (br as 'fifo_rolling' | 'hard_limit') : 'inherit',
            );
            setVmIpId(inst.vm_ip_id != null ? Number(inst.vm_ip_id) : null);
            const uuid = (inst.user_uuid as string) ?? '';
            if (uuid) {
                setSelectedOwner({
                    id: 0,
                    uuid,
                    username: (inst.user_username as string) ?? '',
                    email: (inst.user_email as string) ?? '',
                });
            } else {
                setSelectedOwner(null);
            }
        }
    }, [id]);

    const fetchConfig = useCallback(
        async (inst?: Record<string, unknown> | null) => {
            if (!id || Number.isNaN(id)) return;
            try {
                const res = await axios.get(`/api/admin/vm-instances/${id}/config`);
                const cfg = res.data.data?.config as Record<string, unknown>;
                if (cfg) {
                    setConfig(cfg);
                    setMemory(Number(cfg.memory) || 512);
                    setOnBoot((cfg.onboot as number) === 1);
                    setDnsNameserver((cfg.nameserver as string) ?? '');
                    setDnsSearchDomain((cfg.searchdomain as string) ?? '');
                    const lxc = (inst ?? instance)?.vm_type === 'lxc';
                    if (lxc) {
                        const c = Number(cfg.cores) || 1;
                        setCores(c);
                        setCpus(1);
                    } else {
                        setCpus(Number(cfg.sockets) || 1);
                        setCores(Number(cfg.cores) || 1);
                        // QEMU extras: BIOS, EFI, TPM
                        const bios = (cfg.bios as string) ?? 'seabios';
                        setBiosMode(bios === 'ovmf' ? 'ovmf' : 'seabios');
                        const efiVal = (cfg.efidisk0 as string) ?? '';
                        if (efiVal) {
                            setEfiEnabled(true);
                            const storage = efiVal.split(':')[0] || '';
                            setEfiStorage(storage);
                        } else {
                            setEfiEnabled(false);
                            setEfiStorage('');
                        }
                        const tpmVal = (cfg.tpmstate0 as string) ?? '';
                        if (tpmVal) {
                            setTpmEnabled(true);
                            const storage = tpmVal.split(':')[0] || '';
                            setTpmStorage(storage);
                        } else {
                            setTpmEnabled(false);
                            setTpmStorage('');
                        }
                    }
                }
            } catch {
                setConfig(null);
            }
        },
        [id, instance],
    );

    useEffect(() => {
        if (!id || Number.isNaN(id)) {
            router.replace('/admin/vm-instances');
            return;
        }
        axios
            .get(`/api/admin/vm-instances/${id}`)
            .then((res) => {
                const inst = res.data.data?.instance as Record<string, unknown>;
                if (inst) {
                    setInstance(inst);
                    setHostname((inst.hostname as string) ?? '');
                    setNotes((inst.notes as string) ?? '');
                    setExpiresAt(inst.expires_at ? String(inst.expires_at).slice(0, 16) : null);
                    setVmBackupLimit(Math.max(0, Math.min(100, Number(inst.backup_limit ?? 5))));
                    const br0 = (inst.backup_retention_mode as string) || '';
                    setVmBackupRetention(
                        br0 === 'fifo_rolling' || br0 === 'hard_limit'
                            ? (br0 as 'fifo_rolling' | 'hard_limit')
                            : 'inherit',
                    );
                    setVmIpId(inst.vm_ip_id != null ? Number(inst.vm_ip_id) : null);
                    const uuid = (inst.user_uuid as string) ?? '';
                    if (uuid) {
                        setSelectedOwner({
                            id: 0,
                            uuid,
                            username: (inst.user_username as string) ?? '',
                            email: (inst.user_email as string) ?? '',
                        });
                    } else {
                        setSelectedOwner(null);
                    }
                }
            })
            .catch(() => toast.error(t('admin.vmInstances.errors.fetch_failed')))
            .finally(() => setLoading(false));
    }, [id, router, t]);

    useEffect(() => {
        if (!id || !instance) return;
        fetchConfig(instance as Record<string, unknown>);
    }, [id, instance, fetchConfig]);

    // Sync networks from Proxmox config for both LXC and QEMU.
    useEffect(() => {
        if (!config || !instance) return;
        const netKeys = (Object.keys(config) as string[]).filter((k) => /^net\d+$/.test(k)).sort();
        const list = [...freeIps];
        const curId = instance.vm_ip_id != null ? Number(instance.vm_ip_id) : null;
        const curIp = instance.ip_address as string | undefined;
        if (curId != null && curIp && !list.some((i) => i.id === curId)) {
            list.unshift({ id: curId, ip: curIp, cidr: null, gateway: null });
        }
        // Add all already-assigned IPs (net1, net2, …) so they resolve correctly even though
        // they are not in the free-IPs list (they're already assigned to this instance).
        const assignedIps =
            (instance.assigned_ips as
                | Array<{ vm_ip_id: number; ip: string; cidr?: number | null; gateway?: string | null }>
                | undefined) ?? [];
        for (const ai of assignedIps) {
            const aiId = Number(ai.vm_ip_id);
            if (!Number.isNaN(aiId) && aiId > 0 && !list.some((i) => i.id === aiId)) {
                list.push({ id: aiId, ip: ai.ip, cidr: ai.cidr ?? null, gateway: ai.gateway ?? null });
            }
        }
        const arr: NetworkRow[] = netKeys.map((key) => {
            const netVal = String(config[key] ?? '');
            const idx = Number((key.match(/\d+/) ?? ['0'])[0]);
            const val = isLxc ? netVal : String(config[`ipconfig${idx}`] ?? '');
            const ipMatch = val.match(/ip=([^/,\s]+)/);
            const ip = ipMatch ? ipMatch[1] : '';
            const bridgeMatch = netVal.match(/bridge=([^,\s]+)/);
            const bridge = bridgeMatch ? bridgeMatch[1] : 'vmbr0';
            const found = list.find((o) => o.ip === ip);
            return { key, vm_ip_id: found ? found.id : null, bridge };
        });
        setNetworks(arr);
        setRemovedNetKeys(new Set());
        setNewNetworkRow(null);
    }, [config, isLxc, instance, freeIps]);

    useEffect(() => {
        if (nodeId <= 0) {
            setFreeIps([]);
            setBridges([]);
            setStorageList([]);
            setNodeEfiStorageDefault('');
            setNodeTpmStorageDefault('');
            return;
        }
        axios
            .get(`/api/admin/vm-nodes/${nodeId}/free-ips`)
            .then((res) => {
                const list = (res.data.data?.free_ips ?? []) as FreeIp[];
                setFreeIps(list);
            })
            .catch(() => setFreeIps([]));
        axios
            .get(`/api/admin/vm-nodes/${nodeId}/bridges`)
            .then((res) => {
                setBridges((res.data.data?.bridges ?? []) as string[]);
            })
            .catch(() => setBridges([]));
        axios
            .get(`/api/admin/vm-nodes/${nodeId}/storage`)
            .then((res) => {
                setStorageList((res.data.data?.storage ?? []) as string[]);
            })
            .catch(() => setStorageList([]));

        axios
            .get(`/api/admin/vm-nodes/${nodeId}`)
            .then((res) => {
                const node = res.data.data?.vm_node ?? res.data.data;
                setNodeEfiStorageDefault((node?.storage_efi as string) ?? '');
                setNodeTpmStorageDefault((node?.storage_tpm as string) ?? '');
            })
            .catch(() => {
                setNodeEfiStorageDefault('');
                setNodeTpmStorageDefault('');
            });
    }, [nodeId]);

    const fetchOwners = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/admin/users', {
                params: {
                    search: ownerSearch,
                    page: ownerPagination.current_page,
                    limit: ownerPagination.per_page,
                },
            });
            setOwners((data.data?.users ?? []) as OwnerUser[]);
            if (data.data?.pagination) {
                setOwnerPagination((prev) => ({ ...prev, ...data.data.pagination }));
            }
        } catch {
            toast.error(t('admin.vmInstances.errors.fetch_failed'));
        }
    }, [ownerSearch, ownerPagination.current_page, ownerPagination.per_page, t]);

    useEffect(() => {
        if (ownerModalOpen) {
            const timer = setTimeout(() => fetchOwners(), 300);
            return () => clearTimeout(timer);
        }
    }, [ownerModalOpen, ownerSearch, ownerPagination.current_page, fetchOwners]);

    // IPs already assigned to this instance (so we don't show them as "available" in other rows)
    const assignedIpMap = (() => {
        const map: Record<number, string> = {};
        if (instance?.vm_ip_id != null && instance?.ip_address) {
            map[Number(instance.vm_ip_id)] = String(instance.ip_address);
        }
        networks.forEach((n) => {
            const idx = Number((n.key.match(/\d+/) ?? ['0'])[0]);
            const val = String(isLxc ? (config?.[n.key] ?? '') : (config?.[`ipconfig${idx}`] ?? ''));
            const m = val.match(/ip=([^/,\s]+)/);
            if (m && n.vm_ip_id != null) map[n.vm_ip_id] = m[1];
        });
        return map;
    })();

    // Per-row IP options: only free IPs + this row's current assignment (so we can keep it)
    const getRowIpOptions = (row: NetworkRow): FreeIp[] => {
        const list = [...freeIps];
        if (row.vm_ip_id != null && assignedIpMap[row.vm_ip_id] && !freeIps.some((i) => i.id === row.vm_ip_id)) {
            list.unshift({
                id: row.vm_ip_id,
                ip: assignedIpMap[row.vm_ip_id],
                cidr: null,
                gateway: null,
            });
        }
        return list;
    };

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const handleSaveDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingTab('details');
        try {
            const payload: Record<string, unknown> = {
                hostname: hostname || null,
                notes: notes || null,
                expires_at: expiresAt || null,
                user_uuid: selectedOwner?.uuid ?? null,
            };
            if (isLxc) {
                payload.nameserver = dnsNameserver.trim() || undefined;
                payload.searchdomain = dnsSearchDomain.trim() || undefined;
            }
            await axios.patch(`/api/admin/vm-instances/${id}`, payload);
            toast.success(t('admin.vmInstances.update_success') ?? 'VM instance updated');
            await fetchInstance();
            if (isLxc) await fetchConfig(instance as Record<string, unknown>);
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setSavingTab(null);
        }
    };

    const handleSaveNetwork = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingTab('network');
        try {
            if (networks.length > 0 || newNetworkRow) {
                const kept = networks
                    .filter((n) => !removedNetKeys.has(n.key) && n.vm_ip_id != null)
                    .map((n) => ({ key: n.key, vm_ip_id: n.vm_ip_id!, bridge: n.bridge || undefined }));
                if (newNetworkRow?.vm_ip_id) {
                    kept.push({
                        key: newNetworkRow.key,
                        vm_ip_id: newNetworkRow.vm_ip_id,
                        bridge: newNetworkRow.bridge || undefined,
                    });
                }
                kept.sort((a, b) => a.key.localeCompare(b.key, 'en', { numeric: true }));
                await axios.patch(`/api/admin/vm-instances/${id}`, { networks: kept });
            } else {
                await axios.patch(`/api/admin/vm-instances/${id}`, { vm_ip_id: vmIpId ?? null });
            }
            toast.success(t('admin.vmInstances.update_success') ?? 'VM instance updated');
            await fetchInstance();
            await fetchConfig();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setSavingTab(null);
        }
    };

    const handleSaveResources = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingTab('resources');
        try {
            const payload: Record<string, unknown> = {
                memory,
                cpus,
                cores,
                on_boot: onBoot,
            };
            if (!isLxc) {
                payload.bios = biosMode;
                payload.efi_enabled = efiEnabled;
                // EFI storage is enforced server-side from the VDS node default.
                payload.tpm_enabled = tpmEnabled;
                // TPM storage is enforced server-side from the VDS node default.
            }
            payload.backup_limit = vmBackupLimit;
            payload.backup_retention_mode = vmBackupRetention === 'inherit' ? null : vmBackupRetention;
            await axios.patch(`/api/admin/vm-instances/${id}`, payload);
            toast.success(t('admin.vmInstances.update_success') ?? 'VM instance updated');
            await fetchConfig();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setSavingTab(null);
        }
    };

    const handleResizeDisk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resizeDisk || !resizeSize.trim()) {
            toast.error('Select a disk and enter size (e.g. +5G)');
            return;
        }
        setResizing(true);
        try {
            await axios.post(`/api/admin/vm-instances/${id}/resize-disk`, {
                disk: resizeDisk,
                size: resizeSize.trim(),
            });
            toast.success(t('admin.vmInstances.resize_success') ?? 'Disk resized successfully.');
            setResizeSize('');
            await fetchConfig();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setResizing(false);
        }
    };

    const handleCreateDisk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newDiskSizeGb < 1) {
            toast.error(t('admin.vmInstances.disk_size_min') ?? 'Size must be at least 1 GB');
            return;
        }
        setCreatingDisk(true);
        try {
            await axios.post(`/api/admin/vm-instances/${id}/disks`, {
                storage: newDiskStorage,
                size_gb: newDiskSizeGb,
                path: newDiskPath.trim() || undefined,
            });
            toast.success(t('admin.vmInstances.disk_added') ?? 'Disk added successfully.');
            setNewDiskPath('');
            await fetchConfig();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setCreatingDisk(false);
        }
    };

    const handleDeleteDisk = async (key: string) => {
        // Validate disk key by VM type; UI should already filter, but keep a guard.
        if (isLxc) {
            if (!/^mp\d+$/.test(key)) return;
        } else if (!/^(scsi|virtio|sata|ide)\d+$/.test(key)) {
            return;
        }
        setDeletingDisk(key);
        try {
            await axios.delete(`/api/admin/vm-instances/${id}/disks/${key}`);
            toast.success(t('admin.vmInstances.disk_removed') ?? 'Disk removed.');
            await fetchConfig();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setDeletingDisk(null);
        }
    };

    const handleSuspend = async () => {
        setSuspending(true);
        try {
            await axios.post(`/api/admin/vm-instances/${id}/suspend`);
            toast.success(t('admin.vmInstances.suspend_success') ?? 'VM instance suspended');
            await fetchInstance();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setSuspending(false);
        }
    };

    const handleUnsuspend = async () => {
        setSuspending(true);
        try {
            await axios.post(`/api/admin/vm-instances/${id}/unsuspend`);
            toast.success(t('admin.vmInstances.unsuspend_success') ?? 'VM instance unsuspended');
            await fetchInstance();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setSuspending(false);
        }
    };

    const diskKeys = config
        ? (Object.keys(config) as string[]).filter((k) =>
              isLxc ? k === 'rootfs' || /^mp\d+$/.test(k) : /^(scsi|virtio|sata|ide)\d+$/.test(k),
          )
        : [];

    const editTabs = [
        { id: 'details', label: t('admin.vmInstances.edit_tabs.details') ?? 'Details', icon: Server },
        { id: 'network', label: t('admin.vmInstances.edit_tabs.network') ?? 'Network', icon: Wifi },
        { id: 'resources', label: t('admin.vmInstances.edit_tabs.resources') ?? 'Resources', icon: Cpu },
        ...(isLxc || vmType === 'qemu'
            ? [{ id: 'disks', label: t('admin.vmInstances.edit_tabs.disks') ?? 'Disks', icon: HardDrive }]
            : []),
        { id: 'history', label: t('admin.vmInstances.edit_tabs.history') ?? 'Task history', icon: History },
    ] as const;

    const allowedTabs = editTabs.map((tab) => tab.id);

    useEffect(() => {
        const tabFromUrl = searchParams.get('tab');
        if (!tabFromUrl) return;
        if (allowedTabs.includes(tabFromUrl as (typeof allowedTabs)[number])) {
            setActiveTab(tabFromUrl);
        } else if (activeTab !== 'details') {
            setActiveTab('details');
        }
    }, [searchParams, allowedTabs, activeTab]);

    const handleTabChange = useCallback(
        (tab: string) => {
            setActiveTab(tab);
            const params = new URLSearchParams(searchParams.toString());
            params.set('tab', tab);
            const query = params.toString();
            router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
        },
        [pathname, router, searchParams],
    );

    if (loading || !instance) {
        return (
            <div className='flex items-center justify-center min-h-[200px]'>
                <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-vm-instance-edit', 'top-of-page')} context={{ id }} />

            <PageHeader
                title={t('admin.vmInstances.edit') ?? 'Edit VM instance'}
                description={
                    t('admin.vmInstances.edit_desc') ?? 'Update hostname, notes, owner, IP, resources, and disks'
                }
                icon={Server}
                actions={
                    <div className='flex items-center gap-2'>
                        {instance.suspended === 1 ? (
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={handleUnsuspend}
                                disabled={suspending}
                                className='text-green-600 hover:text-green-700 border-green-500/20 hover:bg-green-500/10'
                            >
                                {suspending ? (
                                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                                ) : (
                                    <ShieldCheck className='h-4 w-4 mr-2' />
                                )}
                                {t('admin.vmInstances.unsuspend') ?? 'Unsuspend'}
                            </Button>
                        ) : (
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={handleSuspend}
                                disabled={suspending}
                                className='text-amber-600 hover:text-amber-700 border-amber-500/20 hover:bg-amber-500/10'
                            >
                                {suspending ? (
                                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                                ) : (
                                    <Ban className='h-4 w-4 mr-2' />
                                )}
                                {t('admin.vmInstances.suspend') ?? 'Suspend'}
                            </Button>
                        )}
                        <Button variant='outline' size='sm' onClick={() => router.push('/admin/vm-instances')}>
                            <ArrowLeft className='h-4 w-4 mr-2' />
                            {t('common.back')}
                        </Button>
                    </div>
                }
            />

            <Tabs
                value={activeTab}
                onValueChange={handleTabChange}
                orientation='vertical'
                className='w-full flex flex-col md:flex-row gap-6'
            >
                <aside className='w-full md:w-64 shrink-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0'>
                    <TabsList className='flex flex-row md:flex-col h-auto w-max md:w-full bg-card/30 border border-border/50 p-2 rounded-2xl gap-2 md:gap-1'>
                        {editTabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <TabsTrigger
                                    key={tab.id}
                                    value={tab.id}
                                    className='w-auto md:w-full justify-start px-4 py-3 h-auto text-sm md:text-base font-normal data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-medium transition-all rounded-xl border border-transparent data-[state=active]:border-primary/10 whitespace-nowrap'
                                >
                                    <Icon className='h-4 w-4 mr-3 shrink-0' />
                                    {tab.label}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                </aside>

                <div className='flex-1 space-y-6 min-w-0'>
                    <TabsContent value='details' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                        <DetailsTab
                            hostname={hostname}
                            setHostname={setHostname}
                            notes={notes}
                            setNotes={setNotes}
                            expiresAt={expiresAt}
                            setExpiresAt={setExpiresAt}
                            selectedOwner={selectedOwner}
                            setSelectedOwner={setSelectedOwner}
                            onOpenOwnerModal={() => {
                                setOwnerSearch('');
                                setOwnerPagination((p) => ({ ...p, current_page: 1 }));
                                setOwnerModalOpen(true);
                            }}
                            onSave={handleSaveDetails}
                            saving={savingTab === 'details'}
                            isLxc={isLxc}
                            dnsNameserver={dnsNameserver}
                            setDnsNameserver={setDnsNameserver}
                            dnsSearchDomain={dnsSearchDomain}
                            setDnsSearchDomain={setDnsSearchDomain}
                        />
                    </TabsContent>

                    <TabsContent value='network' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                        <NetworkTab
                            isLxc={isLxc}
                            networks={networks}
                            setNetworks={setNetworks}
                            removedNetKeys={removedNetKeys}
                            setRemovedNetKeys={setRemovedNetKeys}
                            newNetworkRow={newNetworkRow}
                            setNewNetworkRow={setNewNetworkRow}
                            freeIps={freeIps}
                            bridges={bridges}
                            assignedIpMap={assignedIpMap}
                            getRowIpOptions={getRowIpOptions}
                            onSave={handleSaveNetwork}
                            saving={savingTab === 'network'}
                        />
                    </TabsContent>

                    <TabsContent value='resources' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                        <ResourcesTab
                            vmBackupLimit={vmBackupLimit}
                            setVmBackupLimit={setVmBackupLimit}
                            vmBackupRetention={vmBackupRetention}
                            setVmBackupRetention={setVmBackupRetention}
                            config={config}
                            memory={memory}
                            setMemory={setMemory}
                            cpus={cpus}
                            setCpus={setCpus}
                            cores={cores}
                            setCores={setCores}
                            onBoot={onBoot}
                            setOnBoot={setOnBoot}
                            isQemu={!isLxc}
                            storageList={storageList}
                            biosMode={biosMode}
                            setBiosMode={setBiosMode}
                            efiEnabled={efiEnabled}
                            setEfiEnabled={setEfiEnabled}
                            efiStorage={efiStorage}
                            setEfiStorage={setEfiStorage}
                            nodeEfiStorageDefault={nodeEfiStorageDefault || 'local-lvm'}
                            tpmEnabled={tpmEnabled}
                            setTpmEnabled={setTpmEnabled}
                            tpmStorage={tpmStorage}
                            setTpmStorage={setTpmStorage}
                            nodeTpmStorageDefault={nodeTpmStorageDefault || 'local-lvm'}
                            onSave={handleSaveResources}
                            saving={savingTab === 'resources'}
                        />
                    </TabsContent>

                    <TabsContent value='history' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                        <HistoryTab instanceId={id} />
                    </TabsContent>

                    {(isLxc || vmType === 'qemu') && (
                        <TabsContent value='disks' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                            <DisksTab
                                isLxc={isLxc}
                                config={config}
                                diskKeys={diskKeys}
                                storageList={storageList}
                                newDiskStorage={newDiskStorage}
                                setNewDiskStorage={setNewDiskStorage}
                                newDiskSizeGb={newDiskSizeGb}
                                setNewDiskSizeGb={setNewDiskSizeGb}
                                newDiskPath={newDiskPath}
                                setNewDiskPath={setNewDiskPath}
                                resizeDisk={resizeDisk}
                                setResizeDisk={setResizeDisk}
                                resizeSize={resizeSize}
                                setResizeSize={setResizeSize}
                                onCreateDisk={handleCreateDisk}
                                onResizeDisk={handleResizeDisk}
                                onDeleteDisk={handleDeleteDisk}
                                creatingDisk={creatingDisk}
                                resizing={resizing}
                                deletingDisk={deletingDisk}
                            />
                        </TabsContent>
                    )}
                </div>
            </Tabs>

            <WidgetRenderer widgets={getWidgets('admin-vm-instance-edit', 'bottom-of-page')} context={{ id }} />

            <Sheet open={ownerModalOpen} onOpenChange={setOwnerModalOpen}>
                <SheetContent className='sm:max-w-2xl'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.vmInstances.select_owner') ?? 'Select owner'}</SheetTitle>
                        <SheetDescription>
                            {ownerPagination.total_records > 0
                                ? `Showing ${ownerPagination.total_records} users`
                                : t('common.search')}
                        </SheetDescription>
                    </SheetHeader>
                    <div className='mt-6 space-y-4'>
                        <div className='relative'>
                            <SearchIcon className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                            <Input
                                placeholder={t('common.search') ?? 'Search'}
                                value={ownerSearch}
                                onChange={(e) => {
                                    setOwnerSearch(e.target.value);
                                    setOwnerPagination((p) => ({ ...p, current_page: 1 }));
                                }}
                                className='pl-10'
                            />
                        </div>
                        <div className='space-y-2 max-h-[60vh] overflow-y-auto'>
                            {owners.length === 0 ? (
                                <p className='text-center py-6 text-muted-foreground'>{t('common.no_results')}</p>
                            ) : (
                                owners.map((user) => (
                                    <button
                                        key={user.id}
                                        type='button'
                                        onClick={() => {
                                            setSelectedOwner(user);
                                            setOwnerModalOpen(false);
                                        }}
                                        className='w-full p-3 rounded-xl border border-border/50 hover:border-primary hover:bg-primary/5 text-left'
                                    >
                                        <div className='flex flex-col'>
                                            <span className='font-semibold'>{user.username}</span>
                                            <span className='text-xs text-muted-foreground'>{user.email}</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
