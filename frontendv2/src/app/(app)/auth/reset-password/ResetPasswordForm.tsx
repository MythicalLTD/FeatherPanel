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

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Captcha } from '@/components/Captcha';
import axios from 'axios';
import { isCaptchaConfigured, obtainCaptchaResponseToken } from '@/lib/captchaGate';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

export default function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();
    const { settings } = useSettings();
    const token = searchParams.get('token');
    const { getWidgets, fetchWidgets } = usePluginWidgets('auth-reset-password');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const [form, setForm] = useState({
        password: '',
        confirmPassword: '',
        turnstile_token: '',
    });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [tokenValid, setTokenValid] = useState(false);
    const [turnstileKey, setTurnstileKey] = useState(0);

    const showCaptcha = isCaptchaConfigured(settings);

    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setError(t('validation.required'));
                setLoading(false);
                return;
            }

            try {
                const response = await axios.get('/api/user/auth/reset-password', {
                    params: { token },
                });

                if (response.data && response.data.success) {
                    setTokenValid(true);
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

        validateToken();
    }, [token, t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.password || !form.confirmPassword) {
            setError(t('validation.fill_all_fields'));
            return;
        }

        if (form.password.length < 8 || form.password.length > 255) {
            setError(t('validation.password_length', { min: '8', max: '255' }));
            return;
        }

        if (form.password !== form.confirmPassword) {
            setError(t('validation.password_mismatch'));
            return;
        }

        let captchaToken = '';
        if (showCaptcha) {
            captchaToken = await obtainCaptchaResponseToken(settings ?? null, form.turnstile_token);
            if (!captchaToken) {
                setError(t('validation.captcha_required'));
                return;
            }
        }

        setSubmitting(true);

        try {
            const payload: {
                token: string;
                password: string;
                turnstile_token?: string;
            } = {
                token: token!,
                password: form.password,
            };

            if (showCaptcha) {
                payload.turnstile_token = captchaToken;
            }

            const response = await axios.put('/api/user/auth/reset-password', payload, {
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.data && response.data.success) {
                setSuccess(t('common.success'));
                setTimeout(() => {
                    router.push('/auth/login');
                }, 1000);
            } else {
                setError(response.data?.message || t('common.error'));

                if (showCaptcha) {
                    setForm((prev) => ({ ...prev, turnstile_token: '' }));
                    setTurnstileKey((prev) => prev + 1);
                }
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || t('common.error'));

            if (showCaptcha) {
                setForm((prev) => ({ ...prev, turnstile_token: '' }));
                setTurnstileKey((prev) => prev + 1);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleTurnstileSuccess = (token: string) => {
        setForm((prev) => ({ ...prev, turnstile_token: token }));
    };

    if (loading) {
        return (
            <div className='py-12 text-center'>
                <div className='border-primary inline-block h-8 w-8 animate-spin rounded-full border-2 border-t-transparent' />
                <p className='text-muted-foreground mt-4 text-sm'>{t('auth.reset_password.validating')}</p>
            </div>
        );
    }

    if (!tokenValid) {
        return (
            <div className='space-y-6'>
                <div className='space-y-2 text-center'>
                    <h2 className='text-destructive text-2xl font-bold tracking-tight'>
                        {t('auth.reset_password.invalid_token')}
                    </h2>
                    <p className='text-muted-foreground text-sm'>{error || t('auth.reset_password.invalid_message')}</p>
                </div>
                <Button variant='outline' className='w-full' onClick={() => router.push('/auth/forgot-password')}>
                    {t('auth.reset_password.request_new')}
                </Button>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('auth-reset-password', 'auth-reset-password-top')} />

            <div className='space-y-2 text-center'>
                <h2 className='text-2xl font-bold tracking-tight'>{t('auth.reset_password.title')}</h2>
                <p className='text-muted-foreground text-sm'>{t('auth.reset_password.subtitle')}</p>
            </div>

            <WidgetRenderer widgets={getWidgets('auth-reset-password', 'auth-reset-password-before-form')} />
            <form onSubmit={handleSubmit} className='space-y-5'>
                <Input
                    label={t('auth.reset_password.new_password')}
                    type='password'
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    autoComplete='new-password'
                    icon={<Lock className='h-5 w-5' />}
                    placeholder={t('auth.register.password_placeholder')}
                />

                <Input
                    label={t('auth.reset_password.confirm_password')}
                    type='password'
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    required
                    autoComplete='new-password'
                    icon={<Lock className='h-5 w-5' />}
                    placeholder={t('auth.register.password_placeholder')}
                />

                <Captcha
                    refreshKey={turnstileKey}
                    onVerify={handleTurnstileSuccess}
                    onError={() => {
                        setForm((prev) => ({ ...prev, turnstile_token: '' }));
                    }}
                    onExpire={() => {
                        setForm((prev) => ({ ...prev, turnstile_token: '' }));
                    }}
                />

                <Button type='submit' className='group w-full' loading={submitting}>
                    {!submitting && (
                        <>
                            {t('auth.reset_password.submit')}
                            <ArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                        </>
                    )}
                </Button>

                {error && (
                    <div className='bg-destructive/10 border-destructive/20 text-destructive animate-fade-in rounded-xl border p-4 text-sm'>
                        {error}
                    </div>
                )}
                {success && (
                    <div className='animate-fade-in rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-600 dark:text-green-400'>
                        {success}
                    </div>
                )}
            </form>
            <WidgetRenderer widgets={getWidgets('auth-reset-password', 'auth-reset-password-after-form')} />

            <div className='text-muted-foreground text-center text-sm'>
                {t('auth.reset_password.remember')}{' '}
                <button
                    type='button'
                    className='text-primary hover:text-primary/80 font-semibold transition-colors'
                    onClick={() => router.push('/auth/login')}
                >
                    {t('auth.reset_password.sign_in')}
                </button>
            </div>
            <WidgetRenderer widgets={getWidgets('auth-reset-password', 'auth-reset-password-bottom')} />
        </div>
    );
}
