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

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/ThemeContext';
import { useSession } from '@/contexts/SessionContext';
import { usePluginUiOptional } from '@/contexts/PluginUiContext';
import { renderPluginReplace } from '@/components/plugins/PluginRemoteLoader';
import {
    FEATHERPANEL_HOST_VERSION,
    createFeatherPanelHostApi,
    pluginEventBus,
    installPostMessageBusBridge,
    bindFpActionClicks,
    FP_EVENTS,
} from '@/lib/plugin-sdk';
import type { FeatherPanelHostApi } from '@/lib/plugin-sdk/types';
import { PluginModalHost } from '@/components/plugins/PluginModalHost';
import { PluginShortcutHost } from '@/components/plugins/PluginShortcutHost';
import { PluginSlot } from '@/components/plugins/PluginSlot';

export { FEATHERPANEL_HOST_VERSION };
export type { FeatherPanelHostApi };

type ThemeListener = () => void;
type ContextListener = () => void;
const themeListeners = new Set<ThemeListener>();
const contextListeners = new Set<ContextListener>();

function notifyThemeListeners() {
    themeListeners.forEach((l) => l());
}

function notifyContextListeners() {
    contextListeners.forEach((l) => l());
}

/**
 * Installs `window.FeatherPanel` v2 (events, actions, registries) and bridges.
 */
export function FeatherPanelHost({ children }: { children: ReactNode }) {
    const { theme, accentColor, themePackId, themePack, setThemePackId } = useTheme();
    const { user } = useSession();
    const pluginUi = usePluginUiOptional();
    const pathname = usePathname();
    const router = useRouter();
    const prevPathRef = useRef<string | null>(null);
    const userIdRef = useRef<string | number | null>(null);

    useEffect(() => {
        const packTheme = pluginUi?.activePack?.theme;
        if (packTheme && packTheme !== themePackId && pluginUi?.uiPackId && pluginUi.uiPackId !== 'none') {
            setThemePackId(packTheme);
        }
    }, [pluginUi?.activePack?.theme, pluginUi?.uiPackId, themePackId, setThemePackId]);

    // Install host API once; refresh closures via refs in deps below by reassigning.
    useEffect(() => {
        const api = createFeatherPanelHostApi({
            getThemeMode: () => theme,
            getAccent: () => accentColor,
            getPackId: () => themePackId,
            themeSubscribe: (listener) => {
                themeListeners.add(listener);
                return () => themeListeners.delete(listener);
            },
            getPathname: () => pathname,
            getUser: () => user ?? null,
            getUiPackId: () => pluginUi?.uiPackId ?? 'none',
            contextSubscribe: (listener) => {
                contextListeners.add(listener);
                return () => contextListeners.delete(listener);
            },
            navigate: (path) => router.push(path),
        });

        window.FeatherPanel = api;
        notifyThemeListeners();
        notifyContextListeners();
        pluginEventBus.emit(FP_EVENTS.HOST_READY, { version: FEATHERPANEL_HOST_VERSION });

        const unsubBus = installPostMessageBusBridge();
        const unsubClicks = bindFpActionClicks(document);

        return () => {
            unsubBus();
            unsubClicks();
            if (window.FeatherPanel === api) {
                delete window.FeatherPanel;
            }
        };
        // Re-install when identity-changing deps settle; closures capture latest values.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep navigate/theme/context getters fresh by patching the live API object.
    useEffect(() => {
        const api = window.FeatherPanel;
        if (!api) return;
        api.theme.getMode = () => theme;
        api.theme.getAccent = () => accentColor;
        api.theme.getPackId = () => themePackId;
        api.context.getPathname = () => pathname;
        api.context.getUser = () => user ?? null;
        api.context.getUiPackId = () => pluginUi?.uiPackId ?? 'none';
        api.navigate = (path: string) => {
            void (async () => {
                const { pluginActionHooks } = await import('@/lib/plugin-sdk/action-hooks');
                const { FP_ACTIONS } = await import('@/lib/plugin-sdk/ids');
                const ctx = await pluginActionHooks.run(FP_ACTIONS.NAV_PUSH, { path });
                if (ctx.cancelled) return;
                router.push(typeof ctx.path === 'string' ? ctx.path : path);
            })();
        };
        notifyThemeListeners();
        notifyContextListeners();
    }, [theme, accentColor, themePackId, pathname, router, user, pluginUi?.uiPackId]);

    useEffect(() => {
        notifyThemeListeners();
        pluginEventBus.emit(FP_EVENTS.THEME_CHANGE, {
            theme,
            accentColor,
            themePackId,
        });
    }, [theme, accentColor, themePackId, themePack]);

    useEffect(() => {
        pluginEventBus.emit(FP_EVENTS.UI_PACK_CHANGE, {
            uiPackId: pluginUi?.uiPackId ?? 'none',
        });
    }, [pluginUi?.uiPackId]);

    useEffect(() => {
        const prev = prevPathRef.current;
        if (prev !== null && prev !== pathname) {
            pluginEventBus.emit(FP_EVENTS.ROUTE_CHANGE, { pathname, prev });
            pluginEventBus.emit(FP_EVENTS.PAGE_UNMOUNT, { pathname: prev });
            pluginEventBus.emit(FP_EVENTS.PAGE_MOUNT, {
                pathname,
                area: detectArea(pathname),
            });
        } else if (prev === null && pathname) {
            pluginEventBus.emit(FP_EVENTS.PAGE_MOUNT, {
                pathname,
                area: detectArea(pathname),
            });
        }
        prevPathRef.current = pathname;

        // Server context enter/leave
        const serverMatch = pathname?.match(/^\/server\/([^/]+)/);
        const uuidShort = serverMatch?.[1] ?? null;
        pluginEventBus.emit(FP_EVENTS.SERVER_CONTEXT, {
            uuidShort,
            entering: Boolean(uuidShort),
            pathname,
        });
    }, [pathname]);

    useEffect(() => {
        const id = (user as { id?: string | number } | null)?.id ?? null;
        if (userIdRef.current !== id) {
            userIdRef.current = id;
            pluginEventBus.emit(FP_EVENTS.SESSION_CHANGE, {
                user: user ?? null,
                authenticated: Boolean(user),
            });
        }
    }, [user]);

    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            const data = event.data;
            if (!data || typeof data !== 'object') return;

            if (data.type === 'featherpanel-ready') {
                const tokens = theme === 'dark' ? themePack?.tokens.dark : themePack?.tokens.light;
                event.source?.postMessage?.(
                    {
                        type: 'featherpanel-theme',
                        version: FEATHERPANEL_HOST_VERSION,
                        theme,
                        themePackId,
                        tokens: tokens ?? {},
                        accentColor,
                    },
                    { targetOrigin: window.location.origin },
                );
                return;
            }

            if (data.type === 'featherpanel-navigate' && typeof data.path === 'string') {
                window.FeatherPanel?.navigate(data.path);
                return;
            }

            if (data.type === 'featherpanel-toast' && typeof data.message === 'string') {
                const level = data.level === 'error' ? 'error' : data.level === 'info' ? 'info' : 'success';
                toast[level](data.message);
            }
        };

        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [theme, themePack, themePackId, accentColor]);

    return (
        <>
            {children}
            <PluginSlot id='drawer.global' className='contents' showActions={false} />
            <PluginSlot id='modal.global' className='contents' showActions={false} />
            <PluginModalHost />
            <PluginShortcutHost />
        </>
    );
}

function detectArea(pathname: string | null): string {
    if (!pathname) return 'unknown';
    if (pathname.startsWith('/admin')) return 'admin';
    if (pathname.startsWith('/server/')) return 'server';
    if (pathname.startsWith('/webspace/')) return 'webspace';
    if (pathname.startsWith('/vds/')) return 'vds';
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/account')) return 'client';
    if (pathname.startsWith('/auth') || pathname.startsWith('/login')) return 'auth';
    return 'other';
}

/**
 * Renders a page-level UI pack override when the active pack matches the route.
 */
export function PluginPageOverrideGate({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const pluginUi = usePluginUiOptional();
    const page = pluginUi?.getPageOverride(pathname ?? '/') ?? null;

    if (!page) {
        return <>{children}</>;
    }

    if (page.hide) {
        return null;
    }

    if (page.replace) {
        return (
            <div className='fp-page-override flex min-h-0 flex-1 flex-col' data-fp-page-override={page.match}>
                {renderPluginReplace(page.replace, {
                    height: '100%',
                    className: 'min-h-[50vh] w-full flex-1 border-0 bg-transparent',
                    fallback: children,
                })}
            </div>
        );
    }

    return <>{children}</>;
}
