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

import type { EventHandler } from '@/lib/plugin-sdk/event-bus';
import type { ActionRegistration, ActionContext } from '@/lib/plugin-sdk/action-hooks';
import type {
    PluginModalDefinition,
    PluginSearchProvider,
    PluginSearchResult,
    PluginShortcut,
} from '@/lib/plugin-sdk/registries';

export const FEATHERPANEL_HOST_VERSION = 2;

export interface FeatherPanelHostApi {
    version: number;
    events: {
        on: (event: string, handler: EventHandler) => () => void;
        once: (event: string, handler: EventHandler) => () => void;
        off: (event: string, handler: EventHandler) => void;
        emit: (event: string, payload?: unknown) => void;
    };
    actions: {
        register: (actionId: string, registration: ActionRegistration) => () => void;
        unregister: (actionId: string, handlerId: string) => void;
        run: (actionId: string, ctx?: Record<string, unknown>) => Promise<ActionContext>;
    };
    theme: {
        getMode: () => 'light' | 'dark';
        getAccent: () => string;
        getPackId: () => string;
        subscribe: (listener: () => void) => () => void;
    };
    api: {
        get: <T = unknown>(url: string, config?: object) => Promise<T>;
        post: <T = unknown>(url: string, data?: unknown, config?: object) => Promise<T>;
        put: <T = unknown>(url: string, data?: unknown, config?: object) => Promise<T>;
        delete: <T = unknown>(url: string, config?: object) => Promise<T>;
    };
    toast: {
        success: (message: string) => void;
        error: (message: string) => void;
        info: (message: string) => void;
        message: (message: string) => void;
    };
    navigate: (path: string) => void;
    context: {
        getPathname: () => string;
        getUser: () => unknown;
        getUiPackId: () => string;
        subscribe: (listener: () => void) => () => void;
    };
    ui: {
        modal: {
            register: (def: PluginModalDefinition) => () => void;
            open: (id: string, props?: Record<string, unknown>) => void;
            close: () => void;
        };
    };
    search: {
        contribute: (provider: PluginSearchProvider) => () => void;
        query: (q: string) => Promise<PluginSearchResult[]>;
    };
    shortcuts: {
        register: (shortcut: PluginShortcut) => () => void;
    };
}

declare global {
    interface Window {
        FeatherPanel?: FeatherPanelHostApi;
    }
}

export type {
    EventHandler,
    ActionRegistration,
    ActionContext,
    PluginModalDefinition,
    PluginSearchProvider,
    PluginSearchResult,
    PluginShortcut,
};
