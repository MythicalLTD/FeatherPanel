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
import RFB from '@novnc/novnc';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

interface VncConsoleProps {
    /** WebSocket URL, e.g. wss://panel/vnc-proxy/{token} or direct Proxmox wss_url */
    url: string;
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
 */
export function VncConsole({ url, className, onDisconnect }: VncConsoleProps) {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const rfbRef = useRef<RFB | null>(null);
    const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
    // Keep the latest callback in a ref so an unstable (inline) prop does not
    // tear down the RFB session on every parent render.
    const onDisconnectRef = useRef(onDisconnect);
    useEffect(() => {
        onDisconnectRef.current = onDisconnect;
    }, [onDisconnect]);

    useEffect(() => {
        if (!containerRef.current) return;
        let disposed = false;

        const rfb = new RFB(containerRef.current, url);
        rfb.scaleViewport = true;
        rfb.resizeSession = true;
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
        rfbRef.current = rfb;

        return () => {
            disposed = true;
            try {
                rfb.disconnect();
            } catch {
                // already closed
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
            <div ref={containerRef} className='mx-auto flex min-h-[480px] items-center justify-center' />
        </div>
    );
}
