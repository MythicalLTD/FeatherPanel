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

import React from 'react';
import Link from 'next/link';
import {
    ExternalLink,
    BookOpen,
    MessageSquare,
    Settings,
    Trash2,
    LayoutDashboard,
    Package,
    Shield,
    Server,
    Users,
    ScrollText,
    Puzzle,
    MapPin,
    Languages,
    HardDrive,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import type { LucideIcon } from 'lucide-react';

interface QuickLinksWidgetProps {
    onClearCache: () => void;
    isClearingCache: boolean;
}

interface QuickLink {
    name: string;
    description: string;
    icon: LucideIcon;
    href: string;
    color: string;
    bg: string;
    border: string;
    external?: boolean;
}

export function QuickLinksWidget({ onClearCache, isClearingCache }: QuickLinksWidgetProps) {
    const { t } = useTranslation();

    const manage: QuickLink[] = [
        {
            name: t('admin.quick_links.servers'),
            description: t('admin.quick_links.servers_desc'),
            icon: Server,
            href: '/admin/servers',
            color: 'text-primary',
            bg: 'bg-primary/10',
            border: 'border-primary/20',
        },
        {
            name: t('admin.quick_links.users'),
            description: t('admin.quick_links.users_desc'),
            icon: Users,
            href: '/admin/users',
            color: 'text-primary',
            bg: 'bg-primary/10',
            border: 'border-primary/20',
        },
        {
            name: t('admin.quick_links.nodes'),
            description: t('admin.quick_links.nodes_desc'),
            icon: HardDrive,
            href: '/admin/nodes',
            color: 'text-sky-500',
            bg: 'bg-sky-500/10',
            border: 'border-sky-500/20',
        },
        {
            name: t('admin.quick_links.roles'),
            description: t('admin.quick_links.roles_desc'),
            icon: ScrollText,
            href: '/admin/roles',
            color: 'text-rose-500',
            bg: 'bg-rose-500/10',
            border: 'border-rose-500/20',
        },
        {
            name: t('admin.quick_links.locations'),
            description: t('admin.quick_links.locations_desc'),
            icon: MapPin,
            href: '/admin/locations',
            color: 'text-teal-500',
            bg: 'bg-teal-500/10',
            border: 'border-teal-500/20',
        },
        {
            name: t('admin.quick_links.plugins'),
            description: t('admin.quick_links.plugins_desc'),
            icon: Puzzle,
            href: '/admin/plugins',
            color: 'text-primary',
            bg: 'bg-primary/10',
            border: 'border-primary/20',
        },
    ];

    const system: QuickLink[] = [
        {
            name: t('admin.quick_links.system_settings'),
            description: t('admin.quick_links.system_settings_desc'),
            icon: Settings,
            href: '/admin/settings',
            color: 'text-primary',
            bg: 'bg-primary/10',
            border: 'border-primary/20',
        },
        {
            name: t('admin.quick_links.analytics'),
            description: t('admin.quick_links.analytics_desc'),
            icon: LayoutDashboard,
            href: '/admin/analytics',
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
        },
        {
            name: t('admin.quick_links.updates'),
            description: t('admin.quick_links.updates_desc'),
            icon: Package,
            href: '/admin/updates',
            color: 'text-amber-500',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
        },
        {
            name: t('admin.quick_links.nodes_status'),
            description: t('admin.quick_links.nodes_status_desc'),
            icon: Shield,
            href: '/admin/nodes/status',
            color: 'text-sky-500',
            bg: 'bg-sky-500/10',
            border: 'border-sky-500/20',
        },
        {
            name: t('admin.quick_links.translations'),
            description: t('admin.quick_links.translations_desc'),
            icon: Languages,
            href: '/admin/translations',
            color: 'text-cyan-500',
            bg: 'bg-cyan-500/10',
            border: 'border-cyan-500/20',
        },
        {
            name: t('admin.quick_links.documentation'),
            description: t('admin.quick_links.documentation_desc'),
            icon: BookOpen,
            href: 'https://docs.featherpanel.com',
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            external: true,
        },
        {
            name: t('admin.quick_links.support_discord'),
            description: t('admin.quick_links.support_discord_desc'),
            icon: MessageSquare,
            href: 'https://discord.mythical.systems',
            color: 'text-primary',
            bg: 'bg-primary/10',
            border: 'border-primary/20',
            external: true,
        },
    ];

    const renderLink = (link: QuickLink) => (
        <Link
            key={link.href + link.name}
            href={link.href}
            target={link.external ? '_blank' : undefined}
            rel={link.external ? 'noopener noreferrer' : undefined}
            className='group hover:bg-accent flex min-h-11 items-start gap-3 rounded-lg px-2 py-3 transition-colors'
        >
            <div className='text-muted-foreground flex h-6 w-5 shrink-0 items-center justify-center'>
                <link.icon className='h-4 w-4' aria-hidden />
            </div>
            <div className='min-w-0 flex-1 space-y-1'>
                <p className='text-sm font-medium'>{link.name}</p>
                <p className='text-muted-foreground text-xs leading-relaxed'>{link.description}</p>
            </div>
            {link.external && <ExternalLink className='text-muted-foreground mt-1 h-3.5 w-3.5 shrink-0' aria-hidden />}
        </Link>
    );

    return (
        <PageCard
            title={t('admin.quick_links.title')}
            description={t('admin.quick_links.description')}
            icon={BookOpen}
            className='space-y-4 p-4 sm:p-5 [&>div:first-child]:flex-wrap [&>div:first-child]:gap-3 [&>div:first-child]:pb-4'
            action={
                <button
                    type='button'
                    onClick={onClearCache}
                    disabled={isClearingCache}
                    className='hover:bg-accent flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'
                >
                    <Trash2 className='h-3.5 w-3.5' aria-hidden />
                    <span className='hidden sm:inline'>{t('admin.quick_links.clear_system_cache')}</span>
                    <span className='sm:hidden'>{t('admin.quick_links.clear_cache_short')}</span>
                </button>
            }
        >
            <div className='space-y-4'>
                <div className='space-y-3'>
                    <h3 className='text-muted-foreground text-sm font-medium'>{t('admin.quick_links.group_manage')}</h3>
                    <div className='grid grid-cols-1 gap-x-5 sm:grid-cols-2'>{manage.map(renderLink)}</div>
                </div>

                <div className='space-y-3'>
                    <h3 className='text-muted-foreground text-sm font-medium'>{t('admin.quick_links.group_system')}</h3>
                    <div className='grid grid-cols-1 gap-x-5 sm:grid-cols-2'>{system.map(renderLink)}</div>
                </div>
            </div>
        </PageCard>
    );
}
