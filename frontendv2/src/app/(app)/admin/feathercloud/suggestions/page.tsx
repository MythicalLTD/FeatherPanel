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
import axios from 'axios';
import { toast } from 'sonner';
import { CheckCircle2, FileText, Lightbulb, Loader2, Send } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';

export default function FeatherCloudSuggestionsPage() {
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
                        err.response?.data?.message ||
                            'Mythic Cloud is not linked. Connect under MyFeatherPanel → Cloud Connections first.',
                    );
                }
            }
        } finally {
            setChecking(false);
        }
    }, []);

    useEffect(() => {
        checkLink();
    }, [checkLink]);

    const submitSuggestion = async () => {
        if (!title.trim()) {
            toast.error('Add a short title for your idea');
            return;
        }
        setSubmitting(true);
        setProgress('Collecting environment info…');
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
                toast.success('Suggestion sent');
                setTitle('');
                setBody('');
                setWhy('');
            } else {
                throw new Error(response.data?.message || 'Failed to submit suggestion');
            }
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const code = err.response?.data?.error_code;
                if (code === 'MEMBER_UUID_REQUIRED') {
                    toast.error(
                        err.response?.data?.message ||
                            'Link your Mythic account or ask your team owner to invite a matching email.',
                    );
                    return;
                }
                if (code === 'CLOUD_CREDENTIALS_NOT_CONFIGURED') {
                    setCredentialsError(err.response?.data?.message || 'Mythic Cloud is not linked.');
                    return;
                }
                toast.error(err.response?.data?.message || 'Failed to submit suggestion');
                return;
            }
            toast.error('Failed to submit suggestion');
        } finally {
            setSubmitting(false);
            setProgress(null);
        }
    };

    return (
        <div className='space-y-6 md:space-y-8'>
            <PageHeader
                title='Suggest a New Thing'
                description='Ideas land on the Mythic suggestions board for featherpanel (not GitHub until accepted). We attach basic environment details automatically (no logs).'
                icon={Lightbulb}
            />

            {checking ? (
                <PageCard title='Checking connection' icon={Loader2}>
                    <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        Checking Mythic Cloud link…
                    </div>
                </PageCard>
            ) : credentialsError ? (
                <PageCard title='Not linked' description={credentialsError} icon={Lightbulb}>
                    <Button onClick={() => (window.location.href = '/admin/cloud-management')}>
                        Open Cloud Connections
                    </Button>
                </PageCard>
            ) : (
                <>
                    <PageCard title='What we attach automatically' icon={FileText}>
                        <ul className='text-muted-foreground space-y-2 text-sm'>
                            <li className='flex gap-2'>
                                <CheckCircle2 className='text-primary mt-0.5 h-4 w-4 shrink-0' />
                                Tagged as <span className='text-foreground font-medium'>[Feature]</span> on{' '}
                                <span className='text-foreground font-medium'>featherpanel</span>
                            </li>
                            <li className='flex gap-2'>
                                <CheckCircle2 className='text-primary mt-0.5 h-4 w-4 shrink-0' />
                                Version, PHP, OS, install type, and counts
                            </li>
                            <li className='flex gap-2'>
                                <CheckCircle2 className='text-primary mt-0.5 h-4 w-4 shrink-0' />
                                Installed plugins and PHP extensions
                            </li>
                        </ul>
                    </PageCard>

                    <PageCard title='Your idea' icon={Send}>
                        <div className='space-y-4'>
                            <div>
                                <label className='text-muted-foreground mb-1 block text-xs font-semibold uppercase'>
                                    Idea title
                                </label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder='Short name for the feature'
                                    disabled={submitting}
                                />
                            </div>
                            <div>
                                <label className='text-muted-foreground mb-1 block text-xs font-semibold uppercase'>
                                    What should it do?
                                </label>
                                <Textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    rows={4}
                                    placeholder='Describe the feature or improvement'
                                    disabled={submitting}
                                />
                            </div>
                            <div>
                                <label className='text-muted-foreground mb-1 block text-xs font-semibold uppercase'>
                                    Why it helps
                                </label>
                                <Textarea
                                    value={why}
                                    onChange={(e) => setWhy(e.target.value)}
                                    rows={3}
                                    placeholder='Who benefits and what problem does it solve?'
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
                                {submitting ? 'Sending…' : 'Send suggestion'}
                            </Button>
                        </div>
                    </PageCard>
                </>
            )}
        </div>
    );
}
