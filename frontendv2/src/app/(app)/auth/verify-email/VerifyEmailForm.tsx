'use client';

import Link from 'next/link';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function VerifyEmailForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verifyEmail = async () => {
            if (!token) {
                setMessage('Missing verification token.');
                setLoading(false);
                return;
            }

            try {
                const response = await axios.get('/api/user/auth/verify-email', {
                    params: { token },
                });
                if (response.data?.success) {
                    setSuccess(true);
                    setMessage(response.data?.message || 'Email verified successfully.');
                } else {
                    setMessage(response.data?.message || 'Failed to verify email.');
                }
            } catch (error: unknown) {
                const axiosError = error as { response?: { data?: { message?: string } } };
                setMessage(axiosError.response?.data?.message || 'Failed to verify email.');
            } finally {
                setLoading(false);
            }
        };

        verifyEmail();
    }, [token]);

    if (loading) {
        return (
            <div className='text-center py-12'>
                <div className='inline-block animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent' />
                <p className='mt-4 text-sm text-muted-foreground'>Verifying your email...</p>
            </div>
        );
    }

    return (
        <div className='space-y-6 text-center'>
            <div className='space-y-2'>
                <h2 className={`text-2xl font-bold tracking-tight ${success ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                    {success ? 'Email verified' : 'Verification failed'}
                </h2>
                <p className='text-sm text-muted-foreground'>{message}</p>
            </div>
            <Button asChild className='w-full'>
                <Link href='/auth/login'>Continue to login</Link>
            </Button>
        </div>
    );
}
