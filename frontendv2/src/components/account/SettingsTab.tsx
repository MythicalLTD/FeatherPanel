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
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Check } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import Turnstile from 'react-turnstile';
import { isEnabled } from '@/lib/utils';

export default function SettingsTab() {
    const { t } = useTranslation();
    const { user, fetchSession, logout } = useSession();
    const { settings } = useSettings();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState('');
    const [turnstileKey, setTurnstileKey] = useState(0);

    useEffect(() => {
        const init = async () => {
            await fetchSession();
            setLoading(false);
        };
        init();
    }, [fetchSession]);

    const resetTurnstile = () => {
        if (settings?.turnstile_enabled) {
            setTurnstileToken('');
            setTurnstileKey((prev) => prev + 1);
        }
    };

    const handleEnable2FA = () => {
        router.push('/auth/setup-2fa');
    };

    const handleDisable2FA = async () => {
        try {
            if (isEnabled(settings?.turnstile_enabled) && !turnstileToken) {
                toast.error('Please complete the CAPTCHA verification');
                return;
            }

            setIsSubmitting(true);
            const payload: { two_fa_enabled: boolean; turnstile_token?: string } = {
                two_fa_enabled: false,
            };

            if (isEnabled(settings?.turnstile_enabled)) {
                payload.turnstile_token = turnstileToken;
            }

            const response = await axios.patch('/api/user/session', payload);

            if (response.data?.success) {
                toast.success('2FA disabled successfully');
                await fetchSession(true);
                resetTurnstile();
            } else {
                toast.error(response.data?.message || 'Failed to disable 2FA');
                resetTurnstile();
            }
        } catch (error) {
            console.error('Error disabling 2FA:', error);
            if (axios.isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error('Failed to disable 2FA');
            }
            resetTurnstile();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLinkDiscord = () => {
        window.location.href = '/api/user/auth/discord/login';
    };

    const handleUnlinkDiscord = async () => {
        try {
            setIsSubmitting(true);
            const response = await axios.delete('/api/user/auth/discord/unlink');
            if (response.data?.success) {
                toast.success('Discord account unlinked successfully');
                await fetchSession(true);
            } else {
                toast.error('Failed to unlink Discord account');
            }
        } catch (error) {
            console.error('Error unlinking Discord:', error);
            toast.error('Failed to unlink Discord account');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLogout = async () => {
        try {
            setIsSubmitting(true);
            await logout();
            router.push('/auth/login');
        } catch (error) {
            console.error('Error during logout:', error);
            toast.error('Logout failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center py-12'>
                <div className='flex items-center gap-3'>
                    <div className='border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent'></div>
                    <span className='text-muted-foreground'>{t('account.loadingSettings')}</span>
                </div>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <div className='border-border/50 bg-muted/20 rounded-xl border p-4'>
                <h3 className='text-foreground text-lg font-semibold'>{t('account.securitySettings')}</h3>
                <p className='text-muted-foreground mt-1 text-sm'>{t('account.securitySettingsDescription')}</p>
            </div>

            <div className='border-border/50 bg-card/50 rounded-lg border p-6 backdrop-blur-xl'>
                <div className='flex items-start gap-4'>
                    <div className='shrink-0'>
                        <div className='bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg'>
                            <ShieldCheck className='text-primary h-6 w-6' />
                        </div>
                    </div>
                    <div className='min-w-0 flex-1'>
                        <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
                            <div className='flex-1'>
                                <h4 className='text-foreground text-sm font-medium'>{t('account.twoFactor.title')}</h4>
                                <p className='text-muted-foreground mt-1 text-sm'>
                                    {t('account.twoFactor.description')}
                                </p>
                                {user?.two_fa_enabled === '1' && (
                                    <div className='mt-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950'>
                                        <div className='flex items-center gap-2'>
                                            <Check className='h-4 w-4 text-green-600 dark:text-green-400' />
                                            <span className='text-sm text-green-800 dark:text-green-200'>
                                                {t('account.twoFactor.enabled')}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className='flex shrink-0 gap-2'>
                                {user?.two_fa_enabled !== '1' ? (
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        disabled={isSubmitting}
                                        onClick={handleEnable2FA}
                                    >
                                        {t('account.twoFactor.enable')}
                                    </Button>
                                ) : (
                                    <div className='flex flex-col items-end gap-2'>
                                        {isEnabled(settings?.turnstile_enabled) && settings?.turnstile_key_pub && (
                                            <Turnstile
                                                key={turnstileKey}
                                                sitekey={settings.turnstile_key_pub}
                                                onSuccess={(token) => setTurnstileToken(token)}
                                            />
                                        )}
                                        <Button
                                            variant='destructive'
                                            size='sm'
                                            disabled={isSubmitting}
                                            onClick={handleDisable2FA}
                                        >
                                            {t('account.twoFactor.disable')}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isEnabled(settings?.discord_oauth_enabled) && (
                <div className='border-border/50 bg-card/50 rounded-lg border p-6 backdrop-blur-xl'>
                    <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                        <div className='flex-1'>
                            <h4 className='text-foreground text-sm font-medium'>{t('account.discordAccount')}</h4>
                            <p className='text-muted-foreground mt-1 text-sm'>
                                {t('account.discordAccountDescription')}
                            </p>
                            {user?.discord_oauth2_linked === 'true' && (
                                <p className='text-muted-foreground mt-2 text-sm'>
                                    <span className='font-medium'>{t('account.linkedAs')}:</span>{' '}
                                    {user?.discord_oauth2_name || t('account.unknown')}
                                </p>
                            )}
                        </div>
                        <div className='flex shrink-0 gap-2'>
                            {user?.discord_oauth2_linked !== 'true' ? (
                                <Button variant='outline' size='sm' disabled={isSubmitting} onClick={handleLinkDiscord}>
                                    {t('account.linkDiscord')}
                                </Button>
                            ) : (
                                <Button
                                    variant='destructive'
                                    size='sm'
                                    disabled={isSubmitting}
                                    onClick={handleUnlinkDiscord}
                                >
                                    {t('account.unlinkDiscord')}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className='border-border/50 bg-card/50 rounded-lg border p-6 backdrop-blur-xl'>
                <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='flex-1'>
                        <h4 className='text-foreground text-sm font-medium'>{t('account.sessionManagement')}</h4>
                        <p className='text-muted-foreground mt-1 text-sm'>
                            {t('account.sessionManagementDescription')}
                        </p>
                    </div>
                    <Button variant='outline' size='sm' disabled={isSubmitting} onClick={handleLogout}>
                        {t('account.logout')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
