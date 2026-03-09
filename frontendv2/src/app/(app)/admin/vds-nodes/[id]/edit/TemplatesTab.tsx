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
import { Plus, Trash2, RefreshCw, Layers, Loader2, Info } from 'lucide-react';
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
                                    <th className='text-left p-3 font-medium'>
                                        {t('admin.vdsNodes.templates.col_name')}
                                    </th>
                                    <th className='text-left p-3 font-medium'>
                                        {t('admin.vdsNodes.templates.col_vmid')}
                                    </th>
                                    <th className='text-left p-3 font-medium'>
                                        {t('admin.vdsNodes.templates.col_type')}
                                    </th>
                                    <th className='text-right p-3 font-medium'>
                                        {t('admin.vdsNodes.templates.col_actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {templates.map((tpl) => (
                                    <tr key={tpl.id} className='border-b border-border/20 hover:bg-muted/20'>
                                        <td className='p-3 font-medium'>{tpl.name}</td>
                                        <td className='p-3 font-mono text-muted-foreground'>
                                            {tpl.template_file ?? '—'}
                                        </td>
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

            <PageCard title='How to create Debian 13 / Ubuntu 24.04 Proxmox templates' icon={Info} className='mt-6'>
                <div className='text-sm text-muted-foreground space-y-4'>
                    <p className='font-medium'>1. Download latest cloud images on your Proxmox node</p>
                    <pre className='bg-muted/60 rounded-md p-3 overflow-x-auto text-xs'>
                        <code>{`cd /var/lib/vz/template/iso

# Debian 13 (trixie)
wget https://cloud.debian.org/images/cloud/trixie/latest/debian-13-genericcloud-amd64.qcow2

# Ubuntu 24.04 (noble)
wget https://cloud-images.ubuntu.com/noble/current/noble-server-cloudimg-amd64.img`}</code>
                    </pre>

                    <p className='font-medium'>2. Create a Debian 13 cloud-init template (example VMID 9000)</p>
                    <p>In the Proxmox UI, use these settings when you click &quot;Create VM&quot;:</p>
                    <ul className='list-disc list-inside text-xs space-y-1'>
                        <li>
                            <span className='font-semibold'>General:</span> set VMID <code>9000</code>, name e.g.
                            <code>debian-13-cloudinit</code>.
                        </li>
                        <li>
                            <span className='font-semibold'>OS tab:</span>{' '}
                            <span className='font-semibold text-foreground'>do not attach any ISO</span>. Set the CD/DVD
                            option to <code>Do not use any media</code>.
                        </li>
                        <li>
                            <span className='font-semibold'>System tab:</span> <code>Machine = q35</code>,{' '}
                            <code>BIOS = OVMF (UEFI)</code>. When asked, choose EFI storage (e.g. <code>local</code>)
                            and tick <code>Qemu agent</code>.
                        </li>
                        <li>
                            <span className='font-semibold'>Disks tab:</span> leave the default disk so the wizard can
                            finish (we will remove the default <code>scsi0</code> after creation).
                        </li>
                        <li>
                            <span className='font-semibold'>CPU tab:</span> set <code>Type = host</code>; keep
                            sockets/cores at your preferred defaults.
                        </li>
                        <li>
                            <span className='font-semibold'>Memory tab:</span> choose a reasonable default (e.g.
                            <code>1024</code> MB).
                        </li>
                        <li>
                            <span className='font-semibold'>Network tab:</span>{' '}
                            <code>Model = VirtIO (paravirtualized)</code>, bridge <code>vmbr0</code> (or your main
                            bridge).
                        </li>
                    </ul>
                    <p className='text-xs'>
                        After the VM is created, open its <code>Hardware</code> tab,{' '}
                        <span className='font-semibold'>remove the default scsi0 disk</span>, and make sure you still
                        have an EFI disk (<code>efidisk0</code>) and a free IDE slot for cloud-init (<code>ide2</code>).
                        Then on the node shell run the commands below.{' '}
                        <span className='font-semibold text-foreground'>Do not literally type</span>{' '}
                        <code>&lt;storage&gt;</code> – replace it with your storage ID from <code>qm config</code> (for
                        example <code>local</code> or <code>local-lvm</code>).
                    </p>
                    <pre className='bg-muted/60 rounded-md p-3 overflow-x-auto text-xs'>
                        <code>{`cd /var/lib/vz/template/iso

# (Optional) rename to .qcow2 and resize to desired template size
mv debian-13-genericcloud-amd64.qcow2 debian-13-genericcloud-amd64-template.qcow2
qemu-img resize debian-13-genericcloud-amd64-template.qcow2 32G

# Import Debian disk into the VM (replace <storage> with your storage ID, e.g. 'local')
qm importdisk 9000 debian-13-genericcloud-amd64-template.qcow2 <storage>

# Check the exact volume name Proxmox created (see scsi0/unused0)
qm config 9000

# In the Proxmox UI or via qm set, attach the imported volume as scsi0 on the same storage,
# add an EFI disk (efidisk0) and a cloud-init drive (ide2, type = CloudInit), then:
qm set 9000 --serial0 socket --vga serial0`}</code>
                    </pre>

                    <p className='text-xs'>
                        For <span className='font-semibold'>both</span> Debian and Ubuntu templates, go back to the
                        VM&apos;s <code>Hardware</code> tab and edit the imported disk (now <code>scsi0</code>). If this
                        node uses SSD or NVMe storage, tick both <code>Discard</code> and <code>SSD emulation</code> so
                        Proxmox can trim and align IO correctly, then save the dialog.
                    </p>
                    <p className='text-xs'>
                        Next, open <code>Options → Boot order</code>. Uncheck <code>ide2</code> and <code>net0</code> as
                        boot devices and drag <code>scsi0</code> to the very top so it is the{' '}
                        <span className='font-semibold'>only active boot entry</span>. This ensures the VM always boots
                        from the main disk on <code>scsi0</code> and never from PXE or the cloud-init CD while still
                        using the cloud-init drive on <code>ide2</code> for metadata.
                    </p>
                    <p className='text-xs'>
                        Go to <code>Hardware</code> and make sure you have an EFI disk (<code>efidisk0</code>) and a
                        <span className='font-semibold'> CloudInit drive</span> on <code>ide2</code>.{' '}
                        <span className='font-semibold text-foreground'>Do not remove the CloudInit drive</span> – it is
                        required for FeatherPanel to inject IP, user, password and SSH keys. Finally, right‑click the VM
                        in the tree, choose <code>Convert to template</code> and confirm. This gives you a ready‑to‑use
                        cloud-init template for that OS.
                    </p>

                    <p className='font-medium'>3. Create an Ubuntu 24.04 cloud-init template (example VMID 9001)</p>
                    <p>In the Proxmox UI, repeat the same VM creation flow for Ubuntu:</p>
                    <ul className='list-disc list-inside text-xs space-y-1'>
                        <li>
                            <span className='font-semibold'>General:</span> VMID <code>9001</code>, name e.g.
                            <code>ubuntu-24-cloudinit</code>.
                        </li>
                        <li>
                            <span className='font-semibold'>OS tab:</span> again,{' '}
                            <span className='font-semibold'>no ISO</span> (set CD/DVD to{' '}
                            <code>Do not use any media</code>).
                        </li>
                        <li>
                            <span className='font-semibold'>System tab:</span> <code>Machine = q35</code>,{' '}
                            <code>BIOS = OVMF (UEFI)</code> with EFI storage, Qemu agent enabled.
                        </li>
                        <li>
                            <span className='font-semibold'>Disks / CPU / Memory / Network:</span> same defaults as
                            Debian; remove the default <code>scsi0</code> disk on <code>Hardware</code> after creation,
                            keep VirtIO network.
                        </li>
                    </ul>
                    <p className='text-xs'>
                        Then on the node shell import the Ubuntu cloud image and attach it as <code>scsi0</code>:
                    </p>
                    <pre className='bg-muted/60 rounded-md p-3 overflow-x-auto text-xs'>
                        <code>{`cd /var/lib/vz/template/iso

mv noble-server-cloudimg-amd64.img noble-server-cloudimg-amd64.qcow2
qemu-img resize noble-server-cloudimg-amd64.qcow2 32G

qm importdisk 9001 noble-server-cloudimg-amd64.qcow2 <storage>

qm config 9001

# Attach imported disk as scsi0, add EFI disk and a cloud-init drive (ide2, type = CloudInit), then:
qm set 9001 --serial0 socket --vga serial0`}</code>
                    </pre>

                    <p className='text-xs'>
                        For <span className='font-semibold'>both</span> Debian and Ubuntu templates, go back to the
                        VM&apos;s <code>Hardware</code> tab and edit the imported disk (now <code>scsi0</code>). If this
                        node uses SSD or NVMe storage, tick both <code>Discard</code> and <code>SSD emulation</code> so
                        Proxmox can trim and align IO correctly, then save the dialog.
                    </p>
                    <p className='text-xs'>
                        Next, open <code>Options → Boot order</code>. Uncheck <code>ide2</code> and <code>net0</code> as
                        boot devices and drag <code>scsi0</code> to the very top so it is the{' '}
                        <span className='font-semibold'>only active boot entry</span>. This ensures the VM always boots
                        from the main disk on <code>scsi0</code> and never from PXE or the cloud-init CD while still
                        using the cloud-init drive on <code>ide2</code> for metadata.
                    </p>
                    <p className='text-xs'>
                        Go to <code>Hardware</code> and make sure you have an EFI disk (<code>efidisk0</code>) and a
                        <span className='font-semibold'> CloudInit drive</span> on <code>ide2</code>.{' '}
                        <span className='font-semibold text-foreground'>Do not remove the CloudInit drive</span> – it is
                        required for FeatherPanel to inject IP, user, password and SSH keys. Finally, right‑click the VM
                        in the tree, choose <code>Convert to template</code> and confirm. This gives you a ready‑to‑use
                        cloud-init template for that OS.
                    </p>

                    <p className='font-medium'>4. Hook into FeatherPanel</p>
                    <p>
                        In your plans / products, use template ID <code>9000</code> for Debian 13 and <code>9001</code>{' '}
                        for Ubuntu 24.04. FeatherPanel will clone these templates, apply cloud-init (IP, user, password
                        / SSH keys) and the VNC Console button will open the Proxmox noVNC URL directly. These steps are
                        written for official Debian/Ubuntu cloud-init images, but the same pattern generally works for
                        other distros that ship proper cloud-init images and UEFI support.
                    </p>
                </div>
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
                                            {vm.name} (VMID {vm.vmid}){vm.template ? ' — Template' : ''}
                                        </option>
                                    ))}
                                </Select>
                            )}
                            {proxmoxVms.length === 0 && !loadingProxmoxVms && !proxmoxVmsError && (
                                <p className='text-xs text-muted-foreground mt-1'>
                                    {t('admin.vdsNodes.templates.no_vms') ||
                                        'No VMs found. Create and convert to template in Proxmox first.'}
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
                                {t('admin.vdsNodes.templates.field_name_help') ||
                                    'Editable; used as the template name in the panel.'}
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
