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

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { useFeatherCloud, type CreditsData, type TeamData } from '@/hooks/useFeatherCloud';
import axios from 'axios';
import { toast } from 'sonner';
import {
    Puzzle,
    CloudDownload,
    BadgeCheck,
    RefreshCw,
    AlertCircle,
    Info,
    Key,
    Coins,
    Users,
    ArrowLeft,
    Globe,
    X,
    BadgeCheck as CheckIcon,
    ChevronLeft,
    ChevronRight,
    Search,
    Lock,
    Package,
    Crown,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Layers,
} from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { ResourceCard, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select-native';
import { cn } from '@/lib/utils';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface OnlineAddon {
    identifier: string;
    name: string;
    description?: string;
    icon?: string | null;
    website?: string | null;
    author?: string | null;
    tags: string[];
    verified: boolean;
    downloads: number;
    premium: number;
    premium_price?: string;
    premium_link?: string;
    latest_version?: {
        version: string;
        download_url: string;
        file_size?: number;
        changelog?: string;
        dependencies?: string[];
        created_at?: string;
    };
}

interface OnlinePagination {
    current_page: number;
    total_pages: number;
    total_records: number;
}

interface DependencyCheck {
    dependency: string;
    type: 'composer' | 'plugin' | 'php' | 'php-ext' | 'unknown';
    name: string;
    met: boolean;
    message: string;
}

interface RequirementsCheckResult {
    can_install: boolean;
    already_installed: boolean;
    update_available: boolean;
    installed_version: string | null;
    latest_version: string | null;
    package: {
        identifier: string;
        name: string;
        description: string | null;
        version: string | null;
        author: string | null;
        verified: boolean;
        premium: number;
    };
    dependencies: {
        checks: DependencyCheck[];
        all_met: boolean;
    };
    panel_version: {
        ok: boolean;
        message: string | null;
        min: string | null;
        max: string | null;
    };
}

export default function PluginsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { fetchCredits, fetchTeam } = useFeatherCloud();

    const [cloudAccountConfigured, setCloudAccountConfigured] = useState(false);
    const [cloudCredits, setCloudCredits] = useState<CreditsData | null>(null);
    const [cloudTeam, setCloudTeam] = useState<TeamData | null>(null);

    const [onlineAddons, setOnlineAddons] = useState<OnlineAddon[]>([]);
    const [onlineLoading, setOnlineLoading] = useState(false);
    const [onlineError, setOnlineError] = useState<string | null>(null);
    const [onlinePagination, setOnlinePagination] = useState<OnlinePagination | null>(null);
    const [currentOnlinePage, setCurrentOnlinePage] = useState(1);
    const [onlineSearch, setOnlineSearch] = useState('');
    const [verifiedOnly, setVerifiedOnly] = useState(false);
    const [sortBy, setSortBy] = useState('newest');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const [packageDetailsOpen, setPackageDetailsOpen] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<OnlineAddon | null>(null);
    const [packageDetailsLoading, setPackageDetailsLoading] = useState(false);
    const [popularAddons, setPopularAddons] = useState<OnlineAddon[]>([]);

    const [installedPluginIds, setInstalledPluginIds] = useState<string[]>([]);
    const [installingOnlineId, setInstallingOnlineId] = useState<string | null>(null);
    const [selectedPluginIds, setSelectedPluginIds] = useState<string[]>([]);
    const [queuedPlugins, setQueuedPlugins] = useState<Record<string, string>>({});
    const [bulkInstalling, setBulkInstalling] = useState(false);

    // Dependency check state
    const [requirementsDialogOpen, setRequirementsDialogOpen] = useState(false);
    const [requirementsCheck, setRequirementsCheck] = useState<RequirementsCheckResult | null>(null);
    const [checkingRequirements, setCheckingRequirements] = useState(false);
    const [pendingInstallId, setPendingInstallId] = useState<string | null>(null);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-feathercloud-plugins');

    const fetchCloudData = useCallback(async () => {
        try {
            const credsResponse = await axios.get('/api/admin/cloud/credentials');
            const hasKeys = !!credsResponse.data?.data?.cloud_credentials?.public_key;
            setCloudAccountConfigured(hasKeys);

            if (hasKeys) {
                const credits = await fetchCredits();
                const team = await fetchTeam();
                setCloudCredits(credits);
                setCloudTeam(team);
            }
        } catch (error) {
            console.error('Failed to fetch cloud credentials:', error);
        }
    }, [fetchCredits, fetchTeam]);

    const fetchInstalledPlugins = useCallback(async () => {
        try {
            const response = await axios.get('/api/admin/plugins');
            const plugins = response.data?.data?.plugins || {};
            setInstalledPluginIds(Object.keys(plugins));
        } catch (error) {
            console.error('Failed to fetch installed plugins:', error);
        }
    }, []);

    const fetchPopularAddons = useCallback(async () => {
        try {
            const response = await axios.get('/api/admin/plugins/online/popular');
            setPopularAddons(response.data?.data?.addons || []);
        } catch (error) {
            console.error('Failed to fetch popular addons:', error);
        }
    }, []);

    const fetchOnlineAddons = useCallback(
        async (page = currentOnlinePage, search = onlineSearch) => {
            setOnlineLoading(true);
            setOnlineError(null);

            const params = new URLSearchParams({
                page: String(page),
                per_page: '21',
                sort_by: sortBy,
                sort_order: 'DESC',
            });

            if (search) params.set('q', search);
            if (verifiedOnly) params.set('verified', '1');
            if (selectedTag) params.set('tag', selectedTag);

            try {
                const response = await axios.get(`/api/admin/plugins/online/list?${params.toString()}`);
                const addons: OnlineAddon[] = response.data?.data?.addons || [];
                setOnlineAddons(addons);
                setOnlinePagination(response.data?.data?.pagination || null);
            } catch (err: unknown) {
                const e = err as { response?: { data?: { message?: string } } };
                setOnlineError(e?.response?.data?.message || t('admin.marketplace.plugins.loading_error'));
            } finally {
                setOnlineLoading(false);
            }
        },
        [currentOnlinePage, onlineSearch, verifiedOnly, sortBy, selectedTag, t],
    );

    useEffect(() => {
        fetchWidgets();
        fetchCloudData();
        fetchPopularAddons();
        fetchInstalledPlugins();
    }, [fetchCloudData, fetchPopularAddons, fetchInstalledPlugins, fetchWidgets]);

    useEffect(() => {
        fetchOnlineAddons();
    }, [fetchOnlineAddons]);

    const viewPackageDetails = async (addon: OnlineAddon) => {
        setSelectedPackage(addon);
        setPackageDetailsOpen(true);
        setPackageDetailsLoading(true);
        try {
            await axios.get(`/api/admin/plugins/online/${addon.identifier}`);
        } catch {
            toast.error(t('admin.marketplace.plugins.details.error'));
        } finally {
            setPackageDetailsLoading(false);
        }
    };

    const checkRequirements = async (identifier: string): Promise<RequirementsCheckResult | null> => {
        try {
            const response = await axios.get(`/api/admin/plugins/online/${identifier}/check`);
            return response.data?.data || null;
        } catch (err) {
            console.error('Failed to check requirements:', err);
            return null;
        }
    };

    const handleInstall = async (identifier: string) => {
        // First check requirements
        setCheckingRequirements(true);
        const requirements = await checkRequirements(identifier);
        setCheckingRequirements(false);

        if (!requirements) {
            toast.error(t('admin.marketplace.plugins.requirements_check_failed'));
            return;
        }

        // If dependencies not met or panel version incompatible, show dialog
        if (!requirements.can_install) {
            setRequirementsCheck(requirements);
            setPendingInstallId(identifier);
            setRequirementsDialogOpen(true);
            return;
        }

        // Proceed with installation
        await performInstall(identifier);
    };

    const performInstall = async (identifier: string) => {
        setInstallingOnlineId(identifier);
        setRequirementsDialogOpen(false);
        try {
            await axios.post('/api/admin/plugins/online/install', { identifier });
            toast.success(
                t('admin.marketplace.plugins.install_success', {
                    identifier,
                }),
            );
            fetchInstalledPlugins();
            setTimeout(() => window.location.reload(), 1500);
        } catch (err: unknown) {
            const e = err as {
                response?: {
                    data?: { message?: string; missing_dependencies?: string[]; dependency_details?: DependencyCheck[] };
                    status?: number;
                };
            };

            // Handle 412 Precondition Failed - missing dependencies
            if (e?.response?.status === 412 && e?.response?.data?.missing_dependencies) {
                toast.error(t('admin.marketplace.plugins.missing_dependencies'));
                // Show requirements dialog with missing dependencies
                if (requirementsCheck) {
                    setRequirementsCheck({
                        ...requirementsCheck,
                        can_install: false,
                        dependencies: {
                            checks: e.response.data.dependency_details || [],
                            all_met: false,
                        },
                    });
                    setRequirementsDialogOpen(true);
                }
            } else {
                toast.error(e?.response?.data?.message || t('admin.marketplace.plugins.install_failed'));
            }
        } finally {
            setInstallingOnlineId(null);
            setPendingInstallId(null);
        }
    };

    const handleBulkInstall = async () => {
        if (selectedPluginIds.length === 0) return;

        setBulkInstalling(true);

        // Check requirements for all plugins first
        const pluginsWithIssues: { identifier: string; requirements: RequirementsCheckResult }[] = [];
        const pluginsReady: string[] = [];

        for (const identifier of selectedPluginIds) {
            const requirements = await checkRequirements(identifier);
            if (requirements && !requirements.can_install) {
                pluginsWithIssues.push({ identifier, requirements });
            } else if (requirements && requirements.can_install) {
                pluginsReady.push(identifier);
            }
        }

        // If any plugins have issues, show the first one
        if (pluginsWithIssues.length > 0) {
            setRequirementsCheck(pluginsWithIssues[0].requirements);
            setPendingInstallId(pluginsWithIssues[0].identifier);
            setRequirementsDialogOpen(true);
            setBulkInstalling(false);

            // Show warning about skipped plugins
            if (pluginsWithIssues.length > 1) {
                toast.warning(
                    t('admin.marketplace.plugins.queue.multiple_requirements_issues', {
                        count: String(pluginsWithIssues.length),
                    }),
                );
            }
            return;
        }

        // Install all ready plugins
        let successCount = 0;

        for (const identifier of pluginsReady) {
            try {
                await axios.post('/api/admin/plugins/online/install', { identifier });
                successCount++;
            } catch (err: unknown) {
                const e = err as { response?: { data?: { message?: string } } };
                toast.error(
                    e?.response?.data?.message ||
                        t('admin.marketplace.plugins.queue.install_failed_single', {
                            identifier,
                        }),
                );
            }
        }

        if (successCount > 0) {
            toast.success(
                successCount === 1
                    ? t('admin.marketplace.plugins.queue.install_success_single')
                    : t('admin.marketplace.plugins.queue.install_success_multiple', {
                          count: String(successCount),
                      }),
            );
            await fetchInstalledPlugins();
            setSelectedPluginIds([]);
            setTimeout(() => window.location.reload(), 1500);
        } else {
            toast.error(t('admin.marketplace.plugins.queue.install_failed'));
        }

        setBulkInstalling(false);
    };

    const clearTagFilter = () => {
        setSelectedTag(null);
        setCurrentOnlinePage(1);
    };

    const toggleSelectPlugin = (identifier: string, name?: string) => {
        setSelectedPluginIds((prev) => {
            if (prev.includes(identifier)) {
                setQueuedPlugins((prevQueue) => {
                    const next = { ...prevQueue };
                    delete next[identifier];
                    return next;
                });
                return prev.filter((id) => id !== identifier);
            }

            setQueuedPlugins((prevQueue) => ({
                ...prevQueue,
                [identifier]: name || identifier,
            }));

            return [...prev, identifier];
        });
    };

    const renderPagination = () => {
        if (!onlinePagination || onlinePagination.total_pages <= 1) return null;

        return (
            <div className='mt-8 flex items-center justify-center gap-2'>
                <Button
                    variant='outline'
                    size='icon'
                    disabled={currentOnlinePage === 1}
                    onClick={() => setCurrentOnlinePage((p) => p - 1)}
                >
                    <ChevronLeft className='h-4 w-4' />
                </Button>
                <div className='flex items-center gap-2'>
                    <span className='text-sm font-medium'>
                        {currentOnlinePage} / {onlinePagination.total_pages}
                    </span>
                </div>
                <Button
                    variant='outline'
                    size='icon'
                    disabled={currentOnlinePage === onlinePagination.total_pages}
                    onClick={() => setCurrentOnlinePage((p) => p + 1)}
                >
                    <ChevronRight className='h-4 w-4' />
                </Button>
            </div>
        );
    };

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-feathercloud-plugins', 'top-of-page')} />

            <PageHeader
                title={t('admin.marketplace.plugins.title')}
                description={t('admin.marketplace.plugins.subtitle')}
                icon={Puzzle}
                actions={
                    <Button variant='outline' onClick={() => router.push('/admin/feathercloud/marketplace')}>
                        <ArrowLeft className='mr-2 h-4 w-4' />
                        {t('admin.marketplace.plugins.back')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-plugins', 'after-header')} />

            {!cloudAccountConfigured && (
                <PageCard
                    title={t('admin.marketplace.plugins.cloud_missing.title')}
                    icon={AlertCircle}
                    variant='danger'
                >
                    <div className='space-y-4'>
                        <p className='text-destructive/80 text-sm'>
                            {t('admin.marketplace.plugins.cloud_missing.description')}
                        </p>
                        <Button variant='destructive' size='sm' onClick={() => router.push('/admin/cloud-management')}>
                            <Key className='mr-2 h-4 w-4' />
                            {t('admin.marketplace.plugins.cloud_missing.action')}
                        </Button>
                    </div>
                </PageCard>
            )}

            {cloudAccountConfigured && (cloudCredits || cloudTeam) && (
                <PageCard title={t('admin.marketplace.plugins.cloud_connected.title')} icon={Info}>
                    <div className='flex flex-wrap gap-6'>
                        {cloudCredits && (
                            <div className='bg-primary/10 border-primary/20 flex items-center gap-3 rounded-2xl border px-4 py-2'>
                                <div className='bg-primary/20 rounded-xl p-2'>
                                    <Coins className='text-primary h-5 w-5' />
                                </div>
                                <div>
                                    <div className='text-primary/70 text-[10px] font-bold tracking-wider uppercase'>
                                        {t('admin.marketplace.plugins.cloud_connected.credits')}
                                    </div>
                                    <div className='text-primary text-lg leading-tight font-black'>
                                        {cloudCredits.total_credits.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        )}
                        {cloudTeam?.team && (
                            <div className='bg-primary/10 border-primary/20 flex items-center gap-3 rounded-2xl border px-4 py-2'>
                                <div className='bg-primary/20 rounded-xl p-2'>
                                    <Users className='text-primary h-5 w-5' />
                                </div>
                                <div>
                                    <div className='text-primary/70 text-[10px] font-bold tracking-wider uppercase'>
                                        {t('admin.marketplace.plugins.cloud_connected.team')}
                                    </div>
                                    <div className='text-primary text-lg leading-tight font-black'>
                                        {cloudTeam.team.name}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className='flex justify-end'>
                        <Button variant='outline' onClick={() => router.push('/admin/cloud-management')}>
                            <Key className='mr-2 h-4 w-4' />
                            {t('admin.marketplace.plugins.cloud_connected.action')}
                        </Button>
                    </div>
                </PageCard>
            )}

            {!onlineSearch && popularAddons.length > 0 && (
                <div className='space-y-6'>
                    <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                            <Crown className='h-5 w-5 text-amber-500' />
                            <h2 className='text-xl font-bold tracking-tight'>
                                {t('admin.marketplace.plugins.popular')}
                            </h2>
                        </div>
                    </div>
                    <div className='grid grid-cols-1 gap-6'>
                        {popularAddons.slice(0, 3).map((addon) => {
                            const IconComponent = ({ className }: { className?: string }) =>
                                addon.icon ? (
                                    <div className={cn('relative', className)}>
                                        <Image
                                            src={addon.icon}
                                            alt={addon.name}
                                            fill
                                            className='rounded-lg object-cover'
                                            unoptimized
                                        />
                                    </div>
                                ) : (
                                    <Puzzle className={className} />
                                );

                            return (
                                <ResourceCard
                                    key={`popular-${addon.identifier}`}
                                    icon={IconComponent}
                                    title={addon.name}
                                    subtitle={
                                        addon.author
                                            ? t('admin.marketplace.common.by_author', { author: addon.author })
                                            : undefined
                                    }
                                    badges={
                                        [
                                            installedPluginIds.includes(addon.identifier)
                                                ? {
                                                      label: t('admin.marketplace.plugins.installed'),
                                                      className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                                                  }
                                                : null,
                                            addon.verified
                                                ? {
                                                      label: t('admin.marketplace.plugins.verified'),
                                                      className: 'bg-green-500/10 text-green-600 border-green-500/20',
                                                  }
                                                : null,
                                            {
                                                label: t('admin.marketplace.plugins.featured'),
                                                className: 'bg-amber-500 text-white border-amber-600 font-bold px-3 ',
                                            },
                                        ].filter(Boolean) as ResourceBadge[]
                                    }
                                    onClick={() => viewPackageDetails(addon)}
                                    className='border-blue-500/20 hover:border-blue-500/40'
                                    highlightClassName='bg-linear-to-br from-blue-500/10 via-transparent to-transparent'
                                    iconClassName='text-blue-500'
                                    iconWrapperClassName='bg-blue-500/10 border-blue-500/20'
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-plugins', 'before-content')} />

            <div className='bg-card/50 border-border flex flex-col items-center gap-4 rounded-2xl border p-4 shadow-sm backdrop-blur-md sm:flex-row'>
                <div className='group relative flex-1'>
                    <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                    <Input
                        placeholder={t('admin.marketplace.plugins.search_placeholder')}
                        className='h-11 pl-10'
                        value={onlineSearch}
                        onChange={(e) => setOnlineSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchOnlineAddons(1)}
                    />
                </div>
                <div className='flex w-full items-center gap-2 overflow-x-auto pb-2 sm:w-auto sm:pb-0'>
                    <Button
                        variant={verifiedOnly ? 'default' : 'outline'}
                        size='sm'
                        className='h-11 px-4 whitespace-nowrap'
                        onClick={() => setVerifiedOnly(!verifiedOnly)}
                    >
                        <BadgeCheck className='mr-2 h-4 w-4' />
                        {t('admin.marketplace.plugins.verified_only')}
                    </Button>
                    <Select
                        value={sortBy}
                        onChange={(e) => {
                            setSortBy(e.target.value);
                            setCurrentOnlinePage(1);
                        }}
                        className='w-[200px]'
                    >
                        <option value='downloads'>{t('admin.marketplace.plugins.sort.downloads')}</option>
                        <option value='created_at'>{t('admin.marketplace.plugins.sort.newest')}</option>
                        <option value='updated_at'>{t('admin.marketplace.plugins.sort.recently_updated')}</option>
                    </Select>
                </div>
            </div>

            {selectedTag && (
                <div className='flex items-center gap-2'>
                    <Badge
                        variant='secondary'
                        className='bg-primary/10 text-primary border-primary/20 h-8 gap-2 rounded-full py-1 pr-1 pl-3'
                    >
                        {t('admin.marketplace.plugins.tag_label')} {selectedTag}
                        <button
                            onClick={clearTagFilter}
                            className='hover:bg-primary/20 rounded-full p-0.5 transition-colors'
                        >
                            <X className='h-3 w-3' />
                        </button>
                    </Badge>
                </div>
            )}

            {onlineLoading ? (
                <EmptyState
                    title={t('admin.marketplace.plugins.loading')}
                    description={t('admin.marketplace.plugins.loading')}
                    icon={RefreshCw}
                />
            ) : onlineError ? (
                <EmptyState
                    title={t('admin.marketplace.plugins.loading_error')}
                    description={onlineError}
                    icon={AlertCircle}
                    action={
                        <Button variant='outline' onClick={() => fetchOnlineAddons()}>
                            <RefreshCw className='mr-2 h-4 w-4' />
                            {t('admin.marketplace.plugins.try_again')}
                        </Button>
                    }
                />
            ) : onlineAddons.length === 0 ? (
                <EmptyState
                    title={t('admin.marketplace.plugins.no_results')}
                    description={t('admin.marketplace.plugins.search_placeholder')}
                    icon={Package}
                    action={
                        <Button
                            variant='outline'
                            onClick={() => {
                                setOnlineSearch('');
                                fetchOnlineAddons(1);
                            }}
                        >
                            {t('admin.marketplace.plugins.clear_search')}
                        </Button>
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-6'>
                    {onlineAddons.map((addon) => {
                        const IconComponent = ({ className }: { className?: string }) =>
                            addon.icon ? (
                                <div className={cn('relative', className)}>
                                    <Image
                                        src={addon.icon}
                                        alt={addon.name}
                                        fill
                                        className='rounded-lg object-cover'
                                        unoptimized
                                    />
                                </div>
                            ) : (
                                <Puzzle className={className} />
                            );

                        const isInstalled = installedPluginIds.includes(addon.identifier);
                        const isSelected = selectedPluginIds.includes(addon.identifier);
                        const requiresCloud = addon.premium === 1 && !cloudAccountConfigured;
                        const queueDisabled = bulkInstalling || requiresCloud || isInstalled;

                        return (
                            <ResourceCard
                                key={addon.identifier}
                                icon={IconComponent}
                                title={addon.name}
                                subtitle={
                                    addon.author
                                        ? t('admin.marketplace.common.by_author', { author: addon.author })
                                        : undefined
                                }
                                badges={
                                    [
                                        installedPluginIds.includes(addon.identifier)
                                            ? {
                                                  label: t('admin.marketplace.plugins.installed'),
                                                  className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                                              }
                                            : null,
                                        addon.verified
                                            ? {
                                                  label: t('admin.marketplace.plugins.verified'),
                                                  className: 'bg-green-500/10 text-green-600 border-green-500/20',
                                              }
                                            : null,
                                        addon.premium === 1
                                            ? {
                                                  label: t('admin.marketplace.plugins.premium'),
                                                  className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                                              }
                                            : null,
                                        addon.latest_version?.dependencies &&
                                        addon.latest_version.dependencies.length > 0 &&
                                        !installedPluginIds.includes(addon.identifier)
                                            ? {
                                                  label: t('admin.marketplace.plugins.has_dependencies'),
                                                  className: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
                                              }
                                            : null,
                                    ].filter(Boolean) as ResourceBadge[]
                                }
                                description={
                                    <div className='space-y-4'>
                                        <p className='text-muted-foreground line-clamp-2 text-sm'>
                                            {addon.description || t('admin.marketplace.plugins.details.no_description')}
                                        </p>
                                        <div className='text-muted-foreground flex flex-wrap items-center gap-4 text-xs font-medium'>
                                            <div className='flex items-center gap-1.5'>
                                                <CloudDownload className='h-3.5 w-3.5' />
                                                {addon.downloads.toLocaleString()}
                                            </div>
                                            {addon.premium === 1 && addon.premium_price && (
                                                <div className='flex items-center gap-1.5 font-bold text-amber-600'>
                                                    <Coins className='h-3.5 w-3.5' />€{addon.premium_price}
                                                </div>
                                            )}
                                        </div>
                                        {addon.tags.length > 0 && (
                                            <div className='flex flex-wrap gap-1.5'>
                                                {addon.tags.slice(0, 3).map((tag) => (
                                                    <Badge
                                                        key={tag}
                                                        variant='secondary'
                                                        className='bg-muted/50 hover:bg-primary/10 hover:text-primary hover:border-primary/20 h-6 cursor-pointer rounded-lg border-transparent px-2 py-0 text-[10px] transition-all'
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTag(tag);
                                                            setCurrentOnlinePage(1);
                                                        }}
                                                    >
                                                        #{tag}
                                                    </Badge>
                                                ))}
                                                {addon.tags.length > 3 && (
                                                    <span className='text-muted-foreground flex h-6 items-center text-[10px] font-medium'>
                                                        +{addon.tags.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                }
                                actions={
                                    <div className='flex items-center gap-2'>
                                        <Button variant='outline' size='sm' onClick={() => viewPackageDetails(addon)}>
                                            <Info className='h-4 w-4' />
                                        </Button>
                                        {requiresCloud ? (
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                disabled
                                                className='border-amber-500/20 bg-amber-500/5 text-amber-600'
                                            >
                                                <Lock className='mr-2 h-4 w-4' />
                                                {t('admin.marketplace.plugins.requires_cloud')}
                                            </Button>
                                        ) : (
                                            <Button
                                                variant='default'
                                                size='sm'
                                                disabled={queueDisabled}
                                                onClick={() => toggleSelectPlugin(addon.identifier, addon.name)}
                                                className='min-w-[100px]'
                                            >
                                                {isInstalled ? (
                                                    <>
                                                        <BadgeCheck className='mr-2 h-4 w-4' />
                                                        {t('admin.marketplace.plugins.installed')}
                                                    </>
                                                ) : isSelected ? (
                                                    <>
                                                        <CheckIcon className='mr-2 h-4 w-4' />
                                                        {t('admin.marketplace.plugins.queue.in_list')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <CloudDownload className='mr-2 h-4 w-4' />
                                                        {t('admin.marketplace.plugins.queue.add_to_list')}
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                }
                            />
                        );
                    })}
                </div>
            )}

            {renderPagination()}

            {selectedPluginIds.length > 0 && (
                <div className='fixed right-4 bottom-4 z-40 w-full max-w-xs sm:max-w-sm'>
                    <div className='border-primary/30 bg-background/95 space-y-3 rounded-2xl border p-4 shadow-xl'>
                        <div className='flex items-start justify-between gap-2'>
                            <div>
                                <p className='text-primary text-xs font-semibold tracking-wider uppercase'>
                                    {t('admin.marketplace.plugins.queue.title')}
                                </p>
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.marketplace.plugins.queue.subtitle')}
                                </p>
                            </div>
                            <Badge className='rounded-full px-2 py-1 text-[10px]'>{selectedPluginIds.length}</Badge>
                        </div>
                        <div className='max-h-40 space-y-1 overflow-y-auto text-xs'>
                            {Object.entries(queuedPlugins)
                                .filter(([id]) => selectedPluginIds.includes(id))
                                .map(([id, name]) => (
                                    <div
                                        key={id}
                                        className='bg-muted/60 flex items-center justify-between gap-2 rounded-md px-2 py-1'
                                    >
                                        <span className='truncate'>{name}</span>
                                        <button
                                            type='button'
                                            className='text-muted-foreground hover:text-destructive text-[10px] transition-colors'
                                            onClick={() => toggleSelectPlugin(id)}
                                            disabled={bulkInstalling}
                                        >
                                            {t('admin.marketplace.plugins.queue.remove')}
                                        </button>
                                    </div>
                                ))}
                        </div>
                        <div className='flex items-center gap-2'>
                            <Button
                                variant='outline'
                                size='sm'
                                onClick={() => setSelectedPluginIds([])}
                                disabled={bulkInstalling}
                            >
                                {t('admin.marketplace.plugins.queue.clear')}
                            </Button>
                            <Button size='sm' onClick={handleBulkInstall} disabled={bulkInstalling} className='flex-1'>
                                {bulkInstalling ? (
                                    <>
                                        <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                                        {t('admin.marketplace.plugins.queue.downloading')}
                                    </>
                                ) : (
                                    <>
                                        <CloudDownload className='mr-2 h-4 w-4' />
                                        {t('admin.marketplace.plugins.queue.download_now')}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <PageCard title={t('admin.marketplace.plugins.repo.title')} icon={Globe}>
                <div className='space-y-4'>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.marketplace.plugins.repo.description')}
                    </p>
                    <div className='border-border bg-muted/40 mt-2 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center'>
                        <div className='min-w-0 flex-1'>
                            <div className='flex items-center gap-2'>
                                <span className='truncate text-sm font-semibold'>
                                    {t('admin.marketplace.plugins.repo.official_name')}
                                </span>
                                <Badge
                                    variant='secondary'
                                    className='h-6 border-emerald-500/30 bg-emerald-500/10 px-2 py-0 text-[10px] tracking-wide text-emerald-600 uppercase'
                                >
                                    <BadgeCheck className='mr-1 h-3 w-3' />
                                    {t('admin.marketplace.plugins.repo.official_badge')}
                                </Badge>
                            </div>
                            <p className='text-muted-foreground mt-1 truncate text-xs'>repo.featherpanel.com</p>
                        </div>
                        <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                            <Lock className='h-4 w-4' />
                            <span className='font-medium'>{t('admin.marketplace.plugins.repo.locked_notice')}</span>
                        </div>
                    </div>
                </div>
            </PageCard>

            <div className='grid grid-cols-1 gap-6 pt-10 md:grid-cols-2 lg:grid-cols-3'>
                <PageCard title={t('admin.marketplace.spells.help.repo_title')} icon={Globe}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.marketplace.spells.help.repo_desc')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.marketplace.spells.help.install_title')} icon={CloudDownload}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.marketplace.spells.help.install_desc')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.marketplace.spells.help.security_title')} icon={AlertCircle} variant='danger'>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.marketplace.spells.help.security_desc')}
                    </p>
                </PageCard>
            </div>

            <Sheet open={packageDetailsOpen} onOpenChange={setPackageDetailsOpen}>
                <div className='flex h-full flex-col'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.marketplace.plugins.details.title')}</SheetTitle>
                        <SheetDescription>{t('admin.marketplace.plugins.subtitle')}</SheetDescription>
                    </SheetHeader>

                    <div className='-mr-2 flex-1 space-y-8 overflow-y-auto pr-2'>
                        {packageDetailsLoading ? (
                            <div className='flex flex-col items-center justify-center gap-4 py-20'>
                                <RefreshCw className='text-primary h-10 w-10 animate-spin' />
                                <p className='text-muted-foreground'>
                                    {t('admin.marketplace.plugins.details.loading')}
                                </p>
                            </div>
                        ) : (
                            selectedPackage && (
                                <div className='space-y-8 pb-4'>
                                    <div className='flex items-start gap-6'>
                                        <div className='from-primary/10 to-primary/5 border-primary/20 relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border-2 bg-linear-to-br'>
                                            {selectedPackage.icon ? (
                                                <Image
                                                    src={selectedPackage.icon}
                                                    alt={selectedPackage.name}
                                                    fill
                                                    className='object-cover'
                                                    unoptimized
                                                />
                                            ) : (
                                                <Puzzle className='text-primary/60 h-12 w-12' />
                                            )}
                                        </div>
                                        <div className='flex-1 space-y-2'>
                                            <h3 className='text-3xl font-bold tracking-tight'>
                                                {selectedPackage.name}
                                            </h3>
                                            <div className='flex flex-wrap gap-2'>
                                                <Badge
                                                    variant='outline'
                                                    className='border-primary/20 bg-primary/5 text-primary px-3 py-1 text-xs'
                                                >
                                                    {selectedPackage.identifier}
                                                </Badge>
                                                {selectedPackage.verified && (
                                                    <Badge className='border-green-500/20 bg-green-500/10 px-3 py-1 text-xs text-green-600'>
                                                        <CheckIcon className='mr-1 h-3 w-3' />
                                                        {t('admin.marketplace.plugins.verified')}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className='space-y-4'>
                                        <h4 className='flex items-center gap-2 text-lg font-bold'>
                                            <Info className='text-primary h-5 w-5' />
                                            {t('admin.marketplace.plugins.details.title')}
                                        </h4>
                                        <p className='text-muted-foreground bg-muted/30 border-border/50 rounded-2xl border p-5 text-sm leading-relaxed whitespace-pre-wrap'>
                                            {selectedPackage.description ||
                                                t('admin.marketplace.plugins.details.no_description')}
                                        </p>
                                    </div>

                                    <div className='grid grid-cols-2 gap-4'>
                                        <div className='bg-muted/30 border-border/50 space-y-1 rounded-2xl border p-5'>
                                            <p className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>
                                                Version
                                            </p>
                                            <p className='font-semibold'>
                                                {selectedPackage.latest_version?.version || 'N/A'}
                                            </p>
                                        </div>

                                        <div className='bg-muted/30 border-border/50 space-y-1 rounded-2xl border p-5'>
                                            <p className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>
                                                {t('admin.marketplace.plugins.downloads')}
                                            </p>
                                            <p className='font-semibold'>
                                                {selectedPackage.downloads.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className='bg-muted/30 border-border/50 space-y-1 rounded-2xl border p-5'>
                                            <p className='text-muted-foreground text-[10px] font-bold tracking-wider uppercase'>
                                                Status
                                            </p>
                                            <p
                                                className={cn(
                                                    'font-bold',
                                                    installedPluginIds.includes(selectedPackage.identifier)
                                                        ? 'text-green-600'
                                                        : 'text-primary',
                                                )}
                                            >
                                                {installedPluginIds.includes(selectedPackage.identifier)
                                                    ? t('admin.marketplace.plugins.installed')
                                                    : t('admin.marketplace.plugins.available')}
                                            </p>
                                        </div>
                                    </div>

                                    {selectedPackage.latest_version?.changelog && (
                                        <div className='space-y-4'>
                                            <h4 className='text-lg font-bold'>
                                                {t('admin.marketplace.plugins.details.changelog')}
                                            </h4>
                                            <div className='bg-muted/30 border-border/50 text-muted-foreground rounded-2xl border p-5 text-sm leading-relaxed'>
                                                {selectedPackage.latest_version.changelog}
                                            </div>
                                        </div>
                                    )}

                                    {selectedPackage.website && (
                                        <div className='pt-2'>
                                            <a
                                                href={selectedPackage.website}
                                                target='_blank'
                                                rel='noopener noreferrer'
                                                className='text-primary bg-primary/5 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors hover:underline'
                                            >
                                                <Globe className='h-4 w-4' />
                                                {t('admin.marketplace.plugins.website')}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )
                        )}
                    </div>

                    <SheetFooter className='mt-8'>
                        <Button
                            variant='outline'
                            className='h-14 flex-1 rounded-xl text-sm font-bold'
                            onClick={() => setPackageDetailsOpen(false)}
                        >
                            {t('common.close')}
                        </Button>
                        {selectedPackage && (
                            <Button
                                className='h-14 flex-2 rounded-xl text-sm font-bold'
                                disabled={
                                    installingOnlineId === selectedPackage.identifier ||
                                    installedPluginIds.includes(selectedPackage.identifier)
                                }
                                onClick={() => handleInstall(selectedPackage.identifier)}
                            >
                                {installingOnlineId === selectedPackage.identifier ? (
                                    <>
                                        <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                                        {t('admin.marketplace.plugins.installing')}
                                    </>
                                ) : installedPluginIds.includes(selectedPackage.identifier) ? (
                                    <>
                                        <BadgeCheck className='mr-2 h-4 w-4' />
                                        {t('admin.marketplace.plugins.installed')}
                                    </>
                                ) : (
                                    <>
                                        <CloudDownload className='mr-2 h-4 w-4' />
                                        {t('admin.marketplace.plugins.install')}
                                    </>
                                )}
                            </Button>
                        )}
                    </SheetFooter>
                </div>
            </Sheet>

            <WidgetRenderer widgets={getWidgets('admin-feathercloud-plugins', 'bottom-of-page')} />

            {/* Requirements Check Dialog */}
            <Dialog open={requirementsDialogOpen} onOpenChange={setRequirementsDialogOpen}>
                <DialogContent className='max-w-lg'>
                    <DialogHeader>
                        <DialogTitle className='flex items-center gap-2'>
                            {requirementsCheck?.can_install ? (
                                <>
                                    <CheckCircle2 className='h-5 w-5 text-green-500' />
                                    {t('admin.marketplace.plugins.requirements.title_ready')}
                                </>
                            ) : (
                                <>
                                    <AlertTriangle className='h-5 w-5 text-amber-500' />
                                    {t('admin.marketplace.plugins.requirements.title_missing')}
                                </>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {requirementsCheck?.package.name && (
                                <span className='font-medium'>{requirementsCheck.package.name}</span>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className='space-y-4 py-4'>
                        {/* Panel Version Status */}
                        {requirementsCheck?.panel_version.min || requirementsCheck?.panel_version.max ? (
                            <div
                                className={cn(
                                    'flex items-start gap-3 rounded-lg border p-3',
                                    requirementsCheck.panel_version.ok
                                        ? 'border-green-200 bg-green-50/50'
                                        : 'border-red-200 bg-red-50/50',
                                )}
                            >
                                {requirementsCheck.panel_version.ok ? (
                                    <CheckCircle2 className='mt-0.5 h-5 w-5 shrink-0 text-green-500' />
                                ) : (
                                    <XCircle className='mt-0.5 h-5 w-5 shrink-0 text-red-500' />
                                )}
                                <div>
                                    <p className='font-medium'>
                                        {t('admin.marketplace.plugins.requirements.panel_version')}
                                    </p>
                                    <p className='text-muted-foreground text-sm'>
                                        {requirementsCheck.panel_version.ok
                                            ? t('admin.marketplace.plugins.requirements.panel_compatible')
                                            : requirementsCheck.panel_version.message}
                                    </p>
                                </div>
                            </div>
                        ) : null}

                        {/* Dependencies List */}
                        {requirementsCheck && requirementsCheck.dependencies?.checks && requirementsCheck.dependencies.checks.length > 0 && (
                            <div className='space-y-2'>
                                <h4 className='flex items-center gap-2 text-sm font-semibold'>
                                    <Layers className='h-4 w-4' />
                                    {t('admin.marketplace.plugins.requirements.dependencies')}
                                </h4>
                                <div className='space-y-2'>
                                    {requirementsCheck.dependencies.checks.map((dep, index) => (
                                        <div
                                            key={index}
                                            className={cn(
                                                'flex items-start gap-2 rounded-md border p-2 text-sm',
                                                dep.met
                                                    ? 'border-green-200 bg-green-50/30'
                                                    : 'border-red-200 bg-red-50/30',
                                            )}
                                        >
                                            {dep.met ? (
                                                <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0 text-green-500' />
                                            ) : (
                                                <XCircle className='mt-0.5 h-4 w-4 shrink-0 text-red-500' />
                                            )}
                                            <div className='flex-1'>
                                                <div className='flex items-center gap-2'>
                                                    <Badge
                                                        variant='outline'
                                                        className={cn(
                                                            'h-5 text-[10px]',
                                                            dep.met
                                                                ? 'border-green-300 text-green-700'
                                                                : 'border-red-300 text-red-700',
                                                        )}
                                                    >
                                                        {dep.type}
                                                    </Badge>
                                                    <span className='font-medium'>{dep.name}</span>
                                                </div>
                                                {!dep.met && (
                                                    <p className='text-muted-foreground mt-1 text-xs'>
                                                        {dep.message}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Missing dependencies warning */}
                        {!requirementsCheck?.dependencies.all_met && (
                            <div className='bg-amber-50 border-amber-200 rounded-lg border p-3'>
                                <p className='flex items-center gap-2 text-sm font-medium text-amber-800'>
                                    <AlertTriangle className='h-4 w-4' />
                                    {t('admin.marketplace.plugins.requirements.please_install_deps')}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className='flex justify-end gap-2'>
                        <Button variant='outline' onClick={() => setRequirementsDialogOpen(false)}>
                            {requirementsCheck?.can_install
                                ? t('common.cancel')
                                : t('common.close')}
                        </Button>
                        {requirementsCheck?.can_install && pendingInstallId && (
                            <Button
                                onClick={() => performInstall(pendingInstallId)}
                                disabled={installingOnlineId === pendingInstallId}
                            >
                                {installingOnlineId === pendingInstallId ? (
                                    <>
                                        <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
                                        {t('admin.marketplace.plugins.installing')}
                                    </>
                                ) : (
                                    <>
                                        <CloudDownload className='mr-2 h-4 w-4' />
                                        {t('admin.marketplace.plugins.install')}
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
