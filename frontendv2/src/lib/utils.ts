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

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Normalize attachment/icon URLs from the API to same-origin paths so they work
 * behind the Next.js proxy regardless of the APP_URL stored in the database.
 */
export function resolveAttachmentUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    const trimmed = url.trim();
    if (trimmed === '') return null;
    if (trimmed.startsWith('/')) return trimmed;

    try {
        const parsed = new URL(trimmed);
        if (parsed.pathname.startsWith('/attachments/') || parsed.pathname.startsWith('/addons/')) {
            return `${parsed.pathname}${parsed.search}`;
        }
    } catch {
        // Not a valid absolute URL return as-is for relative paths without a leading slash.
    }

    return trimmed;
}

/**
 * Allow only schemes safe for <img src> / CSS url().
 * Rejects javascript:, data:, and protocol-relative URLs so DOM-sourced text
 * cannot be reinterpreted as executable markup (CodeQL js/xss-through-dom).
 *
 * Uses startsWith prefix checks (not URL.protocol) so CodeQL recognizes them
 * as URL-scheme sanitizer guards and drops the taint flow.
 */
export function safeImageSrc(url: string | null | undefined): string | null {
    if (!url) return null;
    const trimmed = url.trim();
    if (trimmed === '') return null;

    // Same-origin path only — not protocol-relative "//evil.example".
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
        return trimmed;
    }

    if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
        return trimmed;
    }

    return null;
}

/**
 * Copy text to clipboard with fallback
 */
export async function copyToClipboard(text: string, t?: (key: string) => string) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            // Fallback for non-secure contexts or older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '0';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
            } catch (err) {
                console.error('Fallback copy failed', err);
            }
            textArea.remove();
        }
        toast.success(t ? t('common.copiedToClipboard') : 'Copied to clipboard');
    } catch (err) {
        console.error('Failed to copy text: ', err);
        toast.error(t ? t('common.error') : 'Failed to copy');
    }
}

export function isEnabled(val?: string | boolean | number | null): boolean {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val === 1;
    if (typeof val === 'string') {
        return val === 'true' || val === '1';
    }
    return false;
}

/**
 * For settings that default to enabled unless explicitly disabled (opt-out).
 * Matches backend gates like `getSetting($key, 'true') == 'false'`.
 */
export function isEnabledUnlessExplicitlyFalse(val?: string | boolean | number | null): boolean {
    if (val === undefined || val === null) return true;
    if (typeof val === 'boolean') return val;
    if (typeof val === 'number') return val !== 0;
    const normalized = val.trim().toLowerCase();
    if (normalized === '') return true;
    return normalized !== 'false' && normalized !== '0';
}

export function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
}

/**
 * Format MiB to human-readable size (MiB, GiB, TiB, etc)
 */
export function formatMib(mib: number): string {
    if (mib === 0) return '0 MiB';
    const k = 1024;
    const sizes = ['MiB', 'GiB', 'TiB', 'PiB'];
    const i = Math.floor(Math.log(mib) / Math.log(k));
    // Handle case where i < 0 (mib < 1) by treating as lowest unit (MiB)
    const index = Math.max(0, i);
    // If index >= sizes.length, stick to largest unit
    const safeIndex = Math.min(index, sizes.length - 1);

    return `${Math.round((mib / Math.pow(k, safeIndex)) * 100) / 100} ${sizes[safeIndex]}`;
}

/**
 * Format CPU percentage
 */
export function formatCpu(percent: number): string {
    if (percent === 0) return 'Unlimited'; // Caller should handle translation if needed, or pass unlimited string
    return `${Math.round(percent)}%`;
}

/**
 * Loopback hostnames allowed for OAuth-style callback URLs (e.g. Calagopus VS Code auth).
 * Restricting to these prevents an attacker-supplied `callback_url` query param from being
 * used as an open redirect / arbitrary iframe navigation target.
 */
const LOOPBACK_CALLBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/**
 * Validate that a callback URL is a loopback HTTP(S) URL (localhost, 127.0.0.1, or ::1).
 * Used to guard client-side navigation/iframe targets built from untrusted query params.
 */
export function isLoopbackCallbackUrl(url: string): boolean {
    if (!url) return false;
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
        return LOOPBACK_CALLBACK_HOSTS.has(parsed.hostname.toLowerCase());
    } catch {
        return false;
    }
}

/**
 * Format date string to local locale string
 */
export function formatDate(date: string | null | undefined): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';

    return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

/**
 * Format bytes to human-readable string
 */
export function formatFileSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const safeIndex = Math.max(0, Math.min(i, sizes.length - 1));
    return parseFloat((bytes / Math.pow(k, safeIndex)).toFixed(2)) + ' ' + sizes[safeIndex];
}
