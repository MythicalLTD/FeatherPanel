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

import { useEffect, useRef, useState, type ReactNode } from 'react';
import axios from 'axios';
import { Check, MonitorSmartphone, ShieldX, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

/** Short, human device line from a User-Agent (no raw dump). */
export function summarizeDesktopUa(ua?: string | null): string {
    const value = (ua || '').trim();
    if (!value) return 'Unknown device';

    let browser = 'Browser';
    if (/Edg\//i.test(value)) browser = 'Edge';
    else if (/Chrome\//i.test(value) && !/Chromium/i.test(value)) browser = 'Chrome';
    else if (/Firefox\//i.test(value)) browser = 'Firefox';
    else if (/Safari\//i.test(value) && !/Chrome/i.test(value)) browser = 'Safari';

    let os = 'device';
    if (/Windows/i.test(value)) os = 'Windows';
    else if (/Android/i.test(value)) os = 'Android';
    else if (/iPhone|iPad|iPod/i.test(value)) os = 'iOS';
    else if (/Mac OS X|Macintosh/i.test(value)) os = 'macOS';
    else if (/Linux/i.test(value)) os = 'Linux';

    return `${browser} on ${os}`;
}

function avatarSrc(avatar?: string | null): string | undefined {
    if (!avatar) return undefined;
    if (avatar.startsWith('http') || avatar.startsWith('/')) return avatar;
    return undefined;
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function isQrChallengeGoneError(err: unknown): boolean {
    if (!axios.isAxiosError(err)) return false;
    const code = err.response?.data?.error_code;
    return (
        code === 'QR_CHALLENGE_EXPIRED' ||
        code === 'QR_CHALLENGE_UNAVAILABLE' ||
        code === 'QR_CHALLENGE_CLAIMED' ||
        err.response?.status === 404
    );
}

export function qrErrorMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err)) {
        return err.response?.data?.message || fallback;
    }
    if (err instanceof Error) return err.message;
    return fallback;
}

/** Local countdown + expiry callback based on server expires_in. */
export function useQrExpiresIn(expiresIn: number | null | undefined, onExpired: () => void) {
    const [secondsLeft, setSecondsLeft] = useState<number | null>(
        typeof expiresIn === 'number' ? Math.max(0, Math.floor(expiresIn)) : null,
    );
    const firedRef = useRef(false);

    useEffect(() => {
        firedRef.current = false;
        if (typeof expiresIn !== 'number') {
            setSecondsLeft(null);
            return;
        }

        const endsAt = Date.now() + Math.max(0, expiresIn) * 1000;
        const tick = () => {
            const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
            setSecondsLeft(left);
            if (left <= 0 && !firedRef.current) {
                firedRef.current = true;
                onExpired();
            }
        };
        tick();
        const id = window.setInterval(tick, 500);
        return () => window.clearInterval(id);
    }, [expiresIn, onExpired]);

    return secondsLeft;
}

export function QrResultScreen({
    variant,
    title,
    description,
    primaryLabel,
    onPrimary,
    secondaryLabel,
    onSecondary,
}: {
    variant: 'approved' | 'denied' | 'expired' | 'error';
    title: string;
    description: string;
    primaryLabel: string;
    onPrimary: () => void;
    secondaryLabel?: string;
    onSecondary?: () => void;
}) {
    const icon =
        variant === 'approved' ? (
            <Check className='h-7 w-7' strokeWidth={2.5} />
        ) : variant === 'denied' ? (
            <ShieldX className='h-7 w-7' />
        ) : (
            <TriangleAlert className='h-7 w-7' />
        );

    return (
        <div className='animate-fade-in-up mx-auto flex min-h-[70svh] w-full max-w-md flex-col justify-center px-1 pb-[max(1rem,env(safe-area-inset-bottom))]'>
            <div className='border-border/50 bg-card space-y-5 rounded-2xl border p-6 text-center shadow-xl'>
                <div
                    className={cn(
                        'animate-qr-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full',
                        variant === 'approved' && 'bg-emerald-500/15 text-emerald-500',
                        variant === 'denied' && 'bg-destructive/15 text-destructive',
                        (variant === 'expired' || variant === 'error') && 'bg-amber-500/15 text-amber-500',
                    )}
                >
                    {icon}
                </div>
                <div className='space-y-2'>
                    <h1 className='text-foreground text-2xl font-semibold tracking-tight'>{title}</h1>
                    <p className='text-muted-foreground text-sm leading-relaxed'>{description}</p>
                </div>
                <div className='space-y-2.5 pt-1'>
                    <Button type='button' className='h-12 w-full text-base' onClick={onPrimary}>
                        {primaryLabel}
                    </Button>
                    {secondaryLabel && onSecondary ? (
                        <Button
                            type='button'
                            variant='outline'
                            className='h-11 w-full tracking-normal normal-case'
                            onClick={onSecondary}
                        >
                            {secondaryLabel}
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}

export function QrApprovePrompt({
    title,
    subtitle,
    userCode,
    desktopIp,
    desktopUa,
    accountName,
    accountAvatar,
    expiresIn,
    onExpired,
    error,
    submitting,
    approveLabel,
    denyLabel,
    onApprove,
    onDeny,
    footer,
    className,
}: {
    title: string;
    subtitle: string;
    userCode?: string | null;
    desktopIp?: string | null;
    desktopUa?: string | null;
    accountName?: string | null;
    accountAvatar?: string | null;
    expiresIn?: number | null;
    onExpired?: () => void;
    error?: string | null;
    submitting?: boolean;
    approveLabel: string;
    denyLabel: string;
    onApprove: () => void;
    onDeny: () => void;
    footer?: ReactNode;
    className?: string;
}) {
    const deviceLine = summarizeDesktopUa(desktopUa);
    const src = avatarSrc(accountAvatar);
    const name = (accountName || '').trim();
    const { t } = useTranslation();
    const secondsLeft = useQrExpiresIn(expiresIn, onExpired ?? (() => undefined));
    const expired = secondsLeft !== null && secondsLeft <= 0;

    return (
        <div
            className={cn(
                'animate-fade-in-up mx-auto flex min-h-[70svh] w-full max-w-md flex-col px-1 pb-[max(1rem,env(safe-area-inset-bottom))] sm:min-h-0',
                className,
            )}
        >
            <div className='flex flex-1 flex-col justify-center space-y-6'>
                <div className='space-y-3 text-center'>
                    <div className='relative mx-auto flex h-16 w-16 items-center justify-center'>
                        <span
                            aria-hidden
                            className='border-primary/30 animate-qr-ring absolute inset-0 rounded-2xl border'
                        />
                        <div className='bg-primary/12 text-primary animate-qr-pop relative flex h-14 w-14 items-center justify-center rounded-2xl'>
                            <MonitorSmartphone className='h-7 w-7' />
                        </div>
                    </div>
                    <h1 className='text-foreground text-[1.65rem] leading-tight font-semibold tracking-tight'>
                        {title}
                    </h1>
                    <p className='text-muted-foreground mx-auto max-w-xs text-sm leading-relaxed'>{subtitle}</p>
                </div>

                <div className='border-border/50 bg-card/95 space-y-4 rounded-2xl border p-4 shadow-xl sm:p-5'>
                    {error ? (
                        <p className='text-destructive animate-fade-in text-center text-sm' role='alert'>
                            {error}
                        </p>
                    ) : null}

                    {name ? (
                        <div className='bg-muted/35 flex items-center gap-3 rounded-xl px-3 py-2.5'>
                            <div className='bg-background ring-border relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1'>
                                {src ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={src} alt='' className='h-full w-full object-cover' />
                                ) : (
                                    <span className='text-foreground text-sm font-semibold'>{initials(name)}</span>
                                )}
                            </div>
                            <div className='min-w-0 text-left'>
                                <p className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'>
                                    {t('auth.qr.approvingAs')}
                                </p>
                                <p className='text-foreground truncate text-sm font-semibold'>{name}</p>
                            </div>
                        </div>
                    ) : null}

                    <div className='bg-muted/40 space-y-1 rounded-xl px-4 py-3.5 text-center'>
                        <p className='text-foreground text-sm font-medium'>{deviceLine}</p>
                        {desktopIp ? <p className='text-muted-foreground font-mono text-xs'>{desktopIp}</p> : null}
                        {userCode ? (
                            <p className='text-foreground pt-1.5 font-mono text-xl tracking-[0.22em]'>{userCode}</p>
                        ) : null}
                        {secondsLeft !== null ? (
                            <p
                                className={cn(
                                    'pt-2 text-xs font-medium',
                                    secondsLeft <= 30 ? 'text-amber-500' : 'text-muted-foreground',
                                )}
                            >
                                {t('auth.qr.expiresIn', { seconds: String(secondsLeft) })}
                            </p>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className='mt-6 space-y-2.5'>
                <Button
                    type='button'
                    className='h-12 w-full text-base shadow-md'
                    disabled={submitting || expired}
                    loading={submitting}
                    onClick={onApprove}
                >
                    {approveLabel}
                </Button>
                <Button
                    type='button'
                    variant='outline'
                    className='h-11 w-full tracking-normal normal-case'
                    disabled={submitting || expired}
                    onClick={onDeny}
                >
                    {denyLabel}
                </Button>
                {footer}
            </div>
        </div>
    );
}
