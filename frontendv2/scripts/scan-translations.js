/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
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
