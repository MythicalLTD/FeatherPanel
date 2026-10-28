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

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import type RFB from '@novnc/novnc';
import { XK_SHIFT_L, normalizeTypedText, strokeFor } from '@/lib/vnc/usKeymap';
import { STICKY_MODIFIERS, type ExtraKeyAction, type StickyModifier, type VncKeySpec } from '@/lib/vnc/extraKeys';

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
     * Proxmox `vncproxy` ticket - used as the RFB/VNC password after the
     * websocket is up (pveproxy challenges with VNC Auth).
     */
    password?: string;
    className?: string;
    onDisconnect?: () => void;
    /** Fill the parent's height instead of using the fixed default viewport height. */
    fillContainer?: boolean;
    /** Reports connection state changes to the parent (console header status dot). */
    onStatusChange?: (status: VncStatus) => void;
    /** Receives toolbar actions (a plain prop rather than `ref`, so it survives next/dynamic). */
    handleRef?: Ref<VncConsoleHandle>;
}

export type VncStatus = 'connecting' | 'connected' | 'disconnected';

/** Imperative actions the console toolbar / text input can trigger on the live session. */
export interface VncConsoleHandle {
    sendCtrlAltDel: () => void;
    /** Hold or release a sticky modifier in the guest (Ctrl / Alt / Shift / Win). */
    setStickyModifier: (mod: StickyModifier, down: boolean) => void;
    /** Fire a one-shot extra-key action (nav, F-keys, Ctrl+Alt+Del, …). */
    sendExtraAction: (action: ExtraKeyAction) => void;
    /**
     * Types text into the guest as physical key presses (US layout scancodes + explicit Shift),
     * in small chunks so QEMU's input queue does not drop keys. `\n` presses Enter.
     * Resolves false when not connected or when cancelled by a newer call.
     */
    typeText: (text: string, onProgress?: (done: number, total: number) => void) => Promise<boolean>;
    /** PNG data URL of the current screen, or null when nothing is rendered yet. */
    screenshot: () => string | null;
    focus: () => void;
}

/** Keys per burst and pause between bursts while typing. */
const TYPE_CHUNK = 16;
const TYPE_PAUSE_MS = 25;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Embedded noVNC console. Connects the browser to a VNC-over-WebSocket
 * endpoint (FeatherPanel `/vnc-proxy/{token}` relay or a direct Proxmox
 * vncwebsocket URL) and renders the screen into a canvas.
 *
 * Proxy tokens are single-use and short-lived, so the session must only be
 * (re)opened when `url` changes, never on a plain parent re-render.
 *
 * `@novnc/novnc` touches `window` at module load - import it only in the
 * browser via dynamic import, never at the top level (SSR).
 *
 * Connection is deferred a tick so React Strict Mode's mount→unmount→remount
 * does not burn the single-use panel ticket on the discarded first mount.
 */
export function VncConsole({
    url,
    password,
    className,
    onDisconnect,
    fillContainer = false,
    onStatusChange,
    handleRef,
}: VncConsoleProps) {
    const { t } = useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const rfbRef = useRef<RFB | null>(null);
    const typingRunRef = useRef(0);
    const stickyRef = useRef<Record<StickyModifier, boolean>>({
        ctrl: false,
        alt: false,
        shift: false,
        meta: false,
    });
    const [status, setStatus] = useState<VncStatus>('connecting');
    const onStatusChangeRef = useRef(onStatusChange);
    useEffect(() => {
        onStatusChangeRef.current = onStatusChange;
    }, [onStatusChange]);
    useEffect(() => {
        onStatusChangeRef.current?.(status);
    }, [status]);

    const tapKey = (rfb: RFB, key: VncKeySpec) => {
        rfb.sendKey(key.keysym, key.code, true);
        rfb.sendKey(key.keysym, key.code, false);
    };

    const releaseAllSticky = (rfb: RFB | null) => {
        if (!rfb) return;
        (Object.keys(stickyRef.current) as StickyModifier[]).forEach((mod) => {
            if (!stickyRef.current[mod]) return;
            const spec = STICKY_MODIFIERS[mod];
            rfb.sendKey(spec.keysym, spec.code, false);
            stickyRef.current[mod] = false;
        });
    };

    useImperativeHandle(
        handleRef,
        () => ({
            sendCtrlAltDel: () => {
                rfbRef.current?.sendCtrlAltDel();
            },
            setStickyModifier: (mod, down) => {
                const rfb = rfbRef.current;
                if (!rfb || status !== 'connected') return;
                if (stickyRef.current[mod] === down) return;
                const spec = STICKY_MODIFIERS[mod];
                rfb.sendKey(spec.keysym, spec.code, down);
                stickyRef.current[mod] = down;
            },
            sendExtraAction: (action) => {
                const rfb = rfbRef.current;
                if (!rfb || status !== 'connected') return;
                if (action.cad) {
                    rfb.sendCtrlAltDel();
                    return;
                }
                const tempMods = (action.mods ?? []).filter((m) => !stickyRef.current[m]);
                for (const mod of tempMods) {
                    const spec = STICKY_MODIFIERS[mod];
                    rfb.sendKey(spec.keysym, spec.code, true);
                }
                for (const key of action.keys) {
                    tapKey(rfb, key);
                }
                for (const mod of [...tempMods].reverse()) {
                    const spec = STICKY_MODIFIERS[mod];
                    rfb.sendKey(spec.keysym, spec.code, false);
                }
            },
            typeText: async (text: string, onProgress?: (done: number, total: number) => void) => {
                const rfb = rfbRef.current;
                if (!rfb || status !== 'connected') return false;
                const run = ++typingRunRef.current;
                const chars = Array.from(normalizeTypedText(text));
                for (let i = 0; i < chars.length; i++) {
                    if (typingRunRef.current !== run || rfbRef.current !== rfb) return false;
                    const { keysym, code, shift } = strokeFor(chars[i]);
                    if (shift) rfb.sendKey(XK_SHIFT_L, 'ShiftLeft', true);
                    rfb.sendKey(keysym, code, true);
                    rfb.sendKey(keysym, code, false);
                    if (shift) rfb.sendKey(XK_SHIFT_L, 'ShiftLeft', false);
                    if ((i + 1) % TYPE_CHUNK === 0) {
                        onProgress?.(i + 1, chars.length);
                        await sleep(TYPE_PAUSE_MS);
                    }
                }
                onProgress?.(chars.length, chars.length);
                return true;
            },
            screenshot: () => {
                const canvas = containerRef.current?.querySelector('canvas');
                if (!canvas || canvas.width === 0 || canvas.height === 0) return null;
                try {
                    return canvas.toDataURL('image/png');
                } catch {
                    return null;
                }
            },
            focus: () => {
                rfbRef.current?.focus();
            },
        }),
        [status],
    );
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

                const opts = passwordRef.current ? { credentials: { password: passwordRef.current } } : undefined;
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
                    releaseAllSticky(rfb);
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
                releaseAllSticky(rfb);
                disconnectRfb(rfb);
                rfb = null;
            }
            rfbRef.current = null;
        };
    }, [url]);

    return (
        <div
            className={cn(
                'relative overflow-hidden',
                fillContainer ? 'h-full min-h-0 bg-black' : 'bg-background rounded-lg border',
                className,
            )}
        >
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
                className={cn(
                    'mx-auto w-full overflow-hidden [&_canvas]:h-full [&_canvas]:w-full',
                    fillContainer ? 'h-full min-h-0' : 'h-[min(70vh,720px)] min-h-[480px]',
                )}
            />
        </div>
    );
}
