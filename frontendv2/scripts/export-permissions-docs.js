
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
        
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }
        
        // Parse format: KEY=value | category | description
        const match = trimmed.match(/^([A-Z_]+)=([^|]+)\s*\|\s*([^|]+)\s*\|\s*(.+)$/);
        if (match) {
            const [, constant, node, category, description] = match;
            permissions.push({
                constant: constant.trim(),
                node: node.trim(),
                category: category.trim(),
                description: description.trim()
            });
            categories.add(category.trim());
        }
    }
    
    // Group by category
    const grouped = {};
    permissions.forEach(perm => {
        if (!grouped[perm.category]) {
            grouped[perm.category] = [];
        }
        grouped[perm.category].push(perm);
    });
    
    // Sort permissions within each category by node
    Object.keys(grouped).forEach(category => {
        grouped[category].sort((a, b) => a.node.localeCompare(b.node));
    });
    
    return {
        permissions,
        categories: Array.from(categories).sort(),
        grouped
    };
}

function sanitizeCategory(category) {
    return category
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function generateMainPermissionsPage(categories, totalPermissions) {
    const categoryItems = categories
        .map((category) => {
            const sanitized = sanitizeCategory(category);
            return `<li>
    <a href="/icanhasfeatherpanel/permissions/${sanitized}.html">${category}</a>
</li>`;
        })
        .join('\n');

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>FeatherPanel Permission Nodes</title>
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
  </style>
</head>
<body>
  <main class="container">
    <header>
      <h1>Permission Nodes</h1>
      <p class="muted">
        Complete reference of all permission nodes available in FeatherPanel for role-based access control.
      </p>
      <div style="margin-top: 0.75rem;">
        <span class="badge">${categories.length} categories</span>
        <span class="badge">${totalPermissions} permissions</span>
      </div>
    </header>

    <section>
      <h2>Permission Categories</h2>
      <p class="muted">Click a category to see all permissions in that category.</p>
      <ul>
${categoryItems}
      </ul>
    </section>

    <section class="card">
      <h2>About Permissions</h2>
      <p class="muted">
        FeatherPanel uses a role-based permission system where permissions are assigned to roles, and users are assigned roles.
        Each permission node controls access to specific features or actions.
      </p>

      <h3>Permission Format</h3>
      <p class="muted">Permissions follow a hierarchical dot notation format:</p>
      <pre><code>admin.users.view
admin.servers.create
admin.settings.edit</code></pre>

      <h3>Root Permission</h3>
      <p class="muted">
        The <code>admin.root</code> permission grants full access to everything in the panel. Users with this permission
        bypass all other permission checks.
      </p>
    </section>
  </main>
</body>
</html>
`;
}

function generateCategoryPage(category, permissions) {
    const exampleNode = permissions.length > 0 ? permissions[0].node : 'admin.example.view';
    const exampleConstant = permissions.length > 0 ? permissions[0].constant : 'ADMIN_EXAMPLE_VIEW';

    const permissionItems = permissions
        .map((perm) => {
            return `<article class="card">
  <h2><code>${perm.node}</code></h2>
  <p class="muted"><strong>Constant:</strong> <code>${perm.constant}</code></p>
  <p class="muted">${perm.description}</p>
</article>`;
        })
        .join('\n\n');

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Permissions: ${category}</title>
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
  </style>
</head>
<body>
  <main class="container">
    <a href="/icanhasfeatherpanel/permissions/index.html" class="back-link">&larr; Back to all permission categories</a>
    <header>
      <h1>${category}</h1>
      <p class="muted">${permissions.length} permission${permissions.length !== 1 ? 's' : ''} in this category.</p>
    </header>

${permissionItems}

    <section class="card">
      <h2>Usage in Code</h2>
      <h3>PHP Backend</h3>
      <pre><code>use App\\Helpers\\PermissionHelper;

// Check if user has permission
if (PermissionHelper::hasPermission($userUuid, '${exampleNode}')) {
    // User has permission
}</code></pre>

      <h3>Using Permission Constants</h3>
      <pre><code>use App\\Permissions;

// Use constant instead of string
if (PermissionHelper::hasPermission($userUuid, Permissions::${exampleConstant})) {
    // User has permission
}</code></pre>
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
if (!fs.existsSync(PERMISSIONS_DOCS_DIR)) {
    fs.mkdirSync(PERMISSIONS_DOCS_DIR, { recursive: true });
}

console.log('Parsing permissions file...');
const { permissions, categories, grouped } = parsePermissionsFile();

// Generate main permissions page
const mainPagePath = path.join(PERMISSIONS_DOCS_DIR, 'index.html');
const mainPage = generateMainPermissionsPage(categories, permissions.length);
fs.writeFileSync(mainPagePath, mainPage);
console.log(`✓ Main permissions page: ${mainPagePath}`);

// Generate category pages
categories.forEach(category => {
    const sanitized = sanitizeCategory(category);
    const categoryPagePath = path.join(PERMISSIONS_DOCS_DIR, `${sanitized}.html`);
    const categoryPage = generateCategoryPage(category, grouped[category]);
    fs.writeFileSync(categoryPagePath, categoryPage);
    console.log(`✓ Category page: ${categoryPagePath} (${grouped[category].length} permissions)`);
});

console.log(`\n✅ Permissions documentation generated successfully!`);
console.log(`   - Main page: /icanhasfeatherpanel/permissions`);
console.log(`   - ${categories.length} category pages`);
console.log(`   - ${permissions.length} total permissions`);
