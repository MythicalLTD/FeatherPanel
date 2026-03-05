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
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { ResourceCard, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { PageCard } from '@/components/featherui/PageCard';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    LayoutGrid,
    Search,
    Plus,
    Pencil,
    Trash2,
    Cpu,
    HardDrive,
    Network,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Container,
    Monitor,
    MemoryStick,
    Activity,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Save,
    ArrowLeft,
} from 'lucide-react';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

interface VmPlan {
    id: number;
    name: string;
    description: string | null;
    vm_type: 'qemu' | 'lxc';
    cpus: number;
    cores: number;
    cpu_type: string | null;
    memory: number;
    swap: number;
    disk: number;
    disk_format: string;
    disk_type: string;
    storage: string;
    bridge: string;
    vlan_id: number | null;
    net_model: string;
    net_rate: number;
    firewall: number;
    bandwidth: number;
    kvm: number;
    on_boot: number;
    unprivileged: number;
    ipv6: string;
    is_active: 'true' | 'false';
    instance_count: number;
    created_at: string;
}

interface VmStats {
    plans_total: number;
    instances_total: number;
    instances_running: number;
    instances_stopped: number;
    instances_error: number;
    instances_by_status: Record<string, number>;
}

const EMPTY_PLAN = {
    name: '',
    description: '',
    vm_type: 'qemu' as 'qemu' | 'lxc',
    cpus: 1,
    cores: 1,
    cpu_type: '',
    memory: 512,
    swap: 0,
    disk: 20,
    disk_format: 'qcow2',
    disk_type: 'scsi',
    storage: 'local',
    bridge: 'vmbr0',
    vlan_id: null as number | null,
    net_model: 'virtio',
    net_rate: 0,
    firewall: 0,
    bandwidth: 0,
    kvm: 1,
    on_boot: 1,
    unprivileged: 0,
    ipv6: 'auto',
    is_active: 'true' as 'true' | 'false',
};

type PlanForm = typeof EMPTY_PLAN;

function StatCard({
    icon: Icon,
    label,
    value,
    colorClass,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: number | string;
    colorClass: string;
}) {
    return (
        <div className='rounded-2xl border border-border/20 bg-card/40 backdrop-blur-sm p-4 flex items-center gap-4'>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colorClass}`}>
                <Icon className='h-5 w-5' />
            </div>
            <div>
                <p className='text-xs text-muted-foreground font-medium uppercase tracking-wider'>{label}</p>
                <p className='text-2xl font-bold'>{value}</p>
            </div>
        </div>
    );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return <Label className='mb-2 block text-sm font-semibold'>{children}</Label>;
}

export default function VmPlansPage() {
    const { t } = useTranslation();

    const [plans, setPlans] = useState<VmPlan[]>([]);
    const [stats, setStats] = useState<VmStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    const [sheetOpen, setSheetOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<VmPlan | null>(null);
    const [form, setForm] = useState<PlanForm>({ ...EMPTY_PLAN });
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const [deleting, setDeleting] = useState(false);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-vm-plans');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [plansRes, statsRes] = await Promise.all([
                axios.get('/api/admin/vm-plans'),
                axios.get('/api/admin/vm-plans/stats'),
            ]);
            setPlans(plansRes.data.data?.plans ?? []);
            setStats(statsRes.data.data ?? null);
        } catch {
            toast.error(t('admin.vmPlans.errors.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const filtered = plans.filter(
        (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
            p.vm_type.toLowerCase().includes(search.toLowerCase()),
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const openCreate = () => {
        setEditingPlan(null);
        setForm({ ...EMPTY_PLAN });
        setSheetOpen(true);
    };

    const openEdit = (plan: VmPlan) => {
        setEditingPlan(plan);
        setForm({
            name: plan.name,
            description: plan.description ?? '',
            vm_type: plan.vm_type,
            cpus: plan.cpus,
            cores: plan.cores,
            cpu_type: plan.cpu_type ?? '',
            memory: plan.memory,
            swap: plan.swap,
            disk: plan.disk,
            disk_format: plan.disk_format,
            disk_type: plan.disk_type,
            storage: plan.storage,
            bridge: plan.bridge,
            vlan_id: plan.vlan_id,
            net_model: plan.net_model,
            net_rate: plan.net_rate,
            firewall: plan.firewall,
            bandwidth: plan.bandwidth,
            kvm: plan.kvm,
            on_boot: plan.on_boot,
            unprivileged: plan.unprivileged,
            ipv6: plan.ipv6,
            is_active: plan.is_active,
        });
        setSheetOpen(true);
    };

    const closeSheet = () => {
        setSheetOpen(false);
        setEditingPlan(null);
        setForm({ ...EMPTY_PLAN });
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            toast.error(t('admin.vmPlans.errors.name_required'));
            return;
        }
        setSaving(true);
        try {
            if (editingPlan) {
                await axios.patch(`/api/admin/vm-plans/${editingPlan.id}`, form);
                toast.success(t('admin.vmPlans.success.updated'));
            } else {
                await axios.put('/api/admin/vm-plans', form);
                toast.success(t('admin.vmPlans.success.created'));
            }
            closeSheet();
            fetchAll();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        setDeleting(true);
        try {
            await axios.delete(`/api/admin/vm-plans/${id}`);
            toast.success(t('admin.vmPlans.success.deleted'));
            setDeleteConfirm(null);
            fetchAll();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setDeleting(false);
        }
    };

    const setNum = (key: keyof PlanForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((p) => ({ ...p, [key]: Number(e.target.value) }));

    const setStr = (key: keyof PlanForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((p) => ({ ...p, [key]: e.target.value }));

    const fmtRam = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB` : `${mb} MB`);

    const typeLabel = (type: 'qemu' | 'lxc') => (type === 'qemu' ? 'QEMU/KVM' : 'LXC');

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-vm-plans', 'top-of-page')} />

            <PageHeader
                title={t('admin.vmPlans.title')}
                description={t('admin.vmPlans.description')}
                icon={LayoutGrid}
                actions={
                    <div className='flex items-center gap-2'>
                        <Button variant='outline' size='sm' loading={loading} onClick={fetchAll}>
                            <RefreshCw className='h-4 w-4' />
                        </Button>
                        <Button size='sm' onClick={openCreate}>
                            <Plus className='h-4 w-4 mr-2' />
                            {t('admin.vmPlans.actions.create')}
                        </Button>
                    </div>
                }
            />

            {/* Stats bar */}
            {stats && (
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                    <StatCard
                        icon={LayoutGrid}
                        label={t('admin.vmPlans.stats.plans_total')}
                        value={stats.plans_total}
                        colorClass='bg-primary/10 text-primary'
                    />
                    <StatCard
                        icon={Activity}
                        label={t('admin.vmPlans.stats.instances_total')}
                        value={stats.instances_total}
                        colorClass='bg-blue-500/10 text-blue-500'
                    />
                    <StatCard
                        icon={CheckCircle2}
                        label={t('admin.vmPlans.stats.running')}
                        value={stats.instances_running}
                        colorClass='bg-green-500/10 text-green-500'
                    />
                    <StatCard
                        icon={stats.instances_error > 0 ? AlertCircle : XCircle}
                        label={t('admin.vmPlans.stats.stopped')}
                        value={stats.instances_stopped}
                        colorClass='bg-muted/40 text-muted-foreground'
                    />
                </div>
            )}

            <WidgetRenderer widgets={getWidgets('admin-vm-plans', 'after-header')} />

            {/* Search bar — same pattern as vds-nodes page */}
            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/40 backdrop-blur-md p-4 rounded-2xl shadow-sm'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.vmPlans.search_placeholder')}
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className='pl-10 h-11 w-full'
                    />
                </div>
            </div>

            {/* Pagination top */}
            {totalPages > 1 && !loading && (
                <div className='flex items-center justify-between gap-4 py-3 px-4 rounded-xl border border-border bg-card/50'>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                        className='gap-1.5'
                    >
                        <ChevronLeft className='h-4 w-4' />
                        {t('common.previous')}
                    </Button>
                    <span className='text-sm font-medium'>
                        {page} / {totalPages}
                    </span>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className='gap-1.5'
                    >
                        {t('common.next')}
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            )}

            {/* Plan cards */}
            {loading ? (
                <TableSkeleton count={5} />
            ) : paginated.length === 0 ? (
                <EmptyState
                    icon={LayoutGrid}
                    title={t(search ? 'admin.vmPlans.empty.no_results' : 'admin.vmPlans.empty.title')}
                    description={t(search ? 'admin.vmPlans.empty.no_results' : 'admin.vmPlans.empty.description')}
                    action={
                        !search ? (
                            <Button size='sm' onClick={openCreate}>
                                <Plus className='h-4 w-4 mr-2' />
                                {t('admin.vmPlans.actions.create')}
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    {paginated.map((plan) => {
                        const badges: ResourceBadge[] = [
                            {
                                label: typeLabel(plan.vm_type),
                                className:
                                    plan.vm_type === 'qemu'
                                        ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                        : 'bg-green-500/10 text-green-500 border-green-500/20',
                            },
                            {
                                label: plan.is_active === 'true' ? t('common.active') : t('common.inactive'),
                                className:
                                    plan.is_active === 'true'
                                        ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                        : 'bg-muted text-muted-foreground',
                            },
                            ...(plan.instance_count > 0
                                ? [
                                      {
                                          label: `${plan.instance_count} ${t('admin.vmPlans.stats.instances')}`,
                                          className: 'bg-primary/10 text-primary border-primary/20',
                                      },
                                  ]
                                : []),
                        ];

                        return (
                            <ResourceCard
                                key={plan.id}
                                title={plan.name}
                                icon={plan.vm_type === 'qemu' ? Monitor : Container}
                                badges={badges}
                                subtitle={plan.description ?? undefined}
                                description={
                                    <div className='flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground'>
                                        <span className='flex items-center gap-1.5'>
                                            <Cpu className='h-3.5 w-3.5' />
                                            {plan.cpus} {t('admin.vmPlans.spec.sockets')} / {plan.cores}{' '}
                                            {t('admin.vmPlans.spec.cores')}
                                        </span>
                                        <span className='flex items-center gap-1.5'>
                                            <MemoryStick className='h-3.5 w-3.5' />
                                            {fmtRam(plan.memory)} RAM
                                            {plan.swap > 0 && ` + ${fmtRam(plan.swap)} swap`}
                                        </span>
                                        <span className='flex items-center gap-1.5'>
                                            <HardDrive className='h-3.5 w-3.5' />
                                            {plan.disk} GB · {plan.storage}
                                        </span>
                                        <span className='flex items-center gap-1.5'>
                                            <Network className='h-3.5 w-3.5' />
                                            {plan.bridge}
                                            {plan.vlan_id ? ` VLAN ${plan.vlan_id}` : ''}
                                            {plan.net_rate > 0 ? ` · ${plan.net_rate} MB/s` : ''}
                                        </span>
                                    </div>
                                }
                                actions={
                                    <div className='flex items-center gap-2'>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            onClick={() => openEdit(plan)}
                                            title={t('admin.vmPlans.actions.edit')}
                                        >
                                            <Pencil className='h-4 w-4' />
                                        </Button>
                                        {deleteConfirm === plan.id ? (
                                            <>
                                                <Button
                                                    size='sm'
                                                    variant='destructive'
                                                    loading={deleting}
                                                    onClick={() => handleDelete(plan.id)}
                                                >
                                                    {t('common.confirm')}
                                                </Button>
                                                <Button
                                                    size='sm'
                                                    variant='outline'
                                                    onClick={() => setDeleteConfirm(null)}
                                                    disabled={deleting}
                                                >
                                                    {t('common.cancel')}
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                                onClick={() => setDeleteConfirm(plan.id)}
                                                disabled={plan.instance_count > 0}
                                                title={
                                                    plan.instance_count > 0
                                                        ? t('admin.vmPlans.errors.plan_in_use')
                                                        : t('admin.vmPlans.actions.delete')
                                                }
                                            >
                                                <Trash2 className='h-4 w-4' />
                                            </Button>
                                        )}
                                    </div>
                                }
                            />
                        );
                    })}
                </div>
            )}

            {/* Pagination bottom */}
            {totalPages > 1 && (
                <div className='flex items-center justify-center gap-2 mt-8'>
                    <Button variant='outline' size='icon' disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                        <ChevronLeft className='h-4 w-4' />
                    </Button>
                    <span className='text-sm font-medium'>
                        {page} / {totalPages}
                    </span>
                    <Button
                        variant='outline'
                        size='icon'
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            )}

            {/* Help cards */}
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                <PageCard title={t('admin.vmPlans.help.what.title')} icon={LayoutGrid}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.vmPlans.help.what.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.vmPlans.help.qemu.title')} icon={Monitor}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.vmPlans.help.qemu.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.vmPlans.help.lxc.title')} icon={Container}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.vmPlans.help.lxc.description')}
                    </p>
                </PageCard>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-vm-plans', 'bottom-of-page')} />

            {/* Create / Edit Sheet */}
            <Sheet open={sheetOpen} onOpenChange={(open: boolean) => !open && closeSheet()}>
                <SheetContent side='right' className='w-full max-w-lg overflow-y-auto'>
                    <SheetHeader>
                        <SheetTitle>
                            {editingPlan ? t('admin.vmPlans.sheet.edit_title') : t('admin.vmPlans.sheet.create_title')}
                        </SheetTitle>
                    </SheetHeader>

                    <div className='mt-6 space-y-6'>
                        {/* Basic */}
                        <section className='space-y-4'>
                            <h3 className='text-sm font-semibold border-b border-border/40 pb-2'>
                                {t('admin.vmPlans.sheet.section_basic')}
                            </h3>
                            <div>
                                <FieldLabel>{t('admin.vmPlans.fields.name')}</FieldLabel>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                    placeholder='e.g. VPS-2GB'
                                />
                            </div>
                            <div>
                                <FieldLabel>{t('admin.vmPlans.fields.description')}</FieldLabel>
                                <Input
                                    value={form.description}
                                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                                    placeholder={t('admin.vmPlans.fields.description_placeholder')}
                                />
                            </div>
                            <Select
                                label={t('admin.vmPlans.fields.vm_type')}
                                value={form.vm_type}
                                onChange={setStr('vm_type')}
                            >
                                <option value='qemu'>QEMU/KVM (Virtual Machine)</option>
                                <option value='lxc'>LXC (Container)</option>
                            </Select>
                            <Select
                                label={t('admin.vmPlans.fields.is_active')}
                                value={form.is_active}
                                onChange={setStr('is_active')}
                            >
                                <option value='true'>{t('common.active')}</option>
                                <option value='false'>{t('common.inactive')}</option>
                            </Select>
                        </section>

                        {/* CPU */}
                        <section className='space-y-4'>
                            <h3 className='text-sm font-semibold border-b border-border/40 pb-2 flex items-center gap-2'>
                                <Cpu className='h-4 w-4' /> {t('admin.vmPlans.sheet.section_cpu')}
                            </h3>
                            <div className='grid grid-cols-2 gap-4'>
                                <div>
                                    <FieldLabel>{t('admin.vmPlans.fields.cpus')}</FieldLabel>
                                    <Input type='number' min={1} value={form.cpus} onChange={setNum('cpus')} />
                                </div>
                                <div>
                                    <FieldLabel>{t('admin.vmPlans.fields.cores')}</FieldLabel>
                                    <Input type='number' min={1} value={form.cores} onChange={setNum('cores')} />
                                </div>
                            </div>
                            <div>
                                <FieldLabel>{t('admin.vmPlans.fields.cpu_type')}</FieldLabel>
                                <Input
                                    value={form.cpu_type ?? ''}
                                    onChange={(e) => setForm((p) => ({ ...p, cpu_type: e.target.value }))}
                                    placeholder='host, kvm64 (leave empty for default)'
                                />
                            </div>
                        </section>

                        {/* Memory */}
                        <section className='space-y-4'>
                            <h3 className='text-sm font-semibold border-b border-border/40 pb-2 flex items-center gap-2'>
                                <MemoryStick className='h-4 w-4' /> {t('admin.vmPlans.sheet.section_memory')}
                            </h3>
                            <div className='grid grid-cols-2 gap-4'>
                                <div>
                                    <FieldLabel>{t('admin.vmPlans.fields.memory')}</FieldLabel>
                                    <Input type='number' min={1} value={form.memory} onChange={setNum('memory')} />
                                </div>
                                <div>
                                    <FieldLabel>{t('admin.vmPlans.fields.swap')}</FieldLabel>
                                    <Input type='number' min={0} value={form.swap} onChange={setNum('swap')} />
                                </div>
                            </div>
                        </section>

                        {/* Storage */}
                        <section className='space-y-4'>
                            <h3 className='text-sm font-semibold border-b border-border/40 pb-2 flex items-center gap-2'>
                                <HardDrive className='h-4 w-4' /> {t('admin.vmPlans.sheet.section_storage')}
                            </h3>
                            <div className='grid grid-cols-2 gap-4'>
                                <div>
                                    <FieldLabel>{t('admin.vmPlans.fields.disk')}</FieldLabel>
                                    <Input type='number' min={1} value={form.disk} onChange={setNum('disk')} />
                                </div>
                                <div>
                                    <FieldLabel>{t('admin.vmPlans.fields.storage')}</FieldLabel>
                                    <Input value={form.storage} onChange={setStr('storage')} placeholder='local' />
                                </div>
                            </div>
                            <div className='grid grid-cols-2 gap-4'>
                                <Select
                                    label={t('admin.vmPlans.fields.disk_type')}
                                    value={form.disk_type}
                                    onChange={setStr('disk_type')}
                                >
                                    <option value='scsi'>SCSI</option>
                                    <option value='virtio'>VirtIO</option>
                                    <option value='ide'>IDE</option>
                                    <option value='sata'>SATA</option>
                                </Select>
                                <Select
                                    label={t('admin.vmPlans.fields.disk_format')}
                                    value={form.disk_format}
                                    onChange={setStr('disk_format')}
                                >
                                    <option value='qcow2'>qcow2</option>
                                    <option value='raw'>raw</option>
                                    <option value='vmdk'>vmdk</option>
                                </Select>
                            </div>
                        </section>

                        {/* Network */}
                        <section className='space-y-4'>
                            <h3 className='text-sm font-semibold border-b border-border/40 pb-2 flex items-center gap-2'>
                                <Network className='h-4 w-4' /> {t('admin.vmPlans.sheet.section_network')}
                            </h3>
                            <div className='grid grid-cols-2 gap-4'>
                                <div>
                                    <FieldLabel>{t('admin.vmPlans.fields.bridge')}</FieldLabel>
                                    <Input value={form.bridge} onChange={setStr('bridge')} placeholder='vmbr0' />
                                </div>
                                <div>
                                    <FieldLabel>{t('admin.vmPlans.fields.vlan_id')}</FieldLabel>
                                    <Input
                                        type='number'
                                        min={0}
                                        value={form.vlan_id ?? ''}
                                        onChange={(e) =>
                                            setForm((p) => ({
                                                ...p,
                                                vlan_id: e.target.value ? Number(e.target.value) : null,
                                            }))
                                        }
                                        placeholder='None'
                                    />
                                </div>
                            </div>
                            <div className='grid grid-cols-2 gap-4'>
                                <Select
                                    label={t('admin.vmPlans.fields.net_model')}
                                    value={form.net_model}
                                    onChange={setStr('net_model')}
                                >
                                    <option value='virtio'>VirtIO</option>
                                    <option value='e1000'>Intel E1000</option>
                                    <option value='vmxnet3'>VMware vmxnet3</option>
                                    <option value='rtl8139'>Realtek RTL8139</option>
                                </Select>
                                <div>
                                    <FieldLabel>{t('admin.vmPlans.fields.net_rate')}</FieldLabel>
                                    <Input type='number' min={0} value={form.net_rate} onChange={setNum('net_rate')} />
                                </div>
                            </div>
                            <div>
                                <FieldLabel>{t('admin.vmPlans.fields.bandwidth')}</FieldLabel>
                                <Input type='number' min={0} value={form.bandwidth} onChange={setNum('bandwidth')} />
                            </div>
                        </section>

                        {/* Options */}
                        <section className='space-y-4'>
                            <h3 className='text-sm font-semibold border-b border-border/40 pb-2'>
                                {t('admin.vmPlans.sheet.section_options')}
                            </h3>
                            <div className='grid grid-cols-2 gap-4'>
                                <Select
                                    label={t('admin.vmPlans.fields.on_boot')}
                                    value={String(form.on_boot)}
                                    onChange={(e) => setForm((p) => ({ ...p, on_boot: Number(e.target.value) }))}
                                >
                                    <option value='1'>{t('common.yes')}</option>
                                    <option value='0'>{t('common.no')}</option>
                                </Select>
                                <Select
                                    label={t('admin.vmPlans.fields.firewall')}
                                    value={String(form.firewall)}
                                    onChange={(e) => setForm((p) => ({ ...p, firewall: Number(e.target.value) }))}
                                >
                                    <option value='1'>{t('common.enabled')}</option>
                                    <option value='0'>{t('common.disabled')}</option>
                                </Select>
                            </div>
                            {form.vm_type === 'lxc' && (
                                <Select
                                    label={t('admin.vmPlans.fields.unprivileged')}
                                    value={String(form.unprivileged)}
                                    onChange={(e) => setForm((p) => ({ ...p, unprivileged: Number(e.target.value) }))}
                                >
                                    <option value='1'>{t('common.yes')}</option>
                                    <option value='0'>{t('common.no')}</option>
                                </Select>
                            )}
                        </section>

                        <div className='flex justify-end gap-2 pt-2'>
                            <Button variant='outline' onClick={closeSheet}>
                                <ArrowLeft className='h-4 w-4 mr-2' />
                                {t('common.cancel')}
                            </Button>
                            <Button onClick={handleSave} loading={saving}>
                                <Save className='h-4 w-4 mr-2' />
                                {editingPlan ? t('common.save_changes') : t('admin.vmPlans.actions.create')}
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
