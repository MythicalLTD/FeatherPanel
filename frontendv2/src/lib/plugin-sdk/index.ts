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

export { FEATHERPANEL_HOST_VERSION, createFeatherPanelHostApi } from '@/lib/plugin-sdk/host-api';
export { pluginEventBus } from '@/lib/plugin-sdk/event-bus';
export { pluginActionHooks } from '@/lib/plugin-sdk/action-hooks';
export { FP_EVENTS, FP_ACTIONS } from '@/lib/plugin-sdk/ids';
export {
    pluginModalRegistry,
    pluginSearchRegistry,
    pluginShortcutRegistry,
    normalizeCombo,
    eventToCombo,
} from '@/lib/plugin-sdk/registries';
export { installPostMessageBusBridge } from '@/lib/plugin-sdk/postmessage-bridge';
export { bindFpActionClicks } from '@/lib/plugin-sdk/data-fp-action';
export type { FeatherPanelHostApi } from '@/lib/plugin-sdk/types';
