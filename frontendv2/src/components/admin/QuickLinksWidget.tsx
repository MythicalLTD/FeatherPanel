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
import { ExternalLink, BookOpen, MessageSquare, Settings, Zap, Trash2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { cn } from '@/lib/utils';

interface QuickLinksWidgetProps {
    onClearCache: () => void;
    isClearingCache: boolean;
}

export function QuickLinksWidget({ onClearCache, isClearingCache }: QuickLinksWidgetProps) {
    const { t } = useTranslation();

    const links = [
        {
            name: t('admin.quick_links.system_settings'),
            icon: Settings,
            href: '/admin/settings',
            color: 'text-primary',
            bg: 'bg-primary/10',
            border: 'border-primary/20',
            external: false,
        },
        {
            name: t('admin.quick_links.documentation'),
            icon: BookOpen,
            href: 'https://docs.featherpanel.com',
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            external: true,
        },
        {
            name: t('admin.quick_links.support_discord'),
            icon: MessageSquare,
            href: 'https://discord.mythical.systems',
            color: 'text-indigo-500',
            bg: 'bg-indigo-500/10',
            border: 'border-indigo-500/20',
            external: true,
        },
    ];

    return (
        <PageCard title={t('admin.quick_links.title')} description={t('admin.quick_links.description')} icon={Zap}>
            <div className='flex flex-wrap gap-3 md:gap-4'>
                {links.map((link) => (
                    <Link
                        key={link.name}
                        href={link.href}
                        target={link.external ? '_blank' : undefined}
                        rel={link.external ? 'noopener noreferrer' : undefined}
                        className='relative flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl bg-muted/10 border border-border/50 hover:bg-muted/20 hover:scale-[1.02] active:scale-[0.98] transition-all group flex-1 min-w-[200px] sm:min-w-[240px] lg:flex-initial lg:flex-1 xl:flex-initial'
                    >
                        <div
                            className={cn(
                                'h-9 w-9 md:h-10 md:w-10 rounded-lg md:rounded-xl flex items-center justify-center border transition-all shrink-0',
                                link.bg,
                                link.color,
                                link.border,
                            )}
                        >
                            <link.icon className='h-4 w-4 md:h-5 md:w-5' />
                        </div>
                        <div className='min-w-0 flex-1'>
                            <p className='text-[10px] md:text-xs font-black uppercase tracking-widest break-words leading-tight whitespace-normal'>
                                {link.name}
                            </p>
                            {link.external && (
                                <ExternalLink className='h-3 w-3 text-muted-foreground opacity-50 absolute top-3 right-3 md:top-4 md:right-4 shrink-0' />
                            )}
                        </div>
                    </Link>
                ))}

                <button
                    onClick={onClearCache}
                    disabled={isClearingCache}
                    className='relative flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-xl md:rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 hover:scale-[1.02] active:scale-[0.98] transition-all group text-start flex-1 min-w-[200px] sm:min-w-[240px] lg:flex-initial lg:flex-1 xl:flex-initial disabled:opacity-50 disabled:cursor-not-allowed'
                >
                    <div
                        className={cn(
                            'h-9 w-9 md:h-10 md:w-10 rounded-lg md:rounded-xl flex items-center justify-center border border-red-500/20 bg-red-500/10 text-red-500 transition-all shrink-0',
                            isClearingCache && 'animate-pulse',
                        )}
                    >
                        <Trash2 className={cn('h-4 w-4 md:h-5 md:w-5', isClearingCache && 'animate-spin')} />
                    </div>
                    <div className='min-w-0 flex-1'>
                        <p className='text-[10px] md:text-xs font-black uppercase tracking-widest text-red-500 break-words leading-tight whitespace-normal'>
                            {t('admin.quick_links.clear_system_cache')}
                        </p>
                    </div>
                </button>
            </div>
        </PageCard>
    );
}
