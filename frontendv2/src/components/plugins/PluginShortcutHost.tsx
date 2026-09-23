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

import { useEffect } from 'react';
import { eventToCombo, pluginShortcutRegistry } from '@/lib/plugin-sdk/registries';
import { pluginActionHooks } from '@/lib/plugin-sdk/action-hooks';
import { FP_ACTIONS } from '@/lib/plugin-sdk/ids';

/**
 * Global shortcut router for plugin-registered combos.
 * Runs alongside panel Ctrl+D (search) — plugins should avoid that combo.
 */
export function PluginShortcutHost() {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null;
            const tag = target?.tagName?.toLowerCase();
            const isEditable =
                tag === 'input' ||
                tag === 'textarea' ||
                tag === 'select' ||
                target?.isContentEditable ||
                Boolean(target?.closest('[contenteditable="true"]'));
            if (isEditable) return;

            const combo = eventToCombo(event);
            if (!combo || combo === 'ctrl' || combo === 'alt' || combo === 'shift' || combo === 'meta') {
                return;
            }

            const shortcut = pluginShortcutRegistry.findByCombo(combo);
            if (!shortcut) return;

            event.preventDefault();
            void (async () => {
                const ctx = await pluginActionHooks.run(FP_ACTIONS.SHORTCUT_INVOKE, {
                    shortcutId: shortcut.id,
                    combo: shortcut.combo,
                    actionId: shortcut.actionId ?? null,
                });
                if (ctx.cancelled) return;

                if (shortcut.handler) {
                    await shortcut.handler();
                    return;
                }
                if (shortcut.actionId) {
                    await pluginActionHooks.run(shortcut.actionId, { source: 'shortcut', shortcutId: shortcut.id });
                }
            })();
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    return null;
}
