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

import Link from 'next/link';
import { CircleUser, LayoutDashboard, Menu, Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';

/** Phone-only bottom bar for the main user areas. Hidden from sm up, safe-area aware. */
export function MobileBottomNav({ pathname, onMenuClick }: { pathname: string; onMenuClick: () => void }) {
    const { t } = useTranslation();
    const items = [
        { href: '/dashboard', label: t('navbar.bottom_nav.home'), icon: LayoutDashboard, exact: true },
        { href: '/dashboard/servers', label: t('navbar.bottom_nav.servers'), icon: Server },
        { href: '/dashboard/account', label: t('navbar.bottom_nav.account'), icon: CircleUser },
    ];

    return (
        <nav
            aria-label={t('navbar.bottom_nav.label')}
            className='fp-bottom-nav fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:hidden'
        >
            <div className='fp-chrome-surface border-border/60 mx-auto flex max-w-md items-stretch justify-around rounded-2xl border p-1 shadow-[0_-8px_30px_-16px_hsl(var(--foreground)/0.35)] backdrop-blur-xl'>
                {items.map((item) => {
                    const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[11px] font-medium transition-colors active:scale-95 motion-reduce:active:scale-100',
                                active ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <item.icon className='h-5 w-5' aria-hidden />
                            <span className='max-w-full truncate'>{item.label}</span>
                        </Link>
                    );
                })}
                <button
                    type='button'
                    onClick={onMenuClick}
                    className='text-muted-foreground hover:text-foreground flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[11px] font-medium transition-colors active:scale-95 motion-reduce:active:scale-100'
                >
                    <Menu className='h-5 w-5' aria-hidden />
                    <span className='max-w-full truncate'>{t('navbar.bottom_nav.menu')}</span>
                </button>
            </div>
        </nav>
    );
}
