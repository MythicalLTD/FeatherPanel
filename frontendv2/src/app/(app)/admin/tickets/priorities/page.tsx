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

import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { Flag, Plus, Pencil, Trash2, Search, Zap, Palette, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import { PageHeader } from '@/components/featherui/PageHeader';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { EmptyState } from '@/components/featherui/EmptyState';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

interface Priority {
    id: number;
    name: string;
    color: string;
    sort_order: number;
}

type PriorityForm = {
    name: string;
    color: string;
    sort_order: string;
};

const EMPTY_FORM: PriorityForm = {
    name: '',
    color: '#5B8DEF',
    sort_order: '',
};

export default function TicketPrioritiesPage() {
    const { t } = useTranslation();
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-tickets-priorities');
    const [priorities, setPriorities] = useState<Priority[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editingPriority, setEditingPriority] = useState<Priority | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reorderingId, setReorderingId] = useState<number | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const [form, setForm] = useState<PriorityForm>(EMPTY_FORM);

    useEffect(() => {
        const fetchPriorities = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/admin/tickets/priorities', {
                    params: { limit: 100, page: 1 },
                });
                setPriorities(data.data.priorities || []);
            } catch (error) {
                console.error('Error fetching priorities:', error);
                toast.error(t('admin.tickets.messages.fetch_failed'));
            } finally {
                setLoading(false);
            }
        };
        fetchPriorities();
    }, [refreshKey, t]);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const sortedPriorities = useMemo(
        () => [...priorities].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
        [priorities],
    );

    const filteredPriorities = sortedPriorities.filter((priority) =>
        priority.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const nextSortOrder = useMemo(() => {
        if (sortedPriorities.length === 0) return 10;
        return Math.max(...sortedPriorities.map((priority) => priority.sort_order ?? 0)) + 10;
    }, [sortedPriorities]);

    const buildPayload = () => ({
        name: form.name,
        color: form.color,
        sort_order: form.sort_order.trim() === '' ? nextSortOrder : Number(form.sort_order),
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.put('/api/admin/tickets/priorities', buildPayload());
            toast.success(t('admin.tickets.priorities.create_success') || t('common.success'));
            setCreateOpen(false);
            resetForm();
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error creating priority:', error);
            toast.error(t('admin.tickets.priorities.create_error') || t('common.error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPriority) return;

        setIsSubmitting(true);
        try {
            await axios.patch(`/api/admin/tickets/priorities/${editingPriority.id}`, buildPayload());
            toast.success(t('admin.tickets.priorities.update_success') || t('common.success'));
            setEditOpen(false);
            resetForm();
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error updating priority:', error);
            toast.error(t('admin.tickets.priorities.update_error') || t('common.error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('admin.tickets.priorities.delete_confirm') || t('admin.tickets.messages.delete_confirm')))
            return;

        try {
            await axios.delete(`/api/admin/tickets/priorities/${id}`);
            toast.success(t('admin.tickets.priorities.delete_success') || t('common.success'));
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error deleting priority:', error);
            toast.error(t('admin.tickets.priorities.delete_error') || t('common.error'));
        }
    };

    const handleMove = async (priority: Priority, direction: -1 | 1) => {
        const ordered = [...sortedPriorities];
        const index = ordered.findIndex((item) => item.id === priority.id);
        const swapIndex = index + direction;
        if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) return;

        const current = ordered[index];
        const neighbor = ordered[swapIndex];

        setReorderingId(priority.id);
        try {
            await Promise.all([
                axios.patch(`/api/admin/tickets/priorities/${current.id}`, { sort_order: neighbor.sort_order }),
                axios.patch(`/api/admin/tickets/priorities/${neighbor.id}`, { sort_order: current.sort_order }),
            ]);
            toast.success(t('admin.tickets.priorities.reorderSuccess'));
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error reordering priorities:', error);
            toast.error(t('admin.tickets.priorities.reorderError'));
        } finally {
            setReorderingId(null);
        }
    };

    const openEdit = (priority: Priority) => {
        setEditingPriority(priority);
        setForm({
            name: priority.name,
            color: priority.color,
            sort_order: String(priority.sort_order ?? 0),
        });
        setEditOpen(true);
    };

    const resetForm = () => {
        setForm({ ...EMPTY_FORM, sort_order: String(nextSortOrder) });
        setEditingPriority(null);
    };

    const renderPriorityFormFields = (idPrefix: 'create' | 'edit') => (
        <>
            <div className='space-y-2'>
                <Label htmlFor={`${idPrefix}-name`}>{t('admin.tickets.priorities.form.name')}</Label>
                <Input
                    id={`${idPrefix}-name`}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                />
            </div>

            <div className='space-y-2'>
                <Label htmlFor={`${idPrefix}-sort-order`}>{t('admin.tickets.priorities.form.sortOrder')}</Label>
                <Input
                    id={`${idPrefix}-sort-order`}
                    type='number'
                    min={0}
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                    placeholder={String(nextSortOrder)}
                />
                <p className='text-muted-foreground text-xs'>
                    {t('admin.tickets.priorities.form.sortOrderDescription')}
                </p>
            </div>

            <div className='space-y-2'>
                <Label htmlFor={`${idPrefix}-color`}>{t('admin.tickets.priorities.form.color')}</Label>
                <div className='flex gap-2'>
                    <Input
                        type='color'
                        id={`${idPrefix}-color`}
                        value={form.color}
                        onChange={(e) => setForm({ ...form, color: e.target.value })}
                        className='h-11 w-12 p-1'
                    />
                    <Input
                        value={form.color}
                        onChange={(e) => setForm({ ...form, color: e.target.value })}
                        className='flex-1'
                    />
                </div>
            </div>
        </>
    );

    return (
        <>
            <WidgetRenderer widgets={getWidgets('admin-tickets-priorities', 'top-of-page')} />
            <div className='space-y-6'>
                <PageHeader
                    title={t('admin.tickets.priorities.title')}
                    description={t('admin.tickets.priorities.subtitle')}
                    icon={Flag}
                    actions={
                        <Button
                            onClick={() => {
                                resetForm();
                                setCreateOpen(true);
                            }}
                        >
                            <Plus className='mr-2 h-4 w-4' />
                            {t('admin.tickets.priorities.create')}
                        </Button>
                    }
                />

                <div className='bg-card/40 flex flex-col items-center gap-4 rounded-2xl p-4 shadow-sm backdrop-blur-md sm:flex-row'>
                    <div className='group relative w-full flex-1'>
                        <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                        <Input
                            placeholder={t('admin.tickets.search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className='h-11 w-full pl-10'
                        />
                    </div>
                </div>

                {loading ? (
                    <TableSkeleton count={3} />
                ) : filteredPriorities.length === 0 ? (
                    <EmptyState
                        icon={Flag}
                        title={t('admin.tickets.priorities.no_results') || t('admin.tickets.no_results')}
                        description={
                            t('admin.tickets.priorities.search_placeholder') || t('admin.tickets.search_placeholder')
                        }
                        action={
                            <Button
                                onClick={() => {
                                    resetForm();
                                    setCreateOpen(true);
                                }}
                            >
                                {t('admin.tickets.priorities.create')}
                            </Button>
                        }
                    />
                ) : (
                    <div className='grid grid-cols-1 gap-4'>
                        {filteredPriorities.map((priority, index) => (
                            <ResourceCard
                                key={priority.id}
                                icon={Flag}
                                title={priority.name}
                                subtitle={t('admin.tickets.priorities.levelLabel').replace(
                                    '{level}',
                                    String(priority.sort_order),
                                )}
                                iconClassName='text-primary'
                                style={{ borderLeft: `4px solid ${priority.color}` }}
                                description={<span className='text-muted-foreground text-sm'>{priority.color}</span>}
                                actions={
                                    <div className='flex items-center gap-2'>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            type='button'
                                            aria-label={t('admin.tickets.priorities.moveUp')}
                                            disabled={reorderingId !== null || index === 0}
                                            onClick={() => void handleMove(priority, -1)}
                                        >
                                            <ChevronUp className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            type='button'
                                            aria-label={t('admin.tickets.priorities.moveDown')}
                                            disabled={reorderingId !== null || index === filteredPriorities.length - 1}
                                            onClick={() => void handleMove(priority, 1)}
                                        >
                                            <ChevronDown className='h-4 w-4' />
                                        </Button>
                                        <Button size='sm' variant='ghost' onClick={() => openEdit(priority)}>
                                            <Pencil className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                            onClick={() => handleDelete(priority.id)}
                                        >
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    </div>
                                }
                            />
                        ))}
                    </div>
                )}

                <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                    <div className='space-y-6'>
                        <SheetHeader>
                            <SheetTitle>{t('admin.tickets.priorities.create')}</SheetTitle>
                            <SheetDescription>{t('admin.tickets.priorities.subtitle')}</SheetDescription>
                        </SheetHeader>
                        <form onSubmit={handleCreate} className='space-y-4'>
                            {renderPriorityFormFields('create')}
                            <SheetFooter>
                                <Button type='submit' loading={isSubmitting}>
                                    {t('common.create')}
                                </Button>
                            </SheetFooter>
                        </form>
                    </div>
                </Sheet>

                <Sheet open={editOpen} onOpenChange={setEditOpen}>
                    <div className='space-y-6'>
                        <SheetHeader>
                            <SheetTitle>{t('admin.tickets.priorities.edit')}</SheetTitle>
                            <SheetDescription>{t('admin.tickets.priorities.subtitle')}</SheetDescription>
                        </SheetHeader>
                        {editingPriority && (
                            <form onSubmit={handleUpdate} className='space-y-4'>
                                {renderPriorityFormFields('edit')}
                                <SheetFooter>
                                    <Button type='submit' loading={isSubmitting}>
                                        {t('common.save')}
                                    </Button>
                                </SheetFooter>
                            </form>
                        )}
                    </div>
                </Sheet>

                <div className='grid grid-cols-1 gap-6 pt-10 md:grid-cols-2 lg:grid-cols-3'>
                    <PageCard title={t('admin.tickets.priorities.help.levels.title')} icon={Zap}>
                        <p className='text-muted-foreground text-sm leading-relaxed'>
                            {t('admin.tickets.priorities.help.levels.description')}
                        </p>
                    </PageCard>
                    <PageCard title={t('admin.tickets.priorities.help.visuals.title')} icon={Palette}>
                        <p className='text-muted-foreground text-sm leading-relaxed'>
                            {t('admin.tickets.priorities.help.visuals.description')}
                        </p>
                    </PageCard>
                    <PageCard
                        title={t('admin.tickets.priorities.help.urgent.title')}
                        icon={AlertTriangle}
                        variant='danger'
                    >
                        <p className='text-muted-foreground text-sm leading-relaxed'>
                            {t('admin.tickets.priorities.help.urgent.description')}
                        </p>
                    </PageCard>
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('admin-tickets-priorities', 'bottom-of-page')} />
        </>
    );
}
