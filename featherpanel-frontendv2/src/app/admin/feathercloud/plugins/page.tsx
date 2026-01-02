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

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
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

export default function PluginsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { fetchCredits, fetchTeam } = useFeatherCloud();

    // Cloud status state
    const [cloudAccountConfigured, setCloudAccountConfigured] = useState(false);
    const [cloudCredits, setCloudCredits] = useState<CreditsData | null>(null);
    const [cloudTeam, setCloudTeam] = useState<TeamData | null>(null);

    // Online plugins state
    const [onlineAddons, setOnlineAddons] = useState<OnlineAddon[]>([]);
    const [onlineLoading, setOnlineLoading] = useState(false);
    const [onlineError, setOnlineError] = useState<string | null>(null);
    const [onlinePagination, setOnlinePagination] = useState<OnlinePagination | null>(null);
    const [currentOnlinePage, setCurrentOnlinePage] = useState(1);
    const [onlineSearch, setOnlineSearch] = useState('');
    const [verifiedOnly, setVerifiedOnly] = useState(false);
    const [sortBy, setSortBy] = useState('downloads');
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    // Dialog state
    const [packageDetailsOpen, setPackageDetailsOpen] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<OnlineAddon | null>(null);
    const [packageDetailsLoading, setPackageDetailsLoading] = useState(false);
    const [popularAddons, setPopularAddons] = useState<OnlineAddon[]>([]);

    // Install state
    const [installedPluginIds, setInstalledPluginIds] = useState<string[]>([]);
    const [installingOnlineId, setInstallingOnlineId] = useState<string | null>(null);

    // Fetch cloud data
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

    // Fetch installed plugins
    const fetchInstalledPlugins = useCallback(async () => {
        try {
            const response = await axios.get('/api/admin/plugins');
            const plugins = response.data?.data?.plugins || {};
            setInstalledPluginIds(Object.keys(plugins));
        } catch (error) {
            console.error('Failed to fetch installed plugins:', error);
        }
    }, []);

    // Fetch popular addons
    const fetchPopularAddons = useCallback(async () => {
        try {
            const response = await axios.get('/api/admin/plugins/online/popular');
            setPopularAddons(response.data?.data?.addons || []);
        } catch (error) {
            console.error('Failed to fetch popular addons:', error);
        }
    }, []);

    // Fetch online addons
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
                setOnlineAddons(response.data?.data?.addons || []);
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
        fetchCloudData();
        fetchPopularAddons();
        fetchInstalledPlugins();
    }, [fetchCloudData, fetchPopularAddons, fetchInstalledPlugins]);

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

    const handleInstall = async (identifier: string) => {
        setInstallingOnlineId(identifier);
        try {
            await axios.post('/api/admin/plugins/online/install', { identifier });
            toast.success(`Successfully installed ${identifier}`);
            fetchInstalledPlugins();
            setTimeout(() => window.location.reload(), 1500);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || 'Failed to install plugin');
        } finally {
            setInstallingOnlineId(null);
        }
    };

    const clearTagFilter = () => {
        setSelectedTag(null);
        setCurrentOnlinePage(1);
    };

    // Pagination helper
    const renderPagination = () => {
        if (!onlinePagination || onlinePagination.total_pages <= 1) return null;

        return (
            <div className='flex items-center justify-center gap-2 mt-8'>
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
        <div className='space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500'>
            {/* Header */}
            <PageHeader
                title={t('admin.marketplace.plugins.title')}
                description={t('admin.marketplace.plugins.subtitle')}
                icon={Puzzle}
                actions={
                    <Button variant='outline' onClick={() => router.push('/admin/feathercloud/marketplace')}>
                        <ArrowLeft className='h-4 w-4 mr-2' />
                        {t('admin.marketplace.plugins.back')}
                    </Button>
                }
            />

            {/* Banner Notifications */}
            {!cloudAccountConfigured && (
                <PageCard
                    title={t('admin.marketplace.plugins.cloud_missing.title')}
                    icon={AlertCircle}
                    variant='danger'
                >
                    <div className='space-y-4'>
                        <p className='text-sm text-destructive/80'>
                            {t('admin.marketplace.plugins.cloud_missing.description')}
                        </p>
                        <Button variant='destructive' size='sm' onClick={() => router.push('/admin/cloud-management')}>
                            <Key className='h-4 w-4 mr-2' />
                            {t('admin.marketplace.plugins.cloud_missing.action')}
                        </Button>
                    </div>
                </PageCard>
            )}

            {cloudAccountConfigured && (cloudCredits || cloudTeam) && (
                <PageCard title={t('admin.marketplace.plugins.cloud_connected.title')} icon={Info}>
                    <div className='flex flex-wrap gap-6'>
                        {cloudCredits && (
                            <div className='flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-2xl border border-primary/20'>
                                <div className='p-2 bg-primary/20 rounded-xl'>
                                    <Coins className='h-5 w-5 text-primary' />
                                </div>
                                <div>
                                    <div className='text-[10px] uppercase tracking-wider text-primary/70 font-bold'>
                                        {t('admin.marketplace.plugins.cloud_connected.credits')}
                                    </div>
                                    <div className='text-lg font-black text-primary leading-tight'>
                                        {cloudCredits.total_credits.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        )}
                        {cloudTeam?.team && (
                            <div className='flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-2xl border border-primary/20'>
                                <div className='p-2 bg-primary/20 rounded-xl'>
                                    <Users className='h-5 w-5 text-primary' />
                                </div>
                                <div>
                                    <div className='text-[10px] uppercase tracking-wider text-primary/70 font-bold'>
                                        {t('admin.marketplace.plugins.cloud_connected.team')}
                                    </div>
                                    <div className='text-lg font-black text-primary leading-tight'>
                                        {cloudTeam.team.name}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </PageCard>
            )}

            {/* Top Plugins Section */}
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
                                            className='object-cover rounded-lg'
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
                                    subtitle={addon.author ? `by ${addon.author}` : undefined}
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
                                                label: 'Featured',
                                                className:
                                                    'bg-amber-500 text-white border-amber-600 font-bold px-3 shadow-lg shadow-amber-500/20',
                                            },
                                        ].filter(Boolean) as ResourceBadge[]
                                    }
                                    onClick={() => viewPackageDetails(addon)}
                                    className='bg-linear-to-br from-primary/5 via-transparent to-transparent shadow-none! border-primary/20 hover:border-primary/40 ring-1 ring-primary/5'
                                    iconWrapperClassName='bg-primary/5 border-primary/10 group-hover:bg-primary/10 transition-colors'
                                    iconClassName='text-primary/70'
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Search and Filters */}
            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/50 backdrop-blur-md p-4 rounded-2xl border border-border shadow-sm'>
                <div className='relative flex-1 group'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.marketplace.plugins.search_placeholder')}
                        className='pl-10 h-11'
                        value={onlineSearch}
                        onChange={(e) => setOnlineSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchOnlineAddons(1)}
                    />
                </div>
                <div className='flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto'>
                    <Button
                        variant={verifiedOnly ? 'default' : 'outline'}
                        size='sm'
                        className='h-11 px-4 whitespace-nowrap'
                        onClick={() => setVerifiedOnly(!verifiedOnly)}
                    >
                        <BadgeCheck className='h-4 w-4 mr-2' />
                        {t('admin.marketplace.plugins.verified_only')}
                    </Button>
                    <Select
                        value={sortBy}
                        onChange={(e) => {
                            setSortBy(e.target.value);
                            setCurrentOnlinePage(1);
                        }}
                        className='w-[160px] h-11 rounded-xl bg-background/50 border-border/50'
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
                        className='pl-3 pr-1 py-1 h-8 rounded-full bg-primary/10 text-primary border-primary/20 gap-2'
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

            {/* Online Addons Grid */}
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
                            <RefreshCw className='h-4 w-4 mr-2' />
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
                                        className='object-cover rounded-lg'
                                        unoptimized
                                    />
                                </div>
                            ) : (
                                <Puzzle className={className} />
                            );

                        return (
                            <ResourceCard
                                key={addon.identifier}
                                icon={IconComponent}
                                title={addon.name}
                                subtitle={addon.author ? `by ${addon.author}` : undefined}
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
                                    ].filter(Boolean) as ResourceBadge[]
                                }
                                description={
                                    <div className='space-y-4'>
                                        <p className='text-sm text-muted-foreground line-clamp-2'>
                                            {addon.description || t('admin.marketplace.plugins.details.no_description')}
                                        </p>
                                        <div className='flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-medium'>
                                            <div className='flex items-center gap-1.5'>
                                                <CloudDownload className='h-3.5 w-3.5' />
                                                {addon.downloads.toLocaleString()}
                                            </div>
                                            {addon.premium === 1 && addon.premium_price && (
                                                <div className='flex items-center gap-1.5 text-amber-600 font-bold'>
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
                                                        className='px-2 py-0 h-6 text-[10px] bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer rounded-lg border-transparent hover:border-primary/20'
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
                                                    <span className='text-[10px] text-muted-foreground font-medium flex items-center h-6'>
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
                                        {addon.premium === 1 && !cloudAccountConfigured ? (
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                disabled
                                                className='bg-amber-500/5 border-amber-500/20 text-amber-600'
                                            >
                                                <Lock className='h-4 w-4 mr-2' />
                                                {t('admin.marketplace.plugins.requires_cloud')}
                                            </Button>
                                        ) : (
                                            <Button
                                                variant='default'
                                                size='sm'
                                                disabled={
                                                    installingOnlineId === addon.identifier ||
                                                    installedPluginIds.includes(addon.identifier)
                                                }
                                                onClick={() => handleInstall(addon.identifier)}
                                                className='min-w-[100px]'
                                            >
                                                {installingOnlineId === addon.identifier ? (
                                                    <RefreshCw className='h-4 w-4 animate-spin' />
                                                ) : installedPluginIds.includes(addon.identifier) ? (
                                                    <>
                                                        <BadgeCheck className='h-4 w-4 mr-2' />
                                                        {t('admin.marketplace.plugins.installed')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <CloudDownload className='h-4 w-4 mr-2' />
                                                        {t('admin.marketplace.plugins.install')}
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

            {/* Help Sections */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10'>
                <PageCard title={t('admin.marketplace.spells.help.repo_title')} icon={Globe}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.marketplace.spells.help.repo_desc')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.marketplace.spells.help.install_title')} icon={CloudDownload}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.marketplace.spells.help.install_desc')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.marketplace.spells.help.security_title')} icon={AlertCircle} variant='danger'>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.marketplace.spells.help.security_desc')}
                    </p>
                </PageCard>
            </div>

            {/* Details Side Panel */}
            <Sheet open={packageDetailsOpen} onOpenChange={setPackageDetailsOpen}>
                <div className='h-full flex flex-col'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.marketplace.plugins.details.title')}</SheetTitle>
                        <SheetDescription>{t('admin.marketplace.plugins.subtitle')}</SheetDescription>
                    </SheetHeader>

                    <div className='flex-1 overflow-y-auto pr-2 -mr-2 space-y-8'>
                        {packageDetailsLoading ? (
                            <div className='flex flex-col items-center justify-center py-20 gap-4'>
                                <RefreshCw className='h-10 w-10 text-primary animate-spin' />
                                <p className='text-muted-foreground'>
                                    {t('admin.marketplace.plugins.details.loading')}
                                </p>
                            </div>
                        ) : (
                            selectedPackage && (
                                <div className='space-y-8 pb-4'>
                                    <div className='flex items-start gap-6'>
                                        <div className='relative h-24 w-24 rounded-3xl bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center border-2 border-primary/20 overflow-hidden'>
                                            {selectedPackage.icon ? (
                                                <Image
                                                    src={selectedPackage.icon}
                                                    alt={selectedPackage.name}
                                                    fill
                                                    className='object-cover'
                                                    unoptimized
                                                />
                                            ) : (
                                                <Puzzle className='h-12 w-12 text-primary/60' />
                                            )}
                                        </div>
                                        <div className='flex-1 space-y-2'>
                                            <h3 className='text-3xl font-bold tracking-tight'>
                                                {selectedPackage.name}
                                            </h3>
                                            <div className='flex flex-wrap gap-2'>
                                                <Badge
                                                    variant='outline'
                                                    className='border-primary/20 bg-primary/5 text-primary text-xs px-3 py-1'
                                                >
                                                    {selectedPackage.identifier}
                                                </Badge>
                                                {selectedPackage.verified && (
                                                    <Badge className='bg-green-500/10 text-green-600 border-green-500/20 text-xs px-3 py-1'>
                                                        <CheckIcon className='h-3 w-3 mr-1' />
                                                        {t('admin.marketplace.plugins.verified')}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className='space-y-4'>
                                        <h4 className='text-lg font-bold flex items-center gap-2'>
                                            <Info className='h-5 w-5 text-primary' />
                                            {t('admin.marketplace.plugins.details.title')}
                                        </h4>
                                        <p className='text-muted-foreground leading-relaxed whitespace-pre-wrap rounded-2xl bg-muted/30 p-5 border border-border/50 text-sm'>
                                            {selectedPackage.description ||
                                                t('admin.marketplace.plugins.details.no_description')}
                                        </p>
                                    </div>

                                    <div className='grid grid-cols-2 gap-4'>
                                        <div className='space-y-1 p-5 rounded-2xl bg-muted/30 border border-border/50'>
                                            <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
                                                Version
                                            </p>
                                            <p className='font-semibold'>
                                                {selectedPackage.latest_version?.version || 'N/A'}
                                            </p>
                                        </div>

                                        <div className='space-y-1 p-5 rounded-2xl bg-muted/30 border border-border/50'>
                                            <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
                                                {t('admin.marketplace.plugins.downloads')}
                                            </p>
                                            <p className='font-semibold'>
                                                {selectedPackage.downloads.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className='space-y-1 p-5 rounded-2xl bg-muted/30 border border-border/50'>
                                            <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
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
                                            <div className='bg-muted/30 border border-border/50 rounded-2xl p-5 text-sm text-muted-foreground leading-relaxed'>
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
                                                className='inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline bg-primary/5 px-4 py-2 rounded-xl transition-colors'
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
                            className='flex-1 rounded-xl h-14 text-sm font-bold'
                            onClick={() => setPackageDetailsOpen(false)}
                        >
                            {t('common.close')}
                        </Button>
                        {selectedPackage && (
                            <Button
                                className='flex-2 rounded-xl h-14 text-sm font-bold shadow-lg shadow-primary/20'
                                disabled={
                                    installingOnlineId === selectedPackage.identifier ||
                                    installedPluginIds.includes(selectedPackage.identifier)
                                }
                                onClick={() => handleInstall(selectedPackage.identifier)}
                            >
                                {installingOnlineId === selectedPackage.identifier ? (
                                    <>
                                        <RefreshCw className='h-4 w-4 animate-spin mr-2' />
                                        {t('admin.marketplace.plugins.installing')}
                                    </>
                                ) : installedPluginIds.includes(selectedPackage.identifier) ? (
                                    <>
                                        <BadgeCheck className='h-4 w-4 mr-2' />
                                        {t('admin.marketplace.plugins.installed')}
                                    </>
                                ) : (
                                    <>
                                        <CloudDownload className='h-4 w-4 mr-2' />
                                        {t('admin.marketplace.plugins.install')}
                                    </>
                                )}
                            </Button>
                        )}
                    </SheetFooter>
                </div>
            </Sheet>
        </div>
    );
}
