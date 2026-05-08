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
import { useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { getFeatherpanelApiErrorCode, getFeatherpanelApiErrorMessage } from '@/lib/api';
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
import { cn } from '@/lib/utils';
import { Server, ArrowLeft, Save, Search as SearchIcon, MapPin, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';

interface Location {
    id: number;
    name: string;
    description?: string;
}

export default function CreateNodePage() {
    const { t } = useTranslation();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
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

    const [errors, setErrors] = useState<Record<string, string>>({});

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-nodes-create');

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

    const openLocationPicker = useCallback(() => {
        setLocationPickerMode('select');
        fetchLocations();
        setLocationModalOpen(true);
    }, [fetchLocations]);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
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

            const { data } = await axios.put('/api/admin/nodes', submitData);
            toast.success(t('admin.node.messages.created'));
            const nodeId = data?.data?.node?.id;
            if (nodeId) {
                router.push(`/admin/nodes/${nodeId}/edit?tab=wings`);
            } else {
                router.push('/admin/nodes');
            }
        } catch (error: unknown) {
            console.error('Error creating node:', error);
            const apiMsg = getFeatherpanelApiErrorMessage(error);
            const code = getFeatherpanelApiErrorCode(error);
            if (code === 'INVALID_LOCATION_TYPE') {
                const detail = apiMsg ?? t('admin.node.form.location_invalid_type');
                setErrors((prev) => ({ ...prev, location_id: detail }));
            }
            toast.error(apiMsg ?? t('admin.node.messages.create_failed'));
        } finally {
            setLoading(false);
        }
    };

    const handleCreateLocationInline = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newLocationForm.name.trim();
        if (name.length < 2) {
            toast.error(t('admin.node.form.create_location_name_required'));
            return;
        }
        setCreatingLocation(true);
        try {
            const payload = {
                name,
                type: 'game' as const,
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
        <div className='mx-auto max-w-6xl px-4 py-8'>
            <WidgetRenderer widgets={getWidgets('admin-nodes-create', 'top-of-page')} />

            <PageHeader
                title={t('admin.node.form.create_title')}
                description={t('admin.node.form.create_description')}
                icon={Server}
                actions={
                    <Button variant='outline' onClick={() => router.back()}>
                        <ArrowLeft className='mr-2 h-4 w-4' />
                        {t('common.back')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-nodes-create', 'after-header')} />

            <form onSubmit={handleSubmit} className='mt-8 space-y-8'>
                <div className='grid grid-cols-1 gap-8 lg:grid-cols-2'>
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
                                        placeholder={t('admin.node.form.description_placeholder')}
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        className='min-h-[100px]'
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.node.form.location')}</Label>
                                    <div className='flex gap-2'>
                                        <button
                                            type='button'
                                            onClick={openLocationPicker}
                                            aria-label={t('admin.node.form.select_location')}
                                            className='bg-muted/30 border-border/50 hover:bg-muted/45 hover:border-border flex h-11 flex-1 cursor-pointer items-center rounded-xl border px-3 text-left text-sm transition-colors'
                                        >
                                            {form.location_id && selectedLocationName ? (
                                                <div className='flex items-center gap-2'>
                                                    <MapPin className='text-primary h-4 w-4' />
                                                    <span className='text-foreground font-medium'>
                                                        {selectedLocationName}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className='text-muted-foreground'>
                                                    {t('admin.node.form.select_location')}
                                                </span>
                                            )}
                                        </button>
                                        <Button type='button' size='icon' onClick={openLocationPicker}>
                                            <SearchIcon className='h-4 w-4' />
                                        </Button>
                                    </div>
                                    {errors.location_id && (
                                        <p className='mt-1 text-[10px] font-bold text-red-500 uppercase'>
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
                                    <p className='text-muted-foreground/70 text-xs italic'>
                                        {t('admin.node.form.visibility_help')}
                                    </p>
                                </div>
                            </div>
                        </PageCard>

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
                                            <span className='text-muted-foreground/50 absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold'>
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
                                            <span className='text-muted-foreground/50 absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold'>
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
                                            <span className='text-muted-foreground/50 absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold'>
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
                                            <span className='text-muted-foreground/50 absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold'>
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
                                    <p className='text-muted-foreground/70 text-xs italic'>
                                        {t('admin.node.form.daemon_base_help')}
                                    </p>
                                </div>
                            </div>
                        </PageCard>
                    </div>

                    <div className='space-y-8'>
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
                                    <p className='text-muted-foreground/70 text-xs italic'>
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
                                        <p className='text-xs font-medium text-yellow-500 italic'>
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
                                    <p className='text-muted-foreground/70 text-xs italic'>
                                        {t('admin.node.form.proxy_help')}
                                    </p>
                                </div>
                            </div>
                        </PageCard>

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
                                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
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
                                    <Label className='text-sm font-semibold'>
                                        {t('admin.node.form.sftp_subdomain')}
                                    </Label>
                                    <Input
                                        placeholder={t('admin.node.form.sftp_subdomain_placeholder')}
                                        value={form.sftp_subdomain}
                                        onChange={(e) => setForm({ ...form, sftp_subdomain: e.target.value })}
                                        error={!!errors.sftp_subdomain}
                                    />
                                    <p className='text-muted-foreground/70 text-xs italic'>
                                        {t('admin.node.form.sftp_subdomain_help')}
                                    </p>
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
                                    <p className='text-muted-foreground/70 text-xs italic'>
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
                                        <span className='text-muted-foreground/50 absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold'>
                                            {t('admin.node.form.memory_mib')}
                                        </span>
                                    </div>
                                    <p className='text-muted-foreground/70 text-xs italic'>
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
                        className='bg-primary hover:bg-primary/90 h-14 w-full min-w-[200px] text-lg transition-all sm:w-auto'
                    >
                        <Save className='mr-3 h-5 w-5' />
                        {t('admin.node.form.submit_create')}
                    </Button>
                </div>
            </form>

            <Sheet
                open={locationModalOpen}
                onOpenChange={(open) => {
                    setLocationModalOpen(open);
                    if (!open) {
                        setLocationPickerMode('select');
                        setNewLocationForm({ name: '', description: '', flag_code: '__NONE__' });
                    }
                }}
            >
                <SheetContent className='sm:max-w-2xl'>
                    <SheetHeader>
                        <SheetTitle>{t('admin.node.form.select_location')}</SheetTitle>
                        <SheetDescription>
                            {locationPickerMode === 'select'
                                ? t('admin.node.form.select_location_description', {
                                      total: String(locationPagination.total_records || 0),
                                  })
                                : t('admin.node.form.create_location_hint')}
                        </SheetDescription>
                    </SheetHeader>

                    <div className='mt-6 space-y-4'>
                        <div className='border-border/60 bg-muted/30 flex gap-1 rounded-xl border p-1'>
                            <button
                                type='button'
                                onClick={() => setLocationPickerMode('select')}
                                className={cn(
                                    'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                    locationPickerMode === 'select'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                <SearchIcon className='h-4 w-4' />
                                {t('admin.node.form.location_picker_existing')}
                            </button>
                            <button
                                type='button'
                                onClick={() => setLocationPickerMode('create')}
                                className={cn(
                                    'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                    locationPickerMode === 'create'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                <Plus className='h-4 w-4' />
                                {t('admin.node.form.location_picker_create')}
                            </button>
                        </div>

                        {locationPickerMode === 'create' ? (
                            <form onSubmit={handleCreateLocationInline} className='space-y-4'>
                                <div className='space-y-2'>
                                    <Label htmlFor='inline-loc-name'>{t('admin.locations.form.name')} *</Label>
                                    <Input
                                        id='inline-loc-name'
                                        value={newLocationForm.name}
                                        onChange={(e) =>
                                            setNewLocationForm((prev) => ({ ...prev, name: e.target.value }))
                                        }
                                        placeholder={t('admin.locations.form.name')}
                                        required
                                        minLength={2}
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='inline-loc-desc'>{t('admin.locations.form.description')}</Label>
                                    <Input
                                        id='inline-loc-desc'
                                        value={newLocationForm.description}
                                        onChange={(e) =>
                                            setNewLocationForm((prev) => ({ ...prev, description: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='inline-loc-flag'>{t('admin.locations.form.flag')}</Label>
                                    <Select
                                        id='inline-loc-flag'
                                        value={newLocationForm.flag_code}
                                        onChange={(e) =>
                                            setNewLocationForm((prev) => ({
                                                ...prev,
                                                flag_code: e.target.value,
                                            }))
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
                                <div className='flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end'>
                                    <Button
                                        type='button'
                                        variant='outline'
                                        onClick={() => setLocationPickerMode('select')}
                                    >
                                        {t('common.cancel')}
                                    </Button>
                                    <Button type='submit' loading={creatingLocation}>
                                        <Plus className='mr-2 h-4 w-4' />
                                        {t('admin.node.form.create_location_submit')}
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <>
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
                                                    setForm((prev) => ({
                                                        ...prev,
                                                        location_id: location.id.toString(),
                                                    }));
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
                            </>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <WidgetRenderer widgets={getWidgets('admin-nodes-create', 'bottom-of-page')} />
        </div>
    );
}
