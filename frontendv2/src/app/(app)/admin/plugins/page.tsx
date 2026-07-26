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

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import axios from 'axios';
import { invalidatePluginRoutesCache } from '@/hooks/usePluginRoutes';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Sheet, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertCircle,
    RefreshCw,
    Settings,
    Globe,
    Puzzle,
    Trash2,
    Upload,
    Save,
    Plus,
    AlertTriangle,
    X,
    Search,
    ChevronLeft,
    ChevronRight,
    Store,
    Download,
    CheckCircle2,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { cn } from '@/lib/utils';
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

interface ConfigField {
    name: string;
    display_name: string;
    type: 'text' | 'email' | 'url' | 'password' | 'number' | 'boolean';
    description: string;
    required: boolean;
    validation: {
        regex?: string;
        message?: string;
        min?: number;
        max?: number;
    };
    default: string;
}

interface Plugin {
    identifier: string;
    name?: string;
    version?: string;
    author?: string;
    description?: string;
    website?: string;
    icon?: string;
    flags?: string[];
    target?: string;
    requiredConfigs?: unknown[];
    dependencies?: string[];
    loaded?: boolean;
    unmetDependencies?: string[];
    missingConfigs?: string[];
    configSchema?: ConfigField[];
}

interface PluginConfig {
    config: Plugin;
    plugin: Plugin;
    settings: Record<string, string>;
    configSchema?: ConfigField[];
    allowedOnlyOnSpells?: number[];
}

interface PluginStoreUpdate {
    latest_version: string;
    store_slug: string;
    can_download: boolean;
    update_available: boolean;
}

function compactId(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
}

function findStoreMatch(plugin: Plugin, items: StoreItem[]): StoreItem | null {
    const local = compactId(plugin.identifier);
    if (!local) return null;
    for (const item of items) {
        const id = compactId(pluginIdentifier(item.product));
        const slug = compactId(productSlug(item.product));
        if (id === local || slug === local) return item;
    }
    return null;
}

export default function PluginsPage() {
    const { t } = useTranslation();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'updates' | 'issues'>('all');

    const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
    const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);

    const [configLoading, setConfigLoading] = useState(false);
    const [configError, setConfigError] = useState<string | null>(null);
    const [pluginConfig, setPluginConfig] = useState<PluginConfig | null>(null);
    const [savingSetting, setSavingSetting] = useState(false);

    const [selectedSpellIds, setSelectedSpellIds] = useState<Set<number>>(new Set());
    const [selectedSpellsDetails, setSelectedSpellsDetails] = useState<
        Array<{ id: number; name: string; description?: string }>
    >([]);
    const [spellSearchQuery, setSpellSearchQuery] = useState('');
    const [spellPage, setSpellPage] = useState(1);
    const [spells, setSpells] = useState<Array<{ id: number; name: string; description?: string }>>([]);
    const [spellsLoading, setSpellsLoading] = useState(false);
    const [, setSpellsTotal] = useState(0);
    const [spellsTotalPages, setSpellsTotalPages] = useState(1);
    const [savingSpellRestrictions, setSavingSpellRestrictions] = useState(false);

    const [installUrl, setInstallUrl] = useState('');
    const [installingFromUrl, setInstallingFromUrl] = useState(false);
    const [confirmUninstallOpen, setConfirmUninstallOpen] = useState(false);
    const [confirmUrlOpen, setConfirmUrlOpen] = useState(false);
    const [confirmUploadOpen, setConfirmUploadOpen] = useState(false);
    const [selectedPluginForUninstall, setSelectedPluginForUninstall] = useState<Plugin | null>(null);
    const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);

    const [storeUpdates, setStoreUpdates] = useState<Record<string, PluginStoreUpdate>>({});
    const [storeError, setStoreError] = useState<string | null>(null);
    const [updateCheckLoading, setUpdateCheckLoading] = useState(false);
    const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
    const [pendingUpdatePlugin, setPendingUpdatePlugin] = useState<Plugin | null>(null);
    const [installingUpdateId, setInstallingUpdateId] = useState<string | null>(null);
    const [bulkUpdatingPlugins, setBulkUpdatingPlugins] = useState(false);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-plugins');

    const fetchPlugins = useCallback(
        async (opts?: { silent?: boolean }) => {
            if (!opts?.silent) setLoading(true);
            try {
                const response = await axios.get('/api/admin/plugins');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const pluginsArray = Object.values(response.data.data.plugins || {}).map((pluginData: any) => {
                    const plugin = pluginData.plugin;
                    return {
                        identifier: plugin.identifier,
                        name: plugin.name,
                        version: plugin.version,
                        author: Array.isArray(plugin.author) ? plugin.author.join(', ') : plugin.author,
                        description: plugin.description,
                        website: plugin.website,
                        icon: plugin.icon,
                        flags: plugin.flags,
                        target: plugin.target,
                        requiredConfigs: plugin.requiredConfigs,
                        dependencies: plugin.dependencies,
                        loaded: plugin.loaded ?? true,
                        unmetDependencies: Array.isArray(plugin.unmetDependencies) ? plugin.unmetDependencies : [],
                        missingConfigs: Array.isArray(plugin.missingConfigs) ? plugin.missingConfigs : [],
                        configSchema: pluginData.configSchema || [],
                    } as Plugin;
                });
                setPlugins(pluginsArray);
                return pluginsArray;
            } catch (error) {
                console.error(error);
                toast.error(t('admin.plugins.messages.load_failed'));
                return [] as Plugin[];
            } finally {
                if (!opts?.silent) setLoading(false);
            }
        },
        [t],
    );

    const checkAllUpdates = useCallback(
        async (pluginList?: Plugin[]) => {
            const list = pluginList || plugins;
            setUpdateCheckLoading(true);
            setStoreError(null);
            try {
                if (list.length === 0) {
                    setStoreUpdates({});
                    return;
                }
                const response = await axios.get('/api/admin/cloud/data/store', {
                    params: {
                        page: 1,
                        limit: 100,
                        category: FEATHERPANEL_CATEGORY_SLUG,
                        type: 'product',
                    },
                });
                const items = extractStoreItems(response.data?.data);
                const next: Record<string, PluginStoreUpdate> = {};
                for (const plugin of list) {
                    const match = findStoreMatch(plugin, items);
                    if (!match?.product) continue;
                    const latest = storeLatestVersion(match.product);
                    const slug = productSlug(match.product);
                    if (!latest || !plugin.version || !slug) continue;
                    next[plugin.identifier] = {
                        latest_version: latest,
                        store_slug: slug,
                        can_download: match.can_download === true,
                        update_available: comparePluginVersions(plugin.version, latest) < 0,
                    };
                }
                setStoreUpdates(next);
            } catch (err) {
                if (axios.isAxiosError(err)) {
                    const code = err.response?.data?.error_code;
                    if (code === 'CLOUD_CREDENTIALS_NOT_CONFIGURED' || err.response?.status === 503) {
                        setStoreError(
                            err.response?.data?.message ||
                                'Mythic Cloud is not linked. Connect Cloud Connections to check updates.',
                        );
                        setStoreUpdates({});
                        return;
                    }
                }
                setStoreError(mythicCloudErrorMessage(err, 'Failed to check Mythic store for updates'));
                setStoreUpdates({});
            } finally {
                setUpdateCheckLoading(false);
            }
        },
        [plugins],
    );

    const pluginsWithUpdates = useMemo(
        () => plugins.filter((p) => storeUpdates[p.identifier]?.update_available),
        [plugins, storeUpdates],
    );

    const issueCount = useMemo(
        () =>
            plugins.filter(
                (p) =>
                    (p.unmetDependencies && p.unmetDependencies.length > 0) ||
                    (p.missingConfigs && p.missingConfigs.length > 0) ||
                    !p.loaded,
            ).length,
        [plugins],
    );

    const filteredPlugins = useMemo(() => {
        const q = search.trim().toLowerCase();
        return plugins.filter((plugin) => {
            const update = storeUpdates[plugin.identifier];
            const hasIssue =
                (plugin.unmetDependencies && plugin.unmetDependencies.length > 0) ||
                (plugin.missingConfigs && plugin.missingConfigs.length > 0) ||
                !plugin.loaded;
            if (filter === 'updates' && !update?.update_available) return false;
            if (filter === 'issues' && !hasIssue) return false;
            if (!q) return true;
            return `${plugin.name || ''} ${plugin.identifier} ${plugin.author || ''} ${plugin.description || ''}`
                .toLowerCase()
                .includes(q);
        });
    }, [plugins, storeUpdates, filter, search]);

    useEffect(() => {
        void (async () => {
            const list = await fetchPlugins();
            fetchWidgets();
            await checkAllUpdates(list);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchPlugins, fetchWidgets]);

    const loadPluginConfig = async (plugin: Plugin) => {
        setConfigLoading(true);
        setConfigError(null);
        try {
            const response = await axios.get(`/api/admin/plugins/${plugin.identifier}/config`);
            const apiData = response.data.data;

            let settings: Record<string, string> = {};
            if (Array.isArray(apiData.settings)) {
                settings = apiData.settings.reduce(
                    (acc: Record<string, string>, setting: { key: string; value: string }) => {
                        acc[setting.key] = setting.value;
                        return acc;
                    },
                    {},
                );
            } else if (apiData.settings && typeof apiData.settings === 'object') {
                settings = apiData.settings;
            }

            const configPlugin = apiData.config.plugin || apiData.config;
            const pluginData = apiData.plugin.plugin || apiData.plugin;

            if (Array.isArray(configPlugin.author)) configPlugin.author = configPlugin.author.join(', ');
            if (Array.isArray(pluginData.author)) pluginData.author = pluginData.author.join(', ');

            setPluginConfig({
                config: configPlugin,
                plugin: pluginData,
                settings,
                configSchema: apiData.configSchema || apiData.config || [],
                allowedOnlyOnSpells: apiData.allowedOnlyOnSpells || [],
            });

            if (
                apiData.allowedOnlyOnSpells &&
                Array.isArray(apiData.allowedOnlyOnSpells) &&
                apiData.allowedOnlyOnSpells.length > 0
            ) {
                const spellIds = apiData.allowedOnlyOnSpells;
                setSelectedSpellIds(new Set(spellIds));

                fetchSelectedSpellsDetails(spellIds);
            } else {
                setSelectedSpellIds(new Set());
                setSelectedSpellsDetails([]);
            }
        } catch (error) {
            console.error(error);
            setPluginConfig({
                config: plugin,
                plugin: plugin,
                settings: {},
                configSchema: plugin.configSchema || [],
            });
            if (axios.isAxiosError(error) && error.response?.status !== 404) {
                setConfigError(t('admin.plugins.messages.config_load_failed'));
            }
        } finally {
            setConfigLoading(false);
        }
    };

    const openPluginConfig = async (plugin: Plugin) => {
        setSelectedPlugin(plugin);

        setSpellSearchQuery('');
        setSpellPage(1);
        setConfigDrawerOpen(true);
        await loadPluginConfig(plugin);

        setTimeout(() => {
            fetchSpells();
        }, 100);
    };

    const fetchSelectedSpellsDetails = async (spellIds: number[]) => {
        try {
            const spellPromises = spellIds.map((id) => axios.get(`/api/admin/spells/${id}`).catch(() => null));
            const spellResponses = await Promise.all(spellPromises);
            const selectedSpells = spellResponses
                .filter((response) => response?.data?.success && response.data.data?.spell)
                .map((response) => ({
                    id: response!.data.data.spell.id,
                    name: response!.data.data.spell.name,
                    description: response!.data.data.spell.description,
                }));
            setSelectedSpellsDetails(selectedSpells);
        } catch (error) {
            console.error('Error fetching selected spells details:', error);
        }
    };

    const fetchSpells = useCallback(async () => {
        setSpellsLoading(true);
        try {
            const response = await axios.get('/api/admin/spells', {
                params: {
                    page: spellPage,
                    limit: 20,
                    search: spellSearchQuery.trim() || undefined,
                },
            });
            const data = response.data.data;
            setSpells(data.spells || []);
            setSpellsTotal(data.pagination?.total_records || 0);
            setSpellsTotalPages(data.pagination?.total_pages || 1);
        } catch (error) {
            console.error('Error fetching spells:', error);
            toast.error(t('admin.plugins.messages.spells_load_failed'));
        } finally {
            setSpellsLoading(false);
        }
    }, [spellPage, spellSearchQuery, t]);

    useEffect(() => {
        if (!configDrawerOpen) return;

        if (spellSearchQuery !== '') {
            const timer = setTimeout(() => {
                fetchSpells();
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [spellSearchQuery, configDrawerOpen, fetchSpells]);

    useEffect(() => {
        if (configDrawerOpen && spellPage > 0) {
            fetchSpells();
        }
    }, [spellPage, configDrawerOpen, fetchSpells]);

    useEffect(() => {
        if (!configDrawerOpen) {
            setSpellSearchQuery('');
            setSpellPage(1);
            setSelectedSpellIds(new Set());
            setSelectedSpellsDetails([]);
        }
    }, [configDrawerOpen]);

    const saveSpellRestrictions = async () => {
        if (!selectedPlugin) return;
        setSavingSpellRestrictions(true);
        try {
            await axios.post(`/api/admin/plugins/${selectedPlugin.identifier}/spell-restrictions`, {
                allowedOnlyOnSpells: Array.from(selectedSpellIds),
            });
            invalidatePluginRoutesCache();
            toast.success(t('admin.plugins.messages.spell_restrictions_saved'));

            await loadPluginConfig(selectedPlugin);
        } catch (error) {
            console.error(error);
            toast.error(t('admin.plugins.messages.spell_restrictions_save_failed'));
        } finally {
            setSavingSpellRestrictions(false);
        }
    };

    const saveAllSettings = async () => {
        if (!selectedPlugin || !pluginConfig?.settings) return;
        setSavingSetting(true);
        try {
            const savePromises = Object.entries(pluginConfig.settings).map(([key, value]) =>
                axios.post(`/api/admin/plugins/${selectedPlugin.identifier}/settings/set`, { key, value }),
            );
            await Promise.all(savePromises);
            toast.success(t('admin.plugins.messages.save_success'));
            await loadPluginConfig(selectedPlugin);
        } catch (error) {
            console.error(error);
            toast.error(t('admin.plugins.messages.save_failed'));
        } finally {
            setSavingSetting(false);
        }
    };

    const onUploadPlugin = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setPendingUploadFile(e.target.files[0]);
        setConfirmUploadOpen(true);
        e.target.value = '';
    };

    const performUpload = async () => {
        if (!pendingUploadFile) return;
        try {
            const formData = new FormData();
            formData.append('file', pendingUploadFile);
            await axios.post('/api/admin/plugins/upload/install', formData);
            toast.success(t('admin.plugins.messages.install_success'));
            setConfirmUploadOpen(false);
            setPendingUploadFile(null);
            const list = await fetchPlugins({ silent: true });
            await checkAllUpdates(list);
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || t('admin.plugins.messages.install_failed'));
            } else {
                toast.error(t('admin.plugins.messages.install_failed'));
            }
        }
    };

    const installFromUrlAction = async () => {
        if (!installUrl) return;
        setInstallingFromUrl(true);
        try {
            await axios.post('/api/admin/plugins/upload/install-url', { url: installUrl });
            toast.success(t('admin.plugins.messages.install_success'));
            setConfirmUrlOpen(false);
            setInstallUrl('');
            const list = await fetchPlugins({ silent: true });
            await checkAllUpdates(list);
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || t('admin.plugins.messages.install_failed'));
            } else {
                toast.error(t('admin.plugins.messages.install_failed'));
            }
        } finally {
            setInstallingFromUrl(false);
        }
    };

    const requestUninstall = (plugin: Plugin) => {
        setSelectedPluginForUninstall(plugin);
        setConfirmUninstallOpen(true);
    };

    const performUninstall = async () => {
        if (!selectedPluginForUninstall) return;
        try {
            await axios.post(`/api/admin/plugins/${selectedPluginForUninstall.identifier}/uninstall`);
            toast.success(t('admin.plugins.messages.uninstall_success'));
            setConfirmUninstallOpen(false);
            setSelectedPluginForUninstall(null);
            const list = await fetchPlugins({ silent: true });
            await checkAllUpdates(list);
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || t('admin.plugins.messages.uninstall_failed'));
            } else {
                toast.error(t('admin.plugins.messages.uninstall_failed'));
            }
        }
    };

    const openUpdateDialog = (plugin: Plugin) => {
        const update = storeUpdates[plugin.identifier];
        if (!update?.update_available) {
            toast.info(
                t('admin.plugins.messages.up_to_date', {
                    plugin: plugin.name || plugin.identifier,
                }),
            );
            return;
        }
        setPendingUpdatePlugin(plugin);
        setUpdateDialogOpen(true);
    };

    const installUpdate = async () => {
        if (!pendingUpdatePlugin) return;
        const update = storeUpdates[pendingUpdatePlugin.identifier];
        setInstallingUpdateId(pendingUpdatePlugin.identifier);
        try {
            if (update?.store_slug && update.can_download) {
                const version = await resolveInstallVersion(update.store_slug);
                if (!version) throw new Error('No downloadable release found.');
                await downloadAndInstall(update.store_slug, version);
            } else {
                await axios.post('/api/admin/plugins/online/install', {
                    identifier: pendingUpdatePlugin.identifier,
                });
            }
            toast.success(t('admin.plugins.messages.update_success'));
            setUpdateDialogOpen(false);
            setPendingUpdatePlugin(null);
            const list = await fetchPlugins({ silent: true });
            await checkAllUpdates(list);
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            toast.error(await parseBlobError(error, t('admin.plugins.messages.update_failed')));
        } finally {
            setInstallingUpdateId(null);
        }
    };

    const installAllUpdates = async () => {
        if (bulkUpdatingPlugins || pluginsWithUpdates.length === 0) return;

        setBulkUpdatingPlugins(true);
        const failures: string[] = [];
        let updatedCount = 0;

        try {
            for (const plugin of pluginsWithUpdates) {
                const update = storeUpdates[plugin.identifier];
                setInstallingUpdateId(plugin.identifier);
                try {
                    if (update?.store_slug && update.can_download) {
                        const version = await resolveInstallVersion(update.store_slug);
                        if (!version) throw new Error('No downloadable release found.');
                        await downloadAndInstall(update.store_slug, version);
                    } else {
                        await axios.post('/api/admin/plugins/online/install', {
                            identifier: plugin.identifier,
                            queued_identifiers: pluginsWithUpdates.map((p) => p.identifier),
                        });
                    }
                    updatedCount += 1;
                } catch (error) {
                    const message = await parseBlobError(error, t('admin.plugins.messages.update_failed'));
                    failures.push(`${plugin.name || plugin.identifier}: ${message}`);
                }
            }

            if (failures.length === 0) {
                toast.success(t('admin.plugins.messages.bulk_update_success', { count: String(updatedCount) }));
            } else if (updatedCount > 0) {
                toast.error(
                    t('admin.plugins.messages.bulk_update_partial', {
                        success: String(updatedCount),
                        failed: String(failures.length),
                    }),
                );
                console.error('Some plugin updates failed:', failures);
            } else {
                toast.error(t('admin.plugins.messages.bulk_update_failed'));
                console.error('Plugin updates failed:', failures);
            }

            if (updatedCount > 0) {
                const list = await fetchPlugins({ silent: true });
                await checkAllUpdates(list);
                setTimeout(() => window.location.reload(), 1500);
            }
        } finally {
            setInstallingUpdateId(null);
            setBulkUpdatingPlugins(false);
        }
    };

    const configFields = useMemo(() => pluginConfig?.configSchema || [], [pluginConfig]);
    const hasConfigSchema = configFields.length > 0;
    const pendingUpdate = pendingUpdatePlugin ? storeUpdates[pendingUpdatePlugin.identifier] : null;

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-plugins', 'top-of-page')} />
            <PageHeader
                title={t('admin.plugins.title')}
                description={t('admin.plugins.description')}
                icon={Puzzle}
                actions={
                    <div className='flex flex-wrap gap-2'>
                        <Button
                            size='sm'
                            variant='outline'
                            onClick={() => void checkAllUpdates()}
                            disabled={updateCheckLoading || loading}
                        >
                            {updateCheckLoading ? (
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            ) : (
                                <RefreshCw className='mr-2 h-4 w-4' />
                            )}
                            {t('admin.plugins.actions.check_updates')}
                        </Button>
                        {pluginsWithUpdates.length > 0 ? (
                            <Button
                                size='sm'
                                variant='outline'
                                onClick={() => void installAllUpdates()}
                                disabled={bulkUpdatingPlugins || !!installingUpdateId}
                            >
                                {bulkUpdatingPlugins ? (
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                ) : (
                                    <Download className='mr-2 h-4 w-4' />
                                )}
                                {t('admin.plugins.actions.update_all', {
                                    count: String(pluginsWithUpdates.length),
                                })}
                            </Button>
                        ) : null}
                        <Button size='sm' variant='outline' asChild>
                            <label className='cursor-pointer'>
                                <Upload className='mr-2 h-4 w-4' />
                                {t('admin.plugins.actions.upload')}
                                <input type='file' accept='.fpa' className='hidden' onChange={onUploadPlugin} />
                            </label>
                        </Button>
                        <Button size='sm' onClick={() => setConfirmUrlOpen(true)}>
                            <Plus className='mr-2 h-4 w-4' />
                            {t('admin.plugins.actions.install_url')}
                        </Button>
                        <Button size='sm' variant='outline' onClick={() => router.push('/admin/feathercloud/products')}>
                            <Store className='mr-2 h-4 w-4' />
                            Store
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-plugins', 'after-header')} />

            <div className='grid gap-3 sm:grid-cols-3'>
                <div className='bg-card/60 rounded-2xl px-4 py-3'>
                    <p className='text-muted-foreground text-xs'>Installed</p>
                    <p className='mt-1 text-sm font-medium'>{plugins.length}</p>
                </div>
                <div className='bg-card/60 rounded-2xl px-4 py-3'>
                    <p className='text-muted-foreground text-xs'>Updates</p>
                    <p className='mt-1 text-sm font-medium'>
                        {storeError
                            ? 'Store unavailable'
                            : pluginsWithUpdates.length > 0
                              ? `${pluginsWithUpdates.length} available`
                              : 'Up to date'}
                    </p>
                </div>
                <div className='bg-card/60 rounded-2xl px-4 py-3'>
                    <p className='text-muted-foreground text-xs'>Issues</p>
                    <p className='mt-1 text-sm font-medium'>
                        {issueCount > 0 ? `${issueCount} need attention` : 'None'}
                    </p>
                </div>
            </div>

            {storeError ? (
                <div className='bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm'>
                    <p className='text-muted-foreground'>{storeError}</p>
                    <Button size='sm' variant='outline' onClick={() => router.push('/admin/cloud-management')}>
                        Cloud Connections
                    </Button>
                </div>
            ) : null}

            <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
                <div className='relative min-w-0 flex-1'>
                    <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder='Search installed plugins…'
                        className='pl-9'
                    />
                </div>
                <div className='flex flex-wrap gap-2'>
                    {(
                        [
                            { key: 'all' as const, label: 'All' },
                            { key: 'updates' as const, label: 'Updates' },
                            { key: 'issues' as const, label: 'Issues' },
                        ] as const
                    ).map((item) => (
                        <Button
                            key={item.key}
                            size='sm'
                            variant={filter === item.key ? 'default' : 'outline'}
                            onClick={() => setFilter(item.key)}
                        >
                            {item.label}
                        </Button>
                    ))}
                    <Button
                        size='sm'
                        variant='outline'
                        onClick={() => void fetchPlugins().then((list) => checkAllUpdates(list))}
                        disabled={loading}
                    >
                        <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                        {t('admin.plugins.actions.refresh')}
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className='text-muted-foreground flex items-center gap-2 py-16 text-sm'>
                    <Loader2 className='h-4 w-4 animate-spin' /> Loading plugins…
                </div>
            ) : filteredPlugins.length === 0 ? (
                <EmptyState
                    title={
                        plugins.length === 0
                            ? t('admin.plugins.grid.empty_title')
                            : filter === 'updates'
                              ? 'All plugins are up to date'
                              : 'No plugins match'
                    }
                    description={
                        plugins.length === 0
                            ? t('admin.plugins.grid.empty_description')
                            : 'Try another filter or search term.'
                    }
                    icon={Puzzle}
                />
            ) : (
                <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                    {filteredPlugins.map((plugin) => {
                        const update = storeUpdates[plugin.identifier];
                        const needsUpdate = Boolean(update?.update_available);
                        const hasIssue =
                            (plugin.unmetDependencies && plugin.unmetDependencies.length > 0) ||
                            (plugin.missingConfigs && plugin.missingConfigs.length > 0) ||
                            !plugin.loaded;
                        const busy = installingUpdateId === plugin.identifier || bulkUpdatingPlugins;

                        return (
                            <article
                                key={plugin.identifier}
                                className={cn(
                                    'bg-card/80 flex flex-col overflow-hidden rounded-2xl shadow-sm ring-1 ring-transparent transition',
                                    'hover:bg-card hover:shadow-md',
                                    hasIssue ? 'ring-amber-500/30' : 'ring-border/40',
                                )}
                            >
                                <div className='flex flex-1 flex-col space-y-3 p-4'>
                                    <div className='flex items-start gap-3'>
                                        <div className='bg-muted flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl'>
                                            {plugin.icon ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={plugin.icon} alt='' className='h-full w-full object-cover' />
                                            ) : (
                                                <Puzzle className='text-muted-foreground h-5 w-5' />
                                            )}
                                        </div>
                                        <div className='min-w-0 flex-1'>
                                            <h3 className='truncate text-sm font-semibold'>
                                                {plugin.name || plugin.identifier}
                                            </h3>
                                            <p className='text-muted-foreground truncate font-mono text-[11px]'>
                                                {plugin.identifier}
                                            </p>
                                        </div>
                                        <div className='flex shrink-0 flex-col items-end gap-1'>
                                            {needsUpdate ? (
                                                <span className='rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400'>
                                                    Update
                                                </span>
                                            ) : update ? (
                                                <span className='text-muted-foreground inline-flex items-center gap-1 text-[10px]'>
                                                    <CheckCircle2 className='h-3 w-3 text-emerald-500' />
                                                    Current
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>

                                    <p className='text-muted-foreground line-clamp-2 min-h-10 text-xs'>
                                        {plugin.description || t('admin.plugins.grid.no_description')}
                                    </p>

                                    <div className='text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-[11px]'>
                                        <span>
                                            v{plugin.version || '?'}
                                            {needsUpdate ? (
                                                <span className='text-amber-600 dark:text-amber-400'>
                                                    {' '}
                                                    → v{update?.latest_version}
                                                </span>
                                            ) : null}
                                        </span>
                                        <span className='truncate'>
                                            {plugin.author || t('admin.plugins.grid.author_unknown')}
                                        </span>
                                        {plugin.website ? (
                                            <a
                                                href={plugin.website}
                                                target='_blank'
                                                rel='noreferrer'
                                                className='text-primary inline-flex items-center gap-1 hover:underline'
                                            >
                                                Site <Globe className='h-3 w-3' />
                                            </a>
                                        ) : null}
                                    </div>

                                    {(plugin.unmetDependencies?.length ||
                                        plugin.missingConfigs?.length ||
                                        !plugin.loaded) && (
                                        <div className='flex flex-wrap gap-1.5'>
                                            {plugin.unmetDependencies?.map((dep) => (
                                                <Badge
                                                    key={dep}
                                                    variant='outline'
                                                    className='border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400'
                                                >
                                                    {t('admin.plugins.grid.missing_badge', { dep })}
                                                </Badge>
                                            ))}
                                            {plugin.missingConfigs?.map((cfg) => (
                                                <Badge
                                                    key={String(cfg)}
                                                    variant='outline'
                                                    className='border-orange-500/40 bg-orange-500/10 text-[10px] text-orange-700 dark:text-orange-400'
                                                >
                                                    {t('admin.plugins.grid.config_badge', { cfg: String(cfg) })}
                                                </Badge>
                                            ))}
                                            {!plugin.loaded ? (
                                                <Badge variant='secondary' className='text-[10px]'>
                                                    {t('admin.plugins.grid.not_loaded')}
                                                </Badge>
                                            ) : null}
                                        </div>
                                    )}
                                </div>

                                <div className='flex items-center gap-2 px-4 pb-4'>
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        className='flex-1'
                                        onClick={() => void openPluginConfig(plugin)}
                                    >
                                        <Settings className='mr-1.5 h-3.5 w-3.5' />
                                        {t('admin.plugins.actions.configure')}
                                    </Button>
                                    {needsUpdate ? (
                                        <Button
                                            size='sm'
                                            disabled={busy || update?.can_download === false}
                                            onClick={() => openUpdateDialog(plugin)}
                                        >
                                            {installingUpdateId === plugin.identifier ? (
                                                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                                            ) : (
                                                <Download className='h-3.5 w-3.5' />
                                            )}
                                        </Button>
                                    ) : null}
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        className='text-muted-foreground hover:text-destructive h-8 w-8 p-0'
                                        onClick={() => requestUninstall(plugin)}
                                    >
                                        <Trash2 className='h-3.5 w-3.5' />
                                    </Button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <Sheet open={configDrawerOpen} onOpenChange={setConfigDrawerOpen} className='max-w-2xl'>
                <SheetHeader>
                    <SheetTitle>{t('admin.plugins.drawers.config.title')}</SheetTitle>
                    <SheetDescription>
                        {t('admin.plugins.drawers.config.description', {
                            plugin: selectedPlugin?.name || selectedPlugin?.identifier || '',
                        })}
                    </SheetDescription>
                </SheetHeader>
                <div className='max-h-[calc(100vh-200px)] overflow-y-auto px-1 pt-4 pb-8'>
                    {configLoading ? (
                        <div className='text-muted-foreground flex items-center justify-center py-8'>
                            <RefreshCw className='mr-2 h-5 w-5 animate-spin' />
                            {t('admin.plugins.drawers.config.loading')}
                        </div>
                    ) : configError ? (
                        <div className='text-destructive py-8 text-center'>{configError}</div>
                    ) : pluginConfig ? (
                        <div className='space-y-6'>
                            <div className='bg-secondary/20 space-y-6 rounded-xl p-6'>
                                <div className='flex items-center justify-between border-b pb-4'>
                                    <h3 className='text-lg font-semibold'>
                                        {t('admin.plugins.drawers.config.settings_title')}
                                    </h3>
                                    <Badge variant='outline' className='bg-primary/5 border-primary/20 text-primary'>
                                        {configFields.length} fields
                                    </Badge>
                                </div>
                                {hasConfigSchema ? (
                                    <div className='space-y-5'>
                                        {configFields.map((field) => (
                                            <div key={field.name} className='space-y-2.5'>
                                                <div className='flex items-center justify-between'>
                                                    <label className='text-foreground/90 text-sm font-medium'>
                                                        {field.display_name}
                                                    </label>
                                                    {field.required && (
                                                        <Badge
                                                            variant='secondary'
                                                            className='text-[10px] font-bold tracking-wider uppercase'
                                                        >
                                                            {t('admin.plugins.drawers.config.required')}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {field.type === 'boolean' ? (
                                                    <div className='bg-background/50 flex items-center gap-3 rounded-lg border p-3'>
                                                        <input
                                                            type='checkbox'
                                                            checked={pluginConfig.settings[field.name] === 'true'}
                                                            onChange={(e) =>
                                                                setPluginConfig((prev) =>
                                                                    prev
                                                                        ? {
                                                                              ...prev,
                                                                              settings: {
                                                                                  ...prev.settings,
                                                                                  [field.name]: e.target.checked
                                                                                      ? 'true'
                                                                                      : 'false',
                                                                              },
                                                                          }
                                                                        : null,
                                                                )
                                                            }
                                                            className='border-primary text-primary focus:ring-primary h-4 w-4 rounded'
                                                        />
                                                        <span className='text-foreground/80 text-sm'>
                                                            {field.description || field.display_name}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className='space-y-1.5'>
                                                        <Input
                                                            type={
                                                                field.type === 'password'
                                                                    ? 'password'
                                                                    : field.type === 'number'
                                                                      ? 'number'
                                                                      : 'text'
                                                            }
                                                            value={pluginConfig.settings[field.name] || ''}
                                                            onChange={(e) =>
                                                                setPluginConfig((prev) =>
                                                                    prev
                                                                        ? {
                                                                              ...prev,
                                                                              settings: {
                                                                                  ...prev.settings,
                                                                                  [field.name]: e.target.value,
                                                                              },
                                                                          }
                                                                        : null,
                                                                )
                                                            }
                                                            placeholder={field.default}
                                                            className='bg-background/50 border-input/50 focus:border-primary/50 focus:bg-background transition-all'
                                                        />
                                                        {field.description && (
                                                            <p className='text-muted-foreground ml-1 text-[11px]'>
                                                                {field.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <div className='pt-2'>
                                            <Button
                                                className='w-full'
                                                size='lg'
                                                onClick={saveAllSettings}
                                                disabled={savingSetting}
                                            >
                                                {savingSetting ? (
                                                    <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                                                ) : (
                                                    <Save className='mr-2 h-4 w-4' />
                                                )}
                                                {t('admin.plugins.actions.save_settings')}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className='text-muted-foreground bg-muted/20 rounded-xl border border-dashed py-12 text-center'>
                                        <Settings className='mx-auto mb-3 h-10 w-10 opacity-20' />
                                        <p className='font-medium'>{t('admin.plugins.drawers.config.no_schema')}</p>
                                        <p className='text-muted-foreground/70 mt-1 text-xs'>
                                            {t('admin.plugins.drawers.config.no_schema_desc')}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className='border-border bg-muted/30 space-y-5 rounded-lg border p-6'>
                                <div className='space-y-1.5'>
                                    <h3 className='text-foreground text-base font-semibold'>
                                        {t('admin.plugins.drawers.config.spell_restrictions.title')}
                                    </h3>
                                    <p className='text-muted-foreground text-sm leading-relaxed'>
                                        {t('admin.plugins.drawers.config.spell_restrictions.description')}
                                    </p>
                                </div>

                                <div className='space-y-4'>
                                    <div className='relative'>
                                        <Search className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform' />
                                        <Input
                                            placeholder={t(
                                                'admin.plugins.drawers.config.spell_restrictions.search_placeholder',
                                            )}
                                            value={spellSearchQuery}
                                            onChange={(e) => {
                                                setSpellSearchQuery(e.target.value);
                                                setSpellPage(1);
                                            }}
                                            className='bg-background/50 border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:bg-background h-10 pl-10'
                                        />
                                        {spellsLoading && (
                                            <div className='absolute top-1/2 right-3 -translate-y-1/2 transform'>
                                                <RefreshCw className='text-muted-foreground h-4 w-4 animate-spin' />
                                            </div>
                                        )}
                                    </div>

                                    {selectedSpellIds.size > 0 && (
                                        <div className='space-y-2.5'>
                                            <div className='flex items-center justify-between'>
                                                <p className='text-foreground text-sm font-medium'>
                                                    {t(
                                                        'admin.plugins.drawers.config.spell_restrictions.selected_spells',
                                                    )}
                                                </p>
                                                <Badge
                                                    variant='secondary'
                                                    className='bg-primary/20 text-primary border-primary/30 text-xs'
                                                >
                                                    {t(
                                                        'admin.plugins.drawers.config.spell_restrictions.selected_count',
                                                        {
                                                            count: String(selectedSpellIds.size),
                                                        },
                                                    )}
                                                </Badge>
                                            </div>
                                            <div className='bg-background/50 border-border flex flex-wrap gap-2 rounded-md border p-3'>
                                                {selectedSpellsDetails.map((spell) => (
                                                    <Badge
                                                        key={spell.id}
                                                        variant='secondary'
                                                        className='bg-primary/20 text-primary border-primary/30 hover:bg-primary/25 flex items-center gap-1.5 px-2.5 py-1 transition-colors'
                                                    >
                                                        <span className='text-xs font-medium'>{spell.name}</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newSet = new Set(selectedSpellIds);
                                                                newSet.delete(spell.id);
                                                                setSelectedSpellIds(newSet);
                                                                setSelectedSpellsDetails((prev) =>
                                                                    prev.filter((s) => s.id !== spell.id),
                                                                );
                                                            }}
                                                            className='hover:bg-destructive/30 ml-0.5 rounded-full p-0.5 transition-colors'
                                                        >
                                                            <X className='h-3 w-3' />
                                                        </button>
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className='border-border bg-background/50 overflow-hidden rounded-md border'>
                                        <div className='max-h-[320px] overflow-y-auto'>
                                            {spellsLoading && spellSearchQuery === '' && spellPage === 1 ? (
                                                <div className='flex items-center justify-center py-12'>
                                                    <RefreshCw className='text-muted-foreground mr-2 h-5 w-5 animate-spin' />
                                                    <span className='text-muted-foreground text-sm'>
                                                        {t('admin.plugins.drawers.config.spell_restrictions.loading')}
                                                    </span>
                                                </div>
                                            ) : spells.length === 0 ? (
                                                <div className='py-12 text-center'>
                                                    <Puzzle className='text-muted-foreground/50 mx-auto mb-2 h-8 w-8' />
                                                    <p className='text-foreground text-sm font-medium'>
                                                        {t('admin.plugins.drawers.config.spell_restrictions.no_spells')}
                                                    </p>
                                                    {spellSearchQuery && (
                                                        <p className='text-muted-foreground mt-1 text-xs'>
                                                            {t(
                                                                'admin.plugins.drawers.config.spell_restrictions.no_spells_search',
                                                            )}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className='divide-border divide-y'>
                                                    {spells.map((spell) => {
                                                        const isSelected = selectedSpellIds.has(spell.id);
                                                        return (
                                                            <div
                                                                key={spell.id}
                                                                className={`flex cursor-pointer items-start gap-3 p-3 transition-all ${
                                                                    isSelected
                                                                        ? 'bg-primary/10 hover:bg-primary/15 border-l-primary border-l-2'
                                                                        : 'hover:bg-muted/40 bg-background/30'
                                                                }`}
                                                                onClick={() => {
                                                                    const newSet = new Set(selectedSpellIds);
                                                                    if (newSet.has(spell.id)) {
                                                                        newSet.delete(spell.id);
                                                                        setSelectedSpellsDetails((prev) =>
                                                                            prev.filter((s) => s.id !== spell.id),
                                                                        );
                                                                    } else {
                                                                        newSet.add(spell.id);
                                                                        setSelectedSpellsDetails((prev) => {
                                                                            if (prev.find((s) => s.id === spell.id))
                                                                                return prev;
                                                                            return [
                                                                                ...prev,
                                                                                {
                                                                                    id: spell.id,
                                                                                    name: spell.name,
                                                                                    description: spell.description,
                                                                                },
                                                                            ];
                                                                        });
                                                                    }
                                                                    setSelectedSpellIds(newSet);
                                                                }}
                                                            >
                                                                <div className='min-w-0 flex-1'>
                                                                    <div className='flex items-center gap-2'>
                                                                        <div
                                                                            className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}
                                                                        >
                                                                            {spell.name}
                                                                        </div>
                                                                        {isSelected && (
                                                                            <Badge
                                                                                variant='outline'
                                                                                className='border-primary/40 text-primary bg-primary/10 px-1.5 py-0 text-[10px]'
                                                                            >
                                                                                {t(
                                                                                    'admin.plugins.drawers.config.spell_restrictions.selected_badge',
                                                                                )}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    {spell.description && (
                                                                        <div className='text-muted-foreground mt-1 line-clamp-2 text-xs'>
                                                                            {spell.description}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className='shrink-0 pt-0.5'>
                                                                    <div className='relative'>
                                                                        <input
                                                                            type='checkbox'
                                                                            checked={isSelected}
                                                                            onChange={() => {
                                                                                const newSet = new Set(
                                                                                    selectedSpellIds,
                                                                                );
                                                                                if (newSet.has(spell.id)) {
                                                                                    newSet.delete(spell.id);
                                                                                    setSelectedSpellsDetails((prev) =>
                                                                                        prev.filter(
                                                                                            (s) => s.id !== spell.id,
                                                                                        ),
                                                                                    );
                                                                                } else {
                                                                                    newSet.add(spell.id);
                                                                                    setSelectedSpellsDetails((prev) => {
                                                                                        if (
                                                                                            prev.find(
                                                                                                (s) =>
                                                                                                    s.id === spell.id,
                                                                                            )
                                                                                        )
                                                                                            return prev;
                                                                                        return [
                                                                                            ...prev,
                                                                                            {
                                                                                                id: spell.id,
                                                                                                name: spell.name,
                                                                                                description:
                                                                                                    spell.description,
                                                                                            },
                                                                                        ];
                                                                                    });
                                                                                }
                                                                                setSelectedSpellIds(newSet);
                                                                            }}
                                                                            className='border-border checked:bg-primary checked:border-primary focus:ring-primary/30 bg-background/50 h-4 w-4 cursor-pointer appearance-none rounded border-2 transition-all checked:before:flex checked:before:items-center checked:before:justify-center checked:before:text-xs checked:before:text-white checked:before:content-["✓"] focus:ring-2'
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {spellsTotalPages > 1 && (
                                        <div className='border-border flex items-center justify-between border-t pt-2'>
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                onClick={() => setSpellPage((p) => Math.max(1, p - 1))}
                                                disabled={spellPage === 1 || spellsLoading}
                                                className='bg-background/50 border-border hover:bg-muted/50 h-8'
                                            >
                                                <ChevronLeft className='mr-1.5 h-3.5 w-3.5' />
                                                {t('admin.plugins.drawers.config.spell_restrictions.previous')}
                                            </Button>
                                            <span className='text-muted-foreground text-xs font-medium'>
                                                {t('admin.plugins.drawers.config.spell_restrictions.page_info', {
                                                    current: String(spellPage),
                                                    total: String(spellsTotalPages),
                                                })}
                                            </span>
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                onClick={() => setSpellPage((p) => Math.min(spellsTotalPages, p + 1))}
                                                disabled={spellPage === spellsTotalPages || spellsLoading}
                                                className='bg-background/50 border-border hover:bg-muted/50 h-8'
                                            >
                                                {t('admin.plugins.drawers.config.spell_restrictions.next')}
                                                <ChevronRight className='ml-1.5 h-3.5 w-3.5' />
                                            </Button>
                                        </div>
                                    )}

                                    <div className='pt-1'>
                                        <Button
                                            className='bg-primary hover:bg-primary/90 h-10 w-full font-medium'
                                            onClick={saveSpellRestrictions}
                                            disabled={savingSpellRestrictions}
                                        >
                                            {savingSpellRestrictions ? (
                                                <>
                                                    <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                                                    {t('admin.plugins.drawers.config.spell_restrictions.saving')}
                                                </>
                                            ) : (
                                                <>
                                                    <Save className='mr-2 h-4 w-4' />
                                                    {t('admin.plugins.drawers.config.spell_restrictions.save')}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
                <div className='mt-auto border-t p-4'>
                    <Button variant='outline' className='w-full' onClick={() => setConfigDrawerOpen(false)}>
                        {t('admin.plugins.actions.close')}
                    </Button>
                </div>
            </Sheet>

            <Dialog open={confirmUninstallOpen} onOpenChange={setConfirmUninstallOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.plugins.dialogs.uninstall.title')}</DialogTitle>
                        <DialogDescription>
                            {t('admin.plugins.dialogs.uninstall.description', {
                                plugin:
                                    selectedPluginForUninstall?.name || selectedPluginForUninstall?.identifier || '',
                            })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant='outline' onClick={() => setConfirmUninstallOpen(false)}>
                            {t('admin.plugins.actions.cancel')}
                        </Button>
                        <Button variant='destructive' onClick={performUninstall}>
                            {t('admin.plugins.actions.uninstall')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={confirmUrlOpen} onOpenChange={setConfirmUrlOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.plugins.dialogs.install_url.title')}</DialogTitle>
                    </DialogHeader>
                    <div className='space-y-4 py-4'>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium'>
                                {t('admin.plugins.dialogs.install_url.url_label')}
                            </label>
                            <Input
                                placeholder={t('admin.plugins.dialogs.install_url.url_placeholder')}
                                value={installUrl}
                                onChange={(e) => setInstallUrl(e.target.value)}
                            />
                            <p className='text-muted-foreground text-xs'>
                                {t('admin.plugins.dialogs.install_url.url_description')}
                            </p>
                        </div>
                        <div className='rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700'>
                            <div className='mb-1 flex items-center gap-2 font-semibold'>
                                <AlertTriangle className='h-4 w-4' />
                                {t('admin.plugins.dialogs.install_url.security_warning_title')}
                            </div>
                            {t('admin.plugins.dialogs.install_url.warning')}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant='outline' onClick={() => setConfirmUrlOpen(false)}>
                            {t('admin.plugins.actions.cancel')}
                        </Button>
                        <Button onClick={installFromUrlAction} disabled={installingFromUrl}>
                            {installingFromUrl ? <RefreshCw className='mr-2 h-4 w-4 animate-spin' /> : null}
                            {t('admin.plugins.actions.install')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={confirmUploadOpen} onOpenChange={setConfirmUploadOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.plugins.dialogs.upload.title')}</DialogTitle>
                        <DialogDescription>{pendingUploadFile?.name}</DialogDescription>
                    </DialogHeader>
                    <p className='text-sm font-medium text-yellow-600'>{t('admin.plugins.dialogs.upload.warning')}</p>
                    <DialogFooter>
                        <Button variant='outline' onClick={() => setConfirmUploadOpen(false)}>
                            {t('admin.plugins.actions.cancel')}
                        </Button>
                        <Button onClick={performUpload}>{t('admin.plugins.actions.install')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={updateDialogOpen}
                onOpenChange={(open) => {
                    setUpdateDialogOpen(open);
                    if (!open) setPendingUpdatePlugin(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.plugins.dialogs.update.title')}</DialogTitle>
                        <DialogDescription>
                            {pendingUpdatePlugin?.name || pendingUpdatePlugin?.identifier}
                        </DialogDescription>
                    </DialogHeader>
                    <div className='space-y-4'>
                        <div className='rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400'>
                            <p className='font-medium'>{t('admin.plugins.dialogs.update.available')}</p>
                            <p className='mt-1'>
                                {t('admin.plugins.dialogs.update.version_info', {
                                    current: pendingUpdatePlugin?.version || 'unknown',
                                    latest: pendingUpdate?.latest_version || 'unknown',
                                })}
                            </p>
                        </div>
                        <div className='rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400'>
                            <div className='mb-1 flex items-center gap-2 font-medium'>
                                <AlertCircle className='h-4 w-4' />
                                Note
                            </div>
                            <p>{t('admin.plugins.dialogs.update.backup_warning')}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant='outline' onClick={() => setUpdateDialogOpen(false)}>
                            {t('admin.plugins.actions.cancel')}
                        </Button>
                        <Button onClick={() => void installUpdate()} disabled={!!installingUpdateId}>
                            {installingUpdateId ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                            {t('admin.plugins.actions.update')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <WidgetRenderer widgets={getWidgets('admin-plugins', 'bottom-of-page')} />
        </div>
    );
}
