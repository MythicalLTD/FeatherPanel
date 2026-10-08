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

const EVENTS_DIR = path.join(__dirname, '../../backend/app/Plugins/Events/Events');
const CONTROLLERS_DIR = path.join(__dirname, '../../backend/app/Controllers');
const PUBLIC_DOCS_DIR = path.join(__dirname, '../public/icanhasfeatherpanel');
const EVENTS_DOCS_DIR = path.join(PUBLIC_DOCS_DIR, 'events');
const APP_DIR = path.join(__dirname, '../../backend/app');
const EMIT_SCAN_DIRS = [
    CONTROLLERS_DIR,
    path.join(APP_DIR, 'Helpers'),
    path.join(APP_DIR, 'Services'),
    path.join(APP_DIR, 'Middleware'),
    path.join(APP_DIR, 'Chat'),
];

function getControllerFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    for (const file of fs.readdirSync(dir)) {
        const name = path.join(dir, file);
        if (fs.statSync(name).isDirectory()) getControllerFiles(name, files);
        else if (name.endsWith('.php')) files.push(name);
    }
    return files;
}

function parseEventEmissions() {
    const files = [];
    EMIT_SCAN_DIRS.forEach((dir) => getControllerFiles(dir, files));
    const eventDataMap = new Map();

    files.forEach((filePath) => {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const emitPatterns = [
                /(?:eventManager|EventManager)\s*->\s*emit\s*\(\s*([A-Za-z0-9_\\]+)::(\w+)\(\)\s*,\s*\[(.*?)\]\s*\)/gs,
                /(?:emitPluginEvent|emitVdsEvent|emitWebEvent|emitEvent|emitHookEvent|emitAuthEvent|emitWings)\s*\(\s*([A-Za-z0-9_\\]+)::(\w+)\(\)\s*,\s*\[(.*?)\]\s*\)/gs,
                /WebSpacePluginEvents\s*::\s*emit\s*\(\s*([A-Za-z0-9_\\]+)::(\w+)\(\)\s*,/gs,
            ];

            emitPatterns.forEach((pattern) => {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const eventClass = match[1];
                    const method = match[2];
                    const dataArray = match[3] || '';
                    const categoryMatch = eventClass.match(/([A-Za-z]+)Event$/);
                    if (!categoryMatch) continue;
                    const category = categoryMatch[1];
                    const dataKeys = [];
                    const keyPattern = /['"]([^'"]+)['"]\s*=>/g;
                    let keyMatch;
                    while ((keyMatch = keyPattern.exec(dataArray)) !== null) dataKeys.push(keyMatch[1]);
                    const key = `${category}::${method}`;
                    if (!eventDataMap.has(key)) eventDataMap.set(key, []);
                    eventDataMap.get(key).push({
                        keys: dataKeys,
                        file: path.relative(path.join(__dirname, '../..'), filePath).replace(/\\/g, '/'),
                    });
                }
            });

            const refPattern = /([A-Za-z0-9_\\]+)::(on\w+)\(\s*\)/g;
            let refMatch;
            while ((refMatch = refPattern.exec(content)) !== null) {
                if (!/emit/i.test(content)) continue;
                const eventClass = refMatch[1].split('\\').pop();
                const method = refMatch[2];
                const categoryMatch = eventClass.match(/([A-Za-z]+)Event$/);
                if (!categoryMatch) continue;
                const category = categoryMatch[1];
                const key = `${category}::${method}`;
                if (!eventDataMap.has(key)) eventDataMap.set(key, []);
                eventDataMap.get(key).push({
                    keys: [],
                    file: path.relative(path.join(__dirname, '../..'), filePath).replace(/\\/g, '/'),
                });
            }
        } catch {
            // skip unreadable files
        }
    });

    const merged = new Map();
    eventDataMap.forEach((occurrences, key) => {
        const allKeys = new Set();
        occurrences.forEach((occ) => occ.keys.forEach((k) => allKeys.add(k)));
        merged.set(key, {
            keys: Array.from(allKeys).sort(),
            files: [...new Set(occurrences.map((o) => o.file))],
        });
    });
    return merged;
}

function parseEventFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const className = path.basename(filePath, '.php');
    const category = className.replace(/Event$/, '');
    const events = [];
    const methodRegex =
        /(?:\/\*\*\s*\n\s*\*\s*Callback:\s*(.+?)\s*\n\s*\*\/\s*\n)?\s*public\s+static\s+function\s+(\w+)\(\):\s*string\s*\n\s*\{\s*\n\s*return\s+['"](.+?)['"];?\s*\n\s*\}/gs;

    let match;
    while ((match = methodRegex.exec(content)) !== null) {
        const [, callbackParams, methodName, eventName] = match;
        events.push({
            method: methodName,
            name: eventName,
            callback: callbackParams ? callbackParams.trim() : 'No parameters',
            category,
        });
    }
    return { category, events, className };
}

function parseAllEvents() {
    const files = fs.readdirSync(EVENTS_DIR).filter((f) => f.endsWith('.php') && f !== 'PluginEvent.php');
    const allEvents = [];
    const categories = new Set();
    const grouped = {};
    const eventDataMap = parseEventEmissions();

    files.forEach((file) => {
        const { category, events } = parseEventFile(path.join(EVENTS_DIR, file));
        categories.add(category);
        if (!grouped[category]) grouped[category] = [];
        events.forEach((event) => {
            const eventData = eventDataMap.get(`${category}::${event.method}`);
            if (eventData) {
                event.actualData = eventData.keys;
                event.sourceFiles = eventData.files;
                event.emitted = true;
            } else {
                event.emitted = false;
            }
            allEvents.push(event);
            grouped[category].push(event);
        });
    });

    Object.keys(grouped).forEach((category) => {
        grouped[category].sort((a, b) => a.method.localeCompare(b.method));
    });

    return {
        events: allEvents,
        categories: Array.from(categories).sort(),
        grouped,
    };
}

function sanitizeCategory(category) {
    return category
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-+/, '')
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function serializeEvent(event) {
    return {
        name: event.name,
        method: event.method,
        category: event.category,
        callback: event.callback,
        emitted: Boolean(event.emitted),
        data_keys: event.actualData || [],
        source_files: event.sourceFiles || [],
    };
}

function generateMainPage(categories, grouped, totalEvents, emittedCount, definedOnlyCount) {
    const items = categories
        .map((category) => {
            const sanitized = sanitizeCategory(category);
            const list = grouped[category] || [];
            const emitted = list.filter((e) => e.emitted).length;
            const definedOnly = list.length - emitted;
            return `<li class="fp-item" data-fp-search-item data-fp-search-text="${escapeHtml(category)}">
  <a href="${DOCS_BASE}/events/${sanitized}.html"><h2>${escapeHtml(category)}</h2></a>
  <div class="fp-meta">
    <span class="fp-badge ok">${emitted} emitted</span>
    ${definedOnly > 0 ? `<span class="fp-badge warn">${definedOnly} defined only</span>` : ''}
  </div>
  <div class="fp-formats">
    <a href="${DOCS_BASE}/events/${sanitized}.md">Markdown</a>
    <a href="${DOCS_BASE}/events/${sanitized}.json">JSON</a>
  </div>
</li>`;
        })
        .join('\n');

    const body = `${hero({
        title: 'Plugin Events &amp; Hooks',
        subtitle:
            'Event catalog for FeatherPanel plugins. Emitted events have at least one runtime emit site; defined-only events exist in the catalog but are not currently fired.',
        badges: [
            `${categories.length} categories`,
            `${totalEvents} events`,
            { label: `${emittedCount} emitted`, className: 'ok' },
            { label: `${definedOnlyCount} defined only`, className: 'warn' },
        ],
        formats: [
            { href: `${DOCS_BASE}/events/index.md`, label: 'index.md' },
            { href: `${DOCS_BASE}/events/index.json`, label: 'index.json' },
            { href: `${DOCS_BASE}/events/all.json`, label: 'all.json' },
            { href: `${DOCS_BASE}/view.html?doc=events/index.md`, label: 'View Markdown' },
        ],
    })}
<section class="fp-section">
  <h2>Categories</h2>
  <input class="fp-search" type="search" placeholder="Filter event categories…" data-fp-search />
  <p class="fp-muted fp-hidden" data-fp-search-empty>No categories match.</p>
  <ul class="fp-list">${items}</ul>
</section>
<section class="fp-section fp-card">
  <h2>Registering listeners</h2>
  <pre><code>public static function processEvents(PluginEvents $event): void
{
    $event->on('featherpanel:user:created', function ($user) {
        // Handle user creation
    });
}</code></pre>
</section>`;

    return renderDocsPage({
        title: 'Events',
        active: 'events',
        body,
        includeSearchScript: true,
    });
}

function generateCategoryPage(category, events) {
    const sanitized = sanitizeCategory(category);
    const items = events
        .map((event) => {
            const dataKeys = event.actualData?.length ? event.actualData.join(', ') : 'N/A';
            const sourceFiles = event.sourceFiles?.length
                ? event.sourceFiles.map((f) => `<li><code>${escapeHtml(f)}</code></li>`).join('\n')
                : '<li class="fp-muted">No known emission locations.</li>';
            const status = event.emitted
                ? '<span class="fp-badge ok">Emitted</span>'
                : '<span class="fp-badge warn">Defined only</span>';
            return `<article class="fp-item" data-fp-search-item data-fp-search-text="${escapeHtml(
                `${event.name} ${event.method} ${dataKeys}`,
            )}">
  <h2><code>${escapeHtml(event.name)}</code> ${status}</h2>
  <p class="fp-muted"><strong>Method:</strong> <code>${escapeHtml(event.method)}</code></p>
  <p class="fp-muted"><strong>Callback:</strong> ${escapeHtml(event.callback)}</p>
  <p class="fp-muted"><strong>Data keys:</strong> ${escapeHtml(dataKeys)}</p>
  <h3>Emitted from</h3>
  <ul>${sourceFiles}</ul>
</article>`;
        })
        .join('\n');

    const body = `<a class="fp-back" href="${DOCS_BASE}/events/">&larr; All event categories</a>
${hero({
        title: escapeHtml(category),
        subtitle: `${events.length} events · ${events.filter((e) => e.emitted).length} emitted · ${events.filter((e) => !e.emitted).length} defined only`,
        formats: [
            { href: `${DOCS_BASE}/events/${sanitized}.md`, label: 'Markdown' },
            { href: `${DOCS_BASE}/events/${sanitized}.json`, label: 'JSON' },
        ],
    })}
<input class="fp-search" type="search" placeholder="Filter events…" data-fp-search />
<p class="fp-muted fp-hidden" data-fp-search-empty>No events match.</p>
<div class="fp-list">${items}</div>`;

    return renderDocsPage({
        title: `Events: ${category}`,
        active: 'events',
        body,
        includeSearchScript: true,
    });
}

function categoryMarkdown(category, events) {
    const blocks = events
        .map((event) => {
            const keys = event.actualData?.length ? event.actualData.map((k) => `\`${k}\``).join(', ') : '_none_';
            const files = event.sourceFiles?.length
                ? event.sourceFiles.map((f) => `- \`${f}\``).join('\n')
                : '- _none_';
            return `### \`${event.name}\`

- **Method:** \`${event.method}\`
- **Emitted:** ${event.emitted ? 'yes' : 'no (defined only)'}
- **Callback docs:** ${event.callback}
- **Data keys:** ${keys}

**Source files**

${files}
`;
        })
        .join('\n');

    return `# Events: ${category}

${events.length} events in this category.

${blocks}
`;
}

function indexMarkdown(categories, grouped, events, emittedCount, definedOnlyCount) {
    const links = categories
        .map((category) => {
            const sanitized = sanitizeCategory(category);
            const list = grouped[category] || [];
            const emitted = list.filter((e) => e.emitted).length;
            return `- [${category}](./${sanitized}.md) (${list.length} events, ${emitted} emitted) — [\`${sanitized}.json\`](./${sanitized}.json)`;
        })
        .join('\n');

    return `# FeatherPanel Plugin Events

Total: **${events.length}** events (**${emittedCount}** emitted, **${definedOnlyCount}** defined only).

- [index.json](./index.json)
- [all.json](./all.json)

## Categories

${links}
`;
}

ensureDir(EVENTS_DOCS_DIR);

console.log('Parsing plugin events...');
const { events, categories, grouped } = parseAllEvents();
const emittedCount = events.filter((e) => e.emitted).length;
const definedOnlyCount = events.length - emittedCount;
const serialized = events.map(serializeEvent);

writeText(
    path.join(EVENTS_DOCS_DIR, 'index.html'),
    generateMainPage(categories, grouped, events.length, emittedCount, definedOnlyCount),
);
writeJson(path.join(EVENTS_DOCS_DIR, 'index.json'), {
    type: 'featherpanel.events.index',
    total: events.length,
    emitted: emittedCount,
    defined_only: definedOnlyCount,
    categories: categories.map((category) => {
        const sanitized = sanitizeCategory(category);
        const list = grouped[category] || [];
        return {
            name: category,
            slug: sanitized,
            total: list.length,
            emitted: list.filter((e) => e.emitted).length,
            html: `${DOCS_BASE}/events/${sanitized}.html`,
            markdown: `${DOCS_BASE}/events/${sanitized}.md`,
            json: `${DOCS_BASE}/events/${sanitized}.json`,
        };
    }),
});
writeJson(path.join(EVENTS_DOCS_DIR, 'all.json'), {
    type: 'featherpanel.events.all',
    total: events.length,
    emitted: emittedCount,
    defined_only: definedOnlyCount,
    events: serialized,
});
writeMarkdown(
    path.join(EVENTS_DOCS_DIR, 'index.md'),
    indexMarkdown(categories, grouped, events, emittedCount, definedOnlyCount),
);

categories.forEach((category) => {
    const sanitized = sanitizeCategory(category);
    const list = grouped[category];
    writeText(path.join(EVENTS_DOCS_DIR, `${sanitized}.html`), generateCategoryPage(category, list));
    writeJson(path.join(EVENTS_DOCS_DIR, `${sanitized}.json`), {
        type: 'featherpanel.events.category',
        category,
        slug: sanitized,
        total: list.length,
        events: list.map(serializeEvent),
    });
    writeMarkdown(path.join(EVENTS_DOCS_DIR, `${sanitized}.md`), categoryMarkdown(category, list));
    console.log(`✓ events/${sanitized}.{html,md,json} (${list.length})`);
});

console.log(
    `\n✅ Events docs ready (${events.length} events, ${emittedCount} emitted, HTML + Markdown + JSON)`,
);
