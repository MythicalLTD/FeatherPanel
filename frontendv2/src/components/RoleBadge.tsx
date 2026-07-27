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

import Image from 'next/image';
import type { ComponentType } from 'react';
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

function RoleBadgeIcon({ src, size }: { src: string; size: 'xs' | 'sm' }) {
    const dimension = size === 'sm' ? 14 : 12;

    return (
        <Image
            src={src}
            alt=''
            width={dimension}
            height={dimension}
            className='shrink-0 rounded-sm object-cover'
            unoptimized
        />
    );
}

export function RoleBadge({ role, variant = 'soft', size = 'xs', className }: RoleBadgeProps) {
    const styles = getRoleBadgeStyles(role, variant);
    const badgeIcon = role.badge_icon?.trim();

    return (
        <span
            className={cn(
                'inline-flex max-w-full items-center gap-1 truncate rounded-md leading-tight font-medium',
                size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-px text-[11px]',
                className,
            )}
            style={styles}
        >
            {badgeIcon && <RoleBadgeIcon src={badgeIcon} size={size} />}
            {getRoleBadgeLabel(role)}
        </span>
    );
}

export function RoleIconAvatar({
    role,
    className,
    iconClassName,
    fallbackIcon: FallbackIcon,
}: {
    role: RoleBadgeRole;
    className?: string;
    iconClassName?: string;
    fallbackIcon: ComponentType<{ className?: string }>;
}) {
    const badgeIcon = role.badge_icon?.trim();
    const color = normalizeHexColor(role.color);

    if (badgeIcon) {
        return (
            <div
                className={cn('relative shrink-0 overflow-hidden rounded-xl shadow-sm', className)}
                style={{ backgroundColor: color }}
            >
                <Image src={badgeIcon} alt='' fill className='object-cover' unoptimized />
            </div>
        );
    }

    return (
        <div
            className={cn('flex shrink-0 items-center justify-center rounded-xl shadow-sm', className)}
            style={{ backgroundColor: color }}
        >
            <FallbackIcon className={cn('text-white', iconClassName)} />
        </div>
    );
}
