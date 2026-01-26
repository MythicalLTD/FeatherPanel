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
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/ui/button';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import axios from 'axios';
import {
    Activity,
    Database,
    RefreshCw,
    Play,
    Terminal,
    Download,
    Trash2,
    Wrench,
    AlertTriangle,
    Server,
    Network,
    HardDrive,
    Info,
} from 'lucide-react';
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

    // State
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<DatabaseStatus | null>(null);
    const [migRunning, setMigRunning] = useState(false);
    const [migOutput, setMigOutput] = useState('');
    const [pmaInstalling, setPmaInstalling] = useState(false);
    const [pmaDeleting, setPmaDeleting] = useState(false);
    const [pmaInstalled, setPmaInstalled] = useState(false);
    const [pmaStatusLoading, setPmaStatusLoading] = useState(false);

    // Plugin Widgets
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
            toast.error(t('admin.database_management.toasts.failed_status'));
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
        } finally {
            setPmaStatusLoading(false);
        }
    }, []);

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
            setMigOutput(`Error: ${error}`);
            toast.error(t('admin.database_management.migrations.failed'));
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
                toast.error(response.data.message || t('admin.database_management.toasts.failed_install'));
            }
        } catch (error) {
            console.error(error);
            toast.error(t('admin.database_management.toasts.failed_install'));
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
                toast.error(response.data.message || t('admin.database_management.toasts.failed_delete'));
            }
        } catch (error) {
            console.error(error);
            toast.error(t('admin.database_management.toasts.failed_delete'));
        } finally {
            setPmaDeleting(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        checkPhpMyAdminStatus();
    }, [fetchStatus, checkPhpMyAdminStatus]);

    // Helper for cards
    const StatItem = ({ label, value }: { label: string; value: string | number }) => (
        <div className='flex justify-between items-center py-1'>
            <span className='text-sm text-muted-foreground'>{label}</span>
            <span className='font-mono text-sm'>{value}</span>
        </div>
    );

    return (
        <div className='space-y-6 p-6'>
            <WidgetRenderer widgets={getWidgets('admin-databases-management', 'top-of-page')} />

            <PageHeader
                title={t('admin.database_management.title')}
                description={t('admin.database_management.subtitle')}
                icon={Database}
                actions={
                    <div className='flex flex-wrap gap-2'>
                        <Button
                            variant='outline'
                            onClick={fetchStatus}
                            disabled={loading}
                            className='bg-card hover:bg-card/80'
                        >
                            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            {t('admin.database_management.actions.refresh')}
                        </Button>
                        <Button onClick={runMigrations} disabled={migRunning}>
                            <Play className='mr-2 h-4 w-4' />
                            {t('admin.database_management.actions.run_migrations')}
                        </Button>
                        {pmaInstalled ? (
                            <Button
                                variant='destructive'
                                onClick={deletePhpMyAdmin}
                                disabled={pmaDeleting || pmaStatusLoading}
                            >
                                <Trash2 className='mr-2 h-4 w-4' />
                                {t('admin.database_management.actions.delete_pma')}
                            </Button>
                        ) : (
                            <Button
                                variant='outline'
                                onClick={installPhpMyAdmin}
                                disabled={pmaInstalling || pmaStatusLoading}
                            >
                                <Download className='mr-2 h-4 w-4' />
                                {t('admin.database_management.actions.install_pma')}
                            </Button>
                        )}
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-databases-management', 'after-header')} />

            {status && (
                <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in-up'>
                    <PageCard title={t('admin.database_management.stats.overview')} icon={Server}>
                        <div className='space-y-2'>
                            <StatItem label={t('admin.database_management.stats.engine')} value={status.engine} />
                            <StatItem label={t('admin.database_management.stats.version')} value={status.version} />
                            <StatItem
                                label={t('admin.database_management.stats.uptime')}
                                value={`${status.uptime_seconds}s`}
                            />
                            <StatItem label={t('admin.database_management.stats.qps')} value={status.qps.toFixed(2)} />
                        </div>
                    </PageCard>

                    <PageCard title={t('admin.database_management.stats.connections')} icon={Network}>
                        <div className='space-y-2'>
                            <StatItem
                                label={t('admin.database_management.stats.threads_connected')}
                                value={status.threads_connected}
                            />
                            <StatItem
                                label={t('admin.database_management.stats.threads_running')}
                                value={status.threads_running}
                            />
                            <StatItem
                                label={t('admin.database_management.stats.connections_total')}
                                value={status.connections_total}
                            />
                            <StatItem
                                label={t('admin.database_management.stats.aborted_connects')}
                                value={status.aborted_connects}
                            />
                        </div>
                    </PageCard>

                    <PageCard title={t('admin.database_management.stats.queries')} icon={Database}>
                        <div className='space-y-2'>
                            <StatItem
                                label={t('admin.database_management.stats.queries_total')}
                                value={status.queries_total}
                            />
                            <StatItem
                                label={t('admin.database_management.stats.questions_total')}
                                value={status.questions_total}
                            />
                        </div>
                    </PageCard>

                    <PageCard title={t('admin.database_management.stats.network')} icon={HardDrive}>
                        <div className='space-y-2'>
                            <StatItem
                                label={t('admin.database_management.stats.bytes_received')}
                                value={status.bytes_received}
                            />
                            <StatItem
                                label={t('admin.database_management.stats.bytes_sent')}
                                value={status.bytes_sent}
                            />
                        </div>
                    </PageCard>
                </div>
            )}

            {loading && !status && (
                <div className='flex h-64 items-center justify-center rounded-xl border border-dashed text-muted-foreground'>
                    <RefreshCw className='mr-2 h-5 w-5 animate-spin' />
                    {t('admin.database_management.actions.loading_status')}
                </div>
            )}

            <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                    <h2 className='text-lg font-semibold flex items-center gap-2'>
                        <Terminal className='h-5 w-5' />
                        {t('admin.database_management.migrations.title')}
                    </h2>
                    {migOutput && (
                        <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => setMigOutput('')}
                            className='text-xs text-muted-foreground hover:text-foreground'
                        >
                            {t('admin.database_management.actions.clear_output')}
                        </Button>
                    )}
                </div>
                <div
                    className={`rounded-xl border bg-black p-4 font-mono text-xs text-green-400 shadow-inner min-h-[150px] max-h-[400px] overflow-auto whitespace-pre-wrap transition-all ${migOutput ? 'opacity-100' : 'opacity-50'}`}
                >
                    {migOutput || (
                        <span className='text-muted-foreground/50 select-none'>
                            {'//'} {t('admin.database_management.migrations.running')}
                        </span>
                    )}
                </div>
            </div>

            <div className='grid gap-6 md:grid-cols-3'>
                <PageCard title={t('admin.database_management.help.what_is.title')} icon={Info} className='h-full'>
                    <p className='text-sm text-muted-foreground'>
                        {t('admin.database_management.help.what_is.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.database_management.help.metrics.title')} icon={Activity} className='h-full'>
                    <p className='text-sm text-muted-foreground'>
                        {t('admin.database_management.help.metrics.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.database_management.help.migrations.title')} icon={Wrench} className='h-full'>
                    <p className='text-sm text-muted-foreground'>
                        {t('admin.database_management.help.migrations.description')}
                    </p>
                </PageCard>
            </div>

            <div className='rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 flex gap-4'>
                <AlertTriangle className='h-5 w-5 text-amber-500 shrink-0' />
                <div className='space-y-1'>
                    <h3 className='font-semibold text-amber-500 text-sm'>
                        {t('admin.database_management.help.safety.title')}
                    </h3>
                    <p className='text-sm text-amber-500/80'>
                        {t('admin.database_management.help.safety.description')}
                    </p>
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-databases-management', 'bottom-of-page')} />
        </div>
    );
}
