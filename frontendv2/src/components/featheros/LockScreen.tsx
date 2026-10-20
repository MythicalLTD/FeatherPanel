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

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowRight, Lock } from 'lucide-react';
import { useSession } from '@/contexts/SessionContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { useFeatherOs } from './FeatherOsContext';
import { resolveWallpaper } from './wallpapers';

const STORAGE_KEY = 'featheros:locked';
const LEAVE_MS = 420;
const UNLOCK_GRACE_MS = 450;

let locked = false;
const listeners = new Set<() => void>();

function setLocked(next: boolean) {
    if (locked === next) return;
    locked = next;
    try {
        if (next) sessionStorage.setItem(STORAGE_KEY, '1');
        else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
        /* storage unavailable */
    }
    listeners.forEach((l) => l());
}

export const isOsLocked = () => locked;
export const lockOs = () => setLocked(true);

function useOsLocked() {
    return useSyncExternalStore(
        (cb) => {
            listeners.add(cb);
            return () => listeners.delete(cb);
        },
        () => locked,
        () => false,
    );
}

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'Fn', 'OS']);

export function LockScreen() {
    const { t, locale } = useTranslation();
    const { user } = useSession();
    const { settings, isDark } = useFeatherOs();
    const isLocked = useOsLocked();
    const [now, setNow] = useState(() => new Date());
    const [leaving, setLeaving] = useState(false);
    const lastActivity = useRef(0);
    const lockAfter = Math.max(0, settings.lockAfterMinutes ?? 0);

    useEffect(() => {
        try {
            if (sessionStorage.getItem(STORAGE_KEY) === '1') setLocked(true);
        } catch {
            /* storage unavailable */
        }
    }, []);

    useEffect(() => {
        if (lockAfter <= 0) return;
        const bump = () => {
            lastActivity.current = Date.now();
        };
        const events = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
        events.forEach((ev) => window.addEventListener(ev, bump, { capture: true, passive: true }));
        bump();
        const timer = window.setInterval(() => {
            if (
                !locked &&
                document.visibilityState === 'visible' &&
                Date.now() - lastActivity.current > lockAfter * 60_000
            ) {
                setLocked(true);
            }
        }, 10_000);
        return () => {
            events.forEach((ev) => window.removeEventListener(ev, bump, { capture: true }));
            window.clearInterval(timer);
        };
    }, [lockAfter]);

    const lockedAt = useRef(0);
    useEffect(() => {
        if (isLocked) lockedAt.current = Date.now();
    }, [isLocked]);

    const unlock = useCallback(() => {
        if (leaving || Date.now() - lockedAt.current < UNLOCK_GRACE_MS) return;
        setLeaving(true);
        window.setTimeout(
            () => {
                setLocked(false);
                setLeaving(false);
                lastActivity.current = Date.now();
            },
            settings.reduceMotion ? 0 : LEAVE_MS,
        );
    }, [leaving, settings.reduceMotion]);

    useEffect(() => {
        if (!isLocked) return;
        setNow(new Date());
        const timer = window.setInterval(() => setNow(new Date()), 1000);
        const swallow = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.type === 'keydown' && !MODIFIER_KEYS.has(e.key) && !e.repeat) unlock();
        };
        window.addEventListener('keydown', swallow, true);
        window.addEventListener('keyup', swallow, true);
        (document.activeElement as HTMLElement | null)?.blur?.();
        return () => {
            window.clearInterval(timer);
            window.removeEventListener('keydown', swallow, true);
            window.removeEventListener('keyup', swallow, true);
        };
    }, [isLocked, unlock]);

    if (!isLocked) return null;

    const wallpaper = resolveWallpaper(settings.wallpaper, isDark, settings.customWallpaperUrl);
    let time = '';
    let date = '';
    try {
        // macOS shows "9:41", never "09:41 AM".
        time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12: !settings.clock24h })
            .formatToParts(now)
            .filter((p) => p.type !== 'dayPeriod')
            .map((p) => p.value)
            .join('')
            .trim();
        date = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
    } catch {
        time = now.toLocaleTimeString();
        date = now.toLocaleDateString();
    }
    const fullName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username : '';
    const initials = fullName
        .split(/\s+/)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <div
            className='fos-lock'
            data-leaving={leaving ? 'true' : undefined}
            role='dialog'
            aria-modal='true'
            aria-label={t('featheros.lock.title')}
            onPointerDown={(e) => {
                e.preventDefault();
                unlock();
            }}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className='fos-lock-wallpaper' style={{ background: wallpaper }} />
            <div className='fos-lock-shade' />
            <div className='fos-lock-clock'>
                <span className='fos-lock-date'>{date}</span>
                <span className='fos-lock-time'>{time}</span>
            </div>
            <div className='fos-lock-user'>
                <span className='fos-lock-avatar'>
                    {user?.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatar} alt='' />
                    ) : (
                        initials || <Lock className='h-6 w-6' />
                    )}
                </span>
                {fullName && <span className='fos-lock-name'>{fullName}</span>}
                <span className='fos-lock-pill'>
                    <span>{t('featheros.lock.hint')}</span>
                    <span className='fos-lock-go' aria-hidden>
                        <ArrowRight className='h-3 w-3' strokeWidth={2.75} />
                    </span>
                </span>
            </div>
        </div>
    );
}
