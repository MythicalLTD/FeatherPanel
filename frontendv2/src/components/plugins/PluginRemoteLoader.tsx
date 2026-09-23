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

import { Suspense, lazy, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { getPluginIframeThemeOverrideCss } from '@/lib/pluginIframeThemeCss';
import type { PluginSlotReplace } from '@/types/plugin-overrides';

type RemoteModule = {
    default?: ComponentType<Record<string, unknown>>;
    PluginSlot?: ComponentType<Record<string, unknown>>;
};

const remoteCache = new Map<string, Promise<ComponentType<Record<string, unknown>>>>();

function loadRemoteComponent(url: string): Promise<ComponentType<Record<string, unknown>>> {
    const existing = remoteCache.get(url);
    if (existing) return existing;

    const promise = (async () => {
        // Runtime ESM import — panel stays prebuilt; plugin ships its own bundle.
        const mod = (await import(/* webpackIgnore: true */ url)) as RemoteModule;
        const Comp = mod.default ?? mod.PluginSlot;
        if (!Comp) {
            throw new Error(`Plugin remote at ${url} has no default export`);
        }
        return Comp;
    })();

    remoteCache.set(url, promise);
    return promise;
}

export function PluginRemoteHost({
    url,
    fallback = null,
    props = {},
}: {
    url: string;
    fallback?: ReactNode;
    props?: Record<string, unknown>;
}) {
    const { t } = useTranslation();
    const [Comp, setComp] = useState<ComponentType<Record<string, unknown>> | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setComp(null);
        setError(null);
        loadRemoteComponent(url)
            .then((C) => {
                if (!cancelled) setComp(() => C);
            })
            .catch((err) => {
                console.error('Failed to load plugin remote', url, err);
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : t('plugins.remote.loadFailed'));
                }
            });
        return () => {
            cancelled = true;
        };
    }, [url, t]);

    if (error) {
        return (
            <div className='border-destructive/40 bg-destructive/10 text-destructive rounded-md border p-3 text-xs'>
                {t('plugins.remote.failed', { error })}
            </div>
        );
    }

    if (!Comp) {
        return <>{fallback}</>;
    }

    return (
        <Suspense fallback={fallback}>
            <Comp {...props} />
        </Suspense>
    );
}

export function PluginIframeHost({
    src,
    title,
    className,
    height = '100%',
}: {
    src: string;
    title?: string;
    className?: string;
    height?: string;
}) {
    const { t } = useTranslation();
    const { theme, themePack } = useTheme();
    const tokens = theme === 'dark' ? themePack?.tokens.dark : themePack?.tokens.light;

    return (
        <iframe
            title={title || t('plugins.iframe.defaultTitle')}
            src={src}
            className={className ?? 'h-full w-full border-0 bg-transparent'}
            style={{ height, colorScheme: theme }}
            onLoad={(e) => {
                const iframe = e.currentTarget;
                try {
                    const doc = iframe.contentDocument;
                    if (!doc) return;
                    let style = doc.getElementById('featherpanel-theme-override') as HTMLStyleElement | null;
                    if (!style) {
                        style = doc.createElement('style');
                        style.id = 'featherpanel-theme-override';
                        doc.head.appendChild(style);
                    }
                    style.textContent = getPluginIframeThemeOverrideCss(theme, tokens);
                    doc.documentElement.dataset.fpTheme = theme;
                    doc.documentElement.classList.remove('light', 'dark');
                    doc.documentElement.classList.add(theme);
                    iframe.contentWindow?.postMessage(
                        {
                            type: 'featherpanel-theme',
                            version: 1,
                            theme,
                            themePackId: themePack?.id ?? 'default',
                            tokens: tokens ?? {},
                        },
                        window.location.origin,
                    );
                } catch {
                    // cross-origin — ignore
                }
            }}
        />
    );
}

export function renderPluginReplace(
    replace: PluginSlotReplace | null | undefined,
    options?: { height?: string; className?: string; fallback?: ReactNode },
): ReactNode {
    if (!replace || replace.hide) return null;
    if (replace.remoteUrl) {
        return (
            <PluginRemoteHost
                url={replace.remoteUrl}
                fallback={options?.fallback ?? null}
                props={{ slot: replace.slot, plugin: replace.plugin }}
            />
        );
    }
    if (replace.componentUrl) {
        return (
            <PluginIframeHost
                src={replace.componentUrl}
                title={`Plugin ${replace.plugin}`}
                className={options?.className}
                height={options?.height}
            />
        );
    }
    return null;
}

/** Lazy wrapper used when we only know the URL string. */
export function createLazyRemote(url: string) {
    return lazy(async () => {
        const Comp = await loadRemoteComponent(url);
        return { default: Comp };
    });
}

export function useStableReplaceKey(replace: PluginSlotReplace | null): string {
    return useMemo(() => {
        if (!replace) return '';
        return `${replace.plugin}:${replace.slot}:${replace.remoteUrl ?? replace.componentUrl ?? 'hide'}`;
    }, [replace]);
}
