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
import { toast } from 'sonner';
import { Mail, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';

interface MailHostRow {
    id: number;
    name: string;
    hostname: string;
    imap_host: string;
    imap_port: number;
    smtp_host: string;
    smtp_port: number;
    provision_mode: string;
    web_node_id?: number | null;
}

interface WebNodeOption {
    id: number;
    name: string;
}

const emptyForm = {
    name: '',
    hostname: '',
    imap_host: '',
    imap_port: '993',
    smtp_host: '',
    smtp_port: '587',
    provision_mode: 'inventory',
    provision_url: '',
    provision_api_key: '',
    mx_host: '',
    spf_record: '',
    web_node_id: '',
};

export default function AdminMailHostsPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<MailHostRow[]>([]);
    const [nodes, setNodes] = useState<WebNodeOption[]>([]);
    const [form, setForm] = useState(emptyForm);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const [hostsRes, nodesRes] = await Promise.all([
                axios.get('/api/admin/mail-hosts'),
                axios.get('/api/admin/web-nodes', { params: { page: 1, limit: 200 } }).catch(() => null),
            ]);
            setRows((hostsRes.data?.data?.hosts || []) as MailHostRow[]);
            setNodes((nodesRes?.data?.data?.web_nodes || []) as WebNodeOption[]);
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('admin.mailHosts.loadFailed')
                    : t('admin.mailHosts.loadFailed'),
            );
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void load();
    }, [load]);

    const createHost = async () => {
        if (!form.name.trim() || !form.hostname.trim() || !form.imap_host.trim() || !form.smtp_host.trim()) {
            toast.error(t('admin.mailHosts.requiredFields'));
            return;
        }
        setBusy(true);
        try {
            await axios.put('/api/admin/mail-hosts', {
                name: form.name.trim(),
                hostname: form.hostname.trim(),
                imap_host: form.imap_host.trim(),
                imap_port: Number(form.imap_port) || 993,
                smtp_host: form.smtp_host.trim(),
                smtp_port: Number(form.smtp_port) || 587,
                provision_mode: form.provision_mode,
                provision_url: form.provision_url.trim() || null,
                provision_api_key: form.provision_api_key.trim() || null,
                mx_host: form.mx_host.trim() || null,
                spf_record: form.spf_record.trim() || null,
                web_node_id: form.web_node_id ? Number(form.web_node_id) : null,
            });
            toast.success(t('admin.mailHosts.created'));
            setForm(emptyForm);
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('admin.mailHosts.createFailed')
                    : t('admin.mailHosts.createFailed'),
            );
        } finally {
            setBusy(false);
        }
    };

    const removeHost = async (id: number) => {
        if (!confirm(t('admin.mailHosts.confirmDelete'))) return;
        try {
            await axios.delete(`/api/admin/mail-hosts/${id}`);
            toast.success(t('admin.mailHosts.deleted'));
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('admin.mailHosts.deleteFailed')
                    : t('admin.mailHosts.deleteFailed'),
            );
        }
    };

    if (loading) return <TableSkeleton count={3} />;

    return (
        <div className='space-y-6'>
            <PageHeader title={t('admin.mailHosts.title')} description={t('admin.mailHosts.description')} icon={Mail} />

            <div className='border-border grid gap-3 rounded-xl border p-4 md:grid-cols-2'>
                <div className='space-y-2'>
                    <Label>{t('admin.mailHosts.form.name')}</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className='space-y-2'>
                    <Label>{t('admin.mailHosts.form.hostname')}</Label>
                    <Input value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} />
                </div>
                <div className='space-y-2'>
                    <Label>{t('admin.mailHosts.form.imapHost')}</Label>
                    <Input value={form.imap_host} onChange={(e) => setForm({ ...form, imap_host: e.target.value })} />
                </div>
                <div className='space-y-2'>
                    <Label>{t('admin.mailHosts.form.imapPort')}</Label>
                    <Input value={form.imap_port} onChange={(e) => setForm({ ...form, imap_port: e.target.value })} />
                </div>
                <div className='space-y-2'>
                    <Label>{t('admin.mailHosts.form.smtpHost')}</Label>
                    <Input value={form.smtp_host} onChange={(e) => setForm({ ...form, smtp_host: e.target.value })} />
                </div>
                <div className='space-y-2'>
                    <Label>{t('admin.mailHosts.form.smtpPort')}</Label>
                    <Input value={form.smtp_port} onChange={(e) => setForm({ ...form, smtp_port: e.target.value })} />
                </div>
                <div className='space-y-2'>
                    <Label>{t('admin.mailHosts.form.provisionMode')}</Label>
                    <Select
                        value={form.provision_mode}
                        onChange={(e) => setForm({ ...form, provision_mode: e.target.value })}
                    >
                        <option value='inventory'>{t('admin.mailHosts.provisionMode.inventory')}</option>
                        <option value='webhook'>{t('admin.mailHosts.provisionMode.webhook')}</option>
                    </Select>
                </div>
                <div className='space-y-2'>
                    <Label>{t('admin.mailHosts.form.webNode')}</Label>
                    <Select
                        value={form.web_node_id}
                        onChange={(e) => setForm({ ...form, web_node_id: e.target.value })}
                    >
                        <option value=''>{t('admin.mailHosts.allWebNodes')}</option>
                        {nodes.map((n) => (
                            <option key={n.id} value={String(n.id)}>
                                {n.name}
                            </option>
                        ))}
                    </Select>
                </div>
                {form.provision_mode === 'webhook' && (
                    <>
                        <div className='space-y-2 md:col-span-2'>
                            <Label>{t('admin.mailHosts.form.provisionUrl')}</Label>
                            <Input
                                value={form.provision_url}
                                onChange={(e) => setForm({ ...form, provision_url: e.target.value })}
                            />
                        </div>
                        <div className='space-y-2 md:col-span-2'>
                            <Label>{t('admin.mailHosts.form.apiKey')}</Label>
                            <Input
                                type='password'
                                value={form.provision_api_key}
                                onChange={(e) => setForm({ ...form, provision_api_key: e.target.value })}
                            />
                        </div>
                    </>
                )}
                <div className='space-y-2'>
                    <Label>{t('admin.mailHosts.form.mxHost')}</Label>
                    <Input value={form.mx_host} onChange={(e) => setForm({ ...form, mx_host: e.target.value })} />
                </div>
                <div className='space-y-2'>
                    <Label>{t('admin.mailHosts.form.spfRecord')}</Label>
                    <Input value={form.spf_record} onChange={(e) => setForm({ ...form, spf_record: e.target.value })} />
                </div>
                <div className='md:col-span-2'>
                    <Button loading={busy} onClick={() => void createHost()}>
                        <Plus className='mr-1 h-4 w-4' />
                        {t('admin.mailHosts.create')}
                    </Button>
                </div>
            </div>

            <div className='border-border divide-border divide-y overflow-hidden rounded-xl border'>
                {rows.length === 0 && <p className='text-muted-foreground p-4 text-sm'>{t('admin.mailHosts.empty')}</p>}
                {rows.map((row) => (
                    <div key={row.id} className='flex flex-wrap items-center justify-between gap-3 px-4 py-3'>
                        <div>
                            <p className='text-sm font-medium'>{row.name}</p>
                            <p className='text-muted-foreground text-xs'>
                                {t('admin.mailHosts.rowDetails', {
                                    hostname: row.hostname,
                                    imapHost: row.imap_host,
                                    imapPort: String(row.imap_port),
                                    smtpHost: row.smtp_host,
                                    smtpPort: String(row.smtp_port),
                                    provisionMode: row.provision_mode,
                                })}
                            </p>
                        </div>
                        <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => void removeHost(row.id)}
                            aria-label={t('common.delete')}
                        >
                            <Trash2 className='h-4 w-4' />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
