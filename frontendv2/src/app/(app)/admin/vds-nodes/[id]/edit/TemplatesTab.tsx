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

'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select } from '@/components/ui/select-native';
import { toast } from 'sonner';
import { Plus, Trash2, RefreshCw, Layers, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/featherui/EmptyState';

interface VmTemplateRow {
    id: number;
    name: string;
    description: string | null;
    guest_type: string;
    os_type: string | null;
    storage: string;
    template_file: string | null;
    vm_node_id: number | null;
    is_active: string;
}

interface ProxmoxVm {
    vmid: number;
    name: string;
    node: string;
    template: number;
    type: string;
}

interface TemplatesTabProps {
    nodeId: string | number;
    nodeName?: string;
}

export function TemplatesTab({ nodeId }: TemplatesTabProps) {
    const { t } = useTranslation();
    const [templates, setTemplates] = useState<VmTemplateRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        name: '',
        template_file: '',
        guest_type: 'qemu' as 'qemu' | 'lxc',
        description: '',
    });
    const [creating, setCreating] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const [proxmoxVms, setProxmoxVms] = useState<ProxmoxVm[]>([]);
    const [loadingProxmoxVms, setLoadingProxmoxVms] = useState(false);
    const [proxmoxVmsError, setProxmoxVmsError] = useState<string | null>(null);

    const loadTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/admin/vm-nodes/${nodeId}/templates`);
            setTemplates(Array.isArray(data.data?.templates) ? data.data.templates : []);
        } catch {
            toast.error(t('admin.vdsNodes.ips.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [nodeId, t]);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    useEffect(() => {
        if (!createOpen) return;
        setProxmoxVmsError(null);
        setLoadingProxmoxVms(true);
        axios
            .get(`/api/admin/vm-nodes/${nodeId}/proxmox-vms`)
            .then((res) => {
                setProxmoxVms(Array.isArray(res.data.data?.vms) ? res.data.data.vms : []);
            })
            .catch((err) => {
                const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
                setProxmoxVmsError(msg || 'Failed to load VMs from Proxmox');
                setProxmoxVms([]);
            })
            .finally(() => setLoadingProxmoxVms(false));
    }, [createOpen, nodeId]);

    const handleProxmoxVmSelect = (vmidStr: string) => {
        const vmid = vmidStr ? Number(vmidStr) : 0;
        if (!vmid) {
            setCreateForm((f) => ({ ...f, template_file: '', name: '' }));
            return;
        }
        const vm = proxmoxVms.find((v) => v.vmid === vmid);
        if (vm) {
            setCreateForm((f) => ({
                ...f,
                template_file: String(vm.vmid),
                name: vm.name,
                guest_type: vm.type === 'lxc' ? 'lxc' : 'qemu',
            }));
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = createForm.name.trim();
        const vmid = createForm.template_file.trim();
        if (!name) {
            toast.error(t('admin.vdsNodes.templates.field_name_required') || 'Template name is required');
            return;
        }
        if (!vmid || !/^\d+$/.test(vmid)) {
            toast.error(t('admin.vdsNodes.templates.select_vm_first') || 'Select a VM from Proxmox first');
            return;
        }
        setCreating(true);
        try {
            await axios.post(`/api/admin/vm-nodes/${nodeId}/templates`, {
                name,
                template_file: vmid,
                guest_type: createForm.guest_type,
                description: createForm.description.trim() || undefined,
            });
            toast.success(t('admin.vdsNodes.templates.create_success'));
            setCreateOpen(false);
            setCreateForm({ name: '', template_file: '', guest_type: 'qemu', description: '' });
            loadTemplates();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg || t('admin.vdsNodes.templates.create_failed'));
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: number) => {
        setDeletingId(id);
        try {
            await axios.delete(`/api/admin/vm-templates/${id}`);
            toast.success(t('admin.vdsNodes.templates.delete_success'));
            setDeleteConfirmId(null);
            loadTemplates();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg || t('admin.vdsNodes.templates.delete_failed'));
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.vdsNodes.templates.title')}
                icon={Layers}
                description={t('admin.vdsNodes.templates.description')}
            >
                <div className='flex items-center justify-between gap-4 mb-4'>
                    <Button size='sm' variant='outline' onClick={loadTemplates} loading={loading}>
                        <RefreshCw className='h-4 w-4' />
                    </Button>
                    <Button size='sm' onClick={() => setCreateOpen(true)}>
                        <Plus className='h-4 w-4 mr-2' />
                        {t('admin.vdsNodes.templates.add')}
                    </Button>
                </div>

                {loading ? (
                    <div className='flex items-center justify-center py-12'>
                        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                    </div>
                ) : templates.length === 0 ? (
                    <EmptyState
                        icon={Layers}
                        title={t('admin.vdsNodes.templates.empty')}
                        description={t('admin.vdsNodes.templates.empty_desc')}
                        action={
                            <Button size='sm' onClick={() => setCreateOpen(true)}>
                                <Plus className='h-4 w-4 mr-2' />
                                {t('admin.vdsNodes.templates.add')}
                            </Button>
                        }
                    />
                ) : (
                    <div className='rounded-xl border border-border/30 overflow-hidden'>
                        <table className='w-full text-sm'>
                            <thead>
                                <tr className='border-b border-border/40 bg-muted/30'>
                                    <th className='text-left p-3 font-medium'>{t('admin.vdsNodes.templates.col_name')}</th>
                                    <th className='text-left p-3 font-medium'>{t('admin.vdsNodes.templates.col_vmid')}</th>
                                    <th className='text-left p-3 font-medium'>{t('admin.vdsNodes.templates.col_type')}</th>
                                    <th className='text-right p-3 font-medium'>{t('admin.vdsNodes.templates.col_actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {templates.map((tpl) => (
                                    <tr key={tpl.id} className='border-b border-border/20 hover:bg-muted/20'>
                                        <td className='p-3 font-medium'>{tpl.name}</td>
                                        <td className='p-3 font-mono text-muted-foreground'>{tpl.template_file ?? '—'}</td>
                                        <td className='p-3 text-muted-foreground'>
                                            {tpl.guest_type === 'qemu' ? 'QEMU/KVM' : 'LXC'}
                                        </td>
                                        <td className='p-3 text-right'>
                                            {deleteConfirmId === tpl.id ? (
                                                <span className='flex items-center justify-end gap-2'>
                                                    <Button
                                                        size='sm'
                                                        variant='destructive'
                                                        loading={deletingId === tpl.id}
                                                        onClick={() => handleDelete(tpl.id)}
                                                    >
                                                        {t('common.confirm')}
                                                    </Button>
                                                    <Button
                                                        size='sm'
                                                        variant='outline'
                                                        onClick={() => setDeleteConfirmId(null)}
                                                        disabled={deletingId !== null}
                                                    >
                                                        {t('common.cancel')}
                                                    </Button>
                                                </span>
                                            ) : (
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                                    onClick={() => setDeleteConfirmId(tpl.id)}
                                                    title={t('admin.vdsNodes.templates.delete_confirm_title')}
                                                >
                                                    <Trash2 className='h-4 w-4' />
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </PageCard>

            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <SheetContent side='right' className='w-full max-w-md'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.vdsNodes.templates.create_title')}</SheetTitle>
                        <p className='text-sm text-muted-foreground'>
                            {t('admin.vdsNodes.templates.create_desc_select') ||
                                'Select a VM from Proxmox — name and VMID will be filled. Use a VM you converted to template in Proxmox.'}
                        </p>
                    </SheetHeader>
                    <form onSubmit={handleCreate} className='mt-6 space-y-4'>
                        <div>
                            <Label className='mb-2 block'>
                                {t('admin.vdsNodes.templates.field_select_vm') || 'Select VM from Proxmox'}
                            </Label>
                            {loadingProxmoxVms ? (
                                <p className='text-sm text-muted-foreground flex items-center gap-2 py-2'>
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                    {t('admin.vdsNodes.templates.loading_vms') || 'Loading VMs…'}
                                </p>
                            ) : proxmoxVmsError ? (
                                <p className='text-sm text-destructive'>{proxmoxVmsError}</p>
                            ) : (
                                <Select
                                    value={createForm.template_file || ''}
                                    onChange={(e) => handleProxmoxVmSelect(e.target.value)}
                                >
                                    <option value=''>
                                        {t('admin.vdsNodes.templates.select_vm_placeholder') || '— Select a VM —'}
                                    </option>
                                    {proxmoxVms.map((vm) => (
                                        <option key={vm.vmid} value={vm.vmid}>
                                            {vm.name} (VMID {vm.vmid})
                                            {vm.template ? ' — Template' : ''}
                                        </option>
                                    ))}
                                </Select>
                            )}
                            {proxmoxVms.length === 0 && !loadingProxmoxVms && !proxmoxVmsError && (
                                <p className='text-xs text-muted-foreground mt-1'>
                                    {t('admin.vdsNodes.templates.no_vms') || 'No VMs found. Create and convert to template in Proxmox first.'}
                                </p>
                            )}
                        </div>
                        <div>
                            <Label className='mb-2 block'>{t('admin.vdsNodes.templates.field_name')}</Label>
                            <Input
                                value={createForm.name}
                                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder={t('admin.vdsNodes.templates.field_name_placeholder')}
                            />
                            <p className='text-xs text-muted-foreground mt-1'>
                                {t('admin.vdsNodes.templates.field_name_help') || 'Editable; used as the template name in the panel.'}
                            </p>
                        </div>
                        <div>
                            <Select
                                label={t('admin.vdsNodes.templates.field_guest_type')}
                                value={createForm.guest_type}
                                onChange={(e) =>
                                    setCreateForm((f) => ({ ...f, guest_type: e.target.value as 'qemu' | 'lxc' }))
                                }
                            >
                                <option value='qemu'>QEMU/KVM</option>
                                <option value='lxc'>LXC</option>
                            </Select>
                        </div>
                        <div>
                            <Label className='mb-2 block'>{t('admin.vdsNodes.templates.field_description')}</Label>
                            <Input
                                value={createForm.description}
                                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                                placeholder='Optional'
                            />
                        </div>
                        <div className='flex justify-end gap-2 pt-2'>
                            <Button type='button' variant='outline' onClick={() => setCreateOpen(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button
                                type='submit'
                                loading={creating}
                                disabled={!createForm.template_file || !createForm.name.trim() || loadingProxmoxVms}
                            >
                                {t('admin.vdsNodes.templates.add')}
                            </Button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
        </div>
    );
}
