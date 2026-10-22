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

import { AdminPageTips } from '@/components/admin/AdminPageTips';
import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage, getApiErrorMessageFromPayload } from '@/lib/api-errors';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import axios from 'axios';
import { usePersistedListFilters } from '@/hooks/usePersistedListFilters';
import { Users as UsersIcon, Search, Pencil, Trash2, UserPlus, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { DataTable, RowActionsMenu, StatusDot, TableIdentity } from '@/components/featherui/DataTable';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { ListEmptyState } from '@/components/featherui/ListEmptyState';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { ListPagination } from '@/components/featherui/ListPagination';
import { Select } from '@/components/ui/select-native';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatDateTimeInTz, formatRelativeTime } from '@/lib/dateUtils';
import { getRoleBadgeStyles } from '@/components/RoleBadge';
import { getRoleBadgeLabel } from '@/lib/role-utils';
import { Sensitive } from '@/components/common/Sensitive';
import { useIpMask } from '@/hooks/useIpMask';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useSession } from '@/contexts/SessionContext';
import Permissions from '@/lib/permissions';

interface UserRole {
    name: string;
    display_name: string;
    custom_badge?: string | null;
    badge_icon?: string | null;
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

function userAvatar(user: ApiUser): string | undefined {
    return user.avatar &&
        typeof user.avatar === 'string' &&
        (user.avatar.startsWith('http') || user.avatar.startsWith('/'))
        ? user.avatar
        : undefined;
}

const PILL = 'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap';

function UserRoleBadge({ user }: { user: ApiUser }) {
    if (!user.role) return null;
    const icon = user.role.badge_icon?.trim();
    return (
        <span className={cn(PILL, 'border-transparent text-white')} style={getRoleBadgeStyles(user.role, 'solid')}>
            {icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={icon} alt='' className='h-3.5 w-3.5 shrink-0 rounded-sm object-cover' />
            ) : null}
            {getRoleBadgeLabel(user.role)}
        </span>
    );
}

function UserStatus({ user }: { user: ApiUser }) {
    const { t } = useTranslation();
    return (
        <div className='flex flex-wrap items-center gap-2'>
            {user.banned === 'true' ? (
                <StatusDot tone='danger'>{t('admin.users.badges.banned')}</StatusDot>
            ) : (
                <StatusDot tone='success'>{t('admin.users.badges.active')}</StatusDot>
            )}
            {user.email_verified === false ? (
                <span
                    className={cn(PILL, 'border-yellow-500/25 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400')}
                >
                    {t('admin.users.badges.email_unverified')}
                </span>
            ) : null}
        </div>
    );
}

function UserAuthBadges({ user }: { user: ApiUser }) {
    const { t } = useTranslation();
    const source =
        user.ldap_provider_uuid && user.ldap_dn
            ? t('admin.users.badges.ldap')
            : user.oidc_provider && user.oidc_subject
              ? t('admin.users.badges.oidc')
              : t('admin.users.badges.local');
    return (
        <div className='flex flex-wrap items-center gap-1.5'>
            <span className={cn(PILL, 'text-muted-foreground border-[var(--fp-surface-border)]')}>{source}</span>
            {user.two_fa_enabled === 'true' ? (
                <span className={cn(PILL, 'border-blue-500/25 bg-blue-500/10 text-blue-500')}>
                    {t('admin.users.badges.2fa')}
                </span>
            ) : null}
            {user.discord_oauth2_linked === 'true' ? (
                <span
                    className={cn(PILL, 'border-primary/25 bg-primary/10 text-primary')}
                    title={user.discord_oauth2_username ?? undefined}
                >
                    {t('admin.users.badges.discord_linked')}
                </span>
            ) : null}
        </div>
    );
}

export default function UsersPage() {
    const { t } = useTranslation();
    const privacyMask = useIpMask();
    const dateOpts = useDateFormatOptions();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const skipUrlSyncRef = useRef(false);

    const [users, setUsers] = useState<ApiUser[]>([]);
    const [loading, setLoading] = useState(true);
    const { filters, patchFilters, resetFilters, setFilters, hydrated, isFiltered } = usePersistedListFilters(
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
    const [altResetOpen, setAltResetOpen] = useState(false);
    const [resettingAlts, setResettingAlts] = useState(false);
    const { hasPermission } = useSession();
    const canManageUsers = hasPermission(Permissions.ADMIN_USERS_EDIT);

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
                    toast.error(getApiErrorMessageFromPayload(data, t, 'admin.users.messages.fetch_failed'));
                    setUsers([]);
                }
            } catch (error) {
                if (!axios.isCancel(error)) {
                    toast.error(getApiErrorMessage(error, t, 'admin.users.messages.fetch_failed'));
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
                toast.error(getApiErrorMessageFromPayload(data, t, 'admin.users.messages.delete_failed'));
            }
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, t, 'admin.users.messages.delete_failed'));
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
                toast.error(getApiErrorMessageFromPayload(data, t, 'admin.users.messages.force_verify_email_failed'));
            }
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, t, 'admin.users.messages.force_verify_email_failed'));
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
                toast.error(getApiErrorMessageFromPayload(data, t, 'admin.users.clear_all_devices_failed'));
            }
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, t, 'admin.users.clear_all_devices_failed'));
        } finally {
            setClearingAllDevices(false);
        }
    };

    const handleResetAltDetection = async () => {
        setResettingAlts(true);
        try {
            const { data } = await axios.post('/api/admin/users/alt-detection/reset');
            if (data?.success) {
                toast.success(t('admin.users.reset_alt_detection_success'));
                setAltResetOpen(false);
            } else {
                toast.error(getApiErrorMessageFromPayload(data, t, 'admin.users.reset_alt_detection_failed'));
            }
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, t, 'admin.users.reset_alt_detection_failed'));
        } finally {
            setResettingAlts(false);
        }
    };

    return (
        <div className='space-y-6'>
            <ConfirmDialog
                open={altResetOpen}
                onOpenChange={setAltResetOpen}
                title={t('admin.users.reset_alt_detection')}
                description={t('admin.users.reset_alt_detection_confirm')}
                confirmLabel={t('admin.users.reset_alt_detection_action')}
                cancelLabel={t('admin.users.reset_alt_detection_cancel')}
                onConfirm={handleResetAltDetection}
                loading={resettingAlts}
                destructive
                dangerFrame
            />
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
                        {canManageUsers && (
                            <Button variant='destructive' onClick={() => setAltResetOpen(true)}>
                                <Trash2 className='mr-2 h-4 w-4' />
                                {t('admin.users.reset_alt_detection')}
                            </Button>
                        )}
                        <Button onClick={() => router.push('/admin/users/create')}>
                            <UserPlus className='mr-2 h-4 w-4' />
                            {t('admin.users.create.title')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-users', 'after-header')} />

            <div className='fp-surface flex flex-col gap-3 rounded-2xl border p-3 sm:p-4'>
                <div className='group relative w-full min-w-0 flex-1'>
                    <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                    <Input
                        placeholder={t('admin.users.search_placeholder')}
                        className='h-11 pl-10'
                        value={searchQuery}
                        onChange={(e) => patchFilters({ searchQuery: e.target.value })}
                    />
                </div>
                <div className='grid w-full grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5'>
                    <Input
                        placeholder={t('admin.users.filters.ip_placeholder')}
                        className='h-11 w-full rounded-xl'
                        value={ipFilter}
                        onChange={(e) => patchFilters({ ipFilter: e.target.value })}
                    />
                    {availableRoles.length > 0 && (
                        <Select
                            value={roleFilter}
                            onChange={(e) => {
                                patchFilters({ roleFilter: e.target.value, page: 1 });
                            }}
                            className='h-11 w-full rounded-xl'
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
                        className='h-11 w-full rounded-xl'
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
                        className='h-11 w-full rounded-xl'
                    >
                        <option value=''>{t('admin.users.filters.any_email_status')}</option>
                        <option value='true'>{t('admin.users.filters.email_verified')}</option>
                        <option value='false'>{t('admin.users.filters.email_unverified')}</option>
                    </Select>
                    <div className='col-span-2 sm:col-span-1'>
                        <Select
                            value={`${sortBy}-${sortOrder}`}
                            onChange={(e) => {
                                const [field, order] = e.target.value.split('-') as [
                                    'id' | 'username' | 'email' | 'last_seen' | 'created_at',
                                    'ASC' | 'DESC',
                                ];
                                patchFilters({ sortBy: field, sortOrder: order, page: 1 });
                            }}
                            className='h-11 w-full rounded-xl'
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
                <ListEmptyState
                    icon={UsersIcon}
                    title={t('emptyStates.users.title')}
                    description={t('emptyStates.users.description')}
                    action={
                        <Button onClick={() => router.push('/admin/users/create')}>
                            <UserPlus className='mr-2 h-4 w-4' />
                            {t('admin.users.create.title')}
                        </Button>
                    }
                    filtered={isFiltered}
                    onClearFilters={resetFilters}
                />
            ) : (
                <DataTable
                    rows={users}
                    rowKey={(user) => user.uuid}
                    onRowClick={(user) => router.push(`/admin/users/${user.uuid}/edit`)}
                    columns={[
                        {
                            key: 'user',
                            header: t('admin.users.table.user'),
                            className: 'w-[30%]',
                            cell: (user) => (
                                <TableIdentity
                                    title={user.username}
                                    subtitle={privacyMask.text(user.email)}
                                    avatarUrl={userAvatar(user)}
                                    fallback={user.username}
                                    rounded='full'
                                />
                            ),
                        },
                        {
                            key: 'role',
                            header: t('admin.users.table.role'),
                            cell: (user) => <UserRoleBadge user={user} />,
                        },
                        {
                            key: 'status',
                            header: t('admin.users.table.status'),
                            cell: (user) => <UserStatus user={user} />,
                        },
                        {
                            key: 'auth',
                            header: t('admin.users.table.auth'),
                            cell: (user) => <UserAuthBadges user={user} />,
                        },
                        {
                            key: 'last_seen',
                            header: t('admin.users.last_seen'),
                            className: 'text-muted-foreground text-xs whitespace-nowrap',
                            cell: (user) => (
                                <div>
                                    {user.last_seen ? (
                                        <span title={formatDateTimeInTz(user.last_seen, dateOpts)}>
                                            {formatRelativeTime(user.last_seen, dateOpts)}
                                        </span>
                                    ) : (
                                        t('common.nA')
                                    )}
                                    {user.last_ip ? (
                                        <div className='font-mono text-[11px] opacity-70'>
                                            <Sensitive>{user.last_ip}</Sensitive>
                                        </div>
                                    ) : null}
                                </div>
                            ),
                        },
                        {
                            key: 'created',
                            header: t('admin.users.created'),
                            className: 'text-muted-foreground hidden text-xs whitespace-nowrap xl:table-cell',
                            cell: (user) => {
                                const created = user.created_at || user.first_seen;
                                return created ? (
                                    <span title={formatDateTimeInTz(created, dateOpts)}>
                                        {formatRelativeTime(created, dateOpts)}
                                    </span>
                                ) : (
                                    t('common.nA')
                                );
                            },
                        },
                    ]}
                    mobileCard={(user) => (
                        <div className='space-y-2.5'>
                            <TableIdentity
                                title={user.username}
                                subtitle={privacyMask.text(user.email)}
                                avatarUrl={userAvatar(user)}
                                fallback={user.username}
                                rounded='full'
                            />
                            <div className='flex flex-wrap items-center gap-2'>
                                <UserRoleBadge user={user} />
                                <UserStatus user={user} />
                                <UserAuthBadges user={user} />
                            </div>
                            {user.last_seen ? (
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.users.last_seen')}: {formatRelativeTime(user.last_seen, dateOpts)}
                                </p>
                            ) : null}
                        </div>
                    )}
                    actions={(user) => (
                        <RowActionsMenu
                            items={[
                                {
                                    label: t('common.edit'),
                                    icon: Pencil,
                                    href: `/admin/users/${user.uuid}/edit`,
                                },
                                {
                                    label: t('admin.users.actions.force_verify_email'),
                                    icon: CheckCircle2,
                                    hidden: user.email_verified !== false,
                                    onClick: () => handleForceVerifyEmail(user),
                                },
                                {
                                    label: t('common.delete'),
                                    icon: Trash2,
                                    destructive: true,
                                    separated: true,
                                    onClick: () => handleDeleteUser(user),
                                },
                            ]}
                        />
                    )}
                />
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

            <AdminPageTips page='users' />

            <WidgetRenderer widgets={getWidgets('admin-users', 'bottom-of-page')} />
        </div>
    );
}
