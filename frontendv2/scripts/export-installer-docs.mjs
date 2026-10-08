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

const INSTALLER_BASH = path.join(__dirname, '../../installer/install.bash');
const PUBLIC_DOCS_DIR = path.join(__dirname, '../public/icanhasfeatherpanel');
const INSTALLER_DOCS_DIR = path.join(PUBLIC_DOCS_DIR, 'installer');

function parseInstallerMeta(source) {
    const versionMatch = source.match(/SCRIPT_VERSION="([^"]+)"/);
    const flags = [];
    const helpBlock = source.match(/--help\s*\|\s*-h\)\s*([\s\S]*?)exit 0/);
    if (helpBlock) {
        const optRe = /^\s*echo\s+"\s{2}(--[a-z0-9-]+(?:\s+[A-Z_]+)?(?:,\s*-[a-z])?)\s{2,}(.+)"\s*$/gm;
        let match;
        while ((match = optRe.exec(helpBlock[1])) !== null) {
            flags.push({ flag: match[1].replace(/,\s*/, ' / '), description: match[2].trim() });
        }
    }

    // Ensure known flags exist even if help echo formatting drifts
    const ensure = [
        { flag: '--skip-os-check', description: 'Skip OS version compatibility checks' },
        { flag: '--force-arm', description: 'Bypass ARM architecture warnings and checks' },
        { flag: '--skip-install-check', description: 'Skip check for existing installation' },
        { flag: '--skip-virt-check', description: 'Skip virtualization compatibility checks' },
        { flag: '--skip-system-update', description: 'Skip apt update and essential package installation' },
        {
            flag: '--refresh-docker-updater-only',
            description: 'Rewrite /etc/featherpanel host updater scripts only (no full install)',
        },
        {
            flag: '--wings-install-only',
            description: 'Install FeatherWings only (no setup wizard)',
        },
        { flag: '--dev', description: 'Use latest dev release images' },
        { flag: '--dev-branch BRANCH', description: 'Use dev images for a specific branch' },
        { flag: '--dev-sha SHA', description: 'Use dev images for a specific commit SHA' },
        { flag: '--config / -c', description: 'Open configuration manager' },
        { flag: '--help / -h', description: 'Show help' },
    ];
    for (const item of ensure) {
        const key = item.flag.split(/\s|\//)[0];
        if (!flags.some((f) => f.flag.startsWith(key))) flags.push(item);
    }

    const menus = [
        {
            id: 'main',
            title: 'Main menu',
            items: [
                { key: '1', label: 'Panel', description: 'Web interface install/update/uninstall' },
                { key: '2', label: 'Wings', description: 'Game server daemon' },
                { key: '3', label: 'CLI', description: 'Migration & server management helpers' },
                { key: '4', label: 'SSL Certificates', description: "Let's Encrypt tools" },
                { key: '5', label: 'Databases', description: 'Remote MySQL/MariaDB hosts' },
                { key: '6', label: 'Proxmox VNC Agent', description: 'Install on Proxmox node' },
                { key: '7', label: 'FeatherQuilld Daemon', description: 'WebHosting daemon' },
                { key: '8', label: 'Configuration', description: 'Settings & preferences' },
            ],
        },
        {
            id: 'panel',
            title: 'Panel operations',
            items: [
                { key: '1', label: 'Install Panel', description: 'Docker (recommended) or source mode' },
                { key: '2', label: 'Uninstall Panel', description: 'Removes containers/data (destructive)' },
                { key: '3', label: 'Update Panel', description: 'Pull images / rebuild source' },
                { key: '4', label: 'Backup Manager', description: 'Create/list/restore/export (Docker mode)' },
                { key: '5', label: 'Panel Info', description: 'Live health & resource usage (Docker mode)' },
                { key: '6', label: 'Firewall Manager', description: 'Open required ports (Docker mode)' },
            ],
        },
    ];

    const envAutomation = [
        {
            name: 'FP_COMPONENT',
            description: 'Non-interactive target: panel | wings | …',
            example: 'FP_COMPONENT=panel',
        },
        {
            name: 'FP_ACTION',
            description: 'Non-interactive action: install | update | uninstall | …',
            example: 'FP_ACTION=update',
        },
    ];

    const paths = {
        install_root: '/var/www/featherpanel',
        install_log: '/var/www/featherpanel/install.log',
        config_file: '/var/www/featherpanel/.featherpanel.conf',
        compose_file: '/var/www/featherpanel/docker-compose.yml',
        wings_config: '/etc/featherpanel/config.yml',
        global_cli: '/usr/local/bin/featherpanel',
        backend_container: 'featherpanel_backend',
    };

    return {
        script_version: versionMatch?.[1] || 'unknown',
        source_file: 'installer/install.bash',
        requires_root: true,
        flags,
        menus,
        env_automation: envAutomation,
        paths,
    };
}

function guideMarkdown(meta) {
    return `# FeatherPanel installer (\`install.bash\`)

Docker-first installer/uninstaller for Ubuntu/Debian. Source: \`${meta.source_file}\` (version **${meta.script_version}**).

## How users usually get it

\`\`\`bash
# Public one-liner (stable)
curl -sSL https://get.featherpanel.com/stable.sh | bash

# Or via the global wrapper after a prior install
featherpanel run-script

# From a git checkout
sudo bash installer/install.bash
sudo bash installer/install.bash --help
\`\`\`

**Must run as root** (\`sudo\`).

## What it does (high level)

1. Validates OS / virt / existing install (unless skipped).
2. Interactive main menu (Panel, Wings, CLI helpers, SSL, DBs, Proxmox VNC, Quilld, Configuration).
3. For Panel (Docker mode): installs Docker, writes compose + \`.featherpanel.conf\`, pulls images, starts \`featherpanel_backend\` (+ mysql/redis as configured), installs reverse proxy / tunnel options, installs global \`featherpanel\` CLI.
4. Logs to \`${meta.paths.install_log}\`. Failed installs may upload logs for support tickets.

## CLI flags

| Flag | Description |
| --- | --- |
${meta.flags.map((f) => `| \`${f.flag}\` | ${f.description} |`).join('\n')}

### Dev / pre-release examples

\`\`\`bash
sudo bash installer/install.bash --dev
sudo bash installer/install.bash --dev-branch develop
sudo bash installer/install.bash --dev-branch develop --dev-sha abc1234
\`\`\`

### Wings-only (panel quick-setup)

\`\`\`bash
sudo bash installer/install.bash --wings-install-only
\`\`\`

### Configuration manager only

\`\`\`bash
sudo bash installer/install.bash --config
\`\`\`

## Non-interactive automation

\`\`\`bash
sudo FP_COMPONENT=panel FP_ACTION=update bash installer/install.bash
sudo FP_COMPONENT=panel FP_ACTION=install bash installer/install.bash --dev-branch develop
\`\`\`

| Variable | Meaning |
| --- | --- |
${meta.env_automation.map((e) => `| \`${e.name}\` | ${e.description} (e.g. \`${e.example}\`) |`).join('\n')}

## After install — guide users

| Task | What to tell the user |
| --- | --- |
| Open panel | Visit the URL/port chosen during install (Nginx/Apache/Tunnel/Direct). |
| Run migrations | \`featherpanel migrate\` |
| Change settings | Admin → Settings (\`/admin/settings\`) or \`featherpanel settings\` |
| Upload logs | \`featherpanel logs\` or share \`${meta.paths.install_log}\` |
| Update panel | Re-run installer → Panel → Update, or \`FP_COMPONENT=panel FP_ACTION=update\` |
| CLI help | \`featherpanel help\` |

See [../cli/usage.md](../cli/usage.md) and [../settings/guide.md](../settings/guide.md).

## Important paths

| Path | Purpose |
| --- | --- |
${Object.entries(meta.paths)
    .map(([k, v]) => `| \`${v}\` | ${k.replace(/_/g, ' ')} |`)
    .join('\n')}

## Menus (interactive)

${meta.menus
    .map(
        (menu) =>
            `### ${menu.title}\n\n` +
            menu.items.map((i) => `- **[${i.key}] ${i.label}** — ${i.description}`).join('\n'),
    )
    .join('\n\n')}

## AI support tips

- Prefer Docker mode for most users; source mode is advanced.
- Never invent flags — use the table above.
- For install failures: ask for \`${meta.paths.install_log}\` and any paste URLs the installer printed.
- Remote shell (sshx) is **only** when FeatherPanel staff request it in an active ticket (Admin → Settings → Support).
- After install, \`featherpanel\` wraps \`docker exec … php cli\`.
- Settings keys: use [../settings/all.json](../settings/all.json), not guesses.
`;
}

function indexMarkdown(meta) {
    return `# FeatherPanel installer docs

- [Full guide](./guide.md)
- [all.json](./all.json)

Script version: **${meta.script_version}**

Quick start:

\`\`\`bash
curl -sSL https://get.featherpanel.com/stable.sh | bash
# or
sudo bash installer/install.bash --help
\`\`\`
`;
}

function generatePage(meta) {
    const flagRows = meta.flags
        .map(
            (f) =>
                `<tr data-fp-search-item data-fp-search-text="${escapeHtml(`${f.flag} ${f.description}`)}"><td><code>${escapeHtml(f.flag)}</code></td><td>${escapeHtml(f.description)}</td></tr>`,
        )
        .join('\n');

    const body = `${hero({
        title: 'Installer',
        subtitle: `install.bash v${escapeHtml(meta.script_version)} — Docker-first Ubuntu/Debian installer, updates, Wings, SSL, and the global featherpanel CLI.`,
        badges: [`${meta.flags.length} flags`, 'root required'],
        formats: [
            { href: `${DOCS_BASE}/installer/guide.md`, label: 'guide.md' },
            { href: `${DOCS_BASE}/installer/all.json`, label: 'all.json' },
            { href: `${DOCS_BASE}/cli/usage.md`, label: 'CLI usage' },
        ],
    })}
<section class="fp-section fp-card">
  <h2>One-liners</h2>
  <pre><code>curl -sSL https://get.featherpanel.com/stable.sh | bash
sudo bash installer/install.bash --help
featherpanel run-script</code></pre>
</section>
<section class="fp-section">
  <h2>Flags</h2>
  <input class="fp-search" type="search" placeholder="Filter flags…" data-fp-search />
  <table class="fp-table">
    <thead><tr><th>Flag</th><th>Description</th></tr></thead>
    <tbody>${flagRows}</tbody>
  </table>
</section>
<p class="fp-muted">Full AI/ops guide: <a href="${DOCS_BASE}/view.html?doc=installer/guide.md">installer/guide.md</a></p>`;

    return renderDocsPage({
        title: 'Installer',
        active: 'installer',
        body,
        includeSearchScript: true,
    });
}

ensureDir(INSTALLER_DOCS_DIR);

console.log('Extracting installer documentation…');
const source = fs.existsSync(INSTALLER_BASH) ? fs.readFileSync(INSTALLER_BASH, 'utf8') : '';
const meta = parseInstallerMeta(source);

writeText(path.join(INSTALLER_DOCS_DIR, 'index.html'), generatePage(meta));
writeMarkdown(path.join(INSTALLER_DOCS_DIR, 'index.md'), indexMarkdown(meta));
writeMarkdown(path.join(INSTALLER_DOCS_DIR, 'guide.md'), guideMarkdown(meta));
writeJson(path.join(INSTALLER_DOCS_DIR, 'index.json'), {
    type: 'featherpanel.installer.index',
    script_version: meta.script_version,
    flag_count: meta.flags.length,
});
writeJson(path.join(INSTALLER_DOCS_DIR, 'all.json'), {
    type: 'featherpanel.installer.all',
    generated_at: new Date().toISOString(),
    ...meta,
    public_urls: {
        stable: 'https://get.featherpanel.com/stable.sh',
        docs_cli: `${DOCS_BASE}/cli/usage.md`,
        docs_settings: `${DOCS_BASE}/settings/guide.md`,
    },
});

console.log(`✅ Installer docs ready (v${meta.script_version}, ${meta.flags.length} flags)`);
console.log(`   - ${DOCS_BASE}/installer/`);
console.log(`   - ${DOCS_BASE}/installer/guide.md`);
console.log(`   - ${DOCS_BASE}/installer/all.json`);
