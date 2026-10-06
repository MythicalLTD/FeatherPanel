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

export function spellConfigText(value: unknown): string {
    if (value == null) return '';
    if (typeof value !== 'string') return JSON.stringify(value, null, 4);
    let decoded: unknown = value;
    for (let depth = 0; depth < 3 && typeof decoded === 'string'; depth++) {
        try {
            decoded = JSON.parse(decoded);
        } catch {
            return value;
        }
    }
    return typeof decoded === 'object' && decoded !== null ? JSON.stringify(decoded, null, 4) : value;
}

export function spellConfigPayload(form: {
    config_files: string;
    config_startup: string;
    config_logs: string;
    config_stop: string;
    file_denylist: string;
}) {
    const objectField = (text: string): string | null => {
        if (!text.trim()) return null;
        let value: unknown = JSON.parse(text);
        for (let depth = 0; depth < 3 && typeof value === 'string'; depth++) value = JSON.parse(value);
        if (value === null || typeof value !== 'object' || (Array.isArray(value) && value.length > 0)) {
            throw new Error('INVALID_SPELL_CONFIG');
        }
        return JSON.stringify(Array.isArray(value) ? {} : value);
    };
    const denylist: unknown = JSON.parse(form.file_denylist || '[]');
    if (!Array.isArray(denylist) || denylist.some((entry) => typeof entry !== 'string')) {
        throw new Error('INVALID_SPELL_CONFIG');
    }
    return {
        config_files: objectField(form.config_files),
        config_startup: objectField(form.config_startup),
        config_logs: objectField(form.config_logs),
        config_stop: form.config_stop === '' ? null : form.config_stop,
        file_denylist: JSON.stringify(denylist),
    };
}
