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
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select-native';
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface DnsHostOption {
    id: number;
    name: string;
    provider: string;
}

interface LinkedZone {
    id: number;
    zone_name: string;
    provider_zone_id: string;
    is_primary: boolean;
    dns_host_id: number;
    dns_host?: { name?: string; provider?: string };
}

interface DnsRecord {
    id: string;
    type: string;
    name: string;
    content: string;
    ttl: number;
    priority?: number | null;
}

interface Props {
    apiBase: string;
    canRead?: boolean;
    canManage?: boolean;
}

const recordTypes = ['A', 'AAAA', 'CNAME', 'TXT', 'MX'];

const emptyRecordForm = {
    type: 'A',
    name: '',
    content: '',
    ttl: '300',
    priority: '10',
};

export function WebSpaceDnsZoneEditor({ apiBase, canRead = true, canManage = true }: Props) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [hosts, setHosts] = useState<DnsHostOption[]>([]);
    const [zones, setZones] = useState<LinkedZone[]>([]);
    const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
    const [records, setRecords] = useState<DnsRecord[]>([]);
    const [linkHostId, setLinkHostId] = useState('');
    const [linkZoneName, setLinkZoneName] = useState('');
    const [busy, setBusy] = useState(false);
    const [recordDialogOpen, setRecordDialogOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<DnsRecord | null>(null);
    const [recordForm, setRecordForm] = useState(emptyRecordForm);
    const [delegation, setDelegation] = useState<{
        nameservers: string[];
        glue_ip?: string | null;
        registrar_note?: string;
    } | null>(null);

    const loadZones = useCallback(async () => {
        if (!canRead) {
            setLoading(false);
            return;
        }
        try {
            const [zonesRes, hostsRes] = await Promise.all([
                axios.get(`${apiBase}/dns/zones`),
                axios.get(`${apiBase}/dns/hosts`),
            ]);
            const nextZones = (zonesRes.data?.data?.zones || []) as LinkedZone[];
            setZones(nextZones);
            setHosts((hostsRes.data?.data?.hosts || []) as DnsHostOption[]);
            setSelectedZoneId((prev) => {
                if (prev && nextZones.some((z) => z.id === prev)) return prev;
                const primary = nextZones.find((z) => z.is_primary);
                return primary?.id ?? nextZones[0]?.id ?? null;
            });
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.dns.loadFailed')
                    : t('webSpaces.dns.loadFailed'),
            );
        } finally {
            setLoading(false);
        }
    }, [apiBase, canRead, t]);

    const loadRecords = useCallback(async () => {
        if (!canRead || !selectedZoneId) {
            setRecords([]);
            return;
        }
        try {
            const { data } = await axios.get(`${apiBase}/dns/zones/${selectedZoneId}/records`);
            setRecords((data?.data?.records || []) as DnsRecord[]);
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.dns.recordsLoadFailed')
                    : t('webSpaces.dns.recordsLoadFailed'),
            );
        }
    }, [apiBase, canRead, selectedZoneId, t]);

    useEffect(() => {
        void loadZones();
    }, [loadZones]);

    useEffect(() => {
        void loadRecords();
    }, [loadRecords]);

    const linkZone = async () => {
        if (!linkHostId || !linkZoneName.trim()) {
            toast.error(t('webSpaces.dns.linkRequired'));
            return;
        }
        setBusy(true);
        try {
            const { data } = await axios.post(`${apiBase}/dns/zones`, {
                dns_host_id: Number(linkHostId),
                zone_name: linkZoneName.trim().toLowerCase(),
                is_primary: zones.length === 0,
            });
            setDelegation((data?.data?.delegation as typeof delegation) ?? null);
            toast.success(t('webSpaces.dns.zoneLinked'));
            setLinkZoneName('');
            await loadZones();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.dns.linkFailed')
                    : t('webSpaces.dns.linkFailed'),
            );
        } finally {
            setBusy(false);
        }
    };

    const unlinkZone = async (zoneId: number) => {
        if (!confirm(t('webSpaces.dns.unlinkConfirm'))) return;
        try {
            await axios.delete(`${apiBase}/dns/zones/${zoneId}`);
            toast.success(t('webSpaces.dns.zoneUnlinked'));
            if (selectedZoneId === zoneId) setSelectedZoneId(null);
            await loadZones();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.dns.unlinkFailed')
                    : t('webSpaces.dns.unlinkFailed'),
            );
        }
    };

    const openCreateRecord = () => {
        setEditingRecord(null);
        setRecordForm(emptyRecordForm);
        setRecordDialogOpen(true);
    };

    const openEditRecord = (record: DnsRecord) => {
        setEditingRecord(record);
        setRecordForm({
            type: record.type,
            name: record.name,
            content: record.content,
            ttl: String(record.ttl),
            priority: String(record.priority ?? 10),
        });
        setRecordDialogOpen(true);
    };

    const saveRecord = async () => {
        if (!selectedZoneId) return;
        if (!recordForm.name.trim() || !recordForm.content.trim()) {
            toast.error(t('webSpaces.dns.recordRequired'));
            return;
        }
        setBusy(true);
        try {
            const payload: Record<string, unknown> = {
                type: recordForm.type,
                name: recordForm.name.trim(),
                content: recordForm.content.trim(),
                ttl: Number(recordForm.ttl) || 300,
            };
            if (recordForm.type === 'MX') {
                payload.priority = Number(recordForm.priority) || 10;
            }
            if (editingRecord) {
                await axios.patch(`${apiBase}/dns/zones/${selectedZoneId}/records/${editingRecord.id}`, payload);
                toast.success(t('webSpaces.dns.recordUpdated'));
            } else {
                await axios.post(`${apiBase}/dns/zones/${selectedZoneId}/records`, payload);
                toast.success(t('webSpaces.dns.recordCreated'));
            }
            setRecordDialogOpen(false);
            await loadRecords();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.dns.recordSaveFailed')
                    : t('webSpaces.dns.recordSaveFailed'),
            );
        } finally {
            setBusy(false);
        }
    };

    const deleteRecord = async (recordId: string) => {
        if (!selectedZoneId || !confirm(t('webSpaces.dns.deleteRecordConfirm'))) return;
        try {
            await axios.delete(`${apiBase}/dns/zones/${selectedZoneId}/records/${recordId}`);
            toast.success(t('webSpaces.dns.recordDeleted'));
            await loadRecords();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.dns.recordDeleteFailed')
                    : t('webSpaces.dns.recordDeleteFailed'),
            );
        }
    };

    if (!canRead) return null;
    if (loading) return <p className='text-muted-foreground text-sm'>{t('common.loading')}</p>;

    const selectedZone = zones.find((z) => z.id === selectedZoneId) || null;

    return (
        <div className='space-y-4'>
            <div>
                <h3 className='text-sm font-medium'>{t('webSpaces.dns.title')}</h3>
                <p className='text-muted-foreground text-xs'>{t('webSpaces.dns.description')}</p>
            </div>

            {delegation && (
                <div className='border-border bg-muted/20 space-y-1 rounded-lg border p-3 text-xs'>
                    <p className='font-medium'>{t('webSpaces.dns.delegationTitle')}</p>
                    <p>
                        {t('webSpaces.dns.delegationNameservers', { nameservers: delegation.nameservers.join(', ') })}
                    </p>
                    {delegation.glue_ip && (
                        <p>{t('webSpaces.dns.delegationGlue', { glue: `ns1 → ${delegation.glue_ip}` })}</p>
                    )}
                    {delegation.registrar_note && (
                        <p className='text-muted-foreground'>
                            {t('webSpaces.dns.delegationNote', { note: delegation.registrar_note })}
                        </p>
                    )}
                </div>
            )}

            {canManage && (
                <div className='border-border grid gap-3 rounded-lg border p-3 md:grid-cols-3'>
                    <div className='space-y-1'>
                        <Label>{t('webSpaces.dns.dnsHost')}</Label>
                        <Select value={linkHostId} onChange={(e) => setLinkHostId(e.target.value)}>
                            <option value=''>{t('webSpaces.dns.selectHost')}</option>
                            {hosts.map((host) => (
                                <option key={host.id} value={String(host.id)}>
                                    {host.name}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className='space-y-1'>
                        <Label>{t('webSpaces.dns.zoneName')}</Label>
                        <Input
                            value={linkZoneName}
                            onChange={(e) => setLinkZoneName(e.target.value)}
                            placeholder='example.com'
                        />
                    </div>
                    <div className='flex items-end'>
                        <Button loading={busy} onClick={() => void linkZone()}>
                            <Plus className='mr-1 h-4 w-4' />
                            {t('webSpaces.dns.linkZone')}
                        </Button>
                    </div>
                </div>
            )}

            {zones.length > 0 && (
                <div className='flex flex-wrap items-center gap-2'>
                    <Label>{t('webSpaces.dns.linkedZones')}</Label>
                    <Select
                        value={selectedZoneId ? String(selectedZoneId) : ''}
                        onChange={(e) => setSelectedZoneId(e.target.value ? Number(e.target.value) : null)}
                    >
                        {zones.map((zone) => (
                            <option key={zone.id} value={String(zone.id)}>
                                {zone.zone_name}
                                {zone.is_primary ? ` (${t('webSpaces.dns.primary')})` : ''}
                            </option>
                        ))}
                    </Select>
                    {canManage && selectedZone && (
                        <Button variant='ghost' size='sm' onClick={() => void unlinkZone(selectedZone.id)}>
                            <Trash2 className='h-4 w-4' />
                        </Button>
                    )}
                    <Button variant='outline' size='sm' onClick={() => void loadRecords()}>
                        <RefreshCw className='h-4 w-4' />
                    </Button>
                </div>
            )}

            {selectedZone && (
                <div className='space-y-2'>
                    <div className='flex items-center justify-between'>
                        <p className='text-muted-foreground text-xs'>
                            {t('webSpaces.dns.zoneMeta', {
                                host: selectedZone.dns_host?.name || String(selectedZone.dns_host_id),
                                zoneId: selectedZone.provider_zone_id,
                            })}
                        </p>
                        {canManage && (
                            <Button size='sm' variant='outline' onClick={openCreateRecord}>
                                <Plus className='mr-1 h-4 w-4' />
                                {t('webSpaces.dns.addRecord')}
                            </Button>
                        )}
                    </div>
                    <div className='border-border overflow-x-auto rounded-lg border'>
                        <table className='w-full text-left text-sm'>
                            <thead className='bg-muted/40 text-xs'>
                                <tr>
                                    <th className='px-3 py-2'>{t('webSpaces.dns.colType')}</th>
                                    <th className='px-3 py-2'>{t('webSpaces.dns.colName')}</th>
                                    <th className='px-3 py-2'>{t('webSpaces.dns.colContent')}</th>
                                    <th className='px-3 py-2'>{t('webSpaces.dns.colTtl')}</th>
                                    {canManage && <th className='px-3 py-2' />}
                                </tr>
                            </thead>
                            <tbody>
                                {records.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={canManage ? 5 : 4}
                                            className='text-muted-foreground px-3 py-4 text-xs'
                                        >
                                            {t('webSpaces.dns.noRecords')}
                                        </td>
                                    </tr>
                                )}
                                {records.map((record) => (
                                    <tr key={record.id} className='border-border border-t'>
                                        <td className='px-3 py-2'>{record.type}</td>
                                        <td className='px-3 py-2 font-mono text-xs'>{record.name}</td>
                                        <td className='px-3 py-2 font-mono text-xs'>{record.content}</td>
                                        <td className='px-3 py-2'>{record.ttl}</td>
                                        {canManage && (
                                            <td className='px-3 py-2'>
                                                <div className='flex gap-1'>
                                                    <Button
                                                        variant='ghost'
                                                        size='sm'
                                                        onClick={() => openEditRecord(record)}
                                                    >
                                                        {t('common.edit')}
                                                    </Button>
                                                    <Button
                                                        variant='ghost'
                                                        size='sm'
                                                        onClick={() => void deleteRecord(record.id)}
                                                    >
                                                        <Trash2 className='h-4 w-4' />
                                                    </Button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Dialog open={recordDialogOpen} onOpenChange={setRecordDialogOpen}>
                <DialogHeader>
                    <DialogTitle>
                        {editingRecord ? t('webSpaces.dns.editRecord') : t('webSpaces.dns.addRecord')}
                    </DialogTitle>
                </DialogHeader>
                <div className='grid gap-3 py-2'>
                    <div className='space-y-1'>
                        <Label>{t('webSpaces.dns.colType')}</Label>
                        <Select
                            value={recordForm.type}
                            onChange={(e) => setRecordForm({ ...recordForm, type: e.target.value })}
                            disabled={!!editingRecord}
                        >
                            {recordTypes.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className='space-y-1'>
                        <Label>{t('webSpaces.dns.colName')}</Label>
                        <Input
                            value={recordForm.name}
                            onChange={(e) => setRecordForm({ ...recordForm, name: e.target.value })}
                        />
                    </div>
                    <div className='space-y-1'>
                        <Label>{t('webSpaces.dns.colContent')}</Label>
                        <Input
                            value={recordForm.content}
                            onChange={(e) => setRecordForm({ ...recordForm, content: e.target.value })}
                        />
                    </div>
                    <div className='space-y-1'>
                        <Label>{t('webSpaces.dns.colTtl')}</Label>
                        <Input
                            value={recordForm.ttl}
                            onChange={(e) => setRecordForm({ ...recordForm, ttl: e.target.value })}
                        />
                    </div>
                    {recordForm.type === 'MX' && (
                        <div className='space-y-1'>
                            <Label>{t('webSpaces.dns.priority')}</Label>
                            <Input
                                value={recordForm.priority}
                                onChange={(e) => setRecordForm({ ...recordForm, priority: e.target.value })}
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant='outline' onClick={() => setRecordDialogOpen(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button loading={busy} onClick={() => void saveRecord()}>
                        {t('common.save')}
                    </Button>
                </DialogFooter>
            </Dialog>
        </div>
    );
}
