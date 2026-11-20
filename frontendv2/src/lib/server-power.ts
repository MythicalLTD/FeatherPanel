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
 * Power actions for one server, shared by the console header and the sidebar controls so both
 * run the same plugin hooks and hit the same endpoint (the panel API, so lifecycle hooks run).
 */

import axios from 'axios';

export type ServerPowerAction = 'start' | 'stop' | 'restart' | 'kill';

/** Status shown right after a power action is sent, until the daemon reports the real one. */
export const POWER_OPTIMISTIC_STATUS: Record<ServerPowerAction, string> = {
    start: 'starting',
    stop: 'stopping',
    restart: 'stopping',
    kill: 'stopping',
};

export const isOfflinePowerStatus = (status: string) =>
    status === 'stopped' || status === 'offline' || status === 'error';
export const isRunningPowerStatus = (status: string) => status === 'running' || status === 'starting';

/** Server states where power controls make no sense (the daemon refuses them or nothing runs). */
export const POWER_UNAVAILABLE_STATUSES = new Set([
    'suspended',
    'installing',
    'install_failed',
    'reinstalling',
    'restoring_backup',
    'transferring',
]);

/**
 * Runs the `fp:server:power` plugin hooks (and `fp:ui:confirm` for a kill). Returns the action to
 * send, which a plugin may have changed, or null when a plugin cancelled it.
 */
export async function runServerPowerHooks(
    action: ServerPowerAction,
    { uuid, uuidShort, killMessage }: { uuid: string; uuidShort: string | null; killMessage: string },
): Promise<ServerPowerAction | null> {
    const { pluginActionHooks } = await import('@/lib/plugin-sdk/action-hooks');
    const { pluginEventBus } = await import('@/lib/plugin-sdk/event-bus');
    const { FP_ACTIONS, FP_EVENTS } = await import('@/lib/plugin-sdk/ids');

    const hookCtx = await pluginActionHooks.run(FP_ACTIONS.SERVER_POWER, { action, uuid, uuidShort });
    if (hookCtx.cancelled) {
        pluginEventBus.emit(FP_EVENTS.SERVER_POWER_RESULT, {
            uuid,
            action,
            ok: false,
            cancelled: true,
            reason: hookCtx.cancelReason,
        });
        return null;
    }
    const finalAction = (hookCtx.action as ServerPowerAction) || action;

    if (finalAction === 'kill') {
        const confirmCtx = await pluginActionHooks.run(FP_ACTIONS.UI_CONFIRM, {
            kind: 'server-kill',
            uuid,
            message: killMessage,
        });
        if (confirmCtx.cancelled) return null;
    }

    return finalAction;
}

/** Tells plugins how a power action ended. */
export async function emitServerPowerResult(uuid: string, action: ServerPowerAction, error?: unknown): Promise<void> {
    const { pluginEventBus } = await import('@/lib/plugin-sdk/event-bus');
    const { FP_EVENTS } = await import('@/lib/plugin-sdk/ids');
    pluginEventBus.emit(
        FP_EVENTS.SERVER_POWER_RESULT,
        error === undefined
            ? { uuid, action, ok: true }
            : { uuid, action, ok: false, error: error instanceof Error ? error.message : String(error) },
    );
}

/** Sends a power action through the panel API. */
export async function postServerPowerAction(uuid: string, action: ServerPowerAction): Promise<void> {
    await axios.post(`/api/user/servers/${uuid}/power/${action}`);
}
