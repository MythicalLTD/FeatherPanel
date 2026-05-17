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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { PageCard } from '@/components/featherui/PageCard';
import { StepIndicator } from '@/components/ui/step-indicator';
import { Select } from '@/components/ui/select-native';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { VmTemplatePickerSheet } from '@/components/admin/VmTemplatePickerSheet';
import { VmIpPickerSheet } from '@/components/admin/VmIpPickerSheet';
import { OwnerCreateForm } from '@/components/admin/OwnerCreateForm';
import {
    Server,
    Loader2,
    AlertTriangle,
    RefreshCw,
    MapPin,
    Search as SearchIcon,
    UserCircle,
    X,
    ChevronLeft,
    ChevronRight,
    Plus,
    Settings,
    Cpu,
    HardDrive,
    Database,
} from 'lucide-react';

interface VmNode {
    id: number;
    name: string;
    fqdn?: string;
    location_id?: number | null;
}

interface VmClusterNode {
    node: string;
    status?: string;
}

interface FreeIp {
    id: number;
    ip: string;
    cidr: number | null;
    gateway: string | null;
}

interface VmTemplate {
    id: number;
    name: string;
    template_file: string | null;
    guest_type: string;
}

interface OwnerUser {
    id: number;
    uuid: string;
    username: string;
    email: string;
}

interface NetworkRow {
    key: string;
    vm_ip_id: number | null;
}

const totalSteps = 3;

export default function VmInstancesCreatePage() {
    const { t } = useTranslation();
    const router = useRouter();

    const [currentStep, setCurrentStep] = useState(1);

    const [templateId, setTemplateId] = useState<number>(0);
    const [networks, setNetworks] = useState<NetworkRow[]>([{ key: 'net0', vm_ip_id: null }]);
    const [hostname, setHostname] = useState('');
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [loadingMeta, setLoadingMeta] = useState(false);
    const [freeIps, setFreeIps] = useState<FreeIp[]>([]);
    const [templates, setTemplates] = useState<VmTemplate[]>([]);
    const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
    const [ipPickerOpen, setIpPickerOpen] = useState(false);
    const [ipPickerInitialMode, setIpPickerInitialMode] = useState<'browse' | 'create'>('browse');
    const [targetNetworkKey, setTargetNetworkKey] = useState<string>('net0');
    const [submitting, setSubmitting] = useState(false);
    const [creatingMessage, setCreatingMessage] = useState<string | null>(null);

    const [selectedOwner, setSelectedOwner] = useState<OwnerUser | null>(null);
    const [ownerModalOpen, setOwnerModalOpen] = useState(false);
    const [ownerPickerMode, setOwnerPickerMode] = useState<'browse' | 'create'>('browse');
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

    type InfraGate =
        | { status: 'loading' }
        | { status: 'ready' }
        | { status: 'blocked'; vpsLocations: number; vdsNodes: number }
        | { status: 'error' };
    const [infraGate, setInfraGate] = useState<InfraGate>({ status: 'loading' });

    const wizardSteps = [
        {
            title: t('admin.vmInstances.wizard.step1_title') ?? 'Node & template',
            subtitle: t('admin.vmInstances.wizard.step1_subtitle') ?? 'Choose node, template, and IP',
        },
        {
            title: t('admin.vmInstances.wizard.step2_title') ?? 'Resources',
            subtitle: t('admin.vmInstances.wizard.step2_subtitle') ?? 'CPU, memory, disk, and network',
        },
        {
            title: t('admin.vmInstances.wizard.step3_title') ?? 'Details & owner',
            subtitle: t('admin.vmInstances.wizard.step3_subtitle') ?? 'Hostname and assign owner',
        },
    ];

    const [nodes, setNodes] = useState<VmNode[]>([]);
    const [nodeId, setNodeId] = useState<number>(0);
    const [pveNodes, setPveNodes] = useState<VmClusterNode[]>([]);
    const [pveNode, setPveNode] = useState('');
    const [memory, setMemory] = useState(1024);
    const [cpus, setCpus] = useState(1);
    const [cores, setCores] = useState(1);
    const [disk, setDisk] = useState(10);
    const [storage, setStorage] = useState('local');
    const [bridge, setBridge] = useState('vmbr0');
    const [onBoot, setOnBoot] = useState(true);
    const [bridges, setBridges] = useState<string[]>([]);
    const [storageList, setStorageList] = useState<string[]>([]);
    const [loadingBridges, setLoadingBridges] = useState(false);
    const [loadingStorage, setLoadingStorage] = useState(false);

    const [ciUser, setCiUser] = useState('root');
    const [ciPassword, setCiPassword] = useState('');
    const [backupLimit, setBackupLimit] = useState(5);
    const [backupRetentionMode, setBackupRetentionMode] = useState<'inherit' | 'hard_limit' | 'fifo_rolling'>(
        'inherit',
    );

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-vm-instances-create');

    const selectedTemplate = templates.find((tpl) => tpl.id === templateId) || null;
    const isLxcTemplate = selectedTemplate?.guest_type === 'lxc';
    const primaryNetwork = networks[0] ?? null;
    const wizardBlockedByInfra = infraGate.status === 'blocked';
    const wizardNavWaitingInfra = infraGate.status === 'loading';

    const refreshInfrastructureCheck = useCallback(async () => {
        setInfraGate({ status: 'loading' });
        try {
            const [locRes, nodeRes] = await Promise.all([
                axios.get('/api/admin/locations', { params: { type: 'vps', page: 1, limit: 1 } }),
                axios.get('/api/admin/vm-nodes', { params: { page: 1, limit: 1 } }),
            ]);
            const vpsLocations = Number(locRes.data?.data?.pagination?.total_records ?? 0);
            const vdsNodes = Number(nodeRes.data?.data?.pagination?.total_records ?? 0);
            if (vpsLocations > 0 && vdsNodes > 0) setInfraGate({ status: 'ready' });
            else setInfraGate({ status: 'blocked', vpsLocations, vdsNodes });
        } catch (e) {
            console.error('VDS infrastructure prerequisite check failed:', e);
            setInfraGate({ status: 'error' });
        }
    }, []);

    useEffect(() => {
        axios
            .get('/api/admin/vm-nodes', { params: { limit: 100 } })
            .then((res) => setNodes(res.data.data?.vm_nodes ?? []))
            .catch(() => toast.error(t('admin.vmInstances.errors.fetch_failed')))
            .finally(() => setLoadingPlans(false));
    }, [t]);

    useEffect(() => {
        const timer = setTimeout(() => {
            void refreshInfrastructureCheck();
        }, 0);
        return () => clearTimeout(timer);
    }, [refreshInfrastructureCheck]);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const loadNodeMeta = useCallback(
        async (opts?: { preserveSelections?: boolean }) => {
            if (nodeId <= 0) {
                setFreeIps([]);
                setTemplates([]);
                setBridges([]);
                setStorageList([]);
                setPveNodes([]);
                setPveNode('');
                return;
            }
            setLoadingMeta(true);
            try {
                const [ipsRes, tplRes, clusterRes] = await Promise.all([
                    axios.get(`/api/admin/vm-nodes/${nodeId}/free-ips`),
                    axios.get(`/api/admin/vm-nodes/${nodeId}/templates`),
                    axios.get(`/api/admin/vm-nodes/${nodeId}/cluster-nodes`),
                ]);
                const ips = (ipsRes.data.data?.free_ips ?? []) as FreeIp[];
                const tpls = (tplRes.data.data?.templates ?? []) as VmTemplate[];
                setFreeIps(ips);
                setTemplates(tpls);

                const preserve = opts?.preserveSelections === true;
                setNetworks((prev) => {
                    const head = prev[0];
                    const validHeadSelection = head?.vm_ip_id != null && ips.some((ip) => ip.id === head.vm_ip_id);
                    if (preserve && head && validHeadSelection) {
                        return prev;
                    }
                    return [{ key: 'net0', vm_ip_id: ips[0]?.id ?? null }];
                });

                if (!preserve) {
                    setTemplateId((prev) => (tpls.some((tpl) => tpl.id === prev) ? prev : 0));
                }

                const clusterNodes = clusterRes.data.data?.nodes ?? [];
                const sortedNodes = [...clusterNodes].sort((a, b) => (a.node || '').localeCompare(b.node || ''));
                setPveNodes(sortedNodes);
                setPveNode((prev) => (sortedNodes.some((n) => n.node === prev) ? prev : (sortedNodes[0]?.node ?? '')));
            } catch {
                toast.error(t('admin.vmInstances.errors.fetch_failed'));
            } finally {
                setLoadingMeta(false);
            }
        },
        [nodeId, t],
    );

    useEffect(() => {
        if (nodeId > 0) setTemplateId(0);
        void loadNodeMeta();
    }, [nodeId, loadNodeMeta]);

    useEffect(() => {
        if (nodeId <= 0 || pveNode === '') {
            setBridges([]);
            setStorageList([]);
            return;
        }
        setLoadingBridges(true);
        setLoadingStorage(true);
        axios
            .get(`/api/admin/vm-nodes/${nodeId}/bridges`, { params: { pve_node: pveNode } })
            .then((res) => {
                const list = res.data.data?.bridges ?? [];
                setBridges(list);
                if (list.length > 0) {
                    setBridge((prev) => (list.includes(prev) ? prev : list[0]));
                }
            })
            .catch(() => {
                setBridges([]);
            })
            .finally(() => setLoadingBridges(false));
        axios
            .get(`/api/admin/vm-nodes/${nodeId}/storage`, { params: { pve_node: pveNode } })
            .then((res) => {
                const list = res.data.data?.storage ?? [];
                setStorageList(list);
                if (list.length > 0) {
                    setStorage((prev) => (list.includes(prev) ? prev : list[0]));
                }
            })
            .catch(() => {
                setStorageList([]);
            })
            .finally(() => setLoadingStorage(false));
    }, [nodeId, pveNode]);

    const fetchOwners = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/admin/users', {
                params: {
                    search: ownerSearch,
                    page: ownerPagination.current_page,
                    limit: ownerPagination.per_page,
                },
            });
            setOwners(data.data?.users ?? []);
            if (data.data?.pagination) {
                setOwnerPagination((prev) => ({ ...prev, ...data.data.pagination }));
            }
        } catch {
            toast.error(t('admin.vmInstances.errors.fetch_failed'));
        }
    }, [ownerSearch, ownerPagination.current_page, ownerPagination.per_page, t]);

    useEffect(() => {
        if (ownerModalOpen) {
            if (ownerPickerMode === 'create') return;
            const timer = setTimeout(() => fetchOwners(), 300);
            return () => clearTimeout(timer);
        }
    }, [ownerModalOpen, ownerPickerMode, ownerSearch, ownerPagination.current_page, fetchOwners]);

    const handlePrevious = () => setCurrentStep((s) => Math.max(1, s - 1));
    const handleNext = () => {
        if (wizardBlockedByInfra || wizardNavWaitingInfra) {
            if (wizardBlockedByInfra) {
                toast.error(t('admin.vmInstances.infrastructure_required_to_continue'));
            }
            return;
        }
        if (currentStep === 1) {
            if (nodeId <= 0) {
                toast.error(t('admin.vmInstances.select_node') ?? 'Select a node first.');
                return;
            }
            if (templateId <= 0) {
                toast.error(t('admin.vmInstances.select_template') ?? 'Select a template.');
                return;
            }
            if (freeIps.length === 0) {
                toast.error(
                    t('admin.vmInstances.no_free_ips') ??
                        'No free IPs found for this node. Configure an IP pool on the node first.',
                );
                return;
            }
            if (primaryNetwork?.vm_ip_id == null) {
                toast.error(t('admin.vmInstances.select_ip') ?? 'Select a primary IP.');
                return;
            }
        }

        setCurrentStep((s) => Math.min(totalSteps, s + 1));
    };

    const addNetworkRow = () => {
        const nextIndex =
            networks.length > 0
                ? Math.max(...networks.map((row) => parseInt(row.key.replace(/\D/g, ''), 10) || 0)) + 1
                : 0;

        setNetworks((prev) => [...prev, { key: `net${nextIndex}`, vm_ip_id: null }]);
    };

    const removeNetworkRow = (key: string) => {
        setNetworks((prev) => prev.filter((row) => row.key !== key));
    };

    const openIpPickerForRow = (rowKey: string, mode: 'browse' | 'create' = 'browse') => {
        setTargetNetworkKey(rowKey);
        setIpPickerInitialMode(mode);
        setIpPickerOpen(true);
    };

    const canProceedStep1 = nodeId > 0 && pveNode !== '' && templateId > 0 && primaryNetwork?.vm_ip_id != null;
    const noFreeIpsAvailable = nodeId > 0 && !loadingMeta && freeIps.length === 0;
    const hostnameValid = hostname.trim().length > 0;
    const ownerSelected = selectedOwner != null;
    const ciFieldsValid = isLxcTemplate || (ciUser.trim().length > 0 && ciPassword.trim().length > 0);
    const canCreate =
        currentStep === totalSteps &&
        canProceedStep1 &&
        hostnameValid &&
        ownerSelected &&
        ciFieldsValid &&
        primaryNetwork?.vm_ip_id != null;

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Never create from form submit (e.g. Enter key). Create only via explicit Create button click.
    };

    const handleCreate = async () => {
        if (wizardBlockedByInfra || wizardNavWaitingInfra) {
            if (wizardBlockedByInfra) {
                toast.error(t('admin.vmInstances.infrastructure_required_to_continue'));
            }
            return;
        }
        if (currentStep !== totalSteps) return;
        if (!canProceedStep1) {
            toast.error(
                t('admin.vmInstances.select_node_template') ?? 'Select a node, template, and ensure IPs are available',
            );
            return;
        }
        if (templateId <= 0) {
            toast.error(t('admin.vmInstances.select_template') ?? 'Select a template');
            return;
        }
        if (freeIps.length === 0) {
            toast.error(t('admin.vmInstances.no_free_ips') ?? 'No free IPs for this node.');
            return;
        }
        if (primaryNetwork?.vm_ip_id == null) {
            toast.error(t('admin.vmInstances.no_free_ips') ?? 'No free IPs for this node.');
            return;
        }
        if (!hostname.trim()) {
            toast.error(t('admin.vmInstances.errors.hostname_required') ?? 'Hostname is required.');
            return;
        }
        if (!isLxcTemplate) {
            if (!ciUser.trim()) {
                toast.error(t('admin.vmInstances.errors.ci_user_required') ?? 'Cloud-init username is required.');
                return;
            }
            if (!ciPassword.trim()) {
                toast.error(t('admin.vmInstances.errors.ci_password_required') ?? 'Cloud-init password is required.');
                return;
            }
        }
        if (!selectedOwner) {
            toast.error(t('admin.vmInstances.errors.owner_required') ?? 'You must select an owner for this VM.');
            return;
        }
        setSubmitting(true);
        setCreatingMessage(null);
        const toastId = toast.loading(t('admin.vmInstances.initiating_creation'));
        try {
            const payload: Record<string, unknown> = {
                vm_node_id: nodeId,
                template_id: templateId,
                memory,
                cpus,
                cores,
                disk,
                storage: storage || 'local',
                bridge: bridge || 'vmbr0',
                on_boot: onBoot,
                hostname: hostname.trim(),
                backup_limit: backupLimit,
                backup_retention_mode: backupRetentionMode === 'inherit' ? null : backupRetentionMode,
                vm_ip_id: primaryNetwork.vm_ip_id,
                pve_node: pveNode || undefined,
                networks: networks
                    .filter((row) => row.vm_ip_id != null)
                    .map((row) => ({ key: row.key, vm_ip_id: row.vm_ip_id })),
            };
            if (!isLxcTemplate) {
                payload.ci_user = ciUser.trim();
                payload.ci_password = ciPassword;
            }
            if (selectedOwner?.uuid) payload.user_uuid = selectedOwner.uuid;

            const res = await axios.put('/api/admin/vm-instances', payload);
            const creationId = res.data?.data?.creation_id;

            if (res.status === 202 && creationId) {
                toast.loading(res.data?.message || 'Creation scheduled to queue…', { id: toastId });
                setCreatingMessage(t('admin.vmInstances.creating_clone') ?? 'Cloning template…');
                await pollCreationStatus(creationId, toastId);
                return;
            }

            toast.success(t('admin.vmInstances.create_success') ?? 'VM instance created successfully', { id: toastId });
            router.push('/admin/vm-instances');
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg, { id: toastId });
            setSubmitting(false);
            setCreatingMessage(null);
        }
    };

    const pollCreationStatus = async (creationId: string, toastId: string | number) => {
        const maxAttempts = 300;
        const intervalMs = 3000;
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const res = await axios.get(`/api/admin/vm-instances/creation-status/${creationId}`);
                const status = res.data?.data?.status;
                const message = res.data?.data?.message;

                if (message) {
                    setCreatingMessage(message);
                    toast.loading(message, { id: toastId });
                }

                if (status === 'active' || status === 'completed') {
                    toast.success(t('admin.vmInstances.create_success') ?? 'VM instance created successfully', {
                        id: toastId,
                    });
                    router.push('/admin/vm-instances');
                    return;
                }

                if (status === 'failed') {
                    const err = res.data?.data?.error ?? 'Creation failed';
                    toast.error(err, { id: toastId });
                    setSubmitting(false);
                    setCreatingMessage(null);
                    return;
                }
            } catch (e) {
                console.error('Error polling creation status:', e);
            }
            await new Promise((r) => setTimeout(r, intervalMs));
        }
        toast.error(t('admin.vmInstances.creating_timeout') ?? 'Creation timed out', { id: toastId });
        setSubmitting(false);
        setCreatingMessage(null);
    };

    return (
        <div className='mx-auto max-w-5xl pb-20'>
            <WidgetRenderer widgets={getWidgets('admin-vm-instances-create', 'top-of-page')} />

            <PageHeader
                title={t('admin.vmInstances.create') ?? 'Create VM instance'}
                description={t('admin.vmInstances.create_desc') ?? 'Provision a new VPS from a plan and template'}
                icon={Server}
                actions={
                    <Button variant='outline' onClick={() => router.push('/admin/vm-instances')}>
                        <X className='mr-2 h-4 w-4' />
                        {t('admin.servers.form.cancel') ?? t('common.cancel')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-vm-instances-create', 'after-header')} />

            {infraGate.status === 'blocked' && (
                <div className='border-border/50 bg-card/70 mt-6 rounded-2xl border shadow-sm backdrop-blur-md'>
                    <div className='flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6'>
                        <div className='flex min-w-0 flex-1 gap-3'>
                            <div className='bg-primary/12 text-primary ring-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1'>
                                <AlertTriangle className='h-5 w-5' aria-hidden />
                            </div>
                            <div className='min-w-0 space-y-1'>
                                <p className='text-sm leading-snug font-semibold'>
                                    {t('admin.vmInstances.infrastructure_required')}
                                </p>
                                <p className='text-muted-foreground text-sm leading-relaxed'>
                                    {infraGate.vpsLocations === 0
                                        ? t('admin.vmInstances.create_vps_location_first')
                                        : t('admin.vmInstances.create_vds_node_first')}
                                </p>
                                <p className='text-muted-foreground/80 text-xs'>
                                    {t('admin.vmInstances.infrastructure_counts', {
                                        locations: infraGate.vpsLocations.toString(),
                                        nodes: infraGate.vdsNodes.toString(),
                                    })}
                                </p>
                            </div>
                        </div>
                        <div className='flex shrink-0 items-center justify-end gap-2 sm:justify-start'>
                            <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='text-muted-foreground hover:text-foreground h-10 w-10 rounded-xl'
                                title={t('admin.vmInstances.recheck_infrastructure')}
                                onClick={() => void refreshInfrastructureCheck()}
                            >
                                <RefreshCw className='h-4 w-4' />
                            </Button>
                            <Button asChild className='h-10 min-w-[8.5rem] rounded-xl px-5'>
                                <Link
                                    href={infraGate.vpsLocations === 0 ? '/admin/locations' : '/admin/vds-nodes/create'}
                                    className='inline-flex items-center justify-center gap-2'
                                >
                                    {infraGate.vpsLocations === 0 ? (
                                        <>
                                            <MapPin className='h-4 w-4 shrink-0' />
                                            Add VPS location
                                        </>
                                    ) : (
                                        <>
                                            <Server className='h-4 w-4 shrink-0' />
                                            Create node
                                        </>
                                    )}
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className='bg-card/50 border-border/50 mt-8 mb-12 rounded-2xl border p-6 backdrop-blur-xl'>
                <StepIndicator steps={wizardSteps} currentStep={currentStep} />
                {loadingPlans && (
                    <p className='text-muted-foreground mt-4 flex items-center gap-2 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        {t('common.loading') ?? 'Loading nodes…'}
                    </p>
                )}
            </div>

            <form onSubmit={handleFormSubmit} className='min-h-[400px]'>
                {currentStep === 1 && (
                    <div className='space-y-8'>
                        <PageCard
                            title={t('admin.vmInstances.wizard.step1_title') ?? 'Node & template'}
                            icon={Settings}
                            className='animate-in fade-in-0 slide-in-from-right-4 duration-300'
                        >
                            <div className='space-y-6'>
                                <div className='space-y-3'>
                                    <Label className='flex items-center gap-1.5'>
                                        {t('admin.vmInstances.node') ?? 'VDS Node'}
                                        <span className='font-bold text-red-500'>*</span>
                                    </Label>
                                    <Select
                                        value={nodeId || ''}
                                        onChange={(e) => setNodeId(Number(e.target.value))}
                                        className='bg-muted/30 h-11 rounded-xl'
                                    >
                                        <option value=''>{t('admin.vmInstances.select_node') ?? 'Select node'}</option>
                                        {nodes.map((n) => (
                                            <option key={n.id} value={n.id}>
                                                {n.name}
                                                {n.fqdn ? ` (${n.fqdn})` : ''}
                                            </option>
                                        ))}
                                    </Select>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.vmInstances.node_help') ??
                                            'Proxmox node where the VM will be created.'}
                                    </p>
                                </div>

                                {loadingMeta && (
                                    <p className='text-muted-foreground flex items-center gap-2 text-sm'>
                                        <Loader2 className='h-4 w-4 animate-spin' /> {t('common.loading') ?? 'Loading…'}
                                    </p>
                                )}

                                {nodeId > 0 && !loadingMeta && (
                                    <>
                                        <div className='space-y-3'>
                                            <Label className='flex items-center gap-1.5'>
                                                {t('admin.vmInstances.proxmox_node') ?? 'Proxmox Node'}
                                                <span className='font-bold text-red-500'>*</span>
                                            </Label>
                                            <Select
                                                value={pveNode || ''}
                                                onChange={(e) => setPveNode(e.target.value)}
                                                className='bg-muted/30 h-11 rounded-xl'
                                            >
                                                {pveNodes.map((node) => (
                                                    <option key={node.node} value={node.node}>
                                                        {node.node}
                                                        {node.status ? ` (${node.status})` : ''}
                                                    </option>
                                                ))}
                                            </Select>
                                            <p className='text-muted-foreground text-xs'>
                                                {t('admin.vmInstances.proxmox_node_help') ??
                                                    'Exact Proxmox cluster node where this VM will be created.'}
                                            </p>
                                        </div>
                                        <div className='space-y-3'>
                                            <Label className='flex items-center gap-1.5'>
                                                {t('admin.vmInstances.template') ?? 'Template'}
                                                <span className='font-bold text-red-500'>*</span>
                                            </Label>
                                            <div className='flex gap-2'>
                                                <div
                                                    role='button'
                                                    tabIndex={0}
                                                    onClick={() => setTemplatePickerOpen(true)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            setTemplatePickerOpen(true);
                                                        }
                                                    }}
                                                    className='bg-muted/30 border-border/50 focus-visible:ring-ring flex h-11 flex-1 cursor-pointer items-center rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                                                >
                                                    {selectedTemplate ? (
                                                        <div className='min-w-0'>
                                                            <div className='truncate font-medium'>
                                                                {selectedTemplate.name}
                                                            </div>
                                                            <div className='text-muted-foreground truncate font-mono text-xs'>
                                                                VMID {selectedTemplate.template_file ?? '—'} ·{' '}
                                                                {selectedTemplate.guest_type === 'lxc'
                                                                    ? 'LXC'
                                                                    : 'QEMU/KVM'}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className='text-muted-foreground'>
                                                            {t('admin.vmInstances.select_template') ??
                                                                'Select template'}
                                                        </span>
                                                    )}
                                                </div>
                                                <Button
                                                    type='button'
                                                    size='icon'
                                                    onClick={() => setTemplatePickerOpen(true)}
                                                    className='h-11 w-11'
                                                >
                                                    <SearchIcon className='h-4 w-4' />
                                                </Button>
                                            </div>
                                            {templates.length === 0 && (
                                                <p className='text-muted-foreground text-xs'>
                                                    {t('admin.vmInstances.no_templates_qemu')}
                                                </p>
                                            )}
                                        </div>
                                        {noFreeIpsAvailable && (
                                            <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 p-4'>
                                                <p className='text-sm font-medium text-amber-700 dark:text-amber-300'>
                                                    {t('admin.vmInstances.no_free_ips') ??
                                                        'No free IPs found for this node.'}
                                                </p>
                                                <p className='mt-1 text-xs text-amber-700/90 dark:text-amber-300/90'>
                                                    {t('admin.vmInstances.ip_pool_required') ??
                                                        'Configure at least one IP in the node IP pool, then try again.'}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </PageCard>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className='space-y-8'>
                        <PageCard
                            title={t('admin.vmInstances.wizard.step2_title') ?? 'Resources'}
                            icon={Database}
                            className='animate-in fade-in-0 slide-in-from-right-4 duration-300'
                        >
                            <p className='text-muted-foreground mb-6 text-sm'>
                                {t('admin.vmInstances.wizard.step2_subtitle') ?? 'CPU, memory, disk, and network'}
                            </p>
                            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
                                <div className='space-y-3'>
                                    <Label className='flex items-center gap-1.5'>
                                        <Database className='h-4 w-4' />
                                        {t('admin.vmInstances.memory') ?? 'Memory (MB)'}
                                    </Label>
                                    <Input
                                        type='number'
                                        min={128}
                                        value={memory}
                                        onChange={(e) => setMemory(parseInt(e.target.value, 10) || 512)}
                                        className='bg-muted/30 h-11'
                                    />
                                </div>
                                <div className='space-y-3'>
                                    <Label className='flex items-center gap-1.5'>
                                        <Cpu className='h-4 w-4' />
                                        {t('admin.vmInstances.cpus') ?? 'CPUs'}
                                    </Label>
                                    <Input
                                        type='number'
                                        min={1}
                                        value={cpus}
                                        onChange={(e) => setCpus(parseInt(e.target.value, 10) || 1)}
                                        className='bg-muted/30 h-11'
                                    />
                                </div>
                                <div className='space-y-3'>
                                    <Label>{t('admin.vmInstances.cores') ?? 'Cores per CPU'}</Label>
                                    <Input
                                        type='number'
                                        min={1}
                                        value={cores}
                                        onChange={(e) => setCores(parseInt(e.target.value, 10) || 1)}
                                        className='bg-muted/30 h-11'
                                    />
                                </div>
                                <div className='space-y-3'>
                                    <Label className='flex items-center gap-1.5'>
                                        <HardDrive className='h-4 w-4' />
                                        {t('admin.vmInstances.disk') ?? 'Disk (GB)'}
                                    </Label>
                                    <Input
                                        type='number'
                                        min={1}
                                        value={disk}
                                        onChange={(e) => setDisk(parseInt(e.target.value, 10) || 10)}
                                        className='bg-muted/30 h-11'
                                    />
                                </div>
                                <div className='space-y-3'>
                                    <Label>{t('admin.vmInstances.storage') ?? 'Storage'}</Label>
                                    {loadingStorage ? (
                                        <p className='text-muted-foreground flex items-center gap-2 py-2 text-sm'>
                                            <Loader2 className='h-4 w-4 animate-spin' />{' '}
                                            {t('common.loading') ?? 'Loading…'}
                                        </p>
                                    ) : storageList.length > 0 ? (
                                        <Select
                                            value={storage}
                                            onChange={(e) => setStorage(e.target.value)}
                                            className='bg-muted/30 h-11 rounded-xl'
                                        >
                                            {storageList.map((s) => (
                                                <option key={s} value={s}>
                                                    {s}
                                                </option>
                                            ))}
                                        </Select>
                                    ) : (
                                        <Input
                                            value={storage}
                                            onChange={(e) => setStorage(e.target.value)}
                                            placeholder='local'
                                            className='bg-muted/30 h-11'
                                        />
                                    )}
                                </div>
                                <div className='space-y-3'>
                                    <Label>{t('admin.vmInstances.bridge') ?? 'Bridge'}</Label>
                                    {loadingBridges ? (
                                        <p className='text-muted-foreground flex items-center gap-2 py-2 text-sm'>
                                            <Loader2 className='h-4 w-4 animate-spin' />{' '}
                                            {t('common.loading') ?? 'Loading…'}
                                        </p>
                                    ) : bridges.length > 0 ? (
                                        <Select
                                            value={bridge}
                                            onChange={(e) => setBridge(e.target.value)}
                                            className='bg-muted/30 h-11 rounded-xl'
                                        >
                                            {bridges.map((b) => (
                                                <option key={b} value={b}>
                                                    {b}
                                                </option>
                                            ))}
                                        </Select>
                                    ) : (
                                        <Input
                                            value={bridge}
                                            onChange={(e) => setBridge(e.target.value)}
                                            placeholder='vmbr0'
                                            className='bg-muted/30 h-11'
                                        />
                                    )}
                                </div>
                                <div className='space-y-3 sm:col-span-2'>
                                    <Label>{t('admin.vmInstances.network') ?? 'Network'}</Label>
                                    <p className='text-muted-foreground text-xs'>
                                        {isLxcTemplate
                                            ? (t('admin.vmInstances.network_multi_hint') ??
                                              'Add or remove IPs (Proxmox net0, net1, …). Select one pool IP for each interface.')
                                            : (t('admin.vmInstances.network_multi_qemu_hint') ??
                                              'Add or remove IPs for this VM. FeatherPanel will keep NICs and cloud-init network config aligned automatically.')}
                                    </p>
                                    <div className='space-y-3'>
                                        {networks.map((row, index) => (
                                            <div
                                                key={row.key}
                                                className='border-border/50 bg-muted/20 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center'
                                            >
                                                <div className='min-w-24'>
                                                    <div className='font-mono text-sm font-semibold'>{row.key}</div>
                                                    <div className='text-muted-foreground text-xs'>
                                                        {index === 0
                                                            ? (t('admin.vmInstances.primary_ip') ?? 'Primary')
                                                            : (t('admin.vmInstances.secondary_ip') ?? 'Secondary')}
                                                    </div>
                                                </div>
                                                <div
                                                    role='button'
                                                    tabIndex={0}
                                                    onClick={() => openIpPickerForRow(row.key, 'browse')}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            openIpPickerForRow(row.key, 'browse');
                                                        }
                                                    }}
                                                    className='bg-muted/30 border-border/50 focus-visible:ring-ring flex h-11 flex-1 cursor-pointer items-center rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                                                >
                                                    {row.vm_ip_id != null ? (
                                                        <div className='min-w-0'>
                                                            <div className='truncate font-mono font-medium'>
                                                                {freeIps.find((ip) => ip.id === row.vm_ip_id)?.ip ||
                                                                    (t('admin.vmInstances.select_ip') ?? 'Select IP')}
                                                            </div>
                                                            <div className='text-muted-foreground font-mono text-xs'>
                                                                {(() => {
                                                                    const selected = freeIps.find(
                                                                        (ip) => ip.id === row.vm_ip_id,
                                                                    );
                                                                    if (!selected) return '';
                                                                    return `${selected.cidr !== null ? `/${selected.cidr}` : 'No CIDR'} · ${selected.gateway || 'No gateway'}`;
                                                                })()}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className='text-muted-foreground'>
                                                            {t('admin.vmInstances.select_ip') ?? 'Select IP'}
                                                        </span>
                                                    )}
                                                </div>
                                                <Button
                                                    type='button'
                                                    variant='ghost'
                                                    size='icon'
                                                    onClick={() => openIpPickerForRow(row.key, 'create')}
                                                    title={t('admin.vmInstances.create_ip_and_assign')}
                                                    className='self-end sm:self-auto'
                                                >
                                                    <Plus className='h-4 w-4' />
                                                </Button>
                                                <Button
                                                    type='button'
                                                    variant='ghost'
                                                    size='icon'
                                                    onClick={() => openIpPickerForRow(row.key, 'browse')}
                                                    title={t('admin.vmInstances.select_ip') ?? 'Select IP'}
                                                    className='self-end sm:self-auto'
                                                >
                                                    <SearchIcon className='h-4 w-4' />
                                                </Button>
                                                <Button
                                                    type='button'
                                                    variant='ghost'
                                                    size='icon'
                                                    disabled={index === 0}
                                                    onClick={() => removeNetworkRow(row.key)}
                                                    className='self-end sm:self-auto'
                                                >
                                                    <X className='h-4 w-4' />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className='flex items-center justify-between gap-3'>
                                        <p className='text-muted-foreground text-xs'>
                                            {t('admin.vmInstances.ip_help') ??
                                                'Leave on Auto to assign the first free IP from the node pool.'}
                                        </p>
                                        <div className='flex items-center gap-2'>
                                            <Button
                                                type='button'
                                                variant='outline'
                                                size='sm'
                                                onClick={() => openIpPickerForRow(networks[0]?.key || 'net0', 'create')}
                                            >
                                                <Plus className='mr-2 h-4 w-4' />
                                                Create IP
                                            </Button>
                                            <Button type='button' variant='outline' size='sm' onClick={addNetworkRow}>
                                                <Plus className='mr-2 h-4 w-4' />
                                                {t('admin.vmInstances.add_ip') ?? 'Add IP'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className='bg-muted/20 border-border/50 mt-6 flex items-center justify-between rounded-xl border p-4'>
                                <Label>{t('admin.vmInstances.on_boot') ?? 'Start on boot'}</Label>
                                <input
                                    type='checkbox'
                                    checked={onBoot}
                                    onChange={(e) => setOnBoot(e.target.checked)}
                                    className='border-border h-4 w-4 rounded'
                                />
                            </div>
                            <div className='mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2'>
                                <div className='space-y-3'>
                                    <Label className='flex items-center gap-1.5'>
                                        <Database className='h-4 w-4' />
                                        {t('admin.vmInstances.backups.limit_label_create') ?? 'Backup limit'}
                                    </Label>
                                    <Input
                                        type='number'
                                        min={0}
                                        max={100}
                                        value={backupLimit}
                                        onChange={(e) =>
                                            setBackupLimit(
                                                Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)),
                                            )
                                        }
                                        className='bg-muted/30 h-11'
                                    />
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.vmInstances.backups.limit_help') ??
                                            'Maximum number of backups allowed for this instance (0 = no backups).'}
                                    </p>
                                </div>
                                <div className='space-y-3'>
                                    <Label>
                                        {t('admin.vmInstances.backups.retention_label_create') ?? 'Backup retention'}
                                    </Label>
                                    <select
                                        className='border-input bg-muted/30 h-11 w-full rounded-md border px-3 text-sm'
                                        value={backupRetentionMode}
                                        onChange={(e) =>
                                            setBackupRetentionMode(
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
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.vmInstances.backups.retention_help_create') ??
                                            'Inherit uses the panel default. FIFO rolls the oldest backup when full.'}
                                    </p>
                                </div>
                            </div>
                        </PageCard>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className='space-y-8'>
                        <PageCard
                            title={t('admin.vmInstances.wizard.step3_title') ?? 'Details & owner'}
                            icon={UserCircle}
                            className='animate-in fade-in-0 slide-in-from-right-4 duration-300'
                        >
                            <p className='text-muted-foreground mb-6 text-sm'>
                                {t('admin.vmInstances.wizard.step3_subtitle') ?? 'Hostname and assign owner'}
                            </p>
                            <div className='space-y-6'>
                                <div className='space-y-3'>
                                    <Label className='flex items-center gap-1.5'>
                                        {t('admin.vmInstances.hostname') ?? 'Hostname'}
                                        <span className='font-bold text-red-500'>*</span>
                                    </Label>
                                    <Input
                                        value={hostname}
                                        onChange={(e) => setHostname(e.target.value)}
                                        placeholder='e.g. my-vm or web-01'
                                        className='bg-muted/30 h-11'
                                    />
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.vmInstances.hostname_help') ??
                                            'Valid DNS name: only letters, numbers, and hyphens (e.g. my-vm). Required.'}
                                    </p>
                                </div>

                                {!isLxcTemplate && (
                                    <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
                                        <div className='space-y-3'>
                                            <Label className='flex items-center gap-1.5'>
                                                {t('admin.vmInstances.ci_user_label') ?? 'Cloud-init user'}
                                                <span className='font-bold text-red-500'>*</span>
                                            </Label>
                                            <Input
                                                value={ciUser}
                                                onChange={(e) => setCiUser(e.target.value)}
                                                placeholder='root'
                                                className='bg-muted/30 h-11'
                                            />
                                            <p className='text-muted-foreground text-xs'>
                                                {t('admin.vmInstances.ci_user_help') ??
                                                    'This user will be created inside the VM as the cloud-init ciuser. On Debian/Ubuntu images this user normally has passwordless sudo.'}
                                            </p>
                                        </div>
                                        <div className='space-y-3'>
                                            <Label className='flex items-center gap-1.5'>
                                                {t('admin.vmInstances.ci_password_label') ?? 'Cloud-init password'}
                                                <span className='font-bold text-red-500'>*</span>
                                            </Label>
                                            <Input
                                                type='password'
                                                value={ciPassword}
                                                onChange={(e) => setCiPassword(e.target.value)}
                                                placeholder='Strong password for VM login'
                                                className='bg-muted/30 h-11'
                                            />
                                            <p className='text-muted-foreground text-xs'>
                                                {t('admin.vmInstances.ci_password_help') ??
                                                    'This is written to the cloud-init cipassword and lets you log in via console/SSH. Store it somewhere safe; the panel only shows it during creation.'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className='space-y-3'>
                                    <Label className='flex items-center gap-1.5'>
                                        {t('admin.vmInstances.owner') ?? 'Owner'}
                                        <span className='font-bold text-red-500'>*</span>
                                    </Label>
                                    <div className='flex gap-2'>
                                        <div
                                            role='button'
                                            tabIndex={0}
                                            onClick={() => {
                                                setOwnerSearch('');
                                                setOwnerPagination((p) => ({ ...p, current_page: 1 }));
                                                setOwnerPickerMode('browse');
                                                setOwnerModalOpen(true);
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setOwnerSearch('');
                                                    setOwnerPagination((p) => ({ ...p, current_page: 1 }));
                                                    setOwnerPickerMode('browse');
                                                    setOwnerModalOpen(true);
                                                }
                                            }}
                                            className='bg-muted/30 border-border/50 focus-visible:ring-ring flex h-11 flex-1 cursor-pointer items-center rounded-xl border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
                                        >
                                            {selectedOwner ? (
                                                <div className='flex items-center gap-2'>
                                                    <UserCircle className='text-primary h-4 w-4' />
                                                    <span className='text-foreground font-medium'>
                                                        {selectedOwner.username}
                                                    </span>
                                                    <span className='text-muted-foreground'>
                                                        ({selectedOwner.email})
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className='text-muted-foreground'>
                                                    {t('admin.vmInstances.select_owner') ?? 'No owner (unassigned)'}
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            type='button'
                                            size='icon'
                                            onClick={() => {
                                                setOwnerSearch('');
                                                setOwnerPagination((p) => ({ ...p, current_page: 1 }));
                                                setOwnerPickerMode('browse');
                                                setOwnerModalOpen(true);
                                            }}
                                            className='h-11 w-11'
                                        >
                                            <SearchIcon className='h-4 w-4' />
                                        </Button>
                                        {selectedOwner && (
                                            <Button
                                                type='button'
                                                size='icon'
                                                variant='ghost'
                                                onClick={() => setSelectedOwner(null)}
                                                className='h-11 w-11'
                                                title={t('admin.vmInstances.clear_owner') ?? 'Clear owner'}
                                            >
                                                ×
                                            </Button>
                                        )}
                                    </div>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.vmInstances.owner_help') ?? 'Assign this VM to a user. Required.'}
                                    </p>
                                </div>
                            </div>
                        </PageCard>
                    </div>
                )}

                {(creatingMessage ?? null) && (
                    <p className='text-muted-foreground mt-4 flex items-center gap-2 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin' /> {creatingMessage}
                    </p>
                )}

                <div className='bg-card/50 border-border/50 mt-8 flex items-center justify-between rounded-2xl border p-6 backdrop-blur-xl'>
                    <Button
                        type='button'
                        variant='outline'
                        onClick={handlePrevious}
                        disabled={currentStep === 1}
                        className='gap-2'
                    >
                        <ChevronLeft className='h-4 w-4' />
                        {t('admin.servers.form.wizard.previous') ?? t('common.previous')}
                    </Button>

                    <span className='text-muted-foreground text-sm'>
                        {t('admin.servers.form.wizard.step', {
                            current: String(currentStep),
                            total: String(totalSteps),
                        }) ?? `Step ${currentStep} of ${totalSteps}`}
                    </span>

                    {currentStep < totalSteps ? (
                        <Button
                            type='button'
                            onClick={handleNext}
                            disabled={wizardBlockedByInfra || wizardNavWaitingInfra}
                            className='gap-2'
                        >
                            {t('admin.servers.form.wizard.next') ?? t('common.next')}
                            <ChevronRight className='h-4 w-4' />
                        </Button>
                    ) : (
                        <Button
                            type='button'
                            onClick={handleCreate}
                            disabled={!canCreate || submitting || wizardBlockedByInfra || wizardNavWaitingInfra}
                            loading={submitting}
                            className='gap-2'
                        >
                            {submitting ? (
                                <>{t('admin.vmInstances.creating_clone') ?? 'Creating…'}</>
                            ) : (
                                <>
                                    <Plus className='h-4 w-4' />
                                    {t('admin.vmInstances.create') ?? 'Create instance'}
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </form>

            {nodeId > 0 && (
                <VmTemplatePickerSheet
                    open={templatePickerOpen}
                    onOpenChange={setTemplatePickerOpen}
                    nodeId={nodeId}
                    templates={templates}
                    selectedTemplateId={templateId}
                    onSelectTemplate={setTemplateId}
                    onTemplateCreated={(created) => {
                        setTemplates((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
                        setTemplateId(created.id);
                        setTemplatePickerOpen(false);
                    }}
                />
            )}

            {nodeId > 0 && (
                <VmIpPickerSheet
                    open={ipPickerOpen}
                    onOpenChange={setIpPickerOpen}
                    nodeId={nodeId}
                    ips={freeIps}
                    selectedIpId={networks.find((r) => r.key === targetNetworkKey)?.vm_ip_id ?? null}
                    initialMode={ipPickerInitialMode}
                    onSelectIp={(ipId) =>
                        setNetworks((prev) => {
                            if (prev.length === 0) return [{ key: 'net0', vm_ip_id: ipId }];
                            return prev.map((row) => (row.key === targetNetworkKey ? { ...row, vm_ip_id: ipId } : row));
                        })
                    }
                    onIpCreated={(created) => {
                        setFreeIps((prev) => {
                            if (prev.some((i) => i.id === created.id)) return prev;
                            return [created, ...prev];
                        });
                        setNetworks((prev) => {
                            if (prev.length === 0) return [{ key: 'net0', vm_ip_id: created.id }];
                            return prev.map((row) =>
                                row.key === targetNetworkKey ? { ...row, vm_ip_id: created.id } : row,
                            );
                        });
                        setIpPickerOpen(false);
                    }}
                    onIpsCreated={(createdList) => {
                        if (createdList.length === 0) return;
                        setFreeIps((prev) => {
                            const map = new Map(prev.map((i) => [i.id, i]));
                            createdList.forEach((c) => map.set(c.id, c));
                            return Array.from(map.values());
                        });
                        const first = createdList[0];
                        setNetworks((prev) => {
                            if (prev.length === 0) return [{ key: 'net0', vm_ip_id: first.id }];
                            return prev.map((row) =>
                                row.key === targetNetworkKey ? { ...row, vm_ip_id: first.id } : row,
                            );
                        });
                        setIpPickerOpen(false);
                    }}
                />
            )}

            <Sheet open={ownerModalOpen} onOpenChange={setOwnerModalOpen}>
                <SheetContent className='sm:max-w-2xl'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.vmInstances.select_owner') ?? 'Select owner'}</SheetTitle>
                        <SheetDescription>
                            {ownerPickerMode === 'browse' && ownerPagination.total_records > 0
                                ? t('common.showing', {
                                      from: String((ownerPagination.current_page - 1) * ownerPagination.per_page + 1),
                                      to: String(
                                          Math.min(
                                              ownerPagination.current_page * ownerPagination.per_page,
                                              ownerPagination.total_records,
                                          ),
                                      ),
                                      total: String(ownerPagination.total_records),
                                  })
                                : ownerPickerMode === 'create'
                                  ? 'Create a new user and assign as owner.'
                                  : (t('common.search') ?? 'Search')}
                        </SheetDescription>
                    </SheetHeader>
                    <div className='mt-6 space-y-4'>
                        <div className='border-border/60 bg-muted/30 flex gap-1 rounded-xl border p-1'>
                            <button
                                type='button'
                                onClick={() => setOwnerPickerMode('browse')}
                                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${ownerPickerMode === 'browse' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <SearchIcon className='h-4 w-4' />
                                Browse users
                            </button>
                            <button
                                type='button'
                                onClick={() => setOwnerPickerMode('create')}
                                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${ownerPickerMode === 'create' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <Plus className='h-4 w-4' />
                                Create user
                            </button>
                        </div>

                        {ownerPickerMode === 'create' ? (
                            <OwnerCreateForm
                                onCreated={(user) => {
                                    setSelectedOwner({
                                        id: user.id,
                                        uuid: user.uuid,
                                        username: user.username,
                                        email: user.email,
                                    });
                                    setOwners((prev) => [
                                        {
                                            id: user.id,
                                            uuid: user.uuid,
                                            username: user.username,
                                            email: user.email,
                                        },
                                        ...prev.filter((u) => u.id !== user.id),
                                    ]);
                                    setOwnerModalOpen(false);
                                    setOwnerPickerMode('browse');
                                }}
                                onCancel={() => setOwnerPickerMode('browse')}
                                showFooter
                            />
                        ) : (
                            <>
                                <div className='relative'>
                                    <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
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
                                {ownerPagination.total_pages > 1 && (
                                    <div className='border-border bg-muted/30 flex items-center justify-between gap-2 rounded-lg border px-3 py-2'>
                                        <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            disabled={!ownerPagination.has_prev}
                                            onClick={() =>
                                                setOwnerPagination((p) => ({ ...p, current_page: p.current_page - 1 }))
                                            }
                                        >
                                            {t('common.previous') ?? 'Previous'}
                                        </Button>
                                        <span className='text-xs font-medium'>
                                            {ownerPagination.current_page} / {ownerPagination.total_pages}
                                        </span>
                                        <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            disabled={!ownerPagination.has_next}
                                            onClick={() =>
                                                setOwnerPagination((p) => ({ ...p, current_page: p.current_page + 1 }))
                                            }
                                        >
                                            {t('common.next') ?? 'Next'}
                                        </Button>
                                    </div>
                                )}
                                <div className='max-h-[60vh] space-y-2 overflow-y-auto'>
                                    {owners.length === 0 ? (
                                        <p className='text-muted-foreground py-6 text-center'>
                                            {t('common.no_results') ?? 'No results'}
                                        </p>
                                    ) : (
                                        owners.map((user) => (
                                            <button
                                                key={user.id}
                                                type='button'
                                                onClick={() => {
                                                    setSelectedOwner(user);
                                                    setOwnerModalOpen(false);
                                                }}
                                                className='border-border/50 hover:border-primary hover:bg-primary/5 w-full rounded-xl border p-3 text-left transition-all'
                                            >
                                                <div className='flex flex-col'>
                                                    <span className='font-semibold'>{user.username}</span>
                                                    <span className='text-muted-foreground text-xs'>{user.email}</span>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <WidgetRenderer widgets={getWidgets('admin-vm-instances-create', 'bottom-of-page')} />
        </div>
    );
}
