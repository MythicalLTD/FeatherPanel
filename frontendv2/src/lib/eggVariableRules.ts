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

type Translate = (key: string, values?: Record<string, string>) => string;

export function splitEggRules(rules: string): string[] {
    const result: string[] = [];
    let offset = 0;
    while (offset < rules.length) {
        let end = rules.indexOf('|', offset);
        const regex = rules.slice(offset).match(/^(?:not_regex|regex):([^a-zA-Z0-9\s\\])/);
        if (regex) {
            let escaped = false;
            for (let position = offset + regex[0].length; position < rules.length; position++) {
                const character = rules[position];
                if (!escaped && character === regex[1]) {
                    end = rules.indexOf('|', position + 1);
                    break;
                }
                escaped = !escaped && character === '\\';
            }
        }
        result.push(rules.slice(offset, end < 0 ? undefined : end).trim());
        offset = end < 0 ? rules.length : end + 1;
    }
    return result.filter(Boolean);
}

// PCRE and advanced Laravel rules are validated by the backend.
export function validateEggVariable(value: string, rules: string, t: Translate): string {
    const parts = splitEggRules(rules);
    if (!value.trim()) return parts.includes('required') ? t('serverStartup.fieldRequired') : '';
    const integer = parts.includes('integer') || parts.includes('int');
    const numeric = integer || parts.includes('numeric');
    if (integer && !/^[+-]?\d+$/.test(value.trim())) return t('serverStartup.fieldMustBeNumeric');
    if (numeric && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) {
        return t('serverStartup.fieldMustBeNumeric');
    }
    const size = numeric ? Number(value) : Array.from(value).length;
    for (const rule of parts) {
        const limit = rule.match(/^(min|max):(-?\d+(?:\.\d+)?)$/);
        if (
            limit &&
            ((limit[1] === 'min' && size < Number(limit[2])) || (limit[1] === 'max' && size > Number(limit[2])))
        ) {
            const key =
                limit[1] === 'min'
                    ? numeric
                        ? 'minimumValue'
                        : 'minimumCharacters'
                    : numeric
                      ? 'maximumValue'
                      : 'maximumCharacters';
            return t(`serverStartup.${key}`, { value: limit[2] });
        }
        if (rule.startsWith('in:') && !rule.slice(3).split(',').includes(value)) {
            return t('serverStartup.valueDoesNotMatchFormat');
        }
    }
    return '';
}
