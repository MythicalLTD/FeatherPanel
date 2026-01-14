
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

// Helper for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const LOCALE_FILE = path.join(__dirname, '../public/locales/en.json');

// Regex to find t('key') or t("key") or t('key', ...)
const TRANSLATION_REGEX = /[^a-zA-Z]t\s*\(\s*['"]([^'"]+)['"]/g;

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    bold: '\x1b[1m'
};

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function(file) {
        if (fs.statSync(dirPath + '/' + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                arrayOfFiles.push(path.join(dirPath, '/', file));
            }
        }
    });

    return arrayOfFiles;
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((prev, curr) => {
        return prev ? prev[curr] : undefined;
    }, obj);
}

function scanTranslations() {
    console.log(`${colors.blue}${colors.bold}Scanning for missing translations...${colors.reset}\n`);

    // 1. Load Locale File
    let localeData;
    try {
        const rawData = fs.readFileSync(LOCALE_FILE);
        localeData = JSON.parse(rawData);
        console.log(`${colors.green}✓ Loaded locale file: ${LOCALE_FILE}${colors.reset}`);
    } catch (err) {
        console.error(`${colors.red}Error loading locale file: ${err.message}${colors.reset}`);
        process.exit(1);
    }

    // 2. Scan Source Files
    const files = getAllFiles(SRC_DIR);
    console.log(`${colors.green}✓ Found ${files.length} source files to scan.${colors.reset}\n`);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let totalKeysFound = 0;
    let missingKeys = new Set();
    let usageLocations = {}; // Map key -> [file:line]

    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');

        let match;
        
        lines.forEach((line, index) => {
             while ((match = TRANSLATION_REGEX.exec(line)) !== null) {
                const key = match[1];
                totalKeysFound++;

                // Verify existence
                const value = getNestedValue(localeData, key);

                if (value === undefined) {
                    missingKeys.add(key);
                    if (!usageLocations[key]) {
                        usageLocations[key] = [];
                    }
                    // Initial file path is absolute, make it relative
                    const relativePath = path.relative(path.join(__dirname, '..'), file);
                    usageLocations[key].push(`${relativePath}:${index + 1}`);
                }
            }
        });
    });

    // 3. Report Results
    if (missingKeys.size === 0) {
        console.log(`${colors.green}${colors.bold}Success! No missing translations found.${colors.reset}`);
    } else {
        console.log(`${colors.red}${colors.bold}Found ${missingKeys.size} missing translation keys:${colors.reset}\n`);
        
        Array.from(missingKeys).sort().forEach(key => {
            console.log(`${colors.yellow}⚠ Key: "${key}"${colors.reset}`);
            // console.log(`  ${colors.red}Missing in en.json${colors.reset}`);
            console.log(`  Used in:`);
            usageLocations[key].forEach(loc => {
                console.log(`    - ${loc}`);
            });
            console.log('');
        });

        console.log(`${colors.red}${colors.bold}Validation Failed.${colors.reset}`);
        process.exit(1);
    }
}

scanTranslations();
