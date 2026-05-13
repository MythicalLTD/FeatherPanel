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

export const REFORGE_WIDGET_SCRIPT_SRC = 'https://reforgecaptcha.cloud/assets/js/widget.js';

const SCRIPT_ID = 'reforge-captcha-widget-js';

/** Loads reForge widget.js once (used by the React captcha widget). */
export function loadReforgeWidgetScript(): Promise<void> {
    if (typeof window === 'undefined') {
        return Promise.resolve();
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${REFORGE_WIDGET_SCRIPT_SRC}"]`);
    if (existing?.dataset.loaded === 'true') {
        return Promise.resolve();
    }
    if (existing) {
        return new Promise((resolve, reject) => {
            const done = () => {
                existing.dataset.loaded = 'true';
                resolve();
            };
            if (existing.dataset.loaded === 'true') {
                resolve();
                return;
            }
            existing.addEventListener('load', done, { once: true });
            existing.addEventListener('error', () => reject(new Error('reForge script failed')), { once: true });
            if ((existing as HTMLScriptElement & { complete?: boolean }).complete) {
                queueMicrotask(done);
            }
        });
    }

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = SCRIPT_ID;
        script.src = REFORGE_WIDGET_SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.onload = () => {
            script.dataset.loaded = 'true';
            resolve();
        };
        script.onerror = () => {
            script.remove();
            reject(new Error('reForge script failed'));
        };
        document.head.appendChild(script);
    });
}

/**
 * reForge injects `input[name="reforge-captcha-token"]` into the parent form.
 * Fallback when React state has not synced yet from the interactive widget.
 */
export function readReforgeCaptchaTokenFromDom(): string {
    if (typeof document === 'undefined') {
        return '';
    }
    const el = document.querySelector<HTMLInputElement>('input[name="reforge-captcha-token"]');
    return el?.value?.trim() ?? '';
}
