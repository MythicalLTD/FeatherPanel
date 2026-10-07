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

const CONFIG_INTERFACE = path.join(__dirname, '../../backend/app/Config/ConfigInterface.php');
const SETTINGS_CONTROLLER = path.join(__dirname, '../../backend/app/Controllers/Admin/SettingsController.php');
const PUBLIC_DOCS_DIR = path.join(__dirname, '../public/icanhasfeatherpanel');
const SETTINGS_DOCS_DIR = path.join(PUBLIC_DOCS_DIR, 'settings');

function parseConfigConstants(source) {
    const constants = {};
    const re = /public\s+const\s+([A-Z0-9_]+)\s*=\s*'([^']*)'\s*;/g;
    let match;
    while ((match = re.exec(source)) !== null) {
        constants[match[1]] = match[2];
    }
    return constants;
}

function balancedSlice(source, openBraceIndex) {
    let depth = 0;
    for (let i = openBraceIndex; i < source.length; i++) {
        const ch = source[i];
        if (ch === '[' || ch === '{') depth++;
        else if (ch === ']' || ch === '}') {
            depth--;
            if (depth === 0) return source.slice(openBraceIndex + 1, i);
        }
    }
    return '';
}

function parsePhpString(raw) {
    if (raw == null) return null;
    const trimmed = raw.trim();
    const m = trimmed.match(/^['"]([\s\S]*)['"]$/);
    if (!m) return trimmed;
    return m[1].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n');
}

function parsePhpArrayStrings(raw) {
    if (!raw) return [];
    const out = [];
    const re = /'([^']*)'|"([^"]*)"/g;
    let match;
    while ((match = re.exec(raw)) !== null) out.push(match[1] ?? match[2]);
    return out;
}

function parseCategories(controllerSource, constants) {
    const marker = 'private $settingsCategories = [';
    const start = controllerSource.indexOf(marker);
    if (start < 0) return [];
    const open = controllerSource.indexOf('[', start);
    const body = balancedSlice(controllerSource, open);

    const categories = [];
    const catRe =
        /'([a-z0-9_]+)'\s*=>\s*\[\s*'name'\s*=>\s*'([^']*)'\s*,\s*'description'\s*=>\s*'([^']*)'\s*,\s*'icon'\s*=>\s*'([^']*)'\s*,\s*'settings'\s*=>\s*\[([\s\S]*?)\]\s*,?\s*\]/g;
    let match;
    while ((match = catRe.exec(body)) !== null) {
        const keys = [];
        const constRe = /ConfigInterface::([A-Z0-9_]+)/g;
        let cm;
        while ((cm = constRe.exec(match[5])) !== null) {
            const key = constants[cm[1]];
            if (key) keys.push(key);
        }
        categories.push({
            id: match[1],
            name: match[2],
            description: match[3],
            icon: match[4],
            setting_keys: keys,
            settings_count: keys.length,
        });
    }
    return categories;
}

function parseSettingDefinitions(controllerSource, constants) {
    const marker = '$this->settings = [';
    const start = controllerSource.indexOf(marker);
    if (start < 0) return {};

    const open = controllerSource.indexOf('[', start);
    const body = balancedSlice(controllerSource, open);
    const definitions = {};

    const entryRe = /ConfigInterface::([A-Z0-9_]+)\s*=>\s*\[/g;
    let match;
    while ((match = entryRe.exec(body)) !== null) {
        const constName = match[1];
        const key = constants[constName];
        if (!key) continue;
        const entryOpen = body.indexOf('[', match.index + match[0].length - 1);
        const entryBody = balancedSlice(body, entryOpen);

        const field = (name) => {
            const fm = entryBody.match(
                new RegExp(`'${name}'\\s*=>\\s*('[^']*'|"[^"]*"|true|false|\\[[\\s\\S]*?\\])`, 'm'),
            );
            return fm ? fm[1] : null;
        };

        const optionsRaw = field('options');
        definitions[key] = {
            key,
            constant: constName,
            description: parsePhpString(field('description')) || '',
            type: parsePhpString(field('type')) || 'text',
            required: (field('required') || '').trim() === 'true',
            placeholder: parsePhpString(field('placeholder')) || '',
            validation: parsePhpString(field('validation')) || '',
            options: parsePhpArrayStrings(optionsRaw),
            category: parsePhpString(field('category')) || 'other',
            sensitive: (field('sensitive') || '').trim() === 'true' || /'password'/.test(field('type') || ''),
        };
    }

    return definitions;
}

function parseSensitiveList(controllerSource, constants) {
    const marker = 'private $sensitiveSettings = [';
    const start = controllerSource.indexOf(marker);
    if (start < 0) return [];
    const open = controllerSource.indexOf('[', start);
    const body = balancedSlice(controllerSource, open);
    const keys = [];
    const re = /ConfigInterface::([A-Z0-9_]+)/g;
    let match;
    while ((match = re.exec(body)) !== null) {
        const key = constants[match[1]];
        if (key) keys.push(key);
    }
    return keys;
}

function settingsGuideMarkdown(categories, settings, constants) {
    return `# FeatherPanel admin settings & configuration

This documents every setting exposed by \`SettingsController\` (Admin → Settings) and every \`ConfigInterface\` key.

## How settings work

- Stored in DB table \`featherpanel_settings\` as name/value strings.
- Keys are defined in \`backend/app/Config/ConfigInterface.php\`.
- Admin UI metadata (type, options, category, validation) lives in \`SettingsController\`.
- Public/read APIs never return sensitive values (secrets are redacted).

## How to change settings

### Admin UI

Open \`/admin/settings\` (or Admin → Settings). Categories:

${categories.map((c) => `- **${c.name}** (\`${c.id}\`) — ${c.description} (${c.settings_count} keys)`).join('\n')}

### HTTP API

\`\`\`http
GET  /api/admin/settings
GET  /api/admin/settings/categories
GET  /api/admin/settings/category/{category}
GET  /api/admin/settings/{setting}
PATCH /api/admin/settings   # JSON body: { "app_name": "My Panel", ... }
\`\`\`

Requires \`admin.settings.view\` / \`admin.settings.edit\` (or \`admin.root\`).

### CLI (production)

\`\`\`bash
featherpanel settings                 # interactive editor
featherpanel saas listsettings
featherpanel saas getsetting app_name
featherpanel saas setsetting app_name "My Panel"
\`\`\`

See [../cli/usage.md](../cli/usage.md).

## Boolean values

DB/API/CLI use string \`'true'\` / \`'false'\` (not JSON booleans).

## Totals

- ConfigInterface keys: **${Object.keys(constants).length}**
- Admin-editable settings with UI metadata: **${Object.keys(settings).length}**
- Categories: **${categories.length}**

## Full machine-readable dumps

- [all.json](./all.json) — settings + categories + constants
- [categories.json](./categories.json)
- [constants.json](./constants.json)
`;
}

function categoryMarkdown(category, settingsByKey) {
    const rows = category.setting_keys
        .map((key) => {
            const s = settingsByKey[key];
            if (!s) return `| \`${key}\` | — | — | — |`;
            const opts = s.options.length ? s.options.map((o) => `\`${o}\``).join(', ') : '—';
            return `| \`${key}\` | ${s.type} | ${s.description.replace(/\|/g, '\\|')} | ${opts} |`;
        })
        .join('\n');

    return `# Settings category: ${category.name}

- **Id:** \`${category.id}\`
- **Icon:** \`${category.icon}\`
- **Count:** ${category.settings_count}

${category.description}

| Key | Type | Description | Options |
| --- | --- | --- | --- |
${rows}
`;
}

function settingMarkdown(setting) {
    return `# Setting: \`${setting.key}\`

- **Constant:** \`ConfigInterface::${setting.constant}\`
- **Category:** \`${setting.category}\`
- **Type:** \`${setting.type}\`
- **Required:** ${setting.required ? 'yes' : 'no'}
- **Sensitive:** ${setting.sensitive ? 'yes' : 'no'}
- **Validation:** \`${setting.validation || '—'}\`
- **Placeholder / default hint:** \`${setting.placeholder || '—'}\`

## Description

${setting.description || '_No description_'}

## Allowed options

${setting.options.length ? setting.options.map((o) => `- \`${o}\``).join('\n') : '_Free-form / no fixed options_'}

## Change via CLI

\`\`\`bash
featherpanel saas getsetting ${setting.key}
featherpanel saas setsetting ${setting.key} "<value>"
\`\`\`

## Change via API

\`\`\`http
PATCH /api/admin/settings
Content-Type: application/json

{ "${setting.key}": "<value>" }
\`\`\`
`;
}

function indexMarkdown(categories, settings) {
    const catRows = categories
        .map(
            (c) =>
                `| \`${c.id}\` | ${c.name} | ${c.settings_count} | [md](./category-${c.id}.md) · [json](./category-${c.id}.json) |`,
        )
        .join('\n');

    return `# FeatherPanel settings

- [AI / ops guide](./guide.md)
- [all.json](./all.json)

## Categories

| Id | Name | Settings | Sources |
| --- | --- | --- | --- |
${catRows}

## All keys (${Object.keys(settings).length})

| Key | Category | Type | Description |
| --- | --- | --- | --- |
${Object.values(settings)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(
        (s) =>
            `| [\`${s.key}\`](./${s.key}.md) | \`${s.category}\` | \`${s.type}\` | ${s.description.replace(/\|/g, '\\|')} |`,
    )
    .join('\n')}
`;
}

function generateListPage(categories, settings) {
    const items = categories
        .map(
            (c) => `<li class="fp-item" data-fp-search-item data-fp-search-text="${escapeHtml(
                `${c.id} ${c.name} ${c.description} ${c.setting_keys.join(' ')}`,
            )}">
  <a href="${DOCS_BASE}/settings/category-${c.id}.html"><h2>${escapeHtml(c.name)}</h2></a>
  <p class="fp-muted"><code>${escapeHtml(c.id)}</code> · ${c.settings_count} settings · ${escapeHtml(c.description)}</p>
  <div class="fp-formats">
    <a href="${DOCS_BASE}/settings/category-${c.id}.md">Markdown</a>
    <a href="${DOCS_BASE}/settings/category-${c.id}.json">JSON</a>
  </div>
</li>`,
        )
        .join('\n');

    const body = `${hero({
        title: 'Admin settings',
        subtitle:
            'Every ConfigInterface key and SettingsController field (types, options, categories). Ideal for RAG and support bots.',
        badges: [`${Object.keys(settings).length} settings`, `${categories.length} categories`],
        formats: [
            { href: `${DOCS_BASE}/settings/guide.md`, label: 'guide.md' },
            { href: `${DOCS_BASE}/settings/all.json`, label: 'all.json' },
            { href: `${DOCS_BASE}/settings/index.md`, label: 'index.md' },
        ],
    })}
<input class="fp-search" type="search" placeholder="Filter categories…" data-fp-search />
<p class="fp-muted fp-hidden" data-fp-search-empty>No categories match.</p>
<ul class="fp-list">
${items}
</ul>`;

    return renderDocsPage({
        title: 'Settings',
        active: 'settings',
        body,
        includeSearchScript: true,
    });
}

function generateCategoryPage(category, settingsByKey) {
    const rows = category.setting_keys
        .map((key) => {
            const s = settingsByKey[key];
            return `<tr data-fp-search-item data-fp-search-text="${escapeHtml(
                `${key} ${s?.description || ''} ${s?.type || ''}`,
            )}">
  <td><a href="${DOCS_BASE}/settings/${escapeHtml(key)}.html"><code>${escapeHtml(key)}</code></a></td>
  <td>${escapeHtml(s?.type || '—')}</td>
  <td>${escapeHtml(s?.description || '—')}</td>
</tr>`;
        })
        .join('\n');

    const body = `<a class="fp-back" href="${DOCS_BASE}/settings/">&larr; All settings</a>
${hero({
    title: escapeHtml(category.name),
    subtitle: escapeHtml(category.description),
    badges: [`${category.settings_count} keys`, category.id],
    formats: [
        { href: `${DOCS_BASE}/settings/category-${category.id}.md`, label: 'Markdown' },
        { href: `${DOCS_BASE}/settings/category-${category.id}.json`, label: 'JSON' },
    ],
})}
<input class="fp-search" type="search" placeholder="Filter keys…" data-fp-search />
<table class="fp-table">
  <thead><tr><th>Key</th><th>Type</th><th>Description</th></tr></thead>
  <tbody>${rows}</tbody>
</table>`;

    return renderDocsPage({
        title: `Settings: ${category.name}`,
        active: 'settings',
        body,
        includeSearchScript: true,
    });
}

function generateSettingPage(setting) {
    const body = `<a class="fp-back" href="${DOCS_BASE}/settings/category-${escapeHtml(setting.category)}.html">&larr; ${escapeHtml(setting.category)}</a>
${hero({
    title: `<code>${escapeHtml(setting.key)}</code>`,
    subtitle: escapeHtml(setting.description || 'Admin setting'),
    badges: [
        setting.type,
        setting.required ? 'required' : 'optional',
        setting.sensitive ? 'sensitive' : 'public-ok',
    ].filter(Boolean),
    formats: [
        { href: `${DOCS_BASE}/settings/${setting.key}.md`, label: 'Markdown' },
        { href: `${DOCS_BASE}/settings/${setting.key}.json`, label: 'JSON' },
    ],
})}
<section class="fp-section fp-card">
  <h2>Details</h2>
  <ul>
    <li>Category: <code>${escapeHtml(setting.category)}</code></li>
    <li>Constant: <code>ConfigInterface::${escapeHtml(setting.constant)}</code></li>
    <li>Validation: <code>${escapeHtml(setting.validation || '—')}</code></li>
    <li>Placeholder: <code>${escapeHtml(setting.placeholder || '—')}</code></li>
  </ul>
  ${
      setting.options.length
          ? `<p>Options: ${setting.options.map((o) => `<code>${escapeHtml(o)}</code>`).join(', ')}</p>`
          : ''
  }
</section>
<section class="fp-section fp-card">
  <h2>CLI</h2>
  <pre><code>featherpanel saas getsetting ${escapeHtml(setting.key)}
featherpanel saas setsetting ${escapeHtml(setting.key)} "&lt;value&gt;"</code></pre>
</section>`;

    return renderDocsPage({
        title: `Setting: ${setting.key}`,
        active: 'settings',
        body,
    });
}

ensureDir(SETTINGS_DOCS_DIR);

console.log('Extracting admin settings / ConfigInterface…');
const configSource = fs.readFileSync(CONFIG_INTERFACE, 'utf8');
const controllerSource = fs.readFileSync(SETTINGS_CONTROLLER, 'utf8');
const constants = parseConfigConstants(configSource);
const categories = parseCategories(controllerSource, constants);
const settings = parseSettingDefinitions(controllerSource, constants);
const sensitive = parseSensitiveList(controllerSource, constants);
sensitive.forEach((key) => {
    if (settings[key]) settings[key].sensitive = true;
});

// Attach orphan ConfigInterface keys (no UI metadata) under "constants-only"
const uiKeys = new Set(Object.keys(settings));
const orphanKeys = Object.entries(constants)
    .filter(([, key]) => !uiKeys.has(key))
    .map(([constant, key]) => ({ key, constant }));

writeText(path.join(SETTINGS_DOCS_DIR, 'index.html'), generateListPage(categories, settings));
writeMarkdown(path.join(SETTINGS_DOCS_DIR, 'index.md'), indexMarkdown(categories, settings));
writeMarkdown(path.join(SETTINGS_DOCS_DIR, 'guide.md'), settingsGuideMarkdown(categories, settings, constants));
writeJson(path.join(SETTINGS_DOCS_DIR, 'categories.json'), {
    type: 'featherpanel.settings.categories',
    total: categories.length,
    categories,
});
writeJson(path.join(SETTINGS_DOCS_DIR, 'constants.json'), {
    type: 'featherpanel.settings.constants',
    total: Object.keys(constants).length,
    constants: Object.entries(constants)
        .map(([constant, key]) => ({ constant, key }))
        .sort((a, b) => a.key.localeCompare(b.key)),
    without_ui_metadata: orphanKeys,
});
writeJson(path.join(SETTINGS_DOCS_DIR, 'all.json'), {
    type: 'featherpanel.settings.all',
    generated_at: new Date().toISOString(),
    totals: {
        categories: categories.length,
        settings: Object.keys(settings).length,
        constants: Object.keys(constants).length,
        sensitive: sensitive.length,
        constants_without_ui: orphanKeys.length,
    },
    api: {
        list: 'GET /api/admin/settings',
        categories: 'GET /api/admin/settings/categories',
        by_category: 'GET /api/admin/settings/category/{category}',
        one: 'GET /api/admin/settings/{setting}',
        update: 'PATCH /api/admin/settings',
    },
    cli: {
        interactive: 'featherpanel settings',
        list: 'featherpanel saas listsettings',
        get: 'featherpanel saas getsetting <key>',
        set: 'featherpanel saas setsetting <key> <value>',
    },
    categories,
    settings: Object.values(settings).sort((a, b) => a.key.localeCompare(b.key)),
    sensitive_keys: sensitive,
    constants,
});
writeJson(path.join(SETTINGS_DOCS_DIR, 'index.json'), {
    type: 'featherpanel.settings.index',
    total: Object.keys(settings).length,
    categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        settings_count: c.settings_count,
    })),
});

categories.forEach((category) => {
    writeText(path.join(SETTINGS_DOCS_DIR, `category-${category.id}.html`), generateCategoryPage(category, settings));
    writeJson(path.join(SETTINGS_DOCS_DIR, `category-${category.id}.json`), {
        type: 'featherpanel.settings.category',
        ...category,
        settings: category.setting_keys.map((key) => settings[key]).filter(Boolean),
    });
    writeMarkdown(path.join(SETTINGS_DOCS_DIR, `category-${category.id}.md`), categoryMarkdown(category, settings));
});

Object.values(settings).forEach((setting) => {
    writeText(path.join(SETTINGS_DOCS_DIR, `${setting.key}.html`), generateSettingPage(setting));
    writeJson(path.join(SETTINGS_DOCS_DIR, `${setting.key}.json`), {
        type: 'featherpanel.settings.key',
        ...setting,
    });
    writeMarkdown(path.join(SETTINGS_DOCS_DIR, `${setting.key}.md`), settingMarkdown(setting));
});

console.log(
    `✅ Settings docs ready (${Object.keys(settings).length} UI settings, ${Object.keys(constants).length} constants, ${categories.length} categories)`,
);
console.log(`   - ${DOCS_BASE}/settings/`);
console.log(`   - ${DOCS_BASE}/settings/all.json`);
console.log(`   - ${DOCS_BASE}/settings/guide.md`);
