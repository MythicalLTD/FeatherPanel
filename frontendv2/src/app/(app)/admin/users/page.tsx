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

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import axios from 'axios';
import {
    Users as UsersIcon,
    Shield,
    KeyRound,
    Search,
    Eye,
    Trash2,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    UserPlus,
} from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { ResourceCard, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select } from '@/components/ui/select-native';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { toast } from 'sonner';

interface UserRole {
    name: string;
    display_name: string;
    color: string;
}

interface ApiUser {
    id: number;
    uuid: string;
    avatar: string;
    username: string;
    email: string;
    role?: UserRole;
    banned?: string;
    two_fa_enabled?: string;
    last_seen?: string;
    created_at?: string;
    discord_oauth2_id?: string | null;
    discord_oauth2_linked?: string;
    discord_oauth2_username?: string | null;
    discord_oauth2_name?: string | null;
    last_ip?: string | null;
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    from: number;
    to: number;
    totalPages: number;
}

interface AvailableRole {
    id: string;
    name: string;
    display_name: string;
    color: string;
}

export default function UsersPage() {
    const { t } = useTranslation();
    const router = useRouter();

    const [users, setUsers] = useState<ApiUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 15,
        total: 0,
        from: 0,
        to: 0,
        totalPages: 1,
    });

    const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);

    const [refreshKey, setRefreshKey] = useState(0);

    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-users');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== debouncedSearchQuery) {
                setPagination((prev) => ({ ...prev, page: 1 }));
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [debouncedSearchQuery, searchQuery]);

    useEffect(() => {
        const controller = new AbortController();
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/admin/users', {
                    params: {
                        page: pagination.page,
                        limit: pagination.pageSize,
                        search: debouncedSearchQuery || undefined,
                        role: roleFilter || undefined,
                    },
                    signal: controller.signal,
                });

                if (data?.success) {
                    setUsers(data.data.users || []);
                    setAvailableRoles(data.data.roles || []);
                    const apiPagination = data.data.pagination;
                    setPagination((prev) => ({
                        ...prev,
                        page: apiPagination.current_page,
                        pageSize: apiPagination.per_page,
                        total: apiPagination.total_records,
                        totalPages: Math.ceil(apiPagination.total_records / apiPagination.per_page),
                        hasNext: apiPagination.has_next,
                        hasPrev: apiPagination.has_prev,
                    }));
                    if (data.data.roles) {
                        setAvailableRoles(
                            Object.entries(data.data.roles).map(([id, role]) => {
                                const r = role as { name: string; display_name: string; color: string };
                                return {
                                    id: String(id),
                                    name: r.name,
                                    display_name: r.display_name,
                                    color: r.color,
                                };
                            }),
                        );
                    }
                } else {
                    toast.error(data?.message || t('admin.users.messages.fetch_failed'));
                    setUsers([]);
                }
            } catch (error) {
                if (!axios.isCancel(error)) {
                    toast.error(t('admin.users.messages.fetch_failed'));
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        fetchUsers();

        return () => {
            controller.abort();
        };
    }, [pagination.page, pagination.pageSize, debouncedSearchQuery, roleFilter, refreshKey, t]);

    const handleDeleteUser = async (user: ApiUser) => {
        if (!confirm(t('admin.users.messages.delete_confirm', { username: user.username }))) {
            return;
        }

        try {
            const { data } = await axios.delete(`/api/admin/users/${user.uuid}`);
            if (data?.success) {
                toast.success(t('admin.users.messages.deleted'));
                setRefreshKey((prev) => prev + 1);
            } else {
                toast.error(data?.message || t('admin.users.messages.delete_failed'));
            }
        } catch (error: unknown) {
            const errorMessage =
                (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                t('admin.users.messages.delete_failed');
            toast.error(errorMessage);
        }
    };

    const renderPagination = () => {
        if (!pagination || pagination.totalPages <= 1) return null;

        return (
            <div className='flex items-center justify-center gap-2 mt-8'>
                <Button
                    variant='outline'
                    size='icon'
                    disabled={pagination.page === 1}
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                >
                    <ChevronLeft className='h-4 w-4' />
                </Button>
                <div className='flex items-center gap-2'>
                    <span className='text-sm font-medium'>
                        {pagination.page} / {pagination.totalPages}
                    </span>
                </div>
                <Button
                    variant='outline'
                    size='icon'
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                >
                    <ChevronRight className='h-4 w-4' />
                </Button>
            </div>
        );
    };

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-users', 'top-of-page')} />

            <PageHeader
                title={t('admin.users.title')}
                description={t('admin.users.subtitle')}
                icon={UsersIcon}
                actions={
                    <Button onClick={() => router.push('/admin/users/create')}>
                        <UserPlus className='h-4 w-4 mr-2' />
                        {t('admin.users.create.title')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-users', 'after-header')} />

            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/50 backdrop-blur-md p-4 rounded-2xl border border-border shadow-sm'>
                <div className='relative flex-1 group'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        placeholder={t('admin.users.search_placeholder')}
                        className='pl-10 h-11'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className='flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto'>
                    {availableRoles.length > 0 && (
                        <Select
                            value={roleFilter}
                            onChange={(e) => {
                                setRoleFilter(e.target.value);
                                setPagination({ ...pagination, page: 1 });
                            }}
                            className='w-[160px] h-11 rounded-xl bg-background/50 border-border/50'
                        >
                            <option value=''>{t('admin.users.filters.all_roles')}</option>
                            {availableRoles.map((role) => (
                                <option key={role.id} value={role.id}>
                                    {role.display_name}
                                </option>
                            ))}
                        </Select>
                    )}
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-users', 'before-list')} />

            {loading ? (
                <TableSkeleton count={5} />
            ) : users.length === 0 ? (
                <EmptyState
                    title={t('admin.users.no_results')}
                    description={t('admin.users.search_placeholder')}
                    icon={AlertCircle}
                    action={
                        <Button
                            variant='outline'
                            onClick={() => {
                                setSearchQuery('');
                                setRoleFilter('');
                                setPagination({ ...pagination, page: 1 });
                            }}
                        >
                            {t('admin.users.clear_filters')}
                        </Button>
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-6'>
                    {users.map((user) => {
                        const IconComponent = ({ className }: { className?: string }) => (
                            <Avatar className={className}>
                                <AvatarImage src={user.avatar} alt={user.username} />
                                <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
                            </Avatar>
                        );

                        const badges: ResourceBadge[] = [];

                        if (user.role) {
                            badges.push({
                                label: user.role.display_name,
                                className: `border-transparent text-white`,
                                style: { backgroundColor: user.role.color },
                            });
                        }

                        if (user.banned === 'true') {
                            badges.push({
                                label: t('admin.users.badges.banned'),
                                className: 'bg-red-500/10 text-red-600 border-red-500/20',
                            });
                        } else {
                            badges.push({
                                label: t('admin.users.badges.active'),
                                className: 'bg-green-500/10 text-green-600 border-green-500/20',
                            });
                        }

                        if (user.two_fa_enabled === 'true') {
                            badges.push({
                                label: t('admin.users.badges.2fa'),
                                className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                            });
                        }

                        if (user.discord_oauth2_linked === 'true') {
                            badges.push({
                                label: t('admin.users.badges.discord_linked'),
                                className: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
                            });
                        }

                        return (
                            <ResourceCard
                                key={user.uuid}
                                icon={IconComponent}
                                title={user.username}
                                subtitle={user.email}
                                badges={badges}
                                description={
                                    <div className='flex flex-col gap-1'>
                                        <div className='flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-medium'>
                                            {user.last_seen && (
                                                <div className='flex items-center gap-1.5'>
                                                    <span className='font-semibold'>{t('admin.users.last_seen')}:</span>
                                                    {user.last_seen}
                                                </div>
                                            )}
                                            {user.created_at && (
                                                <div className='flex items-center gap-1.5'>
                                                    <span className='font-semibold'>{t('admin.users.created')}:</span>
                                                    {user.created_at}
                                                </div>
                                            )}
                                            {user.last_ip && (
                                                <div className='flex items-center gap-1.5'>
                                                    <span className='font-semibold'>
                                                        {t('admin.users.edit.account_info.last_ip')}:
                                                    </span>
                                                    {user.last_ip}
                                                </div>
                                            )}
                                        </div>
                                        {user.discord_oauth2_username && (
                                            <div className='flex items-center gap-1.5 text-xs text-muted-foreground pt-1'>
                                                <span className='font-semibold text-indigo-500/80'>
                                                    {t('admin.users.edit.account_info.discord_user')}:
                                                </span>
                                                {user.discord_oauth2_username}
                                            </div>
                                        )}
                                    </div>
                                }
                                actions={
                                    <div className='flex items-center gap-2'>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/admin/users/${user.uuid}/edit`);
                                            }}
                                        >
                                            <Eye className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            variant='destructive'
                                            size='sm'
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteUser(user);
                                            }}
                                        >
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    </div>
                                }
                                onClick={() => router.push(`/admin/users/${user.uuid}/edit`)}
                            />
                        );
                    })}
                </div>
            )}

            {renderPagination()}

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-10'>
                <PageCard title={t('admin.users.help.managing.title')} icon={UsersIcon}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.users.help.managing.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.users.help.roles.title')} icon={Shield}>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.users.help.roles.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.users.help.security.title')} icon={KeyRound} variant='danger'>
                    <ul className='list-disc list-inside space-y-1 text-sm text-muted-foreground'>
                        <li>{t('admin.users.help.security.item1')}</li>
                        <li>{t('admin.users.help.security.item2')}</li>
                        <li>{t('admin.users.help.security.item3')}</li>
                    </ul>
                </PageCard>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-users', 'bottom-of-page')} />
        </div>
    );
}
