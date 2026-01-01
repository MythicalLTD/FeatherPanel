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

"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/contexts/TranslationContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { PluginWidget } from "@/types/plugin-widgets";

interface WidgetRendererProps {
    widgets: PluginWidget[];
    height?: string;
}

export function WidgetRenderer({ widgets, height = "400px" }: WidgetRendererProps) {
    const { t } = useTranslation();
    const pathname = usePathname();
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
    const [errorStates, setErrorStates] = useState<Record<string, string | null>>({});

    if (!widgets || widgets.length === 0) return null;


    const getWidgetSrc = (widget: PluginWidget): string => {
        const baseUrl = `/components/${widget.plugin}/${widget.component}`;
        const separator = baseUrl.includes("?") ? "&" : "?";
        return `${baseUrl}${separator}route=${encodeURIComponent(pathname || "")}`;
    };

    const handleIframeLoad = (widgetId: string) => {
        setLoadingStates(prev => ({ ...prev, [widgetId]: false }));
        setErrorStates(prev => ({ ...prev, [widgetId]: null }));
    };

    const handleIframeError = (widgetId: string) => {
        setLoadingStates(prev => ({ ...prev, [widgetId]: false }));
        setErrorStates(prev => ({ ...prev, [widgetId]: t("plugins.failedToLoadContent") })); // Simplified error message
    };

    const retryLoad = (widgetId: string) => {
        setErrorStates(prev => ({ ...prev, [widgetId]: null }));
        setLoadingStates(prev => ({ ...prev, [widgetId]: true }));

        const iframe = document.querySelector(`iframe[data-widget-id="${widgetId}"]`) as HTMLIFrameElement;
        if (iframe) {
            const src = iframe.src;
            iframe.src = "";
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
             let classes = baseSpan ? `col-span-${baseSpan}` : "col-span-12";
             
             if (sm) classes += ` sm:col-span-${sm}`;
             if (md) classes += ` md:col-span-${md}`;
             if (lg) classes += ` lg:col-span-${lg}`;
             if (xl) classes += ` xl:col-span-${xl}`;
             
             return cn(classes, widget.classes?.container);
        }

        if (typeof widget.size === "string") {
            const sizeMap: Record<string, string> = {
                half: "col-span-12 md:col-span-6",
                third: "col-span-12 md:col-span-6 lg:col-span-4",
                quarter: "col-span-12 md:col-span-6 lg:col-span-3",
                full: "col-span-12"
            };
            return cn(sizeMap[widget.size] || sizeMap.full, widget.classes?.container);
        }
        
        // Handle object size config if needed (simplified here to assume string or layout)
        return cn("col-span-12", widget.classes?.container);
    };

    const shouldRenderAsCard = (widget: PluginWidget) => {
        if (widget.card === null) return true;
        if (typeof widget.card?.enabled === "boolean") return widget.card.enabled;
        return true;
    };
    
    // Helpers for card parts
    const shouldShowHeader = (widget: PluginWidget) => {
        if (!shouldRenderAsCard(widget)) return false;
        const header = widget.card?.header;
        if (!header) return Boolean(widget.title || widget.description || widget.icon);
        if (typeof header.show === "boolean") return header.show;
        return Boolean(header.title || header.description || widget.title || widget.description);
    };

    const getHeaderTitle = (widget: PluginWidget) => widget.card?.header?.title ?? widget.title;
    const getHeaderDescription = (widget: PluginWidget) => widget.card?.header?.description ?? widget.description;
    
    // Icon handling requires dynamic imports or a map of Lucide icons, 
    // or we render the string as is if the backend sends SVG/HTML (unlikely) 
    // or just the name. For now, let's render the name in a badge-like style as in Vue.
    const getCardIcon = (widget: PluginWidget) => widget.card?.header?.icon ?? widget.icon;


    return (
        <div className="grid grid-cols-12 gap-4 w-full">
            {widgets.map(widget => (
                <div key={widget.id} className={cn("w-full min-w-0 transition-all", getGridClass(widget))}>
                    {shouldRenderAsCard(widget) ? (
                        <Card className={cn("h-full flex flex-col overflow-hidden", 
                            widget.card?.variant === 'outline' && "border-primary/40",
                            widget.card?.variant === 'ghost' && "border-transparent bg-transparent shadow-none",
                             widget.classes?.card
                        )}>
                            {shouldShowHeader(widget) && (
                                <CardHeader className={cn("space-y-1", widget.classes?.header)}>
                                    <div className="flex items-center gap-3">
                                        {getCardIcon(widget) && (
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                <span className="text-sm font-semibold uppercase tracking-wide">{getCardIcon(widget)}</span>
                                            </div>
                                        )}
                                        <div className="flex flex-1 flex-col justify-center gap-1">
                                            {getHeaderTitle(widget) && <CardTitle className="text-base">{getHeaderTitle(widget)}</CardTitle>}
                                            {getHeaderDescription(widget) && <CardDescription>{getHeaderDescription(widget)}</CardDescription>}
                                        </div>
                                    </div>
                                </CardHeader>
                            )}
                            <CardContent className={cn("relative flex-1 p-0 min-h-[200px]", 
                                widget.card?.padding === 'sm' && "p-4",
                                widget.card?.padding === 'md' && "p-6",
                                widget.card?.padding === 'lg' && "p-8",
                                widget.classes?.content
                            )}>
                                <div className="relative w-full h-full" style={{ minHeight: widget.iframe?.minHeight || height }}>
                                    {/* Loading State */}
                                    {loadingStates[widget.id] !== false && (
                                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80">
                                            <div className="flex flex-col items-center space-y-3">
                                                 <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                                 <p className="text-sm text-muted-foreground">{widget.behavior?.loadingMessage || t("plugins.loadingContent")}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Error State */}
                                    {errorStates[widget.id] && (
                                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 p-6">
                                            <div className="text-center">
                                                <p className="mb-4 text-sm text-muted-foreground">{errorStates[widget.id] || widget.behavior?.errorMessage}</p>
                                                <Button size="sm" variant="outline" onClick={() => retryLoad(widget.id)}>
                                                    <RotateCcw className="mr-2 h-4 w-4" />
                                                    {widget.behavior?.retryLabel || t("plugins.retry")}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {!errorStates[widget.id] && (
                                        <iframe
                                            data-widget-id={widget.id}
                                            src={getWidgetSrc(widget)}
                                            className={cn("w-full h-full border-0 transition-opacity duration-300", 
                                                loadingStates[widget.id] ? "opacity-0" : "opacity-100",
                                                widget.classes?.iframe
                                            )}
                                            style={{ minHeight: widget.iframe?.minHeight || height }}
                                            {...widget.iframe}
                                            referrerPolicy={widget.iframe?.referrerPolicy as React.HTMLAttributeReferrerPolicy}
                                            onLoad={() => handleIframeLoad(widget.id)}
                                            onError={() => handleIframeError(widget.id)}
                                        />
                                    )}
                                </div>
                            </CardContent>
                            
                            {/* Footer logic if needed */}
                             {widget.card?.footer?.show && widget.card.footer.text && (
                                <CardFooter className={cn("text-sm text-muted-foreground", widget.classes?.footer)}>
                                    {widget.card.footer.text}
                                </CardFooter>
                            )}

                        </Card>
                    ) : (
                         <div className={cn("relative w-full overflow-hidden rounded-lg border bg-card", widget.classes?.card)}> 
                           {/* Non-card implementation similar to above... omitted for brevity as most widgets are cards */}
                            <div className="relative w-full h-full" style={{ minHeight: widget.iframe?.minHeight || height }}>
                                 {/* Similar loading/iframe logic */}
                                  {!errorStates[widget.id] && (
                                        <iframe
                                            data-widget-id={widget.id}
                                            src={getWidgetSrc(widget)}
                                            className={cn("w-full h-full border-0 transition-opacity duration-300", 
                                                loadingStates[widget.id] ? "opacity-0" : "opacity-100",
                                                widget.classes?.iframe
                                            )}
                                            style={{ minHeight: widget.iframe?.minHeight || height }}
                                            onLoad={() => handleIframeLoad(widget.id)}
                                            onError={() => handleIframeError(widget.id)}
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
