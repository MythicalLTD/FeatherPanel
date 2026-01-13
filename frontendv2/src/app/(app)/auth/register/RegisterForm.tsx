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

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { useTheme } from '@/contexts/ThemeContext';
import Turnstile from 'react-turnstile';
import { authApi } from '@/lib/api/auth';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { useEffect } from 'react';

export default function RegisterForm() {
    const { settings } = useSettings();
    const { t } = useTranslation();
    const { theme } = useTheme();
    const { getWidgets, fetchWidgets } = usePluginWidgets('auth-register');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        username: '',
        password: '',
        turnstile_token: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [turnstileKey, setTurnstileKey] = useState(0);

    const registrationEnabled = settings?.registration_enabled === 'true';
    const turnstileEnabled = settings?.turnstile_enabled === 'true';
    const turnstileSiteKey = settings?.turnstile_key_pub || '';
    const showTurnstile = turnstileEnabled && turnstileSiteKey;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation
        if (!form.first_name || !form.last_name || !form.email || !form.username || !form.password) {
            setError(t('validation.fill_all_fields'));
            return;
        }

        // Length validations
        if (form.first_name.length < 3 || form.first_name.length > 64) {
            setError(t('validation.first_name_length', { min: '3', max: '64' }));
            return;
        }

        if (form.last_name.length < 3 || form.last_name.length > 64) {
            setError(t('validation.last_name_length', { min: '3', max: '64' }));
            return;
        }

        if (form.username.length < 3 || form.username.length > 64) {
            setError(t('validation.username_length', { min: '3', max: '64' }));
            return;
        }

        if (form.email.length < 3 || form.email.length > 255) {
            setError(t('validation.email_length', { min: '3', max: '255' }));
            return;
        }

        if (form.password.length < 8 || form.password.length > 255) {
            setError(t('validation.password_length', { min: '8', max: '255' }));
            return;
        }

        // Format validations
        if (!/^[a-zA-Z0-9_]+$/.test(form.username)) {
            setError(t('validation.invalid_username'));
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            setError(t('validation.email'));
            return;
        }

        // Check Turnstile if enabled
        if (turnstileEnabled && !form.turnstile_token) {
            setError(t('validation.captcha_required'));
            return;
        }

        setLoading(true);

        try {
            const response = await authApi.register({
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                email: form.email.trim(),
                username: form.username.trim(),
                password: form.password,
                turnstile_token: form.turnstile_token,
            });

            if (response.success) {
                setSuccess(t('common.success'));

                setTimeout(() => {
                    location.href = '/dashboard';
                }, 1000);
            } else {
                setError(response.message || t('common.error'));
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
            setLoading(false);
        }
    };

    const handleTurnstileSuccess = (token: string) => {
        setForm((prev) => ({ ...prev, turnstile_token: token }));
    };

    // Show disabled message if registration is not enabled
    if (!registrationEnabled) {
        return (
            <div className='space-y-6'>
                <div className='text-center space-y-2'>
                    <h2 className='text-2xl font-bold tracking-tight'>{t('auth.register.title')}</h2>
                    <p className='text-sm text-muted-foreground'>{t('auth.register.subtitle')}</p>
                </div>

                <div className='p-6 rounded-xl bg-destructive/10 border border-destructive/20 text-center space-y-4'>
                    <p className='text-destructive font-medium'>{t('auth.register.disabled_title')}</p>
                    <p className='text-sm text-muted-foreground'>{t('auth.register.disabled_message')}</p>
                </div>

                <div className='text-center text-sm text-muted-foreground'>
                    {t('auth.register.have_account')}{' '}
                    <Link
                        href='/auth/login'
                        className='font-semibold text-primary hover:text-primary/80 transition-colors'
                    >
                        {t('auth.register.sign_in')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('auth-register', 'auth-register-top')} />
            {/* Header */}
            <div className='text-center space-y-2'>
                <h2 className='text-2xl font-bold tracking-tight'>{t('auth.register.title')}</h2>
                <p className='text-sm text-muted-foreground'>{t('auth.register.subtitle')}</p>
            </div>

            <WidgetRenderer widgets={getWidgets('auth-register', 'auth-register-before-form')} />
            <form onSubmit={handleSubmit} className='space-y-5'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <Input
                        label={t('auth.register.first_name')}
                        type='text'
                        value={form.first_name}
                        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                        required
                        autoComplete='given-name'
                        icon={<User className='h-5 w-5' />}
                        placeholder={t('auth.register.first_name_placeholder')}
                    />
                    <Input
                        label={t('auth.register.last_name')}
                        type='text'
                        value={form.last_name}
                        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                        required
                        autoComplete='family-name'
                        icon={<User className='h-5 w-5' />}
                        placeholder={t('auth.register.last_name_placeholder')}
                    />
                </div>

                <Input
                    label={t('auth.register.email')}
                    type='email'
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    autoComplete='email'
                    icon={<Mail className='h-5 w-5' />}
                    placeholder={t('auth.register.email_placeholder')}
                />

                <Input
                    label={t('auth.register.username')}
                    type='text'
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    required
                    autoComplete='username'
                    icon={<User className='h-5 w-5' />}
                    placeholder={t('auth.register.username_placeholder')}
                />

                <Input
                    label={t('auth.register.password')}
                    type='password'
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
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

                <Button type='submit' className='w-full group' loading={loading}>
                    {!loading && (
                        <>
                            {t('auth.register.submit')}
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
            <WidgetRenderer widgets={getWidgets('auth-register', 'auth-register-after-form')} />

            {/* Footer */}
            <div className='text-center text-sm text-muted-foreground'>
                {t('auth.register.have_account')}{' '}
                <Link href='/auth/login' className='font-semibold text-primary hover:text-primary/80 transition-colors'>
                    {t('auth.register.sign_in')}
                </Link>
            </div>
            <WidgetRenderer widgets={getWidgets('auth-register', 'auth-register-bottom')} />
        </div>
    );
}
