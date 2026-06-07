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

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, RotateCw, Skull, Loader2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useState, useEffect } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ServerHeaderProps {
    serverName: string;
    serverStatus: string;
    serverUuid?: string;
    serverUuidShort?: string;
    nodeLocation?: string;
    nodeLocationFlag?: string;
    nodeName?: string;
    canStart?: boolean;
    canStop?: boolean;
    canRestart?: boolean;
    canKill?: boolean;
    /** When false, power buttons stay usable even if live status is stale (e.g. Wings disconnected). */
    connectionLive?: boolean;
    onStart?: () => void;
    onStop?: () => void;
    onRestart?: () => void;
    onKill?: () => void;
}

export default function ServerHeader({
    serverName,
    serverStatus,
    serverUuid,
    serverUuidShort,
    nodeLocation,
    nodeLocationFlag,
    nodeName,
    canStart = false,
    canStop = false,
    canRestart = false,
    canKill = false,
    connectionLive = true,
    onStart,
    onStop,
    onRestart,
    onKill,
}: ServerHeaderProps) {
    const { t } = useTranslation();
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showKillConfirm, setShowKillConfirm] = useState(false);
    const [dontAskAgain, setDontAskAgain] = useState(false);
    const [skipKillConfirm, setSkipKillConfirm] = useState(false);

    // Load "don't ask again" preference from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('featherpanel_skip_kill_confirm');
            setSkipKillConfirm(saved === 'true');
        }
    }, []);

    const handleAction = async (action: string, callback?: () => Promise<void> | void) => {
        if (!callback) return;

        // Show confirmation for kill action if not skipped
        if (action === 'kill' && !skipKillConfirm) {
            setShowKillConfirm(true);
            return;
        }

        setActionLoading(action);
        try {
            await callback();
        } finally {
            setActionLoading(null);
        }
    };

    const handleKillConfirm = async () => {
        // Save "don't ask again" preference
        if (dontAskAgain && typeof window !== 'undefined') {
            localStorage.setItem('featherpanel_skip_kill_confirm', 'true');
            setSkipKillConfirm(true);
        }

        setShowKillConfirm(false);

        if (onKill) {
            setActionLoading('kill');
            try {
                await onKill();
            } finally {
                setActionLoading(null);
            }
        }
    };

    const isOfflineStatus = (status: string) => status === 'stopped' || status === 'offline';
    const isRunningStatus = (status: string) => status === 'running' || status === 'starting';

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'running':
                return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'starting':
                return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'stopping':
                return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'offline':
                return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
            default:
                return 'bg-red-500/10 text-red-500 border-red-500/20';
        }
    };

    return (
        <div className='border-border/50 bg-card/50 rounded-xl border backdrop-blur-xl'>
            <div className='p-4 sm:p-6'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='space-y-2'>
                        <h1 className='text-xl font-bold tracking-tight sm:text-3xl'>{serverName}</h1>
                        <div className='text-muted-foreground flex flex-wrap items-center gap-3 text-sm'>
                            <Badge className={getStatusColor(serverStatus)}>{serverStatus.toUpperCase()}</Badge>
                            {serverUuidShort && (
                                <span className='flex items-center gap-1'>
                                    <span className='opacity-50'>#</span>
                                    <code className='bg-muted rounded px-1 font-mono text-xs'>{serverUuidShort}</code>
                                </span>
                            )}
                            {nodeLocation && (
                                <span className='bg-muted/50 border-border/50 flex items-center gap-1.5 rounded-md border px-2 py-0.5'>
                                    {nodeLocationFlag ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img
                                            src={`https://flagcdn.com/16x12/${nodeLocationFlag}.png`}
                                            srcSet={`https://flagcdn.com/32x24/${nodeLocationFlag}.png 2x, https://flagcdn.com/48x36/${nodeLocationFlag}.png 3x`}
                                            alt={nodeLocation}
                                            className='h-3 w-4 rounded-[1px] object-cover'
                                        />
                                    ) : (
                                        <span className='opacity-50'>@</span>
                                    )}
                                    <span className='font-medium'>{nodeLocation}</span>
                                </span>
                            )}
                            {nodeName && (
                                <span className='bg-muted/50 border-border/50 flex items-center gap-1.5 rounded-md border px-2 py-0.5'>
                                    <span className='opacity-50'>{t('servers.node')}:</span>
                                    <span className='font-medium'>{nodeName}</span>
                                </span>
                            )}
                        </div>
                        {serverUuid && (
                            <p className='text-muted-foreground/50 hidden font-mono text-xs sm:block'>
                                {t('servers.console.uuid')}: {serverUuid}
                            </p>
                        )}
                    </div>

                    <div className='grid grid-cols-2 gap-2 sm:flex sm:flex-wrap'>
                        {canStart && (
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={
                                    actionLoading === 'start' ||
                                    (connectionLive ? !isOfflineStatus(serverStatus) : false)
                                }
                                onClick={() => handleAction('start', onStart)}
                                className='flex items-center gap-2'
                            >
                                {actionLoading === 'start' ? (
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                ) : (
                                    <Play className='h-4 w-4' />
                                )}
                                <span>{t('servers.start')}</span>
                            </Button>
                        )}

                        {canRestart && (
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={
                                    actionLoading === 'restart' || (connectionLive ? serverStatus !== 'running' : false)
                                }
                                onClick={() => handleAction('restart', onRestart)}
                                className='flex items-center gap-2'
                            >
                                {actionLoading === 'restart' ? (
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                ) : (
                                    <RotateCw className='h-4 w-4' />
                                )}
                                <span>{t('servers.restart')}</span>
                            </Button>
                        )}

                        {canStop && (
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={
                                    actionLoading === 'stop' ||
                                    (connectionLive ? !isRunningStatus(serverStatus) : false)
                                }
                                onClick={() => handleAction('stop', onStop)}
                                className='flex items-center gap-2'
                            >
                                {actionLoading === 'stop' ? (
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                ) : (
                                    <Square className='h-4 w-4' />
                                )}
                                <span>{t('servers.stop')}</span>
                            </Button>
                        )}

                        {canKill && (
                            <Button
                                variant='destructive'
                                size='sm'
                                disabled={
                                    actionLoading === 'kill' || (connectionLive ? isOfflineStatus(serverStatus) : false)
                                }
                                onClick={() => handleAction('kill', onKill)}
                                className='flex items-center gap-2'
                            >
                                {actionLoading === 'kill' ? (
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                ) : (
                                    <Skull className='h-4 w-4' />
                                )}
                                <span>{t('servers.console.kill')}</span>
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            <AlertDialog open={showKillConfirm} onOpenChange={setShowKillConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('servers.console.kill_confirm_title')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('servers.console.kill_confirm_description')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className='flex items-center space-x-2 py-4'>
                        <Checkbox
                            id='dont-ask-kill'
                            checked={dontAskAgain}
                            onCheckedChange={(checked) => setDontAskAgain(checked === true)}
                        />
                        <Label htmlFor='dont-ask-kill' className='cursor-pointer text-sm font-normal'>
                            {t('servers.console.kill_dont_ask_again')}
                        </Label>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleKillConfirm}
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        >
                            {t('servers.console.kill_confirm')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
