/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

/**
 * Flags hardcoded user-facing English across the frontend: toast / confirm /
 * PageHeader title literals, JSX text and user-facing JSX attributes
 * (placeholder, title, aria-label, alt, label, description).
 * Does not replace scan-translations.js.
 *
 * Opt out for a line that is intentionally not translated (brand names,
 * code samples, technical identifiers) with an `i18n-ignore` comment on that
 * line or the line above.
 *
 * Usage: node scripts/scan-hardcoded-ui-strings.js
 * Exit 1 when offenders are found.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.join(__dirname, '../src');

const SCAN_ROOTS = [
    path.join(SRC_DIR, 'app'),
    path.join(SRC_DIR, 'components'),
    path.join(SRC_DIR, 'hooks'),
    path.join(SRC_DIR, 'contexts'),
];

/** Files rendered outside the translation provider, or vendored UI primitives. */
const EXEMPT_FILES = [
    /app\/\(app\)\/global-error\.tsx$/,
    /app\/\(app\)\/layout\.tsx$/,
    /\/layout\.tsx$/, // route metadata
    /components\/ui\//,
    /components\/thirdparty\//,
];

/** Product names and technical tokens that stay in English. */
const EXEMPT_TEXT = new Set([
    'FeatherPanel',
    'Nginx',
    'PostgreSQL',
    'MySQL',
    'MariaDB',
    'Redis',
    'MongoDB',
    'ClickHouse',
    'Proxmox',
    'QEMU',
    'LXC',
    'Docker',
    'Wings',
    'Cloudflare',
    'Discord',
    'GitHub',
    'Google',
    'Paper',
    'Spigot',
    'Velocity',
    'Apache',
    'Caddy',
    'Traefik',
    'Restic',
    'PHP',
    'SFTP',
    'FTP',
    'SSH',
    'DNS',
    'CIDR',
    'VNC',
    'OpenAI',
    'Perplexity',
    'OpenRouter',
    'Grok',
    'Gemini',
    'Tab',
    'Esc',
    'Enter',
    'Ctrl',
    'Shift',
    'Alt',
    'Mythic',
    'Pterodactyl',
    'FeatherCloud',
    'FeatherQuilld',
    'FeatherWings',
    'JSON',
    'YAML',
    'TOML',
    'XML',
    'URL',
    'API',
    'UUID',
    'CPU',
    'RAM',
    'UTC',
    'AbuseIPDB',
    'MalwareBazaar',
    'App',
    'Web',
    'Runner',
    'Stable',
    'Beta',
    'VIP',
    'Tor',
    'OAuth 2.0',
    'SQL',
    'NULL',
    'Proxmox Backup Server',
    'Aa Bb Cc',
]);

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    bold: '\x1b[1m',
};

/** toast.success('English') / toast.error("…") with a string literal (not t(...)) */
const TOAST_LITERAL = /\btoast\.(?:success|error|info|warning|message)\s*\(\s*(['"`])((?:(?!\1)[^\\]|\\.)+)\1/g;

/** confirm('…') / window.confirm("…") with string literal */
const CONFIRM_LITERAL = /\b(?:window\.)?confirm\s*\(\s*(['"`])((?:(?!\1)[^\\]|\\.)+)\1/g;

/** >Some English text< on one line inside JSX. Apostrophes live only inside words (never in the
 * separator class) so the repetition stays unambiguous - CodeQL js/redos on #281. */
const JSX_TEXT = /(?<![=\w])>\s*([A-Z][a-z]+(?:['’][a-z]+)?(?:[ ,!?:-]+[A-Za-z][A-Za-z'’]*)+[.!?:…]?)\s*<\/?[A-Za-z]/g;

/** placeholder='English' / title="English" / aria-label='English' … (not ={t(...)}) */
const JSX_ATTR =
    /\s(?:placeholder|title|aria-label|alt|label|description|subtitle|confirmText|cancelText|emptyMessage)\s*=\s*(['"])([A-Z][^'"]*[a-z][^'"]*)\1/g;

/** <PageHeader title='English' or title="English" (not title={t(...)}) */
const PAGE_HEADER_TITLE = /<PageHeader\b[^>]*\btitle\s*=\s*(['"`])((?:(?!\1)[^\\]|\\.)+)\1/g;

function collectFiles(entry, out = []) {
    if (!fs.existsSync(entry)) return out;
    const stat = fs.statSync(entry);
    if (stat.isFile()) {
        if (entry.endsWith('.tsx') || entry.endsWith('.ts')) out.push(entry);
        return out;
    }
    for (const name of fs.readdirSync(entry)) {
        collectFiles(path.join(entry, name), out);
    }
    return out;
}

function lineOf(content, index) {
    return content.substring(0, index).split('\n').length;
}

function isExemptLiteral(text) {
    const trimmed = text.trim();
    if (!trimmed) return true;
    // Pure technical / non-copy
    if (/^[\d\s\-_/.:]+$/.test(trimmed)) return true;
    if (/^(ok|error|true|false)$/i.test(trimmed)) return true;
    if (EXEMPT_TEXT.has(trimmed) || EXEMPT_TEXT.has(trimmed.replace(/[:.]$/, ''))) return true;
    // camelCase / PascalCase identifiers, code, env vars
    if (/^[A-Z][a-z]+[A-Z]\w*$/.test(trimmed)) return true;
    if (/^[A-Z0-9_]+(=|$)/.test(trimmed)) return true;
    if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE) /.test(trimmed)) return true; // SQL samples
    if (/^Java \d+$/.test(trimmed)) return true;
    // Templates made only of interpolations, e.g. `${a} ${b}`
    if (!/[A-Za-z]{2,}/.test(trimmed.replace(/\$\{[^}]*\}/g, ''))) return true;
    return false;
}

function scanFile(file) {
    const content = fs.readFileSync(file, 'utf8');
    const relative = path.relative(path.join(__dirname, '..'), file);
    const hits = [];
    if (EXEMPT_FILES.some((re) => re.test(relative.split(path.sep).join('/')))) return hits;
    const lines = content.split('\n');
    const ignored = (line) => /i18n-ignore/.test(lines[line - 1] || '') || /i18n-ignore/.test(lines[line - 2] || '');

    const run = (regex, kind, group = 2) => {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const text = match[group];
            if (isExemptLiteral(text)) continue;
            if (ignored(lineOf(content, match.index))) continue;
            // Skip if the call already wraps t( somewhere nearby on same statement: rough
            const before = content.slice(Math.max(0, match.index - 40), match.index);
            if (/\bt\s*\(\s*$/.test(before)) continue;
            hits.push({ kind, text: text.slice(0, 120), line: lineOf(content, match.index), file: relative });
        }
    };

    run(TOAST_LITERAL, 'toast');
    run(CONFIRM_LITERAL, 'confirm');
    run(PAGE_HEADER_TITLE, 'PageHeader.title');
    run(JSX_TEXT, 'jsx-text', 1);
    run(JSX_ATTR, 'jsx-attr');

    return hits;
}

function main() {
    console.log(
        `${colors.blue}${colors.bold}Scanning for hardcoded UI strings (toast/confirm/PageHeader/JSX text/attributes)…${colors.reset}\n`,
    );

    const files = SCAN_ROOTS.flatMap((root) => collectFiles(root));
    console.log(`${colors.green}✓ Scanning ${files.length} files.${colors.reset}\n`);

    const allHits = files.flatMap(scanFile);

    if (allHits.length === 0) {
        console.log(`${colors.green}${colors.bold}Success! No hardcoded UI strings found.${colors.reset}`);
        process.exit(0);
    }

    console.log(`${colors.red}${colors.bold}Found ${allHits.length} hardcoded UI string(s):${colors.reset}\n`);
    for (const hit of allHits) {
        console.log(`${colors.yellow}⚠ [${hit.kind}] ${hit.file}:${hit.line}${colors.reset}`);
        console.log(`  "${hit.text}"\n`);
    }
    console.log(`${colors.red}${colors.bold}Validation Failed.${colors.reset}`);
    process.exit(1);
}

main();
