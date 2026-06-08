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

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import axios from 'axios';
import { usePersistedListFilters } from '@/hooks/usePersistedListFilters';
import {
    Users as UsersIcon,
    Shield,
    KeyRound,
    Search,
    Eye,
    Trash2,
    AlertCircle,
    UserPlus,
    CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { ResourceCard, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { ListPagination } from '@/components/featherui/ListPagination';
import { PageCard } from '@/components/featherui/PageCard';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { Select } from '@/components/ui/select-native';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { toast } from 'sonner';
import { formatDateTimeInTz, formatRelativeTime } from '@/lib/dateUtils';
import { getRoleBadgeStyles } from '@/components/RoleBadge';
import { getRoleBadgeLabel } from '@/lib/role-utils';

interface UserRole {
    name: string;
    display_name: string;
    custom_badge?: string | null;
    color: string;
}

interface ApiUser {
    id: number;
    uuid: string;
    avatar: string;
    username: string;
    email: string;
    email_verified?: boolean;
    role?: UserRole;
    banned?: string;
    two_fa_enabled?: string;
    last_seen?: string;
    first_seen?: string;
    created_at?: string;
    discord_oauth2_id?: string | null;
    discord_oauth2_linked?: string;
    discord_oauth2_username?: string | null;
    discord_oauth2_name?: string | null;
    last_ip?: string | null;
    oidc_provider?: string | null;
    oidc_subject?: string | null;
    ldap_provider_uuid?: string | null;
    ldap_dn?: string | null;
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
    custom_badge?: string | null;
    color: string;
}

const USERS_LIST_FILTERS_KEY = 'featherpanel_admin_users_filters_v2';

const USERS_LIST_FILTERS_DEFAULTS = {
    searchQuery: '',
    roleFilter: '',
    bannedFilter: '',
    ipFilter: '',
    emailVerifiedFilter: '' as '' | 'true' | 'false',
    sortBy: 'created_at' as 'id' | 'username' | 'email' | 'last_seen' | 'created_at',
    sortOrder: 'DESC' as 'ASC' | 'DESC',
    page: 1,
    pageSize: 15,
};

type UsersListFilters = typeof USERS_LIST_FILTERS_DEFAULTS;

function filtersToQueryString(filters: UsersListFilters): string {
    const params = new URLSearchParams();

    if (filters.searchQuery) {
        params.set('q', filters.searchQuery);
    }
    if (filters.page > 1) {
        params.set('page', String(filters.page));
    }
    if (filters.roleFilter) {
        params.set('role', filters.roleFilter);
    }
    if (filters.bannedFilter) {
        params.set('banned', filters.bannedFilter);
    }
    if (filters.ipFilter) {
        params.set('ip', filters.ipFilter);
    }
    if (filters.emailVerifiedFilter) {
        params.set('email_verified', filters.emailVerifiedFilter);
    }
    if (filters.sortBy !== USERS_LIST_FILTERS_DEFAULTS.sortBy) {
        params.set('sort_by', filters.sortBy);
    }
    if (filters.sortOrder !== USERS_LIST_FILTERS_DEFAULTS.sortOrder) {
        params.set('sort_order', filters.sortOrder);
    }

    return params.toString();
}

function filtersFromSearchParams(searchParams: URLSearchParams): Partial<UsersListFilters> {
    const partial: Partial<UsersListFilters> = {};

    const q = searchParams.get('q');
    if (q !== null) {
        partial.searchQuery = q;
    }

    const page = searchParams.get('page');
    if (page !== null) {
        const parsedPage = Number.parseInt(page, 10);
        if (!Number.isNaN(parsedPage) && parsedPage > 0) {
            partial.page = parsedPage;
        }
    }

    const role = searchParams.get('role');
    if (role !== null) {
        partial.roleFilter = role;
    }

    const banned = searchParams.get('banned');
    if (banned !== null) {
        partial.bannedFilter = banned;
    }

    const ip = searchParams.get('ip');
    if (ip !== null) {
        partial.ipFilter = ip;
    }

    const emailVerified = searchParams.get('email_verified');
    if (emailVerified === 'true' || emailVerified === 'false') {
        partial.emailVerifiedFilter = emailVerified;
    }

    const sortBy = searchParams.get('sort_by');
    if (
        sortBy === 'id' ||
        sortBy === 'username' ||
        sortBy === 'email' ||
        sortBy === 'last_seen' ||
        sortBy === 'created_at'
    ) {
        partial.sortBy = sortBy;
    }

    const sortOrder = searchParams.get('sort_order');
    if (sortOrder === 'ASC' || sortOrder === 'DESC') {
        partial.sortOrder = sortOrder;
    }

    return partial;
}

export default function UsersPage() {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const skipUrlSyncRef = useRef(false);

    const [users, setUsers] = useState<ApiUser[]>([]);
    const [loading, setLoading] = useState(true);
    const { filters, patchFilters, resetFilters, setFilters, hydrated } = usePersistedListFilters(
        USERS_LIST_FILTERS_KEY,
        USERS_LIST_FILTERS_DEFAULTS,
    );
    const { searchQuery, roleFilter, bannedFilter, ipFilter, emailVerifiedFilter, sortBy, sortOrder, page, pageSize } =
        filters;
    const [pagination, setPagination] = useState<Omit<Pagination, 'page' | 'pageSize'>>({
        total: 0,
        from: 0,
        to: 0,
        totalPages: 1,
    });

    const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);

    const [refreshKey, setRefreshKey] = useState(0);
    const [clearingAllDevices, setClearingAllDevices] = useState(false);

    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [debouncedIpFilter, setDebouncedIpFilter] = useState('');

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-users');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        if (!hydrated) {
            return;
        }

        if (skipUrlSyncRef.current) {
            skipUrlSyncRef.current = false;
            return;
        }

        const fromUrl = filtersFromSearchParams(searchParams);
        if (Object.keys(fromUrl).length === 0) {
            return;
        }

        setFilters((prev) => ({ ...prev, ...fromUrl }));
    }, [hydrated, searchParams, setFilters]);

    useEffect(() => {
        if (!hydrated) {
            return;
        }

        const nextQuery = filtersToQueryString(filters);
        const currentQuery = searchParams.toString();
        if (nextQuery === currentQuery) {
            return;
        }

        skipUrlSyncRef.current = true;
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }, [filters, hydrated, pathname, router, searchParams]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== debouncedSearchQuery) {
                patchFilters({ page: 1 });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [debouncedSearchQuery, patchFilters, searchQuery]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedIpFilter(ipFilter);
            if (ipFilter !== debouncedIpFilter) {
                patchFilters({ page: 1 });
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [debouncedIpFilter, ipFilter, patchFilters]);

    useEffect(() => {
        if (!hydrated) {
            return;
        }

        const controller = new AbortController();
        const fetchUsers = async () => {
            setLoading(true);
            try {
                const { data } = await axios.get('/api/admin/users', {
                    params: {
                        page,
                        limit: pageSize,
                        search: debouncedSearchQuery || undefined,
                        role: roleFilter || undefined,
                        banned: bannedFilter || undefined,
                        ip: debouncedIpFilter || undefined,
                        email_verified: emailVerifiedFilter || undefined,
                        sort_by: sortBy,
                        sort_order: sortOrder,
                    },
                    signal: controller.signal,
                });

                if (data?.success) {
                    setUsers(data.data.users || []);
                    setAvailableRoles(data.data.roles || []);
                    const apiPagination = data.data.pagination;
                    setPagination({
                        total: apiPagination.total_records,
                        totalPages: Math.ceil(apiPagination.total_records / apiPagination.per_page),
                        from: apiPagination.from ?? 0,
                        to: apiPagination.to ?? 0,
                    });
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
    }, [
        page,
        pageSize,
        debouncedSearchQuery,
        debouncedIpFilter,
        roleFilter,
        refreshKey,
        t,
        bannedFilter,
        emailVerifiedFilter,
        sortBy,
        sortOrder,
        hydrated,
    ]);

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

    const handleForceVerifyEmail = async (user: ApiUser) => {
        if (!confirm(t('admin.users.messages.force_verify_email_confirm', { username: user.username }))) {
            return;
        }

        try {
            const { data } = await axios.post(`/api/admin/users/${user.uuid}/verify-email`);
            if (data?.success) {
                toast.success(t('admin.users.messages.force_verify_email_success'));
                setRefreshKey((prev) => prev + 1);
            } else {
                toast.error(data?.message || t('admin.users.messages.force_verify_email_failed'));
            }
        } catch (error: unknown) {
            const errorMessage =
                (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                t('admin.users.messages.force_verify_email_failed');
            toast.error(errorMessage);
        }
    };

    const handleClearAllDevices = async () => {
        if (!confirm(t('admin.users.clear_all_devices_confirm'))) {
            return;
        }

        setClearingAllDevices(true);
        try {
            const { data } = await axios.delete('/api/admin/devices');
            if (data?.success) {
                toast.success(t('admin.users.clear_all_devices_success'));
            } else {
                toast.error(data?.message || t('admin.users.clear_all_devices_failed'));
            }
        } catch {
            toast.error(t('admin.users.clear_all_devices_failed'));
        } finally {
            setClearingAllDevices(false);
        }
    };

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-users', 'top-of-page')} />

            <PageHeader
                title={t('admin.users.title')}
                description={t('admin.users.subtitle')}
                icon={UsersIcon}
                actions={
                    <div className='flex flex-wrap gap-2'>
                        <Button variant='outline' onClick={handleClearAllDevices} loading={clearingAllDevices}>
                            <Trash2 className='mr-2 h-4 w-4' />
                            {t('admin.users.clear_all_devices')}
                        </Button>
                        <Button onClick={() => router.push('/admin/users/create')}>
                            <UserPlus className='mr-2 h-4 w-4' />
                            {t('admin.users.create.title')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-users', 'after-header')} />

            <div className='bg-card/50 border-border flex flex-col items-center gap-4 rounded-2xl border p-4 shadow-sm backdrop-blur-md sm:flex-row'>
                <div className='group relative flex-1'>
                    <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                    <Input
                        placeholder={t('admin.users.search_placeholder')}
                        className='h-11 pl-10'
                        value={searchQuery}
                        onChange={(e) => patchFilters({ searchQuery: e.target.value })}
                    />
                </div>
                <div className='flex w-full items-center gap-2 overflow-x-auto pb-2 sm:w-auto sm:pb-0'>
                    <Input
                        placeholder={t('admin.users.filters.ip_placeholder')}
                        className='h-11 w-[160px] rounded-xl'
                        value={ipFilter}
                        onChange={(e) => patchFilters({ ipFilter: e.target.value })}
                    />
                    {availableRoles.length > 0 && (
                        <Select
                            value={roleFilter}
                            onChange={(e) => {
                                patchFilters({ roleFilter: e.target.value, page: 1 });
                            }}
                            className='h-11 w-[160px] rounded-xl'
                        >
                            <option value=''>{t('admin.users.filters.all_roles')}</option>
                            {availableRoles.map((role) => (
                                <option key={role.id} value={role.id}>
                                    {role.display_name}
                                </option>
                            ))}
                        </Select>
                    )}
                    <Select
                        value={bannedFilter}
                        onChange={(e) => {
                            patchFilters({ bannedFilter: e.target.value, page: 1 });
                        }}
                        className='h-11 w-[160px] rounded-xl'
                    >
                        <option value=''>{t('admin.users.filters.any_status')}</option>
                        <option value='false'>{t('admin.users.filters.status_active')}</option>
                        <option value='true'>{t('admin.users.filters.status_banned')}</option>
                    </Select>
                    <Select
                        value={emailVerifiedFilter}
                        onChange={(e) => {
                            patchFilters({
                                emailVerifiedFilter: e.target.value as '' | 'true' | 'false',
                                page: 1,
                            });
                        }}
                        className='h-11 w-[180px] rounded-xl'
                    >
                        <option value=''>{t('admin.users.filters.any_email_status')}</option>
                        <option value='true'>{t('admin.users.filters.email_verified')}</option>
                        <option value='false'>{t('admin.users.filters.email_unverified')}</option>
                    </Select>
                    <Select
                        value={`${sortBy}-${sortOrder}`}
                        onChange={(e) => {
                            const [field, order] = e.target.value.split('-') as [
                                'id' | 'username' | 'email' | 'last_seen' | 'created_at',
                                'ASC' | 'DESC',
                            ];
                            patchFilters({ sortBy: field, sortOrder: order, page: 1 });
                        }}
                        className='h-11 w-[200px] rounded-xl'
                    >
                        <option value='created_at-DESC'>{t('admin.users.sort.created_desc')}</option>
                        <option value='created_at-ASC'>{t('admin.users.sort.created_asc')}</option>
                        <option value='last_seen-DESC'>{t('admin.users.sort.last_active_desc')}</option>
                        <option value='last_seen-ASC'>{t('admin.users.sort.last_active_asc')}</option>
                        <option value='id-DESC'>{t('admin.users.sort.newest')}</option>
                        <option value='id-ASC'>{t('admin.users.sort.oldest')}</option>
                        <option value='username-ASC'>{t('admin.users.sort.username_asc')}</option>
                        <option value='username-DESC'>{t('admin.users.sort.username_desc')}</option>
                        <option value='email-ASC'>{t('admin.users.sort.email_asc')}</option>
                        <option value='email-DESC'>{t('admin.users.sort.email_desc')}</option>
                    </Select>
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-users', 'before-list')} />

            {pagination.totalPages > 1 && (
                <ListPagination
                    page={page}
                    totalPages={pagination.totalPages}
                    disabled={loading}
                    onPageChange={(nextPage) => patchFilters({ page: nextPage })}
                />
            )}

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
                                resetFilters();
                            }}
                        >
                            {t('admin.users.clear_filters')}
                        </Button>
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-6'>
                    {users.map((user) => {
                        const userEditHref = `/admin/users/${user.uuid}/edit`;
                        const avatarSrc =
                            user.avatar &&
                            typeof user.avatar === 'string' &&
                            (user.avatar.startsWith('http') || user.avatar.startsWith('/'))
                                ? user.avatar
                                : undefined;
                        const IconComponent = ({ className }: { className?: string }) => (
                            <Avatar className={className}>
                                {avatarSrc && <AvatarImage src={avatarSrc} alt={user.username} />}
                            </Avatar>
                        );

                        const badges: ResourceBadge[] = [];

                        if (user.role) {
                            badges.push({
                                label: getRoleBadgeLabel(user.role),
                                className: 'border-transparent text-white',
                                style: getRoleBadgeStyles(user.role, 'solid'),
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

                        const isEmailUnverified = user.email_verified === false;
                        if (isEmailUnverified) {
                            badges.push({
                                label: t('admin.users.badges.email_unverified'),
                                className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
                            });
                        }

                        if (user.discord_oauth2_linked === 'true') {
                            badges.push({
                                label: t('admin.users.badges.discord_linked'),
                                className: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
                            });
                        }

                        if (user.ldap_provider_uuid && user.ldap_dn) {
                            badges.push({
                                label: t('admin.users.badges.ldap'),
                                className: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
                            });
                        } else if (user.oidc_provider && user.oidc_subject) {
                            badges.push({
                                label: t('admin.users.badges.oidc'),
                                className: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
                            });
                        } else {
                            badges.push({
                                label: t('admin.users.badges.local'),
                                className: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
                            });
                        }

                        return (
                            <ResourceCard
                                key={user.uuid}
                                href={userEditHref}
                                icon={IconComponent}
                                title={user.username}
                                subtitle={user.email}
                                badges={badges}
                                description={
                                    <div className='flex flex-col gap-1'>
                                        <div className='text-muted-foreground flex flex-wrap items-center gap-4 text-xs font-medium'>
                                            {user.last_seen && (
                                                <div className='flex items-center gap-1.5'>
                                                    <span className='font-semibold'>{t('admin.users.last_seen')}:</span>
                                                    <span title={formatDateTimeInTz(user.last_seen, dateOpts)}>
                                                        {formatRelativeTime(user.last_seen, dateOpts)}
                                                    </span>
                                                </div>
                                            )}
                                            {(user.created_at || user.first_seen) && (
                                                <div className='flex items-center gap-1.5'>
                                                    <span className='font-semibold'>{t('admin.users.created')}:</span>
                                                    <span
                                                        title={formatDateTimeInTz(
                                                            user.created_at || user.first_seen || '',
                                                            dateOpts,
                                                        )}
                                                    >
                                                        {formatRelativeTime(
                                                            user.created_at || user.first_seen || '',
                                                            dateOpts,
                                                        )}
                                                    </span>
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
                                            <div className='text-muted-foreground flex items-center gap-1.5 pt-1 text-xs'>
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
                                        <Button asChild variant='outline' size='sm'>
                                            <Link href={userEditHref} onClick={(e) => e.stopPropagation()}>
                                                <Eye className='h-4 w-4' />
                                            </Link>
                                        </Button>
                                        {isEmailUnverified && (
                                            <Button
                                                variant='outline'
                                                size='sm'
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleForceVerifyEmail(user);
                                                }}
                                                title={t('admin.users.actions.force_verify_email')}
                                            >
                                                <CheckCircle2 className='h-4 w-4' />
                                            </Button>
                                        )}
                                        <Button
                                            variant='destructive'
                                            size='sm'
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDeleteUser(user);
                                            }}
                                        >
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    </div>
                                }
                            />
                        );
                    })}
                </div>
            )}

            {pagination.totalPages > 1 && (
                <div className='mt-6 flex justify-center'>
                    <ListPagination
                        page={page}
                        totalPages={pagination.totalPages}
                        disabled={loading}
                        onPageChange={(nextPage) => patchFilters({ page: nextPage })}
                        className='w-full max-w-xl'
                    />
                </div>
            )}

            <div className='grid grid-cols-1 gap-6 pt-10 md:grid-cols-2 lg:grid-cols-3'>
                <PageCard title={t('admin.users.help.managing.title')} icon={UsersIcon}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.users.help.managing.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.users.help.roles.title')} icon={Shield}>
                    <p className='text-muted-foreground text-sm leading-relaxed'>
                        {t('admin.users.help.roles.description')}
                    </p>
                </PageCard>
                <PageCard title={t('admin.users.help.security.title')} icon={KeyRound} variant='danger'>
                    <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm'>
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
