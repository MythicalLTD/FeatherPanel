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

/**
 * Finds `t('some.key', ...)` calls whose English string has `{placeholders}` that the call never
 * passes, which would show the raw `{name}` text in the UI. Calls that spread an object, pass a
 * variable or use a dynamic key are skipped because they cannot be checked statically.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, '../src');
const LOCALE_FILE = path.join(__dirname, '../public/locales/en.json');

const locale = JSON.parse(fs.readFileSync(LOCALE_FILE, 'utf8'));

function lookup(key) {
    let value = locale;
    for (const part of key.split('.')) {
        if (value && typeof value === 'object' && part in value) value = value[part];
        else return undefined;
    }
    return typeof value === 'string' ? value : undefined;
}

function placeholders(text) {
    const names = new Set();
    for (const m of text.matchAll(/\{\{\s*(\w+)\s*\}\}|\{(\w+)\}/g)) names.add(m[1] ?? m[2]);
    return names;
}

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full);
    }
    return out;
}

/** Returns the balanced `{...}` starting at `start`, or null. Skips over string literals. */
function readObject(src, start) {
    let depth = 0;
    let quote = null;
    for (let i = start; i < src.length; i++) {
        const ch = src[i];
        if (quote) {
            if (ch === '\\') i++;
            else if (ch === quote) quote = null;
            continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') quote = ch;
        else if (ch === '{') depth++;
        else if (ch === '}' && --depth === 0) return src.slice(start, i + 1);
    }
    return null;
}

/** Top-level property names of an object literal (shorthand and `name:` forms). */
function objectKeys(obj) {
    const body = obj.slice(1, -1);
    const keys = new Set();
    let depth = 0;
    let quote = null;
    let segment = '';
    const flush = () => {
        const s = segment.trim();
        segment = '';
        if (!s) return;
        const m = s.match(/^['"]?([\w$]+)['"]?\s*(:|$)/);
        if (m) keys.add(m[1]);
    };
    for (let i = 0; i < body.length; i++) {
        const ch = body[i];
        if (quote) {
            if (ch === '\\') {
                segment += ch + body[++i];
                continue;
            }
            if (ch === quote) quote = null;
            segment += ch;
            continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') quote = ch;
        if ('{[('.includes(ch)) depth++;
        if ('}])'.includes(ch)) depth--;
        if (ch === ',' && depth === 0) flush();
        else segment += ch;
    }
    flush();
    return keys;
}

/** Keys whose `{placeholders}` are meant to be shown literally (template syntax documented to admins). */
const LITERAL_KEYS = new Set([
    'admin.ldapProviders.form.userFilterPlaceholder',
    'admin.ldapProviders.form.userFilterHelp',
    'admin.mailHosts.helpBPitfalls',
]);

/** Placeholders substituted by hand: `t('key').replace('{name}', value)`. */
function chainedReplacements(src, from) {
    const names = new Set();
    const re = /^\s*\.replace\(\s*(['"])\{(\w+)\}\1\s*,/;
    let rest = src.slice(from);
    for (;;) {
        const m = rest.match(re);
        if (!m) break;
        names.add(m[2]);
        const close = readCall(rest, m[0].length);
        if (close < 0) break;
        rest = rest.slice(close + 1);
    }
    return names;
}

/** Index of the `)` closing a call whose arguments start at `start`, or -1. */
function readCall(src, start) {
    let depth = 1;
    let quote = null;
    for (let i = start; i < src.length; i++) {
        const ch = src[i];
        if (quote) {
            if (ch === '\\') i++;
            else if (ch === quote) quote = null;
            continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') quote = ch;
        else if (ch === '(') depth++;
        else if (ch === ')' && --depth === 0) return i;
    }
    return -1;
}

const problems = [];
const callRe = /\bt\(\s*(['"])([\w.-]+)\1\s*(\)|,)/g;

for (const file of walk(SRC_DIR)) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(callRe)) {
        const text = lookup(m[2]);
        if (!text) continue;
        if (LITERAL_KEYS.has(m[2])) continue;
        // ALL_CAPS names are server variables like {SERVER_MEMORY} shown to admins as-is.
        const needed = new Set([...placeholders(text)].filter((n) => n !== n.toUpperCase()));
        if (needed.size === 0) continue;

        let passed = new Set();
        if (m[3] === ',') {
            let i = m.index + m[0].length;
            while (/\s/.test(src[i])) i++;
            if (src[i] !== '{') continue; // variable / expression: cannot check
            const obj = readObject(src, i);
            if (!obj || obj.includes('...')) continue;
            passed = objectKeys(obj);
        } else {
            passed = chainedReplacements(src, m.index + m[0].length);
        }
        const missing = [...needed].filter((n) => !passed.has(n));
        if (missing.length) {
            const line = src.slice(0, m.index).split('\n').length;
            problems.push(`${path.relative(path.join(__dirname, '..'), file)}:${line}  t('${m[2]}') missing ${missing.map((n) => `{${n}}`).join(', ')}`);
        }
    }
}

if (problems.length) {
    console.error(`\x1b[31m\x1b[1mFound ${problems.length} translation call(s) missing interpolation values:\x1b[0m`);
    for (const p of problems) console.error('  ' + p);
    process.exit(1);
}
console.log('\x1b[32m\x1b[1mSuccess! Every translation placeholder gets a value.\x1b[0m');
