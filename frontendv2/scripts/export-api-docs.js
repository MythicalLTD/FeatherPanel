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

const PUBLIC_DOCS_DIR = path.join(__dirname, '../public/icanhasfeatherpanel');
const API_DOCS_DIR = path.join(PUBLIC_DOCS_DIR, 'api');

function generateApiDocsPage() {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>API Reference - FeatherPanel</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; padding: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .header { position: sticky; top: 0; z-index: 50; border-bottom: 1px solid #1f2937; background: rgba(2, 6, 23, 0.95); backdrop-filter: blur(8px); }
    .header-content { max-width: 100%; margin: 0 auto; padding: 1rem; display: flex; align-items: center; gap: 1rem; }
    .back-link { color: #60a5fa; text-decoration: none; padding: 0.5rem 1rem; border-radius: 0.375rem; transition: background 0.2s; }
    .back-link:hover { background: rgba(96, 165, 250, 0.1); }
    .header-title { display: flex; align-items: center; gap: 0.5rem; color: #e5e7eb; font-size: 1.125rem; font-weight: 600; }
    #redoc-container { min-height: calc(100vh - 73px); }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-content">
      <a href="/icanhasfeatherpanel/index.html" class="back-link">&larr; Back to Documentation</a>
      <div class="header-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #60a5fa;">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
        API Reference
      </div>
    </div>
  </div>
  <div id="redoc-container"></div>

  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  <script>
    Redoc.init('/api/openapi.json', {
      theme: {
        colors: {
          primary: {
            main: '#60a5fa',
          },
          success: {
            main: '#60a5fa',
          },
          text: {
            primary: '#e5e7eb',
            secondary: '#9ca3af',
          },
          http: {
            get: '#10b981',
            post: '#3b82f6',
            put: '#f59e0b',
            delete: '#ef4444',
            patch: '#8b5cf6',
          },
        },
        typography: {
          fontSize: '14px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          headings: {
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontWeight: '600',
          },
          code: {
            fontSize: '13px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          },
        },
        sidebar: {
          backgroundColor: '#020617',
          textColor: '#e5e7eb',
          activeTextColor: '#60a5fa',
          groupItems: {
            activeBackgroundColor: '#0f172a',
            activeTextColor: '#60a5fa',
          },
        },
        rightPanel: {
          backgroundColor: '#020617',
        },
      },
      scrollYOffset: 73,
      hideDownloadButton: false,
      hideSingleRequestSampleTab: false,
      menuToggle: true,
      nativeScrollbars: true,
    }, document.getElementById('redoc-container'));

    // Apply custom styles to match dark theme
    const style = document.createElement('style');
    style.textContent = \`
      .redoc-wrap {
        min-height: 100vh;
        background: #020617;
        color: #e5e7eb;
      }
      .redoc-wrap .api-content {
        background: #020617;
      }
      .redoc-wrap .menu-content {
        background: #020617;
        border-right: 1px solid #1f2937;
      }
      .redoc-wrap .menu-content a {
        color: #e5e7eb;
      }
      .redoc-wrap .menu-content a:hover {
        color: #60a5fa;
      }
      .redoc-wrap code {
        background: #0f172a;
        color: #e5e7eb;
        border: 1px solid #1f2937;
      }
      .redoc-wrap pre {
        background: #0f172a;
        border: 1px solid #1f2937;
      }
      .redoc-wrap .react-tabs__tab {
        color: #e5e7eb;
      }
      .redoc-wrap .react-tabs__tab--selected {
        color: #60a5fa;
        border-bottom-color: #60a5fa;
      }
    \`;
    document.head.appendChild(style);
  </script>
</body>
</html>
`;
}

// Ensure docs directories exist
if (!fs.existsSync(PUBLIC_DOCS_DIR)) {
    fs.mkdirSync(PUBLIC_DOCS_DIR, { recursive: true });
}
if (!fs.existsSync(API_DOCS_DIR)) {
    fs.mkdirSync(API_DOCS_DIR, { recursive: true });
}

console.log('Generating API documentation page...');
const apiPagePath = path.join(API_DOCS_DIR, 'index.html');
const apiPage = generateApiDocsPage();
fs.writeFileSync(apiPagePath, apiPage);
console.log(`✓ API docs page: ${apiPagePath}`);

console.log(`\n✅ API documentation generated successfully!`);
console.log(`   - API docs page: /icanhasfeatherpanel/api`);
