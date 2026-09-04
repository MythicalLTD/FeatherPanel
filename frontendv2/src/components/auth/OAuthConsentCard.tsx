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

import Image from 'next/image';
import type { ReactNode } from 'react';
import { Check, Lock, Shield } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { cn } from '@/lib/utils';

export function OAuthConsentShell({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className='relative flex min-h-[70vh] items-center justify-center overflow-hidden p-4 sm:p-6'>
            <div aria-hidden className='pointer-events-none absolute inset-0'>
                <div className='from-primary/30 via-background/30 to-primary/15 absolute inset-0 bg-gradient-to-br' />
                <div className='bg-primary/35 absolute top-[-20%] left-[10%] h-80 w-80 rounded-full blur-3xl' />
                <div className='bg-primary/25 absolute right-[-8%] bottom-[-15%] h-72 w-72 rounded-full blur-3xl' />
            </div>
            <div className={cn('relative z-10 w-full max-w-md', className)}>{children}</div>
        </div>
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
    const { theme } = useTheme();
    const { settings } = useSettings();
    const panelName = settings?.app_name || 'FeatherPanel';
    const panelLogo =
        theme === 'dark'
            ? settings?.app_logo_dark || settings?.app_logo_white || '/assets/logo.png'
            : settings?.app_logo_white || settings?.app_logo_dark || '/assets/logo.png';

    return (
        <div className='bg-card overflow-hidden rounded-lg shadow-2xl'>
            <div className='space-y-5 p-6 sm:p-7'>
                <div className='flex items-center justify-center gap-3'>
                    <div className='bg-muted flex h-14 w-14 items-center justify-center overflow-hidden rounded-full ring-2 ring-black/10'>
                        {appLogo ? (
                            <Image src={appLogo} alt={appName} width={56} height={56} className='object-cover' />
                        ) : (
                            <Shield className='text-muted-foreground h-6 w-6' />
                        )}
                    </div>
                    <div className='text-muted-foreground flex items-center gap-1 text-lg tracking-widest' aria-hidden>
                        <span>·</span>
                        <span>·</span>
                        <span>·</span>
                    </div>
                    <div className='bg-muted flex h-14 w-14 items-center justify-center overflow-hidden rounded-full ring-2 ring-black/10'>
                        <Image
                            src={panelLogo}
                            alt={panelName}
                            width={56}
                            height={56}
                            className='object-contain p-1.5'
                            unoptimized
                        />
                    </div>
                </div>

                <div className='space-y-1 text-center'>
                    <h1 className='text-foreground text-xl font-semibold tracking-tight'>{appName}</h1>
                    <p className='text-muted-foreground text-sm'>{subtitle}</p>
                    {signedInAs ? (
                        <p className='text-muted-foreground pt-1 text-xs'>
                            Signed in as <span className='text-foreground font-medium'>{signedInAs}</span>
                        </p>
                    ) : null}
                </div>

                {permissions.length > 0 ? (
                    <div className='bg-muted/40 space-y-2.5 rounded-md px-3.5 py-3'>
                        {permissions.map((item) => (
                            <div key={item.label} className='flex items-start gap-2.5 text-sm'>
                                <span
                                    className={cn(
                                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                                        item.allowed === false
                                            ? 'bg-destructive/15 text-destructive'
                                            : 'bg-muted-foreground/15 text-foreground',
                                    )}
                                >
                                    {item.allowed === false ? (
                                        <span className='text-xs font-bold'>×</span>
                                    ) : (
                                        <Check className='h-3 w-3' />
                                    )}
                                </span>
                                <span className='text-foreground/90 leading-snug'>{item.label}</span>
                            </div>
                        ))}
                    </div>
                ) : null}

                {meta && meta.length > 0 ? (
                    <ul className='text-muted-foreground space-y-2 text-xs leading-relaxed'>
                        {meta.map((row, idx) => (
                            <li key={idx} className='flex items-start gap-2'>
                                <span className='mt-0.5 shrink-0 opacity-70'>
                                    {row.icon || <Lock className='h-3.5 w-3.5' />}
                                </span>
                                <span>{row.text}</span>
                            </li>
                        ))}
                    </ul>
                ) : null}

                {error ? (
                    <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm'>
                        {error}
                    </div>
                ) : null}

                {footer}
            </div>

            <div className='border-border/50 flex items-center justify-between gap-3 border-t px-5 py-4'>
                <button
                    type='button'
                    onClick={onCancel}
                    disabled={submitting}
                    className='text-muted-foreground hover:text-foreground text-sm font-medium transition-colors disabled:opacity-50'
                >
                    {cancelLabel}
                </button>
                <Button type='button' className='min-w-[7.5rem]' loading={submitting} onClick={onAuthorize}>
                    {authorizeLabel}
                </Button>
            </div>
        </div>
    );
}
