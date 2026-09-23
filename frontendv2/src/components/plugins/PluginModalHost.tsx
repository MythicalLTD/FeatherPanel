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

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { pluginModalRegistry } from '@/lib/plugin-sdk/registries';
import { PluginIframeHost, PluginRemoteHost } from '@/components/plugins/PluginRemoteLoader';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

export function PluginModalHost() {
    const { t } = useTranslation();
    const [state, setState] = useState(pluginModalRegistry.getState());

    useEffect(() => pluginModalRegistry.subscribe(setState), []);

    if (!state.open || !state.id) return null;

    const def = pluginModalRegistry.get(state.id);
    if (!def) return null;

    const sizeClass =
        def.size === 'sm'
            ? 'max-w-md'
            : def.size === 'lg'
              ? 'max-w-3xl'
              : def.size === 'xl'
                ? 'max-w-5xl'
                : def.size === 'full'
                  ? 'max-w-[min(96vw,80rem)]'
                  : 'max-w-xl';

    return (
        <div
            className='fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4'
            role='dialog'
            aria-modal='true'
            aria-label={def.title || def.id}
            onClick={() => pluginModalRegistry.close()}
        >
            <div
                className={cn(
                    'border-border bg-card text-card-foreground relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border shadow-xl',
                    sizeClass,
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className='border-border flex items-center justify-between border-b px-4 py-3'>
                    <h2 className='text-sm font-semibold'>{def.title || def.id}</h2>
                    <button
                        type='button'
                        className='text-muted-foreground hover:text-foreground rounded-md p-1'
                        onClick={() => pluginModalRegistry.close()}
                        aria-label={t('common.close')}
                    >
                        <X className='h-4 w-4' />
                    </button>
                </div>
                <div className='min-h-[200px] flex-1 overflow-auto'>
                    {def.remoteUrl ? (
                        <PluginRemoteHost
                            url={def.remoteUrl}
                            props={{ modalId: def.id, ...state.props }}
                            fallback={
                                <div className='text-muted-foreground p-6 text-sm'>{t('plugins.modal.loading')}</div>
                            }
                        />
                    ) : def.componentUrl ? (
                        <PluginIframeHost src={def.componentUrl} title={def.title || def.id} height='60vh' />
                    ) : (
                        <div className='text-muted-foreground p-6 text-sm'>{t('plugins.modal.noComponent')}</div>
                    )}
                </div>
            </div>
        </div>
    );
}
