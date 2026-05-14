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
import { Button } from '@/components/ui/button';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PluginWidget } from '@/types/plugin-widgets';
import { isCloudflareChallengeDocument, withCacheBuster } from '@/lib/cloudflare-challenge';
import { getPluginIframeThemeOverrideCss } from '@/lib/pluginIframeThemeCss';

interface WidgetRendererProps {
    widgets: PluginWidget[];
    height?: string;
    context?: Record<string, string | number | null | undefined>;
}

export function WidgetRenderer({ widgets, height = '400px', context }: WidgetRendererProps) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const pathname = usePathname();
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [errorStates, setErrorStates] = useState<Record<string, string | null>>({});
    const [challengeRetries, setChallengeRetries] = useState<Record<string, number>>({});
    const [widgetSrcs, setWidgetSrcs] = useState<Record<string, string>>({});
    const iframeReadyRef = useRef<Record<string, boolean>>({});

    const MAX_CHALLENGE_RETRIES = 4;

    // Stable fingerprints so useEffect does not re-fire every render when parents pass
    // a new `widgets` array (e.g. getWidgets()) or a new `context` object with the same values.
    const widgetsKey = JSON.stringify(
        widgets.map((w) => ({
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

        // Bust browser / CDN caches for plugin widget documents (HTML entry + hashed assets).
        merged.set('_fp_wcb', String(Date.now()));

        const qs = merged.toString();
        return qs ? `${baseUrl}?${qs}` : baseUrl;
    };

    // Update widget srcs when theme, route, widget set, or context values change.
    // Uses widgetsKey/contextKey so a fresh array/object reference does not retrigger the effect.
    useEffect(() => {
        const newSrcs: Record<string, string> = {};
        widgets.forEach((widget) => {
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
        widgets.forEach((widget) => {
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

    if (!widgets || widgets.length === 0) return null;

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
            // plus injected shell transparency so the panel backdrop shows through.
            const root = iframeDoc.documentElement;
            root.setAttribute('data-fp-theme', theme);
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

    return (
        <div className='grid w-full grid-cols-12 gap-4'>
            {widgets.map((widget) => (
                <div key={widget.id} className={cn('w-full min-w-0 transition-all', getGridClass(widget))}>
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
                                <div
                                    className='relative h-full w-full'
                                    style={{ minHeight: widget.iframe?.minHeight || height }}
                                >
                                    {loadingStates[widget.id] !== false && (
                                        <div className='bg-background/50 absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm transition-all duration-300'>
                                            <div className='flex flex-col items-center space-y-4'>
                                                <div className='relative flex items-center justify-center'>
                                                    <div className='border-primary h-10 w-10 animate-spin rounded-full border-2 border-t-transparent' />
                                                    <div className='bg-primary/20 absolute h-6 w-6 animate-pulse rounded-full' />
                                                </div>
                                                <p className='text-muted-foreground text-xs font-medium tracking-tight'>
                                                    {widget.behavior?.loadingMessage || t('plugins.loadingContent')}
                                                </p>
                                            </div>
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
                                            key={`${widget.id}-${theme}-${widgetSrcs[widget.id]}`}
                                            data-widget-id={widget.id}
                                            src={widgetSrcs[widget.id]}
                                            className={cn(
                                                'h-full w-full border-0 transition-opacity duration-300',
                                                loadingStates[widget.id] ? 'opacity-0' : 'opacity-100',
                                                widget.classes?.iframe,
                                            )}
                                            style={{
                                                minHeight: widget.iframe?.minHeight || height,
                                                background: 'transparent',
                                            }}
                                            {...widget.iframe}
                                            referrerPolicy={
                                                widget.iframe?.referrerPolicy as React.HTMLAttributeReferrerPolicy
                                            }
                                            onLoad={(event) => handleIframeLoad(widget.id, event.currentTarget)}
                                            onError={() => handleIframeError(widget.id)}
                                            {...{ allowtransparency: 'true' }}
                                        />
                                    )}
                                </div>
                            </CardContent>

                            {widget.card?.footer?.show && widget.card.footer.text && (
                                <CardFooter className={cn('text-muted-foreground text-sm', widget.classes?.footer)}>
                                    {widget.card.footer.text}
                                </CardFooter>
                            )}
                        </Card>
                    ) : (
                        <div className={cn('relative w-full', widget.classes?.card)}>
                            <div
                                className='relative h-full w-full'
                                style={{ minHeight: widget.iframe?.minHeight || height }}
                            >
                                {!errorStates[widget.id] && widgetSrcs[widget.id] && (
                                    <iframe
                                        key={`${widget.id}-${theme}-${widgetSrcs[widget.id]}`}
                                        data-widget-id={widget.id}
                                        src={widgetSrcs[widget.id]}
                                        className={cn(
                                            'h-full w-full border-0 transition-opacity duration-300',
                                            loadingStates[widget.id] ? 'opacity-0' : 'opacity-100',
                                            widget.classes?.iframe,
                                        )}
                                        style={{
                                            minHeight: widget.iframe?.minHeight || height,
                                            background: 'transparent',
                                        }}
                                        {...widget.iframe}
                                        referrerPolicy={
                                            widget.iframe?.referrerPolicy as React.HTMLAttributeReferrerPolicy
                                        }
                                        onLoad={(event) => handleIframeLoad(widget.id, event.currentTarget)}
                                        onError={() => handleIframeError(widget.id)}
                                        {...{ allowtransparency: 'true' }}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
