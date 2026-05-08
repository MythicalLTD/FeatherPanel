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
                <RefreshCw className='text-primary h-8 w-8 animate-spin' />
            </div>
        );
    }

    if (error) {
        return (
            <PageCard title={t('admin.node.view.network.error_title')} icon={AlertTriangle}>
                <div className='bg-destructive/10 border-destructive/20 space-y-4 rounded-2xl border p-6 text-center'>
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
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
                    {ips.ip_addresses.length === 0 ? (
                        <div className='bg-muted/20 border-border col-span-full rounded-2xl border border-dashed p-12 text-center'>
                            <p className='text-muted-foreground italic'>{t('admin.node.view.network.no_ips')}</p>
                        </div>
                    ) : (
                        ips.ip_addresses.map((ip, index) => (
                            <div
                                key={index}
                                className='group bg-muted/30 border-border/50 hover:border-primary/50 flex items-center justify-between rounded-2xl border p-4 transition-all'
                            >
                                <div className='flex items-center gap-3'>
                                    <div className='bg-primary/10 group-hover:bg-primary/20 rounded-xl p-2 transition-colors'>
                                        <Globe className='text-primary h-4 w-4' />
                                    </div>
                                    <span className='font-mono text-sm'>{ip}</span>
                                </div>
                                <Button
                                    variant='ghost'
                                    size='sm'
                                    className='opacity-0 transition-opacity group-hover:opacity-100'
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

            <PageCard title={t('admin.node.view.network.total_ips')} icon={Network}>
                <div className='flex items-center gap-4'>
                    <Badge variant='outline' className='bg-primary/5 text-primary border-primary/10 px-4 py-2 text-sm'>
                        {t('admin.node.view.network.total_ips')}: {ips.ip_addresses.length}
                    </Badge>
                    <p className='text-muted-foreground text-sm leading-relaxed italic'>
                        {t('admin.node.view.network.help')}
                    </p>
                </div>
            </PageCard>
        </div>
    );
}
