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

const APP_ROOT = path.join(__dirname, '../src/app/(app)');
const LOCALES_EN = path.join(__dirname, '../public/locales/en.json');
const NAV_CONFIG = path.join(__dirname, '../src/config/navigation.tsx');
const PUBLIC_DOCS_DIR = path.join(__dirname, '../public/icanhasfeatherpanel');
const PAGES_DOCS_DIR = path.join(PUBLIC_DOCS_DIR, 'pages');

const WIDGET_SLUG_REGEX = /usePluginWidgets\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const WEBSPACE_PAGE_ID_REGEX = /WebSpacePageWidgets\s+pageId\s*=\s*['"]([^'"]+)['"]/g;
const T_CALL_REGEX = /\bt\(\s*['"]([^'"]+)['"]/g;
const API_PATH_REGEX = /['"`](\/api\/[a-zA-Z0-9_./{}:-]+)['"`]/g;
const HOOK_REGEX = /\buse([A-Z][A-Za-z0-9]+)\b/g;
const IMPORT_API_REGEX = /from\s+['"]@\/lib\/([a-zA-Z0-9_-]+-api)['"]/g;

const AREA_AUDIENCE = {
    admin: 'Panel administrators (requires admin permissions)',
    server: 'Server owners / subusers with the relevant server permission',
    webspace: 'WebSpace owners / users with webspace access',
    webspaces: 'Users managing WebSpaces from the dashboard',
    vds: 'VDS / virtual machine owners',
    dashboard: 'Logged-in end users',
    auth: 'Unauthenticated or authenticating visitors',
    account: 'Logged-in users managing their own account',
    knowledgebase: 'Users (and optionally public visitors) reading help articles',
    plugin: 'Users opening a plugin-provided UI route',
    other: 'Panel users',
    root: 'Panel users',
};

const AREA_NAV_HINT = {
    admin: 'Admin sidebar',
    server: 'Server sidebar (open a server first)',
    webspace: 'WebSpace sidebar (open a webspace first)',
    webspaces: 'Dashboard → WebSpaces',
    vds: 'VDS sidebar (open a VDS first)',
    dashboard: 'User dashboard',
    auth: 'Auth screens (login/register/etc.)',
    account: 'Account area',
    knowledgebase: 'Knowledgebase',
    plugin: 'Plugin route',
    other: 'Panel UI',
    root: 'Panel UI',
};

function walkPages(directory, acc = []) {
    if (!fs.existsSync(directory)) return acc;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) walkPages(full, acc);
        else if (entry.name === 'page.tsx') acc.push(full);
    }
    return acc;
}

function routeFromFile(filePath) {
    const relDir = path.relative(APP_ROOT, path.dirname(filePath));
    const parts = relDir.split(path.sep).filter((part) => part && !part.startsWith('('));
    return '/' + parts.join('/');
}

function areaForRoute(route) {
    if (route === '/' || route === '') return 'root';
    const first = route.split('/').filter(Boolean)[0] || 'other';
    const known = new Set([
        'admin',
        'server',
        'webspace',
        'webspaces',
        'vds',
        'dashboard',
        'auth',
        'account',
        'knowledgebase',
        'plugin',
    ]);
    return known.has(first) ? first : 'other';
}

function fileSlug(route) {
    if (route === '/') return 'root';
    return route
        .replace(/^\//, '')
        .replace(/\[\[\.\.\.([^\]]+)\]\]/g, 'catch-$1')
        .replace(/\[\.\.\.([^\]]+)\]/g, 'splat-$1')
        .replace(/\[([^\]]+)\]/g, 'param-$1')
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function titleizeSegment(segment) {
    if (!segment) return '';
    if (segment.startsWith('[') && segment.endsWith(']')) {
        const inner = segment.replace(/^\[+|\]+$/g, '').replace(/^\.\.\./, '');
        return `{${inner}}`;
    }
    return segment
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function titleFromRoute(route) {
    const parts = route.split('/').filter(Boolean);
    if (!parts.length) return 'Home';
    // Prefer the last non-dynamic meaningful segment, with parent context
    const staticParts = parts.filter((p) => !p.startsWith('['));
    if (!staticParts.length) return parts.map(titleizeSegment).join(' / ');
    const leaf = titleizeSegment(staticParts[staticParts.length - 1]);
    if (staticParts.length === 1) return leaf;
    const parent = titleizeSegment(staticParts[staticParts.length - 2]);
    // Avoid "Admin / Admin"
    if (parent.toLowerCase() === leaf.toLowerCase()) return leaf;
    return `${parent} · ${leaf}`;
}

function loadTranslations() {
    if (!fs.existsSync(LOCALES_EN)) return {};
    return JSON.parse(fs.readFileSync(LOCALES_EN, 'utf8'));
}

function tLookup(dict, key) {
    if (!key) return null;
    const parts = key.split('.');
    let cur = dict;
    for (const part of parts) {
        if (cur == null || typeof cur !== 'object') return null;
        cur = cur[part];
    }
    return typeof cur === 'string' ? cur : null;
}

function resolveExpr(expr, dict) {
    if (!expr) return null;
    const trimmed = expr.trim();
    const tMatch = trimmed.match(/^t\(\s*['"]([^'"]+)['"]/);
    if (tMatch) return tLookup(dict, tMatch[1]) || null;
    const strMatch = trimmed.match(/^['"`]([^'"`]+)['"`]$/);
    if (strMatch) return strMatch[1];
    // template literals like `Hello ${x}` — keep raw without interpolation
    const tmpl = trimmed.match(/^`([^`$]+)`$/);
    if (tmpl) return tmpl[1];
    return null;
}

function extractPageHeaderFields(content, dict) {
    const blockMatch = content.match(/<PageHeader\b([\s\S]*?)(?:\/>|>)/);
    if (!blockMatch) return { title: null, description: null, title_key: null, description_key: null };

    const attrs = blockMatch[1];
    const titleAttr = attrs.match(/\btitle\s*=\s*\{([\s\S]*?)\}/);
    const descAttr =
        attrs.match(/\bdescription\s*=\s*\{([\s\S]*?)\}/) || attrs.match(/\bsubtitle\s*=\s*\{([\s\S]*?)\}/);

    const titleExpr = titleAttr?.[1]?.trim() || null;
    const descExpr = descAttr?.[1]?.trim() || null;
    const titleKey = titleExpr?.match(/^t\(\s*['"]([^'"]+)['"]/)?.[1] || null;
    const descKey = descExpr?.match(/^t\(\s*['"]([^'"]+)['"]/)?.[1] || null;

    return {
        title: resolveExpr(titleExpr, dict),
        description: resolveExpr(descExpr, dict),
        title_key: titleKey,
        description_key: descKey,
    };
}

/**
 * Fallback for pages without PageHeader (auth shells, thin wrappers).
 * Tries conventional i18n keys derived from the route.
 */
function inferI18nFromRoute(route, dict, content) {
    const parts = route.split('/').filter((p) => p && !p.startsWith('['));
    const candidates = [];

    if (parts[0] === 'auth' && parts[1]) {
        const leaf = parts[1].replace(/-/g, '_');
        candidates.push(
            [`auth.${leaf}.title`, `auth.${leaf}.subtitle`],
            [`auth.${leaf}.title`, `auth.${leaf}.description`],
        );
    }

    // Generic: namespace from last static segment(s)
    if (parts.length >= 1) {
        const leaf = parts[parts.length - 1].replace(/-/g, '_');
        const parent = parts.length >= 2 ? parts[parts.length - 2].replace(/-/g, '_') : null;
        candidates.push([`${leaf}.title`, `${leaf}.subtitle`], [`${leaf}.title`, `${leaf}.description`]);
        if (parent) {
            candidates.push(
                [`${parent}.${leaf}.title`, `${parent}.${leaf}.subtitle`],
                [`${parent}.${leaf}.title`, `${parent}.${leaf}.description`],
                [`${parent}.title`, `${parent}.subtitle`],
            );
        }
    }

    // Also try first t('….title') / t('….subtitle|description') actually used in the file
    const usedKeys = [...content.matchAll(T_CALL_REGEX)].map((m) => m[1]);
    const usedTitle = usedKeys.find((k) => /\.title$/i.test(k));
    const usedDesc = usedKeys.find((k) => /\.(subtitle|description)$/i.test(k));
    if (usedTitle) candidates.unshift([usedTitle, usedDesc || null]);

    for (const [titleKey, descKey] of candidates) {
        const title = titleKey ? tLookup(dict, titleKey) : null;
        if (!title) continue;
        const description = descKey ? tLookup(dict, descKey) : null;
        return {
            title,
            description,
            title_key: titleKey,
            description_key: description ? descKey : null,
        };
    }
    return { title: null, description: null, title_key: null, description_key: null };
}

function extractWidgetSlugs(content) {
    return [
        ...[...content.matchAll(WIDGET_SLUG_REGEX)].map((m) => m[1]),
        ...[...content.matchAll(WEBSPACE_PAGE_ID_REGEX)].map((m) => m[1]),
    ].sort();
}

function extractComponentName(content) {
    const m =
        content.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/) ||
        content.match(/function\s+([A-Za-z0-9_]+Page)\s*\(/) ||
        content.match(/const\s+([A-Za-z0-9_]+Page)\s*=/);
    return m?.[1] || null;
}

function extractTranslationLabels(content, dict, { excludeKeys = new Set() } = {}) {
    const labels = [];
    const seen = new Set();
    for (const match of content.matchAll(T_CALL_REGEX)) {
        const key = match[1];
        if (excludeKeys.has(key) || seen.has(key)) continue;
        // Prefer action / section / empty-state keys
        if (
            !/(title|subtitle|description|action|button|tab|section|empty|heading|label|menu|nav|overview|status|toast|confirm)/i.test(
                key,
            ) &&
            !/\.(create|edit|delete|save|update|install|check|upload|download|new|list|manage)$/i.test(key)
        ) {
            continue;
        }
        const value = tLookup(dict, key);
        if (!value || value.length > 160) continue;
        // Skip raw placeholder-only strings
        if (/^\{[a-zA-Z0-9_]+\}$/.test(value.trim())) continue;
        seen.add(key);
        labels.push({ key, value });
        if (labels.length >= 32) break;
    }
    return labels;
}

function extractApiPaths(content) {
    return [...new Set([...content.matchAll(API_PATH_REGEX)].map((m) => m[1]))].sort().slice(0, 20);
}

function extractHooks(content) {
    const skip = new Set([
        'State',
        'Effect',
        'Memo',
        'Callback',
        'Ref',
        'Context',
        'Reducer',
        'Id',
        'LayoutEffect',
        'ImperativeHandle',
        'DeferredValue',
        'Transition',
        'SyncExternalStore',
        'DebugValue',
        'Router',
        'Pathname',
        'SearchParams',
        'Params',
        'Translation',
    ]);
    const hooks = new Set();
    for (const match of content.matchAll(HOOK_REGEX)) {
        if (skip.has(match[1])) continue;
        hooks.add(`use${match[1]}`);
    }
    return [...hooks].sort().slice(0, 16);
}

function extractApiModules(content) {
    return [...new Set([...content.matchAll(IMPORT_API_REGEX)].map((m) => m[1]))].sort();
}

function normalizePermission(raw) {
    if (!raw) return null;
    if (raw.includes('.')) return raw;
    // Permissions.ADMIN_SETTINGS_VIEW → admin.settings.view
    return raw.toLowerCase().replace(/_/g, '.');
}

function extractObjectAround(source, indexInside) {
    // Walk backwards to the '{' that opens the object containing indexInside.
    let depth = 0;
    let start = -1;
    for (let i = indexInside; i >= 0; i--) {
        const ch = source[i];
        if (ch === '}') depth++;
        else if (ch === '{') {
            if (depth === 0) {
                start = i;
                break;
            }
            depth--;
        }
    }
    if (start < 0) return null;

    depth = 0;
    for (let i = start; i < source.length; i++) {
        const ch = source[i];
        if (ch === '{') depth++;
        else if (ch === '}') {
            depth--;
            if (depth === 0) return source.slice(start + 1, i);
        }
    }
    return null;
}

function parseNavigation(navSource, dict) {
    /** @type {Map<string, object>} */
    const byUrl = new Map();
    if (!navSource) return byUrl;

    const urlRe = /\burl\s*:\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = urlRe.exec(navSource)) !== null) {
        const url = match[1];
        const body = extractObjectAround(navSource, match.index);
        if (!body) continue;

        // Only read first-level-ish fields from this object body (ignore nested items arrays
        // by cutting at the first `items:` block if present after our fields — usually items
        // come after url on parents; for leaves there is no items).
        const leafBody = body.split(/\bitems\s*:/)[0];

        const titleKey =
            leafBody.match(/\btitle\s*:\s*t\(\s*['"]([^'"]+)['"]\s*\)/)?.[1] ||
            leafBody.match(/\bname\s*:\s*t\(\s*['"]([^'"]+)['"]\s*\)/)?.[1] ||
            null;
        const id = leafBody.match(/\bid\s*:\s*['"]([^'"]+)['"]/)?.[1] || null;
        const permissionRaw =
            leafBody.match(/\bpermission\s*:\s*Permissions\.([A-Z0-9_]+)/)?.[1] ||
            leafBody.match(/\bpermission\s*:\s*['"]([^'"]+)['"]/)?.[1] ||
            null;
        const permission = normalizePermission(permissionRaw);
        const group = leafBody.match(/\bgroup\s*:\s*['"]([^'"]+)['"]/)?.[1] || null;
        const category = leafBody.match(/\bcategory\s*:\s*['"]([^'"]+)['"]/)?.[1] || null;
        const title = titleKey ? tLookup(dict, titleKey) : null;

        // Prefer leaf entries (have permission + no nested items) over parent section entries
        const isParent = /\bitems\s*:/.test(body);
        const prev = byUrl.get(url);
        const next = {
            id,
            url,
            title,
            title_key: titleKey,
            permission,
            group,
            category,
            is_parent: isParent,
        };
        if (!prev) {
            byUrl.set(url, next);
            continue;
        }
        // Prefer non-parent / with permission / with title
        if (prev.is_parent && !isParent) byUrl.set(url, next);
        else if (!prev.permission && permission) byUrl.set(url, next);
        else if (!prev.title && title) byUrl.set(url, next);
    }
    return byUrl;
}

function findNavForRoute(route, navByUrl) {
    if (navByUrl.has(route)) return navByUrl.get(route);

    // Fallback for child screens (create/edit/view) → nearest static parent nav item.
    // Never fall back to bare area roots like /admin or /dashboard.
    const parts = route.split('/').filter(Boolean);
    for (let i = parts.length - 1; i >= 2; i--) {
        const staticParts = parts.slice(0, i).filter((p) => !p.startsWith('['));
        if (staticParts.length < 2) continue;
        const candidate = '/' + staticParts.join('/');
        if (navByUrl.has(candidate)) return { ...navByUrl.get(candidate), inherited: true };
    }
    return null;
}

function enrichDescription(page, headerDescription) {
    if (
        headerDescription &&
        headerDescription !== 'Description' &&
        !/^FeatherPanel .+ page at /.test(headerDescription) &&
        !/^FeatherPanel .+ page\. Route:/.test(headerDescription)
    ) {
        // Clean i18n placeholders for RAG readability
        return headerDescription
            .replace(/\{directory\}/g, 'the current directory')
            .replace(/\{file\}/g, 'the selected file')
            .replace(/\{path\}/g, 'the file path')
            .replace(/\{[a-zA-Z0-9_]+\}/g, (m) => m.slice(1, -1));
    }

    // Catch-all / special routes
    if (page.route.includes('[[...pluginPath]]') || page.route.includes('[...pluginPath]')) {
        return `Plugin-provided UI route inside the ${page.area} area. The path after the resource id is owned by an installed plugin.`;
    }
    if (page.route === '/admin/[...pluginPath]') {
        return 'Catch-all admin route for plugin pages registered under /admin/*.';
    }
    if (page.route === '/[...publicPluginPath]') {
        return 'Catch-all public route for plugin pages that do not require a server/webspace context.';
    }
    if (page.route === '/') {
        return 'App root / landing redirect into the dashboard or auth flow depending on session.';
    }
    if (page.route === '/maintenance') {
        return 'Shown when the panel is in maintenance mode; blocks normal user access.';
    }
    if (page.route === '/status') {
        return 'Public/user status page for infrastructure health (controlled by status_page_* settings).';
    }
    if (page.route === '/preferences') {
        return 'User appearance and preference settings (theme, locale, accent, etc.).';
    }
    if (page.route.startsWith('/knowledgebase')) {
        return 'Knowledgebase help center for browsing categories and articles.';
    }
    if (page.route === '/admin/dev/logs') {
        return 'Developer tools: view and stream panel application logs.';
    }
    if (page.route === '/admin/feathercloud/plugins') {
        return 'Mythic / FeatherCloud plugin catalog — browse and install store plugins.';
    }
    if (page.route.startsWith('/admin/feathercloud/products/')) {
        return 'FeatherCloud product detail page for a store listing (slug param).';
    }
    if (page.route === '/admin/tickets/[uuid]') {
        return 'Admin view of a single support ticket thread.';
    }
    if (page.route === '/admin/dev/plugins/create') {
        return 'Developer tools: scaffold / create a new FeatherPanel plugin.';
    }

    const leaf = page.route.split('/').filter(Boolean).pop() || '';
    const actionHints = {
        create: 'Create form for a new resource.',
        new: 'Create form for a new resource.',
        edit: 'Edit form for an existing resource.',
        update: 'Update form for an existing resource.',
        view: 'Detail / view screen for a resource.',
        login: 'User login screen (local, OAuth, passkey, LDAP, email code as configured).',
        register: 'User registration screen (if registration is enabled in settings).',
        logout: 'Logs the current user out and clears the session.',
        'forgot-password': 'Password reset request screen.',
        'reset-password': 'Set a new password from a reset token.',
        'verify-email': 'Email verification screen.',
        qr: 'QR / device login approval screen.',
        trash: 'Deleted-files trash bin for this resource.',
        ide: 'Full-screen code IDE for server files.',
    };

    if (actionHints[leaf]) {
        const parentTitle = page.nav?.title || titleFromRoute(page.route.replace(/\/[^/]+$/, '') || page.route);
        return `${actionHints[leaf]} Related to: ${parentTitle}.`;
    }

    if (page.nav?.title) {
        return `${page.nav.title} screen in FeatherPanel (${page.area} area). Use this page to manage ${page.nav.title.toLowerCase()}.`;
    }

    return `FeatherPanel ${page.area} UI page at \`${page.route}\`.`;
}

function buildSummary(page) {
    const bits = [];
    bits.push(`**${page.title}**`);
    bits.push(page.description);
    if (page.nav?.title && page.nav.title !== page.title && !page.nav.inherited) {
        bits.push(`Sidebar label: “${page.nav.title}”.`);
    } else if (page.nav?.title && page.nav.inherited && page.nav.title !== page.title) {
        bits.push(`Under sidebar item “${page.nav.title}”.`);
    }
    if (page.nav?.permission) {
        bits.push(`Requires permission \`${page.nav.permission}\`.`);
    }
    if (page.features.length) {
        bits.push(`Key UI: ${page.features.slice(0, 6).join('; ')}.`);
    }
    return bits.join(' ');
}

function buildGuide(page) {
    const navHint = AREA_NAV_HINT[page.area] || 'the panel';
    const label = page.title || page.nav?.title || titleFromRoute(page.route);
    const steps = [];
    steps.push(`1. Open ${navHint}.`);
    if (page.nav?.title && page.nav.title !== label) {
        steps.push(
            `2. Open **${page.nav.title}**${page.nav.inherited ? ' (parent nav item)' : ''}, then **${label}**.`,
        );
    } else {
        steps.push(`2. Go to **${label}**.`);
    }
    steps.push(`3. Direct URL: \`${page.route}\`.`);
    let n = 4;
    if (page.params.length) {
        steps.push(
            `${n}. Replace path params ${page.params.map((p) => `\`${p}\``).join(', ')} with the real resource id(s).`,
        );
        n++;
    }
    if (page.nav?.permission) {
        const needsRootHint = page.area === 'admin' && page.nav.permission !== 'admin.root';
        steps.push(
            `${n}. User needs permission \`${page.nav.permission}\`${needsRootHint ? ' (or `admin.root`)' : ''}.`,
        );
    }
    return steps.join('\n');
}

function collectPages(dict, navByUrl) {
    const files = walkPages(APP_ROOT);
    const pages = files.map((filePath) => {
        const content = fs.readFileSync(filePath, 'utf8');
        const route = routeFromFile(filePath);
        const source = path.relative(path.join(__dirname, '..'), filePath).replace(/\\/g, '/');
        const area = areaForRoute(route);
        let header = extractPageHeaderFields(content, dict);
        if (!header.title) {
            const inferred = inferI18nFromRoute(route, dict, content);
            header = {
                title: inferred.title,
                description: header.description || inferred.description,
                title_key: inferred.title_key,
                description_key: header.description_key || inferred.description_key,
            };
        } else if (!header.description) {
            const inferred = inferI18nFromRoute(route, dict, content);
            if (inferred.description) {
                header.description = inferred.description;
                header.description_key = inferred.description_key;
            }
        }
        const nav = findNavForRoute(route, navByUrl);
        const widgetSlugs = [...new Set(extractWidgetSlugs(content))];
        const params = [...route.matchAll(/\[+([^\]]+)\]+/g)].map((m) => m[1].replace(/^\.\.\./, ''));
        const component = extractComponentName(content);
        const excludeKeys = new Set([header.title_key, header.description_key].filter(Boolean));
        const labels = extractTranslationLabels(content, dict, { excludeKeys });
        const sections = labels
            .filter((l) => /\.title$/i.test(l.key) && l.key !== header.title_key)
            .map((l) => l.value)
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .slice(0, 10);
        const features = labels
            .filter((l) => !/\.(title|subtitle)$/i.test(l.key))
            // Prefer short actionable labels over long toast templates
            .filter((l) => l.value.length <= 80 && !/\{[a-zA-Z0-9_]+\}/.test(l.value))
            .map((l) => l.value)
            .filter((v, i, arr) => arr.indexOf(v) === i)
            .slice(0, 12);

        // Prefer page-specific title; for inherited nav on create/edit, keep route-based leaf title
        let title = header.title || null;
        if (!title && nav?.title && !nav.inherited) title = nav.title;
        if (!title) title = titleFromRoute(route);
        // Clean placeholders in titles
        title = title
            .replace(/\{file\}/g, 'file')
            .replace(/\{directory\}/g, 'directory')
            .replace(/\{path\}/g, 'path')
            .replace(/\{[a-zA-Z0-9_]+\}/g, (m) => m.slice(1, -1));

        const page = {
            route,
            area,
            file_slug: fileSlug(route),
            source,
            dynamic: /\[/.test(route),
            params,
            title,
            description: '', // filled below
            title_key: header.title_key || (!nav?.inherited ? nav?.title_key : null) || null,
            description_key: header.description_key || null,
            component,
            audience: AREA_AUDIENCE[area] || AREA_AUDIENCE.other,
            nav: nav
                ? {
                      id: nav.id,
                      title: nav.title,
                      title_key: nav.title_key,
                      permission: nav.permission,
                      group: nav.group,
                      category: nav.category,
                      matched_url: nav.url,
                      inherited: Boolean(nav.inherited),
                  }
                : null,
            widget_slugs: widgetSlugs,
            sections,
            features,
            ui_labels: labels,
            hooks: extractHooks(content),
            api_modules: extractApiModules(content),
            api_paths: extractApiPaths(content),
        };

        page.description = enrichDescription(page, header.description);
        page.summary = buildSummary(page);
        page.how_to_guide_users = buildGuide(page);
        return page;
    });

    pages.sort(
        (a, b) =>
            a.area.localeCompare(b.area) || Number(a.dynamic) - Number(b.dynamic) || a.route.localeCompare(b.route),
    );

    return pages;
}

function pagesIndexMarkdown(pages) {
    const byArea = {};
    pages.forEach((p) => {
        if (!byArea[p.area]) byArea[p.area] = [];
        byArea[p.area].push(p);
    });

    const sections = Object.keys(byArea)
        .sort()
        .map((area) => {
            const rows = byArea[area]
                .map(
                    (p) =>
                        `| \`${p.route}\` | ${p.title.replace(/\|/g, '\\|')} | ${(p.description || '').replace(/\|/g, '\\|').slice(0, 120)} | [md](./${p.file_slug}.md) |`,
                )
                .join('\n');
            return `## ${area}\n\n| Route | Title | What it is | Doc |\n| --- | --- | --- | --- |\n${rows}`;
        })
        .join('\n\n');

    return `# FeatherPanel frontend pages

Every Next.js UI route with **title**, **description**, audience, permissions, and AI guidance.

Total: **${pages.length}** routes.

- [all.json](./all.json) — full machine-readable dump (preferred for RAG)
- [index.json](./index.json)
- Widget injection slugs: [../widgets/index.md](../widgets/index.md)

Use \`title\` / \`description\` / \`how_to_guide_users\` when telling users where to click.
Dynamic segments like \`[uuidShort]\` are path parameters.

${sections}
`;
}

function pageMarkdown(page) {
    const features =
        page.features.length > 0 ? page.features.map((f) => `- ${f}`).join('\n') : '_No action labels extracted._';
    const widgets = page.widget_slugs.length
        ? page.widget_slugs.map((s) => `- [\`${s}\`](../widgets/${s.replace(/[^a-zA-Z0-9-_]+/g, '-')}.md)`).join('\n')
        : '_None detected._';
    const apis = page.api_paths.length
        ? page.api_paths.map((p) => `- \`${p}\``).join('\n')
        : page.api_modules.length
          ? page.api_modules.map((m) => `- module \`@/lib/${m}\``).join('\n')
          : '_None detected in page source._';

    return `# ${page.title}

> ${page.description}

## Identity

| Field | Value |
| --- | --- |
| Route | \`${page.route}\` |
| Area | ${page.area} |
| Audience | ${page.audience} |
| Component | \`${page.component || '—'}\` |
| Source | \`${page.source}\` |
| Dynamic | ${page.dynamic ? 'yes' : 'no'} |
${page.params.length ? `| Params | ${page.params.map((p) => `\`${p}\``).join(', ')} |` : ''}
${page.title_key ? `| Title i18n key | \`${page.title_key}\` |` : ''}
${page.description_key ? `| Description i18n key | \`${page.description_key}\` |` : ''}
${page.nav?.permission ? `| Permission | \`${page.nav.permission}\` |` : ''}
${page.nav?.group ? `| Nav group | \`${page.nav.group}\` |` : ''}
${page.nav?.title ? `| Sidebar label | ${page.nav.title} |` : ''}

## Summary (for AI)

${page.summary}

## How to guide users

${page.how_to_guide_users}

## Sections on this page

${page.sections.length ? page.sections.map((s) => `- ${s}`).join('\n') : '_None extracted._'}

## Notable UI actions / labels

${features}

## Widget slugs

${widgets}

## Related APIs / hooks

${apis}

${page.hooks.length ? `Hooks: ${page.hooks.map((h) => `\`${h}\``).join(', ')}` : ''}
`;
}

function generateListPage(pages) {
    const areas = [...new Set(pages.map((p) => p.area))].sort();
    const withTitles = pages.filter((p) => p.title_key || p.nav?.title).length;
    const items = pages
        .map((page) => {
            const widgets = page.widget_slugs.length
                ? page.widget_slugs
                      .slice(0, 3)
                      .map((s) => `<span class="fp-badge">${escapeHtml(s)}</span>`)
                      .join(' ')
                : '';
            return `<li class="fp-item" data-fp-search-item data-fp-search-text="${escapeHtml(
                `${page.route} ${page.title} ${page.description} ${page.area} ${page.widget_slugs.join(' ')} ${page.nav?.permission || ''}`,
            )}">
  <a href="${DOCS_BASE}/pages/${page.file_slug}.html"><h2>${escapeHtml(page.title)}</h2></a>
  <p><code>${escapeHtml(page.route)}</code></p>
  <p class="fp-muted">${escapeHtml(page.description)}</p>
  <div class="fp-meta">
    <span class="fp-badge">${escapeHtml(page.area)}</span>
    ${page.nav?.permission ? `<span class="fp-badge">${escapeHtml(page.nav.permission)}</span>` : ''}
    ${widgets}
  </div>
  <div class="fp-formats">
    <a href="${DOCS_BASE}/pages/${page.file_slug}.md">Markdown</a>
    <a href="${DOCS_BASE}/pages/${page.file_slug}.json">JSON</a>
  </div>
</li>`;
        })
        .join('\n');

    const body = `${hero({
        title: 'Frontend pages',
        subtitle:
            'Every UI route with title, description, audience, permissions, and how-to-guide-users text for RAG / support AIs.',
        badges: [`${pages.length} routes`, `${withTitles} titled`, `${areas.length} areas`],
        formats: [
            { href: `${DOCS_BASE}/pages/all.json`, label: 'all.json' },
            { href: `${DOCS_BASE}/pages/index.md`, label: 'index.md' },
            { href: `${DOCS_BASE}/widgets/`, label: 'Widgets' },
        ],
    })}
<input class="fp-search" type="search" placeholder="Filter by title, route, description, permission…" data-fp-search />
<p class="fp-muted fp-hidden" data-fp-search-empty>No pages match.</p>
<ul class="fp-list">
${items}
</ul>`;

    return renderDocsPage({
        title: 'Pages',
        active: 'pages',
        body,
        includeSearchScript: true,
    });
}

function generateDetailPage(page) {
    const features = page.features.length
        ? `<ul>${page.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('\n')}</ul>`
        : '<p class="fp-muted">No action labels extracted.</p>';
    const widgets = page.widget_slugs.length
        ? `<ul>${page.widget_slugs
              .map(
                  (s) =>
                      `<li><a href="${DOCS_BASE}/widgets/${escapeHtml(s.replace(/[^a-zA-Z0-9-_]+/g, '-'))}.html"><code>${escapeHtml(s)}</code></a></li>`,
              )
              .join('\n')}</ul>`
        : '<p class="fp-muted">None detected</p>';

    const body = `<a class="fp-back" href="${DOCS_BASE}/pages/">&larr; All pages</a>
${hero({
    title: escapeHtml(page.title),
    subtitle: escapeHtml(page.description),
    badges: [page.area, page.nav?.permission].filter(Boolean),
    formats: [
        { href: `${DOCS_BASE}/pages/${page.file_slug}.md`, label: 'Markdown' },
        { href: `${DOCS_BASE}/pages/${page.file_slug}.json`, label: 'JSON' },
    ],
})}
<section class="fp-section fp-card">
  <h2>Identity</h2>
  <p><code>${escapeHtml(page.route)}</code></p>
  <p class="fp-muted">Source: <code>${escapeHtml(page.source)}</code>${
      page.component ? ` · Component: <code>${escapeHtml(page.component)}</code>` : ''
  }</p>
  <p class="fp-muted">Audience: ${escapeHtml(page.audience)}</p>
</section>
<section class="fp-section fp-card">
  <h2>How to guide users</h2>
  <pre><code>${escapeHtml(page.how_to_guide_users)}</code></pre>
</section>
<section class="fp-section fp-card">
  <h2>Sections</h2>
  ${
      page.sections.length
          ? `<ul>${page.sections.map((s) => `<li>${escapeHtml(s)}</li>`).join('\n')}</ul>`
          : '<p class="fp-muted">None extracted.</p>'
  }
</section>
<section class="fp-section fp-card">
  <h2>Notable UI actions</h2>
  ${features}
</section>
<section class="fp-section fp-card">
  <h2>Widget slugs</h2>
  ${widgets}
</section>`;

    return renderDocsPage({
        title: page.title,
        active: 'pages',
        body,
    });
}

ensureDir(PAGES_DOCS_DIR);

console.log('Extracting frontend page routes with titles/descriptions…');
const dict = loadTranslations();
const navSource = fs.existsSync(NAV_CONFIG) ? fs.readFileSync(NAV_CONFIG, 'utf8') : '';
const navByUrl = parseNavigation(navSource, dict);
const pages = collectPages(dict, navByUrl);
const byArea = {};
pages.forEach((p) => {
    byArea[p.area] = (byArea[p.area] || 0) + 1;
});

const titled = pages.filter((p) => p.title_key || (p.nav && p.nav.title_key)).length;
const withDescriptionKey = pages.filter((p) => p.description_key).length;

writeText(path.join(PAGES_DOCS_DIR, 'index.html'), generateListPage(pages));
writeJson(path.join(PAGES_DOCS_DIR, 'index.json'), {
    type: 'featherpanel.pages.index',
    total: pages.length,
    areas: byArea,
    coverage: {
        with_i18n_or_nav_title: titled,
        with_pageheader_description: withDescriptionKey,
        nav_urls_indexed: navByUrl.size,
    },
    pages: pages.map((p) => ({
        route: p.route,
        title: p.title,
        description: p.description,
        area: p.area,
        file_slug: p.file_slug,
        permission: p.nav?.permission || null,
        widget_slugs: p.widget_slugs,
    })),
});
writeMarkdown(path.join(PAGES_DOCS_DIR, 'index.md'), pagesIndexMarkdown(pages));
writeJson(path.join(PAGES_DOCS_DIR, 'all.json'), {
    type: 'featherpanel.pages.all',
    generated_at: new Date().toISOString(),
    total: pages.length,
    coverage: {
        with_i18n_or_nav_title: titled,
        with_pageheader_description: withDescriptionKey,
        nav_urls_indexed: navByUrl.size,
    },
    pages,
});

pages.forEach((page) => {
    writeText(path.join(PAGES_DOCS_DIR, `${page.file_slug}.html`), generateDetailPage(page));
    writeJson(path.join(PAGES_DOCS_DIR, `${page.file_slug}.json`), {
        type: 'featherpanel.pages.route',
        ...page,
    });
    writeMarkdown(path.join(PAGES_DOCS_DIR, `${page.file_slug}.md`), pageMarkdown(page));
});

console.log(
    `✅ Page docs ready (${pages.length} routes; ${titled} with i18n/nav title; ${withDescriptionKey} with PageHeader description)`,
);
console.log(`   - ${DOCS_BASE}/pages/`);
console.log(`   - ${DOCS_BASE}/pages/all.json`);
