/*
This file is part of FeatherPanel.
*/

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

import { useCallback, useEffect, useState } from 'react';
import axios, { isAxiosError } from 'axios';
import { Loader2, Package, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';

interface HostingPackage {
    id: number;
    name: string;
    description?: string;
    disk: number;
    cpu_limit: number;
    memory_limit: number;
    bandwidth_limit_gb: number;
    database_limit: number;
    mailbox_limit: number;
    webplate_id?: number | null;
}

const emptyForm = {
    name: '',
    description: '',
    disk: '1024',
    cpu_limit: '0',
    memory_limit: '0',
    bandwidth_limit_gb: '0',
    database_limit: '1',
    mailbox_limit: '0',
    webplate_id: '',
};

export default function HostingPackagesPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [packages, setPackages] = useState<HostingPackage[]>([]);
    const [form, setForm] = useState(emptyForm);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/hosting-packages');
            setPackages((data?.data?.packages as HostingPackage[]) || []);
        } catch {
            toast.error(t('admin.hostingPackages.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void load();
    }, [load]);

    const create = async () => {
        if (!form.name.trim()) {
            toast.error(t('admin.hostingPackages.nameRequired'));
            return;
        }
        setSaving(true);
        try {
            await axios.put('/api/admin/hosting-packages', {
                name: form.name.trim(),
                description: form.description,
                disk: Number(form.disk) || 1024,
                cpu_limit: Number(form.cpu_limit) || 0,
                memory_limit: Number(form.memory_limit) || 0,
                bandwidth_limit_gb: Number(form.bandwidth_limit_gb) || 0,
                database_limit: Number(form.database_limit) || 0,
                mailbox_limit: Number(form.mailbox_limit) || 0,
                webplate_id: form.webplate_id ? Number(form.webplate_id) : null,
            });
            toast.success(t('admin.hostingPackages.created'));
            setForm(emptyForm);
            await load();
        } catch (error) {
            let msg = t('admin.hostingPackages.createFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id: number) => {
        try {
            await axios.delete(`/api/admin/hosting-packages/${id}`);
            toast.success(t('admin.hostingPackages.deleted'));
            await load();
        } catch {
            toast.error(t('admin.hostingPackages.deleteFailed'));
        }
    };

    return (
        <div className='mx-auto max-w-4xl space-y-8 pb-16'>
            <PageHeader title={t('admin.hostingPackages.title')} description={t('admin.hostingPackages.description')} />
            <PageCard title={t('admin.hostingPackages.createTitle')} icon={Plus}>
                <div className='grid gap-4 sm:grid-cols-2'>
                    <div className='space-y-2 sm:col-span-2'>
                        <Label>{t('admin.hostingPackages.name')}</Label>
                        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className='space-y-2 sm:col-span-2'>
                        <Label>{t('admin.hostingPackages.descriptionLabel')}</Label>
                        <Input
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label>{t('admin.hostingPackages.diskMb')}</Label>
                        <Input
                            type='number'
                            value={form.disk}
                            onChange={(e) => setForm({ ...form, disk: e.target.value })}
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label>{t('admin.hostingPackages.webplateId')}</Label>
                        <Input
                            type='number'
                            value={form.webplate_id}
                            onChange={(e) => setForm({ ...form, webplate_id: e.target.value })}
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label>{t('admin.hostingPackages.cpuLimit')}</Label>
                        <Input
                            type='number'
                            step='0.1'
                            value={form.cpu_limit}
                            onChange={(e) => setForm({ ...form, cpu_limit: e.target.value })}
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label>{t('admin.hostingPackages.memoryLimit')}</Label>
                        <Input
                            type='number'
                            value={form.memory_limit}
                            onChange={(e) => setForm({ ...form, memory_limit: e.target.value })}
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label>{t('admin.hostingPackages.bandwidthLimitGb')}</Label>
                        <Input
                            type='number'
                            value={form.bandwidth_limit_gb}
                            onChange={(e) => setForm({ ...form, bandwidth_limit_gb: e.target.value })}
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label>{t('admin.hostingPackages.databaseLimit')}</Label>
                        <Input
                            type='number'
                            value={form.database_limit}
                            onChange={(e) => setForm({ ...form, database_limit: e.target.value })}
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label>{t('admin.hostingPackages.mailboxLimit')}</Label>
                        <Input
                            type='number'
                            value={form.mailbox_limit}
                            onChange={(e) => setForm({ ...form, mailbox_limit: e.target.value })}
                        />
                    </div>
                </div>
                <Button className='mt-4' loading={saving} onClick={() => void create()}>
                    {t('admin.hostingPackages.create')}
                </Button>
            </PageCard>
            <PageCard title={t('admin.hostingPackages.listTitle')} icon={Package}>
                {loading ? (
                    <Loader2 className='text-muted-foreground h-6 w-6 animate-spin' />
                ) : packages.length === 0 ? (
                    <p className='text-muted-foreground text-sm'>{t('admin.hostingPackages.empty')}</p>
                ) : (
                    <ul className='divide-border divide-y'>
                        {packages.map((pkg) => (
                            <li key={pkg.id} className='flex flex-wrap items-center justify-between gap-3 py-3'>
                                <div>
                                    <p className='font-medium'>{pkg.name}</p>
                                    <p className='text-muted-foreground text-xs'>
                                        {pkg.disk} MiB · CPU {pkg.cpu_limit || '∞'} · RAM {pkg.memory_limit || '∞'} MiB
                                        · DB {pkg.database_limit} · Mail {pkg.mailbox_limit}
                                    </p>
                                </div>
                                <Button variant='ghost' size='sm' onClick={() => void remove(pkg.id)}>
                                    <Trash2 className='h-4 w-4' />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </PageCard>
        </div>
    );
}
