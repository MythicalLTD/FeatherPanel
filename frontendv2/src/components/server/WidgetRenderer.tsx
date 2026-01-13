/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PluginWidget } from '@/types/plugin-widgets';

interface WidgetRendererProps {
    widgets: PluginWidget[];
    height?: string;
}

export function WidgetRenderer({ widgets, height = '400px' }: WidgetRendererProps) {
    const { t } = useTranslation();
    const pathname = usePathname();
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [errorStates, setErrorStates] = useState<Record<string, string | null>>({});

    if (!widgets || widgets.length === 0) return null;

    const getWidgetSrc = (widget: PluginWidget): string => {
        const baseUrl = `/components/${widget.plugin}/${widget.component}`;
        const separator = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}route=${encodeURIComponent(pathname || '')}`;
    };

    const handleIframeLoad = (widgetId: string) => {
        setLoadingStates((prev) => ({ ...prev, [widgetId]: false }));
        setErrorStates((prev) => ({ ...prev, [widgetId]: null }));
    };

    const handleIframeError = (widgetId: string) => {
        setLoadingStates((prev) => ({ ...prev, [widgetId]: false }));
        setErrorStates((prev) => ({ ...prev, [widgetId]: t('plugins.failedToLoadContent') })); // Simplified error message
    };

    const retryLoad = (widgetId: string) => {
        setErrorStates((prev) => ({ ...prev, [widgetId]: null }));
        setLoadingStates((prev) => ({ ...prev, [widgetId]: true }));

        const iframe = document.querySelector(`iframe[data-widget-id="${widgetId}"]`) as HTMLIFrameElement;
        if (iframe) {
            const src = iframe.src;
            iframe.src = '';
            setTimeout(() => {
                iframe.src = src;
            }, 100);
        }
    };

    const getGridClass = (widget: PluginWidget): string => {
        if (widget.layout) {
            const { columns, sm, md, lg, xl, colSpan } = widget.layout;
            // Map 'columns' to colSpan if present, or use colSpan
            const baseSpan = colSpan ?? columns;

            // Base class
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

        // Handle object size config if needed (simplified here to assume string or layout)
        return cn('col-span-12', widget.classes?.container);
    };

    const shouldRenderAsCard = (widget: PluginWidget) => {
        if (widget.useRawRendering) return false;
        if (widget.card === null) return true;
        if (typeof widget.card?.enabled === 'boolean') return widget.card.enabled;
        return true;
    };

    // Helpers for card parts
    const shouldShowHeader = (widget: PluginWidget) => {
        if (!shouldRenderAsCard(widget)) return false;
        const header = widget.card?.header;
        if (!header) return Boolean(widget.title || widget.description || widget.icon);
        if (typeof header.show === 'boolean') return header.show;
        return Boolean(header.title || header.description || widget.title || widget.description);
    };

    const getHeaderTitle = (widget: PluginWidget) => widget.card?.header?.title ?? widget.title;
    const getHeaderDescription = (widget: PluginWidget) => widget.card?.header?.description ?? widget.description;

    // Icon handling requires dynamic imports or a map of Lucide icons,
    // or we render the string as is if the backend sends SVG/HTML (unlikely)
    // or just the name. For now, let's render the name in a badge-like style as in Vue.
    const getCardIcon = (widget: PluginWidget) => widget.card?.header?.icon ?? widget.icon;

    return (
        <div className='grid grid-cols-12 gap-4 w-full'>
            {widgets.map((widget) => (
                <div key={widget.id} className={cn('w-full min-w-0 transition-all', getGridClass(widget))}>
                    {shouldRenderAsCard(widget) ? (
                        <Card
                            className={cn(
                                'h-full flex flex-col overflow-hidden transition-all duration-300',
                                'bg-linear-to-br from-primary/10 via-primary/5 to-transparent',
                                'border-primary/20 shadow-sm hover:shadow-md hover:border-primary/30',
                                widget.card?.variant === 'outline' && 'border-primary/40',
                                widget.classes?.card,
                            )}
                        >
                            {shouldShowHeader(widget) && (
                                <CardHeader className={cn('space-y-1 pb-4', widget.classes?.header)}>
                                    <div className='flex items-center gap-3'>
                                        {getCardIcon(widget) && (
                                            <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[0_0_15px_rgba(var(--primary),0.1)] border border-primary/20'>
                                                <span className='text-sm font-bold uppercase tracking-wider'>
                                                    {getCardIcon(widget)}
                                                </span>
                                            </div>
                                        )}
                                        <div className='flex flex-1 flex-col justify-center gap-0.5'>
                                            {getHeaderTitle(widget) && (
                                                <CardTitle className='text-base font-bold tracking-tight text-foreground/90'>
                                                    {getHeaderTitle(widget)}
                                                </CardTitle>
                                            )}
                                            {getHeaderDescription(widget) && (
                                                <CardDescription className='text-xs text-muted-foreground/70 line-clamp-1'>
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
                                    className='relative w-full h-full'
                                    style={{ minHeight: widget.iframe?.minHeight || height }}
                                >
                                    {/* Loading State */}
                                    {loadingStates[widget.id] !== false && (
                                        <div className='absolute inset-0 z-20 flex items-center justify-center bg-background/50 backdrop-blur-sm transition-all duration-300'>
                                            <div className='flex flex-col items-center space-y-4'>
                                                <div className='relative flex items-center justify-center'>
                                                    <div className='h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent' />
                                                    <div className='absolute h-6 w-6 animate-pulse rounded-full bg-primary/20' />
                                                </div>
                                                <p className='text-xs font-medium text-muted-foreground tracking-tight'>
                                                    {widget.behavior?.loadingMessage || t('plugins.loadingContent')}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Error State */}
                                    {errorStates[widget.id] && (
                                        <div className='absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-md p-6 animate-fade-in'>
                                            <div className='max-w-[80%] text-center'>
                                                <div className='mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive'>
                                                    <AlertTriangle className='h-6 w-6' />
                                                </div>
                                                <p className='mb-6 text-sm font-medium text-foreground/80'>
                                                    {errorStates[widget.id] || widget.behavior?.errorMessage}
                                                </p>
                                                <Button
                                                    size='sm'
                                                    variant='outline'
                                                    className='h-9 border-primary/20 bg-primary/5 hover:bg-primary/10'
                                                    onClick={() => retryLoad(widget.id)}
                                                >
                                                    <RotateCcw className='mr-2 h-4 w-4' />
                                                    {widget.behavior?.retryLabel || t('plugins.retry')}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {!errorStates[widget.id] && (
                                        <iframe
                                            data-widget-id={widget.id}
                                            src={getWidgetSrc(widget)}
                                            className={cn(
                                                'w-full h-full border-0 transition-opacity duration-300',
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
                                            onLoad={() => handleIframeLoad(widget.id)}
                                            onError={() => handleIframeError(widget.id)}
                                            // @ts-expect-error - legacy property but still useful for some browsers
                                            allowTransparency='true'
                                        />
                                    )}
                                </div>
                            </CardContent>

                            {/* Footer logic if needed */}
                            {widget.card?.footer?.show && widget.card.footer.text && (
                                <CardFooter className={cn('text-sm text-muted-foreground', widget.classes?.footer)}>
                                    {widget.card.footer.text}
                                </CardFooter>
                            )}
                        </Card>
                    ) : (
                        <div className={cn('relative w-full', widget.classes?.card)}>
                            <div
                                className='relative w-full h-full'
                                style={{ minHeight: widget.iframe?.minHeight || height }}
                            >
                                {!errorStates[widget.id] && (
                                    <iframe
                                        data-widget-id={widget.id}
                                        src={getWidgetSrc(widget)}
                                        className={cn(
                                            'w-full h-full border-0 transition-opacity duration-300',
                                            loadingStates[widget.id] ? 'opacity-0' : 'opacity-100',
                                            widget.classes?.iframe,
                                        )}
                                        style={{
                                            minHeight: widget.iframe?.minHeight || height,
                                            background: 'transparent',
                                        }}
                                        onLoad={() => handleIframeLoad(widget.id)}
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
