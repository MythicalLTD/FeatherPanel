/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
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

        // Clean up storage
        const cleanupStorage = async () => {
            try {
                localStorage.clear();
                sessionStorage.clear();

                // Clear cookies
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

        // Simulate progress
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

        // Show manual redirect after 5 seconds
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
                {/* Logout Icon */}
                <div className='relative'>
                    <div className='absolute inset-0 bg-primary/20 rounded-full blur-xl' />
                    <div className='relative bg-primary/10 rounded-full p-4'>
                        <LogOut className='size-12 text-primary' />
                    </div>
                </div>

                {/* Logout Message */}
                <div className='space-y-2'>
                    <h1 className='text-2xl font-bold text-foreground'>Logging out...</h1>
                    <p className='text-muted-foreground max-w-sm'>
                        Please wait while we securely log you out and clean up your session.
                    </p>
                </div>

                {/* Loading Animation */}
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

            {/* Progress Bar */}
            <div className='w-full max-w-xs'>
                <div className='w-full bg-muted rounded-full h-1.5'>
                    <div
                        className='bg-primary h-1.5 rounded-full transition-all duration-1000 ease-out'
                        style={{ width: `${Math.min(logoutProgress, 100)}%` }}
                    />
                </div>
            </div>

            {/* Manual Redirect Button (fallback) */}
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
