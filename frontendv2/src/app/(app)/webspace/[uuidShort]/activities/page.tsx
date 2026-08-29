/*
This file is part of FeatherPanel.
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

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { Activity, Loader2, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageHeader } from '@/components/featherui/PageHeader';
import { EmptyState } from '@/components/featherui/EmptyState';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';

interface ActivityItem {
    id: number;
    event: string;
    metadata?: Record<string, unknown> | null;
    ip?: string | null;
    timestamp?: string;
    user?: { username: string; avatar?: string | null; role?: string | null } | null;
}

function formatEvent(event: string) {
    return event
        .replace(/_/g, ' ')
        .replace(/\./g, ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

export default function WebSpaceActivitiesPage() {
    const params = useParams();
    const uuidShort = String(params.uuidShort || '');
    const { t } = useTranslation();
    const [items, setItems] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/user/webspaces/${uuidShort}/activities`, {
                params: { page, per_page: 25, search: search || undefined },
            });
            const body = data.data || data;
            setItems(body.activities || []);
            setPagination(body.pagination || { current_page: page, last_page: 1, total: 0 });
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [uuidShort, page, search]);

    useEffect(() => {
        void load();
    }, [load]);

    return (
        <WebSpacePageWidgets pageId='webspace-activities'>
            <div className='space-y-6'>
                <PageHeader
                    title={t('webSpaces.activities.title')}
                    description={t('webSpaces.activities.description')}
                    actions={
                        <Button variant='outline' size='sm' onClick={() => void load()} disabled={loading}>
                            <RefreshCw className={loading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
                            {t('common.refresh')}
                        </Button>
                    }
                />

                <div className='flex max-w-md gap-2'>
                    <Input
                        placeholder={t('webSpaces.activities.searchPlaceholder')}
                        value={search}
                        onChange={(e) => {
                            setPage(1);
                            setSearch(e.target.value);
                        }}
                    />
                    <Button variant='secondary' onClick={() => void load()}>
                        <Search className='h-4 w-4' />
                    </Button>
                </div>

                {loading ? (
                    <div className='text-muted-foreground flex items-center gap-2 py-12'>
                        <Loader2 className='h-5 w-5 animate-spin' />
                        {t('webSpaces.activities.loading')}
                    </div>
                ) : items.length === 0 ? (
                    <EmptyState
                        icon={Activity}
                        title={t('webSpaces.activities.empty')}
                        description={t('webSpaces.activities.emptyHelp')}
                    />
                ) : (
                    <div className='space-y-2'>
                        {items.map((item) => (
                            <ResourceCard
                                key={item.id}
                                icon={Activity}
                                title={formatEvent(item.event)}
                                subtitle={
                                    item.user?.username
                                        ? `${item.user.username} · ${item.timestamp ?? ''}`
                                        : (item.timestamp ?? t('webSpaces.activities.system'))
                                }
                                description={
                                    item.metadata && Object.keys(item.metadata).length > 0
                                        ? JSON.stringify(item.metadata)
                                        : undefined
                                }
                            />
                        ))}
                    </div>
                )}

                {pagination.last_page > 1 && (
                    <div className='flex items-center justify-between'>
                        <Button variant='outline' disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                            {t('common.previous')}
                        </Button>
                        <span className='text-muted-foreground text-sm'>
                            {t('webSpaces.activities.pageOf', {
                                page: String(pagination.current_page),
                                total: String(pagination.last_page),
                            })}
                        </span>
                        <Button
                            variant='outline'
                            disabled={page >= pagination.last_page}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            {t('common.next')}
                        </Button>
                    </div>
                )}
            </div>
        </WebSpacePageWidgets>
    );
}
