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

import { pluginEventBus, type EventHandler } from '@/lib/plugin-sdk/event-bus';
import { pluginActionHooks } from '@/lib/plugin-sdk/action-hooks';
import { FEATHERPANEL_HOST_VERSION } from '@/lib/plugin-sdk/types';

type BusMessage =
    | { type: 'featherpanel-bus'; op: 'emit'; event: string; payload?: unknown; requestId?: string }
    | { type: 'featherpanel-bus'; op: 'on'; event: string; subscriptionId: string }
    | { type: 'featherpanel-bus'; op: 'off'; event: string; subscriptionId: string }
    | { type: 'featherpanel-bus'; op: 'runAction'; actionId: string; ctx?: Record<string, unknown>; requestId: string }
    | {
          type: 'featherpanel-bus';
          op: 'registerAction';
          actionId: string;
          handlerId: string;
          priority?: number;
      }
    | { type: 'featherpanel-bus'; op: 'unregisterAction'; actionId: string; handlerId: string };

const iframeSubscriptions = new Map<string, { event: string; unsub: () => void; source: MessageEventSource }>();

/**
 * Same-origin iframe ↔ host event/action bus bridge.
 */
export function installPostMessageBusBridge(): () => void {
    const onMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        const data = event.data as BusMessage | null;
        if (!data || typeof data !== 'object' || data.type !== 'featherpanel-bus') return;
        if (!event.source) return;

        const reply = (payload: Record<string, unknown>) => {
            try {
                (event.source as Window).postMessage(
                    { type: 'featherpanel-bus-reply', version: FEATHERPANEL_HOST_VERSION, ...payload },
                    window.location.origin,
                );
            } catch {
                // ignore
            }
        };

        switch (data.op) {
            case 'emit': {
                if (typeof data.event === 'string') {
                    pluginEventBus.emit(data.event, data.payload);
                    if (data.requestId) reply({ requestId: data.requestId, ok: true });
                }
                break;
            }
            case 'on': {
                if (typeof data.event !== 'string' || typeof data.subscriptionId !== 'string') break;
                const existing = iframeSubscriptions.get(data.subscriptionId);
                existing?.unsub();
                const source = event.source;
                const handler: EventHandler = (payload) => {
                    try {
                        (source as Window).postMessage(
                            {
                                type: 'featherpanel-bus-event',
                                version: FEATHERPANEL_HOST_VERSION,
                                subscriptionId: data.subscriptionId,
                                event: data.event,
                                payload,
                            },
                            window.location.origin,
                        );
                    } catch {
                        // ignore
                    }
                };
                const unsub = pluginEventBus.on(data.event, handler);
                iframeSubscriptions.set(data.subscriptionId, { event: data.event, unsub, source });
                reply({ subscriptionId: data.subscriptionId, ok: true });
                break;
            }
            case 'off': {
                if (typeof data.subscriptionId !== 'string') break;
                const sub = iframeSubscriptions.get(data.subscriptionId);
                sub?.unsub();
                iframeSubscriptions.delete(data.subscriptionId);
                reply({ subscriptionId: data.subscriptionId, ok: true });
                break;
            }
            case 'runAction': {
                if (typeof data.actionId !== 'string' || typeof data.requestId !== 'string') break;
                void pluginActionHooks.run(data.actionId, data.ctx ?? {}).then((ctx) => {
                    reply({
                        requestId: data.requestId,
                        ok: true,
                        cancelled: Boolean(ctx.cancelled),
                        cancelReason: ctx.cancelReason,
                        ctx: { ...ctx, cancel: undefined },
                    });
                });
                break;
            }
            case 'registerAction': {
                // Iframes cannot ship functions over postMessage — they request runAction
                // or listen for events. Acknowledge and document limitation.
                reply({
                    ok: false,
                    error: 'registerAction from iframe is not supported; use host Frontend/index.js or emit/runAction',
                    handlerId: data.handlerId,
                });
                break;
            }
            case 'unregisterAction': {
                if (typeof data.actionId === 'string' && typeof data.handlerId === 'string') {
                    pluginActionHooks.unregister(data.actionId, data.handlerId);
                    reply({ ok: true });
                }
                break;
            }
            default:
                break;
        }
    };

    window.addEventListener('message', onMessage);
    return () => {
        window.removeEventListener('message', onMessage);
        iframeSubscriptions.forEach((s) => s.unsub());
        iframeSubscriptions.clear();
    };
}
