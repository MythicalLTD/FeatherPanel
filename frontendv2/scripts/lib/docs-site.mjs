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

export const DOCS_BASE = '/icanhasfeatherpanel';

const NAV = [
    { id: 'home', label: 'Home', href: `${DOCS_BASE}/` },
    { id: 'plugins', label: 'Plugins', href: `${DOCS_BASE}/plugins/` },
    { id: 'widgets', label: 'Widgets', href: `${DOCS_BASE}/widgets/` },
    { id: 'events', label: 'Events', href: `${DOCS_BASE}/events/` },
    { id: 'permissions', label: 'Permissions', href: `${DOCS_BASE}/permissions/` },
    { id: 'api', label: 'API', href: `${DOCS_BASE}/api/` },
    { id: 'rag', label: 'RAG', href: `${DOCS_BASE}/rag/` },
];

export function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

export function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

export function writeText(filePath, contents) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, contents);
}

export function writeJson(filePath, data) {
    writeText(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

export function writeMarkdown(filePath, contents) {
    const body = contents.endsWith('\n') ? contents : `${contents}\n`;
    writeText(filePath, body);
}

function navHtml(active) {
    return NAV.map((item) => {
        const cls = item.id === active ? ' class="active"' : '';
        return `<a href="${item.href}"${cls}>${escapeHtml(item.label)}</a>`;
    }).join('\n      ');
}

/**
 * @param {object} options
 * @param {string} options.title
 * @param {string} [options.description]
 * @param {string} [options.active] nav id
 * @param {string} options.body
 * @param {boolean} [options.includeSearchScript]
 */
export function renderDocsPage({
    title,
    description = '',
    active = 'home',
    body,
    includeSearchScript = false,
}) {
    const descTag = description
        ? `\n  <meta name="description" content="${escapeHtml(description)}" />`
        : '';

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} — FeatherPanel Docs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />${descTag}
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
      ${navHtml(active)}
      </div>
    </nav>

${body}

    <footer class="fp-footer">
      Machine-readable sources (.md / .json) are published next to these pages for RAG and AI agents.
      See <a href="${DOCS_BASE}/rag/">RAG index</a> or <a href="${DOCS_BASE}/llms.txt">llms.txt</a>.
    </footer>
  </div>
  ${includeSearchScript ? `<script src="${DOCS_BASE}/assets/docs.js"></script>` : ''}
</body>
</html>
`;
}

export function formatsBar(links) {
    if (!links?.length) return '';
    const items = links
        .map((link) => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`)
        .join('\n    ');
    return `<div class="fp-formats">
    ${items}
  </div>`;
}

export function hero({ title, subtitle, badges = [], formats = [] }) {
    const badgeHtml = badges
        .map((b) => {
            if (typeof b === 'string') return `<span class="fp-badge">${escapeHtml(b)}</span>`;
            return `<span class="fp-badge ${escapeHtml(b.className || '')}">${escapeHtml(b.label)}</span>`;
        })
        .join('\n      ');

    return `<header class="fp-hero">
  <h1>${title}</h1>
  <p>${subtitle}</p>
  ${badges.length ? `<div class="fp-meta">\n      ${badgeHtml}\n    </div>` : ''}
  ${formatsBar(formats)}
</header>`;
}
