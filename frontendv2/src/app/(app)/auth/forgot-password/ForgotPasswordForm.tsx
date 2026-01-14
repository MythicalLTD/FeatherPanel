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
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogHeader, DialogTitleCustom, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { CheckCircle, Mail, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useTheme } from '@/contexts/ThemeContext';
import Turnstile from 'react-turnstile';
import { authApi } from '@/lib/api/auth';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { useEffect } from 'react';

export default function ForgotPasswordForm() {
    const router = useRouter();
    const { t } = useTranslation();
    const { settings } = useSettings();
    const { theme } = useTheme();
    const { getWidgets, fetchWidgets } = usePluginWidgets('auth-forgot-password');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const [form, setForm] = useState({
        email: '',
        turnstile_token: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [turnstileKey, setTurnstileKey] = useState(0);

    const turnstileEnabled = settings?.turnstile_enabled === 'true';
    const turnstileSiteKey = settings?.turnstile_key_pub || '';
    const showTurnstile = turnstileEnabled && turnstileSiteKey;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!form.email) {
            setError(t('validation.fill_all_fields'));
            return;
        }

        if (form.email.length < 3 || form.email.length > 255) {
            setError(t('validation.email_length', { min: '3', max: '255' }));
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
            const response = await authApi.forgotPassword(form.email, form.turnstile_token);

            if (response.success) {
                setShowSuccessDialog(true);
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

    const handleDialogClose = () => {
        setShowSuccessDialog(false);
        router.push('/auth/login');
    };

    return (
        <>
            <div className='space-y-6'>
                <WidgetRenderer widgets={getWidgets('auth-forgot-password', 'auth-forgot-password-top')} />
                {/* Header */}
                <div className='text-center space-y-2'>
                    <h2 className='text-2xl font-bold tracking-tight'>{t('auth.forgot_password.title')}</h2>
                    <p className='text-sm text-muted-foreground'>{t('auth.forgot_password.subtitle')}</p>
                </div>

                <WidgetRenderer widgets={getWidgets('auth-forgot-password', 'auth-forgot-password-before-form')} />
                <form onSubmit={handleSubmit} className='space-y-5'>
                    <Input
                        label={t('auth.forgot_password.email')}
                        type='email'
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                        autoComplete='email'
                        icon={<Mail className='h-5 w-5' />}
                        placeholder={t('auth.register.email_placeholder')}
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
                                {t('auth.forgot_password.submit')}
                                <ArrowRight className='ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform' />
                            </>
                        )}
                    </Button>

                    {error && (
                        <div className='p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in'>
                            {error}
                        </div>
                    )}
                </form>
                <WidgetRenderer widgets={getWidgets('auth-forgot-password', 'auth-forgot-password-after-form')} />

                {/* Footer */}
                <div className='text-center text-sm text-muted-foreground'>
                    {t('auth.forgot_password.remember')}{' '}
                    <Link
                        href='/auth/login'
                        className='font-semibold text-primary hover:text-primary/80 transition-colors'
                    >
                        {t('auth.forgot_password.sign_in')}
                    </Link>
                </div>
                <WidgetRenderer widgets={getWidgets('auth-forgot-password', 'auth-forgot-password-bottom')} />
            </div>

            {/* Success Dialog */}
            <Dialog open={showSuccessDialog} onClose={handleDialogClose}>
                <DialogHeader>
                    <DialogTitleCustom className='flex items-center gap-2'>
                        <div className='h-10 w-10 rounded-lg flex items-center justify-center bg-green-500/10'>
                            <CheckCircle className='h-5 w-5 text-green-500' />
                        </div>
                        <span>{t('auth.forgot_password.success_title')}</span>
                    </DialogTitleCustom>
                    <DialogDescription className='text-sm'>
                        {t('auth.forgot_password.success_message')}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button className='w-full' onClick={handleDialogClose}>
                        {t('auth.forgot_password.go_to_login')}
                    </Button>
                </DialogFooter>
            </Dialog>
        </>
    );
}
