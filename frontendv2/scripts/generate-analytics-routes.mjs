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

import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../src/app/(app)/', import.meta.url));
async function pages(directory) {
    const result = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) result.push(...(await pages(target)));
        else if (entry.name === 'page.tsx') result.push(path.relative(root, directory));
    }
    return result;
}
const routes = [
    ...new Set(
        (await pages(root)).map(
            (directory) =>
                '/' +
                directory
                    .split(path.sep)
                    .filter((part) => part && !part.startsWith('('))
                    .join('/'),
        ),
    ),
];
routes.sort(
    (a, b) =>
        Number(a.includes('[...')) - Number(b.includes('[...')) ||
        (a.match(/\[/g)?.length || 0) - (b.match(/\[/g)?.length || 0) ||
        b.length - a.length ||
        a.localeCompare(b),
);
const header = (await readFile(new URL('../src/lib/analytics-cookie.ts', import.meta.url), 'utf8')).split(
    'export const',
)[0];
await writeFile(
    new URL('../src/lib/analytics-routes.ts', import.meta.url),
    header +
        '// Route templates keep account, server, ticket, and plugin identifiers out of analytics.\n// Generated from app pages by scripts/generate-analytics-routes.mjs.\nexport const ANALYTICS_ROUTES = [\n' +
        routes.map((route) => `    '${route}',\n`).join('') +
        '] as const;\n',
);
