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

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Loader2, Monitor, RefreshCw, ShieldAlert } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import {
    featherOsApi,
    type FeatherOsSessionInfo,
} from '@/lib/featheros-api';

const INSTANCE_KEY = 'featherpanel_fos_instance_id';
const CHANNEL_NAME = 'featherpanel-fos-session';
const HEARTBEAT_MS = 25_000;
const LOCAL_PING_MS = 4_000;

type GateStatus = 'checking' | 'active' | 'blocked' | 'stolen';
type BlockReason = 'tab' | 'device' | 'unknown';

type ChannelMessage =
    | { type: 'claim'; instanceId: string; at: number }
    | { type: 'ping'; instanceId: string; at: number }
    | { type: 'pong'; instanceId: string; at: number }
    | { type: 'steal'; instanceId: string; at: number }
    | { type: 'release'; instanceId: string; at: number };

function readOrCreateInstanceId(): string {
    try {
        const existing = sessionStorage.getItem(INSTANCE_KEY);
        if (existing && /^[A-Za-z0-9_-]+$/.test(existing) && existing.length <= 64) {
            return existing;
        }
    } catch {
        // ignore
    }
    const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID().replace(/-/g, '')
            : `fos${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    try {
        sessionStorage.setItem(INSTANCE_KEY, id);
    } catch {
        // ignore
    }
    return id;
}

function buildLabel(): string {
    if (typeof navigator === 'undefined') return 'This browser';
    const ua = navigator.userAgent;
    let browser = 'Browser';
    if (/Edg\//i.test(ua)) browser = 'Edge';
    else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
    else if (/Firefox\//i.test(ua)) browser = 'Firefox';
    else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';

    let os = 'device';
    if (/Windows/i.test(ua)) os = 'Windows';
    else if (/Android/i.test(ua)) os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
    else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
    else if (/Linux/i.test(ua)) os = 'Linux';

    return `${browser} on ${os}`;
}

function conflictFromAxios(error: unknown): FeatherOsSessionInfo | null {
    if (!axios.isAxiosError(error)) return null;
    const data = error.response?.data as { data?: { conflict?: FeatherOsSessionInfo } } | undefined;
    return data?.data?.conflict ?? null;
}

export function OsSessionGate({ children }: { children: ReactNode }) {
    const { t } = useTranslation();
    const instanceId = useMemo(() => readOrCreateInstanceId(), []);
    const label = useMemo(() => buildLabel(), []);
    const [status, setStatus] = useState<GateStatus>('checking');
    const [reason, setReason] = useState<BlockReason>('unknown');
    const [conflict, setConflict] = useState<FeatherOsSessionInfo | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const channelRef = useRef<BroadcastChannel | null>(null);
    const activeRef = useRef(false);
    const instanceRef = useRef(instanceId);
    instanceRef.current = instanceId;

    const post = useCallback((message: ChannelMessage) => {
        try {
            channelRef.current?.postMessage(message);
        } catch {
            // ignore
        }
    }, []);

    const becomeBlocked = useCallback((nextReason: BlockReason, nextConflict: FeatherOsSessionInfo | null) => {
        activeRef.current = false;
        setReason(nextReason);
        setConflict(nextConflict);
        setStatus((current) => (current === 'active' ? 'stolen' : 'blocked'));
    }, []);

    const becomeActive = useCallback(() => {
        activeRef.current = true;
        setConflict(null);
        setError(null);
        setStatus('active');
        post({ type: 'claim', instanceId: instanceRef.current, at: Date.now() });
    }, [post]);

    const releaseEverywhere = useCallback(() => {
        activeRef.current = false;
        post({ type: 'release', instanceId: instanceRef.current, at: Date.now() });
        featherOsApi.releaseSessionOnUnload(instanceRef.current);
    }, [post]);

    const acquire = useCallback(
        async (force = false) => {
            setBusy(true);
            setError(null);
            try {
                // Same-browser: ask other tabs if they already own the desktop.
                if (!force) {
                    let localOwner: string | null = null;
                    await new Promise<void>((resolve) => {
                        const onMessage = (event: MessageEvent<ChannelMessage>) => {
                            const msg = event.data;
                            if (!msg || typeof msg !== 'object') return;
                            if (
                                (msg.type === 'pong' || msg.type === 'claim') &&
                                msg.instanceId &&
                                msg.instanceId !== instanceRef.current
                            ) {
                                localOwner = msg.instanceId;
                            }
                        };
                        channelRef.current?.addEventListener('message', onMessage);
                        post({ type: 'ping', instanceId: instanceRef.current, at: Date.now() });
                        window.setTimeout(() => {
                            channelRef.current?.removeEventListener('message', onMessage);
                            resolve();
                        }, 350);
                    });
                    if (localOwner) {
                        becomeBlocked('tab', {
                            instance_id: localOwner,
                            started_at: Math.floor(Date.now() / 1000),
                            heartbeat_at: Math.floor(Date.now() / 1000),
                            user_agent: '',
                            label: t('featheros.session.other_tab_label'),
                        });
                        return;
                    }
                }

                await featherOsApi.acquireSession({
                    instance_id: instanceRef.current,
                    label,
                    force,
                });
                if (force) {
                    post({ type: 'steal', instanceId: instanceRef.current, at: Date.now() });
                }
                becomeActive();
            } catch (err) {
                const remote = conflictFromAxios(err);
                if (axios.isAxiosError(err) && err.response?.status === 409) {
                    becomeBlocked(remote ? 'device' : 'unknown', remote);
                    return;
                }
                setError(t('featheros.session.acquire_failed'));
                setStatus('blocked');
                setReason('unknown');
            } finally {
                setBusy(false);
            }
        },
        [becomeActive, becomeBlocked, label, post, t],
    );

    useEffect(() => {
        let channel: BroadcastChannel | null = null;
        try {
            channel = new BroadcastChannel(CHANNEL_NAME);
            channelRef.current = channel;
        } catch {
            channelRef.current = null;
        }

        const onMessage = (event: MessageEvent<ChannelMessage>) => {
            const msg = event.data;
            if (!msg || typeof msg !== 'object' || !msg.instanceId) return;
            if (msg.instanceId === instanceRef.current) return;

            if (msg.type === 'ping' && activeRef.current) {
                post({ type: 'pong', instanceId: instanceRef.current, at: Date.now() });
                return;
            }
            if ((msg.type === 'claim' || msg.type === 'steal') && activeRef.current) {
                becomeBlocked(msg.type === 'steal' ? 'tab' : 'tab', {
                    instance_id: msg.instanceId,
                    started_at: Math.floor(Date.now() / 1000),
                    heartbeat_at: Math.floor(Date.now() / 1000),
                    user_agent: '',
                    label: t('featheros.session.other_tab_label'),
                });
                featherOsApi.releaseSessionOnUnload(instanceRef.current);
            }
        };

        channel?.addEventListener('message', onMessage);
        void acquire(false);

        const onUnload = () => {
            if (activeRef.current) releaseEverywhere();
        };
        window.addEventListener('pagehide', onUnload);
        window.addEventListener('beforeunload', onUnload);

        return () => {
            channel?.removeEventListener('message', onMessage);
            window.removeEventListener('pagehide', onUnload);
            window.removeEventListener('beforeunload', onUnload);
            if (activeRef.current) releaseEverywhere();
            try {
                channel?.close();
            } catch {
                // ignore
            }
            channelRef.current = null;
        };
        // Mount once per tab instance.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (status !== 'active') return;

        const heartbeat = window.setInterval(() => {
            void featherOsApi
                .heartbeatSession(instanceRef.current)
                .catch((err) => {
                    if (axios.isAxiosError(err) && err.response?.status === 409) {
                        becomeBlocked('device', conflictFromAxios(err));
                    }
                });
            post({ type: 'claim', instanceId: instanceRef.current, at: Date.now() });
        }, HEARTBEAT_MS);

        const localPing = window.setInterval(() => {
            post({ type: 'claim', instanceId: instanceRef.current, at: Date.now() });
        }, LOCAL_PING_MS);

        return () => {
            window.clearInterval(heartbeat);
            window.clearInterval(localPing);
        };
    }, [status, becomeBlocked, post]);

    if (status === 'checking') {
        return (
            <div className='bg-background text-muted-foreground fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3'>
                <Loader2 className='h-8 w-8 animate-spin' />
                <p className='text-sm'>{t('featheros.session.checking')}</p>
            </div>
        );
    }

    if (status === 'active') {
        return <>{children}</>;
    }

    const isStolen = status === 'stolen';
    const title = isStolen
        ? t('featheros.session.stolen_title')
        : reason === 'tab'
          ? t('featheros.session.blocked_tab_title')
          : t('featheros.session.blocked_device_title');
    const body = isStolen
        ? t('featheros.session.stolen_body')
        : reason === 'tab'
          ? t('featheros.session.blocked_tab_body')
          : t('featheros.session.blocked_device_body');

    return (
        <div className='bg-background text-foreground fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 p-8 text-center'>
            {isStolen ? (
                <ShieldAlert className='text-muted-foreground h-14 w-14' />
            ) : (
                <Monitor className='text-muted-foreground h-14 w-14' />
            )}
            <h1 className='text-xl font-semibold'>{title}</h1>
            <p className='text-muted-foreground max-w-md text-sm leading-relaxed'>{body}</p>
            {conflict?.label ? (
                <p className='text-muted-foreground/80 max-w-md text-xs'>
                    {t('featheros.session.active_elsewhere', { label: conflict.label })}
                </p>
            ) : null}
            {error ? <p className='text-destructive max-w-md text-xs'>{error}</p> : null}
            <div className='mt-2 flex flex-wrap items-center justify-center gap-2'>
                <button
                    type='button'
                    disabled={busy}
                    onClick={() => void acquire(true)}
                    className='bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60'
                >
                    {busy ? <Loader2 className='h-4 w-4 animate-spin' /> : <RefreshCw className='h-4 w-4' />}
                    {t('featheros.session.use_here')}
                </button>
                <Link
                    href='/dashboard'
                    className='border-border hover:bg-muted inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium'
                >
                    {t('featheros.session.back')}
                </Link>
            </div>
            <p className='text-muted-foreground max-w-sm text-[11px] leading-relaxed'>
                {t('featheros.session.safety_note')}
            </p>
        </div>
    );
}
