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

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import { CheckCircle2, FileText, Lightbulb, Loader2, Send } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { useTranslation } from '@/contexts/TranslationContext';

export default function FeatherCloudSuggestionsPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [why, setWhy] = useState('');
    const [checking, setChecking] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [credentialsError, setCredentialsError] = useState<string | null>(null);
    const [progress, setProgress] = useState<string | null>(null);

    const checkLink = useCallback(async () => {
        setChecking(true);
        setCredentialsError(null);
        try {
            await axios.get('/api/admin/cloud/data/summary');
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const code = err.response?.data?.error_code;
                if (code === 'CLOUD_CREDENTIALS_NOT_CONFIGURED' || err.response?.status === 503) {
                    setCredentialsError(
                        err.response?.data?.message || t('admin.feathercloud.common.credentials_error'),
                    );
                }
            }
        } finally {
            setChecking(false);
        }
    }, [t]);

    useEffect(() => {
        checkLink();
    }, [checkLink]);

    const submitSuggestion = async () => {
        if (!title.trim()) {
            toast.error(t('admin.feathercloud.suggestions.title_required'));
            return;
        }
        setSubmitting(true);
        setProgress(t('admin.feathercloud.suggestions.progress'));
        try {
            const response = await axios.post(
                '/api/admin/cloud/data/suggestion',
                {
                    title: title.trim(),
                    body: body.trim(),
                    why: why.trim() || undefined,
                    auto_collect: true,
                },
                { timeout: 60000 },
            );
            if (response.data?.success) {
                toast.success(t('admin.feathercloud.suggestions.success'));
                setTitle('');
                setBody('');
                setWhy('');
            } else {
                throw new Error(response.data?.message || t('admin.feathercloud.suggestions.failed'));
            }
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const code = err.response?.data?.error_code;
                if (code === 'MEMBER_UUID_REQUIRED') {
                    toast.error(err.response?.data?.message || t('admin.feathercloud.common.member_uuid_required'));
                    return;
                }
                if (code === 'CLOUD_CREDENTIALS_NOT_CONFIGURED') {
                    setCredentialsError(err.response?.data?.message || t('admin.feathercloud.common.not_linked_short'));
                    return;
                }
                toast.error(err.response?.data?.message || t('admin.feathercloud.suggestions.failed'));
                return;
            }
            toast.error(t('admin.feathercloud.suggestions.failed'));
        } finally {
            setSubmitting(false);
            setProgress(null);
        }
    };

    return (
        <div className='space-y-6 md:space-y-8'>
            <PageHeader
                title={t('admin.feathercloud.suggestions.title')}
                description={t('admin.feathercloud.suggestions.subtitle')}
                icon={Lightbulb}
            />

            {checking ? (
                <PageCard title={t('admin.feathercloud.common.checking_connection')} icon={Loader2}>
                    <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        {t('admin.feathercloud.common.checking_link')}
                    </div>
                </PageCard>
            ) : credentialsError ? (
                <PageCard
                    title={t('admin.feathercloud.common.not_linked_title')}
                    description={credentialsError}
                    icon={Lightbulb}
                >
                    <Button onClick={() => router.push('/admin/cloud-management')}>
                        {t('admin.feathercloud.common.open_cloud_connections')}
                    </Button>
                </PageCard>
            ) : (
                <>
                    <PageCard title={t('admin.feathercloud.suggestions.auto_attach_title')} icon={FileText}>
                        <ul className='text-muted-foreground space-y-2 text-sm'>
                            <li className='flex gap-2'>
                                <CheckCircle2 className='text-primary mt-0.5 h-4 w-4 shrink-0' />
                                {t('admin.feathercloud.suggestions.auto_attach_1')}
                            </li>
                            <li className='flex gap-2'>
                                <CheckCircle2 className='text-primary mt-0.5 h-4 w-4 shrink-0' />
                                {t('admin.feathercloud.suggestions.auto_attach_2')}
                            </li>
                            <li className='flex gap-2'>
                                <CheckCircle2 className='text-primary mt-0.5 h-4 w-4 shrink-0' />
                                {t('admin.feathercloud.suggestions.auto_attach_3')}
                            </li>
                        </ul>
                    </PageCard>

                    <PageCard title={t('admin.feathercloud.suggestions.form_title')} icon={Send}>
                        <div className='space-y-4'>
                            <div>
                                <label className='text-muted-foreground mb-1 block text-xs font-semibold uppercase'>
                                    {t('admin.feathercloud.suggestions.idea_title')}
                                </label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={t('admin.feathercloud.suggestions.idea_title_placeholder')}
                                    disabled={submitting}
                                />
                            </div>
                            <div>
                                <label className='text-muted-foreground mb-1 block text-xs font-semibold uppercase'>
                                    {t('admin.feathercloud.suggestions.what_should_it_do')}
                                </label>
                                <Textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    rows={4}
                                    placeholder={t('admin.feathercloud.suggestions.what_should_it_do_placeholder')}
                                    disabled={submitting}
                                />
                            </div>
                            <div>
                                <label className='text-muted-foreground mb-1 block text-xs font-semibold uppercase'>
                                    {t('admin.feathercloud.suggestions.why_it_helps')}
                                </label>
                                <Textarea
                                    value={why}
                                    onChange={(e) => setWhy(e.target.value)}
                                    rows={3}
                                    placeholder={t('admin.feathercloud.suggestions.why_it_helps_placeholder')}
                                    disabled={submitting}
                                />
                            </div>

                            {progress && (
                                <p className='text-muted-foreground flex items-center gap-2 text-sm'>
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                    {progress}
                                </p>
                            )}

                            <Button onClick={submitSuggestion} disabled={submitting} size='lg'>
                                {submitting ? (
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                ) : (
                                    <Send className='mr-2 h-4 w-4' />
                                )}
                                {submitting
                                    ? t('admin.feathercloud.suggestions.sending')
                                    : t('admin.feathercloud.suggestions.send')}
                            </Button>
                        </div>
                    </PageCard>
                </>
            )}
        </div>
    );
}
