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

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from '@/contexts/TranslationContext'
import axios from 'axios'
import { toast } from 'sonner'
import { CheckCircle2, Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CloudManagementFinishPage() {
    const { t } = useTranslation()
    const router = useRouter()
    const searchParams = useSearchParams()

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const saveCloudCredentials = useCallback(async () => {
        // Get and decode URL parameters
        const cloudApiKey = searchParams.get('cloud_api_key')
        const cloudApiSecret = searchParams.get('cloud_api_secret')

        if (!cloudApiKey || !cloudApiSecret) {
            setError('Missing required parameters: cloud_api_key and cloud_api_secret')
            setIsLoading(false)
            return
        }

        setIsSaving(true)
        try {
            const response = await axios.post('/api/admin/cloud/oauth2/callback', {
                cloud_api_key: decodeURIComponent(cloudApiKey),
                cloud_api_secret: decodeURIComponent(cloudApiSecret),
            })

            if (response.data && response.data.success) {
                setIsSuccess(true)
                toast.success('Your panel has been successfully linked with FeatherCloud!')

                // Redirect to cloud management page after 3 seconds
                setTimeout(() => {
                    router.push('/admin/cloud-management')
                }, 3000)
            } else {
                throw new Error(response.data.message || 'Failed to save credentials')
            }
        } catch (err) {
            console.error('Failed to save cloud credentials:', err)
            const errorMessage =
                axios.isAxiosError(err) && err.response?.data?.message
                    ? err.response.data.message
                    : 'Failed to save cloud credentials'
            setError(errorMessage)
            toast.error('Failed to save cloud credentials')
        } finally {
            setIsSaving(false)
            setIsLoading(false)
        }
    }, [searchParams, router])

    useEffect(() => {
        saveCloudCredentials()
    }, [saveCloudCredentials])

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="w-full max-w-md space-y-8 text-center">
                {/* Icon */}
                <div className="flex justify-center">
                    {isLoading || isSaving ? (
                        <div className="relative">
                            <Loader2 className="h-20 w-20 text-primary animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-12 w-12 rounded-full bg-primary/10"></div>
                            </div>
                        </div>
                    ) : isSuccess ? (
                        <div className="relative">
                            <CheckCircle2 className="h-20 w-20 text-green-500" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-16 w-16 rounded-full bg-green-500/10 animate-ping"></div>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="relative">
                            <AlertCircle className="h-20 w-20 text-red-500" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-16 w-16 rounded-full bg-red-500/10"></div>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-foreground">
                        {isLoading || isSaving ? (
                            t('admin.cloud_management.finish.processing')
                        ) : isSuccess ? (
                            t('admin.cloud_management.finish.success')
                        ) : error ? (
                            t('admin.cloud_management.finish.failed')
                        ) : null}
                    </h1>

                    <p className="text-base text-muted-foreground max-w-md mx-auto">
                        {isLoading || isSaving ? (
                            t('admin.cloud_management.finish.processing_desc')
                        ) : isSuccess ? (
                            t('admin.cloud_management.finish.success_desc')
                        ) : error ? (
                            error
                        ) : null}
                    </p>
                </div>

                {/* Success Info */}
                {isSuccess && (
                    <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-6 text-left space-y-3">
                        <p className="text-sm font-semibold text-green-800 dark:text-green-300">{t('admin.cloud_management.finish.whats_next')}</p>
                        <ul className="space-y-2 text-sm text-green-700 dark:text-green-400">
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{t('admin.cloud_management.finish.next_step1')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{t('admin.cloud_management.finish.next_step2')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{t('admin.cloud_management.finish.next_step3')}</span>
                            </li>
                        </ul>
                    </div>
                )}

                {/* Error Info */}
                {error && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6">
                        <p className="text-sm text-red-700 dark:text-red-400">
                            {t('admin.cloud_management.finish.error_desc')}
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-center gap-3">
                    {isSuccess ? (
                        <Button 
                            size="lg"
                            onClick={() => router.push('/admin/cloud-management')}
                            className="gap-2"
                        >
                            {t('admin.cloud_management.finish.go_to_cloud')}
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    ) : error ? (
                        <Button 
                            variant="outline" 
                            size="lg"
                            onClick={() => router.push('/admin/cloud-management')}
                        >
                            {t('admin.cloud_management.finish.return')}
                        </Button>
                    ) : null}
                </div>

                {/* Auto-redirect notice */}
                {isSuccess && (
                    <p className="text-xs text-muted-foreground">
                        {t('admin.cloud_management.finish.redirecting')}
                    </p>
                )}
            </div>
        </div>
    )
}
