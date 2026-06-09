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

export interface RoleBadgeSource {
    custom_badge?: string | null;
    display_name?: string;
    name?: string;
}

export interface Role {
    id: number;
    name: string;
    display_name: string;
    custom_badge?: string | null;
    color: string;
    created_at: string;
    updated_at: string;
}

export interface RolePermission {
    id: number;
    role_id: number;
    permission: string;
}

export interface RoleForm {
    name: string;
    display_name: string;
    custom_badge: string;
    color: string;
}

export function getRoleBadgeLabel(role: RoleBadgeSource): string {
    const customBadge = role.custom_badge?.trim();
    if (customBadge) {
        return customBadge;
    }

    return role.display_name || role.name || '-';
}

export const ROLE_COLOR_PRESETS = [
    '#5B8DEF',
    '#1976d2',
    '#43a047',
    '#fbc02d',
    '#ef4444',
    '#a855f7',
    '#f97316',
    '#14b8a6',
    '#1a1a1a',
    '#ec4899',
    '#8c00ff',
    '#06b6d4',
];

export function slugifyRoleName(displayName: string): string {
    return displayName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 64);
}

export function pickDefaultRoleColor(roleCount: number): string {
    return ROLE_COLOR_PRESETS[roleCount % ROLE_COLOR_PRESETS.length];
}

export function randomRoleColor(): string {
    return ROLE_COLOR_PRESETS[Math.floor(Math.random() * ROLE_COLOR_PRESETS.length)];
}

export function isDefaultRole(id: number): boolean {
    return id >= 1 && id <= 4;
}
