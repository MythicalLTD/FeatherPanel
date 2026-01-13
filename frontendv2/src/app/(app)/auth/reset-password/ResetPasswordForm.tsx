/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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
import { useTheme } from '@/contexts/ThemeContext';
import Turnstile from 'react-turnstile';
import axios from 'axios';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

export default function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();
    const { settings } = useSettings();
    const { theme } = useTheme();
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

    const turnstileEnabled = settings?.turnstile_enabled === 'true';
    const turnstileSiteKey = settings?.turnstile_key_pub || '';
    const showTurnstile = turnstileEnabled && turnstileSiteKey;

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

        // Validation
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

        // Check Turnstile if enabled
        if (turnstileEnabled && !form.turnstile_token) {
            setError(t('validation.captcha_required'));
            return;
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

            if (turnstileEnabled) {
                payload.turnstile_token = form.turnstile_token;
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
                // Reset Turnstile by forcing component re-render
                if (showTurnstile) {
                    setForm((prev) => ({ ...prev, turnstile_token: '' }));
                    setTurnstileKey((prev) => prev + 1);
                }
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || t('common.error'));

            // Reset Turnstile by forcing component re-render
            if (showTurnstile) {
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
            <div className='text-center py-12'>
                <div className='inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent' />
                <p className='mt-4 text-sm text-muted-foreground'>{t('auth.reset_password.validating')}</p>
            </div>
        );
    }

    if (!tokenValid) {
        return (
            <div className='space-y-6'>
                <div className='text-center space-y-2'>
                    <h2 className='text-2xl font-bold tracking-tight text-destructive'>
                        {t('auth.reset_password.invalid_token')}
                    </h2>
                    <p className='text-sm text-muted-foreground'>{error || t('auth.reset_password.invalid_message')}</p>
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
            {/* Header */}
            <div className='text-center space-y-2'>
                <h2 className='text-2xl font-bold tracking-tight'>{t('auth.reset_password.title')}</h2>
                <p className='text-sm text-muted-foreground'>{t('auth.reset_password.subtitle')}</p>
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

                {/* Turnstile Widget */}
                {showTurnstile && (
                    <div className='flex justify-center'>
                        <Turnstile
                            key={turnstileKey}
                            sitekey={turnstileSiteKey}
                            theme={theme === 'dark' ? 'dark' : 'light'}
                            size='normal'
                            refreshExpired='auto'
                            onVerify={handleTurnstileSuccess}
                            onError={() => {
                                setForm((prev) => ({ ...prev, turnstile_token: '' }));
                            }}
                            onExpire={() => {
                                setForm((prev) => ({ ...prev, turnstile_token: '' }));
                            }}
                        />
                    </div>
                )}

                <Button type='submit' className='w-full group' loading={submitting}>
                    {!submitting && (
                        <>
                            {t('auth.reset_password.submit')}
                            <ArrowRight className='ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform' />
                        </>
                    )}
                </Button>

                {error && (
                    <div className='p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in'>
                        {error}
                    </div>
                )}
                {success && (
                    <div className='p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm animate-fade-in'>
                        {success}
                    </div>
                )}
            </form>
            <WidgetRenderer widgets={getWidgets('auth-reset-password', 'auth-reset-password-after-form')} />

            {/* Footer */}
            <div className='text-center text-sm text-muted-foreground'>
                {t('auth.reset_password.remember')}{' '}
                <button
                    type='button'
                    className='font-semibold text-primary hover:text-primary/80 transition-colors'
                    onClick={() => router.push('/auth/login')}
                >
                    {t('auth.reset_password.sign_in')}
                </button>
            </div>
            <WidgetRenderer widgets={getWidgets('auth-reset-password', 'auth-reset-password-bottom')} />
        </div>
    );
}
