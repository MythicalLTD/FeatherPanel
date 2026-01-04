/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

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

import React, { useState, useEffect, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NodeHeader } from './components/NodeHeader';
import { QuickStatsCards } from './components/QuickStatsCards';
import OverviewTab from './components/OverviewTab';
import { SystemInfoTab } from './components/SystemInfoTab';
import { UtilizationTab } from './components/UtilizationTab';
import { DockerTab } from './components/DockerTab';
import { NetworkTab } from './components/NetworkTab';
import { DiagnosticsTab } from './components/DiagnosticsTab';
import { SelfUpdateTab } from './components/SelfUpdateTab';
import { TerminalTab } from './components/TerminalTab';
import { WingsConfigTab } from './components/WingsConfigTab';
import { ModulesTab } from './components/ModulesTab';
import { NodeData, SystemInfoResponse, UtilizationResponse, DockerResponse, NetworkResponse, Location } from './types';

export default function NodeViewPage({ params }: { params: Promise<{ id: string }> }) {
    const { t } = useTranslation();
    const router = useRouter();
    const resolvedParams = use(params);
    const nodeId = Number(resolvedParams.id);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [node, setNode] = useState<NodeData | null>(null);
    const [locations, setLocations] = useState<Location[]>([]);
    const [activeTab, setActiveTab] = useState('overview');

    // Tab-specific data
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

    const [networkInfo, setNetworkInfo] = useState<{
        data: NetworkResponse | null;
        loading: boolean;
        error: string | null;
    }>({ data: null, loading: false, error: null });

    const fetchNodeData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [nodeRes, locationsRes] = await Promise.all([
                axios.get(`/api/admin/nodes/${nodeId}`),
                axios.get('/api/admin/locations', { params: { limit: 1000 } }),
            ]);

            setNode(nodeRes.data.data.node);
            setLocations(locationsRes.data.data.locations || []);

            // Initial fetch of common data
            fetchSystemInfo();
            fetchUtilization();
            fetchDockerUsage();
            fetchNetworkInfo();
        } catch (e: unknown) {
            let msg = t('admin.node.messages.fetch_failed');
            if (axios.isAxiosError(e)) {
                msg = e.response?.data?.message || e.message;
            }
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const fetchSystemInfo = async () => {
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
    };

    const fetchUtilization = async () => {
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
    };

    const fetchDockerUsage = async () => {
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
    };

    const fetchNetworkInfo = async () => {
        setNetworkInfo((prev) => ({ ...prev, loading: true, error: null }));
        try {
            const { data } = await axios.get(`/api/wings/admin/node/${nodeId}/network`);
            if (data.success) {
                setNetworkInfo({ data: data.data, loading: false, error: null });
            } else {
                setNetworkInfo({ data: null, loading: false, error: data.message });
            }
        } catch (e: unknown) {
            let error = 'Failed to fetch network info';
            if (axios.isAxiosError(e)) {
                error = e.response?.data?.message || e.message;
            }
            setNetworkInfo({
                data: null,
                loading: false,
                error,
            });
        }
    };

    useEffect(() => {
        fetchNodeData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nodeId]);

    const locationName = useMemo(() => {
        if (!node || !locations.length) return '';
        return locations.find((l) => l.id === node.location_id)?.name || '';
    }, [node, locations]);

    if (loading) {
        return (
            <div className='flex items-center justify-center min-h-[50vh]'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
            </div>
        );
    }

    if (error || !node) {
        return (
            <div className='p-6'>
                <div className='bg-destructive/10 border border-destructive/20 p-6 rounded-2xl text-center'>
                    <h3 className='text-lg font-bold text-destructive mb-2'>{t('admin.node.view.error')}</h3>
                    <p className='text-muted-foreground mb-4'>{error || 'Node not found'}</p>
                    <button
                        onClick={fetchNodeData}
                        className='px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors'
                    >
                        {t('common.retry')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <NodeHeader
                node={node}
                locationName={locationName}
                systemInfoData={systemInfo.data}
                systemInfoError={systemInfo.error}
                onDatabases={() => router.push(`/admin/nodes/${nodeId}/databases`)}
                onAllocations={() => router.push(`/admin/nodes/${nodeId}/allocations`)}
                onBack={() => router.push(`/admin/nodes?location_id=${node.location_id}`)}
            />

            <QuickStatsCards node={node} systemInfoData={systemInfo.data} />

            <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
                <TabsList className='w-full flex flex-wrap gap-1 mb-6 bg-transparent border-b border-border/50 rounded-none h-auto p-0 justify-start'>
                    {[
                        { id: 'overview', label: t('admin.node.view.tabs.overview') },
                        { id: 'system', label: t('admin.node.view.tabs.system') },
                        { id: 'utilization', label: t('admin.node.view.tabs.utilization') },
                        { id: 'docker', label: t('admin.node.view.tabs.docker') },
                        { id: 'network', label: t('admin.node.view.tabs.network') },
                        { id: 'diagnostics', label: t('admin.node.view.tabs.diagnostics') },
                        { id: 'self-update', label: t('admin.node.view.tabs.self_update') },
                        { id: 'terminal', label: t('admin.node.view.tabs.terminal') },
                        { id: 'wings-config', label: t('admin.node.view.tabs.config') },
                        { id: 'modules', label: t('admin.node.view.tabs.modules') },
                    ].map((tab) => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className='px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent bg-transparent shadow-none transition-all hover:text-primary'
                        >
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value='overview' className='mt-0'>
                    <OverviewTab node={node} locationName={locationName} />
                </TabsContent>

                <TabsContent value='system' className='mt-0'>
                    <SystemInfoTab
                        nodeId={nodeId}
                        loading={systemInfo.loading}
                        data={systemInfo.data}
                        error={systemInfo.error}
                        onRefresh={fetchSystemInfo}
                    />
                </TabsContent>

                <TabsContent value='utilization' className='mt-0'>
                    <UtilizationTab
                        loading={utilization.loading}
                        data={utilization.data}
                        error={utilization.error}
                        onRefresh={fetchUtilization}
                    />
                </TabsContent>

                <TabsContent value='docker' className='mt-0'>
                    <DockerTab
                        loading={dockerUsage.loading}
                        data={dockerUsage.data}
                        error={dockerUsage.error}
                        nodeId={nodeId}
                        onRefresh={fetchDockerUsage}
                    />
                </TabsContent>

                <TabsContent value='network' className='mt-0'>
                    <NetworkTab
                        loading={networkInfo.loading}
                        data={networkInfo.data}
                        error={networkInfo.error}
                        onRefresh={fetchNetworkInfo}
                    />
                </TabsContent>

                <TabsContent value='diagnostics' className='mt-0'>
                    <DiagnosticsTab nodeId={nodeId} />
                </TabsContent>

                <TabsContent value='self-update' className='mt-0'>
                    <SelfUpdateTab nodeId={nodeId} systemData={systemInfo.data} onRefresh={fetchSystemInfo} />
                </TabsContent>

                <TabsContent value='terminal' className='mt-0'>
                    {node && <TerminalTab node={node} />}
                </TabsContent>

                <TabsContent value='wings-config' className='mt-0'>
                    {node && <WingsConfigTab node={node} />}
                </TabsContent>

                <TabsContent value='modules' className='mt-0'>
                    {node && <ModulesTab node={node} />}
                </TabsContent>
            </Tabs>
        </div>
    );
}
