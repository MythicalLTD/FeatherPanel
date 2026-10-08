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
import axios from 'axios';
import { toast } from 'sonner';
import { CheckCircle2, ExternalLink, Mail, Plus, RefreshCw, Server, Trash2, Wrench } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { ResourceCard, type ResourceBadge } from '@/components/featherui/ResourceCard';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getApiErrorMessage } from '@/lib/api-errors';

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

function isNodeMode(mode: string): boolean {
    return mode?.toLowerCase() === 'node';
}

function provisionBadge(mode: string, t: (key: string) => string): ResourceBadge {
    const key = `admin.mailHosts.provisionMode.${mode}`;
    const label = t(key);
    if (isNodeMode(mode)) {
        return {
            label: label === key ? t('admin.mailHosts.provisionMode.node') : label,
            className: 'border-primary/25 bg-primary/10 text-primary',
        };
    }
    if (mode === 'webhook') {
        return {
            label: label === key ? mode : label,
            className: 'border-border bg-muted/40 text-muted-foreground',
        };
    }
    return {
        label: label === key ? mode : label,
        className: 'border-border bg-muted/40 text-muted-foreground',
    };
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
        setLoading(true);
        try {
            const [hostsRes, nodesRes] = await Promise.all([
                axios.get('/api/admin/mail-hosts'),
                axios.get('/api/admin/web-nodes', { params: { page: 1, limit: 200 } }).catch(() => null),
            ]);
            setRows((hostsRes.data?.data?.hosts || []) as MailHostRow[]);
            const rawNodes = (nodesRes?.data?.data?.web_nodes || nodesRes?.data?.data?.nodes || []) as WebNodeOption[];
            setNodes(rawNodes);
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.mailHosts.loadFailed'));
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
            if (isNodeMode(row.provision_mode) && row.web_node_id) {
                map.set(row.web_node_id, row);
            }
        }
        return map;
    }, [rows]);

    const builtinHosts = useMemo(() => rows.filter((r) => isNodeMode(r.provision_mode)), [rows]);
    const externalHosts = useMemo(() => rows.filter((r) => !isNodeMode(r.provision_mode)), [rows]);
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
            toast.error(getApiErrorMessage(err, t, 'admin.mailHosts.ensureFailed'));
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
            toast.error(getApiErrorMessage(err, t, 'admin.mailHosts.createFailed'));
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
            toast.error(getApiErrorMessage(err, t, 'admin.mailHosts.deleteFailed'));
        }
    };

    const isEmpty = !loading && rows.length === 0 && nodesWithoutMail.length === 0;

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.mailHosts.title')}
                description={t('admin.mailHosts.description')}
                icon={Mail}
                actions={
                    <Button type='button' variant='outline' disabled={loading} onClick={() => void load()}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('common.refresh')}
                    </Button>
                }
            />

            {loading ? (
                <TableSkeleton count={3} />
            ) : (
                <>
                    <Alert className='border-primary/20 bg-primary/5'>
                        <CheckCircle2 className='text-primary h-4 w-4' />
                        <AlertTitle>{t('admin.mailHosts.autoTitle')}</AlertTitle>
                        <AlertDescription>{t('admin.mailHosts.autoHint')}</AlertDescription>
                    </Alert>

                    {nodesWithoutMail.length > 0 && (
                        <PageCard
                            title={t('admin.mailHosts.setupSection')}
                            description={t('admin.mailHosts.setupHint')}
                            icon={Server}
                        >
                            <div className='space-y-3'>
                                {nodesWithoutMail.map((node) => (
                                    <ResourceCard
                                        key={node.id}
                                        icon={Server}
                                        title={node.name}
                                        subtitle={node.fqdn || t('admin.mailHosts.noFqdn')}
                                        layout='stacked'
                                        actions={
                                            <div className='flex flex-wrap gap-2'>
                                                <Button variant='outline' size='sm' asChild>
                                                    <Link href={`/admin/web-nodes/${node.id}/edit?tab=packages`}>
                                                        <ExternalLink className='mr-1.5 h-4 w-4' />
                                                        {t('admin.mailHosts.installMailserver')}
                                                    </Link>
                                                </Button>
                                                {node.fqdn ? (
                                                    <Button
                                                        size='sm'
                                                        loading={ensuringNodeId === node.id}
                                                        onClick={() => void ensureNodeMail(node.id)}
                                                    >
                                                        {t('admin.mailHosts.registerHost')}
                                                    </Button>
                                                ) : null}
                                            </div>
                                        }
                                    />
                                ))}
                            </div>
                        </PageCard>
                    )}

                    {builtinHosts.length > 0 && (
                        <PageCard
                            title={t('admin.mailHosts.builtinSection')}
                            description={t('admin.mailHosts.builtinHint')}
                            icon={Mail}
                        >
                            <div className='space-y-3'>
                                {builtinHosts.map((row) => (
                                    <ResourceCard
                                        key={row.id}
                                        icon={Mail}
                                        title={row.name}
                                        subtitle={t('admin.mailHosts.rowNode', {
                                            node: webNodeName(row.web_node_id),
                                        })}
                                        badges={[provisionBadge(row.provision_mode, t)]}
                                        layout='stacked'
                                        description={
                                            <dl className='text-muted-foreground grid gap-2 text-xs sm:grid-cols-2'>
                                                <div>
                                                    <dt className='font-medium'>{t('admin.mailHosts.labels.mx')}</dt>
                                                    <dd className='text-foreground font-mono'>
                                                        {row.mx_host || row.hostname}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className='font-medium'>{t('admin.mailHosts.labels.imap')}</dt>
                                                    <dd className='text-foreground font-mono'>
                                                        {row.imap_host}:{row.imap_port}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className='font-medium'>{t('admin.mailHosts.labels.smtp')}</dt>
                                                    <dd className='text-foreground font-mono'>
                                                        {row.smtp_host}:{row.smtp_port}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt className='font-medium'>
                                                        {t('admin.mailHosts.labels.webmail')}
                                                    </dt>
                                                    <dd className='text-foreground truncate font-mono'>
                                                        {row.webmail_url || t('admin.mailHosts.notSet')}
                                                    </dd>
                                                </div>
                                            </dl>
                                        }
                                        actions={
                                            <div className='flex flex-wrap gap-2'>
                                                {row.web_node_id ? (
                                                    <Button variant='outline' size='sm' asChild>
                                                        <Link
                                                            href={`/admin/web-nodes/${row.web_node_id}/edit?tab=packages`}
                                                        >
                                                            <Wrench className='mr-1.5 h-4 w-4' />
                                                            {t('admin.mailHosts.openPackages')}
                                                        </Link>
                                                    </Button>
                                                ) : null}
                                                <Button
                                                    type='button'
                                                    variant='ghost'
                                                    size='sm'
                                                    className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                                                    title={t('common.delete')}
                                                    onClick={() => void removeHost(row.id)}
                                                >
                                                    <Trash2 className='h-4 w-4' />
                                                </Button>
                                            </div>
                                        }
                                    />
                                ))}
                            </div>
                        </PageCard>
                    )}

                    {externalHosts.length > 0 && (
                        <PageCard
                            title={t('admin.mailHosts.externalSection')}
                            description={t('admin.mailHosts.externalHint')}
                            icon={Mail}
                        >
                            <div className='space-y-3'>
                                {externalHosts.map((row) => (
                                    <ResourceCard
                                        key={row.id}
                                        icon={Mail}
                                        title={row.name}
                                        subtitle={t('admin.mailHosts.externalRowDetails', {
                                            hostname: row.hostname,
                                            imapHost: row.imap_host,
                                            imapPort: String(row.imap_port),
                                        })}
                                        badges={[provisionBadge(row.provision_mode, t)]}
                                        actions={
                                            <Button
                                                type='button'
                                                variant='ghost'
                                                size='sm'
                                                className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                                                title={t('common.delete')}
                                                onClick={() => void removeHost(row.id)}
                                            >
                                                <Trash2 className='h-4 w-4' />
                                            </Button>
                                        }
                                    />
                                ))}
                            </div>
                        </PageCard>
                    )}

                    {isEmpty ? (
                        <EmptyState
                            icon={Mail}
                            title={t('admin.mailHosts.empty')}
                            description={t('admin.mailHosts.emptyHint')}
                        />
                    ) : null}

                    <PageCard
                        title={t('admin.mailHosts.addExternal')}
                        description={t('admin.mailHosts.externalHint')}
                        icon={Plus}
                        action={
                            <Button
                                type='button'
                                variant={showExternal ? 'outline' : 'default'}
                                size='sm'
                                onClick={() => setShowExternal((v) => !v)}
                            >
                                <Plus className='mr-1.5 h-4 w-4' />
                                {showExternal ? t('common.cancel') : t('admin.mailHosts.addExternal')}
                            </Button>
                        }
                    >
                        {showExternal ? (
                            <div className='grid gap-4 md:grid-cols-2'>
                                <div className='space-y-2'>
                                    <Label htmlFor='mail-ext-name'>{t('admin.mailHosts.form.name')}</Label>
                                    <Input
                                        id='mail-ext-name'
                                        value={externalForm.name}
                                        onChange={(e) => setExternalForm({ ...externalForm, name: e.target.value })}
                                        placeholder={t('admin.mailHosts.form.namePlaceholder')}
                                    />
                                </div>
                                <div className='space-y-2'>
                                    <Label htmlFor='mail-ext-mode'>{t('admin.mailHosts.form.provisionMode')}</Label>
                                    <Select
                                        id='mail-ext-mode'
                                        value={externalForm.provision_mode}
                                        onChange={(e) =>
                                            setExternalForm({
                                                ...externalForm,
                                                provision_mode: e.target.value as 'inventory' | 'webhook',
                                            })
                                        }
                                    >
                                        <option value='inventory'>
                                            {t('admin.mailHosts.provisionMode.inventory')}
                                        </option>
                                        <option value='webhook'>{t('admin.mailHosts.provisionMode.webhook')}</option>
                                    </Select>
                                </div>
                                {externalForm.provision_mode === 'webhook' ? (
                                    <>
                                        <div className='space-y-2 md:col-span-2'>
                                            <Label htmlFor='mail-ext-url'>
                                                {t('admin.mailHosts.form.provisionUrl')}
                                            </Label>
                                            <Input
                                                id='mail-ext-url'
                                                value={externalForm.provision_url}
                                                onChange={(e) =>
                                                    setExternalForm({
                                                        ...externalForm,
                                                        provision_url: e.target.value,
                                                    })
                                                }
                                                placeholder={t('admin.mailHosts.form.provisionUrlPlaceholder')}
                                            />
                                        </div>
                                        <div className='space-y-2 md:col-span-2'>
                                            <Label htmlFor='mail-ext-key'>{t('admin.mailHosts.form.apiKey')}</Label>
                                            <Input
                                                id='mail-ext-key'
                                                type='password'
                                                value={externalForm.provision_api_key}
                                                onChange={(e) =>
                                                    setExternalForm({
                                                        ...externalForm,
                                                        provision_api_key: e.target.value,
                                                    })
                                                }
                                                placeholder={t('admin.mailHosts.form.apiKeyPlaceholder')}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className='space-y-2'>
                                            <Label htmlFor='mail-ext-hostname'>
                                                {t('admin.mailHosts.form.hostname')}
                                            </Label>
                                            <Input
                                                id='mail-ext-hostname'
                                                value={externalForm.hostname}
                                                onChange={(e) =>
                                                    setExternalForm({ ...externalForm, hostname: e.target.value })
                                                }
                                                placeholder={t('admin.mailHosts.form.hostnamePlaceholder')}
                                            />
                                        </div>
                                        <div className='space-y-2'>
                                            <Label htmlFor='mail-ext-webmail'>
                                                {t('admin.mailHosts.form.webmailUrl')}
                                            </Label>
                                            <Input
                                                id='mail-ext-webmail'
                                                value={externalForm.webmail_url}
                                                onChange={(e) =>
                                                    setExternalForm({
                                                        ...externalForm,
                                                        webmail_url: e.target.value,
                                                    })
                                                }
                                                placeholder={t('admin.mailHosts.form.webmailUrlPlaceholder')}
                                            />
                                        </div>
                                        <div className='space-y-2'>
                                            <Label htmlFor='mail-ext-imap'>{t('admin.mailHosts.form.imapHost')}</Label>
                                            <Input
                                                id='mail-ext-imap'
                                                value={externalForm.imap_host}
                                                onChange={(e) =>
                                                    setExternalForm({
                                                        ...externalForm,
                                                        imap_host: e.target.value,
                                                    })
                                                }
                                                placeholder={t('admin.mailHosts.form.imapHostPlaceholder')}
                                            />
                                        </div>
                                        <div className='space-y-2'>
                                            <Label htmlFor='mail-ext-smtp'>{t('admin.mailHosts.form.smtpHost')}</Label>
                                            <Input
                                                id='mail-ext-smtp'
                                                value={externalForm.smtp_host}
                                                onChange={(e) =>
                                                    setExternalForm({
                                                        ...externalForm,
                                                        smtp_host: e.target.value,
                                                    })
                                                }
                                                placeholder={t('admin.mailHosts.form.smtpHostPlaceholder')}
                                            />
                                        </div>
                                    </>
                                )}
                                <div className='md:col-span-2'>
                                    <Button loading={busy} onClick={() => void createExternalHost()}>
                                        <Plus className='mr-2 h-4 w-4' />
                                        {t('admin.mailHosts.create')}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <p className='text-muted-foreground text-sm'>{t('admin.mailHosts.addExternalCollapsed')}</p>
                        )}
                    </PageCard>
                </>
            )}
        </div>
    );
}
