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

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select-native';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Layers, Plus, Search as SearchIcon, Loader2, Monitor, Cpu, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export interface VmTemplateOption {
    id: number;
    name: string;
    template_file: string | null;
    guest_type: string;
    description?: string | null;
}

interface ProxmoxVm {
    vmid: number;
    name: string;
    node: string;
    template: number;
    type: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    nodeId: number;
    templates: VmTemplateOption[];
    selectedTemplateId: number;
    onSelectTemplate: (templateId: number) => void;
    onTemplateCreated: (created: VmTemplateOption) => void;
}

export function VmTemplatePickerSheet({
    open,
    onOpenChange,
    nodeId,
    templates,
    selectedTemplateId,
    onSelectTemplate,
    onTemplateCreated,
}: Props) {
    const { t } = useTranslation();
    const [mode, setMode] = useState<'browse' | 'create'>('browse');
    const [search, setSearch] = useState('');
    const [creating, setCreating] = useState(false);
    const [proxmoxVms, setProxmoxVms] = useState<ProxmoxVm[]>([]);
    const [loadingProxmoxVms, setLoadingProxmoxVms] = useState(false);
    const [proxmoxVmsError, setProxmoxVmsError] = useState<string | null>(null);
    const [createForm, setCreateForm] = useState({
        name: '',
        template_file: '',
        guest_type: 'qemu' as 'qemu' | 'lxc',
        description: '',
        lxc_root_password: '',
    });

    useEffect(() => {
        if (!open) return;
        setMode('browse');
    }, [open]);

    useEffect(() => {
        if (!open || mode !== 'create') return;
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
    }, [open, mode, nodeId]);

    const filtered = useMemo(
        () =>
            templates.filter((tpl) => {
                const q = search.toLowerCase().trim();
                if (!q) return true;
                return (
                    tpl.name.toLowerCase().includes(q) ||
                    (tpl.template_file || '').toLowerCase().includes(q) ||
                    (tpl.description || '').toLowerCase().includes(q)
                );
            }),
        [templates, search],
    );

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
                lxc_root_password: '',
            }));
        }
    };

    const handleCreate = async () => {
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
            const { data } = await axios.post(`/api/admin/vm-nodes/${nodeId}/templates`, {
                name,
                template_file: vmid,
                guest_type: createForm.guest_type,
                description: createForm.description.trim() || undefined,
                lxc_root_password:
                    createForm.guest_type === 'lxc' && createForm.lxc_root_password.trim()
                        ? createForm.lxc_root_password
                        : undefined,
            });
            const created = data?.data?.template as VmTemplateOption | undefined;
            if (!created?.id) {
                toast.error(t('admin.vdsNodes.templates.create_failed'));
                return;
            }
            toast.success(t('admin.vdsNodes.templates.create_success'));
            onTemplateCreated(created);
            setMode('browse');
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg || t('admin.vdsNodes.templates.create_failed'));
        } finally {
            setCreating(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className='overflow-y-auto sm:max-w-2xl'>
                <SheetHeader>
                    <SheetTitle>{t('admin.vmInstances.select_template') || 'Select template'}</SheetTitle>
                    <SheetDescription>
                        {mode === 'browse'
                            ? t('admin.vmInstances.template_help') || 'Choose an existing template for this VM.'
                            : t('admin.vdsNodes.templates.create_desc_select') ||
                              'Select a VM from Proxmox and create a template.'}
                    </SheetDescription>
                </SheetHeader>
                <div className='mt-6 space-y-4'>
                    <div className='border-border/60 bg-muted/30 flex gap-1 rounded-xl border p-1'>
                        <button
                            type='button'
                            onClick={() => setMode('browse')}
                            className={cn(
                                'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                mode === 'browse'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <SearchIcon className='h-4 w-4' />
                            Existing
                        </button>
                        <button
                            type='button'
                            onClick={() => setMode('create')}
                            className={cn(
                                'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                mode === 'create'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Plus className='h-4 w-4' />
                            Create new
                        </button>
                    </div>

                    {mode === 'browse' ? (
                        <>
                            <div className='relative'>
                                <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                                <Input
                                    placeholder={t('common.search') || 'Search'}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className='pl-10'
                                />
                            </div>
                            <div className='max-h-[60vh] space-y-2 overflow-y-auto'>
                                {filtered.length === 0 ? (
                                    <p className='text-muted-foreground py-6 text-center'>{t('common.no_results')}</p>
                                ) : (
                                    filtered.map((tpl) => (
                                        <button
                                            key={tpl.id}
                                            type='button'
                                            onClick={() => {
                                                onSelectTemplate(tpl.id);
                                                onOpenChange(false);
                                            }}
                                            className={cn(
                                                'w-full rounded-xl border p-3 text-left transition-all',
                                                selectedTemplateId === tpl.id
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-border/50 hover:border-primary hover:bg-primary/5',
                                            )}
                                        >
                                            <div className='flex items-start gap-3'>
                                                <div className='bg-primary/10 mt-0.5 rounded-lg p-2'>
                                                    {tpl.guest_type === 'lxc' ? (
                                                        <Cpu className='text-primary h-4 w-4' />
                                                    ) : (
                                                        <Monitor className='text-primary h-4 w-4' />
                                                    )}
                                                </div>
                                                <div>
                                                    <div className='font-semibold'>{tpl.name}</div>
                                                    <div className='text-muted-foreground font-mono text-xs'>
                                                        VMID {tpl.template_file ?? '—'} ·{' '}
                                                        {tpl.guest_type === 'lxc' ? 'LXC' : 'QEMU/KVM'}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <div className='space-y-4'>
                            <div>
                                <Label className='mb-2 block'>
                                    {t('admin.vdsNodes.templates.field_select_vm') || 'Select VM from Proxmox'}
                                </Label>
                                {loadingProxmoxVms ? (
                                    <p className='text-muted-foreground flex items-center gap-2 py-2 text-sm'>
                                        <Loader2 className='h-4 w-4 animate-spin' />
                                        {t('admin.vdsNodes.templates.loading_vms') || 'Loading VMs…'}
                                    </p>
                                ) : proxmoxVmsError ? (
                                    <p className='text-destructive text-sm'>{proxmoxVmsError}</p>
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
                                                {vm.name} (VMID {vm.vmid}){vm.template ? ' — Template' : ''}
                                            </option>
                                        ))}
                                    </Select>
                                )}
                            </div>
                            <div>
                                <Label className='mb-2 block'>{t('admin.vdsNodes.templates.field_name')}</Label>
                                <Input
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                                    placeholder={t('admin.vdsNodes.templates.field_name_placeholder')}
                                />
                            </div>
                            <div>
                                <Label className='mb-2 block'>{t('admin.vdsNodes.templates.field_guest_type')}</Label>
                                <Select
                                    value={createForm.guest_type}
                                    onChange={(e) =>
                                        setCreateForm((f) => ({ ...f, guest_type: e.target.value as 'qemu' | 'lxc' }))
                                    }
                                >
                                    <option value='qemu'>QEMU/KVM</option>
                                    <option value='lxc'>LXC</option>
                                </Select>
                            </div>
                            {createForm.guest_type === 'lxc' && (
                                <Alert variant='warning' className='px-3 py-2'>
                                    <ShieldAlert className='h-4 w-4' />
                                    <AlertTitle className='text-xs'>
                                        {t('admin.vdsNodes.templates.security_recommendation')}
                                    </AlertTitle>
                                    <AlertDescription className='text-[10px] leading-tight'>
                                        {t('admin.vdsNodes.templates.lxc_security_warning')}
                                    </AlertDescription>
                                </Alert>
                            )}
                            <div>
                                <Label className='mb-2 block'>{t('admin.vdsNodes.templates.field_description')}</Label>
                                <Input
                                    value={createForm.description}
                                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                                    placeholder={t('common.optional')}
                                />
                            </div>
                            {createForm.guest_type === 'lxc' && (
                                <div>
                                    <Label className='mb-2 block'>
                                        {t('admin.vdsNodes.templates.field_lxc_root_password') ||
                                            'Default root password'}
                                    </Label>
                                    <Input
                                        value={createForm.lxc_root_password}
                                        onChange={(e) =>
                                            setCreateForm((f) => ({ ...f, lxc_root_password: e.target.value }))
                                        }
                                    />
                                </div>
                            )}
                            <div className='flex justify-end gap-2 pt-2'>
                                <Button type='button' variant='outline' onClick={() => setMode('browse')}>
                                    {t('common.cancel')}
                                </Button>
                                <Button type='button' onClick={() => void handleCreate()} loading={creating}>
                                    <Layers className='mr-2 h-4 w-4' />
                                    {t('admin.vdsNodes.templates.add')}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
