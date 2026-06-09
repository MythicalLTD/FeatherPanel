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

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select-native';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useSession } from '@/contexts/SessionContext';
import { Mail, Lock, ArrowRight, KeyRound, ArrowLeft, Fingerprint, Network } from 'lucide-react';
import { Captcha } from '@/components/Captcha';
import { isCaptchaConfigured, isRecaptchaV3Configured, obtainCaptchaResponseToken } from '@/lib/captchaGate';
import { startAuthentication } from '@simplewebauthn/browser';
import { authApi } from '@/lib/api/auth';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { AuthLegalNotice } from '@/components/auth/AuthLegalNotice';
import {
    buildLoginMethodAvailability,
    buildLoginPageLayout,
    parseLoginDefaultMethod,
    parseLoginHiddenMethods,
    parseLoginMethodsOrder,
    type LoginMethodId,
} from '@/lib/loginPageConfig';

/** Reject protocol-relative URLs (e.g. `//evil.com`) while allowing same-origin paths. */
function isSafeInternalRedirectPath(redirect: string | null): redirect is string {
    return Boolean(redirect && redirect.startsWith('/') && !redirect.startsWith('//'));
}

export default function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();
    const { settings } = useSettings();
    const showCaptcha = isCaptchaConfigured(settings);
    const { fetchSession } = useSession();
    const { getWidgets, fetchWidgets } = usePluginWidgets('auth-login');
    const loginFormsRootRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    /** reForge (and similar) may trigger a real browser form submit; default method is GET and leaks the token in the URL while bypassing the React login XHR, so Set-Cookie never sticks. Block native navigation in capture; React onSubmit still runs. */
    useEffect(() => {
        const root = loginFormsRootRef.current;
        if (!root) return;
        const blockNativeFormNavigation = (ev: Event) => {
            const target = ev.target;
            if (!(target instanceof HTMLFormElement)) return;
            if (!root.contains(target)) return;
            ev.preventDefault();
        };
        root.addEventListener('submit', blockNativeFormNavigation, true);
        return () => root.removeEventListener('submit', blockNativeFormNavigation, true);
    }, []);

    /** Remove captcha token from the address bar (GET submit / widget) so we do not leak it via referrers or confuse the SPA. */
    useEffect(() => {
        const fromUrl = searchParams.get('reforge-captcha-token');
        if (!fromUrl) return;
        const params = new URLSearchParams(searchParams.toString());
        params.delete('reforge-captcha-token');
        const qs = params.toString();
        router.replace(qs ? `/auth/login?${qs}` : '/auth/login');
    }, [router, searchParams]);

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) return;

        const redirect = searchParams.get('redirect');
        if (redirect && redirect.startsWith('/auth/verify-email')) {
            router.replace(`/auth/verify-email?token=${encodeURIComponent(token)}`);
        }
    }, [router, searchParams]);

    const [form, setForm] = useState({
        username_or_email: searchParams.get('username_or_email') || '',
        password: '',
        turnstile_token: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [unverifiedIdentifier, setUnverifiedIdentifier] = useState<string | null>(null);
    const [resendVerificationLoading, setResendVerificationLoading] = useState(false);
    const [turnstileKey, setTurnstileKey] = useState(0);

    // Multi-step login state (when email login is enabled)
    const [loginStep, setLoginStep] = useState<'identifier' | 'method'>('identifier');
    const [identifierValue, setIdentifierValue] = useState('');
    const [isEmail, setIsEmail] = useState(false);
    const [hasPasskeys, setHasPasskeys] = useState(false);

    // Email login state
    const [showEmailLogin, setShowEmailLogin] = useState(false);
    const [emailLoginStep, setEmailLoginStep] = useState<'email' | 'code'>('email');
    const [emailLoginForm, setEmailLoginForm] = useState({
        email: '',
        code: '',
    });

    const resetCaptcha = () => {
        if (!showCaptcha) return;
        setForm((prev) => ({ ...prev, turnstile_token: '' }));
        setTurnstileKey((prev) => prev + 1);
    };

    const handleResendVerificationEmail = async () => {
        if (!unverifiedIdentifier) return;

        setResendVerificationLoading(true);
        setSuccess('');

        try {
            const response = await authApi.resendVerificationEmail({
                username_or_email: unverifiedIdentifier,
            });

            if (response.success) {
                setSuccess(response.message || t('auth.verify_email.resend_sent'));
            } else {
                setError(response.message || t('common.error'));
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || t('common.error'));
        } finally {
            setResendVerificationLoading(false);
        }
    };

    const renderLoginError = () => {
        if (!error) return null;

        return (
            <div className='bg-destructive/10 border-destructive/20 text-destructive animate-fade-in rounded-xl border p-4 text-sm'>
                <p>{error}</p>
                {unverifiedIdentifier && (
                    <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='mt-3 w-full'
                        loading={resendVerificationLoading}
                        onClick={handleResendVerificationEmail}
                    >
                        {t('auth.verify_email.resend')}
                    </Button>
                )}
            </div>
        );
    };

    async function submitPasswordLogin(usernameOrEmail: string) {
        let captchaToken = '';
        if (showCaptcha) {
            captchaToken = await obtainCaptchaResponseToken(settings ?? null, form.turnstile_token);
            if (!captchaToken) {
                setError(t('validation.captcha_required'));
                return;
            }
        }

        setLoading(true);
        setUnverifiedIdentifier(null);

        try {
            const response = await authApi.login({
                username_or_email: usernameOrEmail,
                password: form.password,
                turnstile_token: captchaToken,
            });

            if (response.success) {
                if (response.data?.requires_2fa) {
                    router.push(`/auth/verify-2fa?username_or_email=${encodeURIComponent(usernameOrEmail)}`);
                    return;
                }

                setSuccess(t('common.success'));

                await fetchSession(true);

                setTimeout(() => {
                    const redirect = searchParams.get('redirect');
                    if (isSafeInternalRedirectPath(redirect)) {
                        router.push(redirect);
                    } else {
                        router.push('/dashboard');
                    }
                }, 1000);
            } else {
                if (response.error_code === 'EMAIL_NOT_VERIFIED') {
                    setUnverifiedIdentifier(usernameOrEmail);
                }
                setError(response.message || t('common.error'));
                resetCaptcha();
            }
        } catch (err: unknown) {
            const error = err as {
                response?: { data?: { message?: string; error_code?: string; data?: { email?: string } } };
            };

            if (error.response?.data?.error_code === 'TWO_FACTOR_REQUIRED') {
                const email = error.response.data.data?.email || usernameOrEmail;
                router.push(`/auth/verify-2fa?username_or_email=${encodeURIComponent(email)}`);
                return;
            }

            if (error.response?.data?.error_code === 'EMAIL_NOT_VERIFIED') {
                setUnverifiedIdentifier(usernameOrEmail);
            }

            setError(error.response?.data?.message || t('common.error'));
            resetCaptcha();
        } finally {
            setLoading(false);
        }
    }

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

        await submitPasswordLogin(form.username_or_email);
    };

    const [isSsoLogin, setIsSsoLogin] = useState(false);
    const [ssoStatus, setSsoStatus] = useState('');
    const [discordLinkToken, setDiscordLinkToken] = useState<string | null>(null);
    const [isDiscordLogin, setIsDiscordLogin] = useState(false);
    const authProcessed = useRef(false);

    useEffect(() => {
        if (authProcessed.current) return;

        const ssoToken = searchParams.get('sso_token');
        if (ssoToken) {
            handleSsoLogin(ssoToken);
        }

        const discordToken = searchParams.get('discord_token');
        if (discordToken) {
            authProcessed.current = true;
            setIsDiscordLogin(true);
            setLoading(true);
            authApi
                .login({ discord_token: discordToken })
                .then(async (response) => {
                    if (response.success) {
                        setSuccess(response.message || t('auth.loginSuccess'));
                        await fetchSession(true);
                        const redirect = searchParams.get('redirect');
                        location.href = isSafeInternalRedirectPath(redirect) ? redirect : '/dashboard';
                    } else {
                        setIsDiscordLogin(false);
                        setError(response.message || t('common.error'));
                        authProcessed.current = false;
                    }
                })
                .catch((err: { response?: { data?: { message?: string } } }) => {
                    setIsDiscordLogin(false);
                    setError(err.response?.data?.message || t('common.error'));
                    authProcessed.current = false;
                })
                .finally(() => setLoading(false));
        }

        const linkToken = searchParams.get('discord_link_token');
        if (linkToken) {
            setDiscordLinkToken(linkToken);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleSsoLogin(token: string) {
        if (isSsoLogin || authProcessed.current) return;

        authProcessed.current = true;
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
                location.href = isSafeInternalRedirectPath(redirect) ? redirect : '/dashboard';
            } else {
                setIsSsoLogin(false);
                setError(response.message || t('common.error'));
                authProcessed.current = false;
            }
        } catch (err: unknown) {
            setIsSsoLogin(false);
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || t('common.error'));
            authProcessed.current = false;
        } finally {
            setLoading(false);
        }
    }

    const handleDiscordLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.username_or_email || !form.password) {
            setError(t('validation.fill_all_fields'));
            return;
        }

        if (!discordLinkToken) {
            setError(t('common.error'));
            return;
        }

        setLoading(true);

        try {
            const response = await authApi.linkDiscord({
                token: discordLinkToken,
                username_or_email: form.username_or_email,
                password: form.password,
            });

            if (response.success) {
                setSuccess(t('auth.discordLinking.success'));
                setTimeout(() => {
                    location.href = '/dashboard';
                }, 1500);
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

    const handleDiscordLogin = () => {
        window.location.href = '/api/user/auth/discord/login';
    };

    const handleOidcLogin = (providerUuid: string) => {
        window.location.href = `/api/user/auth/oidc/login?provider=${encodeURIComponent(providerUuid)}`;
    };

    const handleLdapLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.username_or_email || !form.password) {
            setError(t('validation.fill_all_fields'));
            return;
        }

        if (!selectedLdapProvider) {
            setError(t('auth.login.selectLdapProvider'));
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
            const res = await fetch('/api/user/auth/ldap/login', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    provider_uuid: selectedLdapProvider,
                    username: form.username_or_email,
                    password: form.password,
                    turnstile_token: captchaToken,
                }),
            });

            const json = await res.json();

            if (json.success) {
                setSuccess(t('common.success'));
                await fetchSession(true);

                setTimeout(() => {
                    const redirect = searchParams.get('redirect');
                    if (isSafeInternalRedirectPath(redirect)) {
                        router.push(redirect);
                    } else {
                        router.push('/dashboard');
                    }
                }, 1000);
            } else {
                setError(json.message || t('common.error'));

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
            setLoading(false);
        }
    };

    const handleTurnstileSuccess = (token: string) => {
        setForm((prev) => ({ ...prev, turnstile_token: token }));
    };

    const handleEmailLoginRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!emailLoginForm.email) {
            setError(t('validation.fill_all_fields'));
            return;
        }

        if (!isValidEmail(emailLoginForm.email)) {
            setError(t('validation.invalid_email'));
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
            const response = await authApi.requestEmailLoginCode({
                email: emailLoginForm.email,
                turnstile_token: captchaToken,
            });

            if (response.success) {
                setSuccess(t('auth.emailLogin.codeSent'));
                setEmailLoginStep('code');
            } else {
                setError(response.message || t('common.error'));
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
            setLoading(false);
        }
    };

    const handleEmailLoginVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!emailLoginForm.email || !emailLoginForm.code) {
            setError(t('validation.fill_all_fields'));
            return;
        }

        if (!/^\d{6}$/.test(emailLoginForm.code)) {
            setError(t('auth.emailLogin.invalidCode'));
            return;
        }

        setLoading(true);

        try {
            const response = await authApi.verifyEmailLoginCode({
                email: emailLoginForm.email,
                code: emailLoginForm.code,
            });

            if (response.success) {
                setSuccess(t('auth.login.success'));
                await fetchSession(true);

                setTimeout(() => {
                    const redirect = searchParams.get('redirect');
                    if (isSafeInternalRedirectPath(redirect)) {
                        router.push(redirect);
                    } else {
                        router.push('/dashboard');
                    }
                }, 1000);
            } else {
                setError(response.message || t('common.error'));
            }
        } catch (err: unknown) {
            const error = err as {
                response?: { data?: { message?: string; error_code?: string; data?: { email?: string } } };
            };

            if (error.response?.data?.error_code === 'TWO_FACTOR_REQUIRED') {
                const email = error.response.data.data?.email || emailLoginForm.email;
                router.push(`/auth/verify-2fa?username_or_email=${encodeURIComponent(email)}`);
                return;
            }

            setError(error.response?.data?.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    // Simple email validation helper
    const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Handle identifier submission (Step 1 -> Step 2)
    const handleIdentifierSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!identifierValue) {
            setError(t('validation.fill_all_fields'));
            return;
        }

        setLoading(true);
        try {
            const emailCheck = isValidEmail(identifierValue);
            setIsEmail(emailCheck);
            setForm({ ...form, username_or_email: identifierValue });

            let passkeyAvailable = false;
            try {
                const pr = await authApi.passkeyStatus({
                    username_or_email: identifierValue,
                });
                passkeyAvailable = Boolean(pr.success && pr.data?.has_passkeys);
            } catch {
                passkeyAvailable = false;
            }
            setHasPasskeys(passkeyAvailable);
            setLoginStep('method');
        } finally {
            setLoading(false);
        }
    };

    // Go back to identifier step
    const handleBackToIdentifier = () => {
        setLoginStep('identifier');
        setHasPasskeys(false);
        setError('');
        setShowEmailLogin(false);
        setForm((prev) => ({ ...prev, turnstile_token: '' }));
        setTurnstileKey((k) => k + 1);
    };

    const runPasskeyAuthentication = async (usernameOrEmailHint?: string, options?: { silent?: boolean }) => {
        const silent = options?.silent === true;
        if (!silent) {
            setError('');
            setSuccess('');
        }
        if (!silent) {
            setLoading(true);
        }
        try {
            const opt = await authApi.passkeyAuthenticationOptions({
                username_or_email: (usernameOrEmailHint ?? '').trim(),
            });
            if (!opt.success || !opt.data?.options || !opt.data?.challenge_token) {
                if (silent) {
                    return;
                }
                if ((usernameOrEmailHint ?? '').trim() !== '' && opt.data?.has_passkeys === false) {
                    setError(t('auth.passkey.noneForAccount'));
                } else {
                    setError(opt.message || t('auth.passkey.unavailable'));
                }
                return;
            }
            if ((usernameOrEmailHint ?? '').trim() !== '' && opt.data.has_passkeys === false) {
                if (!silent) {
                    setError(t('auth.passkey.noneForAccount'));
                }
                return;
            }
            const credential = await startAuthentication({
                optionsJSON: opt.data.options as never,
            });
            const vr = await authApi.passkeyAuthenticationVerify({
                challenge_token: String(opt.data.challenge_token),
                credential,
            });
            if (vr.success) {
                setSuccess(t('common.success'));
                await fetchSession(true);
                setTimeout(() => {
                    const redirect = searchParams.get('redirect');
                    if (isSafeInternalRedirectPath(redirect)) {
                        router.push(redirect);
                    } else {
                        router.push('/dashboard');
                    }
                }, 800);
            } else if (!silent) {
                setError(vr.message || t('common.error'));
            }
        } catch (err: unknown) {
            const ax = err as {
                name?: string;
                response?: { data?: { error_code?: string; message?: string; data?: { email?: string } } };
            };
            if (ax.response?.data?.error_code === 'TWO_FACTOR_REQUIRED') {
                const email =
                    ax.response.data.data?.email || usernameOrEmailHint || identifierValue || form.username_or_email;
                router.push(`/auth/verify-2fa?username_or_email=${encodeURIComponent(String(email))}`);
                return;
            }
            const domName = ax.name;
            const isUserCancelled =
                domName === 'NotAllowedError' ||
                domName === 'AbortError' ||
                domName === 'SecurityError' ||
                domName === 'InvalidStateError';
            if (silent && (isUserCancelled || !ax.response)) {
                return;
            }
            setError(ax.response?.data?.message || t('auth.passkey.failed'));
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    };

    // Handle password login from method step
    const handlePasswordLoginFromMethod = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.password) {
            setError(t('validation.fill_all_fields'));
            return;
        }

        if (form.password.length < 8) {
            setError(t('validation.min_length', { min: '8' }));
            return;
        }

        await submitPasswordLogin(identifierValue);
    };

    const [oidcProviders, setOidcProviders] = useState<{ uuid: string; name: string }[]>([]);
    const [ldapProviders, setLdapProviders] = useState<{ uuid: string; name: string }[]>([]);
    const [selectedLdapProvider, setSelectedLdapProvider] = useState<string>('');
    const [activePrimary, setActivePrimary] = useState<LoginMethodId>('local');
    const userChangedPrimary = useRef(false);

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

        const fetchLdapProviders = async () => {
            try {
                const res = await fetch('/api/ldap/providers', { cache: 'no-store' });
                if (!res.ok) return;
                const json = await res.json();
                if (json.success && Array.isArray(json.data?.providers)) {
                    setLdapProviders(json.data.providers);
                    if (json.data.providers.length > 0) {
                        setSelectedLdapProvider(json.data.providers[0].uuid);
                    }
                }
            } catch {
                // ignore
            }
        };

        fetchOidcProviders();
        fetchLdapProviders();
    }, []);

    const discordEnabled = settings?.discord_oauth_enabled === 'true';
    const emailLoginEnabled = settings?.email_login_enabled === 'true';
    const oidcEnabled = oidcProviders.length > 0;
    const ldapEnabled = ldapProviders.length > 0;

    const loginPageLayout = useMemo(() => {
        const hidden = parseLoginHiddenMethods(settings?.login_hidden_methods);
        const order = parseLoginMethodsOrder(settings?.login_methods_order);
        const defaultMethod = parseLoginDefaultMethod(settings?.login_default_method);
        const availability = buildLoginMethodAvailability({
            ldapEnabled,
            emailLoginEnabled,
            discordEnabled,
            oidcEnabled,
            hidePasskey: hidden.has('passkey'),
        });
        return buildLoginPageLayout(order, hidden, defaultMethod, availability);
    }, [settings, ldapEnabled, emailLoginEnabled, discordEnabled, oidcEnabled]);

    useEffect(() => {
        if (userChangedPrimary.current) {
            return;
        }
        setActivePrimary(loginPageLayout.primary);
    }, [loginPageLayout.primary]);

    const setPrimaryPanel = (method: LoginMethodId) => {
        userChangedPrimary.current = true;
        setActivePrimary(method);
        if (method !== 'email_code') {
            setShowEmailLogin(false);
        }
        if (method === 'email_code' && emailLoginEnabled) {
            setLoginStep('identifier');
        }
    };

    const showLdapLogin = activePrimary === 'ldap';
    const showLocalLogin = activePrimary === 'local' && !showEmailLogin;

    const isMultiStepEmailLoginFlow = emailLoginEnabled && activePrimary === 'email_code';
    const isLoginMethodStep = isMultiStepEmailLoginFlow && loginStep === 'method';
    const isLoginMethodPasswordStep = isLoginMethodStep && !showEmailLogin;
    const isEmailLoginVerifyStep = showEmailLogin && emailLoginStep === 'code';
    const emailForLoginCodeSubtitle = emailLoginForm.email || identifierValue;
    const renderLoginCaptchaField = () => {
        if (!showCaptcha) {
            return null;
        }
        return (
            <div className='border-border/60 bg-muted/15 w-full rounded-xl border px-4 py-3'>
                <Captcha
                    layout='auth'
                    refreshKey={turnstileKey}
                    onVerify={handleTurnstileSuccess}
                    onError={() => {
                        setForm((prev) => ({ ...prev, turnstile_token: '' }));
                    }}
                    onExpire={() => {
                        setForm((prev) => ({ ...prev, turnstile_token: '' }));
                    }}
                />
            </div>
        );
    };

    const renderLdapLoginButton = (className = '') => (
        <Button
            type='button'
            variant='outline'
            className={`group h-auto w-full !justify-between px-3 py-3 text-left ${className}`}
            disabled={loading}
            onClick={() => setPrimaryPanel('ldap')}
        >
            <span className='flex min-w-0 items-center gap-3'>
                <span className='bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg'>
                    <Network className='h-4 w-4' />
                </span>
                <span className='min-w-0 text-left'>
                    <span className='text-foreground block text-sm font-semibold'>{t('auth.login.ldapLogin')}</span>
                    <span className='text-muted-foreground block truncate text-xs font-normal'>
                        {t('auth.login.ldapLoginDescription')}
                    </span>
                </span>
            </span>
            <ArrowRight className='text-muted-foreground group-hover:text-primary h-4 w-4 shrink-0 transition-colors' />
        </Button>
    );

    const renderSwitchToLocalButton = () => (
        <Button
            type='button'
            variant='outline'
            className='group h-auto w-full !justify-between px-3 py-3 text-left'
            disabled={loading}
            onClick={() => setPrimaryPanel('local')}
        >
            <span className='flex min-w-0 items-center gap-3'>
                <span className='bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg'>
                    <Lock className='h-4 w-4' />
                </span>
                <span className='min-w-0 text-left'>
                    <span className='text-foreground block text-sm font-semibold'>{t('auth.login.passwordLogin')}</span>
                    <span className='text-muted-foreground block truncate text-xs font-normal'>
                        {t('auth.login.continue_with_password')}
                    </span>
                </span>
            </span>
            <ArrowRight className='text-muted-foreground group-hover:text-primary h-4 w-4 shrink-0 transition-colors' />
        </Button>
    );

    const renderSwitchToEmailCodeButton = (emailHint?: string) => (
        <Button
            type='button'
            variant='outline'
            className='group h-auto w-full !justify-between px-3 py-3 text-left'
            disabled={loading}
            onClick={() => {
                if (showCaptcha && !isRecaptchaV3Configured(settings) && !form.turnstile_token.trim()) {
                    setError(t('validation.captcha_required'));
                    return;
                }
                setEmailLoginForm((prev) => ({
                    ...prev,
                    email: emailHint ?? prev.email ?? identifierValue,
                }));
                setPrimaryPanel('email_code');
                setShowEmailLogin(true);
            }}
        >
            <span className='flex min-w-0 items-center gap-3'>
                <span className='bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg'>
                    <KeyRound className='h-4 w-4' />
                </span>
                <span className='min-w-0 text-left'>
                    <span className='text-foreground block text-sm font-semibold'>
                        {t('auth.login.requestLoginCode')}
                    </span>
                    <span className='text-muted-foreground block truncate text-xs font-normal'>
                        {t('auth.emailLogin.title')}
                    </span>
                </span>
            </span>
            <ArrowRight className='text-muted-foreground group-hover:text-primary h-4 w-4 shrink-0 transition-colors' />
        </Button>
    );

    const renderAltLoginMethod = (
        methodId: LoginMethodId,
        options?: { compact?: boolean; passkeyUsername?: string; showEmailCode?: boolean },
    ) => {
        switch (methodId) {
            case 'ldap':
                return <div key='ldap'>{renderLdapLoginButton()}</div>;
            case 'local':
                return <div key='local'>{renderSwitchToLocalButton()}</div>;
            case 'passkey':
                if (options?.compact) {
                    if (!hasPasskeys) {
                        return null;
                    }
                    return (
                        <Button
                            key='passkey'
                            type='button'
                            variant='outline'
                            size='sm'
                            className='min-w-36'
                            disabled={loading}
                            onClick={() => void runPasskeyAuthentication(options.passkeyUsername ?? identifierValue)}
                        >
                            <Fingerprint className='mr-2 h-4 w-4' />
                            {t('auth.passkey.signIn')}
                        </Button>
                    );
                }
                return (
                    <Button
                        key='passkey'
                        type='button'
                        variant='outline'
                        className='group h-auto w-full !justify-between px-3 py-3 text-left'
                        disabled={loading}
                        onClick={() => {
                            const u = (options?.passkeyUsername ?? form.username_or_email ?? '').trim();
                            void runPasskeyAuthentication(u || undefined);
                        }}
                    >
                        <span className='flex min-w-0 items-center gap-3'>
                            <span className='bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg'>
                                <Fingerprint className='h-4 w-4' />
                            </span>
                            <span className='min-w-0 text-left'>
                                <span className='text-foreground block text-sm font-semibold'>
                                    {t('auth.passkey.signIn')}
                                </span>
                                <span className='text-muted-foreground block truncate text-xs font-normal'>
                                    {t('auth.passkey.description')}
                                </span>
                            </span>
                        </span>
                        <ArrowRight className='text-muted-foreground group-hover:text-primary h-4 w-4 shrink-0 transition-colors' />
                    </Button>
                );
            case 'email_code':
                if (!emailLoginEnabled) {
                    return null;
                }
                if (options?.compact) {
                    if (!options.showEmailCode) {
                        return null;
                    }
                    return (
                        <Button
                            key='email_code'
                            type='button'
                            variant='outline'
                            size='sm'
                            className='min-w-36'
                            disabled={loading}
                            onClick={() => {
                                if (showCaptcha && !isRecaptchaV3Configured(settings) && !form.turnstile_token.trim()) {
                                    setError(t('validation.captcha_required'));
                                    return;
                                }
                                setEmailLoginForm((prev) => ({
                                    ...prev,
                                    email: identifierValue,
                                }));
                                setShowEmailLogin(true);
                            }}
                        >
                            <KeyRound className='mr-2 h-4 w-4' />
                            {t('auth.login.requestLoginCode')}
                        </Button>
                    );
                }
                return <div key='email_code'>{renderSwitchToEmailCodeButton()}</div>;
            case 'discord':
                if (!discordEnabled) {
                    return null;
                }
                return (
                    <Button
                        key='discord'
                        type='button'
                        variant='outline'
                        className='w-full'
                        disabled={loading}
                        onClick={handleDiscordLogin}
                    >
                        <svg className='mr-2 h-5 w-5' viewBox='0 0 24 24' fill='currentColor'>
                            <path d='M20.317 4.369a19.791 19.791 0 00-4.885-1.515.07.07 0 00-.075.035 13.812 13.812 0 00-.605 1.246 18.016 18.016 0 00-5.427 0 12.217 12.217 0 00-.617-1.246.064.064 0 00-.075-.035c-1.724.285-3.362.83-4.885 1.515a.06.06 0 00-.024.022C.533 8.059-.32 11.591.099 15.08a.078.078 0 00.028.055 20.53 20.53 0 006.104 3.108.073.073 0 00.078-.023c.472-.651.889-1.341 1.246-2.065a.07.07 0 00-.038-.094 13.235 13.235 0 01-1.885-.884.07.07 0 01-.007-.117c.126-.094.252-.192.374-.291a.06.06 0 01.061-.011c3.927 1.792 8.18 1.792 12.061 0a.062.062 0 01.063.008c.122.099.248.197.374.291a.07.07 0 01-.006.117 12.298 12.298 0 01-1.885.883.07.07 0 00-.038.095c.36.723.777 1.413 1.246 2.064a.073.073 0 00.078.023 20.477 20.477 0 006.105-3.107.075.075 0 00.028-.055c.5-4.101-.838-7.597-3.548-10.692a.061.061 0 00-.024-.023zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.949-2.418 2.157-2.418 1.222 0 2.172 1.101 2.157 2.418 0 1.334-.949 2.419-2.157 2.419zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.948-2.418 2.157-2.418 1.221 0 2.171 1.101 2.157 2.418 0 1.334-.936 2.419-2.157 2.419z' />
                        </svg>
                        {t('auth.login.discord')}
                    </Button>
                );
            case 'oidc':
                if (!oidcEnabled) {
                    return null;
                }
                return (
                    <div key='oidc' className='flex flex-col gap-2'>
                        {oidcProviders.map((provider) => (
                            <Button
                                key={provider.uuid}
                                type='button'
                                variant='outline'
                                className='w-full'
                                disabled={loading}
                                onClick={() => handleOidcLogin(provider.uuid)}
                            >
                                {provider.name}
                            </Button>
                        ))}
                    </div>
                );
            default:
                return null;
        }
    };

    const renderLoginSecondarySection = (options?: {
        filter?: (id: LoginMethodId) => boolean;
        compact?: boolean;
        passkeyUsername?: string;
        showEmailCode?: boolean;
    }) => {
        const methods = loginPageLayout.secondary.filter(options?.filter ?? (() => true));
        const nodes = methods
            .map((id) =>
                renderAltLoginMethod(id, {
                    compact: options?.compact,
                    passkeyUsername: options?.passkeyUsername,
                    showEmailCode: options?.showEmailCode,
                }),
            )
            .filter((node) => node !== null);

        if (nodes.length === 0) {
            return null;
        }

        return (
            <div className='border-border/70 flex flex-col gap-2 border-t pt-3'>
                <p className='text-muted-foreground text-center text-[11px] font-medium tracking-wide'>
                    {t('auth.login.or')}
                </p>
                <div className={options?.compact ? 'flex flex-wrap justify-center gap-2' : 'flex flex-col gap-2'}>
                    {nodes}
                </div>
            </div>
        );
    };

    const renderOidcPrimaryPanel = () => (
        <div className='space-y-4'>
            <div className='border-primary/20 bg-primary/5 rounded-2xl border p-4'>
                <p className='text-muted-foreground text-sm'>{t('auth.login.sso')}</p>
            </div>
            {oidcProviders.map((provider) => (
                <Button
                    key={provider.uuid}
                    type='button'
                    variant='outline'
                    className='w-full'
                    disabled={loading}
                    onClick={() => handleOidcLogin(provider.uuid)}
                >
                    {provider.name}
                </Button>
            ))}
            {renderLoginSecondarySection()}
        </div>
    );

    const renderDiscordPrimaryPanel = () => (
        <div className='space-y-4'>
            <Button type='button' variant='outline' className='w-full' disabled={loading} onClick={handleDiscordLogin}>
                <svg className='mr-2 h-5 w-5' viewBox='0 0 24 24' fill='currentColor'>
                    <path d='M20.317 4.369a19.791 19.791 0 00-4.885-1.515.07.07 0 00-.075.035 13.812 13.812 0 00-.605 1.246 18.016 18.016 0 00-5.427 0 12.217 12.217 0 00-.617-1.246.064.064 0 00-.075-.035c-1.724.285-3.362.83-4.885 1.515a.06.06 0 00-.024.022C.533 8.059-.32 11.591.099 15.08a.078.078 0 00.028.055 20.53 20.53 0 006.104 3.108.073.073 0 00.078-.023c.472-.651.889-1.341 1.246-2.065a.07.07 0 00-.038-.094 13.235 13.235 0 01-1.885-.884.07.07 0 01-.007-.117c.126-.094.252-.192.374-.291a.06.06 0 01.061-.011c3.927 1.792 8.18 1.792 12.061 0a.062.062 0 01.063.008c.122.099.248.197.374.291a.07.07 0 01-.006.117 12.298 12.298 0 01-1.885.883.07.07 0 00-.038.095c.36.723.777 1.413 1.246 2.064a.073.073 0 00.078.023 20.477 20.477 0 006.105-3.107.075.075 0 00.028-.055c.5-4.101-.838-7.597-3.548-10.692a.061.061 0 00-.024-.023zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.949-2.418 2.157-2.418 1.222 0 2.172 1.101 2.157 2.418 0 1.334-.949 2.419-2.157 2.419zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.948-2.418 2.157-2.418 1.221 0 2.171 1.101 2.157 2.418 0 1.334-.936 2.419-2.157 2.419z' />
                </svg>
                {t('auth.login.discord')}
            </Button>
            {renderLoginSecondarySection()}
        </div>
    );

    return (
        <div ref={loginFormsRootRef} className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('auth-login', 'auth-login-top')} />

            {!isSsoLogin && !isDiscordLogin && (
                <div className='space-y-2 text-center'>
                    <h2 className='from-foreground via-foreground to-primary bg-linear-to-r bg-clip-text text-2xl font-bold tracking-tight text-transparent'>
                        {discordLinkToken
                            ? t('auth.discordLinking.title')
                            : isLoginMethodPasswordStep
                              ? t('auth.login.welcome_back')
                              : isEmailLoginVerifyStep
                                ? t('auth.emailLogin.enterCode')
                                : t('auth.login.title')}
                    </h2>
                    <p className='text-muted-foreground text-sm'>
                        {discordLinkToken
                            ? t('auth.discordLinking.subtitle')
                            : isLoginMethodPasswordStep
                              ? isEmail
                                  ? identifierValue
                                  : t('auth.login.continue_with_password')
                              : isEmailLoginVerifyStep
                                ? t('auth.emailLogin.codeSentTo', { email: emailForLoginCodeSubtitle })
                                : t('auth.login.subtitle')}
                    </p>
                </div>
            )}

            {isSsoLogin ? (
                <div className='flex flex-col items-center gap-4 py-6'>
                    <div className='flex items-center gap-3'>
                        <div className='border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent'></div>
                        <span className='text-muted-foreground'>{ssoStatus}</span>
                    </div>
                    <p className='text-muted-foreground text-center text-xs'>{t('auth.ssoPleaseWait')}</p>
                    {error && (
                        <div className='bg-destructive/10 border-destructive/20 text-destructive animate-fade-in w-full rounded-xl border p-4 text-center text-sm'>
                            {error}
                        </div>
                    )}
                </div>
            ) : isDiscordLogin ? (
                <div className='flex flex-col items-center gap-4 py-6'>
                    <div className='flex items-center gap-3'>
                        <div className='border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent'></div>
                        <span className='text-muted-foreground'>{t('auth.discordLoggingIn')}</span>
                    </div>
                    <p className='text-muted-foreground text-center text-xs'>{t('auth.ssoPleaseWait')}</p>
                    {error && (
                        <div className='bg-destructive/10 border-destructive/20 text-destructive animate-fade-in w-full rounded-xl border p-4 text-center text-sm'>
                            {error}
                        </div>
                    )}
                </div>
            ) : discordLinkToken ? (
                <>
                    <form onSubmit={handleDiscordLink} className='space-y-5'>
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

                        <Button type='submit' className='group w-full' loading={loading}>
                            {!loading && (
                                <>
                                    {t('auth.discordLinking.submit')}
                                    <ArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                                </>
                            )}
                        </Button>

                        <Button
                            type='button'
                            variant='outline'
                            className='w-full'
                            onClick={() => {
                                setDiscordLinkToken(null);
                                router.replace('/auth/login');
                            }}
                        >
                            {t('auth.discordLinking.cancel')}
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
                </>
            ) : (
                <>
                    <WidgetRenderer widgets={getWidgets('auth-login', 'auth-login-before-form')} />

                    {/* Multi-step login flow when email login is enabled */}
                    {isMultiStepEmailLoginFlow ? (
                        loginStep === 'identifier' ? (
                            // Step 1: Enter email/username
                            <form onSubmit={handleIdentifierSubmit} className='space-y-4'>
                                <Input
                                    label={t('auth.login.username')}
                                    type='text'
                                    value={identifierValue}
                                    onChange={(e) => {
                                        setIdentifierValue(e.target.value);
                                        setUnverifiedIdentifier(null);
                                    }}
                                    required
                                    autoComplete='username webauthn'
                                    autoFocus
                                    icon={<Mail className='h-5 w-5' />}
                                    placeholder={t('auth.login.username')}
                                />

                                <Button type='submit' className='group w-full' loading={loading}>
                                    {!loading && (
                                        <>
                                            {t('common.next')}
                                            <ArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                                        </>
                                    )}
                                </Button>

                                {error && (
                                    <div className='bg-destructive/10 border-destructive/20 text-destructive animate-fade-in rounded-xl border p-3 text-sm'>
                                        {error}
                                    </div>
                                )}

                                {renderLoginSecondarySection()}
                            </form>
                        ) : showEmailLogin ? (
                            // Email code login flow (when user clicked "Request Login Code")
                            emailLoginStep === 'email' ? (
                                <form onSubmit={handleEmailLoginRequest} className='space-y-5'>
                                    <div className='mb-4 space-y-2 text-center'>
                                        <h3 className='text-lg font-semibold'>{t('auth.emailLogin.title')}</h3>
                                        <p className='text-muted-foreground text-sm'>
                                            {t('auth.emailLogin.codeSentTo', { email: identifierValue })}
                                        </p>
                                    </div>

                                    <Button type='submit' className='group w-full' loading={loading}>
                                        {!loading && (
                                            <>
                                                {t('auth.emailLogin.sendCode')}
                                                <ArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        type='button'
                                        variant='outline'
                                        className='w-full'
                                        onClick={() => setShowEmailLogin(false)}
                                    >
                                        <ArrowLeft className='mr-2 h-4 w-4' />
                                        {t('auth.login.usePasswordInstead')}
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
                            ) : (
                                // Enter 6-digit code
                                <form onSubmit={handleEmailLoginVerify} className='space-y-5'>
                                    <Input
                                        label={t('auth.emailLogin.code')}
                                        type='text'
                                        value={emailLoginForm.code}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                            setEmailLoginForm({ ...emailLoginForm, code: value });
                                        }}
                                        required
                                        autoComplete='one-time-code'
                                        inputMode='numeric'
                                        pattern='[0-9]{6}'
                                        maxLength={6}
                                        icon={<KeyRound className='h-5 w-5' />}
                                        placeholder='000000'
                                        className='text-center text-2xl tracking-[0.5em]'
                                        autoFocus
                                    />

                                    <Button type='submit' className='group w-full' loading={loading}>
                                        {!loading && (
                                            <>
                                                {t('auth.login.submit')}
                                                <ArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                                            </>
                                        )}
                                    </Button>

                                    <div className='flex gap-2'>
                                        <Button
                                            type='button'
                                            variant='outline'
                                            className='flex-1'
                                            onClick={() => setShowEmailLogin(false)}
                                        >
                                            <ArrowLeft className='mr-2 h-4 w-4' />
                                            {t('common.back')}
                                        </Button>
                                        <Button
                                            type='button'
                                            variant='outline'
                                            className='flex-1'
                                            onClick={() =>
                                                handleEmailLoginRequest({ preventDefault: () => {} } as React.FormEvent)
                                            }
                                            disabled={loading}
                                        >
                                            {t('auth.emailLogin.resend')}
                                        </Button>
                                    </div>

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
                            )
                        ) : (
                            // Step 2: Password (+ captcha) then sign-in, passkey, or email code
                            <form onSubmit={handlePasswordLoginFromMethod} className='space-y-4'>
                                <Input
                                    label={t('auth.login.password')}
                                    type='password'
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    required
                                    autoComplete='current-password'
                                    autoFocus
                                    icon={<Lock className='h-5 w-5' />}
                                    placeholder={t('auth.login.password')}
                                />

                                <div className='flex items-center justify-end'>
                                    <Link
                                        href='/auth/forgot-password'
                                        className='text-primary hover:text-primary/80 text-sm font-medium transition-colors'
                                    >
                                        {t('auth.login.forgot_password')}
                                    </Link>
                                </div>

                                {renderLoginCaptchaField()}

                                <Button type='submit' className='group w-full' loading={loading}>
                                    {!loading && (
                                        <>
                                            {t('auth.login.submit')}
                                            <ArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                                        </>
                                    )}
                                </Button>

                                {renderLoginSecondarySection({
                                    compact: true,
                                    passkeyUsername: identifierValue,
                                    showEmailCode: isEmail,
                                })}

                                <Button
                                    type='button'
                                    variant='ghost'
                                    size='sm'
                                    className='text-muted-foreground hover:text-foreground h-8 w-full text-xs'
                                    onClick={handleBackToIdentifier}
                                >
                                    <ArrowLeft className='mr-1 h-3.5 w-3.5' />
                                    {t('common.back')}
                                </Button>

                                {renderLoginError()}
                                {success && (
                                    <div className='animate-fade-in rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-600 dark:text-green-400'>
                                        {success}
                                    </div>
                                )}
                            </form>
                        )
                    ) : activePrimary === 'oidc' && oidcEnabled ? (
                        renderOidcPrimaryPanel()
                    ) : activePrimary === 'discord' && discordEnabled ? (
                        renderDiscordPrimaryPanel()
                    ) : showLdapLogin && ldapEnabled ? (
                        <form onSubmit={handleLdapLogin} className='space-y-5'>
                            <div className='border-primary/20 bg-primary/5 rounded-2xl border p-4'>
                                <div className='flex items-start gap-3'>
                                    <div className='bg-primary/15 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl'>
                                        <Network className='h-5 w-5' />
                                    </div>
                                    <div className='min-w-0 flex-1'>
                                        <h3 className='text-foreground text-sm font-semibold'>
                                            {t('auth.login.ldapLoginTitle')}
                                        </h3>
                                        <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>
                                            {t('auth.login.ldapLoginSubtitle')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Select
                                label={t('auth.login.ldapProvider')}
                                value={selectedLdapProvider}
                                onChange={(e) => setSelectedLdapProvider(e.target.value)}
                                required
                            >
                                {ldapProviders.map((provider) => (
                                    <option key={provider.uuid} value={provider.uuid}>
                                        {provider.name}
                                    </option>
                                ))}
                            </Select>

                            <Input
                                label={t('auth.login.ldapUsername')}
                                type='text'
                                value={form.username_or_email || ''}
                                onChange={(e) => setForm({ ...form, username_or_email: e.target.value })}
                                required
                                autoComplete='username'
                                icon={<Mail className='h-5 w-5' />}
                                placeholder={t('auth.login.ldapUsernamePlaceholder')}
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

                            {renderLoginCaptchaField()}

                            <Button type='submit' className='group w-full' loading={loading}>
                                {!loading && (
                                    <>
                                        {t('auth.login.loginWithLdap')}
                                        <ArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                                    </>
                                )}
                            </Button>

                            {renderLoginSecondarySection({ filter: (id) => id !== 'ldap' })}

                            {loginPageLayout.ordered.includes('local') && (
                                <Button
                                    type='button'
                                    variant='ghost'
                                    size='sm'
                                    className='text-muted-foreground hover:text-foreground h-8 w-full text-xs'
                                    onClick={() => setPrimaryPanel('local')}
                                >
                                    <ArrowLeft className='mr-1 h-3.5 w-3.5' />
                                    {t('auth.login.use_password_instead')}
                                </Button>
                            )}

                            {renderLoginError()}
                            {success && (
                                <div className='animate-fade-in rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-600 dark:text-green-400'>
                                    {success}
                                </div>
                            )}
                        </form>
                    ) : showEmailLogin ? (
                        emailLoginStep === 'email' ? (
                            <form onSubmit={handleEmailLoginRequest} className='space-y-5'>
                                <div className='space-y-2 text-center'>
                                    <h3 className='text-lg font-semibold'>{t('auth.emailLogin.title')}</h3>
                                    <p className='text-muted-foreground text-sm'>{t('auth.emailLogin.subtitle')}</p>
                                </div>

                                <Input
                                    label={t('auth.login.email')}
                                    type='email'
                                    value={emailLoginForm.email}
                                    onChange={(e) => setEmailLoginForm({ ...emailLoginForm, email: e.target.value })}
                                    required
                                    autoComplete='email'
                                    icon={<Mail className='h-5 w-5' />}
                                    placeholder={t('auth.login.email')}
                                />

                                {renderLoginCaptchaField()}

                                <Button type='submit' className='group w-full' loading={loading}>
                                    {!loading && (
                                        <>
                                            {t('auth.emailLogin.sendCode')}
                                            <ArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                                        </>
                                    )}
                                </Button>

                                <Button
                                    type='button'
                                    variant='outline'
                                    className='w-full'
                                    onClick={() => setShowEmailLogin(false)}
                                >
                                    <ArrowLeft className='mr-2 h-4 w-4' />
                                    {t('common.back')}
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
                        ) : (
                            <form onSubmit={handleEmailLoginVerify} className='space-y-5'>
                                <Input
                                    label={t('auth.emailLogin.code')}
                                    type='text'
                                    value={emailLoginForm.code}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                        setEmailLoginForm({ ...emailLoginForm, code: value });
                                    }}
                                    required
                                    autoComplete='one-time-code'
                                    inputMode='numeric'
                                    pattern='[0-9]{6}'
                                    maxLength={6}
                                    icon={<KeyRound className='h-5 w-5' />}
                                    placeholder='000000'
                                    className='text-center text-2xl tracking-[0.5em]'
                                />

                                <Button type='submit' className='group w-full' loading={loading}>
                                    {!loading && (
                                        <>
                                            {t('auth.login.submit')}
                                            <ArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                                        </>
                                    )}
                                </Button>

                                <div className='flex gap-2'>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        className='flex-1'
                                        onClick={() => setEmailLoginStep('email')}
                                    >
                                        <ArrowLeft className='mr-2 h-4 w-4' />
                                        {t('common.back')}
                                    </Button>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        className='flex-1'
                                        onClick={() =>
                                            handleEmailLoginRequest({ preventDefault: () => {} } as React.FormEvent)
                                        }
                                        disabled={loading}
                                    >
                                        {t('auth.emailLogin.resend')}
                                    </Button>
                                </div>

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
                        )
                    ) : showLocalLogin ? (
                        <form onSubmit={handleSubmit} className='space-y-4'>
                            <Input
                                label={t('auth.login.username')}
                                type='text'
                                value={form.username_or_email || ''}
                                onChange={(e) => {
                                    setForm({ ...form, username_or_email: e.target.value });
                                    setUnverifiedIdentifier(null);
                                }}
                                required
                                autoComplete='username webauthn'
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
                                    className='text-primary hover:text-primary/80 text-sm font-medium transition-colors'
                                >
                                    {t('auth.login.forgot_password')}
                                </Link>
                            </div>

                            {renderLoginCaptchaField()}

                            <Button type='submit' className='group w-full' loading={loading}>
                                {!loading && (
                                    <>
                                        {t('auth.login.submit')}
                                        <ArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                                    </>
                                )}
                            </Button>

                            {renderLoginSecondarySection()}

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
                    ) : null}

                    <WidgetRenderer widgets={getWidgets('auth-login', 'auth-login-after-form')} />

                    {!isSsoLogin && !isDiscordLogin && <AuthLegalNotice variant='login' />}

                    {!isLoginMethodStep && (
                        <div className='text-muted-foreground text-center text-sm'>
                            {t('auth.login.no_account')}{' '}
                            <Link
                                href='/auth/register'
                                className='text-primary hover:text-primary/80 font-semibold transition-colors'
                            >
                                {t('auth.login.create_account')}
                            </Link>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
