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

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Keyboard, Loader2, Lock, Maximize2, Minimize2, Monitor, Plug, PowerOff, Send, X } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import type { VncConsoleHandle, VncStatus } from '@/components/vds/VncConsole';
import { VdsConsoleActions } from '@/components/vds/VdsConsoleActions';
import { VdsVncExtraKeys } from '@/components/vds/VdsVncExtraKeys';
import type { VdsFeatures } from '@/hooks/useVdsFeatures';

const VncConsole = dynamic(() => import('@/components/vds/VncConsole').then((m) => m.VncConsole), {
    ssr: false,
    loading: () => (
        <div className='flex h-full items-center justify-center'>
            <Loader2 className='text-muted-foreground h-6 w-6 animate-spin' />
        </div>
    ),
});

interface VdsScreenProps {
    /** Live Proxmox status (running, stopped, ...). */
    status: string;
    canConsole: boolean;
    vncUrl: string | null;
    vncPassword: string | null;
    vncLoading: boolean;
    onConnect: () => void;
    onClose: () => void;
    /** Fired when the noVNC socket drops (guest reboot, proxy timeout, …). */
    onDisconnect?: () => void;
    className?: string;
    vmId: number;
    hostname?: string;
    features: VdsFeatures | null;
    canPower: boolean;
    canSettings: boolean;
}

/**
 * VDS screen card styled like the game server terminal (ServerTerminal): status dot + title header,
 * a dark viewport and a command input footer. The viewport hosts the embedded noVNC session; the
 * footer types text into the guest key by key, which is the closest thing to a console command.
 */
export function VdsScreen({
    status,
    canConsole,
    vncUrl,
    vncPassword,
    vncLoading,
    onConnect,
    onClose,
    onDisconnect,
    className,
    vmId,
    hostname,
    features,
    canPower,
    canSettings,
}: VdsScreenProps) {
    const { t } = useTranslation();
    const cardRef = useRef<HTMLDivElement>(null);
    const vncRef = useRef<VncConsoleHandle>(null);
    const [vncStatus, setVncStatus] = useState<VncStatus | null>(null);
    const [input, setInput] = useState('');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [extraKeysOpen, setExtraKeysOpen] = useState(false);

    const running = status === 'running';
    const connected = Boolean(vncUrl) && vncStatus === 'connected';

    useEffect(() => {
        if (!connected) setExtraKeysOpen(false);
    }, [connected]);

    useEffect(() => {
        const onChange = () => setIsFullscreen(document.fullscreenElement === cardRef.current);
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (document.fullscreenElement) {
            void document.exitFullscreen();
        } else {
            void cardRef.current?.requestFullscreen?.();
        }
    }, []);

    const [sending, setSending] = useState(false);
    const sendInput = async () => {
        if (!input || !connected || sending || !vncRef.current) return;
        setSending(true);
        const ok = await vncRef.current.typeText(`${input}\n`);
        setSending(false);
        if (ok) {
            setInput('');
            vncRef.current?.focus();
        }
    };

    const dotClass = connected
        ? 'bg-emerald-500'
        : vncUrl || status === 'starting' || status === 'stopping'
          ? 'animate-pulse bg-amber-500'
          : running
            ? 'bg-emerald-500/60'
            : 'bg-muted-foreground/50';

    let placeholder: ReactNode = null;
    if (!vncUrl) {
        const {
            icon: Icon,
            title,
            description,
        } = !canConsole
            ? {
                  icon: Lock,
                  title: t('vds.console.screen.no_permission_title'),
                  description: t('vds.console.screen.no_permission_description'),
              }
            : !running
              ? {
                    icon: PowerOff,
                    title: t('vds.console.screen.offline_title'),
                    description: t('vds.console.screen.offline_description'),
                }
              : {
                    icon: Monitor,
                    title: t('vds.console.screen.idle_title'),
                    description: t('vds.console.screen.idle_description'),
                };
        placeholder = (
            <div className='flex h-full flex-col items-center justify-center gap-3 p-6 text-center'>
                <div className='fp-icon-tile flex h-12 w-12 items-center justify-center rounded-xl'>
                    <Icon className='h-6 w-6' aria-hidden />
                </div>
                <div className='max-w-sm space-y-1'>
                    <p className='text-sm font-medium'>{title}</p>
                    <p className='text-muted-foreground text-xs'>{description}</p>
                </div>
                {canConsole && running && (
                    <Button size='sm' onClick={onConnect} disabled={vncLoading}>
                        {vncLoading ? (
                            <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
                        ) : (
                            <Plug className='mr-1.5 h-4 w-4' />
                        )}
                        {t('vds.console.screen.connect')}
                    </Button>
                )}
            </div>
        );
    }

    return (
        <Card ref={cardRef} className={cn('flex h-full flex-col gap-0 overflow-hidden py-0', className)}>
            <CardHeader className='border-border/50 shrink-0 gap-0 border-b px-3 py-1.5 sm:px-4'>
                <div className='flex items-center justify-between gap-2'>
                    <h3 className='flex min-w-0 items-center gap-2 text-sm font-medium'>
                        <span className={cn('h-2 w-2 shrink-0 rounded-full', dotClass)} aria-hidden />
                        {features?.console.brand_logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={features.console.brand_logo}
                                alt=''
                                className='hidden h-4 max-w-[96px] shrink-0 object-contain sm:block'
                                referrerPolicy='no-referrer'
                            />
                        ) : (
                            <Monitor className='text-muted-foreground hidden h-4 w-4 shrink-0 sm:block' aria-hidden />
                        )}
                        <span className='truncate'>
                            {features?.console.brand_name || t('vds.console.screen.title')}
                        </span>
                        {vncUrl && (
                            <span className='text-muted-foreground hidden truncate text-xs font-normal sm:inline'>
                                · {t(`vds.console.screen.state.${vncStatus ?? 'connecting'}`)}
                            </span>
                        )}
                    </h3>
                    <div className='flex shrink-0 items-center gap-0.5'>
                        {vncUrl && (
                            <Button
                                type='button'
                                variant={extraKeysOpen ? 'secondary' : 'ghost'}
                                size='sm'
                                className='h-8 rounded-lg px-2 text-xs'
                                onClick={() => setExtraKeysOpen((o) => !o)}
                                disabled={!connected}
                                title={t('vds.console.extra_keys.toggle')}
                                aria-pressed={extraKeysOpen}
                            >
                                <Keyboard className='h-3.5 w-3.5 sm:mr-1.5' />
                                <span className='hidden sm:inline'>{t('vds.console.extra_keys.toggle')}</span>
                            </Button>
                        )}
                        <VdsConsoleActions
                            vmId={vmId}
                            hostname={hostname}
                            features={features}
                            vncRef={vncRef}
                            connected={connected}
                            canPower={canPower}
                            canSettings={canSettings}
                        />
                        <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 shrink-0 rounded-lg'
                            onClick={toggleFullscreen}
                            aria-label={t('vds.console.screen.fullscreen')}
                            title={t('vds.console.screen.fullscreen')}
                        >
                            {isFullscreen ? (
                                <Minimize2 className='h-3.5 w-3.5' />
                            ) : (
                                <Maximize2 className='h-3.5 w-3.5' />
                            )}
                        </Button>
                        {vncUrl && (
                            <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='h-8 w-8 shrink-0 rounded-lg'
                                onClick={() => {
                                    setVncStatus(null);
                                    onClose();
                                }}
                                aria-label={t('vds.console.close_console')}
                                title={t('vds.console.close_console')}
                            >
                                <X className='h-3.5 w-3.5' />
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className='bg-secondary relative min-h-0 flex-1 p-0'>
                {vncUrl ? (
                    <VncConsole
                        key={vncUrl}
                        url={vncUrl}
                        password={vncPassword ?? undefined}
                        fillContainer
                        handleRef={vncRef}
                        onStatusChange={setVncStatus}
                        onDisconnect={onDisconnect}
                    />
                ) : (
                    placeholder
                )}
            </CardContent>

            {vncUrl && extraKeysOpen && <VdsVncExtraKeys vncRef={vncRef} connected={connected} />}

            <CardFooter className='border-border/50 flex w-full min-w-0 shrink-0 flex-col items-stretch gap-1.5 border-t px-3 py-2 sm:px-4 sm:py-2.5'>
                <form
                    className='flex w-full min-w-0 items-center gap-2'
                    onSubmit={(e) => {
                        e.preventDefault();
                        void sendInput();
                    }}
                >
                    <div
                        className={cn(
                            'border-border/50 bg-muted/20 focus-within:border-primary/40 focus-within:ring-primary/15 flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border px-2.5 transition-all focus-within:ring-2',
                            !connected && 'opacity-60',
                        )}
                    >
                        <span className='text-primary shrink-0 font-mono text-xs font-bold select-none' aria-hidden>
                            &gt;
                        </span>
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={!connected}
                            autoComplete='off'
                            spellCheck={false}
                            aria-label={t('vds.console.screen.input_label')}
                            placeholder={
                                connected
                                    ? t('vds.console.screen.input_placeholder')
                                    : t('vds.console.screen.input_disabled')
                            }
                            className='text-foreground placeholder:text-muted-foreground/50 h-full w-full min-w-0 bg-transparent py-1.5 font-mono text-xs font-semibold outline-none'
                        />
                    </div>
                    <Button
                        type='submit'
                        variant='outline'
                        size='icon'
                        className='text-primary hover:bg-primary/10 hover:text-primary border-primary/35 focus:ring-primary/15 h-9 w-9 shrink-0 rounded-lg focus:ring-2'
                        disabled={!connected || !input || sending}
                        aria-label={t('vds.console.screen.send')}
                    >
                        <Send className='h-4 w-4' />
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
}
