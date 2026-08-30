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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { AppWindow, ArrowLeft, LayoutTemplate } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select } from '@/components/ui/select-native';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { WebSpaceDomainsManager, type DomainRoute } from '@/components/webspace/WebSpaceDomainsManager';
import { WebSpaceDnsZoneEditor } from '@/components/webspace/WebSpaceDnsZoneEditor';
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface WebSpace {
    uuid: string;
    name: string;
    description?: string;
    domains?: string[];
    domain_routes?: DomainRoute[];
    ssl?: boolean;
    ssl_mode?: string;
    disk?: number;
    database_limit?: number;
    mailbox_limit?: number;
    document_root?: string;
    webplate_id?: number;
    webplate_runtime?: string;
    webplate_name?: string;
    cpu_limit?: number;
    memory_limit?: number;
    bandwidth_limit_gb?: number | null;
    waf_enabled?: boolean;
    backend_host?: string;
}

interface WebPlateOption {
    id: number;
    name: string;
    runtime: string;
    docker_image?: string;
}

interface CustomSslStatus {
    present?: boolean;
    not_after?: string;
    days_remaining?: number | null;
}

export default function AdminWebSpaceEditPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useParams();
    const uuid = String(params.uuid || '');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [plates, setPlates] = useState<WebPlateOption[]>([]);
    const [domainRoutes, setDomainRoutes] = useState<DomainRoute[]>([]);
    const [customSsl, setCustomSsl] = useState<CustomSslStatus | null>(null);
    const [customCertFile, setCustomCertFile] = useState<File | null>(null);
    const [customKeyFile, setCustomKeyFile] = useState<File | null>(null);
    const [uploadingSsl, setUploadingSsl] = useState(false);
    const [removingSsl, setRemovingSsl] = useState(false);
    const [webplateConfirmOpen, setWebplateConfirmOpen] = useState(false);
    const [originalWebplateId, setOriginalWebplateId] = useState('');
    const [runtime, setRuntime] = useState('static');
    const [form, setForm] = useState({
        name: '',
        description: '',
        webplate_id: '',
        ssl: false,
        waf_enabled: false,
        disk: '1024',
        cpu_limit: '0',
        memory_limit: '0',
        bandwidth_limit_gb: '',
        backend_host: '',
        database_limit: '1',
        mailbox_limit: '0',
        document_root: 'public',
    });

    const compatiblePlates = useMemo(
        () => plates.filter((p) => p.runtime.toLowerCase() === runtime.toLowerCase()),
        [plates, runtime],
    );

    const loadPlates = useCallback(
        async (plateRuntime: string) => {
            try {
                const { data } = await axios.get('/api/admin/webplates', {
                    params: { page: 1, limit: 200, runtime: plateRuntime },
                });
                const rows = (data?.data?.webplates ?? data?.data?.items ?? []) as WebPlateOption[];
                setPlates(rows);
            } catch (error) {
                console.error(error);
                toast.error(t('admin.webSpaces.messages.plates_failed'));
            }
        },
        [t],
    );

    const loadCustomSsl = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/admin/webspaces/${uuid}/ssl/custom`);
            setCustomSsl((data?.data as CustomSslStatus) ?? null);
        } catch {
            setCustomSsl(null);
        }
    }, [uuid]);

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/admin/webspaces/${uuid}`);
            const space = (data.data?.webspace || data.data) as WebSpace;
            const plateRuntime = (space.webplate_runtime || 'static').toLowerCase();
            setRuntime(plateRuntime);
            const routes =
                (space.domain_routes?.length ?? 0) > 0
                    ? space.domain_routes!
                    : (space.domains || []).map((domain, index) => ({
                          domain,
                          type: (index === 0 ? 'primary' : 'alias') as DomainRoute['type'],
                      }));
            setDomainRoutes(routes);
            const webplateId = String(space.webplate_id ?? '');
            setOriginalWebplateId(webplateId);
            setForm({
                name: space.name || '',
                description: space.description || '',
                webplate_id: webplateId,
                ssl: !!space.ssl,
                waf_enabled: !!space.waf_enabled,
                disk: String(space.disk ?? 1024),
                cpu_limit: String(space.cpu_limit ?? 0),
                memory_limit: String(space.memory_limit ?? 0),
                bandwidth_limit_gb:
                    space.bandwidth_limit_gb != null && space.bandwidth_limit_gb !== undefined
                        ? String(space.bandwidth_limit_gb)
                        : '',
                backend_host: space.backend_host || '',
                database_limit: String(space.database_limit ?? 1),
                mailbox_limit: String(space.mailbox_limit ?? 0),
                document_root: space.document_root || 'public',
            });
            await loadPlates(plateRuntime);
            await loadCustomSsl();
        } catch (error) {
            console.error(error);
            toast.error(t('admin.webSpaces.messages.fetch_failed'));
            router.push('/admin/webspaces');
        } finally {
            setLoading(false);
        }
    }, [uuid, router, t, loadPlates, loadCustomSsl]);

    useEffect(() => {
        void load();
    }, [load]);

    const performSave = async () => {
        const domains = domainRoutes.filter((r) => r.domain.trim()).map((r) => r.domain.trim().toLowerCase());

        setSaving(true);
        try {
            await axios.patch(`/api/admin/webspaces/${uuid}`, {
                name: form.name.trim(),
                description: form.description,
                domain_routes: domainRoutes.filter((r) => r.domain.trim()),
                domains,
                ssl: form.ssl,
                waf_enabled: form.waf_enabled,
                disk: Math.max(1, Number(form.disk) || 1024),
                cpu_limit: Math.max(0, Number(form.cpu_limit) || 0),
                memory_limit: Math.max(0, Number(form.memory_limit) || 0),
                bandwidth_limit_gb:
                    form.bandwidth_limit_gb === '' ? null : Math.max(0, Number(form.bandwidth_limit_gb) || 0),
                backend_host: form.backend_host.trim(),
                database_limit: Math.max(0, Number(form.database_limit) || 0),
                mailbox_limit: Math.max(0, Number(form.mailbox_limit) || 0),
                document_root: form.document_root.trim() || 'public',
                ...(form.webplate_id && form.webplate_id !== originalWebplateId
                    ? { webplate_id: Number(form.webplate_id) }
                    : {}),
            });
            toast.success(t('admin.webSpaces.messages.updated'));
            router.push(`/admin/webspaces/${uuid}`);
        } catch (error) {
            let msg = t('admin.webSpaces.messages.update_failed');
            if (isAxiosError(error) && error.response?.data?.message) {
                msg = error.response.data.message;
            }
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const save = async () => {
        if (!form.name.trim()) {
            toast.error(t('admin.webSpaces.messages.required'));
            return;
        }

        const webplateChanged = form.webplate_id && form.webplate_id !== originalWebplateId;
        const selectedPlate = compatiblePlates.find((p) => String(p.id) === form.webplate_id);
        const imageChanged =
            webplateChanged &&
            selectedPlate?.docker_image &&
            compatiblePlates.find((p) => String(p.id) === originalWebplateId)?.docker_image !==
                selectedPlate.docker_image;

        if (webplateChanged && (runtime !== 'static' || imageChanged)) {
            setWebplateConfirmOpen(true);
            return;
        }

        await performSave();
    };

    const confirmWebplateChange = async () => {
        setWebplateConfirmOpen(false);
        await performSave();
    };

    const uploadCustomSsl = async () => {
        if (!customCertFile || !customKeyFile) {
            toast.error(t('webSpaces.settings.customSslFilesRequired'));
            return;
        }
        setUploadingSsl(true);
        try {
            const body = new FormData();
            body.append('cert', customCertFile);
            body.append('key', customKeyFile);
            await axios.put(`/api/admin/webspaces/${uuid}/ssl/custom`, body);
            toast.success(t('webSpaces.settings.customSslUploaded'));
            setCustomCertFile(null);
            setCustomKeyFile(null);
            await loadCustomSsl();
        } catch (error) {
            let msg = t('webSpaces.settings.customSslUploadFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setUploadingSsl(false);
        }
    };

    const removeCustomSsl = async () => {
        if (!confirm(t('admin.webSpaces.form.custom_ssl_remove_confirm'))) return;
        setRemovingSsl(true);
        try {
            await axios.delete(`/api/admin/webspaces/${uuid}/ssl/custom`);
            toast.success(t('admin.webSpaces.form.custom_ssl_removed'));
            setCustomSsl(null);
        } catch (error) {
            let msg = t('admin.webSpaces.form.custom_ssl_remove_failed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setRemovingSsl(false);
        }
    };

    if (loading) {
        return <TableSkeleton count={2} />;
    }

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.webSpaces.edit_title')}
                description={uuid}
                icon={AppWindow}
                actions={
                    <div className='flex items-center gap-2'>
                        <Button size='sm' variant='outline' onClick={() => router.push(`/admin/webspaces/${uuid}`)}>
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            {t('common.back')}
                        </Button>
                        <Button size='sm' onClick={() => void save()} loading={saving}>
                            {t('common.save_changes')}
                        </Button>
                    </div>
                }
            />

            <PageCard title={t('common.settings')} icon={AppWindow}>
                <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
                    <div className='space-y-4'>
                        <div className='space-y-2'>
                            <Label>{t('admin.webSpaces.form.name')} *</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.webSpaces.form.description')}</Label>
                            <Textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label className='flex items-center gap-1.5'>
                                <LayoutTemplate className='h-4 w-4' />
                                {t('admin.webSpaces.form.webplate')}
                            </Label>
                            <Select
                                value={form.webplate_id}
                                onChange={(e) => setForm({ ...form, webplate_id: e.target.value })}
                            >
                                <option value=''>{t('admin.webSpaces.form.webplate_placeholder')}</option>
                                {compatiblePlates.map((plate) => (
                                    <option key={plate.id} value={String(plate.id)}>
                                        {plate.name} ({plate.runtime})
                                    </option>
                                ))}
                            </Select>
                            <p className='text-muted-foreground text-xs'>
                                {t('admin.webSpaces.form.webplate_edit_help')}
                            </p>
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.webSpaces.form.disk')}</Label>
                            <Input
                                type='number'
                                min={1}
                                value={form.disk}
                                onChange={(e) => setForm({ ...form, disk: e.target.value })}
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.webSpaces.form.cpu_limit')}</Label>
                            <Input
                                type='number'
                                min={0}
                                step={0.1}
                                value={form.cpu_limit}
                                onChange={(e) => setForm({ ...form, cpu_limit: e.target.value })}
                            />
                            <p className='text-muted-foreground text-xs'>{t('admin.webSpaces.form.cpu_limit_help')}</p>
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.webSpaces.form.memory_limit')}</Label>
                            <Input
                                type='number'
                                min={0}
                                value={form.memory_limit}
                                onChange={(e) => setForm({ ...form, memory_limit: e.target.value })}
                            />
                            <p className='text-muted-foreground text-xs'>
                                {t('admin.webSpaces.form.memory_limit_help')}
                            </p>
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.webSpaces.form.bandwidth_limit_gb')}</Label>
                            <Input
                                type='number'
                                min={0}
                                value={form.bandwidth_limit_gb}
                                onChange={(e) => setForm({ ...form, bandwidth_limit_gb: e.target.value })}
                                placeholder={t('admin.webSpaces.form.bandwidth_limit_gb_placeholder')}
                            />
                            <p className='text-muted-foreground text-xs'>
                                {t('admin.webSpaces.form.bandwidth_limit_gb_help')}
                            </p>
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.webSpaces.form.backend_host')}</Label>
                            <Input
                                placeholder='127.0.0.1'
                                value={form.backend_host}
                                onChange={(e) => setForm({ ...form, backend_host: e.target.value })}
                            />
                            <p className='text-muted-foreground text-xs'>
                                {t('admin.webSpaces.form.backend_host_help')}
                            </p>
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.webSpaces.database_limit')}</Label>
                            <Input
                                type='number'
                                min={0}
                                value={form.database_limit}
                                onChange={(e) => setForm({ ...form, database_limit: e.target.value })}
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.webSpaces.mailbox_limit')}</Label>
                            <Input
                                type='number'
                                min={0}
                                value={form.mailbox_limit}
                                onChange={(e) => setForm({ ...form, mailbox_limit: e.target.value })}
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.webSpaces.form.document_root')}</Label>
                            <Input
                                value={form.document_root}
                                onChange={(e) => setForm({ ...form, document_root: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className='space-y-4'>
                        <div className='space-y-2'>
                            <Label>{t('admin.webSpaces.form.domains')}</Label>
                            <WebSpaceDomainsManager value={domainRoutes} onChange={setDomainRoutes} />
                            <div className='border-border/50 mt-4 rounded-xl border p-4'>
                                <WebSpaceDnsZoneEditor apiBase={`/api/admin/webspaces/${uuid}`} canRead canManage />
                            </div>
                        </div>
                        <label className='flex items-center gap-2 text-sm'>
                            <Checkbox
                                checked={form.ssl}
                                onCheckedChange={(checked) => setForm({ ...form, ssl: checked === true })}
                            />
                            {t('admin.webSpaces.form.ssl')}
                        </label>
                        <label className='flex items-center gap-2 text-sm'>
                            <Checkbox
                                checked={form.waf_enabled}
                                onCheckedChange={(checked) => setForm({ ...form, waf_enabled: checked === true })}
                            />
                            {t('admin.webSpaces.form.waf_enabled')}
                        </label>
                        <p className='text-muted-foreground text-xs'>{t('admin.webSpaces.form.waf_enabled_help')}</p>
                    </div>
                </div>
            </PageCard>

            <PageCard title={t('webSpaces.settings.customSslTitle')}>
                <div className='space-y-4'>
                    {customSsl?.present && (
                        <p className='text-muted-foreground text-sm'>
                            {customSsl.days_remaining != null
                                ? t('webSpaces.settings.certExpires', { days: String(customSsl.days_remaining) })
                                : t('webSpaces.settings.certPresent')}
                            {customSsl.not_after ? ` (${customSsl.not_after})` : ''}
                        </p>
                    )}
                    <p className='text-muted-foreground text-xs'>{t('webSpaces.settings.customSslHelp')}</p>
                    <div className='grid gap-2 sm:grid-cols-2'>
                        <Input
                            type='file'
                            accept='.pem,.crt,.cer'
                            onChange={(e) => setCustomCertFile(e.target.files?.[0] ?? null)}
                        />
                        <Input
                            type='file'
                            accept='.pem,.key'
                            onChange={(e) => setCustomKeyFile(e.target.files?.[0] ?? null)}
                        />
                    </div>
                    <div className='flex flex-wrap gap-2'>
                        <Button variant='outline' loading={uploadingSsl} onClick={() => void uploadCustomSsl()}>
                            {t('webSpaces.settings.uploadCustomSsl')}
                        </Button>
                        {customSsl?.present && (
                            <Button variant='ghost' loading={removingSsl} onClick={() => void removeCustomSsl()}>
                                {t('admin.webSpaces.form.custom_ssl_use_acme')}
                            </Button>
                        )}
                    </div>
                </div>
            </PageCard>

            <Dialog open={webplateConfirmOpen} onOpenChange={setWebplateConfirmOpen}>
                <DialogHeader>
                    <DialogTitle>{t('admin.webSpaces.form.webplate_change_title')}</DialogTitle>
                </DialogHeader>
                <p className='text-muted-foreground text-sm'>{t('admin.webSpaces.form.webplate_change_body')}</p>
                <DialogFooter>
                    <Button variant='outline' onClick={() => setWebplateConfirmOpen(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button loading={saving} onClick={() => void confirmWebplateChange()}>
                        {t('admin.webSpaces.form.webplate_change_confirm')}
                    </Button>
                </DialogFooter>
            </Dialog>
        </div>
    );
}
