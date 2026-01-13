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

import React, { useEffect, useState, useCallback } from 'react';
import { Editor } from '@monaco-editor/react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useTheme } from '@/contexts/ThemeContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings2, Save, RotateCw, AlertTriangle, Loader2 } from 'lucide-react';
import { NodeData } from '../types';
import axios from 'axios';
import { toast } from 'sonner';

interface WingsConfigTabProps {
    node: NodeData;
}

export function WingsConfigTab({ node }: WingsConfigTabProps) {
    const { t } = useTranslation();
    const { theme } = useTheme();
    const [content, setContent] = useState<string>('');
    const [originalContent, setOriginalContent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [restart, setRestart] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchConfig = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get(`/api/admin/nodes/${node.id}/wings/config`);
            if (data.success) {
                const config = data.data.config || '';
                setContent(config);
                setOriginalContent(config);
            } else {
                setError(data.message || 'Failed to load Wings configuration');
            }
        } catch (err: unknown) {
            let msg = 'Failed to load Wings configuration';
            if (axios.isAxiosError(err)) {
                msg = err.response?.data?.message || err.message;
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [node.id]);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data } = await axios.put(`/api/admin/nodes/${node.id}/wings/config`, {
                config: content,
                restart: restart,
            });

            if (data.success) {
                setOriginalContent(content);
                toast.success(t('admin.node.view.config.save_success'));
                if (restart) {
                    toast.info(t('admin.node.view.config.restart_notice'));
                }
            } else {
                toast.error(data.message || 'Failed to save configuration');
            }
        } catch (err: unknown) {
            let msg = 'Failed to save configuration';
            if (axios.isAxiosError(err)) {
                msg = err.response?.data?.message || err.message;
            }
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const isDirty = content !== originalContent;

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.node.view.config.title')}
                description={t('admin.node.view.config.description')}
                icon={Settings2}
                action={
                    <div className='flex items-center gap-3'>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={fetchConfig}
                            disabled={loading || saving}
                            className='h-10 rounded-xl'
                        >
                            <RotateCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            {t('common.reload')}
                        </Button>
                        <Button
                            size='sm'
                            onClick={handleSave}
                            disabled={loading || saving || !isDirty}
                            className='h-10 rounded-xl'
                        >
                            {saving ? (
                                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                            ) : (
                                <Save className='h-4 w-4 mr-2' />
                            )}
                            {t('common.save')}
                        </Button>
                    </div>
                }
            >
                <div className='space-y-6'>
                    {error ? (
                        <div className='rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center'>
                            <AlertTriangle className='h-8 w-8 text-destructive mx-auto mb-3' />
                            <h3 className='text-sm font-bold text-destructive mb-1'>Failed to Load Configuration</h3>
                            <p className='text-xs text-destructive/80 mb-4'>{error}</p>
                            <Button variant='outline' size='sm' onClick={fetchConfig} className='rounded-xl'>
                                Try Again
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div className='rounded-2xl border border-border/50 bg-card overflow-hidden h-[500px] shadow-xl relative'>
                                {loading && (
                                    <div className='absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center'>
                                        <Loader2 className='h-8 w-8 text-primary animate-spin' />
                                    </div>
                                )}
                                <Editor
                                    height='100%'
                                    defaultLanguage='yaml'
                                    value={content}
                                    theme={theme === 'dark' ? 'vs-dark' : 'light'}
                                    onChange={(value) => setContent(value || '')}
                                    options={{
                                        minimap: { enabled: true },
                                        fontSize: 14,
                                        lineNumbers: 'on',
                                        scrollBeyondLastLine: false,
                                        automaticLayout: true,
                                        padding: { top: 20 },
                                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                        fontLigatures: true,
                                    }}
                                />
                            </div>

                            <div className='rounded-2xl border border-border/50 bg-muted/30 p-4'>
                                <div className='flex items-center space-x-3'>
                                    <Checkbox
                                        id='restart-wings'
                                        checked={restart}
                                        onCheckedChange={(checked) => setRestart(!!checked)}
                                        className='h-5 w-5 rounded-lg border-2'
                                    />
                                    <div className='grid gap-1.5 leading-none'>
                                        <label
                                            htmlFor='restart-wings'
                                            className='text-sm font-bold cursor-pointer select-none leading-none'
                                        >
                                            {t('admin.node.view.config.restart_checkbox')}
                                        </label>
                                        <p className='text-xs text-muted-foreground'>
                                            {t('admin.node.view.config.restart_help')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </PageCard>

            <div className='rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4'>
                <div className='flex items-start gap-4'>
                    <div className='p-2 rounded-xl bg-blue-500/10'>
                        <Settings2 className='h-5 w-5 text-blue-500' />
                    </div>
                    <div className='flex-1'>
                        <div className='text-sm font-bold text-blue-600 dark:text-blue-500 mb-1'>
                            {t('admin.node.view.config.info_title')}
                        </div>
                        <p className='text-xs text-blue-600/80 dark:text-blue-400/70 leading-relaxed'>
                            {t('admin.node.view.config.info_description')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
