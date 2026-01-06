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

export type PluginWidgetSizePreset = 'full' | 'half' | 'third' | 'quarter';

export interface PluginWidgetSizeConfig {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
}

export interface PluginWidgetLayoutConfig {
    columns?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    rowSpan?: number;
    colSpan?: number;
}

export interface PluginWidgetHeaderConfig {
    show?: boolean;
    title?: string | null;
    description?: string | null;
    icon?: string | null;
}

export interface PluginWidgetFooterConfig {
    show?: boolean;
    text?: string | null;
}

export type PluginWidgetCardVariant = 'default' | 'outline' | 'ghost' | 'soft';
export type PluginWidgetCardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface PluginWidgetCardConfig {
    enabled?: boolean;
    variant?: PluginWidgetCardVariant;
    padding?: PluginWidgetCardPadding;
    header?: PluginWidgetHeaderConfig;
    bodyClass?: string;
    footer?: PluginWidgetFooterConfig;
}

export interface PluginWidgetBehaviorConfig {
    loadingMessage?: string;
    errorMessage?: string;
    retryLabel?: string;
    emptyStateMessage?: string;
}

export interface PluginWidgetIframeConfig {
    minHeight?: string;
    maxHeight?: string;
    sandbox?: string;
    allow?: string;
    loading?: 'eager' | 'lazy';
    referrerPolicy?: string;
    title?: string;
    ariaLabel?: string;
}

export interface PluginWidgetClassConfig {
    container?: string;
    card?: string;
    header?: string;
    content?: string;
    iframe?: string;
    footer?: string;
}

export interface PluginWidget {
    id: string;
    plugin: string;
    pluginName: string;
    component: string;
    enabled: boolean;
    priority: number;
    page: string;
    location: string;
    title?: string | null;
    description?: string | null;
    icon?: string | null;
    size?: PluginWidgetSizePreset | PluginWidgetSizeConfig;
    layout?: PluginWidgetLayoutConfig | null;
    card?: PluginWidgetCardConfig | null;
    behavior?: PluginWidgetBehaviorConfig | null;
    iframe?: PluginWidgetIframeConfig | null;
    classes?: PluginWidgetClassConfig | null;
    useRawRendering: boolean;
}

export interface WidgetsByLocation {
    [location: string]: PluginWidget[];
}

export interface WidgetsByPage {
    [page: string]: WidgetsByLocation;
}
