/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studio
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
import { useRouter, useParams } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Server, ArrowLeft, Save, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

import { DetailsTab } from './DetailsTab';
import { ConnectionTab } from './ConnectionTab';
import { AdvancedTab } from './AdvancedTab';
import { IpPoolTab } from './IpPoolTab';
import { PlansTab } from './PlansTab';
import { InfoTab } from './InfoTab';

interface Location {
    id: number;
    name: string;
    description?: string;
    type: 'game' | 'vps' | 'web';
}

export interface KVPair {
    key: string;
    value: string;
}

export interface VdsNodeForm {
    name: string;
    description: string;
    location_id: string;
    fqdn: string;
    scheme: 'http' | 'https';
    port: number;
    user: string;
    token_id: string;
    secret: string;
    tls_no_verify: 'true' | 'false';
    timeout: number;
}

export default function EditVdsNodePage() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [form, setForm] = useState<VdsNodeForm>({
        name: '',
        description: '',
        location_id: '',
        fqdn: '',
        scheme: 'https',
        port: 8006,
        user: '',
        token_id: '',
        secret: '',
        tls_no_verify: 'false',
        timeout: 60,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [loadingNode, setLoadingNode] = useState(true);
    const [nodeName, setNodeName] = useState('');

    const [headers, setHeaders] = useState<KVPair[]>([]);
    const [queryParams, setQueryParams] = useState<KVPair[]>([]);

    const [locations, setLocations] = useState<Location[]>([]);
    const [locationSearch, setLocationSearch] = useState('');
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [selectedLocationName, setSelectedLocationName] = useState('');

    const [connectionTesting, setConnectionTesting] = useState(false);
    const [connectionResult, setConnectionResult] = useState<{
        ok: boolean;
        message: string;
        payload?: unknown;
    } | null>(null);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-vds-node-edit');

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const fetchLocations = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/admin/locations');
            const all: Location[] = data.data?.locations ?? data.data ?? [];
            setLocations(all.filter((l) => l.type === 'vps'));
        } catch {
            toast.error(t('admin.vdsNodes.errors.fetch_locations_failed'));
        }
    }, [t]);

    useEffect(() => {
        const loadNode = async () => {
            setLoadingNode(true);
            try {
                // Load node and locations in parallel
                const [nodeRes, locRes] = await Promise.all([
                    axios.get(`/api/admin/vm-nodes/${id}`),
                    axios.get('/api/admin/locations'),
                ]);

                // API wraps the node under data.data.vm_node
                const node = nodeRes.data.data?.vm_node ?? nodeRes.data.data;

                // Build VPS locations list
                const allLocs: Location[] = locRes.data.data?.locations ?? locRes.data.data ?? [];
                const vpsLocs = allLocs.filter((l: Location) => l.type === 'vps');
                setLocations(vpsLocs);

                // Resolve location name from the fetched list
                const matchedLoc = vpsLocs.find((l: Location) => l.id === node.location_id);
                if (matchedLoc) setSelectedLocationName(matchedLoc.name);

                setNodeName(node.name);
                setForm({
                    name: node.name ?? '',
                    description: node.description ?? '',
                    location_id: String(node.location_id ?? ''),
                    fqdn: node.fqdn ?? '',
                    scheme: (node.scheme as 'http' | 'https') ?? 'https',
                    port: node.port ?? 8006,
                    user: node.user ?? '',
                    token_id: node.token_id ?? '',
                    secret: '',
                    tls_no_verify: (node.tls_no_verify as 'true' | 'false') ?? 'false',
                    timeout: node.timeout ?? 60,
                });

                if (node.addional_headers) {
                    try {
                        const parsed = JSON.parse(node.addional_headers);
                        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                            setHeaders(Object.entries(parsed).map(([key, value]) => ({ key, value: String(value) })));
                        }
                    } catch {}
                }
                if (node.additional_params) {
                    try {
                        const parsed = JSON.parse(node.additional_params);
                        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                            setQueryParams(
                                Object.entries(parsed).map(([key, value]) => ({ key, value: String(value) })),
                            );
                        }
                    } catch {}
                }
            } catch {
                toast.error(t('admin.vdsNodes.errors.fetch_failed'));
                router.push('/admin/vds-nodes');
            } finally {
                setLoadingNode(false);
            }
        };
        loadNode();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleSave = async () => {
        setSaving(true);
        setErrors({});
        try {
            const headersMap: Record<string, string> = {};
            headers.filter((h) => h.key).forEach((h) => (headersMap[h.key] = h.value));
            const paramsMap: Record<string, string> = {};
            queryParams.filter((p) => p.key).forEach((p) => (paramsMap[p.key] = p.value));

            const payload: Record<string, unknown> = {
                ...form,
                addional_headers: Object.keys(headersMap).length ? JSON.stringify(headersMap) : null,
                additional_params: Object.keys(paramsMap).length ? JSON.stringify(paramsMap) : null,
            };
            if (!form.secret) delete payload.secret;

            await axios.patch(`/api/admin/vm-nodes/${id}`, payload);
            setNodeName(form.name);
            toast.success(t('admin.vdsNodes.messages.updated'));
        } catch (error) {
            if (isAxiosError(error) && error.response?.data?.errors) {
                const fieldErrors: Record<string, string> = {};
                for (const err of error.response.data.errors) {
                    if (err.field) fieldErrors[err.field] = err.detail;
                }
                setErrors(fieldErrors);
                toast.error(t('admin.vdsNodes.errors.validation_failed'));
            } else {
                toast.error(t('admin.vdsNodes.errors.save_failed'));
            }
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setConnectionTesting(true);
        setConnectionResult(null);
        try {
            const { data } = await axios.post(`/api/admin/vm-nodes/${id}/test-connection`);
            if (data.success && data.data?.ok) {
                setConnectionResult({
                    ok: true,
                    message: t('admin.vdsNodes.connection.success', {
                        count: String(data.data.nodes?.length ?? 0),
                        ms: String(data.data.duration_ms ?? 0),
                    }),
                    payload: data.data,
                });
            } else {
                setConnectionResult({
                    ok: false,
                    message: data.message ?? data.error_message ?? t('admin.vdsNodes.connection.failed'),
                    payload: data.data,
                });
            }
        } catch (error) {
            const errMsg = isAxiosError(error)
                ? (error.response?.data?.message ?? error.message)
                : t('admin.vdsNodes.connection.failed');
            const payload = isAxiosError(error) ? error.response?.data?.data : undefined;
            setConnectionResult({ ok: false, message: errMsg, payload });
        } finally {
            setConnectionTesting(false);
        }
    };

    const filteredLocations = locations.filter(
        (l) =>
            l.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
            l.description?.toLowerCase().includes(locationSearch.toLowerCase()),
    );

    if (loadingNode) {
        return (
            <div className='flex items-center justify-center min-h-[60vh]'>
                <RefreshCw className='h-8 w-8 animate-spin text-primary' />
            </div>
        );
    }

    return (
        <div className='space-y-6'>
            <PageHeader
                title={nodeName || t('admin.vdsNodes.edit.title')}
                description={t('admin.vdsNodes.edit.description')}
                icon={Server}
                actions={
                    <div className='flex items-center gap-3'>
                        <Button variant='outline' size='sm' onClick={() => router.push('/admin/vds-nodes')}>
                            <ArrowLeft className='h-4 w-4 mr-2' />
                            {t('common.back')}
                        </Button>
                        <Button variant='outline' size='sm' onClick={handleTestConnection} loading={connectionTesting}>
                            <Wifi className='h-4 w-4 mr-2' />
                            {t('admin.vdsNodes.connection.test_button')}
                        </Button>
                        <Button size='sm' onClick={handleSave} loading={saving}>
                            <Save className='h-4 w-4 mr-2' />
                            {t('common.save')}
                        </Button>
                    </div>
                }
            />

            {connectionResult && (
                <div
                    className={`rounded-2xl border-2 px-5 py-4 space-y-3 ${
                        connectionResult.ok ? 'border-green-500/40 bg-green-500/5' : 'border-red-500/40 bg-red-500/5'
                    }`}
                >
                    <div className='flex items-center gap-3'>
                        {connectionResult.ok ? (
                            <Wifi className='h-5 w-5 text-green-500 shrink-0' />
                        ) : (
                            <WifiOff className='h-5 w-5 text-red-500 shrink-0' />
                        )}
                        <p
                            className={`font-semibold text-sm ${
                                connectionResult.ok ? 'text-green-600' : 'text-red-600'
                            }`}
                        >
                            {connectionResult.message}
                        </p>
                    </div>
                    {connectionResult.payload !== undefined && connectionResult.payload !== null && (
                        <pre className='text-[11px] text-muted-foreground bg-background/60 border border-border/50 rounded-xl p-3 overflow-auto max-h-64 font-mono leading-relaxed whitespace-pre-wrap break-all'>
                            {JSON.stringify(connectionResult.payload, null, 2)}
                        </pre>
                    )}
                </div>
            )}

            <WidgetRenderer widgets={getWidgets('admin-vds-node-edit', 'top-of-page')} context={{ id }} />

            <Tabs defaultValue='details' className='space-y-6'>
                <TabsList className='w-full justify-start h-auto p-1 bg-muted/40 rounded-xl flex-wrap gap-1'>
                    <TabsTrigger value='details' className='rounded-lg px-4 py-2 text-sm'>
                        {t('admin.vdsNodes.tabs.details')}
                    </TabsTrigger>
                    <TabsTrigger value='connection' className='rounded-lg px-4 py-2 text-sm'>
                        {t('admin.vdsNodes.tabs.connection')}
                    </TabsTrigger>
                    <TabsTrigger value='advanced' className='rounded-lg px-4 py-2 text-sm'>
                        {t('admin.vdsNodes.tabs.advanced')}
                    </TabsTrigger>
                    <TabsTrigger value='ip-pool' className='rounded-lg px-4 py-2 text-sm'>
                        {t('admin.vdsNodes.tabs.ip_pool')}
                    </TabsTrigger>
                    <TabsTrigger value='plans' className='rounded-lg px-4 py-2 text-sm'>
                        {t('admin.vdsNodes.tabs.plans')}
                    </TabsTrigger>
                    <TabsTrigger value='info' className='rounded-lg px-4 py-2 text-sm'>
                        {t('admin.vdsNodes.tabs.info')}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value='details' className='mt-0'>
                    <DetailsTab
                        form={form}
                        setForm={setForm}
                        errors={errors}
                        selectedLocationName={selectedLocationName}
                        setLocationModalOpen={setLocationModalOpen}
                        fetchLocations={fetchLocations}
                    />
                </TabsContent>

                <TabsContent value='connection' className='mt-0'>
                    <ConnectionTab form={form} setForm={setForm} errors={errors} />
                </TabsContent>

                <TabsContent value='advanced' className='mt-0'>
                    <AdvancedTab
                        headers={headers}
                        params={queryParams}
                        onHeaderChange={(i, f, v) =>
                            setHeaders((prev) => prev.map((h, idx) => (idx === i ? { ...h, [f]: v } : h)))
                        }
                        onAddHeader={() => setHeaders((prev) => [...prev, { key: '', value: '' }])}
                        onRemoveHeader={(i) => setHeaders((prev) => prev.filter((_, idx) => idx !== i))}
                        onParamChange={(i, f, v) =>
                            setQueryParams((prev) => prev.map((p, idx) => (idx === i ? { ...p, [f]: v } : p)))
                        }
                        onAddParam={() => setQueryParams((prev) => [...prev, { key: '', value: '' }])}
                        onRemoveParam={(i) => setQueryParams((prev) => prev.filter((_, idx) => idx !== i))}
                    />
                </TabsContent>

                <TabsContent value='ip-pool' className='mt-0'>
                    <IpPoolTab nodeId={id} nodeName={nodeName} />
                </TabsContent>

                <TabsContent value='plans' className='mt-0'>
                    <PlansTab nodeId={id} nodeName={nodeName} />
                </TabsContent>

                <TabsContent value='info' className='mt-0'>
                    <InfoTab nodeId={id} nodeName={nodeName} />
                </TabsContent>
            </Tabs>

            <WidgetRenderer widgets={getWidgets('admin-vds-node-edit', 'bottom-of-page')} context={{ id }} />

            <Sheet open={locationModalOpen} onOpenChange={setLocationModalOpen}>
                <SheetContent side='right' className='w-full max-w-md'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.vdsNodes.form.select_location')}</SheetTitle>
                    </SheetHeader>
                    <div className='mt-6 space-y-4'>
                        <div className='relative'>
                            <RefreshCw className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                            <Input
                                placeholder={t('admin.vdsNodes.form.search_location')}
                                value={locationSearch}
                                onChange={(e) => setLocationSearch(e.target.value)}
                                className='pl-10'
                            />
                        </div>
                        <div className='space-y-2 max-h-[60vh] overflow-y-auto'>
                            {filteredLocations.length === 0 ? (
                                <p className='text-sm text-muted-foreground italic text-center py-6'>
                                    {t('admin.vdsNodes.form.no_locations')}
                                </p>
                            ) : (
                                filteredLocations.map((loc) => (
                                    <button
                                        key={loc.id}
                                        type='button'
                                        onClick={() => {
                                            setForm((f) => ({ ...f, location_id: String(loc.id) }));
                                            setSelectedLocationName(loc.name);
                                            setLocationModalOpen(false);
                                        }}
                                        className='w-full text-left px-4 py-3 rounded-xl border border-border/50 hover:bg-muted/40 transition-colors'
                                    >
                                        <div className='font-medium text-sm'>{loc.name}</div>
                                        {loc.description && (
                                            <div className='text-xs text-muted-foreground mt-0.5'>
                                                {loc.description}
                                            </div>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
