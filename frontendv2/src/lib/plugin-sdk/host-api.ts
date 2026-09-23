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

import axios, { type AxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { pluginEventBus } from '@/lib/plugin-sdk/event-bus';
import { pluginActionHooks } from '@/lib/plugin-sdk/action-hooks';
import { pluginModalRegistry, pluginSearchRegistry, pluginShortcutRegistry } from '@/lib/plugin-sdk/registries';
import { FP_ACTIONS, FP_EVENTS } from '@/lib/plugin-sdk/ids';
import { FEATHERPANEL_HOST_VERSION, type FeatherPanelHostApi } from '@/lib/plugin-sdk/types';

export type HostApiDeps = {
    getThemeMode: () => 'light' | 'dark';
    getAccent: () => string;
    getPackId: () => string;
    themeSubscribe: (listener: () => void) => () => void;
    getPathname: () => string;
    getUser: () => unknown;
    getUiPackId: () => string;
    contextSubscribe: (listener: () => void) => () => void;
    navigate: (path: string) => void;
};

async function runApiRequest<T>(method: string, url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const ctx = await pluginActionHooks.run(FP_ACTIONS.API_REQUEST, {
        method,
        url,
        data,
        config: config ?? {},
    });
    if (ctx.cancelled) {
        throw new Error(ctx.cancelReason || 'API request cancelled by plugin');
    }
    const finalUrl = typeof ctx.url === 'string' ? ctx.url : url;
    const finalData = ctx.data !== undefined ? ctx.data : data;
    const finalConfig = (ctx.config as AxiosRequestConfig | undefined) ?? config;

    try {
        let res;
        switch (method) {
            case 'GET':
                res = await axios.get(finalUrl, finalConfig);
                break;
            case 'POST':
                res = await axios.post(finalUrl, finalData, finalConfig);
                break;
            case 'PUT':
                res = await axios.put(finalUrl, finalData, finalConfig);
                break;
            case 'DELETE':
                res = await axios.delete(finalUrl, finalConfig);
                break;
            default:
                throw new Error(`Unsupported method ${method}`);
        }
        return res.data as T;
    } catch (err) {
        pluginEventBus.emit(FP_EVENTS.API_ERROR, {
            method,
            url: finalUrl,
            error: err instanceof Error ? err.message : String(err),
        });
        throw err;
    }
}

/**
 * Build the window.FeatherPanel v2 host object.
 */
export function createFeatherPanelHostApi(deps: HostApiDeps): FeatherPanelHostApi {
    return {
        version: FEATHERPANEL_HOST_VERSION,
        events: {
            on: (event, handler) => pluginEventBus.on(event, handler),
            once: (event, handler) => pluginEventBus.once(event, handler),
            off: (event, handler) => pluginEventBus.off(event, handler),
            emit: (event, payload) => pluginEventBus.emit(event, payload),
        },
        actions: {
            register: (actionId, registration) => pluginActionHooks.register(actionId, registration),
            unregister: (actionId, handlerId) => pluginActionHooks.unregister(actionId, handlerId),
            run: (actionId, ctx) => pluginActionHooks.run(actionId, ctx),
        },
        theme: {
            getMode: deps.getThemeMode,
            getAccent: deps.getAccent,
            getPackId: deps.getPackId,
            subscribe: deps.themeSubscribe,
        },
        api: {
            get: (url, config) => runApiRequest('GET', url, undefined, config as AxiosRequestConfig),
            post: (url, data, config) => runApiRequest('POST', url, data, config as AxiosRequestConfig),
            put: (url, data, config) => runApiRequest('PUT', url, data, config as AxiosRequestConfig),
            delete: (url, config) => runApiRequest('DELETE', url, undefined, config as AxiosRequestConfig),
        },
        toast: {
            success: (message) => toast.success(message),
            error: (message) => toast.error(message),
            info: (message) => toast.info(message),
            message: (message) => toast.message(message),
        },
        navigate: (path: string) => {
            void (async () => {
                const ctx = await pluginActionHooks.run(FP_ACTIONS.NAV_PUSH, { path });
                if (ctx.cancelled) return;
                const next = typeof ctx.path === 'string' ? ctx.path : path;
                deps.navigate(next);
            })();
        },
        context: {
            getPathname: deps.getPathname,
            getUser: deps.getUser,
            getUiPackId: deps.getUiPackId,
            subscribe: deps.contextSubscribe,
        },
        ui: {
            modal: {
                register: (def) => pluginModalRegistry.register(def),
                open: (id, props) => pluginModalRegistry.open(id, props),
                close: () => pluginModalRegistry.close(),
            },
        },
        search: {
            contribute: (provider) => pluginSearchRegistry.contribute(provider),
            query: (q) => pluginSearchRegistry.query(q),
        },
        shortcuts: {
            register: (shortcut) => pluginShortcutRegistry.register(shortcut),
        },
    };
}

export { FEATHERPANEL_HOST_VERSION };
