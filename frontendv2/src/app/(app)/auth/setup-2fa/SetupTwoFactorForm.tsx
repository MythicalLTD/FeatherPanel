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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import QRCode from 'react-qr-code';
import { ShieldCheck, ArrowRight, Clipboard } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from '@/contexts/ThemeContext';
import Turnstile from 'react-turnstile';
import axios from 'axios';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

export default function SetupTwoFactorForm() {
    const router = useRouter();
    const { t } = useTranslation();
    const { settings } = useSettings();
    const { theme } = useTheme();
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

    const turnstileEnabled = settings?.turnstile_enabled === 'true';
    const turnstileSiteKey = settings?.turnstile_key_pub || '';
    const showTurnstile = turnstileEnabled && turnstileSiteKey;

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

                // Check if unauthorized (not logged in)
                if (
                    error.response?.status === 401 ||
                    error.response?.status === 403 ||
                    error.response?.data?.error_code === 'INVALID_ACCOUNT_TOKEN'
                ) {
                    router.push('/auth/login');
                    return;
                }

                // Check if 2FA is already enabled
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

        // Validation
        if (!code || code.trim() === '') {
            setError(t('validation.fill_all_fields'));
            return;
        }

        if (code.length !== 6) {
            setError('Verification code must be 6 digits');
            return;
        }

        // Check Turnstile if enabled
        if (turnstileEnabled && !turnstileToken) {
            setError(t('validation.captcha_required'));
            return;
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

            if (turnstileEnabled) {
                payload.turnstile_token = turnstileToken;
            }

            const response = await axios.put('/api/user/auth/two-factor', payload);

            if (response.data && response.data.success) {
                setSuccess(t('common.success'));
                setTimeout(() => {
                    router.push('/dashboard');
                }, 1500);
            } else {
                setError(response.data?.message || t('common.error'));
                // Reset Turnstile by forcing component re-render
                if (showTurnstile) {
                    setTurnstileToken('');
                    setTurnstileKey((prev) => prev + 1);
                }
            }
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || t('common.error'));

            // Reset Turnstile by forcing component re-render
            if (showTurnstile) {
                setTurnstileToken('');
                setTurnstileKey((prev) => prev + 1);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Only allow numeric input
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
        return (
            <div className='text-center py-12'>
                <div className='inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent' />
                <p className='mt-4 text-sm text-muted-foreground'>{t('auth.setup_2fa.setting_up')}</p>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('auth-setup-2fa', 'auth-setup-2fa-top')} />

            <div className='text-center space-y-3'>
                <div className='inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2'>
                    <ShieldCheck className='h-8 w-8 text-primary' />
                </div>
                <h2 className='text-2xl font-bold tracking-tight'>{t('auth.setup_2fa.title')}</h2>
                <p className='text-sm text-muted-foreground'>{t('auth.setup_2fa.subtitle')}</p>
            </div>

            <WidgetRenderer widgets={getWidgets('auth-setup-2fa', 'auth-setup-2fa-before-form')} />
            <form onSubmit={handleSubmit} className='space-y-6'>
                <div className='flex justify-center p-6 bg-white dark:bg-muted/20 rounded-2xl border border-border/50'>
                    <QRCode value={qrCodeUrl} size={200} level='M' />
                </div>

                <div className='space-y-3'>
                    <p className='text-sm text-center text-muted-foreground'>{t('auth.setup_2fa.manual_entry')}</p>
                    <div className='flex items-center gap-2'>
                        <code className='flex-1 bg-muted px-4 py-3 rounded-xl text-sm font-mono text-center'>
                            {secret}
                        </code>
                        <Button
                            type='button'
                            variant='outline'
                            size='icon'
                            onClick={copySecret}
                            title='Copy to clipboard'
                        >
                            <Clipboard className='h-4 w-4' />
                        </Button>
                    </div>
                    {copied && (
                        <p className='text-xs text-center text-green-600 dark:text-green-400 animate-fade-in'>
                            {t('auth.setup_2fa.copied')}
                        </p>
                    )}
                </div>

                <div className='space-y-4 pt-4 border-t border-border'>
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
                        className='text-center text-2xl tracking-widest font-mono'
                    />

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
                                    setTurnstileToken('');
                                }}
                                onExpire={() => {
                                    setTurnstileToken('');
                                }}
                            />
                        </div>
                    )}

                    <Button type='submit' className='w-full group' disabled={code.length !== 6} loading={submitting}>
                        {!submitting && (
                            <>
                                {t('auth.setup_2fa.submit')}
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
                </div>
            </form>
            <WidgetRenderer widgets={getWidgets('auth-setup-2fa', 'auth-setup-2fa-after-form')} />
            <WidgetRenderer widgets={getWidgets('auth-setup-2fa', 'auth-setup-2fa-bottom')} />
        </div>
    );
}
