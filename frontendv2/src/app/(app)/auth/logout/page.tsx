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

export default function LogoutPage() {
    const router = useRouter();
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
                    <div className='relative bg-primary/10 rounded-full p-4'>
                        <LogOut className='size-12 text-primary' />
                    </div>
                </div>

                <div className='space-y-2'>
                    <h1 className='text-2xl font-bold text-foreground'>Logging out...</h1>
                    <p className='text-muted-foreground max-w-sm'>
                        Please wait while we securely log you out and clean up your session.
                    </p>
                </div>

                <div className='flex items-center gap-2 mt-4'>
                    <div className='flex space-x-1'>
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className='w-2 h-2 bg-primary rounded-full animate-bounce'
                                style={{ animationDelay: `${(i - 1) * 0.1}s` }}
                            />
                        ))}
                    </div>
                    <span className='text-sm text-muted-foreground ml-2'>Cleaning up...</span>
                </div>
            </div>

            <div className='w-full max-w-xs'>
                <div className='w-full bg-muted rounded-full h-1.5'>
                    <div
                        className='bg-primary h-1.5 rounded-full transition-all duration-1000 ease-out'
                        style={{ width: `${Math.min(logoutProgress, 100)}%` }}
                    />
                </div>
            </div>

            {showManualRedirect && (
                <div className='text-center animate-fade-in'>
                    <p className='text-sm text-muted-foreground mb-3'>Taking longer than expected?</p>
                    <Button variant='outline' size='sm' onClick={manualRedirect}>
                        Continue to Login
                    </Button>
                </div>
            )}
        </div>
    );
}
