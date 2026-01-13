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

import { useState, useEffect, useRef } from 'react';
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
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

interface Spell {
    id: number;
    name: string;
    description?: string;
    author?: string;
    uuid: string;
    realm_id: number;
    realm_name?: string;
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

export default function SpellsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-spells');
    const searchParams = useSearchParams();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(true);
    const [spells, setSpells] = useState<Spell[]>([]);
    const [realms, setRealms] = useState<Realm[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [currentRealm, setCurrentRealm] = useState<Realm | null>(null);

    // Pagination
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    // Form states
    const [refreshKey, setRefreshKey] = useState(0);
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [importRealmId, setImportRealmId] = useState('');
    const [importing, setImporting] = useState(false);

    // Get realm_id from URL
    const realmIdParam = searchParams?.get('realm_id');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== debouncedSearchQuery) {
                setPagination((p) => ({ ...p, page: 1 }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearchQuery]);

    // Fetch realms for dropdown
    useEffect(() => {
        const fetchRealms = async () => {
            try {
                const { data } = await axios.get('/api/admin/realms');
                const realmsList = data.data.realms || [];
                setRealms(realmsList);

                // Set current realm if filtering
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

    // Fetch spells
    useEffect(() => {
        const fetchSpells = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/admin/spells', {
                    params: {
                        page: pagination.page,
                        limit: pagination.pageSize,
                        search: debouncedSearchQuery || undefined,
                        realm_id: realmIdParam || undefined,
                    },
                });

                setSpells(data.data.spells || []);
                const apiPagination = data.data.pagination;
                setPagination({
                    page: apiPagination.current_page,
                    pageSize: apiPagination.per_page,
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
    }, [pagination.page, pagination.pageSize, debouncedSearchQuery, refreshKey, realmIdParam, t, fetchWidgets]);

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
            const { data } = await axios.get(`/api/admin/spells/${spell.id}`);
            const spellData = data.data.spell;

            const blob = new Blob([JSON.stringify(spellData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
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

        // If we have a realm from URL, use it directly
        if (realmIdParam) {
            await performImport(file, realmIdParam);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        // Otherwise, show dialog to select realm
        setImportDialogOpen(true);
        // Store file reference for later use
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

            // Clean up
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
            toast.error('Please select a realm');
            return;
        }

        const file = (window as unknown as { __importFile?: File }).__importFile;
        if (!file) {
            toast.error('No file selected');
            setImportDialogOpen(false);
            return;
        }

        await performImport(file, importRealmId);
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
                    <div className='flex items-center gap-2'>
                        {currentRealm && (
                            <Button variant='outline' onClick={() => router.push('/admin/spells')}>
                                <FolderTree className='h-4 w-4 mr-2' />
                                {t('admin.spells.viewall')}
                            </Button>
                        )}
                        <Button variant='outline' onClick={() => router.push('/admin/feathercloud/spells')}>
                            <CloudDownload className='h-4 w-4 mr-2' />
                            {t('admin.spells.browse_marketplace')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-spells', 'after-header')} />

            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/40 backdrop-blur-md p-4 rounded-2xl shadow-sm'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.spells.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='pl-10 h-11 w-full'
                    />
                </div>
                <div className='flex gap-2'>
                    <Button onClick={() => router.push('/admin/spells/create')}>
                        <Plus className='h-4 w-4 mr-2' />
                        {t('admin.spells.create')}
                    </Button>
                    <Button variant='outline' onClick={() => fileInputRef.current?.click()}>
                        <Upload className='h-4 w-4 mr-2' />
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
                                <div className='text-sm text-muted-foreground mt-1 line-clamp-2'>
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

            {pagination.totalPages > 1 && (
                <div className='flex items-center justify-center gap-2 mt-8'>
                    <Button
                        variant='outline'
                        size='icon'
                        disabled={!pagination.hasPrev}
                        onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                    >
                        <ChevronLeft className='h-4 w-4' />
                    </Button>
                    <span className='text-sm font-medium'>
                        {pagination.page} / {pagination.totalPages}
                    </span>
                    <Button
                        variant='outline'
                        size='icon'
                        disabled={!pagination.hasNext}
                        onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    >
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            )}

            {/* Cross-compatibility Card */}
            <PageCard title={t('admin.spells.help.cross_compatible.title')} icon={Sparkles} variant='default'>
                <p className='text-sm text-muted-foreground leading-relaxed'>
                    {t('admin.spells.help.cross_compatible.description')}
                </p>
            </PageCard>

            {/* Help Cards */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
                <PageCard title={t('admin.spells.help.what_are_spells.title')} icon={BookOpen}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.spells.help.what_are_spells.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.spells.help.how_to_use.title')} icon={Box}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.spells.help.how_to_use.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.spells.help.under_the_hood.title')} icon={Wrench}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.spells.help.under_the_hood.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.spells.help.sources.title')} icon={GitBranch}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.spells.help.sources.description')}
                    </p>
                </PageCard>
            </div>

            {/* Import Dialog */}
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('admin.spells.import')}</DialogTitle>
                        <DialogDescription>Select the realm where you want to import this spell.</DialogDescription>
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
