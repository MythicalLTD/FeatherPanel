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

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Select } from '@/components/ui/select-native';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    Sparkles,
    Plus,
    Search,
    Pencil,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ArrowUp,
    ArrowDown,
    Save,
    X,
    AlertCircle,
    GripVertical,
    Download,
    Upload,
    CloudDownload,
    BookOpen,
    Box,
    Wrench,
    GitBranch,
    FolderTree,
} from 'lucide-react';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { usePersistedListFilters } from '@/hooks/usePersistedListFilters';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

interface Spell {
    id: number;
    name: string;
    description?: string;
    author?: string;
    uuid: string;
    realm_id: number;
    realm_name?: string;
    sort_order?: number;
    banner?: string;
    update_url?: string;
    created_at: string;
    updated_at: string;
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

interface Realm {
    id: number;
    name: string;
}

const SPELLS_LIST_FILTERS_KEY = 'featherpanel_admin_spells_filters_v1';
const SPELLS_LIST_FILTERS_DEFAULTS = {
    searchQuery: '',
    realmId: '',
    page: 1,
    pageSize: 10,
};

export default function SpellsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-spells');
    const searchParams = useSearchParams();
    const urlRealmId = searchParams?.get('realm_id') ?? '';
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { filters, patchFilters, hydrated } = usePersistedListFilters(
        SPELLS_LIST_FILTERS_KEY,
        SPELLS_LIST_FILTERS_DEFAULTS,
    );
    const { searchQuery, page, pageSize } = filters;
    const realmIdParam = urlRealmId || filters.realmId || '';

    useEffect(() => {
        if (urlRealmId && urlRealmId !== filters.realmId) {
            patchFilters({ realmId: urlRealmId, page: 1 });
        }
    }, [urlRealmId, filters.realmId, patchFilters]);

    const [loading, setLoading] = useState(true);
    const [spells, setSpells] = useState<Spell[]>([]);
    const [realms, setRealms] = useState<Realm[]>([]);
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [currentRealm, setCurrentRealm] = useState<Realm | null>(null);

    const [pagination, setPagination] = useState<Omit<Pagination, 'page' | 'pageSize'>>({
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    const [refreshKey, setRefreshKey] = useState(0);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [importRealmId, setImportRealmId] = useState('');
    const [importing, setImporting] = useState(false);
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [reorderLoading, setReorderLoading] = useState(false);
    const [hasOrderChanges, setHasOrderChanges] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== debouncedSearchQuery) {
                patchFilters({ page: 1 });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearchQuery, patchFilters]);

    useEffect(() => {
        const fetchRealms = async () => {
            try {
                const { data } = await axios.get('/api/admin/realms');
                const realmsList = data.data.realms || [];
                setRealms(realmsList);

                if (realmIdParam) {
                    const realm = realmsList.find((r: Realm) => r.id === parseInt(realmIdParam));
                    setCurrentRealm(realm || null);
                }
            } catch (error) {
                console.error('Error fetching realms:', error);
            }
        };
        fetchRealms();
    }, [realmIdParam]);

    useEffect(() => {
        if (!hydrated) {
            return;
        }

        const fetchSpells = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/admin/spells', {
                    params: {
                        page,
                        limit: pageSize,
                        search: debouncedSearchQuery || undefined,
                        realm_id: realmIdParam || undefined,
                    },
                });

                setSpells(data.data.spells || []);
                const apiPagination = data.data.pagination;
                setPagination({
                    total: apiPagination.total_records,
                    totalPages: Math.ceil(apiPagination.total_records / apiPagination.per_page),
                    hasNext: apiPagination.has_next,
                    hasPrev: apiPagination.has_prev,
                });
            } catch (error) {
                console.error('Error fetching spells:', error);
                toast.error(t('admin.spells.messages.fetch_failed'));
            } finally {
                setLoading(false);
            }
        };

        fetchSpells();
        fetchWidgets();
    }, [page, pageSize, debouncedSearchQuery, refreshKey, realmIdParam, t, fetchWidgets, hydrated]);

    const handleDelete = async (spell: Spell) => {
        if (!confirm(t('admin.spells.messages.delete_confirm'))) return;
        try {
            await axios.delete(`/api/admin/spells/${spell.id}`);
            toast.success(t('admin.spells.messages.deleted'));
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error deleting spell:', error);
            toast.error(t('admin.spells.messages.delete_failed'));
        }
    };

    const handleExport = async (spell: Spell) => {
        try {
            const response = await axios.get(`/api/admin/spells/${spell.id}/export`, {
                responseType: 'blob',
            });

            const url = URL.createObjectURL(response.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${spell.name.toLowerCase().replace(/\s+/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting spell:', error);
            toast.error(t('admin.spells.messages.export_failed'));
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (realmIdParam) {
            await performImport(file, realmIdParam);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        setImportDialogOpen(true);

        (window as unknown as { __importFile?: File }).__importFile = file;
    };

    const performImport = async (file: File, realmId: string) => {
        setImporting(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('realm_id', realmId);

            await axios.post('/api/admin/spells/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            toast.success(t('admin.spells.messages.imported'));
            setRefreshKey((prev) => prev + 1);
            setImportDialogOpen(false);
            setImportRealmId('');

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            delete (window as unknown as { __importFile?: File }).__importFile;
        } catch (error) {
            console.error('Error importing spell:', error);
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.spells.messages.import_failed'));
            }
        } finally {
            setImporting(false);
        }
    };

    const handleImportDialogSubmit = async () => {
        if (!importRealmId) {
            toast.error(t('admin.spells.messages.select_realm'));
            return;
        }

        const file = (window as unknown as { __importFile?: File }).__importFile;
        if (!file) {
            toast.error(t('admin.spells.messages.no_file_selected'));
            setImportDialogOpen(false);
            return;
        }

        await performImport(file, importRealmId);
    };

    const fetchAllSpellsForReorder = useCallback(async (): Promise<boolean> => {
        if (!realmIdParam) return false;
        const pageSize = 100;
        try {
            let page = 1;
            const allSpells: Spell[] = [];
            let totalRecords = 0;
            while (true) {
                const { data } = await axios.get('/api/admin/spells', {
                    params: {
                        page,
                        limit: pageSize,
                        realm_id: realmIdParam,
                    },
                });
                const pag = data.data.pagination;
                totalRecords = pag.total_records;
                const batch = (data.data.spells || []) as Spell[];
                allSpells.push(...batch);
                if (allSpells.length >= totalRecords || !pag.has_next) {
                    break;
                }
                page += 1;
            }
            const sorted = [...allSpells].sort(
                (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name),
            );
            setSpells(sorted);
            return true;
        } catch {
            toast.error(t('admin.spells.messages.fetch_failed'));
            return false;
        }
    }, [realmIdParam, t]);

    const moveSpell = (spellId: number, direction: 'up' | 'down') => {
        const index = spells.findIndex((s) => s.id === spellId);
        if (index === -1) return;
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= spells.length) return;

        const next = [...spells];
        const [moved] = next.splice(index, 1);
        next.splice(newIndex, 0, moved);
        setSpells(
            next.map((spell, idx) => ({
                ...spell,
                sort_order: idx * 10,
            })),
        );
        setHasOrderChanges(true);
    };

    const saveSpellOrder = async () => {
        if (!realmIdParam) return;
        setReorderLoading(true);
        try {
            await axios.post('/api/admin/spells/reorder', {
                realm_id: parseInt(realmIdParam, 10),
                spells: spells.map((spell) => ({
                    id: spell.id,
                    sort_order: spell.sort_order ?? 0,
                })),
            });
            toast.success(t('admin.spells.order.messages.saved'));
            setHasOrderChanges(false);
            setIsReorderMode(false);
            patchFilters({ page: 1 });
            setRefreshKey((prev) => prev + 1);
        } catch {
            toast.error(t('admin.spells.order.messages.save_failed'));
        } finally {
            setReorderLoading(false);
        }
    };

    const toggleReorderMode = async () => {
        if (!isReorderMode) {
            const ok = await fetchAllSpellsForReorder();
            if (!ok) return;
        } else {
            patchFilters({ page: 1 });
            setRefreshKey((prev) => prev + 1);
            setHasOrderChanges(false);
        }
        setIsReorderMode(!isReorderMode);
    };

    const subtitle = currentRealm
        ? t('admin.spells.subtitle_realm', { realm: currentRealm.name })
        : t('admin.spells.subtitle');

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-spells', 'top-of-page')} />
            <PageHeader
                title={t('admin.spells.title')}
                description={subtitle}
                icon={Sparkles}
                actions={
                    <div className='flex flex-wrap items-center gap-2'>
                        {currentRealm && !isReorderMode && (
                            <>
                                <Button variant='outline' onClick={toggleReorderMode} className='gap-2'>
                                    <ArrowUp className='h-4 w-4' />
                                    <ArrowDown className='h-4 w-4' />
                                    <span className='hidden sm:inline'>{t('admin.spells.order.title')}</span>
                                </Button>
                                <Button variant='outline' onClick={() => router.push('/admin/spells')}>
                                    <FolderTree className='mr-2 h-4 w-4' />
                                    {t('admin.spells.viewall')}
                                </Button>
                            </>
                        )}
                        {currentRealm && isReorderMode && (
                            <>
                                {hasOrderChanges && (
                                    <Button onClick={saveSpellOrder} loading={reorderLoading} className='gap-2'>
                                        <Save className='h-4 w-4' />
                                        {t('common.save')}
                                    </Button>
                                )}
                                <Button variant='outline' onClick={toggleReorderMode}>
                                    <X className='mr-2 h-4 w-4' />
                                    {t('common.cancel')}
                                </Button>
                            </>
                        )}
                        {!isReorderMode && (
                            <Button variant='outline' onClick={() => router.push('/admin/feathercloud/spells')}>
                                <CloudDownload className='mr-2 h-4 w-4' />
                                {t('admin.spells.browse_marketplace')}
                            </Button>
                        )}
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-spells', 'after-header')} />

            {!isReorderMode && (
                <div className='bg-card/40 flex flex-col items-center gap-4 rounded-2xl p-4 shadow-sm backdrop-blur-md sm:flex-row'>
                    <div className='group relative w-full flex-1'>
                        <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                        <Input
                            placeholder={t('admin.spells.search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => patchFilters({ searchQuery: e.target.value })}
                            className='h-11 w-full pl-10'
                        />
                    </div>
                    <div className='flex gap-2'>
                        <Button onClick={() => router.push('/admin/spells/create')}>
                            <Plus className='mr-2 h-4 w-4' />
                            {t('admin.spells.create')}
                        </Button>
                        <Button variant='outline' onClick={() => fileInputRef.current?.click()}>
                            <Upload className='mr-2 h-4 w-4' />
                            {t('admin.spells.import')}
                        </Button>
                        <input
                            ref={fileInputRef}
                            type='file'
                            accept='application/json'
                            className='hidden'
                            onChange={handleImport}
                        />
                    </div>
                </div>
            )}

            {pagination.totalPages > 1 && !loading && !isReorderMode && (
                <div className='border-border bg-card/50 mb-4 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={!pagination.hasPrev}
                        onClick={() => patchFilters({ page: page - 1 })}
                        className='gap-1.5'
                    >
                        <ChevronLeft className='h-4 w-4' />
                        {t('common.previous')}
                    </Button>
                    <span className='text-sm font-medium'>
                        {page} / {pagination.totalPages}
                    </span>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={!pagination.hasNext}
                        onClick={() => patchFilters({ page: page + 1 })}
                        className='gap-1.5'
                    >
                        {t('common.next')}
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            )}

            {loading ? (
                <TableSkeleton count={5} />
            ) : spells.length === 0 ? (
                <EmptyState
                    icon={Sparkles}
                    title={t('admin.spells.no_results')}
                    description={t('admin.spells.search_placeholder')}
                    action={
                        <Button onClick={() => router.push('/admin/spells/create')}>{t('admin.spells.create')}</Button>
                    }
                />
            ) : isReorderMode ? (
                <div className='space-y-6'>
                    {hasOrderChanges && (
                        <div className='flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-600'>
                            <AlertCircle className='h-4 w-4' />
                            {t('admin.spells.order.unsaved_changes')}
                        </div>
                    )}
                    <PageCard title={t('admin.spells.order.subtitle')} icon={GripVertical}>
                        <div className='divide-border/50 divide-y'>
                            {spells.map((spell, index) => (
                                <div
                                    key={spell.id}
                                    className='hover:bg-muted/30 flex items-center gap-4 p-4 transition-colors'
                                >
                                    <div className='bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold'>
                                        {index + 1}
                                    </div>
                                    <div className='flex flex-col gap-0.5'>
                                        <Button
                                            variant='ghost'
                                            size='icon'
                                            className='h-6 w-6'
                                            onClick={() => moveSpell(spell.id, 'up')}
                                            disabled={index === 0}
                                        >
                                            <ArrowUp className='h-3 w-3' />
                                        </Button>
                                        <Button
                                            variant='ghost'
                                            size='icon'
                                            className='h-6 w-6'
                                            onClick={() => moveSpell(spell.id, 'down')}
                                            disabled={index === spells.length - 1}
                                        >
                                            <ArrowDown className='h-3 w-3' />
                                        </Button>
                                    </div>
                                    <div className='min-w-0 flex-1'>
                                        <p className='truncate font-bold'>{spell.name}</p>
                                        {spell.author ? (
                                            <p className='text-muted-foreground truncate text-xs'>{spell.author}</p>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </PageCard>
                </div>
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    <WidgetRenderer widgets={getWidgets('admin-spells', 'before-list')} />
                    {spells.map((spell) => (
                        <ResourceCard
                            key={spell.id}
                            title={spell.name}
                            subtitle={spell.realm_name || 'No realm'}
                            icon={Sparkles}
                            badges={
                                spell.author
                                    ? [
                                          {
                                              label: spell.author,
                                              className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                                          },
                                      ]
                                    : []
                            }
                            description={
                                <div className='text-muted-foreground mt-1 line-clamp-2 text-sm'>
                                    {spell.description || 'No description'}
                                </div>
                            }
                            actions={
                                <div className='flex items-center gap-2'>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        onClick={() => router.push(`/admin/spells/${spell.id}/edit`)}
                                    >
                                        <Pencil className='h-4 w-4' />
                                    </Button>
                                    <Button size='sm' variant='ghost' onClick={() => handleExport(spell)}>
                                        <Download className='h-4 w-4' />
                                    </Button>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                        onClick={() => handleDelete(spell)}
                                    >
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                </div>
                            }
                        />
                    ))}
                </div>
            )}

            {pagination.totalPages > 1 && !isReorderMode && (
                <div className='mt-8 flex items-center justify-center gap-2'>
                    <Button
                        variant='outline'
                        size='icon'
                        disabled={!pagination.hasPrev}
                        onClick={() => patchFilters({ page: page - 1 })}
                    >
                        <ChevronLeft className='h-4 w-4' />
                    </Button>
                    <span className='text-sm font-medium'>
                        {page} / {pagination.totalPages}
                    </span>
                    <Button
                        variant='outline'
                        size='icon'
                        disabled={!pagination.hasNext}
                        onClick={() => patchFilters({ page: page + 1 })}
                    >
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            )}

            {!isReorderMode && (
                <PageCard title={t('admin.spells.help.cross_compatible.title')} icon={Sparkles} variant='default'>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.spells.help.cross_compatible.description')}
                    </p>
                </PageCard>
            )}

            {!isReorderMode && (
                <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4'>
                    <PageCard title={t('admin.spells.help.what_are_spells.title')} icon={BookOpen}>
                        <p className='text-muted-foreground text-sm leading-relaxed'>
                            {t('admin.spells.help.what_are_spells.description')}
                        </p>
                    </PageCard>
                    <PageCard title={t('admin.spells.help.how_to_use.title')} icon={Box}>
                        <p className='text-muted-foreground text-sm leading-relaxed'>
                            {t('admin.spells.help.how_to_use.description')}
                        </p>
                    </PageCard>
                    <PageCard title={t('admin.spells.help.under_the_hood.title')} icon={Wrench}>
                        <p className='text-muted-foreground text-sm leading-relaxed'>
                            {t('admin.spells.help.under_the_hood.description')}
                        </p>
                    </PageCard>
                    <PageCard title={t('admin.spells.help.sources.title')} icon={GitBranch}>
                        <p className='text-muted-foreground text-sm leading-relaxed'>
                            {t('admin.spells.help.sources.description')}
                        </p>
                    </PageCard>
                </div>
            )}

            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.spells.import')}</DialogTitle>
                        <DialogDescription>{t('admin.spells.import_dialog_description')}</DialogDescription>
                    </DialogHeader>
                    <div className='space-y-4 py-4'>
                        <div className='space-y-2'>
                            <Label>{t('admin.spells.form.realm')} *</Label>
                            <Select value={importRealmId} onChange={(e) => setImportRealmId(e.target.value)}>
                                <option value=''>{t('admin.spells.form.realm_placeholder')}</option>
                                {realms.map((realm) => (
                                    <option key={realm.id} value={realm.id}>
                                        {realm.name}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant='outline' onClick={() => setImportDialogOpen(false)} disabled={importing}>
                            Cancel
                        </Button>
                        <Button onClick={handleImportDialogSubmit} loading={importing}>
                            {t('admin.spells.import')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <WidgetRenderer widgets={getWidgets('admin-spells', 'bottom-of-page')} />
        </div>
    );
}
