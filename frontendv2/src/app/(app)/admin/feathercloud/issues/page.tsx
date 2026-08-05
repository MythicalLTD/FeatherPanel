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
import { Bug, CheckCircle2, FileText, Loader2, Server, Send } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';

export default function MythicIssuesPage() {
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [steps, setSteps] = useState('');
    const [expected, setExpected] = useState('');
    const [actual, setActual] = useState('');
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

    const submitIssue = async () => {
        if (!title.trim()) {
            toast.error('Add a short title');
            return;
        }
        setSubmitting(true);
        setProgress('Collecting panel logs, node diagnostics, and environment info…');
        try {
            const response = await axios.post(
                '/api/admin/cloud/data/report',
                {
                    title: title.trim(),
                    body: body.trim(),
                    steps: steps.trim() || undefined,
                    expected: expected.trim() || undefined,
                    actual: actual.trim() || undefined,
                    auto_collect: true,
                    include_node_diagnostics: true,
                },
                { timeout: 180000 },
            );
            if (response.data?.success) {
                toast.success('Issue sent with automatic diagnostics');
                setTitle('');
                setBody('');
                setSteps('');
                setExpected('');
                setActual('');
            } else {
                throw new Error(response.data?.message || 'Failed to create issue');
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
                toast.error(err.response?.data?.message || 'Failed to create issue');
                return;
            }
            toast.error('Failed to create issue');
        } finally {
            setSubmitting(false);
            setProgress(null);
        }
    };

    return (
        <div className='space-y-6 md:space-y-8'>
            <PageHeader
                title='Report an Issue'
                description='Always filed on featherpanel. Panel logs, every node’s diagnostics, and environment details are attached automatically.'
                icon={Bug}
            />

            {checking ? (
                <PageCard title='Checking connection' icon={Loader2}>
                    <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        Checking Mythic Cloud link…
                    </div>
                </PageCard>
            ) : credentialsError ? (
                <PageCard title='Not linked' description={credentialsError} icon={Bug}>
                    <Button onClick={() => router.push('/admin/cloud-management')}>Open Cloud Connections</Button>
                </PageCard>
            ) : (
                <>
                    <PageCard title='What we attach automatically' icon={FileText}>
                        <ul className='text-muted-foreground space-y-2 text-sm'>
                            <li className='flex gap-2'>
                                <CheckCircle2 className='text-primary mt-0.5 h-4 w-4 shrink-0' />
                                Project locked to <span className='text-foreground font-medium'>featherpanel</span>
                            </li>
                            <li className='flex gap-2'>
                                <CheckCircle2 className='text-primary mt-0.5 h-4 w-4 shrink-0' />
                                Panel app / web / mail / runner logs (uploaded as pastes)
                            </li>
                            <li className='flex gap-2'>
                                <Server className='text-primary mt-0.5 h-4 w-4 shrink-0' />
                                Wings diagnostics + recent logs for every node
                            </li>
                            <li className='flex gap-2'>
                                <CheckCircle2 className='text-primary mt-0.5 h-4 w-4 shrink-0' />
                                Version, PHP, OS, counts, plugins, and extensions
                            </li>
                        </ul>
                    </PageCard>

                    <PageCard title='Describe the bug' icon={Send}>
                        <div className='space-y-4'>
                            <div>
                                <label className='text-muted-foreground mb-1 block text-xs font-semibold uppercase'>
                                    Title
                                </label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder='Short summary of what went wrong'
                                    disabled={submitting}
                                />
                            </div>
                            <div>
                                <label className='text-muted-foreground mb-1 block text-xs font-semibold uppercase'>
                                    What happened?
                                </label>
                                <Textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    rows={4}
                                    placeholder='Describe the problem in your own words'
                                    disabled={submitting}
                                />
                            </div>
                            <div className='grid gap-4 md:grid-cols-3'>
                                <div>
                                    <label className='text-muted-foreground mb-1 block text-xs font-semibold uppercase'>
                                        Steps to reproduce
                                    </label>
                                    <Textarea
                                        value={steps}
                                        onChange={(e) => setSteps(e.target.value)}
                                        rows={4}
                                        placeholder='1. …'
                                        disabled={submitting}
                                    />
                                </div>
                                <div>
                                    <label className='text-muted-foreground mb-1 block text-xs font-semibold uppercase'>
                                        Expected
                                    </label>
                                    <Textarea
                                        value={expected}
                                        onChange={(e) => setExpected(e.target.value)}
                                        rows={4}
                                        disabled={submitting}
                                    />
                                </div>
                                <div>
                                    <label className='text-muted-foreground mb-1 block text-xs font-semibold uppercase'>
                                        Actual
                                    </label>
                                    <Textarea
                                        value={actual}
                                        onChange={(e) => setActual(e.target.value)}
                                        rows={4}
                                        disabled={submitting}
                                    />
                                </div>
                            </div>

                            {progress && (
                                <p className='text-muted-foreground flex items-center gap-2 text-sm'>
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                    {progress}
                                </p>
                            )}

                            <Button onClick={submitIssue} disabled={submitting} size='lg'>
                                {submitting ? (
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                ) : (
                                    <Send className='mr-2 h-4 w-4' />
                                )}
                                {submitting ? 'Collecting & sending…' : 'Send issue to Mythic'}
                            </Button>
                        </div>
                    </PageCard>
                </>
            )}
        </div>
    );
}
