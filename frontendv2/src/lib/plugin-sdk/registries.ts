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

import type { ReactNode } from 'react';

export type PluginModalDefinition = {
    id: string;
    title?: string;
    /** Public URL to HTML iframe */
    componentUrl?: string;
    /** Public URL to ESM React remote */
    remoteUrl?: string;
    /** Optional width class hint */
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
};

export type PluginSearchResult = {
    id: string;
    title: string;
    description?: string;
    href?: string;
    category?: string;
    onSelect?: () => void;
};

export type PluginSearchProvider = {
    id: string;
    /** Sync or async results for the current query */
    search: (query: string) => PluginSearchResult[] | Promise<PluginSearchResult[]>;
};

export type PluginShortcut = {
    id: string;
    /** e.g. "ctrl+shift+m" (lowercase, + separated) */
    combo: string;
    description?: string;
    /** Run a named action hook, or a direct handler */
    actionId?: string;
    handler?: () => void | Promise<void>;
};

type ModalListener = (state: { open: boolean; id: string | null; props: Record<string, unknown> }) => void;
type SearchListener = () => void;
type ShortcutListener = () => void;

class PluginModalRegistry {
    private modals = new Map<string, PluginModalDefinition>();
    private state = { open: false, id: null as string | null, props: {} as Record<string, unknown> };
    private listeners = new Set<ModalListener>();

    register(def: PluginModalDefinition): () => void {
        this.modals.set(def.id, def);
        return () => this.modals.delete(def.id);
    }

    get(id: string): PluginModalDefinition | undefined {
        return this.modals.get(id);
    }

    open(id: string, props: Record<string, unknown> = {}): void {
        if (!this.modals.has(id)) {
            console.warn(`[FeatherPanel] Unknown modal: ${id}`);
            return;
        }
        this.state = { open: true, id, props };
        this.notify();
    }

    close(): void {
        this.state = { open: false, id: null, props: {} };
        this.notify();
    }

    getState() {
        return this.state;
    }

    subscribe(listener: ModalListener): () => void {
        this.listeners.add(listener);
        listener(this.state);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach((l) => l(this.state));
    }
}

class PluginSearchRegistry {
    private providers = new Map<string, PluginSearchProvider>();
    private listeners = new Set<SearchListener>();

    contribute(provider: PluginSearchProvider): () => void {
        this.providers.set(provider.id, provider);
        this.notify();
        return () => {
            this.providers.delete(provider.id);
            this.notify();
        };
    }

    list(): PluginSearchProvider[] {
        return Array.from(this.providers.values());
    }

    async query(query: string): Promise<PluginSearchResult[]> {
        const out: PluginSearchResult[] = [];
        for (const provider of this.providers.values()) {
            try {
                const results = await provider.search(query);
                out.push(...results);
            } catch (err) {
                console.error(`[FeatherPanel] search provider ${provider.id} failed`, err);
            }
        }
        return out;
    }

    subscribe(listener: SearchListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach((l) => l());
    }
}

class PluginShortcutRegistry {
    private shortcuts = new Map<string, PluginShortcut>();
    private listeners = new Set<ShortcutListener>();

    register(shortcut: PluginShortcut): () => void {
        this.shortcuts.set(shortcut.id, shortcut);
        this.notify();
        return () => {
            this.shortcuts.delete(shortcut.id);
            this.notify();
        };
    }

    list(): PluginShortcut[] {
        return Array.from(this.shortcuts.values());
    }

    findByCombo(combo: string): PluginShortcut | undefined {
        const normalized = normalizeCombo(combo);
        for (const s of this.shortcuts.values()) {
            if (normalizeCombo(s.combo) === normalized) return s;
        }
        return undefined;
    }

    subscribe(listener: ShortcutListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach((l) => l());
    }
}

export function normalizeCombo(combo: string): string {
    return combo
        .toLowerCase()
        .replace(/\s+/g, '')
        .split('+')
        .map((p) => (p === 'control' ? 'ctrl' : p === 'option' ? 'alt' : p === 'cmd' || p === 'command' ? 'meta' : p))
        .sort((a, b) => {
            const order = ['ctrl', 'alt', 'shift', 'meta'];
            const ai = order.indexOf(a);
            const bi = order.indexOf(b);
            if (ai === -1 && bi === -1) return a.localeCompare(b);
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
        })
        .join('+');
}

export function eventToCombo(event: KeyboardEvent): string {
    const parts: string[] = [];
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');
    const key = event.key.toLowerCase();
    if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
        parts.push(key === ' ' ? 'space' : key);
    }
    return normalizeCombo(parts.join('+'));
}

export const pluginModalRegistry = new PluginModalRegistry();
export const pluginSearchRegistry = new PluginSearchRegistry();
export const pluginShortcutRegistry = new PluginShortcutRegistry();

export type { ReactNode };
