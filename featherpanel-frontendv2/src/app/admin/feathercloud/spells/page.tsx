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
import axios from 'axios';
import { toast } from 'sonner';
import { PageHeader } from '@/components/featherui/PageHeader';
import { ResourceCard, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { Select } from '@/components/ui/select-native';
import { cn } from '@/lib/utils';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import {
    Sparkles,
    CloudDownload,
    RefreshCw,
    AlertCircle,
    ArrowLeft,
    Globe,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowRight,
    Settings,
    Info,
} from 'lucide-react';

interface OnlineSpell {
    identifier: string;
    name: string;
    description?: string;
    icon?: string | null;
    website?: string | null;
    author?: string | null;
    tags: string[];
    verified: boolean;
    downloads: number;
    latest_version?: {
        version: string;
    };
}

interface OnlinePagination {
    current_page: number;
    total_pages: number;
    total_records: number;
}

interface Realm {
    id: number;
    name: string;
}

export default function SpellsPage() {
    const { t } = useTranslation();
    const router = useRouter();

    // Online spells state
    const [onlineSpells, setOnlineSpells] = useState<OnlineSpell[]>([]);
    const [onlineLoading, setOnlineLoading] = useState(false);
    const [onlineError, setOnlineError] = useState<string | null>(null);
    const [onlinePagination, setOnlinePagination] = useState<OnlinePagination | null>(null);
    const [currentOnlinePage, setCurrentOnlinePage] = useState(1);
    const [onlineSearch, setOnlineSearch] = useState('');

    // Dialog state
    const [confirmInstallOpen, setConfirmInstallOpen] = useState(false);
    const [selectedSpell, setSelectedSpell] = useState<OnlineSpell | null>(null);
    const [selectedRealmId, setSelectedRealmId] = useState<string>('');
    const [realms, setRealms] = useState<Realm[]>([]);
    const [installedSpellIds, setInstalledSpellIds] = useState<string[]>([]);
    const [installingId, setInstallingId] = useState<string | null>(null);

    // Fetch realms
    const fetchRealms = useCallback(async () => {
        try {
            const response = await axios.get('/api/admin/realms');
            setRealms(response.data?.data?.realms || []);
        } catch (error) {
            console.error('Failed to fetch realms:', error);
        }
    }, []);

    // Fetch installed spells
    const fetchInstalledSpells = useCallback(async () => {
        try {
            const response = await axios.get('/api/admin/spells');
            const spells = response.data?.data?.spells || [];
            // Using name for matching as identifier is not stored in DB for spells
            setInstalledSpellIds(spells.map((s: { name: string }) => s.name));
        } catch (error) {
            console.error('Failed to fetch installed spells:', error);
        }
    }, []);

    // Fetch online spells
    const fetchOnlineSpells = useCallback(
        async (page = currentOnlinePage, search = onlineSearch) => {
            setOnlineLoading(true);
            setOnlineError(null);

            const params = new URLSearchParams({
                page: String(page),
                per_page: '20',
            });

            if (search) params.set('q', search);

            try {
                const response = await axios.get(`/api/admin/spells/online/list?${params.toString()}`);
                setOnlineSpells(response.data?.data?.spells || []);
                setOnlinePagination(response.data?.data?.pagination || null);
            } catch (err: unknown) {
                const e = err as { response?: { data?: { message?: string } } };
                setOnlineError(e?.response?.data?.message || t('admin.marketplace.spells.loading_error'));
            } finally {
                setOnlineLoading(false);
            }
        },
        [currentOnlinePage, onlineSearch, t],
    );

    useEffect(() => {
        fetchOnlineSpells();
        fetchRealms();
        fetchInstalledSpells();
    }, [fetchOnlineSpells, fetchRealms, fetchInstalledSpells]);

    const openInstallDialog = (spell: OnlineSpell) => {
        setSelectedSpell(spell);
        setConfirmInstallOpen(true);
    };

    const handleInstall = async () => {
        if (!selectedSpell || !selectedRealmId) {
            toast.error(t('admin.marketplace.spells.select_realm_error'));
            return;
        }

        setInstallingId(selectedSpell.identifier);
        try {
            await axios.post('/api/admin/spells/online/install', {
                identifier: selectedSpell.identifier,
                realm_id: parseInt(selectedRealmId, 10),
            });
            toast.success(`Successfully installed ${selectedSpell.identifier}`);
            fetchInstalledSpells();
            setConfirmInstallOpen(false);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || t('admin.marketplace.spells.install_error'));
        } finally {
            setInstallingId(null);
        }
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
        <div className='space-y-6'>
            {/* Header */}
            <PageHeader
                title={t('admin.marketplace.spells.title')}
                description={t('admin.marketplace.spells.subtitle')}
                icon={Sparkles}
                actions={
                    <Button variant='outline' onClick={() => router.push('/admin/feathercloud/marketplace')}>
                        <ArrowLeft className='h-4 w-4 mr-2' />
                        {t('admin.marketplace.plugins.back')}
                    </Button>
                }
            />

            {/* Online Publish Banner */}
            <PageCard
                title={t('admin.marketplace.spells.online_banner.title')}
                icon={Sparkles}
                className='bg-linear-to-r from-indigo-600/10 via-purple-600/10 to-fuchsia-600/10 border-indigo-500/20'
                action={
                    <div className='flex items-center gap-3'>
                        <Button
                            variant='default'
                            size='sm'
                            onClick={() => window.open('https://cloud.mythical.systems', '_blank')}
                        >
                            {t('admin.marketplace.spells.online_banner.action')}
                            <ArrowRight className='h-4 w-4 ml-2' />
                        </Button>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => window.open('https://cloud.mythical.systems', '_blank')}
                        >
                            {t('admin.marketplace.spells.online_banner.learn_more')}
                        </Button>
                    </div>
                }
            >
                <div className='space-y-4'>
                    <p className='text-muted-foreground text-sm max-w-2xl leading-relaxed'>
                        {t('admin.marketplace.spells.online_banner.description')}
                    </p>
                    <div className='text-xs text-primary font-bold tracking-wide uppercase'>
                        {t('admin.marketplace.spells.online_banner.tip')}
                    </div>
                </div>
            </PageCard>

            {/* Search and Filters */}
            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/50 backdrop-blur-md p-4 rounded-2xl border border-border shadow-sm'>
                <div className='relative flex-1 group'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.marketplace.spells.search_placeholder')}
                        className='pl-10 h-11'
                        value={onlineSearch}
                        onChange={(e) => setOnlineSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchOnlineSpells(1)}
                    />
                </div>
            </div>

            {/* Spells Grid */}
            {onlineLoading ? (
                <EmptyState
                    title={t('admin.marketplace.spells.loading')}
                    description={t('admin.marketplace.spells.loading')}
                    icon={RefreshCw}
                />
            ) : onlineError ? (
                <EmptyState
                    title={t('admin.marketplace.spells.loading_error')}
                    description={onlineError}
                    icon={AlertCircle}
                    action={
                        <Button variant='outline' onClick={() => fetchOnlineSpells()}>
                            <RefreshCw className='h-4 w-4 mr-2' />
                            {t('admin.marketplace.plugins.try_again')}
                        </Button>
                    }
                />
            ) : onlineSpells.length === 0 ? (
                <EmptyState
                    title={t('admin.marketplace.plugins.no_results')}
                    description={t('admin.marketplace.spells.search_placeholder')}
                    icon={Settings}
                />
            ) : (
                <div className='grid grid-cols-1 gap-6'>
                    {onlineSpells.map((spell) => {
                        const IconComponent = ({ className }: { className?: string }) =>
                            spell.icon ? (
                                <div className={cn('relative', className)}>
                                    <Image
                                        src={spell.icon}
                                        alt={spell.name}
                                        fill
                                        className='object-cover rounded-lg'
                                        unoptimized
                                    />
                                </div>
                            ) : (
                                <Settings className={className} />
                            );

                        return (
                            <ResourceCard
                                key={spell.identifier}
                                icon={IconComponent}
                                title={spell.name}
                                subtitle={spell.author ? `by ${spell.author}` : undefined}
                                badges={
                                    [
                                        installedSpellIds.includes(spell.name)
                                            ? {
                                                  label: t('admin.marketplace.plugins.installed'),
                                                  className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                                              }
                                            : null,
                                        spell.verified
                                            ? {
                                                  label: t('admin.marketplace.spells.grid.verified'),
                                                  className: 'bg-green-500/10 text-green-600 border-green-500/20',
                                              }
                                            : null,
                                        spell.latest_version?.version
                                            ? {
                                                  label: `v${spell.latest_version.version}`,
                                                  className: 'bg-primary/10 text-primary border-primary/20',
                                              }
                                            : null,
                                    ].filter(Boolean) as ResourceBadge[]
                                }
                                description={
                                    <div className='space-y-4'>
                                        <p className='text-sm text-muted-foreground line-clamp-3 leading-relaxed'>
                                            {spell.description || t('admin.marketplace.spells.grid.no_description')}
                                        </p>
                                        {!spell.verified && (
                                            <div className='text-[10px] text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 flex items-center gap-2'>
                                                <AlertCircle className='h-3 w-3 shrink-0' />
                                                <span>{t('admin.marketplace.spells.grid.unverified_warning')}</span>
                                            </div>
                                        )}
                                        <div className='flex items-center justify-between text-xs text-muted-foreground font-medium pt-2'>
                                            <div className='flex items-center gap-2'>
                                                <CloudDownload className='h-3.5 w-3.5' />
                                                <span>{spell.downloads.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                }
                                actions={
                                    <div className='flex items-center gap-2 w-full'>
                                        <Button
                                            variant='default'
                                            className='flex-1'
                                            disabled={installingId === spell.identifier}
                                            onClick={() => openInstallDialog(spell)}
                                        >
                                            {installingId === spell.identifier ? (
                                                <RefreshCw className='h-4 w-4 animate-spin mr-2' />
                                            ) : (
                                                <CloudDownload className='h-4 w-4 mr-2' />
                                            )}
                                            {t('admin.marketplace.spells.grid.install')}
                                        </Button>
                                        {spell.website && (
                                            <Button
                                                variant='outline'
                                                size='icon'
                                                onClick={() => window.open(spell.website as string, '_blank')}
                                            >
                                                <Globe className='h-4 w-4' />
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

            {/* Help Cards */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10 pb-12'>
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

            {/* Install Side Panel */}
            <Sheet open={confirmInstallOpen} onOpenChange={setConfirmInstallOpen}>
                <div className='h-full flex flex-col'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.marketplace.spells.dialog.title')}</SheetTitle>
                        <SheetDescription>
                            {selectedSpell?.name} ({selectedSpell?.identifier})
                        </SheetDescription>
                    </SheetHeader>

                    <div className='flex-1 overflow-y-auto pr-2 -mr-2 space-y-6'>
                        {selectedSpell && !selectedSpell.verified && (
                            <div className='rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-start gap-4'>
                                <AlertCircle className='h-5 w-5 text-amber-600 shrink-0 mt-0.5' />
                                <div className='space-y-1'>
                                    <p className='text-sm font-bold text-amber-700'>
                                        {t('admin.marketplace.spells.dialog.unverified_warning')}
                                    </p>
                                    <p className='text-xs text-amber-700/80 leading-relaxed font-medium'>
                                        {t('admin.marketplace.spells.dialog.unverified_desc')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {installedSpellIds.includes(selectedSpell?.name || '') && (
                            <div className='rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5 flex items-start gap-4'>
                                <Info className='h-5 w-5 text-blue-600 shrink-0 mt-0.5' />
                                <div className='space-y-1'>
                                    <p className='text-sm font-bold text-blue-700'>
                                        {t('admin.marketplace.plugins.installed')}
                                    </p>
                                    <p className='text-xs text-blue-700/80 leading-relaxed font-medium'>
                                        You already have this spell installed. Installing it again will create another
                                        instance.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className='space-y-4'>
                            <label className='text-sm font-bold flex items-center gap-2'>
                                <Settings className='h-4 w-4 text-primary' />
                                {t('admin.marketplace.spells.dialog.realm')}
                            </label>
                            <Select
                                value={selectedRealmId}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                    setSelectedRealmId(e.target.value)
                                }
                                className='h-14 rounded-xl bg-muted/30 border-border/50 focus:border-primary/50 transition-colors text-sm'
                            >
                                <option value='' disabled>
                                    {t('admin.marketplace.spells.dialog.choose_realm')}
                                </option>
                                {realms.map((realm) => (
                                    <option key={realm.id} value={String(realm.id)}>
                                        {realm.name}
                                    </option>
                                ))}
                            </Select>
                            <p className='text-[10px] text-muted-foreground pl-1 font-medium italic opacity-70'>
                                {t('admin.marketplace.spells.dialog.realm_help')}
                            </p>
                        </div>
                    </div>

                    <SheetFooter className='mt-8'>
                        <Button
                            variant='ghost'
                            className='flex-1 rounded-xl h-14 font-bold'
                            onClick={() => setConfirmInstallOpen(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            className='flex-2 rounded-xl h-14 font-bold shadow-lg shadow-primary/20'
                            disabled={!selectedRealmId || installingId !== null}
                            onClick={handleInstall}
                        >
                            {installingId ? (
                                <>
                                    <RefreshCw className='h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2' />
                                    {t('admin.marketplace.spells.dialog.installing')}
                                </>
                            ) : (
                                <>
                                    <CloudDownload className='h-4 w-4 mr-2' />
                                    {t('admin.marketplace.spells.dialog.install')}
                                </>
                            )}
                        </Button>
                    </SheetFooter>
                </div>
            </Sheet>
        </div>
    );
}
