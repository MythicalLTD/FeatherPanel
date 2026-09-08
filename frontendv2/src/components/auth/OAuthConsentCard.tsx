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
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Check, Lock, Shield } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { useTheme } from '@/contexts/ThemeContext';
import { useSettings } from '@/contexts/SettingsContext';
import { cn } from '@/lib/utils';

/**
 * Matches backend/storage/modules/pma auth transition layout:
 * centered shell → brand block → one card. No dashboard chrome / glow layers.
 */
export function OAuthConsentShell({ children, className }: { children: ReactNode; className?: string }) {
    const { theme } = useTheme();
    const { settings } = useSettings();
    const panelName = settings?.app_name || 'FeatherPanel';
    const panelLogo =
        theme === 'dark'
            ? settings?.app_logo_dark || settings?.app_logo_white || '/assets/logo.png'
            : settings?.app_logo_white || settings?.app_logo_dark || '/assets/logo.png';

    return (
        <div className='bg-background text-foreground flex min-h-dvh items-center justify-center p-6'>
            <div className={cn('w-full max-w-md', className)}>
                <div className='mb-6 flex flex-col items-center gap-4'>
                    <div className='border-border/80 bg-card/80 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border'>
                        <Image
                            src={panelLogo}
                            alt={panelName}
                            width={56}
                            height={56}
                            className='object-contain p-1.5'
                            unoptimized
                        />
                    </div>
                    <div className='text-center'>
                        <Link href='/' className='text-foreground text-xl font-bold tracking-tight hover:opacity-90'>
                            {panelName}
                        </Link>
                        <p className='text-muted-foreground mt-1 text-[0.8125rem]'>Application authorization</p>
                    </div>
                </div>
                {children}
            </div>
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
    return (
        <div className='border-border bg-card/95 text-card-foreground rounded-3xl border p-7 shadow-[0_24px_48px_hsl(var(--background)/0.35)] sm:px-7 sm:py-8'>
            <div className='space-y-5 text-center'>
                <div className='flex items-center justify-center gap-3'>
                    <div className='bg-muted/60 border-border flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border'>
                        {appLogo ? (
                            <Image src={appLogo} alt={appName} width={48} height={48} className='object-cover' />
                        ) : (
                            <Shield className='text-muted-foreground h-5 w-5' />
                        )}
                    </div>
                    <span className='text-muted-foreground text-sm' aria-hidden>
                        →
                    </span>
                    <div className='bg-muted/60 border-border text-muted-foreground flex h-12 w-12 items-center justify-center rounded-full border text-xs font-semibold'>
                        You
                    </div>
                </div>

                <div className='space-y-1'>
                    <h1 className='text-foreground text-[1.0625rem] font-semibold tracking-tight'>{appName}</h1>
                    <p className='text-muted-foreground text-sm leading-relaxed'>{subtitle}</p>
                    {signedInAs ? (
                        <p className='text-muted-foreground pt-1 text-xs'>
                            Signed in as <span className='text-foreground font-medium'>{signedInAs}</span>
                        </p>
                    ) : null}
                </div>

                {permissions.length > 0 ? (
                    <div className='border-border space-y-2.5 rounded-2xl border px-3.5 py-3 text-left'>
                        {permissions.map((item) => (
                            <div key={item.label} className='flex items-start gap-2.5 text-sm'>
                                <span
                                    className={cn(
                                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                                        item.allowed === false
                                            ? 'bg-destructive/15 text-destructive'
                                            : 'bg-primary/15 text-primary',
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
                    <ul className='text-muted-foreground space-y-2 text-left text-xs leading-relaxed'>
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
                    <div className='border-destructive/30 bg-destructive/10 text-destructive rounded-2xl border px-3 py-2 text-left text-sm'>
                        {error}
                    </div>
                ) : null}

                {footer}

                <div className='flex items-center justify-between gap-3 pt-1'>
                    <button
                        type='button'
                        onClick={onCancel}
                        disabled={submitting}
                        className='text-muted-foreground hover:text-foreground text-sm font-medium transition-colors disabled:opacity-50'
                    >
                        {cancelLabel}
                    </button>
                    <Button
                        type='button'
                        className='min-w-[7.5rem] rounded-xl'
                        loading={submitting}
                        onClick={onAuthorize}
                    >
                        {authorizeLabel}
                    </Button>
                </div>
            </div>

            <div className='border-border text-muted-foreground mt-8 border-t pt-4 text-center text-xs'>
                Powered by{' '}
                <a
                    href='https://featherpanel.com'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-foreground underline underline-offset-2 hover:opacity-85'
                >
                    FeatherPanel
                </a>
            </div>
        </div>
    );
}
