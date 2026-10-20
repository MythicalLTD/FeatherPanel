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

import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';

interface KeyboardLockApi {
    lock?: (keyCodes?: string[]) => Promise<void>;
    unlock?: () => void;
}

function keyboardApi(): KeyboardLockApi | undefined {
    if (typeof navigator === 'undefined') return undefined;
    return (navigator as Navigator & { keyboard?: KeyboardLockApi }).keyboard;
}

export const FOS_SHORTCUTS_EVENT = 'featheros:shortcuts';
export const FOS_SWITCHER_EVENT = 'featheros:switcher';

/** off → nothing; fullscreen → fullscreen but OS still owns Alt+Tab/Win; locked → FeatherOS owns them. */
export type ImmersiveState = 'off' | 'fullscreen' | 'locked';

let state: ImmersiveState = 'off';
let lastError: string | null = null;
const listeners = new Set<() => void>();

function setState(next: ImmersiveState) {
    if (next === state) return;
    state = next;
    listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    if (listeners.size === 1 && typeof document !== 'undefined') {
        document.addEventListener('fullscreenchange', onFullscreenChange);
    }
    return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof document !== 'undefined') {
            document.removeEventListener('fullscreenchange', onFullscreenChange);
        }
    };
}

function onFullscreenChange() {
    if (!document.fullscreenElement) {
        keyboardApi()?.unlock?.();
        setState('off');
    } else if (state === 'off') {
        setState('fullscreen');
    }
}

export function isMacPlatform() {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

export function keyboardLockSupported() {
    return !!keyboardApi()?.lock;
}

export function isImmersive() {
    return typeof document !== 'undefined' && !!document.fullscreenElement;
}

export function immersiveError() {
    return lastError;
}

/**
 * Fullscreen + Keyboard Lock (the same trick cloud-gaming sites use): Chromium only
 * hands Alt+Tab, the Win key and its chords to the page while both are active.
 * Must run inside a user gesture (click / keydown).
 */
export async function enterImmersive(): Promise<ImmersiveState> {
    lastError = null;
    if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
    setState('fullscreen');
    const kb = keyboardApi();
    if (!kb?.lock) {
        lastError = 'unsupported';
        return state;
    }
    try {
        await kb.lock();
        setState('locked');
    } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
    }
    return state;
}

export async function exitImmersive() {
    keyboardApi()?.unlock?.();
    if (document.fullscreenElement) await document.exitFullscreen();
    setState('off');
}

export async function toggleImmersive(): Promise<ImmersiveState> {
    if (isImmersive()) {
        await exitImmersive();
        return 'off';
    }
    return enterImmersive();
}

export function toggleImmersiveWithFeedback(t: (key: string, params?: Record<string, string>) => string) {
    const entering = !isImmersive();
    void toggleImmersive()
        .then((result) => {
            if (!entering) return;
            if (result === 'locked') toast.success(t('featheros.immersive.entered'));
            else
                toast.warning(t('featheros.immersive.entered_no_lock'), {
                    description: lastError && lastError !== 'unsupported' ? lastError : undefined,
                });
        })
        .catch((error) =>
            toast.error(t('featheros.immersive.failed'), {
                description: error instanceof Error ? error.message : undefined,
            }),
        );
}

export function useImmersiveState(): ImmersiveState {
    return useSyncExternalStore(
        subscribe,
        () => state,
        () => 'off',
    );
}

export function useImmersive() {
    return useImmersiveState() !== 'off';
}
