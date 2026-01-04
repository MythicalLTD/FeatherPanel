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

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Server, ArrowLeft, Save } from 'lucide-react';

interface Location {
    id: number;
    name: string;
}

export default function CreateNodePage() {
    const { t } = useTranslation();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [locations, setLocations] = useState<Location[]>([]);
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

    useEffect(() => {
        const fetchLocations = async () => {
            try {
                const { data } = await axios.get('/api/admin/locations', {
                    params: { limit: 100 },
                });
                setLocations(data.data.locations || []);
            } catch (error) {
                console.error('Error fetching locations:', error);
            }
        };
        fetchLocations();
    }, []);

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

        // IP validation
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

        setLoading(true);
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

            await axios.put('/api/admin/nodes', submitData);
            toast.success(t('admin.node.messages.created') || 'Node created successfully');
            router.push('/admin/nodes');
        } catch (error: unknown) {
            console.error('Error creating node:', error);
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(
                axiosError.response?.data?.message || t('admin.node.messages.create_failed') || 'Failed to create node',
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='max-w-6xl mx-auto py-8 px-4'>
            <PageHeader
                title={t('admin.node.form.create_title')}
                description={t('admin.node.form.create_description')}
                icon={Server}
                actions={
                    <Button variant='outline' onClick={() => router.back()}>
                        <ArrowLeft className='h-4 w-4 mr-2' />
                        {t('common.back')}
                    </Button>
                }
            />

            <form onSubmit={handleSubmit} className='space-y-8 mt-8'>
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
                    {/* Basic Details */}
                    <div className='space-y-8'>
                        <PageCard title={t('admin.node.form.basic_details')} icon={Server}>
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
                                    <Label className='text-sm font-semibold'>{t('admin.node.form.description')}</Label>
                                    <Textarea
                                        placeholder='A brief description of this node...'
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        className='min-h-[100px]'
                                    />
                                </div>
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
                                    <Label className='text-sm font-semibold'>{t('admin.node.form.visibility')}</Label>
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
                        </PageCard>

                        {/* Configuration */}
                        <PageCard title={t('admin.node.form.configuration')} icon={Server}>
                            <div className='space-y-6'>
                                <div className='grid grid-cols-2 gap-4'>
                                    <div className='space-y-2'>
                                        <Label className='text-sm font-semibold'>{t('admin.node.form.memory')}</Label>
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
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.node.form.daemon_base')}</Label>
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
                        </PageCard>
                    </div>

                    <div className='space-y-8'>
                        {/* Network */}
                        <PageCard title={t('admin.node.form.network')} icon={Server}>
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
                        </PageCard>

                        {/* Advanced */}
                        <PageCard title={t('admin.node.form.advanced')} icon={Server}>
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
                                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.node.form.maintenance')}</Label>
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
                                    <Label className='text-sm font-semibold'>{t('admin.node.form.upload_size')}</Label>
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
                        </PageCard>
                    </div>
                </div>

                <div className='flex justify-end pt-4'>
                    <Button
                        type='submit'
                        loading={loading}
                        className='w-full sm:w-auto min-w-[200px] h-14 text-lg shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 transition-all'
                    >
                        <Save className='h-5 w-5 mr-3' />
                        {t('admin.node.form.submit_create')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
