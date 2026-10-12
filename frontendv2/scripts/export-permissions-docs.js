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

const PERMISSIONS_FILE = path.join(__dirname, '../../permission_nodes.fpperm');
const PUBLIC_DOCS_DIR = path.join(__dirname, '../public/icanhasfeatherpanel');
const PERMISSIONS_DOCS_DIR = path.join(PUBLIC_DOCS_DIR, 'permissions');

function parsePermissionsFile() {
    const content = fs.readFileSync(PERMISSIONS_FILE, 'utf8');
    const lines = content.split('\n');
    const permissions = [];
    const categories = new Set();

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const match = trimmed.match(/^([A-Z_]+)=([^|]+)\s*\|\s*([^|]+)\s*\|\s*(.+)$/);
        if (!match) continue;

        const [, constant, node, category, description] = match;
        permissions.push({
            constant: constant.trim(),
            node: node.trim(),
            category: category.trim(),
            description: description.trim(),
        });
        categories.add(category.trim());
    }

    const grouped = {};
    permissions.forEach((perm) => {
        if (!grouped[perm.category]) grouped[perm.category] = [];
        grouped[perm.category].push(perm);
    });

    Object.keys(grouped).forEach((category) => {
        grouped[category].sort((a, b) => a.node.localeCompare(b.node));
    });

    return {
        permissions,
        categories: Array.from(categories).sort(),
        grouped,
    };
}

function sanitizeCategory(category) {
    return category
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function generateMainPage(categories, grouped, totalPermissions) {
    const items = categories
        .map((category) => {
            const sanitized = sanitizeCategory(category);
            const count = grouped[category]?.length || 0;
            return `<li class="fp-item" data-fp-search-item data-fp-search-text="${escapeHtml(`${category} ${sanitized}`)}">
  <a href="${DOCS_BASE}/permissions/${sanitized}.html"><h2>${escapeHtml(category)}</h2></a>
  <p class="fp-muted">${count} permission${count === 1 ? '' : 's'}</p>
  <div class="fp-formats">
    <a href="${DOCS_BASE}/permissions/${sanitized}.md">Markdown</a>
    <a href="${DOCS_BASE}/permissions/${sanitized}.json">JSON</a>
    <a href="${DOCS_BASE}/view.html?doc=permissions/${sanitized}.md">View MD</a>
  </div>
</li>`;
        })
        .join('\n');

    const body = `${hero({
        title: 'Permission Nodes',
        subtitle:
            'Complete role-based access control reference. Available as HTML for browsing and as Markdown/JSON for RAG pipelines.',
        badges: [`${categories.length} categories`, `${totalPermissions} permissions`],
        formats: [
            { href: `${DOCS_BASE}/permissions/index.md`, label: 'index.md' },
            { href: `${DOCS_BASE}/permissions/index.json`, label: 'index.json' },
            { href: `${DOCS_BASE}/permissions/all.json`, label: 'all.json' },
            { href: `${DOCS_BASE}/view.html?doc=permissions/index.md`, label: 'View Markdown' },
        ],
    })}

<section class="fp-section">
  <h2>Categories</h2>
  <input class="fp-search" type="search" placeholder="Filter categories…" data-fp-search />
  <p class="fp-muted fp-hidden" data-fp-search-empty>No categories match.</p>
  <ul class="fp-list">
${items}
  </ul>
</section>

<section class="fp-section fp-card">
  <h2>About permissions</h2>
  <p class="fp-muted">Permissions use hierarchical dot notation (<code>admin.users.view</code>). <code>admin.root</code> grants full access.</p>
  <pre><code>use App\\Helpers\\PermissionHelper;
use App\\Permissions;

if (PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_USERS_VIEW)) {
    // allowed
}</code></pre>
</section>`;

    return renderDocsPage({
        title: 'Permissions',
        description: 'FeatherPanel permission nodes reference',
        active: 'permissions',
        body,
        includeSearchScript: true,
    });
}

function generateCategoryPage(category, permissions) {
    const example = permissions[0] || { node: 'admin.example.view', constant: 'ADMIN_EXAMPLE_VIEW' };
    const sanitized = sanitizeCategory(category);

    const items = permissions
        .map((perm) => {
            return `<article class="fp-item" data-fp-search-item data-fp-search-text="${escapeHtml(
                `${perm.node} ${perm.constant} ${perm.description}`,
            )}">
  <h2><code>${escapeHtml(perm.node)}</code></h2>
  <p class="fp-muted"><strong>Constant:</strong> <code>${escapeHtml(perm.constant)}</code></p>
  <p class="fp-muted">${escapeHtml(perm.description)}</p>
</article>`;
        })
        .join('\n');

    const body = `<a class="fp-back" href="${DOCS_BASE}/permissions/">&larr; All permission categories</a>
${hero({
        title: escapeHtml(category),
        subtitle: `${permissions.length} permission${permissions.length === 1 ? '' : 's'} in this category.`,
        formats: [
            { href: `${DOCS_BASE}/permissions/${sanitized}.md`, label: 'Markdown' },
            { href: `${DOCS_BASE}/permissions/${sanitized}.json`, label: 'JSON' },
        ],
    })}
<input class="fp-search" type="search" placeholder="Filter permissions…" data-fp-search />
<p class="fp-muted fp-hidden" data-fp-search-empty>No permissions match.</p>
<div class="fp-list">
${items}
</div>
<section class="fp-section fp-card">
  <h2>Usage</h2>
  <pre><code>use App\\Permissions;
use App\\Helpers\\PermissionHelper;

if (PermissionHelper::hasPermission($userUuid, Permissions::${escapeHtml(example.constant)})) {
    // ${escapeHtml(example.node)}
}</code></pre>
</section>`;

    return renderDocsPage({
        title: `Permissions: ${category}`,
        active: 'permissions',
        body,
        includeSearchScript: true,
    });
}

function categoryMarkdown(category, permissions) {
    const rows = permissions
        .map((p) => `| \`${p.node}\` | \`${p.constant}\` | ${p.description.replace(/\|/g, '\\|')} |`)
        .join('\n');

    return `# Permissions: ${category}

${permissions.length} permission nodes in this category.

| Node | Constant | Description |
| --- | --- | --- |
${rows}
`;
}

function indexMarkdown(categories, grouped, permissions) {
    const links = categories
        .map((category) => {
            const sanitized = sanitizeCategory(category);
            const count = grouped[category]?.length || 0;
            return `- [${category}](./${sanitized}.md) (${count}) — also [\`${sanitized}.json\`](./${sanitized}.json)`;
        })
        .join('\n');

    return `# FeatherPanel Permission Nodes

Total: **${permissions.length}** permissions across **${categories.length}** categories.

Machine-readable dumps:

- [index.json](./index.json) — catalog of categories
- [all.json](./all.json) — flat list of every permission

## Categories

${links}
`;
}

ensureDir(PERMISSIONS_DOCS_DIR);

console.log('Parsing permissions file...');
const { permissions, categories, grouped } = parsePermissionsFile();

writeText(path.join(PERMISSIONS_DOCS_DIR, 'index.html'), generateMainPage(categories, grouped, permissions.length));
console.log('✓ permissions/index.html');

writeJson(path.join(PERMISSIONS_DOCS_DIR, 'index.json'), {
    type: 'featherpanel.permissions.index',
    total: permissions.length,
    categories: categories.map((category) => ({
        name: category,
        slug: sanitizeCategory(category),
        count: grouped[category]?.length || 0,
        html: `${DOCS_BASE}/permissions/${sanitizeCategory(category)}.html`,
        markdown: `${DOCS_BASE}/permissions/${sanitizeCategory(category)}.md`,
        json: `${DOCS_BASE}/permissions/${sanitizeCategory(category)}.json`,
    })),
    files: {
        all_json: `${DOCS_BASE}/permissions/all.json`,
        index_md: `${DOCS_BASE}/permissions/index.md`,
    },
});

writeJson(path.join(PERMISSIONS_DOCS_DIR, 'all.json'), {
    type: 'featherpanel.permissions.all',
    total: permissions.length,
    permissions,
});

writeMarkdown(path.join(PERMISSIONS_DOCS_DIR, 'index.md'), indexMarkdown(categories, grouped, permissions));

categories.forEach((category) => {
    const sanitized = sanitizeCategory(category);
    const list = grouped[category];
    writeText(path.join(PERMISSIONS_DOCS_DIR, `${sanitized}.html`), generateCategoryPage(category, list));
    writeJson(path.join(PERMISSIONS_DOCS_DIR, `${sanitized}.json`), {
        type: 'featherpanel.permissions.category',
        category,
        slug: sanitized,
        total: list.length,
        permissions: list,
    });
    writeMarkdown(path.join(PERMISSIONS_DOCS_DIR, `${sanitized}.md`), categoryMarkdown(category, list));
    console.log(`✓ permissions/${sanitized}.{html,md,json} (${list.length})`);
});

console.log(`\n✅ Permissions docs ready (${permissions.length} nodes, HTML + Markdown + JSON)`);
