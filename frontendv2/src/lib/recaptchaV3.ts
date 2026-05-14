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

declare global {
    interface Window {
        grecaptcha?: {
            ready: (cb: () => void) => void;
            execute: (siteKey: string, options: { action: string }) => Promise<string>;
        };
    }
}

/** Loads `api.js?render=` once per site key; resolves when `grecaptcha.execute` is available. */
export function loadRecaptchaV3Script(siteKey: string): Promise<void> {
    if (typeof window === 'undefined') {
        return Promise.resolve();
    }
    const scriptSrc = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;

    return new Promise((resolve, reject) => {
        const done = () => {
            if (window.grecaptcha?.execute) {
                resolve();
            } else {
                reject(new Error('grecaptcha.execute unavailable'));
            }
        };

        const existing = document.querySelector<HTMLScriptElement>(`script[src="${scriptSrc}"]`);
        if (existing) {
            if (window.grecaptcha?.execute) {
                done();
                return;
            }
            existing.addEventListener('load', () => done(), { once: true });
            existing.addEventListener('error', () => reject(new Error('reCAPTCHA script failed')), { once: true });
            if ((existing as HTMLScriptElement & { complete?: boolean }).complete) {
                queueMicrotask(() => done());
            }
            return;
        }

        const script = document.createElement('script');
        script.src = scriptSrc;
        script.async = true;
        script.defer = true;
        script.onload = () => done();
        script.onerror = () => reject(new Error('reCAPTCHA script failed'));
        document.head.appendChild(script);
    });
}

/** Runs reCAPTCHA v3 `execute` (intended at submit time — token is short-lived). */
export async function executeRecaptchaV3(siteKey: string, action: string): Promise<string | null> {
    if (!siteKey.trim()) {
        return null;
    }
    try {
        await loadRecaptchaV3Script(siteKey.trim());
    } catch {
        return null;
    }
    const g = window.grecaptcha;
    if (!g?.execute) {
        return null;
    }
    return new Promise((resolve) => {
        g.ready(() => {
            g.execute(siteKey.trim(), { action })
                .then((token) => resolve(token || null))
                .catch(() => resolve(null));
        });
    });
}
