/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import Image from 'next/image';
import type { ReactNode } from 'react';
import { Check, CircleX, LockKeyhole } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

export function OAuthConsentShell({ children, className }: { children: ReactNode; className?: string }) {
    const { settings } = useSettings();
    const { theme } = useTheme();
    const appName = settings?.app_name || 'FeatherPanel';
    const logo =
        theme === 'dark'
            ? settings?.app_logo_dark || settings?.app_logo_white || '/assets/logo.png'
            : settings?.app_logo_white || settings?.app_logo_dark || '/assets/logo.png';

    return (
        <main
            className={cn(
                'bg-background text-foreground relative isolate flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10 sm:px-6',
                className,
            )}
        >
            <div
                aria-hidden='true'
                className='pointer-events-none absolute inset-0'
                style={{
                    background:
                        'radial-gradient(ellipse at 50% 0%, hsl(var(--primary) / 0.18), transparent 58%), radial-gradient(ellipse at 100% 100%, hsl(var(--primary) / 0.08), transparent 48%)',
                }}
            />
            <div className='relative z-10 w-full max-w-xl'>
                <header className='mb-6 flex items-center justify-between gap-4 px-1'>
                    <div className='flex min-w-0 items-center gap-3'>
                        <div className='border-border/60 bg-card/90 relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border shadow-sm'>
                            <Image
                                src={logo}
                                alt={appName}
                                width={40}
                                height={40}
                                className='object-contain p-1'
                                unoptimized
                                priority
                            />
                        </div>
                        <span className='truncate text-sm font-semibold tracking-tight'>{appName}</span>
                    </div>
                    <span className='border-border/60 bg-card/60 text-muted-foreground inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium'>
                        <LockKeyhole className='text-primary h-3.5 w-3.5' aria-hidden='true' />
                        OAuth 2.0
                    </span>
                </header>
                {children}
            </div>
        </main>
    );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <section
            className={cn(
                'border-border/60 bg-card/90 rounded-2xl border p-5 shadow-2xl shadow-black/10 backdrop-blur-xl sm:p-7',
                className,
            )}
        >
            {children}
        </section>
    );
}

export function OAuthConsentButton({
    children,
    onClick,
    primary,
    disabled,
}: {
    children: ReactNode;
    onClick: () => void;
    primary?: boolean;
    disabled?: boolean;
}) {
    return (
        <button
            type='button'
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'focus-visible:ring-ring focus-visible:ring-offset-background inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
                primary
                    ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border-border/70 bg-background/50 text-foreground hover:bg-accent hover:text-accent-foreground',
            )}
        >
            {children}
        </button>
    );
}

export function OAuthConsentCard({
    appName,
    appLogo,
    subtitle,
    signedInAs,
    permissions,
    meta,
    error,
    onCancel,
    onAuthorize,
    authorizeLabel,
    cancelLabel,
    submitting,
    footer,
}: {
    appName: string;
    appLogo?: string | null;
    subtitle: string;
    signedInAs?: string | null;
    permissions: { label: string; allowed?: boolean }[];
    meta?: { icon?: ReactNode; text: ReactNode }[];
    error?: string | null;
    onCancel: () => void;
    onAuthorize: () => void;
    authorizeLabel: string;
    cancelLabel: string;
    submitting?: boolean;
    footer?: ReactNode;
}) {
    return (
        <Panel>
            <div className='flex items-start gap-4'>
                <div className='border-border/60 bg-muted/40 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border'>
                    {appLogo ? (
                        <Image
                            src={appLogo}
                            alt={appName}
                            width={56}
                            height={56}
                            className='object-contain'
                            unoptimized
                        />
                    ) : (
                        <LockKeyhole className='text-primary h-6 w-6' aria-hidden='true' />
                    )}
                </div>
                <div className='min-w-0 flex-1 pt-0.5'>
                    <h1 className='text-xl leading-tight font-semibold tracking-tight'>{appName}</h1>
                    <p className='text-muted-foreground mt-1.5 text-sm leading-relaxed'>{subtitle}</p>
                </div>
            </div>

            {signedInAs ? (
                <div className='border-border/60 bg-background/40 text-muted-foreground mt-5 rounded-xl border px-3.5 py-3 text-sm'>
                    Signed in as <span className='text-foreground font-medium'>{signedInAs}</span>
                </div>
            ) : null}

            {permissions.length > 0 ? (
                <div className='border-border/60 bg-background/35 mt-5 rounded-xl border p-4'>
                    <p className='text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase'>
                        This app can
                    </p>
                    <ul className='space-y-3'>
                        {permissions.map((item) => (
                            <li key={item.label} className='flex items-start gap-2.5 text-sm leading-relaxed'>
                                {item.allowed === false ? (
                                    <CircleX className='text-destructive mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' />
                                ) : (
                                    <Check className='text-primary mt-0.5 h-4 w-4 shrink-0' aria-hidden='true' />
                                )}
                                <span className={item.allowed === false ? 'text-destructive' : 'text-foreground'}>
                                    {item.label}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {meta && meta.length > 0 ? (
                <dl className='border-border/60 mt-5 space-y-3 border-t pt-4'>
                    {meta.map((row, idx) => (
                        <div
                            key={idx}
                            className='text-muted-foreground flex items-start gap-2.5 text-xs leading-relaxed'
                        >
                            {row.icon ? (
                                <span className='text-primary mt-0.5 shrink-0' aria-hidden='true'>
                                    {row.icon}
                                </span>
                            ) : null}
                            <div className='min-w-0'>{row.text}</div>
                        </div>
                    ))}
                </dl>
            ) : null}

            {error ? (
                <p role='alert' className='text-destructive mt-4 text-sm font-medium'>
                    {error}
                </p>
            ) : null}

            {footer}

            <div className='border-border/60 mt-6 flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end'>
                <OAuthConsentButton onClick={onCancel} disabled={submitting}>
                    {cancelLabel}
                </OAuthConsentButton>
                <OAuthConsentButton primary onClick={onAuthorize} disabled={submitting}>
                    {authorizeLabel}
                </OAuthConsentButton>
            </div>
        </Panel>
    );
}

export function OAuthConsentMessage({
    title,
    body,
    children,
    error,
}: {
    title: string;
    body?: string;
    children?: ReactNode;
    error?: boolean;
}) {
    return (
        <Panel>
            <h1 className={cn('text-xl font-semibold tracking-tight', error ? 'text-destructive' : 'text-foreground')}>
                {title}
            </h1>
            {body ? <p className='text-muted-foreground mt-2 text-sm leading-relaxed'>{body}</p> : null}
            {children ? <div className='mt-5'>{children}</div> : null}
        </Panel>
    );
}
