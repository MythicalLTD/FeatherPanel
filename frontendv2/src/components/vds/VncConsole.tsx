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

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import type RFB from '@novnc/novnc';

/** noVNC logs (does not throw) if disconnect() runs after the socket is already gone. */
function disconnectRfb(rfb: RFB): void {
    const state = (rfb as unknown as { _rfbConnectionState?: string })._rfbConnectionState;
    if (state === 'disconnected' || state === 'disconnecting') return;
    try {
        rfb.disconnect();
    } catch {
        // already closed
    }
}

interface VncConsoleProps {
    /** WebSocket URL, e.g. wss://panel/vnc-proxy/{token} or direct Proxmox wss_url */
    url: string;
    /**
     * Proxmox `vncproxy` ticket — used as the RFB/VNC password after the
     * websocket is up (pveproxy challenges with VNC Auth).
     */
    password?: string;
    className?: string;
    onDisconnect?: () => void;
}

/**
 * Embedded noVNC console. Connects the browser to a VNC-over-WebSocket
 * endpoint (FeatherPanel `/vnc-proxy/{token}` relay or a direct Proxmox
 * vncwebsocket URL) and renders the screen into a canvas.
 *
 * Proxy tokens are single-use and short-lived, so the session must only be
 * (re)opened when `url` changes, never on a plain parent re-render.
 *
 * `@novnc/novnc` touches `window` at module load — import it only in the
 * browser via dynamic import, never at the top level (SSR).
 *
 * Connection is deferred a tick so React Strict Mode's mount→unmount→remount
 * does not burn the single-use panel ticket on the discarded first mount.
 */
export function VncConsole({ url, password, className, onDisconnect }: VncConsoleProps) {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const rfbRef = useRef<RFB | null>(null);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    const onDisconnectRef = useRef(onDisconnect);
    const passwordRef = useRef(password);
    useEffect(() => {
        onDisconnectRef.current = onDisconnect;
    }, [onDisconnect]);
    useEffect(() => {
        passwordRef.current = password;
    }, [password]);

    useEffect(() => {
        if (!containerRef.current) return;
        let disposed = false;
        let rfb: RFB | null = null;

        const timer = window.setTimeout(() => {
            void (async () => {
                const { default: RFBCtor } = await import('@novnc/novnc');
                if (disposed || !containerRef.current) return;

                const opts = passwordRef.current
                    ? { credentials: { password: passwordRef.current } }
                    : undefined;
                rfb = new RFBCtor(containerRef.current, url, opts);
                // Scale client-side only. Proxmox qemu VNC rejects ExtendedDesktopSize
                // ("Invalid screen layout") when resizeSession is true.
                rfb.scaleViewport = true;
                rfb.resizeSession = false;
                rfb.addEventListener('connect', () => {
                    if (!disposed) setStatus('connected');
                });
                rfb.addEventListener('disconnect', () => {
                    if (disposed) return;
                    setStatus('disconnected');
                    onDisconnectRef.current?.();
                });
                rfb.addEventListener('securityfailure', () => {
                    if (!disposed) setStatus('disconnected');
                });
                // pveproxy may still raise credentialsrequired even when password was pre-set.
                rfb.addEventListener('credentialsrequired', () => {
                    const pw = passwordRef.current;
                    if (pw && rfb) {
                        rfb.sendCredentials({ password: pw });
                    }
                });
                // Strict Mode / Fast Refresh may unmount before the handshake finishes.
                if (disposed) {
                    disconnectRfb(rfb);
                    rfb = null;
                    return;
                }
                rfbRef.current = rfb;
            })();
        }, 50);

        return () => {
            disposed = true;
            window.clearTimeout(timer);
            if (rfb) {
                disconnectRfb(rfb);
                rfb = null;
            }
            rfbRef.current = null;
        };
    }, [url]);

    return (
        <div className={cn('bg-background relative overflow-hidden rounded-lg border', className)}>
            {status !== 'connected' && (
                <div className='absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-sm text-white'>
                    {status === 'connecting' ? (
                        <span className='flex items-center gap-2'>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            {t('vds.console.connecting')}
                        </span>
                    ) : (
                        t('vds.console.disconnected')
                    )}
                </div>
            )}
            <div
                ref={containerRef}
                className='mx-auto h-[min(70vh,720px)] min-h-[480px] w-full overflow-hidden [&_canvas]:h-full [&_canvas]:w-full'
            />
        </div>
    );
}
