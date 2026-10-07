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

const APP_DIR = path.join(__dirname, '../src/app');
const COMPONENTS_DIR = path.join(__dirname, '../src/components');
const PUBLIC_DOCS_DIR = path.join(__dirname, '../public/icanhasfeatherpanel');
const WIDGETS_DOCS_DIR = path.join(PUBLIC_DOCS_DIR, 'widgets');

const SLUG_REGEX = /usePluginWidgets\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const WEBSPACE_PAGE_ID_REGEX = /WebSpacePageWidgets\s+pageId\s*=\s*['"]([^'"]+)['"]/g;
const IP_PROPS_REGEX = /injectionPoint\s*=\s*['"]([^'"]+)['"]/g;
const IP_GETWIDGETS_REGEX = /getWidgets\s*\(\s*['"][^'"]+['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g;

function getFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    for (const file of fs.readdirSync(dir)) {
        const name = path.join(dir, file);
        if (fs.statSync(name).isDirectory()) getFiles(name, files);
        else if (name.endsWith('.tsx')) files.push(name);
    }
    return files;
}

function extractDocs() {
    const files = [...getFiles(APP_DIR), ...getFiles(COMPONENTS_DIR)];
    const results = {};

    files.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const slugs = [
            ...[...content.matchAll(SLUG_REGEX)].map((m) => m[1]),
            ...[...content.matchAll(WEBSPACE_PAGE_ID_REGEX)].map((m) => m[1]),
        ];
        if (!slugs.length) return;

        const relativePath = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');

        slugs.forEach((slug) => {
            if (!results[slug]) {
                results[slug] = { files: [], injectionPoints: new Set() };
            }
            if (!results[slug].files.includes(relativePath)) {
                results[slug].files.push(relativePath);
            }

            [...content.matchAll(IP_PROPS_REGEX)].forEach((m) => results[slug].injectionPoints.add(m[1]));
            [...content.matchAll(IP_GETWIDGETS_REGEX)].forEach((m) => results[slug].injectionPoints.add(m[1]));

            if (content.includes(`pageId='${slug}'`) || content.includes(`pageId="${slug}"`)) {
                results[slug].injectionPoints.add('top-of-page');
                results[slug].injectionPoints.add('bottom-of-page');
            }
        });
    });

    return results;
}

function sanitizeSlug(slug) {
    return slug.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-');
}

function toSerializable(results) {
    return Object.keys(results)
        .sort()
        .map((slug) => ({
            slug,
            file_slug: sanitizeSlug(slug),
            files: results[slug].files.slice().sort(),
            injection_points: Array.from(results[slug].injectionPoints).sort(),
        }));
}

function generateHomePage(widgetCount) {
    const cards = [
        {
            href: `${DOCS_BASE}/plugins/`,
            title: 'Plugins',
            body: 'Full addon authoring guides in Markdown — conf.yml, backend, frontend, SDK, packaging, AI recipes.',
            badge: 'Markdown · llms.txt',
        },
        {
            href: `${DOCS_BASE}/widgets/`,
            title: 'Widgets',
            body: 'Page slugs and injection points for plugin UI.',
            badge: `${widgetCount} slugs`,
        },
        {
            href: `${DOCS_BASE}/events/`,
            title: 'Events',
            body: 'PHP plugin hooks and payload keys.',
            badge: 'HTML · MD · JSON',
        },
        {
            href: `${DOCS_BASE}/permissions/`,
            title: 'Permissions',
            body: 'Every permission node from permission_nodes.fpperm.',
            badge: 'HTML · MD · JSON',
        },
        {
            href: `${DOCS_BASE}/api/`,
            title: 'API',
            body: 'OpenAPI reference (Redoc) plus raw openapi.json for tools.',
            badge: 'OpenAPI JSON',
        },
        {
            href: `${DOCS_BASE}/rag/`,
            title: 'RAG / AI index',
            body: 'Catalog of every .md and .json document published on this site.',
            badge: 'catalog.json',
        },
    ]
        .map(
            (card) => `<a class="fp-card-link" href="${card.href}">
  <div class="fp-card">
    <h2>${escapeHtml(card.title)}</h2>
    <p>${escapeHtml(card.body)}</p>
    <div class="fp-meta" style="margin-top:0.85rem"><span class="fp-badge">${escapeHtml(card.badge)}</span></div>
  </div>
</a>`,
        )
        .join('\n');

    const body = `${hero({
        title: 'FeatherPanel Developer Docs',
        subtitle:
            'Browse the human UI, or fetch Markdown and JSON from the same GitHub Pages site for RAG and coding agents.',
        badges: ['GitHub Pages', 'Markdown + JSON', 'OpenAPI'],
        formats: [
            { href: `${DOCS_BASE}/llms.txt`, label: 'llms.txt' },
            { href: `${DOCS_BASE}/catalog.json`, label: 'catalog.json' },
            { href: `${DOCS_BASE}/rag/`, label: 'RAG index' },
            { href: `${DOCS_BASE}/plugins/ai-guide.md`, label: 'Plugin AI guide' },
        ],
    })}

<section class="fp-grid">
${cards}
</section>

<section class="fp-section fp-card">
  <h2>Quick start</h2>
  <p class="fp-muted">Building a plugin? Start with the <a href="${DOCS_BASE}/plugins/">plugin docs</a> (especially <a href="${DOCS_BASE}/view.html?doc=plugins/ai-guide.md">ai-guide.md</a>), then use widgets/events/permissions/API as references.</p>
  <ol class="fp-muted">
    <li>Create <code>backend/storage/addons/{identifier}/</code> with <code>conf.yml</code> + <code>AppPlugin</code> entry class</li>
    <li>Add <code>Routes/</code>, <code>Frontend/widgets.json</code>, or sidebar pages as needed</li>
    <li>Pull machine-readable dumps from <a href="${DOCS_BASE}/rag/">/rag/</a> into your RAG index</li>
  </ol>
</section>`;

    return renderDocsPage({
        title: 'Home',
        description: 'FeatherPanel developer documentation',
        active: 'home',
        body,
    });
}

function generateWidgetsListPage(widgets) {
    const totalIps = widgets.reduce((sum, w) => sum + w.injection_points.length, 0);
    const items = widgets
        .map((widget) => {
            const ips = widget.injection_points.length
                ? widget.injection_points
                      .slice(0, 4)
                      .map((ip) => `<span class="fp-badge">${escapeHtml(ip)}</span>`)
                      .join(' ')
                : '<span class="fp-muted">See detail page</span>';
            return `<li class="fp-item" data-fp-search-item data-fp-search-text="${escapeHtml(
                `${widget.slug} ${widget.injection_points.join(' ')} ${widget.files.join(' ')}`,
            )}">
  <a href="${DOCS_BASE}/widgets/${widget.file_slug}.html"><h2><code>${escapeHtml(widget.slug)}</code></h2></a>
  <p class="fp-muted">${widget.files.length} source file${widget.files.length === 1 ? '' : 's'} · ${widget.injection_points.length} injection point${widget.injection_points.length === 1 ? '' : 's'}</p>
  <div class="fp-meta">${ips}</div>
  <div class="fp-formats">
    <a href="${DOCS_BASE}/widgets/${widget.file_slug}.md">Markdown</a>
    <a href="${DOCS_BASE}/widgets/${widget.file_slug}.json">JSON</a>
  </div>
</li>`;
        })
        .join('\n');

    const body = `${hero({
        title: 'Widget Injection Points',
        subtitle: 'Every page slug that accepts plugin widgets, with injection locations. Also published as Markdown and JSON.',
        badges: [`${widgets.length} slugs`, `${totalIps} injection points`],
        formats: [
            { href: `${DOCS_BASE}/widgets/index.md`, label: 'index.md' },
            { href: `${DOCS_BASE}/widgets/index.json`, label: 'index.json' },
            { href: `${DOCS_BASE}/view.html?doc=widgets/index.md`, label: 'View Markdown' },
        ],
    })}
<input class="fp-search" type="search" placeholder="Filter widgets by slug or injection point…" data-fp-search />
<p class="fp-muted fp-hidden" data-fp-search-empty>No widgets match.</p>
<ul class="fp-list">
${items}
</ul>`;

    return renderDocsPage({
        title: 'Widgets',
        active: 'widgets',
        body,
        includeSearchScript: true,
    });
}

function generateWidgetDetailPage(widget) {
    const exampleIp = widget.injection_points[0] || 'top-of-page';
    const exampleConfig = `{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "hidden": {
    "type": "plugin_setting",
    "key": "hide-my-plugin-widget",
    "equals": "true"
  },
  "priority": 100,
  "page": "${widget.slug}",
  "location": "${exampleIp}",
  "size": "full"
}`;

    const ips =
        widget.injection_points.length > 0
            ? widget.injection_points.map((ip) => `<li><code>${escapeHtml(ip)}</code></li>`).join('\n')
            : '<li class="fp-muted">No static injection points found (may be dynamic).</li>';

    const files = widget.files
        .map((f) => `<li><code>${escapeHtml(path.basename(f))}</code> <span class="fp-muted">(${escapeHtml(f)})</span></li>`)
        .join('\n');

    const body = `<a class="fp-back" href="${DOCS_BASE}/widgets/">&larr; All widgets</a>
${hero({
        title: `<code>${escapeHtml(widget.slug)}</code>`,
        subtitle: 'Widget slug and injection point details',
        formats: [
            { href: `${DOCS_BASE}/widgets/${widget.file_slug}.md`, label: 'Markdown' },
            { href: `${DOCS_BASE}/widgets/${widget.file_slug}.json`, label: 'JSON' },
        ],
    })}
<section class="fp-section fp-card">
  <h2>Injection points</h2>
  <ul>${ips}</ul>
</section>
<section class="fp-section fp-card">
  <h2>Source files</h2>
  <ul>${files}</ul>
</section>
<section class="fp-section fp-card">
  <h2>Plugin widget integration</h2>
  <p class="fp-muted">Add an entry to your plugin <code>Frontend/widgets.json</code>:</p>
  <pre><code>${escapeHtml(exampleConfig)}</code></pre>
</section>`;

    return renderDocsPage({
        title: `Widget: ${widget.slug}`,
        active: 'widgets',
        body,
    });
}

function widgetsIndexMarkdown(widgets) {
    const rows = widgets
        .map(
            (w) =>
                `| \`${w.slug}\` | ${w.injection_points.map((ip) => `\`${ip}\``).join(', ') || '—'} | [md](./${w.file_slug}.md) · [json](./${w.file_slug}.json) |`,
        )
        .join('\n');

    return `# FeatherPanel Widget Injection Points

Total: **${widgets.length}** page slugs.

- [index.json](./index.json)

| Slug | Injection points | Sources |
| --- | --- | --- |
${rows}
`;
}

function widgetMarkdown(widget) {
    return `# Widget: \`${widget.slug}\`

## Injection points

${widget.injection_points.length ? widget.injection_points.map((ip) => `- \`${ip}\``).join('\n') : '- _(none found)_'}

## Source files

${widget.files.map((f) => `- \`${f}\``).join('\n')}

## Example \`widgets.json\` entry

\`\`\`json
{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "page": "${widget.slug}",
  "location": "${widget.injection_points[0] || 'top-of-page'}",
  "size": "full"
}
\`\`\`
`;
}

ensureDir(WIDGETS_DOCS_DIR);

console.log('Extracting widget documentation...');
const documentation = extractDocs();
const widgets = toSerializable(documentation);

writeText(path.join(PUBLIC_DOCS_DIR, 'index.html'), generateHomePage(widgets.length));
writeText(path.join(WIDGETS_DOCS_DIR, 'index.html'), generateWidgetsListPage(widgets));
writeJson(path.join(WIDGETS_DOCS_DIR, 'index.json'), {
    type: 'featherpanel.widgets.index',
    total: widgets.length,
    widgets,
});
writeMarkdown(path.join(WIDGETS_DOCS_DIR, 'index.md'), widgetsIndexMarkdown(widgets));

widgets.forEach((widget) => {
    writeText(path.join(WIDGETS_DOCS_DIR, `${widget.file_slug}.html`), generateWidgetDetailPage(widget));
    writeJson(path.join(WIDGETS_DOCS_DIR, `${widget.file_slug}.json`), {
        type: 'featherpanel.widgets.slug',
        ...widget,
    });
    writeMarkdown(path.join(WIDGETS_DOCS_DIR, `${widget.file_slug}.md`), widgetMarkdown(widget));
});

console.log(`\n✅ Widget docs ready (${widgets.length} slugs, HTML + Markdown + JSON)`);
console.log(`   - Home: ${DOCS_BASE}/`);
console.log(`   - Widgets: ${DOCS_BASE}/widgets/`);
