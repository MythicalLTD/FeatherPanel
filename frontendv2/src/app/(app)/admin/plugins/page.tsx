/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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
import { useTranslation } from '@/contexts/TranslationContext';
import axios from 'axios';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Badge } from '@/components/ui/badge';
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
    Info,
    Globe,
    Puzzle,
    Trash2,
    Upload,
    CloudDownload,
    Save,
    Plus,
    AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

// Types
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
}

interface UpdateRequirements {
    can_install: boolean;
    update_available: boolean;
    installed_version?: string | null;
    latest_version?: string | null;
    package: {
        identifier: string;
        name: string;
        version?: string;
    };
}

interface PreviouslyInstalledPlugin {
    id: number;
    name: string;
    identifier: string;
    cloud_id?: number | null;
    version?: string | null;
    installed_at: string;
    uninstalled_at?: string | null;
}

export default function PluginsPage() {
    const { t } = useTranslation();
    // State
    const [loading, setLoading] = useState(true);
    const [plugins, setPlugins] = useState<Plugin[]>([]);

    // Drawers
    const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
    const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);

    // Config
    const [configLoading, setConfigLoading] = useState(false);
    const [configError, setConfigError] = useState<string | null>(null);
    const [pluginConfig, setPluginConfig] = useState<PluginConfig | null>(null);
    const [savingSetting, setSavingSetting] = useState(false);

    // Dialogs
    const [installUrl, setInstallUrl] = useState('');
    const [installingFromUrl, setInstallingFromUrl] = useState(false);
    const [confirmUninstallOpen, setConfirmUninstallOpen] = useState(false);
    const [confirmUrlOpen, setConfirmUrlOpen] = useState(false);
    const [confirmUploadOpen, setConfirmUploadOpen] = useState(false);
    const [selectedPluginForUninstall, setSelectedPluginForUninstall] = useState<Plugin | null>(null);
    const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);

    // Updates
    const [checkingUpdateId, setCheckingUpdateId] = useState<string | null>(null);

    const [onlinePluginsCache, setOnlinePluginsCache] = useState<Map<string, { version: string; identifier: string }>>(
        new Map(),
    );
    const [updateCheckLoading, setUpdateCheckLoading] = useState(false);
    const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
    const [updateRequirements, setUpdateRequirements] = useState<UpdateRequirements | null>(null);
    const [installingUpdateId, setInstallingUpdateId] = useState<string | null>(null);
    const [pluginsWithUpdates, setPluginsWithUpdates] = useState<Plugin[]>([]);

    // Previously Installed
    const [previouslyInstalledPlugins, setPreviouslyInstalledPlugins] = useState<PreviouslyInstalledPlugin[]>([]);
    const [showPreviouslyInstalledBanner, setShowPreviouslyInstalledBanner] = useState(false);
    const [reinstallDialogOpen, setReinstallDialogOpen] = useState(false);
    const [selectedPluginsToReinstall, setSelectedPluginsToReinstall] = useState<Set<string>>(new Set());
    const [reinstallingPlugins, setReinstallingPlugins] = useState(false);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-plugins');

    // Helper functions for version comparison
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

    const hasUpdateAvailable = (plugin: Plugin): boolean => {
        if (!plugin.identifier || !plugin.version) return false;
        const onlinePlugin = onlinePluginsCache.get(plugin.identifier);
        if (!onlinePlugin || !onlinePlugin.version) return false;
        return compareVersions(plugin.version, onlinePlugin.version) < 0;
    };

    // API interactions
    const fetchPlugins = useCallback(async () => {
        setLoading(true);
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
                };
            });
            setPlugins(pluginsArray);
        } catch (error) {
            console.error(error);
            toast.error(t('admin.plugins.messages.load_failed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    const fetchOnlinePluginInfo = async (identifier: string) => {
        if (onlinePluginsCache.has(identifier)) return;
        try {
            const response = await axios.get(`/api/admin/plugins/online/${encodeURIComponent(identifier)}`);
            const packageData = response.data.data?.package;
            if (packageData?.latest_version?.version) {
                setOnlinePluginsCache((prev) => {
                    const newCache = new Map(prev);
                    newCache.set(identifier, {
                        version: packageData.latest_version.version,
                        identifier: packageData.identifier,
                    });
                    return newCache;
                });
            }
        } catch {
            // Silently fail
        }
    };

    // Re-calculate updates when cache or plugins change
    useEffect(() => {
        setPluginsWithUpdates(plugins.filter((p) => hasUpdateAvailable(p)));
    }, [plugins, onlinePluginsCache]); // eslint-disable-line react-hooks/exhaustive-deps

    const checkAllUpdates = async () => {
        if (updateCheckLoading) return;
        setUpdateCheckLoading(true);
        try {
            const promises = plugins.map((p) => fetchOnlinePluginInfo(p.identifier));
            await Promise.all(promises);
        } catch (error) {
            console.error(error);
        } finally {
            setUpdateCheckLoading(false);
        }
    };

    const fetchPreviouslyInstalledPlugins = useCallback(async () => {
        try {
            const response = await axios.get('/api/admin/plugins/previously-installed');
            if (response.data.success && response.data.data?.plugins) {
                const installedIdentifiers = new Set(plugins.map((p) => p.identifier));
                const notCurrentlyInstalled = response.data.data.plugins.filter(
                    (p: PreviouslyInstalledPlugin) =>
                        p.uninstalled_at === null && !installedIdentifiers.has(p.identifier),
                );
                setPreviouslyInstalledPlugins(notCurrentlyInstalled);
                setShowPreviouslyInstalledBanner(notCurrentlyInstalled.length > 0);
            }
        } catch {
            // Silently fail
        }
    }, [plugins]);

    useEffect(() => {
        fetchPlugins();
        fetchWidgets();
    }, [fetchPlugins, fetchWidgets]);

    useEffect(() => {
        if (plugins.length > 0) {
            checkAllUpdates();
            fetchPreviouslyInstalledPlugins();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plugins.length]); // Only run once plugins are loaded initially? Or when list changes.

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
            });
        } catch (error) {
            console.error(error);
            setPluginConfig({
                config: plugin,
                plugin: plugin,
                settings: {},
                configSchema: plugin.configSchema || [],
            });
            if (axios.isAxiosError(error) && error.response?.status !== 404) {
                setConfigError('Failed to load full configuration');
            }
        } finally {
            setConfigLoading(false);
        }
    };

    const openPluginConfig = async (plugin: Plugin) => {
        setSelectedPlugin(plugin);
        setConfigDrawerOpen(true);
        await loadPluginConfig(plugin);
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
        e.target.value = ''; // Reset input
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
            fetchPlugins();
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
            fetchPlugins();
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
            fetchPlugins();
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || t('admin.plugins.messages.uninstall_failed'));
            } else {
                toast.error(t('admin.plugins.messages.uninstall_failed'));
            }
        }
    };

    const checkForUpdate = async (plugin: Plugin) => {
        setCheckingUpdateId(plugin.identifier);
        setSelectedPlugin(plugin);
        try {
            const response = await axios.get(
                `/api/admin/plugins/online/${encodeURIComponent(plugin.identifier)}/check`,
            );
            const requirements = response.data.data;
            if (requirements?.update_available) {
                setUpdateRequirements(requirements);
                setUpdateDialogOpen(true);
            } else {
                toast.info(`${plugin.name || plugin.identifier} is up to date`);
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || 'Failed to check for update');
            } else {
                toast.error('Failed to check for update');
            }
        } finally {
            setCheckingUpdateId(null);
        }
    };

    const installUpdate = async () => {
        if (!selectedPlugin) return;
        setInstallingUpdateId(selectedPlugin.identifier);
        try {
            await axios.post('/api/admin/plugins/online/install', { identifier: selectedPlugin.identifier });
            toast.success(t('admin.plugins.messages.update_success'));
            setUpdateDialogOpen(false);
            setUpdateRequirements(null);
            fetchPlugins();
            checkAllUpdates();
            setTimeout(() => window.location.reload(), 1500);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                toast.error(error.response?.data?.message || t('admin.plugins.messages.update_failed'));
            } else {
                toast.error(t('admin.plugins.messages.update_failed'));
            }
        } finally {
            setInstallingUpdateId(null);
        }
    };

    const reinstallSelected = async () => {
        if (selectedPluginsToReinstall.size === 0) return;
        setReinstallingPlugins(true);
        let success = 0;
        let fail = 0;

        const toReinstall = previouslyInstalledPlugins.filter((p) => selectedPluginsToReinstall.has(p.identifier));

        for (const plugin of toReinstall) {
            try {
                await axios.post('/api/admin/plugins/online/install', { identifier: plugin.identifier });
                success++;
            } catch {
                fail++;
            }
        }

        setReinstallingPlugins(false);
        setReinstallDialogOpen(false);

        if (success > 0) {
            toast.success(t('admin.plugins.messages.reinstall_success') + ` (${success} success, ${fail} failed)`);
            fetchPlugins();
            fetchPreviouslyInstalledPlugins();
            setTimeout(() => window.location.reload(), 2000);
        } else {
            toast.error(t('admin.plugins.messages.reinstall_failed'));
        }
    };

    // Computeds
    const configFields = useMemo(() => pluginConfig?.configSchema || [], [pluginConfig]);
    const hasConfigSchema = configFields.length > 0;

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-plugins', 'top-of-page')} />
            <PageHeader
                title={t('admin.plugins.title')}
                description={t('admin.plugins.description')}
                icon={Puzzle}
                actions={
                    <div className='flex gap-2 flex-wrap'>
                        <Button variant='outline' onClick={fetchPlugins} disabled={loading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            {t('admin.plugins.actions.refresh')}
                        </Button>
                        <Button variant='outline' onClick={checkAllUpdates} disabled={updateCheckLoading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${updateCheckLoading ? 'animate-spin' : ''}`} />
                            {t('admin.plugins.actions.check_updates')}
                        </Button>
                        <Button variant='outline' asChild>
                            <label className='cursor-pointer'>
                                <Upload className='w-4 h-4 mr-2' />
                                {t('admin.plugins.actions.upload')}
                                <input type='file' accept='.fpa' className='hidden' onChange={onUploadPlugin} />
                            </label>
                        </Button>
                        <Button onClick={() => setConfirmUrlOpen(true)}>
                            <Plus className='w-4 h-4 mr-2' />
                            {t('admin.plugins.actions.install_url')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-plugins', 'after-header')} />

            {/* Updates Banner */}
            {pluginsWithUpdates.length > 0 && (
                <div className='rounded-md border border-blue-500/30 bg-blue-500/10 p-4 text-blue-700 dark:text-blue-400'>
                    <div className='flex items-start gap-3'>
                        <RefreshCw className='h-5 w-5 shrink-0 mt-0.5' />
                        <div className='flex-1'>
                            <div className='font-semibold mb-2'>{t('admin.plugins.banners.updates.title')}</div>
                            <p className='text-sm mb-2'>{t('admin.plugins.banners.updates.description')}</p>
                            <div className='flex flex-wrap gap-2 mb-2'>
                                {pluginsWithUpdates.map((plugin) => (
                                    <Badge
                                        key={plugin.identifier}
                                        variant='secondary'
                                        className='text-xs cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors'
                                        onClick={() => checkForUpdate(plugin)}
                                    >
                                        {plugin.name || plugin.identifier}
                                        <RefreshCw className='h-3 w-3 ml-1 inline' />
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Previously Installed Banner */}
            {showPreviouslyInstalledBanner && previouslyInstalledPlugins.length > 0 && (
                <div className='rounded-xl border border-blue-500/30 bg-blue-500/10 p-5'>
                    <div className='flex items-start gap-3'>
                        <Info className='h-5 w-5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5' />
                        <div className='flex-1'>
                            <h3 className='font-semibold text-blue-900 dark:text-blue-300 mb-2'>
                                {t('admin.plugins.banners.previously_installed.title')}
                            </h3>
                            <p className='text-sm text-blue-800 dark:text-blue-400 mb-3'>
                                {t('admin.plugins.banners.previously_installed.description', {
                                    count: String(previouslyInstalledPlugins.length),
                                })}
                            </p>
                            <div className='flex flex-wrap gap-2 mb-3'>
                                {previouslyInstalledPlugins.map((plugin) => (
                                    <Badge
                                        key={plugin.id}
                                        variant='outline'
                                        className='text-xs border-blue-500/50 text-blue-700 dark:text-blue-400'
                                    >
                                        {plugin.name}
                                    </Badge>
                                ))}
                            </div>
                            <div className='flex items-center gap-2'>
                                <Button
                                    size='sm'
                                    onClick={() => {
                                        setSelectedPluginsToReinstall(
                                            new Set(previouslyInstalledPlugins.map((p) => p.identifier)),
                                        );
                                        setReinstallDialogOpen(true);
                                    }}
                                >
                                    <CloudDownload className='h-4 w-4 mr-2' />
                                    {t('admin.plugins.banners.previously_installed.action')}
                                </Button>
                                <Button
                                    size='sm'
                                    variant='outline'
                                    onClick={() => setShowPreviouslyInstalledBanner(false)}
                                >
                                    {t('admin.plugins.actions.dismiss')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Plugin Grid */}
            {plugins.length > 0 ? (
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
                    {plugins.map((plugin) => (
                        <PageCard
                            key={plugin.identifier}
                            title={plugin.name || plugin.identifier}
                            description={plugin.identifier}
                            iconSrc={plugin.icon}
                            icon={Puzzle}
                            className='h-full flex flex-col'
                            variant={
                                plugin.unmetDependencies?.length || plugin.missingConfigs?.length
                                    ? 'warning'
                                    : 'default'
                            }
                            footer={
                                <div className='flex items-center gap-2'>
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        className='flex-1'
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openPluginConfig(plugin);
                                        }}
                                    >
                                        <Settings className='h-4 w-4 mr-2' />
                                        {t('admin.plugins.actions.configure')}
                                    </Button>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        className='h-9 w-9 p-0 text-muted-foreground hover:text-destructive'
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            requestUninstall(plugin);
                                        }}
                                    >
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                </div>
                            }
                        >
                            <div className='space-y-4 flex-1'>
                                <p className='text-sm text-muted-foreground line-clamp-2 min-h-10'>
                                    {plugin.description || 'No description available'}
                                </p>

                                <div className='space-y-2'>
                                    <div className='flex items-center justify-between text-xs'>
                                        <span className='text-muted-foreground'>{t('admin.plugins.grid.version')}</span>
                                        <span className='font-mono bg-secondary/50 px-1.5 py-0.5 rounded'>
                                            v{plugin.version || '?'}
                                        </span>
                                    </div>
                                    <div className='flex items-center justify-between text-xs'>
                                        <span className='text-muted-foreground'>{t('admin.plugins.grid.author')}</span>
                                        <span className='font-medium truncate max-w-[120px]'>
                                            {plugin.author || 'Unknown'}
                                        </span>
                                    </div>
                                    {plugin.website && (
                                        <div className='flex items-center justify-between text-xs'>
                                            <span className='text-muted-foreground'>
                                                {t('admin.plugins.drawers.info.sections.website')}
                                            </span>
                                            <a
                                                href={plugin.website}
                                                target='_blank'
                                                rel='noreferrer'
                                                className='text-primary hover:underline flex items-center gap-1'
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {t('admin.plugins.grid.visit_action')} <Globe className='h-3 w-3' />
                                            </a>
                                        </div>
                                    )}
                                </div>

                                <div className='flex flex-wrap gap-1.5 pt-2'>
                                    {hasUpdateAvailable(plugin) && (
                                        <Badge
                                            className='bg-blue-500 hover:bg-blue-600 text-white border-0 cursor-pointer w-full justify-center py-1'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                checkForUpdate(plugin);
                                            }}
                                        >
                                            <RefreshCw
                                                className={`h-3 w-3 mr-1 ${
                                                    checkingUpdateId === plugin.identifier
                                                        ? 'animate-spin'
                                                        : 'animate-pulse'
                                                }`}
                                            />
                                            {checkingUpdateId === plugin.identifier
                                                ? 'Checking...'
                                                : 'Update Available'}
                                        </Badge>
                                    )}
                                    {plugin.unmetDependencies?.map((dep) => (
                                        <Badge
                                            key={dep}
                                            variant='outline'
                                            className='text-[10px] border-yellow-500/50 text-yellow-600 bg-yellow-500/10'
                                        >
                                            {t('admin.plugins.grid.missing_badge', { dep })}
                                        </Badge>
                                    ))}
                                    {plugin.missingConfigs?.map((cfg) => (
                                        <Badge
                                            key={String(cfg)}
                                            variant='outline'
                                            className='text-[10px] border-orange-500/50 text-orange-600 bg-orange-500/10'
                                        >
                                            {t('admin.plugins.grid.config_badge', { cfg: String(cfg) })}
                                        </Badge>
                                    ))}
                                    {!plugin.loaded && (
                                        <Badge variant='secondary' className='text-[10px]'>
                                            Not Loaded
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </PageCard>
                    ))}
                </div>
            ) : (
                <div className='text-center py-12'>
                    <div className='h-24 w-24 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center'>
                        <Puzzle className='h-12 w-12 text-muted-foreground' />
                    </div>
                    <h3 className='text-lg font-semibold mb-2'>{t('admin.plugins.grid.empty_title')}</h3>
                    <p className='text-muted-foreground mb-4'>{t('admin.plugins.grid.empty_description')}</p>
                    <Button onClick={fetchPlugins}>
                        <RefreshCw className='h-4 w-4 mr-2' />
                        {t('admin.plugins.actions.refresh')}
                    </Button>
                </div>
            )}

            {/* Help Cards */}
            <div className='mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10'>
                <PageCard title={t('admin.plugins.help.install.title')} icon={Upload}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.plugins.help.install.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.plugins.help.config.title')} icon={Settings}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.plugins.help.config.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.plugins.help.security.title')} icon={AlertCircle} variant='warning'>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.plugins.help.security.description')}
                    </p>
                </PageCard>
            </div>

            {/* Config Drawer */}
            <Sheet open={configDrawerOpen} onOpenChange={setConfigDrawerOpen} className='max-w-2xl'>
                <SheetHeader>
                    <SheetTitle>{t('admin.plugins.drawers.config.title')}</SheetTitle>
                    <SheetDescription>
                        {t('admin.plugins.drawers.config.description', {
                            plugin: selectedPlugin?.name || selectedPlugin?.identifier || '',
                        })}
                    </SheetDescription>
                </SheetHeader>
                <div className='px-1 pt-4 pb-8 overflow-y-auto max-h-[calc(100vh-200px)]'>
                    {configLoading ? (
                        <div className='flex items-center justify-center py-8 text-muted-foreground'>
                            <RefreshCw className='h-5 w-5 animate-spin mr-2' />
                            {t('admin.plugins.drawers.config.loading')}
                        </div>
                    ) : configError ? (
                        <div className='text-center py-8 text-destructive'>{configError}</div>
                    ) : pluginConfig ? (
                        <div className='space-y-6'>
                            {/* Info Card included in config drawer */}
                            {/* Config Fields */}
                            {/* Config Fields */}
                            <div className='rounded-xl bg-secondary/20 p-6 space-y-6'>
                                <div className='flex items-center justify-between border-b pb-4'>
                                    <h3 className='font-semibold text-lg'>
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
                                                    <label className='text-sm font-medium text-foreground/90'>
                                                        {field.display_name}
                                                    </label>
                                                    {field.required && (
                                                        <Badge
                                                            variant='secondary'
                                                            className='text-[10px] uppercase tracking-wider font-bold'
                                                        >
                                                            Required
                                                        </Badge>
                                                    )}
                                                </div>
                                                {field.type === 'boolean' ? (
                                                    <div className='flex items-center gap-3 p-3 rounded-lg border bg-background/50'>
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
                                                            className='h-4 w-4 rounded border-primary text-primary focus:ring-primary'
                                                        />
                                                        <span className='text-sm text-foreground/80'>
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
                                                            <p className='text-[11px] text-muted-foreground ml-1'>
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
                                                    <RefreshCw className='h-4 w-4 mr-2 animate-spin' />
                                                ) : (
                                                    <Save className='h-4 w-4 mr-2' />
                                                )}
                                                {t('admin.plugins.actions.save_settings')}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className='text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed'>
                                        <Settings className='h-10 w-10 mx-auto mb-3 opacity-20' />
                                        <p className='font-medium'>{t('admin.plugins.drawers.config.no_schema')}</p>
                                        <p className='text-xs mt-1 text-muted-foreground/70'>
                                            {t('admin.plugins.drawers.config.no_schema_desc')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
                <div className='p-4 border-t mt-auto'>
                    <Button variant='outline' className='w-full' onClick={() => setConfigDrawerOpen(false)}>
                        {t('admin.plugins.actions.close')}
                    </Button>
                </div>
            </Sheet>

            {/* Uninstall Dialog */}
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

            {/* Install from URL Dialog */}
            <Dialog open={confirmUrlOpen} onOpenChange={setConfirmUrlOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.plugins.dialogs.install_url.title')}</DialogTitle>
                    </DialogHeader>
                    <div className='space-y-4 py-4'>
                        <div className='space-y-2'>
                            <label className='text-sm font-medium'>Plugin URL</label>
                            <Input
                                placeholder='https://example.com/plugin.fpa'
                                value={installUrl}
                                onChange={(e) => setInstallUrl(e.target.value)}
                            />
                            <p className='text-xs text-muted-foreground'>
                                Enter the direct URL to a FeatherPanel plugin file (.fpa).
                            </p>
                        </div>
                        <div className='rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700'>
                            <div className='font-semibold mb-1 flex items-center gap-2'>
                                <AlertTriangle className='h-4 w-4' />
                                Security Warning
                            </div>
                            {t('admin.plugins.dialogs.install_url.warning')}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant='outline' onClick={() => setConfirmUrlOpen(false)}>
                            {t('admin.plugins.actions.cancel')}
                        </Button>
                        <Button onClick={installFromUrlAction} disabled={installingFromUrl}>
                            {installingFromUrl ? <RefreshCw className='w-4 h-4 animate-spin mr-2' /> : null}
                            {t('admin.plugins.actions.install')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Upload Dialog */}
            <Dialog open={confirmUploadOpen} onOpenChange={setConfirmUploadOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.plugins.dialogs.upload.title')}</DialogTitle>
                        <DialogDescription>{pendingUploadFile?.name}</DialogDescription>
                    </DialogHeader>
                    <p className='text-sm text-yellow-600 font-medium'>{t('admin.plugins.dialogs.upload.warning')}</p>
                    <DialogFooter>
                        <Button variant='outline' onClick={() => setConfirmUploadOpen(false)}>
                            {t('admin.plugins.actions.cancel')}
                        </Button>
                        <Button onClick={performUpload}>{t('admin.plugins.actions.install')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Update Dialog */}
            <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.plugins.dialogs.update.title')}</DialogTitle>
                        <DialogDescription>{updateRequirements?.package.name}</DialogDescription>
                    </DialogHeader>
                    <div className='space-y-4'>
                        <div className='rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700'>
                            <div className='font-semibold mb-1'>{t('admin.plugins.dialogs.update.available')}</div>
                            <p>
                                {t('admin.plugins.dialogs.update.version_info', {
                                    current: updateRequirements?.installed_version || 'unknown',
                                    latest: updateRequirements?.latest_version || 'unknown',
                                })}
                            </p>
                        </div>
                        <div className='rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700'>
                            <AlertCircle className='h-5 w-5 mb-1' />
                            <p>{t('admin.plugins.dialogs.update.backup_warning')}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant='outline' onClick={() => setUpdateDialogOpen(false)}>
                            {t('admin.plugins.actions.cancel')}
                        </Button>
                        <Button onClick={installUpdate} disabled={!!installingUpdateId}>
                            {installingUpdateId ? <RefreshCw className='w-4 h-4 animate-spin mr-2' /> : null}
                            {t('admin.plugins.actions.update')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reinstall Dialog */}
            <Dialog open={reinstallDialogOpen} onOpenChange={setReinstallDialogOpen}>
                <DialogContent className='max-h-[80vh] overflow-y-auto'>
                    <DialogHeader>
                        <DialogTitle>{t('admin.plugins.dialogs.reinstall.title')}</DialogTitle>
                        <DialogDescription>{t('admin.plugins.dialogs.reinstall.description')}</DialogDescription>
                    </DialogHeader>
                    <div>
                        <div className='flex justify-between items-center mb-4'>
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={() => {
                                    if (selectedPluginsToReinstall.size === previouslyInstalledPlugins.length) {
                                        setSelectedPluginsToReinstall(new Set());
                                    } else {
                                        setSelectedPluginsToReinstall(
                                            new Set(previouslyInstalledPlugins.map((p) => p.identifier)),
                                        );
                                    }
                                }}
                            >
                                {selectedPluginsToReinstall.size === previouslyInstalledPlugins.length
                                    ? t('admin.plugins.actions.deselect_all')
                                    : t('admin.plugins.actions.select_all')}
                            </Button>
                            <span className='text-sm text-muted-foreground'>
                                {selectedPluginsToReinstall.size} / {previouslyInstalledPlugins.length} selected
                            </span>
                        </div>
                        <div className='space-y-2'>
                            {previouslyInstalledPlugins.map((plugin) => (
                                <div
                                    key={plugin.id}
                                    className='flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors'
                                >
                                    <input
                                        type='checkbox'
                                        checked={selectedPluginsToReinstall.has(plugin.identifier)}
                                        onChange={(e) => {
                                            const newSet = new Set(selectedPluginsToReinstall);
                                            if (e.target.checked) newSet.add(plugin.identifier);
                                            else newSet.delete(plugin.identifier);
                                            setSelectedPluginsToReinstall(newSet);
                                        }}
                                        className='mt-1 h-4 w-4'
                                    />
                                    <div>
                                        <div className='font-medium'>{plugin.name}</div>
                                        <div className='text-sm text-muted-foreground'>{plugin.identifier}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant='outline' onClick={() => setReinstallDialogOpen(false)}>
                            {t('admin.plugins.actions.cancel')}
                        </Button>
                        <Button
                            onClick={reinstallSelected}
                            disabled={reinstallingPlugins || selectedPluginsToReinstall.size === 0}
                        >
                            {reinstallingPlugins ? <RefreshCw className='h-4 w-4 animate-spin mr-2' /> : null}
                            {t('admin.plugins.dialogs.reinstall.button_label', {
                                count: String(selectedPluginsToReinstall.size),
                            })}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <WidgetRenderer widgets={getWidgets('admin-plugins', 'bottom-of-page')} />
        </div>
    );
}
