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

import { useState, useEffect, useCallback, useRef } from 'react';

const SECRET_PHRASE = 'iamasecurityhacker';
const FLAG_KEY = 'iamahacker';
const FLAG_KEY_ALT = 'fp_iamahacker';
const COOKIE_NAME = 'iamahacker';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

function setHackerFlagEverywhere() {
    try {
        localStorage.setItem(FLAG_KEY, 'true');
        localStorage.setItem(FLAG_KEY_ALT, 'true');
        sessionStorage.setItem(FLAG_KEY, 'true');
        sessionStorage.setItem(FLAG_KEY_ALT, 'true');
        document.cookie = `${COOKIE_NAME}=true; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
        document.cookie = `fp_${COOKIE_NAME}=true; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
        if (typeof window !== 'undefined' && (window as unknown as { __iamahacker?: string }).__iamahacker === undefined) {
            (window as unknown as { __iamahacker: string }).__iamahacker = 'true';
        }
    } catch {
        // ignore
    }
}

function isHackerFlagSet(): boolean {
    try {
        if (typeof window === 'undefined') return false;
        if (localStorage.getItem(FLAG_KEY) === 'true') return true;
        if (localStorage.getItem(FLAG_KEY_ALT) === 'true') return true;
        if (sessionStorage.getItem(FLAG_KEY) === 'true') return true;
        if (sessionStorage.getItem(FLAG_KEY_ALT) === 'true') return true;
        if (document.cookie.includes(`${COOKIE_NAME}=true`) || document.cookie.includes(`fp_${COOKIE_NAME}=true`)) return true;
        if ((window as unknown as { __iamahacker?: string }).__iamahacker === 'true') return true;
    } catch {
        // ignore
    }
    return false;
}

function LockScreen() {
    return (
        <div
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-background p-6 text-center"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
            <div className="max-w-md space-y-4">
                <p className="text-xl font-medium text-foreground">
                    Look what you have done script kiddy.
                </p>
                <p className="text-muted-foreground">
                    Hahahah how funny you are you think you&apos;re a hacker or something? Okay then, let&apos;s see how you get rid of me.
                </p>
            </div>
        </div>
    );
}

export default function HackerEasterEgg({ children }: { children: React.ReactNode }) {
    const [locked, setLocked] = useState(false);
    const [showTriggerMessage, setShowTriggerMessage] = useState(false);
    const bufferRef = useRef('');

    const checkLock = useCallback(() => {
        if (isHackerFlagSet()) setLocked(true);
    }, []);

    useEffect(() => {
        queueMicrotask(checkLock);
    }, [checkLock]);

    useEffect(() => {
        if (locked) return;

        function onKeyPress(e: KeyboardEvent) {
            const key = e.key.length === 1 ? e.key : '';
            if (!key) return;
            bufferRef.current = (bufferRef.current + key).slice(-SECRET_PHRASE.length);
            if (bufferRef.current === SECRET_PHRASE) {
                setShowTriggerMessage(true);
                setHackerFlagEverywhere();
                setTimeout(() => {
                    setLocked(true);
                }, 3000);
            }
        }

        window.addEventListener('keypress', onKeyPress);
        return () => window.removeEventListener('keypress', onKeyPress);
    }, [locked]);

    if (locked) {
        return <LockScreen />;
    }

    return (
        <>
            {showTriggerMessage && (
                <div
                    className="fixed inset-0 z-[99998] flex flex-col items-center justify-center bg-background/95 p-6 text-center backdrop-blur-sm"
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                >
                    <div className="max-w-md space-y-4">
                        <p className="text-xl font-medium text-foreground">
                            Hahahah how funny you are you think you&apos;re a hacker or something?
                        </p>
                        <p className="text-foreground">
                            Okay then, let&apos;s see how you get rid of me.
                        </p>
                        <p className="text-sm text-muted-foreground">
                            (Redirecting you to your new home in 3…)
                        </p>
                    </div>
                </div>
            )}
            {children}
        </>
    );
}
