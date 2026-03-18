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

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { useVmInstance } from '@/contexts/VmInstanceContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/featherui/Input';
import { toast } from 'sonner';
import { RefreshCw, AlertTriangle, Loader2, RotateCcw, Lock, Server, Eye, EyeOff } from 'lucide-react';
import { HeadlessModal } from '@/components/ui/headless-modal';
import { cn } from '@/lib/utils';

interface ReinstallTemplate {
    id: number;
    name: string;
    os?: string;
}

interface MountedIso {
    slot?: string;
    volid: string;
    storage: string | null;
    filename: string | null;
}

export default function VdsSettingsPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { t } = useTranslation();
    const { instance, loading: instanceLoading, hasPermission, refreshInstance } = useVmInstance();

    // Reinstall state
    const [templates, setTemplates] = React.useState<ReinstallTemplate[]>([]);
    const [templatesLoading, setTemplatesLoading] = React.useState(true);
    const [selectedTemplate, setSelectedTemplate] = React.useState<number | null>(null);
    const [reinstallOpen, setReinstallOpen] = React.useState(false);
    const [reinstalling, setReinstalling] = React.useState(false);

    // Cloud-init credentials for QEMU (if required)
    const [ciUser, setCiUser] = React.useState('');
    const [ciPassword, setCiPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [ciSshKeys, setCiSshKeys] = React.useState('');

    const isQemu = instance?.vm_type === 'qemu';

    // QEMU hardware settings (EFI + TPM)
    const [qemuHardwareLoading, setQemuHardwareLoading] = React.useState(false);
    const [qemuHardwareSaving, setQemuHardwareSaving] = React.useState(false);
    const [biosMode, setBiosMode] = React.useState<'seabios' | 'ovmf'>('seabios');
    const [efiEnabled, setEfiEnabled] = React.useState(false);
    const [tpmEnabled, setTpmEnabled] = React.useState(false);
    const [serial0Enabled, setSerial0Enabled] = React.useState(true);

    // Network + DNS (primary IP + nameserver/searchdomain)
    const [networkOptionsLoading, setNetworkOptionsLoading] = React.useState(false);
    const [networkSaving, setNetworkSaving] = React.useState(false);
    const [dnsNameserver, setDnsNameserver] = React.useState('');
    const [dnsSearchDomain, setDnsSearchDomain] = React.useState('');

    // ISO mount/unmount (QEMU only, mounted as ide2 cdrom)
    const [isoStoragesLoading, setIsoStoragesLoading] = React.useState(false);
    const [isoStorages, setIsoStorages] = React.useState<string[]>([]);
    const [isoStorage, setIsoStorage] = React.useState<string>('');
    // ISO mounting: ONLY support ISO URL mode (Proxmox downloads directly).
    const [isoUrl, setIsoUrl] = React.useState<string>('');

    const [isoCurrentLoading, setIsoCurrentLoading] = React.useState(false);
    const [mountedIso, setMountedIso] = React.useState<MountedIso | null>(null);
    const [isoFetchingFromUrl, setIsoFetchingFromUrl] = React.useState(false);
    const [isoUninstalling, setIsoUninstalling] = React.useState(false);

    const fetchQemuHardware = React.useCallback(async () => {
        if (!id || !isQemu) return;
        setQemuHardwareLoading(true);
        try {
            const { data } = await axios.get(`/api/user/vm-instances/${id}/qemu-hardware`);
            if (data?.success) {
                const hw = data.data ?? {};
                const bios = hw?.bios === 'ovmf' ? 'ovmf' : 'seabios';
                setBiosMode(bios);
                setEfiEnabled(!!hw?.efi_enabled);
                setTpmEnabled(!!hw?.tpm_enabled);
                // serial0_enabled=true means serial console socket is configured.
                setSerial0Enabled(!!hw?.serial0_enabled);
            }
        } catch {
            // Ignore: the UI is permission-gated; backend will 403 if not allowed.
        } finally {
            setQemuHardwareLoading(false);
        }
    }, [id, isQemu]);

    React.useEffect(() => {
        if (!instanceLoading && instance && isQemu) {
            void fetchQemuHardware();
        }
    }, [instanceLoading, instance, isQemu, fetchQemuHardware]);

    const fetchNetworkOptions = React.useCallback(async () => {
        if (!id || !instance) return;
        setNetworkOptionsLoading(true);
        try {
            const { data } = await axios.get(`/api/user/vm-instances/${id}/network-options`);
            if (data?.success) {
                const opts = data.data ?? {};
                setDnsNameserver(typeof opts.nameserver === 'string' ? opts.nameserver : '');
                setDnsSearchDomain(typeof opts.searchdomain === 'string' ? opts.searchdomain : '');
            }
        } catch {
            // Ignore; user may not have permission or Proxmox might be temporarily unreachable.
        } finally {
            setNetworkOptionsLoading(false);
        }
    }, [id, instance]);

    React.useEffect(() => {
        if (!instanceLoading && instance) {
            void fetchNetworkOptions();
        }
    }, [instanceLoading, instance, fetchNetworkOptions]);

    const fetchIsoStorages = React.useCallback(async () => {
        if (!id || !isQemu) return;
        setIsoStoragesLoading(true);
        try {
            const { data } = await axios.get(`/api/user/vm-instances/${id}/iso-storages`);
            if (data?.success) {
                const arr = Array.isArray(data.data?.storages) ? (data.data.storages as string[]) : [];
                setIsoStorages(arr);
                // Normal users should not pick storages; we only show the allowed backup storage.
                setIsoStorage(arr[0] ?? '');
            }
        } catch {
            // Permission-gated; ignore transient fetch errors.
        } finally {
            setIsoStoragesLoading(false);
        }
    }, [id, isQemu]);

    const fetchIsoCurrent = React.useCallback(async () => {
        if (!id || !isQemu) return;
        setIsoCurrentLoading(true);
        try {
            const { data } = await axios.get(`/api/user/vm-instances/${id}/iso-current`);
            if (data?.success) {
                const current = data.data?.mounted_iso ?? null;
                setMountedIso(current);
            }
        } catch {
            // Ignore: transient errors.
        } finally {
            setIsoCurrentLoading(false);
        }
    }, [id, isQemu]);

    React.useEffect(() => {
        if (!instanceLoading && instance && isQemu) {
            void fetchIsoStorages();
            void fetchIsoCurrent();
        }
    }, [instanceLoading, instance, isQemu, fetchIsoStorages, fetchIsoCurrent]);

    const fetchTemplates = React.useCallback(async () => {
        if (!id) return;
        setTemplatesLoading(true);
        try {
            const { data } = await axios.get(`/api/user/vm-instances/${id}/templates`);
            if (data.success) {
                // Backend already enforces guest_type and node; just trust it.
                setTemplates(data.data.templates || []);
            }
        } catch {
        } finally {
            setTemplatesLoading(false);
        }
    }, [id]);

    React.useEffect(() => {
        if (!instanceLoading) fetchTemplates();
    }, [instanceLoading, fetchTemplates]);

    const handleReinstall = async () => {
        if (!selectedTemplate) {
            toast.error('Please select a template first.');
            return;
        }
        setReinstalling(true);
        const toastId = toast.loading('Initiating reinstall…');
        try {
            const payload: Record<string, unknown> = { template_id: selectedTemplate };
            if (isQemu) {
                if (ciUser) payload.ci_user = ciUser;
                if (ciPassword) payload.ci_password = ciPassword;
                if (ciSshKeys) payload.ci_ssh_keys = ciSshKeys;
            }
            const { data } = await axios.post(`/api/user/vm-instances/${id}/reinstall`, payload);
            if (!data.success) {
                toast.error(data.message || 'Failed to start reinstall.', { id: toastId });
                setReinstalling(false);
                return;
            }

            const reinstallId: string | undefined = data.data?.reinstall_id;
            if (!reinstallId) {
                toast.error('Reinstall did not return a reinstall_id', { id: toastId });
                setReinstalling(false);
                return;
            }

            toast.loading(data.message || 'Reinstall initiated. This may take several minutes.', { id: toastId });
            setReinstallOpen(false);

            // Poll reinstall status until active or failed (mirrors admin VM flow).
            const MAX_POLLS = 120; // 6 minutes at 3s interval
            let polls = 0;
            const poll = async (): Promise<void> => {
                if (polls >= MAX_POLLS) {
                    toast.error('Reinstall timed out waiting for completion', { id: toastId });
                    setReinstalling(false);
                    return;
                }
                polls++;
                try {
                    const statusRes = await axios.get(`/api/user/vm-instances/task-status/${reinstallId}`);
                    const s = statusRes.data?.data;

                    if (s?.status === 'completed' || s?.status === 'active') {
                        toast.success('VDS reinstalled successfully.', { id: toastId });
                        await refreshInstance();
                        setReinstalling(false);
                        return;
                    }

                    if (s?.status === 'failed') {
                        toast.error(s?.error ?? 'Reinstall failed', { id: toastId });
                        setReinstalling(false);
                        return;
                    }

                    if (s?.message) {
                        toast.loading(s.message, { id: toastId });
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
            toast.error(msg, { id: toastId });
            setReinstalling(false);
        }
    };

    const handleApplyQemuHardware = async () => {
        if (!isQemu) return;
        setQemuHardwareSaving(true);
        try {
            await axios.patch(`/api/user/vm-instances/${id}/qemu-hardware`, {
                bios: biosMode,
                efi_enabled: efiEnabled,
                tpm_enabled: tpmEnabled,
                serial0_enabled: serial0Enabled,
            });
            toast.success(t('vds.settings.hardware.apply_success') ?? 'Hardware updated.');
            await refreshInstance();
            await fetchQemuHardware();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg || (t('vds.settings.hardware.apply_failed') ?? 'Failed to update hardware.'));
        } finally {
            setQemuHardwareSaving(false);
        }
    };

    const handleApplyNetworkDns = async () => {
        setNetworkSaving(true);
        try {
            await axios.patch(`/api/user/vm-instances/${id}/network-dns`, {
                nameserver: dnsNameserver.trim() || undefined,
                searchdomain: instance?.vm_type === 'lxc' ? dnsSearchDomain.trim() || undefined : undefined,
            });
            toast.success(t('vds.settings.network.apply_success') ?? 'Network/DNS updated.');
            await refreshInstance();
            await fetchNetworkOptions();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg || (t('vds.settings.network.apply_failed') ?? 'Failed to update network/DNS'));
        } finally {
            setNetworkSaving(false);
        }
    };

    const handleUnmountIso = async () => {
        if (!mountedIso) return;

        setIsoUninstalling(true);
        try {
            const { data } = await axios.post(`/api/user/vm-instances/${id}/iso-unmount`);
            if (!data?.success) {
                toast.error(data?.message ?? 'Failed to unmount ISO');
                return;
            }

            toast.success(t('vds.settings.iso.toast_unmounted') ?? 'ISO unmounted successfully');
            await fetchIsoCurrent();
            await refreshInstance();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg || (t('vds.settings.iso.toast_unmount_failed') ?? 'Failed to unmount ISO'));
        } finally {
            setIsoUninstalling(false);
        }
    };

    const handleFetchAndMountIsoFromUrl = async () => {
        const url = isoUrl.trim();
        if (!url) {
            toast.error(t('vds.settings.iso.errors.url_required') ?? 'Enter an ISO URL');
            return;
        }
        if (!isoStorage) {
            toast.error(t('vds.settings.iso.errors.storage_required') ?? 'Select an ISO storage');
            return;
        }

        setIsoFetchingFromUrl(true);
        try {
            const payload = { storage: isoStorage, url };
            const { data } = await axios.post(`/api/user/vm-instances/${id}/iso-fetch-and-mount`, payload);
            if (!data?.success) {
                toast.error(data?.message ?? 'Failed to fetch & mount ISO');
                return;
            }

            const taskId = data?.data?.task_id as string | undefined;
            if (!taskId) {
                toast.error(data?.message ?? 'Failed to queue ISO task');
                return;
            }

            toast.info(data?.message ?? 'ISO fetch queued');

            // Poll until the Rust runner completes the task.
            const MAX_POLLS = 180; // ~9 minutes @ 3s
            let polls = 0;

            const poll = async () => {
                if (polls >= MAX_POLLS) {
                    toast.error('ISO fetch timed out');
                    setIsoFetchingFromUrl(false);
                    return;
                }
                polls++;
                try {
                    const statusRes = await axios.get(`/api/user/vm-instances/task-status/${taskId}`);
                    const s = statusRes.data?.data;

                    if (s?.status === 'completed') {
                        const mountedMsg = t('vds.settings.iso.toast_mounted') ?? 'ISO mounted successfully';
                        const rebootHint = t('vds.settings.iso.toast_reboot_hint') ?? 'Reboot the VM to boot from the ISO.';
                        toast.success(`${mountedMsg} ${rebootHint}`);

                        setIsoUrl('');
                        await fetchIsoCurrent();
                        await refreshInstance();
                        setIsoFetchingFromUrl(false);
                        return;
                    }

                    if (s?.status === 'failed') {
                        toast.error(s?.error ?? (t('vds.settings.iso.toast_fetch_failed') ?? 'Failed to fetch ISO'));
                        setIsoFetchingFromUrl(false);
                        return;
                    }
                } catch {
                    // ignore transient polling issues
                }

                setTimeout(() => {
                    void poll();
                }, 3000);
            };

            void poll();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg || (t('vds.settings.iso.toast_fetch_failed') ?? 'Failed to fetch ISO'));
            setIsoFetchingFromUrl(false);
        }
    };

    if (instanceLoading) {
        return (
            <div className='flex items-center justify-center min-h-[60vh]'>
                <div className='flex flex-col items-center gap-4'>
                    <Loader2 className='h-10 w-10 animate-spin text-primary' />
                    <p className='text-muted-foreground font-medium animate-pulse'>Loading VDS settings…</p>
                </div>
            </div>
        );
    }

    if (!instance) {
        return (
            <div className='flex items-center justify-center min-h-[60vh]'>
                <div className='text-center space-y-4'>
                    <div className='h-20 w-20 mx-auto rounded-3xl bg-destructive/10 flex items-center justify-center'>
                        <AlertTriangle className='h-10 w-10 text-destructive' />
                    </div>
                    <h2 className='text-2xl font-black'>VDS Not Found</h2>
                    <Button variant='outline' onClick={() => router.push('/dashboard')}>
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    const canReinstall = hasPermission('reinstall');
    const canSettings = hasPermission('settings');

    if (!canSettings) {
        return (
            <div className='flex flex-col items-center justify-center py-24 text-center space-y-6'>
                <div className='h-20 w-20 rounded-3xl bg-red-500/10 flex items-center justify-center'>
                    <Lock className='h-10 w-10 text-red-400' />
                </div>
                <div>
                    <h2 className='text-2xl font-black font-header uppercase tracking-tighter italic'>Access Denied</h2>
                    <p className='text-muted-foreground mt-2'>You do not have permission to access VDS settings.</p>
                </div>
                <Button variant='outline' onClick={() => router.push(`/vds/${id}`)}>
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className='space-y-8 pb-12'>
            <PageHeader
                title='VDS Settings'
                description='Manage your VDS instance settings and reinstall options.'
                actions={
                    <Button variant='glass' size='sm' onClick={fetchTemplates} disabled={templatesLoading}>
                        <RefreshCw className={cn('h-4 w-4 mr-1.5', templatesLoading && 'animate-spin')} />
                        Refresh
                    </Button>
                }
            />

            {/* Instance info summary */}
            <Card className='border-border/20 bg-card/30 backdrop-blur-sm'>
                <CardHeader>
                    <CardTitle className='text-sm font-black uppercase tracking-widest flex items-center gap-2'>
                        <Server className='h-4 w-4 text-primary' />
                        Instance Info
                    </CardTitle>
                </CardHeader>
                <CardContent className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                    {[
                        { label: 'Hostname', value: instance.hostname ?? '—' },
                        { label: 'VMID', value: String(instance.vmid) },
                        { label: 'Type', value: instance.vm_type?.toUpperCase() ?? 'QEMU' },
                        { label: 'Node', value: instance.node_name ?? instance.pve_node ?? '—' },
                    ].map(({ label, value }) => (
                        <div key={label} className='flex flex-col gap-1'>
                            <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                                {label}
                            </span>
                            <span className='text-sm font-bold font-mono'>{value}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* QEMU Hardware (EFI + TPM) */}
            {isQemu && (
                <Card className='border-border/20 bg-card/30 backdrop-blur-sm'>
                    <CardHeader>
                        <CardTitle className='text-sm font-black uppercase tracking-widest flex items-center gap-2'>
                            <Server className='h-4 w-4 text-primary' />
                            {t('vds.settings.hardware.title') ?? 'QEMU Hardware (EFI / TPM)'}
                        </CardTitle>
                        <CardDescription className='text-muted-foreground'>
                            {t('vds.settings.hardware.description') ??
                                'Enable UEFI (EFI disk) and TPM 2.0 state disk for this QEMU VM.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-5'>
                        {qemuHardwareLoading ? (
                            <div className='flex items-center gap-2 text-muted-foreground'>
                                <Loader2 className='h-4 w-4 animate-spin' />
                                {t('vds.settings.hardware.loading') ?? 'Loading hardware…'}
                            </div>
                        ) : (
                            <div className='space-y-4'>
                                <div className='space-y-2'>
                                    <div className='text-xs font-semibold text-muted-foreground'>
                                        {t('vds.settings.hardware.bios_label') ?? 'BIOS / Firmware'}
                                    </div>
                                    <select
                                        value={biosMode}
                                        onChange={(e) =>
                                            (() => {
                                                const next = e.target.value === 'ovmf' ? 'ovmf' : 'seabios';
                                                setBiosMode(next);
                                                // UEFI (OVMF) normally needs an EFI disk. If user switches to
                                                // OVMF, automatically enable the EFI checkbox.
                                                if (next === 'ovmf') setEfiEnabled(true);
                                            })()
                                        }
                                        className='w-full h-11 rounded-xl bg-muted/30 border border-border/30 px-3'
                                    >
                                        <option value='seabios'>
                                            {t('vds.settings.hardware.bios_seabios') ?? 'Legacy (SeaBIOS)'}
                                        </option>
                                        <option value='ovmf'>
                                            {t('vds.settings.hardware.bios_ovmf') ?? 'UEFI (OVMF)'}
                                        </option>
                                    </select>
                                </div>

                                <div className='space-y-2'>
                                    <label className='flex items-center gap-2 text-sm'>
                                        <input
                                            type='checkbox'
                                            checked={efiEnabled}
                                            onChange={(e) => {
                                                const next = e.target.checked;
                                                setEfiEnabled(next);
                                                if (next) setBiosMode('ovmf');
                                            }}
                                        />
                                        {t('vds.settings.hardware.efi_label') ?? 'Enable EFI disk'}
                                    </label>
                                    <p className='text-xs text-muted-foreground'>
                                        {t('vds.settings.hardware.efi_help') ??
                                            'Adds efidisk0 (UEFI firmware required for TPM).'}
                                    </p>
                                </div>

                                <div className='space-y-2'>
                                    <label className='flex items-center gap-2 text-sm'>
                                        <input
                                            type='checkbox'
                                            checked={tpmEnabled}
                                            onChange={(e) => {
                                                const next = e.target.checked;
                                                setTpmEnabled(next);
                                                if (next) {
                                                    setEfiEnabled(true);
                                                    setBiosMode('ovmf');
                                                }
                                            }}
                                        />
                                        {t('vds.settings.hardware.tpm_label') ?? 'Enable TPM 2.0'}
                                    </label>
                                    <p className='text-xs text-muted-foreground'>
                                        {t('vds.settings.hardware.tpm_help') ??
                                            'Adds tpmstate0 (v2.0). Usually requires EFI/OVMF.'}
                                    </p>
                                </div>

                                <div className='space-y-2'>
                                    <label className='flex items-center gap-2 text-sm'>
                                        <input
                                            type='checkbox'
                                            checked={!serial0Enabled}
                                            onChange={(e) => {
                                                const disable = e.target.checked;
                                                setSerial0Enabled(!disable);
                                            }}
                                        />
                                        {t('vds.settings.hardware.disable_serial_label') ?? 'Disable serial port (Windows)'}
                                    </label>
                                    <p className='text-xs text-muted-foreground'>
                                        {t('vds.settings.hardware.disable_serial_help') ??
                                            'Removes `serial0` so the console renders graphical output instead of serial.'}
                                    </p>
                                </div>

                                <div className='flex justify-end pt-2'>
                                    <Button
                                        variant='glass'
                                        disabled={qemuHardwareSaving || qemuHardwareLoading}
                                        onClick={handleApplyQemuHardware}
                                    >
                                        {qemuHardwareSaving && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
                                        {t('vds.settings.hardware.apply_button') ?? 'Apply'}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ISO Mount (upload + mount ide2 cdrom) */}
            {isQemu && (
                <Card className='border-border/20 bg-card/30 backdrop-blur-sm'>
                    <CardHeader>
                        <CardTitle className='text-sm font-black uppercase tracking-widest flex items-center gap-2'>
                            <Server className='h-4 w-4 text-primary' />
                            {t('vds.settings.iso.title') ?? 'ISO Mount'}
                        </CardTitle>
                        <CardDescription className='text-muted-foreground'>
                            {t('vds.settings.iso.description') ?? 'Use ISO URL to boot this VM from it.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-5'>
                        <div className='space-y-2'>
                            <div className='text-xs font-semibold text-muted-foreground'>
                                {t('vds.settings.iso.current_label') ?? 'Current ISO'}
                            </div>
                            {isoCurrentLoading ? (
                                <div className='flex items-center gap-2 text-muted-foreground'>
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                    {t('vds.settings.iso.loading') ?? 'Loading…'}
                                </div>
                            ) : mountedIso ? (
                                <div className='flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/20 px-3 py-2'>
                                    <div className='text-sm font-bold font-mono truncate'>
                                        {mountedIso.filename ?? mountedIso.volid}
                                    </div>
                                    <div className='text-xs text-muted-foreground'>
                                        {t('vds.settings.iso.mounted_as') ?? 'Mounted as'}{' '}
                                        <span className='font-mono'>{mountedIso.slot ?? 'ide2'}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className='text-sm text-muted-foreground italic'>
                                    {t('vds.settings.iso.none') ?? 'No ISO mounted.'}
                                </p>
                            )}

                            <div className='flex justify-end pt-3'>
                                <Button
                                    variant='glass'
                                    disabled={!mountedIso || isoUninstalling}
                                    onClick={handleUnmountIso}
                                >
                                    {isoUninstalling && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
                                    {t('vds.settings.iso.unmount_button') ?? 'Unmount ISO'}
                                </Button>
                            </div>
                        </div>

                        <div className='space-y-2'>
                            <div className='text-xs font-semibold text-muted-foreground'>
                                {t('vds.settings.iso.storage_label') ?? 'ISO Storage'}
                            </div>
                            {isoStoragesLoading ? (
                                <div className='flex items-center gap-2 text-muted-foreground'>
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                    {t('vds.settings.iso.loading') ?? 'Loading…'}
                                </div>
                            ) : isoStorages.length === 0 ? (
                                <p className='text-sm text-muted-foreground italic'>
                                    {t('vds.settings.iso.no_storages') ?? 'No ISO storage available'}
                                </p>
                            ) : (
                                <div className='w-full h-11 rounded-xl bg-muted/30 border border-border/30 px-4 flex items-center text-sm font-mono'>
                                    {isoStorage}
                                </div>
                            )}
                        </div>

                        <div className='space-y-3'>
                            <div className='space-y-2'>
                                <div className='text-xs font-semibold text-muted-foreground'>
                                    {t('vds.settings.iso.url_label') ?? 'ISO URL'}
                                </div>
                                <Input
                                    value={isoUrl}
                                    onChange={(e) => setIsoUrl(e.target.value)}
                                    placeholder={t('vds.settings.iso.url_placeholder') ?? 'https://example.com/my.iso'}
                                    disabled={isoUninstalling || isoFetchingFromUrl}
                                    className='bg-muted/30'
                                />
                            </div>

                            <div className='flex justify-end pt-2'>
                                <Button
                                    variant='glass'
                                    disabled={isoUninstalling || isoFetchingFromUrl || !isoStorage || !isoUrl.trim()}
                                    onClick={handleFetchAndMountIsoFromUrl}
                                >
                                    {isoFetchingFromUrl && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
                                    {t('vds.settings.iso.fetch_button') ?? 'Fetch & Mount'}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Network + DNS */}
            <Card className='border-border/20 bg-card/30 backdrop-blur-sm'>
                <CardHeader>
                    <CardTitle className='text-sm font-black uppercase tracking-widest flex items-center gap-2'>
                        <Server className='h-4 w-4 text-primary' />
                        {t('vds.settings.network.title') ?? 'Network & DNS'}
                    </CardTitle>
                    <CardDescription className='text-muted-foreground'>
                        {t('vds.settings.network.description') ?? 'Update DNS settings for this VDS instance.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className='space-y-5'>
                    {networkOptionsLoading ? (
                        <div className='flex items-center gap-2 text-muted-foreground'>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            {t('vds.settings.network.loading') ?? 'Loading…'}
                        </div>
                    ) : (
                        <div className='space-y-4'>
                            <div className='space-y-2'>
                                <div className='text-xs font-semibold text-muted-foreground'>
                                    {t('vds.settings.network.nameserver_label') ?? 'Nameserver'}
                                </div>
                                <Input
                                    value={dnsNameserver}
                                    onChange={(e) => setDnsNameserver(e.target.value)}
                                    placeholder={t('vds.settings.network.nameserver_placeholder') ?? '1.1.1.1 8.8.8.8'}
                                    className='bg-muted/30'
                                />
                            </div>

                            {instance?.vm_type === 'lxc' && (
                                <div className='space-y-2'>
                                    <div className='text-xs font-semibold text-muted-foreground'>
                                        {t('vds.settings.network.searchdomain_label') ?? 'Search domain'}
                                    </div>
                                    <Input
                                        value={dnsSearchDomain}
                                        onChange={(e) => setDnsSearchDomain(e.target.value)}
                                        placeholder={
                                            t('vds.settings.network.searchdomain_placeholder') ?? 'example.com'
                                        }
                                        className='bg-muted/30'
                                    />
                                </div>
                            )}

                            <div className='flex justify-end pt-2'>
                                <Button variant='glass' disabled={networkSaving} onClick={handleApplyNetworkDns}>
                                    {networkSaving && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
                                    {t('vds.settings.network.apply_button') ?? 'Apply'}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Reinstall */}
            {canReinstall && (
                <Card className='border-border/20 bg-card/40 backdrop-blur-sm'>
                    <CardHeader>
                        <CardTitle className='text-sm font-black uppercase tracking-widest flex items-center gap-2'>
                            <RotateCcw className='h-4 w-4 text-primary' />
                            {t('vds.settings.reinstall.title') ?? 'Reinstall Operating System'}
                        </CardTitle>
                        <CardDescription className='text-muted-foreground'>
                            {t('vds.settings.reinstall.description') ?? 'Permanently wipe and reinstall your VDS.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        {templatesLoading ? (
                            <div className='flex items-center gap-2 text-muted-foreground'>
                                <Loader2 className='h-4 w-4 animate-spin' />
                                <span className='text-sm'>{t('vds.settings.reinstall.templates_loading')}</span>
                            </div>
                        ) : templates.length === 0 ? (
                            <p className='text-sm text-muted-foreground italic'>
                                {t('vds.settings.reinstall.templates_none', {
                                    template_type: isQemu ? 'QEMU/KVM' : 'LXC',
                                })}
                            </p>
                        ) : (
                            <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3'>
                                {templates.map((tpl) => (
                                    <button
                                        key={tpl.id}
                                        onClick={() => setSelectedTemplate(tpl.id)}
                                        className={cn(
                                            'flex flex-col items-start gap-1 p-4 rounded-2xl border-2 text-left transition-all',
                                            selectedTemplate === tpl.id
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border/20 bg-card/30 hover:border-border/40',
                                        )}
                                    >
                                        <span className='font-bold text-sm'>{tpl.name}</span>
                                        {tpl.os && <span className='text-xs text-muted-foreground'>{tpl.os}</span>}
                                    </button>
                                ))}
                            </div>
                        )}

                        <Button
                            variant='destructive'
                            size='default'
                            disabled={!selectedTemplate || templatesLoading}
                            onClick={() => setReinstallOpen(true)}
                            className='mt-2 rounded-2xl'
                        >
                            <RotateCcw className='h-4 w-4 mr-2' />
                            {t('vds.settings.reinstall.button')}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Reinstall confirm modal */}
            <HeadlessModal
                isOpen={reinstallOpen}
                onClose={() => setReinstallOpen(false)}
                title={t('vds.settings.reinstall.confirm_title')}
                description={t('vds.settings.reinstall.confirm_desc')}
            >
                <div className='space-y-6 py-4'>
                    <div className='flex items-start gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20'>
                        <AlertTriangle className='h-5 w-5 text-red-400 shrink-0 mt-0.5' />
                        <p className='text-sm text-red-300'>
                            {t('vds.settings.reinstall.confirm_body_prefix')}
                            <strong>{templates.find((t) => t.id === selectedTemplate)?.name}</strong>
                            {t('vds.settings.reinstall.confirm_body_on')}
                            <strong>{instance.hostname ?? `VDS #${instance.id}`}</strong>
                            {t('vds.settings.reinstall.confirm_body_after_hostname')}
                        </p>
                    </div>

                    {isQemu && (
                        <div className='space-y-4'>
                            <p className='text-xs font-black uppercase tracking-widest text-primary/70'>
                                {t('vds.settings.reinstall.cloud_init_credentials_optional')}
                            </p>
                            <div className='space-y-3'>
                                <div>
                                    <label className='text-xs font-semibold text-muted-foreground block mb-1'>
                                        {t('vds.settings.reinstall.cloud_init.username_label')}
                                    </label>
                                    <Input
                                        value={ciUser}
                                        onChange={(e) => setCiUser(e.target.value)}
                                        placeholder={t('vds.settings.reinstall.cloud_init.username_placeholder')}
                                        className='h-11'
                                    />
                                </div>
                                <div>
                                    <label className='text-xs font-semibold text-muted-foreground block mb-1'>
                                        {t('vds.settings.reinstall.cloud_init.password_label')}
                                    </label>
                                    <div className='relative'>
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            value={ciPassword}
                                            onChange={(e) => setCiPassword(e.target.value)}
                                            placeholder={t('vds.settings.reinstall.cloud_init.password_placeholder')}
                                            className='h-11 pr-10'
                                        />
                                        <button
                                            type='button'
                                            onClick={() => setShowPassword((v) => !v)}
                                            className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground'
                                        >
                                            {showPassword ? (
                                                <EyeOff className='h-4 w-4' />
                                            ) : (
                                                <Eye className='h-4 w-4' />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className='text-xs font-semibold text-muted-foreground block mb-1'>
                                        {t('vds.settings.reinstall.cloud_init.ssh_keys_label')}
                                    </label>
                                    <textarea
                                        value={ciSshKeys}
                                        onChange={(e) => setCiSshKeys(e.target.value)}
                                        placeholder={t('vds.settings.reinstall.cloud_init.ssh_keys_placeholder')}
                                        rows={3}
                                        className='w-full rounded-xl border border-border/20 bg-background/50 px-4 py-3 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/50'
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className='flex justify-end gap-3 pt-4 border-t border-border/5'>
                    <Button
                        variant='outline'
                        size='default'
                        onClick={() => setReinstallOpen(false)}
                        disabled={reinstalling}
                        className='rounded-2xl'
                    >
                        {t('vds.settings.reinstall.cancel_button')}
                    </Button>
                    <Button
                        variant='destructive'
                        size='default'
                        onClick={handleReinstall}
                        disabled={reinstalling}
                        className='rounded-2xl'
                    >
                        {reinstalling ? (
                            <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                        ) : (
                            <RotateCcw className='mr-2 h-5 w-5' />
                        )}
                        {t('vds.settings.reinstall.confirm_button')}
                    </Button>
                </div>
            </HeadlessModal>
        </div>
    );
}
