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
import Link from 'next/link';
import { useSession } from '@/contexts/SessionContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { Captcha } from '@/components/Captcha';
import { authApi } from '@/lib/api/auth';
import axios from 'axios';
import { getFeatherpanelApiErrorCode } from '@/lib/api';
import { isCaptchaConfigured, obtainCaptchaResponseToken } from '@/lib/captchaGate';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { AuthLegalNotice } from '@/components/auth/AuthLegalNotice';

export default function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();
    const { settings } = useSettings();
    const { fetchSession } = useSession();
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
    const showCaptcha = isCaptchaConfigured(settings);
    const discordEnabled = settings?.discord_oauth_enabled === 'true';

    const formatRegistrationError = (err: unknown, fallbackMessage?: string): string => {
        if (axios.isAxiosError(err)) {
            const code = getFeatherpanelApiErrorCode(err);
            const data = err.response?.data?.data as
                | { main_account?: { username?: string }; support_url?: string | null }
                | undefined;
            if (code === 'DEVICE_ACCOUNT_LIMIT') {
                const username = data?.main_account?.username;
                if (username) {
                    return t('auth.register.device_limit', { username });
                }
                return t('auth.register.device_limit_generic');
            }
            return err.response?.data?.message || fallbackMessage || t('common.error');
        }

        return fallbackMessage || t('common.error');
    };

    const [discordLinkToken, setDiscordLinkToken] = useState<string | null>(null);

    useEffect(() => {
        const linkToken = searchParams.get('discord_link_token');
        if (linkToken) {
            setDiscordLinkToken(linkToken);
        }
    }, [searchParams]);

    const handleDiscordRegister = async () => {
        if (!discordLinkToken) return;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await authApi.discordRegister({ token: discordLinkToken });

            if (response.success) {
                setSuccess(t('common.success'));
                await fetchSession(true);
                location.href = '/dashboard';
            } else {
                setError(response.message || t('common.error'));
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.first_name || !form.last_name || !form.email || !form.username || !form.password) {
            setError(t('validation.fill_all_fields'));
            return;
        }

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

        if (!/^[a-zA-Z0-9_]+$/.test(form.username)) {
            setError(t('validation.invalid_username'));
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            setError(t('validation.email'));
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

        setLoading(true);

        try {
            const response = await authApi.register({
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                email: form.email.trim(),
                username: form.username.trim(),
                password: form.password,
                turnstile_token: captchaToken,
            });

            if (response.success) {
                if (response.data?.requires_email_verification) {
                    setSuccess(
                        response.message || 'Registration successful. Please verify your email before logging in.',
                    );
                    setForm({
                        first_name: '',
                        last_name: '',
                        email: '',
                        username: '',
                        password: '',
                        turnstile_token: '',
                    });
                } else {
                    setSuccess(t('common.success'));

                    setTimeout(() => {
                        location.href = '/dashboard';
                    }, 1000);
                }
            } else {
                if (response.error_code === 'DEVICE_ACCOUNT_LIMIT') {
                    const username = response.data?.main_account?.username;
                    setError(
                        username
                            ? t('auth.register.device_limit', { username })
                            : t('auth.register.device_limit_generic'),
                    );
                } else {
                    setError(response.message || t('common.error'));
                }

                if (showCaptcha) {
                    setForm((prev) => ({ ...prev, turnstile_token: '' }));
                    setTurnstileKey((prev) => prev + 1);
                }
            }
        } catch (err: unknown) {
            setError(formatRegistrationError(err));

            if (showCaptcha) {
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

    if (discordLinkToken) {
        return (
            <div className='space-y-6'>
                <div className='text-center'>
                    <h1 className='text-2xl font-bold tracking-tight'>{t('auth.discordRegistration.title')}</h1>
                    <p className='text-muted-foreground mt-2'>{t('auth.discordRegistration.question')}</p>
                </div>

                {error && <div className='bg-destructive/15 text-destructive rounded-lg p-3 text-sm'>{error}</div>}
                {success && <div className='bg-primary/15 text-primary rounded-lg p-3 text-sm'>{success}</div>}

                <AuthLegalNotice variant='register' />

                <div className='flex flex-col gap-3'>
                    <Button onClick={handleDiscordRegister} disabled={loading} className='w-full'>
                        {loading ? t('common.loading') : t('auth.discordRegistration.submit')}
                    </Button>
                    <Button
                        variant='outline'
                        onClick={() =>
                            router.replace(
                                discordLinkToken
                                    ? `/auth/login?discord_link_token=${discordLinkToken}`
                                    : '/auth/register',
                            )
                        }
                        disabled={loading}
                        className='w-full'
                    >
                        {t('auth.discordRegistration.cancel')}
                    </Button>
                </div>
            </div>
        );
    }

    if (!registrationEnabled) {
        return (
            <div className='space-y-6'>
                <div className='space-y-2 text-center'>
                    <h2 className='text-2xl font-bold tracking-tight'>{t('auth.register.title')}</h2>
                    <p className='text-muted-foreground text-sm'>{t('auth.register.subtitle')}</p>
                </div>

                <div className='bg-destructive/10 border-destructive/20 space-y-4 rounded-xl border p-6 text-center'>
                    <p className='text-destructive font-medium'>{t('auth.register.disabled_title')}</p>
                    <p className='text-muted-foreground text-sm'>{t('auth.register.disabled_message')}</p>
                </div>

                <div className='text-muted-foreground text-center text-sm'>
                    {t('auth.register.have_account')}{' '}
                    <Link
                        href='/auth/login'
                        className='text-primary hover:text-primary/80 font-semibold transition-colors'
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

            <div className='space-y-2 text-center'>
                <h2 className='text-2xl font-bold tracking-tight'>{t('auth.register.title')}</h2>
                <p className='text-muted-foreground text-sm'>{t('auth.register.subtitle')}</p>
            </div>

            <WidgetRenderer widgets={getWidgets('auth-register', 'auth-register-before-form')} />
            <form onSubmit={handleSubmit} className='space-y-5'>
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
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

                <AuthLegalNotice variant='register' />

                <Button type='submit' className='group w-full' loading={loading}>
                    {!loading && (
                        <>
                            {t('auth.register.submit')}
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
            <WidgetRenderer widgets={getWidgets('auth-register', 'auth-register-after-form')} />

            <div className='text-muted-foreground text-center text-sm'>
                {t('auth.register.have_account')}{' '}
                <Link href='/auth/login' className='text-primary hover:text-primary/80 font-semibold transition-colors'>
                    {t('auth.register.sign_in')}
                </Link>
            </div>

            {discordEnabled && (
                <>
                    <div className='relative'>
                        <div className='absolute inset-0 flex items-center'>
                            <div className='border-border w-full border-t' />
                        </div>
                        <div className='relative flex justify-center text-xs uppercase'>
                            <span className='bg-card text-muted-foreground px-2'>{t('auth.login.or_continue')}</span>
                        </div>
                    </div>

                    <Button
                        type='button'
                        variant='outline'
                        className='w-full'
                        onClick={() => (window.location.href = '/api/user/auth/discord/login')}
                    >
                        <svg className='mr-2 h-5 w-5' viewBox='0 0 24 24' fill='currentColor'>
                            <path d='M20.317 4.369a19.791 19.791 0 00-4.885-1.515.07.07 0 00-.075.035 13.812 13.812 0 00-.605 1.246 18.016 18.016 0 00-5.427 0 12.217 12.217 0 00-.617-1.246.064.064 0 00-.075-.035c-1.724.285-3.362.83-4.885 1.515a.06.06 0 00-.024.022C.533 8.059-.32 11.591.099 15.08a.078.078 0 00.028.055 20.53 20.53 0 006.104 3.108.073.073 0 00.078-.023c.472-.651.889-1.341 1.246-2.065a.07.07 0 00-.038-.094 13.235 13.235 0 01-1.885-.884.07.07 0 01-.007-.117c.126-.094.252-.192.374-.291a.06.06 0 01.061-.011c3.927 1.792 8.18 1.792 12.061 0 a.062.062 0 01.063.008c.122.099.248.197.374.291a.07.07 0 01-.006.117 12.298 12.298 0 01-1.885.883.07.07 0 00-.038.095c.36.723.777 1.413 1.246 2.064a.073.073 0 00.078.023 20.477 20.477 0 006.105-3.107.075.075 0 00.028-.055c.5-4.101-.838-7.597-3.548-10.692a.061.061 0 00-.024-.023zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.949-2.418 2.157-2.418 1.222 0 2.172 1.101 2.157 2.418 0 1.334-.949 2.419-2.157 2.419zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.948-2.418 2.157-2.418 1.221 0 2.171 1.101 2.157 2.418 0 1.334-.936 2.419-2.157 2.419z' />
                        </svg>
                        {t('auth.login.discord')}
                    </Button>
                </>
            )}
            <WidgetRenderer widgets={getWidgets('auth-register', 'auth-register-bottom')} />
        </div>
    );
}
