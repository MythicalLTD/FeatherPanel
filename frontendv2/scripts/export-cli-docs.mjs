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

const COMMANDS_DIR = path.join(__dirname, '../../backend/app/Cli/Commands');
const PUBLIC_DOCS_DIR = path.join(__dirname, '../public/icanhasfeatherpanel');
const CLI_DOCS_DIR = path.join(PUBLIC_DOCS_DIR, 'cli');

const GLOBAL_FLAGS = [
    {
        flag: '--skip-path-check',
        description:
            'Skip CWD validation. Required in CI and some container contexts where cwd is not /var/www/featherpanel or /var/www/html.',
    },
    {
        flag: '--no-colors',
        description: 'Disable Minecraft-style color codes in CLI output.',
    },
    {
        flag: '--clean-output',
        description: 'Strip decorative formatting for machine-friendly output.',
    },
    {
        flag: '--no-prefix',
        description: 'Omit the [FeatherPanel] prefix on each output line.',
    },
];

function extractPhpStringReturn(methodBody) {
    const m = methodBody.match(/return\s+['"]([^'"]*)['"]\s*;/);
    return m ? m[1] : '';
}

function extractPhpAssocArray(methodBody) {
    const result = {};
    const re = /['"]([^'"]+)['"]\s*=>\s*['"]([^'"]*)['"]/g;
    let match;
    while ((match = re.exec(methodBody)) !== null) {
        result[match[1]] = match[2];
    }
    return result;
}

function extractMethodBody(content, methodName) {
    const re = new RegExp(`public\\s+static\\s+function\\s+${methodName}\\s*\\([^)]*\\)\\s*(?::\\s*[^{]+)?\\{`);
    const start = content.search(re);
    if (start < 0) return '';
    const braceStart = content.indexOf('{', start);
    let depth = 0;
    for (let i = braceStart; i < content.length; i++) {
        if (content[i] === '{') depth++;
        else if (content[i] === '}') {
            depth--;
            if (depth === 0) return content.slice(braceStart + 1, i);
        }
    }
    return '';
}

function parseCommandFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const className = path.basename(filePath, '.php');
    if (className === 'Command') return null;

    const description = extractPhpStringReturn(extractMethodBody(content, 'getDescription'));
    const subCommands = extractPhpAssocArray(extractMethodBody(content, 'getSubCommands'));
    const name = className.charAt(0).toLowerCase() + className.slice(1);

    return {
        name,
        class_name: className,
        description: description || '(no description)',
        subcommands: Object.entries(subCommands).map(([sub, desc]) => ({
            name: sub,
            description: desc,
        })),
        source: path.relative(path.join(__dirname, '../..'), filePath).replace(/\\/g, '/'),
        invoke: {
            production: `featherpanel ${name}`,
            docker: `docker exec -it featherpanel_backend php cli ${name}`,
            source_dev: `cd /var/www/featherpanel/backend && php cli ${name}`,
        },
    };
}

function collectCommands() {
    if (!fs.existsSync(COMMANDS_DIR)) return [];
    return fs
        .readdirSync(COMMANDS_DIR)
        .filter((f) => f.endsWith('.php'))
        .map((f) => parseCommandFile(path.join(COMMANDS_DIR, f)))
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name));
}

function usageGuideMarkdown(commands) {
    return `# FeatherPanel CLI — how to run in production

FeatherPanel’s CLI lives in \`backend/cli\` and is invoked as \`php cli <command>\` inside the backend container.

## Production (recommended)

After Docker install, the installer creates a global wrapper:

\`\`\`bash
featherpanel help
featherpanel migrate
featherpanel settings
featherpanel users
featherpanel saas listusers 20
\`\`\`

\`featherpanel\` is installed at \`/usr/local/bin/featherpanel\` and runs:

\`\`\`bash
docker exec -it featherpanel_backend php cli <args…>
\`\`\`

Special wrapper command:

\`\`\`bash
featherpanel run-script   # downloads and runs the public installer (get.featherpanel.com)
\`\`\`

## Docker (explicit)

\`\`\`bash
docker exec -it featherpanel_backend php cli help
docker exec -it featherpanel_backend php cli migrate
docker exec -i featherpanel_backend php cli saas listsettings   # non-TTY / scripts
\`\`\`

## Source / development installs

\`\`\`bash
cd /var/www/featherpanel/backend
php cli help
php cli migrate --skip-path-check
\`\`\`

Valid working directories when path checks are enabled: \`/var/www/featherpanel\`, \`/var/www/html\`, \`/var/www/featherpanel/backend\`.

## Global flags

| Flag | Purpose |
| --- | --- |
${GLOBAL_FLAGS.map((f) => `| \`${f.flag}\` | ${f.description} |`).join('\n')}

## Plugin commands

Plugins may add commands under \`backend/storage/addons/<Plugin>/Commands/\`. They are discovered by class name (same as built-ins) and show under the Plugins section of \`featherpanel help\`.

## Built-in commands (${commands.length})

${commands
    .map((c) => {
        const subs = c.subcommands.length
            ? c.subcommands.map((s) => `  - \`${c.name} ${s.name}\`: ${s.description}`).join('\n')
            : '  - _(no subcommands — run the command directly)_';
        return `### \`${c.name}\`\n\n${c.description}\n\n\`\`\`bash\nfeatherpanel ${c.name}\n\`\`\`\n\n${subs}`;
    })
    .join('\n\n')}

## Common ops playbook

| Goal | Command |
| --- | --- |
| List all commands | \`featherpanel help\` |
| Apply DB migrations | \`featherpanel migrate\` |
| Interactive settings | \`featherpanel settings\` |
| Interactive users | \`featherpanel users\` |
| Scripted user create | \`featherpanel saas createuser …\` |
| Get/set a setting key | \`featherpanel saas getsetting <key>\` / \`setsetting <key> <value>\` |
| Upload logs for support | \`featherpanel logs\` |
| DB snapshots | \`featherpanel snapshots list\` |
| Run cron jobs once | \`featherpanel cron\` |
| Seed WebPlates | \`featherpanel seedWebPlates\` |

Setting keys and categories: [../settings/index.md](../settings/index.md).
Installer: [../installer/index.md](../installer/index.md).
`;
}

function commandMarkdown(cmd) {
    const subs = cmd.subcommands.length
        ? cmd.subcommands.map((s) => `| \`${s.name}\` | ${s.description} |`).join('\n')
        : '| — | No subcommands |';

    return `# CLI: \`${cmd.name}\`

${cmd.description}

## Invoke

\`\`\`bash
# Production
${cmd.invoke.production}

# Docker
${cmd.invoke.docker}

# Source / dev
${cmd.invoke.source_dev}
\`\`\`

## Subcommands

| Subcommand | Description |
| --- | --- |
${subs}

## Source

\`${cmd.source}\`
`;
}

function indexMarkdown(commands) {
    const rows = commands
        .map(
            (c) =>
                `| \`${c.name}\` | ${c.description} | ${c.subcommands.length} | [md](./${c.name}.md) · [json](./${c.name}.json) |`,
        )
        .join('\n');

    return `# FeatherPanel CLI commands

Total: **${commands.length}** built-in commands.

- [How to run in production](./usage.md)
- [all.json](./all.json)

| Command | Description | Subcommands | Sources |
| --- | --- | --- | --- |
${rows}
`;
}

function generateListPage(commands) {
    const items = commands
        .map((cmd) => {
            const subs = cmd.subcommands.length
                ? cmd.subcommands
                      .slice(0, 4)
                      .map((s) => `<span class="fp-badge">${escapeHtml(s.name)}</span>`)
                      .join(' ')
                : '<span class="fp-muted">no subcommands</span>';
            return `<li class="fp-item" data-fp-search-item data-fp-search-text="${escapeHtml(
                `${cmd.name} ${cmd.description} ${cmd.subcommands.map((s) => s.name).join(' ')}`,
            )}">
  <a href="${DOCS_BASE}/cli/${cmd.name}.html"><h2><code>${escapeHtml(cmd.name)}</code></h2></a>
  <p class="fp-muted">${escapeHtml(cmd.description)}</p>
  <div class="fp-meta">${subs}</div>
  <div class="fp-formats">
    <a href="${DOCS_BASE}/cli/${cmd.name}.md">Markdown</a>
    <a href="${DOCS_BASE}/cli/${cmd.name}.json">JSON</a>
  </div>
</li>`;
        })
        .join('\n');

    const body = `${hero({
        title: 'CLI commands',
        subtitle:
            'Every built-in FeatherPanel CLI command. In production use featherpanel &lt;command&gt; (docker exec wrapper).',
        badges: [`${commands.length} commands`, `${GLOBAL_FLAGS.length} global flags`],
        formats: [
            { href: `${DOCS_BASE}/cli/usage.md`, label: 'usage.md' },
            { href: `${DOCS_BASE}/cli/index.md`, label: 'index.md' },
            { href: `${DOCS_BASE}/cli/all.json`, label: 'all.json' },
        ],
    })}
<section class="fp-section fp-card">
  <h2>Production quick start</h2>
  <pre><code>featherpanel help
featherpanel migrate
docker exec -it featherpanel_backend php cli help</code></pre>
  <p class="fp-muted">Full guide: <a href="${DOCS_BASE}/view.html?doc=cli/usage.md">cli/usage.md</a></p>
</section>
<input class="fp-search" type="search" placeholder="Filter CLI commands…" data-fp-search />
<p class="fp-muted fp-hidden" data-fp-search-empty>No commands match.</p>
<ul class="fp-list">
${items}
</ul>`;

    return renderDocsPage({
        title: 'CLI',
        active: 'cli',
        body,
        includeSearchScript: true,
    });
}

function generateDetailPage(cmd) {
    const subs = cmd.subcommands.length
        ? cmd.subcommands
              .map((s) => `<li><code>${escapeHtml(s.name)}</code> — ${escapeHtml(s.description)}</li>`)
              .join('\n')
        : '<li class="fp-muted">No subcommands</li>';

    const body = `<a class="fp-back" href="${DOCS_BASE}/cli/">&larr; All CLI commands</a>
${hero({
    title: `<code>${escapeHtml(cmd.name)}</code>`,
    subtitle: escapeHtml(cmd.description),
    formats: [
        { href: `${DOCS_BASE}/cli/${cmd.name}.md`, label: 'Markdown' },
        { href: `${DOCS_BASE}/cli/${cmd.name}.json`, label: 'JSON' },
    ],
})}
<section class="fp-section fp-card">
  <h2>Invoke</h2>
  <pre><code>${escapeHtml(cmd.invoke.production)}
${escapeHtml(cmd.invoke.docker)}
${escapeHtml(cmd.invoke.source_dev)}</code></pre>
</section>
<section class="fp-section fp-card">
  <h2>Subcommands</h2>
  <ul>${subs}</ul>
</section>`;

    return renderDocsPage({
        title: `CLI: ${cmd.name}`,
        active: 'cli',
        body,
    });
}

ensureDir(CLI_DOCS_DIR);

console.log('Extracting CLI commands…');
const commands = collectCommands();

writeText(path.join(CLI_DOCS_DIR, 'index.html'), generateListPage(commands));
writeMarkdown(path.join(CLI_DOCS_DIR, 'index.md'), indexMarkdown(commands));
writeMarkdown(path.join(CLI_DOCS_DIR, 'usage.md'), usageGuideMarkdown(commands));
writeJson(path.join(CLI_DOCS_DIR, 'index.json'), {
    type: 'featherpanel.cli.index',
    total: commands.length,
    global_flags: GLOBAL_FLAGS,
    commands: commands.map((c) => ({
        name: c.name,
        description: c.description,
        subcommand_count: c.subcommands.length,
    })),
});
writeJson(path.join(CLI_DOCS_DIR, 'all.json'), {
    type: 'featherpanel.cli.all',
    generated_at: new Date().toISOString(),
    global_flags: GLOBAL_FLAGS,
    production_wrapper: 'featherpanel',
    docker_container: 'featherpanel_backend',
    entrypoint: 'php cli',
    commands,
});

commands.forEach((cmd) => {
    writeText(path.join(CLI_DOCS_DIR, `${cmd.name}.html`), generateDetailPage(cmd));
    writeJson(path.join(CLI_DOCS_DIR, `${cmd.name}.json`), {
        type: 'featherpanel.cli.command',
        ...cmd,
    });
    writeMarkdown(path.join(CLI_DOCS_DIR, `${cmd.name}.md`), commandMarkdown(cmd));
});

console.log(`✅ CLI docs ready (${commands.length} commands)`);
console.log(`   - ${DOCS_BASE}/cli/`);
console.log(`   - ${DOCS_BASE}/cli/usage.md`);
console.log(`   - ${DOCS_BASE}/cli/all.json`);
