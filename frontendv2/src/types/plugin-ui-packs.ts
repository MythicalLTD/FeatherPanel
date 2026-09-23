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

import type { PluginSlotAction, PluginSlotReplace } from '@/types/plugin-overrides';

export interface PluginUiPackPage {
    match: string;
    hide: boolean;
    replace: PluginSlotReplace | null;
}

export interface PluginUiPack {
    id: string;
    packId: string;
    plugin: string;
    pluginName: string;
    name: string;
    theme: string | null;
    shell: {
        replace: Record<string, PluginSlotReplace>;
    };
    pages: PluginUiPackPage[];
    hide: string[];
    actions: PluginSlotAction[];
}
