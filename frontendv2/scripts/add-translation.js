/*
This file is part of FeatherPanel.
Copyright (C) 2025 MythicalSystems Studios
*/

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALE_FILE = path.join(__dirname, '../public/locales/en.json');

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    bold: '\x1b[1m',
};

async function addTranslation() {
    // Get args: pnpm translations:add <key> <value>
    const args = process.argv.slice(2);
    const keyPath = args[0];
    const value = args.slice(1).join(' ');

    if (!keyPath || !value) {
        console.log(`${colors.red}Usage: pnpm translations:add <key.path> <translation value>${colors.reset}`);
        console.log(`${colors.yellow}Example: pnpm translations:add admin.vm.title "Virtual Machines"${colors.reset}`);
        process.exit(1);
    }

    let localeData = {};
    try {
        const rawData = fs.readFileSync(LOCALE_FILE, 'utf8');
        localeData = JSON.parse(rawData);
    } catch (err) {
        console.error(`${colors.red}Could not read locale file: ${err.message}${colors.reset}`);
        process.exit(1);
    }

    // Split the key path (e.g., "admin.vm.title")
    const keys = keyPath.split('.');
    let current = localeData;

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const isLast = i === keys.length - 1;

        if (isLast) {
            current[key] = value;
        } else {
            // If the path doesn't exist, create an empty object
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
    }

    try {
        // Save with 4-space indentation to keep it pretty
        fs.writeFileSync(LOCALE_FILE, JSON.stringify(localeData, null, 4) + '\n');
        console.log(`${colors.green}✓ Successfully added translation!${colors.reset}`);
        console.log(`${colors.blue}${colors.bold}${keyPath}${colors.reset} -> ${colors.yellow}"${value}"${colors.reset}`);
    } catch (err) {
        console.error(`${colors.red}Failed to save locale file: ${err.message}${colors.reset}`);
    }
}

addTranslation();