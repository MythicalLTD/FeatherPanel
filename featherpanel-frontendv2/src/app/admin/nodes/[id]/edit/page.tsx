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

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Server, ArrowLeft, Save, Copy, Check, RefreshCw, Database, Network, Shield, Settings2 } from 'lucide-react';

interface Location {
    id: number;
    name: string;
}

interface NodeData {
    id: number;
    uuid: string;
    name: string;
    description: string;
    location_id: number;
    fqdn: string;
    scheme: string;
    behind_proxy: number;
    maintenance_mode: number;
    memory: number;
    memory_overallocate: number;
    disk: number;
    disk_overallocate: number;
    upload_size: number;
    daemonListen: number;
    daemonSFTP: number;
    daemonBase: string;
    public_ip_v4: string | null;
    public_ip_v6: string | null;
    daemon_token_id: string;
    daemon_token: string;
    public: number;
}

export default function EditNodePage() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useParams();
    const nodeId = params.id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [locations, setLocations] = useState<Location[]>([]);
    const [nodeData, setNodeData] = useState<NodeData | null>(null);
    const [copied, setCopied] = useState(false);
    const [resetting, setResetting] = useState(false);

    const [form, setForm] = useState({
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

    const [errors, setErrors] = useState<Record<string, string>>({});

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        try {
            const [nodeRes, locationsRes] = await Promise.all([
                axios.get(`/api/admin/nodes`), // Fetching all and finding by ID since we don't have a single GET endpoint confirmed
                axios.get('/api/admin/locations', { params: { limit: 100 } }),
            ]);

            const allNodes: NodeData[] = nodeRes.data.data.nodes || [];
            const node = allNodes.find((n) => n.id === Number(nodeId));

            if (!node) {
                toast.error(t('admin.node.messages.fetch_failed'));
                router.push('/admin/nodes');
                return;
            }

            setNodeData(node);
            setLocations(locationsRes.data.data.locations || []);

            setForm({
                name: node.name,
                description: node.description || '',
                fqdn: node.fqdn,
                location_id: node.location_id.toString(),
                public: node.public === 1 ? 'true' : 'false',
                scheme: node.scheme,
                behind_proxy: node.behind_proxy === 1 ? 'true' : 'false',
                maintenance_mode: node.maintenance_mode === 1 ? 'true' : 'false',
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

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

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

    const copyToClipboard = () => {
        navigator.clipboard.writeText(wingsConfigYaml);
        setCopied(true);
        toast.success(t('admin.node.wings.config_copied'));
        setTimeout(() => setCopied(false), 2000);
    };

    const handleResetKey = async () => {
        setResetting(true);
        try {
            await axios.post(`/api/admin/nodes/${nodeId}/reset-key`);
            toast.success(t('admin.node.wings.reset_key_success'));
            fetchInitialData(); // Refresh data to get new tokens
        } catch (error) {
            console.error('Error resetting key:', error);
            toast.error(t('admin.node.wings.reset_key_failed'));
        } finally {
            setResetting(false);
        }
    };

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};
        if (!form.name) newErrors.name = t('admin.node.form.name_required') || 'Name is required';
        if (!form.fqdn) {
            newErrors.fqdn = t('admin.node.form.fqdn_required') || 'FQDN is required';
        } else {
            const fqdnRegex =
                /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
            if (!fqdnRegex.test(form.fqdn)) {
                newErrors.fqdn = t('admin.node.form.fqdn_invalid') || 'Invalid FQDN format';
            }
        }
        if (!form.location_id) newErrors.location_id = t('admin.node.form.location_required') || 'Location is required';
        if (!form.daemonBase)
            newErrors.daemonBase = t('admin.node.form.daemon_base_required') || 'Daemon base path is required';

        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (form.public_ip_v4 && !ipv4Regex.test(form.public_ip_v4)) {
            newErrors.public_ip_v4 = t('admin.node.form.ipv4_invalid') || 'Invalid IPv4 address';
        }

        const ipv6Regex =
            /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
        if (form.public_ip_v6 && !ipv6Regex.test(form.public_ip_v6)) {
            newErrors.public_ip_v6 = t('admin.node.form.ipv6_invalid') || 'Invalid IPv6 address';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [form, t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
            fetchInitialData(); // Refresh local data
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
            <div className='max-w-6xl mx-auto py-8 px-4 text-center'>
                <RefreshCw className='h-8 w-8 animate-spin mx-auto text-primary' />
                <p className='mt-4 text-muted-foreground'>{t('common.loading')}</p>
            </div>
        );
    }

    return (
        <div className='max-w-6xl mx-auto py-8 px-4'>
            <PageHeader
                title={t('admin.node.form.edit_title')}
                description={t('admin.node.form.edit_description')}
                icon={Server}
                actions={
                    <Button variant='outline' onClick={() => router.back()}>
                        <ArrowLeft className='h-4 w-4 mr-2' />
                        {t('common.back')}
                    </Button>
                }
            />

            <form onSubmit={handleSubmit} className='mt-8'>
                <Tabs defaultValue='basic' className='space-y-8'>
                    <div className='flex items-center justify-between bg-card/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/5 shadow-sm overflow-x-auto scrollbar-hide'>
                        <TabsList className='bg-transparent h-auto p-0 gap-1'>
                            <TabsTrigger
                                value='basic'
                                className='data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl h-11 px-6 font-semibold transition-all'
                            >
                                <Database className='h-4 w-4 mr-2' />
                                {t('admin.node.form.basic_details')}
                            </TabsTrigger>
                            <TabsTrigger
                                value='config'
                                className='data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl h-11 px-6 font-semibold transition-all'
                            >
                                <Settings2 className='h-4 w-4 mr-2' />
                                {t('admin.node.form.configuration')}
                            </TabsTrigger>
                            <TabsTrigger
                                value='network'
                                className='data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl h-11 px-6 font-semibold transition-all'
                            >
                                <Network className='h-4 w-4 mr-2' />
                                {t('admin.node.form.network')}
                            </TabsTrigger>
                            <TabsTrigger
                                value='advanced'
                                className='data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl h-11 px-6 font-semibold transition-all'
                            >
                                <Shield className='h-4 w-4 mr-2' />
                                {t('admin.node.form.advanced')}
                            </TabsTrigger>
                            <TabsTrigger
                                value='wings'
                                className='data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl h-11 px-6 font-semibold transition-all'
                            >
                                <Shield className='h-4 w-4 mr-2' />
                                {t('admin.node.form.wings_config')}
                            </TabsTrigger>
                        </TabsList>

                        <div className='hidden sm:block px-4'>
                            <Button
                                type='submit'
                                loading={saving}
                                className='h-11 px-6 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 rounded-xl'
                            >
                                <Save className='h-4 w-4 mr-2' />
                                {t('admin.node.form.submit_save')}
                            </Button>
                        </div>
                    </div>

                    <TabsContent value='basic'>
                        <PageCard title={t('admin.node.form.basic_details')} icon={Database}>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                                <div className='space-y-6'>
                                    <div className='space-y-2'>
                                        <Label className='text-sm font-semibold'>{t('admin.node.form.name')}</Label>
                                        <Input
                                            placeholder='My Production Node'
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            error={!!errors.name}
                                        />
                                    </div>
                                    <div className='space-y-2'>
                                        <Label className='text-sm font-semibold'>
                                            {t('admin.node.form.description')}
                                        </Label>
                                        <Textarea
                                            placeholder='A brief description of this node...'
                                            value={form.description}
                                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                                            className='min-h-[120px]'
                                        />
                                    </div>
                                </div>
                                <div className='space-y-6'>
                                    <div className='space-y-2'>
                                        <Label className='text-sm font-semibold'>{t('admin.node.form.location')}</Label>
                                        <Select
                                            value={form.location_id}
                                            onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                                            className={errors.location_id ? 'border-red-500' : ''}
                                        >
                                            <option value=''>{t('admin.node.form.select_location')}</option>
                                            {locations.map((loc) => (
                                                <option key={loc.id} value={loc.id}>
                                                    {loc.name}
                                                </option>
                                            ))}
                                        </Select>
                                        {errors.location_id && (
                                            <p className='text-[10px] uppercase font-bold text-red-500 mt-1'>
                                                {errors.location_id}
                                            </p>
                                        )}
                                    </div>
                                    <div className='space-y-2'>
                                        <Label className='text-sm font-semibold'>
                                            {t('admin.node.form.visibility')}
                                        </Label>
                                        <Select
                                            value={form.public}
                                            onChange={(e) => setForm({ ...form, public: e.target.value })}
                                        >
                                            <option value='true'>{t('admin.node.form.visibility_public')}</option>
                                            <option value='false'>{t('admin.node.form.visibility_private')}</option>
                                        </Select>
                                        <p className='text-xs text-muted-foreground/70 italic'>
                                            {t('admin.node.form.visibility_help')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </PageCard>
                    </TabsContent>

                    <TabsContent value='config'>
                        <PageCard title={t('admin.node.form.configuration')} icon={Settings2}>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                                <div className='space-y-6'>
                                    <div className='grid grid-cols-2 gap-4'>
                                        <div className='space-y-2'>
                                            <Label className='text-sm font-semibold'>
                                                {t('admin.node.form.memory')}
                                            </Label>
                                            <div className='relative'>
                                                <Input
                                                    type='number'
                                                    value={form.memory}
                                                    onChange={(e) =>
                                                        setForm({ ...form, memory: parseInt(e.target.value) || 0 })
                                                    }
                                                />
                                                <span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/50'>
                                                    {t('admin.node.form.memory_mib')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className='space-y-2'>
                                            <Label className='text-sm font-semibold'>
                                                {t('admin.node.form.memory_overallocate')}
                                            </Label>
                                            <div className='relative'>
                                                <Input
                                                    type='number'
                                                    value={form.memory_overallocate}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            memory_overallocate: parseInt(e.target.value) || 0,
                                                        })
                                                    }
                                                />
                                                <span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/50'>
                                                    %
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className='grid grid-cols-2 gap-4'>
                                        <div className='space-y-2'>
                                            <Label className='text-sm font-semibold'>{t('admin.node.form.disk')}</Label>
                                            <div className='relative'>
                                                <Input
                                                    type='number'
                                                    value={form.disk}
                                                    onChange={(e) =>
                                                        setForm({ ...form, disk: parseInt(e.target.value) || 0 })
                                                    }
                                                />
                                                <span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/50'>
                                                    {t('admin.node.form.memory_mib')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className='space-y-2'>
                                            <Label className='text-sm font-semibold'>
                                                {t('admin.node.form.disk_overallocate')}
                                            </Label>
                                            <div className='relative'>
                                                <Input
                                                    type='number'
                                                    value={form.disk_overallocate}
                                                    onChange={(e) =>
                                                        setForm({
                                                            ...form,
                                                            disk_overallocate: parseInt(e.target.value) || 0,
                                                        })
                                                    }
                                                />
                                                <span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/50'>
                                                    %
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className='space-y-6'>
                                    <div className='space-y-2'>
                                        <Label className='text-sm font-semibold'>
                                            {t('admin.node.form.daemon_base')}
                                        </Label>
                                        <Input
                                            placeholder='/var/lib/featherpanel/volumes'
                                            value={form.daemonBase}
                                            onChange={(e) => setForm({ ...form, daemonBase: e.target.value })}
                                            error={!!errors.daemonBase}
                                        />
                                        <p className='text-xs text-muted-foreground/70 italic'>
                                            {t('admin.node.form.daemon_base_help')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </PageCard>
                    </TabsContent>

                    <TabsContent value='network'>
                        <PageCard title={t('admin.node.form.network')} icon={Network}>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                                <div className='space-y-6'>
                                    <div className='space-y-2'>
                                        <Label className='text-sm font-semibold'>{t('admin.node.form.fqdn')}</Label>
                                        <Input
                                            placeholder='node.example.com'
                                            value={form.fqdn}
                                            onChange={(e) => setForm({ ...form, fqdn: e.target.value })}
                                            error={!!errors.fqdn}
                                        />
                                        <p className='text-xs text-muted-foreground/70 italic'>
                                            {t('admin.node.form.fqdn_help')}
                                        </p>
                                    </div>
                                </div>
                                <div className='space-y-6'>
                                    <div className='space-y-2'>
                                        <Label className='text-sm font-semibold'>{t('admin.node.form.ssl')}</Label>
                                        <Select
                                            value={form.scheme}
                                            onChange={(e) => setForm({ ...form, scheme: e.target.value })}
                                        >
                                            <option value='https'>{t('admin.node.form.ssl_https')}</option>
                                            <option value='http'>{t('admin.node.form.ssl_http')}</option>
                                        </Select>
                                        {form.scheme === 'https' && (
                                            <p className='text-xs text-yellow-500 font-medium italic'>
                                                {t('admin.node.form.ssl_warning')}
                                            </p>
                                        )}
                                    </div>
                                    <div className='space-y-2'>
                                        <Label className='text-sm font-semibold'>{t('admin.node.form.proxy')}</Label>
                                        <Select
                                            value={form.behind_proxy}
                                            onChange={(e) => setForm({ ...form, behind_proxy: e.target.value })}
                                        >
                                            <option value='false'>{t('admin.node.form.proxy_none')}</option>
                                            <option value='true'>{t('admin.node.form.proxy_yes')}</option>
                                        </Select>
                                        <p className='text-xs text-muted-foreground/70 italic'>
                                            {t('admin.node.form.proxy_help')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </PageCard>
                    </TabsContent>

                    <TabsContent value='advanced'>
                        <PageCard title={t('admin.node.form.advanced')} icon={Shield}>
                            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
                                <div className='space-y-6'>
                                    <div className='grid grid-cols-2 gap-4'>
                                        <div className='space-y-2'>
                                            <Label className='text-sm font-semibold'>
                                                {t('admin.node.form.daemon_port')}
                                            </Label>
                                            <Input
                                                type='number'
                                                value={form.daemonListen}
                                                onChange={(e) =>
                                                    setForm({ ...form, daemonListen: parseInt(e.target.value) || 0 })
                                                }
                                            />
                                        </div>
                                        <div className='space-y-2'>
                                            <Label className='text-sm font-semibold'>
                                                {t('admin.node.form.daemon_sftp_port')}
                                            </Label>
                                            <Input
                                                type='number'
                                                value={form.daemonSFTP}
                                                onChange={(e) =>
                                                    setForm({ ...form, daemonSFTP: parseInt(e.target.value) || 0 })
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                        <div className='space-y-2'>
                                            <Label className='text-sm font-semibold'>{t('admin.node.form.ipv4')}</Label>
                                            <Input
                                                placeholder='127.0.0.1'
                                                value={form.public_ip_v4}
                                                onChange={(e) => setForm({ ...form, public_ip_v4: e.target.value })}
                                                error={!!errors.public_ip_v4}
                                            />
                                        </div>
                                        <div className='space-y-2'>
                                            <Label className='text-sm font-semibold'>{t('admin.node.form.ipv6')}</Label>
                                            <Input
                                                placeholder='::1'
                                                value={form.public_ip_v6}
                                                onChange={(e) => setForm({ ...form, public_ip_v6: e.target.value })}
                                                error={!!errors.public_ip_v6}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className='space-y-6'>
                                    <div className='space-y-2'>
                                        <Label className='text-sm font-semibold'>
                                            {t('admin.node.form.maintenance')}
                                        </Label>
                                        <Select
                                            value={form.maintenance_mode}
                                            onChange={(e) => setForm({ ...form, maintenance_mode: e.target.value })}
                                        >
                                            <option value='false'>{t('admin.node.form.maintenance_disabled')}</option>
                                            <option value='true'>{t('admin.node.form.maintenance_enabled')}</option>
                                        </Select>
                                        <p className='text-xs text-muted-foreground/70 italic'>
                                            {t('admin.node.form.maintenance_help')}
                                        </p>
                                    </div>
                                    <div className='space-y-2'>
                                        <Label className='text-sm font-semibold'>
                                            {t('admin.node.form.upload_size')}
                                        </Label>
                                        <div className='relative'>
                                            <Input
                                                type='number'
                                                value={form.upload_size}
                                                onChange={(e) =>
                                                    setForm({ ...form, upload_size: parseInt(e.target.value) || 0 })
                                                }
                                            />
                                            <span className='absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground/50'>
                                                {t('admin.node.form.memory_mib')}
                                            </span>
                                        </div>
                                        <p className='text-xs text-muted-foreground/70 italic'>
                                            {t('admin.node.form.upload_size_help')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </PageCard>
                    </TabsContent>

                    <TabsContent value='wings'>
                        <PageCard title={t('admin.node.wings.config_title')} icon={Shield}>
                            <div className='space-y-6'>
                                <p className='text-sm text-muted-foreground'>{t('admin.node.wings.config_help')}</p>
                                <div className='relative group'>
                                    <pre className='bg-zinc-950 p-6 rounded-2xl overflow-x-auto text-xs font-mono text-zinc-300 border border-white/5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent'>
                                        {wingsConfigYaml}
                                    </pre>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        size='sm'
                                        className='absolute top-3 right-3 bg-zinc-900/80 backdrop-blur-md border-white/10 hover:bg-zinc-800'
                                        onClick={copyToClipboard}
                                    >
                                        {copied ? (
                                            <Check className='h-4 w-4 mr-2 text-green-500' />
                                        ) : (
                                            <Copy className='h-4 w-4 mr-2' />
                                        )}
                                        {copied
                                            ? t('admin.node.wings.config_copied')
                                            : t('admin.node.wings.copy_config')}
                                    </Button>
                                </div>

                                <div className='pt-6 border-t border-white/5 space-y-4'>
                                    <div className='flex items-center justify-between'>
                                        <div>
                                            <h4 className='text-sm font-bold text-white'>
                                                {t('admin.node.wings.reset_key')}
                                            </h4>
                                            <p className='text-xs text-muted-foreground mt-1'>
                                                Generating a new master daemon key will invalidate the old one. You will
                                                need to update your Wings configuration manually.
                                            </p>
                                        </div>
                                        <Button
                                            type='button'
                                            variant='destructive'
                                            onClick={handleResetKey}
                                            loading={resetting}
                                            className='h-11 px-6 shadow-lg shadow-red-500/10'
                                        >
                                            <RefreshCw className='h-4 w-4 mr-2' />
                                            {t('admin.node.wings.reset_key')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </PageCard>
                    </TabsContent>
                </Tabs>

                <div className='flex justify-end pt-8 sm:hidden'>
                    <Button
                        type='submit'
                        loading={saving}
                        className='w-full h-14 text-lg shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-all'
                    >
                        <Save className='h-5 w-5 mr-3' />
                        {t('admin.node.form.submit_save')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
