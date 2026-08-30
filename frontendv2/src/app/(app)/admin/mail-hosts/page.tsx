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

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios, { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { CheckCircle2, ChevronDown, ExternalLink, Mail, Plus, Server, Trash2, Wrench } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
    mx_host?: string | null;
    webmail_url?: string | null;
}

interface WebNodeOption {
    id: number;
    name: string;
    fqdn?: string;
}

const externalEmptyForm = {
    name: '',
    hostname: '',
    imap_host: '',
    imap_port: '993',
    smtp_host: '',
    smtp_port: '587',
    provision_mode: 'inventory' as 'inventory' | 'webhook',
    provision_url: '',
    provision_api_key: '',
    webmail_url: '',
};

function provisionBadgeVariant(mode: string): 'default' | 'secondary' | 'outline' {
    if (mode === 'node') return 'default';
    if (mode === 'webhook') return 'secondary';
    return 'outline';
}

export default function AdminMailHostsPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<MailHostRow[]>([]);
    const [nodes, setNodes] = useState<WebNodeOption[]>([]);
    const [showExternal, setShowExternal] = useState(false);
    const [externalForm, setExternalForm] = useState(externalEmptyForm);
    const [busy, setBusy] = useState(false);
    const [ensuringNodeId, setEnsuringNodeId] = useState<number | null>(null);

    const load = useCallback(async () => {
        try {
            const [hostsRes, nodesRes] = await Promise.all([
                axios.get('/api/admin/mail-hosts'),
                axios.get('/api/admin/web-nodes', { params: { page: 1, limit: 200 } }).catch(() => null),
            ]);
            setRows((hostsRes.data?.data?.hosts || []) as MailHostRow[]);
            const rawNodes = (nodesRes?.data?.data?.web_nodes || nodesRes?.data?.data?.nodes || []) as WebNodeOption[];
            setNodes(rawNodes);
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

    const nodeMailHostIds = useMemo(() => {
        const map = new Map<number, MailHostRow>();
        for (const row of rows) {
            if (row.provision_mode === 'node' && row.web_node_id) {
                map.set(row.web_node_id, row);
            }
        }
        return map;
    }, [rows]);

    const builtinHosts = useMemo(() => rows.filter((r) => r.provision_mode === 'node'), [rows]);
    const externalHosts = useMemo(() => rows.filter((r) => r.provision_mode !== 'node'), [rows]);
    const nodesWithoutMail = useMemo(() => nodes.filter((n) => !nodeMailHostIds.has(n.id)), [nodes, nodeMailHostIds]);

    const webNodeName = (id?: number | null) => {
        if (!id) return t('admin.mailHosts.noWebNode');
        return nodes.find((n) => n.id === id)?.name || `#${id}`;
    };

    const ensureNodeMail = async (webNodeId: number) => {
        setEnsuringNodeId(webNodeId);
        try {
            await axios.post(`/api/admin/mail-hosts/ensure-node/${webNodeId}`);
            toast.success(t('admin.mailHosts.ensureSuccess'));
            await load();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('admin.mailHosts.ensureFailed')
                    : t('admin.mailHosts.ensureFailed'),
            );
        } finally {
            setEnsuringNodeId(null);
        }
    };

    const createExternalHost = async () => {
        if (!externalForm.name.trim()) {
            toast.error(t('admin.mailHosts.requiredFields'));
            return;
        }
        if (externalForm.provision_mode === 'webhook') {
            if (!externalForm.provision_url.trim()) {
                toast.error(t('admin.mailHosts.requiredWebhookUrl'));
                return;
            }
        } else if (!externalForm.hostname.trim() || !externalForm.imap_host.trim() || !externalForm.smtp_host.trim()) {
            toast.error(t('admin.mailHosts.requiredFields'));
            return;
        }

        setBusy(true);
        try {
            await axios.put('/api/admin/mail-hosts', {
                name: externalForm.name.trim(),
                hostname: externalForm.hostname.trim() || externalForm.name.trim(),
                imap_host: externalForm.imap_host.trim() || externalForm.hostname.trim(),
                imap_port: Number(externalForm.imap_port) || 993,
                smtp_host: externalForm.smtp_host.trim() || externalForm.hostname.trim(),
                smtp_port: Number(externalForm.smtp_port) || 587,
                provision_mode: externalForm.provision_mode,
                provision_url: externalForm.provision_url.trim() || null,
                provision_api_key: externalForm.provision_api_key.trim() || null,
                webmail_url: externalForm.webmail_url.trim() || null,
                web_node_id: null,
            });
            toast.success(t('admin.mailHosts.created'));
            setExternalForm(externalEmptyForm);
            setShowExternal(false);
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

            <div className='border-primary/20 bg-primary/5 flex gap-3 rounded-xl border p-4'>
                <CheckCircle2 className='text-primary mt-0.5 h-5 w-5 shrink-0' />
                <div className='space-y-1 text-sm'>
                    <p className='font-medium'>{t('admin.mailHosts.autoTitle')}</p>
                    <p className='text-muted-foreground leading-relaxed'>{t('admin.mailHosts.autoHint')}</p>
                </div>
            </div>

            {builtinHosts.length > 0 && (
                <section className='space-y-3'>
                    <h2 className='text-sm font-semibold'>{t('admin.mailHosts.builtinSection')}</h2>
                    <div className='grid gap-3 lg:grid-cols-2'>
                        {builtinHosts.map((row) => (
                            <div
                                key={row.id}
                                className='border-border/60 bg-card/40 flex flex-col gap-3 rounded-xl border p-4 shadow-sm'
                            >
                                <div className='flex items-start justify-between gap-3'>
                                    <div className='min-w-0 space-y-1'>
                                        <div className='flex flex-wrap items-center gap-2'>
                                            <p className='font-semibold'>{row.name}</p>
                                            <Badge variant={provisionBadgeVariant(row.provision_mode)}>
                                                {t('admin.mailHosts.provisionMode.node')}
                                            </Badge>
                                        </div>
                                        <p className='text-muted-foreground text-xs'>
                                            {t('admin.mailHosts.rowNode', { node: webNodeName(row.web_node_id) })}
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
                                <dl className='grid gap-2 text-xs sm:grid-cols-2'>
                                    <div>
                                        <dt className='text-muted-foreground'>{t('admin.mailHosts.labels.mx')}</dt>
                                        <dd className='font-mono'>{row.mx_host || row.hostname}</dd>
                                    </div>
                                    <div>
                                        <dt className='text-muted-foreground'>{t('admin.mailHosts.labels.imap')}</dt>
                                        <dd className='font-mono'>
                                            {row.imap_host}:{row.imap_port}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className='text-muted-foreground'>{t('admin.mailHosts.labels.smtp')}</dt>
                                        <dd className='font-mono'>
                                            {row.smtp_host}:{row.smtp_port}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className='text-muted-foreground'>{t('admin.mailHosts.labels.webmail')}</dt>
                                        <dd className='truncate font-mono'>{row.webmail_url || '—'}</dd>
                                    </div>
                                </dl>
                                {row.web_node_id && (
                                    <Button variant='outline' size='sm' className='w-fit' asChild>
                                        <Link href={`/admin/web-nodes/${row.web_node_id}/edit?tab=packages`}>
                                            <Wrench className='mr-1.5 h-4 w-4' />
                                            {t('admin.mailHosts.openPackages')}
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {nodesWithoutMail.length > 0 && (
                <PageCard
                    title={t('admin.mailHosts.setupSection')}
                    description={t('admin.mailHosts.setupHint')}
                    icon={Server}
                >
                    <ul className='divide-border divide-y rounded-xl border'>
                        {nodesWithoutMail.map((node) => (
                            <li
                                key={node.id}
                                className='flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'
                            >
                                <div>
                                    <p className='text-sm font-medium'>{node.name}</p>
                                    <p className='text-muted-foreground text-xs'>
                                        {node.fqdn || t('admin.mailHosts.noFqdn')}
                                    </p>
                                </div>
                                <div className='flex flex-wrap gap-2'>
                                    <Button variant='outline' size='sm' asChild>
                                        <Link href={`/admin/web-nodes/${node.id}/edit?tab=packages`}>
                                            <ExternalLink className='mr-1.5 h-4 w-4' />
                                            {t('admin.mailHosts.installMailserver')}
                                        </Link>
                                    </Button>
                                    {node.fqdn && (
                                        <Button
                                            variant='secondary'
                                            size='sm'
                                            loading={ensuringNodeId === node.id}
                                            onClick={() => void ensureNodeMail(node.id)}
                                        >
                                            {t('admin.mailHosts.registerHost')}
                                        </Button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </PageCard>
            )}

            {rows.length === 0 && nodesWithoutMail.length === 0 && (
                <p className='text-muted-foreground text-sm'>{t('admin.mailHosts.empty')}</p>
            )}

            {externalHosts.length > 0 && (
                <section className='space-y-3'>
                    <h2 className='text-sm font-semibold'>{t('admin.mailHosts.externalSection')}</h2>
                    <div className='border-border divide-border divide-y overflow-hidden rounded-xl border'>
                        {externalHosts.map((row) => (
                            <div key={row.id} className='flex flex-wrap items-center justify-between gap-3 px-4 py-3'>
                                <div>
                                    <div className='flex flex-wrap items-center gap-2'>
                                        <p className='text-sm font-medium'>{row.name}</p>
                                        <Badge variant={provisionBadgeVariant(row.provision_mode)}>
                                            {t(`admin.mailHosts.provisionMode.${row.provision_mode}`)}
                                        </Badge>
                                    </div>
                                    <p className='text-muted-foreground text-xs'>
                                        {row.hostname} · IMAP {row.imap_host}:{row.imap_port}
                                    </p>
                                </div>
                                <Button variant='ghost' size='sm' onClick={() => void removeHost(row.id)}>
                                    <Trash2 className='h-4 w-4' />
                                </Button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <div className='border-border overflow-hidden rounded-xl border'>
                <button
                    type='button'
                    className='hover:bg-muted/30 flex w-full items-center justify-between gap-3 px-4 py-3 text-left'
                    onClick={() => setShowExternal((v) => !v)}
                >
                    <span className='flex items-center gap-2 text-sm font-medium'>
                        <Plus className='h-4 w-4' />
                        {t('admin.mailHosts.addExternal')}
                    </span>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', showExternal && 'rotate-180')} />
                </button>
                {showExternal && (
                    <div className='border-border grid gap-3 border-t p-4 md:grid-cols-2'>
                        <p className='text-muted-foreground text-xs md:col-span-2'>
                            {t('admin.mailHosts.externalHint')}
                        </p>
                        <div className='space-y-2'>
                            <Label>{t('admin.mailHosts.form.name')}</Label>
                            <Input
                                value={externalForm.name}
                                onChange={(e) => setExternalForm({ ...externalForm, name: e.target.value })}
                            />
                        </div>
                        <div className='space-y-2'>
                            <Label>{t('admin.mailHosts.form.provisionMode')}</Label>
                            <Select
                                value={externalForm.provision_mode}
                                onChange={(e) =>
                                    setExternalForm({
                                        ...externalForm,
                                        provision_mode: e.target.value as 'inventory' | 'webhook',
                                    })
                                }
                            >
                                <option value='inventory'>{t('admin.mailHosts.provisionMode.inventory')}</option>
                                <option value='webhook'>{t('admin.mailHosts.provisionMode.webhook')}</option>
                            </Select>
                        </div>
                        {externalForm.provision_mode === 'webhook' ? (
                            <>
                                <div className='space-y-2 md:col-span-2'>
                                    <Label>{t('admin.mailHosts.form.provisionUrl')}</Label>
                                    <Input
                                        value={externalForm.provision_url}
                                        onChange={(e) =>
                                            setExternalForm({ ...externalForm, provision_url: e.target.value })
                                        }
                                    />
                                </div>
                                <div className='space-y-2 md:col-span-2'>
                                    <Label>{t('admin.mailHosts.form.apiKey')}</Label>
                                    <Input
                                        type='password'
                                        value={externalForm.provision_api_key}
                                        onChange={(e) =>
                                            setExternalForm({ ...externalForm, provision_api_key: e.target.value })
                                        }
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className='space-y-2'>
                                    <Label>{t('admin.mailHosts.form.hostname')}</Label>
                                    <Input
                                        value={externalForm.hostname}
                                        onChange={(e) => setExternalForm({ ...externalForm, hostname: e.target.value })}
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label>{t('admin.mailHosts.form.webmailUrl')}</Label>
                                    <Input
                                        value={externalForm.webmail_url}
                                        onChange={(e) =>
                                            setExternalForm({ ...externalForm, webmail_url: e.target.value })
                                        }
                                        placeholder='https://webmail.example.com'
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label>{t('admin.mailHosts.form.imapHost')}</Label>
                                    <Input
                                        value={externalForm.imap_host}
                                        onChange={(e) =>
                                            setExternalForm({ ...externalForm, imap_host: e.target.value })
                                        }
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label>{t('admin.mailHosts.form.smtpHost')}</Label>
                                    <Input
                                        value={externalForm.smtp_host}
                                        onChange={(e) =>
                                            setExternalForm({ ...externalForm, smtp_host: e.target.value })
                                        }
                                    />
                                </div>
                            </>
                        )}
                        <div className='md:col-span-2'>
                            <Button loading={busy} onClick={() => void createExternalHost()}>
                                {t('admin.mailHosts.create')}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
