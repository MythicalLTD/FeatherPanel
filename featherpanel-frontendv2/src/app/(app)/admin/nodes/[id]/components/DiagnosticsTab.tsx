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
                    {/* Format Selection */}
                    <div className='space-y-3'>
                        <Label className='text-sm font-semibold'>{t('admin.node.view.diagnostics.format_label')}</Label>
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                            <button
                                type='button'
                                className={`relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
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
                                    {options.format === 'text' && <div className='h-3 w-3 rounded-full bg-primary' />}
                                </div>
                                <div className='text-left'>
                                    <p className='text-sm font-bold'>{t('admin.node.view.diagnostics.raw_text')}</p>
                                    <p className='text-xs text-muted-foreground'>
                                        {t('admin.node.view.diagnostics.raw_text_help')}
                                    </p>
                                </div>
                            </button>
                            <button
                                type='button'
                                className={`relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
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
                                    {options.format === 'url' && <div className='h-3 w-3 rounded-full bg-primary' />}
                                </div>
                                <div className='text-left'>
                                    <p className='text-sm font-bold'>{t('admin.node.view.diagnostics.upload_url')}</p>
                                    <p className='text-xs text-muted-foreground'>
                                        {t('admin.node.view.diagnostics.upload_url_help')}
                                    </p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Options */}
                    <div className='space-y-4'>
                        <div className='flex items-center gap-2 mb-2'>
                            <Settings2 className='h-4 w-4 text-primary' />
                            <Label className='text-sm font-semibold'>
                                {t('admin.node.view.diagnostics.options_label')}
                            </Label>
                        </div>

                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                            <div
                                className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
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
                                    <p className='text-xs text-muted-foreground'>
                                        {t('admin.node.view.diagnostics.include_endpoints_help')}
                                    </p>
                                </div>
                            </div>

                            <div
                                className={`flex items-start gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
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
                                    <p className='text-xs text-muted-foreground'>
                                        {t('admin.node.view.diagnostics.include_logs_help')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {options.includeLogs && (
                            <div className='p-6 rounded-2xl bg-muted/30 border border-border/50 space-y-4 animate-in fade-in slide-in-from-top-1'>
                                <div>
                                    <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block'>
                                        {t('admin.node.view.diagnostics.log_lines')}
                                    </Label>
                                    <Input
                                        type='number'
                                        min={1}
                                        max={500}
                                        value={options.logLines}
                                        onChange={(e) => setOptions({ ...options, logLines: parseInt(e.target.value) })}
                                        className='max-w-[200px] h-10'
                                    />
                                    <p className='text-[10px] text-muted-foreground mt-1.5 italic'>
                                        {t('admin.node.view.diagnostics.log_lines_help')}
                                    </p>
                                </div>
                            </div>
                        )}

                        {options.format === 'url' && (
                            <div className='p-6 rounded-2xl bg-muted/30 border border-border/50 space-y-4 animate-in fade-in slide-in-from-top-1'>
                                <div>
                                    <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block'>
                                        {t('admin.node.view.diagnostics.custom_url')}
                                    </Label>
                                    <Input
                                        type='url'
                                        value={options.uploadApiUrl}
                                        onChange={(e) => setOptions({ ...options, uploadApiUrl: e.target.value })}
                                        placeholder='https://paste.mythical.systems'
                                        className='h-10 font-mono text-sm'
                                    />
                                    <p className='text-[10px] text-muted-foreground mt-1.5 italic'>
                                        {t('admin.node.view.diagnostics.custom_url_help')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className='pt-6 border-t border-border/50'>
                        <Button className='w-full h-12 text-sm font-bold' loading={loading} onClick={handleGenerate}>
                            {!loading && <FileText className='h-4 w-4 mr-2' />}
                            {t('admin.node.view.diagnostics.generate')}
                        </Button>
                    </div>
                </div>
            </PageCard>

            {/* Results */}
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
                                <div className='p-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center gap-3'>
                                    <CheckCircle2 className='h-5 w-5 text-green-500' />
                                    <p className='text-sm font-bold text-green-500'>
                                        {t('admin.node.view.diagnostics.upload_success')}
                                    </p>
                                </div>
                                <div className='flex gap-2'>
                                    <Input value={result.url} readOnly className='font-mono h-11 text-xs' />
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
                                <div className='flex justify-between items-center'>
                                    <Label className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>
                                        {t('admin.node.view.diagnostics.raw_data')}
                                    </Label>
                                    <Button variant='ghost' size='sm' onClick={() => copyToClipboard(result.content!)}>
                                        <Clipboard className='h-4 w-4 mr-2' />
                                        {t('common.copy')}
                                    </Button>
                                </div>
                                <pre className='p-6 rounded-2xl bg-muted/30 border border-border/50 font-mono text-[11px] overflow-auto max-h-[500px] leading-relaxed whitespace-pre-wrap'>
                                    {result.content}
                                </pre>
                            </div>
                        ) : null}
                    </div>
                </PageCard>
            )}

            {/* Error State */}
            {error && (
                <div className='p-6 rounded-2xl bg-destructive/10 border border-destructive/20 text-center animate-in fade-in zoom-in-95'>
                    <AlertTriangle className='h-8 w-8 text-destructive mx-auto mb-4' />
                    <h3 className='text-lg font-bold text-destructive mb-2'>
                        {t('admin.node.view.diagnostics.generate_failed')}
                    </h3>
                    <p className='text-sm text-muted-foreground'>{error}</p>
                </div>
            )}
        </div>
    );
}
