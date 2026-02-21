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
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetContent } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
    Server,
    ArrowLeft,
    Save,
    Database,
    Network,
    Shield,
    Settings2,
    Loader2,
    LayoutGrid,
    Zap,
    Search as SearchIcon,
    MapPin,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

import { DetailsTab } from './DetailsTab';
import { ConfigurationTab } from './ConfigurationTab';
import { NetworkTab } from './NetworkTab';
import { AdvancedTab } from './AdvancedTab';
import { WingsTab } from './WingsTab';
import { AllocationsTab } from './AllocationsTab';

import { TerminalTab } from '../components/TerminalTab';
import { ModulesTab } from '../components/ModulesTab';
import { WingsConfigTab } from '../components/WingsConfigTab';
import { DockerTab } from '../components/DockerTab';
import { DiagnosticsTab } from '../components/DiagnosticsTab';
import { UtilizationTab } from '../components/UtilizationTab';
import { SystemInfoTab } from '../components/SystemInfoTab';
import { SelfUpdateTab } from '../components/SelfUpdateTab';
import { UtilizationResponse, DockerResponse, SystemInfoResponse, NodeData, Location } from '../types';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

export interface NodeForm {
    name: string;
    description: string;
    fqdn: string;
    location_id: string;
    public: string;
    scheme: string;
    behind_proxy: string;
    maintenance_mode: string;
    memory: number;
    memory_overallocate: number;
    disk: number;
    disk_overallocate: number;
    upload_size: number;
    daemonListen: number;
    daemonSFTP: number;
    daemonBase: string;
    public_ip_v4: string;
    public_ip_v6: string;
}

export default function EditNodePage() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const nodeId = params.id;

    const tabFromUrl = searchParams.get('tab');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocationName, setSelectedLocationName] = useState<string>('');
    const [nodeData, setNodeData] = useState<NodeData | null>(null);
    const [resetting, setResetting] = useState(false);
    const [activeTab, setActiveTab] = useState(tabFromUrl === 'wings' ? 'wings' : 'details');
    const [locationModalOpen, setLocationModalOpen] = useState(false);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-nodes-edit');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

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

    const [form, setForm] = useState<NodeForm>({
        name: '',
        description: '',
        fqdn: '',
        location_id: '',
        public: 'true',
        scheme: 'https',
        behind_proxy: 'false',
        maintenance_mode: 'false',
        memory: 0,
        memory_overallocate: 0,
        disk: 0,
        disk_overallocate: 0,
        upload_size: 100,
        daemonListen: 8080,
        daemonSFTP: 2022,
        daemonBase: '/var/lib/featherpanel/volumes',
        public_ip_v4: '',
        public_ip_v6: '',
    });

    const [systemInfo, setSystemInfo] = useState<{
        data: SystemInfoResponse | null;
        loading: boolean;
        error: string | null;
    }>({ data: null, loading: false, error: null });

    const [utilization, setUtilization] = useState<{
        data: UtilizationResponse | null;
        loading: boolean;
        error: string | null;
    }>({ data: null, loading: false, error: null });

    const [dockerUsage, setDockerUsage] = useState<{
        data: DockerResponse | null;
        loading: boolean;
        error: string | null;
    }>({ data: null, loading: false, error: null });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const nodeRes = await axios.get(`/api/admin/nodes`);

            const allNodes: NodeData[] = nodeRes.data.data.nodes || [];
            const node = allNodes.find((n) => n.id === Number(nodeId));

            if (!node) {
                toast.error(t('admin.node.messages.fetch_failed'));
                router.push('/admin/nodes');
                return;
            }

            setNodeData(node as NodeData);

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
                name: node.name,
                description: node.description || '',
                fqdn: node.fqdn,
                location_id: node.location_id?.toString() || '',
                public: Number(node.public) === 1 ? 'true' : 'false',
                scheme: node.scheme,
                behind_proxy: Number(node.behind_proxy) === 1 ? 'true' : 'false',
                maintenance_mode: Number(node.maintenance_mode) === 1 ? 'true' : 'false',
                memory: node.memory,
                memory_overallocate: node.memory_overallocate,
                disk: node.disk,
                disk_overallocate: node.disk_overallocate,
                upload_size: node.upload_size,
                daemonListen: node.daemonListen,
                daemonSFTP: node.daemonSFTP,
                daemonBase: node.daemonBase,
                public_ip_v4: node.public_ip_v4 || '',
                public_ip_v6: node.public_ip_v6 || '',
            });
        } catch (error) {
            console.error('Error fetching node data:', error);
            toast.error(t('admin.node.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [nodeId, router, t]);

    const fetchSystemInfo = useCallback(async () => {
        setSystemInfo((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const { data } = await axios.get(`/api/wings/admin/node/${nodeId}/system`);
            if (data.success) {
                setSystemInfo({ data: data.data, loading: false, error: null });
            } else {
                setSystemInfo({ data: null, loading: false, error: data.message });
            }
        } catch (e: unknown) {
            let error = 'Failed to fetch system info';
            if (axios.isAxiosError(e)) {
                error = e.response?.data?.message || e.message;
            }
            setSystemInfo({
                data: null,
                loading: false,
                error,
            });
        }
    }, [nodeId]);

    const fetchUtilization = useCallback(async () => {
        setUtilization((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const { data } = await axios.get(`/api/wings/admin/node/${nodeId}/utilization`);
            if (data.success) {
                setUtilization({ data: data.data, loading: false, error: null });
            } else {
                setUtilization({ data: null, loading: false, error: data.message });
            }
        } catch (e: unknown) {
            let error = 'Failed to fetch utilization';
            if (axios.isAxiosError(e)) {
                error = e.response?.data?.message || e.message;
            }
            setUtilization({
                data: null,
                loading: false,
                error,
            });
        }
    }, [nodeId]);

    const fetchDockerUsage = useCallback(async () => {
        setDockerUsage((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const { data } = await axios.get(`/api/wings/admin/node/${nodeId}/docker/disk`);
            if (data.success) {
                setDockerUsage({ data: data.data, loading: false, error: null });
            } else {
                setDockerUsage({ data: null, loading: false, error: data.message });
            }
        } catch (e: unknown) {
            let error = 'Failed to fetch docker usage';
            if (axios.isAxiosError(e)) {
                error = e.response?.data?.message || e.message;
            }
            setDockerUsage({
                data: null,
                loading: false,
                error,
            });
        }
    }, [nodeId]);

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
                    search: debouncedLocationSearch,
                },
            });
            setLocations(data.data.locations || []);
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
        if (form.location_id && !selectedLocationName && locations.length === 0) {
            const fetchCurrentLocation = async () => {
                try {
                    const locationRes = await axios.get(`/api/admin/locations/${form.location_id}`);
                    if (locationRes.data?.data?.location) {
                        setSelectedLocationName(locationRes.data.data.location.name);
                    }
                } catch (error) {
                    console.error('Error fetching current location:', error);
                }
            };
            fetchCurrentLocation();
        }
    }, [form.location_id, selectedLocationName, locations.length]);

    useEffect(() => {
        fetchInitialData();
        fetchSystemInfo();
        fetchUtilization();
        fetchDockerUsage();
    }, [fetchInitialData, fetchSystemInfo, fetchUtilization, fetchDockerUsage]);

    const wingsConfigYaml = useMemo(() => {
        if (!nodeData) return '';
        const yaml = `debug: false
uuid: ${nodeData.uuid}
token_id: ${nodeData.daemon_token_id}
token: ${nodeData.daemon_token}
api:
  host: 0.0.0.0
  port: ${form.daemonListen || 8080}
  ssl:
    enabled: ${form.scheme === 'https'}
    cert: /etc/letsencrypt/live/${form.fqdn}/fullchain.pem
    key: /etc/letsencrypt/live/${form.fqdn}/privkey.pem
  upload_limit: ${form.upload_size || 512}
system:
  data: ${form.daemonBase || '/var/lib/featherpanel/volumes'}
  sftp:
    bind_port: ${form.daemonSFTP || 2022}
allowed_mounts: []
remote: '${typeof window !== 'undefined' ? window.location.origin : 'https://panel.example.com'}'`;
        return yaml;
    }, [nodeData, form]);

    const handleResetKey = async () => {
        setResetting(true);
        try {
            await axios.post(`/api/admin/nodes/${nodeId}/reset-key`);
            toast.success(t('admin.node.wings.reset_key_success'));
            fetchInitialData();
        } catch (error) {
            console.error('Error resetting key:', error);
            toast.error(t('admin.node.wings.reset_key_failed'));
        } finally {
            setResetting(false);
        }
    };

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (!form.name) newErrors.name = t('admin.node.form.name_required');
        if (!form.fqdn) {
            newErrors.fqdn = t('admin.node.form.fqdn_required');
        } else {
            const fqdnRegex =
                /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
            if (!fqdnRegex.test(form.fqdn)) {
                newErrors.fqdn = t('admin.node.form.fqdn_invalid');
            }
        }
        if (!form.location_id) newErrors.location_id = t('admin.node.form.location_required');
        if (!form.daemonBase) newErrors.daemonBase = t('admin.node.form.daemon_base_required');

        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (form.public_ip_v4 && !ipv4Regex.test(form.public_ip_v4)) {
            newErrors.public_ip_v4 = t('admin.node.form.ipv4_invalid');
        }

        const ipv6Regex =
            /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
        if (form.public_ip_v6 && !ipv6Regex.test(form.public_ip_v6)) {
            newErrors.public_ip_v6 = t('admin.node.form.ipv6_invalid');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [form, t]);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!validate()) return;

        setSaving(true);
        try {
            const trimmedIPv4 = form.public_ip_v4.trim();
            const trimmedIPv6 = form.public_ip_v6.trim();

            const submitData = {
                ...form,
                location_id: parseInt(form.location_id),
                public: form.public === 'true' ? 1 : 0,
                behind_proxy: form.behind_proxy === 'true' ? 1 : 0,
                maintenance_mode: form.maintenance_mode === 'true' ? 1 : 0,
                memory: Number(form.memory),
                memory_overallocate: Number(form.memory_overallocate),
                disk: Number(form.disk),
                disk_overallocate: Number(form.disk_overallocate),
                upload_size: Number(form.upload_size),
                daemonListen: Number(form.daemonListen),
                daemonSFTP: Number(form.daemonSFTP),
                public_ip_v4: trimmedIPv4 === '' ? null : trimmedIPv4,
                public_ip_v6: trimmedIPv6 === '' ? null : trimmedIPv6,
            };

            await axios.patch(`/api/admin/nodes/${nodeId}`, submitData);
            toast.success(t('admin.node.messages.update_success'));
            fetchInitialData();
        } catch (error: unknown) {
            console.error('Error updating node:', error);
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || t('admin.node.messages.update_failed'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center p-12'>
                <Loader2 className='w-8 h-8 animate-spin text-primary' />
            </div>
        );
    }

    const tabs = [
        { id: 'details', label: t('admin.node.form.basic_details'), icon: Database },
        { id: 'config', label: t('admin.node.form.configuration'), icon: Settings2 },
        { id: 'allocations', label: t('admin.node.allocations.title'), icon: Network },
        { id: 'network', label: t('admin.node.form.network'), icon: Settings2 },
        { id: 'advanced', label: t('admin.node.form.advanced'), icon: Shield },
        { id: 'wings', label: t('admin.node.form.wings_config'), icon: Shield },
        { id: 'terminal', label: t('admin.node.view.terminal.title'), icon: Server },
        { id: 'wings-config', label: t('admin.node.view.config.title'), icon: Settings2 },
        { id: 'modules', label: t('admin.node.view.modules.title'), icon: LayoutGrid },
        { id: 'utilization', label: t('admin.node.view.utilization.title'), icon: Zap },
        { id: 'docker', label: t('admin.node.view.docker.title'), icon: Database },
        { id: 'system-info', label: t('admin.node.view.system.title'), icon: Shield },
        { id: 'diagnostics', label: t('admin.node.view.diagnostics.title'), icon: Shield },
        { id: 'self-update', label: t('admin.node.view.self_update.title'), icon: Shield },
    ];

    return (
        <div className='space-y-6'>
            <WidgetRenderer widgets={getWidgets('admin-nodes-edit', 'top-of-page')} context={{ id: nodeId as string }} />

            <PageHeader
                title={t('admin.node.form.edit_title')}
                description={t('admin.node.form.edit_description')}
                icon={Server}
                actions={
                    <div className='flex gap-2'>
                        <Button variant='outline' onClick={() => router.back()}>
                            <ArrowLeft className='h-4 w-4 mr-2' />
                            {t('common.back')}
                        </Button>
                        <Button onClick={() => handleSubmit()} loading={saving}>
                            <Save className='h-4 w-4 mr-2' />
                            {t('admin.node.form.submit_save')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-nodes-edit', 'after-header')} context={{ id: nodeId as string }} />

            <div className='block'>
                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    orientation='vertical'
                    className='w-full flex flex-col md:flex-row gap-6'
                >
                    <aside className='w-full md:w-64 shrink-0 overflow-x-auto md:overflow-visible pb-2 md:pb-0'>
                        <TabsList className='flex flex-row md:flex-col h-auto w-max md:w-full bg-card/30 border border-border/50 p-2 rounded-2xl gap-2 md:gap-1'>
                            {tabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <TabsTrigger
                                        key={tab.id}
                                        value={tab.id}
                                        className='w-auto md:w-full justify-start px-4 py-3 h-auto text-sm md:text-base font-normal data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-medium transition-all rounded-xl border border-transparent data-[state=active]:border-primary/10 whitespace-nowrap'
                                    >
                                        <Icon className='w-4 h-4 mr-3' />
                                        {tab.label}
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </aside>

                    <div className='flex-1 space-y-6 min-w-0'>
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

                        <TabsContent
                            value='allocations'
                            className='mt-0 focus-visible:ring-0 focus-visible:outline-none'
                        >
                            <AllocationsTab nodeId={nodeId as string} nodeName={nodeData?.name || ''} />
                        </TabsContent>

                        <TabsContent value='network' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                            <NetworkTab form={form} setForm={setForm} errors={errors} />
                        </TabsContent>

                        <TabsContent value='advanced' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                            <AdvancedTab form={form} setForm={setForm} errors={errors} />
                        </TabsContent>

                        <TabsContent value='wings' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                            <WingsTab
                                nodeId={String(nodeId)}
                                wingsConfigYaml={wingsConfigYaml}
                                handleResetKey={handleResetKey}
                                resetting={resetting}
                            />
                        </TabsContent>

                        <TabsContent value='terminal' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                            {nodeData && <TerminalTab node={nodeData} />}
                        </TabsContent>

                        <TabsContent
                            value='wings-config'
                            className='mt-0 focus-visible:ring-0 focus-visible:outline-none'
                        >
                            {nodeData && <WingsConfigTab node={nodeData} />}
                        </TabsContent>

                        <TabsContent value='modules' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                            {nodeData && <ModulesTab node={nodeData} />}
                        </TabsContent>

                        <TabsContent
                            value='utilization'
                            className='mt-0 focus-visible:ring-0 focus-visible:outline-none'
                        >
                            <UtilizationTab
                                loading={utilization.loading}
                                data={utilization.data}
                                error={utilization.error}
                                onRefresh={fetchUtilization}
                            />
                        </TabsContent>

                        <TabsContent value='docker' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                            <DockerTab
                                nodeId={Number(nodeId)}
                                loading={dockerUsage.loading}
                                data={dockerUsage.data}
                                error={dockerUsage.error}
                                onRefresh={fetchDockerUsage}
                            />
                        </TabsContent>

                        <TabsContent
                            value='system-info'
                            className='mt-0 focus-visible:ring-0 focus-visible:outline-none'
                        >
                            <SystemInfoTab
                                nodeId={Number(nodeId)}
                                loading={systemInfo.loading}
                                data={systemInfo.data}
                                error={systemInfo.error}
                                onRefresh={fetchSystemInfo}
                            />
                        </TabsContent>

                        <TabsContent
                            value='diagnostics'
                            className='mt-0 focus-visible:ring-0 focus-visible:outline-none'
                        >
                            <DiagnosticsTab nodeId={Number(nodeId)} />
                        </TabsContent>

                        <TabsContent
                            value='self-update'
                            className='mt-0 focus-visible:ring-0 focus-visible:outline-none'
                        >
                            <SelfUpdateTab
                                nodeId={Number(nodeId)}
                                systemData={systemInfo.data}
                                onRefresh={fetchSystemInfo}
                            />
                        </TabsContent>

                        {![
                            'wings',
                            'terminal',
                            'wings-config',
                            'modules',
                            'utilization',
                            'docker',
                            'system-info',
                            'diagnostics',
                            'self-update',
                        ].includes(activeTab) && (
                            <div className='flex justify-end'>
                                <Button onClick={() => handleSubmit()} loading={saving}>
                                    <Save className='h-4 w-4 mr-2' />
                                    {t('admin.node.form.submit_save')}
                                </Button>
                            </div>
                        )}
                    </div>
                </Tabs>
            </div>

            <Sheet open={locationModalOpen} onOpenChange={setLocationModalOpen}>
                <SheetContent className='sm:max-w-2xl'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.node.form.select_location')}</SheetTitle>
                        <SheetDescription>
                            {t('admin.node.form.select_location_description', {
                                total: String(locationPagination.total_records || 0),
                            })}
                        </SheetDescription>
                    </SheetHeader>

                    <div className='mt-6 space-y-4'>
                        <div className='relative'>
                            <SearchIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                            <Input
                                placeholder={t('admin.node.form.search_locations')}
                                value={locationSearch}
                                onChange={(e) => setLocationSearch(e.target.value)}
                                className='pl-10'
                            />
                        </div>

                        {locationPagination.total_pages > 1 && (
                            <div className='flex items-center justify-between gap-2 py-2 px-3 rounded-lg border border-border bg-muted/30'>
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
                                    className='gap-1 h-8'
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
                                    className='gap-1 h-8'
                                >
                                    {t('common.next')}
                                    <ChevronRight className='h-3 w-3' />
                                </Button>
                            </div>
                        )}

                        <div className='space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto'>
                            {locations.length === 0 ? (
                                <div className='text-center py-8 text-muted-foreground'>
                                    {t('admin.node.form.no_locations_found')}
                                </div>
                            ) : (
                                locations.map((location) => (
                                    <button
                                        key={location.id}
                                        onClick={() => {
                                            setForm((prev) => ({ ...prev, location_id: location.id.toString() }));
                                            setSelectedLocationName(location.name);
                                            setLocationModalOpen(false);
                                        }}
                                        className='w-full p-3 rounded-lg border border-border/50 hover:bg-muted/50 hover:border-primary/50 transition-colors text-left'
                                    >
                                        <div className='flex items-start gap-3'>
                                            <div className='p-2 bg-primary/10 rounded-lg mt-0.5'>
                                                <MapPin className='h-5 w-5 text-primary' />
                                            </div>
                                            <div className='flex-1 min-w-0'>
                                                <div className='font-medium'>{location.name}</div>
                                                {location.description && (
                                                    <div className='text-sm text-muted-foreground mt-1'>
                                                        {location.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        {locationPagination.total_pages > 1 && (
                            <div className='flex items-center justify-between pt-4 border-t'>
                                <div className='text-sm text-muted-foreground'>
                                    {t('common.showing', {
                                        from: String(
                                            locationPagination.current_page * locationPagination.per_page -
                                                locationPagination.per_page +
                                                1,
                                        ),
                                        to: String(
                                            Math.min(
                                                locationPagination.current_page * locationPagination.per_page,
                                                locationPagination.total_records,
                                            ),
                                        ),
                                        total: String(locationPagination.total_records),
                                    })}
                                </div>
                                <div className='flex gap-2'>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() =>
                                            setLocationPagination((prev) => ({
                                                ...prev,
                                                current_page: prev.current_page - 1,
                                            }))
                                        }
                                        disabled={!locationPagination.has_prev}
                                    >
                                        {t('common.previous')}
                                    </Button>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        onClick={() =>
                                            setLocationPagination((prev) => ({
                                                ...prev,
                                                current_page: prev.current_page + 1,
                                            }))
                                        }
                                        disabled={!locationPagination.has_next}
                                    >
                                        {t('common.next')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <WidgetRenderer widgets={getWidgets('admin-nodes-edit', 'bottom-of-page')} context={{ id: nodeId as string }} />
        </div>
    );
}
