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

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    Server,
    ArrowLeft,
    Save,
    Database,
    Network,
    Shield,
    Settings2,
    Globe,
    Terminal,
    MapPin,
    ChevronLeft,
    ChevronRight,
    Plus,
} from 'lucide-react';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { safeBack } from '@/lib/safe-back';

import { DetailsTab } from '../[id]/edit/DetailsTab';
import { ConfigurationTab } from '../[id]/edit/ConfigurationTab';
import { NetworkTab } from '../[id]/edit/NetworkTab';
import { RemoteSftpTab } from '../[id]/edit/RemoteSftpTab';
import { AdvancedTab } from '../[id]/edit/AdvancedTab';
import {
    type WebNodeForm,
    defaultWebNodeForm,
    buildWebNodeSubmitPayload,
    validateWebNodeForm,
    getFirstWebNodeErrorTab,
    getWebNodeTabLabelKey,
} from '../types';

interface Location {
    id: number;
    name: string;
    description?: string;
    type: 'game' | 'vps' | 'web';
}

export default function CreateWebNodePage() {
    const { t } = useTranslation();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('details');
    const [locations, setLocations] = useState<Location[]>([]);
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [locationPickerMode, setLocationPickerMode] = useState<'select' | 'create'>('select');
    const [newLocationForm, setNewLocationForm] = useState({
        name: '',
        description: '',
        flag_code: '__NONE__' as string,
    });
    const [countryCodes, setCountryCodes] = useState<Record<string, string>>({});
    const [creatingLocation, setCreatingLocation] = useState(false);
    const [selectedLocationName, setSelectedLocationName] = useState('');
    const [locationSearch, setLocationSearch] = useState('');
    const [debouncedLocationSearch, setDebouncedLocationSearch] = useState('');
    const [locationPagination, setLocationPagination] = useState({
        current_page: 1,
        per_page: 10,
        total_records: 0,
        total_pages: 0,
        has_next: false,
        has_prev: false,
    });

    const [form, setForm] = useState<WebNodeForm>(defaultWebNodeForm());
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-web-nodes-create');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedLocationSearch(locationSearch);
            setLocationPagination((prev) => ({ ...prev, current_page: 1 }));
        }, 500);
        return () => clearTimeout(timer);
    }, [locationSearch]);

    const fetchLocations = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/admin/locations', {
                params: {
                    page: locationPagination.current_page,
                    limit: locationPagination.per_page,
                    search: debouncedLocationSearch || undefined,
                    type: 'web',
                },
            });

            setLocations((data.data.locations || []) as Location[]);
            if (data.data.pagination) {
                setLocationPagination((prev) => ({
                    ...prev,
                    ...data.data.pagination,
                }));
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
        }
    }, [locationPagination.current_page, locationPagination.per_page, debouncedLocationSearch]);

    useEffect(() => {
        if (locationModalOpen) {
            fetchLocations();
        }
    }, [locationModalOpen, locationPagination.current_page, debouncedLocationSearch, fetchLocations]);

    useEffect(() => {
        if (!locationModalOpen || locationPickerMode !== 'create') return;
        let cancelled = false;
        const loadCountryCodes = async () => {
            try {
                const { data } = await axios.get('/api/system/country-codes');
                if (cancelled || !data?.success || !data.data?.country_codes) return;
                const sorted = Object.entries(data.data.country_codes as Record<string, string>).sort((a, b) =>
                    a[1].localeCompare(b[1]),
                );
                setCountryCodes(Object.fromEntries(sorted));
            } catch {
                if (!cancelled) {
                    toast.error(t('admin.locations.messages.country_codes_failed'));
                }
            }
        };
        void loadCountryCodes();
        return () => {
            cancelled = true;
        };
    }, [locationModalOpen, locationPickerMode, t]);

    const tabs = useMemo(
        () => [
            { id: 'details', label: t('admin.webNodes.form.basic_details'), icon: Database },
            { id: 'config', label: t('admin.webNodes.form.configuration'), icon: Settings2 },
            { id: 'network', label: t('admin.webNodes.form.network'), icon: Network },
            { id: 'remote', label: t('admin.webNodes.form.remote_sftp'), icon: Globe },
            { id: 'advanced', label: t('admin.webNodes.form.advanced'), icon: Shield },
        ],
        [t],
    );

    const validate = useCallback(() => {
        const newErrors = validateWebNodeForm(form, t, { validateFqdnFormat: true });
        setErrors(newErrors);
        return { ok: Object.keys(newErrors).length === 0, errors: newErrors };
    }, [form, t]);

    const handleSubmit = async () => {
        const { ok, errors: validationErrors } = validate();
        if (!ok) {
            const errorTab = getFirstWebNodeErrorTab(validationErrors);
            if (errorTab) {
                setActiveTab(errorTab);
                toast.error(
                    t('admin.webNodes.form.create_validation_failed_tab', {
                        tab: t(getWebNodeTabLabelKey(errorTab)),
                    }),
                );
                window.requestAnimationFrame(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            } else {
                toast.error(t('admin.webNodes.form.create_validation_failed'));
            }
            return;
        }

        setLoading(true);
        try {
            const { data } = await axios.put('/api/admin/web-nodes', buildWebNodeSubmitPayload(form));
            toast.success(t('admin.webNodes.messages.created'));
            const nodeId = data?.data?.web_node?.id;
            if (nodeId) {
                router.push(`/admin/web-nodes/${nodeId}/edit?tab=quilld`);
            } else {
                router.push('/admin/web-nodes');
            }
        } catch (error) {
            console.error('Error creating web node:', error);
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.webNodes.messages.create_failed'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateLocationInline = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newLocationForm.name.trim();
        if (name.length < 2) {
            toast.error(t('admin.webNodes.form.create_location_name_required'));
            return;
        }
        setCreatingLocation(true);
        try {
            const payload = {
                name,
                type: 'web' as const,
                ...(newLocationForm.description.trim() ? { description: newLocationForm.description.trim() } : {}),
                flag_code: newLocationForm.flag_code === '__NONE__' ? null : newLocationForm.flag_code || null,
            };
            const { data } = await axios.put('/api/admin/locations', payload);
            const loc = data?.data?.location as { id: number; name: string } | undefined;
            if (!loc?.id) {
                toast.error(t('admin.locations.messages.create_failed'));
                return;
            }
            setForm((prev) => ({ ...prev, location_id: loc.id.toString() }));
            setSelectedLocationName(loc.name);
            setLocationPickerMode('select');
            setNewLocationForm({ name: '', description: '', flag_code: '__NONE__' });
            setLocationModalOpen(false);
            toast.success(t('admin.locations.messages.created'));
        } catch (error: unknown) {
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.locations.messages.create_failed'));
            }
        } finally {
            setCreatingLocation(false);
        }
    };

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-web-nodes-create', 'top-of-page')} />

            <PageHeader
                title={t('admin.webNodes.form.create_title')}
                description={t('admin.webNodes.form.create_description')}
                icon={Server}
                actions={
                    <div className='flex flex-wrap gap-2'>
                        <Button variant='outline' onClick={() => safeBack(router, '/admin/web-nodes')}>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('common.back')}
                        </Button>
                        <Button onClick={() => handleSubmit()} loading={loading}>
                            <Save className='mr-2 h-4 w-4' />
                            {t('admin.webNodes.form.submit_create')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-web-nodes-create', 'after-header')} />

            <div className='block'>
                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    orientation='vertical'
                    className='flex w-full flex-col gap-6 md:flex-row'
                >
                    <aside className='w-full shrink-0 overflow-x-auto pb-2 md:w-64 md:overflow-visible md:pb-0'>
                        <TabsList className='bg-card/30 border-border/50 flex h-auto w-max flex-row gap-2 rounded-2xl border p-2 md:w-full md:flex-col md:gap-1'>
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <TabsTrigger
                                        key={tab.id}
                                        value={tab.id}
                                        className='data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/10 h-auto w-auto justify-start rounded-xl border border-transparent px-4 py-3 text-sm font-normal whitespace-nowrap transition-all data-[state=active]:font-medium md:w-full md:text-base'
                                    >
                                        <Icon className='mr-3 h-4 w-4 shrink-0' />
                                        {tab.label}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </aside>

                    <div className='min-w-0 flex-1 space-y-6'>
                        <TabsContent value='details' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                            <DetailsTab
                                form={form}
                                setForm={setForm}
                                errors={errors}
                                selectedLocationName={selectedLocationName}
                                locations={locations}
                                setLocationModalOpen={setLocationModalOpen}
                                fetchLocations={fetchLocations}
                            />
                        </TabsContent>

                        <TabsContent value='config' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                            <ConfigurationTab form={form} setForm={setForm} errors={errors} />
                        </TabsContent>

                        <TabsContent value='network' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                            <NetworkTab form={form} setForm={setForm} errors={errors} />
                        </TabsContent>

                        <TabsContent value='remote' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                            <RemoteSftpTab form={form} setForm={setForm} errors={errors} />
                        </TabsContent>

                        <TabsContent value='advanced' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                            <AdvancedTab form={form} setForm={setForm} errors={errors} />
                        </TabsContent>

                        <PageCard
                            title={t('admin.webNodes.form.card_quilld_after_create')}
                            description={t('admin.webNodes.form.card_quilld_after_create_description')}
                            icon={Terminal}
                        >
                            <p className='text-muted-foreground text-sm leading-relaxed'>
                                {t('admin.webNodes.form.quilld_after_create_hint')}
                            </p>
                        </PageCard>

                        <div className='flex justify-end gap-3'>
                            <Button
                                type='button'
                                variant='outline'
                                onClick={() => safeBack(router, '/admin/web-nodes')}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button type='button' onClick={() => handleSubmit()} loading={loading}>
                                <Save className='mr-2 h-4 w-4' />
                                {t('admin.webNodes.form.submit_create')}
                            </Button>
                        </div>
                    </div>
                </Tabs>
            </div>

            <Sheet open={locationModalOpen} onOpenChange={setLocationModalOpen}>
                <SheetContent className='flex w-full flex-col sm:max-w-lg'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.webNodes.form.select_location')}</SheetTitle>
                        <SheetDescription>
                            {t('admin.webNodes.form.select_location_description', {
                                total: String(locationPagination.total_records || 0),
                            })}
                        </SheetDescription>
                    </SheetHeader>

                    <div className='mt-4 flex gap-2'>
                        <Button
                            type='button'
                            size='sm'
                            variant={locationPickerMode === 'select' ? 'default' : 'outline'}
                            onClick={() => setLocationPickerMode('select')}
                        >
                            {t('admin.webNodes.form.location_picker_existing')}
                        </Button>
                        <Button
                            type='button'
                            size='sm'
                            variant={locationPickerMode === 'create' ? 'default' : 'outline'}
                            onClick={() => setLocationPickerMode('create')}
                        >
                            <Plus className='mr-1 h-3.5 w-3.5' />
                            {t('admin.webNodes.form.location_picker_create')}
                        </Button>
                    </div>

                    {locationPickerMode === 'select' ? (
                        <div className='mt-4 flex min-h-0 flex-1 flex-col gap-4'>
                            <Input
                                placeholder={t('admin.webNodes.form.search_locations')}
                                value={locationSearch}
                                onChange={(e) => setLocationSearch(e.target.value)}
                            />
                            <div className='min-h-0 flex-1 space-y-2 overflow-y-auto'>
                                {locations.length === 0 ? (
                                    <p className='text-muted-foreground py-8 text-center text-sm'>
                                        {t('admin.webNodes.form.no_locations_found')}
                                    </p>
                                ) : (
                                    locations.map((loc) => (
                                        <button
                                            key={loc.id}
                                            type='button'
                                            onClick={() => {
                                                setForm((prev) => ({ ...prev, location_id: loc.id.toString() }));
                                                setSelectedLocationName(loc.name);
                                                setLocationModalOpen(false);
                                            }}
                                            className={cn(
                                                'hover:bg-muted/50 w-full rounded-xl border p-3 text-left transition-colors',
                                                form.location_id === loc.id.toString()
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-border/40',
                                            )}
                                        >
                                            <div className='flex items-center gap-2'>
                                                <MapPin className='text-primary h-4 w-4' />
                                                <span className='font-medium'>{loc.name}</span>
                                            </div>
                                            {loc.description && (
                                                <p className='text-muted-foreground mt-1 line-clamp-1 text-xs'>
                                                    {loc.description}
                                                </p>
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                            {locationPagination.total_pages > 1 && (
                                <div className='flex items-center justify-between'>
                                    <Button
                                        type='button'
                                        size='sm'
                                        variant='outline'
                                        disabled={!locationPagination.has_prev}
                                        onClick={() =>
                                            setLocationPagination((prev) => ({
                                                ...prev,
                                                current_page: prev.current_page - 1,
                                            }))
                                        }
                                    >
                                        <ChevronLeft className='h-4 w-4' />
                                    </Button>
                                    <span className='text-sm'>
                                        {locationPagination.current_page} / {locationPagination.total_pages}
                                    </span>
                                    <Button
                                        type='button'
                                        size='sm'
                                        variant='outline'
                                        disabled={!locationPagination.has_next}
                                        onClick={() =>
                                            setLocationPagination((prev) => ({
                                                ...prev,
                                                current_page: prev.current_page + 1,
                                            }))
                                        }
                                    >
                                        <ChevronRight className='h-4 w-4' />
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleCreateLocationInline} className='mt-4 space-y-4'>
                            <p className='text-muted-foreground text-xs'>
                                {t('admin.webNodes.form.create_location_hint')}
                            </p>
                            <div className='space-y-2'>
                                <Label>{t('admin.locations.form.name')}</Label>
                                <Input
                                    value={newLocationForm.name}
                                    onChange={(e) => setNewLocationForm({ ...newLocationForm, name: e.target.value })}
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.locations.form.description')}</Label>
                                <Textarea
                                    value={newLocationForm.description}
                                    onChange={(e) =>
                                        setNewLocationForm({ ...newLocationForm, description: e.target.value })
                                    }
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label>{t('admin.locations.form.flag')}</Label>
                                <Select
                                    value={newLocationForm.flag_code}
                                    onChange={(e) =>
                                        setNewLocationForm({ ...newLocationForm, flag_code: e.target.value })
                                    }
                                >
                                    <option value='__NONE__'>{t('admin.locations.form.flag_none')}</option>
                                    {Object.entries(countryCodes).map(([code, name]) => (
                                        <option key={code} value={code}>
                                            {name}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <Button type='submit' loading={creatingLocation} className='w-full'>
                                {t('admin.webNodes.form.create_location_submit')}
                            </Button>
                        </form>
                    )}
                </SheetContent>
            </Sheet>

            <WidgetRenderer widgets={getWidgets('admin-web-nodes-create', 'bottom-of-page')} />
        </div>
    );
}
