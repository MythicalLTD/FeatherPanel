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
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

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
        <div className='flex flex-col items-center justify-center gap-6'>
            <div className='flex flex-col items-center gap-4 text-center'>
                <div className='relative'>
                    <div className='bg-primary/10 relative rounded-full p-4'>
                        <LogOut className='text-primary size-12' />
                    </div>
                </div>

                <div className='space-y-2'>
                    <h1 className='text-foreground text-2xl font-bold'>{t('auth.logout.title')}</h1>
                    <p className='text-muted-foreground max-w-sm'>{t('auth.logout.subtitle')}</p>
                </div>

                <div className='mt-4 flex items-center gap-2'>
                    <div className='flex space-x-1'>
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className='bg-primary h-2 w-2 animate-bounce rounded-full'
                                style={{ animationDelay: `${(i - 1) * 0.1}s` }}
                            />
                        ))}
                    </div>
                    <span className='text-muted-foreground ml-2 text-sm'>{t('auth.logout.cleaning_up')}</span>
                </div>
            </div>

            <div className='w-full max-w-xs'>
                <div className='bg-muted h-1.5 w-full rounded-full'>
                    <div
                        className='bg-primary h-1.5 rounded-full transition-all duration-1000 ease-out'
                        style={{ width: `${Math.min(logoutProgress, 100)}%` }}
                    />
                </div>
            </div>

            {showManualRedirect && (
                <div className='animate-fade-in text-center'>
                    <p className='text-muted-foreground mb-3 text-sm'>{t('auth.logout.taking_too_long')}</p>
                    <Button variant='outline' size='sm' onClick={manualRedirect}>
                        {t('auth.logout.continue_to_login')}
                    </Button>
                </div>
            )}
        </div>
    );
}
