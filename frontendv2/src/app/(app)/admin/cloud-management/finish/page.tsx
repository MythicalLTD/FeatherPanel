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

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import axios from 'axios';
import { toast } from 'sonner';
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/featherui/Button';

function param(searchParams: URLSearchParams, ...keys: string[]): string | null {
    for (const key of keys) {
        const value = searchParams.get(key);
        if (value !== null && value !== '') {
            return value;
        }
    }
    return null;
}

export default function CloudManagementFinishPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();
    const ran = useRef(false);

    const [phase, setPhase] = useState<'loading' | 'success' | 'error' | 'cancelled'>('loading');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (ran.current) return;
        ran.current = true;

        const finish = async () => {
            const status = (param(searchParams, 'status') || '').toLowerCase();
            const errorParam = param(searchParams, 'error', 'error_message');

            if (status === 'cancelled' || status === 'cancel') {
                setPhase('cancelled');
                setError(t('admin.cloud_management.finish.cancelled_desc'));
                return;
            }

            if (status === 'error' || errorParam) {
                setPhase('error');
                setError(errorParam ? decodeURIComponent(errorParam) : t('admin.cloud_management.finish.save_failed'));
                return;
            }

            const publicIdentityKey = param(searchParams, 'public_identity_key', 'panel_public_key');
            const privateKey = param(searchParams, 'private_key', 'panel_private_key');
            const mythicUserId = param(searchParams, 'mythic_user_id', 'user_uuid', 'authorizer_user_id', 'user_id');
            const teamUuid = param(searchParams, 'team_uuid', 'team');
            const cloudApiKey = param(searchParams, 'cloud_api_key');
            const cloudApiSecret = param(searchParams, 'cloud_api_secret');

            const body: Record<string, string> = {
                status: status || 'success',
            };

            const optionalKeys: Array<[string, string | null]> = [
                ['public_identity_key', publicIdentityKey],
                ['private_key', privateKey],
                ['mythic_user_id', mythicUserId],
                ['user_uuid', param(searchParams, 'user_uuid')],
                ['team_uuid', teamUuid],
                ['cloud_api_key', cloudApiKey],
                ['cloud_api_secret', cloudApiSecret],
                ['cloud_id', param(searchParams, 'cloud_id')],
                ['cloud_name', param(searchParams, 'cloud_name')],
                ['mythic_user_email', param(searchParams, 'mythic_user_email')],
                ['mythic_user_name', param(searchParams, 'mythic_user_name')],
                ['team_name', param(searchParams, 'team_name')],
                ['team_slug', param(searchParams, 'team_slug')],
                ['featherpanel_url', param(searchParams, 'featherpanel_url')],
            ];

            for (const [key, value] of optionalKeys) {
                if (value) {
                    try {
                        body[key] = decodeURIComponent(value);
                    } catch {
                        body[key] = value;
                    }
                }
            }

            // Mythic requires these for a successful link. Do not treat "success" alone as done.
            if (!body.public_identity_key || !body.private_key || !body.mythic_user_id || !body.team_uuid) {
                setPhase('error');
                setError(t('admin.cloud_management.finish.missing_params'));
                return;
            }

            try {
                const response = await axios.post('/api/admin/cloud/oauth2/callback', body);
                if (!response.data?.success) {
                    throw new Error(response.data?.message || t('admin.cloud_management.finish.save_failed'));
                }
                setPhase('success');
                if (!cloudApiKey || !cloudApiSecret) {
                    toast.message(
                        'Linked Mythic may stay Pending until cloud_api_key/secret are present on the OAuth redirect.',
                    );
                } else {
                    toast.success(t('admin.cloud_management.finish.linked_toast'));
                }
                setTimeout(() => router.push('/admin/cloud-management'), 2000);
            } catch (err) {
                const message =
                    axios.isAxiosError(err) && err.response?.data?.message
                        ? err.response.data.message
                        : t('admin.cloud_management.finish.save_failed');
                setPhase('error');
                setError(message);
                toast.error(t('admin.cloud_management.finish.save_failed'));
            }
        };

        void finish();
    }, [searchParams, router, t]);

    return (
        <div className='flex min-h-[60vh] items-center justify-center p-6'>
            <div className='w-full max-w-md space-y-6 text-center'>
                <div className='flex justify-center'>
                    {phase === 'loading' && <Loader2 className='text-primary h-16 w-16 animate-spin' />}
                    {phase === 'success' && <CheckCircle2 className='h-16 w-16 text-green-500' />}
                    {(phase === 'error' || phase === 'cancelled') && <AlertCircle className='h-16 w-16 text-red-500' />}
                </div>

                <div className='space-y-2'>
                    <h1 className='text-foreground text-2xl font-bold'>
                        {phase === 'loading' && t('admin.cloud_management.finish.processing')}
                        {phase === 'success' && t('admin.cloud_management.finish.success')}
                        {phase === 'error' && t('admin.cloud_management.finish.failed')}
                        {phase === 'cancelled' && t('admin.cloud_management.finish.cancelled')}
                    </h1>
                    <p className='text-muted-foreground text-sm'>
                        {phase === 'loading' && t('admin.cloud_management.finish.processing_desc')}
                        {phase === 'success' && t('admin.cloud_management.finish.success_desc')}
                        {(phase === 'error' || phase === 'cancelled') &&
                            (error || t('admin.cloud_management.finish.error_desc'))}
                    </p>
                </div>

                {(phase === 'success' || phase === 'error' || phase === 'cancelled') && (
                    <Button size='lg' onClick={() => router.push('/admin/cloud-management')} className='gap-2'>
                        {t('admin.cloud_management.finish.go_to_cloud')}
                        <ArrowRight className='h-4 w-4' />
                    </Button>
                )}
            </div>
        </div>
    );
}
