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
    Zap,
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
    ArrowUpRight,
} from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { cn } from '@/lib/utils';
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
            color: 'text-violet-500',
            bg: 'bg-violet-500/10',
            border: 'border-violet-500/20',
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
            color: 'text-fuchsia-500',
            bg: 'bg-fuchsia-500/10',
            border: 'border-fuchsia-500/20',
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
            color: 'text-indigo-500',
            bg: 'bg-indigo-500/10',
            border: 'border-indigo-500/20',
            external: true,
        },
    ];

    const renderLink = (link: QuickLink) => (
        <Link
            key={link.href + link.name}
            href={link.href}
            target={link.external ? '_blank' : undefined}
            rel={link.external ? 'noopener noreferrer' : undefined}
            className='bg-muted/10 border-border/50 hover:border-primary/30 hover:bg-muted/20 group relative flex min-h-[5.5rem] items-start gap-4 rounded-2xl border p-4 transition-all hover:scale-[1.01] active:scale-[0.99] md:rounded-3xl md:p-5'
        >
            <div
                className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-105 md:h-12 md:w-12 md:rounded-2xl',
                    link.bg,
                    link.color,
                    link.border,
                )}
            >
                <link.icon className='h-5 w-5' />
            </div>
            <div className='min-w-0 flex-1 space-y-1 pr-5'>
                <p className='text-[11px] leading-snug font-black tracking-widest uppercase md:text-xs'>{link.name}</p>
                <p className='text-muted-foreground text-[11px] leading-relaxed font-medium tracking-normal normal-case md:text-xs'>
                    {link.description}
                </p>
            </div>
            {link.external ? (
                <ExternalLink className='text-muted-foreground absolute top-4 right-4 h-3.5 w-3.5 opacity-40' />
            ) : (
                <ArrowUpRight className='text-muted-foreground absolute top-4 right-4 h-3.5 w-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-60' />
            )}
        </Link>
    );

    return (
        <PageCard
            title={t('admin.quick_links.title')}
            description={t('admin.quick_links.description')}
            icon={Zap}
            className='h-full'
            action={
                <button
                    type='button'
                    onClick={onClearCache}
                    disabled={isClearingCache}
                    className='flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[9px] font-black tracking-widest text-red-500 uppercase transition-all hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50 md:px-4 md:text-[10px]'
                >
                    <Trash2 className={cn('h-3.5 w-3.5', isClearingCache && 'animate-spin')} />
                    <span className='hidden sm:inline'>{t('admin.quick_links.clear_system_cache')}</span>
                    <span className='sm:hidden'>{t('admin.quick_links.clear_cache_short')}</span>
                </button>
            }
        >
            <div className='space-y-6'>
                <div className='space-y-3'>
                    <p className='text-muted-foreground text-[9px] font-black tracking-[0.2em] uppercase md:text-[10px]'>
                        {t('admin.quick_links.group_manage')}
                    </p>
                    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3'>{manage.map(renderLink)}</div>
                </div>

                <div className='space-y-3'>
                    <p className='text-muted-foreground text-[9px] font-black tracking-[0.2em] uppercase md:text-[10px]'>
                        {t('admin.quick_links.group_system')}
                    </p>
                    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
                        {system.map(renderLink)}
                    </div>
                </div>
            </div>
        </PageCard>
    );
}
