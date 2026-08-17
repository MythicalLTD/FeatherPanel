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
import { cn } from '@/lib/utils';
import { resolveSpellBannerUrl, type ServerSpellBannerStyle } from '@/lib/server-spell-banner';

interface ServerHeaderProps {
    serverName: string;
    serverStatus: string;
    serverUuid?: string;
    serverUuidShort?: string;
    nodeLocation?: string;
    nodeLocationFlag?: string;
    nodeName?: string;
    bannerUrl?: string | null;
    spellName?: string | null;
    /** Header banner presentation (default off). */
    bannerStyle?: ServerSpellBannerStyle;
    canStart?: boolean;
    canStop?: boolean;
    canRestart?: boolean;
    canKill?: boolean;
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
    bannerUrl,
    spellName,
    bannerStyle = 'off',
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

    const style = bannerStyle === 'off' ? 'off' : bannerStyle;
    const resolvedBanner = style !== 'off' ? resolveSpellBannerUrl(bannerUrl) : null;

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('featherpanel_skip_kill_confirm');
            setSkipKillConfirm(saved === 'true');
        }
    }, []);

    const handleAction = async (action: string, callback?: () => Promise<void> | void) => {
        if (!callback) return;

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

    const isOfflineStatus = (status: string) => status === 'stopped' || status === 'offline' || status === 'error';
    const isRunningStatus = (status: string) => status === 'running' || status === 'starting';

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'running':
                return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'starting':
                return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'installing':
                return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'stopping':
                return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'offline':
            case 'stopped':
                return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
            case 'error':
                return 'bg-red-600/20 text-red-600 border-red-600/40';
            default:
                return 'bg-red-500/10 text-red-500 border-red-500/20';
        }
    };

    const metaRow = (
        <div className='text-muted-foreground flex flex-wrap items-center gap-2 text-sm sm:gap-3'>
            <Badge className={getStatusColor(serverStatus)}>
                {t(`servers.status.${serverStatus}`, { defaultValue: serverStatus.toUpperCase() })}
            </Badge>
            {spellName && resolvedBanner ? (
                <span className='bg-muted/50 border-border/50 truncate rounded-md border px-2 py-0.5 text-xs font-medium'>
                    {spellName}
                </span>
            ) : null}
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
    );

    const powerButtons = (
        <div className='grid grid-cols-2 gap-2 sm:flex sm:flex-wrap'>
            {canStart && (
                <Button
                    variant='outline'
                    size='sm'
                    disabled={actionLoading === 'start' || (connectionLive ? !isOfflineStatus(serverStatus) : false)}
                    onClick={() => handleAction('start', onStart)}
                    className='flex items-center gap-2 border-emerald-600/40 bg-emerald-600 text-white hover:bg-emerald-600/90 hover:text-white disabled:border-emerald-600/20 disabled:bg-emerald-600/40 disabled:text-white/70'
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
                    disabled={actionLoading === 'restart' || (connectionLive ? serverStatus !== 'running' : false)}
                    onClick={() => handleAction('restart', onRestart)}
                    className='flex items-center gap-2 border-amber-500/40 bg-amber-500 text-amber-950 hover:bg-amber-500/90 hover:text-amber-950 disabled:border-amber-500/20 disabled:bg-amber-500/40 disabled:text-amber-950/70'
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
                    disabled={actionLoading === 'stop' || (connectionLive ? !isRunningStatus(serverStatus) : false)}
                    onClick={() => handleAction('stop', onStop)}
                    className='flex items-center gap-2 border-orange-600/40 bg-orange-600 text-white hover:bg-orange-600/90 hover:text-white disabled:border-orange-600/20 disabled:bg-orange-600/40 disabled:text-white/70'
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
                    disabled={actionLoading === 'kill' || (connectionLive ? isOfflineStatus(serverStatus) : false)}
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
    );

    const titleBlock = (
        <div className='min-w-0 space-y-2'>
            <h1 className='truncate text-xl font-bold tracking-tight sm:text-2xl md:text-3xl'>{serverName}</h1>
            {metaRow}
            {serverUuid && (
                <p className='text-muted-foreground/50 hidden font-mono text-xs sm:block'>
                    {t('servers.console.uuid')}: {serverUuid}
                </p>
            )}
        </div>
    );

    const killDialog = (
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
    );

    // Style: strip — compact image bar above controls
    if (resolvedBanner && style === 'strip') {
        return (
            <div className='border-border/50 bg-card/50 overflow-hidden rounded-xl border backdrop-blur-xl'>
                <div className='border-border/40 relative h-20 overflow-hidden border-b sm:h-24'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={resolvedBanner}
                        alt={spellName || serverName}
                        className='absolute inset-0 h-full w-full object-cover'
                    />
                </div>
                <div className='flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5'>
                    {titleBlock}
                    {powerButtons}
                </div>
                {killDialog}
            </div>
        );
    }

    // Style: hero — image fills header; frosted control panel on top
    if (resolvedBanner && style === 'hero') {
        return (
            <div className='border-border/50 relative overflow-hidden rounded-xl border'>
                <div className='absolute inset-0'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolvedBanner} alt='' className='h-full w-full object-cover' aria-hidden />
                    <div className='absolute inset-0 bg-black/45' aria-hidden />
                </div>
                <div className='relative z-10 p-4 sm:p-5'>
                    <div className='border-border/40 bg-card/85 flex flex-col gap-4 rounded-xl border p-3 shadow-sm backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:p-4'>
                        {titleBlock}
                        {powerButtons}
                    </div>
                </div>
                {killDialog}
            </div>
        );
    }

    // Style: cover — side art (default when enabled) — or plain header when off / no image
    return (
        <div className='border-border/50 bg-card/50 overflow-hidden rounded-xl border backdrop-blur-xl'>
            <div className={cn('p-4 sm:p-5', resolvedBanner && style === 'cover' && 'sm:p-4')}>
                <div
                    className={cn(
                        'flex flex-col gap-4',
                        resolvedBanner && style === 'cover'
                            ? 'sm:flex-row sm:items-stretch sm:gap-5'
                            : 'sm:flex-row sm:items-center sm:justify-between',
                    )}
                >
                    {resolvedBanner && style === 'cover' ? (
                        <div className='border-border/60 bg-muted/30 relative aspect-[21/9] w-full shrink-0 overflow-hidden rounded-lg border sm:aspect-auto sm:min-h-[7.5rem] sm:w-44 sm:self-stretch md:w-52 lg:w-56'>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={resolvedBanner}
                                alt={spellName || serverName}
                                className='absolute inset-0 h-full w-full object-cover'
                            />
                        </div>
                    ) : null}

                    <div
                        className={cn(
                            'flex min-w-0 flex-1 flex-col gap-4',
                            resolvedBanner && style === 'cover'
                                ? 'sm:justify-between'
                                : 'sm:flex-row sm:items-center sm:justify-between',
                        )}
                    >
                        {titleBlock}
                        <div className={cn(resolvedBanner && style === 'cover' && 'sm:self-end')}>{powerButtons}</div>
                    </div>
                </div>
            </div>
            {killDialog}
        </div>
    );
}
