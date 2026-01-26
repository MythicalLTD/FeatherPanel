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

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import axios from 'axios';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CloudManagementFinishPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const saveCloudCredentials = useCallback(async () => {
        const cloudApiKey = searchParams.get('cloud_api_key');
        const cloudApiSecret = searchParams.get('cloud_api_secret');

        if (!cloudApiKey || !cloudApiSecret) {
            setError('Missing required parameters: cloud_api_key and cloud_api_secret');
            setIsLoading(false);
            return;
        }

        setIsSaving(true);
        try {
            const response = await axios.post('/api/admin/cloud/oauth2/callback', {
                cloud_api_key: decodeURIComponent(cloudApiKey),
                cloud_api_secret: decodeURIComponent(cloudApiSecret),
            });

            if (response.data && response.data.success) {
                setIsSuccess(true);
                toast.success('Your panel has been successfully linked with FeatherCloud!');

                setTimeout(() => {
                    router.push('/admin/cloud-management');
                }, 3000);
            } else {
                throw new Error(response.data.message || 'Failed to save credentials');
            }
        } catch (err) {
            console.error('Failed to save cloud credentials:', err);
            const errorMessage =
                axios.isAxiosError(err) && err.response?.data?.message
                    ? err.response.data.message
                    : 'Failed to save cloud credentials';
            setError(errorMessage);
            toast.error('Failed to save cloud credentials');
        } finally {
            setIsSaving(false);
            setIsLoading(false);
        }
    }, [searchParams, router]);

    useEffect(() => {
        saveCloudCredentials();
    }, [saveCloudCredentials]);

    return (
        <div className='min-h-screen flex items-center justify-center p-6'>
            <div className='w-full max-w-md space-y-8 text-center'>
                <div className='flex justify-center'>
                    {isLoading || isSaving ? (
                        <div className='relative'>
                            <Loader2 className='h-20 w-20 text-primary animate-spin' />
                            <div className='absolute inset-0 flex items-center justify-center'>
                                <div className='h-12 w-12 rounded-full bg-primary/10'></div>
                            </div>
                        </div>
                    ) : isSuccess ? (
                        <div className='relative'>
                            <CheckCircle2 className='h-20 w-20 text-green-500' />
                            <div className='absolute inset-0 flex items-center justify-center'>
                                <div className='h-16 w-16 rounded-full bg-green-500/10 animate-ping'></div>
                            </div>
                        </div>
                    ) : error ? (
                        <div className='relative'>
                            <AlertCircle className='h-20 w-20 text-red-500' />
                            <div className='absolute inset-0 flex items-center justify-center'>
                                <div className='h-16 w-16 rounded-full bg-red-500/10'></div>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className='space-y-2'>
                    <h1 className='text-3xl font-bold text-foreground'>
                        {isLoading || isSaving
                            ? t('admin.cloud_management.finish.processing')
                            : isSuccess
                              ? t('admin.cloud_management.finish.success')
                              : error
                                ? t('admin.cloud_management.finish.failed')
                                : null}
                    </h1>

                    <p className='text-base text-muted-foreground max-w-md mx-auto'>
                        {isLoading || isSaving
                            ? t('admin.cloud_management.finish.processing_desc')
                            : isSuccess
                              ? t('admin.cloud_management.finish.success_desc')
                              : error
                                ? error
                                : null}
                    </p>
                </div>

                {isSuccess && (
                    <div className='rounded-lg border border-green-500/30 bg-green-500/10 p-6 text-left space-y-3'>
                        <p className='text-sm font-semibold text-green-800 dark:text-green-300'>
                            {t('admin.cloud_management.finish.whats_next')}
                        </p>
                        <ul className='space-y-2 text-sm text-green-700 dark:text-green-400'>
                            <li className='flex items-start gap-2'>
                                <CheckCircle2 className='h-4 w-4 mt-0.5 shrink-0' />
                                <span>{t('admin.cloud_management.finish.next_step1')}</span>
                            </li>
                            <li className='flex items-start gap-2'>
                                <CheckCircle2 className='h-4 w-4 mt-0.5 shrink-0' />
                                <span>{t('admin.cloud_management.finish.next_step2')}</span>
                            </li>
                            <li className='flex items-start gap-2'>
                                <CheckCircle2 className='h-4 w-4 mt-0.5 shrink-0' />
                                <span>{t('admin.cloud_management.finish.next_step3')}</span>
                            </li>
                        </ul>
                    </div>
                )}

                {error && (
                    <div className='rounded-lg border border-red-500/30 bg-red-500/10 p-6'>
                        <p className='text-sm text-red-700 dark:text-red-400'>
                            {t('admin.cloud_management.finish.error_desc')}
                        </p>
                    </div>
                )}

                <div className='flex justify-center gap-3'>
                    {isSuccess ? (
                        <Button size='lg' onClick={() => router.push('/admin/cloud-management')} className='gap-2'>
                            {t('admin.cloud_management.finish.go_to_cloud')}
                            <ArrowRight className='h-4 w-4' />
                        </Button>
                    ) : error ? (
                        <Button variant='outline' size='lg' onClick={() => router.push('/admin/cloud-management')}>
                            {t('admin.cloud_management.finish.return')}
                        </Button>
                    ) : null}
                </div>

                {isSuccess && (
                    <p className='text-xs text-muted-foreground'>{t('admin.cloud_management.finish.redirecting')}</p>
                )}
            </div>
        </div>
    );
}
