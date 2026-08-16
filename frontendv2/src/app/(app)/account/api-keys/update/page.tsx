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

function splitCsv(value: string | null): string[] {
    if (!value) return [];
    return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

async function deliverCalagopusCallback(url: string): Promise<void> {
    try {
        await fetch(url, {
            method: 'GET',
            mode: 'no-cors',
            credentials: 'omit',
            cache: 'no-store',
            redirect: 'follow',
        });
    } catch {
        // ignore
    }
    await new Promise<void>((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
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

export default function CalagopusApiKeyUpdatePage() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isSessionChecked, isLoading } = useSession();
    const [submitting, setSubmitting] = useState(false);
    const [lookupLoading, setLookupLoading] = useState(true);
    const [foundName, setFoundName] = useState<string | null>(null);
    const [lookupError, setLookupError] = useState<string | null>(null);
    const [completedKey, setCompletedKey] = useState<string | null | undefined>(undefined);

    const keyStart = searchParams.get('key_start') || '';
    const callbackUrl = searchParams.get('callback_url') || '';
    const adminPermissions = useMemo(() => splitCsv(searchParams.get('admin_permissions')), [searchParams]);
    const userPermissions = useMemo(() => splitCsv(searchParams.get('user_permissions')), [searchParams]);
    const serverPermissions = useMemo(() => splitCsv(searchParams.get('server_permissions')), [searchParams]);

    const redirectTarget = useMemo(() => {
        const qs = searchParams.toString();
        return `/account/api-keys/update${qs ? `?${qs}` : ''}`;
    }, [searchParams]);

    useEffect(() => {
        if (!isSessionChecked || isLoading) return;
        if (!user) {
            router.replace(`/auth/login?redirect=${encodeURIComponent(redirectTarget)}`);
            return;
        }
        if (!keyStart) {
            setLookupError(t('account.calagopus.missingKeyStart'));
            setLookupLoading(false);
            return;
        }
        setLookupLoading(true);
        axios
            .get('/api/user/api-clients/calagopus/find', { params: { key_start: keyStart } })
            .then((response) => {
                if (response.data?.success && response.data?.data?.api_client) {
                    setFoundName(String(response.data.data.api_client.name || keyStart));
                    setLookupError(null);
                    return;
                }
                setLookupError(response.data?.message || t('account.calagopus.keyNotFound'));
            })
            .catch((err) => {
                if (axios.isAxiosError(err) && err.response?.data?.error_code === 'INVALID_ACCOUNT_TOKEN') {
                    router.push(`/auth/login?redirect=${encodeURIComponent(redirectTarget)}`);
                    return;
                }
                const message = axios.isAxiosError(err) ? err.response?.data?.message : null;
                setLookupError(message || t('account.calagopus.keyNotFound'));
            })
            .finally(() => setLookupLoading(false));
    }, [isSessionChecked, isLoading, user, keyStart, redirectTarget, router, t]);

    const handleApprove = async () => {
        if (!callbackUrl) {
            toast.error(t('account.calagopus.missingCallback'));
            return;
        }
        setSubmitting(true);
        try {
            await axios.post('/api/user/api-clients/calagopus/update-permissions', {
                key_start: keyStart,
                admin_permissions: adminPermissions,
                user_permissions: userPermissions,
                server_permissions: serverPermissions,
            });
            await deliverCalagopusCallback(callbackUrl);
            try {
                window.location.assign(callbackUrl);
            } catch {
                // ignore
            }
            setCompletedKey('');
            setSubmitting(false);
        } catch (err) {
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

    if (!isSessionChecked || isLoading || lookupLoading) {
        return (
            <div className='flex min-h-[60vh] items-center justify-center'>
                <Loader2 className='text-primary h-8 w-8 animate-spin' />
            </div>
        );
    }

    const errorMessage = lookupError || (!callbackUrl ? t('account.calagopus.missingCallback') : null);

    return (
        <CalagopusAuthorizeView
            mode='update'
            keyName={foundName || keyStart || 'VS Code'}
            callbackUrl={callbackUrl}
            adminPermissions={adminPermissions}
            userPermissions={userPermissions}
            serverPermissions={serverPermissions}
            submitting={submitting}
            canApprove={!!callbackUrl && !lookupError}
            errorMessage={errorMessage}
            completedKey={completedKey}
            onApprove={handleApprove}
            onDeny={handleDeny}
        />
    );
}
