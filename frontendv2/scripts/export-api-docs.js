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
import { DOCS_BASE, writeJson, writeMarkdown, writeText } from './lib/docs-site.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DOCS_DIR = path.join(__dirname, '../public/icanhasfeatherpanel');
const API_DOCS_DIR = path.join(PUBLIC_DOCS_DIR, 'api');

function generateApiDocsPage() {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>API Reference — FeatherPanel Docs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="${DOCS_BASE}/assets/docs.css" />
  <style>
    body.fp-docs { padding: 0; }
    .fp-api-shell { max-width: none; padding: 0; }
    .fp-api-shell .fp-nav { margin: 0.75rem 1rem 0; }
    .fp-api-bar { display:flex; flex-wrap:wrap; gap:0.5rem; align-items:center; padding:0.75rem 1rem 0.25rem; }
    #redoc-container { min-height: calc(100vh - 120px); }
    .fp-api-shell .fp-footer { margin: 0 1rem 1.5rem; }
  </style>
</head>
<body class="fp-docs">
  <div class="fp-shell fp-api-shell">
    <nav class="fp-nav" aria-label="Documentation">
      <a class="fp-brand" href="${DOCS_BASE}/">
        <span class="fp-brand-mark" aria-hidden="true"></span>
        <span>FeatherPanel Docs</span>
      </a>
      <div class="fp-nav-links">
        <a href="${DOCS_BASE}/">Home</a>
        <a href="${DOCS_BASE}/plugins/">Plugins</a>
        <a href="${DOCS_BASE}/widgets/">Widgets</a>
        <a href="${DOCS_BASE}/events/">Events</a>
        <a href="${DOCS_BASE}/permissions/">Permissions</a>
        <a href="${DOCS_BASE}/api/" class="active">API</a>
        <a href="${DOCS_BASE}/rag/">RAG</a>
      </div>
    </nav>
    <div class="fp-api-bar">
      <a class="fp-badge" href="${DOCS_BASE}/api/openapi.json">openapi.json</a>
      <a class="fp-badge" href="${DOCS_BASE}/api/index.md">index.md</a>
      <a class="fp-badge" href="${DOCS_BASE}/api/index.json">index.json</a>
      <a class="fp-badge" href="${DOCS_BASE}/api/oauth2-playground.html">OAuth2 playground</a>
    </div>
  <div id="redoc-container"></div>
  <footer class="fp-footer">Raw OpenAPI for RAG/tools: <a href="${DOCS_BASE}/api/openapi.json">openapi.json</a></footer>
  </div>

  <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  <script>
    Redoc.init('./openapi.json', {
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

function generateOAuth2DocsAndPlaygroundPage() {
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>OAuth2 API Consent Docs & Playground - FeatherPanel</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; padding: 2rem; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #020617; color: #e5e7eb; line-height: 1.55; }
    .container { max-width: 1100px; margin: 0 auto; }
    h1, h2, h3 { color: #f8fafc; margin-top: 0; }
    .panel { border: 1px solid #1f2937; border-radius: 12px; background: #0b1220; padding: 1rem; margin-bottom: 1rem; }
    .panel-muted { border-color: #334155; background: #0a1224; }
    .warn { border: 1px solid #f59e0b; background: rgba(245, 158, 11, 0.12); border-radius: 10px; padding: .85rem; color: #fde68a; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: .75rem; }
    .full { grid-column: 1 / -1; }
    label { display: block; font-size: .85rem; color: #9ca3af; margin-bottom: .25rem; }
    input, textarea, select { width: 100%; border: 1px solid #334155; border-radius: 8px; background: #020617; color: #e5e7eb; padding: .6rem .7rem; box-sizing: border-box; }
    textarea { min-height: 84px; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .actions { display: flex; gap: .6rem; flex-wrap: wrap; margin-top: .8rem; }
    button { border: 1px solid #334155; background: #2563eb; color: #fff; padding: .6rem .9rem; border-radius: 8px; cursor: pointer; }
    button.secondary { background: transparent; }
    code, pre { background: #020617; border: 1px solid #1f2937; border-radius: 8px; padding: .6rem; display: block; overflow: auto; }
    table { width: 100%; border-collapse: collapse; margin: .6rem 0; }
    th, td { border: 1px solid #1f2937; padding: .55rem; text-align: left; vertical-align: top; font-size: .9rem; }
    th { background: #0f172a; }
    a { color: #60a5fa; }
    .ok { color: #86efac; }
    .err { color: #fca5a5; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } .full { grid-column: auto; } }
  </style>
</head>
<body>
  <div class="container">
    <p><a href="/icanhasfeatherpanel/api/index.html">&larr; Back to API Reference</a></p>
    <h1>OAuth2 API Consent: Documentation + Playground</h1>
    <div class="warn">
      Approved requests issue credentials with full account API access. Only approve trusted apps and secure your callback receiver.
    </div>

    <div class="panel panel-muted">
      <h2>Flow Overview</h2>
      <ol>
        <li>Build authorize URL to <code>/dashboard/account/oauth2/api/new?...params...</code>.</li>
        <li>User reviews request and approves/denies consent.</li>
        <li><code>mode=user</code>: panel redirects user to <code>callbackurl</code> with result in URL fragment (<code>#...</code>).</li>
        <li><code>mode=server</code>: panel calls <code>callbackurl</code> server-to-server with JSON credentials, then shows success in panel UI.</li>
        <li>Optional: app exchanges one-time <code>authorization_code</code> via <code>POST /api/user/api-clients/oauth2/token</code>.</li>
      </ol>
    </div>

    <div class="panel panel-muted">
      <h2>Query Parameters</h2>
      <table>
        <thead>
          <tr><th>Name</th><th>Required</th><th>Description</th></tr>
        </thead>
        <tbody>
          <tr><td><code>name</code></td><td>Yes</td><td>API key/client name that will be created on approval.</td></tr>
          <tr><td><code>callbackurl</code></td><td>Yes</td><td>Absolute callback URL. Supports <code>https://</code>, localhost <code>http://</code>, and custom app schemes like <code>client://</code> or <code>myapp://</code>.</td></tr>
          <tr><td><code>allowedips</code></td><td>No</td><td>Comma/newline separated IPv4/IPv6/CIDR restrictions.</td></tr>
          <tr><td><code>alertCors</code></td><td>No</td><td><code>true</code> to enable foreign IP blocked-attempt notifications (only with <code>allowedips</code>).</td></tr>
          <tr><td><code>appName</code></td><td>No</td><td>Display name of requesting app.</td></tr>
          <tr><td><code>appLogo</code></td><td>No</td><td>Absolute URL of app logo.</td></tr>
          <tr><td><code>description</code></td><td>No</td><td>Consent description text shown to the user.</td></tr>
          <tr><td><code>mode</code></td><td>No</td><td><code>user</code> (default) for browser redirect, or <code>server</code> for server-to-server callback delivery.</td></tr>
        </tbody>
      </table>
    </div>

    <div class="panel">
      <h2>Playground</h2>
      <p>Use this form to generate, validate, and open consent URLs.</p>
      <div class="grid">
        <div><label>name *</label><input id="name" value="My Integration" /></div>
        <div><label>callbackurl *</label><input id="callbackurl" value="http://localhost:3000/oauth/callback" /></div>
        <div><label>appName</label><input id="appName" value="Example App" /></div>
        <div><label>appLogo</label><input id="appLogo" value="" /></div>
        <div><label>mode</label>
          <select id="mode">
            <option value="user" selected>user</option>
            <option value="server">server</option>
          </select>
        </div>
        <div><label>alertCors</label>
          <select id="alertCors">
            <option value="">(default false)</option>
            <option value="true">true</option>
            <option value="false" selected>false</option>
          </select>
        </div>
        <div class="full"><label>allowedips</label><textarea id="allowedips">1.1.1.1
1.1.1.0/24</textarea></div>
        <div class="full"><label>description</label><textarea id="description">Read and manage panel resources</textarea></div>
      </div>
      <div class="actions">
        <button id="build">Build URL</button>
        <button id="validateMeta" class="secondary">Validate via /oauth2/metadata</button>
        <button id="open" class="secondary">Open Consent Screen</button>
      </div>
    </div>

    <div class="panel">
      <label>Generated URL</label>
      <pre id="out"></pre>
    </div>

    <div class="panel">
      <label>Metadata Validation Response</label>
      <pre id="metaResult">Not validated yet.</pre>
    </div>

    <div class="panel panel-muted">
      <h2>Callback Fragment Contract</h2>
      <h3>Approve</h3>
      <pre>callbackurl#public_key=fp_...&private_key=fp_...&token_type=featherpanel_api_key&issued_at=...&authorization_code=fpoauthcode_...</pre>
      <h3>Deny</h3>
      <pre>callbackurl#error=access_denied&error_description=The resource owner denied the request</pre>
      <h3>Server Mode Callback Body</h3>
      <pre>{"success":true,"token_type":"featherpanel_api_key","public_key":"fp_...","private_key":"fp_...","authorization_code":"fpoauthcode_...","issued_at":"..."}</pre>
      <h3>Token Exchange</h3>
      <pre>POST /api/user/api-clients/oauth2/token
Content-Type: application/json

{"code":"fpoauthcode_..."}</pre>
    </div>

    <div class="panel panel-muted">
      <h2>Validation Guide (Client + Server)</h2>
      <h3>Client-side validation (before opening consent)</h3>
      <ol>
        <li>Build your query string on the app side.</li>
        <li>Call <code>GET /api/user/api-clients/oauth2/metadata?...params...</code> while user is logged in.</li>
        <li>If response is success, open <code>/dashboard/account/oauth2/api/new?...params...</code>.</li>
      </ol>
      <pre>GET /api/user/api-clients/oauth2/metadata?name=My+Integration&callbackurl=client%3A%2F%2Foauth%2Fcallback&mode=user</pre>
      <h3>Server-side validation (after callback)</h3>
      <ol>
        <li>Check payload has <code>public_key</code> and <code>private_key</code> and <code>success === true</code> for server mode.</li>
        <li>Validate issued credentials via <code>POST /api/user/api-clients/validate</code> using returned <code>public_key</code>.</li>
        <li>Optionally exchange/verify <code>authorization_code</code> through <code>POST /api/user/api-clients/oauth2/token</code>.</li>
      </ol>
      <pre>POST /api/user/api-clients/validate
Content-Type: application/json

{"public_key":"fp_..."}</pre>
    </div>

    <div class="panel panel-muted">
      <h2>Callback Parser Snippet (App Side)</h2>
      <pre><code>function parseOAuthFragment(hash) {
  const fragment = (hash || window.location.hash || '').replace(/^#/, '');
  const params = new URLSearchParams(fragment);
  return {
    publicKey: params.get('public_key'),
    privateKey: params.get('private_key'),
    error: params.get('error'),
    errorDescription: params.get('error_description'),
    authorizationCode: params.get('authorization_code'),
  };
}

const result = parseOAuthFragment();
history.replaceState(null, '', location.pathname + location.search);</code></pre>
    </div>
  </div>
  <script>
    function params() {
      const p = new URLSearchParams();
      const read = (id) => String(document.getElementById(id).value || '').trim();
      p.set('name', read('name'));
      p.set('callbackurl', read('callbackurl'));
      const allowedips = read('allowedips'); if (allowedips) p.set('allowedips', allowedips);
      const appName = read('appName'); if (appName) p.set('appName', appName);
      const appLogo = read('appLogo'); if (appLogo) p.set('appLogo', appLogo);
      const description = read('description'); if (description) p.set('description', description);
      const mode = read('mode') || 'user';
      p.set('mode', mode);
      const alertCors = read('alertCors'); if (alertCors) p.set('alertCors', alertCors);
      return p;
    }
    function buildUrl() {
      const url = '/dashboard/account/oauth2/api/new?' + params().toString();
      document.getElementById('out').textContent = url;
      return url;
    }
    async function validateMetadata() {
      const q = params().toString();
      const out = document.getElementById('metaResult');
      out.textContent = 'Validating...';
      try {
        const response = await fetch('/api/user/api-clients/oauth2/metadata?' + q, {
          credentials: 'same-origin'
        });
        const data = await response.json();
        out.className = response.ok ? 'ok' : 'err';
        out.textContent = JSON.stringify(data, null, 2);
      } catch (error) {
        out.className = 'err';
        out.textContent = 'Failed to validate metadata: ' + String(error);
      }
    }
    document.getElementById('build').addEventListener('click', buildUrl);
    document.getElementById('validateMeta').addEventListener('click', validateMetadata);
    document.getElementById('open').addEventListener('click', () => window.open(buildUrl(), '_blank'));
    buildUrl();
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

console.log('Generating OAuth2 docs and playground page...');
const oauth2PlaygroundPath = path.join(API_DOCS_DIR, 'oauth2-playground.html');
const oauth2PlaygroundPage = generateOAuth2DocsAndPlaygroundPage();
fs.writeFileSync(oauth2PlaygroundPath, oauth2PlaygroundPage);
console.log(`✓ OAuth2 docs/playground page: ${oauth2PlaygroundPath}`);

writeMarkdown(
    path.join(API_DOCS_DIR, 'index.md'),
    `# FeatherPanel HTTP API

Interactive docs: [HTML (Redoc)](./index.html)

## Machine-readable

- [\`openapi.json\`](./openapi.json) — full OpenAPI 3 specification (preferred for RAG / codegen)
- [\`index.json\`](./index.json) — pointers for this section
- [OAuth2 playground](./oauth2-playground.html) — browser helper (live calls need a running panel)

Copy or fetch \`openapi.json\` into your RAG corpus. Do not scrape the Redoc HTML.
`,
);

writeJson(path.join(API_DOCS_DIR, 'index.json'), {
    type: 'featherpanel.api.index',
    formats: {
        html: `${DOCS_BASE}/api/`,
        openapi_json: `${DOCS_BASE}/api/openapi.json`,
        markdown: `${DOCS_BASE}/api/index.md`,
        oauth2_playground: `${DOCS_BASE}/api/oauth2-playground.html`,
    },
    notes: [
        'Prefer openapi.json for RAG and tooling.',
        'openapi.json is copied into this folder during build:public-docs.',
    ],
});

writeText(
    path.join(API_DOCS_DIR, 'README.md'),
    `# API docs

See [index.md](./index.md). Raw spec: [openapi.json](./openapi.json).
`,
);

console.log(`\n✅ API documentation generated successfully!`);
console.log(`   - API docs page: ${DOCS_BASE}/api`);
console.log(`   - Machine-readable: index.md / index.json (+ openapi.json at build time)`);
