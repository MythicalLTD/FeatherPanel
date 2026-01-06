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

import { useState, useEffect, useCallback } from 'react';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select-native';
import { toast } from 'sonner';
import {
    Database as DatabaseIcon,
    Plus,
    Search,
    Eye,
    Pencil,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Activity,
    Server,
} from 'lucide-react';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

interface Database {
    id: number;
    name: string;
    node_id: number | null;
    database_type: string;
    database_port: number;
    database_username: string;
    database_password?: string;
    database_host: string;
    created_at: string;
    updated_at: string;
    healthy?: boolean;
}

interface Node {
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

interface NodeDatabasesProps {
    nodeId?: number;
    slug?: string;
}

export function NodeDatabases({ nodeId, slug = 'admin-databases-nodes' }: NodeDatabasesProps) {
    const { t } = useTranslation();
    const { fetchWidgets, getWidgets } = usePluginWidgets(slug);
    const [loading, setLoading] = useState(true);
    const [databases, setDatabases] = useState<Database[]>([]);
    const [node, setNode] = useState<Node | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    // Pagination
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    // Drawer states
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);

    // Selected items
    const [selectedDatabase, setSelectedDatabase] = useState<Database | null>(null);
    const [editingDatabase, setEditingDatabase] = useState<Database | null>(null);

    // Form states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        database_type: 'mysql',
        database_host: 'localhost',
        database_port: 3306,
        database_username: '',
        database_password: '',
    });

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

    const fetchNode = useCallback(async () => {
        if (!nodeId) return;
        try {
            const { data } = await axios.get(`/api/admin/nodes/${nodeId}`);
            setNode(data.data.node);
        } catch (error) {
            console.error('Error fetching node:', error);
            toast.error(t('admin.node_databases.messages.fetch_node_failed'));
        }
    }, [nodeId, t]);

    const fetchDatabases = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/databases', {
                params: {
                    page: 1,
                    limit: 1000, // Fetch all to filter client-side as in Vue
                },
            });

            let allDbs = data.data.databases || [];

            // Filter by nodeId if provided
            if (nodeId) {
                allDbs = allDbs.filter((db: Database) => db.node_id === nodeId || db.node_id === null);
            }

            // Client side search and pagination
            const filteredDbs = allDbs.filter(
                (db: Database) =>
                    db.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                    db.database_host.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                    db.database_username.toLowerCase().includes(debouncedSearchQuery.toLowerCase()),
            );

            const start = (pagination.page - 1) * pagination.pageSize;
            const end = start + pagination.pageSize;
            const paginatedDbs = filteredDbs.slice(start, end);

            setDatabases(paginatedDbs);
            setPagination((p) => ({
                ...p,
                total: filteredDbs.length,
                totalPages: Math.ceil(filteredDbs.length / p.pageSize),
                hasNext: end < filteredDbs.length,
                hasPrev: start > 0,
            }));
        } catch (error) {
            console.error('Error fetching databases:', error);
            toast.error(t('admin.node_databases.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.pageSize, debouncedSearchQuery, nodeId, t]);

    useEffect(() => {
        fetchNode();
    }, [fetchNode]);

    useEffect(() => {
        fetchDatabases();
        fetchWidgets();
    }, [fetchDatabases, refreshKey, fetchWidgets]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.put('/api/admin/databases', {
                ...formData,
                node_id: nodeId || null,
            });
            toast.success(t('admin.node_databases.messages.created'));
            setCreateOpen(false);
            setFormData({
                name: '',
                database_type: 'mysql',
                database_host: 'localhost',
                database_port: 3306,
                database_username: '',
                database_password: '',
            });
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error creating database:', error);
            let msg = t('admin.node_databases.messages.create_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                msg = error.response.data.message;
            }
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingDatabase) return;
        setIsSubmitting(true);
        try {
            await axios.patch(`/api/admin/databases/${editingDatabase.id}`, {
                ...formData,
                node_id: nodeId || editingDatabase.node_id,
            });
            toast.success(t('admin.node_databases.messages.updated'));
            setEditOpen(false);
            setEditingDatabase(null);
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error updating database:', error);
            let msg = t('admin.node_databases.messages.update_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                msg = error.response.data.message;
            }
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (db: Database) => {
        if (!confirm(t('admin.node_databases.messages.delete_confirm'))) return;
        try {
            await axios.delete(`/api/admin/databases/${db.id}`);
            toast.success(t('admin.node_databases.messages.deleted'));
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error deleting database:', error);
            toast.error(t('admin.node_databases.messages.delete_failed'));
        }
    };

    const handleHealthCheck = useCallback(
        async (db: Database) => {
            try {
                const { data } = await axios.get(`/api/admin/databases/${db.id}/health`);
                if (data.data.healthy) {
                    toast.success(t('admin.node_databases.messages.health_healthy'));
                    setDatabases((prev) => prev.map((d) => (d.id === db.id ? { ...d, healthy: true } : d)));
                } else {
                    toast.error(t('admin.node_databases.messages.health_unhealthy'));
                    setDatabases((prev) => prev.map((d) => (d.id === db.id ? { ...d, healthy: false } : d)));
                }
            } catch (error) {
                console.error('Error checking health:', error);
                toast.error(t('admin.node_databases.messages.health_unhealthy'));
                setDatabases((prev) => prev.map((d) => (d.id === db.id ? { ...d, healthy: false } : d)));
            }
        },
        [t],
    );

    useEffect(() => {
        if (databases.length > 0) {
            databases.forEach((db) => {
                if (db.healthy === undefined) {
                    handleHealthCheck(db);
                }
            });
        }
    }, [databases, handleHealthCheck]);

    const getDefaultPort = (type: string) => {
        switch (type) {
            case 'mysql':
            case 'mariadb':
                return 3306;
            case 'postgresql':
                return 5432;
            default:
                return 3306;
        }
    };

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets(slug, 'top-of-page')} />
            <PageHeader
                title={
                    nodeId && node
                        ? t('admin.node_databases.viewAndManage_node', { node: node.name })
                        : t('admin.node_databases.title')
                }
                description={t('admin.node_databases.description')}
                icon={DatabaseIcon}
                actions={
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className='h-4 w-4 mr-2' />
                        {t('admin.node_databases.create')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets(slug, 'after-header')} />

            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/40 backdrop-blur-md p-4 rounded-2xl shadow-sm'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.node_databases.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='pl-10 h-11 w-full'
                    />
                </div>
            </div>

            {loading ? (
                <TableSkeleton count={5} />
            ) : databases.length === 0 ? (
                <EmptyState
                    icon={DatabaseIcon}
                    title={t('admin.node_databases.no_results')}
                    description={t('admin.node_databases.search_placeholder')}
                    action={<Button onClick={() => setCreateOpen(true)}>{t('admin.node_databases.create')}</Button>}
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    <WidgetRenderer widgets={getWidgets(slug, 'before-list')} />
                    {databases.map((db) => (
                        <ResourceCard
                            key={db.id}
                            title={db.name}
                            subtitle={
                                <div className='flex items-center gap-2 text-xs'>
                                    <Calendar className='h-3 w-3' />
                                    {new Date(db.created_at).toLocaleDateString()}
                                </div>
                            }
                            icon={DatabaseIcon}
                            badges={[
                                {
                                    label:
                                        db.healthy === undefined
                                            ? 'Unknown'
                                            : db.healthy
                                              ? t('admin.node_databases.status.healthy')
                                              : t('admin.node_databases.status.unhealthy'),
                                    className:
                                        db.healthy === undefined
                                            ? 'bg-muted text-muted-foreground'
                                            : db.healthy
                                              ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                              : 'bg-red-500/10 text-red-500 border-red-500/20',
                                },
                                {
                                    label: db.database_type.toUpperCase(),
                                    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                                },
                                ...(db.node_id === null
                                    ? [
                                          {
                                              label: t('admin.node_databases.status.no_node'),
                                              className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
                                          },
                                      ]
                                    : []),
                            ]}
                            description={
                                <div className='flex flex-col gap-1 mt-2 text-sm text-muted-foreground font-mono'>
                                    <div className='flex items-center gap-2 truncate'>
                                        <Server className='h-3 w-3 shrink-0 opacity-50' />
                                        {db.database_host}:{db.database_port}
                                    </div>
                                    <div className='flex items-center gap-2 truncate'>
                                        <Activity className='h-3 w-3 shrink-0 opacity-50' />
                                        {db.database_username}
                                    </div>
                                </div>
                            }
                            actions={
                                <div className='flex items-center gap-2'>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        onClick={() => handleHealthCheck(db)}
                                        title='Check Health'
                                    >
                                        <Activity className='h-4 w-4' />
                                    </Button>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        onClick={() => {
                                            setSelectedDatabase(db);
                                            setViewOpen(true);
                                        }}
                                    >
                                        <Eye className='h-4 w-4' />
                                    </Button>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        onClick={() => {
                                            setEditingDatabase(db);
                                            setFormData({
                                                name: db.name,
                                                database_type: db.database_type,
                                                database_host: db.database_host,
                                                database_port: db.database_port,
                                                database_username: db.database_username,
                                                database_password: '', // Don't populate password
                                            });
                                            setEditOpen(true);
                                        }}
                                    >
                                        <Pencil className='h-4 w-4' />
                                    </Button>
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                        onClick={() => handleDelete(db)}
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

            <div className='pt-6'>
                <PageCard title={t('admin.node_databases.help.about_databases.title')} icon={DatabaseIcon}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.node_databases.help.about_databases.description')}
                    </p>
                </PageCard>
            </div>

            {/* Create Sheet */}
            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.node_databases.form.create_title')}</SheetTitle>
                        <SheetDescription>{t('admin.node_databases.form.create_description')}</SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleCreate} className='space-y-4 text-left'>
                        <div className='space-y-2'>
                            <Label>{t('admin.node_databases.form.name')}</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder={t('admin.node_databases.form.name_placeholder')}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.node_databases.form.type')}</Label>
                            <Select
                                value={formData.database_type}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData({
                                        ...formData,
                                        database_type: val,
                                        database_port: getDefaultPort(val),
                                    });
                                }}
                            >
                                <option value='mysql'>MySQL</option>
                                <option value='mariadb'>MariaDB</option>
                                <option value='postgresql'>PostgreSQL</option>
                            </Select>
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.node_databases.form.host')}</Label>
                            <Input
                                value={formData.database_host}
                                onChange={(e) => setFormData({ ...formData, database_host: e.target.value })}
                                placeholder={t('admin.node_databases.form.host_placeholder')}
                                required
                            />
                            <p className='text-xs text-muted-foreground'>{t('admin.node_databases.form.host_help')}</p>
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.node_databases.form.port')}</Label>
                            <Input
                                type='number'
                                value={formData.database_port}
                                onChange={(e) => setFormData({ ...formData, database_port: parseInt(e.target.value) })}
                                placeholder={t('admin.node_databases.form.port_placeholder')}
                                required
                            />
                            <p className='text-xs text-muted-foreground'>{t('admin.node_databases.form.port_help')}</p>
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.node_databases.form.username')}</Label>
                            <Input
                                value={formData.database_username}
                                onChange={(e) => setFormData({ ...formData, database_username: e.target.value })}
                                placeholder={t('admin.node_databases.form.username_placeholder')}
                                required
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.node_databases.form.password')}</Label>
                            <Input
                                type='password'
                                value={formData.database_password}
                                onChange={(e) => setFormData({ ...formData, database_password: e.target.value })}
                                placeholder={t('admin.node_databases.form.password_placeholder')}
                                required
                            />
                        </div>
                        <SheetFooter>
                            <Button type='submit' loading={isSubmitting}>
                                {t('admin.node_databases.form.submit_create')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>

            {/* Edit Sheet */}
            <Sheet open={editOpen} onOpenChange={setEditOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.node_databases.form.edit_title')}</SheetTitle>
                        <SheetDescription>{t('admin.node_databases.form.edit_description')}</SheetDescription>
                    </SheetHeader>
                    {editingDatabase && (
                        <form onSubmit={handleUpdate} className='space-y-4 text-left'>
                            <div className='space-y-2'>
                                <Label>{t('admin.node_databases.form.name')}</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.node_databases.form.type')}</Label>
                                <Select
                                    value={formData.database_type}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({ ...formData, database_type: val });
                                    }}
                                >
                                    <option value='mysql'>MySQL</option>
                                    <option value='mariadb'>MariaDB</option>
                                    <option value='postgresql'>PostgreSQL</option>
                                </Select>
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.node_databases.form.host')}</Label>
                                <Input
                                    value={formData.database_host}
                                    onChange={(e) => setFormData({ ...formData, database_host: e.target.value })}
                                    required
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.node_databases.form.port')}</Label>
                                <Input
                                    type='number'
                                    value={formData.database_port}
                                    onChange={(e) =>
                                        setFormData({ ...formData, database_port: parseInt(e.target.value) })
                                    }
                                    required
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.node_databases.form.username')}</Label>
                                <Input
                                    value={formData.database_username}
                                    onChange={(e) => setFormData({ ...formData, database_username: e.target.value })}
                                    required
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.node_databases.form.password')}</Label>
                                <Input
                                    type='password'
                                    value={formData.database_password}
                                    onChange={(e) => setFormData({ ...formData, database_password: e.target.value })}
                                    placeholder={t('admin.node_databases.form.password_placeholder')}
                                />
                            </div>
                            <SheetFooter>
                                <Button type='submit' loading={isSubmitting}>
                                    {t('admin.node_databases.form.submit_update')}
                                </Button>
                            </SheetFooter>
                        </form>
                    )}
                </div>
            </Sheet>

            {/* View Sheet */}
            <Sheet open={viewOpen} onOpenChange={setViewOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.node_databases.form.view_title')}</SheetTitle>
                    </SheetHeader>
                    {selectedDatabase && (
                        <div className='space-y-6 text-left'>
                            <div className='grid grid-cols-2 gap-4'>
                                <div className='space-y-1'>
                                    <Label className='text-xs uppercase text-muted-foreground'>
                                        {t('admin.node_databases.form.name')}
                                    </Label>
                                    <div className='font-medium'>{selectedDatabase.name}</div>
                                </div>
                                <div className='space-y-1'>
                                    <Label className='text-xs uppercase text-muted-foreground'>
                                        {t('admin.node_databases.form.type')}
                                    </Label>
                                    <div className='font-medium'>{selectedDatabase.database_type.toUpperCase()}</div>
                                </div>
                            </div>
                            <div className='space-y-1'>
                                <Label className='text-xs uppercase text-muted-foreground'>
                                    {t('admin.node_databases.form.host')}
                                </Label>
                                <div className='font-mono text-sm'>
                                    {selectedDatabase.database_host}:{selectedDatabase.database_port}
                                </div>
                            </div>
                            <div className='space-y-1'>
                                <Label className='text-xs uppercase text-muted-foreground'>
                                    {t('admin.node_databases.form.username')}
                                </Label>
                                <div className='font-mono text-sm'>{selectedDatabase.database_username}</div>
                            </div>
                            <div className='grid grid-cols-2 gap-4'>
                                <div className='space-y-1'>
                                    <Label className='text-xs uppercase text-muted-foreground'>
                                        {t('admin.node_databases.table.created')}
                                    </Label>
                                    <div className='text-sm text-muted-foreground'>
                                        {new Date(selectedDatabase.created_at).toLocaleString()}
                                    </div>
                                </div>
                                <div className='space-y-1'>
                                    <Label className='text-xs uppercase text-muted-foreground'>Updated</Label>
                                    <div className='text-sm text-muted-foreground'>
                                        {new Date(selectedDatabase.updated_at).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Sheet>
            <WidgetRenderer widgets={getWidgets(slug, 'bottom-of-page')} />
        </div>
    );
}
