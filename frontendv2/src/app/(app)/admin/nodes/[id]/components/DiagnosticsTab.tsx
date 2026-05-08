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

import React, { useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Activity, Clipboard, FileText, ExternalLink, AlertTriangle, CheckCircle2, Settings2 } from 'lucide-react';
import axios from 'axios';
import { DiagnosticsResult } from '../types';
import { toast } from 'sonner';

interface DiagnosticsTabProps {
    nodeId: number;
}

export function DiagnosticsTab({ nodeId }: DiagnosticsTabProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<DiagnosticsResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [options, setOptions] = useState({
        format: 'text' as 'text' | 'url',
        includeEndpoints: false,
        includeLogs: false,
        logLines: 200,
        uploadApiUrl: '',
    });

    const handleGenerate = async () => {
        setLoading(true);
        setResult(null);
        setError(null);
        try {
            const { data } = await axios.get(`/api/admin/nodes/${nodeId}/diagnostics`, {
                params: {
                    format: options.format,
                    include_endpoints: options.includeEndpoints,
                    include_logs: options.includeLogs,
                    log_lines: options.includeLogs ? options.logLines : undefined,
                    upload_api_url: options.format === 'url' ? options.uploadApiUrl : undefined,
                },
            });

            if (data.success) {
                setResult(data.data.diagnostics);
                toast.success(t('admin.node.view.diagnostics.success'));
            } else {
                setError(data.message);
                toast.error(data.message);
            }
        } catch (e: unknown) {
            let msg = t('admin.node.view.diagnostics.failed');
            if (axios.isAxiosError(e)) {
                msg = e.response?.data?.message || e.message;
            }
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success(t('common.copied_to_clipboard'));
    };

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.node.view.diagnostics.title')}
                description={t('admin.node.view.diagnostics.description')}
                icon={Activity}
            >
                <div className='space-y-8'>
                    <div className='space-y-3'>
                        <Label className='text-sm font-semibold'>{t('admin.node.view.diagnostics.format_label')}</Label>
                        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                            <button
                                type='button'
                                className={`relative flex items-center gap-4 rounded-2xl border-2 p-4 transition-all ${
                                    options.format === 'text'
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border/50 hover:border-primary/50'
                                }`}
                                onClick={() => setOptions({ ...options, format: 'text' })}
                            >
                                <div
                                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${
                                        options.format === 'text' ? 'border-primary' : 'border-muted-foreground/30'
                                    }`}
                                >
                                    {options.format === 'text' && <div className='bg-primary h-3 w-3 rounded-full' />}
                                </div>
                                <div className='text-left'>
                                    <p className='text-sm font-bold'>{t('admin.node.view.diagnostics.raw_text')}</p>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.node.view.diagnostics.raw_text_help')}
                                    </p>
                                </div>
                            </button>
                            <button
                                type='button'
                                className={`relative flex items-center gap-4 rounded-2xl border-2 p-4 transition-all ${
                                    options.format === 'url'
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border/50 hover:border-primary/50'
                                }`}
                                onClick={() => setOptions({ ...options, format: 'url' })}
                            >
                                <div
                                    className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all ${
                                        options.format === 'url' ? 'border-primary' : 'border-muted-foreground/30'
                                    }`}
                                >
                                    {options.format === 'url' && <div className='bg-primary h-3 w-3 rounded-full' />}
                                </div>
                                <div className='text-left'>
                                    <p className='text-sm font-bold'>{t('admin.node.view.diagnostics.upload_url')}</p>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.node.view.diagnostics.upload_url_help')}
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className='space-y-4'>
                        <div className='mb-2 flex items-center gap-2'>
                            <Settings2 className='text-primary h-4 w-4' />
                            <Label className='text-sm font-semibold'>
                                {t('admin.node.view.diagnostics.options_label')}
                            </Label>
                        </div>

                        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                            <div
                                className={`flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-4 transition-all ${
                                    options.includeEndpoints
                                        ? 'border-primary/50 bg-primary/5'
                                        : 'border-border/50 hover:border-primary/30'
                                }`}
                                onClick={() => setOptions({ ...options, includeEndpoints: !options.includeEndpoints })}
                            >
                                <div
                                    className={`mt-1 flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                                        options.includeEndpoints
                                            ? 'bg-primary border-primary'
                                            : 'border-muted-foreground/30'
                                    }`}
                                >
                                    {options.includeEndpoints && <CheckCircle2 className='h-3 w-3 text-white' />}
                                </div>
                                <div>
                                    <p className='text-sm font-bold'>
                                        {t('admin.node.view.diagnostics.include_endpoints')}
                                    </p>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.node.view.diagnostics.include_endpoints_help')}
                                    </p>
                                </div>
                            </div>

                            <div
                                className={`flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-4 transition-all ${
                                    options.includeLogs
                                        ? 'border-primary/50 bg-primary/5'
                                        : 'border-border/50 hover:border-primary/30'
                                }`}
                                onClick={() => setOptions({ ...options, includeLogs: !options.includeLogs })}
                            >
                                <div
                                    className={`mt-1 flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                                        options.includeLogs ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                                    }`}
                                >
                                    {options.includeLogs && <CheckCircle2 className='h-3 w-3 text-white' />}
                                </div>
                                <div>
                                    <p className='text-sm font-bold'>{t('admin.node.view.diagnostics.include_logs')}</p>
                                    <p className='text-muted-foreground text-xs'>
                                        {t('admin.node.view.diagnostics.include_logs_help')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {options.includeLogs && (
                            <div className='bg-muted/30 border-border/50 animate-in fade-in slide-in-from-top-1 space-y-4 rounded-2xl border p-6'>
                                <div>
                                    <Label className='text-muted-foreground mb-2 block text-xs font-bold tracking-wider uppercase'>
                                        {t('admin.node.view.diagnostics.log_lines')}
                                    </Label>
                                    <Input
                                        type='number'
                                        min={1}
                                        max={500}
                                        value={options.logLines}
                                        onChange={(e) => setOptions({ ...options, logLines: parseInt(e.target.value) })}
                                        className='h-10 max-w-[200px]'
                                    />
                                    <p className='text-muted-foreground mt-1.5 text-[10px] italic'>
                                        {t('admin.node.view.diagnostics.log_lines_help')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {options.format === 'url' && (
                            <div className='bg-muted/30 border-border/50 animate-in fade-in slide-in-from-top-1 space-y-4 rounded-2xl border p-6'>
                                <div>
                                    <Label className='text-muted-foreground mb-2 block text-xs font-bold tracking-wider uppercase'>
                                        {t('admin.node.view.diagnostics.custom_url')}
                                    </Label>
                                    <Input
                                        type='url'
                                        value={options.uploadApiUrl}
                                        onChange={(e) => setOptions({ ...options, uploadApiUrl: e.target.value })}
                                        placeholder='https://paste.mythical.systems'
                                        className='h-10 font-mono text-sm'
                                    />
                                    <p className='text-muted-foreground mt-1.5 text-[10px] italic'>
                                        {t('admin.node.view.diagnostics.custom_url_help')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className='border-border/50 border-t pt-6'>
                        <Button className='h-12 w-full text-sm font-bold' loading={loading} onClick={handleGenerate}>
                            {!loading && <FileText className='mr-2 h-4 w-4' />}
                            {t('admin.node.view.diagnostics.generate')}
                        </Button>
                    </div>
                </div>
            </PageCard>

            {result && (
                <PageCard
                    title={t('admin.node.view.diagnostics.result_title')}
                    description={
                        result.format === 'url'
                            ? t('admin.node.view.diagnostics.uploaded')
                            : t('admin.node.view.diagnostics.raw_output')
                    }
                    icon={CheckCircle2}
                >
                    <div className='space-y-6'>
                        {result.format === 'url' && result.url ? (
                            <div className='space-y-4'>
                                <div className='flex items-center gap-3 rounded-2xl border border-green-500/20 bg-green-500/10 p-4'>
                                    <CheckCircle2 className='h-5 w-5 text-green-500' />
                                    <p className='text-sm font-bold text-green-500'>
                                        {t('admin.node.view.diagnostics.upload_success')}
                                    </p>
                                </div>
                                <div className='flex gap-2'>
                                    <Input value={result.url} readOnly className='h-11 font-mono text-xs' />
                                    <Button variant='outline' onClick={() => copyToClipboard(result.url!)}>
                                        <Clipboard className='h-4 w-4' />
                                    </Button>
                                    <Button variant='outline' asChild>
                                        <a href={result.url} target='_blank' rel='noopener noreferrer'>
                                            <ExternalLink className='h-4 w-4' />
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        ) : result.format === 'text' && result.content ? (
                            <div className='space-y-3'>
                                <div className='flex items-center justify-between'>
                                    <Label className='text-muted-foreground text-xs font-bold tracking-wider uppercase'>
                                        {t('admin.node.view.diagnostics.raw_data')}
                                    </Label>
                                    <Button variant='ghost' size='sm' onClick={() => copyToClipboard(result.content!)}>
                                        <Clipboard className='mr-2 h-4 w-4' />
                                        {t('common.copy')}
                                    </Button>
                                </div>
                                <pre className='bg-muted/30 border-border/50 max-h-[500px] overflow-auto rounded-2xl border p-6 font-mono text-[11px] leading-relaxed whitespace-pre-wrap'>
                                    {result.content}
                                </pre>
                            </div>
                        ) : null}
                    </div>
                </PageCard>
            )}

            {error && (
                <div className='bg-destructive/10 border-destructive/20 animate-in fade-in zoom-in-95 rounded-2xl border p-6 text-center'>
                    <AlertTriangle className='text-destructive mx-auto mb-4 h-8 w-8' />
                    <h3 className='text-destructive mb-2 text-lg font-bold'>
                        {t('admin.node.view.diagnostics.generate_failed')}
                    </h3>
                    <p className='text-muted-foreground text-sm'>{error}</p>
                </div>
            )}
        </div>
    );
}
