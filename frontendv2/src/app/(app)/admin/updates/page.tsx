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

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
    RefreshCcw,
    Download,
    Server,
    Package,
    CheckCircle2,
    ArrowUpCircle,
    Loader2,
    ShieldCheck,
    Cpu,
    ExternalLink,
    Search,
    ChevronRight,
    Layers,
    CheckSquare,
    Square,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import axios from 'axios';
import { toast } from 'sonner';
import { adminSettingsApi } from '@/lib/admin-settings-api';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface Node {
    id: number;
    name: string;
    fqdn: string;
}

interface NodeVersionInfo {
    current_version: string;
    latest_version: string;
    is_up_to_date: boolean;
    update_available: boolean;
    loading: boolean;
    error?: string;
}

interface Plugin {
    identifier: string;
    name: string;
    version: string;
    icon?: string;
}

interface PluginUpdateInfo {
    identifier: string;
    latest_version: string;
    update_available: boolean;
    loading: boolean;
}

export default function AdminUpdatesPage() {
    const { t } = useTranslation();
    const { data: dashboardData, refresh: refreshDashboard } = useAdminDashboard();

    const [nodes, setNodes] = useState<Node[]>([]);
    const [nodesLoading, setNodesLoading] = useState(true);
    const [nodeVersions, setNodeVersions] = useState<Record<number, NodeVersionInfo>>({});

    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [pluginsLoading, setPluginsLoading] = useState(true);
    const [pluginUpdates, setPluginUpdates] = useState<Record<string, PluginUpdateInfo>>({});

    const [isUpdatingPanel, setIsUpdatingPanel] = useState(false);
    const [isCheckingAll, setIsCheckingAll] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNodes, setSelectedNodes] = useState<Set<number>>(new Set());
    const [selectedPlugins, setSelectedPlugins] = useState<Set<string>>(new Set());

    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    const normalizeVersion = (v: string): string => v.replace(/^v/i, '');

    const compareVersions = (v1: string, v2: string): number => {
        const parts1 = normalizeVersion(v1).split('.').map(Number);
        const parts2 = normalizeVersion(v2).split('.').map(Number);
        const maxLength = Math.max(parts1.length, parts2.length);

        for (let i = 0; i < maxLength; i++) {
            const part1 = parts1[i] || 0;
            const part2 = parts2[i] || 0;
            if (part1 < part2) return -1;
            if (part1 > part2) return 1;
        }
        return 0;
    };

    const fetchNodes = useCallback(async () => {
        try {
            const response = await axios.get('/api/admin/nodes?limit=100');
            setNodes(response.data.data.nodes || []);
        } catch (error) {
            console.error('Failed to fetch nodes', error);
            toast.error(t('admin_updates.wings.failed'));
        } finally {
            setNodesLoading(false);
        }
    }, [t]);

    const fetchPlugins = useCallback(async () => {
        try {
            const response = await axios.get('/api/admin/plugins');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pluginList = Object.values(response.data.data.plugins || {}).map((p: any) => ({
                identifier: p.plugin.identifier,
                name: p.plugin.name,
                version: p.plugin.version,
                icon: p.plugin.icon,
            }));
            setPlugins(pluginList);
        } catch (error) {
            console.error('Failed to fetch plugins', error);
        } finally {
            setPluginsLoading(false);
        }
    }, []);

    const checkNodeVersion = async (id: number) => {
        setNodeVersions((prev) => ({
            ...prev,
            [id]: { ...prev[id], loading: true },
        }));

        try {
            const response = await axios.get(`/api/admin/nodes/${id}/version-status`);
            const data = response.data.data;
            setNodeVersions((prev) => ({
                ...prev,
                [id]: {
                    current_version: data.current_version,
                    latest_version: data.latest_version,
                    is_up_to_date: data.is_up_to_date,
                    update_available: data.update_available,
                    loading: false,
                },
            }));
        } catch (error) {
            console.error(error);
            setNodeVersions((prev) => ({
                ...prev,
                [id]: { ...prev[id], loading: false, error: 'Failed' },
            }));
        }
    };

    const checkPluginVersion = async (identifier: string, currentVersion: string) => {
        setPluginUpdates((prev) => ({
            ...prev,
            [identifier]: { ...prev[identifier], loading: true, identifier },
        }));

        try {
            const response = await axios.get(`/api/admin/plugins/online/${encodeURIComponent(identifier)}`);
            const packageData = response.data.data?.package;
            const latest = packageData?.latest_version?.version;

            if (latest) {
                const updateAvailable = compareVersions(currentVersion, latest) < 0;
                setPluginUpdates((prev) => ({
                    ...prev,
                    [identifier]: {
                        identifier,
                        latest_version: latest,
                        update_available: updateAvailable,
                        loading: false,
                    },
                }));
            } else {
                setPluginUpdates((prev) => ({
                    ...prev,
                    [identifier]: { ...prev[identifier], loading: false },
                }));
            }
        } catch (error) {
            console.error(error);
            setPluginUpdates((prev) => ({
                ...prev,
                [identifier]: { ...prev[identifier], loading: false },
            }));
        }
    };

    const checkAllUpdates = async () => {
        setIsCheckingAll(true);
        const nodePromises = nodes.map((node) => checkNodeVersion(node.id));
        const pluginPromises = plugins.map((plugin) => checkPluginVersion(plugin.identifier, plugin.version));

        await Promise.all([...nodePromises, ...pluginPromises]);
        await refreshDashboard();
        setIsCheckingAll(false);
    };

    useEffect(() => {
        fetchNodes();
        fetchPlugins();
    }, [fetchNodes, fetchPlugins]);

    useEffect(() => {
        if (nodes.length > 0 || plugins.length > 0) {
            checkAllUpdates();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodes.length, plugins.length]);

    const handleUpdatePanel = async () => {
        if (isUpdatingPanel) return;
        setIsUpdatingPanel(true);
        try {
            const response = await adminSettingsApi.triggerDockerUpdate();
            if (response.success) {
                toast.success(response.message || t('admin_updates.messages.update_started'));
            } else {
                toast.error(response.message || t('admin_updates.messages.update_failed'));
            }
        } catch (error) {
            console.error(error);
            toast.error(t('admin_updates.messages.update_failed'));
        } finally {
            setIsUpdatingPanel(false);
        }
    };

    const handleBulkUpdate = async () => {
        if (selectedNodes.size === 0 && selectedPlugins.size === 0) return;
        setIsBulkUpdating(true);
        const toastId = toast.loading(t('admin_updates.messages.bulk_starting'));

        const pluginIdentifiers = Array.from(selectedPlugins);
        const queuedIdentifiers = pluginIdentifiers;
        const pluginFailures: string[] = [];
        let pluginsUpdated = 0;

        try {
            const nodeResults = await Promise.allSettled(
                Array.from(selectedNodes).map((id) =>
                    axios.post(`/api/admin/nodes/${id}/self-update`, { source: 'github' }),
                ),
            );

            for (const identifier of pluginIdentifiers) {
                try {
                    await axios.post('/api/admin/plugins/online/install', {
                        identifier,
                        queued_identifiers: queuedIdentifiers,
                    });
                    pluginsUpdated += 1;
                } catch (error) {
                    const message = axios.isAxiosError(error)
                        ? error.response?.data?.message || t('admin.plugins.messages.update_failed')
                        : t('admin.plugins.messages.update_failed');
                    const plugin = plugins.find((p) => p.identifier === identifier);
                    pluginFailures.push(`${plugin?.name || identifier}: ${message}`);
                }
            }

            const nodeFailures = nodeResults.filter((r) => r.status === 'rejected').length;
            const hasFailures = nodeFailures > 0 || pluginFailures.length > 0;

            if (!hasFailures) {
                toast.success(t('admin_updates.messages.bulk_started'), { id: toastId });
            } else if (pluginsUpdated > 0 || nodeResults.some((r) => r.status === 'fulfilled')) {
                toast.error(t('admin_updates.messages.bulk_failed'), { id: toastId });
                if (pluginFailures.length > 0) {
                    console.error('Plugin updates failed:', pluginFailures);
                }
            } else {
                toast.error(t('admin_updates.messages.bulk_failed'), { id: toastId });
                if (pluginFailures.length > 0) {
                    console.error('Plugin updates failed:', pluginFailures);
                }
            }

            setSelectedNodes(new Set());
            setSelectedPlugins(new Set());
            await checkAllUpdates();

            if (pluginsUpdated > 0) {
                await fetchPlugins();
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (error) {
            console.error(error);
            toast.error(t('admin_updates.messages.bulk_failed'), { id: toastId });
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const toggleNodeSelection = (id: number) => {
        const newSelection = new Set(selectedNodes);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
        setSelectedNodes(newSelection);
    };

    const togglePluginSelection = (id: string) => {
        const newSelection = new Set(selectedPlugins);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
        setSelectedPlugins(newSelection);
    };

    const filteredNodes = useMemo(() => {
        return nodes.filter(
            (n) =>
                n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                n.fqdn.toLowerCase().includes(searchQuery.toLowerCase()),
        );
    }, [nodes, searchQuery]);

    const filteredPlugins = useMemo(() => {
        return plugins.filter(
            (p) =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.identifier.toLowerCase().includes(searchQuery.toLowerCase()),
        );
    }, [plugins, searchQuery]);

    const panelVersion = dashboardData?.version;

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin_updates.title')}
                description={t('admin_updates.description')}
                icon={RefreshCcw}
                actions={
                    <div className='flex items-center gap-2'>
                        <div className='bg-card/30 border-border/50 hidden items-center gap-2 rounded-xl border px-3 py-1.5 md:flex'>
                            <Search className='text-muted-foreground h-4 w-4' />
                            <input
                                type='text'
                                placeholder={t('common.search')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className='w-40 bg-transparent text-sm outline-none'
                            />
                        </div>
                        <Button
                            variant='outline'
                            onClick={checkAllUpdates}
                            disabled={isCheckingAll}
                            className='gap-2 rounded-xl'
                        >
                            {isCheckingAll ? (
                                <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                                <RefreshCcw className='h-4 w-4' />
                            )}
                            <span className='hidden sm:inline'>{t('common.refresh')}</span>
                        </Button>
                    </div>
                }
            />

            {/* FLOATING ACTION BAR */}
            {(selectedNodes.size > 0 || selectedPlugins.size > 0) && (
                <div className='animate-in fade-in slide-in-from-bottom-4 fixed bottom-8 left-1/2 z-50 -translate-x-1/2'>
                    <div className='bg-primary border-primary/20 shadow-primary/20 flex items-center gap-6 rounded-2xl border px-6 py-4 shadow-2xl backdrop-blur-xl'>
                        <div className='flex items-center gap-4'>
                            <div className='bg-primary-foreground/20 rounded-lg p-2'>
                                <Layers className='text-primary-foreground h-5 w-5' />
                            </div>
                            <div className='text-primary-foreground'>
                                <p className='text-sm font-black tracking-tight'>
                                    {t('admin_updates.bulk.items_selected', {
                                        count: String(selectedNodes.size + selectedPlugins.size),
                                    })}
                                </p>
                                <p className='text-[10px] font-bold uppercase opacity-70'>
                                    {t('admin_updates.bulk.ready')}
                                </p>
                            </div>
                        </div>
                        <div className='bg-primary-foreground/10 h-8 w-px' />
                        <div className='flex items-center gap-3'>
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                    setSelectedNodes(new Set());
                                    setSelectedPlugins(new Set());
                                }}
                                className='border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 h-10 rounded-xl bg-transparent px-4 text-xs font-bold'
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                onClick={handleBulkUpdate}
                                disabled={isBulkUpdating}
                                className='bg-primary-foreground text-primary hover:bg-primary-foreground/90 h-10 rounded-xl px-6 text-xs font-black tracking-widest uppercase'
                            >
                                {isBulkUpdating ? (
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                ) : (
                                    <Download className='mr-2 h-4 w-4' />
                                )}
                                {t('admin_updates.bulk.update_selected')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
                {/* PANEL COMPACT WIDGET */}
                <div className='lg:col-span-1'>
                    <PageCard
                        title={t('admin_updates.panel.title')}
                        icon={ArrowUpCircle}
                        className='border-primary/20 bg-primary/2 h-full'
                    >
                        <div className='space-y-5'>
                            <div className='flex items-center justify-between'>
                                <div className='space-y-0.5'>
                                    <p className='text-muted-foreground text-[9px] font-black tracking-widest uppercase opacity-60'>
                                        {t('admin_updates.panel.version_label')}
                                    </p>
                                    <div className='flex items-center gap-2'>
                                        <h4 className='text-xl font-black'>
                                            {panelVersion?.current?.version || '...'}
                                        </h4>
                                        <Badge
                                            variant='secondary'
                                            className='h-4 text-[9px] font-black tracking-tighter uppercase'
                                        >
                                            {panelVersion?.current?.type || t('admin_updates.panel.release_stable')}
                                        </Badge>
                                    </div>
                                </div>
                                {panelVersion?.update_available && (
                                    <div className='space-y-0.5 text-right'>
                                        <p className='text-[9px] font-black tracking-widest text-amber-500 uppercase'>
                                            {t('admin_updates.panel.latest')}
                                        </p>
                                        <h4 className='text-xl font-black text-amber-500'>
                                            {panelVersion?.latest?.version || '...'}
                                        </h4>
                                    </div>
                                )}
                            </div>

                            {panelVersion?.update_available ? (
                                <div className='rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-500'>
                                    <div className='mb-4 flex items-center gap-3'>
                                        <Download className='h-5 w-5 animate-bounce' />
                                        <p className='text-xs font-black tracking-tight uppercase'>
                                            {t('admin_updates.panel.system_update_available')}
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleUpdatePanel}
                                        disabled={isUpdatingPanel}
                                        className='h-11 w-full rounded-xl bg-amber-500 text-[10px] font-black tracking-widest text-amber-950 uppercase hover:bg-amber-600'
                                    >
                                        {isUpdatingPanel ? (
                                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                        ) : (
                                            <RefreshCcw className='mr-2 h-4 w-4' />
                                        )}
                                        {t('admin_updates.panel.update_panel_now')}
                                    </Button>
                                </div>
                            ) : (
                                <div className='flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-500'>
                                    <CheckCircle2 className='h-5 w-5' />
                                    <p className='text-xs font-bold tracking-widest uppercase'>
                                        {t('admin_updates.panel.running_latest')}
                                    </p>
                                </div>
                            )}

                            <div className='grid grid-cols-2 gap-3'>
                                <div className='bg-muted/30 border-border/50 rounded-2xl border p-3'>
                                    <div className='mb-1 flex items-center gap-2'>
                                        <Cpu className='text-primary h-3 w-3' />
                                        <span className='text-muted-foreground text-[8px] font-black tracking-widest uppercase'>
                                            {t('admin_updates.panel.runtime_label')}
                                        </span>
                                    </div>
                                    <p className='text-xs font-bold'>
                                        PHP {panelVersion?.current?.php_version || 'N/A'}
                                    </p>
                                </div>
                                <div className='bg-muted/30 border-border/50 rounded-2xl border p-3'>
                                    <div className='mb-1 flex items-center gap-2'>
                                        <ShieldCheck className='text-primary h-3 w-3' />
                                        <span className='text-muted-foreground text-[8px] font-black tracking-widest uppercase'>
                                            {t('admin_updates.panel.integrity_label')}
                                        </span>
                                    </div>
                                    <p className='text-xs font-bold text-emerald-500'>
                                        {t('admin_updates.panel.integrity_verified')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </PageCard>
                </div>

                {/* COMPACT PLUGINS LIST */}
                <div className='lg:col-span-2'>
                    <PageCard title={t('admin_updates.plugins.title')} icon={Package} className='h-full'>
                        <div className='custom-scrollbar max-h-[400px] space-y-2 overflow-y-auto pr-2'>
                            {pluginsLoading ? (
                                <div className='flex flex-col items-center justify-center space-y-4 py-12'>
                                    <Loader2 className='text-primary h-8 w-8 animate-spin opacity-20' />
                                </div>
                            ) : filteredPlugins.length === 0 ? (
                                <div className='text-muted-foreground border-border/30 flex flex-col items-center justify-center rounded-3xl border border-dashed py-12'>
                                    <p className='text-xs font-bold tracking-widest uppercase opacity-40'>
                                        {t('admin_updates.plugins.no_plugins')}
                                    </p>
                                </div>
                            ) : (
                                filteredPlugins.map((plugin) => {
                                    const update = pluginUpdates[plugin.identifier];
                                    const isSelected = selectedPlugins.has(plugin.identifier);
                                    return (
                                        <div
                                            key={plugin.identifier}
                                            onClick={() =>
                                                update?.update_available && togglePluginSelection(plugin.identifier)
                                            }
                                            className={cn(
                                                'bg-muted/10 border-border/40 hover:bg-muted/20 group flex cursor-pointer items-center justify-between rounded-2xl border p-3 transition-all',
                                                isSelected && 'border-primary bg-primary/5',
                                                !update?.update_available &&
                                                    'cursor-default opacity-60 grayscale-[0.5]',
                                            )}
                                        >
                                            <div className='flex min-w-0 items-center gap-3'>
                                                <div className='shrink-0'>
                                                    {update?.update_available ? (
                                                        isSelected ? (
                                                            <CheckSquare className='text-primary h-4 w-4' />
                                                        ) : (
                                                            <Square className='text-muted-foreground h-4 w-4 opacity-50' />
                                                        )
                                                    ) : (
                                                        <CheckCircle2 className='h-4 w-4 text-emerald-500/40' />
                                                    )}
                                                </div>
                                                <div className='bg-background border-border/50 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border'>
                                                    {plugin.icon ? (
                                                        /* eslint-disable-next-line @next/next/no-img-element */
                                                        <img
                                                            src={plugin.icon}
                                                            alt=''
                                                            className='h-full w-full object-cover'
                                                        />
                                                    ) : (
                                                        <Package className='text-primary/40 h-4 w-4' />
                                                    )}
                                                </div>
                                                <div className='min-w-0'>
                                                    <h5 className='truncate text-xs font-black'>
                                                        {plugin.name || plugin.identifier}
                                                    </h5>
                                                    <div className='flex items-center gap-2'>
                                                        <span className='text-muted-foreground text-[9px] font-bold uppercase opacity-70'>
                                                            {plugin.version}
                                                        </span>
                                                        {update?.update_available && (
                                                            <div className='flex items-center gap-1 text-[9px] font-black text-amber-500 uppercase'>
                                                                <ChevronRight className='h-2 w-2' />
                                                                {update.latest_version}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className='flex items-center gap-2'>
                                                {update?.loading && (
                                                    <Loader2 className='h-3 w-3 animate-spin opacity-20' />
                                                )}
                                                {update?.update_available && !isSelected && (
                                                    <Badge
                                                        variant='outline'
                                                        className='h-5 border-amber-500/50 px-1.5 text-[8px] font-black tracking-tighter text-amber-500 uppercase'
                                                    >
                                                        {t('admin_updates.plugins.update_available_badge')}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </PageCard>
                </div>
            </div>

            {/* NODES WIDGET-LIKE LIST */}
            <PageCard
                title={t('admin_updates.wings.title')}
                description={t('admin_updates.wings.description')}
                icon={Server}
            >
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'>
                    {nodesLoading ? (
                        [1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className='bg-muted/20 border-border/50 h-40 animate-pulse rounded-3xl border'
                            />
                        ))
                    ) : filteredNodes.length === 0 ? (
                        <div className='border-border/30 text-muted-foreground flex flex-col items-center justify-center rounded-3xl border border-dashed py-12 md:col-span-2 xl:col-span-3'>
                            <Server className='mb-2 h-8 w-8 opacity-10' />
                            <p className='text-xs font-bold tracking-widest uppercase opacity-40'>
                                {t('admin_updates.wings.no_nodes_search')}
                            </p>
                        </div>
                    ) : (
                        filteredNodes.map((node) => {
                            const version = nodeVersions[node.id];
                            const isSelected = selectedNodes.has(node.id);
                            const hasUpdate = version?.update_available;

                            return (
                                <div
                                    key={node.id}
                                    onClick={() => hasUpdate && toggleNodeSelection(node.id)}
                                    className={cn(
                                        'group relative cursor-pointer overflow-hidden rounded-3xl border p-4 transition-all',
                                        isSelected
                                            ? 'border-primary bg-primary/5 shadow-primary/5 shadow-lg'
                                            : 'bg-muted/10 border-border/40 hover:bg-muted/20',
                                        !hasUpdate && 'cursor-default opacity-80',
                                    )}
                                >
                                    <div className='mb-4 flex items-center justify-between'>
                                        <div className='flex min-w-0 items-center gap-3'>
                                            {hasUpdate ? (
                                                isSelected ? (
                                                    <CheckSquare className='text-primary h-5 w-5' />
                                                ) : (
                                                    <Square className='text-muted-foreground h-5 w-5 opacity-50' />
                                                )
                                            ) : (
                                                <div className='flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10'>
                                                    <CheckCircle2 className='h-3 w-3 text-emerald-500' />
                                                </div>
                                            )}
                                            <div className='min-w-0'>
                                                <h5 className='truncate text-sm font-black tracking-tight'>
                                                    {node.name}
                                                </h5>
                                                <p className='text-muted-foreground truncate text-[9px] font-bold tracking-tighter uppercase opacity-60'>
                                                    {node.fqdn}
                                                </p>
                                            </div>
                                        </div>
                                        <div
                                            className={cn(
                                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border',
                                                hasUpdate
                                                    ? 'border-amber-500/20 bg-amber-500/10 text-amber-500'
                                                    : 'bg-secondary/50 border-border/50 text-primary',
                                            )}
                                        >
                                            <Server className='h-4 w-4' />
                                        </div>
                                    </div>

                                    <div className='flex items-center justify-between gap-4'>
                                        <div className='flex-1 space-y-1'>
                                            <div className='text-muted-foreground flex items-center justify-between text-[8px] font-black tracking-widest uppercase opacity-50'>
                                                <span>{t('admin_updates.wings.version')}</span>
                                                <span>{t('admin_updates.panel.latest')}</span>
                                            </div>
                                            <div className='bg-background/40 border-border/50 flex items-center justify-between rounded-xl border px-3 py-2'>
                                                <span className='text-[10px] font-bold'>
                                                    {version?.current_version || '...'}
                                                </span>
                                                <ChevronRight className='text-muted-foreground h-3 w-3 opacity-30' />
                                                <span
                                                    className={cn(
                                                        'text-[10px] font-bold',
                                                        hasUpdate ? 'text-amber-500' : 'text-emerald-500',
                                                    )}
                                                >
                                                    {version?.latest_version || '...'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {version?.loading && (
                                        <div className='bg-background/20 absolute inset-0 flex items-center justify-center backdrop-blur-[1px]'>
                                            <Loader2 className='text-primary h-5 w-5 animate-spin' />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </PageCard>

            <div className='bg-primary/5 border-primary/10 flex flex-col items-center gap-6 rounded-3xl border p-6 md:flex-row'>
                <div className='bg-primary/10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl'>
                    <Zap className='text-primary h-8 w-8' />
                </div>
                <div className='flex-1 space-y-2 text-center md:text-left'>
                    <h4 className='text-lg font-black tracking-tight uppercase'>
                        {t('admin_updates.integrity.title')}
                    </h4>
                    <p className='text-muted-foreground max-w-3xl text-xs leading-relaxed'>
                        {t('admin_updates.integrity.description')}
                        <span className='text-primary/70 mt-1 block font-bold italic'>
                            {t('admin_updates.integrity.note')}
                        </span>
                    </p>
                </div>
                <div className='flex shrink-0 flex-col gap-2'>
                    <a
                        href='https://docs.mythical.systems'
                        target='_blank'
                        rel='noopener noreferrer'
                        className='bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black tracking-widest uppercase transition-all'
                    >
                        {t('admin_updates.integrity.view_docs')}
                        <ExternalLink className='h-3 w-3' />
                    </a>
                </div>
            </div>
        </div>
    );
}

const Zap = ({ className }: { className?: string }) => (
    <svg
        xmlns='http://www.w3.org/2000/svg'
        width='24'
        height='24'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        className={className}
    >
        <polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2' />
    </svg>
);
