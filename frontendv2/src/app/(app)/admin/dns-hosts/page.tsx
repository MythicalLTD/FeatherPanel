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
import { Cloud, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { Select } from '@/components/ui/select-native';
import { Label } from '@/components/ui/label';

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
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('admin.dnsHosts.loadFailed')
                    : t('admin.dnsHosts.loadFailed'),
            );
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
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('admin.dnsHosts.createFailed')
                    : t('admin.dnsHosts.createFailed'),
            );
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
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('admin.dnsHosts.deleteFailed')
                    : t('admin.dnsHosts.deleteFailed'),
            );
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
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('admin.dnsHosts.testFailed')
                    : t('admin.dnsHosts.testFailed'),
            );
        } finally {
            setTestingId(null);
        }
    };

    const webNodeName = (id?: number | null) => {
        if (!id) return t('admin.dnsHosts.noWebNode');
        return webNodes.find((n) => n.id === id)?.name || `#${id}`;
    };

    if (loading) return <TableSkeleton count={3} />;

    return (
        <div className='space-y-6'>
            <PageHeader title={t('admin.dnsHosts.title')} description={t('admin.dnsHosts.description')} icon={Cloud} />

            <div className='border-border grid gap-3 rounded-xl border p-4 md:grid-cols-2'>
                <div className='space-y-2'>
                    <Label>{t('admin.dnsHosts.form.name')}</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className='space-y-2'>
                    <Label>{t('admin.dnsHosts.form.webNode')}</Label>
                    <Select
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
                        <Plus className='mr-1 h-4 w-4' />
                        {t('admin.dnsHosts.create')}
                    </Button>
                </div>
            </div>

            <div className='border-border divide-border divide-y overflow-hidden rounded-xl border'>
                {rows.length === 0 && <p className='text-muted-foreground p-4 text-sm'>{t('admin.dnsHosts.empty')}</p>}
                {rows.map((row) => (
                    <div key={row.id} className='space-y-2 px-4 py-3'>
                        <div className='flex flex-wrap items-center justify-between gap-3'>
                            <div>
                                <p className='text-sm font-medium'>{row.name}</p>
                                <p className='text-muted-foreground text-xs'>
                                    {t('admin.dnsHosts.rowNodeDetails', {
                                        webNode: webNodeName(row.web_node_id),
                                    })}
                                </p>
                            </div>
                            <div className='flex gap-2'>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    loading={testingId === row.id}
                                    onClick={() => void testHost(row.id)}
                                >
                                    <RefreshCw className='mr-1 h-4 w-4' />
                                    {t('admin.dnsHosts.test')}
                                </Button>
                                <Button variant='ghost' size='sm' onClick={() => void removeHost(row.id)}>
                                    <Trash2 className='h-4 w-4' />
                                </Button>
                            </div>
                        </div>
                        {testZones[row.id] && (
                            <div className='text-muted-foreground text-xs'>
                                {t('admin.dnsHosts.discoveredZones', { count: String(testZones[row.id].length) })}
                                <span className='ml-1'>{testZones[row.id].map((z) => z.name).join(', ')}</span>
                            </div>
                        )}
                        {testDelegation[row.id] && (
                            <div className='bg-muted/30 space-y-1 rounded-md p-2 text-xs'>
                                <p className='font-medium'>{t('admin.dnsHosts.delegationTitle')}</p>
                                <p>
                                    {t('admin.dnsHosts.delegationNameservers', {
                                        nameservers: testDelegation[row.id].nameservers.join(', '),
                                    })}
                                </p>
                                {testDelegation[row.id].glue_ip && (
                                    <p>
                                        {t('admin.dnsHosts.delegationGlue', {
                                            glue: `ns1.example.com → ${testDelegation[row.id].glue_ip}`,
                                        })}
                                    </p>
                                )}
                                {testDelegation[row.id].registrar_note && (
                                    <p className='text-muted-foreground'>
                                        {t('admin.dnsHosts.delegationNote', {
                                            note: testDelegation[row.id].registrar_note ?? '',
                                        })}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
