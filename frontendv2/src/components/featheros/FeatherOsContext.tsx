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

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import api, { getFeatherpanelApiErrorCode, getFeatherpanelApiErrorMessage } from '@/lib/api';
import { serversApi } from '@/lib/servers-api';
import { filesApi } from '@/lib/files-api';
import { featherOsApi } from '@/lib/featheros-api';
import PermissionsClass from '@/lib/permissions';
import { useSession } from '@/contexts/SessionContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { useServersWebSocket, type ServerLiveData } from '@/hooks/useServersWebSocket';
import type { Server } from '@/types/server';
import { OS_APPS, isOsAppId } from './registry';
import {
    DEFAULT_DOCK,
    DEFAULT_SETTINGS,
    DEFAULT_WIDGETS,
    MENU_BAR_HEIGHT,
    OS_WIDGET_TYPES,
    type OsAppId,
    type OsContextMenuItem,
    type OsDesktopIcon,
    type OsDesktopWidget,
    type OsFileDragPayload,
    type OsPersistedState,
    type OsSettings,
    type OsWidgetType,
    type OsWindow,
    type OsWorkspace,
} from './types';

const MAX_WORKSPACES = 12;
import { clamp, joinPath, normalizeDir, uid } from './utils';

const NODE_UNREACHABLE_CODES = new Set(['DAEMON_UNREACHABLE', 'WINGS_CONNECTION_UNAVAILABLE', 'NODE_UNREACHABLE']);

/** Wings / node offline - map to a calm FeatherOS string instead of raw API dump. */
function isNodeUnreachableError(error: unknown, code: string | null, message: string): boolean {
    if (code && NODE_UNREACHABLE_CODES.has(code)) return true;

    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const axiosCode = axios.isAxiosError(error) ? error.code : undefined;
    const m = message.toLowerCase();
    const genericTransport =
        /^request failed with status code (500|502|503)$/i.test(message.trim()) ||
        m === 'internal server error' ||
        m === 'network error' ||
        axiosCode === 'ECONNABORTED' ||
        axiosCode === 'ERR_NETWORK';

    // Offline nodes often still arrive as a bare 500 / axios transport string.
    if (status === 502 || status === 503 || status === 504) return true;
    if (
        status === 500 &&
        (genericTransport || !code || code === 'INTERNAL_SERVER_ERROR' || /WINGS|DAEMON|NODE|FETCH_FILES/i.test(code))
    ) {
        return true;
    }

    return (
        m.includes('failed to reach the node') ||
        m.includes('could not reach the node') ||
        m.includes('wings connection unavailable') ||
        m.includes('wings connection is unavailable') ||
        m.includes('connection refused') ||
        m.includes('connection failed') ||
        genericTransport ||
        (m.includes('timed out') && (m.includes('wings') || m.includes('node') || m.includes('daemon')))
    );
}

export interface OsNotification {
    id: string;
    title: string;
    body?: string;
    at: number;
    kind?: 'info' | 'success' | 'error' | 'server';
    serverUuid?: string;
}

export interface OsTransfer {
    uuid: string;
    mode: 'copy' | 'move';
    source_root: string;
    files: string[];
    destination: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    stage: string;
    method: string | null;
    error: string | null;
    created_at: string;
    finished_at: string | null;
    source_server: string;
    source_name: string;
    target_server: string;
    target_name: string;
}

interface DialogRequest {
    id: string;
    kind: 'prompt' | 'confirm';
    title: string;
    message?: string;
    defaultValue?: string;
    placeholder?: string;
    confirmLabel?: string;
    danger?: boolean;
    resolve: (value: string | boolean | null) => void;
}

interface ContextMenuState {
    x: number;
    y: number;
    items: OsContextMenuItem[];
}

export interface OpenAppOptions {
    serverUuid?: string | null;
    props?: Record<string, unknown>;
    /** Always open a new window, even for apps that would focus an existing one. */
    newWindow?: boolean;
}

type FilesChangedListener = (serverUuid: string, dir: string) => void;

interface FeatherOsContextValue {
    osName: string;
    panelName: string;
    logoUrl: string;
    version: string | null;
    ready: boolean;
    bootPhase: 'session' | 'state' | 'servers' | 'done';
    bootProgress: number;
    servers: Server[];
    serversLoading: boolean;
    refreshServers: () => Promise<void>;
    getServer: (uuidShort: string | null | undefined) => Server | undefined;
    live: Record<string, ServerLiveData>;
    can: (server: Server | string | null | undefined, permission: string) => boolean;
    serversWith: (permission?: string) => Server[];

    windows: OsWindow[];
    focusedId: string | null;
    openApp: (app: OsAppId, options?: OpenAppOptions) => string;
    closeWindow: (id: string) => void;
    closeAppWindows: (app: OsAppId) => void;
    focusWindow: (id: string) => void;
    minimizeWindow: (id: string) => void;
    toggleMaximize: (id: string) => void;
    setWindowGeometry: (id: string, geo: Partial<Pick<OsWindow, 'x' | 'y' | 'w' | 'h'>>) => void;
    updateWindowProps: (id: string, patch: Record<string, unknown>) => void;
    setWindowServer: (id: string, serverUuid: string | null) => void;
    openFileInEditor: (serverUuid: string, path: string) => void;
    openTerminalFor: (serverUuid: string) => void;

    icons: OsDesktopIcon[];
    upsertIcon: (icon: OsDesktopIcon) => void;
    removeIcon: (id: string) => void;
    widgets: OsDesktopWidget[];
    addWidget: (type: OsWidgetType) => void;
    removeWidget: (id: string) => void;
    reorderWidgets: (orderedIds: string[]) => void;
    dock: OsAppId[];
    setDock: (dock: OsAppId[]) => void;
    settings: OsSettings;
    updateSettings: (patch: Partial<OsSettings>) => void;
    saveWorkspace: (name: string) => OsWorkspace;
    restoreWorkspace: (id: string) => boolean;
    deleteWorkspace: (id: string) => void;
    isDark: boolean;
    setOsTheme: (theme: OsSettings['theme']) => void;
    resetDesktop: () => Promise<void>;
    activeSpace: number;
    setActiveSpace: (space: number) => void;
    missionControlOpen: boolean;
    setMissionControlOpen: (open: boolean) => void;
    notificationsOpen: boolean;
    setNotificationsOpen: (open: boolean) => void;
    osNotifications: OsNotification[];
    dismissNotification: (id: string) => void;
    clearNotifications: () => void;

    spotlightOpen: boolean;
    setSpotlightOpen: (open: boolean) => void;
    launchpadOpen: boolean;
    setLaunchpadOpen: (open: boolean) => void;
    moveWindowToSpace: (id: string, space: number) => void;
    aboutOpen: boolean;
    setAboutOpen: (open: boolean) => void;
    quickLook: { serverUuid: string; path: string; isFile: boolean } | null;
    openQuickLook: (target: { serverUuid: string; path: string; isFile: boolean }) => void;
    closeQuickLook: () => void;
    contextMenu: ContextMenuState | null;
    openContextMenu: (pos: { x: number; y: number }, items: OsContextMenuItem[]) => void;
    closeContextMenu: () => void;

    dialogs: DialogRequest[];
    prompt: (opts: {
        title: string;
        message?: string;
        defaultValue?: string;
        placeholder?: string;
        confirmLabel?: string;
    }) => Promise<string | null>;
    confirm: (opts: { title: string; message?: string; confirmLabel?: string; danger?: boolean }) => Promise<boolean>;
    resolveDialog: (id: string, value: string | boolean | null) => void;

    transfers: OsTransfer[];
    refreshTransfers: () => Promise<void>;
    moveOrCopyFiles: (
        payload: OsFileDragPayload,
        target: { serverUuid: string; dir: string },
        mode: 'move' | 'copy',
    ) => Promise<boolean>;
    emitFilesChanged: (serverUuid: string, dir: string) => void;
    onFilesChanged: (listener: FilesChangedListener) => () => void;
    errorMessage: (error: unknown, fallback?: string) => string;
}

const FeatherOsContext = createContext<FeatherOsContextValue | null>(null);

export function useFeatherOs(): FeatherOsContextValue {
    const ctx = useContext(FeatherOsContext);
    if (!ctx) throw new Error('useFeatherOs must be used inside FeatherOsProvider');
    return ctx;
}

const hasStaffServerAccess = (check: (perm: string) => boolean): boolean =>
    check(PermissionsClass.ADMIN_SERVERS_VIEW) ||
    check(PermissionsClass.ADMIN_SERVERS_EDIT) ||
    check(PermissionsClass.ADMIN_SERVERS_DELETE);

function viewport() {
    if (typeof window === 'undefined') return { w: 1440, h: 900 };
    return { w: window.innerWidth, h: window.innerHeight - MENU_BAR_HEIGHT };
}

/** Keeps restored windows on screen when the browser is smaller than where they were saved. */
function fitWindow(win: OsWindow): OsWindow {
    const vp = viewport();
    const def = OS_APPS[win.app];
    let nextW = Math.round(win.w || def.defaultSize.w);
    let nextH = Math.round(win.h || def.defaultSize.h);
    // Old terminal sessions were saved short+wide; bump them so xterm isn't a flat strip.
    if (win.app === 'terminal' && !win.maximized && nextH < 420 && nextW > 700) {
        nextH = Math.min(def.defaultSize.h, vp.h - 90);
        nextW = Math.min(Math.max(nextW, def.defaultSize.w), vp.w - 40);
    }
    const w = clamp(nextW, def.minSize.w, vp.w);
    const h = clamp(nextH, def.minSize.h, vp.h - 8);
    const x = clamp(Math.round(win.x || 0), -w + 120, vp.w - 120);
    const y = clamp(Math.round(win.y || 0), 0, vp.h - 40);
    return { ...win, w, h, x, y };
}

function sanitizeState(raw: unknown): OsPersistedState | null {
    if (!raw || typeof raw !== 'object') return null;
    const s = raw as Partial<OsPersistedState>;
    const windows = Array.isArray(s.windows)
        ? s.windows
              .filter((w): w is OsWindow => !!w && typeof w === 'object' && isOsAppId((w as OsWindow).app))
              .slice(0, 30)
              .map((w) =>
                  fitWindow({
                      ...w,
                      id: String(w.id || uid()),
                      minimized: !!w.minimized,
                      maximized: !!w.maximized,
                      space: typeof w.space === 'number' ? w.space : 0,
                  }),
              )
        : [];
    const icons = Array.isArray(s.icons)
        ? s.icons
              .filter((i): i is OsDesktopIcon => !!i && typeof i === 'object' && typeof i.id === 'string')
              .slice(0, 200)
        : [];
    const dock = Array.isArray(s.dock) ? (s.dock.filter(isOsAppId) as OsAppId[]) : DEFAULT_DOCK;
    if (!dock.includes('finder')) dock.unshift('finder');
    const rawSettings = s.settings && typeof s.settings === 'object' ? s.settings : {};
    const settings = {
        ...DEFAULT_SETTINGS,
        ...rawSettings,
        hotCorners: {
            ...DEFAULT_SETTINGS.hotCorners,
            ...(typeof (rawSettings as { hotCorners?: unknown }).hotCorners === 'object' &&
            (rawSettings as { hotCorners?: object }).hotCorners
                ? (rawSettings as { hotCorners: Partial<typeof DEFAULT_SETTINGS.hotCorners> }).hotCorners
                : {}),
        },
    };
    if (!Array.isArray(settings.workspaces)) settings.workspaces = [];
    if (!Array.isArray(settings.savedThemes)) settings.savedThemes = [];
    const activeSpace = typeof s.activeSpace === 'number' ? Math.max(0, Math.min(15, s.activeSpace)) : 0;
    const widgetTypeSet = new Set<string>(OS_WIDGET_TYPES);
    const widgets = Array.isArray(s.widgets)
        ? s.widgets
              .filter(
                  (w): w is OsDesktopWidget =>
                      !!w &&
                      typeof w === 'object' &&
                      typeof (w as OsDesktopWidget).id === 'string' &&
                      widgetTypeSet.has((w as OsDesktopWidget).type),
              )
              .map((w, i) => ({
                  id: String(w.id),
                  type: w.type as OsWidgetType,
                  order: typeof w.order === 'number' ? w.order : i,
              }))
              .sort((a, b) => a.order - b.order)
              .slice(0, 24)
        : DEFAULT_WIDGETS.map((w) => ({ ...w }));
    return { version: 1, windows, icons, dock, settings, widgets, activeSpace };
}

export function FeatherOsProvider({ children }: { children: ReactNode }) {
    const { t } = useTranslation();
    const { settings: panelSettings, core } = useSettings();
    const { user, hasPermission: hasGlobalPermission, isSessionChecked } = useSession();
    const { theme: panelTheme, setTheme: setPanelTheme, setAccentColor } = useTheme();
    const { serverLiveData, syncServers, disconnectAll } = useServersWebSocket();

    const panelName = (panelSettings?.app_name || 'Panel').trim() || 'Panel';
    const osName = `${panelName} OS`;
    const logoUrl =
        (panelTheme === 'dark' ? panelSettings?.app_logo_dark : panelSettings?.app_logo_white) ||
        panelSettings?.app_logo_dark ||
        panelSettings?.app_logo_white ||
        '/assets/logo.png';

    const [ready, setReady] = useState(false);
    const [bootPhase, setBootPhase] = useState<'session' | 'state' | 'servers' | 'done'>(
        isSessionChecked && user ? 'state' : 'session',
    );
    const [bootProgress, setBootProgress] = useState(0.08);
    const [servers, setServers] = useState<Server[]>([]);
    const [serversLoading, setServersLoading] = useState(true);
    const [windows, setWindows] = useState<OsWindow[]>([]);
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const [icons, setIcons] = useState<OsDesktopIcon[]>([]);
    const [widgets, setWidgets] = useState<OsDesktopWidget[]>(() => DEFAULT_WIDGETS.map((w) => ({ ...w })));
    const [dock, setDockState] = useState<OsAppId[]>(DEFAULT_DOCK);
    const [settings, setSettings] = useState<OsSettings>(DEFAULT_SETTINGS);
    const [activeSpace, setActiveSpace] = useState(0);
    const [missionControlOpen, setMissionControlOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [osNotifications, setOsNotifications] = useState<OsNotification[]>([]);
    const [spotlightOpen, setSpotlightOpen] = useState(false);
    const [launchpadOpen, setLaunchpadOpen] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);
    const [quickLook, setQuickLook] = useState<{ serverUuid: string; path: string; isFile: boolean } | null>(null);
    const openQuickLook = useCallback((target: { serverUuid: string; path: string; isFile: boolean }) => {
        setQuickLook(target);
    }, []);
    const closeQuickLook = useCallback(() => setQuickLook(null), []);
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [dialogs, setDialogs] = useState<DialogRequest[]>([]);
    const [transfers, setTransfers] = useState<OsTransfer[]>([]);
    const zCounter = useRef(10);
    const filesListeners = useRef(new Set<FilesChangedListener>());
    const loadedRef = useRef(false);
    const windowsRef = useRef<OsWindow[]>([]);

    const errorMessage = useCallback(
        (error: unknown, fallback?: string) => {
            const code = getFeatherpanelApiErrorCode(error);
            const raw = getFeatherpanelApiErrorMessage(error) || (error instanceof Error ? error.message : '') || '';
            if (isNodeUnreachableError(error, code, raw)) {
                return t('featheros.errors.node_unreachable', {
                    defaultValue: "Can't reach this server's node. It may be offline or Wings may be down.",
                });
            }
            return raw || fallback || t('featheros.errors.generic', { defaultValue: 'Something went wrong' });
        },
        [t],
    );

    // Servers
    const refreshServers = useCallback(async () => {
        setServersLoading(true);
        try {
            const all: Server[] = [];
            for (let page = 1; page <= 10; page++) {
                const res = await serversApi.getServers(false, page, 100, '');
                all.push(...(res.servers ?? []));
                if (!res.pagination?.has_next) break;
            }
            setServers(all);
        } catch (error) {
            toast.error(errorMessage(error, t('featheros.errors.servers_load')));
        } finally {
            setServersLoading(false);
        }
    }, [errorMessage, t]);

    const serverMap = useMemo(() => new Map(servers.map((s) => [s.uuidShort, s])), [servers]);
    const getServer = useCallback(
        (uuidShort: string | null | undefined) => (uuidShort ? serverMap.get(uuidShort) : undefined),
        [serverMap],
    );

    const can = useCallback(
        (serverRef: Server | string | null | undefined, permission: string): boolean => {
            const server = typeof serverRef === 'string' ? serverMap.get(serverRef) : serverRef;
            if (!server || !user) return false;
            if (hasGlobalPermission(PermissionsClass.ADMIN_ROOT)) return true;
            if (String(server.owner_id) === String(user.id)) return true;
            if (server.is_subuser && Array.isArray(server.subuser_permissions)) {
                return server.subuser_permissions.includes('*') || server.subuser_permissions.includes(permission);
            }
            return hasStaffServerAccess(hasGlobalPermission);
        },
        [serverMap, user, hasGlobalPermission],
    );

    const serversWith = useCallback(
        (permission?: string) => (permission ? servers.filter((s) => can(s, permission)) : servers),
        [servers, can],
    );

    // Live status / stats for every server the user may watch (same sockets as the dashboard).
    useEffect(() => {
        if (!ready) return;
        const ids = servers
            .filter((s) => s.suspended !== 1 && can(s, 'websocket.connect'))
            .slice(0, 60)
            .map((s) => s.uuidShort);
        void syncServers(ids);
    }, [ready, servers, can, syncServers]);

    useEffect(() => () => disconnectAll(), [disconnectAll]);

    // Boot: load saved desktop + servers
    useEffect(() => {
        if (!isSessionChecked) {
            setBootPhase('session');
            setBootProgress(0.12);
            return;
        }
        if (!user || loadedRef.current) return;
        loadedRef.current = true;
        const started = Date.now();
        setBootPhase('state');
        setBootProgress(0.28);
        void (async () => {
            const statePromise = featherOsApi.getState<OsPersistedState>().then((res) => {
                setBootPhase('servers');
                setBootProgress(0.55);
                return res;
            });
            const serversPromise = refreshServers().then(() => {
                setBootProgress((p) => Math.max(p, 0.78));
            });
            const [stateRes] = await Promise.allSettled([statePromise, serversPromise]);
            const saved = stateRes.status === 'fulfilled' ? sanitizeState(stateRes.value.state) : null;
            if (saved) {
                const maxZ = saved.windows.reduce((m, w) => Math.max(m, w.z || 0), 10);
                zCounter.current = maxZ + 1;
                windowsRef.current = saved.windows;
                setWindows(
                    saved.windows.map((w) => ({
                        ...w,
                        space: typeof (w as OsWindow).space === 'number' ? (w as OsWindow).space : 0,
                    })),
                );
                if (typeof saved.activeSpace === 'number') setActiveSpace(Math.max(0, saved.activeSpace));
                setIcons(saved.icons);
                setWidgets(saved.widgets ?? DEFAULT_WIDGETS.map((w) => ({ ...w })));
                setDockState(saved.dock);
                setSettings(saved.settings);
                const top = [...saved.windows].filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0];
                setFocusedId(top?.id ?? null);
            }
            setBootPhase('done');
            setBootProgress(1);
            // Let the boot animation finish even on a fast connection.
            const wait = Math.max(0, 900 - (Date.now() - started));
            window.setTimeout(() => setReady(true), wait);
        })();
    }, [isSessionChecked, user, refreshServers]);

    // Persistence
    const persisted = useMemo<OsPersistedState>(
        () => ({ version: 1, windows, icons, dock, settings, widgets, activeSpace }),
        [windows, icons, dock, settings, widgets, activeSpace],
    );
    const persistedRef = useRef(persisted);
    persistedRef.current = persisted;
    const dirtyRef = useRef(false);

    useEffect(() => {
        if (!ready) return;
        dirtyRef.current = true;
        const timer = window.setTimeout(() => {
            dirtyRef.current = false;
            featherOsApi.saveState(persistedRef.current).catch((error) => {
                if (axios.isAxiosError(error) && error.response?.status === 413) {
                    toast.error(t('featheros.errors.state_too_large'));
                }
            });
        }, 1200);
        return () => window.clearTimeout(timer);
    }, [persisted, ready, t]);

    useEffect(() => {
        const onHide = () => {
            if (dirtyRef.current && loadedRef.current) {
                featherOsApi.saveStateOnUnload(persistedRef.current);
                dirtyRef.current = false;
            }
        };
        window.addEventListener('pagehide', onHide);
        return () => window.removeEventListener('pagehide', onHide);
    }, []);

    // Theme
    useEffect(() => {
        if (!ready || !settings.accent) return;
        setAccentColor(settings.accent);
    }, [ready, settings.accent, setAccentColor]);

    const isDark = panelTheme === 'dark';
    useEffect(() => {
        if (!ready) return;
        if (settings.theme !== 'auto') {
            if (settings.theme !== panelTheme) setPanelTheme(settings.theme);
            return;
        }
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const apply = () => setPanelTheme(mq.matches ? 'dark' : 'light');
        apply();
        mq.addEventListener('change', apply);
        return () => mq.removeEventListener('change', apply);
        // Sync OS shell + panel when preference or system scheme changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, settings.theme]);

    const setOsTheme = useCallback(
        (theme: OsSettings['theme']) => {
            setSettings((s) => ({ ...s, theme }));
            if (theme === 'auto') {
                const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                setPanelTheme(dark ? 'dark' : 'light');
            } else {
                setPanelTheme(theme);
            }
        },
        [setPanelTheme],
    );

    // Windows
    // Every window change goes through mutate() so callers can read the result synchronously
    // (openApp returns the new id, close picks the next focused window...).
    const mutate = useCallback((fn: (ws: OsWindow[]) => OsWindow[]) => {
        const next = fn(windowsRef.current);
        windowsRef.current = next;
        setWindows(next);
        return next;
    }, []);
    const focusTop = useCallback((ws: OsWindow[]) => {
        const top = ws.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0];
        setFocusedId(top?.id ?? null);
    }, []);

    const focusWindow = useCallback(
        (id: string) => {
            zCounter.current += 1;
            const z = zCounter.current;
            mutate((ws) => ws.map((w) => (w.id === id ? { ...w, z, minimized: false } : w)));
            setFocusedId(id);
        },
        [mutate],
    );

    const openApp = useCallback(
        (app: OsAppId, options: OpenAppOptions = {}) => {
            const def = OS_APPS[app];
            const ws = windowsRef.current;
            const existing = options.newWindow
                ? undefined
                : ws
                      .filter(
                          (w) =>
                              w.app === app &&
                              (def.singleton ||
                                  (def.serverScoped && !!options.serverUuid && w.serverUuid === options.serverUuid)),
                      )
                      .sort((a, b) => b.z - a.z)[0];
            zCounter.current += 1;
            const z = zCounter.current;
            if (existing) {
                mutate((list) =>
                    list.map((w) =>
                        w.id === existing.id
                            ? { ...w, z, minimized: false, props: { ...(w.props ?? {}), ...(options.props ?? {}) } }
                            : w,
                    ),
                );
                setFocusedId(existing.id);
                return existing.id;
            }
            const vp = viewport();
            const count = ws.filter((w) => !w.minimized).length;
            // Terminal needs a taller first open - short+wide windows look broken with xterm.
            const preferW =
                app === 'terminal' ? Math.min(def.defaultSize.w, Math.round(vp.w * 0.7)) : def.defaultSize.w;
            const preferH =
                app === 'terminal' ? Math.min(def.defaultSize.h, Math.round(vp.h * 0.68)) : def.defaultSize.h;
            const w = Math.min(preferW, vp.w - 40);
            const h = Math.min(preferH, vp.h - 90);
            const offset = (count % 8) * 28;
            const win: OsWindow = fitWindow({
                id: uid('w'),
                app,
                serverUuid: options.serverUuid ?? null,
                x: Math.round((vp.w - w) / 2 + (app === 'terminal' ? 0 : -120) + offset),
                y: Math.round(Math.max(16, (vp.h - h) / 2 - (app === 'terminal' ? 12 : 60) + offset)),
                w,
                h,
                z,
                minimized: false,
                maximized: false,
                space: activeSpace,
                props: options.props ?? {},
            });
            mutate((list) => [...list, win]);
            setFocusedId(win.id);
            return win.id;
        },
        [mutate, activeSpace],
    );

    const closeWindow = useCallback(
        (id: string) => focusTop(mutate((ws) => ws.filter((w) => w.id !== id))),
        [mutate, focusTop],
    );

    const closeAppWindows = useCallback(
        (app: OsAppId) => focusTop(mutate((ws) => ws.filter((w) => w.app !== app))),
        [mutate, focusTop],
    );

    const minimizeWindow = useCallback(
        (id: string) => focusTop(mutate((ws) => ws.map((w) => (w.id === id ? { ...w, minimized: true } : w)))),
        [mutate, focusTop],
    );

    const toggleMaximize = useCallback(
        (id: string) => {
            mutate((ws) => ws.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w)));
        },
        [mutate],
    );

    const setWindowGeometry = useCallback(
        (id: string, geo: Partial<Pick<OsWindow, 'x' | 'y' | 'w' | 'h'>>) => {
            mutate((ws) => ws.map((w) => (w.id === id ? { ...w, ...geo, maximized: false } : w)));
        },
        [mutate],
    );

    const moveWindowToSpace = useCallback(
        (id: string, space: number) => {
            const max = Math.max(0, (settings.spaceCount || 1) - 1);
            const next = Math.max(0, Math.min(max, Math.floor(space)));
            mutate((ws) => ws.map((w) => (w.id === id ? { ...w, space: next, minimized: false } : w)));
        },
        [mutate, settings.spaceCount],
    );

    const updateWindowProps = useCallback(
        (id: string, patch: Record<string, unknown>) => {
            mutate((ws) => ws.map((w) => (w.id === id ? { ...w, props: { ...(w.props ?? {}), ...patch } } : w)));
        },
        [mutate],
    );

    const setWindowServer = useCallback(
        (id: string, serverUuid: string | null) => {
            mutate((ws) => ws.map((w) => (w.id === id ? { ...w, serverUuid, props: {} } : w)));
        },
        [mutate],
    );

    const openFileInEditor = useCallback(
        (serverUuid: string, path: string) => {
            const editor = windowsRef.current.filter((w) => w.app === 'editor').sort((a, b) => b.z - a.z)[0];
            const tab = { serverUuid, path };
            if (editor) {
                const tabs = Array.isArray(editor.props?.tabs) ? (editor.props?.tabs as (typeof tab)[]) : [];
                const exists = tabs.some((x) => x.serverUuid === serverUuid && x.path === path);
                updateWindowProps(editor.id, {
                    tabs: exists ? tabs : [...tabs, tab],
                    active: `${serverUuid}:${path}`,
                });
                focusWindow(editor.id);
                return;
            }
            openApp('editor', { props: { tabs: [tab], active: `${serverUuid}:${path}` } });
        },
        [updateWindowProps, focusWindow, openApp],
    );

    const openTerminalFor = useCallback(
        (serverUuid: string) => {
            const term = windowsRef.current.filter((w) => w.app === 'terminal').sort((a, b) => b.z - a.z)[0];
            if (term) {
                const tabs = Array.isArray(term.props?.tabs) ? (term.props?.tabs as string[]) : [];
                updateWindowProps(term.id, {
                    tabs: tabs.includes(serverUuid) ? tabs : [...tabs, serverUuid],
                    active: serverUuid,
                });
                focusWindow(term.id);
                return;
            }
            openApp('terminal', { props: { tabs: [serverUuid], active: serverUuid } });
        },
        [updateWindowProps, focusWindow, openApp],
    );

    // Desktop / dock / settings
    const upsertIcon = useCallback((icon: OsDesktopIcon) => {
        setIcons((list) => {
            const idx = list.findIndex((i) => i.id === icon.id);
            if (idx === -1) return [...list, icon];
            const next = [...list];
            next[idx] = { ...next[idx], ...icon };
            return next;
        });
    }, []);
    const removeIcon = useCallback((id: string) => setIcons((list) => list.filter((i) => i.id !== id)), []);
    const addWidget = useCallback((type: OsWidgetType) => {
        if (!OS_WIDGET_TYPES.includes(type)) return;
        setWidgets((list) => {
            if (list.length >= 24) return list;
            const order = list.reduce((m, w) => Math.max(m, w.order), -1) + 1;
            return [...list, { id: `w-${uid()}`, type, order }];
        });
    }, []);
    const removeWidget = useCallback((id: string) => {
        setWidgets((list) => list.filter((w) => w.id !== id).map((w, i) => ({ ...w, order: i })));
    }, []);
    const reorderWidgets = useCallback((orderedIds: string[]) => {
        setWidgets((list) => {
            const byId = new Map(list.map((w) => [w.id, w]));
            const next: OsDesktopWidget[] = [];
            orderedIds.forEach((id, i) => {
                const w = byId.get(id);
                if (w) next.push({ ...w, order: i });
            });
            list.forEach((w) => {
                if (!orderedIds.includes(w.id)) next.push({ ...w, order: next.length });
            });
            return next;
        });
    }, []);
    const setDock = useCallback((next: OsAppId[]) => setDockState(next.filter(isOsAppId)), []);
    const updateSettings = useCallback((patch: Partial<OsSettings>) => {
        setSettings((s) => ({
            ...s,
            ...patch,
            ...(patch.hotCorners ? { hotCorners: { ...s.hotCorners, ...patch.hotCorners } } : {}),
        }));
    }, []);

    // Workspaces
    const saveWorkspace = useCallback(
        (name: string) => {
            const label = name.trim().slice(0, 40);
            const entry: OsWorkspace = {
                id: uid('ws'),
                name: label,
                savedAt: Date.now(),
                activeSpace,
                windows: windowsRef.current
                    .slice()
                    .sort((a, b) => a.z - b.z)
                    .map((w) => {
                        const { id: _unusedId, z: _unusedZ, ...rest } = w;
                        void _unusedId;
                        void _unusedZ;
                        return {
                            ...rest,
                            // Keep layouts small: drop window state that is large (editor buffers etc.).
                            props: JSON.stringify(rest.props ?? {}).length > 4000 ? {} : rest.props,
                        };
                    }),
            };
            setSettings((s) => ({
                ...s,
                workspaces: [entry, ...(s.workspaces ?? []).filter((w) => w.name !== label)].slice(0, MAX_WORKSPACES),
            }));
            return entry;
        },
        [activeSpace],
    );

    const restoreWorkspace = useCallback(
        (id: string) => {
            const entry = (settings.workspaces ?? []).find((w) => w.id === id);
            if (!entry) return false;
            const maxSpace = Math.max(0, (settings.spaceCount || 1) - 1);
            const next = entry.windows
                .filter((w) => isOsAppId(w.app))
                .map((w) => {
                    zCounter.current += 1;
                    return fitWindow({
                        ...w,
                        id: uid('w'),
                        z: zCounter.current,
                        space: Math.min(maxSpace, Math.max(0, w.space ?? 0)),
                    });
                });
            mutate(() => next);
            setActiveSpace(Math.min(maxSpace, Math.max(0, entry.activeSpace ?? 0)));
            focusTop(next);
            return true;
        },
        [settings.workspaces, settings.spaceCount, mutate, focusTop],
    );

    const deleteWorkspace = useCallback((id: string) => {
        setSettings((s) => ({ ...s, workspaces: (s.workspaces ?? []).filter((w) => w.id !== id) }));
    }, []);

    const resetDesktop = useCallback(async () => {
        await featherOsApi.resetState();
        windowsRef.current = [];
        setWindows([]);
        setIcons([]);
        setWidgets(DEFAULT_WIDGETS.map((w) => ({ ...w })));
        setDockState(DEFAULT_DOCK);
        setSettings(DEFAULT_SETTINGS);
        setFocusedId(null);
    }, []);

    // Menus & dialogs
    const openContextMenu = useCallback((pos: { x: number; y: number }, items: OsContextMenuItem[]) => {
        setContextMenu({ x: pos.x, y: pos.y, items });
    }, []);
    const closeContextMenu = useCallback(() => setContextMenu(null), []);

    const prompt = useCallback(
        (opts: {
            title: string;
            message?: string;
            defaultValue?: string;
            placeholder?: string;
            confirmLabel?: string;
        }) =>
            new Promise<string | null>((resolve) => {
                setDialogs((d) => [
                    ...d,
                    {
                        id: uid('d'),
                        kind: 'prompt',
                        ...opts,
                        resolve: (v) => resolve(typeof v === 'string' ? v : null),
                    },
                ]);
            }),
        [],
    );
    const confirm = useCallback(
        (opts: { title: string; message?: string; confirmLabel?: string; danger?: boolean }) =>
            new Promise<boolean>((resolve) => {
                setDialogs((d) => [
                    ...d,
                    { id: uid('d'), kind: 'confirm', ...opts, resolve: (v) => resolve(v === true) },
                ]);
            }),
        [],
    );
    const resolveDialog = useCallback((id: string, value: string | boolean | null) => {
        setDialogs((d) => {
            const req = d.find((x) => x.id === id);
            req?.resolve(value);
            return d.filter((x) => x.id !== id);
        });
    }, []);

    // Files bus
    const emitFilesChanged = useCallback((serverUuid: string, dir: string) => {
        const norm = normalizeDir(dir);
        filesListeners.current.forEach((fn) => fn(serverUuid, norm));
    }, []);
    const onFilesChanged = useCallback((listener: FilesChangedListener) => {
        filesListeners.current.add(listener);
        return () => {
            filesListeners.current.delete(listener);
        };
    }, []);

    const dismissNotification = useCallback((id: string) => {
        setOsNotifications((list) => list.filter((n) => n.id !== id));
    }, []);
    const clearNotifications = useCallback(() => setOsNotifications([]), []);
    const pushNotification = useCallback(
        (n: Omit<OsNotification, 'id' | 'at'> & Partial<Pick<OsNotification, 'id' | 'at'>>) => {
            const item: OsNotification = {
                id: n.id ?? uid('n'),
                at: n.at ?? Date.now(),
                title: n.title,
                body: n.body,
                kind: n.kind ?? 'info',
                serverUuid: n.serverUuid,
            };
            setOsNotifications((list) => [item, ...list].slice(0, 40));
        },
        [],
    );

    // Cross server transfers
    const transfersRef = useRef<OsTransfer[]>([]);
    const refreshTransfers = useCallback(async () => {
        try {
            const res = await api.get<{ data: { transfers: OsTransfer[] } }>('/user/files/transfers');
            const list = res.data.data.transfers ?? [];
            const prev = new Map(transfersRef.current.map((x) => [x.uuid, x.status]));
            for (const job of list) {
                const before = prev.get(job.uuid);
                if (before && before !== job.status) {
                    if (job.status === 'completed') {
                        toast.success(
                            t('featheros.transfers.done', { source: job.source_name, target: job.target_name }),
                        );
                        pushNotification({
                            title: t('featheros.transfers.done', {
                                source: job.source_name,
                                target: job.target_name,
                            }),
                            kind: 'success',
                        });
                        emitFilesChanged(job.target_server, job.destination);
                        if (job.mode === 'move') emitFilesChanged(job.source_server, job.source_root);
                    } else if (job.status === 'failed') {
                        toast.error(t('featheros.transfers.failed', { error: job.error || '' }));
                    }
                }
            }
            transfersRef.current = list;
            setTransfers(list);
        } catch {
            // transient: the next poll retries
        }
    }, [t, emitFilesChanged, pushNotification]);

    const prevLiveRef = useRef<Record<string, string | null>>({});
    useEffect(() => {
        if (!ready) return;
        for (const [uuid, data] of Object.entries(serverLiveData)) {
            const prev = prevLiveRef.current[uuid];
            const next = data.status;
            if (prev && prev === 'running' && (next === 'offline' || next === 'stopped')) {
                const server = servers.find((x) => x.uuidShort === uuid);
                pushNotification({
                    title: t('featheros.notifications.server_stopped', { name: server?.name ?? uuid }),
                    kind: 'server',
                    serverUuid: uuid,
                });
            }
            prevLiveRef.current[uuid] = next;
        }
    }, [serverLiveData, ready, servers, pushNotification, t]);

    const activeTransfers = transfers.some((x) => x.status === 'pending' || x.status === 'running');
    const [pollBoost, setPollBoost] = useState(0);
    useEffect(() => {
        if (!ready) return;
        void refreshTransfers();
    }, [ready, refreshTransfers]);
    useEffect(() => {
        if (!ready || (!activeTransfers && pollBoost === 0)) return;
        const timer = window.setInterval(() => {
            void refreshTransfers();
            setPollBoost((n) => Math.max(0, n - 1));
        }, 1500);
        return () => window.clearInterval(timer);
    }, [ready, activeTransfers, pollBoost, refreshTransfers]);

    const moveOrCopyFiles = useCallback(
        async (
            payload: OsFileDragPayload,
            target: { serverUuid: string; dir: string },
            mode: 'move' | 'copy',
        ): Promise<boolean> => {
            const srcRoot = normalizeDir(payload.root);
            const destDir = normalizeDir(target.dir);
            const names = payload.files.map((f) => f.name);
            if (names.length === 0) return false;
            const sameServer = payload.serverUuid === target.serverUuid;

            if (sameServer) {
                if (srcRoot === destDir) return false;
                // A folder cannot go into itself.
                for (const n of names) {
                    const abs = joinPath(srcRoot, n);
                    if (destDir === abs || destDir.startsWith(`${abs}/`)) {
                        toast.error(t('featheros.files.into_itself'));
                        return false;
                    }
                }
                const needed = mode === 'move' ? 'file.update' : 'file.create';
                if (!can(payload.serverUuid, needed)) {
                    toast.error(t('featheros.errors.no_permission'));
                    return false;
                }
                const toastId = toast.loading(
                    t(mode === 'move' ? 'featheros.files.moving' : 'featheros.files.copying', {
                        count: String(names.length),
                    }),
                );
                try {
                    if (mode === 'move') {
                        await filesApi.moveFile(
                            payload.serverUuid,
                            '/',
                            names.map((n) => ({ from: joinPath(srcRoot, n), to: joinPath(destDir, n) })),
                        );
                    } else {
                        for (const n of names) {
                            await filesApi.copyFile(payload.serverUuid, srcRoot, n, undefined, destDir);
                        }
                    }
                    toast.success(
                        t(mode === 'move' ? 'featheros.files.moved' : 'featheros.files.copied', {
                            count: String(names.length),
                        }),
                        { id: toastId },
                    );
                    return true;
                } catch (error) {
                    toast.error(errorMessage(error), { id: toastId });
                    return false;
                } finally {
                    emitFilesChanged(payload.serverUuid, srcRoot);
                    emitFilesChanged(payload.serverUuid, destDir);
                }
            }

            // Different servers: the panel's cross server transfer (compress, pull, extract, cleanup).
            const sourceNeeds = ['file.read', 'file.archive', ...(mode === 'move' ? ['file.delete'] : [])];
            if (!sourceNeeds.every((p) => can(payload.serverUuid, p)) || !can(target.serverUuid, 'file.create')) {
                toast.error(t('featheros.errors.no_permission'));
                return false;
            }
            try {
                const request = api.post(`/user/servers/${payload.serverUuid}/files/transfer`, {
                    target: target.serverUuid,
                    mode,
                    root: srcRoot,
                    files: names,
                    destination: destDir,
                });
                setPollBoost(20);
                toast.info(t('featheros.transfers.started', { count: String(names.length) }));
                // The request stays open while the panel runs the job; progress comes from polling.
                window.setTimeout(() => void refreshTransfers(), 400);
                await request;
                await refreshTransfers();
                return true;
            } catch (error) {
                // A dropped connection while the job keeps running on the server is not a failure.
                if (axios.isAxiosError(error) && !error.response) return true;
                toast.error(errorMessage(error));
                return false;
            }
        },
        [can, t, errorMessage, emitFilesChanged, refreshTransfers],
    );

    const value: FeatherOsContextValue = {
        osName,
        panelName,
        logoUrl,
        version: core?.version ?? null,
        ready,
        bootPhase,
        bootProgress,
        servers,
        serversLoading,
        refreshServers,
        getServer,
        live: serverLiveData,
        can,
        serversWith,
        windows,
        focusedId,
        openApp,
        closeWindow,
        closeAppWindows,
        focusWindow,
        minimizeWindow,
        toggleMaximize,
        setWindowGeometry,
        updateWindowProps,
        setWindowServer,
        openFileInEditor,
        openTerminalFor,
        icons,
        upsertIcon,
        removeIcon,
        widgets,
        addWidget,
        removeWidget,
        reorderWidgets,
        dock,
        setDock,
        settings,
        updateSettings,
        saveWorkspace,
        restoreWorkspace,
        deleteWorkspace,
        isDark,
        setOsTheme,
        resetDesktop,
        activeSpace,
        setActiveSpace,
        missionControlOpen,
        setMissionControlOpen,
        notificationsOpen,
        setNotificationsOpen,
        osNotifications,
        dismissNotification,
        clearNotifications,
        spotlightOpen,
        setSpotlightOpen,
        launchpadOpen,
        setLaunchpadOpen,
        moveWindowToSpace,
        aboutOpen,
        setAboutOpen,
        quickLook,
        openQuickLook,
        closeQuickLook,
        contextMenu,
        openContextMenu,
        closeContextMenu,
        dialogs,
        prompt,
        confirm,
        resolveDialog,
        transfers,
        refreshTransfers,
        moveOrCopyFiles,
        emitFilesChanged,
        onFilesChanged,
        errorMessage,
    };

    return <FeatherOsContext.Provider value={value}>{children}</FeatherOsContext.Provider>;
}
