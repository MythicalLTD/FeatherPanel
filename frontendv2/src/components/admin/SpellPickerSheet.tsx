/*
 * Spell picker for admin server create: local spells for the realm or FeatherCloud marketplace install.
 *
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { ResourceCard, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { EmptyState } from '@/components/featherui/EmptyState';
import {
    Search as SearchIcon,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    CloudDownload,
    AlertCircle,
    RefreshCw,
    Globe,
    Settings,
    ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Spell } from '@/app/(app)/admin/servers/create/types';

export interface SpellPickerPaginationState {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}

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
    latest_version?: { version: string };
}

interface OnlinePagination {
    current_page: number;
    total_pages: number;
    total_records: number;
}

function mapApiSpellToSpell(raw: Record<string, unknown>): Spell {
    const docker = raw.docker_images;
    let dockerImages = '{}';
    if (typeof docker === 'string') dockerImages = docker;
    else if (docker && typeof docker === 'object') dockerImages = JSON.stringify(docker);
    return {
        id: Number(raw.id),
        name: String(raw.name ?? ''),
        description: raw.description != null ? String(raw.description) : undefined,
        startup: typeof raw.startup === 'string' ? raw.startup : '',
        docker_images: dockerImages,
    };
}

interface SpellPickerSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    realmId: number;
    spells: Spell[];
    spellSearch: string;
    setSpellSearch: (v: string) => void;
    spellPagination: SpellPickerPaginationState | null;
    setSpellPagination: React.Dispatch<React.SetStateAction<SpellPickerPaginationState>>;
    fetchSpells: () => void;
    onSelectSpell: (spell: Spell) => void;
}

export function SpellPickerSheet({
    open,
    onOpenChange,
    realmId,
    spells,
    spellSearch,
    setSpellSearch,
    spellPagination,
    setSpellPagination,
    fetchSpells,
    onSelectSpell,
}: SpellPickerSheetProps) {
    const { t } = useTranslation();
    const [pickerMode, setPickerMode] = useState<'browse' | 'cloud'>('browse');

    const [onlineSpells, setOnlineSpells] = useState<OnlineSpell[]>([]);
    const [onlineLoading, setOnlineLoading] = useState(false);
    const [onlineError, setOnlineError] = useState<string | null>(null);
    const [onlinePagination, setOnlinePagination] = useState<OnlinePagination | null>(null);
    const [cloudSearch, setCloudSearch] = useState('');
    const [debouncedCloudSearch, setDebouncedCloudSearch] = useState('');
    const [installingId, setInstallingId] = useState<string | null>(null);
    const [installedNames, setInstalledNames] = useState<string[]>([]);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedCloudSearch(cloudSearch), 400);
        return () => clearTimeout(timer);
    }, [cloudSearch]);

    const loadInstalledNames = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/admin/spells', {
                params: { realm_id: realmId, page: 1, limit: 500 },
            });
            const list = (data?.data?.spells || []) as { name: string }[];
            setInstalledNames(list.map((s) => s.name));
        } catch {
            setInstalledNames([]);
        }
    }, [realmId]);

    const fetchOnlineSpells = useCallback(
        async (page: number, search: string) => {
            setOnlineLoading(true);
            setOnlineError(null);
            const params = new URLSearchParams({
                page: String(page),
                per_page: '50',
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
        [t],
    );

    useEffect(() => {
        if (open && pickerMode === 'cloud') {
            void loadInstalledNames();
        }
    }, [open, pickerMode, loadInstalledNames]);

    /** Cloud list: first page only in this sheet (full pagination on marketplace). */
    useEffect(() => {
        if (!open || pickerMode !== 'cloud') return;
        void fetchOnlineSpells(1, debouncedCloudSearch);
    }, [open, pickerMode, debouncedCloudSearch, fetchOnlineSpells]);

    const handleCloudInstall = async (spell: OnlineSpell) => {
        setInstallingId(spell.identifier);
        try {
            const { data } = await axios.post('/api/admin/spells/online/install', {
                identifier: spell.identifier,
                realm_id: realmId,
            });
            const raw = data?.data?.spell as Record<string, unknown> | undefined;
            if (!raw || raw.id === undefined) {
                toast.error(t('admin.marketplace.spells.install_error'));
                return;
            }
            toast.success(t('admin.marketplace.spells.install_success', { identifier: spell.identifier }));
            onSelectSpell(mapApiSpellToSpell(raw));
            setPickerMode('browse');
            fetchSpells();
            void loadInstalledNames();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e?.response?.data?.message || t('admin.marketplace.spells.install_error'));
        } finally {
            setInstallingId(null);
        }
    };

    const pagination = spellPagination;

    return (
        <Sheet
            open={open}
            onOpenChange={(next) => {
                if (next) {
                    setPickerMode('browse');
                    setCloudSearch('');
                }
                onOpenChange(next);
            }}
        >
            <SheetContent className='sm:max-w-3xl overflow-y-auto'>
                <SheetHeader>
                    <SheetTitle>{t('admin.servers.form.select_spell')}</SheetTitle>
                    <SheetDescription>
                        {pickerMode === 'browse'
                            ? pagination
                                ? t('common.showing', {
                                      from: String((pagination.current_page - 1) * pagination.per_page + 1),
                                      to: String(
                                          Math.min(
                                              pagination.current_page * pagination.per_page,
                                              pagination.total_records,
                                          ),
                                      ),
                                      total: String(pagination.total_records),
                                  })
                                : t('common.select_an_option')
                            : t('admin.servers.form.spell_picker_cloud_description')}
                    </SheetDescription>
                </SheetHeader>

                <div className='mt-6 space-y-4'>
                    <div className='flex rounded-xl border border-border/60 p-1 bg-muted/30 gap-1'>
                        <button
                            type='button'
                            onClick={() => setPickerMode('browse')}
                            className={cn(
                                'flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                pickerMode === 'browse'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Sparkles className='h-4 w-4' />
                            {t('admin.servers.form.spell_picker_this_realm')}
                        </button>
                        <button
                            type='button'
                            onClick={() => setPickerMode('cloud')}
                            className={cn(
                                'flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                pickerMode === 'cloud'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <CloudDownload className='h-4 w-4' />
                            {t('admin.servers.form.spell_picker_cloud')}
                        </button>
                    </div>

                    {pickerMode === 'browse' ? (
                        <>
                            <div className='relative group'>
                                <SearchIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                                <Input
                                    placeholder={t('common.search')}
                                    value={spellSearch}
                                    onChange={(e) => setSpellSearch(e.target.value)}
                                    className='pl-10'
                                />
                            </div>

                            {pagination && pagination.total_pages > 1 && (
                                <div className='flex items-center justify-between gap-2 py-2 px-3 rounded-lg border border-border bg-muted/30'>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        disabled={!pagination.has_prev}
                                        onClick={() =>
                                            setSpellPagination((p) => ({ ...p, current_page: p.current_page - 1 }))
                                        }
                                        className='gap-1 h-8'
                                    >
                                        <ChevronLeft className='h-3 w-3' />
                                        {t('common.previous')}
                                    </Button>
                                    <span className='text-xs font-medium'>
                                        {pagination.current_page} / {pagination.total_pages}
                                    </span>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        disabled={!pagination.has_next}
                                        onClick={() =>
                                            setSpellPagination((p) => ({ ...p, current_page: p.current_page + 1 }))
                                        }
                                        className='gap-1 h-8'
                                    >
                                        {t('common.next')}
                                        <ChevronRight className='h-3 w-3' />
                                    </Button>
                                </div>
                            )}

                            <div className='space-y-2 max-h-[min(56vh,420px)] overflow-y-auto'>
                                {spells.length === 0 ? (
                                    <div className='text-center py-8 text-muted-foreground space-y-4'>
                                        <p>{t('common.no_results')}</p>
                                        <p className='text-sm'>
                                            {t('admin.servers.form.spell_picker_browse_empty_hint')}
                                        </p>
                                        <Button type='button' onClick={() => setPickerMode('cloud')}>
                                            <CloudDownload className='h-4 w-4 mr-2' />
                                            {t('admin.servers.form.spell_picker_cloud')}
                                        </Button>
                                    </div>
                                ) : (
                                    spells.map((spell) => (
                                        <button
                                            key={spell.id}
                                            type='button'
                                            onClick={() => onSelectSpell(spell)}
                                            className='w-full p-3 rounded-xl border border-border/50 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all text-left'
                                        >
                                            <div className='flex flex-col'>
                                                <span className='font-semibold'>{spell.name}</span>
                                                {spell.description && (
                                                    <span className='text-xs text-muted-foreground line-clamp-2'>
                                                        {spell.description}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>

                            {pagination && pagination.total_pages > 1 && (
                                <div className='flex items-center justify-between pt-4 border-t border-border/50'>
                                    <div className='text-sm text-muted-foreground'>
                                        {t('common.showing', {
                                            from: String((pagination.current_page - 1) * pagination.per_page + 1),
                                            to: String(
                                                Math.min(
                                                    pagination.current_page * pagination.per_page,
                                                    pagination.total_records,
                                                ),
                                            ),
                                            total: String(pagination.total_records),
                                        })}
                                    </div>
                                    <div className='flex gap-2'>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() =>
                                                setSpellPagination((p) => ({ ...p, current_page: p.current_page - 1 }))
                                            }
                                            disabled={!pagination.has_prev}
                                        >
                                            <ChevronLeft className='h-4 w-4 mr-2' />
                                            {t('common.previous')}
                                        </Button>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() =>
                                                setSpellPagination((p) => ({ ...p, current_page: p.current_page + 1 }))
                                            }
                                            disabled={!pagination.has_next}
                                        >
                                            {t('common.next')}
                                            <ChevronRight className='h-4 w-4 ml-2' />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className='space-y-4'>
                            <div className='flex flex-col sm:flex-row gap-3'>
                                <div className='relative flex-1 group'>
                                    <SearchIcon className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                                    <Input
                                        placeholder={t('admin.marketplace.spells.search_placeholder')}
                                        className='pl-10 h-11'
                                        value={cloudSearch}
                                        onChange={(e) => setCloudSearch(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') void fetchOnlineSpells(1, cloudSearch.trim());
                                        }}
                                    />
                                </div>
                                <Button asChild variant='outline' className='shrink-0'>
                                    <Link href='/admin/feathercloud/spells' target='_blank' rel='noopener noreferrer'>
                                        <ExternalLink className='h-4 w-4 mr-2' />
                                        {t('admin.spells.browse_marketplace')}
                                    </Link>
                                </Button>
                            </div>

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
                                        <Button
                                            variant='outline'
                                            onClick={() => void fetchOnlineSpells(1, debouncedCloudSearch)}
                                        >
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
                                <div className='space-y-4 max-h-[min(52vh,480px)] overflow-y-auto pr-1'>
                                    {onlineSpells.map((spell) => {
                                        const IconComponent = ({ className }: { className?: string }) =>
                                            spell.icon ? (
                                                <div
                                                    className={cn(
                                                        'relative h-10 w-10 rounded-lg overflow-hidden shrink-0',
                                                        className,
                                                    )}
                                                >
                                                    <Image
                                                        src={spell.icon}
                                                        alt={spell.name}
                                                        fill
                                                        className='object-cover'
                                                        unoptimized
                                                    />
                                                </div>
                                            ) : (
                                                <Settings className={cn('h-10 w-10', className)} />
                                            );

                                        const badges: ResourceBadge[] = [
                                            ...(installedNames.includes(spell.name)
                                                ? [
                                                      {
                                                          label: t('admin.marketplace.plugins.installed'),
                                                          className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                                                      },
                                                  ]
                                                : []),
                                            ...(spell.verified
                                                ? [
                                                      {
                                                          label: t(
                                                              'admin.marketplace.spells.grid.pterodactyl_verified',
                                                          ),
                                                          className:
                                                              'bg-green-500/10 text-green-600 border-green-500/20',
                                                      },
                                                  ]
                                                : []),
                                            ...(spell.latest_version?.version
                                                ? [
                                                      {
                                                          label: `v${spell.latest_version.version}`,
                                                          className: 'bg-primary/10 text-primary border-primary/20',
                                                      },
                                                  ]
                                                : []),
                                        ];

                                        return (
                                            <ResourceCard
                                                key={spell.identifier}
                                                icon={IconComponent}
                                                title={spell.name}
                                                subtitle={
                                                    spell.author
                                                        ? t('admin.marketplace.common.by_author', {
                                                              author: spell.author,
                                                          })
                                                        : undefined
                                                }
                                                badges={badges}
                                                description={
                                                    <div className='space-y-3'>
                                                        <p className='text-sm text-muted-foreground line-clamp-3 leading-relaxed'>
                                                            {spell.description ||
                                                                t('admin.marketplace.spells.grid.no_description')}
                                                        </p>
                                                        {!spell.verified && (
                                                            <div className='text-[10px] text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 flex items-center gap-2'>
                                                                <AlertCircle className='h-3 w-3 shrink-0' />
                                                                <span>
                                                                    {t('admin.marketplace.spells.grid.external_source')}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                }
                                                actions={
                                                    <div className='flex items-center gap-2 w-full'>
                                                        <Button
                                                            variant='default'
                                                            className='flex-1'
                                                            disabled={installingId === spell.identifier}
                                                            onClick={() => void handleCloudInstall(spell)}
                                                        >
                                                            {installingId === spell.identifier ? (
                                                                <RefreshCw className='h-4 w-4 animate-spin mr-2' />
                                                            ) : (
                                                                <CloudDownload className='h-4 w-4 mr-2' />
                                                            )}
                                                            {t('admin.servers.form.spell_install_to_realm')}
                                                        </Button>
                                                        {spell.website && (
                                                            <Button
                                                                variant='outline'
                                                                size='icon'
                                                                type='button'
                                                                onClick={() =>
                                                                    window.open(spell.website as string, '_blank')
                                                                }
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
                            {onlinePagination && onlinePagination.total_pages > 1 && (
                                <p className='text-xs text-center text-muted-foreground'>
                                    {t('admin.servers.form.spell_picker_cloud_more_pages', {
                                        total: String(onlinePagination.total_pages),
                                    })}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
