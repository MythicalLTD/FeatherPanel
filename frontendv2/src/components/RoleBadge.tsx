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

'use client';

import { getRoleBadgeLabel, type RoleBadgeSource } from '@/lib/role-utils';
import { cn } from '@/lib/utils';

const FALLBACK_COLOR = '#666666';

export interface RoleBadgeRole extends RoleBadgeSource {
    color?: string | null;
}

interface RoleBadgeProps {
    role: RoleBadgeRole;
    variant?: 'soft' | 'solid';
    size?: 'xs' | 'sm';
    className?: string;
}

function normalizeHexColor(color?: string | null): string {
    const trimmed = color?.trim();
    if (!trimmed) {
        return FALLBACK_COLOR;
    }

    if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
        return trimmed;
    }

    if (/^#[0-9A-Fa-f]{3}$/.test(trimmed)) {
        const [, r, g, b] = trimmed;
        return `#${r}${r}${g}${g}${b}${b}`;
    }

    return trimmed;
}

function hexWithAlpha(hex: string, alphaHex: string): string {
    if (/^#[0-9A-Fa-f]{6}$/i.test(hex)) {
        return `${hex}${alphaHex}`;
    }

    return hex;
}

export function getRoleBadgeStyles(
    role: RoleBadgeRole,
    variant: 'soft' | 'solid' = 'soft',
): { backgroundColor: string; color: string; border: string } {
    const color = normalizeHexColor(role.color);

    if (variant === 'solid') {
        return {
            backgroundColor: color,
            color: '#ffffff',
            border: 'none',
        };
    }

    return {
        backgroundColor: hexWithAlpha(color, '1A'),
        color,
        border: `1px solid ${hexWithAlpha(color, '40')}`,
    };
}

export function RoleBadge({ role, variant = 'soft', size = 'xs', className }: RoleBadgeProps) {
    const styles = getRoleBadgeStyles(role, variant);

    return (
        <span
            className={cn(
                'inline-flex max-w-full items-center truncate rounded-md leading-tight font-medium',
                size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-px text-[11px]',
                className,
            )}
            style={styles}
        >
            {getRoleBadgeLabel(role)}
        </span>
    );
}
