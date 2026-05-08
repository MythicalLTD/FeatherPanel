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
                        className='bg-muted/10 border-border/50 hover:bg-muted/20 group relative flex min-w-60 flex-1 items-center gap-3 rounded-xl border p-3 transition-all hover:scale-[1.02] active:scale-[0.98] sm:min-w-[240px] md:gap-4 md:rounded-2xl md:p-4 lg:flex-1 lg:flex-initial xl:flex-initial'
                    >
                        <div
                            className={cn(
                                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-all md:h-10 md:w-10 md:rounded-xl',
                                link.bg,
                                link.color,
                                link.border,
                            )}
                        >
                            <link.icon className='h-4 w-4 md:h-5 md:w-5' />
                        </div>
                        <div className='min-w-0 flex-1'>
                            <p className='wrap-break-words text-[10px] leading-tight font-black tracking-widest whitespace-normal uppercase md:text-xs'>
                                {link.name}
                            </p>
                            {link.external && (
                                <ExternalLink className='text-muted-foreground absolute top-3 right-3 h-3 w-3 shrink-0 opacity-50 md:top-4 md:right-4' />
                            )}
                        </div>
                    </Link>
                ))}

                <button
                    onClick={onClearCache}
                    disabled={isClearingCache}
                    className='group relative flex min-w-50 flex-1 items-center gap-3 rounded-xl border border-red-500/10 bg-red-500/5 p-3 text-start transition-all hover:scale-[1.02] hover:bg-red-500/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[240px] md:gap-4 md:rounded-2xl md:p-4 lg:flex-1 lg:flex-initial xl:flex-initial'
                >
                    <div
                        className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 transition-all md:h-10 md:w-10 md:rounded-xl',
                            isClearingCache && 'animate-pulse',
                        )}
                    >
                        <Trash2 className={cn('h-4 w-4 md:h-5 md:w-5', isClearingCache && 'animate-spin')} />
                    </div>
                    <div className='min-w-0 flex-1'>
                        <p className='wrap-break-words text-[10px] leading-tight font-black tracking-widest whitespace-normal text-red-500 uppercase md:text-xs'>
                            {t('admin.quick_links.clear_system_cache')}
                        </p>
                    </div>
                </button>
            </div>
        </PageCard>
    );
}
