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

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import {
    AppWindow,
    Archive,
    ArrowLeft,
    ArrowLeftRight,
    Play,
    Square,
    RotateCcw,
    Terminal,
    RefreshCw,
    Network,
    Plus,
    Trash2,
    Download,
    Upload,
    Pencil,
    Folder,
    Calendar,
    Activity,
    Users,
    ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { cn } from '@/lib/utils';
import { useQuilldWebSocket } from '@/hooks/useQuilldWebSocket';
import { TransferWebSpaceDialog } from '@/components/admin/TransferWebSpaceDialog';

interface WebSpace {
    uuid: string;
    uuidShort?: string;
    name: string;
    domains?: string[];
    ssl?: boolean;
    dns_status?: string | null;
    status?: string;
    state?: string;
    backend_port?: number;
    web_node_id?: number;
    web_node_name?: string | null;
    webplate_name?: string | null;
    owner_id?: number | null;
}

interface BackupRow {
    uuid: string;
    bytes?: number;
    created_at?: string;
}

function extractLogText(payload: unknown): string {
    if (payload == null) return '';
    if (typeof payload === 'string') return payload;
    if (typeof payload === 'object') {
        const obj = payload as Record<string, unknown>;
        if (typeof obj.data === 'string') return obj.data;
        if (typeof obj.logs === 'string') return obj.logs;
        if (Array.isArray(obj.lines)) return obj.lines.map(String).join('\n');
        return JSON.stringify(payload, null, 2);
    }
    return String(payload);
}

export default function AdminWebSpaceDetailPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useParams();
    const uuid = String(params.uuid || '');
    const [tab, setTab] = useState<'overview' | 'console' | 'backups'>('overview');
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [space, setSpace] = useState<WebSpace | null>(null);
    const [logs, setLogs] = useState('');
    const [useHttpPoll, setUseHttpPoll] = useState(false);
    const [transferOpen, setTransferOpen] = useState(false);
    const [backups, setBackups] = useState<BackupRow[]>([]);
    const [command, setCommand] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const onWsFallback = useCallback(() => {
        setUseHttpPoll(true);
    }, []);

    const {
        lines: wsLines,
        isConnected: wsConnected,
        sendCommand,
    } = useQuilldWebSocket({
        jwtEndpoint: `/api/admin/webspaces/${uuid}/jwt`,
        enabled: tab === 'console' && !!uuid && !useHttpPoll,
        onFallback: onWsFallback,
        fallbackAfterMs: 3000,
    });

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/admin/webspaces/${uuid}`);
            setSpace((data.data?.webspace || data.data) as WebSpace);
        } catch (error) {
            console.error(error);
            toast.error(t('admin.webSpaces.messages.fetch_failed'));
            router.push('/admin/webspaces');
        } finally {
            setLoading(false);
        }
    }, [uuid, router, t]);

    const loadBackups = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/admin/webspaces/${uuid}/backups`);
            const list = (data.data?.backups || []) as BackupRow[];
            setBackups(Array.isArray(list) ? list : []);
        } catch {
            setBackups([]);
        }
    }, [uuid]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        if (tab === 'backups') void loadBackups();
    }, [tab, loadBackups]);

    useEffect(() => {
        if (tab !== 'console') {
            setUseHttpPoll(false);
            return;
        }
        if (!useHttpPoll) return;

        let cancelled = false;
        const poll = async () => {
            try {
                const { data } = await axios.get(`/api/admin/webspaces/${uuid}/logs`, {
                    params: { lines: 200 },
                });
                if (!cancelled) setLogs(extractLogText(data?.data) || t('admin.webSpaces.console.no_output'));
            } catch (error) {
                if (!cancelled) {
                    console.error(error);
                    setLogs(t('admin.webSpaces.console.fetch_failed'));
                }
            }
        };
        void poll();
        const id = setInterval(() => void poll(), 3000);
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, [tab, uuid, useHttpPoll, t]);

    const power = async (action: 'start' | 'stop' | 'restart') => {
        setBusy(action);
        try {
            const { data } = await axios.post(`/api/admin/webspaces/${uuid}/power`, { action });
            if (data?.data?.webspace) setSpace(data.data.webspace);
            toast.success(t('admin.webSpaces.messages.power_ok', { action }));
        } catch (error) {
            let msg = t('admin.webSpaces.messages.power_failed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setBusy(null);
        }
    };

    const reinstall = async () => {
        if (!confirm(t('admin.webSpaces.messages.reinstall_confirm'))) return;
        setBusy('reinstall');
        try {
            const { data } = await axios.post(`/api/admin/webspaces/${uuid}/reinstall`, {
                wipe_files: true,
                start_on_completion: true,
            });
            if (data?.data?.webspace) setSpace(data.data.webspace);
            toast.success(t('admin.webSpaces.messages.reinstall_started'));
        } catch (error) {
            let msg = t('admin.webSpaces.messages.reinstall_failed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setBusy(null);
        }
    };

    const checkDns = async () => {
        setBusy('dns');
        try {
            const { data } = await axios.post(`/api/admin/webspaces/${uuid}/dns-check`);
            if (data?.data?.webspace) setSpace(data.data.webspace);
            toast.success(t('admin.webSpaces.messages.dns_check_ok'));
        } catch (error) {
            let msg = t('admin.webSpaces.messages.dns_check_failed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setBusy(null);
        }
    };

    const createBackup = async () => {
        setBusy('backup');
        try {
            await axios.post(`/api/admin/webspaces/${uuid}/backup`, {});
            toast.success(t('admin.webSpaces.messages.backup_created'));
            await loadBackups();
        } catch (error) {
            toast.error(
                isAxiosError(error)
                    ? error.response?.data?.message || t('admin.webSpaces.messages.backup_failed')
                    : t('admin.webSpaces.messages.backup_failed'),
            );
        } finally {
            setBusy(null);
        }
    };

    const restoreBackup = async (backupUuid: string) => {
        if (!confirm(t('admin.webSpaces.messages.restore_confirm'))) return;
        setBusy(backupUuid);
        try {
            await axios.post(`/api/admin/webspaces/${uuid}/backups/${backupUuid}/restore`);
            toast.success(t('admin.webSpaces.messages.backup_restored'));
        } catch (error) {
            toast.error(
                isAxiosError(error)
                    ? error.response?.data?.message || t('admin.webSpaces.messages.restore_failed')
                    : t('admin.webSpaces.messages.restore_failed'),
            );
        } finally {
            setBusy(null);
        }
    };

    const deleteBackup = async (backupUuid: string) => {
        if (!confirm(t('admin.webSpaces.messages.delete_backup_confirm'))) return;
        setBusy(backupUuid);
        try {
            await axios.delete(`/api/admin/webspaces/${uuid}/backups/${backupUuid}`);
            toast.success(t('admin.webSpaces.messages.backup_deleted'));
            await loadBackups();
        } catch (error) {
            toast.error(
                isAxiosError(error)
                    ? error.response?.data?.message || t('admin.webSpaces.messages.delete_failed')
                    : t('admin.webSpaces.messages.delete_failed'),
            );
        } finally {
            setBusy(null);
        }
    };

    const downloadBackup = (backupUuid: string) => {
        window.open(`/api/admin/webspaces/${uuid}/backups/${backupUuid}/download`, '_blank');
    };

    const importBackup = async (file: File) => {
        setBusy('import');
        try {
            const formData = new FormData();
            formData.append('archive', file);
            await axios.post(`/api/admin/webspaces/${uuid}/backups/import`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success(t('admin.webSpaces.messages.backup_imported'));
            await loadBackups();
        } catch (error) {
            toast.error(
                isAxiosError(error)
                    ? error.response?.data?.message || t('admin.webSpaces.messages.import_failed')
                    : t('admin.webSpaces.messages.import_failed'),
            );
        } finally {
            setBusy(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const reconcileBackups = async () => {
        setBusy('reconcile');
        try {
            const { data } = await axios.post(`/api/admin/webspaces/${uuid}/backups/reconcile`);
            const count = data.data?.reconciled ?? data.reconciled ?? 0;
            toast.success(t('admin.webSpaces.messages.reconciled', { count }));
            await loadBackups();
        } catch (error) {
            toast.error(
                isAxiosError(error)
                    ? error.response?.data?.message || t('admin.webSpaces.messages.reconcile_failed')
                    : t('admin.webSpaces.messages.reconcile_failed'),
            );
        } finally {
            setBusy(null);
        }
    };

    if (loading || !space) {
        return <TableSkeleton count={3} />;
    }

    const state = space.state || 'stopped';
    const consoleText = useHttpPoll
        ? logs || t('admin.webSpaces.console.loading')
        : wsLines.length > 0
          ? wsLines.join('\n')
          : wsConnected
            ? t('admin.webSpaces.console.waiting')
            : t('admin.webSpaces.console.connecting');

    const canSend = tab === 'console' && !useHttpPoll && wsConnected;

    const onConsoleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!canSend || !command.trim()) return;
        sendCommand(command);
        setCommand('');
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={space.name}
                description={t('admin.webSpaces.detail.header_meta', {
                    node: space.web_node_name || t('admin.webSpaces.detail.node_fallback'),
                    plate: space.webplate_name || t('admin.webSpaces.detail.plate_fallback'),
                    uuid,
                })}
                icon={AppWindow}
                actions={
                    <div className='flex gap-2'>
                        <Button variant='outline' onClick={() => router.push(`/admin/webspaces/${uuid}/edit`)}>
                            <Pencil className='mr-2 h-4 w-4' />
                            {t('common.edit')}
                        </Button>
                        <Button variant='outline' onClick={() => router.push('/admin/webspaces')}>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('common.back')}
                        </Button>
                    </div>
                }
            />

            <nav className='border-border flex flex-wrap gap-1 border-b pb-2'>
                {(
                    [
                        { id: 'overview', labelKey: 'admin.webSpaces.nav.overview', icon: AppWindow },
                        { id: 'console', labelKey: 'admin.webSpaces.nav.console', icon: Terminal },
                        { id: 'backups', labelKey: 'admin.webSpaces.nav.backups', icon: Archive },
                    ] as const
                ).map((item) => (
                    <button
                        key={item.id}
                        type='button'
                        onClick={() => setTab(item.id)}
                        className={cn(
                            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium',
                            tab === item.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
                        )}
                    >
                        <item.icon className='h-3.5 w-3.5' />
                        {t(item.labelKey)}
                    </button>
                ))}
                {(() => {
                    const short =
                        space?.uuidShort ||
                        (space?.uuid ? space.uuid.replace(/-/g, '').slice(0, 8) : uuid.replace(/-/g, '').slice(0, 8));
                    const links = [
                        { href: `/webspace/${short}/files`, labelKey: 'admin.webSpaces.nav.files', icon: Folder },
                        {
                            href: `/webspace/${short}/schedules`,
                            labelKey: 'admin.webSpaces.nav.schedules',
                            icon: Calendar,
                        },
                        {
                            href: `/webspace/${short}/activities`,
                            labelKey: 'admin.webSpaces.nav.activity',
                            icon: Activity,
                        },
                        { href: `/webspace/${short}/users`, labelKey: 'admin.webSpaces.nav.users', icon: Users },
                    ];
                    return links.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className='text-muted-foreground hover:bg-muted flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium'
                        >
                            <item.icon className='h-3.5 w-3.5' />
                            {t(item.labelKey)}
                            <ExternalLink className='h-3 w-3 opacity-60' />
                        </Link>
                    ));
                })()}
            </nav>

            {tab === 'overview' ? (
                <div className='space-y-4'>
                    <div className='flex flex-wrap gap-2'>
                        {state !== 'running' ? (
                            <Button
                                size='sm'
                                loading={busy === 'start'}
                                disabled={!!busy}
                                onClick={() => void power('start')}
                            >
                                <Play className='mr-1.5 h-3.5 w-3.5' />
                                {t('admin.webSpaces.power.start')}
                            </Button>
                        ) : (
                            <Button
                                size='sm'
                                variant='outline'
                                loading={busy === 'stop'}
                                disabled={!!busy}
                                onClick={() => void power('stop')}
                            >
                                <Square className='mr-1.5 h-3.5 w-3.5' />
                                {t('admin.webSpaces.power.stop')}
                            </Button>
                        )}
                        <Button
                            size='sm'
                            variant='outline'
                            loading={busy === 'restart'}
                            disabled={!!busy}
                            onClick={() => void power('restart')}
                        >
                            <RotateCcw className='mr-1.5 h-3.5 w-3.5' />
                            {t('admin.webSpaces.power.restart')}
                        </Button>
                        <Button
                            size='sm'
                            variant='outline'
                            loading={busy === 'reinstall'}
                            disabled={!!busy}
                            onClick={() => void reinstall()}
                        >
                            <RefreshCw className='mr-1.5 h-3.5 w-3.5' />
                            {t('admin.webSpaces.detail.reinstall')}
                        </Button>
                        <Button
                            size='sm'
                            variant='outline'
                            loading={busy === 'dns'}
                            disabled={!!busy}
                            onClick={() => void checkDns()}
                        >
                            <Network className='mr-1.5 h-3.5 w-3.5' />
                            {t('admin.webSpaces.detail.check_dns')}
                        </Button>
                        <Button size='sm' variant='outline' disabled={!!busy} onClick={() => setTransferOpen(true)}>
                            <ArrowLeftRight className='mr-1.5 h-3.5 w-3.5' />
                            {t('admin.webSpaces.detail.transfer')}
                        </Button>
                    </div>

                    <PageCard title={t('admin.webSpaces.detail.details')} icon={AppWindow}>
                        <dl className='grid grid-cols-1 gap-3 text-sm sm:grid-cols-2'>
                            <div>
                                <dt className='text-muted-foreground'>{t('common.status')}</dt>
                                <dd className='font-medium'>{space.status}</dd>
                            </div>
                            <div>
                                <dt className='text-muted-foreground'>{t('admin.webSpaces.detail.state')}</dt>
                                <dd className='font-medium'>{state}</dd>
                            </div>
                            <div>
                                <dt className='text-muted-foreground'>{t('admin.webSpaces.detail.dns')}</dt>
                                <dd className='font-medium'>
                                    {space.dns_status || t('admin.webSpaces.detail.dns_unchecked')}
                                </dd>
                            </div>
                            <div>
                                <dt className='text-muted-foreground'>{t('admin.webSpaces.detail.owner_id')}</dt>
                                <dd className='font-medium'>{space.owner_id ?? t('common.not_available')}</dd>
                            </div>
                            <div className='sm:col-span-2'>
                                <dt className='text-muted-foreground'>{t('admin.webSpaces.detail.domains')}</dt>
                                <dd className='font-mono text-xs'>
                                    {(space.domains || []).join(', ') || t('admin.webSpaces.detail.none')}
                                </dd>
                            </div>
                        </dl>
                    </PageCard>
                </div>
            ) : tab === 'console' ? (
                <div className='space-y-3'>
                    <pre className='max-h-[70vh] overflow-auto rounded-xl bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-100'>
                        {consoleText}
                    </pre>
                    <form onSubmit={onConsoleSubmit} className='flex gap-2'>
                        <input
                            type='text'
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            disabled={!canSend}
                            placeholder={
                                canSend
                                    ? t('admin.webSpaces.console.command_placeholder')
                                    : t('admin.webSpaces.console.ws_required')
                            }
                            className='flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 placeholder:text-zinc-500 disabled:opacity-50'
                            autoComplete='off'
                            spellCheck={false}
                        />
                        <Button type='submit' size='sm' disabled={!canSend || !command.trim()}>
                            {t('admin.webSpaces.console.send')}
                        </Button>
                    </form>
                </div>
            ) : (
                <div className='space-y-4'>
                    <div className='flex justify-end gap-2'>
                        <input
                            ref={fileInputRef}
                            type='file'
                            accept='.tar.gz,.tgz,application/gzip'
                            className='hidden'
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void importBackup(file);
                            }}
                        />
                        <Button
                            size='sm'
                            variant='outline'
                            loading={busy === 'import'}
                            disabled={!!busy}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className='mr-1.5 h-3.5 w-3.5' />
                            {t('admin.webSpaces.backups_ui.import')}
                        </Button>
                        <Button
                            size='sm'
                            variant='outline'
                            loading={busy === 'reconcile'}
                            disabled={!!busy}
                            onClick={() => void reconcileBackups()}
                        >
                            <RefreshCw className='mr-1.5 h-3.5 w-3.5' />
                            {t('admin.webSpaces.backups_ui.reconcile')}
                        </Button>
                        <Button
                            size='sm'
                            loading={busy === 'backup'}
                            disabled={!!busy}
                            onClick={() => void createBackup()}
                        >
                            <Plus className='mr-1.5 h-3.5 w-3.5' />
                            {t('admin.webSpaces.backups_ui.create')}
                        </Button>
                    </div>
                    {backups.length === 0 ? (
                        <p className='text-muted-foreground text-sm'>{t('admin.webSpaces.backups_ui.empty')}</p>
                    ) : (
                        <ul className='divide-border divide-y rounded-xl border'>
                            {backups.map((b) => (
                                <li
                                    key={b.uuid}
                                    className='flex flex-wrap items-center justify-between gap-3 px-4 py-3'
                                >
                                    <div>
                                        <p className='font-mono text-sm'>{b.uuid}</p>
                                        <p className='text-muted-foreground text-xs'>
                                            {b.bytes != null
                                                ? `${Math.round(b.bytes / 1024)} KB`
                                                : t('common.not_available')}
                                            {b.created_at ? ` · ${b.created_at}` : ''}
                                        </p>
                                    </div>
                                    <div className='flex gap-2'>
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            disabled={busy === b.uuid}
                                            onClick={() => downloadBackup(b.uuid)}
                                        >
                                            <Download className='mr-1 h-3.5 w-3.5' />
                                            {t('admin.webSpaces.backups_ui.download')}
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            disabled={busy === b.uuid}
                                            onClick={() => void restoreBackup(b.uuid)}
                                        >
                                            <RotateCcw className='mr-1 h-3.5 w-3.5' />
                                            {t('admin.webSpaces.backups_ui.restore')}
                                        </Button>
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            disabled={busy === b.uuid}
                                            onClick={() => void deleteBackup(b.uuid)}
                                        >
                                            <Trash2 className='mr-1 h-3.5 w-3.5' />
                                            {t('common.delete')}
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            <TransferWebSpaceDialog
                uuid={uuid}
                currentNodeId={space.web_node_id}
                open={transferOpen}
                onOpenChange={setTransferOpen}
                onCompleted={() => void load()}
            />
        </div>
    );
}
