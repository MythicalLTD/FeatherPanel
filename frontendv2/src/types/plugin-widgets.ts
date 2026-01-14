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
