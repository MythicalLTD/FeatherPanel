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
import axios from 'axios';
import { toast } from 'sonner';
import { Cloud, Plus, RefreshCw, Trash2 } from 'lucide-react';
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
import { getApiErrorMessage } from '@/lib/api-errors';

interface DnsHostRow {
    id: number;
    name: string;
    provider: string;
    web_node_id?: number | null;
}

interface WebNodeOption {
    id: number;
    name: string;
}

interface DnsZone {
    id: string;
    name: string;
    status?: string;
}

const emptyForm = {
    name: '',
    web_node_id: '',
};

export default function AdminDnsHostsPage() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<DnsHostRow[]>([]);
    const [webNodes, setWebNodes] = useState<WebNodeOption[]>([]);
    const [form, setForm] = useState(emptyForm);
    const [busy, setBusy] = useState(false);
    const [testingId, setTestingId] = useState<number | null>(null);
    const [testZones, setTestZones] = useState<Record<number, DnsZone[]>>({});
    const [testDelegation, setTestDelegation] = useState<
        Record<
            number,
            {
                nameservers: string[];
                glue_ip?: string | null;
                registrar_note?: string;
            }
        >
    >({});

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [hostsRes, nodesRes] = await Promise.all([
                axios.get('/api/admin/dns-hosts'),
                axios.get('/api/admin/web-nodes'),
            ]);
            setRows((hostsRes.data?.data?.hosts || []) as DnsHostRow[]);
            const nodes = (nodesRes.data?.data?.web_nodes || nodesRes.data?.data?.nodes || []) as Array<{
                id: number;
                name: string;
            }>;
            setWebNodes(nodes.map((n) => ({ id: n.id, name: n.name })));
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.dnsHosts.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void load();
    }, [load]);

    const createHost = async () => {
        if (!form.name.trim()) {
            toast.error(t('admin.dnsHosts.requiredFields'));
            return;
        }
        if (!form.web_node_id) {
            toast.error(t('admin.dnsHosts.requiredWebNode'));
            return;
        }

        setBusy(true);
        try {
            await axios.put('/api/admin/dns-hosts', {
                name: form.name.trim(),
                provider: 'node',
                web_node_id: Number(form.web_node_id),
            });
            toast.success(t('admin.dnsHosts.created'));
            setForm(emptyForm);
            await load();
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.dnsHosts.createFailed'));
        } finally {
            setBusy(false);
        }
    };

    const removeHost = async (id: number) => {
        if (!confirm(t('admin.dnsHosts.confirmDelete'))) return;
        try {
            await axios.delete(`/api/admin/dns-hosts/${id}`);
            toast.success(t('admin.dnsHosts.deleted'));
            await load();
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.dnsHosts.deleteFailed'));
        }
    };

    const testHost = async (id: number) => {
        setTestingId(id);
        try {
            const { data } = await axios.post(`/api/admin/dns-hosts/${id}/test`);
            const zones = (data?.data?.zones || []) as DnsZone[];
            setTestZones((prev) => ({ ...prev, [id]: zones }));
            const delegation = data?.data?.delegation as {
                nameservers?: string[];
                glue_ip?: string | null;
                registrar_note?: string;
            } | null;
            if (delegation?.nameservers) {
                setTestDelegation((prev) => ({
                    ...prev,
                    [id]: {
                        nameservers: delegation.nameservers ?? [],
                        glue_ip: delegation.glue_ip,
                        registrar_note: delegation.registrar_note,
                    },
                }));
            }
            toast.success(t('admin.dnsHosts.testSuccess', { count: String(zones.length) }));
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.dnsHosts.testFailed'));
        } finally {
            setTestingId(null);
        }
    };

    const webNodeName = (id?: number | null) => {
        if (!id) return t('admin.dnsHosts.noWebNode');
        return webNodes.find((n) => n.id === id)?.name || `#${id}`;
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.dnsHosts.title')}
                description={t('admin.dnsHosts.description')}
                icon={Cloud}
                actions={
                    <Button type='button' variant='outline' disabled={loading} onClick={() => void load()}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        {t('common.refresh')}
                    </Button>
                }
            />

            <PageCard
                title={t('admin.dnsHosts.createSection')}
                description={t('admin.dnsHosts.createSectionHint')}
                icon={Plus}
            >
                <div className='grid gap-4 md:grid-cols-2'>
                    <div className='space-y-2'>
                        <Label htmlFor='dns-host-name'>{t('admin.dnsHosts.form.name')}</Label>
                        <Input
                            id='dns-host-name'
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder={t('admin.dnsHosts.form.namePlaceholder')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    void createHost();
                                }
                            }}
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='dns-host-node'>{t('admin.dnsHosts.form.webNode')}</Label>
                        <Select
                            id='dns-host-node'
                            value={form.web_node_id}
                            onChange={(e) => setForm({ ...form, web_node_id: e.target.value })}
                        >
                            <option value=''>{t('admin.dnsHosts.form.selectWebNode')}</option>
                            {webNodes.map((node) => (
                                <option key={node.id} value={String(node.id)}>
                                    {node.name}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <p className='text-muted-foreground text-xs md:col-span-2'>{t('admin.dnsHosts.form.nodeHint')}</p>
                    <div className='md:col-span-2'>
                        <Button loading={busy} onClick={() => void createHost()}>
                            <Plus className='mr-2 h-4 w-4' />
                            {t('admin.dnsHosts.create')}
                        </Button>
                    </div>
                </div>
            </PageCard>

            {loading ? (
                <TableSkeleton count={3} />
            ) : rows.length === 0 ? (
                <EmptyState
                    icon={Cloud}
                    title={t('admin.dnsHosts.empty')}
                    description={t('admin.dnsHosts.emptyHint')}
                />
            ) : (
                <div className='space-y-3'>
                    <p className='text-muted-foreground text-sm'>
                        {t('admin.dnsHosts.listSummary', { total: String(rows.length) })}
                    </p>
                    {rows.map((row) => {
                        const badges: ResourceBadge[] = [
                            {
                                label: t('admin.dnsHosts.providerNode'),
                                className: 'border-primary/25 bg-primary/10 text-primary',
                            },
                        ];
                        const zones = testZones[row.id];
                        const delegation = testDelegation[row.id];

                        return (
                            <ResourceCard
                                key={row.id}
                                icon={Cloud}
                                title={row.name}
                                subtitle={t('admin.dnsHosts.rowNodeDetails', {
                                    webNode: webNodeName(row.web_node_id),
                                })}
                                badges={badges}
                                layout='stacked'
                                description={
                                    zones || delegation ? (
                                        <div className='bg-muted/30 space-y-2 rounded-xl p-3 text-xs'>
                                            {zones ? (
                                                <p className='text-muted-foreground'>
                                                    {t('admin.dnsHosts.discoveredZones', {
                                                        count: String(zones.length),
                                                    })}{' '}
                                                    <span className='text-foreground'>
                                                        {zones.map((z) => z.name).join(', ') ||
                                                            t('admin.dnsHosts.noZones')}
                                                    </span>
                                                </p>
                                            ) : null}
                                            {delegation ? (
                                                <div className='space-y-1'>
                                                    <p className='text-foreground font-medium'>
                                                        {t('admin.dnsHosts.delegationTitle')}
                                                    </p>
                                                    <p>
                                                        {t('admin.dnsHosts.delegationNameservers', {
                                                            nameservers: delegation.nameservers.join(', '),
                                                        })}
                                                    </p>
                                                    {delegation.glue_ip ? (
                                                        <p>
                                                            {t('admin.dnsHosts.delegationGlue', {
                                                                glue: t('admin.dnsHosts.delegationGlueExample', {
                                                                    ip: delegation.glue_ip,
                                                                }),
                                                            })}
                                                        </p>
                                                    ) : null}
                                                    {delegation.registrar_note ? (
                                                        <p className='text-muted-foreground'>
                                                            {t('admin.dnsHosts.delegationNote', {
                                                                note: delegation.registrar_note,
                                                            })}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : undefined
                                }
                                actions={
                                    <div className='flex flex-wrap gap-2'>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            loading={testingId === row.id}
                                            onClick={() => void testHost(row.id)}
                                        >
                                            <RefreshCw className='mr-1.5 h-4 w-4' />
                                            {t('admin.dnsHosts.test')}
                                        </Button>
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
                        );
                    })}
                </div>
            )}
        </div>
    );
}
