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

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import axios from 'axios';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { useEffect } from 'react';
import { AuthAlert, AuthPage, AuthPageHeader, AuthPanel } from '@/components/auth/AuthUi';

export default function VerifyTwoFactorForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();
    const { fetchSession } = useSession();
    const { getWidgets, fetchWidgets } = usePluginWidgets('auth-verify-2fa');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const email = searchParams.get('email') || searchParams.get('username_or_email');

    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!code || code.trim() === '') {
            setError(t('validation.fill_all_fields'));
            return;
        }

        if (code.length !== 6) {
            setError(t('validation.verification_code_6_digits'));
            return;
        }

        if (!email) {
            setError(t('validation.email_required'));
            return;
        }

        setLoading(true);

        try {
            const response = await axios.post('/api/user/auth/two-factor', {
                email: email,
                code: code.trim(),
            });

            if (response.data && response.data.success) {
                setSuccess(t('common.success'));

                const ok = await fetchSession(true);
                if (!ok) {
                    await new Promise((resolve) => setTimeout(resolve, 250));
                    await fetchSession(true);
                }

                setTimeout(() => {
                    router.replace('/dashboard');
                }, 1200);
            } else {
                setError(response.data?.message || t('common.error'));
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        setCode(value);
    };

    return (
        <AuthPage>
            <WidgetRenderer widgets={getWidgets('auth-verify-2fa', 'auth-verify-2fa-top')} />

            <AuthPageHeader
                icon={<ShieldCheck className='h-6 w-6' />}
                title={t('auth.verify_2fa.title')}
                subtitle={t('auth.verify_2fa.subtitle')}
            />

            <AuthPanel>
                <WidgetRenderer widgets={getWidgets('auth-verify-2fa', 'auth-verify-2fa-before-form')} />
                <form onSubmit={handleSubmit} className='space-y-4'>
                    <Input
                        label={t('auth.verify_2fa.code')}
                        type='text'
                        value={code}
                        onChange={handleCodeInput}
                        placeholder='000000'
                        required
                        maxLength={6}
                        autoComplete='one-time-code'
                        inputMode='numeric'
                        className='text-center font-mono text-2xl tracking-widest'
                    />

                    <Button type='submit' className='group w-full' disabled={code.length !== 6} loading={loading}>
                        {!loading && (
                            <>
                                {t('auth.verify_2fa.submit')}
                                <ArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                            </>
                        )}
                    </Button>

                    <AuthAlert variant='error'>{error}</AuthAlert>
                    <AuthAlert variant='success'>{success}</AuthAlert>
                </form>
                <WidgetRenderer widgets={getWidgets('auth-verify-2fa', 'auth-verify-2fa-after-form')} />
            </AuthPanel>

            <p className='text-muted-foreground text-center text-sm'>
                {t('auth.verify_2fa.lost_access')}{' '}
                <button
                    type='button'
                    className='text-primary hover:text-primary/80 font-semibold underline-offset-4 transition-colors hover:underline'
                    onClick={() => router.push('/auth/login')}
                >
                    {t('auth.verify_2fa.go_back')}
                </button>
            </p>
            <WidgetRenderer widgets={getWidgets('auth-verify-2fa', 'auth-verify-2fa-bottom')} />
        </AuthPage>
    );
}
