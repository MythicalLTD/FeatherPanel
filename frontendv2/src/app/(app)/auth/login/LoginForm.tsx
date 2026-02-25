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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useSession } from '@/contexts/SessionContext';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import Turnstile from 'react-turnstile';
import { authApi } from '@/lib/api/auth';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

export default function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();
    const { settings } = useSettings();
    const { theme } = useTheme();
    const { fetchSession } = useSession();
    const { getWidgets, fetchWidgets } = usePluginWidgets('auth-login');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const [form, setForm] = useState({
        username_or_email: searchParams.get('username_or_email') || '',
        password: '',
        turnstile_token: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [turnstileKey, setTurnstileKey] = useState(0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.username_or_email || !form.password) {
            setError(t('validation.fill_all_fields'));
            return;
        }

        if (form.password.length < 8) {
            setError(t('validation.min_length', { min: '8' }));
            return;
        }

        if (turnstileEnabled && !form.turnstile_token) {
            setError(t('validation.captcha_required'));
            return;
        }

        setLoading(true);

        try {
            const response = await authApi.login({
                username_or_email: form.username_or_email,
                password: form.password,
                turnstile_token: form.turnstile_token,
            });

            if (response.success) {
                if (response.data?.requires_2fa) {
                    router.push(`/auth/verify-2fa?username_or_email=${encodeURIComponent(form.username_or_email)}`);
                    return;
                }

                setSuccess(t('common.success'));

                await fetchSession(true);

                setTimeout(() => {
                    const redirect = searchParams.get('redirect');
                    if (redirect && redirect.startsWith('/')) {
                        router.push(redirect);
                    } else {
                        router.push('/dashboard');
                    }
                }, 1000);
            } else {
                setError(response.message || t('common.error'));

                if (showTurnstile) {
                    setForm((prev) => ({ ...prev, turnstile_token: '' }));
                    setTurnstileKey((prev) => prev + 1);
                }
            }
        } catch (err: unknown) {
            const error = err as {
                response?: { data?: { message?: string; error_code?: string; data?: { email?: string } } };
            };

            if (error.response?.data?.error_code === 'TWO_FACTOR_REQUIRED') {
                const email = error.response.data.data?.email || form.username_or_email;
                router.push(`/auth/verify-2fa?username_or_email=${encodeURIComponent(email)}`);
                return;
            }

            setError(error.response?.data?.message || t('common.error'));

            if (showTurnstile) {
                setForm((prev) => ({ ...prev, turnstile_token: '' }));
                setTurnstileKey((prev) => prev + 1);
            }
        } finally {
            setLoading(false);
        }
    };

    const [isSsoLogin, setIsSsoLogin] = useState(false);
    const [ssoStatus, setSsoStatus] = useState('');

    useState(() => {
        const ssoToken = searchParams.get('sso_token');
        if (ssoToken) {
            handleSsoLogin(ssoToken);
        }
    });

    async function handleSsoLogin(token: string) {
        if (isSsoLogin) return;

        setIsSsoLogin(true);
        setSsoStatus(t('auth.ssoLoggingIn'));
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await authApi.login({
                sso_token: token,
            });

            if (response.success) {
                setSuccess(response.message || t('auth.loginSuccess'));
                await fetchSession(true);

                const redirect = searchParams.get('redirect');
                if (redirect && redirect.startsWith('/')) {
                    location.href = redirect;
                } else {
                    location.href = '/dashboard';
                }
            } else {
                setIsSsoLogin(false);
                setError(response.message || t('common.error'));
            }
        } catch (err: unknown) {
            setIsSsoLogin(false);
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    }

    const handleDiscordLogin = () => {
        window.location.href = '/api/user/auth/discord/login';
    };

    const handleOidcLogin = (providerUuid: string) => {
        window.location.href = `/api/user/auth/oidc/login?provider=${encodeURIComponent(providerUuid)}`;
    };

    const handleTurnstileSuccess = (token: string) => {
        setForm({ ...form, turnstile_token: token });
    };

    const [oidcProviders, setOidcProviders] = useState<{ uuid: string; name: string }[]>([]);

    useEffect(() => {
        const fetchOidcProviders = async () => {
            try {
                const res = await fetch('/api/system/oidc/providers', { cache: 'no-store' });
                if (!res.ok) return;
                const json = await res.json();
                if (json.success && Array.isArray(json.data?.providers)) {
                    setOidcProviders(json.data.providers);
                }
            } catch {
                // ignore
            }
        };

        fetchOidcProviders();
    }, []);

    const turnstileEnabled = settings?.turnstile_enabled === 'true';
    const turnstileSiteKey = settings?.turnstile_key_pub || '';
    const discordEnabled = settings?.discord_oauth_enabled === 'true';
    const oidcEnabled = oidcProviders.length > 0;
    const showTurnstile = turnstileEnabled && turnstileSiteKey;
    const showLocalLogin = true;

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('auth-login', 'auth-login-top')} />

            {!isSsoLogin && (
                <div className='text-center space-y-2'>
                    <h2 className='text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent'>
                        {t('auth.login.title')}
                    </h2>
                    <p className='text-sm text-muted-foreground'>{t('auth.login.subtitle')}</p>
                </div>
            )}

            {isSsoLogin ? (
                <div className='flex flex-col items-center gap-4 py-6'>
                    <div className='flex items-center gap-3'>
                        <div className='animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent'></div>
                        <span className='text-muted-foreground'>{ssoStatus}</span>
                    </div>
                    <p className='text-xs text-muted-foreground text-center'>{t('auth.ssoPleaseWait')}</p>
                    {error && (
                        <div className='p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in w-full text-center'>
                            {error}
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <WidgetRenderer widgets={getWidgets('auth-login', 'auth-login-before-form')} />

                    {showLocalLogin && (
                        <form onSubmit={handleSubmit} className='space-y-5'>
                            <Input
                                label={t('auth.login.username')}
                                type='text'
                                value={form.username_or_email || ''}
                                onChange={(e) => setForm({ ...form, username_or_email: e.target.value })}
                                required
                                autoComplete='username'
                                icon={<Mail className='h-5 w-5' />}
                                placeholder={t('auth.login.username')}
                            />

                            <Input
                                label={t('auth.login.password')}
                                type='password'
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                required
                                autoComplete='current-password'
                                icon={<Lock className='h-5 w-5' />}
                                placeholder={t('auth.login.password')}
                            />

                            <div className='flex items-center justify-end'>
                                <Link
                                    href='/auth/forgot-password'
                                    className='text-sm font-medium text-primary hover:text-primary/80 transition-colors'
                                >
                                    {t('auth.login.forgot_password')}
                                </Link>
                            </div>

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
                                        {t('auth.login.submit')}
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
                    )}

                    <WidgetRenderer widgets={getWidgets('auth-login', 'auth-login-after-form')} />

                    {(discordEnabled || oidcEnabled) && (
                        <>
                            <div className='relative'>
                                <div className='absolute inset-0 flex items-center'>
                                    <div className='w-full border-t border-border' />
                                </div>
                                <div className='relative flex justify-center text-xs uppercase'>
                                    <span className='bg-card px-2 text-muted-foreground'>
                                        {t('auth.login.or_continue')}
                                    </span>
                                </div>
                            </div>

                            <div className='flex flex-col gap-3'>
                                {oidcEnabled &&
                                    oidcProviders.map((provider) => (
                                        <Button
                                            key={provider.uuid}
                                            type='button'
                                            variant='outline'
                                            className='w-full'
                                            onClick={() => handleOidcLogin(provider.uuid)}
                                        >
                                            {provider.name}
                                        </Button>
                                    ))}

                                {discordEnabled && (
                                    <Button
                                        type='button'
                                        variant='outline'
                                        className='w-full'
                                        onClick={handleDiscordLogin}
                                    >
                                        <svg className='h-5 w-5 mr-2' viewBox='0 0 24 24' fill='currentColor'>
                                            <path d='M20.317 4.369a19.791 19.791 0 00-4.885-1.515.07.07 0 00-.075.035 13.812 13.812 0 00-.605 1.246 18.016 18.016 0 00-5.427 0 12.217 12.217 0 00-.617-1.246.064.064 0 00-.075-.035c-1.724.285-3.362.83-4.885 1.515a.06.06 0 00-.024.022C.533 8.059-.32 11.591.099 15.08a.078.078 0 00.028.055 20.53 20.53 0 006.104 3.108.073.073 0 00.078-.023c.472-.651.889-1.341 1.246-2.065a.07.07 0 00-.038-.094 13.235 13.235 0 01-1.885-.884.07.07 0 01-.007-.117c.126-.094.252-.192.374-.291a.06.06 0 01.061-.011c3.927 1.792 8.18 1.792 12.061 0 a.062.062 0 01.063.008c.122.099.248.197.374.291a.07.07 0 01-.006.117 12.298 12.298 0 01-1.885.883.07.07 0 00-.038.095c.36.723.777 1.413 1.246 2.064a.073.073 0 00.078.023 20.477 20.477 0 006.105-3.107.075.075 0 00.028-.055c.5-4.101-.838-7.597-3.548-10.692a.061.061 0 00-.024-.023zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.949-2.418 2.157-2.418 1.222 0 2.172 1.101 2.157 2.418 0 1.334-.949 2.419-2.157 2.419zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.948-2.418 2.157-2.418 1.221 0 2.171 1.101 2.157 2.418 0 1.334-.936 2.419-2.157 2.419z' />
                                        </svg>
                                        {t('auth.login.discord')}
                                    </Button>
                                )}
                            </div>
                        </>
                    )}

                    <div className='text-center text-sm text-muted-foreground'>
                        {t('auth.login.no_account')}{' '}
                        <Link
                            href='/auth/register'
                            className='font-semibold text-primary hover:text-primary/80 transition-colors'
                        >
                            {t('auth.login.create_account')}
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}
