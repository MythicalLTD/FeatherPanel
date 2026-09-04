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
import type { ReactNode, Ref } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AuthPageHeader({
    title,
    subtitle,
    icon,
    align = 'center',
    className,
}: {
    title: ReactNode;
    subtitle?: ReactNode;
    icon?: ReactNode;
    align?: 'center' | 'left';
    className?: string;
}) {
    return (
        <div className={cn('space-y-1.5', align === 'center' ? 'text-center' : 'text-left', className)}>
            {icon ? (
                <div
                    className={cn(
                        'bg-primary/12 text-primary ring-primary/15 mb-1 inline-flex h-12 w-12 items-center justify-center rounded-2xl ring-1 [&>svg]:h-6 [&>svg]:w-6',
                        align === 'center' && 'mx-auto',
                    )}
                >
                    {icon}
                </div>
            ) : null}
            <h1 className='text-foreground text-xl leading-tight font-semibold tracking-tight sm:text-2xl'>{title}</h1>
            {subtitle ? (
                <p
                    className={cn(
                        'text-muted-foreground text-sm leading-relaxed',
                        align === 'center' && 'mx-auto max-w-sm',
                    )}
                >
                    {subtitle}
                </p>
            ) : null}
        </div>
    );
}

export function AuthAlert({
    variant = 'error',
    children,
    className,
    action,
}: {
    variant?: 'error' | 'success' | 'info';
    children: ReactNode;
    className?: string;
    action?: ReactNode;
}) {
    if (!children) return null;

    return (
        <div
            role={variant === 'error' ? 'alert' : 'status'}
            className={cn(
                'animate-fade-in rounded-xl border px-3.5 py-3 text-sm leading-relaxed',
                variant === 'error' && 'border-destructive/25 bg-destructive/10 text-destructive',
                variant === 'success' &&
                    'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                variant === 'info' && 'border-primary/20 bg-primary/8 text-foreground',
                className,
            )}
        >
            <div>{children}</div>
            {action ? <div className='mt-3'>{action}</div> : null}
        </div>
    );
}

export function AuthPanel({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('bg-card rounded-lg p-6 shadow-xl sm:p-8', className)}>{children}</div>;
}

export function AuthPage({
    children,
    className,
    rootRef,
}: {
    children: ReactNode;
    className?: string;
    rootRef?: Ref<HTMLDivElement>;
}) {
    return (
        <div ref={rootRef} className={cn('mx-auto flex w-full max-w-md flex-col gap-5', className)}>
            {children}
        </div>
    );
}

export function AuthDivider({ label }: { label: string }) {
    return (
        <div className='relative py-0.5'>
            <div className='absolute inset-0 flex items-center' aria-hidden>
                <div className='border-border/70 w-full border-t' />
            </div>
            <div className='relative flex justify-center text-[10px] font-medium tracking-[0.14em] uppercase'>
                <span className='bg-card/90 text-muted-foreground px-3'>{label}</span>
            </div>
        </div>
    );
}

export function AuthFooterPrompt({
    prompt,
    href,
    linkLabel,
    align = 'center',
    className,
}: {
    prompt: string;
    href: string;
    linkLabel: string;
    align?: 'left' | 'center';
    className?: string;
}) {
    return (
        <p
            className={cn(
                'text-muted-foreground text-sm leading-relaxed',
                align === 'center' ? 'text-center' : 'text-left',
                className,
            )}
        >
            {prompt}{' '}
            <Link
                href={href}
                className='text-primary hover:text-primary/80 font-medium transition-colors hover:underline'
            >
                {linkLabel}
            </Link>
        </p>
    );
}

export function AuthLoadingState({ label }: { label: string }) {
    return (
        <div className='flex flex-col items-center justify-center gap-3 py-14'>
            <div className='border-border/60 bg-card/50 flex h-12 w-12 items-center justify-center rounded-2xl border'>
                <Loader2 className='text-primary h-5 w-5 animate-spin' />
            </div>
            <p className='text-muted-foreground text-sm'>{label}</p>
        </div>
    );
}

export function AuthHeroCard({
    icon,
    title,
    subtitle,
    tone = 'primary',
    className,
}: {
    icon: ReactNode;
    title: ReactNode;
    subtitle?: ReactNode;
    tone?: 'primary' | 'discord';
    className?: string;
}) {
    return (
        <div
            className={cn(
                'space-y-2 rounded-2xl border p-5 text-center',
                tone === 'primary' &&
                    'border-primary/20 from-primary/12 via-primary/5 bg-gradient-to-br to-transparent',
                tone === 'discord' &&
                    'border-[#5865F2]/30 bg-gradient-to-br from-[#5865F2]/20 via-[#5865F2]/5 to-transparent',
                className,
            )}
        >
            <div
                className={cn(
                    'mx-auto mb-1 flex h-12 w-12 items-center justify-center rounded-2xl',
                    tone === 'primary' && 'bg-primary/15 text-primary',
                    tone === 'discord' && 'bg-[#5865F2]/20 text-[#5865F2]',
                )}
            >
                {icon}
            </div>
            <h3 className='text-foreground text-lg font-semibold tracking-tight'>{title}</h3>
            {subtitle ? <p className='text-muted-foreground text-xs leading-relaxed sm:text-sm'>{subtitle}</p> : null}
        </div>
    );
}

export function AuthMetaGrid({ items }: { items: { label: string; value: ReactNode; wide?: boolean }[] }) {
    return (
        <div className='grid gap-2.5 sm:grid-cols-2'>
            {items.map((item) => (
                <div
                    key={item.label}
                    className={cn(
                        'border-border/60 bg-muted/25 rounded-xl border px-3.5 py-3',
                        item.wide && 'sm:col-span-2',
                    )}
                >
                    <p className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'>
                        {item.label}
                    </p>
                    <div className='text-foreground mt-1 text-sm font-medium break-all'>{item.value}</div>
                </div>
            ))}
        </div>
    );
}
