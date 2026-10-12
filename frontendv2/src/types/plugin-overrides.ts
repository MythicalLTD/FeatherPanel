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

export interface PluginSlotReplace {
    slot: string;
    plugin: string;
    pluginName?: string;
    hide?: boolean;
    component?: string | null;
    componentUrl?: string | null;
    remote?: string | null;
    remoteUrl?: string | null;
}

export interface PluginSlotAction {
    id: string;
    slot: string;
    plugin: string;
    pluginName?: string;
    label: string;
    icon?: string | null;
    priority?: number;
    component?: string | null;
    componentUrl?: string | null;
    remote?: string | null;
    remoteUrl?: string | null;
    js?: string | null;
}

export interface PluginOverridesResponse {
    hide: Array<{ slot: string; plugin: string }>;
    replace: PluginSlotReplace[];
    actions: PluginSlotAction[];
}
