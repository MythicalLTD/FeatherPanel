/*
 * Spell picker for admin server create/edit: local spells for the realm or FeatherCloud marketplace install.
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
    ExternalLink,
    Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Spell } from '@/app/(app)/admin/servers/create/types';
import { StarDisplay } from '@/app/(app)/admin/feathercloud/products/_shared';

export interface SpellPickerPaginationState {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}

interface OnlineSpell {
    id?: string | number | null;
    identifier: string;
    name: string;
    description?: string;
    icon?: string | null;
    website?: string | null;
    author?: string | null;
    tags: string[];
    verified: boolean;
    downloads: number;
    average_rating?: number | null;
    review_count?: number | null;
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
            <SheetContent className='overflow-y-auto sm:max-w-3xl'>
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
                    <div className='border-border/60 bg-muted/30 flex gap-1 rounded-xl border p-1'>
                        <button
                            type='button'
                            onClick={() => setPickerMode('browse')}
                            className={cn(
                                'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
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
                                'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
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
                            <div className='group relative'>
                                <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform' />
                                <Input
                                    placeholder={t('common.search')}
                                    value={spellSearch}
                                    onChange={(e) => setSpellSearch(e.target.value)}
                                    className='pl-10'
                                />
                            </div>

                            {pagination && pagination.total_pages > 1 && (
                                <div className='border-border bg-muted/30 flex items-center justify-between gap-2 rounded-lg border px-3 py-2'>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        disabled={!pagination.has_prev}
                                        onClick={() =>
                                            setSpellPagination((p) => ({ ...p, current_page: p.current_page - 1 }))
                                        }
                                        className='h-8 gap-1'
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
                                        className='h-8 gap-1'
                                    >
                                        {t('common.next')}
                                        <ChevronRight className='h-3 w-3' />
                                    </Button>
                                </div>
                            )}

                            <div className='max-h-[min(56vh,420px)] space-y-2 overflow-y-auto'>
                                {spells.length === 0 ? (
                                    <div className='text-muted-foreground space-y-4 py-8 text-center'>
                                        <p>{t('common.no_results')}</p>
                                        <p className='text-sm'>
                                            {t('admin.servers.form.spell_picker_browse_empty_hint')}
                                        </p>
                                        <Button type='button' onClick={() => setPickerMode('cloud')}>
                                            <CloudDownload className='mr-2 h-4 w-4' />
                                            {t('admin.servers.form.spell_picker_cloud')}
                                        </Button>
                                    </div>
                                ) : (
                                    spells.map((spell) => (
                                        <button
                                            key={spell.id}
                                            type='button'
                                            onClick={() => onSelectSpell(spell)}
                                            className='bg-card/80 hover:bg-card ring-border/40 w-full cursor-pointer rounded-2xl p-4 text-left shadow-sm ring-1 transition hover:shadow-md'
                                        >
                                            <div className='flex items-start gap-3'>
                                                <div className='bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-xl'>
                                                    <Sparkles className='text-muted-foreground h-4 w-4' />
                                                </div>
                                                <div className='min-w-0 flex-1'>
                                                    <span className='block truncate text-sm font-semibold'>
                                                        {spell.name}
                                                    </span>
                                                    {spell.description ? (
                                                        <span className='text-muted-foreground mt-1 line-clamp-2 block text-xs leading-relaxed break-words'>
                                                            {spell.description}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>

                            {pagination && pagination.total_pages > 1 && (
                                <div className='border-border/50 flex items-center justify-between border-t pt-4'>
                                    <div className='text-muted-foreground text-sm'>
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
                                            <ChevronLeft className='mr-2 h-4 w-4' />
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
                                            <ChevronRight className='ml-2 h-4 w-4' />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className='space-y-4'>
                            <div className='flex flex-col gap-3 sm:flex-row'>
                                <div className='group relative flex-1'>
                                    <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                                    <Input
                                        placeholder={t('admin.marketplace.spells.search_placeholder')}
                                        className='h-11 pl-10'
                                        value={cloudSearch}
                                        onChange={(e) => setCloudSearch(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') void fetchOnlineSpells(1, cloudSearch.trim());
                                        }}
                                    />
                                </div>
                                <Button asChild variant='outline' className='shrink-0'>
                                    <Link href='/admin/feathercloud/spells' target='_blank' rel='noopener noreferrer'>
                                        <ExternalLink className='mr-2 h-4 w-4' />
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
                                            <RefreshCw className='mr-2 h-4 w-4' />
                                            {t('admin.marketplace.plugins.try_again')}
                                        </Button>
                                    }
                                />
                            ) : onlineSpells.length === 0 ? (
                                <EmptyState
                                    title={t('admin.marketplace.plugins.no_results')}
                                    description={t('admin.marketplace.spells.search_placeholder')}
                                    icon={Sparkles}
                                />
                            ) : (
                                <div className='max-h-[min(52vh,520px)] space-y-3 overflow-y-auto pr-1'>
                                    {onlineSpells.map((spell) => {
                                        const installed = installedNames.includes(spell.name);
                                        const busy = installingId === spell.identifier;
                                        const avg = Number(spell.average_rating || 0);
                                        const reviewCount = Number(spell.review_count || 0);

                                        return (
                                            <article
                                                key={spell.identifier}
                                                className='bg-card/80 ring-border/40 flex flex-col overflow-hidden rounded-2xl shadow-sm ring-1'
                                            >
                                                <div className='flex flex-1 flex-col gap-3 p-4'>
                                                    <div className='flex items-start gap-3'>
                                                        <div className='bg-muted relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl'>
                                                            {spell.icon ? (
                                                                <Image
                                                                    src={spell.icon}
                                                                    alt=''
                                                                    fill
                                                                    className='object-cover'
                                                                    unoptimized
                                                                />
                                                            ) : (
                                                                <Sparkles className='text-muted-foreground h-5 w-5' />
                                                            )}
                                                        </div>
                                                        <div className='min-w-0 flex-1'>
                                                            <h3 className='truncate text-sm font-semibold'>
                                                                {spell.name}
                                                            </h3>
                                                            <p className='text-muted-foreground truncate font-mono text-[11px]'>
                                                                {spell.identifier}
                                                            </p>
                                                        </div>
                                                        <div className='flex shrink-0 flex-col items-end gap-1'>
                                                            {installed ? (
                                                                <span className='rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400'>
                                                                    {t('admin.marketplace.plugins.installed')}
                                                                </span>
                                                            ) : null}
                                                            {spell.verified ? (
                                                                <span className='rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400'>
                                                                    Verified
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </div>

                                                    <p className='text-muted-foreground line-clamp-2 text-xs leading-relaxed break-words'>
                                                        {spell.description ||
                                                            t('admin.marketplace.spells.grid.no_description')}
                                                    </p>

                                                    <div className='text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]'>
                                                        {spell.author ? (
                                                            <span>
                                                                {t('admin.marketplace.common.by_author', {
                                                                    author: spell.author,
                                                                })}
                                                            </span>
                                                        ) : null}
                                                        <span className='inline-flex items-center gap-1'>
                                                            <CloudDownload className='h-3 w-3' />
                                                            {Number(spell.downloads || 0).toLocaleString()}
                                                        </span>
                                                        <span className='inline-flex items-center gap-1.5'>
                                                            <StarDisplay rating={avg} />
                                                            <span>
                                                                {avg > 0 ? avg.toFixed(1) : 'No ratings'}
                                                                {reviewCount > 0 ? ` · ${reviewCount}` : ''}
                                                            </span>
                                                        </span>
                                                    </div>

                                                    {!spell.verified ? (
                                                        <p className='text-[11px] text-amber-700 dark:text-amber-400'>
                                                            {t('admin.marketplace.spells.grid.external_source')}
                                                        </p>
                                                    ) : null}
                                                </div>

                                                <div className='flex items-center gap-2 px-4 pb-4'>
                                                    <Button
                                                        size='sm'
                                                        className='flex-1'
                                                        disabled={busy}
                                                        onClick={() => void handleCloudInstall(spell)}
                                                    >
                                                        {busy ? (
                                                            <RefreshCw className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                                                        ) : (
                                                            <CloudDownload className='mr-1.5 h-3.5 w-3.5' />
                                                        )}
                                                        {t('admin.servers.form.spell_install_to_realm')}
                                                    </Button>
                                                    <Button
                                                        size='sm'
                                                        variant='outline'
                                                        asChild
                                                        title='Reviews on marketplace'
                                                    >
                                                        <Link
                                                            href={`/admin/feathercloud/spells`}
                                                            target='_blank'
                                                            rel='noopener noreferrer'
                                                        >
                                                            <Star className='h-3.5 w-3.5' />
                                                        </Link>
                                                    </Button>
                                                    {spell.website ? (
                                                        <Button
                                                            size='sm'
                                                            variant='outline'
                                                            type='button'
                                                            onClick={() =>
                                                                window.open(spell.website as string, '_blank')
                                                            }
                                                        >
                                                            <Globe className='h-3.5 w-3.5' />
                                                        </Button>
                                                    ) : null}
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                            {onlinePagination && onlinePagination.total_pages > 1 && (
                                <p className='text-muted-foreground text-center text-xs'>
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
