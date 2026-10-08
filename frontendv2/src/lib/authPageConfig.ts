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

export type AuthFormDensity = 'comfortable' | 'compact' | 'dense';
export type AuthSecondaryLayout = 'chips' | 'stack' | 'collapsed';
export type AuthFooterStyle = 'full' | 'minimal' | 'hidden';

export function parseAuthFormDensity(raw: string | undefined): AuthFormDensity {
    const v = (raw ?? 'compact').trim().toLowerCase();
    if (v === 'comfortable' || v === 'dense' || v === 'compact') {
        return v;
    }
    return 'compact';
}

export function parseAuthSecondaryLayout(raw: string | undefined): AuthSecondaryLayout {
    const v = (raw ?? 'chips').trim().toLowerCase();
    if (v === 'stack' || v === 'collapsed' || v === 'chips') {
        return v;
    }
    return 'chips';
}

export function parseAuthFooterStyle(raw: string | undefined): AuthFooterStyle {
    const v = (raw ?? 'full').trim().toLowerCase();
    if (v === 'minimal' || v === 'hidden' || v === 'full') {
        return v;
    }
    return 'full';
}

export function authFormGapClass(density: AuthFormDensity): string {
    switch (density) {
        case 'comfortable':
            return 'space-y-5';
        case 'dense':
            return 'space-y-2.5';
        default:
            return 'space-y-3';
    }
}

export function authPageGapClass(density: AuthFormDensity): string {
    switch (density) {
        case 'comfortable':
            return 'space-y-6';
        case 'dense':
            return 'space-y-3';
        default:
            return 'space-y-4';
    }
}
