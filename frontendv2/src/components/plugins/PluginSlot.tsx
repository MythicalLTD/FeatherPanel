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

import type { ReactNode } from 'react';
import { usePluginUiOptional } from '@/contexts/PluginUiContext';
import { renderPluginReplace } from '@/components/plugins/PluginRemoteLoader';
import { runPluginJs } from '@/lib/run-plugin-js';
import { pluginModalRegistry } from '@/lib/plugin-sdk/registries';
import { cn } from '@/lib/utils';

interface PluginSlotProps {
    /** Stable slot id, e.g. `shell.sidebar` or `toolbar.server-console`. */
    id: string;
    /** Built-in UI when no plugin replace is active. */
    children?: ReactNode;
    /** Optional class on the slot wrapper. */
    className?: string;
    /** When true, also render action buttons registered for this slot after children. */
    showActions?: boolean;
    /** Height for iframe replacements. */
    replaceHeight?: string;
    /** If true, hide the entire slot (including actions) when hidden via overrides. */
    collapseWhenHidden?: boolean;
}

/**
 * Named extension point for plugins / UI packs.
 * - hide → render nothing
 * - replace → iframe or React remote instead of children
 * - actions → optional append toolbar actions (js / componentUrl / remoteUrl)
 */
export function PluginSlot({
    id,
    children,
    className,
    showActions = false,
    replaceHeight = '100%',
    collapseWhenHidden = true,
}: PluginSlotProps) {
    const pluginUi = usePluginUiOptional();

    if (!pluginUi) {
        return (
            <div className={className} data-fp-slot={id}>
                {children}
            </div>
        );
    }

    const { isHidden, getReplace, getActions } = pluginUi;

    if (isHidden(id) && collapseWhenHidden) {
        return null;
    }

    const replace = getReplace(id);
    if (replace) {
        const replaced = renderPluginReplace(replace, {
            height: replaceHeight,
            className: 'h-full w-full min-h-[12rem] border-0 bg-transparent',
            fallback: children,
        });
        const wrapClass = className === 'contents' ? undefined : className;
        return (
            <div className={cn('fp-plugin-slot', wrapClass)} data-fp-slot={id} data-fp-slot-replaced='1'>
                {replaced}
            </div>
        );
    }

    const actions = showActions ? getActions(id) : [];

    return (
        <div className={cn('fp-plugin-slot', className)} data-fp-slot={id}>
            {children}
            {actions.length > 0 ? (
                <div className='fp-plugin-slot-actions mt-2 flex flex-wrap gap-2' data-fp-slot-actions={id}>
                    {actions.map((action) => (
                        <button
                            key={action.id}
                            type='button'
                            className='border-border/60 bg-card/60 hover:bg-accent/40 rounded-md border px-2.5 py-1.5 text-xs font-medium'
                            onClick={() => {
                                if (action.js) {
                                    runPluginJs(action.js);
                                    return;
                                }
                                if (action.remoteUrl || action.componentUrl) {
                                    const modalId = `slot-action-${action.id}`;
                                    pluginModalRegistry.register({
                                        id: modalId,
                                        title: action.label,
                                        remoteUrl: action.remoteUrl ?? undefined,
                                        componentUrl: action.componentUrl ?? undefined,
                                        size: 'lg',
                                    });
                                    pluginModalRegistry.open(modalId, { slot: id, actionId: action.id });
                                    return;
                                }
                            }}
                        >
                            {action.label}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
