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

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { Flag, Plus, Pencil, Trash2, Search, Zap, Palette, AlertTriangle } from 'lucide-react';
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
}

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
    const [refreshKey, setRefreshKey] = useState(0);

    const [form, setForm] = useState({
        name: '',
        color: '#5B8DEF',
    });

    useEffect(() => {
        const fetchPriorities = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/admin/tickets/priorities');
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

    const filteredPriorities = priorities.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.put('/api/admin/tickets/priorities', form);
            toast.success(t('admin.tickets.priorities.create_success') || t('common.success'));
            setCreateOpen(false);
            setForm({ name: '', color: '#5B8DEF' });
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
            await axios.patch(`/api/admin/tickets/priorities/${editingPriority.id}`, form);
            toast.success(t('admin.tickets.priorities.update_success') || t('common.success'));
            setEditOpen(false);
            setEditingPriority(null);
            setForm({ name: '', color: '#5B8DEF' });
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

    const openEdit = (priority: Priority) => {
        setEditingPriority(priority);
        setForm({
            name: priority.name,
            color: priority.color,
        });
        setEditOpen(true);
    };

    const resetForm = () => {
        setForm({ name: '', color: '#5B8DEF' });
        setEditingPriority(null);
    };

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
                        {filteredPriorities.map((priority) => (
                            <ResourceCard
                                key={priority.id}
                                icon={Flag}
                                title={priority.name}
                                subtitle={priority.color}
                                iconClassName='text-primary'
                                style={{ borderLeft: `4px solid ${priority.color}` }}
                                actions={
                                    <div className='flex items-center gap-2'>
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
                            <div className='space-y-2'>
                                <Label htmlFor='create-name'>{t('admin.tickets.priorities.form.name')}</Label>
                                <Input
                                    id='create-name'
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor='create-color'>{t('admin.tickets.priorities.form.color')}</Label>
                                <div className='flex gap-2'>
                                    <Input
                                        type='color'
                                        id='create-color'
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
                                <div className='space-y-2'>
                                    <Label htmlFor='edit-name'>{t('admin.tickets.priorities.form.name')}</Label>
                                    <Input
                                        id='edit-name'
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className='space-y-2'>
                                    <Label htmlFor='edit-color'>{t('admin.tickets.priorities.form.color')}</Label>
                                    <div className='flex gap-2'>
                                        <Input
                                            type='color'
                                            id='edit-color'
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
