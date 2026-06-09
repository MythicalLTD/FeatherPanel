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

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import axios from 'axios';
import {
    Plus,
    Trash2,
    Loader2,
    Database as DatabaseIcon,
    RefreshCw,
    Search,
    ChevronLeft,
    ChevronRight,
    ShieldAlert,
    MoreVertical,
    ExternalLink,
    Eye,
    Copy,
    User,
    Server as ServerIcon,
    Globe,
    AlertTriangle,
    Download,
    Upload,
    Terminal,
    Play,
    CheckCircle2,
    XCircle,
    Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { appendPmaAuthParams, preparePmaAuthContext, storePmaAuthContext } from '@/lib/pma-auth-context';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { cn, copyToClipboard as copyUtil } from '@/lib/utils';

import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageHeader } from '@/components/featherui/PageHeader';
import { EmptyState } from '@/components/featherui/EmptyState';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { Checkbox } from '@/components/ui/checkbox';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { Dialog, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Database, DatabaseHost, DatabasesResponse, Server } from '@/types/server';

export default function ServerDatabasesPage() {
    const { t, locale } = useTranslation();
    const { settings } = useSettings();
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const uuidShort = params.uuidShort as string;

    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort);
    const canRead = hasPermission('database.read');
    const canCreate = hasPermission('database.create');
    const canDelete = hasPermission('database.delete');
    const canViewPassword = hasPermission('database.view_password');

    const [databases, setDatabases] = useState<Database[]>([]);
    const [availableHosts, setAvailableHosts] = useState<DatabaseHost[]>([]);
    const [loading, setLoading] = useState(true);
    const [server, setServer] = useState<Server | null>(null);

    const { fetchWidgets, getWidgets } = usePluginWidgets('server-databases');
    const [searchQuery, setSearchQuery] = useState('');
    const [phpMyAdminInstalled, setPhpMyAdminInstalled] = useState(false);

    const [pagination, setPagination] = useState({
        current_page: 1,
        total: 0,
        last_page: 1,
        per_page: 20,
    });

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
    const [sensitiveWarningOpen, setSensitiveWarningOpen] = useState(false);

    const [creating, setCreating] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [viewingDatabase, setViewingDatabase] = useState<Database | null>(null);
    const [databaseToDelete, setDatabaseToDelete] = useState<Database | null>(null);

    const [showPassword, setShowPassword] = useState(false);
    const [rememberSensitiveChoice, setRememberSensitiveChoice] = useState(false);

    const [createForm, setCreateForm] = useState({
        database_host_id: '',
        database_name: '',
        remote: '%',
        max_connections: 0,
    });

    // Export
    const [exportingId, setExportingId] = useState<number | null>(null);

    // Import
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [importTargetDb, setImportTargetDb] = useState<Database | null>(null);
    const [importSql, setImportSql] = useState('');
    const [importIgnoreErrors, setImportIgnoreErrors] = useState(false);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{
        executed_statements: number;
        errors: string[];
        success: boolean;
    } | null>(null);
    const importFileRef = useRef<HTMLInputElement>(null);

    // Query
    const [queryDialogOpen, setQueryDialogOpen] = useState(false);
    const [queryTargetDb, setQueryTargetDb] = useState<Database | null>(null);
    const [queryText, setQueryText] = useState('');
    const [runningQuery, setRunningQuery] = useState(false);
    const [queryResult, setQueryResult] = useState<{
        type: 'select' | 'dml';
        columns?: string[];
        rows?: unknown[][];
        row_count?: number;
        affected_rows?: number;
        truncated?: boolean;
        execution_time_ms?: number;
    } | null>(null);
    const [queryError, setQueryError] = useState<string | null>(null);

    const fetchDatabases = useCallback(
        async (page = pagination.current_page) => {
            if (!uuidShort) return;

            try {
                setLoading(true);
                const [databasesRes, serverRes, hostsRes, pmaRes] = await Promise.all([
                    axios.get<DatabasesResponse>(`/api/user/servers/${uuidShort}/databases`, {
                        params: {
                            page,
                            per_page: pagination.per_page,
                            search: searchQuery || undefined,
                        },
                    }),
                    axios.get<{ success: boolean; data: Server }>(`/api/user/servers/${uuidShort}`),
                    axios.get<{ success: boolean; data: DatabaseHost[] }>(
                        `/api/user/servers/${uuidShort}/databases/hosts`,
                    ),
                    axios.get<{ success: boolean; data: { installed: boolean } }>(
                        `/api/user/servers/${uuidShort}/databases/phpmyadmin/check`,
                    ),
                ]);

                if (databasesRes.data.success) {
                    setDatabases(databasesRes.data.data.data);
                    const p = databasesRes.data.data.pagination;
                    setPagination({
                        current_page: p.current_page,
                        total: p.total,
                        last_page: p.last_page,
                        per_page: p.per_page,
                    });
                }

                if (serverRes.data.success) {
                    setServer(serverRes.data.data);
                }

                if (hostsRes.data.success) {
                    setAvailableHosts(hostsRes.data.data || []);
                }

                if (pmaRes.data.success) {
                    setPhpMyAdminInstalled(pmaRes.data.data.installed || false);
                }
            } catch (error) {
                console.error('Error fetching databases:', error);
                const errorMessage =
                    (error as { response?: { data?: { message?: string; error_message?: string } } })?.response?.data
                        ?.message ||
                    (error as { response?: { data?: { error_message?: string } } })?.response?.data?.error_message ||
                    t('serverDatabases.failedToFetch');
                toast.error(errorMessage);
            } finally {
                setLoading(false);
            }
        },
        [uuidShort, searchQuery, pagination.current_page, pagination.per_page, t],
    );

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        if (!permissionsLoading && !canRead) {
            toast.error(t('serverDatabases.noDatabasePermission'));
            router.push(`/server/${uuidShort}`);
            return;
        }

        if (canRead) {
            fetchDatabases();
        }
    }, [canRead, permissionsLoading, fetchDatabases, uuidShort, router, t]);

    const handleCreateDatabase = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createForm.database_host_id) {
            toast.error(t('serverDatabases.noHostSelected'));
            return;
        }
        if (!createForm.database_name.trim()) {
            toast.error(t('serverDatabases.databaseNameRequired'));
            return;
        }

        try {
            setCreating(true);
            const submitData = {
                ...createForm,
                database_host_id: Number(createForm.database_host_id),
                max_connections: Number(createForm.max_connections),
            };
            const { data } = await axios.post(`/api/user/servers/${uuidShort}/databases`, submitData);
            if (data.success) {
                toast.success(t('serverDatabases.createSuccess'));
                setCreateDialogOpen(false);
                setCreateForm({
                    database_host_id: '',
                    database_name: '',
                    remote: '%',
                    max_connections: 0,
                });
                fetchDatabases(1);
            } else {
                toast.error(data.message || t('serverDatabases.createFailed'));
            }
        } catch (error) {
            console.error('Error creating database:', error);
            const axiosError = error as { response?: { data?: { message?: string; error_message?: string } } };
            const errorMessage =
                axiosError?.response?.data?.message ||
                axiosError?.response?.data?.error_message ||
                t('serverDatabases.createFailed');
            toast.error(errorMessage);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteDatabase = async () => {
        if (!databaseToDelete) return;

        try {
            setDeletingId(databaseToDelete.id);
            const { data } = await axios.delete(`/api/user/servers/${uuidShort}/databases/${databaseToDelete.id}`);
            if (data.success) {
                toast.success(t('serverDatabases.deleteSuccess'));
                setConfirmDeleteDialogOpen(false);
                fetchDatabases();
            } else {
                toast.error(data.message || t('serverDatabases.deleteFailed'));
            }
        } catch (error) {
            console.error('Error deleting database:', error);
            const errorMessage =
                (error as { response?: { data?: { message?: string; error_message?: string } } })?.response?.data
                    ?.message ||
                (error as { response?: { data?: { error_message?: string } } })?.response?.data?.error_message ||
                t('serverDatabases.deleteFailed');
            toast.error(errorMessage);
        } finally {
            setDeletingId(null);
        }
    };

    const openViewDatabase = (db: Database) => {
        setViewingDatabase(db);
        const remembered = localStorage.getItem('featherpanel-remember-sensitive-info') === 'true';

        if (remembered) {
            setShowPassword(true);
            setViewDialogOpen(true);
        } else {
            setSensitiveWarningOpen(true);
        }
    };

    const confirmSensitiveWarning = () => {
        if (rememberSensitiveChoice) {
            localStorage.setItem('featherpanel-remember-sensitive-info', 'true');
        }
        setShowPassword(rememberSensitiveChoice);
        setSensitiveWarningOpen(false);
        setViewDialogOpen(true);
    };

    const handlePhpMyAdmin = async (db: Database) => {
        try {
            const { data } = await axios.post(`/api/user/servers/${uuidShort}/databases/${db.id}/phpmyadmin/token`);
            if (data.success) {
                storePmaAuthContext(preparePmaAuthContext(settings, t, locale));
                window.open(appendPmaAuthParams(data.data.url, locale), '_blank');
                toast.success(t('serverDatabases.openingPhpMyAdmin'));
            } else {
                toast.error(data.message || t('serverDatabases.failedToOpenPhpMyAdmin'));
            }
        } catch {
            toast.error(t('serverDatabases.failedToOpenPhpMyAdmin'));
        }
    };

    const handleExportDatabase = async (db: Database) => {
        setExportingId(db.id);
        try {
            const { data } = await axios.get(`/api/user/servers/${uuidShort}/databases/${db.id}/export`);
            if (data?.success) {
                const blob = new Blob([data.data.sql], { type: 'application/sql' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = data.data.filename || `${db.database}.sql`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success(t('serverDatabases.exportSuccess', { count: String(data.data.table_count) }));
            } else {
                toast.error(data?.message || t('serverDatabases.exportFailed'));
            }
        } catch (error) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError?.response?.data?.message || t('serverDatabases.exportFailed'));
        } finally {
            setExportingId(null);
        }
    };

    const openImportDialog = (db: Database) => {
        setImportTargetDb(db);
        setImportSql('');
        setImportIgnoreErrors(false);
        setImportResult(null);
        setImportDialogOpen(true);
    };

    const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setImportSql(ev.target?.result as string);
        reader.readAsText(file);
    };

    const handleImportDatabase = async () => {
        if (!importTargetDb || !importSql.trim()) {
            toast.error(t('serverDatabases.importEmptyPayload'));
            return;
        }
        setImporting(true);
        setImportResult(null);
        try {
            const { data } = await axios.post(`/api/user/servers/${uuidShort}/databases/${importTargetDb.id}/import`, {
                sql: importSql,
                ignore_errors: importIgnoreErrors,
            });
            if (data?.success) {
                setImportResult(data.data);
                if (data.data.success) {
                    toast.success(t('serverDatabases.importSuccess', { count: String(data.data.executed_statements) }));
                } else {
                    toast.warning(
                        t('serverDatabases.importCompleteWithErrors', { count: String(data.data.errors.length) }),
                    );
                }
            } else {
                toast.error(data?.message || t('serverDatabases.importFailed'));
            }
        } catch (error) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError?.response?.data?.message || t('serverDatabases.importFailed'));
        } finally {
            setImporting(false);
        }
    };

    const openQueryDialog = (db: Database) => {
        setQueryTargetDb(db);
        setQueryText('');
        setQueryResult(null);
        setQueryError(null);
        setQueryDialogOpen(true);
    };

    const handleRunQuery = async () => {
        if (!queryTargetDb || !queryText.trim()) {
            toast.error(t('serverDatabases.queryEmptyPayload'));
            return;
        }
        setRunningQuery(true);
        setQueryResult(null);
        setQueryError(null);
        try {
            const { data } = await axios.post(`/api/user/servers/${uuidShort}/databases/${queryTargetDb.id}/query`, {
                query: queryText,
            });
            if (data?.success) {
                setQueryResult(data.data);
            } else {
                setQueryError(data?.message || t('serverDatabases.queryFailed'));
            }
        } catch (error) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            setQueryError(axiosError?.response?.data?.message || t('serverDatabases.queryFailed'));
        } finally {
            setRunningQuery(false);
        }
    };

    const copyToClipboard = (text: string) => copyUtil(text, t);
    const getDatabaseDisplayHost = (db: Pick<Database, 'database_host' | 'database_subdomain'>) =>
        db.database_subdomain || db.database_host || '';

    if (loading && databases.length === 0) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 animate-pulse font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    const limitReached = server && databases.length >= server.database_limit;

    return (
        <div key={pathname} className='space-y-8 pb-12'>
            <WidgetRenderer widgets={getWidgets('server-databases', 'top-of-page')} />

            <PageHeader
                title={t('serverDatabases.title')}
                description={
                    <div className='flex items-center gap-3'>
                        <span>{t('serverDatabases.description')}</span>
                        {server && (
                            <span className='bg-primary/5 text-primary border-primary/20 rounded-full border px-3 py-1 text-[10px] font-black tracking-widest uppercase'>
                                {databases.length} / {server.database_limit}
                            </span>
                        )}
                    </div>
                }
                actions={
                    <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                        {canCreate && databases.length > 0 && (
                            <Button
                                size='default'
                                disabled={limitReached || loading}
                                onClick={() => setCreateDialogOpen(true)}
                                className='order-1 w-full transition-all active:scale-95 sm:order-2 sm:w-auto'
                            >
                                <Plus className='mr-2 h-5 w-5' />
                                {t('serverDatabases.createDatabase')}
                            </Button>
                        )}
                        <Button
                            variant='glass'
                            size='default'
                            onClick={() => fetchDatabases()}
                            disabled={loading}
                            className='order-2 sm:order-1'
                            aria-label={t('serverDatabases.refresh')}
                        >
                            <RefreshCw className={cn('h-5 w-5 sm:mr-2', loading && 'animate-spin')} />
                            <span className='hidden sm:inline'>{t('serverDatabases.refresh')}</span>
                        </Button>
                    </div>
                }
            />

            {limitReached && (
                <div className='animate-in slide-in-from-top relative overflow-hidden rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-6 backdrop-blur-xl duration-500'>
                    <div className='relative z-10 flex items-start gap-5'>
                        <div className='flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-500/30 bg-yellow-500/20'>
                            <AlertTriangle className='h-6 w-6 text-yellow-500' />
                        </div>
                        <div className='space-y-1'>
                            <h3 className='text-lg leading-none font-bold text-yellow-500'>
                                {t('serverDatabases.databaseLimitReached')}
                            </h3>
                            <p className='text-sm leading-relaxed font-medium text-yellow-500/80'>
                                {t('serverDatabases.databaseLimitReachedDescription', {
                                    limit: String(server?.database_limit || 0),
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <WidgetRenderer widgets={getWidgets('server-databases', 'after-warning-banner')} />

            <div className='space-y-6'>
                <div className='flex items-center gap-4'>
                    <div className='group relative flex-1'>
                        <Search className='text-muted-foreground/80 group-focus-within:text-foreground absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 transition-colors' />
                        <Input
                            placeholder={t('serverDatabases.searchPlaceholder')}
                            className='h-14 pl-12 text-base'
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <WidgetRenderer widgets={getWidgets('server-databases', 'before-databases-list')} />

                {pagination.total > pagination.per_page && (
                    <div className='border-border bg-card/50 mb-4 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
                        <Button
                            variant='glass'
                            size='sm'
                            disabled={pagination.current_page === 1 || loading}
                            onClick={() => fetchDatabases(pagination.current_page - 1)}
                            className='gap-1.5'
                        >
                            <ChevronLeft className='h-4 w-4' />
                            {t('common.previous')}
                        </Button>
                        <span className='text-sm font-medium'>
                            {pagination.current_page} / {pagination.last_page}
                        </span>
                        <Button
                            variant='glass'
                            size='sm'
                            disabled={pagination.current_page === pagination.last_page || loading}
                            onClick={() => fetchDatabases(pagination.current_page + 1)}
                            className='gap-1.5'
                        >
                            {t('common.next')}
                            <ChevronRight className='h-4 w-4' />
                        </Button>
                    </div>
                )}

                {databases.length === 0 ? (
                    <EmptyState
                        title={t('serverDatabases.noDatabases')}
                        description={
                            server?.database_limit === 0
                                ? t('serverDatabases.noDatabasesNoLimit')
                                : t('serverDatabases.noDatabasesDescription')
                        }
                        icon={DatabaseIcon}
                        action={
                            canCreate && server && server.database_limit > 0 ? (
                                <Button
                                    size='default'
                                    onClick={() => setCreateDialogOpen(true)}
                                    className='h-14 px-10 text-lg'
                                >
                                    <Plus className='mr-2 h-6 w-6' />
                                    {t('serverDatabases.createDatabase')}
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className='grid grid-cols-1 gap-4'>
                        {databases.map((db) => (
                            <ResourceCard
                                key={db.id}
                                icon={DatabaseIcon}
                                title={db.database}
                                badges={
                                    <>
                                        <span className='bg-primary/10 text-primary border-primary/20 rounded-full border px-3 py-1 text-[10px] leading-none font-black tracking-widest uppercase'>
                                            {db.database_type}
                                        </span>
                                        {db.remote === '%' ? (
                                            <span className='flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] leading-none font-black tracking-widest text-emerald-500 uppercase'>
                                                <Globe className='h-3 w-3' />
                                                {t('serverDatabases.allHosts')}
                                            </span>
                                        ) : (
                                            <span className='bg-muted border-border/50 text-muted-foreground rounded-full border px-3 py-1 font-mono text-[10px] leading-none font-black tracking-widest uppercase'>
                                                {db.remote}
                                            </span>
                                        )}
                                    </>
                                }
                                description={
                                    <>
                                        <div className='text-muted-foreground flex items-center gap-2'>
                                            <User className='h-4 w-4 opacity-50' />
                                            <span className='text-sm font-semibold'>{db.username}</span>
                                        </div>
                                        <div className='text-muted-foreground flex items-center gap-2'>
                                            <ServerIcon className='h-4 w-4 opacity-50' />
                                            <span className='font-mono text-sm font-semibold'>
                                                {getDatabaseDisplayHost(db)}:{db.database_port}
                                            </span>
                                        </div>
                                    </>
                                }
                                actions={
                                    (canViewPassword || canDelete) && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger className='group-hover:bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl transition-colors outline-none'>
                                                <MoreVertical className='text-muted-foreground group-hover:text-primary h-6 w-6 transition-colors' />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent
                                                align='end'
                                                className='bg-card/90 border-border/40 w-56 rounded-2xl p-2 backdrop-blur-xl'
                                            >
                                                {canViewPassword && (
                                                    <>
                                                        <DropdownMenuItem
                                                            onClick={() => openViewDatabase(db)}
                                                            className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                        >
                                                            <Eye className='text-primary h-4 w-4' />
                                                            <span className='font-bold'>
                                                                {t('serverDatabases.view')}
                                                            </span>
                                                        </DropdownMenuItem>
                                                        {phpMyAdminInstalled && (
                                                            <DropdownMenuItem
                                                                onClick={() => handlePhpMyAdmin(db)}
                                                                className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                            >
                                                                <ExternalLink className='h-4 w-4 text-blue-500' />
                                                                <span className='font-bold'>phpMyAdmin</span>
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator className='bg-border/40 my-1' />
                                                        <DropdownMenuItem
                                                            onClick={() => handleExportDatabase(db)}
                                                            disabled={exportingId === db.id}
                                                            className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                        >
                                                            {exportingId === db.id ? (
                                                                <Loader2 className='h-4 w-4 animate-spin text-emerald-500' />
                                                            ) : (
                                                                <Download className='h-4 w-4 text-emerald-500' />
                                                            )}
                                                            <span className='font-bold'>
                                                                {t('serverDatabases.exportSql')}
                                                            </span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => openImportDialog(db)}
                                                            className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                        >
                                                            <Upload className='h-4 w-4 text-amber-500' />
                                                            <span className='font-bold'>
                                                                {t('serverDatabases.importSql')}
                                                            </span>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => openQueryDialog(db)}
                                                            className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                        >
                                                            <Terminal className='h-4 w-4 text-violet-500' />
                                                            <span className='font-bold'>
                                                                {t('serverDatabases.runQuery')}
                                                            </span>
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                                {canDelete && (
                                                    <>
                                                        <DropdownMenuSeparator className='bg-border/40 my-1' />
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setDatabaseToDelete(db);
                                                                setConfirmDeleteDialogOpen(true);
                                                            }}
                                                            className='text-destructive focus:text-destructive focus:bg-destructive/10 flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                        >
                                                            <Trash2 className='h-4 w-4' />
                                                            <span className='font-bold'>
                                                                {t('serverDatabases.confirmDelete')}
                                                            </span>
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )
                                }
                            />
                        ))}
                    </div>
                )}

                <WidgetRenderer widgets={getWidgets('server-databases', 'after-databases-list')} />

                {pagination.total > pagination.per_page && (
                    <div className='border-border/40 flex items-center justify-between border-t px-6 py-8'>
                        <p className='text-sm font-bold tracking-widest uppercase opacity-40'>
                            {t('serverActivities.pagination.showing', {
                                from: String((pagination.current_page - 1) * pagination.per_page + 1),
                                to: String(Math.min(pagination.current_page * pagination.per_page, pagination.total)),
                                total: String(pagination.total),
                            })}
                        </p>
                        <div className='flex items-center gap-3'>
                            <Button
                                variant='glass'
                                size='sm'
                                disabled={pagination.current_page === 1 || loading}
                                onClick={() => {
                                    setPagination((p) => ({ ...p, current_page: p.current_page - 1 }));
                                    fetchDatabases(pagination.current_page - 1);
                                }}
                                className='h-10 w-10 rounded-xl p-0'
                            >
                                <ChevronLeft className='h-5 w-5' />
                            </Button>
                            <span className='bg-primary/5 text-primary border-primary/20 flex h-10 min-w-12 items-center justify-center rounded-xl border px-4 text-sm font-black'>
                                {pagination.current_page} / {pagination.last_page}
                            </span>
                            <Button
                                variant='glass'
                                size='sm'
                                disabled={pagination.current_page === pagination.last_page || loading}
                                onClick={() => {
                                    setPagination((p) => ({ ...p, current_page: p.current_page + 1 }));
                                    fetchDatabases(pagination.current_page + 1);
                                }}
                                className='h-10 w-10 rounded-xl p-0'
                            >
                                <ChevronRight className='h-5 w-5' />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <Dialog
                open={createDialogOpen}
                onClose={() => {
                    setCreateDialogOpen(false);
                    setCreateForm({
                        database_host_id: '',
                        database_name: '',
                        remote: '%',
                        max_connections: 0,
                    });
                }}
                className='max-w-xl'
            >
                <div className='space-y-6 p-2'>
                    <DialogHeader>
                        <div className='flex items-center gap-4'>
                            <div className='bg-primary/10 border-primary/20 flex h-12 w-12 items-center justify-center rounded-xl border shadow-inner'>
                                <Plus className='text-primary h-6 w-6' />
                            </div>
                            <div className='space-y-0.5'>
                                <DialogTitle className='text-xl leading-none font-bold'>
                                    {t('serverDatabases.createDatabase')}
                                </DialogTitle>
                                <DialogDescription className='text-sm opacity-70'>
                                    {t('serverDatabases.createDatabaseDescription')}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleCreateDatabase} className='space-y-6'>
                        <div className='space-y-4'>
                            <div className='space-y-2 px-1'>
                                <label className='ml-1 text-[10px] font-bold tracking-widest uppercase opacity-40'>
                                    {t('serverDatabases.databaseHost')}
                                </label>
                                <HeadlessSelect
                                    value={createForm.database_host_id}
                                    onChange={(val) => {
                                        setCreateForm({ ...createForm, database_host_id: String(val) });
                                    }}
                                    options={availableHosts.map((h) => ({
                                        id: String(h.id),
                                        name: `${h.name} (${h.database_type}) - ${h.database_subdomain || h.database_host}:${h.database_port}`,
                                    }))}
                                    placeholder={
                                        availableHosts.length === 0
                                            ? t('serverDatabases.noDatabaseHosts')
                                            : t('serverDatabases.selectDatabaseHost')
                                    }
                                    disabled={availableHosts.length === 0}
                                />
                                {availableHosts.length === 0 && (
                                    <p className='mt-1 ml-1 flex items-center gap-1.5 text-[10px] text-yellow-500'>
                                        <AlertTriangle className='h-3 w-3' />
                                        {t('serverDatabases.noDatabaseHostsDescription')}
                                    </p>
                                )}
                            </div>

                            <div className='space-y-2 px-1'>
                                <label className='ml-1 text-[10px] font-bold tracking-widest uppercase opacity-40'>
                                    {t('serverDatabases.databaseName')}
                                </label>
                                <Input
                                    value={createForm.database_name}
                                    onChange={(e) => setCreateForm({ ...createForm, database_name: e.target.value })}
                                    placeholder={t('serverDatabases.databaseNamePlaceholder')}
                                    required
                                />
                                <p className='text-muted-foreground px-1 text-[10px] italic'>
                                    {t('serverDatabases.databaseNameHelp')}
                                </p>
                            </div>

                            <div className='grid grid-cols-1 gap-4 px-1 md:grid-cols-2'>
                                <div className='space-y-2'>
                                    <label className='ml-1 text-[10px] font-bold tracking-widest uppercase opacity-40'>
                                        {t('serverDatabases.remoteAccess')}
                                    </label>
                                    <Input
                                        value={createForm.remote}
                                        onChange={(e) => setCreateForm({ ...createForm, remote: e.target.value })}
                                        placeholder='%'
                                    />
                                    <p className='text-muted-foreground px-1 text-[10px] italic'>
                                        {t('serverDatabases.remoteAccessHelp')}
                                    </p>
                                </div>
                                <div className='space-y-2'>
                                    <label className='ml-1 text-[10px] font-bold tracking-widest uppercase opacity-40'>
                                        {t('serverDatabases.maxConnections')}
                                    </label>
                                    <Input
                                        type='number'
                                        min={0}
                                        value={createForm.max_connections}
                                        onChange={(e) =>
                                            setCreateForm({
                                                ...createForm,
                                                max_connections: parseInt(e.target.value) || 0,
                                            })
                                        }
                                    />
                                    <p className='text-muted-foreground px-1 text-[10px] italic'>
                                        {t('serverDatabases.maxConnectionsHelp')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className='border-border/40 mt-4 border-t px-1 pt-6'>
                            <Button
                                type='button'
                                variant='ghost'
                                className='h-12 flex-1 rounded-xl font-bold'
                                onClick={() => setCreateDialogOpen(false)}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                type='submit'
                                disabled={creating || availableHosts.length === 0}
                                className='h-12 flex-1 rounded-xl font-bold'
                            >
                                {creating ? <Loader2 className='h-5 w-5 animate-spin' /> : t('serverDatabases.create')}
                            </Button>
                        </DialogFooter>
                    </form>
                </div>
            </Dialog>

            <Dialog open={sensitiveWarningOpen} onClose={() => setSensitiveWarningOpen(false)} className='max-w-md'>
                <div className='space-y-6 p-2'>
                    <DialogHeader className='text-center'>
                        <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-yellow-500/20 bg-yellow-500/10 shadow-inner'>
                            <ShieldAlert className='h-8 w-8 text-yellow-500' />
                        </div>
                        <DialogTitle className='text-2xl leading-tight font-black text-yellow-500'>
                            {t('serverDatabases.sensitiveInfoWarning')}
                        </DialogTitle>
                        <DialogDescription className='px-4 text-sm leading-relaxed opacity-70'>
                            {t('serverDatabases.sensitiveInfoDescription')}
                        </DialogDescription>
                    </DialogHeader>

                    <div
                        className='bg-card/50 border-border/50 group hover:bg-accent/50 mx-1 flex cursor-pointer items-center gap-4 rounded-3xl border p-5 backdrop-blur-xl transition-all'
                        onClick={() => setRememberSensitiveChoice(!rememberSensitiveChoice)}
                    >
                        <Checkbox
                            id='remember-choice'
                            checked={rememberSensitiveChoice}
                            onCheckedChange={(checked) => setRememberSensitiveChoice(checked === true)}
                            className='h-6 w-6'
                        />
                        <div className='space-y-0.5'>
                            <label
                                htmlFor='remember-choice'
                                className='group-hover:text-primary block cursor-pointer text-sm leading-tight font-bold transition-colors'
                            >
                                {t('serverDatabases.rememberChoice')}
                            </label>
                            <p className='text-[10px] font-bold tracking-tighter uppercase opacity-40'>
                                {t('serverDatabases.skipWarningInFuture')}
                            </p>
                        </div>
                    </div>

                    <DialogFooter className='border-border/40 mt-4 gap-3 border-t px-1 pt-6'>
                        <Button
                            variant='ghost'
                            className='h-12 flex-1 rounded-xl font-bold'
                            onClick={() => setSensitiveWarningOpen(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button className='h-12 flex-1 rounded-xl font-bold' onClick={confirmSensitiveWarning}>
                            {t('serverDatabases.viewDatabase')}
                        </Button>
                    </DialogFooter>
                </div>
            </Dialog>

            <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} className='max-w-2xl'>
                {viewingDatabase && (
                    <div className='space-y-6 p-2'>
                        <DialogHeader>
                            <div className='flex items-center gap-4'>
                                <div className='bg-primary/10 border-primary/20 flex h-12 w-12 items-center justify-center rounded-xl border shadow-inner'>
                                    <DatabaseIcon className='text-primary h-6 w-6' />
                                </div>
                                <div className='space-y-0.5'>
                                    <DialogTitle className='text-xl leading-none font-bold'>
                                        {viewingDatabase.database}
                                    </DialogTitle>
                                    <DialogDescription className='text-sm opacity-70'>
                                        {t('serverDatabases.databaseCredentials')}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        <div className='space-y-6 px-1'>
                            <div className='border-primary/20 bg-primary/5 space-y-5 rounded-3xl border p-6 backdrop-blur-sm'>
                                <h3 className='text-primary/60 flex items-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase'>
                                    <div className='bg-primary/30 h-4 w-1.5 rounded-full' />
                                    {t('serverDatabases.connectionDetails')}
                                </h3>
                                <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
                                    {[
                                        {
                                            label: t('serverDatabases.host'),
                                            value: getDatabaseDisplayHost(viewingDatabase),
                                        },
                                        {
                                            label: t('serverDatabases.port'),
                                            value: String(viewingDatabase.database_port),
                                        },
                                        { label: t('serverDatabases.type'), value: viewingDatabase.database_type },
                                    ].map((item, i) => (
                                        <div key={i} className='space-y-2'>
                                            <label className='text-[10px] font-bold tracking-widest uppercase opacity-40'>
                                                {item.label}
                                            </label>
                                            <div className='group relative'>
                                                <Input
                                                    readOnly
                                                    value={item.value || 'N/A'}
                                                    className='bg-card border-border/50 pr-10 font-mono text-xs'
                                                />
                                                <Button
                                                    variant='glass'
                                                    size='sm'
                                                    className='absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2 bg-white/10 p-0 opacity-0 transition-opacity group-hover:opacity-100'
                                                    onClick={() => copyToClipboard(item.value || '')}
                                                >
                                                    <Copy className='h-3.5 w-3.5' />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className='border-primary/20 bg-primary/5 space-y-5 rounded-3xl border p-6 backdrop-blur-sm'>
                                <h3 className='text-primary/60 flex items-center gap-2 text-[10px] font-black tracking-[0.2em] uppercase'>
                                    <div className='bg-primary/30 h-4 w-1.5 rounded-full' />
                                    {t('serverDatabases.loginCredentials')}
                                </h3>
                                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                                    <div className='space-y-2'>
                                        <label className='text-[10px] font-bold tracking-widest uppercase opacity-40'>
                                            {t('serverDatabases.username')}
                                        </label>
                                        <div className='group relative'>
                                            <Input
                                                readOnly
                                                value={viewingDatabase.username}
                                                className='bg-card border-border/50 pr-10 font-mono text-xs'
                                            />
                                            <Button
                                                variant='glass'
                                                size='sm'
                                                className='absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2 bg-white/10 p-0 opacity-0 transition-opacity group-hover:opacity-100'
                                                onClick={() => copyToClipboard(viewingDatabase.username)}
                                            >
                                                <Copy className='h-3.5 w-3.5' />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className='space-y-2'>
                                        <div className='flex items-center justify-between'>
                                            <label className='text-[10px] font-bold tracking-widest uppercase opacity-40'>
                                                {t('serverDatabases.password')}
                                            </label>
                                            <button
                                                className='text-primary text-[10px] font-black uppercase hover:underline'
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? t('common.hide') : t('common.show')}
                                            </button>
                                        </div>
                                        <div className='group relative'>
                                            <Input
                                                readOnly
                                                type={showPassword ? 'text' : 'password'}
                                                value={viewingDatabase.password || ''}
                                                className='bg-card border-border/50 pr-10 font-mono text-xs'
                                            />
                                            <Button
                                                variant='glass'
                                                size='sm'
                                                className='absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2 bg-white/10 p-0 opacity-0 transition-opacity group-hover:opacity-100'
                                                onClick={() => copyToClipboard(viewingDatabase.password || '')}
                                            >
                                                <Copy className='h-3.5 w-3.5' />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className='border-border/40 mt-4 flex-col gap-4 border-t px-1 pt-6 sm:flex-row'>
                            <Button
                                variant='ghost'
                                onClick={() => {
                                    localStorage.removeItem('featherpanel-remember-sensitive-info');
                                    toast.success(t('serverDatabases.rememberedChoiceCleared'));
                                }}
                                className='text-[10px] font-black tracking-widest uppercase opacity-40 transition-opacity hover:opacity-100 sm:mr-auto'
                            >
                                {t('serverDatabases.resetWarning')}
                            </Button>
                            <Button
                                size='default'
                                className='rounded-xl px-10 font-bold'
                                onClick={() => setViewDialogOpen(false)}
                            >
                                {t('common.close')}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </Dialog>

            <Dialog
                open={confirmDeleteDialogOpen}
                onClose={() => setConfirmDeleteDialogOpen(false)}
                className='max-w-md'
            >
                <div className='space-y-6 p-2'>
                    <DialogHeader className='text-center'>
                        <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-red-500/20 bg-red-500/10 shadow-inner'>
                            <Trash2 className='h-8 w-8 text-red-500' />
                        </div>
                        <DialogTitle className='text-2xl leading-tight font-black text-red-500'>
                            {t('serverDatabases.confirmDeleteTitle')}
                        </DialogTitle>
                        <DialogDescription className='px-4 text-sm leading-relaxed opacity-70'>
                            {t('serverDatabases.confirmDeleteDescription', {
                                database: databaseToDelete?.database || '',
                            })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className='py-2 text-center'>
                        <p className='text-[10px] font-black tracking-[0.2em] text-red-500 uppercase opacity-80'>
                            {t('common.actionsCannotBeUndone')}
                        </p>
                    </div>

                    <DialogFooter className='border-border/40 mt-4 gap-3 border-t px-1 pt-6'>
                        <Button
                            variant='ghost'
                            className='h-12 flex-1 rounded-xl font-bold'
                            onClick={() => setConfirmDeleteDialogOpen(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant='destructive'
                            className='h-12 flex-1 rounded-xl font-bold'
                            onClick={handleDeleteDatabase}
                            disabled={deletingId !== null}
                        >
                            {deletingId !== null ? (
                                <Loader2 className='h-5 w-5 animate-spin' />
                            ) : (
                                t('serverDatabases.confirmDelete')
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </Dialog>
            {/* Import SQL Dialog */}
            <Dialog
                open={importDialogOpen}
                onClose={() => {
                    if (!importing) {
                        setImportDialogOpen(false);
                        setImportResult(null);
                    }
                }}
                className='max-w-2xl'
            >
                <div className='space-y-6 p-2'>
                    <DialogHeader>
                        <div className='flex items-center gap-4'>
                            <div className='flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10'>
                                <Upload className='h-6 w-6 text-amber-500' />
                            </div>
                            <div className='space-y-0.5'>
                                <DialogTitle className='text-xl leading-none font-bold'>
                                    {t('serverDatabases.importSqlTitle')}
                                </DialogTitle>
                                <DialogDescription className='text-sm opacity-70'>
                                    {importTargetDb?.database}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {importResult ? (
                        <div className='space-y-4'>
                            <div
                                className={`flex items-start gap-4 rounded-2xl border p-5 ${importResult.success ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-amber-500/20 bg-amber-500/10'}`}
                            >
                                {importResult.success ? (
                                    <CheckCircle2 className='mt-0.5 h-6 w-6 shrink-0 text-emerald-500' />
                                ) : (
                                    <XCircle className='mt-0.5 h-6 w-6 shrink-0 text-amber-500' />
                                )}
                                <div>
                                    <p className='text-sm font-bold'>
                                        {importResult.success
                                            ? t('serverDatabases.importSuccessLabel')
                                            : t('serverDatabases.importCompleteWithErrorsLabel')}
                                    </p>
                                    <p className='text-sm opacity-70'>
                                        {t('serverDatabases.statementsExecuted', {
                                            count: String(importResult.executed_statements),
                                        })}
                                    </p>
                                </div>
                            </div>
                            {importResult.errors.length > 0 && (
                                <div className='border-destructive/20 bg-destructive/5 max-h-48 space-y-2 overflow-y-auto rounded-xl border p-4'>
                                    <p className='text-destructive/70 text-xs font-black tracking-wider uppercase'>
                                        {t('serverDatabases.errorsHeader')}
                                    </p>
                                    {importResult.errors.map((err, i) => (
                                        <p key={i} className='text-destructive/80 font-mono text-xs'>
                                            {err}
                                        </p>
                                    ))}
                                </div>
                            )}
                            <DialogFooter className='border-border/40 border-t pt-4'>
                                <Button
                                    onClick={() => {
                                        setImportResult(null);
                                        setImportSql('');
                                    }}
                                    variant='ghost'
                                    className='h-12 flex-1 rounded-xl font-bold'
                                >
                                    {t('serverDatabases.importAgain')}
                                </Button>
                                <Button
                                    onClick={() => setImportDialogOpen(false)}
                                    className='h-12 flex-1 rounded-xl font-bold'
                                >
                                    {t('common.close')}
                                </Button>
                            </DialogFooter>
                        </div>
                    ) : (
                        <>
                            <div
                                className='flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/10 bg-white/5 p-5 transition-colors hover:border-white/20'
                                onClick={() => importFileRef.current?.click()}
                            >
                                <Upload className='text-muted-foreground h-7 w-7' />
                                <p className='text-muted-foreground text-sm'>{t('serverDatabases.clickToUploadSql')}</p>
                                <input
                                    ref={importFileRef}
                                    type='file'
                                    accept='.sql,text/plain'
                                    className='hidden'
                                    onChange={handleImportFileChange}
                                />
                            </div>
                            <div className='text-muted-foreground flex items-center gap-3 text-xs'>
                                <div className='h-px flex-1 bg-white/10' />
                                <span>{t('serverDatabases.orPasteSql')}</span>
                                <div className='h-px flex-1 bg-white/10' />
                            </div>
                            <textarea
                                className='text-foreground placeholder:text-muted-foreground focus:ring-primary min-h-[160px] w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 font-mono text-xs focus:ring-1 focus:outline-none'
                                placeholder='-- Paste your SQL here...'
                                value={importSql}
                                onChange={(e) => setImportSql(e.target.value)}
                                disabled={importing}
                            />
                            <div
                                className='border-border/40 bg-card/50 hover:bg-accent/30 flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors'
                                onClick={() => setImportIgnoreErrors(!importIgnoreErrors)}
                            >
                                <input
                                    type='checkbox'
                                    checked={importIgnoreErrors}
                                    onChange={() => setImportIgnoreErrors(!importIgnoreErrors)}
                                    className='accent-primary h-4 w-4'
                                />
                                <div>
                                    <p className='text-sm font-bold'>{t('serverDatabases.continueOnErrors')}</p>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('serverDatabases.continueOnErrorsHelp')}
                                    </p>
                                </div>
                            </div>
                            <DialogFooter className='border-border/40 gap-3 border-t pt-4'>
                                <Button
                                    variant='ghost'
                                    onClick={() => setImportDialogOpen(false)}
                                    disabled={importing}
                                    className='h-12 flex-1 rounded-xl font-bold'
                                >
                                    {t('common.cancel')}
                                </Button>
                                <Button
                                    onClick={handleImportDatabase}
                                    disabled={importing || !importSql.trim()}
                                    className='h-12 flex-1 rounded-xl font-bold'
                                >
                                    {importing ? (
                                        <Loader2 className='h-5 w-5 animate-spin' />
                                    ) : (
                                        <>
                                            <Upload className='mr-2 h-4 w-4' />
                                            {t('serverDatabases.import')}
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </div>
            </Dialog>

            {/* Run Query Dialog */}
            <Dialog
                open={queryDialogOpen}
                onClose={() => {
                    if (!runningQuery) setQueryDialogOpen(false);
                }}
                className='max-w-4xl'
            >
                <div className='space-y-5 p-2'>
                    <DialogHeader>
                        <div className='flex items-center gap-4'>
                            <div className='flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10'>
                                <Terminal className='h-6 w-6 text-violet-500' />
                            </div>
                            <div className='space-y-0.5'>
                                <DialogTitle className='text-xl leading-none font-bold'>
                                    {t('serverDatabases.runQueryTitle')}
                                </DialogTitle>
                                <DialogDescription className='text-sm opacity-70'>
                                    {queryTargetDb?.database}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className='relative'>
                        <textarea
                            className='text-foreground placeholder:text-muted-foreground min-h-[120px] w-full resize-none rounded-xl border border-white/10 bg-[#0d0d0d] p-4 font-mono text-sm focus:ring-1 focus:ring-violet-500/50 focus:outline-none'
                            placeholder='SELECT * FROM your_table LIMIT 10;'
                            value={queryText}
                            onChange={(e) => setQueryText(e.target.value)}
                            disabled={runningQuery}
                            onKeyDown={(e) => {
                                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                    e.preventDefault();
                                    handleRunQuery();
                                }
                            }}
                        />
                        <Button
                            size='sm'
                            onClick={handleRunQuery}
                            disabled={runningQuery || !queryText.trim()}
                            className='absolute right-3 bottom-3 h-8 gap-1.5 rounded-lg bg-violet-600 text-xs font-bold text-white hover:bg-violet-500'
                        >
                            {runningQuery ? (
                                <Loader2 className='h-3.5 w-3.5 animate-spin' />
                            ) : (
                                <Play className='h-3.5 w-3.5' />
                            )}
                            {runningQuery ? t('serverDatabases.running') : t('serverDatabases.runWithShortcut')}
                        </Button>
                    </div>

                    {queryError && (
                        <div className='border-destructive/20 bg-destructive/5 flex items-start gap-3 rounded-xl border p-4'>
                            <XCircle className='text-destructive mt-0.5 h-5 w-5 shrink-0' />
                            <p className='text-destructive/90 font-mono text-sm'>{queryError}</p>
                        </div>
                    )}

                    {queryResult && (
                        <div className='space-y-3'>
                            <div className='text-muted-foreground flex items-center gap-4 text-xs'>
                                <span className='flex items-center gap-1.5'>
                                    <Clock className='h-3.5 w-3.5' />
                                    {queryResult.execution_time_ms}ms
                                </span>
                                {queryResult.type === 'select' ? (
                                    <span className='flex items-center gap-1.5'>
                                        <CheckCircle2 className='h-3.5 w-3.5 text-emerald-500' />
                                        {t('serverDatabases.rowsReturned', { count: String(queryResult.row_count) })}
                                        {queryResult.truncated && (
                                            <span className='font-bold text-amber-500'>
                                                {t('serverDatabases.truncatedTo', { limit: '500' })}
                                            </span>
                                        )}
                                    </span>
                                ) : (
                                    <span className='flex items-center gap-1.5'>
                                        <CheckCircle2 className='h-3.5 w-3.5 text-emerald-500' />
                                        {t('serverDatabases.rowsAffected', {
                                            count: String(queryResult.affected_rows),
                                        })}
                                    </span>
                                )}
                            </div>

                            {queryResult.type === 'select' && queryResult.columns && queryResult.rows && (
                                <div className='border-border/40 max-h-[340px] overflow-auto rounded-xl border'>
                                    <table className='w-full border-collapse text-xs'>
                                        <thead className='bg-card sticky top-0 z-10'>
                                            <tr>
                                                {queryResult.columns.map((col, i) => (
                                                    <th
                                                        key={i}
                                                        className='text-muted-foreground border-border/40 border-b px-3 py-2 text-left font-black tracking-wider whitespace-nowrap uppercase'
                                                    >
                                                        {col}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {queryResult.rows.map((row, ri) => (
                                                <tr
                                                    key={ri}
                                                    className='border-border/20 border-b transition-colors hover:bg-white/5'
                                                >
                                                    {(row as unknown[]).map((cell, ci) => (
                                                        <td
                                                            key={ci}
                                                            className='max-w-[240px] truncate px-3 py-2 font-mono whitespace-nowrap'
                                                        >
                                                            {cell === null ? (
                                                                <span className='text-muted-foreground italic'>
                                                                    NULL
                                                                </span>
                                                            ) : (
                                                                String(cell)
                                                            )}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {queryResult.type === 'dml' && (
                                <div className='flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4'>
                                    <CheckCircle2 className='h-5 w-5 text-emerald-500' />
                                    <p className='text-sm font-bold text-emerald-500'>
                                        {t('serverDatabases.queryExecuted', {
                                            count: String(queryResult.affected_rows),
                                        })}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className='border-border/40 border-t pt-4'>
                        <Button
                            variant='ghost'
                            onClick={() => setQueryDialogOpen(false)}
                            disabled={runningQuery}
                            className='h-12 rounded-xl px-8 font-bold'
                        >
                            {t('common.close')}
                        </Button>
                    </DialogFooter>
                </div>
            </Dialog>

            <WidgetRenderer widgets={getWidgets('server-databases', 'bottom-of-page')} />
        </div>
    );
}
