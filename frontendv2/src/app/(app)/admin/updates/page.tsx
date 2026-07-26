/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    10|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ArrowUpCircle,
    CheckCircle2,
    Download,
    Loader2,
    Package,
    RefreshCw,
    Search,
    Server,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Checkbox } from '@/components/ui/checkbox';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { adminSettingsApi } from '@/lib/admin-settings-api';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { toast } from 'sonner';
import {
    FEATHERPANEL_CATEGORY_SLUG,
    type StoreItem,
    comparePluginVersions,
    downloadAndInstall,
    extractStoreItems,
    mythicCloudErrorMessage,
    parseBlobError,
    pluginIdentifier,
    productSlug,
    resolveInstallVersion,
    storeLatestVersion,
} from '@/app/(app)/admin/feathercloud/products/_shared';

interface NodeRow {
    id: number;
    name: string;
    fqdn: string;
}

interface NodeVersionInfo {
    current_version?: string;
    latest_version?: string;
    update_available?: boolean;
    loading?: boolean;
    error?: string;
}

interface PluginRow {
    identifier: string;
    name: string;
    version: string;
    icon?: string;
}

interface PluginUpdateInfo {
    latest_version: string;
    update_available: boolean;
    store_slug?: string;
    can_download?: boolean;
}

function compactId(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findStoreMatch(plugin: PluginRow, items: StoreItem[]): StoreItem | null {
    const local = compactId(plugin.identifier);
    if (!local) return null;
    for (const item of items) {
        const id = compactId(pluginIdentifier(item.product));
        const slug = compactId(productSlug(item.product));
        if (id === local || slug === local) return item;
    }
    return null;
}

export default function AdminUpdatesPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { data: dashboardData, refresh: refreshDashboard } = useAdminDashboard();

    const [nodes, setNodes] = useState<NodeRow[]>([]);
    const [nodesLoading, setNodesLoading] = useState(true);
    const [nodeVersions, setNodeVersions] = useState<Record<number, NodeVersionInfo>>({});

    const [plugins, setPlugins] = useState<PluginRow[]>([]);
    const [pluginsLoading, setPluginsLoading] = useState(true);
    const [pluginUpdates, setPluginUpdates] = useState<Record<string, PluginUpdateInfo>>({});
    const [storeError, setStoreError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [pluginFilter, setPluginFilter] = useState<'updates' | 'all'>('updates');
    const [nodeFilter, setNodeFilter] = useState<'updates' | 'all'>('updates');

    const [selectedNodes, setSelectedNodes] = useState<Set<number>>(new Set());
    const [selectedPlugins, setSelectedPlugins] = useState<Set<string>>(new Set());

    const [isChecking, setIsChecking] = useState(false);
    const [isUpdatingPanel, setIsUpdatingPanel] = useState(false);
    const [updatingPluginId, setUpdatingPluginId] = useState<string | null>(null);
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    const panelVersion = dashboardData?.version;

    const fetchNodes = useCallback(async () => {
        setNodesLoading(true);
        try {
            const response = await axios.get('/api/admin/nodes?limit=100');
            setNodes(response.data?.data?.nodes || []);
        } catch {
            toast.error(t('admin_updates.wings.failed'));
            setNodes([]);
        } finally {
            setNodesLoading(false);
        }
    }, [t]);

    const fetchPlugins = useCallback(async (opts?: { silent?: boolean }): Promise<PluginRow[]> => {
        if (!opts?.silent) setPluginsLoading(true);
        try {
            const response = await axios.get('/api/admin/plugins');
            const list = Object.values(response.data?.data?.plugins || {}).map(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (entry: any) => ({
                    identifier: String(entry?.plugin?.identifier || ''),
                    name: String(entry?.plugin?.name || entry?.plugin?.identifier || ''),
                    version: String(entry?.plugin?.version || ''),
                    icon: entry?.plugin?.icon ? String(entry.plugin.icon) : undefined,
                }),
            );
            const cleaned = list.filter((p) => p.identifier);
            setPlugins(cleaned);
            return cleaned;
        } catch {
            setPlugins([]);
            return [];
        } finally {
            if (!opts?.silent) setPluginsLoading(false);
        }
    }, []);

    const checkNodeVersion = useCallback(async (id: number) => {
        setNodeVersions((prev) => ({
            ...prev,
            [id]: { ...prev[id], loading: true, error: undefined },
        }));
        try {
            const response = await axios.get(`/api/admin/nodes/${id}/version-status`);
            const data = response.data?.data || {};
            setNodeVersions((prev) => ({
                ...prev,
                [id]: {
                    current_version: data.current_version,
                    latest_version: data.latest_version,
                    update_available: Boolean(data.update_available),
                    loading: false,
                },
            }));
        } catch {
            setNodeVersions((prev) => ({
                ...prev,
                [id]: { ...prev[id], loading: false, error: 'Failed' },
            }));
        }
    }, []);

    const checkPluginUpdatesFromStore = useCallback(async (pluginList: PluginRow[]) => {
        setStoreError(null);
        if (pluginList.length === 0) {
            setPluginUpdates({});
            return;
        }

        try {
            const response = await axios.get('/api/admin/cloud/data/store', {
                params: {
                    page: 1,
                    limit: 100,
                    category: FEATHERPANEL_CATEGORY_SLUG,
                    type: 'product',
                },
            });
            const items = extractStoreItems(response.data?.data);
            const next: Record<string, PluginUpdateInfo> = {};

            for (const plugin of pluginList) {
                const match = findStoreMatch(plugin, items);
                if (!match?.product) continue;
                const latest = storeLatestVersion(match.product);
                if (!latest || !plugin.version) continue;
                next[plugin.identifier] = {
                    latest_version: latest,
                    update_available: comparePluginVersions(plugin.version, latest) < 0,
                    store_slug: productSlug(match.product) || undefined,
                    can_download: match.can_download === true,
                };
            }
            setPluginUpdates(next);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const code = err.response?.data?.error_code;
                if (code === 'CLOUD_CREDENTIALS_NOT_CONFIGURED' || err.response?.status === 503) {
                    setStoreError(
                        err.response?.data?.message ||
                            'Mythic Cloud is not linked. Connect under Cloud Connections to check plugin updates.',
                    );
                    setPluginUpdates({});
                    return;
                }
            }
            setStoreError(mythicCloudErrorMessage(err, 'Failed to check Mythic store for plugin updates'));
            setPluginUpdates({});
        }
    }, []);

    const checkAll = useCallback(async () => {
        setIsChecking(true);
        setSelectedNodes(new Set());
        setSelectedPlugins(new Set());
        try {
            await Promise.all([
                ...nodes.map((node) => checkNodeVersion(node.id)),
                checkPluginUpdatesFromStore(plugins),
                refreshDashboard(),
            ]);
        } finally {
            setIsChecking(false);
        }
    }, [nodes, plugins, checkNodeVersion, checkPluginUpdatesFromStore, refreshDashboard]);

    useEffect(() => {
        void fetchNodes();
        void fetchPlugins();
    }, [fetchNodes, fetchPlugins]);

    useEffect(() => {
        if (nodesLoading || pluginsLoading) return;
        void checkAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodesLoading, pluginsLoading, nodes.length, plugins.length]);

    const pluginUpdateCount = useMemo(
        () => Object.values(pluginUpdates).filter((u) => u.update_available).length,
        [pluginUpdates],
    );
    const nodeUpdateCount = useMemo(
        () => Object.values(nodeVersions).filter((v) => v.update_available).length,
        [nodeVersions],
    );

    const filteredPlugins = useMemo(() => {
        const q = search.trim().toLowerCase();
        return plugins.filter((plugin) => {
            const update = pluginUpdates[plugin.identifier];
            if (pluginFilter === 'updates' && !update?.update_available) return false;
            if (!q) return true;
            return `${plugin.name} ${plugin.identifier}`.toLowerCase().includes(q);
        });
    }, [plugins, pluginUpdates, pluginFilter, search]);

    const filteredNodes = useMemo(() => {
        const q = search.trim().toLowerCase();
        return nodes.filter((node) => {
            const version = nodeVersions[node.id];
            if (nodeFilter === 'updates' && !version?.update_available) return false;
            if (!q) return true;
            return `${node.name} ${node.fqdn}`.toLowerCase().includes(q);
        });
    }, [nodes, nodeVersions, nodeFilter, search]);

    const selectablePluginIds = useMemo(
        () =>
            filteredPlugins
                .filter((p) => pluginUpdates[p.identifier]?.update_available && pluginUpdates[p.identifier]?.can_download !== false)
                .map((p) => p.identifier),
        [filteredPlugins, pluginUpdates],
    );

    const selectableNodeIds = useMemo(
        () => filteredNodes.filter((n) => nodeVersions[n.id]?.update_available).map((n) => n.id),
        [filteredNodes, nodeVersions],
    );

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
        } catch {
            toast.error(t('admin_updates.messages.update_failed'));
        } finally {
            setIsUpdatingPanel(false);
        }
    };

    const updateOnePlugin = async (identifier: string) => {
        const plugin = plugins.find((p) => p.identifier === identifier);
        const update = pluginUpdates[identifier];
        if (!plugin || !update?.update_available) return;

        setUpdatingPluginId(identifier);
        try {
            if (update.store_slug && update.can_download !== false) {
                const version = await resolveInstallVersion(update.store_slug);
                if (!version) throw new Error('No downloadable release found.');
                await downloadAndInstall(update.store_slug, version);
            } else {
                await axios.post('/api/admin/plugins/online/install', {
                    identifier,
                    queued_identifiers: [identifier],
                });
            }
            toast.success(`Updated ${plugin.name || identifier} to v${update.latest_version}`);
            const refreshed = await fetchPlugins({ silent: true });
            await checkPluginUpdatesFromStore(refreshed);
        } catch (err) {
            toast.error(await parseBlobError(err, t('admin.plugins.messages.update_failed')));
        } finally {
            setUpdatingPluginId(null);
        }
    };

    const handleBulkUpdate = async () => {
        if (selectedNodes.size === 0 && selectedPlugins.size === 0) return;
        setIsBulkUpdating(true);
        const toastId = toast.loading(t('admin_updates.messages.bulk_starting'));

        let nodeOk = 0;
        let pluginOk = 0;
        let fail = 0;

        try {
            const nodeResults = await Promise.allSettled(
                [...selectedNodes].map((id) =>
                    axios.post(`/api/admin/nodes/${id}/self-update`, { source: 'github' }),
                ),
            );
            nodeOk = nodeResults.filter((r) => r.status === 'fulfilled').length;
            fail += nodeResults.filter((r) => r.status === 'rejected').length;

            for (const identifier of selectedPlugins) {
                try {
                    const update = pluginUpdates[identifier];
                    if (update?.store_slug && update.can_download !== false) {
                        const version = await resolveInstallVersion(update.store_slug);
                        if (!version) {
                            fail += 1;
                            continue;
                        }
                        await downloadAndInstall(update.store_slug, version);
                    } else {
                        await axios.post('/api/admin/plugins/online/install', {
                            identifier,
                            queued_identifiers: [...selectedPlugins],
                        });
                    }
                    pluginOk += 1;
                } catch {
                    fail += 1;
                }
            }

            if (fail === 0) {
                toast.success(t('admin_updates.messages.bulk_started'), { id: toastId });
            } else {
                toast.error(t('admin_updates.messages.bulk_failed'), { id: toastId });
            }

            setSelectedNodes(new Set());
            setSelectedPlugins(new Set());
            const refreshed = await fetchPlugins({ silent: true });
            await Promise.all([
                ...nodes.map((node) => checkNodeVersion(node.id)),
                checkPluginUpdatesFromStore(refreshed),
                refreshDashboard(),
            ]);
        } catch {
            toast.error(t('admin_updates.messages.bulk_failed'), { id: toastId });
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const selectionCount = selectedNodes.size + selectedPlugins.size;

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin_updates.title')}
                description={t('admin_updates.description')}
                icon={RefreshCw}
                actions={
                    <Button variant='outline' size='sm' onClick={() => void checkAll()} disabled={isChecking}>
                        {isChecking ? (
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        ) : (
                            <RefreshCw className='mr-2 h-4 w-4' />
                        )}
                        Check for updates
                    </Button>
                }
            />

            <div className='grid gap-3 sm:grid-cols-3'>
                <div className='bg-card/60 rounded-2xl px-4 py-3'>
                    <p className='text-muted-foreground text-xs'>Panel</p>
                    <p className='mt-1 text-sm font-medium'>
                        {panelVersion?.update_available
                            ? `Update to ${panelVersion?.latest?.version || '—'}`
                            : panelVersion?.current?.version
                              ? `Up to date · ${panelVersion.current.version}`
                              : 'Checking…'}
                    </p>
                </div>
                <div className='bg-card/60 rounded-2xl px-4 py-3'>
                    <p className='text-muted-foreground text-xs'>Plugins</p>
                    <p className='mt-1 text-sm font-medium'>
                        {pluginUpdateCount > 0
                            ? `${pluginUpdateCount} update${pluginUpdateCount === 1 ? '' : 's'} available`
                            : storeError
                              ? 'Store unavailable'
                              : 'Up to date'}
                    </p>
                </div>
                <div className='bg-card/60 rounded-2xl px-4 py-3'>
                    <p className='text-muted-foreground text-xs'>Wings</p>
                    <p className='mt-1 text-sm font-medium'>
                        {nodeUpdateCount > 0
                            ? `${nodeUpdateCount} node${nodeUpdateCount === 1 ? '' : 's'} need updates`
                            : 'Up to date'}
                    </p>
                </div>
            </div>

            <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
                <div className='relative min-w-0 flex-1'>
                    <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder='Search plugins or nodes…'
                        className='pl-9'
                    />
                </div>
                {selectionCount > 0 ? (
                    <div className='flex flex-wrap gap-2'>
                        <Button
                            size='sm'
                            variant='outline'
                            onClick={() => {
                                setSelectedNodes(new Set());
                                setSelectedPlugins(new Set());
                            }}
                        >
                            Clear
                        </Button>
                        <Button size='sm' onClick={() => void handleBulkUpdate()} disabled={isBulkUpdating}>
                            {isBulkUpdating ? (
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            ) : (
                                <Download className='mr-2 h-4 w-4' />
                            )}
                            Update selected ({selectionCount})
                        </Button>
                    </div>
                ) : null}
            </div>

            <PageCard
                title={t('admin_updates.panel.title')}
                description={
                    panelVersion?.update_available
                        ? t('admin_updates.panel.update_available')
                        : t('admin_updates.panel.up_to_date')
                }
                icon={ArrowUpCircle}
                action={
                    panelVersion?.update_available ? (
                        <Button size='sm' onClick={() => void handleUpdatePanel()} disabled={isUpdatingPanel}>
                            {isUpdatingPanel ? (
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            ) : (
                                <Download className='mr-2 h-4 w-4' />
                            )}
                            {t('admin_updates.panel.update_now')}
                        </Button>
                    ) : null
                }
            >
                <div className='flex flex-wrap items-end gap-8'>
                    <div>
                        <p className='text-muted-foreground text-xs'>{t('admin_updates.panel.current')}</p>
                        <p className='mt-1 text-lg font-medium'>{panelVersion?.current?.version || '—'}</p>
                    </div>
                    <div>
                        <p className='text-muted-foreground text-xs'>{t('admin_updates.panel.latest')}</p>
                        <p
                            className={cn(
                                'mt-1 text-lg font-medium',
                                panelVersion?.update_available && 'text-amber-600 dark:text-amber-400',
                            )}
                        >
                            {panelVersion?.latest?.version || panelVersion?.current?.version || '—'}
                        </p>
                    </div>
                    <div>
                        <p className='text-muted-foreground text-xs'>PHP</p>
                        <p className='mt-1 text-lg font-medium'>{panelVersion?.current?.php_version || '—'}</p>
                    </div>
                    {!panelVersion?.update_available ? (
                        <div className='text-muted-foreground ml-auto flex items-center gap-2 text-sm'>
                            <CheckCircle2 className='h-4 w-4 text-emerald-500' />
                            {t('admin_updates.panel.running_latest')}
                        </div>
                    ) : null}
                </div>
            </PageCard>

            <PageCard
                title={t('admin_updates.plugins.title')}
                description={
                    storeError
                        ? storeError
                        : pluginUpdateCount > 0
                          ? `${pluginUpdateCount} plugin${pluginUpdateCount === 1 ? '' : 's'} can be updated from Mythic`
                          : t('admin_updates.plugins.up_to_date')
                }
                icon={Package}
                action={
                    <div className='flex flex-wrap gap-2'>
                        {storeError ? (
                            <Button size='sm' variant='outline' onClick={() => router.push('/admin/cloud-management')}>
                                Cloud Connections
                            </Button>
                        ) : null}
                        <Button
                            size='sm'
                            variant='outline'
                            onClick={() => setSelectedPlugins(new Set(selectablePluginIds))}
                            disabled={selectablePluginIds.length === 0}
                        >
                            Select updates
                        </Button>
                        <Button
                            size='sm'
                            variant='outline'
                            onClick={() => router.push('/admin/feathercloud/products')}
                        >
                            Open store
                        </Button>
                    </div>
                }
            >
                <div className='mb-4 flex gap-2'>
                    {(['updates', 'all'] as const).map((key) => (
                        <Button
                            key={key}
                            size='sm'
                            variant={pluginFilter === key ? 'default' : 'outline'}
                            onClick={() => setPluginFilter(key)}
                        >
                            {key === 'updates' ? 'Needs update' : 'All installed'}
                        </Button>
                    ))}
                </div>

                {pluginsLoading || (isChecking && Object.keys(pluginUpdates).length === 0 && !storeError) ? (
                    <div className='text-muted-foreground flex items-center gap-2 py-10 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin' /> Checking plugin versions…
                    </div>
                ) : filteredPlugins.length === 0 ? (
                    <EmptyState
                        title={
                            pluginFilter === 'updates'
                                ? t('admin_updates.plugins.up_to_date')
                                : t('admin_updates.plugins.no_plugins')
                        }
                        description={
                            pluginFilter === 'updates'
                                ? 'Installed plugins match the latest Mythic releases we could resolve.'
                                : undefined
                        }
                        icon={Package}
                    />
                ) : (
                    <div className='divide-border/60 divide-y'>
                        {filteredPlugins.map((plugin) => {
                            const update = pluginUpdates[plugin.identifier];
                            const needsUpdate = Boolean(update?.update_available);
                            const checked = selectedPlugins.has(plugin.identifier);
                            const busy = updatingPluginId === plugin.identifier || isBulkUpdating;

                            return (
                                <div
                                    key={plugin.identifier}
                                    className='flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0'
                                >
                                    <Checkbox
                                        checked={checked}
                                        disabled={!needsUpdate || busy || update?.can_download === false}
                                        onCheckedChange={(value) => {
                                            setSelectedPlugins((prev) => {
                                                const next = new Set(prev);
                                                if (value) next.add(plugin.identifier);
                                                else next.delete(plugin.identifier);
                                                return next;
                                            });
                                        }}
                                    />
                                    <div className='bg-muted flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg'>
                                        {plugin.icon ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={plugin.icon} alt='' className='h-full w-full object-cover' />
                                        ) : (
                                            <Package className='text-muted-foreground h-4 w-4' />
                                        )}
                                    </div>
                                    <div className='min-w-0 flex-1'>
                                        <p className='truncate text-sm font-medium'>{plugin.name || plugin.identifier}</p>
                                        <p className='text-muted-foreground truncate font-mono text-[11px]'>
                                            {plugin.identifier}
                                        </p>
                                    </div>
                                    <div className='text-muted-foreground text-xs'>
                                        v{plugin.version}
                                        {needsUpdate ? (
                                            <span className='text-amber-600 dark:text-amber-400'>
                                                {' '}
                                                → v{update?.latest_version}
                                            </span>
                                        ) : update?.latest_version ? (
                                            <span> · current</span>
                                        ) : (
                                            <span> · not in store</span>
                                        )}
                                    </div>
                                    {needsUpdate ? (
                                        <Button
                                            size='sm'
                                            disabled={busy || update?.can_download === false}
                                            onClick={() => void updateOnePlugin(plugin.identifier)}
                                        >
                                            {updatingPluginId === plugin.identifier ? (
                                                <Loader2 className='mr-2 h-3.5 w-3.5 animate-spin' />
                                            ) : (
                                                <Download className='mr-2 h-3.5 w-3.5' />
                                            )}
                                            Update
                                        </Button>
                                    ) : (
                                        <span className='text-muted-foreground inline-flex items-center gap-1 text-xs'>
                                            <CheckCircle2 className='h-3.5 w-3.5 text-emerald-500' />
                                            {update?.latest_version ? 'Up to date' : 'No match'}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </PageCard>

            <PageCard
                title={t('admin_updates.wings.title')}
                description={t('admin_updates.wings.description')}
                icon={Server}
                action={
                    <Button
                        size='sm'
                        variant='outline'
                        onClick={() => setSelectedNodes(new Set(selectableNodeIds))}
                        disabled={selectableNodeIds.length === 0}
                    >
                        Select updates
                    </Button>
                }
            >
                <div className='mb-4 flex gap-2'>
                    {(['updates', 'all'] as const).map((key) => (
                        <Button
                            key={key}
                            size='sm'
                            variant={nodeFilter === key ? 'default' : 'outline'}
                            onClick={() => setNodeFilter(key)}
                        >
                            {key === 'updates' ? 'Needs update' : 'All nodes'}
                        </Button>
                    ))}
                </div>

                {nodesLoading ? (
                    <div className='text-muted-foreground flex items-center gap-2 py-10 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin' /> Loading nodes…
                    </div>
                ) : filteredNodes.length === 0 ? (
                    <EmptyState
                        title={
                            nodeFilter === 'updates'
                                ? t('admin_updates.wings.up_to_date')
                                : t('admin_updates.wings.no_nodes')
                        }
                        icon={Server}
                    />
                ) : (
                    <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                        {filteredNodes.map((node) => {
                            const version = nodeVersions[node.id];
                            const needsUpdate = Boolean(version?.update_available);
                            const checked = selectedNodes.has(node.id);

                            return (
                                <div
                                    key={node.id}
                                    className={cn(
                                        'bg-muted/20 rounded-2xl p-4',
                                        checked && 'ring-primary/40 ring-1',
                                    )}
                                >
                                    <div className='flex items-start gap-3'>
                                        <Checkbox
                                            checked={checked}
                                            disabled={!needsUpdate || isBulkUpdating}
                                            onCheckedChange={(value) => {
                                                setSelectedNodes((prev) => {
                                                    const next = new Set(prev);
                                                    if (value) next.add(node.id);
                                                    else next.delete(node.id);
                                                    return next;
                                                });
                                            }}
                                        />
                                        <div className='min-w-0 flex-1'>
                                            <p className='truncate text-sm font-medium'>{node.name}</p>
                                            <p className='text-muted-foreground truncate text-xs'>{node.fqdn}</p>
                                            <p className='text-muted-foreground mt-2 text-xs'>
                                                {version?.loading ? (
                                                    <span className='inline-flex items-center gap-1'>
                                                        <Loader2 className='h-3 w-3 animate-spin' />
                                                        Checking…
                                                    </span>
                                                ) : version?.error ? (
                                                    version.error
                                                ) : (
                                                    <>
                                                        v{version?.current_version || '—'}
                                                        {needsUpdate ? (
                                                            <span className='text-amber-600 dark:text-amber-400'>
                                                                {' '}
                                                                → v{version?.latest_version}
                                                            </span>
                                                        ) : (
                                                            <span> · current</span>
                                                        )}
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                        {needsUpdate ? (
                                            <span className='rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400'>
                                                Update
                                            </span>
                                        ) : !version?.loading && !version?.error ? (
                                            <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-500' />
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </PageCard>
        </div>
    );
}
