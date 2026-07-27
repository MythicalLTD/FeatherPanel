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
import {
    Activity,
    Plus,
    Pencil,
    Trash2,
    Search,
    GitBranch,
    Eye,
    Settings2,
    ChevronUp,
    ChevronDown,
} from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

interface Status {
    id: number;
    name: string;
    color: string;
    sort_order: number;
    is_default: number;
}

type StatusForm = {
    name: string;
    color: string;
    sort_order: string;
    is_default: boolean;
};

const EMPTY_FORM: StatusForm = {
    name: '',
    color: '#5B8DEF',
    sort_order: '',
    is_default: false,
};

export default function TicketStatusesPage() {
    const { t } = useTranslation();
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-tickets-statuses');
    const [statuses, setStatuses] = useState<Status[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editingStatus, setEditingStatus] = useState<Status | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reorderingId, setReorderingId] = useState<number | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    const [form, setForm] = useState<StatusForm>(EMPTY_FORM);

    useEffect(() => {
        const fetchStatuses = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/admin/tickets/statuses', {
                    params: { limit: 100, page: 1 },
                });
                setStatuses(data.data.statuses || []);
            } catch (error) {
                console.error('Error fetching statuses:', error);
                toast.error(t('admin.tickets.messages.fetch_failed'));
            } finally {
                setLoading(false);
            }
        };
        fetchStatuses();
    }, [refreshKey, t]);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const sortedStatuses = useMemo(
        () => [...statuses].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
        [statuses],
    );

    const filteredStatuses = sortedStatuses.filter((status) =>
        status.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const nextSortOrder = useMemo(() => {
        if (sortedStatuses.length === 0) return 10;
        return Math.max(...sortedStatuses.map((status) => status.sort_order ?? 0)) + 10;
    }, [sortedStatuses]);

    const buildPayload = () => ({
        name: form.name,
        color: form.color,
        sort_order: form.sort_order.trim() === '' ? nextSortOrder : Number(form.sort_order),
        is_default: form.is_default,
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.put('/api/admin/tickets/statuses', buildPayload());
            toast.success(t('admin.tickets.statuses.create_success') || t('common.success'));
            setCreateOpen(false);
            resetForm();
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error creating status:', error);
            toast.error(t('admin.tickets.statuses.create_error') || t('common.error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStatus) return;

        setIsSubmitting(true);
        try {
            await axios.patch(`/api/admin/tickets/statuses/${editingStatus.id}`, buildPayload());
            toast.success(t('admin.tickets.statuses.update_success') || t('common.success'));
            setEditOpen(false);
            resetForm();
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error(t('admin.tickets.statuses.update_error') || t('common.error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('admin.tickets.statuses.delete_confirm') || t('admin.tickets.messages.delete_confirm'))) return;

        try {
            await axios.delete(`/api/admin/tickets/statuses/${id}`);
            toast.success(t('admin.tickets.statuses.delete_success') || t('common.success'));
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error deleting status:', error);
            toast.error(t('admin.tickets.statuses.delete_error') || t('common.error'));
        }
    };

    const handleMove = async (status: Status, direction: -1 | 1) => {
        const ordered = [...sortedStatuses];
        const index = ordered.findIndex((item) => item.id === status.id);
        const swapIndex = index + direction;
        if (index < 0 || swapIndex < 0 || swapIndex >= ordered.length) return;

        const current = ordered[index];
        const neighbor = ordered[swapIndex];

        setReorderingId(status.id);
        try {
            await Promise.all([
                axios.patch(`/api/admin/tickets/statuses/${current.id}`, { sort_order: neighbor.sort_order }),
                axios.patch(`/api/admin/tickets/statuses/${neighbor.id}`, { sort_order: current.sort_order }),
            ]);
            toast.success(t('admin.tickets.statuses.reorderSuccess'));
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error reordering statuses:', error);
            toast.error(t('admin.tickets.statuses.reorderError'));
        } finally {
            setReorderingId(null);
        }
    };

    const openEdit = (status: Status) => {
        setEditingStatus(status);
        setForm({
            name: status.name,
            color: status.color,
            sort_order: String(status.sort_order ?? 0),
            is_default: status.is_default === 1,
        });
        setEditOpen(true);
    };

    const resetForm = () => {
        setForm({ ...EMPTY_FORM, sort_order: String(nextSortOrder) });
        setEditingStatus(null);
    };

    const renderStatusFormFields = (idPrefix: 'create' | 'edit') => (
        <>
            <div className='space-y-2'>
                <Label htmlFor={`${idPrefix}-name`}>{t('admin.tickets.statuses.form.name')}</Label>
                <Input
                    id={`${idPrefix}-name`}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                />
            </div>

            <div className='space-y-2'>
                <Label htmlFor={`${idPrefix}-sort-order`}>{t('admin.tickets.statuses.form.sortOrder')}</Label>
                <Input
                    id={`${idPrefix}-sort-order`}
                    type='number'
                    min={0}
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                    placeholder={String(nextSortOrder)}
                />
                <p className='text-muted-foreground text-xs'>{t('admin.tickets.statuses.form.sortOrderDescription')}</p>
            </div>

            <div className='space-y-2'>
                <Label htmlFor={`${idPrefix}-color`}>{t('admin.tickets.statuses.form.color')}</Label>
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

            <div className='bg-muted/20 border-border/40 flex items-start gap-3 rounded-xl border p-4'>
                <Checkbox
                    id={`${idPrefix}-is-default`}
                    checked={form.is_default}
                    onCheckedChange={(checked) => setForm({ ...form, is_default: checked === true })}
                />
                <div className='space-y-1'>
                    <Label htmlFor={`${idPrefix}-is-default`} className='cursor-pointer'>
                        {t('admin.tickets.statuses.form.isDefault')}
                    </Label>
                    <p className='text-muted-foreground text-xs'>
                        {t('admin.tickets.statuses.form.isDefaultDescription')}
                    </p>
                </div>
            </div>
        </>
    );

    return (
        <>
            <WidgetRenderer widgets={getWidgets('admin-tickets-statuses', 'top-of-page')} />
            <div className='space-y-6'>
                <PageHeader
                    title={t('admin.tickets.statuses.title')}
                    description={t('admin.tickets.statuses.subtitle')}
                    icon={Activity}
                    actions={
                        <Button
                            onClick={() => {
                                resetForm();
                                setCreateOpen(true);
                            }}
                        >
                            <Plus className='mr-2 h-4 w-4' />
                            {t('admin.tickets.statuses.create')}
                        </Button>
                    }
                />

                <div className='bg-card/40 flex flex-col items-center gap-4 rounded-2xl p-4 shadow-sm backdrop-blur-md sm:flex-row'>
                    <div className='group relative w-full flex-1'>
                        <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                        <Input
                            placeholder={t('admin.tickets.statuses.search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className='h-11 w-full pl-10'
                        />
                    </div>
                </div>

                {loading ? (
                    <TableSkeleton count={3} />
                ) : filteredStatuses.length === 0 ? (
                    <EmptyState
                        icon={Activity}
                        title={t('admin.tickets.statuses.no_results') || t('admin.tickets.no_results')}
                        description={t('admin.tickets.statuses.search_placeholder')}
                        action={
                            <Button
                                onClick={() => {
                                    resetForm();
                                    setCreateOpen(true);
                                }}
                            >
                                {t('admin.tickets.statuses.create')}
                            </Button>
                        }
                    />
                ) : (
                    <div className='grid grid-cols-1 gap-4'>
                        {filteredStatuses.map((status, index) => (
                            <ResourceCard
                                key={status.id}
                                icon={Activity}
                                title={status.name}
                                subtitle={t('admin.tickets.statuses.levelLabel').replace(
                                    '{level}',
                                    String(status.sort_order),
                                )}
                                iconClassName='text-primary'
                                style={{ borderLeft: `4px solid ${status.color}` }}
                                description={
                                    <div className='flex flex-wrap items-center gap-2'>
                                        <span className='text-muted-foreground text-sm'>{status.color}</span>
                                        {status.is_default === 1 ? (
                                            <Badge variant='secondary' className='text-xs'>
                                                {t('admin.tickets.statuses.defaultBadge')}
                                            </Badge>
                                        ) : null}
                                    </div>
                                }
                                actions={
                                    <div className='flex items-center gap-2'>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            type='button'
                                            aria-label={t('admin.tickets.statuses.moveUp')}
                                            disabled={reorderingId !== null || index === 0}
                                            onClick={() => void handleMove(status, -1)}
                                        >
                                            <ChevronUp className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            type='button'
                                            aria-label={t('admin.tickets.statuses.moveDown')}
                                            disabled={reorderingId !== null || index === filteredStatuses.length - 1}
                                            onClick={() => void handleMove(status, 1)}
                                        >
                                            <ChevronDown className='h-4 w-4' />
                                        </Button>
                                        <Button size='sm' variant='ghost' onClick={() => openEdit(status)}>
                                            <Pencil className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant='ghost'
                                            className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                            onClick={() => handleDelete(status.id)}
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
                            <SheetTitle>{t('admin.tickets.statuses.create')}</SheetTitle>
                            <SheetDescription>{t('admin.tickets.statuses.subtitle')}</SheetDescription>
                        </SheetHeader>
                        <form onSubmit={handleCreate} className='space-y-4'>
                            {renderStatusFormFields('create')}

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
                            <SheetTitle>{t('admin.tickets.statuses.edit')}</SheetTitle>
                            <SheetDescription>{t('admin.tickets.statuses.subtitle')}</SheetDescription>
                        </SheetHeader>
                        {editingStatus && (
                            <form onSubmit={handleUpdate} className='space-y-4'>
                                {renderStatusFormFields('edit')}

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
                    <PageCard title={t('admin.tickets.statuses.help.workflow.title')} icon={GitBranch}>
                        <p className='text-muted-foreground text-sm leading-relaxed'>
                            {t('admin.tickets.statuses.help.workflow.description')}
                        </p>
                    </PageCard>
                    <PageCard title={t('admin.tickets.statuses.help.tracking.title')} icon={Eye}>
                        <p className='text-muted-foreground text-sm leading-relaxed'>
                            {t('admin.tickets.statuses.help.tracking.description')}
                        </p>
                    </PageCard>
                    <PageCard title={t('admin.tickets.statuses.help.states.title')} icon={Settings2} variant='danger'>
                        <p className='text-muted-foreground text-sm leading-relaxed'>
                            {t('admin.tickets.statuses.help.states.description')}
                        </p>
                    </PageCard>
                </div>
            </div>
            <WidgetRenderer widgets={getWidgets('admin-tickets-statuses', 'bottom-of-page')} />
        </>
    );
}
