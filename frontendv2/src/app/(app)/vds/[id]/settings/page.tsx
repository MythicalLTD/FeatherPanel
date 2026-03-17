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

export default function VdsSettingsPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    useTranslation();
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
    }, [id, isQemu]);

    React.useEffect(() => {
        if (!instanceLoading) fetchTemplates();
    }, [instanceLoading, fetchTemplates]);

    const handleReinstall = async () => {
        if (!selectedTemplate) {
            toast.error('Please select a template first.');
            return;
        }
        setReinstalling(true);
        try {
            const payload: Record<string, unknown> = { template_id: selectedTemplate };
            if (isQemu) {
                if (ciUser) payload.ci_user = ciUser;
                if (ciPassword) payload.ci_password = ciPassword;
                if (ciSshKeys) payload.ci_ssh_keys = ciSshKeys;
            }
            const { data } = await axios.post(`/api/user/vm-instances/${id}/reinstall`, payload);
            if (!data.success) {
                toast.error(data.message || 'Failed to start reinstall.');
                return;
            }

            const reinstallId: string | undefined = data.data?.reinstall_id;
            if (!reinstallId) {
                toast.error('Reinstall did not return a reinstall_id');
                return;
            }

            toast.success('Reinstall initiated. This may take several minutes.');
            setReinstallOpen(false);

            // Poll reinstall status until active or failed (mirrors admin VM flow).
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
                    const statusRes = await axios.get(`/api/user/vm-instances/reinstall-status/${reinstallId}`);
                    const s = statusRes.data?.data;
                    if (s?.status === 'active') {
                        toast.success('VDS reinstalled from template.');
                        await refreshInstance();
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
        } finally {
            setReinstalling(false);
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

            {/* Reinstall */}
            {canReinstall && (
                <Card className='border-border/20 bg-card/40 backdrop-blur-sm'>
                    <CardHeader>
                        <CardTitle className='text-sm font-black uppercase tracking-widest flex items-center gap-2'>
                            <RotateCcw className='h-4 w-4 text-primary' />
                            Reinstall OS
                        </CardTitle>
                        <CardDescription className='text-muted-foreground'>
                            This will <strong>permanently wipe</strong> the current OS and reinstall from a chosen
                            template. All data on the VDS will be lost.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        {templatesLoading ? (
                            <div className='flex items-center gap-2 text-muted-foreground'>
                                <Loader2 className='h-4 w-4 animate-spin' />
                                <span className='text-sm'>Loading templates…</span>
                            </div>
                        ) : templates.length === 0 ? (
                            <p className='text-sm text-muted-foreground italic'>
                                No {isQemu ? 'QEMU/KVM' : 'LXC'} templates available for this VDS. Contact your
                                administrator.
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
                            Begin Reinstall
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Reinstall confirm modal */}
            <HeadlessModal
                isOpen={reinstallOpen}
                onClose={() => setReinstallOpen(false)}
                title='Confirm OS Reinstall'
                description='This action is irreversible. All data on this VDS will be destroyed.'
            >
                <div className='space-y-6 py-4'>
                    <div className='flex items-start gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20'>
                        <AlertTriangle className='h-5 w-5 text-red-400 shrink-0 mt-0.5' />
                        <p className='text-sm text-red-300'>
                            You are about to reinstall{' '}
                            <strong>{templates.find((t) => t.id === selectedTemplate)?.name}</strong> on{' '}
                            <strong>{instance.hostname ?? `VDS #${instance.id}`}</strong>. All existing data will be
                            permanently erased.
                        </p>
                    </div>

                    {isQemu && (
                        <div className='space-y-4'>
                            <p className='text-xs font-black uppercase tracking-widest text-primary/70'>
                                Cloud-Init Credentials (optional)
                            </p>
                            <div className='space-y-3'>
                                <div>
                                    <label className='text-xs font-semibold text-muted-foreground block mb-1'>
                                        Username
                                    </label>
                                    <Input
                                        value={ciUser}
                                        onChange={(e) => setCiUser(e.target.value)}
                                        placeholder='e.g. ubuntu'
                                        className='h-11'
                                    />
                                </div>
                                <div>
                                    <label className='text-xs font-semibold text-muted-foreground block mb-1'>
                                        Password
                                    </label>
                                    <div className='relative'>
                                        <Input
                                            type={showPassword ? 'text' : 'password'}
                                            value={ciPassword}
                                            onChange={(e) => setCiPassword(e.target.value)}
                                            placeholder='Leave blank to keep existing'
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
                                        SSH Public Keys
                                    </label>
                                    <textarea
                                        value={ciSshKeys}
                                        onChange={(e) => setCiSshKeys(e.target.value)}
                                        placeholder='Paste SSH public key(s) here…'
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
                        Cancel
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
                        Confirm Reinstall
                    </Button>
                </div>
            </HeadlessModal>
        </div>
    );
}
