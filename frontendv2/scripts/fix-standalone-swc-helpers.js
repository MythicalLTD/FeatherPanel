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

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const STANDALONE = path.join(ROOT, '.next', 'standalone');

function findHelpersDirs(base) {
    const pnpm = path.join(base, 'node_modules', '.pnpm');
    if (!fs.existsSync(pnpm)) {
        return [];
    }

    return fs
        .readdirSync(pnpm)
        .filter((name) => name.startsWith('@swc+helpers@'))
        .map((name) => path.join(pnpm, name, 'node_modules', '@swc', 'helpers'))
        .filter((dir) => fs.existsSync(path.join(dir, 'package.json')));
}

function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const from = path.join(src, entry.name);
        const to = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(from, to);
        } else {
            fs.copyFileSync(from, to);
        }
    }
}

function ensureHelpersAt(dest, source) {
    copyDir(source, dest);
    // Next 16 may require either CJS (`_/`) or ESM (`esm/`) subpaths at runtime.
    for (const sub of ['_', 'esm']) {
        const from = path.join(source, sub);
        if (fs.existsSync(from)) {
            copyDir(from, path.join(dest, sub));
        }
    }
}

if (!fs.existsSync(STANDALONE)) {
    process.exit(0);
}

const sources = findHelpersDirs(ROOT);
if (sources.length === 0) {
    console.warn('fix-standalone-swc-helpers: @swc/helpers not found in node_modules');
    process.exit(0);
}

sources.sort();
const source = sources[sources.length - 1];

const dests = new Set(findHelpersDirs(STANDALONE));
if (dests.size === 0) {
    const storeName = path.basename(path.dirname(path.dirname(path.dirname(source))));
    dests.add(path.join(STANDALONE, 'node_modules', '.pnpm', storeName, 'node_modules', '@swc', 'helpers'));
}

// Hoisted path used when Next resolves `@swc/helpers/_/...` from /app/node_modules
dests.add(path.join(STANDALONE, 'node_modules', '@swc', 'helpers'));

for (const dest of dests) {
    ensureHelpersAt(dest, source);
}

console.log(
    `fix-standalone-swc-helpers: copied full @swc/helpers (incl. _/ and esm/) into ${dests.size} standalone location(s)`,
);
