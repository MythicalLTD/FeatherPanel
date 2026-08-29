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
import { useParams, useRouter } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { AppWindow, ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';

interface WebSpace {
    uuid: string;
    name: string;
    description?: string;
    domains?: string[];
    ssl?: boolean;
    disk?: number;
    database_limit?: number;
    mailbox_limit?: number;
    document_root?: string;
}

export default function AdminWebSpaceEditPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const params = useParams();
    const uuid = String(params.uuid || '');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: '',
        description: '',
        domainsText: '',
        ssl: false,
        disk: '1024',
        database_limit: '1',
        mailbox_limit: '0',
        document_root: 'public',
    });

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/admin/webspaces/${uuid}`);
            const space = (data.data?.webspace || data.data) as WebSpace;
            setForm({
                name: space.name || '',
                description: space.description || '',
                domainsText: (space.domains || []).join('\n'),
                ssl: !!space.ssl,
                disk: String(space.disk ?? 1024),
                database_limit: String(space.database_limit ?? 1),
                mailbox_limit: String(space.mailbox_limit ?? 0),
                document_root: space.document_root || 'public',
            });
        } catch (error) {
            console.error(error);
            toast.error(t('admin.webSpaces.messages.fetch_failed'));
            router.push('/admin/webspaces');
        } finally {
            setLoading(false);
        }
    }, [uuid, router, t]);

    useEffect(() => {
        void load();
    }, [load]);

    const save = async () => {
        if (!form.name.trim()) {
            toast.error(t('admin.webSpaces.messages.required'));
            return;
        }

        const domains = form.domainsText
            .split(/\r?\n/)
            .map((d) => d.trim())
            .filter(Boolean);

        setSaving(true);
        try {
            await axios.patch(`/api/admin/webspaces/${uuid}`, {
                name: form.name.trim(),
                description: form.description,
                domains,
                ssl: form.ssl,
                disk: Math.max(1, Number(form.disk) || 1024),
                database_limit: Math.max(0, Number(form.database_limit) || 0),
                mailbox_limit: Math.max(0, Number(form.mailbox_limit) || 0),
                document_root: form.document_root.trim() || 'public',
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
                            <Label>{t('admin.webSpaces.form.disk')}</Label>
                            <Input
                                type='number'
                                min={1}
                                value={form.disk}
                                onChange={(e) => setForm({ ...form, disk: e.target.value })}
                            />
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
                            <Textarea
                                value={form.domainsText}
                                onChange={(e) => setForm({ ...form, domainsText: e.target.value })}
                                rows={6}
                                placeholder={t('admin.webSpaces.form.domains_placeholder')}
                            />
                        </div>
                        <label className='flex items-center gap-2 text-sm'>
                            <Checkbox
                                checked={form.ssl}
                                onCheckedChange={(checked) => setForm({ ...form, ssl: checked === true })}
                            />
                            {t('admin.webSpaces.form.ssl')}
                        </label>
                    </div>
                </div>
            </PageCard>
        </div>
    );
}
