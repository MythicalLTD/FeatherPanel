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
 * Single entrypoint: build the full public/icanhasfeatherpanel tree.
 *
 * 1. Wipe + seed hand-authored sources from icanhas/
 * 2. Generate widgets, pages, permissions, events, API, CLI, settings, installer
 * 3. Generate plugins index HTML + llms.txt from Markdown
 * 4. Attach openapi.json when available
 * 5. Build RAG catalog / llms.txt / view.html
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import {
    DOCS_BASE,
    escapeHtml,
    ensureDir,
    hero,
    renderDocsPage,
    writeJson,
    writeMarkdown,
    writeText,
} from './lib/docs-site.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FRONTEND_DIR = path.join(__dirname, '..');
const REPO_ROOT = path.join(FRONTEND_DIR, '..');
const SOURCE_DIR = path.join(FRONTEND_DIR, 'icanhas');
const PUBLIC_DIR = path.join(FRONTEND_DIR, 'public/icanhasfeatherpanel');
const OPENAPI_SOURCE = process.env.OPENAPI_JSON || path.join(REPO_ROOT, 'backend/openapi.json');

const GENERATORS = [
    { id: 'widgets', script: 'export-widget-docs.js', required: true },
    { id: 'pages', script: 'export-pages-docs.mjs', required: true },
    { id: 'permissions', script: 'export-permissions-docs.js', required: true },
    { id: 'events', script: 'export-events-docs.js', required: true },
    { id: 'api', script: 'export-api-docs.js', required: true },
    { id: 'cli', script: 'export-cli-docs.mjs', required: true },
    { id: 'settings', script: 'export-settings-docs.mjs', required: true },
    { id: 'installer', script: 'export-installer-docs.mjs', required: true },
];

/** Stale hand-authored HTML/indexes — scripts regenerate these. */
const SKIP_SEED_NAMES = new Set(['index.html', 'view.html', 'llms.txt', 'catalog.json']);

function copyRecursive(source, destination, { skipNames = new Set() } = {}) {
    ensureDir(destination);
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
        if (skipNames.has(entry.name)) continue;
        const from = path.join(source, entry.name);
        const to = path.join(destination, entry.name);
        if (entry.isDirectory()) copyRecursive(from, to, { skipNames });
        else fs.copyFileSync(from, to);
    }
}

function seedPublicTree() {
    if (!fs.existsSync(SOURCE_DIR)) {
        throw new Error(`Missing docs source: ${SOURCE_DIR}`);
    }
    if (fs.existsSync(PUBLIC_DIR)) {
        fs.rmSync(PUBLIC_DIR, { recursive: true, force: true });
    }
    // Skip regenerable HTML/indexes under plugins/, auth/, and root
    copyRecursive(SOURCE_DIR, PUBLIC_DIR, { skipNames: SKIP_SEED_NAMES });
    // Also strip regenerable files if nested copies slipped through
    for (const rel of [
        'plugins/index.html',
        'plugins/view.html',
        'plugins/llms.txt',
        'auth/index.html',
        'auth/llms.txt',
    ]) {
        const p = path.join(PUBLIC_DIR, rel);
        if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    console.log('✅ Seeded static sources (markdown, assets, schemas, static HTML)');
}

function runGenerator({ id, script, required }) {
    const full = path.join(__dirname, script);
    if (!fs.existsSync(full)) {
        if (required) throw new Error(`Missing generator script: ${script}`);
        console.warn(`⚠️  Skipping ${id}: script missing`);
        return;
    }
    console.log(`\n── Generating ${id}…`);
    try {
        execSync(`node "${full}"`, { cwd: FRONTEND_DIR, stdio: 'inherit' });
    } catch (err) {
        if (required) throw err;
        console.warn(`⚠️  ${id} failed (continuing): ${err.message || err}`);
    }
}

function firstMarkdownHeading(md) {
    const m = md.match(/^#\s+(.+)$/m);
    return m ? m[1].trim() : null;
}

function markdownBlurb(content) {
    return (
        content
            .split('\n')
            .map((l) => l.trim())
            .find(
                (l) =>
                    l &&
                    !l.startsWith('#') &&
                    !l.startsWith('>') &&
                    !l.startsWith('|') &&
                    !l.startsWith('-') &&
                    !l.startsWith('```'),
            ) || ''
    );
}

function buildMarkdownSection({
    dirName,
    title,
    subtitle,
    description,
    active,
    order = [],
    startIds = new Set(),
    indexType,
    formats = [],
    extraSectionsHtml = '',
}) {
    const sectionDir = path.join(PUBLIC_DIR, dirName);
    ensureDir(sectionDir);

    const mdFiles = fs
        .readdirSync(sectionDir)
        .filter((f) => f.endsWith('.md'))
        .sort((a, b) => {
            const ai = order.indexOf(a);
            const bi = order.indexOf(b);
            if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
            return a.localeCompare(b);
        });

    const docs = mdFiles.map((file) => {
        const content = fs.readFileSync(path.join(sectionDir, file), 'utf8');
        const heading = firstMarkdownHeading(content) || file.replace(/\.md$/, '');
        return {
            file,
            id: file.replace(/\.md$/, ''),
            title: heading.replace(/^#+\s*/, ''),
            blurb: markdownBlurb(content).slice(0, 140),
            path: `${DOCS_BASE}/${dirName}/${file}`,
        };
    });

    const start = docs.filter((d) => startIds.has(d.id));
    const reference = docs.filter((d) => !startIds.has(d.id) && d.id !== 'README');

    const card = (d) => `<a class="fp-card-link" href="${DOCS_BASE}/view.html?doc=${dirName}/${escapeHtml(d.file)}">
  <div class="fp-card">
    <h2>${escapeHtml(d.title)}</h2>
    <p>${escapeHtml(d.blurb || d.file)}</p>
    <div class="fp-formats"><a href="${DOCS_BASE}/${dirName}/${escapeHtml(d.file)}">Markdown</a></div>
  </div>
</a>`;

    const startSection =
        start.length > 0
            ? `<section class="fp-section">
  <h2>Start</h2>
  <div class="fp-grid">${start.map(card).join('\n')}</div>
</section>`
            : '';

    const body = `${hero({
        title,
        subtitle,
        badges: [`${docs.length} guides`],
        formats,
    })}
${startSection}
<section class="fp-section">
  <h2>${start.length ? 'Reference' : 'Guides'}</h2>
  <div class="fp-grid">${(start.length ? reference : docs.filter((d) => d.id !== 'README')).map(card).join('\n')}</div>
</section>
${extraSectionsHtml}`;

    writeText(
        path.join(sectionDir, 'index.html'),
        renderDocsPage({
            title,
            description,
            active,
            body,
        }),
    );

    writeJson(path.join(sectionDir, 'index.json'), {
        type: indexType,
        total: docs.length,
        documents: docs,
    });

    const llms = [
        `# FeatherPanel ${title}`,
        '',
        '> Prefer Markdown for RAG.',
        '',
        ...docs.map((d) => `- [${d.title}](${d.path})`),
        '',
    ].join('\n');
    writeMarkdown(path.join(sectionDir, 'llms.txt'), llms);

    console.log(`✅ ${title} index built (${docs.length} Markdown guides → HTML + JSON + llms.txt)`);
}

function buildPluginsSection() {
    buildMarkdownSection({
        dirName: 'plugins',
        title: 'Plugins',
        subtitle: 'How to build FeatherPanel addons. Raw .md files are the best source for indexing.',
        description: 'FeatherPanel plugin developer docs for humans and LLMs.',
        active: 'plugins',
        order: [
            'ai-guide.md',
            'getting-started.md',
            'examples.md',
            'recipes.md',
            'README.md',
            'themes.md',
            'ui-packs.md',
            'power-sdk.md',
        ],
        startIds: new Set(['ai-guide', 'getting-started', 'examples', 'recipes']),
        indexType: 'featherpanel.plugins.index',
        formats: [
            { href: `${DOCS_BASE}/plugins/ai-guide.md`, label: 'ai-guide.md' },
            { href: `${DOCS_BASE}/plugins/themes.md`, label: 'themes.md' },
            { href: `${DOCS_BASE}/plugins/power-sdk.md`, label: 'power-sdk.md' },
            { href: `${DOCS_BASE}/plugins/llms.txt`, label: 'llms.txt' },
            { href: `${DOCS_BASE}/plugins/index.json`, label: 'index.json' },
        ],
        extraSectionsHtml: `<section class="fp-section">
  <h2>Appearance portals</h2>
  <div class="fp-grid">
    <a class="fp-card-link" href="${DOCS_BASE}/plugin-themes.html"><div class="fp-card"><h2>Themes &amp; UI packs</h2><p>Human HTML overview — how to make theme.json / ui.json packs.</p></div></a>
    <a class="fp-card-link" href="${DOCS_BASE}/plugin-power.html"><div class="fp-card"><h2>Power SDK</h2><p>window.FeatherPanel events, actions, modals, search, shortcuts.</p></div></a>
  </div>
</section>`,
    });
}

function buildAuthSection() {
    if (!fs.existsSync(path.join(PUBLIC_DIR, 'auth'))) {
        console.warn('⚠️  No auth/ docs seeded — skipping auth index');
        return;
    }
    buildMarkdownSection({
        dirName: 'auth',
        title: 'Auth & identity',
        subtitle: 'OIDC login, passkeys, and API-key OAuth2 (callback vs device).',
        description: 'FeatherPanel authentication and API consent docs for operators and LLMs.',
        active: 'auth',
        order: ['README.md', 'oidc-sso.md', 'passkeys.md'],
        startIds: new Set(['oidc-sso', 'passkeys']),
        indexType: 'featherpanel.auth.index',
        formats: [
            { href: `${DOCS_BASE}/auth/README.md`, label: 'README.md' },
            { href: `${DOCS_BASE}/api/oauth2.md`, label: 'oauth2.md' },
            { href: `${DOCS_BASE}/api/oauth2-playground.html`, label: 'OAuth2 playground' },
            { href: `${DOCS_BASE}/auth/llms.txt`, label: 'llms.txt' },
        ],
        extraSectionsHtml: `<section class="fp-section">
  <h2>API key consent (not login)</h2>
  <div class="fp-grid">
    <a class="fp-card-link" href="${DOCS_BASE}/view.html?doc=api/oauth2.md"><div class="fp-card"><h2>OAuth2 guide</h2><p>Callback mode=user|server and device flow for fp_ API keys.</p></div></a>
    <a class="fp-card-link" href="${DOCS_BASE}/api/oauth2-playground.html"><div class="fp-card"><h2>Playground</h2><p>Build callback URLs and try the device poll flow against a live panel.</p></div></a>
  </div>
</section>`,
    });
}

function attachOpenApi() {
    if (!fs.existsSync(OPENAPI_SOURCE)) {
        console.warn(
            `⚠️  openapi.json not found at ${OPENAPI_SOURCE} — API Redoc will lack the spec until Pages/CI generates it.`,
        );
        return false;
    }
    ensureDir(path.join(PUBLIC_DIR, 'api'));
    fs.copyFileSync(OPENAPI_SOURCE, path.join(PUBLIC_DIR, 'api/openapi.json'));
    console.log('✅ Attached api/openapi.json');
    return true;
}

function runCatalog() {
    console.log('\n── Generating RAG catalog…');
    execSync(`node "${path.join(__dirname, 'export-catalog-docs.mjs')}"`, {
        cwd: FRONTEND_DIR,
        stdio: 'inherit',
    });
}

function assertOutputs() {
    const required = [
        'index.html',
        'widgets/index.json',
        'pages/all.json',
        'permissions/all.json',
        'events/all.json',
        'api/index.html',
        'cli/all.json',
        'settings/all.json',
        'installer/all.json',
        'plugins/index.html',
        'plugins/ai-guide.md',
        'plugins/themes.md',
        'plugins/power-sdk.md',
        'auth/index.html',
        'auth/oidc-sso.md',
        'auth/passkeys.md',
        'api/oauth2.md',
        'catalog.json',
        'llms.txt',
        'rag/index.json',
    ];
    const missing = required.filter((rel) => !fs.existsSync(path.join(PUBLIC_DIR, rel)));
    if (missing.length) {
        throw new Error(`Docs build incomplete — missing:\n  - ${missing.join('\n  - ')}`);
    }
}

function main() {
    console.log('Building full icanhasfeatherpanel docs…\n');
    seedPublicTree();

    for (const gen of GENERATORS) {
        runGenerator(gen);
    }

    buildPluginsSection();
    buildAuthSection();
    attachOpenApi();
    runCatalog();
    assertOutputs();

    console.log('\n✅ Full docs build complete → public/icanhasfeatherpanel/');
    console.log('   Includes: plugins, auth, pages, widgets, CLI, settings, installer, events, permissions, API, RAG');
}

main();
