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

import { useCallback, useContext, useEffect, useState } from 'react';
import { Loader2, Play, RotateCw, Skull, Square, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ServerContext } from '@/contexts/ServerContext';
import { useServerWingsReachability } from '@/contexts/ServerWingsReachabilityContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api-errors';
import { displayStatus, isServerAccessible } from '@/lib/server-utils';
import {
    emitServerPowerResult,
    isOfflinePowerStatus,
    isRunningPowerStatus,
    POWER_OPTIMISTIC_STATUS,
    POWER_UNAVAILABLE_STATUSES,
    postServerPowerAction,
    runServerPowerHooks,
    type ServerPowerAction,
} from '@/lib/server-power';
import { cn } from '@/lib/utils';

const SKIP_KILL_CONFIRM_KEY = 'featherpanel_skip_kill_confirm';

const SENT_KEYS: Record<ServerPowerAction, string> = {
    start: 'dashboard.home.power.sent_start',
    stop: 'dashboard.home.power.sent_stop',
    restart: 'dashboard.home.power.sent_restart',
    kill: 'sidebar.server_power.sent_kill',
};

export interface SidebarServerPowerModel {
    status: string;
    statusLabel: string;
    serverName: string;
    pending: ServerPowerAction | null;
    canStart: boolean;
    canRestart: boolean;
    canStop: boolean;
    canKill: boolean;
    /** Per action: allowed for the current state and connection. */
    enabled: Record<ServerPowerAction, boolean>;
    run: (action: ServerPowerAction) => Promise<void>;
}

/**
 * Power state and actions for the server whose pages are open, or null when the controls should
 * not show (not on a server page, no power permission, suspended / installing / transferring).
 * State comes from the server context, which the console and the layout Wings socket keep live.
 */
export function useSidebarServerPower(pathname: string): SidebarServerPowerModel | null {
    const ctx = useContext(ServerContext);
    const reachability = useServerWingsReachability();
    const { t } = useTranslation();
    const [pending, setPending] = useState<ServerPowerAction | null>(null);

    const server = ctx?.server ?? null;
    const uuidShort = server?.uuidShort ?? '';
    const onServerPage = Boolean(uuidShort) && pathname.startsWith(`/server/${uuidShort}`);

    const stored = server ? displayStatus(server) : 'unknown';
    const unavailable = POWER_UNAVAILABLE_STATUSES.has(stored);
    const status = unavailable ? stored : ctx?.liveStatus || (stored === 'installed' ? 'unknown' : stored);
    // Without the websocket permission there is no live state; the stored one is all we have.
    const connectionLive = reachability.canConnect ? reachability.connectionStatus === 'connected' : true;

    const setLiveStatus = ctx?.setLiveStatus;
    const run = useCallback(
        async (action: ServerPowerAction) => {
            if (!uuidShort || pending) return;
            if (!connectionLive) {
                toast.error(t('servers.console.connection.disconnected_hint'));
                return;
            }
            setPending(action);
            try {
                const finalAction = await runServerPowerHooks(action, {
                    uuid: uuidShort,
                    uuidShort,
                    killMessage: t('ui.components.server.serverConsolePage.killServer'),
                });
                if (!finalAction) return;
                setLiveStatus?.(POWER_OPTIMISTIC_STATUS[finalAction]);
                try {
                    await postServerPowerAction(uuidShort, finalAction);
                    void emitServerPowerResult(uuidShort, finalAction);
                    toast.success(t(SENT_KEYS[finalAction], { name: server?.name ?? uuidShort }));
                } catch (err) {
                    void emitServerPowerResult(uuidShort, finalAction, err ?? 'error');
                    setLiveStatus?.(status);
                    toast.error(getApiErrorMessage(err, t, 'dashboard.home.power.failed'));
                }
            } finally {
                setPending(null);
            }
        },
        [uuidShort, pending, connectionLive, t, setLiveStatus, server?.name, status],
    );

    if (!ctx || !server || ctx.loading || !onServerPage) return null;
    if (unavailable || !isServerAccessible(server)) return null;

    const canStart = ctx.hasPermission('control.start');
    const canRestart = ctx.hasPermission('control.restart');
    const canStop = ctx.hasPermission('control.stop');
    if (!canStart && !canRestart && !canStop) return null;

    const busy = pending !== null;
    return {
        status,
        statusLabel: t(`servers.status.${status}`, { defaultValue: status }),
        serverName: server.name,
        pending,
        canStart,
        canRestart,
        canStop,
        canKill: canStop,
        enabled: {
            start: !busy && connectionLive && isOfflinePowerStatus(status),
            restart: !busy && connectionLive && status === 'running',
            stop: !busy && connectionLive && isRunningPowerStatus(status),
            kill: !busy && connectionLive && !isOfflinePowerStatus(status) && status !== 'unknown',
        },
        run,
    };
}

function statusDotClass(status: string): string {
    switch (status) {
        case 'running':
            return 'bg-emerald-500';
        case 'starting':
        case 'stopping':
            return 'bg-amber-500 animate-pulse';
        case 'offline':
        case 'stopped':
            return 'bg-rose-500/80';
        case 'error':
            return 'bg-destructive';
        default:
            return 'bg-muted-foreground/50';
    }
}

type Tone = 'start' | 'neutral' | 'stop' | 'kill';

/** Labelled buttons share the width; the kill button keeps a narrow fixed column. */
function gridColsClass(labelled: number, kill: boolean): string {
    if (kill) {
        if (labelled >= 3) return 'grid-cols-[repeat(3,minmax(0,1fr))_2.25rem]';
        if (labelled === 2) return 'grid-cols-[repeat(2,minmax(0,1fr))_2.25rem]';
        return 'grid-cols-[minmax(0,1fr)_2.25rem]';
    }
    if (labelled >= 3) return 'grid-cols-3';
    if (labelled === 2) return 'grid-cols-2';
    return 'grid-cols-1';
}

type PowerButton = { action: ServerPowerAction; show: boolean; icon: LucideIcon; label: string; tone: Tone };

const TONE_CLASS: Record<Tone, string> = {
    start: 'text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400',
    neutral: 'text-foreground/80 hover:bg-muted/60 hover:text-foreground dark:hover:bg-muted/25',
    stop: 'text-rose-600 hover:bg-rose-500/10 dark:text-rose-400',
    kill: 'text-destructive hover:bg-destructive/10',
};

export function SidebarServerPower({
    model,
    collapsed,
    classic,
    solid,
    tooltip,
}: {
    model: SidebarServerPowerModel;
    /** Icon-only rail (desktop collapsed). */
    collapsed: boolean;
    classic: boolean;
    solid: boolean;
    /** Collapsed-rail tooltip props for a label (empty when tooltips are off). */
    tooltip: (label: string) => Record<string, string>;
}) {
    const { t } = useTranslation();
    const [confirmKill, setConfirmKill] = useState(false);
    const [dontAskAgain, setDontAskAgain] = useState(false);
    const [skipKillConfirm, setSkipKillConfirm] = useState(false);

    useEffect(() => {
        setSkipKillConfirm(localStorage.getItem(SKIP_KILL_CONFIRM_KEY) === 'true');
    }, []);

    const radius = classic ? 'rounded-md' : 'rounded-lg';
    const surface = solid ? 'border-border/40 bg-muted/15' : 'border-border/25 bg-card/45';

    const buttons: PowerButton[] = [
        { action: 'start', show: model.canStart, icon: Play, label: t('servers.start'), tone: 'start' },
        { action: 'restart', show: model.canRestart, icon: RotateCw, label: t('servers.restart'), tone: 'neutral' },
        { action: 'stop', show: model.canStop, icon: Square, label: t('servers.stop'), tone: 'stop' },
        { action: 'kill', show: model.canKill, icon: Skull, label: t('servers.console.kill'), tone: 'kill' },
    ];
    const visible = buttons.filter((b) => b.show);

    const onKill = () => {
        if (skipKillConfirm) {
            void model.run('kill');
            return;
        }
        setConfirmKill(true);
    };

    const powerButton = (b: PowerButton, iconOnly: boolean) => {
        const Icon = b.icon;
        const enabled = model.enabled[b.action];
        return (
            <button
                key={b.action}
                type='button'
                onClick={b.action === 'kill' ? onKill : () => void model.run(b.action)}
                disabled={!enabled}
                aria-label={b.label}
                title={iconOnly ? undefined : b.label}
                {...tooltip(b.label)}
                className={cn(
                    'focus-visible:ring-ring border-border/40 bg-background/40 inline-flex min-w-0 items-center justify-center border font-medium transition-colors outline-none focus-visible:ring-2',
                    radius,
                    iconOnly ? 'h-8 w-8' : 'h-11 flex-col gap-1 px-0.5 text-[10px] leading-none',
                    TONE_CLASS[b.tone],
                    'disabled:pointer-events-none disabled:opacity-40',
                )}
            >
                {model.pending === b.action ? (
                    <Loader2 className='h-3.5 w-3.5 shrink-0 animate-spin' aria-hidden />
                ) : (
                    <Icon className='h-3.5 w-3.5 shrink-0' aria-hidden />
                )}
                {!iconOnly && <span className='max-w-full truncate'>{b.label}</span>}
            </button>
        );
    };

    const killDialog = (
        <ConfirmDialog
            open={confirmKill}
            onOpenChange={setConfirmKill}
            title={t('servers.console.kill_confirm_title')}
            description={t('servers.console.kill_confirm_description')}
            confirmLabel={t('servers.console.kill_confirm')}
            cancelLabel={t('common.cancel')}
            onConfirm={() => {
                if (dontAskAgain) {
                    localStorage.setItem(SKIP_KILL_CONFIRM_KEY, 'true');
                    setSkipKillConfirm(true);
                }
                setConfirmKill(false);
                void model.run('kill');
            }}
        >
            <div className='flex items-center space-x-2 py-4'>
                <Checkbox
                    id='sidebar-dont-ask-kill'
                    checked={dontAskAgain}
                    onCheckedChange={(checked) => setDontAskAgain(checked === true)}
                />
                <Label htmlFor='sidebar-dont-ask-kill' className='cursor-pointer text-sm font-normal'>
                    {t('servers.console.kill_dont_ask_again')}
                </Label>
            </div>
        </ConfirmDialog>
    );

    if (collapsed) {
        const stateTip = `${t('sidebar.server_power.title')}: ${model.statusLabel}`;
        return (
            <div
                className={cn(
                    'mx-1.5 mt-2 flex shrink-0 flex-col items-center gap-1 border py-1.5',
                    classic ? 'rounded-md' : 'rounded-xl',
                    surface,
                )}
                role='group'
                aria-label={t('sidebar.server_power.title')}
                data-fp-sidebar-power=''
            >
                <span className='flex h-5 w-8 items-center justify-center' {...tooltip(stateTip)} aria-label={stateTip}>
                    <span className={cn('h-2 w-2 rounded-full', statusDotClass(model.status))} aria-hidden />
                </span>
                {visible.filter((b) => b.action !== 'kill').map((b) => powerButton(b, true))}
            </div>
        );
    }

    return (
        <div
            className={cn(
                'shrink-0 border px-2 py-2',
                classic ? 'mx-3 mt-3 rounded-md' : 'mx-2 mt-3 rounded-xl',
                surface,
            )}
            role='group'
            aria-label={t('sidebar.server_power.title')}
            data-fp-sidebar-power=''
        >
            <div className='flex items-center justify-between gap-2'>
                <span className='text-muted-foreground text-[10px] font-semibold tracking-wider uppercase'>
                    {t('sidebar.server_power.title')}
                </span>
                <span className='inline-flex min-w-0 items-center gap-1.5 text-xs font-medium' aria-live='polite'>
                    <span className={cn('h-2 w-2 shrink-0 rounded-full', statusDotClass(model.status))} aria-hidden />
                    <span className='truncate'>{model.statusLabel}</span>
                </span>
            </div>
            <div
                className={cn(
                    'mt-2 grid gap-1.5',
                    gridColsClass(visible.filter((b) => b.action !== 'kill').length, model.canKill),
                )}
            >
                {visible.map((b) => powerButton(b, false))}
            </div>
            {killDialog}
        </div>
    );
}
