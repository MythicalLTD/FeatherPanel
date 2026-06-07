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

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { getFeatherpanelApiErrorCode, getFeatherpanelApiErrorMessage } from '@/lib/api';
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
    ArrowLeftRight,
} from 'lucide-react';
import { MassTransferServersDialog } from '@/components/admin/MassTransferServersDialog';

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
    sftp_subdomain: string;
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
    const [massTransferOpen, setMassTransferOpen] = useState(false);

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
        daemonListen: 8443,
        daemonSFTP: 2022,
        daemonBase: '/var/lib/featherpanel/volumes',
        public_ip_v4: '',
        public_ip_v6: '',
        sftp_subdomain: '',
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
    const wingsTabsFetched = useRef<Set<string>>(new Set());

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
                sftp_subdomain: node.sftp_subdomain || '',
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
                    type: 'game',
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
    }, [fetchInitialData]);

    useEffect(() => {
        const wingsTabs: Record<string, () => void> = {
            utilization: fetchUtilization,
            docker: fetchDockerUsage,
            'system-info': fetchSystemInfo,
            'self-update': fetchSystemInfo,
        };

        const fetchForTab = wingsTabs[activeTab];
        if (!fetchForTab || wingsTabsFetched.current.has(activeTab)) {
            return;
        }

        wingsTabsFetched.current.add(activeTab);
        fetchForTab();
    }, [activeTab, fetchSystemInfo, fetchUtilization, fetchDockerUsage]);

    const wingsConfigYaml = useMemo(() => {
        if (!nodeData) return '';
        const yaml = `debug: false
uuid: ${nodeData.uuid}
token_id: ${nodeData.daemon_token_id}
token: ${nodeData.daemon_token}
api:
  host: 0.0.0.0
  port: ${form.daemonListen || 8443}
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

        if (form.sftp_subdomain) {
            const hostnameRegex = /^(?!-)(?:[a-zA-Z0-9-]{1,63}(?<!-)\.)*[a-zA-Z0-9-]{1,63}(?<!-)$/;
            if (!hostnameRegex.test(form.sftp_subdomain)) {
                newErrors.sftp_subdomain = t('admin.node.form.sftp_subdomain_invalid');
            }
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
            const trimmedSftpSubdomain = form.sftp_subdomain.trim();

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
                sftp_subdomain: trimmedSftpSubdomain === '' ? null : trimmedSftpSubdomain,
            };

            await axios.patch(`/api/admin/nodes/${nodeId}`, submitData);
            toast.success(t('admin.node.messages.update_success'));
            fetchInitialData();
        } catch (error: unknown) {
            console.error('Error updating node:', error);
            const apiMsg = getFeatherpanelApiErrorMessage(error);
            const code = getFeatherpanelApiErrorCode(error);
            if (code === 'INVALID_LOCATION_TYPE') {
                const detail = apiMsg ?? t('admin.node.form.location_invalid_type');
                setErrors((prev) => ({ ...prev, location_id: detail }));
            }
            toast.error(apiMsg ?? t('admin.node.messages.update_failed'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center p-12'>
                <Loader2 className='text-primary h-8 w-8 animate-spin' />
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
            <WidgetRenderer
                widgets={getWidgets('admin-nodes-edit', 'top-of-page')}
                context={{ id: nodeId as string }}
            />

            <PageHeader
                title={t('admin.node.form.edit_title')}
                description={t('admin.node.form.edit_description')}
                icon={Server}
                actions={
                    <div className='flex flex-wrap gap-2'>
                        <Button variant='outline' onClick={() => router.back()}>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('common.back')}
                        </Button>
                        {nodeData ? (
                            <Button variant='outline' onClick={() => setMassTransferOpen(true)}>
                                <ArrowLeftRight className='mr-2 h-4 w-4' />
                                {t('admin.node.mass_transfer.button')}
                            </Button>
                        ) : null}
                        <Button onClick={() => handleSubmit()} loading={saving}>
                            <Save className='mr-2 h-4 w-4' />
                            {t('admin.node.form.submit_save')}
                        </Button>
                    </div>
                }
            />

            <WidgetRenderer
                widgets={getWidgets('admin-nodes-edit', 'after-header')}
                context={{ id: nodeId as string }}
            />

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
                                        <Icon className='mr-3 h-4 w-4' />
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

                        <TabsContent
                            value='allocations'
                            className='mt-0 focus-visible:ring-0 focus-visible:outline-none'
                        >
                            {activeTab === 'allocations' ? (
                                <AllocationsTab nodeId={nodeId as string} nodeName={nodeData?.name || ''} />
                            ) : null}
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
                            {activeTab === 'terminal' && nodeData ? <TerminalTab node={nodeData} /> : null}
                        </TabsContent>

                        <TabsContent
                            value='wings-config'
                            className='mt-0 focus-visible:ring-0 focus-visible:outline-none'
                        >
                            {activeTab === 'wings-config' && nodeData ? <WingsConfigTab node={nodeData} /> : null}
                        </TabsContent>

                        <TabsContent value='modules' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                            {activeTab === 'modules' && nodeData ? <ModulesTab node={nodeData} /> : null}
                        </TabsContent>

                        <TabsContent
                            value='utilization'
                            className='mt-0 focus-visible:ring-0 focus-visible:outline-none'
                        >
                            {activeTab === 'utilization' ? (
                                <UtilizationTab
                                    loading={utilization.loading}
                                    data={utilization.data}
                                    error={utilization.error}
                                    onRefresh={fetchUtilization}
                                />
                            ) : null}
                        </TabsContent>

                        <TabsContent value='docker' className='mt-0 focus-visible:ring-0 focus-visible:outline-none'>
                            {activeTab === 'docker' ? (
                                <DockerTab
                                    nodeId={Number(nodeId)}
                                    loading={dockerUsage.loading}
                                    data={dockerUsage.data}
                                    error={dockerUsage.error}
                                    onRefresh={fetchDockerUsage}
                                />
                            ) : null}
                        </TabsContent>

                        <TabsContent
                            value='system-info'
                            className='mt-0 focus-visible:ring-0 focus-visible:outline-none'
                        >
                            {activeTab === 'system-info' ? (
                                <SystemInfoTab
                                    nodeId={Number(nodeId)}
                                    loading={systemInfo.loading}
                                    data={systemInfo.data}
                                    error={systemInfo.error}
                                    onRefresh={fetchSystemInfo}
                                />
                            ) : null}
                        </TabsContent>

                        <TabsContent
                            value='diagnostics'
                            className='mt-0 focus-visible:ring-0 focus-visible:outline-none'
                        >
                            {activeTab === 'diagnostics' ? <DiagnosticsTab nodeId={Number(nodeId)} /> : null}
                        </TabsContent>

                        <TabsContent
                            value='self-update'
                            className='mt-0 focus-visible:ring-0 focus-visible:outline-none'
                        >
                            {activeTab === 'self-update' ? (
                                <SelfUpdateTab
                                    nodeId={Number(nodeId)}
                                    systemData={systemInfo.data}
                                    onRefresh={fetchSystemInfo}
                                />
                            ) : null}
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
                                    <Save className='mr-2 h-4 w-4' />
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
                            <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform' />
                            <Input
                                placeholder={t('admin.node.form.search_locations')}
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

                        {locationPagination.total_pages > 1 && (
                            <div className='flex items-center justify-between border-t pt-4'>
                                <div className='text-muted-foreground text-sm'>
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

            <WidgetRenderer
                widgets={getWidgets('admin-nodes-edit', 'bottom-of-page')}
                context={{ id: nodeId as string }}
            />

            {nodeData ? (
                <MassTransferServersDialog
                    sourceNodeId={Number(nodeId)}
                    sourceNodeName={nodeData.name}
                    open={massTransferOpen}
                    onOpenChange={setMassTransferOpen}
                />
            ) : null}
        </div>
    );
}
