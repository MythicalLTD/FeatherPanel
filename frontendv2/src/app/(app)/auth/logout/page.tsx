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

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/featherui/Button';
import { LogOut } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { AuthPage, AuthPageHeader, AuthPanel } from '@/components/auth/AuthUi';

export default function LogoutPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [logoutProgress, setLogoutProgress] = useState(0);
    const [showManualRedirect, setShowManualRedirect] = useState(false);

    const manualRedirect = () => {
        router.push('/auth/login');
    };

    useEffect(() => {
        const completeLogout = () => {
            setTimeout(() => {
                router.push('/auth/login');
            }, 500);
        };

        const cleanupStorage = async () => {
            try {
                localStorage.clear();
                sessionStorage.clear();

                document.cookie.split(';').forEach((cookie) => {
                    const eqPos = cookie.indexOf('=');
                    const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
                    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                });
            } catch (error) {
                console.error('Error during storage cleanup:', error);
            }
        };

        cleanupStorage();

        const interval = setInterval(() => {
            setLogoutProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    completeLogout();
                    return 100;
                }
                return prev + Math.random() * 15 + 5;
            });
        }, 200);

        const timeout = setTimeout(() => {
            setShowManualRedirect(true);
        }, 5000);

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, [router]);

    return (
        <AuthPage>
            <AuthPageHeader
                icon={<LogOut className='h-6 w-6' />}
                title={t('auth.logout.title')}
                subtitle={t('auth.logout.subtitle')}
            />

            <AuthPanel className='space-y-5'>
                <div className='flex items-center justify-center gap-2'>
                    <div className='flex space-x-1'>
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className='bg-primary h-2 w-2 animate-bounce rounded-full'
                                style={{ animationDelay: `${(i - 1) * 0.1}s` }}
                            />
                        ))}
                    </div>
                    <span className='text-muted-foreground text-sm'>{t('auth.logout.cleaning_up')}</span>
                </div>

                <div className='bg-muted h-1.5 w-full overflow-hidden rounded-full'>
                    <div
                        className='bg-primary h-1.5 rounded-full transition-all duration-1000 ease-out'
                        style={{ width: `${Math.min(logoutProgress, 100)}%` }}
                    />
                </div>

                {showManualRedirect ? (
                    <div className='animate-fade-in space-y-3 text-center'>
                        <p className='text-muted-foreground text-sm'>{t('auth.logout.taking_too_long')}</p>
                        <Button variant='outline' className='w-full' onClick={manualRedirect}>
                            {t('auth.logout.continue_to_login')}
                        </Button>
                    </div>
                ) : null}
            </AuthPanel>
        </AuthPage>
    );
}
