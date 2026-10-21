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
import { Play, Square, RotateCw, Skull, Loader2, Clock, Gamepad2, Server as ServerIcon } from 'lucide-react';
import ServerAddressChip from '@/components/server/ServerAddressChip';
import { useTranslation } from '@/contexts/TranslationContext';
import { useState, useEffect, type ReactNode } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { resolveSpellBannerUrl, type ServerSpellBannerStyle } from '@/lib/server-spell-banner';
import { ServiceExpiryChip } from '@/components/common/ServiceExpiryChip';

interface ServerHeaderProps {
    serverName: string;
    serverStatus: string;
    /** Short server description shown under the name. */
    description?: string | null;
    /** Connection host (subdomain, alias or IP) and port for the address chip. */
    address?: string;
    port?: number | null;
    /** Human readable uptime from the daemon, when known. */
    uptime?: string;
    /** When set, server is auto-suspended after this datetime. */
    expiresAt?: string | null;
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
    /** Optional 24 hour usage history shown above the power buttons. */
    trend?: ReactNode;
}

export default function ServerHeader({
    serverName,
    serverStatus,
    description,
    address,
    port,
    uptime,
    expiresAt,
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
    trend,
}: ServerHeaderProps) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showKillConfirm, setShowKillConfirm] = useState(false);
    const [dontAskAgain, setDontAskAgain] = useState(false);
    const [skipKillConfirm, setSkipKillConfirm] = useState(false);

    const style = theme === 'light' || bannerStyle === 'off' ? 'off' : bannerStyle;
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

    const statusDot = (status: string) => {
        switch (status) {
            case 'running':
                return 'bg-emerald-500';
            case 'starting':
            case 'stopping':
            case 'installing':
                return 'bg-amber-500 animate-pulse';
            case 'error':
                return 'bg-destructive';
            default:
                return 'bg-muted-foreground/50';
        }
    };

    const chipClass =
        'border-border/50 bg-muted/40 inline-flex h-7 max-w-full min-w-0 items-center gap-1.5 rounded-full border px-2.5 text-xs';

    const metaRow = (
        <div className='flex flex-wrap items-center gap-2'>
            <span className={chipClass}>
                <span className={cn('h-2 w-2 shrink-0 rounded-full', statusDot(serverStatus))} aria-hidden />
                <span className='font-medium'>
                    {t(`servers.status.${serverStatus}`, { defaultValue: serverStatus })}
                </span>
            </span>
            {address ? <ServerAddressChip host={address} port={port} className='hidden sm:inline-flex' /> : null}
            {uptime ? (
                <span className={chipClass} title={t('servers.console.info_cards.uptime')}>
                    <Clock className='text-muted-foreground h-3.5 w-3.5 shrink-0' aria-hidden />
                    <span className='tabular-nums'>{uptime}</span>
                </span>
            ) : null}
            <ServiceExpiryChip expiresAt={expiresAt} />
            {nodeName || nodeLocation ? (
                <span className={chipClass} title={t('servers.node')}>
                    {nodeLocationFlag ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={`https://flagcdn.com/16x12/${nodeLocationFlag}.png`}
                            srcSet={`https://flagcdn.com/32x24/${nodeLocationFlag}.png 2x, https://flagcdn.com/48x36/${nodeLocationFlag}.png 3x`}
                            alt={nodeLocation || ''}
                            className='h-3 w-4 shrink-0 rounded-[1px] object-cover'
                        />
                    ) : (
                        <ServerIcon className='text-muted-foreground h-3.5 w-3.5 shrink-0' aria-hidden />
                    )}
                    <span className='truncate'>
                        {nodeName && nodeLocation && nodeName !== nodeLocation
                            ? `${nodeName} · ${nodeLocation}`
                            : nodeName || nodeLocation}
                    </span>
                </span>
            ) : null}
            {spellName ? (
                <span className={cn(chipClass, 'text-muted-foreground hidden sm:inline-flex')}>
                    <span className='truncate'>{spellName}</span>
                </span>
            ) : null}
        </div>
    );

    const powerButtons = (
        <div className='grid shrink-0 grid-cols-[repeat(3,minmax(0,1fr))_auto] gap-2 sm:flex sm:items-center'>
            {canStart && (
                <Button
                    variant='secondary'
                    size='sm'
                    disabled={actionLoading === 'start' || !connectionLive || !isOfflineStatus(serverStatus)}
                    onClick={() => handleAction('start', onStart)}
                    className='min-w-0 gap-1.5 px-2 sm:gap-2 sm:px-3'
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
                    variant='secondary'
                    size='sm'
                    disabled={actionLoading === 'restart' || !connectionLive || serverStatus !== 'running'}
                    onClick={() => handleAction('restart', onRestart)}
                    className='min-w-0 gap-1.5 px-2 sm:gap-2 sm:px-3'
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
                    variant='destructive'
                    size='sm'
                    disabled={actionLoading === 'stop' || !connectionLive || !isRunningStatus(serverStatus)}
                    onClick={() => handleAction('stop', onStop)}
                    className='min-w-0 gap-1.5 px-2 sm:gap-2 sm:px-3'
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
                    variant='outline'
                    size='sm'
                    disabled={actionLoading === 'kill' || !connectionLive || isOfflineStatus(serverStatus)}
                    onClick={() => handleAction('kill', onKill)}
                    className='text-destructive hover:text-destructive gap-2 px-2.5'
                    title={t('servers.console.kill')}
                    aria-label={t('servers.console.kill')}
                >
                    {actionLoading === 'kill' ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                        <Skull className='h-4 w-4' />
                    )}
                </Button>
            )}
        </div>
    );

    const killDialog = (
        <ConfirmDialog
            open={showKillConfirm}
            onOpenChange={setShowKillConfirm}
            title={t('servers.console.kill_confirm_title')}
            description={t('servers.console.kill_confirm_description')}
            confirmLabel={t('servers.console.kill_confirm')}
            cancelLabel={t('common.cancel')}
            onConfirm={handleKillConfirm}
        >
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
        </ConfirmDialog>
    );

    // Banner styles (strip / cover / hero) all render the spell art behind the hero, faded towards the
    // text so it stays readable; "off" keeps a plain card.
    return (
        <div className='fp-surface relative overflow-hidden rounded-xl border'>
            {resolvedBanner ? (
                <div className='pointer-events-none absolute inset-0' aria-hidden>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={resolvedBanner}
                        alt=''
                        className={cn(
                            'absolute inset-y-0 right-0 h-full object-cover',
                            style === 'hero' ? 'w-full opacity-50' : 'w-full opacity-40 sm:w-2/3',
                        )}
                    />
                    <div className='from-card via-card/85 to-card/30 absolute inset-0 bg-gradient-to-r' />
                </div>
            ) : null}
            <div className='relative flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between'>
                <div className='min-w-0 space-y-3'>
                    <div className='flex min-w-0 items-center gap-3'>
                        <span className='bg-primary/15 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg'>
                            <Gamepad2 className='h-5 w-5' aria-hidden />
                        </span>
                        <div className='min-w-0'>
                            <h1 className='truncate text-xl font-semibold tracking-tight sm:text-2xl'>{serverName}</h1>
                            {description ? (
                                <p className='text-muted-foreground line-clamp-1 text-sm'>{description}</p>
                            ) : null}
                        </div>
                    </div>
                    {metaRow}
                </div>
                {trend ? (
                    <div className='flex min-w-0 flex-col gap-3 lg:items-end'>
                        <div className='w-full lg:w-80'>{trend}</div>
                        {powerButtons}
                    </div>
                ) : (
                    powerButtons
                )}
            </div>
            {killDialog}
        </div>
    );
}
