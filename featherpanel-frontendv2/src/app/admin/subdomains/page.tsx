/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)

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

'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

// Types
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

export default function AdminSubdomainsPage() {
    const { t } = useTranslation();
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-subdomains');
    const [loading, setLoading] = useState(true);
    const [domains, setDomains] = useState<SubdomainDomain[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    // Sheet states
    const [manageOpen, setManageOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');

    // Selected content
    const [selectedDomain, setSelectedDomain] = useState<SubdomainDomain | null>(null);
    const [domainEntries, setDomainEntries] = useState<SubdomainEntry[]>([]);
    const [spells, setSpells] = useState<SubdomainSpell[]>([]);

    // Form states
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

    // Action states
    const [processing, setProcessing] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            if (searchQuery !== debouncedSearchQuery) {
                setPagination((p) => ({ ...p, page: 1 }));
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, debouncedSearchQuery]);

    const fetchDomains = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get<{ success: boolean; data: SubdomainAdminResponse }>(
                '/api/admin/subdomains',
                {
                    params: {
                        page: pagination.page,
                        limit: pagination.pageSize,
                        search: debouncedSearchQuery || undefined,
                        includeInactive: true,
                    },
                },
            );
            const result = data.data;
            setDomains(result.domains || []);
            setPagination({
                page: result.pagination.current_page,
                pageSize: result.pagination.per_page,
                total: result.pagination.total_records,
                totalPages: result.pagination.total_pages,
                hasNext: result.pagination.current_page < result.pagination.total_pages,
                hasPrev: result.pagination.current_page > 1,
            });
        } catch (error) {
            console.error('Error fetching domains:', error);
            toast.error('Failed to fetch domains.');
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.pageSize, debouncedSearchQuery]);

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
            setSpells(spellsData || []);
        } catch (error) {
            console.error('Error fetching initial data:', error);
            toast.error('Failed to load global settings.');
        }
    }, []);

    useEffect(() => {
        fetchDomains();
        fetchWidgets();
    }, [fetchDomains, refreshKey, fetchWidgets]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

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
            toast.success('Cloudflare settings updated successfully.');
            setSettingsForm((prev) => ({ ...prev, cloudflare_api_key: '' }));
            fetchInitialData();
        } catch (error) {
            console.error('Error saving settings:', error);
            toast.error('Failed to save settings.');
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
                toast.success('Domain created successfully.');
            } else if (selectedDomain) {
                await axios.patch(`/api/admin/subdomains/${selectedDomain.uuid}`, payload);
                toast.success('Domain updated successfully.');
            }
            setManageOpen(false);
            setRefreshKey((prev) => prev + 1);
        } catch (error: unknown) {
            console.error('Error saving domain:', error);
            let msg = 'Failed to save domain configuration.';
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
            toast.success('Domain deleted successfully.');
            setRefreshKey((prev) => prev + 1);
        } catch (error) {
            console.error('Error deleting domain:', error);
            toast.error('Failed to delete domain.');
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
            toast.error('Failed to load domain details.');
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
            toast.error('Failed to load subdomain list.');
        }
    };

    const addSpell = () => {
        if (spells.length === 0) return;
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
        <div className='space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500'>
            <WidgetRenderer widgets={getWidgets('admin-subdomains', 'top-of-page')} />
            <PageHeader
                title={t('admin.subdomains.title')}
                description={t('admin.subdomains.description')}
                icon={Globe}
                actions={
                    <Button onClick={openCreate}>
                        <Plus className='h-4 w-4 mr-2' />
                        {t('admin.subdomains.newDomain')}
                    </Button>
                }
            />

            <div className='flex flex-col sm:flex-row gap-4 items-center bg-card/40 backdrop-blur-md p-4 rounded-2xl shadow-sm'>
                <div className='relative flex-1 group w-full'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors' />
                    <Input
                        className='pl-10 h-11 w-full'
                        placeholder={t('admin.subdomains.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <WidgetRenderer widgets={getWidgets('admin-subdomains', 'after-header')} />

            {loading ? (
                <TableSkeleton count={5} />
            ) : domains.length > 0 ? (
                <>
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
                                            title='View entries'
                                            onClick={() => openDetails(domain)}
                                        >
                                            <Eye className='h-4 w-4' />
                                        </Button>
                                        <Button variant='ghost' size='sm' title='Edit' onClick={() => openEdit(domain)}>
                                            <Pencil className='h-4 w-4' />
                                        </Button>
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            title='Delete'
                                            className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                            onClick={() => handleDelete(domain)}
                                        >
                                            <Trash2 className='h-4 w-4' />
                                        </Button>
                                    </div>
                                }
                                description={
                                    <p className='mt-2 text-sm text-muted-foreground line-clamp-1 italic opacity-70'>
                                        {domain.description || t('admin.subdomains.descriptionPlaceholder')}
                                    </p>
                                }
                            />
                        ))}
                    </div>

                    {pagination.totalPages > 1 && (
                        <div className='flex items-center justify-center gap-2 mt-8'>
                            <Button
                                variant='outline'
                                size='icon'
                                disabled={!pagination.hasPrev}
                                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                            >
                                <ChevronLeft className='h-4 w-4' />
                            </Button>
                            <span className='text-sm font-medium'>
                                {pagination.page} / {pagination.totalPages}
                            </span>
                            <Button
                                variant='outline'
                                size='icon'
                                disabled={!pagination.hasNext}
                                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
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
                            <Plus className='w-4 h-4 mr-2' />
                            {t('admin.subdomains.newDomain')}
                        </Button>
                    }
                />
            )}

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6 border-t border-border/50'>
                <div className='lg:col-span-2 space-y-6'>
                    <PageCard title={t('admin.subdomains.settingsTitle')} icon={Settings}>
                        <div className='grid gap-6'>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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
                                        <p className='text-[10px] text-primary font-medium flex items-center gap-1'>
                                            <Zap className='w-3 h-3' />
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
                                <p className='text-xs text-muted-foreground'>{t('admin.subdomains.cloudflareHint')}</p>
                            </div>
                            <div className='flex justify-end'>
                                <Button onClick={handleSaveSettings} loading={savingSettings}>
                                    {t('admin.subdomains.save')}
                                </Button>
                            </div>
                        </div>
                    </PageCard>

                    <Card className='border-dashed border-muted bg-muted/20 rounded-2xl'>
                        <div className='p-6 space-y-4'>
                            <div className='flex items-center gap-2'>
                                <RefreshCw className='h-5 w-5 text-muted-foreground' />
                                <h3 className='font-semibold'>{t('admin.subdomains.tutorialTitle')}</h3>
                            </div>
                            <p className='text-sm text-muted-foreground'>{t('admin.subdomains.tutorialDescription')}</p>
                            <ol className='list-decimal list-inside space-y-2 text-sm text-muted-foreground pl-2'>
                                <li>{t('admin.subdomains.tutorialSteps.credentials')}</li>
                                <li>{t('admin.subdomains.tutorialSteps.domain')}</li>
                                <li>{t('admin.subdomains.tutorialSteps.mappings')}</li>
                            </ol>
                            <Alert className='bg-primary/5 border-primary/10'>
                                <AlertCircle className='h-4 w-4' />
                                <AlertTitle className='text-xs font-bold uppercase tracking-wider'>
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
                        <div className='space-y-4 text-sm text-muted-foreground leading-relaxed'>
                            <div className='flex gap-3'>
                                <div className='w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5'>
                                    <span className='text-[10px] font-bold text-primary'>1</span>
                                </div>
                                <p>{t('admin.subdomains.dialogHelpSteps.domain')}</p>
                            </div>
                            <div className='flex gap-3'>
                                <div className='w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5'>
                                    <span className='text-[10px] font-bold text-primary'>2</span>
                                </div>
                                <p>{t('admin.subdomains.dialogHelpSteps.spell')}</p>
                            </div>
                            <div className='flex gap-3'>
                                <div className='w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5'>
                                    <span className='text-[10px] font-bold text-primary'>3</span>
                                </div>
                                <p>{t('admin.subdomains.dialogHelpSteps.protocol')}</p>
                            </div>
                            <div className='h-px bg-border/50' />
                            <p className='text-xs italic'>{t('admin.subdomains.dialogHelpFootnote')}</p>
                        </div>
                    </PageCard>
                </div>
            </div>

            {/* Manage Domain Sheet */}
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
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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
                                    <p className='text-[11px] text-muted-foreground'>
                                        {t('admin.subdomains.activeToggleHint')}
                                    </p>
                                </div>
                                <Switch
                                    checked={Boolean(domainForm.is_active)}
                                    onCheckedChange={(val) => setDomainForm({ ...domainForm, is_active: val })}
                                />
                            </div>

                            <div className='h-px bg-border/50' />

                            <div className='p-6 bg-card/20 backdrop-blur-md border border-white/5 rounded-3xl space-y-4'>
                                <div className='flex items-center justify-between'>
                                    <Label className='flex items-center gap-2 font-semibold text-foreground/80'>
                                        <Cloud className='w-4 h-4 text-primary' />
                                        {t('admin.subdomains.zoneToggleLabel')}
                                    </Label>
                                    <Switch checked={zoneOverrideEnabled} onCheckedChange={setZoneOverrideEnabled} />
                                </div>
                                {zoneOverrideEnabled && (
                                    <div className='space-y-2 animate-in fade-in slide-in-from-top-2 duration-300'>
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

                            <div className='h-px bg-border/5' />

                            <div className='space-y-6'>
                                <div className='flex items-center justify-between px-1'>
                                    <div className='space-y-0.5'>
                                        <Label className='flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs'>
                                            <Zap className='w-3 h-3' />
                                            {t('admin.subdomains.mappingsTitle')}
                                        </Label>
                                        <p className='text-[10px] text-muted-foreground/60'>
                                            {t('admin.subdomains.mappingsDescription') ||
                                                'Configure spell routing rules.'}
                                        </p>
                                    </div>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        onClick={addSpell}
                                        className='h-8 px-3 border-primary/20 hover:bg-primary/5 hover:border-primary/40'
                                    >
                                        <Plus className='w-3 h-3 mr-1.5' />
                                        {t('admin.subdomains.addMapping')}
                                    </Button>
                                </div>

                                <div className='space-y-6'>
                                    {domainForm.spells.map((mapping, idx) => (
                                        <div
                                            key={idx}
                                            className='group/mapping border border-white/5 bg-white/2 rounded-3xl p-6 transition-all hover:bg-white/4 hover:border-white/10'
                                        >
                                            <div className='flex items-start justify-between gap-4 mb-6'>
                                                <div className='flex-1'>
                                                    <Label className='text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2 block'>
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
                                                    <Trash2 className='w-4 h-4' />
                                                </Button>
                                            </div>

                                            <div className='grid grid-cols-2 lg:grid-cols-4 gap-4'>
                                                <div className='space-y-2'>
                                                    <Label className='text-[10px] uppercase tracking-wider text-muted-foreground/60 font-bold ml-1'>
                                                        {t('admin.subdomains.protocolService')}
                                                    </Label>
                                                    <Input
                                                        value={mapping.protocol_service ?? ''}
                                                        onChange={(e) =>
                                                            updateSpell(idx, 'protocol_service', e.target.value)
                                                        }
                                                        className='h-10 text-sm px-4'
                                                    />
                                                </div>
                                                <div className='space-y-2'>
                                                    <Label className='text-[10px] uppercase tracking-wider text-muted-foreground/60 font-bold ml-1'>
                                                        {t('admin.subdomains.protocolType')}
                                                    </Label>
                                                    <Select
                                                        value={mapping.protocol_type}
                                                        onChange={(e) =>
                                                            updateSpell(idx, 'protocol_type', e.target.value)
                                                        }
                                                        className='h-10 text-sm px-4'
                                                    >
                                                        <option value='tcp'>TCP</option>
                                                        <option value='udp'>UDP</option>
                                                        <option value='tls'>TLS</option>
                                                    </Select>
                                                </div>
                                                <div className='space-y-2'>
                                                    <Label className='text-[10px] uppercase tracking-wider text-muted-foreground/60 font-bold ml-1'>
                                                        {t('admin.subdomains.priority')}
                                                    </Label>
                                                    <Input
                                                        type='number'
                                                        value={mapping.priority}
                                                        onChange={(e) =>
                                                            updateSpell(idx, 'priority', parseInt(e.target.value))
                                                        }
                                                        className='h-10 text-sm px-4'
                                                    />
                                                </div>
                                                <div className='space-y-2'>
                                                    <Label className='text-[10px] uppercase tracking-wider text-muted-foreground/60 font-bold ml-1'>
                                                        {t('admin.subdomains.ttl')}
                                                    </Label>
                                                    <Input
                                                        type='number'
                                                        value={mapping.ttl}
                                                        onChange={(e) =>
                                                            updateSpell(idx, 'ttl', parseInt(e.target.value))
                                                        }
                                                        className='h-10 text-sm px-4'
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {domainForm.spells.length === 0 && (
                                        <div className='text-center py-12 border border-dashed border-white/5 rounded-3xl bg-white/1'>
                                            <Zap className='w-8 h-8 mx-auto text-muted-foreground/20 mb-3' />
                                            <p className='text-sm text-muted-foreground/40'>
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

            {/* Details Sheet */}
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
                                        className='flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border/50 hover:bg-muted/50 transition-colors'
                                    >
                                        <div className='space-y-1 min-w-0'>
                                            <div className='flex items-center gap-2 font-mono text-sm text-primary font-bold truncate'>
                                                <Globe className='w-3 h-3' />
                                                {entry.subdomain}.{selectedDomain?.domain}
                                            </div>
                                            <div className='flex items-center gap-3 text-[10px] text-muted-foreground'>
                                                <span className='flex items-center gap-1 bg-zinc-500/10 px-2 py-0.5 rounded-full'>
                                                    {entry.record_type}
                                                </span>
                                                <span className='flex items-center gap-1'>
                                                    <Server className='w-2 h-2' />
                                                    Port: {entry.port || 'Auto'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className='text-right text-[10px] text-muted-foreground tabular-nums'>
                                            {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : 'N/A'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className='text-center py-12 bg-muted/20 border border-dashed rounded-3xl'>
                                <Globe className='w-8 h-8 mx-auto text-muted-foreground opacity-20 mb-3' />
                                <p className='text-sm text-muted-foreground'>{t('admin.subdomains.noSubdomains')}</p>
                            </div>
                        )}
                    </div>
                </div>
            </Sheet>
            <WidgetRenderer widgets={getWidgets('admin-subdomains', 'bottom-of-page')} />
        </div>
    );
}
