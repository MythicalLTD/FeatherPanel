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

/** Preset filter templates; `presetId` maps to i18n keys under `servers.console.terminal.presets.*` */

export type ConsolePresetMenuGroup = 'redact' | 'highlight';

export interface ConsolePresetTemplate {
    presetId: string;
    menuGroup: ConsolePresetMenuGroup;
    pattern: string;
    flags?: string;
    type: 'replace' | 'hide' | 'color';
    replacement?: string;
    color?: 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'gray';
}

export const CONSOLE_PRESET_TEMPLATES: ConsolePresetTemplate[] = [
    {
        presetId: 'hide_ipv4',
        menuGroup: 'redact',
        type: 'replace',
        pattern: String.raw`\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?::\d{1,5})?\b`,
        flags: 'g',
        replacement: '[IP]',
    },
    {
        presetId: 'hide_email',
        menuGroup: 'redact',
        type: 'replace',
        pattern: String.raw`\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b`,
        flags: 'gi',
        replacement: '[email]',
    },
    {
        presetId: 'hide_steam_id',
        menuGroup: 'redact',
        type: 'replace',
        pattern: String.raw`\b(?:steam:\d{17}|7656119\d{10})\b`,
        flags: 'gi',
        replacement: '[id]',
    },
    {
        presetId: 'redact_jwt',
        menuGroup: 'redact',
        type: 'replace',
        pattern: String.raw`eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+`,
        flags: 'g',
        replacement: '[JWT]',
    },
    {
        presetId: 'hide_bearer',
        menuGroup: 'redact',
        type: 'replace',
        pattern: String.raw`Bearer\s+[A-Za-z0-9._~+/=-]+`,
        flags: 'gi',
        replacement: 'Bearer [redacted]',
    },
    {
        presetId: 'hide_discord_webhook',
        menuGroup: 'redact',
        type: 'replace',
        pattern: String.raw`https://discord(?:app)?\.com/api/webhooks/\d+/[A-Za-z0-9_-]+`,
        flags: 'gi',
        replacement: '[webhook]',
    },
    {
        presetId: 'highlight_errors',
        menuGroup: 'highlight',
        type: 'color',
        pattern: String.raw`\b(ERROR|FATAL|CRITICAL|Exception|Traceback|panic:|fatal error)\b`,
        flags: 'gi',
        color: 'red',
    },
    {
        presetId: 'highlight_warnings',
        menuGroup: 'highlight',
        type: 'color',
        pattern: String.raw`\b(WARN|WARNING|deprecated)\b`,
        flags: 'gi',
        color: 'yellow',
    },
    {
        presetId: 'dim_debug',
        menuGroup: 'highlight',
        type: 'color',
        pattern: String.raw`\b(DEBUG|TRACE)\b`,
        flags: 'gi',
        color: 'gray',
    },
];
