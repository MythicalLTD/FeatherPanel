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

export type EventHandler = (payload: unknown) => void;

type HandlerEntry = {
    handler: EventHandler;
    once: boolean;
};

/**
 * Tiny pub/sub used by window.FeatherPanel.events.
 * Singleton — shared across remotes and injected plugin JS.
 */
export class PluginEventBus {
    private listeners = new Map<string, Set<HandlerEntry>>();

    on(event: string, handler: EventHandler): () => void {
        return this.add(event, handler, false);
    }

    once(event: string, handler: EventHandler): () => void {
        return this.add(event, handler, true);
    }

    off(event: string, handler: EventHandler): void {
        const set = this.listeners.get(event);
        if (!set) return;
        for (const entry of set) {
            if (entry.handler === handler) {
                set.delete(entry);
            }
        }
        if (set.size === 0) {
            this.listeners.delete(event);
        }
    }

    emit(event: string, payload?: unknown): void {
        const set = this.listeners.get(event);
        if (!set || set.size === 0) return;
        const snapshot = Array.from(set);
        for (const entry of snapshot) {
            try {
                entry.handler(payload);
            } catch (err) {
                console.error(`[FeatherPanel] event handler error for ${event}`, err);
            }
            if (entry.once) {
                set.delete(entry);
            }
        }
        if (set.size === 0) {
            this.listeners.delete(event);
        }
    }

    clear(): void {
        this.listeners.clear();
    }

    private add(event: string, handler: EventHandler, once: boolean): () => void {
        let set = this.listeners.get(event);
        if (!set) {
            set = new Set();
            this.listeners.set(event, set);
        }
        const entry: HandlerEntry = { handler, once };
        set.add(entry);
        return () => {
            set!.delete(entry);
            if (set!.size === 0) {
                this.listeners.delete(event);
            }
        };
    }
}

export const pluginEventBus = new PluginEventBus();
