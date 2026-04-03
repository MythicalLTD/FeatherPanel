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

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { ResourceCard, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/featherui/Textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { HardDrive, Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

export interface AdminMount {
    id: number;
    name: string;
    description: string | null;
    source: string;
    target: string;
    read_only: boolean;
    user_mountable: boolean;
    node_ids: number[];
    spell_ids: number[];
    server_ids: number[];
    created_at?: string;
    updated_at?: string;
}

interface PickNode {
    id: number;
    name: string;
    fqdn: string;
}

interface PickSpell {
    id: number;
    name: string;
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

const MAX_ADMIN_LIST_PAGES = 500;

async function fetchAllNodes(): Promise<PickNode[]> {
    const out: PickNode[] = [];
    let page = 1;
    const limit = 100;
    for (;;) {
        const { data } = await axios.get('/api/admin/nodes', { params: { page, limit } });
        const batch = (data.data?.nodes || []) as PickNode[];
        out.push(...batch);
        const p = data.data?.pagination;
        if (!p?.has_next || batch.length === 0) break;
        page += 1;
        if (page > MAX_ADMIN_LIST_PAGES) break;
    }
    return out;
}

async function fetchAllSpells(): Promise<PickSpell[]> {
    const out: PickSpell[] = [];
    let page = 1;
    const limit = 100;
    for (;;) {
        const { data } = await axios.get('/api/admin/spells', { params: { page, limit } });
        const batch = (data.data?.spells || []) as PickSpell[];
        out.push(...batch);
        const p = data.data?.pagination;
        if (!p?.has_next || batch.length === 0) break;
        page += 1;
        if (page > MAX_ADMIN_LIST_PAGES) break;
    }
    return out;
}

export default function AdminMountsPage() {
    const { t } = useTranslation();
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-mounts');

    const [loading, setLoading] = useState(true);
    const [mounts, setMounts] = useState<AdminMount[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    const [sheetOpen, setSheetOpen] = useState(false);
    const [mode, setMode] = useState<'create' | 'edit'>('create');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [nodes, setNodes] = useState<PickNode[]>([]);
    const [spells, setSpells] = useState<PickSpell[]>([]);
    const [linksLoading, setLinksLoading] = useState(false);

    const [form, setForm] = useState({
        name: '',
        description: '',
        source: '',
        target: '',
        read_only: false,
        user_mountable: true,
    });
    const [selectedNodeIds, setSelectedNodeIds] = useState<number[]>([]);
    const [selectedSpellIds, setSelectedSpellIds] = useState<number[]>([]);
    const [nodeLinkPickerFilter, setNodeLinkPickerFilter] = useState('');
    const [spellLinkPickerFilter, setSpellLinkPickerFilter] = useState('');

    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

    const filteredNodesForPicker = useMemo(() => {
        const q = nodeLinkPickerFilter.trim().toLowerCase();
        if (!q) {
            return nodes;
        }
        return nodes.filter((n) => n.name.toLowerCase().includes(q) || (n.fqdn && n.fqdn.toLowerCase().includes(q)));
    }, [nodes, nodeLinkPickerFilter]);

    const filteredSpellsForPicker = useMemo(() => {
        const q = spellLinkPickerFilter.trim().toLowerCase();
        if (!q) {
            return spells;
        }
        return spells.filter((s) => s.name.toLowerCase().includes(q));
    }, [spells, spellLinkPickerFilter]);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        const tmr = setTimeout(() => {
            setDebouncedSearch((prev) => {
                if (searchQuery !== prev) {
                    setPagination((p) => ({ ...p, page: 1 }));
                }
                return searchQuery;
            });
        }, 400);
        return () => clearTimeout(tmr);
    }, [searchQuery]);

    const loadMounts = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/mounts', {
                params: {
                    page: pagination.page,
                    limit: pagination.pageSize,
                    search: debouncedSearch || undefined,
                    sort_by: 'name',
                    sort_order: 'ASC',
                },
            });
            if (!data.success) {
                toast.error(data.message || t('admin.mounts.fetch_failed'));
                return;
            }
            const rows = (data.data?.mounts || []) as AdminMount[];
            setMounts(rows);
            const p = data.data?.pagination;
            if (p) {
                setPagination((prev) => ({
                    ...prev,
                    total: p.total_records,
                    totalPages: p.total_pages,
                    hasNext: p.has_next,
                    hasPrev: p.has_prev,
                }));
            }
        } catch (e) {
            console.error(e);
            toast.error(t('admin.mounts.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.pageSize, debouncedSearch, t]);

    useEffect(() => {
        loadMounts();
    }, [loadMounts]);

    const loadLinkOptions = useCallback(async () => {
        setLinksLoading(true);
        try {
            const [n, s] = await Promise.all([fetchAllNodes(), fetchAllSpells()]);
            setNodes(n);
            setSpells(s);
        } catch (e) {
            console.error(e);
            toast.error(t('admin.mounts.fetch_failed'));
        } finally {
            setLinksLoading(false);
        }
    }, [t]);

    const openCreate = () => {
        setMode('create');
        setEditingId(null);
        setNodeLinkPickerFilter('');
        setSpellLinkPickerFilter('');
        setForm({
            name: '',
            description: '',
            source: '',
            target: '',
            read_only: false,
            user_mountable: true,
        });
        setSelectedNodeIds([]);
        setSelectedSpellIds([]);
        setSheetOpen(true);
        void loadLinkOptions();
    };

    const openEdit = (m: AdminMount) => {
        setMode('edit');
        setEditingId(m.id);
        setNodeLinkPickerFilter('');
        setSpellLinkPickerFilter('');
        setForm({
            name: m.name,
            description: m.description || '',
            source: m.source,
            target: m.target,
            read_only: m.read_only,
            user_mountable: m.user_mountable,
        });
        setSelectedNodeIds([...m.node_ids]);
        setSelectedSpellIds([...m.spell_ids]);
        setSheetOpen(true);
        void loadLinkOptions();
    };

    const persistLinks = async (mountId: number): Promise<boolean> => {
        try {
            const { data } = await axios.patch(`/api/admin/mounts/${mountId}/links`, {
                node_ids: selectedNodeIds,
                spell_ids: selectedSpellIds,
            });
            if (!data.success) {
                toast.error(data.message || t('admin.mounts.links_atomic_failed'));
                return false;
            }
            return true;
        } catch (e) {
            if (isAxiosError(e)) {
                const payload = e.response?.data;
                const msg =
                    payload && typeof payload === 'object' && payload !== null && 'message' in payload
                        ? String((payload as { message?: unknown }).message)
                        : '';
                toast.error(msg || t('admin.mounts.links_atomic_failed'));
            } else {
                toast.error(t('admin.mounts.links_atomic_failed'));
            }
            return false;
        }
    };

    const handleSave = async () => {
        const nameTrim = form.name.trim();
        const sourceTrim = form.source.trim();
        const targetTrim = form.target.trim();
        if (!nameTrim || !sourceTrim || !targetTrim) {
            toast.error(t('admin.mounts.form_required'));
            return;
        }

        setSaving(true);
        try {
            if (mode === 'create') {
                const { data } = await axios.put('/api/admin/mounts', {
                    name: nameTrim,
                    description: form.description.trim() || null,
                    source: sourceTrim,
                    target: targetTrim,
                    read_only: form.read_only,
                    user_mountable: form.user_mountable,
                });
                if (!data.success) {
                    toast.error(data.message || t('admin.servers.edit.update_failed'));
                    return;
                }
                const newId = data.data?.mount_id as number | undefined;
                if (!newId) {
                    toast.error(t('admin.servers.edit.update_failed'));
                    return;
                }
                if (!(await persistLinks(newId))) {
                    await axios.delete(`/api/admin/mounts/${newId}`).catch(() => {});
                    await loadMounts();
                    return;
                }
                toast.success(t('admin.mounts.saved'));
                setSheetOpen(false);
                await loadMounts();
                return;
            }

            if (!editingId) return;
            const { data } = await axios.patch(`/api/admin/mounts/${editingId}`, {
                name: nameTrim,
                description: form.description.trim() || null,
                source: sourceTrim,
                target: targetTrim,
                read_only: form.read_only,
                user_mountable: form.user_mountable,
            });
            if (!data.success) {
                toast.error(data.message || t('admin.servers.edit.update_failed'));
                return;
            }
            if (!(await persistLinks(editingId))) {
                return;
            }
            toast.success(t('admin.mounts.saved'));
            setSheetOpen(false);
            await loadMounts();
        } catch (e) {
            if (isAxiosError(e) && e.response?.data?.message) {
                toast.error(String(e.response.data.message));
            } else {
                toast.error(t('admin.servers.edit.update_failed'));
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            const { data } = await axios.delete(`/api/admin/mounts/${id}`);
            if (data.success) {
                toast.success(t('admin.mounts.deleted'));
                setConfirmDeleteId(null);
                await loadMounts();
            } else {
                toast.error(data.message || t('admin.servers.edit.update_failed'));
            }
        } catch (e) {
            if (isAxiosError(e) && e.response?.data?.message) {
                toast.error(String(e.response.data.message));
            } else {
                toast.error(t('admin.servers.edit.update_failed'));
            }
        }
    };

    const toggleNode = (id: number) => {
        setSelectedNodeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const toggleSpell = (id: number) => {
        setSelectedSpellIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-mounts', 'top-of-page')} />

            <PageHeader
                title={t('admin.mounts.title')}
                description={t('admin.mounts.description')}
                icon={HardDrive}
                actions={
                    <div className='flex gap-2'>
                        <Button variant='outline' size='sm' onClick={() => loadMounts()} disabled={loading}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            {t('navigation.items.refresh')}
                        </Button>
                        <Button size='sm' onClick={openCreate}>
                            <Plus className='h-4 w-4 mr-2' />
                            {t('admin.mounts.create')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-mounts', 'after-header')} />

            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/40 backdrop-blur-md p-4 rounded-2xl shadow-sm'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                    <Input
                        placeholder={t('admin.mounts.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='pl-10 h-11 w-full'
                    />
                </div>
            </div>

            {pagination.totalPages > 1 && !loading && (
                <div className='flex items-center justify-between gap-4 py-3 px-4 rounded-xl border border-border bg-card/50'>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={!pagination.hasPrev}
                        onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                    >
                        <ChevronLeft className='h-4 w-4 mr-1' />
                        {t('common.previous')}
                    </Button>
                    <span className='text-sm'>
                        {pagination.page} / {pagination.totalPages}
                    </span>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={!pagination.hasNext}
                        onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                    >
                        {t('common.next')}
                        <ChevronRight className='h-4 w-4 ml-1' />
                    </Button>
                </div>
            )}

            {loading ? (
                <TableSkeleton count={5} />
            ) : mounts.length === 0 ? (
                <EmptyState
                    icon={HardDrive}
                    title={t('admin.mounts.no_results')}
                    description={t('admin.mounts.description')}
                    action={
                        <Button onClick={openCreate}>
                            <Plus className='h-4 w-4 mr-2' />
                            {t('admin.mounts.create')}
                        </Button>
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    {mounts.map((m) => {
                        const nodeTag =
                            m.node_ids.length === 0
                                ? `${t('admin.mounts.columns.nodes')}: *`
                                : `${t('admin.mounts.columns.nodes')}: ${m.node_ids.length}`;
                        const spellTag =
                            m.spell_ids.length === 0
                                ? `${t('admin.mounts.columns.spells')}: *`
                                : `${t('admin.mounts.columns.spells')}: ${m.spell_ids.length}`;
                        const badges: ResourceBadge[] = [
                            {
                                label: m.read_only ? t('admin.mounts.read_only') : t('admin.mounts.read_write'),
                                className: m.read_only
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                            },
                            { label: nodeTag, className: 'bg-muted text-muted-foreground' },
                            { label: spellTag, className: 'bg-muted text-muted-foreground' },
                        ];
                        if (!m.user_mountable) {
                            badges.push({
                                label: t('admin.mounts.admin_only'),
                                className: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20',
                            });
                        }
                        return (
                            <ResourceCard
                                key={m.id}
                                title={m.name}
                                subtitle={`${m.source} → ${m.target}`}
                                icon={HardDrive}
                                badges={badges}
                                description={
                                    m.description ? (
                                        <p className='text-sm text-muted-foreground mt-1 line-clamp-2'>
                                            {m.description}
                                        </p>
                                    ) : undefined
                                }
                                actions={
                                    <div className='flex items-center gap-2'>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            onClick={() => openEdit(m)}
                                            title={t('common.edit')}
                                            aria-label={t('common.edit')}
                                        >
                                            <Pencil className='h-4 w-4' />
                                        </Button>
                                        {confirmDeleteId === m.id ? (
                                            <>
                                                <Button
                                                    size='sm'
                                                    variant='destructive'
                                                    onClick={() => void handleDelete(m.id)}
                                                >
                                                    {t('common.delete')}
                                                </Button>
                                                <Button
                                                    size='sm'
                                                    variant='outline'
                                                    onClick={() => setConfirmDeleteId(null)}
                                                >
                                                    {t('common.cancel')}
                                                </Button>
                                            </>
                                        ) : (
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                className='text-destructive'
                                                onClick={() => setConfirmDeleteId(m.id)}
                                                title={t('common.delete')}
                                                aria-label={t('common.delete')}
                                            >
                                                <Trash2 className='h-4 w-4' />
                                            </Button>
                                        )}
                                    </div>
                                }
                            />
                        );
                    })}
                </div>
            )}

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent className='sm:max-w-lg overflow-y-auto'>
                    <SheetHeader>
                        <SheetTitle>
                            {mode === 'create'
                                ? t('admin.mounts.drawer_create_title')
                                : t('admin.mounts.drawer_edit_title')}
                        </SheetTitle>
                        <SheetDescription>{t('admin.mounts.links.hint')}</SheetDescription>
                    </SheetHeader>

                    <div className='mt-6 space-y-5'>
                        <div className='space-y-2'>
                            <Label>{t('admin.mounts.form.name')}</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                className='bg-muted/30'
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.mounts.form.source')}</Label>
                            <Input
                                value={form.source}
                                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                                className='bg-muted/30 font-mono text-sm'
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.mounts.form.target')}</Label>
                            <Input
                                value={form.target}
                                onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                                className='bg-muted/30 font-mono text-sm'
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.mounts.form.description')}</Label>
                            <Textarea
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                className='bg-muted/30 min-h-[80px]'
                            />
                        </div>
                        <div className='flex items-center justify-between gap-4'>
                            <div>
                                <Label>{t('admin.mounts.form.read_only')}</Label>
                                <p className='text-xs text-muted-foreground'>{t('admin.mounts.columns.read_only')}</p>
                            </div>
                            <Switch
                                checked={form.read_only}
                                onCheckedChange={(v) => setForm((f) => ({ ...f, read_only: v }))}
                            />
                        </div>
                        <div className='flex items-start justify-between gap-4'>
                            <div className='space-y-1 pr-2'>
                                <Label>{t('admin.mounts.form.user_mountable')}</Label>
                                <p className='text-xs text-muted-foreground'>
                                    {t('admin.mounts.form.user_mountable_help')}
                                </p>
                            </div>
                            <Switch
                                className='shrink-0 mt-1'
                                checked={form.user_mountable}
                                onCheckedChange={(v) => setForm((f) => ({ ...f, user_mountable: v }))}
                            />
                        </div>

                        <PageCard title={t('admin.mounts.links.nodes')} description={t('admin.mounts.links.hint')}>
                            {linksLoading ? (
                                <p className='text-sm text-muted-foreground'>
                                    {t('admin.servers.edit.mounts.loading')}
                                </p>
                            ) : (
                                <div className='space-y-2'>
                                    <Input
                                        value={nodeLinkPickerFilter}
                                        onChange={(e) => setNodeLinkPickerFilter(e.target.value)}
                                        placeholder={t('admin.mounts.links_nodes_filter_placeholder')}
                                        className='bg-muted/30'
                                    />
                                    <div className='max-h-48 overflow-y-auto space-y-2 pr-1'>
                                        {filteredNodesForPicker.map((n) => (
                                            <label
                                                key={n.id}
                                                className='flex items-center gap-3 cursor-pointer rounded-lg border border-border/60 p-2'
                                            >
                                                <Checkbox
                                                    checked={selectedNodeIds.includes(n.id)}
                                                    onCheckedChange={() => toggleNode(n.id)}
                                                />
                                                <span className='text-sm'>
                                                    <span className='font-medium'>{n.name}</span>
                                                    <span className='text-muted-foreground block text-xs'>
                                                        {n.fqdn}
                                                    </span>
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </PageCard>

                        <PageCard title={t('admin.mounts.links.spells')}>
                            {linksLoading ? (
                                <p className='text-sm text-muted-foreground'>
                                    {t('admin.servers.edit.mounts.loading')}
                                </p>
                            ) : (
                                <div className='space-y-2'>
                                    <Input
                                        value={spellLinkPickerFilter}
                                        onChange={(e) => setSpellLinkPickerFilter(e.target.value)}
                                        placeholder={t('admin.mounts.links_spells_filter_placeholder')}
                                        className='bg-muted/30'
                                    />
                                    <div className='max-h-48 overflow-y-auto space-y-2 pr-1'>
                                        {filteredSpellsForPicker.map((s) => (
                                            <label
                                                key={s.id}
                                                className='flex items-center gap-3 cursor-pointer rounded-lg border border-border/60 p-2'
                                            >
                                                <Checkbox
                                                    checked={selectedSpellIds.includes(s.id)}
                                                    onCheckedChange={() => toggleSpell(s.id)}
                                                />
                                                <span className='text-sm font-medium'>{s.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </PageCard>
                    </div>

                    <SheetFooter className='mt-8 gap-2 sm:gap-0'>
                        <Button variant='outline' onClick={() => setSheetOpen(false)} disabled={saving}>
                            {t('common.cancel')}
                        </Button>
                        <Button onClick={() => void handleSave()} loading={saving}>
                            {t('common.save')}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
}
