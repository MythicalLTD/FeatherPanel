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
const PUBLIC_DOCS_DIR = path.join(__dirname, '../public/icanhasfeatherpanel');
const RAG_DIR = path.join(PUBLIC_DOCS_DIR, 'rag');

const SKIP_DIRS = new Set(['node_modules', '.git']);
const INCLUDE_EXT = new Set(['.md', '.json', '.txt']);

function walk(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(full, files);
            continue;
        }
        const ext = path.extname(entry.name).toLowerCase();
        if (!INCLUDE_EXT.has(ext)) continue;
        // Skip huge accidental dumps if any
        const stat = fs.statSync(full);
        if (stat.size > 25 * 1024 * 1024) continue;
        files.push(full);
    }
    return files;
}

function sectionFor(rel) {
    const top = rel.split('/')[0];
    if (
        [
            'plugins',
            'pages',
            'widgets',
            'cli',
            'settings',
            'installer',
            'events',
            'permissions',
            'api',
            'schemas',
            'rag',
            'assets',
        ].includes(top)
    ) {
        return top;
    }
    return 'root';
}

function titleFor(rel) {
    const base = path.basename(rel);
    if (base === 'llms.txt') return 'llms.txt';
    if (base === 'catalog.json') return 'Document catalog';
    if (base === 'index.md' || base === 'index.json') return `${sectionFor(rel)} index`;
    return base;
}

function buildCatalog() {
    const files = walk(PUBLIC_DOCS_DIR);
    const documents = files
        .map((full) => {
            const rel = path.relative(PUBLIC_DOCS_DIR, full).replace(/\\/g, '/');
            const ext = path.extname(rel).toLowerCase();
            return {
                id: rel,
                title: titleFor(rel),
                section: sectionFor(rel),
                format: ext === '.md' ? 'markdown' : ext === '.json' ? 'json' : 'text',
                path: `${DOCS_BASE}/${rel}`,
                bytes: fs.statSync(full).size,
            };
        })
        .sort((a, b) => a.path.localeCompare(b.path));

    const bySection = {};
    documents.forEach((doc) => {
        if (!bySection[doc.section]) bySection[doc.section] = [];
        bySection[doc.section].push(doc);
    });

    return {
        type: 'featherpanel.docs.catalog',
        version: 1,
        generated_at: new Date().toISOString(),
        base: DOCS_BASE,
        totals: {
            documents: documents.length,
            markdown: documents.filter((d) => d.format === 'markdown').length,
            json: documents.filter((d) => d.format === 'json').length,
            text: documents.filter((d) => d.format === 'text').length,
        },
        sections: Object.keys(bySection)
            .sort()
            .map((section) => ({
                id: section,
                count: bySection[section].length,
                documents: bySection[section],
            })),
        documents,
        entrypoints: {
            home: `${DOCS_BASE}/`,
            rag: `${DOCS_BASE}/rag/`,
            llms_txt: `${DOCS_BASE}/llms.txt`,
            catalog_json: `${DOCS_BASE}/catalog.json`,
            plugins_ai_guide: `${DOCS_BASE}/plugins/ai-guide.md`,
            plugins_themes_md: `${DOCS_BASE}/plugins/themes.md`,
            plugins_power_sdk_md: `${DOCS_BASE}/plugins/power-sdk.md`,
            auth_index: `${DOCS_BASE}/auth/`,
            auth_oidc_md: `${DOCS_BASE}/auth/oidc-sso.md`,
            auth_passkeys_md: `${DOCS_BASE}/auth/passkeys.md`,
            oauth2_md: `${DOCS_BASE}/api/oauth2.md`,
            pages_all_json: `${DOCS_BASE}/pages/all.json`,
            cli_usage_md: `${DOCS_BASE}/cli/usage.md`,
            cli_all_json: `${DOCS_BASE}/cli/all.json`,
            settings_guide_md: `${DOCS_BASE}/settings/guide.md`,
            settings_all_json: `${DOCS_BASE}/settings/all.json`,
            installer_guide_md: `${DOCS_BASE}/installer/guide.md`,
            installer_all_json: `${DOCS_BASE}/installer/all.json`,
            permissions_all_json: `${DOCS_BASE}/permissions/all.json`,
            events_all_json: `${DOCS_BASE}/events/all.json`,
            widgets_index_json: `${DOCS_BASE}/widgets/index.json`,
            openapi_json: `${DOCS_BASE}/api/openapi.json`,
        },
    };
}

function buildLlmsTxt(catalog) {
    const lines = [
        '# FeatherPanel Developer Docs',
        '',
        '> Machine-readable documentation for FeatherPanel plugins, frontend pages, widgets, CLI, admin settings, installer, events, permissions, and HTTP API.',
        '> Prefer .md / .json over HTML when indexing for RAG.',
        '',
        `Base: https://mythicalltd.github.io/FeatherPanel${DOCS_BASE}/`,
        `Catalog: ${DOCS_BASE}/catalog.json`,
        '',
        '## Primary entrypoints',
        '',
        `- [Plugin AI guide](${DOCS_BASE}/plugins/ai-guide.md)`,
        `- [Plugins index](${DOCS_BASE}/plugins/README.md)`,
        `- [How to make themes](${DOCS_BASE}/plugins/themes.md)`,
        `- [UI packs](${DOCS_BASE}/plugins/ui-packs.md)`,
        `- [Power SDK](${DOCS_BASE}/plugins/power-sdk.md)`,
        `- [Auth index](${DOCS_BASE}/auth/README.md)`,
        `- [OIDC / SSO login](${DOCS_BASE}/auth/oidc-sso.md)`,
        `- [Passkeys](${DOCS_BASE}/auth/passkeys.md)`,
        `- [OAuth2 API consent (callback + device)](${DOCS_BASE}/api/oauth2.md)`,
        `- [Frontend pages (all JSON)](${DOCS_BASE}/pages/all.json)`,
        `- [Frontend pages (Markdown)](${DOCS_BASE}/pages/index.md)`,
        `- [CLI usage (prod)](${DOCS_BASE}/cli/usage.md)`,
        `- [CLI commands (all JSON)](${DOCS_BASE}/cli/all.json)`,
        `- [Admin settings guide](${DOCS_BASE}/settings/guide.md)`,
        `- [Admin settings (all JSON)](${DOCS_BASE}/settings/all.json)`,
        `- [Installer guide](${DOCS_BASE}/installer/guide.md)`,
        `- [Installer (all JSON)](${DOCS_BASE}/installer/all.json)`,
        `- [Permissions (all JSON)](${DOCS_BASE}/permissions/all.json)`,
        `- [Permissions (Markdown index)](${DOCS_BASE}/permissions/index.md)`,
        `- [Events (all JSON)](${DOCS_BASE}/events/all.json)`,
        `- [Events (Markdown index)](${DOCS_BASE}/events/index.md)`,
        `- [Widgets (JSON)](${DOCS_BASE}/widgets/index.json)`,
        `- [Widgets (Markdown)](${DOCS_BASE}/widgets/index.md)`,
        `- [OpenAPI JSON](${DOCS_BASE}/api/openapi.json)`,
        `- [API Markdown pointer](${DOCS_BASE}/api/index.md)`,
        `- [Schemas](${DOCS_BASE}/schemas/)`,
        `- [RAG UI](${DOCS_BASE}/rag/)`,
        '',
        '## All documents',
        '',
    ];

    catalog.documents.forEach((doc) => {
        lines.push(`- [${doc.id}](${doc.path}) (${doc.format}, ${doc.section})`);
    });

    lines.push('');
    return lines.join('\n');
}

function buildRagPage(catalog) {
    const sectionCards = catalog.sections
        .map((section) => {
            const md = section.documents.filter((d) => d.format === 'markdown').length;
            const json = section.documents.filter((d) => d.format === 'json').length;
            return `<div class="fp-card">
  <h2>${escapeHtml(section.id)}</h2>
  <p class="fp-muted">${section.count} files · ${md} markdown · ${json} json</p>
</div>`;
        })
        .join('\n');

    const rows = catalog.documents
        .map((doc) => {
            const view =
                doc.format === 'markdown'
                    ? `<a href="${DOCS_BASE}/view.html?doc=${encodeURIComponent(doc.id)}">view</a>`
                    : '—';
            return `<tr data-fp-search-item data-fp-search-text="${escapeHtml(`${doc.id} ${doc.section} ${doc.format}`)}">
  <td><code>${escapeHtml(doc.id)}</code></td>
  <td>${escapeHtml(doc.section)}</td>
  <td>${escapeHtml(doc.format)}</td>
  <td><a href="${escapeHtml(doc.path)}">raw</a> · ${view}</td>
</tr>`;
        })
        .join('\n');

    const body = `${hero({
        title: 'RAG &amp; AI document index',
        subtitle:
            'Every Markdown, JSON, and text document published with these docs. Point your crawler or RAG loader at catalog.json or llms.txt.',
        badges: [
            `${catalog.totals.documents} documents`,
            `${catalog.totals.markdown} markdown`,
            `${catalog.totals.json} json`,
        ],
        formats: [
            { href: `${DOCS_BASE}/catalog.json`, label: 'catalog.json' },
            { href: `${DOCS_BASE}/llms.txt`, label: 'llms.txt' },
            { href: `${DOCS_BASE}/rag/index.json`, label: 'rag/index.json' },
            { href: `${DOCS_BASE}/rag/index.md`, label: 'rag/index.md' },
        ],
    })}

<section class="fp-section">
  <h2>Sections</h2>
  <div class="fp-grid">${sectionCards}</div>
</section>

<section class="fp-section">
  <h2>Documents</h2>
  <input class="fp-search" type="search" placeholder="Filter documents…" data-fp-search />
  <p class="fp-muted fp-hidden" data-fp-search-empty>No documents match.</p>
  <table class="fp-table">
    <thead><tr><th>Path</th><th>Section</th><th>Format</th><th>Links</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>`;

    return renderDocsPage({
        title: 'RAG index',
        description: 'Machine-readable FeatherPanel docs catalog',
        active: 'rag',
        body,
        includeSearchScript: true,
    });
}

function buildRagMarkdown(catalog) {
    const bySection = catalog.sections
        .map((section) => {
            const docs = section.documents.map((d) => `- [${d.id}](${d.path}) (${d.format})`).join('\n');
            return `## ${section.id}\n\n${docs}`;
        })
        .join('\n\n');

    return `# FeatherPanel RAG catalog

Generated: ${catalog.generated_at}

- [catalog.json](../catalog.json)
- [llms.txt](../llms.txt)

Totals: ${catalog.totals.documents} documents (${catalog.totals.markdown} markdown, ${catalog.totals.json} json).

${bySection}
`;
}

function writeGlobalMarkdownViewer() {
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Markdown viewer — FeatherPanel Docs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="${DOCS_BASE}/assets/docs.css" />
</head>
<body class="fp-docs">
  <div class="fp-shell">
    <nav class="fp-nav" aria-label="Documentation">
      <a class="fp-brand" href="${DOCS_BASE}/">
        <span class="fp-brand-mark" aria-hidden="true"></span>
        <span>FeatherPanel Docs</span>
      </a>
      <div class="fp-nav-links">
        <a href="${DOCS_BASE}/">Home</a>
        <a href="${DOCS_BASE}/plugins/">Plugins</a>
        <a href="${DOCS_BASE}/auth/">Auth</a>
        <a href="${DOCS_BASE}/pages/">Pages</a>
        <a href="${DOCS_BASE}/widgets/">Widgets</a>
        <a href="${DOCS_BASE}/cli/">CLI</a>
        <a href="${DOCS_BASE}/settings/">Settings</a>
        <a href="${DOCS_BASE}/installer/">Installer</a>
        <a href="${DOCS_BASE}/events/">Events</a>
        <a href="${DOCS_BASE}/permissions/">Permissions</a>
        <a href="${DOCS_BASE}/api/">API</a>
        <a href="${DOCS_BASE}/rag/" class="active">RAG</a>
      </div>
    </nav>
    <div class="fp-meta" style="margin-bottom:1rem">
      <span class="fp-badge" id="doc-badge">loading…</span>
      <a class="fp-badge" id="raw-link" href="#">Raw Markdown</a>
    </div>
    <article class="fp-card fp-prose" id="content"><p class="fp-muted">Loading…</p></article>
    <footer class="fp-footer">Prefer fetching the raw <code>.md</code> URL for RAG ingestion.</footer>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/marked@15.0.7/marked.min.js"></script>
  <script>
    (function () {
      var params = new URLSearchParams(window.location.search);
      var doc = params.get('doc') || 'plugins/README.md';
      if (doc.includes('..') || doc.startsWith('/') || !/^[a-zA-Z0-9._\\/-]+\\.md$/.test(doc)) {
        document.getElementById('content').innerHTML = '<p class="fp-muted">Invalid document path.</p>';
        return;
      }
      document.getElementById('doc-badge').textContent = doc;
      document.getElementById('raw-link').href = './' + doc;
      document.title = doc + ' — FeatherPanel Docs';
      fetch('./' + doc, { credentials: 'same-origin' })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.text();
        })
        .then(function (md) {
          marked.setOptions({ gfm: true });
          var html = marked.parse(md);
          html = html.replace(/href="(\\.\\/)?([a-zA-Z0-9._\\/-]+\\.md)"/g, function (_, _dot, target) {
            var baseDir = doc.split('/').slice(0, -1).join('/');
            var resolved = /^(plugins|pages|widgets|cli|settings|installer|events|permissions|api|rag)\\//.test(target)
              ? target
              : (baseDir ? baseDir + '/' : '') + target.replace(/^\\.\\//, '');
            resolved = resolved.replace(/\\/\\.\\//g, '/');
            return 'href="./view.html?doc=' + encodeURIComponent(resolved) + '"';
          });
          document.getElementById('content').innerHTML = html;
        })
        .catch(function (err) {
          document.getElementById('content').innerHTML = '<p class="fp-muted">Failed to load: ' + String(err.message || err) + '</p>';
        });
    })();
  </script>
</body>
</html>
`;
    writeText(path.join(PUBLIC_DOCS_DIR, 'view.html'), html);
}

ensureDir(RAG_DIR);

// Prefer shipping OpenAPI beside the API docs for RAG (also copied again in build:public-docs)
const openapiCandidates = [
    path.join(__dirname, '../../backend/openapi.json'),
    path.join(PUBLIC_DOCS_DIR, 'api/openapi.json'),
];
for (const candidate of openapiCandidates) {
    if (fs.existsSync(candidate)) {
        ensureDir(path.join(PUBLIC_DOCS_DIR, 'api'));
        fs.copyFileSync(candidate, path.join(PUBLIC_DOCS_DIR, 'api/openapi.json'));
        break;
    }
}

// First pass without catalog/llms themselves dominating — write placeholders then rebuild
const catalog = buildCatalog();
writeJson(path.join(PUBLIC_DOCS_DIR, 'catalog.json'), catalog);
writeMarkdown(path.join(PUBLIC_DOCS_DIR, 'llms.txt'), buildLlmsTxt(catalog));
writeText(path.join(RAG_DIR, 'index.html'), buildRagPage(catalog));
writeJson(path.join(RAG_DIR, 'index.json'), {
    type: 'featherpanel.rag.index',
    catalog: `${DOCS_BASE}/catalog.json`,
    llms_txt: `${DOCS_BASE}/llms.txt`,
    totals: catalog.totals,
    entrypoints: catalog.entrypoints,
});
writeMarkdown(path.join(RAG_DIR, 'index.md'), buildRagMarkdown(catalog));
writeGlobalMarkdownViewer();

// Rebuild catalog so it includes rag/* + catalog.json + llms.txt + view.html is html-only
const finalCatalog = buildCatalog();
writeJson(path.join(PUBLIC_DOCS_DIR, 'catalog.json'), finalCatalog);
writeMarkdown(path.join(PUBLIC_DOCS_DIR, 'llms.txt'), buildLlmsTxt(finalCatalog));
writeMarkdown(path.join(RAG_DIR, 'index.md'), buildRagMarkdown(finalCatalog));
writeText(path.join(RAG_DIR, 'index.html'), buildRagPage(finalCatalog));

console.log(`✅ RAG catalog ready (${finalCatalog.totals.documents} documents)`);
console.log(`   - ${DOCS_BASE}/catalog.json`);
console.log(`   - ${DOCS_BASE}/llms.txt`);
console.log(`   - ${DOCS_BASE}/rag/`);
