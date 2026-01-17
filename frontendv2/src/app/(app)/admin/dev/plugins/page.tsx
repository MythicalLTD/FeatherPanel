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

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Badge } from '@/components/ui/badge';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { useDeveloperMode } from '@/hooks/useDeveloperMode';
import { cn } from '@/lib/utils';
import {
    Code,
    Plus,
    RefreshCw,
    Download,
    Trash2,
    Pencil,
    Database,
    Clock,
    Terminal,
    Upload,
    AlertCircle,
    Info,
    Search,
    Package,
    Users,
    Lock,
    Loader2,
} from 'lucide-react';
import type { ResourceBadge } from '@/components/featherui/ResourceCard';

interface Plugin {
    name: string;
    identifier: string;
    description: string;
    version: string;
    target?: string;
    author: string[];
    flags: string[];
    dependencies: string[];
    requiredConfigs: string[];
    config?: ConfigField[];
    icon: string;
    status: string;
    dependencies_met: boolean;
    required_configs_set: boolean;
    settings: Array<{
        key: string;
        value: string;
        locked: boolean;
    }>;
}

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

interface CreationOption {
    id: string;
    name: string;
    description: string;
    icon: string;
    fields: Record<
        string,
        {
            label: string;
            type: string;
            required: boolean;
            placeholder: string;
            default?: string;
        }
    >;
}

export default function PluginManagerPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { isDeveloperModeEnabled, loading: developerModeLoading } = useDeveloperMode();
    const [loading, setLoading] = useState(true);
    const [plugins, setPlugins] = useState<Plugin[]>([]);
    const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
    const [showDetailsSheet, setShowDetailsSheet] = useState(false);
    const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});
    const [creationOptions, setCreationOptions] = useState<CreationOption[]>([]);
    const [isCreateActionDialogOpen, setIsCreateActionDialogOpen] = useState(false);
    const [selectedCreateOption, setSelectedCreateOption] = useState<CreationOption | null>(null);
    const [selectedPluginForAction, setSelectedPluginForAction] = useState<Plugin | null>(null);
    const [createActionFormData, setCreateActionFormData] = useState<Record<string, string>>({});
    const [isCreatingAction, setIsCreatingAction] = useState(false);
    const [selectedFileToUpload, setSelectedFileToUpload] = useState<File | null>(null);
    const [confirmUninstallOpen, setConfirmUninstallOpen] = useState(false);
    const [selectedPluginForUninstall, setSelectedPluginForUninstall] = useState<Plugin | null>(null);
    const [isUninstalling, setIsUninstalling] = useState(false);
    const [isResyncingSymlinks, setIsResyncingSymlinks] = useState(false);
    const [resyncingPlugin, setResyncingPlugin] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-dev-plugins');

    const fetchPlugins = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get<{ success: boolean; data: Plugin[]; message?: string }>(
                '/api/admin/plugin-manager',
            );
            if (response.data.success) {
                setPlugins(response.data.data || []);
            } else {
                toast.error(response.data.message || t('admin.dev.plugins.messages.fetch_failed'));
            }
        } catch (error) {
            console.error('Failed to fetch plugins:', error);
            toast.error(t('admin.dev.plugins.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    const loadCreationOptions = useCallback(async () => {
        try {
            const response = await axios.get<{ success: boolean; data: Record<string, CreationOption> }>(
                '/api/admin/plugin-tools/creation-options',
            );
            if (response.data.success) {
                const options: CreationOption[] = Object.entries(response.data.data).map(([key, option]) => ({
                    id: key,
                    name: option.name,
                    description: option.description,
                    icon: option.icon,
                    fields: option.fields,
                }));
                setCreationOptions(options);
            }
        } catch (error) {
            console.error('Failed to load creation options:', error);
        }
    }, []);

    useEffect(() => {
        // Only fetch data if developer mode is enabled
        if (isDeveloperModeEnabled === true) {
            fetchPlugins();
            loadCreationOptions();
            fetchWidgets();
        }
    }, [fetchPlugins, loadCreationOptions, fetchWidgets, isDeveloperModeEnabled]);

    const showPluginDetails = (plugin: Plugin) => {
        setSelectedPlugin(plugin);
        const form: Record<string, string> = {};
        plugin.settings.forEach((setting) => {
            form[setting.key] = setting.value;
        });
        setSettingsForm(form);
        setShowDetailsSheet(true);
    };

    const filteredPlugins = plugins.filter((plugin) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            plugin.name.toLowerCase().includes(query) ||
            plugin.identifier.toLowerCase().includes(query) ||
            plugin.description.toLowerCase().includes(query) ||
            plugin.author.some((author) => author.toLowerCase().includes(query))
        );
    });

    const updatePluginSettings = async () => {
        if (!selectedPlugin || !settingsForm) return;

        setLoading(true);
        try {
            const savePromises = Object.entries(settingsForm).map(async ([key, value]) => {
                await axios.post(`/api/admin/plugins/${selectedPlugin.identifier}/settings/set`, {
                    key,
                    value,
                });
            });

            await Promise.all(savePromises);
            await fetchPlugins();
            toast.success(t('admin.dev.plugins.messages.settings_saved'));
        } catch (error) {
            console.error('Failed to save settings:', error);
            toast.error(t('admin.dev.plugins.messages.settings_save_failed'));
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'installed':
                return 'bg-green-500';
            case 'enabled':
                return 'bg-blue-500';
            case 'disabled':
                return 'bg-gray-500';
            case 'error':
                return 'bg-red-500';
            default:
                return 'bg-gray-500';
        }
    };

    const openCreateActionDialog = (option: CreationOption, plugin: Plugin) => {
        setSelectedCreateOption(option);
        setSelectedPluginForAction(plugin);
        const formData: Record<string, string> = {};
        Object.entries(option.fields).forEach(([key, field]) => {
            formData[key] = field.default || '';
        });
        setCreateActionFormData(formData);
        setIsCreateActionDialogOpen(true);
    };

    const closeCreateActionDialog = () => {
        setIsCreateActionDialogOpen(false);
        setSelectedCreateOption(null);
        setSelectedPluginForAction(null);
        setSelectedFileToUpload(null);
        setCreateActionFormData({});
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, key: string) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFileToUpload(file);
            setCreateActionFormData((prev) => ({ ...prev, [key]: file.name }));
        }
    };

    const createActionItem = async () => {
        if (!selectedCreateOption || !selectedPluginForAction) return;

        setIsCreatingAction(true);
        try {
            let formData: FormData | URLSearchParams;

            if (selectedCreateOption.id === 'public_file' && selectedFileToUpload) {
                formData = new FormData();
                formData.append('plugin_id', selectedPluginForAction.identifier);
                formData.append('file_type', selectedCreateOption.id);
                formData.append('file', selectedFileToUpload);
            } else {
                formData = new URLSearchParams({
                    plugin_id: selectedPluginForAction.identifier,
                    file_type: selectedCreateOption.id,
                    ...createActionFormData,
                });
            }

            const headers: Record<string, string> = {};
            if (!(formData instanceof FormData)) {
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }

            const response = await axios.post('/api/admin/plugin-tools/create-file', formData, { headers });
            if (response.data.success) {
                toast.success(
                    t('admin.dev.plugins.messages.file_created', {
                        name: selectedCreateOption.name,
                        plugin: selectedPluginForAction.name,
                    }),
                );
                closeCreateActionDialog();
                await fetchPlugins();
            } else {
                toast.error(response.data.message || t('admin.dev.plugins.messages.file_create_failed'));
            }
        } catch (error) {
            console.error('Creation error:', error);
            toast.error(t('admin.dev.plugins.messages.file_create_failed'));
        } finally {
            setIsCreatingAction(false);
        }
    };

    const exportPlugin = async (plugin: Plugin) => {
        try {
            const response = await axios.get(`/api/admin/plugins/${plugin.identifier}/export`, {
                responseType: 'blob',
            });
            const url = URL.createObjectURL(new Blob([response.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `${plugin.identifier}.fpa`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success(t('admin.dev.plugins.messages.exported', { name: plugin.name }));
        } catch (error) {
            console.error('Export error:', error);
            toast.error(t('admin.dev.plugins.messages.export_failed'));
        }
    };

    const requestUninstall = (plugin: Plugin) => {
        setSelectedPluginForUninstall(plugin);
        setConfirmUninstallOpen(true);
    };

    const onUninstall = async (plugin: Plugin) => {
        setIsUninstalling(true);
        try {
            await axios.post(`/api/admin/plugins/${plugin.identifier}/uninstall`);
            await fetchPlugins();
            toast.success(t('admin.dev.plugins.messages.uninstalled', { name: plugin.name || plugin.identifier }));
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error('Uninstall error:', error);
            toast.error(t('admin.dev.plugins.messages.uninstall_failed'));
        } finally {
            setIsUninstalling(false);
            setConfirmUninstallOpen(false);
            setSelectedPluginForUninstall(null);
        }
    };

    const resyncSymlinks = async (plugin: Plugin) => {
        setIsResyncingSymlinks(true);
        setResyncingPlugin(plugin.identifier);
        try {
            const response = await axios.post(`/api/admin/plugins/${plugin.identifier}/resync-symlinks`);
            if (response.data.success) {
                toast.success(
                    t('admin.dev.plugins.messages.symlinks_resynced', {
                        name: plugin.name || plugin.identifier,
                    }),
                );
            } else {
                throw new Error(response.data.message || 'Failed to resync symlinks');
            }
        } catch (error) {
            console.error('Resync symlinks error:', error);
            toast.error(t('admin.dev.plugins.messages.symlinks_resync_failed'));
        } finally {
            setIsResyncingSymlinks(false);
            setResyncingPlugin(null);
        }
    };

    const getIconComponent = (iconName: string) => {
        switch (iconName) {
            case 'database':
                return Database;
            case 'clock':
                return Clock;
            case 'terminal':
                return Terminal;
            case 'upload':
                return Upload;
            default:
                return Database;
        }
    };

    const configFields = selectedPlugin?.config || [];

    // Developer Mode Check
    if (developerModeLoading) {
        return (
            <div className='flex items-center justify-center p-12'>
                <Loader2 className='w-8 h-8 animate-spin text-primary' />
            </div>
        );
    }

    if (isDeveloperModeEnabled === false) {
        return (
            <div className='space-y-6'>
                <WidgetRenderer widgets={getWidgets('admin-dev-plugins', 'top-of-page')} />
                <EmptyState
                    title={t('admin.dev.developerModeRequired')}
                    description={
                        t('admin.dev.developerModeDescription') ||
                        'Developer mode must be enabled in settings to access developer tools.'
                    }
                    icon={Lock}
                    action={
                        <Button variant='outline' onClick={() => router.push('/admin/settings')}>
                            {t('admin.dev.goToSettings')}
                        </Button>
                    }
                />
                <WidgetRenderer widgets={getWidgets('admin-dev-plugins', 'bottom-of-page')} />
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-dev-plugins', 'top-of-page')} />
            <PageHeader
                title={t('admin.dev.plugins.title')}
                description={t('admin.dev.plugins.description')}
                icon={Code}
                actions={
                    <div className='flex gap-2'>
                        <Button variant='outline' onClick={fetchPlugins} disabled={loading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            {t('admin.dev.plugins.actions.refresh')}
                        </Button>
                        <Button onClick={() => router.push('/admin/dev/plugins/create')}>
                            <Plus className='w-4 h-4 mr-2' />
                            {t('admin.dev.plugins.actions.create')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-dev-plugins', 'after-header')} />

            <PageCard
                title={t('admin.dev.plugins.sdk.title')}
                description={t('admin.dev.plugins.sdk.update_message')}
                icon={AlertCircle}
            >
                <div className='flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-2xl border border-primary/20'>
                    <div className='p-2 bg-primary/20 rounded-xl'>
                        <Code className='h-5 w-5 text-primary' />
                    </div>
                    <div>
                        <div className='text-[10px] uppercase tracking-wider text-primary/70 font-bold'>
                            SDK Version
                        </div>
                        <div className='text-lg font-black text-primary leading-tight'>v3.5 (Aurora) 04.12.2025</div>
                    </div>
                </div>
            </PageCard>

            <WidgetRenderer widgets={getWidgets('admin-dev-plugins', 'before-list')} />

            {/* Search */}
            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/50 backdrop-blur-md p-4 rounded-2xl border border-border shadow-sm'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.dev.plugins.search_placeholder')}
                        className='pl-10 h-11'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <EmptyState
                    title={t('admin.dev.plugins.loading')}
                    description={t('admin.dev.plugins.loading')}
                    icon={RefreshCw}
                />
            ) : filteredPlugins.length === 0 ? (
                <EmptyState
                    icon={searchQuery ? Package : Code}
                    title={searchQuery ? t('admin.dev.plugins.no_results') : t('admin.dev.plugins.empty.title')}
                    description={
                        searchQuery
                            ? t('admin.dev.plugins.search_placeholder')
                            : t('admin.dev.plugins.empty.description')
                    }
                    action={
                        !searchQuery && (
                            <Button onClick={() => router.push('/admin/dev/plugins/create')}>
                                {t('admin.dev.plugins.actions.create')}
                            </Button>
                        )
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-6'>
                    {filteredPlugins.map((plugin) => {
                        const badges: ResourceBadge[] = [
                            {
                                label: plugin.status,
                                className: getStatusColor(plugin.status),
                            },
                            {
                                label: `v${plugin.version}`,
                                className: 'bg-muted text-muted-foreground border-border',
                            },
                            plugin.dependencies_met
                                ? {
                                      label: t('admin.dev.plugins.dependencies_ok'),
                                      className: 'bg-green-500/10 text-green-600 border-green-500/20',
                                  }
                                : {
                                      label: t('admin.dev.plugins.dependencies_missing'),
                                      className: 'bg-red-500/10 text-red-600 border-red-500/20',
                                  },
                            plugin.required_configs_set
                                ? {
                                      label: t('admin.dev.plugins.configured'),
                                      className: 'bg-green-500/10 text-green-600 border-green-500/20',
                                  }
                                : {
                                      label: t('admin.dev.plugins.needs_config'),
                                      className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
                                  },
                        ];

                        return (
                            <ResourceCard
                                key={plugin.identifier}
                                icon={Code}
                                title={plugin.name}
                                subtitle={plugin.identifier}
                                badges={badges}
                                description={
                                    <div className='space-y-4'>
                                        <p className='text-sm text-muted-foreground line-clamp-2'>
                                            {plugin.description || t('admin.dev.plugins.no_description')}
                                        </p>
                                        <div className='flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-medium'>
                                            <div className='flex items-center gap-1.5'>
                                                <Users className='h-3.5 w-3.5' />
                                                {plugin.author.join(', ')}
                                            </div>
                                            {plugin.target && (
                                                <div className='flex items-center gap-1.5'>
                                                    <Code className='h-3.5 w-3.5' />
                                                    {plugin.target}
                                                </div>
                                            )}
                                        </div>
                                        {plugin.flags.length > 0 && (
                                            <div className='flex flex-wrap gap-1.5'>
                                                {plugin.flags.slice(0, 3).map((flag) => (
                                                    <Badge
                                                        key={flag}
                                                        variant='secondary'
                                                        className='px-2 py-0 h-6 text-[10px] bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all cursor-default rounded-lg border-transparent'
                                                    >
                                                        {flag}
                                                    </Badge>
                                                ))}
                                                {plugin.flags.length > 3 && (
                                                    <span className='text-[10px] text-muted-foreground font-medium flex items-center h-6'>
                                                        +{plugin.flags.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                }
                                onClick={() => showPluginDetails(plugin)}
                                className='border-primary/20 hover:border-primary/40 cursor-pointer'
                                highlightClassName='bg-linear-to-br from-primary/10 via-transparent to-transparent'
                                iconClassName='text-primary'
                                iconWrapperClassName='bg-primary/10 border-primary/20'
                                actions={
                                    <div className='flex items-center gap-2'>
                                        <Button variant='outline' size='sm' onClick={() => showPluginDetails(plugin)}>
                                            <Info className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                router.push(`/admin/dev/plugins/${plugin.identifier}/edit`);
                                            }}
                                        >
                                            <Pencil className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                exportPlugin(plugin);
                                            }}
                                        >
                                            <Download className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            disabled={isResyncingSymlinks && resyncingPlugin === plugin.identifier}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                resyncSymlinks(plugin);
                                            }}
                                        >
                                            <RefreshCw
                                                className={`h-4 w-4 ${
                                                    isResyncingSymlinks && resyncingPlugin === plugin.identifier
                                                        ? 'animate-spin'
                                                        : ''
                                                }`}
                                            />
                                        </Button>
                                        <Button
                                            variant='destructive'
                                            size='sm'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                requestUninstall(plugin);
                                            }}
                                        >
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                        {creationOptions.length > 0 && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger
                                                    as={Button}
                                                    type='button'
                                                    variant='outline'
                                                    size='sm'
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                    }}
                                                >
                                                    <Plus className='h-4 w-4' />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align='end' className='w-56'>
                                                    {creationOptions.map((option) => {
                                                        const Icon = getIconComponent(option.icon);
                                                        return (
                                                            <DropdownMenuItem
                                                                key={option.id}
                                                                className='cursor-pointer'
                                                                onClick={() => {
                                                                    openCreateActionDialog(option, plugin);
                                                                }}
                                                            >
                                                                <div className='flex items-start gap-2 w-full'>
                                                                    <Icon className='h-4 w-4 mt-0.5 shrink-0' />
                                                                    <div className='flex-1 min-w-0'>
                                                                        <div className='font-medium text-xs'>
                                                                            {option.name}
                                                                        </div>
                                                                        <div className='text-xs text-muted-foreground'>
                                                                            {option.description}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </DropdownMenuItem>
                                                        );
                                                    })}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                }
                            />
                        );
                    })}
                </div>
            )}

            {/* Plugin Details Sheet */}
            <Sheet open={showDetailsSheet} onOpenChange={setShowDetailsSheet}>
                <div className='h-full flex flex-col'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.dev.plugins.details.title')}</SheetTitle>
                        <SheetDescription>{t('admin.dev.plugins.description')}</SheetDescription>
                    </SheetHeader>

                    <div className='flex-1 overflow-y-auto pr-2 -mr-2 space-y-8'>
                        {selectedPlugin && (
                            <div className='space-y-8 pb-4'>
                                <div className='flex items-start gap-6'>
                                    <div className='relative h-24 w-24 rounded-3xl bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center border-2 border-primary/20 overflow-hidden'>
                                        <Code className='h-12 w-12 text-primary/60' />
                                    </div>
                                    <div className='flex-1 space-y-2'>
                                        <h3 className='text-3xl font-bold tracking-tight'>{selectedPlugin.name}</h3>
                                        <div className='flex flex-wrap gap-2'>
                                            <Badge
                                                variant='outline'
                                                className='border-primary/20 bg-primary/5 text-primary text-xs px-3 py-1'
                                            >
                                                {selectedPlugin.identifier}
                                            </Badge>
                                            <Badge
                                                className={cn(
                                                    'text-xs px-3 py-1',
                                                    getStatusColor(selectedPlugin.status),
                                                )}
                                            >
                                                {selectedPlugin.status}
                                            </Badge>
                                            <Badge variant='outline' className='text-xs px-3 py-1'>
                                                v{selectedPlugin.version}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div className='space-y-4'>
                                    <h4 className='text-lg font-bold flex items-center gap-2'>
                                        <Info className='h-5 w-5 text-primary' />
                                        {t('admin.dev.plugins.details.info')}
                                    </h4>
                                    <p className='text-muted-foreground leading-relaxed whitespace-pre-wrap rounded-2xl bg-muted/30 p-5 border border-border/50 text-sm'>
                                        {selectedPlugin.description || t('admin.dev.plugins.no_description')}
                                    </p>
                                </div>

                                <div className='grid grid-cols-2 gap-4'>
                                    <div className='space-y-1 p-5 rounded-2xl bg-muted/30 border border-border/50'>
                                        <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
                                            {t('admin.dev.plugins.details.author')}
                                        </p>
                                        <p className='font-semibold'>{selectedPlugin.author.join(', ')}</p>
                                    </div>
                                    <div className='space-y-1 p-5 rounded-2xl bg-muted/30 border border-border/50'>
                                        <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
                                            {t('admin.dev.plugins.details.version')}
                                        </p>
                                        <p className='font-semibold'>{selectedPlugin.version}</p>
                                    </div>
                                    {selectedPlugin.target && (
                                        <div className='space-y-1 p-5 rounded-2xl bg-muted/30 border border-border/50'>
                                            <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
                                                Target
                                            </p>
                                            <p className='font-semibold'>{selectedPlugin.target}</p>
                                        </div>
                                    )}
                                    <div className='space-y-1 p-5 rounded-2xl bg-muted/30 border border-border/50'>
                                        <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
                                            {t('admin.dev.plugins.details.status')}
                                        </p>
                                        <p className={cn('font-bold', getStatusColor(selectedPlugin.status))}>
                                            {selectedPlugin.status}
                                        </p>
                                    </div>
                                </div>

                                {selectedPlugin.flags.length > 0 && (
                                    <div className='space-y-4'>
                                        <h4 className='text-lg font-bold'>{t('admin.dev.plugins.details.flags')}</h4>
                                        <div className='flex flex-wrap gap-2'>
                                            {selectedPlugin.flags.map((flag) => (
                                                <Badge key={flag} variant='outline' className='px-3 py-1'>
                                                    {flag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedPlugin.dependencies.length > 0 && (
                                    <div className='space-y-4'>
                                        <h4 className='text-lg font-bold'>
                                            {t('admin.dev.plugins.details.dependencies')}
                                        </h4>
                                        <div className='space-y-2'>
                                            {selectedPlugin.dependencies.map((dep, idx) => (
                                                <div
                                                    key={idx}
                                                    className='text-sm p-3 rounded-xl bg-muted/30 border border-border/50'
                                                >
                                                    {dep}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className='space-y-4'>
                                    <h4 className='text-lg font-bold flex items-center gap-2'>
                                        <Info className='h-5 w-5 text-primary' />
                                        {t('admin.dev.plugins.details.configuration')}
                                    </h4>
                                    {configFields.length > 0 ? (
                                        <div className='space-y-4'>
                                            {configFields.map((field) => (
                                                <div key={field.name} className='space-y-2'>
                                                    <div className='flex items-center justify-between'>
                                                        <Label className='text-sm font-medium'>
                                                            {field.display_name}
                                                        </Label>
                                                        {field.required && (
                                                            <Badge variant='secondary' className='text-xs'>
                                                                {t('admin.dev.plugins.details.required')}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {field.type === 'boolean' ? (
                                                        <div className='flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/50'>
                                                            <input
                                                                type='checkbox'
                                                                checked={settingsForm[field.name] === 'true'}
                                                                onChange={(e) =>
                                                                    setSettingsForm((prev) => ({
                                                                        ...prev,
                                                                        [field.name]: e.target.checked
                                                                            ? 'true'
                                                                            : 'false',
                                                                    }))
                                                                }
                                                            />
                                                            <span className='text-sm'>{field.display_name}</span>
                                                        </div>
                                                    ) : (
                                                        <Input
                                                            type={
                                                                field.type === 'email'
                                                                    ? 'email'
                                                                    : field.type === 'password'
                                                                      ? 'password'
                                                                      : field.type === 'number'
                                                                        ? 'number'
                                                                        : 'text'
                                                            }
                                                            value={settingsForm[field.name] || ''}
                                                            onChange={(e) =>
                                                                setSettingsForm((prev) => ({
                                                                    ...prev,
                                                                    [field.name]: e.target.value,
                                                                }))
                                                            }
                                                            placeholder={
                                                                field.default ||
                                                                `Enter ${field.display_name.toLowerCase()}`
                                                            }
                                                            className='rounded-xl'
                                                        />
                                                    )}
                                                    <p className='text-xs text-muted-foreground'>{field.description}</p>
                                                    {field.validation.message && (
                                                        <p className='text-xs text-orange-600'>
                                                            {field.validation.message}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className='text-center py-8 text-muted-foreground rounded-2xl bg-muted/30 border border-border/50'>
                                            <div className='w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-2'>
                                                <span className='text-xl'>⚙️</span>
                                            </div>
                                            <p>{t('admin.dev.plugins.details.no_config_schema')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <SheetFooter className='mt-8'>
                        <Button
                            variant='outline'
                            className='flex-1 rounded-xl h-14 text-sm font-bold'
                            onClick={() => setShowDetailsSheet(false)}
                        >
                            {t('common.close')}
                        </Button>
                        {selectedPlugin && configFields.length > 0 && (
                            <Button
                                className='flex-2 rounded-xl h-14 text-sm font-bold shadow-lg shadow-primary/20'
                                disabled={loading}
                                onClick={updatePluginSettings}
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw className='h-4 w-4 animate-spin mr-2' />
                                        {t('admin.dev.plugins.saving')}
                                    </>
                                ) : (
                                    t('admin.dev.plugins.details.save_settings')
                                )}
                            </Button>
                        )}
                    </SheetFooter>
                </div>
            </Sheet>

            {/* Create Action Sheet */}
            <Sheet open={isCreateActionDialogOpen} onOpenChange={setIsCreateActionDialogOpen}>
                <div className='h-full flex flex-col'>
                    <SheetHeader>
                        {selectedCreateOption && selectedPluginForAction && (
                            <>
                                <SheetTitle className='flex items-center gap-2'>
                                    {(() => {
                                        const Icon = getIconComponent(selectedCreateOption.icon);
                                        return <Icon className='h-5 w-5' />;
                                    })()}
                                    {t('admin.dev.plugins.create_action.title', { name: selectedCreateOption.name })}
                                </SheetTitle>
                                <SheetDescription>
                                    {selectedCreateOption.description} <strong>{selectedPluginForAction.name}</strong>
                                </SheetDescription>
                            </>
                        )}
                    </SheetHeader>

                    <div className='flex-1 overflow-y-auto pr-2 -mr-2 space-y-6 py-4'>
                        {selectedCreateOption && (
                            <>
                                {Object.entries(selectedCreateOption.fields).map(([key, field]) => (
                                    <div key={key} className='space-y-2'>
                                        <Label htmlFor={key}>
                                            {field.label}
                                            {field.required && <span className='text-red-500'>*</span>}
                                        </Label>
                                        {field.type === 'file' && (
                                            <div className='mb-2'>
                                                <div className='p-3 mb-2 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs flex items-center gap-2'>
                                                    <AlertCircle className='h-4 w-4 font-bold shrink-0' />
                                                    <span>{t('admin.dev.plugins.create_action.file_warning')}</span>
                                                </div>
                                            </div>
                                        )}
                                        {field.type === 'file' ? (
                                            <Input
                                                id={key}
                                                type='file'
                                                required={field.required}
                                                accept='.txt,.html,.css,.js,.json,.xml,.md,.pdf,.png,.jpg,.jpeg,.gif,.svg'
                                                onChange={(e) => handleFileUpload(e, key)}
                                                className='rounded-xl'
                                            />
                                        ) : field.type === 'textarea' ? (
                                            <Textarea
                                                id={key}
                                                value={createActionFormData[key] || ''}
                                                onChange={(e) =>
                                                    setCreateActionFormData((prev) => ({
                                                        ...prev,
                                                        [key]: e.target.value,
                                                    }))
                                                }
                                                placeholder={field.placeholder}
                                                required={field.required}
                                                className='min-h-[80px] rounded-xl'
                                            />
                                        ) : (
                                            <Input
                                                id={key}
                                                type={field.type}
                                                value={createActionFormData[key] || ''}
                                                onChange={(e) =>
                                                    setCreateActionFormData((prev) => ({
                                                        ...prev,
                                                        [key]: e.target.value,
                                                    }))
                                                }
                                                placeholder={field.placeholder}
                                                required={field.required}
                                                className='rounded-xl'
                                            />
                                        )}
                                    </div>
                                ))}
                            </>
                        )}
                    </div>

                    <SheetFooter className='mt-8'>
                        <Button
                            variant='outline'
                            className='flex-1 rounded-xl h-14 text-sm font-bold'
                            disabled={isCreatingAction}
                            onClick={closeCreateActionDialog}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            className='flex-2 rounded-xl h-14 text-sm font-bold shadow-lg shadow-primary/20'
                            disabled={isCreatingAction}
                            onClick={createActionItem}
                        >
                            {isCreatingAction ? (
                                <>
                                    <RefreshCw className='h-4 w-4 animate-spin mr-2' />
                                    {t('admin.dev.plugins.create_action.creating')}
                                </>
                            ) : (
                                t('common.create')
                            )}
                        </Button>
                    </SheetFooter>
                </div>
            </Sheet>

            {/* Confirm Uninstall Sheet */}
            <Sheet open={confirmUninstallOpen} onOpenChange={setConfirmUninstallOpen}>
                <div className='h-full flex flex-col'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.dev.plugins.uninstall.title')}</SheetTitle>
                        <SheetDescription>
                            {t('admin.dev.plugins.uninstall.description', {
                                name: selectedPluginForUninstall?.name || selectedPluginForUninstall?.identifier || '',
                            })}
                        </SheetDescription>
                    </SheetHeader>

                    <SheetFooter className='mt-8'>
                        <Button
                            variant='outline'
                            className='flex-1 rounded-xl h-14 text-sm font-bold'
                            disabled={isUninstalling}
                            onClick={() => setConfirmUninstallOpen(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant='destructive'
                            className='flex-2 rounded-xl h-14 text-sm font-bold shadow-lg shadow-destructive/20'
                            disabled={isUninstalling}
                            onClick={() => selectedPluginForUninstall && onUninstall(selectedPluginForUninstall)}
                        >
                            {isUninstalling ? (
                                <>
                                    <RefreshCw className='h-4 w-4 animate-spin mr-2' />
                                    {t('admin.dev.plugins.uninstall.deleting')}
                                </>
                            ) : (
                                t('common.delete')
                            )}
                        </Button>
                    </SheetFooter>
                </div>
            </Sheet>

            <WidgetRenderer widgets={getWidgets('admin-dev-plugins', 'bottom-of-page')} />
        </div>
    );
}
