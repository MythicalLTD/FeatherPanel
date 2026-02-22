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

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { ResourceCard, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { StatusBadge } from '@/components/servers/StatusBadge';
import { displayStatus } from '@/lib/server-utils';
import type { Server as ServerType } from '@/types/server';
import {
    Server as ServerIcon,
    ArrowLeft,
    Search,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Eye,
    Pencil,
    Database,
    Cpu,
    HardDrive,
    Network,
} from 'lucide-react';

interface UserServersPagination {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
    from: number;
    to: number;
}

interface UserServer {
    id: number;
    name: string;
    description?: string;
    status: string;
    uuid: string;
    uuidShort: string;
    memory: number;
    disk: number;
    cpu: number;
    swap: number;
    node?: { id: number; name: string; fqdn?: string; maintenance_mode: boolean } | null;
    realm?: { id: number; name: string } | null;
    spell?: { id: number; name: string } | null;
    allocation?: { id: number; ip: string; port: number; ip_alias?: string } | null;
    created_at?: string;
    updated_at?: string;
}

function formatMemory(mb: number): string {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GiB`;
    return `${mb} MiB`;
}

function formatDisk(mb: number): string {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GiB`;
    return `${mb} MiB`;
}

function formatCpu(percent: number): string {
    return `${percent}%`;
}

export default function UserServersPage({ params }: { params: Promise<{ uuid: string }> }) {
    const { t } = useTranslation();
    const router = useRouter();
    const resolvedParams = use(params);
    const uuid = resolvedParams.uuid;

    const [user, setUser] = useState<{ username: string; uuid: string } | null>(null);
    const [servers, setServers] = useState<UserServer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [pagination, setPagination] = useState<UserServersPagination>({
        current_page: 1,
        per_page: 25,
        total_records: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false,
        from: 0,
        to: 0,
    });

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const fetchUser = useCallback(async () => {
        try {
            const { data } = await axios.get<{
                success: boolean;
                data?: { user?: { username: string; uuid: string } };
            }>(`/api/admin/users/${uuid}`);
            if (data.success && data.data?.user) {
                setUser(data.data.user);
            }
        } catch {
            setUser(null);
        }
    }, [uuid]);

    const fetchServers = useCallback(
        async (page: number) => {
            try {
                setLoading(true);
                const { data } = await axios.get<{
                    success: boolean;
                    data?: {
                        servers: UserServer[];
                        pagination: UserServersPagination;
                    };
                }>(`/api/admin/users/${uuid}/servers`, {
                    params: { page, limit: 25, search: debouncedSearch },
                });
                if (data.success && data.data) {
                    setServers(data.data.servers ?? []);
                    if (data.data.pagination) setPagination(data.data.pagination);
                }
            } catch {
                setServers([]);
            } finally {
                setLoading(false);
            }
        },
        [uuid, debouncedSearch],
    );

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    useEffect(() => {
        setPagination((p) => ({ ...p, current_page: 1 }));
    }, [debouncedSearch]);

    useEffect(() => {
        fetchServers(pagination.current_page);
    }, [uuid, debouncedSearch, pagination.current_page, fetchServers]);

    const changePage = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.total_pages) {
            setPagination((p) => ({ ...p, current_page: newPage }));
        }
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.users.servers.title', { defaultValue: 'User Servers' })}
                description={
                    user
                        ? t('admin.users.servers.description', {
                              defaultValue: 'Servers owned by {{username}}',
                              username: user.username,
                          })
                        : t('admin.users.servers.descriptionGeneric', { defaultValue: 'Servers owned by this user' })
                }
                actions={
                    <Button variant='outline' size='sm' onClick={() => router.push(`/admin/users/${uuid}/edit`)}>
                        <ArrowLeft className='h-4 w-4 mr-2' />
                        {t('admin.users.servers.backToUser', { defaultValue: 'Back to user' })}
                    </Button>
                }
            />

            <div className='flex flex-col sm:flex-row gap-4'>
                <div className='relative flex-1'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                    <Input
                        placeholder={t('admin.servers.search_placeholder', { defaultValue: 'Search servers...' })}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className='pl-9'
                    />
                </div>
                <Button
                    variant='outline'
                    size='icon'
                    onClick={() => fetchServers(pagination.current_page)}
                    disabled={loading}
                >
                    <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                </Button>
            </div>

            {loading ? (
                <TableSkeleton count={5} />
            ) : servers.length === 0 ? (
                <EmptyState
                    icon={ServerIcon}
                    title={t('admin.users.servers.noServers', { defaultValue: 'No servers' })}
                    description={t('admin.users.servers.noServersDescription', {
                        defaultValue: 'This user does not own any servers.',
                    })}
                />
            ) : (
                <>
                    {pagination.total_pages > 1 && (
                        <div className='flex items-center justify-between gap-4 py-3 px-4 rounded-xl border border-border bg-card/50 mb-4'>
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={!pagination.has_prev}
                                onClick={() => changePage(pagination.current_page - 1)}
                                className='gap-1.5'
                            >
                                <ChevronLeft className='h-4 w-4' />
                                {t('common.previous')}
                            </Button>
                            <span className='text-sm font-medium'>
                                {pagination.current_page} / {pagination.total_pages}
                            </span>
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={!pagination.has_next}
                                onClick={() => changePage(pagination.current_page + 1)}
                                className='gap-1.5'
                            >
                                {t('common.next')}
                                <ChevronRight className='h-4 w-4' />
                            </Button>
                        </div>
                    )}
                    <div className='grid grid-cols-1 gap-4'>
                        {servers.map((server) => {
                            const badges: ResourceBadge[] = [
                                {
                                    label: server.node?.name ?? '—',
                                    className: 'bg-primary/10 text-primary border-primary/20',
                                },
                                {
                                    label: server.spell?.name ?? '—',
                                    className: 'bg-muted text-muted-foreground border-border/50',
                                },
                            ];
                            const status = displayStatus(server as unknown as ServerType);
                            return (
                                <ResourceCard
                                    key={server.id}
                                    title={server.name}
                                    subtitle={server.uuidShort}
                                    icon={ServerIcon}
                                    badges={badges}
                                    description={
                                        <div className='flex items-center gap-4 mt-2 flex-wrap'>
                                            <StatusBadge status={status} t={t} />
                                            {server.allocation && (
                                                <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                                                    <Network className='h-3.5 w-3.5' />
                                                    <span>
                                                        {server.allocation.ip_alias || server.allocation.ip}:
                                                        {server.allocation.port}
                                                    </span>
                                                </div>
                                            )}
                                            <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                                                <Database className='h-3.5 w-3.5' />
                                                <span>{formatMemory(server.memory)}</span>
                                            </div>
                                            <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                                                <Cpu className='h-3.5 w-3.5' />
                                                <span>{formatCpu(server.cpu)}</span>
                                            </div>
                                            <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                                                <HardDrive className='h-3.5 w-3.5' />
                                                <span>{formatDisk(server.disk)}</span>
                                            </div>
                                        </div>
                                    }
                                    actions={
                                        <div className='flex items-center gap-2'>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                onClick={() => router.push(`/server/${server.uuidShort}`)}
                                                title={t('admin.servers.actions.view', { defaultValue: 'View' })}
                                            >
                                                <Eye className='h-4 w-4' />
                                            </Button>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                onClick={() => router.push(`/admin/servers/${server.id}/edit`)}
                                                title={t('admin.servers.actions.edit', { defaultValue: 'Edit' })}
                                            >
                                                <Pencil className='h-4 w-4' />
                                            </Button>
                                        </div>
                                    }
                                />
                            );
                        })}
                    </div>

                    {pagination.total_pages > 1 && (
                        <div className='flex items-center justify-between py-4 border-t border-border'>
                            <p className='text-sm text-muted-foreground'>
                                {t('servers.pagination.showing', {
                                    from: String(pagination.from),
                                    to: String(pagination.to),
                                    total: String(pagination.total_records),
                                })}
                            </p>
                            <div className='flex items-center gap-2'>
                                <Button
                                    variant='outline'
                                    size='icon'
                                    disabled={!pagination.has_prev}
                                    onClick={() => changePage(pagination.current_page - 1)}
                                >
                                    <ChevronLeft className='h-4 w-4' />
                                </Button>
                                <span className='text-sm font-medium'>
                                    {pagination.current_page} / {pagination.total_pages}
                                </span>
                                <Button
                                    variant='outline'
                                    size='icon'
                                    disabled={!pagination.has_next}
                                    onClick={() => changePage(pagination.current_page + 1)}
                                >
                                    <ChevronRight className='h-4 w-4' />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
