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

import { useParams, usePathname } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';
import {
    Archive,
    CalendarClock,
    Camera,
    Clock,
    HardDrive,
    Network,
    Settings,
    Shield,
    SquareTerminal,
    Users,
    type LucideIcon,
} from 'lucide-react';
import { useVmInstance } from '@/contexts/VmInstanceContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { ResourcePageHeader, type ServerPageCrumb } from '@/components/server/ServerPageHeader';

/** Same icons as the VDS sidebar, so the header and the active nav item always match. */
const SECTION_ICONS: Record<string, LucideIcon> = {
    activities: Clock,
    backups: Archive,
    snapshots: Camera,
    firewall: Shield,
    schedules: CalendarClock,
    users: Users,
    network: Network,
    boot: HardDrive,
    settings: Settings,
};

interface VdsPageHeaderProps {
    title: string;
    description?: ReactNode;
    icon?: LucideIcon | ComponentType<{ className?: string }>;
    actions?: ReactNode;
    crumbs?: ServerPageCrumb[];
    className?: string;
    children?: ReactNode;
}

/** VDS flavour of the game server page header: Dashboard > VDS hostname > page. */
export function VdsPageHeader({
    title,
    description,
    icon,
    actions,
    crumbs = [],
    className,
    children,
}: VdsPageHeaderProps) {
    const { t } = useTranslation();
    const params = useParams<{ id?: string }>();
    const pathname = usePathname() ?? '';
    const { instance } = useVmInstance();
    const id = params?.id;
    const section = pathname.split('/')[3] ?? '';
    const Icon = icon ?? SECTION_ICONS[section] ?? SquareTerminal;

    const trail: ServerPageCrumb[] = [
        { label: t('navigation.items.dashboard'), href: '/dashboard' },
        {
            label: instance?.hostname || (id ? `VDS #${id}` : t('common.loading')),
            href: id ? `/vds/${id}` : undefined,
        },
        ...crumbs,
    ];

    return (
        <ResourcePageHeader
            trail={trail}
            title={title}
            description={description}
            icon={Icon}
            actions={actions}
            className={className}
        >
            {children}
        </ResourcePageHeader>
    );
}
