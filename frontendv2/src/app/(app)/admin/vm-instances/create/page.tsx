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
import {
    Server,
    Loader2,
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
    const [submitting, setSubmitting] = useState(false);
    const [creatingMessage, setCreatingMessage] = useState<string | null>(null);

    const [selectedOwner, setSelectedOwner] = useState<OwnerUser | null>(null);
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

    const [ciUser, setCiUser] = useState('debian');
    const [ciPassword, setCiPassword] = useState('');
    const [backupLimit, setBackupLimit] = useState(5);
    const [backupRetentionMode, setBackupRetentionMode] = useState<'inherit' | 'hard_limit' | 'fifo_rolling'>(
        'inherit',
    );

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-vm-instances-create');

    const selectedTemplate = templates.find((tpl) => tpl.id === templateId) || null;
    const isLxcTemplate = selectedTemplate?.guest_type === 'lxc';
    const primaryNetwork = networks[0] ?? null;

    useEffect(() => {
        axios
            .get('/api/admin/vm-nodes', { params: { limit: 100 } })
            .then((res) => setNodes(res.data.data?.vm_nodes ?? []))
            .catch(() => toast.error(t('admin.vmInstances.errors.fetch_failed')))
            .finally(() => setLoadingPlans(false));
    }, [t]);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        if (nodeId <= 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFreeIps([]);
            setTemplates([]);
            setBridges([]);
            setStorageList([]);
            return;
        }
        setLoadingMeta(true);
        setTemplateId(0);
        Promise.all([
            axios.get(`/api/admin/vm-nodes/${nodeId}/free-ips`),
            axios.get(`/api/admin/vm-nodes/${nodeId}/templates`),
        ])
            .then(([ipsRes, tplRes]) => {
                const ips = ipsRes.data.data?.free_ips ?? [];
                setFreeIps(ips);
                setTemplates(tplRes.data.data?.templates ?? []);
                setNetworks([{ key: 'net0', vm_ip_id: ips[0]?.id ?? null }]);
            })
            .catch(() => toast.error(t('admin.vmInstances.errors.fetch_failed')))
            .finally(() => setLoadingMeta(false));
    }, [nodeId, t]);

    useEffect(() => {
        if (nodeId <= 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setBridges([]);
            setStorageList([]);
            return;
        }
        setLoadingBridges(true);
        setLoadingStorage(true);
        axios
            .get(`/api/admin/vm-nodes/${nodeId}/bridges`)
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
            .get(`/api/admin/vm-nodes/${nodeId}/storage`)
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
            const timer = setTimeout(() => fetchOwners(), 300);
            return () => clearTimeout(timer);
        }
    }, [ownerModalOpen, ownerSearch, ownerPagination.current_page, fetchOwners]);

    const handlePrevious = () => setCurrentStep((s) => Math.max(1, s - 1));
    const handleNext = () => setCurrentStep((s) => Math.min(totalSteps, s + 1));

    const getRowIpOptions = useCallback(
        (row: NetworkRow) => {
            const selectedElsewhere = new Set(
                networks
                    .filter((candidate) => candidate.key !== row.key && candidate.vm_ip_id != null)
                    .map((candidate) => candidate.vm_ip_id),
            );

            return freeIps.filter((ip) => !selectedElsewhere.has(ip.id) || ip.id === row.vm_ip_id);
        },
        [freeIps, networks],
    );

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

    const canProceedStep1 = nodeId > 0 && templateId > 0 && freeIps.length > 0;
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
        const toastId = toast.loading('Initiating VM creation…');
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
        <div className='max-w-5xl mx-auto pb-20'>
            <WidgetRenderer widgets={getWidgets('admin-vm-instances-create', 'top-of-page')} />

            <PageHeader
                title={t('admin.vmInstances.create') ?? 'Create VM instance'}
                description={t('admin.vmInstances.create_desc') ?? 'Provision a new VPS from a plan and template'}
                icon={Server}
                actions={
                    <Button variant='outline' onClick={() => router.push('/admin/vm-instances')}>
                        <X className='h-4 w-4 mr-2' />
                        {t('admin.servers.form.cancel') ?? t('common.cancel')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-vm-instances-create', 'after-header')} />

            <div className='mt-8 mb-12 p-6 bg-card/50 backdrop-blur-xl rounded-2xl border border-border/50'>
                <StepIndicator steps={wizardSteps} currentStep={currentStep} />
                {loadingPlans && (
                    <p className='mt-4 text-sm text-muted-foreground flex items-center gap-2'>
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
                                        <span className='text-red-500 font-bold'>*</span>
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
                                    <p className='text-xs text-muted-foreground'>
                                        {t('admin.vmInstances.node_help') ??
                                            'Proxmox node where the VM will be created.'}
                                    </p>
                                </div>

                                {loadingMeta && (
                                    <p className='text-sm text-muted-foreground flex items-center gap-2'>
                                        <Loader2 className='h-4 w-4 animate-spin' /> {t('common.loading') ?? 'Loading…'}
                                    </p>
                                )}

                                {nodeId > 0 && !loadingMeta && (
                                    <>
                                        <div className='space-y-3'>
                                            <Label className='flex items-center gap-1.5'>
                                                {t('admin.vmInstances.template') ?? 'Template'}
                                                <span className='text-red-500 font-bold'>*</span>
                                            </Label>
                                            <Select
                                                value={templateId || ''}
                                                onChange={(e) => setTemplateId(Number(e.target.value))}
                                                className='bg-muted/30 h-11 rounded-xl'
                                            >
                                                <option value=''>
                                                    {t('admin.vmInstances.select_template') ?? 'Select template'}
                                                </option>
                                                {templates.map((tpl) => (
                                                    <option key={tpl.id} value={tpl.id}>
                                                        {tpl.name}{' '}
                                                        {tpl.template_file ? `(VMID ${tpl.template_file})` : ''}{' '}
                                                        {tpl.guest_type === 'lxc' ? 'LXC' : 'QEMU'}
                                                    </option>
                                                ))}
                                            </Select>
                                            {templates.length === 0 && (
                                                <p className='text-xs text-muted-foreground'>
                                                    {t('admin.vmInstances.no_templates_qemu')}
                                                </p>
                                            )}
                                        </div>
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
                            <p className='text-sm text-muted-foreground mb-6'>
                                {t('admin.vmInstances.wizard.step2_subtitle') ?? 'CPU, memory, disk, and network'}
                            </p>
                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
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
                                        <p className='text-sm text-muted-foreground flex items-center gap-2 py-2'>
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
                                        <p className='text-sm text-muted-foreground flex items-center gap-2 py-2'>
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
                                    <p className='text-xs text-muted-foreground'>
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
                                                className='flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/20 p-4 sm:flex-row sm:items-center'
                                            >
                                                <div className='min-w-24'>
                                                    <div className='font-mono text-sm font-semibold'>{row.key}</div>
                                                    <div className='text-xs text-muted-foreground'>
                                                        {index === 0
                                                            ? (t('admin.vmInstances.primary_ip') ?? 'Primary')
                                                            : (t('admin.vmInstances.secondary_ip') ?? 'Secondary')}
                                                    </div>
                                                </div>
                                                <Select
                                                    value={row.vm_ip_id ?? ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setNetworks((prev) =>
                                                            prev.map((candidate) =>
                                                                candidate.key === row.key
                                                                    ? {
                                                                          ...candidate,
                                                                          vm_ip_id: value === '' ? null : Number(value),
                                                                      }
                                                                    : candidate,
                                                            ),
                                                        );
                                                    }}
                                                    className='bg-muted/30 h-11 rounded-xl flex-1'
                                                >
                                                    <option value=''>Select IP</option>
                                                    {getRowIpOptions(row).map((ip) => (
                                                        <option key={ip.id} value={ip.id}>
                                                            {ip.ip}
                                                        </option>
                                                    ))}
                                                </Select>
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
                                        <p className='text-xs text-muted-foreground'>
                                            {t('admin.vmInstances.ip_help') ??
                                                'Leave on Auto to assign the first free IP from the node pool.'}
                                        </p>
                                        <Button type='button' variant='outline' size='sm' onClick={addNetworkRow}>
                                            <Plus className='h-4 w-4 mr-2' />
                                            {t('admin.vmInstances.add_ip') ?? 'Add IP'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <div className='flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-border/50 mt-6'>
                                <Label>{t('admin.vmInstances.on_boot') ?? 'Start on boot'}</Label>
                                <input
                                    type='checkbox'
                                    checked={onBoot}
                                    onChange={(e) => setOnBoot(e.target.checked)}
                                    className='h-4 w-4 rounded border-border'
                                />
                            </div>
                            <div className='grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6'>
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
                                    <p className='text-xs text-muted-foreground'>
                                        {t('admin.vmInstances.backups.limit_help') ??
                                            'Maximum number of backups allowed for this instance (0 = no backups).'}
                                    </p>
                                </div>
                                <div className='space-y-3'>
                                    <Label>
                                        {t('admin.vmInstances.backups.retention_label_create') ?? 'Backup retention'}
                                    </Label>
                                    <select
                                        className='w-full h-11 rounded-md border border-input bg-muted/30 px-3 text-sm'
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
                                    <p className='text-xs text-muted-foreground'>
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
                            <p className='text-sm text-muted-foreground mb-6'>
                                {t('admin.vmInstances.wizard.step3_subtitle') ?? 'Hostname and assign owner'}
                            </p>
                            <div className='space-y-6'>
                                <div className='space-y-3'>
                                    <Label className='flex items-center gap-1.5'>
                                        {t('admin.vmInstances.hostname') ?? 'Hostname'}
                                        <span className='text-red-500 font-bold'>*</span>
                                    </Label>
                                    <Input
                                        value={hostname}
                                        onChange={(e) => setHostname(e.target.value)}
                                        placeholder='e.g. my-vm or web-01'
                                        className='bg-muted/30 h-11'
                                    />
                                    <p className='text-xs text-muted-foreground'>
                                        {t('admin.vmInstances.hostname_help') ??
                                            'Valid DNS name: only letters, numbers, and hyphens (e.g. my-vm). Required.'}
                                    </p>
                                </div>

                                {!isLxcTemplate && (
                                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
                                        <div className='space-y-3'>
                                            <Label className='flex items-center gap-1.5'>
                                                {t('admin.vmInstances.ci_user_label') ?? 'Cloud-init user'}
                                                <span className='text-red-500 font-bold'>*</span>
                                            </Label>
                                            <Input
                                                value={ciUser}
                                                onChange={(e) => setCiUser(e.target.value)}
                                                placeholder='debian'
                                                className='bg-muted/30 h-11'
                                            />
                                            <p className='text-xs text-muted-foreground'>
                                                {t('admin.vmInstances.ci_user_help') ??
                                                    'This user will be created inside the VM as the cloud-init ciuser. On Debian/Ubuntu images this user normally has passwordless sudo.'}
                                            </p>
                                        </div>
                                        <div className='space-y-3'>
                                            <Label className='flex items-center gap-1.5'>
                                                {t('admin.vmInstances.ci_password_label') ?? 'Cloud-init password'}
                                                <span className='text-red-500 font-bold'>*</span>
                                            </Label>
                                            <Input
                                                type='password'
                                                value={ciPassword}
                                                onChange={(e) => setCiPassword(e.target.value)}
                                                placeholder='Strong password for VM login'
                                                className='bg-muted/30 h-11'
                                            />
                                            <p className='text-xs text-muted-foreground'>
                                                {t('admin.vmInstances.ci_password_help') ??
                                                    'This is written to the cloud-init cipassword and lets you log in via console/SSH. Store it somewhere safe; the panel only shows it during creation.'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className='space-y-3'>
                                    <Label className='flex items-center gap-1.5'>
                                        {t('admin.vmInstances.owner') ?? 'Owner'}
                                        <span className='text-red-500 font-bold'>*</span>
                                    </Label>
                                    <div className='flex gap-2'>
                                        <div className='flex-1 h-11 px-3 bg-muted/30 rounded-xl border border-border/50 text-sm flex items-center'>
                                            {selectedOwner ? (
                                                <div className='flex items-center gap-2'>
                                                    <UserCircle className='h-4 w-4 text-primary' />
                                                    <span className='font-medium text-foreground'>
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
                                    <p className='text-xs text-muted-foreground'>
                                        {t('admin.vmInstances.owner_help') ?? 'Assign this VM to a user. Required.'}
                                    </p>
                                </div>
                            </div>
                        </PageCard>
                    </div>
                )}

                {(creatingMessage ?? null) && (
                    <p className='text-sm text-muted-foreground flex items-center gap-2 mt-4'>
                        <Loader2 className='h-4 w-4 animate-spin' /> {creatingMessage}
                    </p>
                )}

                <div className='flex items-center justify-between mt-8 p-6 bg-card/50 backdrop-blur-xl rounded-2xl border border-border/50'>
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

                    <span className='text-sm text-muted-foreground'>
                        {t('admin.servers.form.wizard.step', {
                            current: String(currentStep),
                            total: String(totalSteps),
                        }) ?? `Step ${currentStep} of ${totalSteps}`}
                    </span>

                    {currentStep < totalSteps ? (
                        <Button
                            type='button'
                            onClick={handleNext}
                            disabled={currentStep === 1 ? !canProceedStep1 : false}
                            className='gap-2'
                        >
                            {t('admin.servers.form.wizard.next') ?? t('common.next')}
                            <ChevronRight className='h-4 w-4' />
                        </Button>
                    ) : (
                        <Button
                            type='button'
                            onClick={handleCreate}
                            disabled={!canCreate || submitting}
                            loading={submitting}
                            className='gap-2'
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                    {t('admin.vmInstances.creating_clone') ?? 'Creating…'}
                                </>
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

            <Sheet open={ownerModalOpen} onOpenChange={setOwnerModalOpen}>
                <SheetContent className='sm:max-w-2xl'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.vmInstances.select_owner') ?? 'Select owner'}</SheetTitle>
                        <SheetDescription>
                            {ownerPagination.total_records > 0
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
                                : (t('common.search') ?? 'Search')}
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
                        {ownerPagination.total_pages > 1 && (
                            <div className='flex items-center justify-between gap-2 py-2 px-3 rounded-lg border border-border bg-muted/30'>
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
                        <div className='space-y-2 max-h-[60vh] overflow-y-auto'>
                            {owners.length === 0 ? (
                                <p className='text-center py-6 text-muted-foreground'>
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
                                        className='w-full p-3 rounded-xl border border-border/50 hover:border-primary hover:bg-primary/5 text-left transition-all'
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

            <WidgetRenderer widgets={getWidgets('admin-vm-instances-create', 'bottom-of-page')} />
        </div>
    );
}
