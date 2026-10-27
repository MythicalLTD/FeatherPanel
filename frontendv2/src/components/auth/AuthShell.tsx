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
import type { ReactNode } from 'react';
import ThemeCustomizer from '@/components/layout/ThemeCustomizer';
import { PanelBrandingFooter } from '@/components/branding/PanelBrandingFooter';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { parseAuthFooterStyle, parseAuthTemplate, parseAuthVisualPreset } from '@/lib/authPageConfig';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';
import { Gauge, Server, ShieldCheck } from 'lucide-react';

/** Kept so older call sites compile. */
export function AuthAsideSlot({ children }: { children: ReactNode }) {
    return <>{children}</>;
}

const FEATURES = [
    { icon: Gauge, key: 'auth.shell.feature_fast' },
    { icon: ShieldCheck, key: 'auth.shell.feature_secure' },
    { icon: Server, key: 'auth.shell.feature_modern' },
] as const;

export default function AuthShell({ children }: { children: ReactNode }) {
    const { theme } = useTheme();
    const { settings } = useSettings();
    const { t } = useTranslation();

    const appName = settings?.app_name || 'Panel';
    const logoUrl =
        theme === 'dark'
            ? settings?.app_logo_dark || settings?.app_logo_white || '/assets/logo.png'
            : settings?.app_logo_white || settings?.app_logo_dark || '/assets/logo.png';

    const showThemeCustomizer = settings?.auth_show_theme_customizer !== 'false';
    const footerStyle = parseAuthFooterStyle(settings?.auth_footer_style);
    const template = parseAuthTemplate(settings?.auth_template);
    const visualPreset = parseAuthVisualPreset(settings?.auth_visual_preset);
    const showMarketing = settings?.auth_show_marketing_panel !== 'false';
    const showAside = showMarketing && template === 'split';
    const showSpotlight = showMarketing && template === 'spotlight';
    const asideTitle = settings?.auth_aside_title?.trim() || t('auth.shell.aside_title', { app: appName });
    const tagline = settings?.auth_shell_tagline?.trim() || t('auth.shell.tagline');
    const asideImage = settings?.auth_aside_image_url?.trim();

    const brand = (
        <Link
            href='/'
            className='focus-visible:ring-primary flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2'
        >
            <span className='fp-surface relative h-9 w-9 overflow-hidden rounded-xl border'>
                <Image
                    src={logoUrl}
                    alt={appName}
                    width={36}
                    height={36}
                    className='object-contain p-1'
                    unoptimized
                    priority
                />
            </span>
            <span className='text-foreground text-base font-semibold tracking-tight'>{appName}</span>
        </Link>
    );

    return (
        <div
            data-auth-preset={visualPreset}
            className={cn(
                'auth-shell relative flex min-h-svh w-full flex-col',
                visualPreset === 'aurora' && 'bg-background',
                visualPreset === 'glass' && 'bg-background',
                visualPreset === 'contrast' &&
                    'bg-[linear-gradient(135deg,hsl(var(--background)),hsl(var(--muted)/0.4))]',
            )}
        >
            {/* Light scrim so the configured background stays visible but text keeps contrast. */}
            <div aria-hidden className='bg-background/35 pointer-events-none absolute inset-0' />

            {visualPreset === 'aurora' || visualPreset === 'glass' ? (
                /* Slow theme-coloured aurora + a faint dot grid. CSS only, transform/opacity animations, off with reduced motion. */
                <div aria-hidden className='pointer-events-none absolute inset-0 overflow-hidden'>
                    <div className='animate-auth-blob-1 bg-primary/25 dark:bg-primary/20 absolute -top-40 -left-32 h-[30rem] w-[30rem] rounded-full blur-3xl will-change-transform motion-reduce:animate-none' />
                    <div className='animate-auth-blob-2 bg-primary/15 absolute -right-40 -bottom-48 h-[34rem] w-[34rem] rounded-full blur-3xl will-change-transform motion-reduce:animate-none' />
                    <div className='animate-auth-blob-3 absolute top-1/2 left-1/2 h-[22rem] w-[22rem] rounded-full bg-sky-400/10 blur-3xl will-change-transform motion-reduce:animate-none dark:bg-sky-400/[0.07]' />
                    <div className='fp-auth-grid absolute inset-0' />
                </div>
            ) : null}

            {showThemeCustomizer ? (
                <div className='pointer-events-auto absolute top-3 right-3 z-50 sm:top-4 sm:right-4'>
                    <ThemeCustomizer />
                </div>
            ) : null}

            <main className='relative z-10 flex min-h-svh w-full flex-1 pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]'>
                {showAside ? (
                    <aside className='hidden flex-1 flex-col justify-between p-10 lg:flex xl:p-14'>
                        {brand}
                        <div className='max-w-xl space-y-6'>
                            {asideImage ? (
                                <div className='fp-surface overflow-hidden rounded-2xl border'>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={asideImage} alt='' className='aspect-[16/9] w-full object-cover' />
                                </div>
                            ) : null}
                            <div className='space-y-3'>
                                <h2 className='text-foreground text-3xl leading-tight font-semibold tracking-tight xl:text-4xl'>
                                    {asideTitle}
                                </h2>
                                <p className='text-muted-foreground max-w-md text-base leading-relaxed'>{tagline}</p>
                            </div>
                            {!asideImage ? (
                                <ul className='grid gap-3'>
                                    {FEATURES.map((f) => (
                                        <li
                                            key={f.key}
                                            className='fp-surface flex items-center gap-3 rounded-xl border p-3'
                                        >
                                            <span className='fp-icon-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-lg'>
                                                <f.icon className='h-4 w-4' />
                                            </span>
                                            <span className='text-sm'>{t(f.key)}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>
                        {footerStyle !== 'hidden' ? (
                            <PanelBrandingFooter
                                appName={appName}
                                className={cn('text-left', footerStyle === 'minimal' && 'opacity-70')}
                            />
                        ) : (
                            <span />
                        )}
                    </aside>
                ) : null}

                <section
                    className={cn(
                        'flex min-w-0 flex-1 flex-col px-4 py-5 sm:px-6 sm:py-8',
                        showAside &&
                            'lg:fp-chrome-surface lg:max-w-[50rem] lg:flex-none lg:border-l lg:px-10 xl:w-[50rem]',
                        template === 'centered' && 'bg-background/40',
                        template === 'spotlight' && 'bg-background/40',
                    )}
                >
                    <div className={cn('mb-6 flex shrink-0 justify-center', showAside && 'lg:hidden')}>{brand}</div>
                    <div className='flex flex-1 flex-col justify-start md:justify-center'>
                        <div className='animate-fade-in-up relative isolate mx-auto w-full max-w-md md:max-w-[46rem]'>
                            {/* Soft theme glow behind the form card. */}
                            <div
                                aria-hidden
                                className='bg-primary/20 pointer-events-none absolute inset-x-8 top-10 -z-10 h-2/3 rounded-full opacity-70 blur-3xl dark:opacity-60'
                            />
                            {showSpotlight ? (
                                <div className='border-primary/20 bg-primary/[0.06] mb-5 rounded-2xl border p-5 sm:p-6'>
                                    <div className='flex items-start gap-3'>
                                        <span className='bg-primary/12 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl'>
                                            <Server className='h-5 w-5' />
                                        </span>
                                        <div className='min-w-0'>
                                            <h2 className='text-foreground text-lg font-semibold tracking-tight'>
                                                {asideTitle}
                                            </h2>
                                            <p className='text-muted-foreground mt-1 text-sm leading-relaxed'>
                                                {tagline}
                                            </p>
                                        </div>
                                    </div>
                                    <div className='mt-4 flex flex-wrap gap-2'>
                                        {FEATURES.map((feature) => (
                                            <span
                                                key={feature.key}
                                                className='border-border/60 bg-background/55 text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs'
                                            >
                                                <feature.icon className='text-primary h-3.5 w-3.5' />
                                                {t(feature.key)}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                            {children}
                        </div>
                    </div>
                    {footerStyle !== 'hidden' ? (
                        <PanelBrandingFooter
                            appName={appName}
                            className={cn(
                                'mx-auto mt-6 w-full max-w-md shrink-0 pb-2 text-center sm:mt-8',
                                footerStyle === 'minimal' && 'opacity-70',
                                showAside && 'lg:hidden',
                            )}
                        />
                    ) : null}
                </section>
            </main>
        </div>
    );
}
