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
import { useRouter } from 'next/navigation';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import QRCode from 'react-qr-code';
import { ShieldCheck, ArrowRight, Clipboard } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Captcha } from '@/components/Captcha';
import axios from 'axios';
import { isCaptchaConfigured, obtainCaptchaResponseToken } from '@/lib/captchaGate';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { AuthAlert, AuthLoadingState, AuthPage, AuthPageHeader, AuthPanel } from '@/components/auth/AuthUi';

export default function SetupTwoFactorForm() {
    const router = useRouter();
    const { t } = useTranslation();
    const { settings } = useSettings();
    const { getWidgets, fetchWidgets } = usePluginWidgets('auth-setup-2fa');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [copied, setCopied] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');
    const [turnstileKey, setTurnstileKey] = useState(0);

    const showCaptcha = isCaptchaConfigured(settings);

    useEffect(() => {
        const setup2FA = async () => {
            setLoading(true);
            try {
                const response = await axios.get('/api/user/auth/two-factor');

                if (response.data && response.data.success) {
                    setQrCodeUrl(response.data.data.qr_code_url);
                    setSecret(response.data.data.secret);
                } else {
                    setError(response.data?.message || t('common.error'));
                }
            } catch (err: unknown) {
                const error = err as {
                    response?: { data?: { message?: string; error_code?: string }; status?: number };
                };

                if (
                    error.response?.status === 401 ||
                    error.response?.status === 403 ||
                    error.response?.data?.error_code === 'INVALID_ACCOUNT_TOKEN'
                ) {
                    router.push('/auth/login');
                    return;
                }

                if (error.response?.data?.error_code === 'TWO_FACTOR_AUTH_ENABLED') {
                    router.push('/dashboard');
                    return;
                }

                setError(error.response?.data?.message || t('common.error'));
            } finally {
                setLoading(false);
            }
        };

        setup2FA();
    }, [router, t]);

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

        let captchaToken = '';
        if (showCaptcha) {
            captchaToken = await obtainCaptchaResponseToken(settings ?? null, turnstileToken);
            if (!captchaToken) {
                setError(t('validation.captcha_required'));
                return;
            }
        }

        setSubmitting(true);

        try {
            const payload: {
                code: string;
                secret: string;
                turnstile_token?: string;
            } = {
                code: code.trim(),
                secret: secret,
            };

            if (showCaptcha) {
                payload.turnstile_token = captchaToken;
            }

            const response = await axios.put('/api/user/auth/two-factor', payload);

            if (response.data && response.data.success) {
                setSuccess(t('common.success'));
                setTimeout(() => {
                    router.push('/dashboard');
                }, 1500);
            } else {
                setError(response.data?.message || t('common.error'));

                if (showCaptcha) {
                    setTurnstileToken('');
                    setTurnstileKey((prev) => prev + 1);
                }
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || t('common.error'));

            if (showCaptcha) {
                setTurnstileToken('');
                setTurnstileKey((prev) => prev + 1);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '');
        setCode(value);
    };

    const copySecret = () => {
        navigator.clipboard.writeText(secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleTurnstileSuccess = (token: string) => {
        setTurnstileToken(token);
    };

    if (loading) {
        return <AuthLoadingState label={t('auth.setup_2fa.setting_up')} />;
    }

    return (
        <AuthPage>
            <WidgetRenderer widgets={getWidgets('auth-setup-2fa', 'auth-setup-2fa-top')} />

            <AuthPageHeader
                icon={<ShieldCheck className='h-6 w-6' />}
                title={t('auth.setup_2fa.title')}
                subtitle={t('auth.setup_2fa.subtitle')}
            />

            <AuthPanel>
                <WidgetRenderer widgets={getWidgets('auth-setup-2fa', 'auth-setup-2fa-before-form')} />
                <form onSubmit={handleSubmit} className='space-y-5'>
                    <div className='dark:bg-muted/20 border-border/50 flex justify-center rounded-2xl border bg-white p-5 shadow-sm'>
                        <QRCode value={qrCodeUrl} size={188} level='M' />
                    </div>

                    <div className='space-y-3'>
                        <p className='text-muted-foreground text-center text-sm'>{t('auth.setup_2fa.manual_entry')}</p>
                        <div className='flex items-center gap-2'>
                            <code className='bg-muted flex-1 rounded-xl px-4 py-3 text-center font-mono text-sm'>
                                {secret}
                            </code>
                            <Button
                                type='button'
                                variant='outline'
                                size='icon'
                                onClick={copySecret}
                                title={t('common.copy_to_clipboard')}
                            >
                                <Clipboard className='h-4 w-4' />
                            </Button>
                        </div>
                        {copied && (
                            <p className='animate-fade-in text-center text-xs text-emerald-600 dark:text-emerald-400'>
                                {t('auth.setup_2fa.copied')}
                            </p>
                        )}
                    </div>

                    <div className='border-border/70 space-y-4 border-t pt-4'>
                        <Input
                            label={t('auth.setup_2fa.code')}
                            description={t('auth.setup_2fa.code_description')}
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

                        <Captcha
                            refreshKey={turnstileKey}
                            onVerify={handleTurnstileSuccess}
                            onError={() => {
                                setTurnstileToken('');
                            }}
                            onExpire={() => {
                                setTurnstileToken('');
                            }}
                        />

                        <Button
                            type='submit'
                            className='group w-full'
                            disabled={code.length !== 6}
                            loading={submitting}
                        >
                            {!submitting && (
                                <>
                                    {t('auth.setup_2fa.submit')}
                                    <ArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                                </>
                            )}
                        </Button>

                        <AuthAlert variant='error'>{error}</AuthAlert>
                        <AuthAlert variant='success'>{success}</AuthAlert>
                    </div>
                </form>
                <WidgetRenderer widgets={getWidgets('auth-setup-2fa', 'auth-setup-2fa-after-form')} />
            </AuthPanel>
            <WidgetRenderer widgets={getWidgets('auth-setup-2fa', 'auth-setup-2fa-bottom')} />
        </AuthPage>
    );
}
