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
    node_name?: string | null;
    database_type: string;
    database_port: number;
    database_username: string;
    database_password?: string;
    database_host: string;
    database_subdomain?: string | null;
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

    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);

    const [selectedDatabase, setSelectedDatabase] = useState<Database | null>(null);
    const [editingDatabase, setEditingDatabase] = useState<Database | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        database_type: 'mysql',
        database_host: 'localhost',
        database_subdomain: '',
        database_port: 3306,
        database_username: '',
        database_password: '',
    });

    /** all = any server node; single = restrict to one Wings node */
    const [hostScope, setHostScope] = useState<'all' | 'single'>('all');
    const [scopeNodeId, setScopeNodeId] = useState('');
    const [adminNodes, setAdminNodes] = useState<Node[]>([]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== debouncedSearchQuery) {
                setPagination((p) => ({ ...p, page: 1 }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearchQuery]);

    useEffect(() => {
        let cancelled = false;
        const loadNodes = async () => {
            try {
                const { data } = await axios.get('/api/admin/nodes', { params: { page: 1, limit: 500 } });
                const raw = data?.data?.nodes ?? [];
                if (!cancelled) {
                    setAdminNodes(
                        raw.map((n: { id: number; name: string }) => ({
                            id: n.id,
                            name: n.name,
                        })),
                    );
                }
            } catch {
                if (!cancelled) {
                    setAdminNodes([]);
                }
            }
        };
        void loadNodes();
        return () => {
            cancelled = true;
        };
    }, []);

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
                    limit: 1000,
                },
            });

            let allDbs = data.data.databases || [];

            if (nodeId) {
                allDbs = allDbs.filter((db: Database) => db.node_id == null || Number(db.node_id) === Number(nodeId));
            }

            const filteredDbs = allDbs.filter(
                (db: Database) =>
                    db.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                    db.database_host.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                    (db.database_subdomain || '').toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
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

    useEffect(() => {
        if (createOpen) {
            setHostScope(nodeId ? 'single' : 'all');
            setScopeNodeId('');
        }
    }, [createOpen, nodeId]);

    const resolvePayloadNodeId = useCallback((): number | null | 'invalid' => {
        if (hostScope === 'all') return null;
        if (nodeId) return nodeId;
        const id = parseInt(scopeNodeId, 10);
        if (!id || id < 1) return 'invalid';
        return id;
    }, [hostScope, nodeId, scopeNodeId]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const payloadNodeId = resolvePayloadNodeId();
        if (payloadNodeId === 'invalid') {
            toast.error(t('admin.node_databases.messages.node_required'));
            return;
        }
        setIsSubmitting(true);
        try {
            await axios.put('/api/admin/databases', {
                ...formData,
                node_id: payloadNodeId,
            });
            toast.success(t('admin.node_databases.messages.created'));
            setCreateOpen(false);
            setFormData({
                name: '',
                database_type: 'mysql',
                database_host: 'localhost',
                database_subdomain: '',
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
        const payloadNodeId = resolvePayloadNodeId();
        if (payloadNodeId === 'invalid') {
            toast.error(t('admin.node_databases.messages.node_required'));
            return;
        }
        setIsSubmitting(true);
        try {
            const { database_password: pwd, ...restForm } = formData;
            const patchBody: Record<string, unknown> = {
                ...restForm,
                node_id: payloadNodeId,
            };
            if (pwd.trim() !== '') {
                patchBody.database_password = pwd;
            }
            await axios.patch(`/api/admin/databases/${editingDatabase.id}`, patchBody);
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

    const widgetContext = nodeId ? { nodeId } : undefined;

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets(slug, 'top-of-page')} context={widgetContext} />
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
                        <Plus className='mr-2 h-4 w-4' />
                        {t('admin.node_databases.create')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets(slug, 'after-header')} context={widgetContext} />

            <div className='bg-card/40 flex flex-col items-center gap-4 rounded-2xl p-4 shadow-sm backdrop-blur-md sm:flex-row'>
                <div className='group relative w-full flex-1'>
                    <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                    <Input
                        placeholder={t('admin.node_databases.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='h-11 w-full pl-10'
                    />
                </div>
            </div>

            {pagination.totalPages > 1 && !loading && (
                <div className='border-border bg-card/50 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={!pagination.hasPrev}
                        onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                        className='gap-1.5'
                    >
                        <ChevronLeft className='h-4 w-4' />
                        {t('common.previous')}
                    </Button>
                    <span className='text-sm font-medium'>
                        {pagination.page} / {pagination.totalPages}
                    </span>
                    <Button
                        variant='outline'
                        size='sm'
                        disabled={!pagination.hasNext}
                        onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                        className='gap-1.5'
                    >
                        {t('common.next')}
                        <ChevronRight className='h-4 w-4' />
                    </Button>
                </div>
            )}

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
                    <WidgetRenderer widgets={getWidgets(slug, 'before-list')} context={widgetContext} />
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
                                ...(db.node_id == null
                                    ? [
                                          {
                                              label: t('admin.node_databases.status.all_nodes'),
                                              className: 'bg-slate-500/10 text-slate-300 border-slate-500/25',
                                          },
                                      ]
                                    : [
                                          {
                                              label: t('admin.node_databases.status.node_label', {
                                                  name: db.node_name || `#${db.node_id}`,
                                              }),
                                              className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
                                          },
                                      ]),
                            ]}
                            description={
                                <div className='text-muted-foreground mt-2 flex flex-col gap-1 font-mono text-sm'>
                                    <div className='flex items-center gap-2 truncate'>
                                        <Server className='h-3 w-3 shrink-0 opacity-50' />
                                        {db.database_subdomain || db.database_host}:{db.database_port}
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
                                            setHostScope(db.node_id == null ? 'all' : 'single');
                                            setScopeNodeId(db.node_id != null ? String(db.node_id) : '');
                                            setFormData({
                                                name: db.name,
                                                database_type: db.database_type,
                                                database_host: db.database_host,
                                                database_subdomain: db.database_subdomain || '',
                                                database_port: db.database_port,
                                                database_username: db.database_username,
                                                database_password: '',
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
                <div className='mt-8 flex items-center justify-center gap-2'>
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
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.node_databases.help.about_databases.description')}
                    </p>
                </PageCard>
            </div>

            <WidgetRenderer widgets={getWidgets(slug, 'bottom-of-page')} context={widgetContext} />

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
                            <p className='text-muted-foreground text-xs'>{t('admin.node_databases.form.host_help')}</p>
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.node_databases.form.database_subdomain')}</Label>
                            <Input
                                value={formData.database_subdomain}
                                onChange={(e) => setFormData({ ...formData, database_subdomain: e.target.value })}
                                placeholder={t('admin.node_databases.form.database_subdomain_placeholder')}
                            />
                            <p className='text-muted-foreground text-xs'>
                                {t('admin.node_databases.form.database_subdomain_help')}
                            </p>
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
                            <p className='text-muted-foreground text-xs'>{t('admin.node_databases.form.port_help')}</p>
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
                        <div className='space-y-2'>
                            <Label>{t('admin.node_databases.form.node_assignment')}</Label>
                            <Select
                                value={hostScope}
                                onChange={(e) => {
                                    const v = e.target.value as 'all' | 'single';
                                    setHostScope(v);
                                    if (v === 'all') setScopeNodeId('');
                                }}
                            >
                                {nodeId ? (
                                    <>
                                        <option value='single'>
                                            {t('admin.node_databases.form.node_assignment_this_only', {
                                                node: node?.name ?? '…',
                                            })}
                                        </option>
                                        <option value='all'>
                                            {t('admin.node_databases.form.node_assignment_all_nodes')}
                                        </option>
                                    </>
                                ) : (
                                    <>
                                        <option value='all'>
                                            {t('admin.node_databases.form.node_assignment_all_nodes')}
                                        </option>
                                        <option value='single'>
                                            {t('admin.node_databases.form.node_assignment_one_node')}
                                        </option>
                                    </>
                                )}
                            </Select>
                            <p className='text-muted-foreground text-xs'>
                                {t('admin.node_databases.form.node_assignment_help')}
                            </p>
                            {!nodeId && hostScope === 'single' && (
                                <Select value={scopeNodeId} onChange={(e) => setScopeNodeId(e.target.value)}>
                                    <option value=''>{t('admin.node_databases.form.select_node')}</option>
                                    {adminNodes.map((n) => (
                                        <option key={n.id} value={String(n.id)}>
                                            {n.name}
                                        </option>
                                    ))}
                                </Select>
                            )}
                        </div>
                        <SheetFooter>
                            <Button type='submit' loading={isSubmitting}>
                                {t('admin.node_databases.form.submit_create')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>

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
                                <Label>{t('admin.node_databases.form.database_subdomain')}</Label>
                                <Input
                                    value={formData.database_subdomain}
                                    onChange={(e) => setFormData({ ...formData, database_subdomain: e.target.value })}
                                    placeholder={t('admin.node_databases.form.database_subdomain_placeholder')}
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
                                    autoComplete='new-password'
                                />
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.node_databases.form.password_edit_hint')}
                                </p>
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.node_databases.form.node_assignment')}</Label>
                                <Select
                                    value={hostScope}
                                    onChange={(e) => {
                                        const v = e.target.value as 'all' | 'single';
                                        setHostScope(v);
                                        if (v === 'all') setScopeNodeId('');
                                    }}
                                >
                                    {nodeId ? (
                                        <>
                                            <option value='single'>
                                                {t('admin.node_databases.form.node_assignment_this_only', {
                                                    node: node?.name ?? '…',
                                                })}
                                            </option>
                                            <option value='all'>
                                                {t('admin.node_databases.form.node_assignment_all_nodes')}
                                            </option>
                                        </>
                                    ) : (
                                        <>
                                            <option value='all'>
                                                {t('admin.node_databases.form.node_assignment_all_nodes')}
                                            </option>
                                            <option value='single'>
                                                {t('admin.node_databases.form.node_assignment_one_node')}
                                            </option>
                                        </>
                                    )}
                                </Select>
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.node_databases.form.node_assignment_help')}
                                </p>
                                {!nodeId && hostScope === 'single' && (
                                    <Select value={scopeNodeId} onChange={(e) => setScopeNodeId(e.target.value)}>
                                        <option value=''>{t('admin.node_databases.form.select_node')}</option>
                                        {adminNodes.map((n) => (
                                            <option key={n.id} value={String(n.id)}>
                                                {n.name}
                                            </option>
                                        ))}
                                    </Select>
                                )}
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

            <Sheet open={viewOpen} onOpenChange={setViewOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.node_databases.form.view_title')}</SheetTitle>
                    </SheetHeader>
                    {selectedDatabase && (
                        <div className='space-y-6 text-left'>
                            <div className='grid grid-cols-2 gap-4'>
                                <div className='space-y-1'>
                                    <Label className='text-muted-foreground text-xs uppercase'>
                                        {t('admin.node_databases.form.name')}
                                    </Label>
                                    <div className='font-medium'>{selectedDatabase.name}</div>
                                </div>
                                <div className='space-y-1'>
                                    <Label className='text-muted-foreground text-xs uppercase'>
                                        {t('admin.node_databases.form.type')}
                                    </Label>
                                    <div className='font-medium'>{selectedDatabase.database_type.toUpperCase()}</div>
                                </div>
                            </div>
                            <div className='space-y-1'>
                                <Label className='text-muted-foreground text-xs uppercase'>
                                    {t('admin.node_databases.form.host')}
                                </Label>
                                <div className='font-mono text-sm'>
                                    {selectedDatabase.database_host}:{selectedDatabase.database_port}
                                </div>
                            </div>
                            <div className='space-y-1'>
                                <Label className='text-muted-foreground text-xs uppercase'>
                                    {t('admin.node_databases.form.database_subdomain')}
                                </Label>
                                <div className='font-mono text-sm'>
                                    {selectedDatabase.database_subdomain || t('common.nA')}
                                </div>
                            </div>
                            <div className='space-y-1'>
                                <Label className='text-muted-foreground text-xs uppercase'>
                                    {t('admin.node_databases.form.username')}
                                </Label>
                                <div className='font-mono text-sm'>{selectedDatabase.database_username}</div>
                            </div>
                            <div className='space-y-1'>
                                <Label className='text-muted-foreground text-xs uppercase'>
                                    {t('admin.node_databases.form.node_assignment')}
                                </Label>
                                <div className='text-sm'>
                                    {selectedDatabase.node_id == null
                                        ? t('admin.node_databases.status.all_nodes')
                                        : t('admin.node_databases.status.node_label', {
                                              name: selectedDatabase.node_name || `#${selectedDatabase.node_id}`,
                                          })}
                                </div>
                            </div>
                            <div className='grid grid-cols-2 gap-4'>
                                <div className='space-y-1'>
                                    <Label className='text-muted-foreground text-xs uppercase'>
                                        {t('admin.node_databases.table.created')}
                                    </Label>
                                    <div className='text-muted-foreground text-sm'>
                                        {new Date(selectedDatabase.created_at).toLocaleString()}
                                    </div>
                                </div>
                                <div className='space-y-1'>
                                    <Label className='text-muted-foreground text-xs uppercase'>Updated</Label>
                                    <div className='text-muted-foreground text-sm'>
                                        {new Date(selectedDatabase.updated_at).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Sheet>
        </div>
    );
}
