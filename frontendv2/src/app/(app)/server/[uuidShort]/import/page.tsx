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

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DownloadCloud, Loader2, AlertTriangle, Clock, CheckCircle, XCircle, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { PageHeader } from '@/components/featherui/PageHeader';
import { EmptyState } from '@/components/featherui/EmptyState';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { formatDate } from '@/lib/utils';
import axios from 'axios';
import { toast } from 'sonner';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { cn, isEnabled } from '@/lib/utils';
import type { ImportItem, ImportsResponse } from '@/types/server';

export default function ServerImportPage() {
    const { uuidShort } = useParams();
    const router = useRouter();
    const { t } = useTranslation();
    const { settings, loading: settingsLoading } = useSettings();
    const { hasPermission, loading: permissionsLoading } = useServerPermissions(uuidShort as string);
    const canManage = hasPermission('settings.import') || hasPermission('file.create');

    const [imports, setImports] = React.useState<ImportItem[]>([]);
    const [loading, setLoading] = React.useState(true);

    const { getWidgets, fetchWidgets } = usePluginWidgets('server-import');

    const fetchImports = React.useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await axios.get<ImportsResponse>(`/api/user/servers/${uuidShort}/imports`);
            if (data.success) {
                setImports(data.data.imports);
            }
        } catch (error) {
            console.error('Failed to fetch imports:', error);
            toast.error(t('serverImport.fetchFailed'));
        } finally {
            setLoading(false);
        }
    }, [uuidShort, t]);

    React.useEffect(() => {
        fetchImports();
        fetchWidgets();
    }, [fetchImports, fetchWidgets]);

    const getStatusConfig = (status: ImportItem['status']) => {
        switch (status) {
            case 'completed':
                return {
                    icon: CheckCircle,
                    color: 'text-emerald-500',
                    bg: 'bg-emerald-500/10',
                    border: 'border-emerald-500/20',
                    label: t('common.completed'),
                    wrapperClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
                };
            case 'failed':
                return {
                    icon: XCircle,
                    color: 'text-red-500',
                    bg: 'bg-red-500/10',
                    border: 'border-red-500/20',
                    label: t('common.failed'),
                    wrapperClass: 'bg-red-500/10 border-red-500/20 text-red-500',
                };
            case 'importing':
                return {
                    icon: Loader2,
                    color: 'text-blue-500',
                    bg: 'bg-blue-500/10',
                    border: 'border-blue-500/20',
                    label: t('common.importing'),
                    spin: true,
                    wrapperClass: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
                };
            default:
                return {
                    icon: Clock,
                    color: 'text-yellow-500',
                    bg: 'bg-yellow-500/10',
                    border: 'border-yellow-500/20',
                    label: t('common.pending'),
                    wrapperClass: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500',
                };
        }
    };

    const isImportEnabled = isEnabled(settings?.server_allow_user_made_import);
    const showHeaderCreateAction = isImportEnabled && canManage && imports.length > 0;

    if (permissionsLoading || settingsLoading) {
        return (
            <div className='flex items-center justify-center p-12'>
                <Loader2 className='text-primary h-8 w-8 animate-spin' />
            </div>
        );
    }

    return (
        <div className='space-y-8'>
            <WidgetRenderer widgets={getWidgets('server-import', 'top-of-page')} />
            <PageHeader
                title={t('serverImport.title')}
                description={t('serverImport.description')}
                actions={
                    <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3'>
                        {showHeaderCreateAction && (
                            <Button
                                size='default'
                                variant='default'
                                onClick={() => router.push(`/server/${uuidShort}/import/new`)}
                                className='order-1 w-full sm:order-2 sm:w-auto'
                            >
                                <Plus className='mr-2 h-5 w-5' />
                                {t('serverImport.createImport')}
                            </Button>
                        )}
                        <Button
                            variant='glass'
                            size='default'
                            onClick={fetchImports}
                            disabled={loading}
                            className='order-2 sm:order-1'
                            aria-label={t('common.refresh')}
                        >
                            <RefreshCw className={cn('h-5 w-5 sm:mr-2', loading && 'animate-spin')} />
                            <span className='hidden sm:inline'>{t('common.refresh')}</span>
                        </Button>
                    </div>
                }
            />
            <WidgetRenderer widgets={getWidgets('server-import', 'after-header')} />

            {!isImportEnabled && (
                <div className='flex items-center gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4'>
                    <AlertTriangle className='h-5 w-5 shrink-0 text-yellow-500' />
                    <p className='text-sm font-medium text-yellow-500/90'>
                        {t('serverImport.featureDisabledDescription')}
                    </p>
                </div>
            )}

            <WidgetRenderer widgets={getWidgets('server-import', 'before-imports-list')} />

            {imports.length === 0 ? (
                <EmptyState
                    title={t('serverImport.noImports')}
                    description={t('serverImport.noImportsDescription')}
                    icon={DownloadCloud}
                    action={
                        isImportEnabled &&
                        canManage && (
                            <Button
                                size='default'
                                variant='default'
                                onClick={() => router.push(`/server/${uuidShort}/import/new`)}
                            >
                                <Plus className='mr-2 h-6 w-6' />
                                {t('serverImport.createImport')}
                            </Button>
                        )
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-4'>
                    {imports.map((item) => {
                        const statusConfig = getStatusConfig(item.status);

                        return (
                            <ResourceCard
                                key={item.id}
                                icon={statusConfig.icon}
                                iconWrapperClassName={statusConfig.wrapperClass}
                                iconClassName={statusConfig.spin ? 'animate-spin' : ''}
                                title={item.host}
                                description={
                                    <div className='flex flex-col gap-1'>
                                        <span className='text-muted-foreground text-xs font-medium tracking-wider uppercase opacity-60'>
                                            {item.user} @ {item.type.toUpperCase()} ({item.port})
                                        </span>
                                        {item.error && (
                                            <span className='text-xs font-medium text-red-500/80'>{item.error}</span>
                                        )}
                                    </div>
                                }
                                badges={[
                                    {
                                        label: statusConfig.label,
                                        className: cn(statusConfig.bg, statusConfig.border, statusConfig.color),
                                    },
                                    {
                                        label: formatDate(item.created_at),
                                        className: 'bg-background/50 border border-border/40 text-muted-foreground',
                                    },
                                ]}
                                actions={
                                    <div className='text-muted-foreground flex items-center gap-4 text-xs'>
                                        <div className='flex flex-col items-end'>
                                            <span className='text-foreground/80 font-medium'>
                                                {item.source_location}
                                            </span>
                                            <span className='text-[10px] tracking-wider uppercase opacity-50'>
                                                {t('serverImport.source')}
                                            </span>
                                        </div>
                                        <span className='text-muted-foreground/30'>→</span>
                                        <div className='flex flex-col items-start'>
                                            <span className='text-foreground/80 font-medium'>
                                                {item.destination_location}
                                            </span>
                                            <span className='text-[10px] tracking-wider uppercase opacity-50'>
                                                {t('serverImport.destination')}
                                            </span>
                                        </div>
                                    </div>
                                }
                            />
                        );
                    })}
                </div>
            )}

            <WidgetRenderer widgets={getWidgets('server-import', 'after-imports-list')} />
            <WidgetRenderer widgets={getWidgets('server-import', 'bottom-of-page')} />
        </div>
    );
}
