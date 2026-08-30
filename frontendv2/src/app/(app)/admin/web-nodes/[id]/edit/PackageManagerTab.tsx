/*
This file is part of FeatherPanel.
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Box, Download, Loader2, RefreshCw, Terminal, Trash2 } from 'lucide-react';
import {
    SystemPackageTerminalPanel,
    type SystemPackageTerminalPanelRef,
} from '@/components/system/SystemPackageTerminalPanel';

interface PackageManagerTabProps {
    nodeId: string;
}

interface HostPackage {
    id: string;
    display_name: string;
    category: string;
    installed: boolean;
    binary_path?: string | null;
    version?: string | null;
    managed: boolean;
    install_blocked?: boolean;
    blocked_by?: string | null;
    blocked_by_name?: string | null;
}

interface PackagesPayload {
    package_manager?: string | null;
    packages?: HostPackage[];
    active_reverse_proxy?: string | null;
}

export function PackageManagerTab({ nodeId }: PackageManagerTabProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [packageManager, setPackageManager] = useState<string | null>(null);
    const [activeReverseProxy, setActiveReverseProxy] = useState<string | null>(null);
    const [packages, setPackages] = useState<HostPackage[]>([]);
    const terminalRef = useRef<SystemPackageTerminalPanelRef>(null);
    const loadRef = useRef<() => Promise<void>>(async () => {});

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get(`/api/admin/web-nodes/${nodeId}/packages`);
            if (!data?.success) {
                throw new Error(data?.message || t('admin.webNodes.packages.fetch_failed'));
            }
            const payload = (data.data?.packages || {}) as PackagesPayload;
            setPackageManager(payload.package_manager ?? null);
            setActiveReverseProxy(payload.active_reverse_proxy ?? null);
            setPackages(payload.packages ?? []);
        } catch (e) {
            const msg =
                e instanceof Error
                    ? e.message
                    : isAxiosError(e)
                      ? e.response?.data?.message || e.message
                      : t('admin.webNodes.packages.fetch_failed');
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [nodeId, t]);

    loadRef.current = load;

    useEffect(() => {
        void load();
    }, [load]);

    const activeProxyName = useMemo(() => {
        if (!activeReverseProxy) return null;
        return packages.find((pkg) => pkg.id === activeReverseProxy)?.display_name ?? activeReverseProxy;
    }, [activeReverseProxy, packages]);

    const runOperation = async (pkg: HostPackage, action: 'install' | 'remove') => {
        setBusyId(pkg.id);
        terminalRef.current?.clear();

        try {
            await terminalRef.current?.ensureConnected();

            const endpoint =
                action === 'install'
                    ? `/api/admin/web-nodes/${nodeId}/packages/${pkg.id}/install`
                    : `/api/admin/web-nodes/${nodeId}/packages/${pkg.id}/remove`;

            const { data } = await axios.post(endpoint);
            if (!data?.success) {
                throw new Error(
                    data?.message ||
                        (action === 'install'
                            ? t('admin.webNodes.packages.install_failed')
                            : t('admin.webNodes.packages.remove_failed')),
                );
            }

            toast.success(
                action === 'install'
                    ? t('admin.webNodes.packages.install_success', { name: pkg.display_name })
                    : t('admin.webNodes.packages.remove_success', { name: pkg.display_name }),
            );
            if (action === 'install' && pkg.id === 'mailserver' && data?.data?.mail_host_id) {
                toast.message(t('admin.webNodes.packages.mail_host_created'));
            }
            await load();
        } catch (e) {
            const msg =
                e instanceof Error
                    ? e.message
                    : isAxiosError(e)
                      ? e.response?.data?.message || e.message
                      : action === 'install'
                        ? t('admin.webNodes.packages.install_failed')
                        : t('admin.webNodes.packages.remove_failed');
            toast.error(msg);
            terminalRef.current?.writeln(`\u001b[31m${msg}\u001b[0m`);
        } finally {
            setBusyId(null);
        }
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center py-12'>
                <Loader2 className='text-primary h-8 w-8 animate-spin' />
            </div>
        );
    }

    return (
        <div className='space-y-4'>
            <div className='flex justify-end'>
                <Button variant='outline' size='sm' onClick={() => void load()} disabled={busyId !== null}>
                    <RefreshCw className='mr-2 h-4 w-4' />
                    {t('common.refresh')}
                </Button>
            </div>

            {error && <p className='text-destructive text-sm'>{error}</p>}

            <PageCard title={t('admin.webNodes.packages.title')} description={t('admin.webNodes.packages.description')} icon={Box}>
                {packageManager && (
                    <p className='text-muted-foreground mb-4 text-xs'>
                        {t('admin.webNodes.packages.detected_manager', { manager: packageManager })}
                    </p>
                )}

                {activeProxyName && (
                    <p className='text-muted-foreground mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs'>
                        {t('admin.webNodes.packages.active_reverse_proxy', { name: activeProxyName })}
                    </p>
                )}

                <div className='space-y-3'>
                    {packages.map((pkg) => (
                        <div
                            key={pkg.id}
                            className='border-border/50 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between'
                        >
                            <div className='min-w-0 space-y-1'>
                                <div className='flex flex-wrap items-center gap-2'>
                                    <p className='font-semibold'>{pkg.display_name}</p>
                                    <Badge variant='outline'>{t(`admin.webNodes.packages.categories.${pkg.category}`)}</Badge>
                                    <Badge
                                        className={
                                            pkg.installed
                                                ? 'bg-emerald-500/15 text-emerald-600'
                                                : 'bg-muted text-muted-foreground'
                                        }
                                    >
                                        {pkg.installed
                                            ? t('admin.webNodes.packages.installed')
                                            : t('admin.webNodes.packages.not_installed')}
                                    </Badge>
                                </div>
                                {pkg.binary_path && (
                                    <p className='text-muted-foreground font-mono text-xs break-all'>{pkg.binary_path}</p>
                                )}
                                {pkg.version && <p className='text-muted-foreground text-xs'>{pkg.version}</p>}
                                {pkg.install_blocked && pkg.blocked_by_name && (
                                    <p className='text-amber-600 text-xs dark:text-amber-400'>
                                        {t('admin.webNodes.packages.install_blocked', { name: pkg.blocked_by_name })}
                                    </p>
                                )}
                            </div>

                            <div className='flex shrink-0 gap-2'>
                                {!pkg.installed ? (
                                    <Button
                                        size='sm'
                                        loading={busyId === pkg.id}
                                        disabled={(busyId !== null && busyId !== pkg.id) || pkg.install_blocked}
                                        onClick={() => void runOperation(pkg, 'install')}
                                    >
                                        <Download className='mr-2 h-4 w-4' />
                                        {t('admin.webNodes.packages.install')}
                                    </Button>
                                ) : (
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        loading={busyId === pkg.id}
                                        disabled={busyId !== null && busyId !== pkg.id}
                                        onClick={() => void runOperation(pkg, 'remove')}
                                    >
                                        <Trash2 className='mr-2 h-4 w-4' />
                                        {t('admin.webNodes.packages.remove')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </PageCard>

            <PageCard
                title={t('admin.webNodes.packages.terminal_title')}
                description={t('admin.webNodes.packages.terminal_description')}
                icon={Terminal}
            >
                {busyId && (
                    <div className='mb-3'>
                        <Badge variant='outline'>{busyId}</Badge>
                    </div>
                )}
                <SystemPackageTerminalPanel
                    ref={terminalRef}
                    nodeId={nodeId}
                    onCompleted={() => void loadRef.current()}
                    onFailed={() => void loadRef.current()}
                />
            </PageCard>
        </div>
    );
}
