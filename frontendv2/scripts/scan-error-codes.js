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
 * Checks that backend error codes with one fixed English message have a
 * translation in `errors.codes` (en.json), so `getApiErrorMessage` can show
 * them in the user's language.
 *
 * Codes the backend sends with a dynamic message (`$e->getMessage()`,
 * daemon errors, concatenation) or with several different messages are
 * skipped: a translation would win over the API message and hide the detail.
 *
 * Usage: node scripts/scan-error-codes.js
 * Exit 1 when a fixed-message code has no translation.
 * Skips (exit 0) when ../backend is not available, e.g. frontend-only builds.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.join(__dirname, '../../backend/app');
const LOCALE_FILE = path.join(__dirname, '../public/locales/en.json');

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    bold: '\x1b[1m',
};

function collectPhp(dir, out = []) {
    for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        if (fs.statSync(full).isDirectory()) collectPhp(full, out);
        else if (name.endsWith('.php')) out.push(full);
    }
    return out;
}

/** Split the arguments of `ApiResponse::error(` starting at `start` (index after the paren). */
function readArgs(src, start) {
    const args = [];
    let depth = 0;
    let quote = null;
    let current = '';
    for (let i = start; i < src.length; i++) {
        const ch = src[i];
        if (quote) {
            current += ch;
            if (ch === '\\') {
                current += src[++i] ?? '';
            } else if (ch === quote) {
                quote = null;
            }
            continue;
        }
        if (ch === "'" || ch === '"') {
            quote = ch;
            current += ch;
        } else if (ch === '(' || ch === '[' || ch === '{') {
            depth++;
            current += ch;
        } else if (ch === ')' || ch === ']' || ch === '}') {
            if (depth === 0) {
                args.push(current.trim());
                return args;
            }
            depth--;
            current += ch;
        } else if (ch === ',' && depth === 0) {
            args.push(current.trim());
            current = '';
            if (args.length >= 2) return args;
        } else {
            current += ch;
        }
    }
    return args;
}

const STATIC_STRING = /^(['"])((?:(?!\1)[^\\]|\\.)*)\1$/;
const CODE = /^(['"])([A-Z0-9_]+)\1$/;

function main() {
    console.log(`${colors.blue}${colors.bold}Checking backend error codes against errors.codes…${colors.reset}\n`);
    if (!fs.existsSync(BACKEND_DIR)) {
        console.log(`${colors.yellow}Backend sources not found at ${BACKEND_DIR}; skipping.${colors.reset}`);
        process.exit(0);
    }

    const en = JSON.parse(fs.readFileSync(LOCALE_FILE, 'utf8'));
    const translated = new Set(Object.keys(en?.errors?.codes ?? {}));

    /** code -> { messages: Set, dynamic: boolean, files: Set } */
    const codes = new Map();
    for (const file of collectPhp(BACKEND_DIR)) {
        const src = fs.readFileSync(file, 'utf8');
        const marker = /ApiResponse::error\(/g;
        let m;
        while ((m = marker.exec(src)) !== null) {
            const [message, code] = readArgs(src, m.index + m[0].length);
            const codeMatch = code && CODE.exec(code);
            if (!codeMatch) continue;
            const entry = codes.get(codeMatch[2]) ?? { messages: new Set(), dynamic: false, files: new Set() };
            const msgMatch = message && STATIC_STRING.exec(message);
            if (msgMatch && !(msgMatch[1] === '"' && /\$/.test(msgMatch[2]))) entry.messages.add(msgMatch[2]);
            else entry.dynamic = true;
            entry.files.add(path.relative(path.join(BACKEND_DIR, '..'), file));
            codes.set(codeMatch[2], entry);
        }
    }

    const missing = [...codes.entries()]
        .filter(([code, e]) => !translated.has(code) && !e.dynamic && e.messages.size === 1)
        .sort(([a], [b]) => a.localeCompare(b));

    console.log(`${colors.green}✓ ${codes.size} error codes found, ${translated.size} translations.${colors.reset}\n`);
    if (missing.length === 0) {
        console.log(
            `${colors.green}${colors.bold}Success! Every fixed-message error code has a translation.${colors.reset}`,
        );
        process.exit(0);
    }
    console.log(
        `${colors.red}${colors.bold}${missing.length} error code(s) without a translation in errors.codes:${colors.reset}\n`,
    );
    for (const [code, e] of missing) {
        console.log(`${colors.yellow}⚠ ${code}${colors.reset}  "${[...e.messages][0]}"  (${[...e.files][0]})`);
    }
    console.log(`\n${colors.red}${colors.bold}Validation Failed.${colors.reset}`);
    process.exit(1);
}

main();
