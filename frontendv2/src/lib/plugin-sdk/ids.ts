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

/** Canonical Frontend Power SDK event / action IDs. */
export const FP_EVENTS = {
    HOST_READY: 'fp:host:ready',
    ROUTE_CHANGE: 'fp:route:change',
    PAGE_MOUNT: 'fp:page:mount',
    PAGE_UNMOUNT: 'fp:page:unmount',
    THEME_CHANGE: 'fp:theme:change',
    UI_PACK_CHANGE: 'fp:uipack:change',
    SESSION_CHANGE: 'fp:session:change',
    SERVER_CONTEXT: 'fp:server:context',
    SERVER_POWER_RESULT: 'fp:server:power:result',
    SERVER_CONSOLE_READY: 'fp:server:console:ready',
    FILES_SAVED: 'fp:files:saved',
    FILES_SELECTION: 'fp:files:selection',
    API_ERROR: 'fp:api:error',
} as const;

export const FP_ACTIONS = {
    SERVER_POWER: 'fp:server:power',
    FILES_SAVE: 'fp:files:save',
    FILES_UPLOAD: 'fp:files:upload',
    NAV_PUSH: 'fp:nav:push',
    FORM_SUBMIT: 'fp:form:submit',
    UI_CONFIRM: 'fp:ui:confirm',
    API_REQUEST: 'fp:api:request',
    SEARCH_QUERY: 'fp:search:query',
    SHORTCUT_INVOKE: 'fp:shortcut:invoke',
    DATA_ACTION: 'fp:data:action',
} as const;

export type FpEventId = (typeof FP_EVENTS)[keyof typeof FP_EVENTS] | string;
export type FpActionId = (typeof FP_ACTIONS)[keyof typeof FP_ACTIONS] | string;
