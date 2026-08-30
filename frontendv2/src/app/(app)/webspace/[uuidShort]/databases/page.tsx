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
import { useParams, useRouter, usePathname } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { toast } from 'sonner';
import {
    Plus,
    Trash2,
    KeyRound,
    ExternalLink,
    Loader2,
    Download,
    Upload,
    Database as DatabaseIcon,
    RefreshCw,
    Search,
    MoreVertical,
    Eye,
    Copy,
    User,
    Server as ServerIcon,
    Globe,
    AlertTriangle,
    ShieldAlert,
} from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { EmptyState } from '@/components/featherui/EmptyState';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWebSpacePermissions } from '@/hooks/useWebSpacePermissions';
import { WebSpaceSubuserPermissions } from '@/lib/webspace-permissions';
import { useWebSpace } from '@/contexts/WebSpaceContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';
import { useSettings } from '@/contexts/SettingsContext';
import { appendPmaAuthParams, preparePmaAuthContext, storePmaAuthContext } from '@/lib/pma-auth-context';
import { cn, copyToClipboard as copyUtil } from '@/lib/utils';

interface DatabaseRow {
    id: number;
    database: string;
    username: string;
    password?: string;
    remote?: string;
    database_type?: string;
    database_host_name?: string;
    database_host?: string;
    database_port?: number;
}

interface DatabaseHost {
    id: number;
    name: string;
    database_type: string;
}

export default function WebSpaceDatabasesPage() {
    const params = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const uuidShort = String(params.uuidShort || '');
    const { hasPermission, loading: permissionsLoading } = useWebSpacePermissions(uuidShort);
    const { webspace } = useWebSpace();
    const { t, locale } = useTranslation();
    const { settings } = useSettings();

    const canRead = hasPermission(WebSpaceSubuserPermissions['database.read']);
    const canCreate = hasPermission(WebSpaceSubuserPermissions['database.create']);
    const canDelete = hasPermission(WebSpaceSubuserPermissions['database.delete']);
    const canReset = hasPermission(WebSpaceSubuserPermissions['database.update']);
    const canViewPassword = hasPermission(WebSpaceSubuserPermissions['database.view_password']);

    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<DatabaseRow[]>([]);
    const [hosts, setHosts] = useState<DatabaseHost[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [phpMyAdminInstalled, setPhpMyAdminInstalled] = useState(false);
    const [phpPgAdminInstalled, setPhpPgAdminInstalled] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
    const [sensitiveWarningOpen, setSensitiveWarningOpen] = useState(false);
    const [viewingDatabase, setViewingDatabase] = useState<DatabaseRow | null>(null);
    const [databaseToDelete, setDatabaseToDelete] = useState<DatabaseRow | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberSensitiveChoice, setRememberSensitiveChoice] = useState(false);

    const databaseLimit = Number(webspace?.database_limit ?? 1);
    const atLimit = databaseLimit > 0 && rows.length >= databaseLimit;

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [listRes, hostsRes, pmaRes, ppaRes] = await Promise.all([
                axios.get(`/api/user/webspaces/${uuidShort}/databases`),
                axios.get(`/api/user/webspaces/${uuidShort}/databases/hosts`),
                axios.get(`/api/user/webspaces/${uuidShort}/databases/phpmyadmin/check`).catch(() => null),
                axios.get(`/api/user/webspaces/${uuidShort}/databases/phppgadmin/check`).catch(() => null),
            ]);
            const payload = listRes.data?.data;
            const list = (payload?.data ?? payload ?? []) as DatabaseRow[];
            setRows(Array.isArray(list) ? list : []);
            setHosts((hostsRes.data?.data?.hosts || []) as DatabaseHost[]);
            setPhpMyAdminInstalled(!!pmaRes?.data?.data?.installed);
            setPhpPgAdminInstalled(!!ppaRes?.data?.data?.installed);
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.databases.loadFailed')
                    : t('webSpaces.databases.loadFailed'),
            );
        } finally {
            setLoading(false);
        }
    }, [uuidShort, t]);

    useEffect(() => {
        if (!permissionsLoading && !canRead) {
            toast.error(t('webSpaces.databases.noDatabasePermission'));
            router.push(`/webspace/${uuidShort}`);
            return;
        }
        if (canRead) void load();
    }, [canRead, permissionsLoading, load, uuidShort, router, t]);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((row) =>
            [row.database, row.username, row.database_host, row.database_host_name]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(q),
        );
    }, [rows, searchQuery]);

    const copyToClipboard = (text: string) => copyUtil(text, t);
    const getDatabaseDisplayHost = (db: DatabaseRow) => db.database_host_name || db.database_host || '';

    const openViewDatabase = (db: DatabaseRow) => {
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

    const handleDeleteDatabase = async () => {
        if (!databaseToDelete) return;
        try {
            setDeletingId(databaseToDelete.id);
            await axios.delete(`/api/user/webspaces/${uuidShort}/databases/${databaseToDelete.id}`);
            toast.success(t('webSpaces.databases.deleted'));
            setConfirmDeleteDialogOpen(false);
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.databases.deleteFailed')
                    : t('webSpaces.databases.deleteFailed'),
            );
        } finally {
            setDeletingId(null);
        }
    };

    const dumpDatabase = async (id: number) => {
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/databases/${id}/dump`);
            const sql = String(data?.data?.sql ?? '');
            const filename = String(data?.data?.filename ?? 'database.sql');
            const blob = new Blob([sql], { type: 'application/sql' });
            const href = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = href;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(href);
            toast.success(t('webSpaces.databases.dumpOk'));
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.databases.dumpFailed')
                    : t('webSpaces.databases.dumpFailed'),
            );
        }
    };

    const restoreDatabase = async (id: number) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.sql,text/plain';
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
                const sql = await file.text();
                await axios.post(`/api/user/webspaces/${uuidShort}/databases/${id}/restore`, { sql });
                toast.success(t('webSpaces.databases.restoreOk'));
            } catch (err) {
                toast.error(
                    isAxiosError(err)
                        ? err.response?.data?.message || t('webSpaces.databases.restoreFailed')
                        : t('webSpaces.databases.restoreFailed'),
                );
            }
        };
        input.click();
    };

    const resetPassword = async (id: number) => {
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/databases/${id}/reset-password`);
            toast.success(t('webSpaces.databases.passwordReset'));
            if (data?.data?.password) {
                toast.message(t('webSpaces.databases.newPassword', { password: String(data.data.password) }), {
                    duration: 10000,
                });
            }
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.databases.resetFailed')
                    : t('webSpaces.databases.resetFailed'),
            );
        }
    };

    const openPhpMyAdmin = async (id: number) => {
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/databases/${id}/phpmyadmin/token`);
            if (data?.success && data?.data?.url) {
                storePmaAuthContext(preparePmaAuthContext(settings, t, locale));
                window.open(appendPmaAuthParams(data.data.url, locale), '_blank');
                toast.success(t('serverDatabases.openingPhpMyAdmin'));
            } else {
                toast.error(data?.message || t('serverDatabases.failedToOpenPhpMyAdmin'));
            }
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('serverDatabases.failedToOpenPhpMyAdmin')
                    : t('serverDatabases.failedToOpenPhpMyAdmin'),
            );
        }
    };

    const openPhpPgAdmin = async (id: number) => {
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/databases/${id}/phppgadmin/token`);
            if (data?.success && data?.data?.url) {
                window.open(data.data.url, '_blank', 'noopener,noreferrer');
                toast.success(t('webSpaces.databases.openingPhpPgAdmin'));
            } else {
                toast.error(data?.message || t('webSpaces.databases.failedToOpenPhpPgAdmin'));
            }
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.databases.failedToOpenPhpPgAdmin')
                    : t('webSpaces.databases.failedToOpenPhpPgAdmin'),
            );
        }
    };

    if (loading && rows.length === 0) {
        return (
            <div className='flex flex-col items-center justify-center py-24'>
                <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                <p className='text-muted-foreground mt-4 animate-pulse font-medium'>{t('common.loading')}</p>
            </div>
        );
    }

    const showHeaderCreateAction = canCreate && rows.length > 0;

    return (
        <WebSpacePageWidgets pageId='webspace-databases'>
            <div key={pathname} className='space-y-8 pb-12'>
                <PageHeader
                    title={t('webSpaces.databases.title')}
                    description={
                        <div className='flex items-center gap-3'>
                            <span>{t('webSpaces.databases.description')}</span>
                            <span className='bg-primary/5 text-primary border-primary/20 rounded-full border px-3 py-1 text-[10px] font-black tracking-widest uppercase'>
                                {rows.length} / {databaseLimit > 0 ? databaseLimit : '∞'}
                            </span>
                        </div>
                    }
                    actions={
                        <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                            {showHeaderCreateAction && (
                                <Button
                                    size='default'
                                    disabled={atLimit || loading}
                                    onClick={() => router.push(`/webspace/${uuidShort}/databases/new`)}
                                    className='order-1 w-full transition-all active:scale-95 sm:order-3 sm:w-auto'
                                >
                                    <Plus className='mr-2 h-5 w-5' />
                                    {t('webSpaces.databases.createDatabase')}
                                </Button>
                            )}
                            <Button
                                variant='glass'
                                size='default'
                                onClick={() => void load()}
                                disabled={loading}
                                className='order-2 sm:order-4'
                                aria-label={t('webSpaces.databases.refresh')}
                            >
                                <RefreshCw className={cn('h-5 w-5 sm:mr-2', loading && 'animate-spin')} />
                                <span className='hidden sm:inline'>{t('webSpaces.databases.refresh')}</span>
                            </Button>
                        </div>
                    }
                />

                {atLimit && (
                    <div className='relative overflow-hidden rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-6 backdrop-blur-xl'>
                        <div className='relative z-10 flex items-start gap-5'>
                            <div className='flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-500/30 bg-yellow-500/20'>
                                <AlertTriangle className='h-6 w-6 text-yellow-500' />
                            </div>
                            <div className='space-y-1'>
                                <h3 className='text-lg leading-none font-bold text-yellow-500'>
                                    {t('webSpaces.databases.databaseLimitReached')}
                                </h3>
                                <p className='text-sm leading-relaxed font-medium text-yellow-500/80'>
                                    {t('webSpaces.databases.databaseLimitReachedDescription', {
                                        limit: String(databaseLimit),
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className='space-y-6'>
                    <div className='group relative flex-1'>
                        <Search className='text-muted-foreground/80 group-focus-within:text-foreground absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 transition-colors' />
                        <Input
                            placeholder={t('webSpaces.databases.searchPlaceholder')}
                            className='h-14 pl-12 text-base'
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {filtered.length === 0 ? (
                        <EmptyState
                            title={t('webSpaces.databases.noDatabases')}
                            description={
                                hosts.length === 0
                                    ? t('webSpaces.databases.noHosts')
                                    : t('webSpaces.databases.noDatabasesDescription')
                            }
                            icon={DatabaseIcon}
                            action={
                                canCreate && !atLimit && hosts.length > 0 ? (
                                    <Button
                                        size='default'
                                        onClick={() => router.push(`/webspace/${uuidShort}/databases/new`)}
                                        className='h-14 px-10 text-lg'
                                    >
                                        <Plus className='mr-2 h-6 w-6' />
                                        {t('webSpaces.databases.createDatabase')}
                                    </Button>
                                ) : undefined
                            }
                        />
                    ) : (
                        <div className='grid grid-cols-1 gap-4'>
                            {filtered.map((db) => (
                                <ResourceCard
                                    key={db.id}
                                    icon={DatabaseIcon}
                                    title={db.database}
                                    badges={
                                        <>
                                            {db.database_type && (
                                                <span className='bg-primary/10 text-primary border-primary/20 rounded-full border px-3 py-1 text-[10px] leading-none font-black tracking-widest uppercase'>
                                                    {db.database_type}
                                                </span>
                                            )}
                                            {db.remote === '%' ? (
                                                <span className='flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] leading-none font-black tracking-widest text-emerald-500 uppercase'>
                                                    <Globe className='h-3 w-3' />
                                                    {t('serverDatabases.allHosts')}
                                                </span>
                                            ) : db.remote ? (
                                                <span className='bg-muted border-border/50 text-muted-foreground rounded-full border px-3 py-1 font-mono text-[10px] leading-none font-black tracking-widest uppercase'>
                                                    {db.remote}
                                                </span>
                                            ) : null}
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
                                                    {getDatabaseDisplayHost(db)}
                                                    {db.database_port ? `:${db.database_port}` : ''}
                                                </span>
                                            </div>
                                        </>
                                    }
                                    actions={
                                        (canViewPassword || canReset || canDelete || canRead) && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger className='group-hover:bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl transition-colors outline-none'>
                                                    <MoreVertical className='text-muted-foreground group-hover:text-primary h-6 w-6 transition-colors' />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    align='end'
                                                    className='bg-card/90 border-border/40 w-56 rounded-2xl p-2 backdrop-blur-xl'
                                                >
                                                    {canViewPassword && (
                                                        <DropdownMenuItem
                                                            onClick={() => openViewDatabase(db)}
                                                            className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                        >
                                                            <Eye className='text-primary h-4 w-4' />
                                                            <span className='font-bold'>
                                                                {t('webSpaces.databases.view')}
                                                            </span>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canRead && (
                                                        <DropdownMenuItem
                                                            onClick={() => void dumpDatabase(db.id)}
                                                            className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                        >
                                                            <Download className='h-4 w-4' />
                                                            <span className='font-bold'>
                                                                {t('webSpaces.databases.dump')}
                                                            </span>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canReset && (
                                                        <DropdownMenuItem
                                                            onClick={() => void restoreDatabase(db.id)}
                                                            className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                        >
                                                            <Upload className='h-4 w-4' />
                                                            <span className='font-bold'>
                                                                {t('webSpaces.databases.restore')}
                                                            </span>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {canViewPassword &&
                                                        phpMyAdminInstalled &&
                                                        !['postgresql', 'pgsql', 'postgres'].includes(
                                                            (db.database_type || '').toLowerCase(),
                                                        ) && (
                                                            <DropdownMenuItem
                                                                onClick={() => void openPhpMyAdmin(db.id)}
                                                                className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                            >
                                                                <ExternalLink className='h-4 w-4 text-blue-500' />
                                                                <span className='font-bold'>phpMyAdmin</span>
                                                            </DropdownMenuItem>
                                                        )}
                                                    {canViewPassword &&
                                                        phpPgAdminInstalled &&
                                                        ['postgresql', 'pgsql', 'postgres'].includes(
                                                            (db.database_type || '').toLowerCase(),
                                                        ) && (
                                                            <DropdownMenuItem
                                                                onClick={() => void openPhpPgAdmin(db.id)}
                                                                className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                            >
                                                                <ExternalLink className='h-4 w-4 text-blue-500' />
                                                                <span className='font-bold'>phpPgAdmin</span>
                                                            </DropdownMenuItem>
                                                        )}
                                                    {canReset && (
                                                        <DropdownMenuItem
                                                            onClick={() => void resetPassword(db.id)}
                                                            className='flex cursor-pointer items-center gap-3 rounded-xl p-3'
                                                        >
                                                            <KeyRound className='h-4 w-4 text-amber-500' />
                                                            <span className='font-bold'>
                                                                {t('webSpaces.databases.resetPassword')}
                                                            </span>
                                                        </DropdownMenuItem>
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
                                                                    {t('webSpaces.databases.deleteConfirm')}
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
                </div>

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
                                id='remember-choice-ws'
                                checked={rememberSensitiveChoice}
                                onCheckedChange={(checked) => setRememberSensitiveChoice(checked === true)}
                                className='h-6 w-6'
                            />
                            <div className='space-y-0.5'>
                                <label
                                    htmlFor='remember-choice-ws'
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
                                                value: String(viewingDatabase.database_port || ''),
                                            },
                                            {
                                                label: t('serverDatabases.type'),
                                                value: viewingDatabase.database_type || '',
                                            },
                                        ].map((item) => (
                                            <div key={item.label} className='space-y-2'>
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
                                                    value={
                                                        viewingDatabase.password &&
                                                        viewingDatabase.password !== '[REDACTED]'
                                                            ? viewingDatabase.password
                                                            : ''
                                                    }
                                                    className='bg-card border-border/50 pr-10 font-mono text-xs'
                                                />
                                                {viewingDatabase.password &&
                                                    viewingDatabase.password !== '[REDACTED]' && (
                                                        <Button
                                                            variant='glass'
                                                            size='sm'
                                                            className='absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2 bg-white/10 p-0 opacity-0 transition-opacity group-hover:opacity-100'
                                                            onClick={() =>
                                                                copyToClipboard(viewingDatabase.password || '')
                                                            }
                                                        >
                                                            <Copy className='h-3.5 w-3.5' />
                                                        </Button>
                                                    )}
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
                                {t('webSpaces.databases.confirmDeleteTitle')}
                            </DialogTitle>
                            <DialogDescription className='px-4 text-sm leading-relaxed opacity-70'>
                                {t('webSpaces.databases.confirmDeleteDescription', {
                                    database: databaseToDelete?.database || '',
                                })}
                            </DialogDescription>
                        </DialogHeader>
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
                                onClick={() => void handleDeleteDatabase()}
                                disabled={deletingId !== null}
                            >
                                {deletingId !== null ? (
                                    <Loader2 className='h-5 w-5 animate-spin' />
                                ) : (
                                    t('common.delete')
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
                </Dialog>
            </div>
        </WebSpacePageWidgets>
    );
}
