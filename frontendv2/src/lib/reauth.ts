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

/**
 * Step-up re-authentication bridge.
 *
 * Sensitive panel endpoints (impersonation, granting admin permissions, creating API keys,
 * editing custom JavaScript) answer `403 REAUTH_REQUIRED` until the session confirms the account
 * again. The axios interceptor in `lib/api.ts` calls `requestReauth()`, the globally mounted
 * `<ReauthDialog />` asks for the password / authenticator code / e-mailed code, and the original
 * request is retried once when the user confirms.
 */

export const REAUTH_REQUIRED_CODE = 'REAUTH_REQUIRED';

export type ReauthMethod = 'password' | 'totp' | 'email_code';

export type ReauthRequest = {
    action?: string;
    methods: ReauthMethod[];
};

type Handler = (request: ReauthRequest) => Promise<boolean>;

let handler: Handler | null = null;
let pending: Promise<boolean> | null = null;

/** Registered by the mounted dialog; returns an unregister function. */
export function setReauthHandler(next: Handler): () => void {
    handler = next;
    return () => {
        if (handler === next) {
            handler = null;
        }
    };
}

const KNOWN_METHODS: ReauthMethod[] = ['password', 'totp', 'email_code'];

export function parseReauthMethods(value: unknown): ReauthMethod[] {
    if (!Array.isArray(value)) {
        return ['password'];
    }
    const methods = value.filter((m): m is ReauthMethod => KNOWN_METHODS.includes(m as ReauthMethod));
    return methods.length > 0 ? methods : ['password'];
}

/**
 * Ask the user to confirm their identity. Parallel callers share one dialog.
 * Resolves true when the session is confirmed, false when cancelled or no dialog is mounted.
 */
export function requestReauth(request: ReauthRequest): Promise<boolean> {
    if (!handler) {
        return Promise.resolve(false);
    }
    if (!pending) {
        pending = handler(request).finally(() => {
            pending = null;
        });
    }
    return pending;
}
