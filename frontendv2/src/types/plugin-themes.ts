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

export interface PluginThemeTokens {
    light: Record<string, string>;
    dark: Record<string, string>;
}

export interface PluginThemeDefaults {
    backgroundType?: string;
    fontFamily?: string;
    accentColor?: string;
}

export interface PluginThemePack {
    id: string;
    packId: string;
    plugin: string | null;
    pluginName: string;
    name: string;
    preview: string | null;
    tokens: PluginThemeTokens;
    accents: string[];
    defaults: PluginThemeDefaults;
    css: string | null;
    cssUrl: string | null;
}
