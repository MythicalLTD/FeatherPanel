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

export type ActionContext = Record<string, unknown> & {
    /** Set by cancel() — when true, the host must abort the action. */
    cancelled?: boolean;
    cancelReason?: string;
    cancel: (reason?: string) => void;
};

export type ActionHandler = (ctx: ActionContext, next: () => Promise<void>) => void | Promise<void>;

export type ActionRegistration = {
    /** Unique handler id (plugin-scoped). */
    id: string;
    /** Higher runs earlier. Default 0. */
    priority?: number;
    handler: ActionHandler;
};

type StoredRegistration = ActionRegistration & { priority: number };

/**
 * Cancelable, ordered action hooks (middleware-style).
 * Host call sites: `await pluginActionHooks.run('fp:server:power', { action, uuid })`
 */
export class PluginActionHooks {
    private hooks = new Map<string, StoredRegistration[]>();

    register(actionId: string, registration: ActionRegistration): () => void {
        const list = this.hooks.get(actionId) ?? [];
        const stored: StoredRegistration = {
            ...registration,
            priority: registration.priority ?? 0,
        };
        // Replace same id if re-registered
        const filtered = list.filter((h) => h.id !== stored.id);
        filtered.push(stored);
        filtered.sort((a, b) => b.priority - a.priority);
        this.hooks.set(actionId, filtered);

        return () => this.unregister(actionId, stored.id);
    }

    unregister(actionId: string, handlerId: string): void {
        const list = this.hooks.get(actionId);
        if (!list) return;
        const next = list.filter((h) => h.id !== handlerId);
        if (next.length === 0) {
            this.hooks.delete(actionId);
        } else {
            this.hooks.set(actionId, next);
        }
    }

    /**
     * Run the middleware chain. Returns the (possibly mutated) context.
     * If cancelled, host should abort.
     */
    async run(actionId: string, initial: Record<string, unknown> = {}): Promise<ActionContext> {
        const ctx: ActionContext = {
            ...initial,
            cancelled: false,
            cancel(reason?: string) {
                this.cancelled = true;
                this.cancelReason = reason ?? 'cancelled';
            },
        };

        const list = this.hooks.get(actionId) ?? [];
        if (list.length === 0) {
            return ctx;
        }

        let index = 0;
        const dispatch = async (): Promise<void> => {
            if (ctx.cancelled) return;
            if (index >= list.length) return;
            const current = list[index++];
            await current.handler(ctx, dispatch);
        };

        await dispatch();
        return ctx;
    }

    clear(): void {
        this.hooks.clear();
    }
}

export const pluginActionHooks = new PluginActionHooks();
