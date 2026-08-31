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

import { Button } from '@/components/featherui/Button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, RotateCw, Loader2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useState } from 'react';
import { displayWebSpaceStatus } from '@/lib/webspace-utils';

interface WebSpaceHeaderProps {
    name: string;
    state?: string | null;
    status?: string | null;
    uuidShort?: string;
    uuid?: string;
    nodeName?: string | null;
    plateName?: string | null;
    dnsStatus?: string | null;
    canStart?: boolean;
    canStop?: boolean;
    canRestart?: boolean;
    busy?: string | null;
    connectionLive?: boolean;
    onStart?: () => void | Promise<void>;
    onStop?: () => void | Promise<void>;
    onRestart?: () => void | Promise<void>;
}

function getStatusColor(status: string) {
    switch (status) {
        case 'running':
            return 'bg-green-500/10 text-green-500 border-green-500/20';
        case 'starting':
        case 'installing':
        case 'reinstalling':
            return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        case 'stopping':
        case 'transferring':
            return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
        case 'offline':
        case 'stopped':
            return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        case 'failed':
        case 'error':
            return 'bg-red-600/20 text-red-600 border-red-600/40';
        case 'suspended':
            return 'bg-red-500/20 text-red-500 border-red-500/30';
        default:
            return 'bg-muted text-muted-foreground border-border';
    }
}

export function WebSpaceHeader({
    name,
    state,
    status,
    uuidShort,
    uuid,
    nodeName,
    plateName,
    dnsStatus,
    canStart = false,
    canStop = false,
    canRestart = false,
    busy = null,
    connectionLive = true,
    onStart,
    onStop,
    onRestart,
}: WebSpaceHeaderProps) {
    const { t } = useTranslation();
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const runtime = state || 'stopped';
    const loading = actionLoading || busy;
    const lifecycleActive = !!status && ['installing', 'reinstalling', 'failed', 'transferring'].includes(status);
    const headerStatus = displayWebSpaceStatus({
        status: status ?? undefined,
        state: runtime,
        suspended: status === 'suspended' ? 1 : 0,
    });
    const displayState = lifecycleActive ? status! : headerStatus;

    const run = async (key: string, cb?: () => void | Promise<void>) => {
        if (!cb) return;
        setActionLoading(key);
        try {
            await cb();
        } finally {
            setActionLoading(null);
        }
    };

    const isOfflineStatus = (value: string) => value === 'stopped' || value === 'offline';
    const isRunningStatus = (value: string) => value === 'running' || value === 'starting';

    return (
        <div className='border-border/50 bg-card/50 overflow-hidden rounded-xl border backdrop-blur-xl'>
            <div className='flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5'>
                <div className='min-w-0 space-y-2'>
                    <h1 className='truncate text-xl font-bold tracking-tight sm:text-2xl md:text-3xl'>{name}</h1>
                    <div className='text-muted-foreground flex flex-wrap items-center gap-2 text-sm sm:gap-3'>
                        <Badge className={getStatusColor(displayState)}>
                            {t(`servers.status.${displayState}`, { defaultValue: displayState.toUpperCase() })}
                        </Badge>
                        {status && status !== displayState && status !== 'installed' && (
                            <span className='bg-muted/50 border-border/50 truncate rounded-md border px-2 py-0.5 text-xs font-medium'>
                                {status}
                            </span>
                        )}
                        {plateName && (
                            <span className='bg-muted/50 border-border/50 truncate rounded-md border px-2 py-0.5 text-xs font-medium'>
                                {plateName}
                            </span>
                        )}
                        {uuidShort && (
                            <span className='flex items-center gap-1'>
                                <span className='opacity-50'>#</span>
                                <code className='bg-muted rounded px-1 font-mono text-xs'>{uuidShort}</code>
                            </span>
                        )}
                        {nodeName && (
                            <span className='bg-muted/50 border-border/50 flex items-center gap-1.5 rounded-md border px-2 py-0.5'>
                                <span className='opacity-50'>{t('webSpaces.webNode')}:</span>
                                <span className='font-medium'>{nodeName}</span>
                            </span>
                        )}
                        {dnsStatus && dnsStatus !== 'dns_ok' && (
                            <span className='bg-muted/50 border-border/50 rounded-md border px-2 py-0.5 text-xs font-medium'>
                                DNS: {dnsStatus}
                            </span>
                        )}
                    </div>
                    {uuid && <p className='text-muted-foreground/50 hidden font-mono text-xs sm:block'>UUID: {uuid}</p>}
                </div>

                <div className='grid grid-cols-2 gap-2 sm:flex sm:flex-wrap'>
                    {canStart && (
                        <Button
                            variant='outline'
                            size='sm'
                            disabled={!!loading || (connectionLive ? !isOfflineStatus(runtime) : false)}
                            onClick={() => void run('start', onStart)}
                            className='flex items-center gap-2 border-emerald-600/40 bg-emerald-600 text-white hover:bg-emerald-600/90 hover:text-white disabled:border-emerald-600/20 disabled:bg-emerald-600/40 disabled:text-white/70'
                        >
                            {loading === 'start' ? (
                                <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                                <Play className='h-4 w-4' />
                            )}
                            <span>{t('webSpaces.power.start')}</span>
                        </Button>
                    )}
                    {canRestart && (
                        <Button
                            variant='outline'
                            size='sm'
                            disabled={!!loading || (connectionLive ? !isRunningStatus(runtime) : false)}
                            onClick={() => void run('restart', onRestart)}
                            className='flex items-center gap-2 border-sky-600/40 bg-sky-600 text-white hover:bg-sky-600/90 hover:text-white disabled:border-sky-600/20 disabled:bg-sky-600/40 disabled:text-white/70'
                        >
                            {loading === 'restart' ? (
                                <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                                <RotateCw className='h-4 w-4' />
                            )}
                            <span>{t('webSpaces.power.restart')}</span>
                        </Button>
                    )}
                    {canStop && (
                        <Button
                            variant='outline'
                            size='sm'
                            disabled={!!loading || (connectionLive ? !isRunningStatus(runtime) : false)}
                            onClick={() => void run('stop', onStop)}
                            className='flex items-center gap-2 border-orange-600/40 bg-orange-600 text-white hover:bg-orange-600/90 hover:text-white disabled:border-orange-600/20 disabled:bg-orange-600/40 disabled:text-white/70'
                        >
                            {loading === 'stop' ? (
                                <Loader2 className='h-4 w-4 animate-spin' />
                            ) : (
                                <Square className='h-4 w-4' />
                            )}
                            <span>{t('webSpaces.power.stop')}</span>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
