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

import React from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Network, Globe, Copy, RefreshCw, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/featherui/Button';
import { NetworkResponse } from '../types';
import { toast } from 'sonner';

interface NetworkTabProps {
    loading: boolean;
    data: NetworkResponse | null;
    error: string | null;
    onRefresh: () => void;
}

export function NetworkTab({ loading, data, error, onRefresh }: NetworkTabProps) {
    const { t } = useTranslation();

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success(t('common.copied_to_clipboard'));
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center py-12'>
                <RefreshCw className='h-8 w-8 animate-spin text-primary' />
            </div>
        );
    }

    if (error) {
        return (
            <PageCard title={t('admin.node.view.network.error_title')} icon={AlertTriangle}>
                <div className='p-6 bg-destructive/10 border border-destructive/20 rounded-2xl text-center space-y-4'>
                    <p className='text-destructive'>{error}</p>
                    <Button variant='outline' onClick={onRefresh}>
                        {t('common.retry')}
                    </Button>
                </div>
            </PageCard>
        );
    }

    if (!data) return null;

    const { ips } = data;

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.node.view.network.title')}
                description={t('admin.node.view.network.description')}
                icon={Network}
            >
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {ips.ip_addresses.length === 0 ? (
                        <div className='col-span-full p-12 text-center bg-muted/20 rounded-2xl border border-dashed border-border'>
                            <p className='text-muted-foreground italic'>{t('admin.node.view.network.no_ips')}</p>
                        </div>
                    ) : (
                        ips.ip_addresses.map((ip, index) => (
                            <div
                                key={index}
                                className='group p-4 rounded-2xl bg-muted/30 border border-border/50 hover:border-primary/50 transition-all flex items-center justify-between'
                            >
                                <div className='flex items-center gap-3'>
                                    <div className='p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors'>
                                        <Globe className='h-4 w-4 text-primary' />
                                    </div>
                                    <span className='font-mono text-sm'>{ip}</span>
                                </div>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='opacity-0 group-hover:opacity-100 transition-opacity'
                                    onClick={() => copyToClipboard(ip)}
                                    title={t('common.copy')}
                                >
                                    <Copy className='h-3.5 w-3.5' />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </PageCard>

            <div className='flex items-center gap-2 p-4 bg-muted/20 rounded-2xl border border-border/50'>
                <Badge variant='outline' className='bg-primary/5 text-primary border-primary/10'>
                    {t('admin.node.view.network.total_ips')}: {ips.ip_addresses.length}
                </Badge>
                <p className='text-[10px] text-muted-foreground italic leading-none'>
                    {t('admin.node.view.network.help')}
                </p>
            </div>
        </div>
    );
}
