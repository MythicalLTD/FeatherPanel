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

import React from 'react';
import { Button } from '@/components/ui/button';

export default function MaintenancePage() {
    return (
        <div className='relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 text-center selection:bg-primary/20'>
            {/* Background Effects */}
            <div className='absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,var(--tw-gradient-stops))] from-primary/10 via-background to-background' />
            <div className='absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/20 blur-[100px]' />
            <div className='absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/10 blur-[100px]' />

            <div className='relative z-10 mx-auto w-full max-w-lg space-y-8 p-6'>
                {/* Icon */}
                <div className='relative mx-auto flex h-32 w-32 items-center justify-center rounded-3xl bg-primary/5 shadow-2xl shadow-primary/20 ring-1 ring-white/10 backdrop-blur-3xl'>
                    <div className='absolute inset-0 rounded-3xl bg-linear-to-tr from-white/10 to-transparent' />
                    <svg
                        xmlns='http://www.w3.org/2000/svg'
                        viewBox='0 0 24 24'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        className='relative h-16 w-16 text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.5)] transition-all duration-500 hover:scale-110'
                    >
                        <path d='M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' />
                    </svg>
                </div>

                {/* Text Content */}
                <div className='space-y-4'>
                    <h1 className='bg-linear-to-br from-foreground to-foreground/60 bg-clip-text text-4xl font-bold tracking-tighter text-transparent sm:text-5xl md:text-6xl'>
                        System Maintenance
                    </h1>
                    <p className='mx-auto max-w-[400px] text-lg text-muted-foreground/80 leading-relaxed font-medium'>
                        We are currently upgrading our systems to provide you with a better experience. We&apos;ll be
                        back shortly.
                    </p>
                </div>

                {/* Status Badge */}
                <div className='inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 backdrop-blur-md'>
                    <span className='relative flex h-2.5 w-2.5'>
                        <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75'></span>
                        <span className='relative inline-flex h-2.5 w-2.5 rounded-full bg-primary'></span>
                    </span>
                    <span className='text-sm font-semibold text-primary'>In Progress</span>
                </div>

                {/* Action Button */}
                <div className='pt-4'>
                    <Button
                        variant='outline'
                        size='lg'
                        onClick={() => (window.location.href = '/')}
                        className='group relative overflow-hidden transition-all hover:scale-105 hover:border-primary/50 hover:bg-primary/5 hover:text-primary hover:shadow-lg hover:shadow-primary/10'
                    >
                        <div className='absolute inset-0 -translate-x-full group-hover:animate-[shimmer_2s_infinite] bg-linear-to-r from-transparent via-white/10 to-transparent' />
                        <span className='relative flex items-center gap-2'>
                            <svg
                                xmlns='http://www.w3.org/2000/svg'
                                width='16'
                                height='16'
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                className='transition-transform group-hover:rotate-180'
                            >
                                <path d='M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' />
                                <path d='M3 3v5h5' />
                                <path d='M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16' />
                                <path d='M16 16l5 5v-5' />
                            </svg>
                            Check Again
                        </span>
                    </Button>
                </div>
            </div>

            {/* Footer */}
            <div className='absolute bottom-6 left-0 right-0 text-center'>
                <p className='text-sm font-medium text-muted-foreground/50'>
                    &copy; {new Date().getFullYear()} FeatherPanel
                </p>
            </div>
        </div>
    );
}
