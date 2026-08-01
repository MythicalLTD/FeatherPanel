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
 * TypeScript 7 has no programmatic compiler API yet (lands in 7.1).
 * typescript-eslint still imports `typescript` for AST/program APIs.
 * Remap those requires to `@typescript/typescript6` for the ESLint process only.
 *
 * @see https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0
 */
const Module = require('node:module');
const path = require('node:path');

const ts6Root = path.dirname(require.resolve('@typescript/typescript6/package.json'));
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
    if (request === 'typescript' || request.startsWith('typescript/')) {
        const suffix = request === 'typescript' ? '' : request.slice('typescript'.length);
        const remapped = path.join(ts6Root, suffix || '.');
        return originalResolveFilename.call(this, remapped, parent, isMain, options);
    }

    return originalResolveFilename.call(this, request, parent, isMain, options);
};
