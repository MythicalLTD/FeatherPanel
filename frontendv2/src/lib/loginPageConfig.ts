/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

/** Login method ids used in admin settings and the login page layout. */
export type LoginMethodId = 'local' | 'ldap' | 'passkey' | 'email_code' | 'discord' | 'oidc';

export const ALL_LOGIN_METHOD_IDS: LoginMethodId[] = ['local', 'passkey', 'ldap', 'email_code', 'discord', 'oidc'];

export const DEFAULT_LOGIN_METHODS_ORDER: LoginMethodId[] = [
    'local',
    'passkey',
    'ldap',
    'email_code',
    'discord',
    'oidc',
];

const PRIMARY_PANEL_METHODS: LoginMethodId[] = ['local', 'ldap', 'email_code'];

export interface LoginMethodAvailability {
    local: boolean;
    ldap: boolean;
    passkey: boolean;
    email_code: boolean;
    discord: boolean;
    oidc: boolean;
}

export interface LoginPageLayout {
    /** Panel shown first (full form or dedicated OAuth block). */
    primary: LoginMethodId;
    /** Other methods offered below the primary panel, in configured order. */
    secondary: LoginMethodId[];
    /** All visible methods in display order. */
    ordered: LoginMethodId[];
}

function isLoginMethodId(value: string): value is LoginMethodId {
    return (ALL_LOGIN_METHOD_IDS as string[]).includes(value);
}

function parseCommaList(raw: string | undefined): string[] {
    if (!raw || !raw.trim()) {
        return [];
    }
    return raw
        .split(',')
        .map((part) => part.trim().toLowerCase())
        .filter((part) => part.length > 0);
}

export function parseLoginMethodsOrder(raw: string | undefined): LoginMethodId[] {
    const parsed = parseCommaList(raw).filter(isLoginMethodId);
    const seen = new Set<LoginMethodId>();
    const order: LoginMethodId[] = [];

    for (const id of parsed) {
        if (!seen.has(id)) {
            seen.add(id);
            order.push(id);
        }
    }

    for (const id of DEFAULT_LOGIN_METHODS_ORDER) {
        if (!seen.has(id)) {
            order.push(id);
        }
    }

    return order;
}

export function parseLoginHiddenMethods(raw: string | undefined): Set<LoginMethodId> {
    const hidden = new Set<LoginMethodId>();
    for (const part of parseCommaList(raw)) {
        if (isLoginMethodId(part)) {
            hidden.add(part);
        }
    }
    return hidden;
}

export function parseLoginDefaultMethod(raw: string | undefined): LoginMethodId {
    const normalized = (raw ?? 'local').trim().toLowerCase();
    return isLoginMethodId(normalized) ? normalized : 'local';
}

export function buildLoginPageLayout(
    order: LoginMethodId[],
    hidden: Set<LoginMethodId>,
    defaultMethod: LoginMethodId,
    availability: LoginMethodAvailability,
): LoginPageLayout {
    const ordered = order.filter((id) => !hidden.has(id) && availability[id]);

    if (ordered.length === 0) {
        return { primary: 'local', secondary: [], ordered: ['local'] };
    }

    let primary: LoginMethodId;
    if (ordered.includes(defaultMethod)) {
        primary = defaultMethod;
    } else {
        const preferredPrimary = ordered.find((id) => PRIMARY_PANEL_METHODS.includes(id));
        primary = preferredPrimary ?? ordered[0];
    }

    const secondary = ordered.filter((id) => id !== primary);

    return { primary, secondary, ordered };
}

export function buildLoginMethodAvailability(input: {
    ldapEnabled: boolean;
    emailLoginEnabled: boolean;
    discordEnabled: boolean;
    oidcEnabled: boolean;
    hidePasskey?: boolean;
}): LoginMethodAvailability {
    return {
        local: true,
        ldap: input.ldapEnabled,
        passkey: !input.hidePasskey,
        email_code: input.emailLoginEnabled,
        discord: input.discordEnabled,
        oidc: input.oidcEnabled,
    };
}
