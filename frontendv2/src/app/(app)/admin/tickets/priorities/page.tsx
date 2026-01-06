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

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
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

interface Priority {
    id: number;
    name: string;
    color: string;
}

export default function TicketPrioritiesPage() {
    const { t } = useTranslation();
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

    const filteredPriorities = priorities.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.put('/api/admin/tickets/priorities', form);
            toast.success(t('common.success'));
            setCreateOpen(false);
            setForm({ name: '', color: '#5B8DEF' });
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error creating priority:', error);
            toast.error(t('common.error'));
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
            toast.success(t('common.success'));
            setEditOpen(false);
            setEditingPriority(null);
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error updating priority:', error);
            toast.error(t('common.error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('admin.tickets.messages.delete_confirm'))) return;

        try {
            await axios.delete(`/api/admin/tickets/priorities/${id}`);
            toast.success(t('common.success'));
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error deleting priority:', error);
            toast.error(t('common.error'));
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

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.tickets.priorities.title')}
                description={t('admin.tickets.priorities.subtitle')}
                icon={Flag}
                actions={
                    <Button
                        onClick={() => {
                            setForm({ name: '', color: '#5B8DEF' });
                            setCreateOpen(true);
                        }}
                    >
                        <Plus className='h-4 w-4 mr-2' />
                        {t('admin.tickets.priorities.create')}
                    </Button>
                }
            />

            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/40 backdrop-blur-md p-4 rounded-2xl shadow-sm'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.tickets.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='pl-10 h-11'
                    />
                </div>
            </div>

            {loading ? (
                <TableSkeleton count={3} />
            ) : filteredPriorities.length === 0 ? (
                <EmptyState
                    icon={Flag}
                    title={t('admin.tickets.no_results')}
                    description={t('admin.tickets.search_placeholder')}
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

            <Sheet
                open={createOpen || editOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setCreateOpen(false);
                        setEditOpen(false);
                    }
                }}
            >
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>
                            {editOpen ? t('admin.tickets.priorities.create') : t('admin.tickets.priorities.create')}
                        </SheetTitle>
                        <SheetDescription>{t('admin.tickets.priorities.subtitle')}</SheetDescription>
                    </SheetHeader>

                    <form onSubmit={editOpen ? handleUpdate : handleCreate} className='space-y-4'>
                        <div className='space-y-2'>
                            <Label htmlFor='name'>{t('admin.tickets.priorities.form.name')}</Label>
                            <Input
                                id='name'
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className='space-y-2'>
                            <Label htmlFor='color'>{t('admin.tickets.priorities.form.color')}</Label>
                            <div className='flex gap-2'>
                                <Input
                                    type='color'
                                    value={form.color}
                                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                                    className='w-12 p-1 h-11'
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
                                {editOpen ? t('common.save') : t('common.create')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10'>
                <PageCard title={t('admin.tickets.priorities.help.levels.title')} icon={Zap}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.tickets.priorities.help.levels.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.tickets.priorities.help.visuals.title')} icon={Palette}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.tickets.priorities.help.visuals.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.tickets.priorities.help.urgent.title')} icon={AlertTriangle} variant='danger'>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.tickets.priorities.help.urgent.description')}
                    </p>
                </PageCard>
            </div>
        </div>
    );
}
