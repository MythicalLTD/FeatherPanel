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

/**
 * Syncs the user's interface settings (theme, accent, density, text size, language,
 * sidebar and dock, list views and columns, dashboard layout...) to their account so a
 * change made on one device shows up on the others.
 *
 * The panel keeps these settings in localStorage and many places read them once on
 * mount. Instead of changing every reader, this module watches writes to an allowlist
 * of keys, pushes them to `/api/user/preferences/ui` (debounced) and, when the account
 * holds newer values than this browser, writes them back into localStorage and reloads
 * once so every reader picks them up. Values already in localStorage from before this
 * existed are uploaded on the first sync, so nobody loses their setup.
 */

import { getClientSyncHeaders } from '@/lib/clientIdentity';

const ENDPOINT = '/api/user/preferences/ui';
const STATE_KEY = 'featherpanel_ui_sync_state_v1';
const RELOAD_GUARD_KEY = 'featherpanel_ui_sync_reloaded';
const APPLIED_FLAG_KEY = 'featherpanel_ui_sync_applied';
const FLUSH_DELAY_MS = 2000;
const RELOAD_GUARD_MS = 30_000;
const MAX_VALUE_LENGTH = 60_000;
const MAX_BATCH = 100;

/** Keys synced as they are. Device-only and security-related keys are deliberately absent. */
const SYNCED_KEYS = new Set<string>([
    // Theme and appearance
    'theme',
    'accentColor',
    'fontFamily',
    'backgroundType',
    'backgroundAnimatedVariant',
    'backgroundImage',
    'backdropBlur',
    'backdropDarken',
    'backgroundImageFit',
    'motionLevel',
    'uiDensity',
    'uiScale',
    'themeUserOverride',
    'accentColorUserOverride',
    'backgroundTypeUserOverride',
    'backdropBlurUserOverride',
    'backdropDarkenUserOverride',
    'backgroundImageFitUserOverride',
    'themePackId',
    'themePackUserOverride',
    'uiPackId',
    'uiPackUserOverride',
    // Language
    'locale',
    'localeUserOverride',
    // Sidebar, dock and chrome
    'featherpanel_sidebar_density',
    'featherpanel_sidebar_style',
    'featherpanel_sidebar_position',
    'featherpanel_sidebar_collapsed',
    'featherpanel_collapsed_submenus',
    'featherpanel_sidebar_toggle_placement',
    'featherpanel_dock_display',
    'featherpanel_dock_size',
    'featherpanel_chrome_glow',
    'featherpanel_icon_library',
    'featherpanel-chrome-layout',
    'featherpanel_navbar_sticky',
    'featherpanel_navbar_hover_reveal',
    // Lists, folders and views
    'servers_preferences',
    'webspaces_preferences',
    'server_folders',
    'server_folder_assignments',
    'featherpanel_vms_sort',
    'featherpanel_vms_running_only',
    'featherpanel_vms_layout',
    'admin-hidden-widgets',
    'featherpanel_server_switcher_tab',
    'featherpanel_webspace_switcher_tab',
    // Dashboard and recents
    'featherpanel_dashboard_layout_v1',
    'featherpanel_recent_servers_v1',
    'featherpanel_recent_webspaces_v1',
    // Console, files and misc behaviour
    'featherpanel_terminal_autoscroll',
    'featherpanel_skip_kill_confirm',
    'featherpanel_dismissed_notifications',
    'featherpanel_onboarding_tour',
    'featherpanel_files_view_prefs',
    'featherpanel_files_quick_access',
    'featherpanel-file-editor-engine',
    'featherpanel.calagopus.uriScheme',
]);

/** Families of keys (admin list filters with page size and columns, console filters, newer dashboard versions). */
const SYNCED_PATTERNS: RegExp[] = [
    /^featherpanel_admin_[a-z0-9_-]+_filters_v\d+$/i,
    /^featherpanel_console_filters_[A-Za-z0-9_.:-]+$/,
    /^featherpanel_dashboard_[a-z0-9_]+_v\d+$/i,
];

/**
 * Keys read when used rather than once on mount: applying them needs no reload, a
 * storage event is enough for anything listening.
 */
const LIVE_KEYS = new Set<string>([
    'featherpanel_recent_servers_v1',
    'featherpanel_recent_webspaces_v1',
    'featherpanel_dismissed_notifications',
    'featherpanel_server_switcher_tab',
    'featherpanel_webspace_switcher_tab',
    'featherpanel_terminal_autoscroll',
    'featherpanel_skip_kill_confirm',
    'featherpanel-file-editor-engine',
    'featherpanel.calagopus.uriScheme',
]);

function isLiveKey(key: string): boolean {
    return LIVE_KEYS.has(key) || key.startsWith('featherpanel_console_filters_');
}

const KEY_SHAPE = /^[A-Za-z0-9_.:-]{1,128}$/;

export function isSyncedUiKey(key: string): boolean {
    if (!KEY_SHAPE.test(key) || key === STATE_KEY) return false;
    return SYNCED_KEYS.has(key) || SYNCED_PATTERNS.some((re) => re.test(key));
}

type Value = string | null;

interface SyncState {
    /** Account the values in this browser were last synced with. */
    userUuid: string | null;
    /** Local changes not yet confirmed by the server. */
    pending: Record<string, Value>;
    /** Last value seen on, or confirmed by, the server. */
    known: Record<string, Value>;
    lastSync: number;
}

interface ServerEntry {
    v: Value;
    t: number;
}

let originalSetItem: Storage['setItem'] | null = null;
let originalRemoveItem: Storage['removeItem'] | null = null;
let activeUser: string | null = null;
let applying = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing: Promise<void> | null = null;
let listenersAttached = false;
let starting: { user: string; promise: Promise<UiPrefsSyncResult> } | null = null;

function storage(): Storage | null {
    try {
        return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
        return null;
    }
}

function rawSet(key: string, value: string): void {
    const ls = storage();
    if (!ls) return;
    try {
        (originalSetItem ?? Storage.prototype.setItem).call(ls, key, value);
    } catch {
        // Quota or privacy mode: syncing is best effort.
    }
}

function rawRemove(key: string): void {
    const ls = storage();
    if (!ls) return;
    try {
        (originalRemoveItem ?? Storage.prototype.removeItem).call(ls, key);
    } catch {
        // ignore
    }
}

function readState(): SyncState {
    const empty: SyncState = { userUuid: null, pending: {}, known: {}, lastSync: 0 };
    try {
        const raw = storage()?.getItem(STATE_KEY);
        if (!raw) return empty;
        const parsed = JSON.parse(raw) as Partial<SyncState>;
        return {
            userUuid: typeof parsed.userUuid === 'string' ? parsed.userUuid : null,
            pending: parsed.pending && typeof parsed.pending === 'object' ? parsed.pending : {},
            known: parsed.known && typeof parsed.known === 'object' ? parsed.known : {},
            lastSync: typeof parsed.lastSync === 'number' ? parsed.lastSync : 0,
        };
    } catch {
        return empty;
    }
}

function writeState(state: SyncState): void {
    rawSet(STATE_KEY, JSON.stringify(state));
}

function recordLocalChange(key: string, value: Value): void {
    if (applying || !activeUser || !isSyncedUiKey(key)) return;
    if (value !== null && value.length > MAX_VALUE_LENGTH) return;
    const state = readState();
    if (state.userUuid !== activeUser) return;
    const known = Object.prototype.hasOwnProperty.call(state.known, key) ? state.known[key] : undefined;
    if (known === value || (known === undefined && value === null)) {
        // Back to what the server already has: nothing to send.
        if (key in state.pending) {
            delete state.pending[key];
            writeState(state);
        }
        return;
    }
    state.pending[key] = value;
    writeState(state);
    scheduleFlush();
}

function installObserver(): void {
    if (originalSetItem || typeof window === 'undefined' || typeof Storage === 'undefined') return;
    originalSetItem = Storage.prototype.setItem;
    originalRemoveItem = Storage.prototype.removeItem;
    const set = originalSetItem;
    const remove = originalRemoveItem;
    Storage.prototype.setItem = function patchedSetItem(this: Storage, key: string, value: string) {
        set.call(this, key, value);
        if (this === storage()) recordLocalChange(String(key), String(value));
    };
    Storage.prototype.removeItem = function patchedRemoveItem(this: Storage, key: string) {
        remove.call(this, key);
        if (this === storage()) recordLocalChange(String(key), null);
    };
}

function requestHeaders(): Record<string, string> {
    return { 'Content-Type': 'application/json', ...(getClientSyncHeaders() ?? {}) };
}

function scheduleFlush(): void {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
        flushTimer = null;
        void flushUiPrefs();
    }, FLUSH_DELAY_MS);
}

/** Push pending local changes to the account now. */
export function flushUiPrefs(): Promise<void> {
    if (flushing) return flushing;
    flushing = (async () => {
        try {
            const user = activeUser;
            if (!user) return;
            const keys = Object.keys(readState().pending);
            for (let i = 0; i < keys.length; i += MAX_BATCH) {
                const state = readState();
                if (state.userUuid !== user || activeUser !== user) return;
                const batch: Record<string, Value> = {};
                for (const key of keys.slice(i, i + MAX_BATCH)) {
                    if (key in state.pending) batch[key] = state.pending[key];
                }
                if (Object.keys(batch).length === 0) continue;
                let res: Response;
                try {
                    res = await fetch(ENDPOINT, {
                        method: 'PATCH',
                        credentials: 'same-origin',
                        headers: requestHeaders(),
                        body: JSON.stringify({ entries: batch }),
                    });
                } catch {
                    return; // Offline: keep pending, retry on the next change or load.
                }
                const after = readState();
                if (after.userUuid !== user) return;
                if (res.ok || res.status === 400 || res.status === 413) {
                    // On a rejection, drop the batch so one bad value cannot block every later save.
                    for (const [key, value] of Object.entries(batch)) {
                        if (res.ok) after.known[key] = value;
                        if (after.pending[key] === value) delete after.pending[key];
                    }
                    after.lastSync = Date.now();
                    writeState(after);
                } else {
                    return;
                }
            }
        } finally {
            flushing = null;
        }
    })();
    return flushing;
}

/** Best effort send when the tab goes away; keepalive survives the unload. */
function flushOnPageHide(): void {
    if (!activeUser) return;
    if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
    }
    const pending = readState().pending;
    if (Object.keys(pending).length === 0) return;
    const body = JSON.stringify({ entries: pending });
    if (body.length > 60_000 || Object.keys(pending).length > MAX_BATCH) return;
    try {
        void fetch(ENDPOINT, {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: requestHeaders(),
            body,
            keepalive: true,
        });
    } catch {
        // Next load retries the pending changes.
    }
}

function attachListeners(): void {
    if (listenersAttached || typeof window === 'undefined') return;
    listenersAttached = true;
    window.addEventListener('pagehide', flushOnPageHide);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushOnPageHide();
    });
}

function localValue(key: string): Value {
    try {
        return storage()?.getItem(key) ?? null;
    } catch {
        return null;
    }
}

function localSyncedKeys(): string[] {
    const ls = storage();
    if (!ls) return [];
    const keys: string[] = [];
    for (let i = 0; i < ls.length; i++) {
        const key = ls.key(i);
        if (key && isSyncedUiKey(key)) keys.push(key);
    }
    return keys;
}

function reloadOnce(): boolean {
    try {
        const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || '0');
        if (Date.now() - last < RELOAD_GUARD_MS) return false;
        sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
        sessionStorage.setItem(APPLIED_FLAG_KEY, '1');
    } catch {
        return false;
    }
    window.location.reload();
    return true;
}

/**
 * True once after a reload caused by applying settings from the account, so the UI can
 * say so. Reading clears the flag.
 */
export function consumeUiPrefsAppliedFlag(): boolean {
    try {
        if (sessionStorage.getItem(APPLIED_FLAG_KEY) !== '1') return false;
        sessionStorage.removeItem(APPLIED_FLAG_KEY);
        return true;
    } catch {
        return false;
    }
}

export interface UiPrefsSyncResult {
    /** Values from the account were written to this browser. */
    applied: string[];
    /** Local values uploaded (first sync on this browser or unsent changes). */
    uploaded: string[];
    /** The page is reloading to show the applied settings. */
    reloading: boolean;
}

/**
 * Start syncing for the signed-in user: pull the account copy, merge it with this
 * browser, upload what the account is missing and keep watching for changes.
 * Call once the session user is known; pass null on sign out.
 */
export function startUiPrefsSync(userUuid: string | null): Promise<UiPrefsSyncResult> {
    const none: UiPrefsSyncResult = { applied: [], uploaded: [], reloading: false };
    if (typeof window === 'undefined') return Promise.resolve(none);
    if (!userUuid) {
        activeUser = null;
        starting = null;
        return Promise.resolve(none);
    }
    installObserver();
    attachListeners();
    if (activeUser === userUuid) return Promise.resolve(none);
    if (starting?.user === userUuid) return starting.promise;
    const promise = pullAndMerge(userUuid).finally(() => {
        if (starting?.promise === promise) starting = null;
    });
    starting = { user: userUuid, promise };
    return promise;
}

async function pullAndMerge(userUuid: string): Promise<UiPrefsSyncResult> {
    const none: UiPrefsSyncResult = { applied: [], uploaded: [], reloading: false };

    let remote: Record<string, ServerEntry>;
    try {
        const res = await fetch(ENDPOINT, { credentials: 'same-origin', headers: requestHeaders() });
        if (!res.ok) return none;
        const json = (await res.json()) as { success?: boolean; data?: { entries?: Record<string, ServerEntry> } };
        if (!json?.success) return none;
        remote = json.data?.entries && typeof json.data.entries === 'object' ? json.data.entries : {};
    } catch {
        return none; // Offline or server down: keep using this browser's values.
    }

    const previous = readState();
    const sameAccount = previous.userUuid === userUuid;
    // Only a browser that never synced uploads the values it already had (settings from
    // before sync existed). Later loads send only changes the observer recorded, so values
    // left behind by another account on this browser are never sent to this one.
    const migrate = previous.userUuid === null;
    const pending: Record<string, Value> = sameAccount ? { ...previous.pending } : {};
    const known: Record<string, Value> = {};
    const applied: string[] = [];

    applying = true;
    try {
        for (const [key, entry] of Object.entries(remote)) {
            if (!isSyncedUiKey(key) || !entry || (entry.v !== null && typeof entry.v !== 'string')) continue;
            known[key] = entry.v;
            if (key in pending) continue; // Unsent local change on this browser wins.
            if (localValue(key) === entry.v) continue;
            if (entry.v === null) rawRemove(key);
            else rawSet(key, entry.v);
            applied.push(key);
        }
    } finally {
        applying = false;
    }

    if (migrate) {
        for (const key of localSyncedKeys()) {
            if (key in known || key in pending) continue;
            const value = localValue(key);
            if (value !== null && value.length <= MAX_VALUE_LENGTH) pending[key] = value;
        }
    }

    writeState({ userUuid, pending, known, lastSync: Date.now() });
    activeUser = userUuid;
    const uploaded = Object.keys(pending);
    if (uploaded.length > 0) void flushUiPrefs();

    if (applied.some((key) => !isLiveKey(key))) {
        await flushing;
        return { applied, uploaded, reloading: reloadOnce() };
    }
    for (const key of applied) {
        try {
            window.dispatchEvent(new StorageEvent('storage', { key, newValue: localValue(key) }));
        } catch {
            // Old browsers without the StorageEvent constructor.
        }
    }
    return { applied, uploaded, reloading: false };
}
