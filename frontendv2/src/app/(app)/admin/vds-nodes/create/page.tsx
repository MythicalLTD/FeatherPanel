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
    Search as SearchIcon,
    MapPin,
    ChevronLeft,
    ChevronRight,
    Plus,
    Trash2,
} from 'lucide-react';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import { cn } from '@/lib/utils';

interface Location {
    id: number;
    name: string;
    description?: string;
    type: 'game' | 'vps' | 'web';
}

export default function CreateVdsNodePage() {
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

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-vds-nodes-create');

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
                    type: 'vps',
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
        if (!form.secret.trim()) newErrors.secret = t('admin.vdsNodes.form.secret_required');

        if (!form.port || form.port < 1 || form.port > 65535) {
            newErrors.port = t('admin.vdsNodes.form.port_invalid');
        }

        if (!form.timeout || form.timeout < 1) {
            newErrors.timeout = t('admin.vdsNodes.form.timeout_invalid');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [form, t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
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

            const { data } = await axios.put('/api/admin/vm-nodes', submitData);
            toast.success(t('admin.vdsNodes.messages.created') || t('admin.vdsNodes.messages.fetch_failed'));
            const nodeId = data?.data?.vm_node?.id;
            if (nodeId) {
                router.push(`/admin/vds-nodes/${nodeId}/edit`);
            } else {
                router.push('/admin/vds-nodes');
            }
        } catch (error) {
            console.error('Error creating VDS node:', error);
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.vdsNodes.messages.create_failed') || t('admin.vdsNodes.messages.fetch_failed'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateLocationInline = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = newLocationForm.name.trim();
        if (name.length < 2) {
            toast.error(t('admin.vdsNodes.form.create_location_name_required'));
            return;
        }
        setCreatingLocation(true);
        try {
            const payload = {
                name,
                type: 'vps' as const,
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
        <div className='mx-auto max-w-5xl px-4 py-8'>
            <WidgetRenderer widgets={getWidgets('admin-vds-nodes-create', 'top-of-page')} />

            <PageHeader
                title={t('admin.vdsNodes.form.create_title')}
                description={t('admin.vdsNodes.form.create_description')}
                icon={Server}
                actions={
                    <Button variant='outline' onClick={() => router.back()}>
                        <ArrowLeft className='mr-2 h-4 w-4' />
                        {t('common.back')}
                    </Button>
                }
            />

            <WidgetRenderer widgets={getWidgets('admin-vds-nodes-create', 'after-header')} />

            <form onSubmit={handleSubmit} className='mt-8 space-y-8'>
                <div className='grid grid-cols-1 gap-8 lg:grid-cols-2'>
                    <div className='space-y-8'>
                        <PageCard title={t('admin.vdsNodes.form.basic_details')} icon={Server}>
                            <div className='space-y-6'>
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.name')}</Label>
                                    <Input
                                        placeholder='Proxmox Node A'
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        error={!!errors.name}
                                    />
                                    {errors.name && (
                                        <p className='mt-1 text-[10px] font-bold text-red-500 uppercase'>
                                            {errors.name}
                                        </p>
                                    )}
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>
                                        {t('admin.vdsNodes.form.description')}
                                    </Label>
                                    <Textarea
                                        placeholder={t('admin.vdsNodes.form.description_placeholder')}
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        className='min-h-[100px]'
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.location')}</Label>
                                    <div className='flex gap-2'>
                                        <button
                                            type='button'
                                            onClick={openLocationPicker}
                                            aria-label={t('admin.vdsNodes.form.select_location')}
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
                                                    {t('admin.vdsNodes.form.select_location')}
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
                            </div>
                        </PageCard>

                        <PageCard title={t('admin.vdsNodes.form.proxmox')} icon={Server}>
                            <div className='space-y-6'>
                                <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100'>
                                    For VDS console access over VNC, install the FeatherPanel VNC agent on the Proxmox
                                    node using:
                                    <div className='mt-2 rounded-md bg-black/30 px-3 py-2 font-mono text-xs break-all'>
                                        curl -sSL https://get.featherpanel.com/installer.sh | bash
                                    </div>
                                    Then select the VNC option during installation. Without this agent, VDS console
                                    connections will not work. Also make sure Proxmox is exposed on a domain (or is in
                                    the same domain/network context), otherwise VNC may also fail.
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.user')}</Label>
                                    <Input
                                        placeholder='root@pam'
                                        value={form.user}
                                        onChange={(e) => setForm({ ...form, user: e.target.value })}
                                        error={!!errors.user}
                                    />
                                    {errors.user && (
                                        <p className='mt-1 text-[10px] font-bold text-red-500 uppercase'>
                                            {errors.user}
                                        </p>
                                    )}
                                </div>
                                <div className='space-y-2'>
                                    <div className='rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100'>
                                        When creating the API token, make sure to create it for the user{' '}
                                        <span className='font-semibold'>root</span> with{' '}
                                        <span className='font-semibold'>no privilege separation</span>.
                                    </div>
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.token_id')}</Label>
                                    <Input
                                        placeholder='mytokenid'
                                        value={form.token_id}
                                        onChange={(e) => setForm({ ...form, token_id: e.target.value })}
                                        error={!!errors.token_id}
                                    />
                                    {errors.token_id && (
                                        <p className='mt-1 text-[10px] font-bold text-red-500 uppercase'>
                                            {errors.token_id}
                                        </p>
                                    )}
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.secret')}</Label>
                                    <Input
                                        type='password'
                                        placeholder='********'
                                        value={form.secret}
                                        onChange={(e) => setForm({ ...form, secret: e.target.value })}
                                        error={!!errors.secret}
                                    />
                                    {errors.secret && (
                                        <p className='mt-1 text-[10px] font-bold text-red-500 uppercase'>
                                            {errors.secret}
                                        </p>
                                    )}
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
                                        placeholder='proxmox.example.com'
                                        value={form.fqdn}
                                        onChange={(e) => setForm({ ...form, fqdn: e.target.value })}
                                        error={!!errors.fqdn}
                                    />
                                    {errors.fqdn && (
                                        <p className='mt-1 text-[10px] font-bold text-red-500 uppercase'>
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
                                            <p className='mt-1 text-[10px] font-bold text-red-500 uppercase'>
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
                                        <p className='mt-1 text-[10px] font-bold text-red-500 uppercase'>
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
                                    <p className='text-muted-foreground text-xs'>
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
                                            <Plus className='mr-2 h-4 w-4' />
                                            {t('admin.vdsNodes.form.headers_add')}
                                        </Button>
                                    </div>
                                </div>

                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.vdsNodes.form.params')}</Label>
                                    <p className='text-muted-foreground text-xs'>
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
                                            <Plus className='mr-2 h-4 w-4' />
                                            {t('admin.vdsNodes.form.params_add')}
                                        </Button>
                                    </div>
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
                        {t('admin.vdsNodes.form.submit_create')}
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
                        <SheetTitle>{t('admin.vdsNodes.form.select_location')}</SheetTitle>
                        <SheetDescription>
                            {locationPickerMode === 'select'
                                ? t('admin.vdsNodes.form.select_location_sheet_description', {
                                      total: String(locationPagination.total_records || 0),
                                  })
                                : t('admin.vdsNodes.form.create_location_hint')}
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
                                {t('admin.vdsNodes.form.location_picker_existing')}
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
                                {t('admin.vdsNodes.form.location_picker_create')}
                            </button>
                        </div>

                        {locationPickerMode === 'create' ? (
                            <form onSubmit={handleCreateLocationInline} className='space-y-4'>
                                <div className='space-y-2'>
                                    <Label htmlFor='vds-inline-loc-name'>{t('admin.locations.form.name')} *</Label>
                                    <Input
                                        id='vds-inline-loc-name'
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
                                    <Label htmlFor='vds-inline-loc-desc'>{t('admin.locations.form.description')}</Label>
                                    <Input
                                        id='vds-inline-loc-desc'
                                        value={newLocationForm.description}
                                        onChange={(e) =>
                                            setNewLocationForm((prev) => ({ ...prev, description: e.target.value }))
                                        }
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='vds-inline-loc-flag'>{t('admin.locations.form.flag')}</Label>
                                    <Select
                                        id='vds-inline-loc-flag'
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
                                        {t('admin.vdsNodes.form.create_location_submit')}
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div className='relative'>
                                    <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform' />
                                    <Input
                                        placeholder={t('admin.vdsNodes.form.search_locations')}
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
                                            {t('admin.vdsNodes.form.no_locations_found')}
                                        </div>
                                    ) : (
                                        locations.map((location) => (
                                            <button
                                                key={location.id}
                                                type='button'
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
                            </>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <WidgetRenderer widgets={getWidgets('admin-vds-nodes-create', 'bottom-of-page')} />
        </div>
    );
}
