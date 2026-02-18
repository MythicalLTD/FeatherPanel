
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APP_DIR = path.join(__dirname, '../src/app');
const COMPONENTS_DIR = path.join(__dirname, '../src/components');
const PUBLIC_DOCS_DIR = path.join(__dirname, '../public/icanhasfeatherpanel');
const WIDGETS_DOCS_DIR = path.join(PUBLIC_DOCS_DIR, 'widgets');

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

function generateNextJsPages(results) {
    const sortedSlugs = Object.keys(results).sort();
    
    // Generate main docs page
    const mainPage = generateMainDocsPage(sortedSlugs);
    
    // Generate widgets listing page
    const widgetsListPage = generateWidgetsListPage(results, sortedSlugs);
    
    // Generate individual widget pages
    const widgetPages = {};
    sortedSlugs.forEach((slug) => {
        widgetPages[slug] = generateWidgetDetailPage(slug, results[slug]);
    });
    
    return { mainPage, widgetsListPage, widgetPages };
}

function generateMainDocsPage(slugs) {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>FeatherPanel Documentation</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 2rem; background: #020617; color: #e5e7eb; }
    a { color: #60a5fa; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .container { max-width: 960px; margin: 0 auto; }
    h1 { font-size: 2.25rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.5rem; margin-top: 2rem; }
    h3 { font-size: 1.125rem; margin-top: 1.5rem; }
    .muted { color: #9ca3af; }
    .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; background: #0f172a; border: 1px solid #1f2937; margin-right: 0.5rem; }
    ul { padding-left: 1.25rem; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 0.875rem; }
    pre { background: #020617; border-radius: 0.5rem; padding: 1rem; border: 1px solid #1f2937; overflow-x: auto; }
    .card { border-radius: 0.75rem; border: 1px solid #1f2937; background: #020617; padding: 1.5rem; margin-top: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin-top: 2rem; }
    .card-link { display: block; }
  </style>
</head>
<body>
  <main class="container">
    <header>
      <h1>FeatherPanel Documentation</h1>
      <p class="muted">Comprehensive guides and references for developers and widget creators.</p>
    </header>

    <section class="grid">
      <a href="/icanhasfeatherpanel/widgets/index.html" class="card-link">
        <div class="card">
          <h2>Widgets</h2>
          <p class="muted">Explore all available widget injection points and learn how to create custom widgets for FeatherPanel.</p>
          <span class="badge">${slugs.length} widget slugs available</span>
        </div>
      </a>

      <a href="/icanhasfeatherpanel/api/index.html" class="card-link">
        <div class="card">
          <h2>API Reference</h2>
          <p class="muted">Complete API documentation with interactive examples and endpoint details.</p>
        </div>
      </a>

      <a href="/icanhasfeatherpanel/permissions/index.html" class="card-link">
        <div class="card">
          <h2>Permissions</h2>
          <p class="muted">Complete reference of all permission nodes available in FeatherPanel for role-based access control.</p>
        </div>
      </a>

      <a href="/icanhasfeatherpanel/events/index.html" class="card-link">
        <div class="card">
          <h2>Events</h2>
          <p class="muted">Complete reference of all plugin events and hooks available in FeatherPanel for extending functionality.</p>
        </div>
      </a>
    </section>

    <section class="card">
      <h2>Quick Start</h2>
      <h3>For Widget Developers</h3>
      <p class="muted">
        Widgets allow you to extend FeatherPanel's functionality by injecting custom components into specific pages.
        Each page has unique injection points where widgets can be rendered.
      </p>

      <h3>Getting Started</h3>
      <ol class="muted">
        <li>Browse available widget slugs and injection points</li>
        <li>Create your widget component following FeatherPanel's patterns</li>
        <li>Register your widget with the appropriate slug and injection point</li>
      </ol>
    </section>
  </main>
</body>
</html>
`;
}

function sanitizeSlug(slug) {
    return slug.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-');
}

function generateWidgetsListPage(results, sortedSlugs) {
    const widgetsList = sortedSlugs.map(slug => {
        const data = results[slug];
        return { 
            slug,
            sanitizedSlug: sanitizeSlug(slug),
            files: data.files,
            injectionPoints: Array.from(data.injectionPoints).sort()
        };
    });
    
    const totalInjectionPoints = widgetsList.reduce((sum, w) => sum + w.injectionPoints.length, 0);
    const widgetItems = widgetsList.map(widget => {
        const injectionPointsList = widget.injectionPoints.length > 0
            ? widget.injectionPoints.slice(0, 3).map(ip => `<code class="badge">${ip}</code>`).join(' ') +
              (widget.injectionPoints.length > 3 ? ` <span class="muted">+${widget.injectionPoints.length - 3} more</span>` : '')
            : '<span class="muted italic">Check detail page for dynamic injection points</span>';
        
        return `<li class="card">
  <a href="/icanhasfeatherpanel/widgets/${widget.sanitizedSlug}.html">
    <h2><code>${widget.slug}</code></h2>
    <p class="muted">${widget.files.length} source file${widget.files.length !== 1 ? 's' : ''}</p>
    <p class="muted"><strong>Injection Points:</strong> ${injectionPointsList}</p>
  </a>
</li>`;
    }).join('\n');
    
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Widget Injection Points - FeatherPanel</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 2rem; background: #020617; color: #e5e7eb; }
    a { color: #60a5fa; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .container { max-width: 960px; margin: 0 auto; }
    h1 { font-size: 2.25rem; margin-bottom: 0.5rem; }
    h2 { font-size: 1.25rem; margin: 0 0 0.25rem; }
    .muted { color: #9ca3af; }
    .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; background: #0f172a; border: 1px solid #1f2937; margin-right: 0.5rem; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 0.875rem; }
    .card { border-radius: 0.75rem; border: 1px solid #1f2937; background: #020617; padding: 1.25rem 1.5rem; margin-top: 1.5rem; }
    .back-link { margin-bottom: 1.5rem; display: inline-block; }
    ul { list-style: none; padding: 0; }
    .italic { font-style: italic; }
  </style>
</head>
<body>
  <main class="container">
    <a href="/icanhasfeatherpanel/index.html" class="back-link">&larr; Back to Documentation</a>
    <header>
      <h1>Widget Injection Points</h1>
      <p class="muted">All available widget slugs and their injection points in FeatherPanel. Click on any widget to view detailed information.</p>
      <div style="margin-top: 0.75rem;">
        <span class="badge">${widgetsList.length} widget slugs</span>
        <span class="badge">${totalInjectionPoints} total injection points</span>
      </div>
    </header>

    <ul>
${widgetItems}
    </ul>
  </main>
</body>
</html>
`;
}

function generateWidgetDetailPage(slug, data) {
    const injectionPoints = Array.from(data.injectionPoints).sort();
    const files = data.files.map(f => ({
        name: path.basename(f),
        path: f.replace(/\\/g, '/')
    }));
    
    const exampleIp = injectionPoints.length > 0 ? injectionPoints[0] : 'top-of-page';
    const injectionPointsList = injectionPoints.length > 0
        ? injectionPoints.map(ip => `<li><code>${ip}</code></li>`).join('\n')
        : '<li class="muted italic">No injection points found in source files. They may be rendered dynamically or in child components.</li>';
    
    const filesList = files.map(f => `<li><code>${f.name}</code> <span class="muted">(${f.path})</span></li>`).join('\n');
    
    const exampleConfig = `{
  "id": "my-plugin-widget",
  "component": "my-widget.html",
  "enabled": true,
  "priority": 100,
  "page": "${slug}",
  "location": "${exampleIp}",
  "size": "full"
}`;
    
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Widget: ${slug} - FeatherPanel</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 2rem; background: #020617; color: #e5e7eb; }
    a { color: #60a5fa; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .container { max-width: 960px; margin: 0 auto; }
    h1 { font-size: 2rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.25rem; margin: 0 0 0.25rem; }
    h3 { font-size: 1rem; margin-top: 1.25rem; }
    .muted { color: #9ca3af; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 0.875rem; }
    pre { background: #020617; border-radius: 0.5rem; padding: 1rem; border: 1px solid #1f2937; overflow-x: auto; }
    .card { border-radius: 0.75rem; border: 1px solid #1f2937; background: #020617; padding: 1.25rem 1.5rem; margin-top: 1.5rem; }
    .back-link { margin-bottom: 1.5rem; display: inline-block; }
    ul { padding-left: 1.25rem; }
    .italic { font-style: italic; }
  </style>
</head>
<body>
  <main class="container">
    <a href="/icanhasfeatherpanel/widgets/index.html" class="back-link">&larr; Back to Widgets</a>
    <header>
      <h1><code>${slug}</code></h1>
      <p class="muted">Widget slug and injection point details</p>
    </header>

    <section class="card">
      <h2>Injection Points</h2>
      <p class="muted">Available injection points for this widget slug:</p>
      <ul>
${injectionPointsList}
      </ul>
    </section>

    <section class="card">
      <h2>Source Files</h2>
      <p class="muted">Files where this widget slug is used:</p>
      <ul>
${filesList}
      </ul>
    </section>

    <section class="card">
      <h2>Plugin Widget Integration</h2>
      <h3>Widget Configuration</h3>
      <p class="muted">To inject a widget into this page, create a <code>widgets.json</code> file in your plugin's <code>Frontend/</code> directory:</p>
      <pre><code>${exampleConfig}</code></pre>

      ${injectionPoints.length > 0 ? `<h3>Available Injection Points</h3>
      <p class="muted">This page supports the following injection points. Use the <code>location</code> property in your widget configuration:</p>
      <ul>
${injectionPoints.map(ip => `<li><code>${ip}</code></li>`).join('\n')}
      </ul>` : ''}

      <h3>Widget Sizing</h3>
      <p class="muted">Set the <code>size</code> property to control widget width:</p>
      <ul class="muted">
        <li><code>"full"</code> - Full width (default)</li>
        <li><code>"half"</code> - Half width (2 per row)</li>
        <li><code>"third"</code> - One-third width (3 per row)</li>
        <li><code>"quarter"</code> - One-quarter width (4 per row)</li>
      </ul>

      <h3>Widget Context</h3>
      <p class="muted">Widgets automatically receive context information accessible via:</p>
      <pre><code>const context = window.FeatherPanel?.widgetContext || {};
const userUuid = context.userUuid;
const serverUuid = context.serverUuid;</code></pre>
    </section>
  </main>
</body>
</html>
`;
}

// Ensure docs directories exist
if (!fs.existsSync(PUBLIC_DOCS_DIR)) {
    fs.mkdirSync(PUBLIC_DOCS_DIR, { recursive: true });
}
if (!fs.existsSync(WIDGETS_DOCS_DIR)) {
    fs.mkdirSync(WIDGETS_DOCS_DIR, { recursive: true });
}

console.log('Extracting widget documentation...');
const documentation = extractDocs();
const pages = generateNextJsPages(documentation);

// Write main docs page
const mainPagePath = path.join(PUBLIC_DOCS_DIR, 'index.html');
fs.writeFileSync(mainPagePath, pages.mainPage);
console.log(`✓ Main docs page: ${mainPagePath}`);

// Write widgets list page
const widgetsListPath = path.join(WIDGETS_DOCS_DIR, 'index.html');
fs.writeFileSync(widgetsListPath, pages.widgetsListPage);
console.log(`✓ Widgets list page: ${widgetsListPath}`);

// Write individual widget pages
Object.keys(pages.widgetPages).forEach((slug) => {
    // Sanitize slug for use in file paths (replace special chars with dashes)
    const sanitizedSlug = sanitizeSlug(slug);
    const widgetPagePath = path.join(WIDGETS_DOCS_DIR, `${sanitizedSlug}.html`);
    fs.writeFileSync(widgetPagePath, pages.widgetPages[slug]);
    console.log(`✓ Widget page: ${widgetPagePath} (slug: ${slug})`);
});

console.log(`\n✅ Documentation generated successfully!`);
console.log(`   - Main page: /docs`);
console.log(`   - Widgets list: /docs/widgets`);
console.log(`   - ${Object.keys(pages.widgetPages).length} widget detail pages`);
