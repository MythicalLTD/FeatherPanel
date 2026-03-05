/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { useRouter, useParams } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { toast } from 'sonner';
import {
    Server,
    ArrowLeft,
    Save,
    RefreshCw,
    Search as SearchIcon,
    MapPin,
    ChevronLeft,
    ChevronRight,
    Plus,
    Trash2,
} from 'lucide-react';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

interface Location {
    id: number;
    name: string;
    description?: string;
    type: 'game' | 'vps' | 'web';
}

interface VmNode {
    id: number;
    name: string;
    description: string | null;
    location_id: number;
    fqdn: string;
    scheme: string;
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
    const id = params.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);

    const [locations, setLocations] = useState<Location[]>([]);
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [selectedLocationName, setSelectedLocationName] = useState<string>('');
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

    const [form, setForm] = useState({
        name: '',
        description: '',
        fqdn: '',
        location_id: '',
        scheme: 'https',
        port: 8006,
        user: '',
        token_id: '',
        secret: '',
        tls_no_verify: 'false' as 'true' | 'false',
        timeout: 60,
    });

    const [extraHeaders, setExtraHeaders] = useState<Array<{ key: string; value: string }>>([]);
    const [extraParams, setExtraParams] = useState<Array<{ key: string; value: string }>>([]);

    const [errors, setErrors] = useState<Record<string, string>>({});

    const [connectionState, setConnectionState] = useState<'idle' | 'ok' | 'error'>('idle');
    const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
    const [connectionPayload, setConnectionPayload] = useState<unknown | null>(null);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-vds-nodes-edit');

    type VmIp = {
        id: number;
        vm_node_id: number;
        ip: string;
        cidr: number | null;
        gateway: string | null;
        is_primary: 'true' | 'false';
        notes: string | null;
    };

    const [ips, setIps] = useState<VmIp[]>([]);
    const [ipsLoading, setIpsLoading] = useState(false);
    const [ipForm, setIpForm] = useState<{ ip: string; cidr: string; gateway: string; notes: string }>({
        ip: '',
        cidr: '',
        gateway: '',
        notes: '',
    });
    const [ipErrors, setIpErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    const fetchVmNode = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/admin/vm-nodes/${id}`);
            const node = data.data.vm_node as VmNode;
            setForm({
                name: node.name,
                description: node.description || '',
                fqdn: node.fqdn,
                location_id: node.location_id.toString(),
                scheme: node.scheme,
                port: node.port,
                user: node.user,
                token_id: node.token_id,
                secret: node.secret,
                tls_no_verify: node.tls_no_verify,
                timeout: node.timeout,
            });

            // Parse advanced HTTP options (JSON stored in DB)
            const headersArray: Array<{ key: string; value: string }> = [];
            if (typeof (node as any).addional_headers === 'string' && (node as any).addional_headers !== '') {
                try {
                    const parsed = JSON.parse((node as any).addional_headers);
                    if (parsed && typeof parsed === 'object') {
                        Object.entries(parsed as Record<string, unknown>).forEach(([k, v]) => {
                            headersArray.push({ key: k, value: String(v) });
                        });
                    }
                } catch (e) {
                    console.error('Failed to parse VM node headers JSON', e);
                }
            }
            setExtraHeaders(headersArray);

            const paramsArray: Array<{ key: string; value: string }> = [];
            if (typeof (node as any).additional_params === 'string' && (node as any).additional_params !== '') {
                try {
                    const parsed = JSON.parse((node as any).additional_params);
                    if (parsed && typeof parsed === 'object') {
                        Object.entries(parsed as Record<string, unknown>).forEach(([k, v]) => {
                            paramsArray.push({ key: k, value: String(v) });
                        });
                    }
                } catch (e) {
                    console.error('Failed to parse VM node params JSON', e);
                }
            }
            setExtraParams(paramsArray);

            if (node.location_id) {
                try {
                    const locationRes = await axios.get(`/api/admin/locations/${node.location_id}`);
                    if (locationRes.data?.data?.location) {
                        setSelectedLocationName(locationRes.data.data.location.name);
                    }
                } catch (e) {
                    console.error('Error fetching location for VDS node:', e);
                }
            }
        } catch (error) {
            console.error('Error fetching VDS node:', error);
            toast.error(t('admin.vdsNodes.messages.fetch_failed'));
            router.push('/admin/vds-nodes');
        } finally {
            setLoading(false);
        }
    }, [id, router, t]);

    const loadIps = useCallback(async () => {
        setIpsLoading(true);
        try {
            const { data } = await axios.get(`/api/admin/vm-nodes/${id}/ips`);
            const list = (data.data?.ips || []) as VmIp[];
            setIps(list);
        } catch (error) {
            console.error('Error fetching VM node IPs:', error);
        } finally {
            setIpsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchVmNode();
        loadIps();
    }, [fetchVmNode, loadIps]);

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
                },
            });

            const allLocations = (data.data.locations || []) as Location[];
            const vpsLocations = allLocations.filter((l) => l.type === 'vps');
            setLocations(vpsLocations);

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

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};

        if (!form.name.trim()) newErrors.name = t('admin.vdsNodes.form.name_required');
        if (!form.fqdn.trim()) {
            newErrors.fqdn = t('admin.vdsNodes.form.fqdn_required');
        } else {
            const fqdnRegex =
                /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
            if (!fqdnRegex.test(form.fqdn)) {
                newErrors.fqdn = t('admin.vdsNodes.form.fqdn_invalid');
            }
        }

        if (!form.location_id) newErrors.location_id = t('admin.vdsNodes.form.location_required');
        if (!form.user.trim()) newErrors.user = t('admin.vdsNodes.form.user_required');
        if (!form.token_id.trim()) newErrors.token_id = t('admin.vdsNodes.form.token_id_required');

        if (!form.port || form.port < 1 || form.port > 65535) {
            newErrors.port = t('admin.vdsNodes.form.port_invalid');
        }

        if (!form.timeout || form.timeout < 1) {
            newErrors.timeout = t('admin.vdsNodes.form.timeout_invalid');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [form, t]);

    const validateIpForm = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (!ipForm.ip.trim()) {
            newErrors.ip = t('admin.vdsNodes.ips.ip_required');
        } else if (!/^([0-9a-fA-F:.]+)$/.test(ipForm.ip.trim())) {
            newErrors.ip = t('admin.vdsNodes.ips.ip_invalid');
        }
        if (ipForm.cidr) {
            const cidrNum = Number(ipForm.cidr);
            if (Number.isNaN(cidrNum) || cidrNum < 0 || cidrNum > 128) {
                newErrors.cidr = t('admin.vdsNodes.ips.cidr_invalid');
            }
        }
        if (ipForm.gateway && !/^([0-9a-fA-F:.]+)$/.test(ipForm.gateway.trim())) {
            newErrors.gateway = t('admin.vdsNodes.ips.gateway_invalid');
        }
        setIpErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [ipForm, t]);

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!validate()) return;

        setSaving(true);
        try {
            const headerObject: Record<string, string> = {};
            extraHeaders.forEach(({ key, value }) => {
                const trimmedKey = key.trim();
                if (trimmedKey !== '') {
                    headerObject[trimmedKey] = value;
                }
            });

            const paramsObject: Record<string, string> = {};
            extraParams.forEach(({ key, value }) => {
                const trimmedKey = key.trim();
                if (trimmedKey !== '') {
                    paramsObject[trimmedKey] = value;
                }
            });

            const submitData = {
                ...form,
                location_id: parseInt(form.location_id),
                port: Number(form.port),
                timeout: Number(form.timeout),
                addional_headers: Object.keys(headerObject).length > 0 ? JSON.stringify(headerObject) : null,
                additional_params: Object.keys(paramsObject).length > 0 ? JSON.stringify(paramsObject) : null,
            };

            await axios.patch(`/api/admin/vm-nodes/${id}`, submitData);
            toast.success(t('admin.vdsNodes.messages.update_success'));
            fetchVmNode();
            loadIps();
        } catch (error) {
            console.error('Error updating VDS node:', error);
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.vdsNodes.messages.update_failed'));
            }
        } finally {
            setSaving(false);
        }
    };

    const handleAddIp = async () => {
        if (!validateIpForm()) return;

        try {
            const payload = {
                ip: ipForm.ip.trim(),
                cidr: ipForm.cidr ? Number(ipForm.cidr) : null,
                gateway: ipForm.gateway ? ipForm.gateway.trim() : null,
                notes: ipForm.notes.trim() || null,
            };
            await axios.put(`/api/admin/vm-nodes/${id}/ips`, payload);
            setIpForm({ ip: '', cidr: '', gateway: '', notes: '' });
            setIpErrors({});
            loadIps();
        } catch (error) {
            console.error('Error creating VM node IP:', error);
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.vdsNodes.ips.create_failed'));
            }
        }
    };

    const handleDeleteIp = async (ipId: number) => {
        try {
            await axios.delete(`/api/admin/vm-nodes/${id}/ips/${ipId}`);
            loadIps();
        } catch (error) {
            console.error('Error deleting VM node IP:', error);
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.vdsNodes.ips.delete_failed'));
            }
        }
    };

    const handleSetPrimaryIp = async (ipId: number) => {
        try {
            await axios.post(`/api/admin/vm-nodes/${id}/ips/${ipId}/primary`);
            loadIps();
        } catch (error) {
            console.error('Error setting primary VM node IP:', error);
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.vdsNodes.ips.primary_failed'));
            }
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setConnectionState('idle');
        setConnectionMessage(null);
        setConnectionPayload(null);

        try {
            const { data } = await axios.get(`/api/admin/vm-nodes/${id}/test-connection`);

            const ok = data.data?.ok ?? false;
            const payload = data.data ?? data;
            setConnectionPayload(payload);

            if (ok) {
                setConnectionState('ok');
                setConnectionMessage(data.message ?? t('admin.vdsNodes.messages.connection_ok'));
            } else {
                setConnectionState('error');
                const messageFromBackend =
                    data.data?.error || data.error || data.message || t('admin.vdsNodes.messages.connection_failed');
                setConnectionMessage(messageFromBackend);
            }
        } catch (error) {
            console.error('Error testing connection:', error);
            setConnectionState('error');

            if (isAxiosError(error) && error.response) {
                const respData: any = error.response.data ?? {};
                setConnectionPayload(respData);

                const status = error.response.status;
                const statusText = error.response.statusText;
                const backendMessage = respData.error || respData.message;

                const msg =
                    backendMessage ||
                    `${status} ${statusText || ''}`.trim() ||
                    t('admin.vdsNodes.messages.connection_failed');

                setConnectionMessage(msg);
            } else {
                setConnectionPayload(null);
                setConnectionMessage(t('admin.vdsNodes.messages.connection_failed'));
            }
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return (
            <div className='flex items-center justify-center p-12'>
                <RefreshCw className='w-6 h-6 animate-spin text-primary' />
            </div>
        );
    }

    return (
        <div className='max-w-5xl mx-auto py-8 px-4 space-y-8'>
            <WidgetRenderer
                widgets={getWidgets('admin-vds-nodes-edit', 'top-of-page')}
                context={{ id: id as string }}
            />

            <PageHeader
                title={t('admin.vdsNodes.form.edit_title')}
                description={t('admin.vdsNodes.form.edit_description')}
                icon={Server}
                actions={
                    <div className='flex gap-2'>
                        <Button variant='outline' onClick={() => router.back()}>
                            <ArrowLeft className='h-4 w-4 mr-2' />
                            {t('common.back')}
                        </Button>
                        <Button variant='outline' onClick={handleTestConnection} loading={testing}>
                            <RefreshCw className='h-4 w-4 mr-2' />
                            {t('admin.vdsNodes.health.refresh')}
                        </Button>
                        <Button onClick={handleSave} loading={saving}>
                            <Save className='h-4 w-4 mr-2' />
                            {t('admin.vdsNodes.form.submit_save')}
                        </Button>
                    </div>
                }
            />

            {connectionState !== 'idle' && (
                <div
                    className={`rounded-2xl border-2 px-5 py-4 shadow-sm transition-colors ${
                        connectionState === 'ok'
                            ? 'border-emerald-500/70 bg-emerald-500/5'
                            : 'border-red-500/70 bg-red-500/5'
                    }`}
                >
                    <div className='flex items-start gap-3'>
                        <div
                            className={`mt-1 h-3 w-3 rounded-full ${
                                connectionState === 'ok' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                            }`}
                        />
                        <div className='flex-1 space-y-2'>
                            <div className='flex items-center justify-between gap-3'>
                                <div>
                                    <p className='text-sm font-semibold uppercase tracking-wide'>
                                        {connectionState === 'ok'
                                            ? t('admin.vdsNodes.health.online')
                                            : t('admin.vdsNodes.health.offline')}
                                    </p>
                                    {connectionMessage && (
                                        <p className='text-sm mt-1 text-foreground'>{connectionMessage}</p>
                                    )}
                                </div>
                            </div>

                            {connectionPayload && typeof connectionPayload === 'object' ? (
                                <div className='mt-2 rounded-xl bg-background/80 border border-border/60 max-h-64 overflow-auto'>
                                    <pre className='text-xs font-mono p-3 whitespace-pre-wrap break-all'>
                                        {JSON.stringify(connectionPayload ?? {}, null, 2)}
                                    </pre>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            <WidgetRenderer
                widgets={getWidgets('admin-vds-nodes-edit', 'after-header')}
                context={{ id: id as string }}
            />

            <form onSubmit={handleSave} className='space-y-8'>
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
                    <div className='space-y-8'>
                        <PageCard title={t('admin.vdsNodes.form.basic_details')} icon={Server}>
                            <div className='space-y-6'>
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.name')}</Label>
                                    <Input
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        error={!!errors.name}
                                    />
                                    {errors.name && (
                                        <p className='text-[10px] uppercase font-bold text-red-500 mt-1'>
                                            {errors.name}
                                        </p>
                                    )}
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>
                                        {t('admin.vdsNodes.form.description')}
                                    </Label>
                                    <Textarea
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        className='min-h-[100px]'
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.location')}</Label>
                                    <div className='flex gap-2'>
                                        <div className='flex-1 h-11 px-3 bg-muted/30 rounded-xl border border-border/50 text-sm flex items-center'>
                                            {form.location_id && selectedLocationName ? (
                                                <div className='flex items-center gap-2'>
                                                    <MapPin className='h-4 w-4 text-primary' />
                                                    <span className='font-medium text-foreground'>
                                                        {selectedLocationName}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className='text-muted-foreground'>
                                                    {t('admin.vdsNodes.form.select_location')}
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            type='button'
                                            size='icon'
                                            onClick={() => {
                                                fetchLocations();
                                                setLocationModalOpen(true);
                                            }}
                                        >
                                            <SearchIcon className='h-4 w-4' />
                                        </Button>
                                    </div>
                                    {errors.location_id && (
                                        <p className='text-[10px] uppercase font-bold text-red-500 mt-1'>
                                            {errors.location_id}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </PageCard>

                        <PageCard title={t('admin.vdsNodes.form.proxmox')} icon={Server}>
                            <div className='space-y-6'>
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.user')}</Label>
                                    <Input
                                        value={form.user}
                                        onChange={(e) => setForm({ ...form, user: e.target.value })}
                                        error={!!errors.user}
                                    />
                                    {errors.user && (
                                        <p className='text-[10px] uppercase font-bold text-red-500 mt-1'>
                                            {errors.user}
                                        </p>
                                    )}
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.token_id')}</Label>
                                    <Input
                                        value={form.token_id}
                                        onChange={(e) => setForm({ ...form, token_id: e.target.value })}
                                        error={!!errors.token_id}
                                    />
                                    {errors.token_id && (
                                        <p className='text-[10px] uppercase font-bold text-red-500 mt-1'>
                                            {errors.token_id}
                                        </p>
                                    )}
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.secret')}</Label>
                                    <Input
                                        type='password'
                                        value={form.secret}
                                        onChange={(e) => setForm({ ...form, secret: e.target.value })}
                                    />
                                </div>
                            </div>
                        </PageCard>
                    </div>

                    <div className='space-y-8'>
                        <PageCard title={t('admin.vdsNodes.form.network')} icon={Server}>
                            <div className='space-y-6'>
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.fqdn')}</Label>
                                    <Input
                                        value={form.fqdn}
                                        onChange={(e) => setForm({ ...form, fqdn: e.target.value })}
                                        error={!!errors.fqdn}
                                    />
                                    {errors.fqdn && (
                                        <p className='text-[10px] uppercase font-bold text-red-500 mt-1'>
                                            {errors.fqdn}
                                        </p>
                                    )}
                                </div>
                                <div className='grid grid-cols-2 gap-4'>
                                    <div className='space-y-2'>
                                        <Label className='text-sm font-semibold'>
                                            {t('admin.vdsNodes.form.scheme')}
                                        </Label>
                                        <Select
                                            value={form.scheme}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    scheme: e.target.value as 'http' | 'https',
                                                })
                                            }
                                        >
                                            <option value='https'>HTTPS</option>
                                            <option value='http'>HTTP</option>
                                        </Select>
                                    </div>
                                    <div className='space-y-2'>
                                        <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.port')}</Label>
                                        <Input
                                            type='number'
                                            value={form.port}
                                            onChange={(e) =>
                                                setForm({
                                                    ...form,
                                                    port: parseInt(e.target.value, 10) || 0,
                                                })
                                            }
                                            error={!!errors.port}
                                        />
                                        {errors.port && (
                                            <p className='text-[10px] uppercase font-bold text-red-500 mt-1'>
                                                {errors.port}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>
                                        {t('admin.vdsNodes.form.tls_no_verify')}
                                    </Label>
                                    <Select
                                        value={form.tls_no_verify}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                tls_no_verify: e.target.value as 'true' | 'false',
                                            })
                                        }
                                    >
                                        <option value='false'>{t('admin.vdsNodes.form.tls_no_verify_false')}</option>
                                        <option value='true'>{t('admin.vdsNodes.form.tls_no_verify_true')}</option>
                                    </Select>
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.timeout')}</Label>
                                    <Input
                                        type='number'
                                        value={form.timeout}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                timeout: parseInt(e.target.value, 10) || 0,
                                            })
                                        }
                                        error={!!errors.timeout}
                                    />
                                    {errors.timeout && (
                                        <p className='text-[10px] uppercase font-bold text-red-500 mt-1'>
                                            {errors.timeout}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </PageCard>

                        <PageCard title={t('admin.vdsNodes.form.http_advanced')} icon={Server}>
                            <div className='space-y-6'>
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.headers')}</Label>
                                    <p className='text-xs text-muted-foreground'>
                                        {t('admin.vdsNodes.form.headers_help')}
                                    </p>
                                    <div className='space-y-2'>
                                        {extraHeaders.map((row, index) => (
                                            <div key={index} className='flex gap-2'>
                                                <Input
                                                    placeholder={t('admin.vdsNodes.form.headers_key_placeholder')}
                                                    value={row.key}
                                                    onChange={(e) => {
                                                        const next = [...extraHeaders];
                                                        next[index] = { ...next[index], key: e.target.value };
                                                        setExtraHeaders(next);
                                                    }}
                                                />
                                                <Input
                                                    placeholder={t('admin.vdsNodes.form.headers_value_placeholder')}
                                                    value={row.value}
                                                    onChange={(e) => {
                                                        const next = [...extraHeaders];
                                                        next[index] = { ...next[index], value: e.target.value };
                                                        setExtraHeaders(next);
                                                    }}
                                                />
                                                <Button
                                                    type='button'
                                                    size='icon'
                                                    variant='ghost'
                                                    onClick={() =>
                                                        setExtraHeaders((rows) => rows.filter((_, i) => i !== index))
                                                    }
                                                >
                                                    <Trash2 className='h-4 w-4' />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            onClick={() => setExtraHeaders((rows) => [...rows, { key: '', value: '' }])}
                                            className='mt-1'
                                        >
                                            <Plus className='h-4 w-4 mr-2' />
                                            {t('admin.vdsNodes.form.headers_add')}
                                        </Button>
                                    </div>
                                </div>

                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.params')}</Label>
                                    <p className='text-xs text-muted-foreground'>
                                        {t('admin.vdsNodes.form.params_help')}
                                    </p>
                                    <div className='space-y-2'>
                                        {extraParams.map((row, index) => (
                                            <div key={index} className='flex gap-2'>
                                                <Input
                                                    placeholder={t('admin.vdsNodes.form.params_key_placeholder')}
                                                    value={row.key}
                                                    onChange={(e) => {
                                                        const next = [...extraParams];
                                                        next[index] = { ...next[index], key: e.target.value };
                                                        setExtraParams(next);
                                                    }}
                                                />
                                                <Input
                                                    placeholder={t('admin.vdsNodes.form.params_value_placeholder')}
                                                    value={row.value}
                                                    onChange={(e) => {
                                                        const next = [...extraParams];
                                                        next[index] = { ...next[index], value: e.target.value };
                                                        setExtraParams(next);
                                                    }}
                                                />
                                                <Button
                                                    type='button'
                                                    size='icon'
                                                    variant='ghost'
                                                    onClick={() =>
                                                        setExtraParams((rows) => rows.filter((_, i) => i !== index))
                                                    }
                                                >
                                                    <Trash2 className='h-4 w-4' />
                                                </Button>
                                            </div>
                                        ))}
                                        <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            onClick={() => setExtraParams((rows) => [...rows, { key: '', value: '' }])}
                                            className='mt-1'
                                        >
                                            <Plus className='h-4 w-4 mr-2' />
                                            {t('admin.vdsNodes.form.params_add')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </PageCard>

                        <PageCard title={t('admin.vdsNodes.ips.title')} icon={Server}>
                            <div className='space-y-4'>
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.vdsNodes.ips.add_title')}</Label>
                                    <div className='grid grid-cols-1 sm:grid-cols-4 gap-3'>
                                        <div className='space-y-1'>
                                            <Input
                                                placeholder={t('admin.vdsNodes.ips.ip_placeholder')}
                                                value={ipForm.ip}
                                                onChange={(e) => setIpForm({ ...ipForm, ip: e.target.value })}
                                                error={!!ipErrors.ip}
                                            />
                                            {ipErrors.ip && (
                                                <p className='text-[10px] uppercase font-bold text-red-500 mt-0.5'>
                                                    {ipErrors.ip}
                                                </p>
                                            )}
                                        </div>
                                        <div className='space-y-1'>
                                            <Input
                                                placeholder={t('admin.vdsNodes.ips.cidr_placeholder')}
                                                value={ipForm.cidr}
                                                onChange={(e) => setIpForm({ ...ipForm, cidr: e.target.value })}
                                                error={!!ipErrors.cidr}
                                            />
                                            {ipErrors.cidr && (
                                                <p className='text-[10px] uppercase font-bold text-red-500 mt-0.5'>
                                                    {ipErrors.cidr}
                                                </p>
                                            )}
                                        </div>
                                        <div className='space-y-1'>
                                            <Input
                                                placeholder={t('admin.vdsNodes.ips.gateway_placeholder')}
                                                value={ipForm.gateway}
                                                onChange={(e) => setIpForm({ ...ipForm, gateway: e.target.value })}
                                                error={!!ipErrors.gateway}
                                            />
                                            {ipErrors.gateway && (
                                                <p className='text-[10px] uppercase font-bold text-red-500 mt-0.5'>
                                                    {ipErrors.gateway}
                                                </p>
                                            )}
                                        </div>
                                        <div className='space-y-1'>
                                            <Input
                                                placeholder={t('admin.vdsNodes.ips.notes_placeholder')}
                                                value={ipForm.notes}
                                                onChange={(e) => setIpForm({ ...ipForm, notes: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className='flex justify-end'>
                                        <Button type='button' size='sm' onClick={handleAddIp}>
                                            {t('admin.vdsNodes.ips.add_button')}
                                        </Button>
                                    </div>
                                </div>

                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>
                                        {t('admin.vdsNodes.ips.list_title')}
                                    </Label>
                                    <div className='rounded-xl border border-border/60 divide-y divide-border/60 bg-background/60'>
                                        {ipsLoading ? (
                                            <div className='flex items-center justify-center py-6'>
                                                <RefreshCw className='h-4 w-4 animate-spin text-muted-foreground' />
                                            </div>
                                        ) : ips.length === 0 ? (
                                            <div className='py-4 px-3 text-xs text-muted-foreground'>
                                                {t('admin.vdsNodes.ips.empty')}
                                            </div>
                                        ) : (
                                            ips.map((ip) => (
                                                <div
                                                    key={ip.id}
                                                    className='flex items-center justify-between gap-3 py-2.5 px-3 text-xs'
                                                >
                                                    <div className='flex flex-col gap-0.5'>
                                                        <span className='font-mono text-sm'>
                                                            {ip.ip}
                                                            {ip.cidr !== null ? `/${ip.cidr}` : ''}
                                                        </span>
                                                        <div className='flex flex-wrap gap-2 text-[11px] text-muted-foreground'>
                                                            {ip.gateway && (
                                                                <span>
                                                                    gw:{' '}
                                                                    <span className='font-mono text-[11px]'>
                                                                        {ip.gateway}
                                                                    </span>
                                                                </span>
                                                            )}
                                                            {ip.notes && <span>{ip.notes}</span>}
                                                        </div>
                                                    </div>
                                                    <div className='flex items-center gap-2'>
                                                        {ip.is_primary === 'true' ? (
                                                            <span className='px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/30'>
                                                                {t('admin.vdsNodes.ips.primary_badge')}
                                                            </span>
                                                        ) : (
                                                            <Button
                                                                type='button'
                                                                variant='outline'
                                                                onClick={() => handleSetPrimaryIp(ip.id)}
                                                            >
                                                                {t('admin.vdsNodes.ips.set_primary')}
                                                            </Button>
                                                        )}
                                                        <Button
                                                            type='button'
                                                            size='icon'
                                                            variant='ghost'
                                                            className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                                            onClick={() => handleDeleteIp(ip.id)}
                                                        >
                                                            <Trash2 className='h-4 w-4' />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </PageCard>
                    </div>
                </div>
            </form>

            <Sheet open={locationModalOpen} onOpenChange={setLocationModalOpen}>
                <SheetContent className='sm:max-w-2xl'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.vdsNodes.form.select_location')}</SheetTitle>
                        <SheetDescription>{t('admin.vdsNodes.form.select_location_description')}</SheetDescription>
                    </SheetHeader>

                    <div className='mt-6 space-y-4'>
                        <div className='relative'>
                            <SearchIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                            <Input
                                placeholder={t('admin.vdsNodes.form.search_locations')}
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
                                    {t('admin.vdsNodes.form.no_locations_found')}
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
                    </div>
                </SheetContent>
            </Sheet>

            <WidgetRenderer
                widgets={getWidgets('admin-vds-nodes-edit', 'bottom-of-page')}
                context={{ id: id as string }}
            />
        </div>
    );
}
