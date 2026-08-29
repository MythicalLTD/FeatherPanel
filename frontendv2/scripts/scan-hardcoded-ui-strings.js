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
 * Flags hardcoded user-facing English in toast / confirm / PageHeader title
 * within high-churn product paths. Does not replace scan-translations.js.
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
    path.join(SRC_DIR, 'app/(app)/webspace'),
    path.join(SRC_DIR, 'app/(app)/webspaces'),
    path.join(SRC_DIR, 'components/webspace'),
    path.join(SRC_DIR, 'components/admin/TransferWebSpaceDialog.tsx'),
    path.join(SRC_DIR, 'app/(app)/admin/mail-hosts'),
    path.join(SRC_DIR, 'app/(app)/admin/analytics/plugins'),
    path.join(SRC_DIR, 'app/(app)/admin/webspaces'),
    path.join(SRC_DIR, 'hooks/useWingsWebSocket.ts'),
];

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    bold: '\x1b[1m',
};

/** toast.success('English') / toast.error("…") with a string literal (not t(...)) */
const TOAST_LITERAL =
    /\btoast\.(?:success|error|info|warning|message)\s*\(\s*(['"`])((?:(?!\1)[^\\]|\\.)+)\1/g;

/** confirm('…') / window.confirm("…") with string literal */
const CONFIRM_LITERAL = /\b(?:window\.)?confirm\s*\(\s*(['"`])((?:(?!\1)[^\\]|\\.)+)\1/g;

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
    return false;
}

function scanFile(file) {
    const content = fs.readFileSync(file, 'utf8');
    const relative = path.relative(path.join(__dirname, '..'), file);
    const hits = [];

    const run = (regex, kind) => {
        regex.lastIndex = 0;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const text = match[2];
            if (isExemptLiteral(text)) continue;
            // Skip if the call already wraps t( somewhere nearby on same statement — rough
            const before = content.slice(Math.max(0, match.index - 40), match.index);
            if (/\bt\s*\(\s*$/.test(before)) continue;
            hits.push({ kind, text: text.slice(0, 120), line: lineOf(content, match.index), file: relative });
        }
    };

    run(TOAST_LITERAL, 'toast');
    run(CONFIRM_LITERAL, 'confirm');
    run(PAGE_HEADER_TITLE, 'PageHeader.title');

    return hits;
}

function main() {
    console.log(`${colors.blue}${colors.bold}Scanning for hardcoded UI strings (toast/confirm/PageHeader)…${colors.reset}\n`);

    const files = SCAN_ROOTS.flatMap((root) => collectFiles(root));
    console.log(`${colors.green}✓ Scanning ${files.length} files in WebSpace paths.${colors.reset}\n`);

    const allHits = files.flatMap(scanFile);

    if (allHits.length === 0) {
        console.log(`${colors.green}${colors.bold}Success! No hardcoded toast/confirm/PageHeader strings in scanned paths.${colors.reset}`);
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
