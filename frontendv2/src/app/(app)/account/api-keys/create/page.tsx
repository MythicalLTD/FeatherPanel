/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    10|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { CalagopusAuthorizeView } from '@/components/account/CalagopusAuthorizeView';
import { isLoopbackCallbackUrl } from '@/lib/utils';

function splitCsv(value: string | null): string[] {
    if (!value) return [];
    return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

/**
 * Hit the VS Code loopback callback so the extension receives ?key=.
 * Top-level HTTPS → HTTP localhost navigations often hang; prefer fetch/iframe first.
 */
async function deliverCalagopusCallback(redirectUrl: string): Promise<void> {
    // 1) fetch — works for same-machine loopback in most Chromium builds
    try {
        await fetch(redirectUrl, {
            method: 'GET',
            mode: 'no-cors',
            credentials: 'omit',
            cache: 'no-store',
            redirect: 'follow',
        });
    } catch {
        // ignore — fall through
    }

    // 2) hidden iframe as a second delivery path
    await new Promise<void>((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = redirectUrl;
        const done = () => {
            iframe.remove();
            resolve();
        };
        iframe.onload = done;
        iframe.onerror = done;
        document.body.appendChild(iframe);
        window.setTimeout(done, 1200);
    });
}

export default function CalagopusApiKeyCreatePage() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isSessionChecked, isLoading } = useSession();
    const [submitting, setSubmitting] = useState(false);
    const [completedKey, setCompletedKey] = useState<string | null | undefined>(undefined);

    const name = searchParams.get('name') || 'VS Code';
    const callbackUrl = searchParams.get('callback_url') || '';
    const adminPermissions = useMemo(() => splitCsv(searchParams.get('admin_permissions')), [searchParams]);
    const userPermissions = useMemo(() => splitCsv(searchParams.get('user_permissions')), [searchParams]);
    const serverPermissions = useMemo(() => splitCsv(searchParams.get('server_permissions')), [searchParams]);

    const redirectTarget = useMemo(() => {
        const qs = searchParams.toString();
        return `/account/api-keys/create${qs ? `?${qs}` : ''}`;
    }, [searchParams]);

    useEffect(() => {
        if (!isSessionChecked || isLoading) return;
        if (!user) {
            router.replace(`/auth/login?redirect=${encodeURIComponent(redirectTarget)}`);
        }
    }, [isSessionChecked, isLoading, user, redirectTarget, router]);

    const handleApprove = async () => {
        if (!callbackUrl || !isLoopbackCallbackUrl(callbackUrl)) {
            toast.error(t('account.calagopus.missingCallback'));
            return;
        }
        setSubmitting(true);
        try {
            const response = await axios.post('/api/user/api-clients/calagopus/create', {
                name,
                callback_url: callbackUrl,
                admin_permissions: adminPermissions,
                user_permissions: userPermissions,
                server_permissions: serverPermissions,
            });
            const data = response.data?.data;
            const redirectUrl = data?.redirect_url ? String(data.redirect_url) : '';
            const publicKey = data?.public_key ? String(data.public_key) : '';

            if (!response.data?.success || !redirectUrl || !isLoopbackCallbackUrl(redirectUrl)) {
                if (response.data?.error_code === 'INVALID_ACCOUNT_TOKEN') {
                    router.push(`/auth/login?redirect=${encodeURIComponent(redirectTarget)}`);
                    return;
                }
                throw new Error(response.data?.message || t('account.calagopus.createFailed'));
            }

            await deliverCalagopusCallback(redirectUrl);

            // Best-effort navigation for the extension's "Signed in" HTML page.
            // Do not wait on this — HTTPS→HTTP localhost often never finishes unloading.
            try {
                window.location.assign(redirectUrl);
            } catch {
                // ignore
            }

            setCompletedKey(publicKey || '');
            setSubmitting(false);
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.data?.error_code === 'INVALID_ACCOUNT_TOKEN') {
                router.push(`/auth/login?redirect=${encodeURIComponent(redirectTarget)}`);
                return;
            }
            const message = axios.isAxiosError(err) ? err.response?.data?.message : null;
            toast.error(message || t('account.calagopus.createFailed'));
            setSubmitting(false);
        }
    };

    const handleDeny = () => {
        if (completedKey !== undefined && completedKey !== null) {
            router.push('/dashboard/account?tab=api-keys');
            return;
        }
        toast.message(t('account.calagopus.denied'));
        router.push('/dashboard/account?tab=api-keys');
    };

    if (!isSessionChecked || isLoading || !user) {
        return (
            <div className='flex min-h-[60vh] items-center justify-center'>
                <Loader2 className='text-primary h-8 w-8 animate-spin' />
            </div>
        );
    }

    return (
        <CalagopusAuthorizeView
            mode='create'
            keyName={name}
            callbackUrl={callbackUrl}
            adminPermissions={adminPermissions}
            userPermissions={userPermissions}
            serverPermissions={serverPermissions}
            submitting={submitting}
            canApprove={isLoopbackCallbackUrl(callbackUrl)}
            errorMessage={!isLoopbackCallbackUrl(callbackUrl) ? t('account.calagopus.missingCallback') : null}
            completedKey={completedKey}
            onApprove={handleApprove}
            onDeny={handleDeny}
        />
    );
}
