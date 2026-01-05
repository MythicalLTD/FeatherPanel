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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_DIR = path.join(__dirname, '../src/app');
const COMPONENTS_DIR = path.join(__dirname, '../src/components');
const OUTPUT_FILE = path.join(__dirname, '../docs/WIDGET_INJECTION_POINTS.md');

const SLUG_REGEX = /usePluginWidgets\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const IP_PROPS_REGEX = /injectionPoint\s*=\s*['"]([^'"]+)['"]/g;
const IP_GETWIDGETS_REGEX = /getWidgets\s*\(\s*['"][^'"]+['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g;

function getFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    const fileList = fs.readdirSync(dir);
    for (const file of fileList) {
        const name = path.join(dir, file);
        if (fs.statSync(name).isDirectory()) {
            getFiles(name, files);
        } else if (name.endsWith('.tsx')) {
            files.push(name);
        }
    }
    return files;
}

function extractDocs() {
    const files = [...getFiles(APP_DIR), ...getFiles(COMPONENTS_DIR)];
    const results = {};

    files.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');

        const slugs = [...content.matchAll(SLUG_REGEX)].map((m) => m[1]);

        if (slugs.length > 0) {
            const relativePath = path.relative(path.join(__dirname, '..'), file);

            slugs.forEach((slug) => {
                if (!results[slug]) {
                    results[slug] = {
                        files: [],
                        injectionPoints: new Set(),
                    };
                }

                if (!results[slug].files.includes(relativePath)) {
                    results[slug].files.push(relativePath);
                }

                // Pattern 1: injectionPoint="name"
                const ipMatches1 = [...content.matchAll(IP_PROPS_REGEX)].map((m) => m[1]);
                ipMatches1.forEach((ip) => results[slug].injectionPoints.add(ip));

                // Pattern 2: getWidgets(slug, "name")
                const ipMatches2 = [...content.matchAll(IP_GETWIDGETS_REGEX)].map((m) => m[1]);
                ipMatches2.forEach((ip) => results[slug].injectionPoints.add(ip));
            });
        }
    });

    return results;
}

function generateMarkdown(results) {
    let md = '# Widget Injection Points Documentation\n\n';
    md +=
        'This document lists all pages in the FeatherPanel frontend that support dynamic widgets, along with their associated slugs and available injection points.\n\n';

    const sortedSlugs = Object.keys(results).sort();

    sortedSlugs.forEach((slug) => {
        const data = results[slug];
        md += `## \`${slug}\`\n\n`;
        md += `**Slug ID:** \`${slug}\`\n\n`;
        md += `### Source Files\n`;
        data.files.forEach((f) => {
            md += `- [${path.basename(f)}](file://${path.resolve(__dirname, '..', f)})\n`;
        });
        md += `\n### Available Injection Points\n`;

        if (data.injectionPoints.size > 0) {
            Array.from(data.injectionPoints)
                .sort()
                .forEach((ip) => {
                    md += `- \`${ip}\`\n`;
                });
        } else {
            md += `*No injection points found in the source file(s).* (Check if they are rendered dynamically or in child components)\n`;
        }

        md += '\n---\n\n';
    });

    return md;
}

const docsDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
}

console.log('Extracting widget documentation...');
const documentation = extractDocs();
const markdown = generateMarkdown(documentation);

fs.writeFileSync(OUTPUT_FILE, markdown);
console.log(`Documentation generated at: ${OUTPUT_FILE}`);
