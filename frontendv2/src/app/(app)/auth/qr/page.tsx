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

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { authApi } from '@/lib/api/auth';
import { AuthLoadingState } from '@/components/auth/AuthUi';
import {
    isQrChallengeGoneError,
    qrErrorMessage,
    QrApprovePrompt,
    QrResultScreen,
} from '@/components/auth/QrApprovePrompt';

type ChallengeDetails = {
    challenge_id: string;
    status: string;
    user_code?: string | null;
    desktop_ip?: string | null;
    desktop_ua?: string | null;
    expires_in?: number;
};

type Outcome = 'approved' | 'denied' | 'expired' | 'error';

function QrApproveContent() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isSessionChecked, isLoading } = useSession();

    const challengeId = (searchParams.get('c') || '').trim();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [payload, setPayload] = useState<ChallengeDetails | null>(null);
    const [outcome, setOutcome] = useState<Outcome | null>(null);

    const markExpired = useCallback(() => {
        setPayload(null);
        setOutcome('expired');
        setSubmitting(false);
    }, []);

    const loadChallenge = useCallback(
        async (opts?: { quiet?: boolean }) => {
            if (!challengeId) {
                setError(t('auth.qr.missingCode'));
                setLoading(false);
                return;
            }

            if (!opts?.quiet) {
                setLoading(true);
                setError(null);
            }

            try {
                const response = await authApi.qrGet(challengeId);
                if (!response.success || !response.data) {
                    markExpired();
                    return;
                }
                setPayload(response.data as ChallengeDetails);
                setOutcome(null);
            } catch (err: unknown) {
                if (axios.isAxiosError(err)) {
                    if (err.response?.status === 401 || err.response?.data?.error_code === 'INVALID_ACCOUNT_TOKEN') {
                        const redirect = `/auth/qr?c=${encodeURIComponent(challengeId)}`;
                        router.replace(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
                        return;
                    }
                    if (isQrChallengeGoneError(err)) {
                        markExpired();
                        return;
                    }
                    setError(err.response?.data?.message || t('auth.qr.error'));
                } else {
                    setError(err instanceof Error ? err.message : t('auth.qr.error'));
                }
                if (!opts?.quiet) setPayload(null);
            } finally {
                if (!opts?.quiet) setLoading(false);
            }
        },
        [challengeId, markExpired, router, t],
    );

    useEffect(() => {
        if (!isSessionChecked || isLoading) return;

        if (!user) {
            if (!challengeId) {
                setError(t('auth.qr.missingCode'));
                setLoading(false);
                return;
            }
            const redirect = `/auth/qr?c=${encodeURIComponent(challengeId)}`;
            router.replace(`/auth/login?redirect=${encodeURIComponent(redirect)}`);
            return;
        }

        void loadChallenge();
    }, [challengeId, isLoading, isSessionChecked, loadChallenge, router, t, user]);

    // Keep phone UI in sync — desktop may refresh a new QR while this page is open.
    useEffect(() => {
        if (!challengeId || !payload || outcome) return;
        const id = window.setInterval(() => {
            void loadChallenge({ quiet: true });
        }, 4000);
        return () => window.clearInterval(id);
    }, [challengeId, loadChallenge, outcome, payload]);

    const handleApprove = async () => {
        if (!challengeId || outcome === 'expired') return;
        setSubmitting(true);
        setError(null);
        try {
            const response = await authApi.qrApprove(challengeId);
            if (!response.success) {
                if (
                    response.error_code === 'QR_CHALLENGE_EXPIRED' ||
                    response.error_code === 'QR_CHALLENGE_UNAVAILABLE'
                ) {
                    markExpired();
                    return;
                }
                throw new Error(response.message || t('auth.qr.error'));
            }
            setOutcome('approved');
        } catch (err: unknown) {
            if (isQrChallengeGoneError(err)) {
                markExpired();
                return;
            }
            setError(qrErrorMessage(err, t('auth.qr.error')));
            setSubmitting(false);
        }
    };

    const handleDeny = async () => {
        if (!challengeId || outcome === 'expired') return;
        setSubmitting(true);
        setError(null);
        try {
            const response = await authApi.qrDeny(challengeId);
            if (!response.success) {
                if (
                    response.error_code === 'QR_CHALLENGE_EXPIRED' ||
                    response.error_code === 'QR_CHALLENGE_UNAVAILABLE'
                ) {
                    markExpired();
                    return;
                }
                throw new Error(response.message || t('auth.qr.error'));
            }
            setOutcome('denied');
        } catch (err: unknown) {
            if (isQrChallengeGoneError(err)) {
                markExpired();
                return;
            }
            setError(qrErrorMessage(err, t('auth.qr.error')));
            setSubmitting(false);
        }
    };

    if (!isSessionChecked || isLoading || loading) {
        return <AuthLoadingState label={t('auth.qr.loading')} />;
    }

    if (outcome === 'approved') {
        return (
            <QrResultScreen
                variant='approved'
                title={t('auth.qr.approvedTitle')}
                description={t('auth.qr.approvedDescription')}
                primaryLabel={t('auth.qr.goDashboard')}
                onPrimary={() => router.push('/dashboard')}
            />
        );
    }

    if (outcome === 'denied') {
        return (
            <QrResultScreen
                variant='denied'
                title={t('auth.qr.deniedTitle')}
                description={t('auth.qr.deniedDescription')}
                primaryLabel={t('auth.qr.goDashboard')}
                onPrimary={() => router.push('/dashboard')}
            />
        );
    }

    if (outcome === 'expired') {
        return (
            <QrResultScreen
                variant='expired'
                title={t('auth.qr.expiredTitle')}
                description={t('auth.qr.expiredDescription')}
                primaryLabel={t('auth.qr.goDashboard')}
                onPrimary={() => router.push('/dashboard')}
            />
        );
    }

    if ((error && !payload) || !payload) {
        return (
            <QrResultScreen
                variant='error'
                title={t('auth.qr.error')}
                description={error || t('auth.qr.missingCode')}
                primaryLabel={t('auth.qr.goDashboard')}
                onPrimary={() => router.push('/dashboard')}
            />
        );
    }

    return (
        <QrApprovePrompt
            title={t('auth.qr.approveTitle')}
            subtitle={t('auth.qr.approveSubtitle')}
            userCode={payload.user_code}
            desktopIp={payload.desktop_ip}
            desktopUa={payload.desktop_ua}
            accountName={user?.username}
            accountAvatar={user?.avatar}
            expiresIn={payload.expires_in}
            onExpired={markExpired}
            error={error}
            submitting={submitting}
            approveLabel={t('auth.qr.approve')}
            denyLabel={t('auth.qr.deny')}
            onApprove={() => void handleApprove()}
            onDeny={() => void handleDeny()}
        />
    );
}

export default function QrLoginPage() {
    return (
        <Suspense fallback={<AuthLoadingState label='…' />}>
            <QrApproveContent />
        </Suspense>
    );
}
