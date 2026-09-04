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

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import QRCode from 'react-qr-code';
import axios from 'axios';
import { Check, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { authApi } from '@/lib/api/auth';
import { cn } from '@/lib/utils';

type QrStatus = 'idle' | 'pending' | 'scanned' | 'approved' | 'denied' | 'expired' | 'error';

type ChallengeState = {
    challengeId: string;
    desktopSecret: string;
    userCode: string;
    verificationUriComplete: string;
    pollInterval: number;
};

type ScannerProfile = {
    username: string;
    display_name: string;
    avatar: string | null;
};

function isSafeInternalRedirectPath(redirect: string | null): redirect is string {
    return Boolean(redirect && redirect.startsWith('/') && !redirect.startsWith('//'));
}

function resolvePostLoginPath(redirect: string | null): string {
    return isSafeInternalRedirectPath(redirect) ? redirect : '/dashboard';
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

export default function LoginQrPanel({ className, compact = false }: { className?: string; compact?: boolean }) {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { fetchSession } = useSession();

    const [status, setStatus] = useState<QrStatus>('idle');
    const [challenge, setChallenge] = useState<ChallengeState | null>(null);
    const [scanner, setScanner] = useState<ScannerProfile | null>(null);
    const [error, setError] = useState('');
    const exchangingRef = useRef(false);
    const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearPoll = useCallback(() => {
        if (pollTimerRef.current) {
            clearTimeout(pollTimerRef.current);
            pollTimerRef.current = null;
        }
    }, []);

    const completeLogin = useCallback(async () => {
        const target = resolvePostLoginPath(searchParams.get('redirect'));
        let ok = await fetchSession(true);
        if (!ok) {
            await new Promise((resolve) => setTimeout(resolve, 250));
            ok = await fetchSession(true);
        }
        if (ok) {
            router.push(target);
        } else {
            window.location.assign(target);
        }
    }, [fetchSession, router, searchParams]);

    const startChallenge = useCallback(async () => {
        clearPoll();
        exchangingRef.current = false;
        setError('');
        setStatus('idle');
        setChallenge(null);
        setScanner(null);

        try {
            const response = await authApi.qrStart();
            if (!response.success || !response.data?.challenge_id || !response.data?.desktop_secret) {
                setStatus('error');
                setError(response.message || t('auth.qr.error'));
                return;
            }

            const next: ChallengeState = {
                challengeId: String(response.data.challenge_id),
                desktopSecret: String(response.data.desktop_secret),
                userCode: String(response.data.user_code || ''),
                verificationUriComplete: String(
                    response.data.verification_uri_complete ||
                        `${window.location.origin}/auth/qr?c=${response.data.challenge_id}`,
                ),
                pollInterval: Math.max(2, Number(response.data.poll_interval) || 2) * 1000,
            };
            setChallenge(next);
            setStatus('pending');
        } catch {
            setStatus('error');
            setError(t('auth.qr.error'));
        }
    }, [clearPoll, t]);

    useEffect(() => {
        if (
            searchParams.get('sso_token') ||
            searchParams.get('discord_token') ||
            searchParams.get('discord_link_token')
        ) {
            return;
        }
        void startChallenge();
        return () => clearPoll();
    }, [clearPoll, searchParams, startChallenge]);

    useEffect(() => {
        if (!challenge) {
            return;
        }

        let cancelled = false;

        const poll = async () => {
            if (cancelled || exchangingRef.current) return;

            try {
                const response = await authApi.qrPoll({
                    challenge_id: challenge.challengeId,
                    desktop_secret: challenge.desktopSecret,
                });

                if (cancelled) return;

                if (!response.success) {
                    if (response.error_code === 'SLOW_DOWN') {
                        pollTimerRef.current = setTimeout(poll, challenge.pollInterval);
                        return;
                    }
                    if (response.error_code === 'QR_CHALLENGE_EXPIRED') {
                        setStatus('expired');
                        setScanner(null);
                        pollTimerRef.current = setTimeout(() => {
                            void startChallenge();
                        }, 1200);
                        return;
                    }
                    setStatus('error');
                    setError(response.message || t('auth.qr.error'));
                    return;
                }

                const nextStatus = String(response.data?.status || 'pending') as QrStatus;
                const nextScanner = response.data?.scanner as ScannerProfile | undefined;
                if (nextScanner?.display_name || nextScanner?.username) {
                    setScanner({
                        username: String(nextScanner.username || nextScanner.display_name),
                        display_name: String(nextScanner.display_name || nextScanner.username),
                        avatar: nextScanner.avatar ? String(nextScanner.avatar) : null,
                    });
                }

                if (nextStatus === 'expired') {
                    setStatus('expired');
                    setScanner(null);
                    pollTimerRef.current = setTimeout(() => {
                        void startChallenge();
                    }, 1200);
                    return;
                }

                if (nextStatus === 'denied') {
                    setStatus('denied');
                    return;
                }

                if (nextStatus === 'scanned') {
                    setStatus('scanned');
                } else if (nextStatus === 'pending') {
                    setStatus('pending');
                    setScanner(null);
                }

                if (nextStatus === 'approved' && response.data?.exchange_token) {
                    exchangingRef.current = true;
                    setStatus('approved');
                    clearPoll();
                    try {
                        const exchange = await authApi.qrExchange({
                            exchange_token: String(response.data.exchange_token),
                        });
                        if (exchange.success) {
                            await completeLogin();
                        } else {
                            exchangingRef.current = false;
                            setStatus('error');
                            setError(exchange.message || t('auth.qr.error'));
                        }
                    } catch {
                        exchangingRef.current = false;
                        setStatus('error');
                        setError(t('auth.qr.error'));
                    }
                    return;
                }

                pollTimerRef.current = setTimeout(poll, challenge.pollInterval);
            } catch (err: unknown) {
                if (cancelled) return;
                if (axios.isAxiosError(err)) {
                    const code = err.response?.data?.error_code;
                    if (code === 'SLOW_DOWN' || err.response?.status === 429) {
                        pollTimerRef.current = setTimeout(poll, challenge.pollInterval);
                        return;
                    }
                    if (code === 'QR_CHALLENGE_EXPIRED') {
                        setStatus('expired');
                        setScanner(null);
                        pollTimerRef.current = setTimeout(() => {
                            void startChallenge();
                        }, 1200);
                        return;
                    }
                }
                pollTimerRef.current = setTimeout(poll, challenge.pollInterval);
            }
        };

        pollTimerRef.current = setTimeout(poll, challenge.pollInterval);
        return () => {
            cancelled = true;
            clearPoll();
        };
    }, [challenge, clearPoll, completeLogin, startChallenge, t]);

    const qrSize = compact ? 128 : 168;
    const showScanned = status === 'scanned' || status === 'approved';
    const displayName = scanner?.display_name || scanner?.username || '';
    const src = avatarSrc(scanner?.avatar);
    const frame = qrSize + 20;

    return (
        <div className={cn('flex h-full w-full flex-col items-center justify-center text-center', className)}>
            {/* Fixed frame so QR ↔ avatar swap never shifts the column */}
            <div className='relative shrink-0' style={{ width: frame, height: frame }}>
                <div
                    className={cn(
                        'absolute inset-0 flex items-center justify-center transition-opacity duration-300 ease-out',
                        showScanned ? 'pointer-events-none opacity-0' : 'opacity-100',
                    )}
                >
                    {challenge?.verificationUriComplete ? (
                        <div className='rounded-xl bg-white p-2.5 shadow-md'>
                            <QRCode value={challenge.verificationUriComplete} size={qrSize} level='M' />
                        </div>
                    ) : (
                        <div
                            className='bg-muted flex items-center justify-center rounded-xl'
                            style={{ width: frame, height: frame }}
                        >
                            <Loader2 className='text-muted-foreground h-5 w-5 animate-spin' />
                        </div>
                    )}
                </div>

                <div
                    className={cn(
                        'absolute inset-0 flex items-center justify-center transition-opacity duration-300 ease-out',
                        showScanned ? 'opacity-100' : 'pointer-events-none opacity-0',
                    )}
                >
                    <div className='relative flex h-full w-full items-center justify-center'>
                        <span
                            aria-hidden
                            className='border-primary/30 animate-qr-ring absolute inset-[8%] rounded-full border-2'
                        />
                        <span
                            aria-hidden
                            className='border-primary/15 animate-qr-ring absolute inset-0 rounded-full border'
                            style={{ animationDelay: '0.55s' }}
                        />
                        <div className='bg-background ring-primary/35 animate-qr-pop relative h-[72%] w-[72%] overflow-hidden rounded-full shadow-lg ring-2'>
                            {src ? (
                                // eslint-disable-next-line @next/next/no-img-element -- remote/user avatar URLs vary
                                <img src={src} alt='' className='h-full w-full object-cover' />
                            ) : (
                                <span className='text-foreground flex h-full w-full items-center justify-center text-3xl font-semibold'>
                                    {initials(displayName || '?')}
                                </span>
                            )}
                        </div>
                        {status === 'approved' ? (
                            <span className='bg-primary text-primary-foreground animate-qr-check ring-card absolute right-[12%] bottom-[12%] flex h-8 w-8 items-center justify-center rounded-full shadow-md ring-4'>
                                <Check className='h-4 w-4' strokeWidth={3} />
                            </span>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Same text block height for pending + scanned so nothing jumps */}
            <div className='mt-5 flex min-h-[7.5rem] w-full max-w-[15rem] flex-col items-center'>
                {showScanned ? (
                    <>
                        <h3 className='text-foreground text-base font-semibold tracking-tight'>
                            {displayName || t('auth.qr.scannedTitle')}
                        </h3>
                        {scanner?.username ? (
                            <p className='text-muted-foreground mt-0.5 text-sm'>@{scanner.username}</p>
                        ) : null}
                        <p className='text-muted-foreground mt-3 text-sm leading-snug'>
                            {status === 'approved' ? t('auth.qr.approved') : t('auth.qr.scannedConfirm')}
                        </p>
                    </>
                ) : (
                    <>
                        <h3 className='text-foreground text-base font-semibold'>{t('auth.qr.title')}</h3>
                        <p className='text-muted-foreground mt-1.5 text-sm leading-snug'>{t('auth.qr.subtitle')}</p>

                        {challenge?.userCode ? (
                            <div className='mt-3 space-y-1'>
                                <p className='text-muted-foreground text-[10px] font-semibold tracking-[0.14em] uppercase'>
                                    {t('auth.qr.userCode')}
                                </p>
                                <p className='text-foreground font-mono text-lg tracking-[0.22em]'>
                                    {challenge.userCode}
                                </p>
                            </div>
                        ) : null}

                        <p
                            className={cn(
                                'mt-2 text-xs',
                                status === 'denied' || status === 'error'
                                    ? 'text-destructive'
                                    : 'text-muted-foreground',
                            )}
                        >
                            {status === 'error'
                                ? error || t('auth.qr.error')
                                : status === 'denied'
                                  ? t('auth.qr.denied')
                                  : status === 'expired'
                                    ? t('auth.qr.expired')
                                    : t('auth.qr.waiting')}
                        </p>
                    </>
                )}
            </div>

            {(status === 'error' || status === 'denied') && (
                <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='mt-3 tracking-normal normal-case'
                    onClick={() => void startChallenge()}
                >
                    <RefreshCw className='mr-2 h-3.5 w-3.5' />
                    {t('auth.qr.refresh')}
                </Button>
            )}
        </div>
    );
}
