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
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_DIR = path.join(__dirname, '..');
const REPO_ROOT = path.join(FRONTEND_DIR, '..');
const SOURCE_DOCS_DIR = path.join(FRONTEND_DIR, 'public/icanhasfeatherpanel');
const OUTPUT_DIR = process.env.DOCS_OUTPUT_DIR || path.join(REPO_ROOT, 'docs-site');
const OPENAPI_SOURCE =
    process.env.OPENAPI_JSON || path.join(REPO_ROOT, 'backend/openapi.json');
const BASE_PATH = (process.env.DOCS_BASE_PATH || '').replace(/\/$/, '');

function ensureOpenApiSpec() {
    if (fs.existsSync(OPENAPI_SOURCE)) {
        return;
    }

    const exportScript = path.join(REPO_ROOT, 'backend/scripts/export-openapi.php');
    if (!fs.existsSync(exportScript)) {
        throw new Error(`Missing OpenAPI export script: ${exportScript}`);
    }

    console.log(`OpenAPI spec not found at ${OPENAPI_SOURCE}; generating from backend controllers…`);
    execSync(`php "${exportScript}" "${OPENAPI_SOURCE}"`, {
        cwd: path.join(REPO_ROOT, 'backend'),
        stdio: 'inherit',
    });
}

function rewriteHtmlPaths(html) {
    return html
        .replaceAll('href="/icanhasfeatherpanel/', `href="${BASE_PATH}/icanhasfeatherpanel/`)
        .replaceAll("href='/icanhasfeatherpanel/", `href='${BASE_PATH}/icanhasfeatherpanel/`)
        .replaceAll('src="/icanhasfeatherpanel/', `src="${BASE_PATH}/icanhasfeatherpanel/`)
        .replaceAll("src='/icanhasfeatherpanel/", `src='${BASE_PATH}/icanhasfeatherpanel/`)
        .replaceAll('url(/icanhasfeatherpanel/', `url(${BASE_PATH}/icanhasfeatherpanel/`);
}

function copyRecursive(source, destination) {
    fs.mkdirSync(destination, { recursive: true });

    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
        const from = path.join(source, entry.name);
        const to = path.join(destination, entry.name);

        if (entry.isDirectory()) {
            copyRecursive(from, to);
            continue;
        }

        if (entry.name.endsWith('.html') && BASE_PATH) {
            const html = fs.readFileSync(from, 'utf8');
            fs.writeFileSync(to, rewriteHtmlPaths(html));
            continue;
        }

        fs.copyFileSync(from, to);
    }
}

function countByExt(dir, ext, acc = { count: 0 }) {
    if (!fs.existsSync(dir)) return acc.count;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) countByExt(full, ext, acc);
        else if (entry.name.endsWith(ext)) acc.count += 1;
    }
    return acc.count;
}

function writeRootIndex() {
    const target = './icanhasfeatherpanel/index.html';
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>FeatherPanel Developer Docs</title>
  <meta http-equiv="refresh" content="0; url=${target}" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="canonical" href="${target}" />
</head>
<body>
  <p>Redirecting to <a href="${target}">FeatherPanel developer documentation</a>…</p>
  <p>RAG: <a href="./icanhasfeatherpanel/catalog.json">catalog.json</a> · <a href="./icanhasfeatherpanel/llms.txt">llms.txt</a></p>
</body>
</html>
`;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html);
}

function main() {
    if (!fs.existsSync(SOURCE_DOCS_DIR)) {
        throw new Error(`Missing docs source directory: ${SOURCE_DOCS_DIR}`);
    }

    ensureOpenApiSpec();

    if (!fs.existsSync(OPENAPI_SOURCE)) {
        throw new Error(
            `Missing OpenAPI spec at ${OPENAPI_SOURCE}. Generate it first with: cd backend && COMPOSER_ALLOW_SUPERUSER=1 composer openapi`,
        );
    }

    // Make OpenAPI available under the docs tree before catalog export
    fs.mkdirSync(path.join(SOURCE_DOCS_DIR, 'api'), { recursive: true });
    fs.copyFileSync(OPENAPI_SOURCE, path.join(SOURCE_DOCS_DIR, 'api/openapi.json'));

    console.log('Exporting icanhasfeatherpanel docs from source…');
    execSync('pnpm export:docs', { cwd: FRONTEND_DIR, stdio: 'inherit' });

    if (fs.existsSync(OUTPUT_DIR)) {
        fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    console.log(`Assembling static site in ${OUTPUT_DIR}…`);
    copyRecursive(SOURCE_DOCS_DIR, path.join(OUTPUT_DIR, 'icanhasfeatherpanel'));

    fs.mkdirSync(path.join(OUTPUT_DIR, 'api'), { recursive: true });
    fs.copyFileSync(OPENAPI_SOURCE, path.join(OUTPUT_DIR, 'api/openapi.json'));

    // Convenience copies at site root for RAG crawlers
    const docsLlms = path.join(OUTPUT_DIR, 'icanhasfeatherpanel/llms.txt');
    const docsCatalog = path.join(OUTPUT_DIR, 'icanhasfeatherpanel/catalog.json');
    if (fs.existsSync(docsLlms)) fs.copyFileSync(docsLlms, path.join(OUTPUT_DIR, 'llms.txt'));
    if (fs.existsSync(docsCatalog)) fs.copyFileSync(docsCatalog, path.join(OUTPUT_DIR, 'catalog.json'));

    writeRootIndex();
    fs.writeFileSync(path.join(OUTPUT_DIR, '.nojekyll'), '');

    const mdCount = countByExt(path.join(OUTPUT_DIR, 'icanhasfeatherpanel'), '.md');
    const jsonCount = countByExt(path.join(OUTPUT_DIR, 'icanhasfeatherpanel'), '.json');

    console.log('✅ Public docs site ready.');
    console.log(`   - Entry: ${BASE_PATH || ''}/icanhasfeatherpanel/index.html`);
    console.log(`   - RAG: ${BASE_PATH || ''}/icanhasfeatherpanel/rag/`);
    console.log(`   - Markdown files: ${mdCount}`);
    console.log(`   - JSON files: ${jsonCount}`);
    console.log(`   - OpenAPI: ${BASE_PATH || ''}/api/openapi.json`);
    console.log(`   - OpenAPI (docs tree): ${BASE_PATH || ''}/icanhasfeatherpanel/api/openapi.json`);
    console.log(`   - llms.txt: ${BASE_PATH || ''}/llms.txt`);
    console.log(`   - catalog.json: ${BASE_PATH || ''}/catalog.json`);
}

main();
