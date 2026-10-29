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
import Link from 'next/link';
import { useVmInstance } from '@/contexts/VmInstanceContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { VdsPageHeader } from '@/components/vds/VdsPageHeader';
import { VdsPageLoading } from '@/components/vds/VdsPageLoading';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Select } from '@/components/ui/select-native';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
    RefreshCw,
    AlertTriangle,
    Loader2,
    RotateCcw,
    Lock,
    HardDrive,
    Server,
    Eye,
    EyeOff,
    Cpu,
    ChevronRight,
    Check,
} from 'lucide-react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { getApiErrorMessage, getApiErrorMessageFromPayload } from '@/lib/api-errors';
import { isReauthCancelled, useVdsReauth } from '@/components/vds/VdsReauth';
import { UnsavedChangesBar } from '@/components/featherui/UnsavedChangesBar';
import { useFormBaseline } from '@/hooks/useFormBaseline';

interface ReinstallTemplate {
    id: number;
    name: string;
    os?: string;
}

/** Title + hint on the left, control on the right (same pattern as VDS firewall). */
function OptionRow({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
    return (
        <div className='fp-surface-inset flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6'>
            <div className='min-w-0 space-y-0.5'>
                <p className='text-sm font-medium'>{title}</p>
                <p className='text-muted-foreground text-sm'>{hint}</p>
            </div>
            <div className='shrink-0 self-start sm:self-center'>{children}</div>
        </div>
    );
}

export default function VdsSettingsPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { t } = useTranslation();
    const withReauth = useVdsReauth();
    const { instance, loading: instanceLoading, hasPermission, refreshInstance } = useVmInstance();
    const { fetchWidgets, getWidgets } = usePluginWidgets('vds-settings');

    const [templates, setTemplates] = React.useState<ReinstallTemplate[]>([]);
    const [templatesLoading, setTemplatesLoading] = React.useState(true);
    const [selectedTemplate, setSelectedTemplate] = React.useState<number | null>(null);
    const [reinstallOpen, setReinstallOpen] = React.useState(false);
    const [reinstalling, setReinstalling] = React.useState(false);

    const [ciUser, setCiUser] = React.useState('');
    const [ciPassword, setCiPassword] = React.useState('');
    const [showPassword, setShowPassword] = React.useState(false);
    const [ciSshKeys, setCiSshKeys] = React.useState('');

    const isQemu = instance?.vm_type === 'qemu';

    const [qemuHardwareLoading, setQemuHardwareLoading] = React.useState(false);
    const [qemuHardwareSaving, setQemuHardwareSaving] = React.useState(false);
    const [biosMode, setBiosMode] = React.useState<'seabios' | 'ovmf'>('seabios');
    const [efiEnabled, setEfiEnabled] = React.useState(false);
    const [tpmEnabled, setTpmEnabled] = React.useState(false);
    const [serial0Enabled, setSerial0Enabled] = React.useState(true);
    const {
        dirty: hardwareUnsaved,
        markClean: markHardwareClean,
        restore: restoreHardware,
    } = useFormBaseline({ biosMode, efiEnabled, tpmEnabled, serial0Enabled });

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
                setSerial0Enabled(!!hw?.serial0_enabled);
                markHardwareClean();
            }
        } catch {
            // Permission-gated; backend returns 403 when not allowed.
        } finally {
            setQemuHardwareLoading(false);
        }
    }, [id, isQemu, markHardwareClean]);

    React.useEffect(() => {
        if (!instanceLoading && instance && isQemu) {
            void fetchQemuHardware();
        }
    }, [instanceLoading, instance, isQemu, fetchQemuHardware]);

    const fetchTemplates = React.useCallback(async () => {
        if (!id) return;
        setTemplatesLoading(true);
        try {
            const { data } = await axios.get(`/api/user/vm-instances/${id}/templates`);
            if (data.success) {
                setTemplates(data.data.templates || []);
            }
        } catch {
            // Keep the last known list; refresh toast is not needed for a silent poll.
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
            const { data } = await withReauth((headers) =>
                axios.post(`/api/user/vm-instances/${id}/reinstall`, payload, { headers }),
            );
            if (!data.success) {
                toast.error(getApiErrorMessageFromPayload(data, t, 'vds.settings.reinstall.start_failed'), {
                    id: toastId,
                });
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

            const MAX_POLLS = 120;
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
                        toast.error(
                            getApiErrorMessageFromPayload(
                                { message: s?.error, error_code: s?.error_code },
                                t,
                                'vds.settings.reinstall.failed',
                            ),
                            { id: toastId },
                        );
                        setReinstalling(false);
                        return;
                    }

                    if (s?.message) {
                        toast.loading(s.message, { id: toastId });
                    }
                } catch {
                    // Transient poll errors; keep going.
                }
                setTimeout(() => {
                    void poll();
                }, 3000);
            };
            void poll();
        } catch (err) {
            if (isReauthCancelled(err)) {
                toast.dismiss(toastId);
                setReinstalling(false);
                return;
            }
            toast.error(getApiErrorMessage(err, t, 'vds.settings.reinstall.start_failed'), { id: toastId });
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
            toast.error(getApiErrorMessage(err, t, 'vds.settings.hardware.apply_failed'));
        } finally {
            setQemuHardwareSaving(false);
        }
    };

    if (instanceLoading) {
        return <VdsPageLoading label={t('vds.settings.loading')} />;
    }

    if (!instance) {
        return (
            <div className='flex min-h-[60vh] items-center justify-center p-4'>
                <EmptyState
                    icon={AlertTriangle}
                    title={t('vds.console.not_found_title')}
                    action={
                        <Button variant='outline' onClick={() => router.push('/dashboard')}>
                            {t('common.goBack')}
                        </Button>
                    }
                />
            </div>
        );
    }

    const canReinstall = hasPermission('reinstall');
    const canSettings = hasPermission('settings');

    if (!canSettings) {
        return (
            <div className='flex min-h-[60vh] items-center justify-center p-4'>
                <EmptyState
                    icon={Lock}
                    title={t('common.accessDenied')}
                    description={t('vds.settings.access_denied')}
                    action={
                        <Button variant='outline' onClick={() => router.push(`/vds/${id}`)}>
                            {t('common.goBack')}
                        </Button>
                    }
                />
            </div>
        );
    }

    const diskAllocatedGb = instance.plan_disk ?? instance.disk_gb;
    const infoRows: { label: string; value: string; mono?: boolean }[] = [
        { label: t('vds.settings.instance_info.hostname'), value: instance.hostname ?? '—' },
        { label: t('vds.settings.instance_info.vmid'), value: String(instance.vmid), mono: true },
        { label: t('vds.settings.instance_info.type'), value: instance.vm_type?.toUpperCase() ?? 'QEMU' },
        {
            label: t('vds.settings.instance_info.node'),
            value: instance.node_name ?? instance.pve_node ?? '—',
        },
        {
            label: t('vds.settings.instance_info.disk'),
            value: diskAllocatedGb ? `${diskAllocatedGb} GB` : '—',
            mono: true,
        },
    ];

    return (
        <div className='space-y-6 pb-12'>
            <WidgetRenderer widgets={getWidgets('vds-settings', 'top-of-page')} />

            <VdsPageHeader
                title={t('vds.settings.title')}
                description={t('vds.settings.description')}
                actions={
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
                }
            />

            <PageCard title={t('vds.settings.instance_info.title')} icon={Server}>
                <dl className='grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'>
                    {infoRows.map(({ label, value, mono }) => (
                        <div
                            key={label}
                            className='border-border/40 flex items-center justify-between gap-3 border-b py-2.5 last:border-b-0 sm:flex-col sm:items-start sm:justify-start sm:gap-1 sm:border-b-0 sm:py-0'
                        >
                            <dt className='text-muted-foreground shrink-0 text-xs font-medium'>{label}</dt>
                            <dd
                                className={cn(
                                    'min-w-0 truncate text-sm font-medium',
                                    mono && 'font-mono tabular-nums',
                                )}
                            >
                                {value}
                            </dd>
                        </div>
                    ))}
                </dl>
            </PageCard>

            {isQemu && (
                <PageCard
                    title={t('vds.settings.hardware.title')}
                    description={t('vds.settings.hardware.description')}
                    icon={Cpu}
                    action={
                        <Button
                            variant='default'
                            size='sm'
                            disabled={qemuHardwareSaving || qemuHardwareLoading || !hardwareUnsaved}
                            onClick={() => void handleApplyQemuHardware()}
                        >
                            {qemuHardwareSaving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                            {t('vds.settings.hardware.apply_button')}
                        </Button>
                    }
                >
                    {qemuHardwareLoading ? (
                        <div className='text-muted-foreground flex items-center gap-2 py-6 text-sm'>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            {t('vds.settings.hardware.loading')}
                        </div>
                    ) : (
                        <div className='space-y-3'>
                            <div className='fp-surface-inset space-y-2 rounded-xl border p-4'>
                                <Select
                                    label={t('vds.settings.hardware.bios_label')}
                                    value={biosMode}
                                    onChange={(e) => {
                                        const next = e.target.value === 'ovmf' ? 'ovmf' : 'seabios';
                                        setBiosMode(next);
                                        // UEFI needs an EFI disk; flip the switch when OVMF is chosen.
                                        if (next === 'ovmf') setEfiEnabled(true);
                                    }}
                                >
                                    <option value='seabios'>{t('vds.settings.hardware.bios_seabios')}</option>
                                    <option value='ovmf'>{t('vds.settings.hardware.bios_ovmf')}</option>
                                </Select>
                            </div>

                            <OptionRow
                                title={t('vds.settings.hardware.efi_label')}
                                hint={t('vds.settings.hardware.efi_help')}
                            >
                                <Switch
                                    checked={efiEnabled}
                                    onCheckedChange={(next) => {
                                        setEfiEnabled(next);
                                        if (next) setBiosMode('ovmf');
                                    }}
                                    aria-label={t('vds.settings.hardware.efi_label')}
                                />
                            </OptionRow>

                            <OptionRow
                                title={t('vds.settings.hardware.tpm_label')}
                                hint={t('vds.settings.hardware.tpm_help')}
                            >
                                <Switch
                                    checked={tpmEnabled}
                                    onCheckedChange={(next) => {
                                        setTpmEnabled(next);
                                        if (next) {
                                            setEfiEnabled(true);
                                            setBiosMode('ovmf');
                                        }
                                    }}
                                    aria-label={t('vds.settings.hardware.tpm_label')}
                                />
                            </OptionRow>

                            <OptionRow
                                title={t('vds.settings.hardware.disable_serial_label')}
                                hint={t('vds.settings.hardware.disable_serial_help')}
                            >
                                <Switch
                                    checked={!serial0Enabled}
                                    onCheckedChange={(disable) => setSerial0Enabled(!disable)}
                                    aria-label={t('vds.settings.hardware.disable_serial_label')}
                                />
                            </OptionRow>
                        </div>
                    )}
                </PageCard>
            )}

            {isQemu && (
                <Link
                    href={`/vds/${id}/boot`}
                    className='fp-surface group flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/20 focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none sm:p-5'
                >
                    <span className='fp-icon-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-lg'>
                        <HardDrive className='text-primary h-5 w-5' />
                    </span>
                    <span className='min-w-0 flex-1'>
                        <span className='block text-base font-semibold tracking-tight'>{t('vds.boot.title')}</span>
                        <span className='text-muted-foreground mt-0.5 block text-sm'>
                            {t('vds.settings.boot_link_description')}
                        </span>
                    </span>
                    <span className='text-muted-foreground group-hover:text-foreground flex shrink-0 items-center gap-1 text-sm font-medium'>
                        <span className='hidden sm:inline'>{t('vds.settings.boot_link')}</span>
                        <ChevronRight className='h-4 w-4' />
                    </span>
                </Link>
            )}

            {canReinstall && (
                <PageCard
                    title={t('vds.settings.reinstall.title')}
                    description={t('vds.settings.reinstall.description')}
                    icon={RotateCcw}
                    variant='danger'
                    action={
                        <Button
                            variant='destructive'
                            size='sm'
                            disabled={!selectedTemplate || templatesLoading || reinstalling}
                            onClick={() => setReinstallOpen(true)}
                        >
                            <RotateCcw className='mr-1.5 h-4 w-4' />
                            {t('vds.settings.reinstall.button')}
                        </Button>
                    }
                >
                    {templatesLoading ? (
                        <div className='text-muted-foreground flex items-center gap-2 py-6 text-sm'>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            {t('vds.settings.reinstall.templates_loading')}
                        </div>
                    ) : templates.length === 0 ? (
                        <EmptyState
                            icon={HardDrive}
                            title={t('vds.settings.reinstall.templates_none', {
                                template_type: isQemu ? 'QEMU/KVM' : 'LXC',
                            })}
                            className='border-0 bg-transparent py-8 sm:py-10'
                        />
                    ) : (
                        <div
                            role='radiogroup'
                            aria-label={t('vds.settings.reinstall.title')}
                            className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'
                        >
                            {templates.map((tpl) => {
                                const selected = selectedTemplate === tpl.id;
                                return (
                                    <button
                                        key={tpl.id}
                                        type='button'
                                        role='radio'
                                        aria-checked={selected}
                                        onClick={() => setSelectedTemplate(tpl.id)}
                                        className={cn(
                                            'flex min-h-11 items-start gap-3 rounded-xl border p-3.5 text-left transition-colors',
                                            'focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none',
                                            selected
                                                ? 'border-primary/50 bg-primary/10'
                                                : 'border-border/50 bg-muted/10 hover:border-border hover:bg-muted/20',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                                                selected
                                                    ? 'border-primary bg-primary text-primary-foreground'
                                                    : 'border-border/60',
                                            )}
                                            aria-hidden
                                        >
                                            {selected ? <Check className='h-3 w-3' /> : null}
                                        </span>
                                        <span className='min-w-0 flex-1'>
                                            <span className='block text-sm font-medium'>{tpl.name}</span>
                                            {tpl.os ? (
                                                <span className='text-muted-foreground mt-0.5 block text-xs'>
                                                    {tpl.os}
                                                </span>
                                            ) : null}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </PageCard>
            )}

            <Dialog
                open={reinstallOpen}
                onClose={() => setReinstallOpen(false)}
                onOpenChange={(open) => {
                    if (!open) setReinstallOpen(false);
                }}
            >
                <DialogHeader>
                    <DialogTitle>{t('vds.settings.reinstall.confirm_title')}</DialogTitle>
                    <DialogDescription>{t('vds.settings.reinstall.confirm_desc')}</DialogDescription>
                </DialogHeader>
                <div className='space-y-5 py-4'>
                    <div className='flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4'>
                        <AlertTriangle className='mt-0.5 h-5 w-5 shrink-0 text-red-500' />
                        <p className='text-sm text-red-700 dark:text-red-300'>
                            {t('vds.settings.reinstall.confirm_body_prefix')}
                            <strong>{templates.find((tpl) => tpl.id === selectedTemplate)?.name}</strong>
                            {t('vds.settings.reinstall.confirm_body_on')}
                            <strong>{instance.hostname ?? `VDS #${instance.id}`}</strong>
                            {t('vds.settings.reinstall.confirm_body_after_hostname')}
                        </p>
                    </div>

                    <div className='border-primary/20 bg-primary/10 flex items-start gap-3 rounded-xl border p-4'>
                        <Lock className='text-primary mt-0.5 h-5 w-5 shrink-0' />
                        <p className='text-foreground/90 text-sm'>{t('vds.settings.reinstall.password_notice')}</p>
                    </div>

                    {isQemu && (
                        <div className='space-y-4'>
                            <p className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
                                {t('vds.settings.reinstall.cloud_init_credentials_optional')}
                            </p>
                            <div className='space-y-3'>
                                <div>
                                    <label className='text-muted-foreground mb-1.5 block text-xs font-semibold'>
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
                                    <label className='text-muted-foreground mb-1.5 block text-xs font-semibold'>
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
                                            className='text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-0.5 focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none'
                                            aria-label={
                                                showPassword
                                                    ? t('common.hide', { defaultValue: 'Hide password' })
                                                    : t('common.show', { defaultValue: 'Show password' })
                                            }
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
                                    <label className='text-muted-foreground mb-1.5 block text-xs font-semibold'>
                                        {t('vds.settings.reinstall.cloud_init.ssh_keys_label')}
                                    </label>
                                    <textarea
                                        value={ciSshKeys}
                                        onChange={(e) => setCiSshKeys(e.target.value)}
                                        placeholder={t('vds.settings.reinstall.cloud_init.ssh_keys_placeholder')}
                                        rows={3}
                                        className='border-border/50 bg-muted/30 focus:border-primary focus:ring-primary/20 w-full resize-y rounded-xl border px-4 py-3 font-mono text-sm focus:ring-4 focus:outline-none'
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className='border-border/40 flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end sm:gap-3'>
                    <Button
                        variant='outline'
                        onClick={() => setReinstallOpen(false)}
                        disabled={reinstalling}
                        className='min-h-11 w-full sm:w-auto'
                    >
                        {t('vds.settings.reinstall.cancel_button')}
                    </Button>
                    <Button
                        variant='destructive'
                        onClick={handleReinstall}
                        disabled={reinstalling}
                        className='min-h-11 w-full sm:w-auto'
                    >
                        {reinstalling ? (
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        ) : (
                            <RotateCcw className='mr-2 h-4 w-4' />
                        )}
                        {t('vds.settings.reinstall.confirm_button')}
                    </Button>
                </div>
            </Dialog>

            <WidgetRenderer widgets={getWidgets('vds-settings', 'bottom-of-page')} />

            {isQemu && (
                <UnsavedChangesBar
                    dirty={hardwareUnsaved}
                    saving={qemuHardwareSaving}
                    onSave={() => void handleApplyQemuHardware()}
                    onDiscard={() => {
                        const saved = restoreHardware();
                        if (!saved) return;
                        setBiosMode(saved.biosMode);
                        setEfiEnabled(saved.efiEnabled);
                        setTpmEnabled(saved.tpmEnabled);
                        setSerial0Enabled(saved.serial0Enabled);
                    }}
                />
            )}
        </div>
    );
}
