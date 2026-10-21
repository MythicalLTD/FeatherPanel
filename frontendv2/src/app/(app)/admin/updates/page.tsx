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

import React, { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import {
    ArrowRight,
    ArrowUpCircle,
    DatabaseBackup,
    Download,
    FileText,
    ListChecks,
    Loader2,
    Package,
    RefreshCw,
    Search,
    Server,
    ShieldCheck,
} from 'lucide-react';
import { DataTable, StatusDot, TableIdentity, type DataTableColumn } from '@/components/featherui/DataTable';
import { TipCard, TipGrid } from '@/components/featherui/TipCard';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Checkbox } from '@/components/ui/checkbox';
import { ReleaseNotesPanel } from '@/components/admin/ReleaseNotesPanel';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { adminSettingsApi } from '@/lib/admin-settings-api';
import { getApiErrorMessage, getApiErrorMessageFromPayload } from '@/lib/api-errors';
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
import { Sensitive } from '@/components/common/Sensitive';

interface NodeRow {
    id: number;
    name: string;
    fqdn: string;
}

interface NodeVersionInfo {
    current_version?: string;
    latest_version?: string;
    update_available?: boolean;
    self_update_supported?: boolean;
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
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
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
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'admin_updates.wings.failed'));
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
            const selfUpdateSupported = data.self_update_supported !== false;
            setNodeVersions((prev) => ({
                ...prev,
                [id]: {
                    current_version: data.current_version,
                    latest_version: data.latest_version,
                    update_available: Boolean(data.update_available),
                    self_update_supported: selfUpdateSupported,
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

    const checkPluginUpdatesFromStore = useCallback(
        async (pluginList: PluginRow[]) => {
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
                        setStoreError(getApiErrorMessage(err, t, 'admin_updates.messages.cloud_not_linked'));
                        setPluginUpdates({});
                        return;
                    }
                }
                setStoreError(mythicCloudErrorMessage(err, t('admin_updates.messages.store_check_failed'), t));
                setPluginUpdates({});
            }
        },
        [t],
    );

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
                .filter(
                    (p) =>
                        pluginUpdates[p.identifier]?.update_available &&
                        pluginUpdates[p.identifier]?.can_download !== false,
                )
                .map((p) => p.identifier),
        [filteredPlugins, pluginUpdates],
    );

    const selectableNodeIds = useMemo(
        () =>
            filteredNodes
                .filter((n) => {
                    const version = nodeVersions[n.id];
                    return version?.update_available && version?.self_update_supported !== false;
                })
                .map((n) => n.id),
        [filteredNodes, nodeVersions],
    );

    const handleUpdatePanel = async () => {
        if (isUpdatingPanel) return;
        setIsUpdatingPanel(true);
        try {
            const response = await adminSettingsApi.triggerDockerUpdate();
            if (response.success) {
                toast.success(t('admin_updates.messages.update_started'));
            } else {
                toast.error(getApiErrorMessageFromPayload(response, t, 'admin_updates.messages.update_failed'));
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'admin_updates.messages.update_failed'));
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
                if (!version) throw new Error(t('admin.marketplace.plugins.toasts.no_release'));
                await downloadAndInstall(update.store_slug, version);
            } else {
                await axios.post('/api/admin/plugins/online/install', {
                    identifier,
                    queued_identifiers: [identifier],
                });
            }
            toast.success(
                t('admin.marketplace.plugins.toasts.updated', {
                    name: plugin.name || identifier,
                    version: update.latest_version,
                }),
            );
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

        let fail = 0;

        try {
            const nodeIds = [...selectedNodes].filter((id) => nodeVersions[id]?.self_update_supported !== false);
            const nodeResults = await Promise.allSettled(
                nodeIds.map((id) => axios.post(`/api/admin/nodes/${id}/self-update`, { source: 'github' })),
            );
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
        } catch (error) {
            toast.error(getApiErrorMessage(error, t, 'admin_updates.messages.bulk_failed'), { id: toastId });
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const selectionCount = selectedNodes.size + selectedPlugins.size;
    const panelUpdate = Boolean(panelVersion?.update_available);
    const currentVersion = panelVersion?.current?.version || '-';
    const latestVersion = panelVersion?.latest?.version || panelVersion?.current?.version || '-';
    const channel = panelVersion?.current?.type || panelVersion?.project?.default_type || 'Stable';
    const phpLabel = (
        panelVersion?.current?.php_version ||
        [panelVersion?.project?.min_supported_php, panelVersion?.project?.max_supported_php]
            .filter(Boolean)
            .join(' to ') ||
        '-'
    ).replace(/\s*[\u2013\u2014]\s*/g, ' to ');

    const pluginColumns: DataTableColumn<PluginRow>[] = [
        {
            key: 'select',
            header: '',
            className: 'w-10',
            cell: (plugin) => (
                <PluginCheckbox
                    plugin={plugin}
                    update={pluginUpdates[plugin.identifier]}
                    checked={selectedPlugins.has(plugin.identifier)}
                    disabled={isBulkUpdating || updatingPluginId !== null}
                    onChange={(value) =>
                        setSelectedPlugins((prev) => {
                            const next = new Set(prev);
                            if (value) next.add(plugin.identifier);
                            else next.delete(plugin.identifier);
                            return next;
                        })
                    }
                />
            ),
        },
        {
            key: 'plugin',
            header: t('admin_updates.plugins.column_plugin'),
            cell: (plugin) => (
                <TableIdentity
                    title={plugin.name || plugin.identifier}
                    subtitle={plugin.identifier}
                    avatarUrl={plugin.icon}
                    icon={Package}
                />
            ),
        },
        {
            key: 'version',
            header: t('admin_updates.column_version'),
            cell: (plugin) => <VersionPair from={plugin.version} to={pluginUpdates[plugin.identifier]} />,
        },
        {
            key: 'status',
            header: t('admin_updates.column_status'),
            cell: (plugin) => <PluginStatus update={pluginUpdates[plugin.identifier]} t={t} />,
        },
    ];

    const nodeColumns: DataTableColumn<NodeRow>[] = [
        {
            key: 'select',
            header: '',
            className: 'w-10',
            cell: (node) => {
                const version = nodeVersions[node.id];
                return (
                    <Checkbox
                        checked={selectedNodes.has(node.id)}
                        disabled={
                            !version?.update_available || version?.self_update_supported === false || isBulkUpdating
                        }
                        onCheckedChange={(value) =>
                            setSelectedNodes((prev) => {
                                const next = new Set(prev);
                                if (value) next.add(node.id);
                                else next.delete(node.id);
                                return next;
                            })
                        }
                    />
                );
            },
        },
        {
            key: 'node',
            header: t('admin_updates.wings.column_node'),
            cell: (node) => (
                <TableIdentity title={node.name} subtitle={<Sensitive>{node.fqdn}</Sensitive>} icon={Server} />
            ),
        },
        {
            key: 'version',
            header: t('admin_updates.column_version'),
            cell: (node) => <NodeVersion info={nodeVersions[node.id]} t={t} />,
        },
        {
            key: 'status',
            header: t('admin_updates.column_status'),
            cell: (node) => <NodeStatus info={nodeVersions[node.id]} t={t} />,
        },
    ];

    const steps = [
        { icon: DatabaseBackup, key: 'backup' },
        { icon: FileText, key: 'changelog' },
        { icon: Download, key: 'update' },
        { icon: ListChecks, key: 'verify' },
    ] as const;

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
                        {t('admin_updates.check_for_updates')}
                    </Button>
                }
            />

            <section className='fp-surface relative overflow-hidden rounded-2xl border p-5 sm:p-6'>
                <div className='flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between'>
                    <div className='flex min-w-0 gap-4'>
                        <div
                            className={cn(
                                'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                                panelUpdate ? 'fp-icon-tile' : 'bg-emerald-500/10 text-emerald-500',
                            )}
                        >
                            {panelUpdate ? <ArrowUpCircle className='h-6 w-6' /> : <ShieldCheck className='h-6 w-6' />}
                        </div>
                        <div className='min-w-0 space-y-3'>
                            <div>
                                <h2 className='text-lg font-semibold tracking-tight'>
                                    {!panelVersion
                                        ? t('admin_updates.overview.checking')
                                        : panelUpdate
                                          ? t('admin_updates.hero.available_title', { version: latestVersion })
                                          : t('admin_updates.hero.latest_title')}
                                </h2>
                                <p className='text-muted-foreground text-sm'>
                                    {panelUpdate
                                        ? t('admin_updates.panel.update_available')
                                        : t('admin_updates.hero.latest_body')}
                                </p>
                            </div>
                            <div className='flex flex-wrap items-center gap-2'>
                                <VersionChip label={t('admin_updates.panel.current')} value={currentVersion} />
                                {panelUpdate ? (
                                    <>
                                        <ArrowRight className='text-muted-foreground h-4 w-4' />
                                        <VersionChip
                                            label={t('admin_updates.panel.latest')}
                                            value={latestVersion}
                                            highlight
                                        />
                                    </>
                                ) : null}
                                {panelVersion?.latest?.is_security_release ||
                                panelVersion?.current?.is_security_release ? (
                                    <span className='rounded-full border border-rose-500/25 bg-rose-500/[0.06] px-2.5 py-1 text-xs font-medium text-rose-500'>
                                        {t('admin.version.security_release')}
                                    </span>
                                ) : null}
                                {panelVersion?.current_listed_on_update_server === false ? (
                                    <span className='rounded-full border border-amber-500/25 bg-amber-500/[0.06] px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400'>
                                        {t('admin.version.unlisted_update_server_badge')}
                                    </span>
                                ) : null}
                            </div>
                            <dl className='text-muted-foreground flex flex-wrap gap-x-6 gap-y-1 text-xs'>
                                <div className='flex gap-1.5'>
                                    <dt>{t('admin_updates.hero.channel')}</dt>
                                    <dd className='text-foreground font-medium'>{channel}</dd>
                                </div>
                                <div className='flex gap-1.5'>
                                    <dt>{t('admin_updates.hero.php')}</dt>
                                    <dd className='text-foreground font-medium'>
                                        {phpLabel}
                                        {panelVersion?.runtime_php
                                            ? ` (${t('admin_updates.hero.running', { version: panelVersion.runtime_php })})`
                                            : ''}
                                    </dd>
                                </div>
                                {panelVersion?.last_checked ? (
                                    <div className='flex gap-1.5'>
                                        <dt>{t('admin_updates.hero.checked')}</dt>
                                        <dd className='text-foreground font-medium'>
                                            {new Date(panelVersion.last_checked).toLocaleString()}
                                        </dd>
                                    </div>
                                ) : null}
                            </dl>
                        </div>
                    </div>
                    <div className='shrink-0'>
                        {panelUpdate ? (
                            <Button size='lg' onClick={() => void handleUpdatePanel()} disabled={isUpdatingPanel}>
                                {isUpdatingPanel ? (
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                ) : (
                                    <Download className='mr-2 h-4 w-4' />
                                )}
                                {t('admin_updates.panel.update_now')}
                            </Button>
                        ) : panelVersion ? (
                            <StatusDot tone='success'>{t('admin_updates.panel.running_latest')}</StatusDot>
                        ) : null}
                    </div>
                </div>
            </section>

            <div className='grid gap-3 sm:grid-cols-3'>
                <SummaryTile
                    icon={ArrowUpCircle}
                    label={t('admin_updates.overview.panel')}
                    tone={panelUpdate ? 'warning' : 'success'}
                    value={
                        panelUpdate
                            ? t('admin_updates.overview.update_to', { version: latestVersion })
                            : panelVersion?.current?.version
                              ? t('admin_updates.overview.up_to_date_version', { version: currentVersion })
                              : t('admin_updates.overview.checking')
                    }
                />
                <SummaryTile
                    icon={Package}
                    label={t('admin_updates.overview.plugins')}
                    tone={pluginUpdateCount > 0 ? 'warning' : storeError ? 'muted' : 'success'}
                    value={
                        pluginUpdateCount > 0
                            ? t(
                                  pluginUpdateCount === 1
                                      ? 'admin_updates.overview.plugin_update_available_one'
                                      : 'admin_updates.overview.plugin_updates_available',
                                  { count: String(pluginUpdateCount) },
                              )
                            : storeError
                              ? t('admin_updates.overview.store_unavailable')
                              : t('admin_updates.overview.up_to_date')
                    }
                />
                <SummaryTile
                    icon={Server}
                    label={t('admin_updates.overview.wings')}
                    tone={nodeUpdateCount > 0 ? 'warning' : 'success'}
                    value={
                        nodeUpdateCount > 0
                            ? t(
                                  nodeUpdateCount === 1
                                      ? 'admin_updates.overview.node_needs_updates_one'
                                      : 'admin_updates.overview.nodes_need_updates',
                                  { count: String(nodeUpdateCount) },
                              )
                            : t('admin_updates.overview.up_to_date')
                    }
                />
            </div>

            <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]'>
                <PageCard title={t('admin_updates.changelog.title')} icon={FileText}>
                    <ReleaseNotesPanel
                        current={panelVersion?.current}
                        latest={panelVersion?.latest}
                        updateAvailable={panelUpdate}
                        embedded
                    />
                </PageCard>
                <PageCard title={t('admin_updates.steps.title')} icon={ListChecks}>
                    <ol className='space-y-4'>
                        {steps.map((step, index) => (
                            <li key={step.key} className='flex gap-3'>
                                <span className='fp-icon-tile flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold'>
                                    {index + 1}
                                </span>
                                <div className='min-w-0'>
                                    <p className='flex items-center gap-1.5 text-sm font-medium'>
                                        <step.icon className='text-muted-foreground h-3.5 w-3.5' />
                                        {t(STEP_TITLES[step.key])}
                                    </p>
                                    <p className='text-muted-foreground mt-0.5 text-xs leading-relaxed'>
                                        {t(STEP_BODIES[step.key])}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </PageCard>
            </div>

            <div className='fp-surface flex flex-col gap-3 rounded-xl border p-2 sm:flex-row sm:items-center'>
                <div className='relative min-w-0 flex-1'>
                    <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t('admin_updates.search_placeholder')}
                        className='border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0'
                    />
                </div>
                {selectionCount > 0 ? (
                    <div className='flex flex-wrap gap-2 px-1'>
                        <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => {
                                setSelectedNodes(new Set());
                                setSelectedPlugins(new Set());
                            }}
                        >
                            {t('admin_updates.clear_selection')}
                        </Button>
                        <Button size='sm' onClick={() => void handleBulkUpdate()} disabled={isBulkUpdating}>
                            {isBulkUpdating ? (
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            ) : (
                                <Download className='mr-2 h-4 w-4' />
                            )}
                            {t('admin_updates.update_selected_count', { count: String(selectionCount) })}
                        </Button>
                    </div>
                ) : null}
            </div>

            <PageCard
                title={t('admin_updates.plugins.title')}
                description={
                    storeError
                        ? storeError
                        : pluginUpdateCount > 0
                          ? t(
                                pluginUpdateCount === 1
                                    ? 'admin_updates.plugins.can_update_from_mythic_one'
                                    : 'admin_updates.plugins.can_update_from_mythic',
                                { count: String(pluginUpdateCount) },
                            )
                          : t('admin_updates.plugins.up_to_date')
                }
                icon={Package}
                action={
                    <div className='flex flex-wrap items-center gap-2'>
                        <FilterTabs
                            value={pluginFilter}
                            onChange={setPluginFilter}
                            updatesLabel={t('admin_updates.plugins.filter_needs_update')}
                            allLabel={t('admin_updates.plugins.filter_all')}
                        />
                        {storeError ? (
                            <Button size='sm' variant='outline' onClick={() => router.push('/admin/cloud-management')}>
                                {t('admin_updates.cloud_connections')}
                            </Button>
                        ) : null}
                        <Button
                            size='sm'
                            variant='outline'
                            onClick={() => setSelectedPlugins(new Set(selectablePluginIds))}
                            disabled={selectablePluginIds.length === 0}
                        >
                            {t('admin_updates.select_updates')}
                        </Button>
                        <Button size='sm' variant='outline' onClick={() => router.push('/admin/feathercloud/products')}>
                            {t('admin_updates.open_store')}
                        </Button>
                    </div>
                }
            >
                {pluginsLoading || (isChecking && Object.keys(pluginUpdates).length === 0 && !storeError) ? (
                    <div className='text-muted-foreground flex items-center gap-2 py-10 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin' /> {t('admin_updates.plugins.checking')}
                    </div>
                ) : filteredPlugins.length === 0 ? (
                    <EmptyState
                        title={
                            pluginFilter === 'updates'
                                ? t('admin_updates.plugins.up_to_date')
                                : t('admin_updates.plugins.no_plugins')
                        }
                        description={
                            pluginFilter === 'updates' ? t('admin_updates.plugins.up_to_date_description') : undefined
                        }
                        icon={Package}
                    />
                ) : (
                    <DataTable
                        rows={filteredPlugins}
                        columns={pluginColumns}
                        rowKey={(plugin) => plugin.identifier}
                        actionsHeader={t('common.actions')}
                        actions={(plugin) => {
                            const update = pluginUpdates[plugin.identifier];
                            if (!update?.update_available) return null;
                            return (
                                <Button
                                    size='sm'
                                    disabled={
                                        isBulkUpdating || updatingPluginId !== null || update.can_download === false
                                    }
                                    onClick={() => void updateOnePlugin(plugin.identifier)}
                                >
                                    {updatingPluginId === plugin.identifier ? (
                                        <Loader2 className='mr-2 h-3.5 w-3.5 animate-spin' />
                                    ) : (
                                        <Download className='mr-2 h-3.5 w-3.5' />
                                    )}
                                    {t('admin_updates.plugins.update')}
                                </Button>
                            );
                        }}
                        mobileCard={(plugin) => (
                            <div className='space-y-2'>
                                <TableIdentity
                                    title={plugin.name || plugin.identifier}
                                    subtitle={plugin.identifier}
                                    avatarUrl={plugin.icon}
                                    icon={Package}
                                />
                                <div className='flex items-center justify-between gap-2'>
                                    <VersionPair from={plugin.version} to={pluginUpdates[plugin.identifier]} />
                                    <PluginStatus update={pluginUpdates[plugin.identifier]} t={t} />
                                </div>
                            </div>
                        )}
                    />
                )}
            </PageCard>

            <PageCard
                title={t('admin_updates.wings.title')}
                description={t('admin_updates.wings.description')}
                icon={Server}
                action={
                    <div className='flex flex-wrap items-center gap-2'>
                        <FilterTabs
                            value={nodeFilter}
                            onChange={setNodeFilter}
                            updatesLabel={t('admin_updates.wings.filter_needs_update')}
                            allLabel={t('admin_updates.wings.filter_all')}
                        />
                        <Button
                            size='sm'
                            variant='outline'
                            onClick={() => setSelectedNodes(new Set(selectableNodeIds))}
                            disabled={selectableNodeIds.length === 0}
                        >
                            {t('admin_updates.select_updates')}
                        </Button>
                    </div>
                }
            >
                {nodesLoading ? (
                    <div className='text-muted-foreground flex items-center gap-2 py-10 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin' /> {t('admin_updates.wings.loading')}
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
                    <DataTable
                        rows={filteredNodes}
                        columns={nodeColumns}
                        rowKey={(node) => node.id}
                        mobileCard={(node) => (
                            <div className='space-y-2'>
                                <TableIdentity
                                    title={node.name}
                                    subtitle={<Sensitive>{node.fqdn}</Sensitive>}
                                    icon={Server}
                                />
                                <div className='flex items-center justify-between gap-2'>
                                    <NodeVersion info={nodeVersions[node.id]} t={t} />
                                    <NodeStatus info={nodeVersions[node.id]} t={t} />
                                </div>
                            </div>
                        )}
                    />
                )}
            </PageCard>

            <TipGrid>
                <TipCard title={t('admin_updates.tips.backup_title')} icon={DatabaseBackup} variant='warning'>
                    <p>{t('admin_updates.tips.backup_body')}</p>
                </TipCard>
                <TipCard title={t('admin_updates.tips.plugins_title')} icon={Package}>
                    <p>{t('admin_updates.tips.plugins_body')}</p>
                </TipCard>
                <TipCard title={t('admin_updates.tips.wings_title')} icon={Server}>
                    <p>{t('admin_updates.tips.wings_body')}</p>
                </TipCard>
            </TipGrid>
        </div>
    );
}

type TFn = (key: string, params?: Record<string, string>) => string;

const STEP_TITLES = {
    backup: 'admin_updates.steps.backup_title',
    changelog: 'admin_updates.steps.changelog_title',
    update: 'admin_updates.steps.update_title',
    verify: 'admin_updates.steps.verify_title',
} as const;

const STEP_BODIES = {
    backup: 'admin_updates.steps.backup_body',
    changelog: 'admin_updates.steps.changelog_body',
    update: 'admin_updates.steps.update_body',
    verify: 'admin_updates.steps.verify_body',
} as const;

function VersionChip({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs',
                highlight
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'fp-surface-inset border-[var(--fp-surface-border)]',
            )}
        >
            <span className={highlight ? 'text-primary/80' : 'text-muted-foreground'}>{label}</span>
            <span className='font-mono font-semibold'>v{value}</span>
        </span>
    );
}

function SummaryTile({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    value: string;
    tone: 'success' | 'warning' | 'muted';
}) {
    return (
        <div className='fp-surface flex items-center gap-3 rounded-xl border px-4 py-3'>
            <div className='fp-icon-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-lg'>
                <Icon className='h-4 w-4' />
            </div>
            <div className='min-w-0'>
                <p className='text-muted-foreground text-xs'>{label}</p>
                <StatusDot tone={tone} className='mt-0.5 text-sm font-medium'>
                    {value}
                </StatusDot>
            </div>
        </div>
    );
}

function FilterTabs({
    value,
    onChange,
    updatesLabel,
    allLabel,
}: {
    value: 'updates' | 'all';
    onChange: (value: 'updates' | 'all') => void;
    updatesLabel: string;
    allLabel: string;
}) {
    return (
        <div className='fp-surface-inset inline-flex rounded-lg border p-0.5'>
            {(['updates', 'all'] as const).map((key) => (
                <button
                    key={key}
                    type='button'
                    onClick={() => onChange(key)}
                    className={cn(
                        'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                        value === key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {key === 'updates' ? updatesLabel : allLabel}
                </button>
            ))}
        </div>
    );
}

function VersionPair({ from, to }: { from: string; to?: PluginUpdateInfo }) {
    return (
        <span className='inline-flex items-center gap-1.5 font-mono text-xs'>
            <span className='text-muted-foreground'>v{from}</span>
            {to?.update_available ? (
                <>
                    <ArrowRight className='text-muted-foreground h-3 w-3' />
                    <span className='text-primary font-semibold'>v{to.latest_version}</span>
                </>
            ) : null}
        </span>
    );
}

function PluginStatus({ update, t }: { update?: PluginUpdateInfo; t: TFn }) {
    if (update?.update_available) {
        return <StatusDot tone='warning'>{t('admin_updates.status.update_available')}</StatusDot>;
    }
    if (update?.latest_version) {
        return <StatusDot tone='success'>{t('admin_updates.plugins.status_up_to_date')}</StatusDot>;
    }
    return <StatusDot tone='muted'>{t('admin_updates.plugins.status_no_match')}</StatusDot>;
}

function PluginCheckbox({
    update,
    checked,
    disabled,
    onChange,
}: {
    plugin: PluginRow;
    update?: PluginUpdateInfo;
    checked: boolean;
    disabled: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <Checkbox
            checked={checked}
            disabled={!update?.update_available || update?.can_download === false || disabled}
            onCheckedChange={(value) => onChange(Boolean(value))}
        />
    );
}

function NodeVersion({ info, t }: { info?: NodeVersionInfo; t: TFn }) {
    if (info?.loading) {
        return (
            <span className='text-muted-foreground inline-flex items-center gap-1 text-xs'>
                <Loader2 className='h-3 w-3 animate-spin' />
                {t('ui.admin.updates.checking')}
            </span>
        );
    }
    if (info?.error || !info) return <span className='text-muted-foreground text-xs'>-</span>;
    return (
        <span className='inline-flex items-center gap-1.5 font-mono text-xs'>
            <span className='text-muted-foreground'>v{info.current_version || '-'}</span>
            {info.update_available ? (
                <>
                    <ArrowRight className='text-muted-foreground h-3 w-3' />
                    <span className='text-primary font-semibold'>v{info.latest_version}</span>
                </>
            ) : null}
        </span>
    );
}

function NodeStatus({ info, t }: { info?: NodeVersionInfo; t: TFn }) {
    if (!info || info.loading) return null;
    if (info.error) return <StatusDot tone='danger'>{t('admin_updates.status.unreachable')}</StatusDot>;
    if (info.update_available && info.self_update_supported === false) {
        return <StatusDot tone='warning'>{t('admin_updates.wings.manual_update_required')}</StatusDot>;
    }
    if (info.update_available) {
        return <StatusDot tone='warning'>{t('admin_updates.status.update_available')}</StatusDot>;
    }
    return <StatusDot tone='success'>{t('admin_updates.status.up_to_date')}</StatusDot>;
}
