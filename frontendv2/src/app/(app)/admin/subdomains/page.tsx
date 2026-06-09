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

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { PageCard } from '@/components/featherui/PageCard';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/featherui/Textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select-native';
import {
    Plus,
    Search,
    Eye,
    Pencil,
    Trash2,
    Globe,
    Settings,
    Cloud,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    Server,
    Zap,
    History,
} from 'lucide-react';
import { toast } from 'sonner';
import axios, { isAxiosError } from 'axios';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { usePersistedListFilters } from '@/hooks/usePersistedListFilters';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

export interface SubdomainSpellMapping {
    spell_id: number;
    protocol_service: string | null;
    protocol_type: string;
    protocol_types?: string[];
    priority: number;
    weight: number;
    ttl: number;
    spell?: {
        id: number;
        uuid: string;
        name: string;
    } | null;
}

export interface SubdomainDomain {
    id?: number;
    uuid: string;
    domain: string;
    description?: string | null;
    is_active: number | boolean;
    cloudflare_zone_id?: string | null;
    cloudflare_account_id?: string | null;
    subdomain_count?: number;
    spells: SubdomainSpellMapping[];
    created_at?: string;
    updated_at?: string;
}

export interface SubdomainDomainPayload {
    domain: string;
    cloudflare_account_id: string;
    description?: string | null;
    is_active?: boolean;
    cloudflare_zone_id?: string | null;
    spells: Array<{
        spell_id: number;
        protocol_service?: string | null;
        protocol_type?: string;
        protocol_types?: string[];
        priority?: number;
        weight?: number;
        ttl?: number;
    }>;
}

export interface SubdomainAdminResponse {
    domains: SubdomainDomain[];
    pagination: {
        current_page: number;
        per_page: number;
        total_records: number;
        total_pages: number;
    };
}

export interface SubdomainEntry {
    uuid: string;
    subdomain: string;
    record_type: string;
    port: number | null;
    created_at: string | null;
}

export interface SubdomainSettings {
    cloudflare_email: string;
    max_subdomains_per_server: number;
    cloudflare_api_key_set: boolean;
    allow_user_subdomains?: boolean;
}

export interface SubdomainSettingsPayload {
    cloudflare_email?: string;
    cloudflare_api_key?: string;
    max_subdomains_per_server?: number;
}

export interface SubdomainSpell {
    id: number;
    uuid: string;
    name: string;
    realm_id: number;
}

interface Pagination {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

const SUBDOMAINS_LIST_FILTERS_KEY = 'featherpanel_admin_subdomains_filters_v1';
const SUBDOMAINS_LIST_FILTERS_DEFAULTS = {
    searchQuery: '',
    page: 1,
    pageSize: 10,
};

export default function AdminSubdomainsPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-subdomains');
    const [loading, setLoading] = useState(true);
    const [domains, setDomains] = useState<SubdomainDomain[]>([]);
    const { filters, patchFilters, hydrated } = usePersistedListFilters(
        SUBDOMAINS_LIST_FILTERS_KEY,
        SUBDOMAINS_LIST_FILTERS_DEFAULTS,
    );
    const { searchQuery, page, pageSize } = filters;
    const [pagination, setPagination] = useState<Omit<Pagination, 'page' | 'pageSize'>>({
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    const [manageOpen, setManageOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');

    const [selectedDomain, setSelectedDomain] = useState<SubdomainDomain | null>(null);
    const [domainEntries, setDomainEntries] = useState<SubdomainEntry[]>([]);
    const [spells, setSpells] = useState<SubdomainSpell[]>([]);

    const [domainForm, setDomainForm] = useState({
        domain: '',
        description: '',
        is_active: true,
        cloudflare_zone_id: '',
        cloudflare_account_id: '',
        spells: [] as Array<{
            spell_id: number;
            protocol_service: string | null;
            protocol_type: string;
            priority: number;
            ttl: number;
        }>,
    });
    const [zoneOverrideEnabled, setZoneOverrideEnabled] = useState(false);

    const [settingsForm, setSettingsForm] = useState({
        cloudflare_email: '',
        cloudflare_api_key: '',
        max_subdomains_per_server: 1,
    });
    const [settingsKeySet, setSettingsKeySet] = useState(false);
    const [userSubdomainsEnabled, setUserSubdomainsEnabled] = useState(false);
    const [togglingUserSubdomains, setTogglingUserSubdomains] = useState(false);

    const [processing, setProcessing] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== debouncedSearchQuery) {
                patchFilters({ page: 1 });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearchQuery, patchFilters]);

    const fetchDomains = useCallback(async () => {
        if (!hydrated) {
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.get<{ success: boolean; data: SubdomainAdminResponse }>(
                '/api/admin/subdomains',
                {
                    params: {
                        page,
                        limit: pageSize,
                        search: debouncedSearchQuery || undefined,
                        includeInactive: true,
                    },
                },
            );
            const result = data.data;
            setDomains(result.domains || []);
            setPagination({
                total: result.pagination.total_records,
                totalPages: result.pagination.total_pages,
                hasNext: result.pagination.current_page < result.pagination.total_pages,
                hasPrev: result.pagination.current_page > 1,
            });
        } catch (error) {
            console.error('Error fetching domains:', error);
            toast.error(t('admin.subdomains.messages.fetch_domains_failed'));
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, debouncedSearchQuery, t, hydrated]);

    const fetchInitialData = useCallback(async () => {
        try {
            const [settingsRes, spellsRes] = await Promise.all([
                axios.get<{ success: boolean; data: { settings: SubdomainSettings } }>(
                    '/api/admin/subdomains/settings',
                ),
                axios.get<{ success: boolean; data: { spells: SubdomainSpell[] } }>('/api/admin/subdomains/spells'),
            ]);
            const settingsData = settingsRes.data.data.settings;
            const spellsData = spellsRes.data.data.spells;

            setSettingsForm({
                cloudflare_email: settingsData.cloudflare_email || '',
                cloudflare_api_key: '',
                max_subdomains_per_server: settingsData.max_subdomains_per_server || 1,
            });
            setSettingsKeySet(settingsData.cloudflare_api_key_set);
            setUserSubdomainsEnabled(Boolean(settingsData.allow_user_subdomains));
            setSpells(spellsData || []);
        } catch (error) {
            console.error('Error fetching initial data:', error);
            toast.error(t('admin.subdomains.messages.load_settings_failed'));
        }
    }, [t]);

    useEffect(() => {
        fetchDomains();
        fetchWidgets();
    }, [fetchDomains, refreshKey, fetchWidgets]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const handleUserSubdomainsToggle = async (enabled: boolean) => {
        setTogglingUserSubdomains(true);
        try {
            await axios.patch('/api/admin/subdomains/settings', { allow_user_subdomains: enabled });
            setUserSubdomainsEnabled(enabled);
            toast.success(
                enabled
                    ? t('admin.subdomains.userSubdomainsEnabledToast')
                    : t('admin.subdomains.userSubdomainsDisabledToast'),
            );
        } catch (error: unknown) {
            let msg = t('admin.subdomains.userSubdomainsToggleFailed');
            if (isAxiosError(error) && error.response?.data?.message) {
                msg = String(error.response.data.message);
            }
            toast.error(msg);
        } finally {
            setTogglingUserSubdomains(false);
        }
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            const payload: {
                cloudflare_email: string;
                max_subdomains_per_server: number;
                cloudflare_api_key?: string;
            } = {
                cloudflare_email: settingsForm.cloudflare_email.trim(),
                max_subdomains_per_server: Number(settingsForm.max_subdomains_per_server),
            };
            if (settingsForm.cloudflare_api_key.trim()) {
                payload.cloudflare_api_key = settingsForm.cloudflare_api_key.trim();
            }
            await axios.patch('/api/admin/subdomains/settings', payload);
            toast.success(t('admin.subdomains.messages.cloudflare_settings_saved'));
            setSettingsForm((prev) => ({ ...prev, cloudflare_api_key: '' }));
            fetchInitialData();
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error(t('admin.subdomains.messages.save_settings_failed'));
        } finally {
            setSavingSettings(false);
        }
    };

    const handleCreateEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const payload = {
                ...domainForm,
                cloudflare_zone_id: zoneOverrideEnabled ? domainForm.cloudflare_zone_id.trim() || undefined : undefined,
                spells: domainForm.spells.map((s) => ({
                    ...s,
                    spell_id: Number(s.spell_id),
                })),
            };

            if (dialogMode === 'create') {
                await axios.put('/api/admin/subdomains', payload);
                toast.success(t('admin.subdomains.messages.domain_created'));
            } else if (selectedDomain) {
                await axios.patch(`/api/admin/subdomains/${selectedDomain.uuid}`, payload);
                toast.success(t('admin.subdomains.messages.domain_updated'));
            }
            setManageOpen(false);
            setRefreshKey((prev) => prev + 1);
        } catch (error: unknown) {
            console.error('Error saving domain:', error);
            let msg = t('admin.subdomains.messages.domain_save_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                msg = error.response.data.message;
            }
            toast.error(msg);
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (domain: SubdomainDomain) => {
        if (
            !confirm(
                `Are you sure you want to delete ${domain.domain}? This will NOT delete existing DNS records on Cloudflare but will remove them from the panel.`,
            )
        )
            return;
        try {
            await axios.delete(`/api/admin/subdomains/${domain.uuid}`);
            toast.success(t('admin.subdomains.messages.domain_deleted'));
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error deleting domain:', error);
            toast.error(t('admin.subdomains.messages.domain_delete_failed'));
        }
    };

    const openCreate = () => {
        setDialogMode('create');
        setSelectedDomain(null);
        setDomainForm({
            domain: '',
            description: '',
            is_active: true,
            cloudflare_zone_id: '',
            cloudflare_account_id: '',
            spells: [],
        });
        setZoneOverrideEnabled(false);
        setManageOpen(true);
    };

    const openEdit = async (domain: SubdomainDomain) => {
        setDialogMode('edit');
        setSelectedDomain(domain);
        try {
            const { data } = await axios.get<{ success: boolean; data: { domain: SubdomainDomain } }>(
                `/api/admin/subdomains/${domain.uuid}`,
            );
            const fullDomain = data.data.domain;
            setDomainForm({
                domain: fullDomain.domain,
                description: fullDomain.description || '',
                is_active: !!fullDomain.is_active,
                cloudflare_zone_id: fullDomain.cloudflare_zone_id || '',
                cloudflare_account_id: fullDomain.cloudflare_account_id || '',
                spells: fullDomain.spells.map((s: SubdomainSpellMapping) => ({ ...s })),
            });
            setZoneOverrideEnabled(!!fullDomain.cloudflare_zone_id);
            setManageOpen(true);
        } catch (error) {
            console.error('Error fetching domain details:', error);
            toast.error(t('admin.subdomains.messages.domain_details_failed'));
        }
    };

    const openDetails = async (domain: SubdomainDomain) => {
        setSelectedDomain(domain);
        setDomainEntries([]);
        setDetailsOpen(true);
        try {
            const { data } = await axios.get<{ success: boolean; data: { subdomains: SubdomainEntry[] } }>(
                `/api/admin/subdomains/${domain.uuid}/subdomains`,
            );
            const entries = data.data.subdomains;
            setDomainEntries(entries || []);
        } catch (error) {
            console.error('Error fetching subdomain list:', error);
            toast.error(t('admin.subdomains.messages.subdomain_list_failed'));
        }
    };

    const addSpell = () => {
        if (spells.length === 0) {
            toast.error(t('admin.subdomains.messages.create_spell_first'));
            return;
        }
        setDomainForm((prev) => ({
            ...prev,
            spells: [
                ...prev.spells,
                {
                    spell_id: spells[0].id,
                    protocol_service: '_minecraft',
                    protocol_type: 'tcp',
                    priority: 10,
                    weight: 10,
                    ttl: 3600,
                },
            ],
        }));
    };

    const removeSpell = (index: number) => {
        setDomainForm((prev) => ({
            ...prev,
            spells: prev.spells.filter((_, i) => i !== index),
        }));
    };

    const updateSpell = (index: number, field: string, value: string | number) => {
        setDomainForm((prev) => ({
            ...prev,
            spells: prev.spells.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
        }));
    };

    return (
        <div className='animate-in fade-in slide-in-from-bottom-4 space-y-6 duration-500'>
            <WidgetRenderer widgets={getWidgets('admin-subdomains', 'top-of-page')} />
            <PageHeader
                title={t('admin.subdomains.title')}
                description={t('admin.subdomains.description')}
                icon={Globe}
                actions={
                    <Button onClick={openCreate}>
                        <Plus className='mr-2 h-4 w-4' />
                        {t('admin.subdomains.newDomain')}
                    </Button>
                }
            />

            {!userSubdomainsEnabled && (
                <Alert className='border-destructive/35 bg-destructive/[0.07] dark:bg-destructive/10 rounded-2xl shadow-md'>
                    <AlertCircle className='text-destructive h-5 w-5 shrink-0' />
                    <AlertTitle className='text-foreground text-base font-bold tracking-tight'>
                        {t('admin.subdomains.featureDisabledAlertTitle')}
                    </AlertTitle>
                    <AlertDescription className='text-muted-foreground mt-2 space-y-4 text-sm leading-relaxed'>
                        <p>{t('admin.subdomains.featureDisabledAlertBody')}</p>
                        <div className='border-border/60 bg-background/60 flex flex-col justify-between gap-4 rounded-xl border p-4 sm:flex-row sm:items-center'>
                            <div className='space-y-1'>
                                <Label className='text-foreground text-sm font-semibold'>
                                    {t('admin.subdomains.userSubdomainsToggleLabel')}
                                </Label>
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.subdomains.userSubdomainsToggleHint')}
                                </p>
                            </div>
                            <Switch
                                checked={false}
                                disabled={togglingUserSubdomains}
                                onCheckedChange={(v) => {
                                    if (v) void handleUserSubdomainsToggle(true);
                                }}
                                className='shrink-0 scale-110'
                            />
                        </div>
                        <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='w-full sm:w-auto'
                            onClick={() => router.push('/admin/settings?category=servers')}
                        >
                            <Settings className='mr-2 h-4 w-4' />
                            {t('admin.subdomains.featureDisabledOpenSettings')}
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {userSubdomainsEnabled && (
                <Alert className='rounded-2xl border-amber-500/45 bg-amber-500/8 shadow-md dark:bg-amber-950/25'>
                    <Settings className='h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400' />
                    <AlertTitle className='text-base font-bold tracking-tight text-amber-950 dark:text-amber-50'>
                        {t('admin.subdomains.featureEnabledAlertTitle')}
                    </AlertTitle>
                    <AlertDescription className='mt-2 space-y-4 text-sm leading-relaxed text-amber-950/85 dark:text-amber-50/85'>
                        <p>{t('admin.subdomains.featureEnabledAlertBody')}</p>
                        {(!settingsKeySet || !settingsForm.cloudflare_email.trim()) && (
                            <p className='font-semibold text-amber-900 dark:text-amber-100'>
                                {t('admin.subdomains.featureEnabledAlertIncomplete')}
                            </p>
                        )}
                        <div className='bg-background/50 dark:bg-background/20 flex flex-col justify-between gap-4 rounded-xl border border-amber-600/25 p-4 sm:flex-row sm:items-center'>
                            <div className='space-y-1'>
                                <Label className='text-sm font-semibold text-amber-950 dark:text-amber-50'>
                                    {t('admin.subdomains.userSubdomainsToggleLabel')}
                                </Label>
                                <p className='text-xs text-amber-900/70 dark:text-amber-100/80'>
                                    {t('admin.subdomains.userSubdomainsToggleHint')}
                                </p>
                            </div>
                            <Switch
                                checked={userSubdomainsEnabled}
                                disabled={togglingUserSubdomains}
                                onCheckedChange={(v) => void handleUserSubdomainsToggle(v)}
                                className='shrink-0 scale-110'
                            />
                        </div>
                        <div className='flex flex-col flex-wrap gap-2 sm:flex-row'>
                            <Button
                                type='button'
                                variant='outline'
                                size='sm'
                                className='bg-background/80 border-amber-600/40 text-amber-950 hover:bg-amber-500/10 dark:text-amber-50'
                                onClick={() =>
                                    document
                                        .getElementById('admin-subdomains-cloudflare-settings')
                                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                }
                            >
                                <Settings className='mr-2 h-4 w-4' />
                                {t('admin.subdomains.featureEnabledAlertCta')}
                            </Button>
                            <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                className='text-amber-900 dark:text-amber-100'
                                onClick={() => router.push('/admin/settings?category=servers')}
                            >
                                {t('admin.subdomains.featureDisabledOpenSettings')}
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            <div className='bg-card/40 flex flex-col items-center gap-4 rounded-2xl p-4 shadow-sm backdrop-blur-md sm:flex-row'>
                <div className='group relative w-full flex-1'>
                    <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors' />
                    <Input
                        className='h-11 w-full pl-10'
                        placeholder={t('admin.subdomains.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => patchFilters({ searchQuery: e.target.value })}
                    />
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-subdomains', 'after-header')} />

            {loading ? (
                <TableSkeleton count={5} />
            ) : domains.length > 0 ? (
                <>
                    {pagination.totalPages > 1 && (
                        <div className='border-border bg-card/50 mb-4 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={page === 1}
                                onClick={() => patchFilters({ page: page - 1 })}
                                className='gap-1.5'
                            >
                                <ChevronLeft className='h-4 w-4' />
                                {t('common.previous')}
                            </Button>
                            <span className='text-sm font-medium'>
                                {page} / {pagination.totalPages}
                            </span>
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={page === pagination.totalPages}
                                onClick={() => patchFilters({ page: page + 1 })}
                                className='gap-1.5'
                            >
                                {t('common.next')}
                                <ChevronRight className='h-4 w-4' />
                            </Button>
                        </div>
                    )}
                    <div className='grid grid-cols-1 gap-4'>
                        <WidgetRenderer widgets={getWidgets('admin-subdomains', 'before-list')} />
                        {domains.map((domain) => (
                            <ResourceCard
                                key={domain.uuid}
                                title={domain.domain}
                                subtitle={
                                    <div className='flex items-center gap-2 text-xs'>
                                        <History className='h-3 w-3' />
                                        {domain.updated_at ? new Date(domain.updated_at).toLocaleDateString() : 'N/A'}
                                    </div>
                                }
                                icon={Globe}
                                badges={[
                                    {
                                        label: Number(domain.is_active)
                                            ? t('admin.subdomains.statusActive')
                                            : t('admin.subdomains.statusInactive'),
                                        className: Number(domain.is_active)
                                            ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                            : 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20',
                                    },
                                    {
                                        label: `${t('admin.subdomains.mappingsColumn')}: ${domain.spells?.length || 0}`,
                                        className: 'bg-primary/10 text-primary border-primary/20',
                                    },
                                    {
                                        label: `${t('admin.subdomains.subdomainsColumn')}: ${domain.subdomain_count || 0}`,
                                        className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                                    },
                                ]}
                                actions={
                                    <div className='flex items-center gap-2'>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            title={t('admin.subdomains.viewEntries')}
                                            onClick={() => openDetails(domain)}
                                        >
                                            <Eye className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            title={t('common.edit')}
                                            onClick={() => openEdit(domain)}
                                        >
                                            <Pencil className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            title={t('common.delete')}
                                            className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                            onClick={() => handleDelete(domain)}
                                        >
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    </div>
                                }
                                description={
                                    <p className='text-muted-foreground mt-2 line-clamp-1 text-sm italic opacity-70'>
                                        {domain.description || t('admin.subdomains.descriptionPlaceholder')}
                                    </p>
                                }
                            />
                        ))}
                    </div>

                    {pagination.totalPages > 1 && (
                        <div className='mt-8 flex items-center justify-center gap-2'>
                            <Button
                                variant='outline'
                                size='icon'
                                disabled={page === 1}
                                onClick={() => patchFilters({ page: page - 1 })}
                            >
                                <ChevronLeft className='h-4 w-4' />
                            </Button>
                            <span className='text-sm font-medium'>
                                {page} / {pagination.totalPages}
                            </span>
                            <Button
                                variant='outline'
                                size='icon'
                                disabled={page === pagination.totalPages}
                                onClick={() => patchFilters({ page: page + 1 })}
                            >
                                <ChevronRight className='h-4 w-4' />
                            </Button>
                        </div>
                    )}
                </>
            ) : (
                <EmptyState
                    title={t('admin.subdomains.noSubdomains')}
                    description={t('admin.subdomains.description')}
                    icon={Globe}
                    action={
                        <Button onClick={openCreate}>
                            <Plus className='mr-2 h-4 w-4' />
                            {t('admin.subdomains.newDomain')}
                        </Button>
                    }
                />
            )}

            <div className='border-border/50 grid grid-cols-1 gap-6 border-t pt-6 lg:grid-cols-3'>
                <div className='space-y-6 lg:col-span-2'>
                    <PageCard
                        id='admin-subdomains-cloudflare-settings'
                        title={t('admin.subdomains.settingsTitle')}
                        icon={Settings}
                    >
                        <div className='grid gap-6'>
                            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                                <div className='space-y-2'>
                                    <Label htmlFor='cf-email'>{t('admin.subdomains.cloudflareEmail')}</Label>
                                    <Input
                                        id='cf-email'
                                        value={settingsForm.cloudflare_email}
                                        onChange={(e) =>
                                            setSettingsForm({ ...settingsForm, cloudflare_email: e.target.value })
                                        }
                                        placeholder='admin@example.com'
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='cf-key'>{t('admin.subdomains.cloudflareKey')}</Label>
                                    <Input
                                        id='cf-key'
                                        type='password'
                                        value={settingsForm.cloudflare_api_key}
                                        onChange={(e) =>
                                            setSettingsForm({ ...settingsForm, cloudflare_api_key: e.target.value })
                                        }
                                        placeholder={
                                            settingsKeySet
                                                ? t('admin.subdomains.secretPlaceholder')
                                                : t('admin.subdomains.cloudflareKeyPlaceholder')
                                        }
                                    />
                                    {settingsKeySet && (
                                        <p className='text-primary flex items-center gap-1 text-[10px] font-medium'>
                                            <Zap className='h-3 w-3' />
                                            {t('admin.subdomains.secretMaskedMessage')}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className='space-y-2'>
                                <Label htmlFor='max-sub'>{t('admin.subdomains.maxPerServer')}</Label>
                                <Input
                                    id='max-sub'
                                    type='number'
                                    min={1}
                                    value={settingsForm.max_subdomains_per_server}
                                    onChange={(e) =>
                                        setSettingsForm({
                                            ...settingsForm,
                                            max_subdomains_per_server: parseInt(e.target.value) || 1,
                                        })
                                    }
                                />
                                <p className='text-muted-foreground text-xs'>{t('admin.subdomains.cloudflareHint')}</p>
                            </div>
                            <div className='flex justify-end'>
                                <Button onClick={handleSaveSettings} loading={savingSettings}>
                                    {t('admin.subdomains.save')}
                                </Button>
                            </div>
                        </div>
                    </PageCard>

                    <Card className='border-muted bg-muted/20 rounded-2xl border-dashed'>
                        <div className='space-y-4 p-6'>
                            <div className='flex items-center gap-2'>
                                <RefreshCw className='text-muted-foreground h-5 w-5' />
                                <h3 className='font-semibold'>{t('admin.subdomains.tutorialTitle')}</h3>
                            </div>
                            <p className='text-muted-foreground text-sm'>{t('admin.subdomains.tutorialDescription')}</p>
                            <ol className='text-muted-foreground list-inside list-decimal space-y-2 pl-2 text-sm'>
                                <li>{t('admin.subdomains.tutorialSteps.credentials')}</li>
                                <li>{t('admin.subdomains.tutorialSteps.domain')}</li>
                                <li>{t('admin.subdomains.tutorialSteps.mappings')}</li>
                            </ol>
                            <Alert className='bg-primary/5 border-primary/10'>
                                <AlertCircle className='h-4 w-4' />
                                <AlertTitle className='text-xs font-bold tracking-wider uppercase'>
                                    {t('admin.subdomains.tutorialProTip')}
                                </AlertTitle>
                                <AlertDescription className='text-xs'>
                                    {t('admin.subdomains.tutorialNote')}
                                </AlertDescription>
                            </Alert>
                        </div>
                    </Card>
                </div>

                <div className='space-y-6'>
                    <PageCard title={t('admin.subdomains.dialogHelpTitle')} icon={Zap}>
                        <div className='text-muted-foreground space-y-4 text-sm leading-relaxed'>
                            <div className='flex gap-3'>
                                <div className='bg-primary/10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full'>
                                    <span className='text-primary text-[10px] font-bold'>1</span>
                                </div>
                                <p>{t('admin.subdomains.dialogHelpSteps.domain')}</p>
                            </div>
                            <div className='flex gap-3'>
                                <div className='bg-primary/10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full'>
                                    <span className='text-primary text-[10px] font-bold'>2</span>
                                </div>
                                <p>{t('admin.subdomains.dialogHelpSteps.spell')}</p>
                            </div>
                            <div className='flex gap-3'>
                                <div className='bg-primary/10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full'>
                                    <span className='text-primary text-[10px] font-bold'>3</span>
                                </div>
                                <p>{t('admin.subdomains.dialogHelpSteps.protocol')}</p>
                            </div>
                            <div className='bg-border/50 h-px' />
                            <p className='text-xs italic'>{t('admin.subdomains.dialogHelpFootnote')}</p>
                        </div>
                    </PageCard>
                </div>
            </div>

            <Sheet open={manageOpen} onOpenChange={setManageOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>
                            {dialogMode === 'create'
                                ? t('admin.subdomains.createDomain')
                                : t('admin.subdomains.editDomain')}
                        </SheetTitle>
                        <SheetDescription>{t('admin.subdomains.drawerDescription')}</SheetDescription>
                    </SheetHeader>
                    <form onSubmit={handleCreateEdit} className='space-y-6 pt-4'>
                        <div className='space-y-4'>
                            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                                <div className='space-y-2'>
                                    <Label htmlFor='domain-name'>{t('admin.subdomains.domainLabel')}</Label>
                                    <Input
                                        id='domain-name'
                                        value={domainForm.domain}
                                        onChange={(e) => setDomainForm({ ...domainForm, domain: e.target.value })}
                                        placeholder='example.com'
                                        required
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='acc-id'>{t('admin.subdomains.accountIdLabel')}</Label>
                                    <Input
                                        id='acc-id'
                                        value={domainForm.cloudflare_account_id}
                                        onChange={(e) =>
                                            setDomainForm({ ...domainForm, cloudflare_account_id: e.target.value })
                                        }
                                        placeholder={t('admin.subdomains.accountIdPlaceholder')}
                                        required
                                    />
                                </div>
                            </div>

                            <div className='space-y-2'>
                                <Label htmlFor='domain-desc'>{t('admin.subdomains.descriptionLabel')}</Label>
                                <Textarea
                                    id='domain-desc'
                                    value={domainForm.description}
                                    onChange={(e) => setDomainForm({ ...domainForm, description: e.target.value })}
                                    placeholder={t('admin.subdomains.descriptionPlaceholder')}
                                />
                            </div>

                            <div className='flex items-center justify-between'>
                                <div className='space-y-0.5'>
                                    <Label className='text-sm'>{t('admin.subdomains.activeToggle')}</Label>
                                    <p className='text-muted-foreground text-[11px]'>
                                        {t('admin.subdomains.activeToggleHint')}
                                    </p>
                                </div>
                                <Switch
                                    checked={Boolean(domainForm.is_active)}
                                    onCheckedChange={(val) => setDomainForm({ ...domainForm, is_active: val })}
                                />
                            </div>

                            <div className='bg-border/50 h-px' />

                            <div className='bg-card/20 space-y-4 rounded-3xl border border-white/5 p-6 backdrop-blur-md'>
                                <div className='flex items-center justify-between'>
                                    <Label className='text-foreground/80 flex items-center gap-2 font-semibold'>
                                        <Cloud className='text-primary h-4 w-4' />
                                        {t('admin.subdomains.zoneToggleLabel')}
                                    </Label>
                                    <Switch checked={zoneOverrideEnabled} onCheckedChange={setZoneOverrideEnabled} />
                                </div>
                                {zoneOverrideEnabled && (
                                    <div className='animate-in fade-in slide-in-from-top-2 space-y-2 duration-300'>
                                        <Input
                                            value={domainForm.cloudflare_zone_id}
                                            onChange={(e) =>
                                                setDomainForm({ ...domainForm, cloudflare_zone_id: e.target.value })
                                            }
                                            placeholder={t('admin.subdomains.zoneIdPlaceholder')}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className='bg-border/5 h-px' />

                            <div className='space-y-6'>
                                <div className='flex items-center justify-between px-1'>
                                    <div className='space-y-0.5'>
                                        <Label className='text-primary flex items-center gap-2 text-xs font-bold tracking-wider uppercase'>
                                            <Zap className='h-3 w-3' />
                                            {t('admin.subdomains.mappingsTitle')}
                                        </Label>
                                        <p className='text-muted-foreground/60 text-[10px]'>
                                            {t('admin.subdomains.mappingsDescription') ||
                                                'Configure spell routing rules.'}
                                        </p>
                                    </div>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        onClick={addSpell}
                                        className='border-primary/20 hover:bg-primary/5 hover:border-primary/40 h-8 px-3'
                                    >
                                        <Plus className='mr-1.5 h-3 w-3' />
                                        {t('admin.subdomains.addMapping')}
                                    </Button>
                                </div>

                                <div className='space-y-6'>
                                    {domainForm.spells.map((mapping, idx) => (
                                        <div
                                            key={idx}
                                            className='group/mapping rounded-3xl border border-white/5 bg-white/2 p-6 transition-all hover:border-white/10 hover:bg-white/4'
                                        >
                                            <div className='mb-6 flex items-start justify-between gap-4'>
                                                <div className='flex-1'>
                                                    <Label className='text-muted-foreground mb-2 block text-[10px] font-bold tracking-widest uppercase'>
                                                        {t('admin.subdomains.spell')}
                                                    </Label>
                                                    <Select
                                                        value={mapping.spell_id}
                                                        onChange={(e) => updateSpell(idx, 'spell_id', e.target.value)}
                                                    >
                                                        {spells.map((s) => (
                                                            <option key={s.id} value={s.id}>
                                                                {s.name}
                                                            </option>
                                                        ))}
                                                    </Select>
                                                </div>
                                                <Button
                                                    type='button'
                                                    variant='ghost'
                                                    size='icon'
                                                    className='text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 shrink-0 transition-colors'
                                                    onClick={() => removeSpell(idx)}
                                                >
                                                    <Trash2 className='h-4 w-4' />
                                                </Button>
                                            </div>

                                            <div className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
                                                <div className='space-y-2'>
                                                    <Label className='text-muted-foreground/60 ml-1 text-[10px] font-bold tracking-wider uppercase'>
                                                        {t('admin.subdomains.protocolService')}
                                                    </Label>
                                                    <Input
                                                        value={mapping.protocol_service ?? ''}
                                                        onChange={(e) =>
                                                            updateSpell(idx, 'protocol_service', e.target.value)
                                                        }
                                                        className='h-10 px-4 text-sm'
                                                    />
                                                </div>
                                                <div className='space-y-2'>
                                                    <Label className='text-muted-foreground/60 ml-1 text-[10px] font-bold tracking-wider uppercase'>
                                                        {t('admin.subdomains.protocolType')}
                                                    </Label>
                                                    <Select
                                                        value={mapping.protocol_type}
                                                        onChange={(e) =>
                                                            updateSpell(idx, 'protocol_type', e.target.value)
                                                        }
                                                        className='h-10 px-4 text-sm'
                                                    >
                                                        <option value='tcp'>TCP</option>
                                                        <option value='udp'>UDP</option>
                                                        <option value='tls'>TLS</option>
                                                    </Select>
                                                </div>
                                                <div className='space-y-2'>
                                                    <Label className='text-muted-foreground/60 ml-1 text-[10px] font-bold tracking-wider uppercase'>
                                                        {t('admin.subdomains.priority')}
                                                    </Label>
                                                    <Input
                                                        type='number'
                                                        value={mapping.priority}
                                                        onChange={(e) =>
                                                            updateSpell(idx, 'priority', parseInt(e.target.value))
                                                        }
                                                        className='h-10 px-4 text-sm'
                                                    />
                                                </div>
                                                <div className='space-y-2'>
                                                    <Label className='text-muted-foreground/60 ml-1 text-[10px] font-bold tracking-wider uppercase'>
                                                        {t('admin.subdomains.ttl')}
                                                    </Label>
                                                    <Input
                                                        type='number'
                                                        value={mapping.ttl}
                                                        onChange={(e) =>
                                                            updateSpell(idx, 'ttl', parseInt(e.target.value))
                                                        }
                                                        className='h-10 px-4 text-sm'
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {domainForm.spells.length === 0 && (
                                        <div className='rounded-3xl border border-dashed border-white/5 bg-white/1 py-12 text-center'>
                                            <Zap className='text-muted-foreground/20 mx-auto mb-3 h-8 w-8' />
                                            <p className='text-muted-foreground/40 text-sm'>
                                                {t('admin.subdomains.spellRequired')}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <SheetFooter>
                            <Button type='submit' loading={processing} className='w-full'>
                                {dialogMode === 'create'
                                    ? t('admin.subdomains.createButton')
                                    : t('admin.subdomains.save')}
                            </Button>
                        </SheetFooter>
                    </form>
                </div>
            </Sheet>

            <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
                <div className='space-y-6'>
                    <SheetHeader>
                        <SheetTitle>
                            {t('admin.subdomains.domainDetailsTitle', { domain: selectedDomain?.domain || '' })}
                        </SheetTitle>
                        <SheetDescription>{t('admin.subdomains.domainDetailsDescription')}</SheetDescription>
                    </SheetHeader>
                    <div className='space-y-4 pt-6'>
                        {domainEntries.length > 0 ? (
                            <div className='space-y-3'>
                                {domainEntries.map((entry) => (
                                    <div
                                        key={entry.uuid}
                                        className='bg-muted/30 border-border/50 hover:bg-muted/50 flex items-center justify-between rounded-2xl border p-4 transition-colors'
                                    >
                                        <div className='min-w-0 space-y-1'>
                                            <div className='text-primary flex items-center gap-2 truncate font-mono text-sm font-bold'>
                                                <Globe className='h-3 w-3' />
                                                {entry.subdomain}.{selectedDomain?.domain}
                                            </div>
                                            <div className='text-muted-foreground flex items-center gap-3 text-[10px]'>
                                                <span className='flex items-center gap-1 rounded-full bg-zinc-500/10 px-2 py-0.5'>
                                                    {entry.record_type}
                                                </span>
                                                <span className='flex items-center gap-1'>
                                                    <Server className='h-2 w-2' />
                                                    Port: {entry.port || 'Auto'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className='text-muted-foreground text-right text-[10px] tabular-nums'>
                                            {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className='bg-muted/20 rounded-3xl border border-dashed py-12 text-center'>
                                <Globe className='text-muted-foreground mx-auto mb-3 h-8 w-8 opacity-20' />
                                <p className='text-muted-foreground text-sm'>{t('admin.subdomains.noSubdomains')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </Sheet>
            <WidgetRenderer widgets={getWidgets('admin-subdomains', 'bottom-of-page')} />
        </div>
    );
}
