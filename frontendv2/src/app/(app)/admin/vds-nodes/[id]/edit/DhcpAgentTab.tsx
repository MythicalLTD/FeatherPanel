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

import { useCallback, useEffect, useState } from 'react';
import axios, { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { Copy, RefreshCw, Terminal, Trash2, Wifi, WifiOff, Zap } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sensitive } from '@/components/common/Sensitive';
import { useTranslation } from '@/contexts/TranslationContext';
import { copyToClipboard } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-errors';
import type { VdsNodeForm } from './page';
import { TabTableShell } from './TabPrimitives';

interface TailLease {
    mac?: string;
    ip?: string;
    hostname?: string | null;
    vmid?: number | null;
    node?: string | null;
    state?: string;
    static_lease?: boolean;
}

interface DhcpAgentTabProps {
    nodeId: string;
    form: VdsNodeForm;
    setForm: React.Dispatch<React.SetStateAction<VdsNodeForm>>;
    configRefreshKey?: number;
}

interface SetupCommandData {
    install_command: string;
    setup_command: string;
    config_path_hint?: string;
    notes?: string[];
    daemon_display_name?: string;
    systemd_unit?: string;
    feathertail_url?: string;
}

interface CommandBlockProps {
    command: string;
    copyLabel: string;
    onCopy: () => void;
}

function CommandBlock({ command, copyLabel, onCopy }: CommandBlockProps) {
    return (
        <div className='overflow-hidden rounded-xl border border-[var(--fp-surface-border)] bg-zinc-950'>
            <div className='flex justify-end border-b border-[var(--fp-surface-border)] bg-zinc-900 px-3 py-2'>
                <Button
                    type='button'
                    variant='plain'
                    size='sm'
                    className='border border-[var(--fp-surface-border)] bg-zinc-800 text-zinc-100 hover:border-[var(--fp-surface-border)] hover:bg-zinc-700 hover:text-white'
                    onClick={onCopy}
                >
                    <Copy className='mr-2 h-4 w-4 shrink-0' />
                    <span className='truncate'>{copyLabel}</span>
                </Button>
            </div>
            <pre className='overflow-x-auto p-4 font-mono text-xs break-all whitespace-pre-wrap text-zinc-300'>
                <Sensitive>{command}</Sensitive>
            </pre>
        </div>
    );
}

export function DhcpAgentTab({ nodeId, form, setForm, configRefreshKey = 0 }: DhcpAgentTabProps) {
    const { t } = useTranslation();
    const [setupData, setSetupData] = useState<SetupCommandData | null>(null);
    const [setupLoading, setSetupLoading] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
    const [leases, setLeases] = useState<TailLease[]>([]);
    const [leasesLoading, setLeasesLoading] = useState(false);
    const [deletingVmid, setDeletingVmid] = useState<number | null>(null);

    const fetchSetupCommand = useCallback(async () => {
        if (!nodeId) return;
        setSetupLoading(true);
        try {
            const { data } = await axios.get(`/api/admin/vm-nodes/${nodeId}/setup-command`);
            if (data?.data?.install_command != null || data?.data?.setup_command) {
                setSetupData(data.data);
                const urlFromApi = typeof data.data.feathertail_url === 'string' ? data.data.feathertail_url : '';
                if (urlFromApi) {
                    setForm((prev) => (prev.feathertail_url.trim() ? prev : { ...prev, feathertail_url: urlFromApi }));
                }
            } else {
                setSetupData(null);
            }
        } catch {
            setSetupData(null);
        } finally {
            setSetupLoading(false);
        }
    }, [nodeId, setForm]);

    useEffect(() => {
        fetchSetupCommand();
    }, [fetchSetupCommand, configRefreshKey]);

    const fetchLeases = useCallback(async () => {
        if (!nodeId) return;
        setLeasesLoading(true);
        try {
            const { data } = await axios.get(`/api/admin/vm-nodes/${nodeId}/feathertail/leases`);
            setLeases(Array.isArray(data?.data?.leases) ? data.data.leases : []);
        } catch (error) {
            setLeases([]);
            toast.error(getApiErrorMessage(error, t, 'admin.vdsNodes.feathertail.leases_fetch_failed'));
        } finally {
            setLeasesLoading(false);
        }
    }, [nodeId, t]);

    useEffect(() => {
        void fetchLeases();
    }, [fetchLeases, configRefreshKey]);

    const handleDeleteLease = async (vmid: number) => {
        setDeletingVmid(vmid);
        try {
            await axios.delete(`/api/admin/vm-nodes/${nodeId}/feathertail/leases/vm/${vmid}`);
            toast.success(t('admin.vdsNodes.feathertail.leases_delete_success'));
            await fetchLeases();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'admin.vdsNodes.feathertail.leases_delete_failed'));
        } finally {
            setDeletingVmid(null);
        }
    };

    const handleResetToken = async () => {
        setResetting(true);
        try {
            await axios.post(`/api/admin/vm-nodes/${nodeId}/feathertail/reset-token`);
            toast.success(t('admin.vdsNodes.feathertail.reset_success'));
            await fetchSetupCommand();
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'admin.vdsNodes.feathertail.reset_failed'));
        } finally {
            setResetting(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        setTestResult(null);
        try {
            const { data } = await axios.post(`/api/admin/vm-nodes/${nodeId}/feathertail/test`);
            const healthy = Boolean(data?.data?.healthy);
            const err = typeof data?.data?.error === 'string' ? data.data.error : '';
            setTestResult({
                ok: healthy,
                message: healthy
                    ? t('admin.vdsNodes.feathertail.test_success')
                    : err || t('admin.vdsNodes.feathertail.test_failed'),
            });
        } catch (error) {
            const fallback = t('admin.vdsNodes.feathertail.test_failed');
            let message = getApiErrorMessage(error, t, fallback);
            if (isAxiosError(error) && typeof error.response?.data?.data?.error === 'string') {
                message = error.response.data.data.error || message;
            }
            setTestResult({ ok: false, message });
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className='space-y-6'>
            <PageCard title={t('admin.vdsNodes.feathertail.setup_title')} icon={Terminal}>
                <div className='space-y-4'>
                    <p className='text-muted-foreground text-sm'>{t('admin.vdsNodes.feathertail.setup_help')}</p>
                    <ol className='text-muted-foreground list-decimal space-y-1 pl-5 text-xs'>
                        <li>{t('admin.vdsNodes.feathertail.checklist_install')}</li>
                        <li>{t('admin.vdsNodes.feathertail.checklist_firewall')}</li>
                        <li>{t('admin.vdsNodes.feathertail.checklist_test')}</li>
                        <li>{t('admin.vdsNodes.feathertail.checklist_dhcp')}</li>
                    </ol>
                    {setupData?.daemon_display_name ? (
                        <p className='text-foreground text-sm font-medium'>
                            {setupData.daemon_display_name}
                            {setupData.config_path_hint ? ` · ${setupData.config_path_hint}` : ''}
                            {setupData.systemd_unit ? ` · ${setupData.systemd_unit}` : ''}
                        </p>
                    ) : null}
                    {setupLoading ? (
                        <div className='text-muted-foreground rounded-xl border border-[var(--fp-surface-border)] bg-zinc-950/50 p-4 text-sm'>
                            {t('common.loading')}...
                        </div>
                    ) : setupData ? (
                        <>
                            <div className='space-y-2'>
                                <p className='text-foreground text-xs font-semibold'>
                                    {t('admin.vdsNodes.feathertail.setup_step_1')}
                                </p>
                                <CommandBlock
                                    command={setupData.install_command}
                                    copyLabel={t('admin.vdsNodes.feathertail.copy_install')}
                                    onCopy={() => copyToClipboard(setupData.install_command, t)}
                                />
                            </div>
                            {setupData.setup_command ? (
                                <div className='space-y-2'>
                                    <p className='text-foreground text-xs font-semibold'>
                                        {t('admin.vdsNodes.feathertail.setup_step_2')}
                                    </p>
                                    <CommandBlock
                                        command={setupData.setup_command}
                                        copyLabel={t('admin.vdsNodes.feathertail.copy_setup')}
                                        onCopy={() => copyToClipboard(setupData.setup_command, t)}
                                    />
                                </div>
                            ) : null}
                            {setupData.notes && setupData.notes.length > 0 ? (
                                <ul className='text-muted-foreground list-disc space-y-1 pl-5 text-xs'>
                                    {setupData.notes.map((note) => (
                                        <li key={note}>{note}</li>
                                    ))}
                                </ul>
                            ) : null}
                        </>
                    ) : (
                        <p className='text-muted-foreground text-sm'>
                            {t('admin.vdsNodes.feathertail.setup_unavailable')}
                        </p>
                    )}
                </div>
            </PageCard>

            <PageCard title={t('admin.vdsNodes.feathertail.settings_title')} icon={Zap}>
                <div className='space-y-6'>
                    <div className='flex items-center justify-between gap-4'>
                        <div>
                            <Label className='text-sm font-semibold'>{t('admin.vdsNodes.feathertail.enabled')}</Label>
                            <p className='text-muted-foreground mt-1 text-xs'>
                                {t('admin.vdsNodes.feathertail.enabled_help')}
                            </p>
                        </div>
                        <Switch
                            checked={form.feathertail_enabled}
                            onCheckedChange={(checked) =>
                                setForm((prev) => ({ ...prev, feathertail_enabled: Boolean(checked) }))
                            }
                        />
                    </div>

                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.vdsNodes.feathertail.url')}</Label>
                        <Input
                            placeholder='http://node.example.com:8686'
                            value={form.feathertail_url}
                            onChange={(e) => setForm((prev) => ({ ...prev, feathertail_url: e.target.value }))}
                        />
                        <p className='text-muted-foreground text-xs'>{t('admin.vdsNodes.feathertail.url_help')}</p>
                    </div>

                    <div className='flex items-center justify-between gap-4'>
                        <div>
                            <Label className='text-sm font-semibold'>
                                {t('admin.vdsNodes.feathertail.tls_no_verify')}
                            </Label>
                            <p className='text-muted-foreground mt-1 text-xs'>
                                {t('admin.vdsNodes.feathertail.tls_no_verify_help')}
                            </p>
                        </div>
                        <Switch
                            checked={form.feathertail_tls_no_verify}
                            onCheckedChange={(checked) =>
                                setForm((prev) => ({ ...prev, feathertail_tls_no_verify: Boolean(checked) }))
                            }
                        />
                    </div>

                    {testResult ? (
                        <div
                            className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                                testResult.ok
                                    ? 'border-green-500/40 bg-green-500/5 text-green-700'
                                    : 'border-red-500/40 bg-red-500/5 text-red-700'
                            }`}
                        >
                            {testResult.ok ? (
                                <Wifi className='mt-0.5 h-4 w-4 shrink-0' />
                            ) : (
                                <WifiOff className='mt-0.5 h-4 w-4 shrink-0' />
                            )}
                            <p>{testResult.message}</p>
                        </div>
                    ) : null}

                    <div className='flex flex-wrap gap-3 border-t border-[var(--fp-surface-border)] pt-6'>
                        <Button type='button' variant='outline' onClick={handleTest} loading={testing}>
                            <Wifi className='mr-2 h-4 w-4' />
                            {t('admin.vdsNodes.feathertail.test_button')}
                        </Button>
                        <Button type='button' variant='destructive' onClick={handleResetToken} loading={resetting}>
                            <RefreshCw className='mr-2 h-4 w-4' />
                            {t('admin.vdsNodes.feathertail.reset_token')}
                        </Button>
                    </div>
                    <p className='text-muted-foreground text-xs'>{t('admin.vdsNodes.feathertail.reset_help')}</p>
                </div>
            </PageCard>

            <PageCard
                title={t('admin.vdsNodes.feathertail.leases_title')}
                icon={Zap}
                action={
                    <Button type='button' variant='outline' size='sm' onClick={() => void fetchLeases()} loading={leasesLoading}>
                        <RefreshCw className='mr-2 h-4 w-4' />
                        {t('common.refresh')}
                    </Button>
                }
            >
                <div className='space-y-4'>
                    <p className='text-muted-foreground text-sm'>{t('admin.vdsNodes.feathertail.leases_help')}</p>
                    {leasesLoading ? (
                        <p className='text-muted-foreground text-sm'>{t('common.loading')}...</p>
                    ) : leases.length === 0 ? (
                        <p className='text-muted-foreground text-sm'>{t('admin.vdsNodes.feathertail.leases_empty')}</p>
                    ) : (
                        <TabTableShell>
                            <table className='w-full text-sm'>
                                <thead className='bg-muted/20 border-border/50 border-b'>
                                    <tr>
                                        <th className='text-muted-foreground px-4 py-3 text-left font-medium'>
                                            {t('admin.vdsNodes.feathertail.leases_col_vmid')}
                                        </th>
                                        <th className='text-muted-foreground px-4 py-3 text-left font-medium'>
                                            {t('admin.vdsNodes.feathertail.leases_col_ip')}
                                        </th>
                                        <th className='text-muted-foreground px-4 py-3 text-left font-medium'>
                                            {t('admin.vdsNodes.feathertail.leases_col_mac')}
                                        </th>
                                        <th className='text-muted-foreground px-4 py-3 text-left font-medium'>
                                            {t('admin.vdsNodes.feathertail.leases_col_state')}
                                        </th>
                                        <th className='text-muted-foreground px-4 py-3 text-right font-medium'>
                                            {t('common.actions')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className='divide-border/50 divide-y'>
                                    {leases.map((lease) => {
                                        const vmid = typeof lease.vmid === 'number' ? lease.vmid : null;
                                        return (
                                            <tr key={`${lease.mac ?? ''}-${lease.ip ?? ''}-${vmid ?? ''}`}>
                                                <td className='px-4 py-3 font-mono text-xs'>{vmid ?? '—'}</td>
                                                <td className='px-4 py-3 font-mono text-xs'>
                                                    <Sensitive>{lease.ip ?? '—'}</Sensitive>
                                                </td>
                                                <td className='text-muted-foreground px-4 py-3 font-mono text-xs'>
                                                    {lease.mac ?? '—'}
                                                </td>
                                                <td className='px-4 py-3 text-xs'>{lease.state ?? '—'}</td>
                                                <td className='px-4 py-3 text-right'>
                                                    {vmid != null ? (
                                                        <Button
                                                            type='button'
                                                            variant='ghost'
                                                            size='sm'
                                                            className='text-destructive hover:bg-destructive/10'
                                                            loading={deletingVmid === vmid}
                                                            onClick={() => void handleDeleteLease(vmid)}
                                                        >
                                                            <Trash2 className='h-4 w-4' />
                                                        </Button>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </TabTableShell>
                    )}
                </div>
            </PageCard>
        </div>
    );
}
