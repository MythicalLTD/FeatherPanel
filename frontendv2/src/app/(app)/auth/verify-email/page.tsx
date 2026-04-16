'use client';

import { Suspense } from 'react';
import VerifyEmailForm from './VerifyEmailForm';

export default function VerifyEmailPage() {
    return (
        <Suspense
            fallback={
                <div className='flex items-center justify-center p-8'>
                    <div className='animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent' />
                </div>
            }
        >
            <VerifyEmailForm />
        </Suspense>
    );
}
