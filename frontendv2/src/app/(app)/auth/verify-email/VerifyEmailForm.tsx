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

import axios from 'axios';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/TranslationContext';

export default function VerifyEmailForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verifyEmail = async () => {
            if (!token) {
                setMessage(t('auth.verify_email.missing_token'));
                setLoading(false);
                return;
            }

            try {
                const response = await axios.get('/api/user/auth/verify-email', {
                    params: { token },
                });
                if (response.data?.success) {
                    setSuccess(true);
                    setMessage(response.data?.message || t('auth.verify_email.success'));
                } else {
                    setMessage(response.data?.message || t('auth.verify_email.failed'));
                }
            } catch (error: unknown) {
                const axiosError = error as { response?: { data?: { message?: string } } };
                setMessage(axiosError.response?.data?.message || t('auth.verify_email.failed'));
            } finally {
                setLoading(false);
            }
        };

        verifyEmail();
    }, [token, t]);

    if (loading) {
        return (
            <div className='text-center py-12'>
                <div className='inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent' />
                <p className='mt-4 text-sm text-muted-foreground'>{t('auth.verify_email.verifying')}</p>
            </div>
        );
    }

    return (
        <div className='space-y-6 text-center'>
            <div className='space-y-2'>
                <h2
                    className={`text-2xl font-bold tracking-tight ${success ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}
                >
                    {success ? t('auth.verify_email.success_title') : t('auth.verify_email.failed_title')}
                </h2>
                <p className='text-sm text-muted-foreground'>{message}</p>
            </div>
            <Button type='button' className='w-full' onClick={() => router.push('/auth/login')}>
                {t('auth.verify_email.continue_to_login')}
            </Button>
        </div>
    );
}
