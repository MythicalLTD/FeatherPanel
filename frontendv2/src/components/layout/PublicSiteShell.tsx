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
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

interface PublicSiteShellProps {
    children: React.ReactNode;
}

function isExternalUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
}

export default function PublicSiteShell({ children }: PublicSiteShellProps) {
    const pathname = usePathname();
    const { settings } = useSettings();
    const { t } = useTranslation();

    const appName = settings?.app_name?.trim() || 'FeatherPanel';
    const appDescription =
        settings?.app_seo_description?.trim() ||
        settings?.app_pwa_description?.trim() ||
        t('public_portal.description');
    const logo = settings?.app_logo_dark?.trim() || settings?.app_logo_white?.trim() || '/assets/logo.png';
    const homeHref = settings?.website_url?.trim() || settings?.app_url?.trim() || '/';

    const navItems = [
        {
            href: '/status',
            label: t('public_portal.nav.status'),
            active: pathname === '/status' || pathname.startsWith('/status/'),
            enabled:
                settings?.status_page_enabled === 'true' && (settings?.status_page_public_enabled ?? 'true') === 'true',
        },
        {
            href: '/knowledgebase',
            label: t('public_portal.nav.knowledgebase'),
            active: pathname === '/knowledgebase' || pathname.startsWith('/knowledgebase/'),
            enabled:
                settings?.knowledgebase_enabled === 'true' &&
                (settings?.knowledgebase_public_enabled ?? 'true') === 'true',
        },
    ].filter((item) => item.enabled);

    return (
        <div className='min-h-screen flex flex-col'>
            <header className='sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl'>
                <div className='mx-auto w-full max-w-7xl px-4 md:px-8'>
                    <div className='flex h-16 items-center justify-between gap-4'>
                        {isExternalUrl(homeHref) ? (
                            <a href={homeHref} target='_blank' rel='noreferrer' className='flex items-center gap-3'>
                                <Image
                                    src={logo}
                                    alt={appName}
                                    width={32}
                                    height={32}
                                    unoptimized
                                    className='h-8 w-8 rounded-md object-cover'
                                />
                                <div className='leading-tight'>
                                    <p className='font-bold tracking-tight'>{appName}</p>
                                    <p className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
                                        {t('public_portal.label')}
                                    </p>
                                </div>
                            </a>
                        ) : (
                            <Link href={homeHref} className='flex items-center gap-3'>
                                <Image
                                    src={logo}
                                    alt={appName}
                                    width={32}
                                    height={32}
                                    unoptimized
                                    className='h-8 w-8 rounded-md object-cover'
                                />
                                <div className='leading-tight'>
                                    <p className='font-bold tracking-tight'>{appName}</p>
                                    <p className='text-[11px] uppercase tracking-[0.18em] text-muted-foreground'>
                                        {t('public_portal.label')}
                                    </p>
                                </div>
                            </Link>
                        )}

                        <nav className='flex items-center gap-2 rounded-xl border border-border/50 bg-card/50 p-1'>
                            {navItems.map((item) => {
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                                            item.active
                                                ? 'bg-primary/15 text-primary'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                                        )}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            </header>

            <main className='flex-1'>{children}</main>

            <footer className='mt-10 border-t border-border/60 bg-card/20'>
                <div className='mx-auto w-full max-w-7xl px-4 py-6 md:px-8'>
                    <div className='flex flex-col gap-5 md:flex-row md:items-end md:justify-between'>
                        <div className='max-w-md'>
                            <p className='text-sm font-semibold'>{appName}</p>
                            <p className='mt-1 text-xs leading-5 text-muted-foreground'>{appDescription}</p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
