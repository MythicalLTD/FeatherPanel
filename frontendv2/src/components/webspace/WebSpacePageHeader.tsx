/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

'use client';

import type { ComponentType, ReactNode } from 'react';
import { useParams, usePathname } from 'next/navigation';
import {
    Activity,
    AppWindow,
    Archive,
    BarChart3,
    CalendarClock,
    Database,
    Folder,
    Globe,
    KeyRound,
    Mail,
    ScrollText,
    Settings,
    ShieldAlert,
    ShieldCheck,
    SquareTerminal,
    Users,
    type LucideIcon,
} from 'lucide-react';
import { ResourcePageHeader, type ServerPageCrumb } from '@/components/server/ServerPageHeader';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpaceContext } from '@/contexts/WebSpaceContext';
import { useContext } from 'react';

const SECTION_ICONS: Record<string, LucideIcon> = {
    files: Folder,
    domains: Globe,
    access: KeyRound,
    backups: Archive,
    schedules: CalendarClock,
    databases: Database,
    email: Mail,
    apps: AppWindow,
    analytics: BarChart3,
    logs: ScrollText,
    activities: Activity,
    users: Users,
    settings: Settings,
    waf: ShieldCheck,
    malware: ShieldAlert,
};

const SECTION_LABEL_KEYS: Record<string, string> = {
    activities: 'activity',
};

interface WebSpacePageHeaderProps {
    title: string;
    description?: ReactNode;
    icon?: LucideIcon | ComponentType<{ className?: string }>;
    actions?: ReactNode;
    crumbs?: ServerPageCrumb[];
    className?: string;
    children?: ReactNode;
}

/**
 * Header card for WebSpace pages, the same layout as the game server pages:
 * breadcrumbs (Dashboard, WebSpace, section), icon tile, title, description and actions.
 */
export function WebSpacePageHeader({
    title,
    description,
    icon,
    actions,
    crumbs = [],
    className,
    children,
}: WebSpacePageHeaderProps) {
    const { t } = useTranslation();
    const params = useParams<{ uuidShort?: string }>();
    const pathname = usePathname() ?? '';
    const webspaceName = useContext(WebSpaceContext)?.webspace?.name;
    const uuidShort = params?.uuidShort;
    const segments = pathname.split('/').filter(Boolean);
    const section = segments[2] ?? '';
    const Icon = icon ?? SECTION_ICONS[section] ?? SquareTerminal;
    const base = uuidShort ? `/webspace/${uuidShort}` : undefined;

    const sectionCrumb: ServerPageCrumb[] =
        segments.length > 3 && base && SECTION_ICONS[section]
            ? [
                  {
                      label: t(`webSpaces.nav.${SECTION_LABEL_KEYS[section] ?? section}`),
                      href: `${base}/${section}`,
                  },
              ]
            : [];

    const trail: ServerPageCrumb[] = [
        { label: t('navigation.items.dashboard'), href: '/dashboard' },
        { label: webspaceName || uuidShort || t('common.loading'), href: base },
        ...sectionCrumb,
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
