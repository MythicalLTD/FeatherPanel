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

import { TipCard, TipGrid } from '@/components/featherui/TipCard';
import { useState, useEffect, useCallback, type ComponentType } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage, getApiErrorMessageFromPayload } from '@/lib/api-errors';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import axios from 'axios';
import {
    Activity,
    AlertTriangle,
    ArrowDownUp,
    Clock,
    Database,
    Download,
    ExternalLink,
    Gauge,
    Info,
    KeyRound,
    MousePointerClick,
    Network,
    Play,
    RefreshCw,
    Server,
    TableProperties,
    Terminal,
    Trash2,
    Users,
    Wrench,
} from 'lucide-react';
import { StatusDot } from '@/components/featherui/DataTable';
import { formatBytes } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DatabaseStatus {
    engine: string;
    version: string;
    uptime_seconds: number;
    threads_connected: number;
    threads_running: number;
    connections_total: number;
    aborted_connects: number;
    queries_total: number;
    questions_total: number;
    qps: number;
    bytes_received: number;
    bytes_sent: number;
}

interface MigrationResponse {
    output: string;
}

interface PhpMyAdminStatusResponse {
    installed: boolean;
}

export default function DatabaseManagementPage() {
    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<DatabaseStatus | null>(null);
    const [migRunning, setMigRunning] = useState(false);
    const [migOutput, setMigOutput] = useState('');
    const [pmaInstalling, setPmaInstalling] = useState(false);
    const [pmaDeleting, setPmaDeleting] = useState(false);
    const [pmaInstalled, setPmaInstalled] = useState(false);
    const [pmaStatusLoading, setPmaStatusLoading] = useState(false);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-databases-management');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const fetchStatus = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get<{ success: boolean; data: DatabaseStatus }>(
                '/api/admin/databases/management/status',
            );
            if (response.data.success) {
                setStatus(response.data.data);
            } else {
                toast.error(t('admin.database_management.toasts.failed_status'));
            }
        } catch (error) {
            console.error(error);
            toast.error(getApiErrorMessage(error, t, 'admin.database_management.toasts.failed_status'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    const checkPhpMyAdminStatus = useCallback(async () => {
        setPmaStatusLoading(true);
        try {
            const response = await axios.get<{ success: boolean; data: PhpMyAdminStatusResponse }>(
                '/api/admin/databases/management/phpmyadmin/status',
            );
            if (response.data.success) {
                setPmaInstalled(response.data.data.installed);
            }
        } catch (error) {
            console.error(error);
            toast.error(getApiErrorMessage(error, t, 'admin.database_management.toasts.failed_status'));
        } finally {
            setPmaStatusLoading(false);
        }
    }, [t]);

    const runMigrations = async () => {
        setMigRunning(true);
        setMigOutput('');
        try {
            const response = await axios.post<{ success: boolean; data: MigrationResponse }>(
                '/api/admin/databases/management/migrate',
            );
            if (response.data.success) {
                setMigOutput(response.data.data.output || t('admin.database_management.migrations.success'));
                toast.success(t('admin.database_management.migrations.success'));
            } else {
                setMigOutput(t('admin.database_management.migrations.failed'));
                toast.error(t('admin.database_management.migrations.failed'));
            }
        } catch (error) {
            setMigOutput(getApiErrorMessage(error, t, 'admin.database_management.migrations.failed'));
            toast.error(getApiErrorMessage(error, t, 'admin.database_management.migrations.failed'));
        } finally {
            setMigRunning(false);
        }
    };

    const installPhpMyAdmin = async () => {
        setPmaInstalling(true);
        try {
            const response = await axios.post<{
                success: boolean;
                data: { already_installed: boolean };
                message?: string;
            }>('/api/admin/databases/management/install-phpmyadmin');
            if (response.data.success) {
                if (response.data.data.already_installed) {
                    toast.info(t('admin.database_management.pma.already_installed'));
                } else {
                    toast.success(t('admin.database_management.pma.installed_success'));
                }
                await checkPhpMyAdminStatus();
            } else {
                toast.error(
                    getApiErrorMessageFromPayload(response.data, t, 'admin.database_management.toasts.failed_install'),
                );
            }
        } catch (error) {
            console.error(error);
            toast.error(getApiErrorMessage(error, t, 'admin.database_management.toasts.failed_install'));
        } finally {
            setPmaInstalling(false);
        }
    };

    const deletePhpMyAdmin = async () => {
        if (!confirm(t('admin.database_management.pma.confirm_delete'))) {
            return;
        }

        setPmaDeleting(true);
        try {
            const response = await axios.delete<{ success: boolean; message: string }>(
                '/api/admin/databases/management/phpmyadmin',
            );
            if (response.data.success) {
                toast.success(t('admin.database_management.pma.deleted_success'));
                await checkPhpMyAdminStatus();
            } else {
                toast.error(
                    getApiErrorMessageFromPayload(response.data, t, 'admin.database_management.toasts.failed_delete'),
                );
            }
        } catch (error) {
            console.error(error);
            toast.error(getApiErrorMessage(error, t, 'admin.database_management.toasts.failed_delete'));
        } finally {
            setPmaDeleting(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        checkPhpMyAdminStatus();
    }, [fetchStatus, checkPhpMyAdminStatus]);

    const uptime = status ? formatUptime(status.uptime_seconds) : '';

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-databases-management', 'top-of-page')} />

            <PageHeader
                title={t('admin.database_management.title')}
                description={t('admin.database_management.subtitle')}
                icon={Database}
                actions={
                    <Button variant='outline' size='sm' onClick={fetchStatus} disabled={loading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('admin.database_management.actions.refresh')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-databases-management', 'after-header')} />

            <section className='fp-surface relative overflow-hidden rounded-2xl border p-5 sm:p-6'>
                <div className='flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between'>
                    <div className='flex min-w-0 gap-4'>
                        <div className='fp-icon-tile flex h-12 w-12 shrink-0 items-center justify-center rounded-xl'>
                            <TableProperties className='h-6 w-6' />
                        </div>
                        <div className='min-w-0 space-y-2'>
                            <div className='flex flex-wrap items-center gap-2'>
                                <h2 className='text-lg font-semibold tracking-tight'>
                                    {t('admin.database_management.pma.title')}
                                </h2>
                                {pmaStatusLoading ? null : pmaInstalled ? (
                                    <StatusDot tone='success'>
                                        {t('admin.database_management.pma.status_installed')}
                                    </StatusDot>
                                ) : (
                                    <StatusDot tone='muted'>
                                        {t('admin.database_management.pma.status_not_installed')}
                                    </StatusDot>
                                )}
                            </div>
                            <p className='text-muted-foreground max-w-2xl text-sm'>
                                {t('admin.database_management.pma.description')}
                            </p>
                            <ul className='grid gap-2 pt-1 text-sm sm:grid-cols-3'>
                                {[
                                    { icon: MousePointerClick, key: 'admin.database_management.pma.benefit_one_click' },
                                    { icon: KeyRound, key: 'admin.database_management.pma.benefit_auto_login' },
                                    { icon: Users, key: 'admin.database_management.pma.benefit_users' },
                                ].map((b) => (
                                    <li key={b.key} className='flex items-start gap-2'>
                                        <b.icon className='text-primary mt-0.5 h-4 w-4 shrink-0' />
                                        <span>{t(b.key)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className='flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-stretch'>
                        {pmaInstalled ? (
                            <>
                                <Button asChild>
                                    <a href='/pma/' target='_blank' rel='noreferrer'>
                                        <ExternalLink className='mr-2 h-4 w-4' />
                                        {t('admin.database_management.pma.open')}
                                    </a>
                                </Button>
                                <Button
                                    variant='destructive'
                                    size='sm'
                                    onClick={deletePhpMyAdmin}
                                    loading={pmaDeleting}
                                    disabled={pmaStatusLoading}
                                >
                                    <Trash2 className='mr-2 h-4 w-4' />
                                    {t('admin.database_management.actions.delete_pma')}
                                </Button>
                            </>
                        ) : (
                            <Button
                                size='lg'
                                onClick={installPhpMyAdmin}
                                loading={pmaInstalling}
                                disabled={pmaStatusLoading}
                            >
                                {!pmaInstalling ? <Download className='mr-2 h-4 w-4' /> : null}
                                {t('admin.database_management.actions.install_pma')}
                            </Button>
                        )}
                    </div>
                </div>
            </section>

            {loading && !status ? (
                <div className='grid grid-cols-2 gap-3 xl:grid-cols-4' aria-busy='true'>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className='fp-surface h-24 animate-pulse rounded-xl border' />
                    ))}
                </div>
            ) : null}

            {status ? (
                <>
                    <div className='grid grid-cols-2 gap-3 xl:grid-cols-4'>
                        <MetricTile
                            icon={Clock}
                            label={t('admin.database_management.stats.uptime')}
                            value={uptime}
                            hint={`${status.engine} ${status.version}`}
                        />
                        <MetricTile
                            icon={Gauge}
                            label={t('admin.database_management.stats.qps')}
                            value={status.qps.toFixed(2)}
                            hint={t('admin.database_management.stats.queries_hint', {
                                count: status.queries_total.toLocaleString(),
                            })}
                        />
                        <MetricTile
                            icon={Network}
                            label={t('admin.database_management.stats.connections')}
                            value={String(status.threads_connected)}
                            hint={t('admin.database_management.stats.running_hint', {
                                count: String(status.threads_running),
                            })}
                        />
                        <MetricTile
                            icon={ArrowDownUp}
                            label={t('admin.database_management.stats.network')}
                            value={formatBytes(status.bytes_sent)}
                            hint={t('admin.database_management.stats.received_hint', {
                                size: formatBytes(status.bytes_received),
                            })}
                        />
                    </div>

                    <PageCard title={t('admin.database_management.stats.details')} icon={Server}>
                        <dl className='grid gap-x-8 sm:grid-cols-2 xl:grid-cols-3'>
                            {[
                                [t('admin.database_management.stats.engine'), status.engine],
                                [t('admin.database_management.stats.version'), status.version],
                                [t('admin.database_management.stats.uptime'), uptime],
                                [t('admin.database_management.stats.threads_connected'), status.threads_connected],
                                [t('admin.database_management.stats.threads_running'), status.threads_running],
                                [t('admin.database_management.stats.connections_total'), status.connections_total],
                                [t('admin.database_management.stats.aborted_connects'), status.aborted_connects],
                                [t('admin.database_management.stats.queries_total'), status.queries_total],
                                [t('admin.database_management.stats.questions_total'), status.questions_total],
                                [
                                    t('admin.database_management.stats.bytes_received'),
                                    formatBytes(status.bytes_received),
                                ],
                                [t('admin.database_management.stats.bytes_sent'), formatBytes(status.bytes_sent)],
                            ].map(([label, value]) => (
                                <div
                                    key={String(label)}
                                    className='flex items-center justify-between gap-4 border-b border-[var(--fp-surface-border)] py-2.5 text-sm'
                                >
                                    <dt className='text-muted-foreground'>{label}</dt>
                                    <dd className='font-mono text-xs'>
                                        {typeof value === 'number' ? value.toLocaleString() : value}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </PageCard>
                </>
            ) : null}

            <PageCard
                title={t('admin.database_management.migrations.section_title')}
                description={t('admin.database_management.migrations.section_description')}
                icon={Terminal}
                action={
                    <div className='flex items-center gap-2'>
                        {migOutput ? (
                            <Button variant='ghost' size='sm' onClick={() => setMigOutput('')}>
                                {t('admin.database_management.actions.clear_output')}
                            </Button>
                        ) : null}
                        <Button size='sm' onClick={runMigrations} loading={migRunning}>
                            {!migRunning ? <Play className='mr-2 h-4 w-4' /> : null}
                            {t('admin.database_management.actions.run_migrations')}
                        </Button>
                    </div>
                }
            >
                <pre
                    className={cn(
                        'fp-surface-inset max-h-96 min-h-32 overflow-auto rounded-lg border p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap',
                        migOutput ? 'text-foreground/90' : 'text-muted-foreground',
                    )}
                >
                    {migRunning
                        ? t('admin.database_management.migrations.running')
                        : migOutput || t('admin.database_management.migrations.idle')}
                </pre>
            </PageCard>

            <TipGrid className='xl:grid-cols-4'>
                <TipCard title={t('admin.database_management.help.what_is.title')} icon={Info}>
                    <p>{t('admin.database_management.help.what_is.description')}</p>
                </TipCard>
                <TipCard title={t('admin.database_management.help.metrics.title')} icon={Activity}>
                    <p>{t('admin.database_management.help.metrics.description')}</p>
                </TipCard>
                <TipCard title={t('admin.database_management.help.migrations.title')} icon={Wrench}>
                    <p>{t('admin.database_management.help.migrations.description')}</p>
                </TipCard>
                <TipCard
                    title={t('admin.database_management.help.safety.title')}
                    icon={AlertTriangle}
                    variant='warning'
                >
                    <p>{t('admin.database_management.help.safety.description')}</p>
                </TipCard>
            </TipGrid>

            <WidgetRenderer widgets={getWidgets('admin-databases-management', 'bottom-of-page')} />
        </div>
    );
}

function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function MetricTile({
    icon: Icon,
    label,
    value,
    hint,
}: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    value: string;
    hint?: string;
}) {
    return (
        <div className='fp-surface min-w-0 rounded-xl border p-4'>
            <div className='text-muted-foreground flex items-center gap-2 text-xs font-medium'>
                <Icon className='text-primary h-4 w-4' />
                {label}
            </div>
            <div className='mt-2 truncate text-2xl font-semibold tracking-tight'>{value}</div>
            {hint ? <div className='text-muted-foreground mt-0.5 truncate text-xs'>{hint}</div> : null}
        </div>
    );
}
