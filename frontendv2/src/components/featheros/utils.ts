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

import type { Server } from '@/types/server';

export function joinPath(dir: string, name: string): string {
    const base = normalizeDir(dir);
    return base === '/' ? `/${name}` : `${base}/${name}`;
}

export function normalizeDir(dir: string | null | undefined): string {
    const cleaned = `/${String(dir || '/')
        .split('/')
        .filter((seg) => seg && seg !== '.')
        .join('/')}`;
    return cleaned;
}

export function parentDir(path: string): string {
    const norm = normalizeDir(path);
    if (norm === '/') return '/';
    const idx = norm.lastIndexOf('/');
    return idx <= 0 ? '/' : norm.slice(0, idx);
}

export function baseName(path: string): string {
    const norm = normalizeDir(path);
    return norm === '/' ? '/' : norm.slice(norm.lastIndexOf('/') + 1);
}

export function formatBytes(bytes: number | null | undefined, decimals = 1): string {
    const value = Number(bytes) || 0;
    if (value <= 0) return '0 B';
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)));
    return `${(value / 1024 ** i).toFixed(i === 0 ? 0 : decimals)} ${units[i]}`;
}

/** Server disk limit is stored in MiB; live usage is bytes. */
export function serverDiskUsage(server: { disk?: number } | undefined, usedBytes?: number | null) {
    const limit = server?.disk && server.disk > 0 ? server.disk * 1024 * 1024 : 0;
    const used = Math.max(0, Number(usedBytes) || 0);
    const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
    return { used, limit, pct };
}

export function formatDiskPair(used: number, limit: number): string {
    if (limit > 0) return `${formatBytes(used, 1)} / ${formatBytes(limit, 0)}`;
    if (used > 0) return formatBytes(used, 1);
    return '-';
}

export function formatUptime(ms: number | null | undefined): string {
    const total = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

export function uid(prefix = 'w'): string {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Normalised live state: offline | starting | running | stopping | installing | suspended | unknown. */
export function serverState(server: Server | undefined, live?: string | null): string {
    if (!server) return 'unknown';
    if (server.suspended === 1 || server.status === 'suspended') return 'suspended';
    if (server.status === 'installing' || server.status === 'install_failed') return server.status;
    const raw = (live || server.stats?.state || server.status || 'offline').toLowerCase();
    if (raw === 'stopped') return 'offline';
    return raw;
}

export function stateColor(state: string): string {
    switch (state) {
        case 'running':
            return 'bg-emerald-500';
        case 'starting':
        case 'stopping':
            return 'bg-amber-400';
        case 'installing':
            return 'bg-sky-400';
        case 'suspended':
        case 'install_failed':
        case 'error':
            return 'bg-red-500';
        default:
            return 'bg-zinc-400';
    }
}

const ARCHIVE_RE = /\.(zip|tar|tar\.gz|tgz|tar\.bz2|tbz2|tar\.xz|txz|gz|bz2|xz|7z|rar|zst|tar\.zst)$/i;
const TEXT_RE =
    /\.(txt|log|md|json|jsonc|ya?ml|toml|ini|cfg|conf|properties|env|xml|html?|css|scss|less|js|mjs|cjs|jsx|ts|tsx|php|py|rb|go|rs|java|kt|c|h|cpp|hpp|cs|lua|sh|bash|zsh|bat|cmd|ps1|sql|csv|tsv|gradle|sk|mcfunction|mcmeta|lang|vue|svelte|dockerfile|gitignore|editorconfig)$/i;

export function isArchive(name: string): boolean {
    return ARCHIVE_RE.test(name);
}

export function isTextLike(name: string, mime?: string): boolean {
    if (TEXT_RE.test(name)) return true;
    if (!name.includes('.')) return true;
    if (mime && (mime.startsWith('text/') || mime.includes('json') || mime.includes('xml'))) return true;
    return false;
}

export function monacoLanguage(name: string): string {
    const lower = name.toLowerCase();
    const ext = lower.includes('.') ? lower.split('.').pop() || '' : lower;
    const map: Record<string, string> = {
        js: 'javascript',
        mjs: 'javascript',
        cjs: 'javascript',
        jsx: 'javascript',
        ts: 'typescript',
        tsx: 'typescript',
        json: 'json',
        jsonc: 'json',
        mcmeta: 'json',
        html: 'html',
        htm: 'html',
        xml: 'xml',
        css: 'css',
        scss: 'scss',
        less: 'less',
        md: 'markdown',
        py: 'python',
        sh: 'shell',
        bash: 'shell',
        yml: 'yaml',
        yaml: 'yaml',
        php: 'php',
        java: 'java',
        kt: 'kotlin',
        go: 'go',
        rs: 'rust',
        rb: 'ruby',
        lua: 'lua',
        sql: 'sql',
        ini: 'ini',
        toml: 'ini',
        cfg: 'ini',
        conf: 'ini',
        properties: 'ini',
        c: 'c',
        h: 'c',
        cpp: 'cpp',
        hpp: 'cpp',
        cs: 'csharp',
        bat: 'bat',
        cmd: 'bat',
        ps1: 'powershell',
        dockerfile: 'dockerfile',
    };
    return map[ext] || 'plaintext';
}

/** Strips ANSI escape sequences from console / log output. */
export function stripAnsi(input: string): string {
    return input.replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '').replace(/\r/g, '');
}

export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), Math.max(min, max));
}
