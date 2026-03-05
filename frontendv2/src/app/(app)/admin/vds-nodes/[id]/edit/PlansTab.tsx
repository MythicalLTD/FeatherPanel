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
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select } from '@/components/ui/select-native';
import { toast } from 'sonner';
import {
    LayoutGrid,
    Plus,
    Pencil,
    Trash2,
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Cpu,
    MemoryStick,
    HardDrive,
    Network,
    Monitor,
    Container,
    Save,
} from 'lucide-react';

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
}

interface PlansTabProps {
    nodeId: string | number;
    nodeName: string;
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

function FL({ children }: { children: React.ReactNode }) {
    return <Label className='mb-2 block text-sm font-semibold'>{children}</Label>;
}

export function PlansTab({ nodeId, nodeName }: PlansTabProps) {
    const { t } = useTranslation();

    const [plans, setPlans] = useState<VmPlan[]>([]);
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

    const loadPlans = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/vm-plans', { params: { vm_node_id: nodeId } });
            setPlans(data.data?.plans ?? []);
        } catch (err) {
            const msg = isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(`${t('admin.vmPlans.errors.fetch_failed')} ${msg}`);
        } finally {
            setLoading(false);
        }
    }, [t, nodeId]);

    useEffect(() => {
        loadPlans();
    }, [loadPlans]);

    const filtered = plans.filter(
        (p) =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.description ?? '').toLowerCase().includes(search.toLowerCase()),
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
                await axios.patch(`/api/admin/vm-plans/${editingPlan.id}`, { ...form, vm_node_id: nodeId });
                toast.success(t('admin.vmPlans.success.updated'));
            } else {
                await axios.put('/api/admin/vm-plans', { ...form, vm_node_id: nodeId });
                toast.success(t('admin.vmPlans.success.created'));
            }
            closeSheet();
            loadPlans();
        } catch (err) {
            const msg = isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
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
            loadPlans();
        } catch (err) {
            const msg = isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
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

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.vmPlans.title')}
                icon={LayoutGrid}
                description={t('admin.vdsNodes.plans.description', { name: nodeName })}
                action={
                    <div className='flex items-center gap-2'>
                        <Button variant='outline' size='sm' onClick={loadPlans} loading={loading}>
                            <RefreshCw className='h-4 w-4' />
                        </Button>
                        <Button size='sm' onClick={openCreate}>
                            <Plus className='h-4 w-4 mr-2' />
                            {t('admin.vmPlans.actions.create')}
                        </Button>
                    </div>
                }
            >
                <div className='space-y-4'>
                    {/* Search */}
                    <div className='flex items-center gap-4'>
                        <div className='relative flex-1'>
                            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                            <Input
                                placeholder={t('admin.vmPlans.search_placeholder')}
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className='pl-10'
                            />
                        </div>
                    </div>

                    {/* Pagination top */}
                    {totalPages > 1 && (
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

                    {/* Table */}
                    <div className='rounded-xl border border-border/50 overflow-hidden'>
                        <table className='w-full text-sm'>
                            <thead className='bg-muted/30 border-b border-border/50'>
                                <tr>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                                        {t('admin.vmPlans.table.col_name')}
                                    </th>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                                        {t('admin.vmPlans.table.col_type')}
                                    </th>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                                        <span className='flex items-center gap-1'>
                                            <Cpu className='h-3.5 w-3.5' /> CPU
                                        </span>
                                    </th>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                                        <span className='flex items-center gap-1'>
                                            <MemoryStick className='h-3.5 w-3.5' /> RAM
                                        </span>
                                    </th>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                                        <span className='flex items-center gap-1'>
                                            <HardDrive className='h-3.5 w-3.5' /> Disk
                                        </span>
                                    </th>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                                        {t('admin.vmPlans.table.col_instances')}
                                    </th>
                                    <th className='px-4 py-3 text-right font-medium text-muted-foreground'>
                                        {t('admin.vmPlans.table.col_actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className='divide-y divide-border/40'>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className='px-4 py-8 text-center text-muted-foreground text-sm'>
                                            <RefreshCw className='h-5 w-5 animate-spin mx-auto mb-2' />
                                            {t('common.loading')}
                                        </td>
                                    </tr>
                                ) : paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className='px-4 py-8 text-center text-muted-foreground text-sm'>
                                            <LayoutGrid className='h-8 w-8 mx-auto mb-2 opacity-30' />
                                            {search
                                                ? t('admin.vmPlans.empty.no_results')
                                                : t('admin.vmPlans.empty.title')}
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((plan) => (
                                        <tr key={plan.id} className='hover:bg-muted/20 transition-colors group'>
                                            <td className='px-4 py-3'>
                                                <div className='font-medium'>{plan.name}</div>
                                                {plan.description && (
                                                    <div className='text-xs text-muted-foreground truncate max-w-[180px]'>
                                                        {plan.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className='px-4 py-3'>
                                                <span className='inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border border-border/50 bg-muted/30'>
                                                    {plan.vm_type === 'qemu' ? (
                                                        <Monitor className='h-3 w-3 text-blue-500' />
                                                    ) : (
                                                        <Container className='h-3 w-3 text-green-500' />
                                                    )}
                                                    {plan.vm_type === 'qemu' ? 'QEMU/KVM' : 'LXC'}
                                                </span>
                                            </td>
                                            <td className='px-4 py-3 font-mono text-sm'>
                                                {plan.cpus}s/{plan.cores}c
                                            </td>
                                            <td className='px-4 py-3 font-mono text-sm'>{fmtRam(plan.memory)}</td>
                                            <td className='px-4 py-3 font-mono text-sm'>{plan.disk} GB</td>
                                            <td className='px-4 py-3'>
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${plan.instance_count > 0 ? 'bg-primary/10 text-primary' : 'bg-muted/30 text-muted-foreground'}`}
                                                >
                                                    {plan.instance_count}
                                                </span>
                                            </td>
                                            <td className='px-4 py-3 text-right'>
                                                <div className='flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                                                    {deleteConfirm === plan.id ? (
                                                        <>
                                                            <Button
                                                                variant='destructive'
                                                                size='sm'
                                                                loading={deleting}
                                                                onClick={() => handleDelete(plan.id)}
                                                            >
                                                                {t('common.confirm')}
                                                            </Button>
                                                            <Button
                                                                variant='outline'
                                                                size='sm'
                                                                onClick={() => setDeleteConfirm(null)}
                                                                disabled={deleting}
                                                            >
                                                                {t('common.cancel')}
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                variant='ghost'
                                                                size='sm'
                                                                onClick={() => openEdit(plan)}
                                                            >
                                                                <Pencil className='h-3.5 w-3.5' />
                                                            </Button>
                                                            <Button
                                                                variant='ghost'
                                                                size='sm'
                                                                className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                                                onClick={() => setDeleteConfirm(plan.id)}
                                                                disabled={plan.instance_count > 0}
                                                                title={
                                                                    plan.instance_count > 0
                                                                        ? t('admin.vmPlans.errors.plan_in_use')
                                                                        : undefined
                                                                }
                                                            >
                                                                <Trash2 className='h-3.5 w-3.5' />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </PageCard>

            {/* Sheet */}
            <Sheet open={sheetOpen} onOpenChange={(open: boolean) => !open && closeSheet()}>
                <SheetHeader>
                    <SheetTitle>
                        {editingPlan ? t('admin.vmPlans.sheet.edit_title') : t('admin.vmPlans.sheet.create_title')}
                    </SheetTitle>
                    <SheetDescription>
                        {editingPlan
                            ? t('admin.vmPlans.sheet.edit_description')
                            : t('admin.vmPlans.sheet.create_description')}
                    </SheetDescription>
                </SheetHeader>

                <div className='mt-6 space-y-6 overflow-y-auto max-h-[calc(100vh-220px)] pr-1'>
                    {/* Basic */}
                    <section className='space-y-4'>
                        <h3 className='text-sm font-semibold border-b border-border/40 pb-2'>
                            {t('admin.vmPlans.sheet.section_basic')}
                        </h3>
                        <div>
                            <FL>{t('admin.vmPlans.fields.name')}</FL>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                placeholder='e.g. VPS-2GB'
                            />
                        </div>
                        <div>
                            <FL>{t('admin.vmPlans.fields.description')}</FL>
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
                                <FL>{t('admin.vmPlans.fields.cpus')}</FL>
                                <Input type='number' min={1} value={form.cpus} onChange={setNum('cpus')} />
                            </div>
                            <div>
                                <FL>{t('admin.vmPlans.fields.cores')}</FL>
                                <Input type='number' min={1} value={form.cores} onChange={setNum('cores')} />
                            </div>
                        </div>
                        <div>
                            <FL>{t('admin.vmPlans.fields.cpu_type')}</FL>
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
                                <FL>{t('admin.vmPlans.fields.memory')}</FL>
                                <Input type='number' min={1} value={form.memory} onChange={setNum('memory')} />
                            </div>
                            <div>
                                <FL>{t('admin.vmPlans.fields.swap')}</FL>
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
                                <FL>{t('admin.vmPlans.fields.disk')}</FL>
                                <Input type='number' min={1} value={form.disk} onChange={setNum('disk')} />
                            </div>
                            <div>
                                <FL>{t('admin.vmPlans.fields.storage')}</FL>
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
                                <FL>{t('admin.vmPlans.fields.bridge')}</FL>
                                <Input value={form.bridge} onChange={setStr('bridge')} placeholder='vmbr0' />
                            </div>
                            <div>
                                <FL>{t('admin.vmPlans.fields.vlan_id')}</FL>
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
                                <FL>{t('admin.vmPlans.fields.net_rate')}</FL>
                                <Input type='number' min={0} value={form.net_rate} onChange={setNum('net_rate')} />
                            </div>
                        </div>
                        <div>
                            <FL>{t('admin.vmPlans.fields.bandwidth')}</FL>
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
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={handleSave} loading={saving}>
                            <Save className='h-4 w-4 mr-2' />
                            {editingPlan ? t('common.save_changes') : t('admin.vmPlans.actions.create')}
                        </Button>
                    </div>
                </div>
            </Sheet>
        </div>
    );
}
