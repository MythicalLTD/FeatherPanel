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
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetContent } from '@/components/ui/sheet';
import { Input } from '@/components/featherui/Input';
import { toast } from 'sonner';
import {
    Server,
    ArrowLeft,
    Save,
    Database,
    Network,
    Shield,
    Settings2,
    Terminal,
    Globe,
    Loader2,
    Search as SearchIcon,
    MapPin,
    ChevronLeft,
    ChevronRight,
    HeartPulse,
    Stethoscope,
    Package,
    ArrowUpCircle,
} from 'lucide-react';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { safeBack } from '@/lib/safe-back';

import { DetailsTab } from './DetailsTab';
import { ConfigurationTab } from './ConfigurationTab';
import { NetworkTab } from './NetworkTab';
import { RemoteSftpTab } from './RemoteSftpTab';
import { AdvancedTab } from './AdvancedTab';
import { FeatherQuilldTab } from './FeatherQuilldTab';
import { StatusTab } from './StatusTab';
import { DiagnosticsTab } from './DiagnosticsTab';
import { PackageManagerTab } from './PackageManagerTab';
import { SelfUpdateTab } from './SelfUpdateTab';
import { HostingSetupTab } from './HostingSetupTab';
import {
    type WebNodeForm,
    defaultWebNodeForm,
    buildWebNodeSubmitPayload,
    validateWebNodeForm,
    parseCustomHeaderEntries,
    getFirstWebNodeErrorTab,
    getWebNodeTabLabelKey,
} from '../../types';

const WEB_NODE_EDIT_TABS = new Set([
    'status',
    'diagnostics',
    'packages',
    'self-update',
    'hosting',
    'details',
    'config',
    'network',
    'remote',
    'advanced',
    'quilld',
]);

function resolveWebNodeEditTab(tab: string | null): string {
    return tab && WEB_NODE_EDIT_TABS.has(tab) ? tab : 'details';
}

interface Location {
    id: number;
    name: string;
    description?: string;
    type: 'game' | 'vps' | 'web';
}

export default function EditWebNodePage() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const id = params?.id as string;
    const tabFromUrl = searchParams.get('tab');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocationName, setSelectedLocationName] = useState('');
    const [resettingToken, setResettingToken] = useState(false);
    const [configRefreshKey, setConfigRefreshKey] = useState(0);
    const [activeTab, setActiveTab] = useState(() => resolveWebNodeEditTab(tabFromUrl));
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [locationPagination, setLocationPagination] = useState({
        current_page: 1,
        per_page: 10,
        total_records: 0,
        total_pages: 1,
        has_next: false,
        has_prev: false,
    });
    const [locationSearch, setLocationSearch] = useState('');
    const [debouncedLocationSearch, setDebouncedLocationSearch] = useState('');

    const [form, setForm] = useState<WebNodeForm>(defaultWebNodeForm());
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-web-node-edit');

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
            const currentPage = locationPagination.current_page;
            const perPage = locationPagination.per_page;

            const { data } = await axios.get('/api/admin/locations', {
                params: {
                    page: currentPage,
                    limit: perPage,
                    search: debouncedLocationSearch || undefined,
                    type: 'web',
                },
            });

            setLocations((data.data.locations || []) as Location[]);
            if (data.data.pagination) {
                setLocationPagination((prev) => ({
                    ...prev,
                    ...data.data.pagination,
                    current_page: data.data.pagination.current_page ?? currentPage,
                    per_page: data.data.pagination.per_page ?? perPage,
                }));
            }
        } catch {
            toast.error(t('admin.webNodes.messages.fetch_locations_failed'));
        }
    }, [locationPagination.current_page, locationPagination.per_page, debouncedLocationSearch, t]);

    useEffect(() => {
        if (locationModalOpen) {
            fetchLocations();
        }
    }, [locationModalOpen, fetchLocations]);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const { data: nodeData } = await axios.get(`/api/admin/web-nodes/${id}`);
            const node = nodeData.data?.web_node;

            if (!node) {
                toast.error(t('admin.webNodes.messages.fetch_failed'));
                router.push('/admin/web-nodes');
                return;
            }

            if (node.location_id) {
                try {
                    const locationRes = await axios.get(`/api/admin/locations/${node.location_id}`);
                    if (locationRes.data?.data?.location) {
                        setSelectedLocationName(locationRes.data.data.location.name);
                    }
                } catch (error) {
                    console.error('Error fetching location:', error);
                }
            }

            setForm({
                name: node.name || '',
                description: node.description || '',
                location_id: String(node.location_id || ''),
                fqdn: node.fqdn || '',
                scheme: node.scheme || 'https',
                public: node.public ? 'true' : 'false',
                behind_proxy: node.behind_proxy ? 'true' : 'false',
                maintenance_mode: node.maintenance_mode ? 'true' : 'false',
                memory: Number(node.memory ?? 1024),
                memory_overallocate: Number(node.memory_overallocate ?? 0),
                disk: Number(node.disk ?? 4096),
                disk_overallocate: Number(node.disk_overallocate ?? 0),
                upload_size: Number(node.upload_size ?? 100),
                daemonListen: Number(node.daemonListen ?? 8989),
                daemonBase: node.daemonBase || '/var/lib/featherquilld',
                websitesPath: node.websitesPath || '',
                backupsPath: node.backupsPath || '',
                backupsProvider: node.backupsProvider || 'local',
                backupsS3Endpoint: node.backupsS3Endpoint || '',
                backupsS3Region: node.backupsS3Region || 'us-east-1',
                backupsS3Bucket: node.backupsS3Bucket || '',
                backupsS3AccessKey: node.backupsS3AccessKey || '',
                backupsS3SecretKey: node.backupsS3SecretKey || '',
                backupsS3Prefix: node.backupsS3Prefix || 'webspaces/',
                backupsS3ForcePathStyle:
                    node.backupsS3ForcePathStyle === true || node.backupsS3ForcePathStyle === 1 ? 'true' : 'false',
                backupsResticRepository: node.backupsResticRepository || '',
                backupsResticPassword: node.backupsResticPassword || '',
                backupsResticBinary: node.backupsResticBinary || '',
                backupsPbsRepository: node.backupsPbsRepository || '',
                backupsPbsPassword: node.backupsPbsPassword || '',
                backupsPbsFingerprint: node.backupsPbsFingerprint || '',
                backupsPbsBinary: node.backupsPbsBinary || '',
                addonsPath: node.addonsPath || '',
                quilldConfigOverrides: node.quilldConfigOverrides || '',
                remoteTimeout: Number(node.remoteTimeout ?? 30),
                remoteRetryLimit: Number(node.remoteRetryLimit ?? 10),
                remoteCustomHeaderEntries: parseCustomHeaderEntries(node.remoteCustomHeaders, { fromApi: true }),
                sftpEnabled: node.sftpEnabled ? 'true' : 'false',
                sftpKeyAlgorithm: node.sftpKeyAlgorithm || 'ssh-ed25519',
                sftpPort: Number(node.sftpPort ?? 2222),
                sftpDisablePasswordAuth: node.sftpDisablePasswordAuth ? 'true' : 'false',
                proxyEnabled: node.proxyEnabled === false || node.proxyEnabled === 0 ? 'false' : 'true',
                proxyProvider: node.proxyProvider || 'caddy',
                acmeEmail: node.acmeEmail || '',
                acmeStaging: node.acmeStaging === true || node.acmeStaging === 1 ? 'true' : 'false',
                backendPortMin: Number(node.backendPortMin ?? 20000),
                backendPortMax: Number(node.backendPortMax ?? 29999),
                proxyBackendHost: node.proxyBackendHost || '127.0.0.1',
                proxyBackendBindHost: node.proxyBackendBindHost || '127.0.0.1',
            });
        } catch (error) {
            console.error('Error loading web node:', error);
            toast.error(t('admin.webNodes.messages.fetch_failed'));
            router.push('/admin/web-nodes');
        } finally {
            setLoading(false);
        }
    }, [id, router, t]);

    useEffect(() => {
        if (id) void fetchInitialData();
    }, [id, fetchInitialData]);

    useEffect(() => {
        setActiveTab(resolveWebNodeEditTab(tabFromUrl));
    }, [tabFromUrl]);

    const handleTabChange = useCallback(
        (tab: string) => {
            setActiveTab(tab);
            const path =
                tab === 'details'
                    ? `/admin/web-nodes/${id}/edit`
                    : `/admin/web-nodes/${id}/edit?tab=${encodeURIComponent(tab)}`;
            router.replace(path, { scroll: false });
        },
        [id, router],
    );

    const tabs = useMemo(
        () => [
            { id: 'status', label: t('admin.webNodes.status.tab'), icon: HeartPulse },
            { id: 'diagnostics', label: t('admin.webNodes.diagnostics.tab'), icon: Stethoscope },
            { id: 'packages', label: t('admin.webNodes.packages.tab'), icon: Package },
            { id: 'self-update', label: t('admin.webNodes.selfUpdate.tab'), icon: ArrowUpCircle },
            { id: 'hosting', label: t('admin.webNodes.hostingSetup.tab'), icon: Globe },
            { id: 'details', label: t('admin.webNodes.form.basic_details'), icon: Database },
            { id: 'config', label: t('admin.webNodes.form.configuration'), icon: Settings2 },
            { id: 'network', label: t('admin.webNodes.form.network'), icon: Network },
            { id: 'remote', label: t('admin.webNodes.form.remote_sftp'), icon: Globe },
            { id: 'advanced', label: t('admin.webNodes.form.advanced'), icon: Shield },
            { id: 'quilld', label: t('admin.webNodes.form.quilld_config'), icon: Terminal },
        ],
        [t],
    );

    useEffect(() => {
        if (!loading && !tabs.some((tab) => tab.id === activeTab)) {
            setActiveTab('details');
        }
    }, [activeTab, tabs, loading]);

    const validate = useCallback(() => {
        const newErrors = validateWebNodeForm(form, t);
        setErrors(newErrors);
        return { ok: Object.keys(newErrors).length === 0, errors: newErrors };
    }, [form, t]);

    const handleSave = async () => {
        const { ok, errors: validationErrors } = validate();
        if (!ok) {
            const errorTab = getFirstWebNodeErrorTab(validationErrors);
            if (errorTab) {
                setActiveTab(errorTab);
                toast.error(
                    t('admin.webNodes.form.save_validation_failed_tab', {
                        tab: t(getWebNodeTabLabelKey(errorTab)),
                    }),
                );
                window.requestAnimationFrame(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                });
            }
            return;
        }
        setSaving(true);
        try {
            await axios.patch(`/api/admin/web-nodes/${id}`, buildWebNodeSubmitPayload(form));
            setConfigRefreshKey((k) => k + 1);
            toast.success(t('admin.webNodes.messages.updated'));
            void fetchInitialData();
        } catch (error) {
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.webNodes.messages.update_failed'));
            }
        } finally {
            setSaving(false);
        }
    };

    const handleResetToken = async () => {
        setResettingToken(true);
        try {
            await axios.post(`/api/admin/web-nodes/${id}/reset-token`);
            setConfigRefreshKey((k) => k + 1);
            toast.success(t('admin.webNodes.daemon.reset_key_success'));
            void fetchInitialData();
        } catch (error) {
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.webNodes.daemon.reset_key_failed'));
            }
        } finally {
            setResettingToken(false);
        }
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center p-12'>
                <Loader2 className='text-primary h-8 w-8 animate-spin' />
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-web-node-edit', 'top-of-page')} context={{ id }} />

            <PageHeader
                title={form.name || t('admin.webNodes.form.edit_title')}
                description={
                    form.fqdn
                        ? `${t('admin.webNodes.form.edit_description')} · ${form.fqdn}`
                        : t('admin.webNodes.form.edit_description')
                }
                icon={Server}
                actions={
                    <div className='flex flex-wrap gap-2'>
                        <Button variant='outline' onClick={() => safeBack(router, '/admin/web-nodes')}>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('common.back')}
                        </Button>
                        <Button variant='outline' onClick={() => handleTabChange('diagnostics')}>
                            <Stethoscope className='mr-2 h-4 w-4' />
                            {t('admin.webNodes.diagnostics.tab')}
                        </Button>
                        <Button variant='outline' onClick={() => handleTabChange('packages')}>
                            <Package className='mr-2 h-4 w-4' />
                            {t('admin.webNodes.packages.tab')}
                        </Button>
                        <Button variant='outline' onClick={() => handleTabChange('quilld')}>
                            <Terminal className='mr-2 h-4 w-4' />
                            {t('admin.webNodes.form.quilld_config')}
                        </Button>
                        <Button onClick={() => handleSave()} loading={saving}>
                            <Save className='mr-2 h-4 w-4' />
                            {t('admin.webNodes.form.submit_save')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-web-node-edit', 'after-header')} context={{ id }} />

            <div className='block'>
                <Tabs
                    value={activeTab}
                    onValueChange={handleTabChange}
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
                        <TabsContent value='status' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                            <StatusTab nodeId={id} />
                        </TabsContent>

                        <TabsContent value='diagnostics' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                            <DiagnosticsTab nodeId={id} onOpenQuilldTab={() => handleTabChange('quilld')} />
                        </TabsContent>

                        <TabsContent value='packages' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                            <PackageManagerTab nodeId={id} />
                        </TabsContent>

                        <TabsContent value='self-update' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                            <SelfUpdateTab nodeId={id} />
                        </TabsContent>

                        <TabsContent value='hosting' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                            <HostingSetupTab nodeId={id} />
                        </TabsContent>

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

                        <TabsContent value='quilld' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                            <FeatherQuilldTab
                                nodeId={id}
                                handleResetToken={handleResetToken}
                                resetting={resettingToken}
                                configRefreshKey={configRefreshKey}
                            />
                        </TabsContent>

                        {activeTab !== 'quilld' &&
                            activeTab !== 'status' &&
                            activeTab !== 'diagnostics' &&
                            activeTab !== 'packages' &&
                            activeTab !== 'hosting' && (
                            <div className='flex justify-end'>
                                <Button onClick={() => handleSave()} loading={saving}>
                                    <Save className='mr-2 h-4 w-4' />
                                    {t('admin.webNodes.form.submit_save')}
                                </Button>
                            </div>
                        )}
                    </div>
                </Tabs>
            </div>

            <Sheet open={locationModalOpen} onOpenChange={setLocationModalOpen}>
                <SheetContent className='sm:max-w-2xl'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.webNodes.form.select_location')}</SheetTitle>
                        <SheetDescription>
                            {t('admin.webNodes.form.select_location_description', {
                                total: String(locationPagination.total_records || 0),
                            })}
                        </SheetDescription>
                    </SheetHeader>

                    <div className='mt-6 space-y-4'>
                        <div className='relative'>
                            <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform' />
                            <Input
                                placeholder={t('admin.webNodes.form.search_locations')}
                                value={locationSearch}
                                onChange={(e) => setLocationSearch(e.target.value)}
                                className='pl-10'
                            />
                        </div>

                        {locationPagination.total_pages > 1 && (
                            <div className='border-border bg-muted/30 flex items-center justify-between gap-2 rounded-lg border px-3 py-2'>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={!locationPagination.has_prev}
                                    onClick={() =>
                                        setLocationPagination((prev) => ({
                                            ...prev,
                                            current_page: prev.current_page - 1,
                                        }))
                                    }
                                    className='h-8 gap-1'
                                >
                                    <ChevronLeft className='h-3 w-3' />
                                    {t('common.previous')}
                                </Button>
                                <span className='text-xs font-medium'>
                                    {locationPagination.current_page} / {locationPagination.total_pages}
                                </span>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    disabled={!locationPagination.has_next}
                                    onClick={() =>
                                        setLocationPagination((prev) => ({
                                            ...prev,
                                            current_page: prev.current_page + 1,
                                        }))
                                    }
                                    className='h-8 gap-1'
                                >
                                    {t('common.next')}
                                    <ChevronRight className='h-3 w-3' />
                                </Button>
                            </div>
                        )}

                        <div className='max-h-[calc(100vh-300px)] space-y-2 overflow-y-auto'>
                            {locations.length === 0 ? (
                                <div className='text-muted-foreground py-8 text-center'>
                                    {t('admin.webNodes.form.no_locations_found')}
                                </div>
                            ) : (
                                locations.map((location) => (
                                    <button
                                        key={location.id}
                                        type='button'
                                        onClick={() => {
                                            setForm((prev) => ({ ...prev, location_id: location.id.toString() }));
                                            setSelectedLocationName(location.name);
                                            setLocationModalOpen(false);
                                        }}
                                        className='border-border/50 hover:bg-muted/50 hover:border-primary/50 w-full rounded-lg border p-3 text-left transition-colors'
                                    >
                                        <div className='flex items-start gap-3'>
                                            <div className='bg-primary/10 mt-0.5 rounded-lg p-2'>
                                                <MapPin className='text-primary h-5 w-5' />
                                            </div>
                                            <div className='min-w-0 flex-1'>
                                                <div className='font-medium'>{location.name}</div>
                                                {location.description && (
                                                    <div className='text-muted-foreground mt-1 text-sm'>
                                                        {location.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <WidgetRenderer widgets={getWidgets('admin-web-node-edit', 'bottom-of-page')} context={{ id }} />
        </div>
    );
}
