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
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { PageCard } from '@/components/featherui/PageCard';
import { toast } from 'sonner';
import {
    Server,
    ArrowLeft,
    Pencil,
    Play,
    Square,
    RotateCw,
    Trash2,
    Loader2,
    User,
    Network,
    HardDrive,
    Cpu,
    Calendar,
    Monitor,
    Activity,
    Eye,
    EyeOff,
    Copy,
} from 'lucide-react';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { BackupsSection } from './BackupsSection';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { copyToClipboard } from '@/lib/utils';
const VNC_POPUP_WIDTH = 1024;
const VNC_POPUP_HEIGHT = 768;

function openVncPopup(url: string, name = 'pve-novnc') {
    const left = Math.max(0, (typeof window !== 'undefined' ? window.screen.width : 1024) - VNC_POPUP_WIDTH) >> 1;
    const top = Math.max(0, (typeof window !== 'undefined' ? window.screen.height : 1024) - VNC_POPUP_HEIGHT) >> 1;
    window.open(
        url,
        name,
        `width=${VNC_POPUP_WIDTH},height=${VNC_POPUP_HEIGHT},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`,
    );
}

interface VmInstance {
    id: number;
    vmid: number;
    hostname: string | null;
    node_name: string | null;
    plan_name: string | null;
    status: string;
    ip_address: string | null;
    ip_pool_address?: string | null;
    gateway?: string | null;
    user_username?: string | null;
    user_email?: string | null;
    plan_memory?: number;
    plan_cpus?: number;
    plan_cores?: number;
    plan_disk?: number;
    created_at: string;
    notes?: string | null;
    vm_type?: string | null;
    lxc_root_password?: string | null;
}

interface VmStatus {
    status?: string;
    cpu?: number;
    mem?: number;
    maxmem?: number;
    cpus?: number;
    disk?: number;
    maxdisk?: number;
    netin?: number;
    netout?: number;
    uptime?: number;
}

export default function VmInstanceViewPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useParams();
    const id = Number(params?.id);

    const [instance, setInstance] = useState<VmInstance | null>(null);
    const [loading, setLoading] = useState(true);
    const [poweringId, setPoweringId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [usage, setUsage] = useState<VmStatus | null>(null);
    const [usageLoading, setUsageLoading] = useState(false);
    const [vncOpening, setVncOpening] = useState(false);
    const [reinstalling, setReinstalling] = useState(false);
    const [confirmReinstall, setConfirmReinstall] = useState(false);
    const [ciUser, setCiUser] = useState('');
    const [ciPassword, setCiPassword] = useState('');
    const [showLxcPassword, setShowLxcPassword] = useState(false);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-vm-instance-view');

    const openVncConsole = useCallback(async () => {
        if (!id || Number.isNaN(id)) return;
        setVncOpening(true);
        try {
            const res = await axios.get(`/api/admin/vm-instances/${id}/vnc-ticket`);
            const data = res.data?.data;
            const pveRedirectUrl = data?.pve_redirect_url as string | undefined;
            if (!pveRedirectUrl) {
                toast.error(
                    'Proxmox console URL not available. Ensure the node API user has User.Modify and ACL.Modify.',
                );
                return;
            }
            openVncPopup(pveRedirectUrl);
        } catch (err) {
            toast.error(axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : 'VNC ticket failed');
        } finally {
            setVncOpening(false);
        }
    }, [id]);

    useEffect(() => {
        if (!id || Number.isNaN(id)) {
            router.replace('/admin/vm-instances');
            return;
        }
        axios
            .get(`/api/admin/vm-instances/${id}`)
            .then((res) => setInstance(res.data.data?.instance ?? null))
            .catch(() => toast.error(t('admin.vmInstances.errors.fetch_failed')))
            .finally(() => setLoading(false));
    }, [id, router, t]);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const fetchUsage = useCallback(() => {
        if (!id || Number.isNaN(id)) return;
        setUsageLoading(true);
        axios
            .get(`/api/admin/vm-instances/${id}/status`)
            .then((res) => setUsage((res.data?.data?.status ?? null) as VmStatus))
            .catch(() => setUsage(null))
            .finally(() => setUsageLoading(false));
    }, [id]);

    useEffect(() => {
        if (!instance) {
            setUsage(null);
            return;
        }
        fetchUsage();
        const interval = setInterval(fetchUsage, instance.status === 'running' ? 20000 : 60000);
        return () => clearInterval(interval);
    }, [instance, fetchUsage]);

    const handlePower = async (action: 'start' | 'stop' | 'reboot') => {
        setPoweringId(action);
        try {
            await axios.post(`/api/admin/vm-instances/${id}/power`, { action });
            toast.success(t('admin.vmInstances.power_success') ?? 'Power action completed');
            const { data } = await axios.get(`/api/admin/vm-instances/${id}`);
            setInstance(data.data?.instance ?? null);
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setPoweringId(null);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await axios.delete(`/api/admin/vm-instances/${id}`);
            toast.success(t('admin.vmInstances.delete_success') ?? 'VM instance deleted');
            router.push('/admin/vm-instances');
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
        } finally {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    const handleReinstall = async () => {
        setReinstalling(true);
        setConfirmReinstall(false);
        try {
            const payload: Record<string, unknown> = {};
            if (instance?.vm_type === 'qemu') {
                payload.ci_user = ciUser.trim();
                payload.ci_password = ciPassword.trim();
            }
            const startRes = await axios.post(`/api/admin/vm-instances/${id}/reinstall`, payload);
            const reinstallId = startRes.data?.data?.reinstall_id as string | undefined;
            if (!reinstallId) {
                toast.error('Reinstall did not return a reinstall_id');
                setReinstalling(false);
                return;
            }

            // Poll until active or failed (same pattern as VM creation).
            const MAX_POLLS = 120; // 6 minutes at 3s interval
            let polls = 0;
            const poll = async (): Promise<void> => {
                if (polls >= MAX_POLLS) {
                    toast.error('Reinstall timed out waiting for clone to finish');
                    setReinstalling(false);
                    return;
                }
                polls++;
                try {
                    const statusRes = await axios.get(`/api/admin/vm-instances/reinstall-status/${reinstallId}`);
                    const s = statusRes.data?.data;
                    if (s?.status === 'active') {
                        toast.success(t('admin.vmInstances.reinstall_success') ?? 'VM reinstalled from template');
                        const { data: fresh } = await axios.get(`/api/admin/vm-instances/${id}`);
                        setInstance(fresh.data?.instance ?? null);
                        setReinstalling(false);
                        return;
                    }
                    if (s?.status === 'failed') {
                        toast.error(s?.error ?? 'Reinstall failed');
                        setReinstalling(false);
                        return;
                    }
                } catch {
                    // Ignore transient polling errors — keep polling.
                }
                setTimeout(() => {
                    void poll();
                }, 3000);
            };
            void poll();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg);
            setReinstalling(false);
        }
    };

    const effectiveStatus = (usage?.status as string | undefined) ?? instance?.status ?? '';
    const statusClass =
        effectiveStatus === 'running'
            ? 'bg-green-500/10 text-green-600'
            : effectiveStatus === 'stopped'
              ? 'bg-muted text-muted-foreground'
              : 'bg-amber-500/10 text-amber-600';

    if (loading || !instance) {
        return (
            <div className='flex items-center justify-center min-h-[200px]'>
                <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-vm-instance-view', 'top-of-page')} context={{ id }} />

            <PageHeader
                title={instance.hostname ?? `VM ${instance.vmid}`}
                description={`Proxmox VMID ${instance.vmid} · ${instance.node_name ?? '—'}`}
                icon={Server}
                actions={
                    <div className='flex items-center gap-2'>
                        <Button variant='outline' size='sm' onClick={() => router.push('/admin/vm-instances')}>
                            <ArrowLeft className='h-4 w-4 mr-2' />
                            {t('common.back')}
                        </Button>
                        <Button
                            size='sm'
                            variant='outline'
                            onClick={() => router.push(`/admin/vm-instances/${id}/edit`)}
                        >
                            <Pencil className='h-4 w-4 mr-2' />
                            {t('common.edit')}
                        </Button>
                        <Button size='sm' variant='destructive' onClick={() => setConfirmDelete(true)}>
                            <Trash2 className='h-4 w-4 mr-2' />
                            {t('common.delete')}
                        </Button>
                    </div>
                }
            />

            <div className='flex flex-wrap items-center gap-3 p-6 rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-border/50'>
                <Button
                    size='lg'
                    disabled={poweringId !== null}
                    onClick={() => handlePower('start')}
                    className='px-6 py-3 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-600 font-black uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95'
                >
                    {poweringId === 'start' ? (
                        <Loader2 className='h-4 w-4 animate-spin mr-2' />
                    ) : (
                        <Play className='h-4 w-4 mr-2' />
                    )}
                    START
                </Button>
                <Button
                    size='lg'
                    disabled={poweringId !== null}
                    onClick={() => handlePower('stop')}
                    className='px-6 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 font-black uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95'
                >
                    {poweringId === 'stop' ? (
                        <Loader2 className='h-4 w-4 animate-spin mr-2' />
                    ) : (
                        <Square className='h-4 w-4 mr-2' />
                    )}
                    STOP
                </Button>
                <Button
                    size='lg'
                    disabled={poweringId !== null}
                    onClick={() => handlePower('reboot')}
                    className='px-6 py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 font-black uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95'
                >
                    {poweringId === 'reboot' ? (
                        <Loader2 className='h-4 w-4 animate-spin mr-2' />
                    ) : (
                        <RotateCw className='h-4 w-4 mr-2' />
                    )}
                    REBOOT
                </Button>
                <Button
                    size='lg'
                    variant='outline'
                    disabled={vncOpening}
                    onClick={openVncConsole}
                    className='px-6 py-3 rounded-xl transition-all hover:scale-105 active:scale-95'
                >
                    {vncOpening ? (
                        <Loader2 className='h-4 w-4 animate-spin mr-2' />
                    ) : (
                        <Monitor className='h-4 w-4 mr-2' />
                    )}
                    {t('admin.vmInstances.vnc_console') ?? 'VNC Console'}
                </Button>
                <Button
                    size='lg'
                    variant='outline'
                    disabled={reinstalling}
                    onClick={() => !reinstalling && setConfirmReinstall(true)}
                    className='px-6 py-3 rounded-xl transition-all hover:scale-105 active:scale-95'
                >
                    {reinstalling ? (
                        <Loader2 className='h-4 w-4 animate-spin mr-2' />
                    ) : (
                        <RotateCw className='h-4 w-4 mr-2' />
                    )}
                    {reinstalling
                        ? (t('common.processing') ?? 'Reinstalling…')
                        : (t('admin.vmInstances.reinstall') ?? 'Reinstall')}
                </Button>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-vm-instance-view', 'after-header')} context={{ id }} />

            {(usage !== null || usageLoading) && (
                <PageCard title={t('admin.vmInstances.resource_usage') ?? 'Resource usage'} icon={Activity}>
                    {usageLoading && usage === null ? (
                        <div className='flex items-center gap-2 text-muted-foreground'>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            {t('common.loading') ?? 'Loading…'}
                        </div>
                    ) : usage ? (
                        <div className='grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm'>
                            {usage.status && (
                                <div className='rounded-xl border border-border/50 bg-muted/20 p-3'>
                                    <div className='text-muted-foreground mb-1'>{t('common.status') ?? 'Status'}</div>
                                    <div className='font-semibold capitalize'>{usage.status}</div>
                                </div>
                            )}
                            {typeof usage.cpu === 'number' && (
                                <div className='rounded-xl border border-border/50 bg-muted/20 p-3'>
                                    <div className='text-muted-foreground mb-1'>CPU</div>
                                    <div className='font-semibold tabular-nums'>{(usage.cpu * 100).toFixed(1)}%</div>
                                </div>
                            )}
                            {(usage.mem != null || usage.maxmem != null) && (
                                <div className='rounded-xl border border-border/50 bg-muted/20 p-3'>
                                    <div className='text-muted-foreground mb-1'>
                                        {t('admin.vmInstances.memory_used') ?? 'Memory'}
                                    </div>
                                    <div className='font-semibold tabular-nums'>
                                        {usage.maxmem
                                            ? `${((usage.mem ?? 0) / 1024 / 1024).toFixed(0)} / ${(usage.maxmem / 1024 / 1024).toFixed(0)} MB`
                                            : `${((usage.mem ?? 0) / 1024 / 1024).toFixed(0)} MB`}
                                    </div>
                                </div>
                            )}
                            {(usage.disk != null || usage.maxdisk != null) && (usage.maxdisk ?? 0) > 0 && (
                                <div className='rounded-xl border border-border/50 bg-muted/20 p-3'>
                                    <div className='text-muted-foreground mb-1'>
                                        {t('admin.vmInstances.disk_used') ?? 'Disk'}
                                    </div>
                                    <div className='font-semibold tabular-nums'>
                                        {((usage.disk ?? 0) / 1024 / 1024 / 1024).toFixed(1)} /{' '}
                                        {(usage.maxdisk! / 1024 / 1024 / 1024).toFixed(1)} GB
                                    </div>
                                </div>
                            )}
                            {(usage.netin != null || usage.netout != null) && (
                                <div className='rounded-xl border border-border/50 bg-muted/20 p-3'>
                                    <div className='text-muted-foreground mb-1'>
                                        {t('admin.vmInstances.network') ?? 'Network'}
                                    </div>
                                    <div className='font-semibold tabular-nums text-xs'>
                                        ↓ {((usage.netin ?? 0) / 1024 / 1024).toFixed(1)} MB / ↑{' '}
                                        {((usage.netout ?? 0) / 1024 / 1024).toFixed(1)} MB
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : null}
                </PageCard>
            )}

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <PageCard title={t('admin.vmInstances.details') ?? 'Details'} icon={Server}>
                    <dl className='space-y-3 text-sm'>
                        <div className='flex justify-between'>
                            <dt className='text-muted-foreground'>
                                {t('admin.vmInstances.details_status') ?? 'Status'}
                            </dt>
                            <dd>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}>
                                    {effectiveStatus || instance.status}
                                </span>
                            </dd>
                        </div>
                        <div className='flex justify-between'>
                            <dt className='text-muted-foreground'>{t('admin.vmInstances.details_vmid') ?? 'VMID'}</dt>
                            <dd className='font-mono'>{instance.vmid}</dd>
                        </div>
                        <div className='flex justify-between'>
                            <dt className='text-muted-foreground'>{t('admin.vmInstances.details_node') ?? 'Node'}</dt>
                            <dd>{instance.node_name ?? '—'}</dd>
                        </div>
                        <div className='flex justify-between'>
                            <dt className='text-muted-foreground'>{t('admin.vmInstances.details_plan') ?? 'Plan'}</dt>
                            <dd>{instance.plan_name ?? '—'}</dd>
                        </div>
                        <div className='flex justify-between'>
                            <dt className='text-muted-foreground'>
                                {t('admin.vmInstances.details_created') ?? 'Created'}
                            </dt>
                            <dd className='flex items-center gap-1'>
                                <Calendar className='h-3.5 w-3.5' />
                                {instance.created_at ? new Date(instance.created_at).toLocaleString() : '—'}
                            </dd>
                        </div>
                        {instance.vm_type === 'lxc' && instance.lxc_root_password && (
                            <div>
                                <dt className='text-muted-foreground mb-1'>
                                    {t('admin.vmInstances.lxc_root_password_label') ?? 'Default LXC root password'}
                                </dt>
                                <dd className='text-sm'>
                                    <div className='flex items-center gap-2'>
                                        <span className='font-mono'>
                                            {showLxcPassword ? instance.lxc_root_password : '••••••••'}
                                        </span>
                                        <Button
                                            type='button'
                                            size='icon'
                                            variant='outline'
                                            className='h-7 w-7'
                                            onClick={() => setShowLxcPassword((v) => !v)}
                                            title={
                                                showLxcPassword
                                                    ? (t('admin.vmInstances.lxc_root_password_hide') ?? 'Hide password')
                                                    : (t('admin.vmInstances.lxc_root_password_show') ?? 'Show password')
                                            }
                                        >
                                            {showLxcPassword ? (
                                                <EyeOff className='h-3.5 w-3.5' />
                                            ) : (
                                                <Eye className='h-3.5 w-3.5' />
                                            )}
                                        </Button>
                                        <Button
                                            type='button'
                                            size='icon'
                                            variant='outline'
                                            className='h-7 w-7'
                                            onClick={() => copyToClipboard(instance.lxc_root_password ?? '')}
                                            title={t('common.copy') ?? 'Copy'}
                                        >
                                            <Copy className='h-3.5 w-3.5' />
                                        </Button>
                                    </div>
                                    <span className='block text-[11px] text-muted-foreground mt-1'>
                                        {t('admin.vmInstances.lxc_root_password_help') ??
                                            'Stored on the template as an informational default. FeatherPanel does not change the container password; this is for showing default credentials to users.'}
                                    </span>
                                </dd>
                            </div>
                        )}
                        {instance.notes && (
                            <div>
                                <dt className='text-muted-foreground mb-1'>
                                    {t('admin.vmInstances.details_notes') ?? 'Notes'}
                                </dt>
                                <dd className='text-muted-foreground'>{instance.notes}</dd>
                            </div>
                        )}
                    </dl>
                </PageCard>
                <PageCard title={t('admin.vmInstances.network') ?? 'Network'} icon={Network}>
                    <dl className='space-y-3 text-sm'>
                        <div className='flex justify-between'>
                            <dt className='text-muted-foreground'>{t('admin.vmInstances.network_ip_label') ?? 'IP'}</dt>
                            <dd className='font-mono'>{instance.ip_pool_address ?? instance.ip_address ?? '—'}</dd>
                        </div>
                        <div className='flex justify-between'>
                            <dt className='text-muted-foreground'>
                                {t('admin.vmInstances.network_gateway_label') ?? 'Gateway'}
                            </dt>
                            <dd className='font-mono'>{instance.gateway ?? '—'}</dd>
                        </div>
                        <div className='flex justify-between'>
                            <dt className='text-muted-foreground'>{t('admin.vmInstances.owner_label') ?? 'Owner'}</dt>
                            <dd className='flex items-center gap-1'>
                                {instance.user_username ? (
                                    <>
                                        <User className='h-3.5 w-3.5' />
                                        {instance.user_username}
                                        {instance.user_email && (
                                            <span className='text-muted-foreground'> ({instance.user_email})</span>
                                        )}
                                    </>
                                ) : (
                                    '—'
                                )}
                            </dd>
                        </div>
                    </dl>
                </PageCard>
            </div>

            {(instance.plan_memory != null || instance.plan_cpus != null || instance.plan_disk != null) && (
                <PageCard title={t('admin.vmInstances.resources') ?? 'Plan resources'} icon={Cpu}>
                    <div className='flex flex-wrap gap-6 text-sm'>
                        {instance.plan_cpus != null && (
                            <span className='flex items-center gap-2'>
                                <Cpu className='h-4 w-4 text-muted-foreground' />
                                {instance.plan_cpus} {t('admin.vmInstances.cpu_label') ?? 'CPU'} /{' '}
                                {instance.plan_cores ?? '?'} {t('admin.vmInstances.cores_label') ?? 'cores'}
                            </span>
                        )}
                        {instance.plan_memory != null && (
                            <span className='flex items-center gap-2'>
                                <Server className='h-4 w-4 text-muted-foreground' />
                                {instance.plan_memory} {t('common.mb') ?? 'MB'}{' '}
                                {t('admin.vmInstances.ram_label') ?? 'RAM'}
                            </span>
                        )}
                        {instance.plan_disk != null && (
                            <span className='flex items-center gap-2'>
                                <HardDrive className='h-4 w-4 text-muted-foreground' />
                                {instance.plan_disk} {t('common.gb') ?? 'GB'}{' '}
                                {t('admin.vmInstances.disk_label') ?? 'disk'}
                            </span>
                        )}
                    </div>
                </PageCard>
            )}

            <BackupsSection instanceId={id} />

            <WidgetRenderer widgets={getWidgets('admin-vm-instance-view', 'bottom-of-page')} context={{ id }} />

            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t('admin.vmInstances.delete_confirm_title') ?? 'Delete VM instance?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('admin.vmInstances.delete_confirm_desc') ??
                                'This will stop and remove the VM from Proxmox and delete the record. This cannot be undone.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        >
                            {deleting ? (
                                <>
                                    <Loader2 className='h-4 w-4 animate-spin mr-2' />
                                    {t('common.deleting') ?? 'Deleting…'}
                                </>
                            ) : (
                                t('common.delete')
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirmReinstall} onOpenChange={setConfirmReinstall}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {t('admin.vmInstances.reinstall_confirm_title') ?? 'Reinstall VM instance?'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('admin.vmInstances.reinstall_confirm_desc') ??
                                'This will delete the current VM from Proxmox and clone a fresh one from the original template, keeping the same owner and IP. All data on this VM will be lost.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {instance && (
                        <div className='space-y-3 py-2'>
                            <p className='text-sm text-muted-foreground'>
                                {instance.vm_type === 'qemu'
                                    ? (t('admin.vmInstances.reinstall_ci_help') ??
                                      'Enter a new cloud-init username and password for the reinstalled VM.')
                                    : (t('admin.vmInstances.reinstall_lxc_help') ??
                                      "LXC passwords are not managed by FeatherPanel. The template's default root password will continue to apply.")}
                            </p>
                            {instance.vm_type === 'qemu' && (
                                <div className='space-y-1'>
                                    <label className='block text-xs font-medium'>
                                        {t('admin.vmInstances.reinstall_ci_user') ?? 'Cloud-init username'}
                                    </label>
                                    <input
                                        type='text'
                                        className='w-full h-9 rounded-md border border-border bg-muted/40 px-2 text-sm'
                                        value={ciUser}
                                        onChange={(e) => setCiUser(e.target.value)}
                                        placeholder='debian'
                                    />
                                </div>
                            )}
                            {instance.vm_type === 'qemu' && (
                                <div className='space-y-1'>
                                    <label className='block text-xs font-medium'>
                                        {t('admin.vmInstances.reinstall_ci_password') ?? 'Cloud-init password'}
                                    </label>
                                    <input
                                        type='password'
                                        className='w-full h-9 rounded-md border border-border bg-muted/40 px-2 text-sm'
                                        value={ciPassword}
                                        onChange={(e) => setCiPassword(e.target.value)}
                                        placeholder='********'
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={reinstalling}>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleReinstall}
                            disabled={reinstalling}
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        >
                            {t('admin.vmInstances.reinstall') ?? 'Reinstall'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
