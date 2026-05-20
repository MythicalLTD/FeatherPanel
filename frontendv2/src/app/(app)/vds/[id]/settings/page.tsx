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
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

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
    const { fetchWidgets, getWidgets } = usePluginWidgets('vds-settings');

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

    React.useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const handleReinstall = async () => {
        if (!selectedTemplate) {
            toast.error(t('vds.settings.reinstall.select_template_first'));
            return;
        }
        setReinstalling(true);
        const toastId = toast.loading(t('vds.settings.reinstall.initiating'));
        try {
            const payload: Record<string, unknown> = { template_id: selectedTemplate };
            if (isQemu) {
                if (ciUser) payload.ci_user = ciUser;
                if (ciPassword) payload.ci_password = ciPassword;
                if (ciSshKeys) payload.ci_ssh_keys = ciSshKeys;
            }
            const { data } = await axios.post(`/api/user/vm-instances/${id}/reinstall`, payload);
            if (!data.success) {
                toast.error(data.message || t('vds.settings.reinstall.start_failed'), { id: toastId });
                setReinstalling(false);
                return;
            }

            const reinstallId: string | undefined = data.data?.reinstall_id;
            if (!reinstallId) {
                toast.error(t('vds.settings.reinstall.missing_id'), { id: toastId });
                setReinstalling(false);
                return;
            }

            toast.loading(data.message || t('vds.settings.reinstall.started'), { id: toastId });
            setReinstallOpen(false);

            // Poll reinstall status until active or failed (mirrors admin VM flow).
            const MAX_POLLS = 120; // 6 minutes at 3s interval
            let polls = 0;
            const poll = async (): Promise<void> => {
                if (polls >= MAX_POLLS) {
                    toast.error(t('vds.settings.reinstall.timeout'), { id: toastId });
                    setReinstalling(false);
                    return;
                }
                polls++;
                try {
                    const statusRes = await axios.get(`/api/user/vm-instances/task-status/${reinstallId}`);
                    const s = statusRes.data?.data;

                    if (s?.status === 'completed' || s?.status === 'active') {
                        toast.success(t('vds.settings.reinstall.success'), { id: toastId });
                        await refreshInstance();
                        setReinstalling(false);
                        return;
                    }

                    if (s?.status === 'failed') {
                        toast.error(s?.error ?? t('vds.settings.reinstall.failed'), { id: toastId });
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
            toast.success(t('vds.settings.hardware.apply_success'));
            await refreshInstance();
            await fetchQemuHardware();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg || t('vds.settings.hardware.apply_failed'));
        } finally {
            setQemuHardwareSaving(false);
        }
    };

    const handleUnmountIso = async () => {
        if (!mountedIso) return;

        setIsoUninstalling(true);
        try {
            const { data } = await axios.post(`/api/user/vm-instances/${id}/iso-unmount`);
            if (!data?.success) {
                toast.error(data?.message ?? t('vds.settings.iso.toast_unmount_failed'));
                return;
            }

            toast.success(t('vds.settings.iso.toast_unmounted'));
            await fetchIsoCurrent();
            await refreshInstance();
        } catch (err) {
            const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? err.message) : String(err);
            toast.error(msg || t('vds.settings.iso.toast_unmount_failed'));
        } finally {
            setIsoUninstalling(false);
        }
    };

    const handleFetchAndMountIsoFromUrl = async () => {
        const url = isoUrl.trim();
        if (!url) {
            toast.error(t('vds.settings.iso.errors.url_required'));
            return;
        }
        if (!isoStorage) {
            toast.error(t('vds.settings.iso.errors.storage_required'));
            return;
        }

        setIsoFetchingFromUrl(true);
        try {
            const payload = { storage: isoStorage, url };
            const { data } = await axios.post(`/api/user/vm-instances/${id}/iso-fetch-and-mount`, payload);
            if (!data?.success) {
                toast.error(data?.message ?? t('vds.settings.iso.toast_fetch_failed'));
                return;
            }

            const taskId = data?.data?.task_id as string | undefined;
            if (!taskId) {
                toast.error(data?.message ?? t('vds.settings.iso.toast_queue_failed'));
                return;
            }

            toast.info(data?.message ?? t('vds.settings.iso.toast_fetch_queued'));

            // Poll until the Rust runner completes the task.
            const MAX_POLLS = 180; // ~9 minutes @ 3s
            let polls = 0;

            const poll = async () => {
                if (polls >= MAX_POLLS) {
                    toast.error(t('vds.settings.iso.fetch_timeout'));
                    setIsoFetchingFromUrl(false);
                    return;
                }
                polls++;
                try {
                    const statusRes = await axios.get(`/api/user/vm-instances/task-status/${taskId}`);
                    const s = statusRes.data?.data;

                    if (s?.status === 'completed') {
                        const mountedMsg = t('vds.settings.iso.toast_mounted');
                        const rebootHint = t('vds.settings.iso.toast_reboot_hint');
                        toast.success(`${mountedMsg} ${rebootHint}`);

                        setIsoUrl('');
                        await fetchIsoCurrent();
                        await refreshInstance();
                        setIsoFetchingFromUrl(false);
                        return;
                    }

                    if (s?.status === 'failed') {
                        toast.error(s?.error ?? t('vds.settings.iso.toast_fetch_failed'));
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
            toast.error(msg || t('vds.settings.iso.toast_fetch_failed'));
            setIsoFetchingFromUrl(false);
        }
    };

    if (instanceLoading) {
        return (
            <div className='flex min-h-[60vh] items-center justify-center'>
                <div className='flex flex-col items-center gap-4'>
                    <Loader2 className='text-primary h-10 w-10 animate-spin' />
                    <p className='text-muted-foreground animate-pulse font-medium'>{t('vds.settings.loading')}</p>
                </div>
            </div>
        );
    }

    if (!instance) {
        return (
            <div className='flex min-h-[60vh] items-center justify-center'>
                <div className='space-y-4 text-center'>
                    <div className='bg-destructive/10 mx-auto flex h-20 w-20 items-center justify-center rounded-3xl'>
                        <AlertTriangle className='text-destructive h-10 w-10' />
                    </div>
                    <h2 className='text-2xl font-black'>{t('vds.console.not_found_title')}</h2>
                    <Button variant='outline' onClick={() => router.push('/dashboard')}>
                        {t('common.goBack')}
                    </Button>
                </div>
            </div>
        );
    }

    const canReinstall = hasPermission('reinstall');
    const canSettings = hasPermission('settings');

    if (!canSettings) {
        return (
            <div className='flex flex-col items-center justify-center space-y-6 py-24 text-center'>
                <div className='flex h-20 w-20 items-center justify-center rounded-3xl bg-red-500/10'>
                    <Lock className='h-10 w-10 text-red-400' />
                </div>
                <div>
                    <h2 className='font-header text-2xl font-black tracking-tighter uppercase italic'>
                        {t('common.accessDenied')}
                    </h2>
                    <p className='text-muted-foreground mt-2'>{t('vds.settings.access_denied')}</p>
                </div>
                <Button variant='outline' onClick={() => router.push(`/vds/${id}`)}>
                    {t('common.goBack')}
                </Button>
            </div>
        );
    }

    return (
        <div className='space-y-8 pb-12'>
            <WidgetRenderer widgets={getWidgets('vds-settings', 'top-of-page')} />

            <PageHeader
                title={t('vds.settings.title')}
                description={t('vds.settings.description')}
                actions={
                    <div className='flex w-full sm:w-auto sm:justify-end'>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={fetchTemplates}
                            disabled={templatesLoading}
                            aria-label={t('common.refresh')}
                        >
                            <RefreshCw className={cn('h-4 w-4 sm:mr-1.5', templatesLoading && 'animate-spin')} />
                            <span className='hidden sm:inline'>{t('common.refresh')}</span>
                        </Button>
                    </div>
                }
            />

            {/* Instance info summary */}
            <Card className='border-border/20 bg-card/30 backdrop-blur-sm'>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-sm font-black tracking-widest uppercase'>
                        <Server className='text-primary h-4 w-4' />
                        {t('vds.settings.instance_info.title')}
                    </CardTitle>
                </CardHeader>
                <CardContent className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                    {[
                        { label: t('vds.settings.instance_info.hostname'), value: instance.hostname ?? '—' },
                        { label: t('vds.settings.instance_info.vmid'), value: String(instance.vmid) },
                        {
                            label: t('vds.settings.instance_info.type'),
                            value: instance.vm_type?.toUpperCase() ?? 'QEMU',
                        },
                        {
                            label: t('vds.settings.instance_info.node'),
                            value: instance.node_name ?? instance.pve_node ?? '—',
                        },
                    ].map(({ label, value }) => (
                        <div key={label} className='flex flex-col gap-1'>
                            <span className='text-muted-foreground/50 text-[10px] font-black tracking-widest uppercase'>
                                {label}
                            </span>
                            <span className='font-mono text-sm font-bold'>{value}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* QEMU Hardware (EFI + TPM) */}
            {isQemu && (
                <Card className='border-border/20 bg-card/30 backdrop-blur-sm'>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2 text-sm font-black tracking-widest uppercase'>
                            <Server className='text-primary h-4 w-4' />
                            {t('vds.settings.hardware.title')}
                        </CardTitle>
                        <CardDescription className='text-muted-foreground'>
                            {t('vds.settings.hardware.description')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-5'>
                        {qemuHardwareLoading ? (
                            <div className='text-muted-foreground flex items-center gap-2'>
                                <Loader2 className='h-4 w-4 animate-spin' />
                                {t('vds.settings.hardware.loading')}
                            </div>
                        ) : (
                            <div className='space-y-4'>
                                <div className='space-y-2'>
                                    <div className='text-muted-foreground text-xs font-semibold'>
                                        {t('vds.settings.hardware.bios_label')}
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
                                        className='bg-muted/30 border-border/30 h-11 w-full rounded-xl border px-3'
                                    >
                                        <option value='seabios'>{t('vds.settings.hardware.bios_seabios')}</option>
                                        <option value='ovmf'>{t('vds.settings.hardware.bios_ovmf')}</option>
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
                                        {t('vds.settings.hardware.efi_label')}
                                    </label>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('vds.settings.hardware.efi_help')}
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
                                        {t('vds.settings.hardware.tpm_label')}
                                    </label>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('vds.settings.hardware.tpm_help')}
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
                                        {t('vds.settings.hardware.disable_serial_label')}
                                    </label>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('vds.settings.hardware.disable_serial_help')}
                                    </p>
                                </div>

                                <div className='flex justify-end pt-2'>
                                    <Button
                                        variant='default'
                                        disabled={qemuHardwareSaving || qemuHardwareLoading}
                                        onClick={handleApplyQemuHardware}
                                    >
                                        {qemuHardwareSaving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                                        {t('vds.settings.hardware.apply_button')}
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
                        <CardTitle className='flex items-center gap-2 text-sm font-black tracking-widest uppercase'>
                            <Server className='text-primary h-4 w-4' />
                            {t('vds.settings.iso.title')}
                        </CardTitle>
                        <CardDescription className='text-muted-foreground'>
                            {t('vds.settings.iso.description')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-5'>
                        <div className='space-y-2'>
                            <div className='text-muted-foreground text-xs font-semibold'>
                                {t('vds.settings.iso.current_label')}
                            </div>
                            {isoCurrentLoading ? (
                                <div className='text-muted-foreground flex items-center gap-2'>
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                    {t('vds.settings.iso.loading')}
                                </div>
                            ) : mountedIso ? (
                                <div className='border-border/50 bg-muted/20 flex flex-col gap-1 rounded-xl border px-3 py-2'>
                                    <div className='truncate font-mono text-sm font-bold'>
                                        {mountedIso.filename ?? mountedIso.volid}
                                    </div>
                                    <div className='text-muted-foreground text-xs'>
                                        {t('vds.settings.iso.mounted_as')}{' '}
                                        <span className='font-mono'>{mountedIso.slot ?? 'ide2'}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className='text-muted-foreground text-sm italic'>{t('vds.settings.iso.none')}</p>
                            )}

                            <div className='flex justify-end pt-3'>
                                <Button
                                    variant='default'
                                    disabled={!mountedIso || isoUninstalling}
                                    onClick={handleUnmountIso}
                                >
                                    {isoUninstalling && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                                    {t('vds.settings.iso.unmount_button')}
                                </Button>
                            </div>
                        </div>

                        <div className='space-y-2'>
                            <div className='text-muted-foreground text-xs font-semibold'>
                                {t('vds.settings.iso.storage_label')}
                            </div>
                            {isoStoragesLoading ? (
                                <div className='text-muted-foreground flex items-center gap-2'>
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                    {t('vds.settings.iso.loading')}
                                </div>
                            ) : isoStorages.length === 0 ? (
                                <p className='text-muted-foreground text-sm italic'>
                                    {t('vds.settings.iso.no_storages')}
                                </p>
                            ) : (
                                <div className='bg-muted/30 border-border/30 flex h-11 w-full items-center rounded-xl border px-4 font-mono text-sm'>
                                    {isoStorage}
                                </div>
                            )}
                        </div>

                        <div className='space-y-3'>
                            <div className='space-y-2'>
                                <div className='text-muted-foreground text-xs font-semibold'>
                                    {t('vds.settings.iso.url_label')}
                                </div>
                                <Input
                                    value={isoUrl}
                                    onChange={(e) => setIsoUrl(e.target.value)}
                                    placeholder={t('vds.settings.iso.url_placeholder')}
                                    disabled={isoUninstalling || isoFetchingFromUrl}
                                    className='bg-muted/30'
                                />
                            </div>

                            <div className='flex justify-end pt-2'>
                                <Button
                                    variant='default'
                                    disabled={isoUninstalling || isoFetchingFromUrl || !isoStorage || !isoUrl.trim()}
                                    onClick={handleFetchAndMountIsoFromUrl}
                                >
                                    {isoFetchingFromUrl && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                                    {t('vds.settings.iso.fetch_button')}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Reinstall */}
            {canReinstall && (
                <Card className='border-border/20 bg-card/40 backdrop-blur-sm'>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2 text-sm font-black tracking-widest uppercase'>
                            <RotateCcw className='text-primary h-4 w-4' />
                            {t('vds.settings.reinstall.title')}
                        </CardTitle>
                        <CardDescription className='text-muted-foreground'>
                            {t('vds.settings.reinstall.description')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        {templatesLoading ? (
                            <div className='text-muted-foreground flex items-center gap-2'>
                                <Loader2 className='h-4 w-4 animate-spin' />
                                <span className='text-sm'>{t('vds.settings.reinstall.templates_loading')}</span>
                            </div>
                        ) : templates.length === 0 ? (
                            <p className='text-muted-foreground text-sm italic'>
                                {t('vds.settings.reinstall.templates_none', {
                                    template_type: isQemu ? 'QEMU/KVM' : 'LXC',
                                })}
                            </p>
                        ) : (
                            <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3'>
                                {templates.map((tpl) => (
                                    <button
                                        key={tpl.id}
                                        onClick={() => setSelectedTemplate(tpl.id)}
                                        className={cn(
                                            'flex flex-col items-start gap-1 rounded-2xl border-2 p-4 text-left transition-all',
                                            selectedTemplate === tpl.id
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border/20 bg-card/30 hover:border-border/40',
                                        )}
                                    >
                                        <span className='text-sm font-bold'>{tpl.name}</span>
                                        {tpl.os && <span className='text-muted-foreground text-xs'>{tpl.os}</span>}
                                    </button>
                                ))}
                            </div>
                        )}

                        <Button
                            variant='default'
                            size='default'
                            disabled={!selectedTemplate || templatesLoading}
                            onClick={() => setReinstallOpen(true)}
                            className='mt-2 rounded-2xl'
                        >
                            <RotateCcw className='mr-2 h-4 w-4' />
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
                    <div className='flex items-start gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4'>
                        <AlertTriangle className='mt-0.5 h-5 w-5 shrink-0 text-red-400' />
                        <p className='text-sm text-red-300'>
                            {t('vds.settings.reinstall.confirm_body_prefix')}
                            <strong>{templates.find((t) => t.id === selectedTemplate)?.name}</strong>
                            {t('vds.settings.reinstall.confirm_body_on')}
                            <strong>{instance.hostname ?? `VDS #${instance.id}`}</strong>
                            {t('vds.settings.reinstall.confirm_body_after_hostname')}
                        </p>
                    </div>

                    <div className='bg-primary/10 border-primary/20 flex items-start gap-4 rounded-2xl border p-4'>
                        <Lock className='text-primary mt-0.5 h-5 w-5 shrink-0' />
                        <p className='text-foreground/90 text-sm'>{t('vds.settings.reinstall.password_notice')}</p>
                    </div>

                    {isQemu && (
                        <div className='space-y-4'>
                            <p className='text-primary/70 text-xs font-black tracking-widest uppercase'>
                                {t('vds.settings.reinstall.cloud_init_credentials_optional')}
                            </p>
                            <div className='space-y-3'>
                                <div>
                                    <label className='text-muted-foreground mb-1 block text-xs font-semibold'>
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
                                    <label className='text-muted-foreground mb-1 block text-xs font-semibold'>
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
                                            className='text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2'
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
                                    <label className='text-muted-foreground mb-1 block text-xs font-semibold'>
                                        {t('vds.settings.reinstall.cloud_init.ssh_keys_label')}
                                    </label>
                                    <textarea
                                        value={ciSshKeys}
                                        onChange={(e) => setCiSshKeys(e.target.value)}
                                        placeholder={t('vds.settings.reinstall.cloud_init.ssh_keys_placeholder')}
                                        rows={3}
                                        className='border-border/20 bg-background/50 focus:ring-primary/50 w-full resize-none rounded-xl border px-4 py-3 font-mono text-sm focus:ring-2 focus:outline-none'
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className='border-border/5 flex justify-end gap-3 border-t pt-4'>
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
                        variant='default'
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

            <WidgetRenderer widgets={getWidgets('vds-settings', 'bottom-of-page')} />
        </div>
    );
}
