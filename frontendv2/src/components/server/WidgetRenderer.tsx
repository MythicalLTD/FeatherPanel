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

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/featherui/Button';
import { RotateCcw, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PluginWidget } from '@/types/plugin-widgets';
import { isCloudflareChallengeDocument, withCacheBuster } from '@/lib/cloudflare-challenge';
import { getPluginIframeThemeOverrideCss } from '@/lib/pluginIframeThemeCss';

interface WidgetRendererProps {
    widgets: PluginWidget[];
    height?: string;
    context?: Record<string, string | number | null | undefined>;
    /** When set with onToggleHidden, shows per-widget hide controls during layout customization. */
    isCustomizing?: boolean;
    hiddenWidgets?: string[];
    onToggleHidden?: (widgetId: string) => void;
}

export function WidgetRenderer({
    widgets,
    height = '400px',
    context,
    isCustomizing = false,
    hiddenWidgets,
    onToggleHidden,
}: WidgetRendererProps) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const pathname = usePathname();
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [errorStates, setErrorStates] = useState<Record<string, string | null>>({});
    const [challengeRetries, setChallengeRetries] = useState<Record<string, number>>({});
    const [widgetSrcs, setWidgetSrcs] = useState<Record<string, string>>({});
    const iframeReadyRef = useRef<Record<string, boolean>>({});

    const MAX_CHALLENGE_RETRIES = 4;
    const customizationEnabled = Boolean(isCustomizing || hiddenWidgets || onToggleHidden);
    const hiddenSet = hiddenWidgets ?? [];

    const visibleWidgets = customizationEnabled
        ? widgets.filter((widget) => isCustomizing || !hiddenSet.includes(widget.id))
        : widgets;

    // Stable fingerprints so useEffect does not re-fire every render when parents pass
    // a new `widgets` array (e.g. getWidgets()) or a new `context` object with the same values.
    const widgetsKey = JSON.stringify(
        visibleWidgets.map((w) => ({
            id: w.id,
            plugin: w.plugin,
            component: w.component,
            enabled: w.enabled !== false,
        })),
    );
    const contextKey =
        context == null
            ? ''
            : JSON.stringify(
                  Object.fromEntries(
                      Object.entries(context)
                          .filter(([, v]) => v !== null && v !== undefined)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([k, v]) => [k, String(v)] as [string, string]),
                  ),
              );

    // Build widget src URLs with current theme
    const buildWidgetSrc = (widget: PluginWidget): string => {
        const raw = widget.component;
        const pluginBase = `/components/${widget.plugin}/`;
        let pathWithFile: string;
        const merged = new URLSearchParams();

        if (raw.includes('?')) {
            const q = raw.indexOf('?');
            pathWithFile = raw.slice(0, q);
            const existing = new URLSearchParams(raw.slice(q + 1));
            existing.forEach((v, k) => merged.set(k, v));
        } else {
            pathWithFile = raw;
        }

        const baseUrl = `${pluginBase}${pathWithFile}`;
        merged.set('route', pathname || '');
        merged.set('__theme', theme);

        if (context) {
            Object.entries(context).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    merged.set(key, String(value));
                }
            });
        }

        // Stable per session so theme/route updates do not force a full iframe reload flash.
        // Explicit retries still bust via withCacheBuster() in retry handlers.
        merged.set('_fp_wcb', `${widget.plugin}:${widget.component}:${theme}`);

        const qs = merged.toString();
        return qs ? `${baseUrl}?${qs}` : baseUrl;
    };

    // Update widget srcs when theme, route, widget set, or context values change.
    // Uses widgetsKey/contextKey so a fresh array/object reference does not retrigger the effect.
    useEffect(() => {
        const newSrcs: Record<string, string> = {};
        visibleWidgets.forEach((widget) => {
            newSrcs[widget.id] = buildWidgetSrc(widget);
        });
        setWidgetSrcs((prev) => {
            const prevKeys = Object.keys(prev);
            const newKeys = Object.keys(newSrcs);
            if (prevKeys.length !== newKeys.length) {
                return newSrcs;
            }
            for (const id of newKeys) {
                if (prev[id] !== newSrcs[id]) {
                    return newSrcs;
                }
            }
            return prev;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- widgets/buildWidgetSrc omitted; widgetsKey/contextKey capture meaningful changes
    }, [theme, pathname, widgetsKey, contextKey]);

    // Send theme to all ready widget iframes when theme changes and inject styles
    useEffect(() => {
        visibleWidgets.forEach((widget) => {
            const iframe = document.querySelector(`iframe[data-widget-id="${widget.id}"]`) as HTMLIFrameElement;
            if (iframe?.contentWindow && iframeReadyRef.current[widget.id]) {
                iframe.contentWindow.postMessage({ type: 'featherpanel-theme', theme }, '*');
                injectThemeStyles(iframe);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps -- injectThemeStyles below; widgets omitted (use widgetsKey)
    }, [theme, widgetsKey]);

    // Listen for widget ready signals and send theme + inject styles
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'featherpanel-ready' && event.data?.widgetId) {
                const widgetId = event.data.widgetId;
                iframeReadyRef.current[widgetId] = true;
                const iframe = document.querySelector(`iframe[data-widget-id="${widgetId}"]`) as HTMLIFrameElement;
                if (iframe?.contentWindow) {
                    iframe.contentWindow.postMessage({ type: 'featherpanel-theme', theme }, '*');
                    setTimeout(() => injectThemeStyles(iframe), 100);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [theme]);

    if (!visibleWidgets || visibleWidgets.length === 0) return null;

    const injectThemeStyles = (iframe: HTMLIFrameElement) => {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!iframeDoc) return;

            // Remove existing theme styles
            const existingStyle = iframeDoc.getElementById('featherpanel-theme-override');
            if (existingStyle) {
                existingStyle.remove();
            }

            // Same strategy as PluginPage: light → html.light; dark → html.dark
            // plus matching color-scheme so the iframe canvas stays transparent.
            const root = iframeDoc.documentElement;
            root.setAttribute('data-fp-theme', theme);
            root.style.colorScheme = theme;
            if (theme === 'light') {
                root.classList.add('light');
                root.classList.remove('dark');
            } else {
                root.classList.add('dark');
                root.classList.remove('light');
            }

            const style = iframeDoc.createElement('style');
            style.id = 'featherpanel-theme-override';
            style.textContent = getPluginIframeThemeOverrideCss(theme);
            if (iframeDoc.head) {
                iframeDoc.head.appendChild(style);
            }
        } catch {
            // Ignore cross-origin access errors
        }
    };

    const handleIframeLoad = (widgetId: string, iframe: HTMLIFrameElement) => {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (isCloudflareChallengeDocument(iframeDoc)) {
                const currentRetries = challengeRetries[widgetId] || 0;
                if (currentRetries < MAX_CHALLENGE_RETRIES) {
                    const nextRetry = currentRetries + 1;
                    setChallengeRetries((prev) => ({ ...prev, [widgetId]: nextRetry }));
                    setLoadingStates((prev) => ({ ...prev, [widgetId]: true }));

                    const retryDelayMs = 800 * nextRetry;
                    const retryTarget = iframe.src;
                    setTimeout(() => {
                        iframe.src = withCacheBuster(retryTarget);
                    }, retryDelayMs);
                    return;
                }

                setLoadingStates((prev) => ({ ...prev, [widgetId]: false }));
                setErrorStates((prev) => ({
                    ...prev,
                    [widgetId]: 'Cloudflare verification is still in progress. Please wait a moment and try again.',
                }));
                return;
            }
        } catch {
            // Ignore cross-origin access errors and treat as normal content.
        }

        setChallengeRetries((prev) => ({ ...prev, [widgetId]: 0 }));
        setLoadingStates((prev) => ({ ...prev, [widgetId]: false }));
        setErrorStates((prev) => ({ ...prev, [widgetId]: null }));

        // Inject theme styles and send postMessage
        iframeReadyRef.current[widgetId] = true;
        if (iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'featherpanel-theme', theme }, '*');
        }
        setTimeout(() => injectThemeStyles(iframe), 100);
    };

    const handleIframeError = (widgetId: string) => {
        setLoadingStates((prev) => ({ ...prev, [widgetId]: false }));
        setErrorStates((prev) => ({ ...prev, [widgetId]: t('plugins.failedToLoadContent') }));
    };

    const retryLoad = (widgetId: string) => {
        setChallengeRetries((prev) => ({ ...prev, [widgetId]: 0 }));
        setErrorStates((prev) => ({ ...prev, [widgetId]: null }));
        setLoadingStates((prev) => ({ ...prev, [widgetId]: true }));

        const iframe = document.querySelector(`iframe[data-widget-id="${widgetId}"]`) as HTMLIFrameElement;
        if (iframe) {
            const src = iframe.src;
            iframe.src = '';
            setTimeout(() => {
                iframe.src = withCacheBuster(src);
            }, 100);
        }
    };

    const getGridClass = (widget: PluginWidget): string => {
        if (widget.layout) {
            const { columns, sm, md, lg, xl, colSpan } = widget.layout;

            const baseSpan = colSpan ?? columns;

            let classes = baseSpan ? `col-span-${baseSpan}` : 'col-span-12';

            if (sm) classes += ` sm:col-span-${sm}`;
            if (md) classes += ` md:col-span-${md}`;
            if (lg) classes += ` lg:col-span-${lg}`;
            if (xl) classes += ` xl:col-span-${xl}`;

            return cn(classes, widget.classes?.container);
        }

        if (typeof widget.size === 'string') {
            const sizeMap: Record<string, string> = {
                half: 'col-span-12 md:col-span-6',
                third: 'col-span-12 md:col-span-6 lg:col-span-4',
                quarter: 'col-span-12 md:col-span-6 lg:col-span-3',
                full: 'col-span-12',
            };
            return cn(sizeMap[widget.size] || sizeMap.full, widget.classes?.container);
        }

        return cn('col-span-12', widget.classes?.container);
    };

    const shouldRenderAsCard = (widget: PluginWidget) => {
        if (widget.useRawRendering || widget.borderless) return false;
        if (widget.card === null) return true;
        if (typeof widget.card?.enabled === 'boolean') return widget.card.enabled;
        return true;
    };

    const shouldShowHeader = (widget: PluginWidget) => {
        if (!shouldRenderAsCard(widget)) return false;
        const header = widget.card?.header;
        if (!header) return Boolean(widget.title || widget.description || widget.icon);
        if (typeof header.show === 'boolean') return header.show;
        return Boolean(header.title || header.description || widget.title || widget.description);
    };

    const getHeaderTitle = (widget: PluginWidget) => widget.card?.header?.title ?? widget.title;
    const getHeaderDescription = (widget: PluginWidget) => widget.card?.header?.description ?? widget.description;

    const getCardIcon = (widget: PluginWidget) => widget.card?.header?.icon ?? widget.icon;

    /** Map plugin iframe config to valid DOM attrs; keep layout-only keys out of the element. */
    const getIframeDomProps = (widget: PluginWidget) => {
        const { minHeight, maxHeight, ariaLabel, referrerPolicy, ...domAttrs } = widget.iframe ?? {};
        const resolvedMinHeight = minHeight || height;

        return {
            containerStyle: { minHeight: resolvedMinHeight } as React.CSSProperties,
            iframeStyle: {
                minHeight: resolvedMinHeight,
                ...(maxHeight ? { maxHeight } : {}),
                // Must match parent `html.style.colorScheme` or Chromium paints
                // an opaque white/dark Canvas instead of letting the backdrop through.
                background: 'transparent',
                colorScheme: theme,
            } as React.CSSProperties,
            ariaLabel,
            referrerPolicy: referrerPolicy as React.HTMLAttributeReferrerPolicy | undefined,
            domAttrs,
        };
    };

    return (
        <div className='grid w-full grid-cols-12 gap-4'>
            {visibleWidgets.map((widget) => {
                const iframeProps = getIframeDomProps(widget);
                const isHidden = hiddenSet.includes(widget.id);
                const showHideToggle = Boolean(isCustomizing && onToggleHidden);

                return (
                    <div key={widget.id} className={cn('relative w-full min-w-0 transition-all', getGridClass(widget))}>
                        {showHideToggle && (
                            <button
                                type='button'
                                onClick={() => onToggleHidden?.(widget.id)}
                                title={
                                    isHidden
                                        ? t('dashboard.layout.show_plugin_widget')
                                        : t('dashboard.layout.hide_plugin_widget')
                                }
                                aria-label={
                                    isHidden
                                        ? t('dashboard.layout.show_plugin_widget')
                                        : t('dashboard.layout.hide_plugin_widget')
                                }
                                className='bg-background border-border text-muted-foreground absolute -top-2 -right-2 z-20 rounded-full border p-2 shadow-sm transition-transform hover:scale-105'
                            >
                                {isHidden ? (
                                    <Eye className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
                                ) : (
                                    <EyeOff className='h-3.5 w-3.5 sm:h-4 sm:w-4' />
                                )}
                            </button>
                        )}
                        <div className={cn(isHidden && isCustomizing && 'rounded-xl opacity-30 grayscale')}>
                            {shouldRenderAsCard(widget) ? (
                                <Card
                                    className={cn(
                                        'flex h-full flex-col overflow-hidden transition-all duration-300',
                                        'from-primary/10 via-primary/5 bg-linear-to-br to-transparent',
                                        'border-primary/20 hover:border-primary/30',
                                        widget.card?.variant === 'outline' && 'border-primary/40',
                                        widget.classes?.card,
                                    )}
                                >
                                    {shouldShowHeader(widget) && (
                                        <CardHeader className={cn('space-y-1 pb-4', widget.classes?.header)}>
                                            <div className='flex items-center gap-3'>
                                                {getCardIcon(widget) && (
                                                    <div className='bg-primary/10 text-primary border-primary/20 flex h-10 w-10 items-center justify-center rounded-xl border'>
                                                        <span className='text-sm font-bold tracking-wider uppercase'>
                                                            {getCardIcon(widget)}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className='flex flex-1 flex-col justify-center gap-0.5'>
                                                    {getHeaderTitle(widget) && (
                                                        <CardTitle className='text-foreground/90 text-base font-bold tracking-tight'>
                                                            {getHeaderTitle(widget)}
                                                        </CardTitle>
                                                    )}
                                                    {getHeaderDescription(widget) && (
                                                        <CardDescription className='text-muted-foreground/70 line-clamp-1 text-xs'>
                                                            {getHeaderDescription(widget)}
                                                        </CardDescription>
                                                    )}
                                                </div>
                                            </div>
                                        </CardHeader>
                                    )}
                                    <CardContent
                                        className={cn(
                                            'relative flex-1 p-4',
                                            widget.card?.padding === 'none' && 'p-0',
                                            widget.card?.padding === 'sm' && 'p-3',
                                            widget.card?.padding === 'md' && 'p-5',
                                            widget.card?.padding === 'lg' && 'p-8',
                                            widget.classes?.content,
                                        )}
                                    >
                                        <div className='relative h-full w-full' style={iframeProps.containerStyle}>
                                            {loadingStates[widget.id] !== false && (
                                                <div className='bg-muted/20 absolute inset-0 z-20 flex items-center justify-center'>
                                                    <div className='border-muted-foreground/30 border-t-primary h-7 w-7 animate-spin rounded-full border-2' />
                                                </div>
                                            )}

                                            {errorStates[widget.id] && (
                                                <div className='bg-background/60 animate-fade-in absolute inset-0 z-20 flex items-center justify-center p-6 backdrop-blur-md'>
                                                    <div className='max-w-[80%] text-center'>
                                                        <div className='bg-destructive/10 text-destructive mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl'>
                                                            <AlertTriangle className='h-6 w-6' />
                                                        </div>
                                                        <p className='text-foreground/80 mb-6 text-sm font-medium'>
                                                            {errorStates[widget.id] || widget.behavior?.errorMessage}
                                                        </p>
                                                        <Button
                                                            size='sm'
                                                            variant='outline'
                                                            className='border-primary/20 bg-primary/5 hover:bg-primary/10 h-9'
                                                            onClick={() => retryLoad(widget.id)}
                                                        >
                                                            <RotateCcw className='mr-2 h-4 w-4' />
                                                            {widget.behavior?.retryLabel || t('plugins.retry')}
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}

                                            {!errorStates[widget.id] && widgetSrcs[widget.id] && (
                                                <iframe
                                                    key={`${widget.id}-${theme}`}
                                                    data-widget-id={widget.id}
                                                    src={widgetSrcs[widget.id]}
                                                    className={cn(
                                                        'h-full w-full border-0 transition-opacity duration-200',
                                                        loadingStates[widget.id] !== false
                                                            ? 'opacity-0'
                                                            : 'opacity-100',
                                                        widget.classes?.iframe,
                                                    )}
                                                    style={iframeProps.iframeStyle}
                                                    {...iframeProps.domAttrs}
                                                    aria-label={iframeProps.ariaLabel}
                                                    referrerPolicy={iframeProps.referrerPolicy}
                                                    onLoad={(event) => handleIframeLoad(widget.id, event.currentTarget)}
                                                    onError={() => handleIframeError(widget.id)}
                                                    {...{ allowtransparency: 'true' }}
                                                />
                                            )}
                                        </div>
                                    </CardContent>

                                    {widget.card?.footer?.show && widget.card.footer.text && (
                                        <CardFooter
                                            className={cn('text-muted-foreground text-sm', widget.classes?.footer)}
                                        >
                                            {widget.card.footer.text}
                                        </CardFooter>
                                    )}
                                </Card>
                            ) : (
                                <div className={cn('relative w-full', widget.classes?.card)}>
                                    <div className='relative h-full w-full' style={iframeProps.containerStyle}>
                                        {!errorStates[widget.id] && widgetSrcs[widget.id] && (
                                            <iframe
                                                key={`${widget.id}-${theme}`}
                                                data-widget-id={widget.id}
                                                src={widgetSrcs[widget.id]}
                                                className={cn(
                                                    'h-full w-full border-0 transition-opacity duration-200',
                                                    loadingStates[widget.id] !== false ? 'opacity-0' : 'opacity-100',
                                                    widget.classes?.iframe,
                                                )}
                                                style={iframeProps.iframeStyle}
                                                {...iframeProps.domAttrs}
                                                aria-label={iframeProps.ariaLabel}
                                                referrerPolicy={iframeProps.referrerPolicy}
                                                onLoad={(event) => handleIframeLoad(widget.id, event.currentTarget)}
                                                onError={() => handleIframeError(widget.id)}
                                                {...{ allowtransparency: 'true' }}
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
