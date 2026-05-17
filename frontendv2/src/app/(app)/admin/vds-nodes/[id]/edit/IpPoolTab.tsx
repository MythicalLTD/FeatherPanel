/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studio
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
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { Label } from '@/components/ui/label';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Plus, Trash2, Search, RefreshCw, Network, Star, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { TabBlankState, TabHintCard, TabTableShell, TabToolbar } from './TabPrimitives';

interface VmIp {
    id: number;
    vm_node_id: number;
    ip: string;
    cidr: number | null;
    gateway: string | null;
    is_primary: 'true' | 'false';
    notes: string | null;
    created_at: string;
    updated_at: string;
    in_use?: boolean;
}

interface IpPoolTabProps {
    nodeId: string | number;
    nodeName: string;
}

export function IpPoolTab({ nodeId, nodeName }: IpPoolTabProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [ips, setIps] = useState<VmIp[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const [page, setPage] = useState(1);
    const pageSize = 50;
    const [pagination, setPagination] = useState({
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
    });

    const [createOpen, setCreateOpen] = useState(false);
    const [createMode, setCreateMode] = useState<'single' | 'bulk'>('single');
    const [createForm, setCreateForm] = useState({ ip: '', cidr: '', gateway: '', notes: '' });
    const [bulkIpsInput, setBulkIpsInput] = useState('');
    const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
    const [creating, setCreating] = useState(false);

    const [editIp, setEditIp] = useState<VmIp | null>(null);
    const [editForm, setEditForm] = useState({ ip: '', cidr: '', gateway: '', notes: '' });
    const [editErrors, setEditErrors] = useState<Record<string, string>>({});
    const [editing, setEditing] = useState(false);

    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const [setPrimaryLoading, setSetPrimaryLoading] = useState<number | null>(null);

    const filteredIps = Array.isArray(ips)
        ? ips.filter(
              (ip) =>
                  ip.ip.includes(searchQuery) ||
                  (ip.gateway && ip.gateway.includes(searchQuery)) ||
                  (ip.notes && ip.notes.toLowerCase().includes(searchQuery.toLowerCase())),
          )
        : [];

    const loadIps = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/admin/vm-nodes/${nodeId}/ips`, {
                params: { page, limit: pageSize },
            });
            const list: VmIp[] = Array.isArray(data.data?.ips) ? data.data.ips : [];
            setIps(list);
            const pag = data.data?.pagination;
            if (pag) {
                setPagination({
                    total: pag.total_records,
                    totalPages: pag.total_pages,
                    hasNext: pag.has_next,
                    hasPrev: pag.has_prev,
                });
            }
        } catch (error) {
            console.error('Error loading VM node IPs:', error);
            toast.error(t('admin.vdsNodes.ips.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [nodeId, page, t]);

    useEffect(() => {
        loadIps();
    }, [loadIps]);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, nodeId]);

    const validateCreate = () => {
        const errs: Record<string, string> = {};
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!createForm.ip) errs.ip = t('admin.vdsNodes.ips.errors.ip_required');
        else if (!ipRegex.test(createForm.ip)) errs.ip = t('admin.vdsNodes.ips.errors.ip_invalid');
        if (createForm.cidr !== '') {
            const cidr = parseInt(createForm.cidr, 10);
            if (isNaN(cidr) || cidr < 0 || cidr > 32) errs.cidr = t('admin.vdsNodes.ips.errors.cidr_invalid');
        }
        if (createForm.gateway && !ipRegex.test(createForm.gateway))
            errs.gateway = t('admin.vdsNodes.ips.errors.gateway_invalid');
        return errs;
    };

    const handleCreate = async () => {
        const errs = validateCreate();
        if (Object.keys(errs).length > 0) {
            setCreateErrors(errs);
            return;
        }
        setCreating(true);
        try {
            await axios.put(`/api/admin/vm-nodes/${nodeId}/ips`, {
                ip: createForm.ip,
                cidr: createForm.cidr !== '' ? parseInt(createForm.cidr, 10) : null,
                gateway: createForm.gateway || null,
                notes: createForm.notes || null,
            });
            toast.success(t('admin.vdsNodes.ips.add_success'));
            setCreateOpen(false);
            setCreateForm({ ip: '', cidr: '', gateway: '', notes: '' });
            setCreateErrors({});
            loadIps();
        } catch (error) {
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.vdsNodes.ips.add_failed'));
            }
        } finally {
            setCreating(false);
        }
    };

    const handleCreateBulk = async () => {
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        const entries = Array.from(
            new Set(
                bulkIpsInput
                    .split(/[\n,\s]+/g)
                    .map((s) => s.trim())
                    .filter(Boolean),
            ),
        );
        if (entries.length === 0) {
            toast.error(t('admin.vdsNodes.ips.bulk_empty'));
            return;
        }
        const invalid = entries.find((ip) => !ipRegex.test(ip));
        if (invalid) {
            toast.error(t('admin.vdsNodes.ips.bulk_invalid_ip', { ip: invalid }));
            return;
        }
        if (createForm.cidr !== '') {
            const cidr = parseInt(createForm.cidr, 10);
            if (isNaN(cidr) || cidr < 0 || cidr > 32) {
                toast.error(t('admin.vdsNodes.ips.errors.cidr_invalid'));
                return;
            }
        }
        if (createForm.gateway && !ipRegex.test(createForm.gateway)) {
            toast.error(t('admin.vdsNodes.ips.errors.gateway_invalid'));
            return;
        }

        setCreating(true);
        let success = 0;
        let failed = 0;
        try {
            for (const ip of entries) {
                try {
                    await axios.put(`/api/admin/vm-nodes/${nodeId}/ips`, {
                        ip,
                        cidr: createForm.cidr !== '' ? parseInt(createForm.cidr, 10) : null,
                        gateway: createForm.gateway || null,
                        notes: createForm.notes || null,
                    });
                    success++;
                } catch {
                    failed++;
                }
            }
            if (success > 0) {
                toast.success(`Created ${success} IP${success > 1 ? 's' : ''}.`);
                if (failed > 0) toast.warning(`Failed ${failed} IP${failed > 1 ? 's' : ''}.`);
                setCreateOpen(false);
                setBulkIpsInput('');
                setCreateForm({ ip: '', cidr: '', gateway: '', notes: '' });
                setCreateErrors({});
                loadIps();
            } else {
                toast.error(t('admin.vdsNodes.ips.add_failed'));
            }
        } finally {
            setCreating(false);
        }
    };

    const handleEdit = async () => {
        if (!editIp) return;
        const errs: Record<string, string> = {};
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (editForm.cidr !== '') {
            const cidr = parseInt(editForm.cidr, 10);
            if (isNaN(cidr) || cidr < 0 || cidr > 32) errs.cidr = t('admin.vdsNodes.ips.errors.cidr_invalid');
        }
        if (editForm.gateway && !ipRegex.test(editForm.gateway))
            errs.gateway = t('admin.vdsNodes.ips.errors.gateway_invalid');
        if (Object.keys(errs).length > 0) {
            setEditErrors(errs);
            return;
        }
        setEditing(true);
        try {
            await axios.patch(`/api/admin/vm-nodes/${nodeId}/ips/${editIp.id}`, {
                cidr: editForm.cidr !== '' ? parseInt(editForm.cidr, 10) : null,
                gateway: editForm.gateway || null,
                notes: editForm.notes || null,
            });
            toast.success(t('admin.vdsNodes.ips.update_success'));
            setEditIp(null);
            setEditErrors({});
            loadIps();
        } catch (error) {
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.vdsNodes.ips.update_failed'));
            }
        } finally {
            setEditing(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await axios.delete(`/api/admin/vm-nodes/${nodeId}/ips/${id}`);
            toast.success(t('admin.vdsNodes.ips.delete_success'));
            loadIps();
        } catch (error) {
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.vdsNodes.ips.delete_failed'));
            }
        } finally {
            setDeleteConfirmId(null);
        }
    };

    const handleSetPrimary = async (ipId: number) => {
        setSetPrimaryLoading(ipId);
        try {
            await axios.post(`/api/admin/vm-nodes/${nodeId}/ips/${ipId}/primary`);
            toast.success(t('admin.vdsNodes.ips.primary_success'));
            loadIps();
        } catch (error) {
            if (isAxiosError(error) && error.response?.data?.message) {
                toast.error(error.response.data.message);
            } else {
                toast.error(t('admin.vdsNodes.ips.primary_failed'));
            }
        } finally {
            setSetPrimaryLoading(null);
        }
    };

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.vdsNodes.ips.title')}
                icon={Network}
                description={t('admin.vdsNodes.ips.description', { name: nodeName })}
                action={
                    <Button size='sm' onClick={() => setCreateOpen(true)}>
                        <Plus className='mr-2 h-4 w-4' />
                        {t('admin.vdsNodes.ips.add_button')}
                    </Button>
                }
            >
                <div className='space-y-4'>
                    <TabToolbar>
                        <div className='relative flex-1'>
                            <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                            <Input
                                placeholder={t('admin.vdsNodes.ips.search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className='pl-10'
                            />
                        </div>
                        <Button variant='outline' size='icon' onClick={loadIps} loading={loading}>
                            <RefreshCw className='h-4 w-4' />
                        </Button>
                    </TabToolbar>

                    {pagination.totalPages > 1 && (
                        <div className='border-border bg-card/50 flex items-center justify-between gap-4 rounded-xl border px-4 py-3'>
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={!pagination.hasPrev}
                                onClick={() => setPage((p) => p - 1)}
                                className='gap-1.5'
                            >
                                <ChevronLeft className='h-4 w-4' />
                                {t('common.previous')}
                            </Button>
                            <span className='text-sm font-medium'>
                                {page} / {pagination.totalPages}
                            </span>
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={!pagination.hasNext}
                                onClick={() => setPage((p) => p + 1)}
                                className='gap-1.5'
                            >
                                {t('common.next')}
                                <ChevronRight className='h-4 w-4' />
                            </Button>
                        </div>
                    )}

                    {loading ? (
                        <TableSkeleton count={3} />
                    ) : filteredIps.length === 0 ? (
                        <TabBlankState
                            icon={Network}
                            title={searchQuery ? t('admin.vdsNodes.ips.no_results') : t('admin.vdsNodes.ips.empty')}
                        />
                    ) : (
                        <TabTableShell>
                            <table className='w-full text-sm'>
                                <thead className='bg-muted/20 border-border/50 border-b'>
                                    <tr>
                                        <th className='text-muted-foreground px-4 py-3 text-left font-medium'>ID</th>
                                        <th className='text-muted-foreground px-4 py-3 text-left font-medium'>
                                            {t('admin.vdsNodes.ips.col_ip')}
                                        </th>
                                        <th className='text-muted-foreground px-4 py-3 text-left font-medium'>
                                            {t('admin.vdsNodes.ips.col_cidr')}
                                        </th>
                                        <th className='text-muted-foreground px-4 py-3 text-left font-medium'>
                                            {t('admin.vdsNodes.ips.col_gateway')}
                                        </th>
                                        <th className='text-muted-foreground px-4 py-3 text-left font-medium'>
                                            {t('admin.vdsNodes.ips.col_notes')}
                                        </th>
                                        <th className='text-muted-foreground px-4 py-3 text-left font-medium'>
                                            {t('admin.vdsNodes.ips.col_status')}
                                        </th>
                                        <th className='text-muted-foreground px-4 py-3 text-right font-medium'>
                                            {t('common.actions')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className='divide-border/50 divide-y'>
                                    {filteredIps.map((ip) => (
                                        <tr key={ip.id} className='hover:bg-muted/20 transition-colors'>
                                            <td className='text-muted-foreground px-4 py-3 font-mono text-xs'>
                                                {ip.id}
                                            </td>
                                            <td className='px-4 py-3'>
                                                <div className='flex items-center gap-2'>
                                                    <span className='font-mono'>{ip.ip}</span>
                                                    {ip.is_primary === 'true' && (
                                                        <span
                                                            className='rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase dark:text-amber-400'
                                                            title={t('admin.vdsNodes.ips.primary_proxmox_help')}
                                                        >
                                                            {t('admin.vdsNodes.ips.primary_badge')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className='text-muted-foreground px-4 py-3 font-mono'>
                                                {ip.cidr !== null ? `/${ip.cidr}` : '-'}
                                            </td>
                                            <td className='text-muted-foreground px-4 py-3 font-mono'>
                                                {ip.gateway || '-'}
                                            </td>
                                            <td className='text-muted-foreground max-w-[180px] truncate px-4 py-3'>
                                                {ip.notes || '-'}
                                            </td>
                                            <td className='px-4 py-3'>
                                                {ip.in_use ? (
                                                    <span className='rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400'>
                                                        {t('admin.vdsNodes.ips.in_use_badge')}
                                                    </span>
                                                ) : (
                                                    <span className='text-muted-foreground text-xs'>
                                                        {t('admin.vdsNodes.ips.available')}
                                                    </span>
                                                )}
                                            </td>
                                            <td className='px-4 py-3 text-right'>
                                                <div className='flex items-center justify-end gap-1'>
                                                    {ip.is_primary !== 'true' && (
                                                        <Button
                                                            variant='ghost'
                                                            size='sm'
                                                            loading={setPrimaryLoading === ip.id}
                                                            onClick={() => handleSetPrimary(ip.id)}
                                                            title={t('admin.vdsNodes.ips.set_primary')}
                                                        >
                                                            <Star className='h-4 w-4' />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant='ghost'
                                                        size='sm'
                                                        onClick={() => {
                                                            setEditIp(ip);
                                                            setEditForm({
                                                                ip: ip.ip,
                                                                cidr: ip.cidr !== null ? String(ip.cidr) : '',
                                                                gateway: ip.gateway || '',
                                                                notes: ip.notes || '',
                                                            });
                                                        }}
                                                        title={t('common.edit')}
                                                    >
                                                        <Pencil className='h-4 w-4' />
                                                    </Button>
                                                    {deleteConfirmId === ip.id ? (
                                                        <div className='flex items-center gap-1'>
                                                            <Button
                                                                variant='destructive'
                                                                size='sm'
                                                                onClick={() => handleDelete(ip.id)}
                                                                disabled={ip.in_use}
                                                                title={
                                                                    ip.in_use
                                                                        ? t('admin.vdsNodes.ips.cannot_delete_in_use')
                                                                        : undefined
                                                                }
                                                            >
                                                                {t('common.confirm')}
                                                            </Button>
                                                            <Button
                                                                variant='outline'
                                                                size='sm'
                                                                onClick={() => setDeleteConfirmId(null)}
                                                            >
                                                                {t('common.cancel')}
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            variant='ghost'
                                                            size='sm'
                                                            className='text-destructive hover:text-destructive hover:bg-destructive/10'
                                                            onClick={() => !ip.in_use && setDeleteConfirmId(ip.id)}
                                                            disabled={ip.in_use}
                                                            title={
                                                                ip.in_use
                                                                    ? t('admin.vdsNodes.ips.cannot_delete_in_use')
                                                                    : t('common.delete')
                                                            }
                                                        >
                                                            <Trash2 className='h-4 w-4' />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </TabTableShell>
                    )}

                    {pagination.totalPages > 1 && (
                        <div className='mt-4 flex items-center justify-between'>
                            <p className='text-muted-foreground text-xs'>
                                {t('common.pagination.showing', {
                                    from: String((page - 1) * pageSize + 1),
                                    to: String(Math.min(page * pageSize, pagination.total)),
                                    total: String(pagination.total),
                                })}
                            </p>
                            <div className='flex items-center gap-2'>
                                <Button
                                    variant='outline'
                                    size='icon'
                                    disabled={!pagination.hasPrev}
                                    onClick={() => setPage((p) => p - 1)}
                                >
                                    <ChevronLeft className='h-4 w-4' />
                                </Button>
                                <span className='px-2 text-xs font-medium'>
                                    {page} / {pagination.totalPages}
                                </span>
                                <Button
                                    variant='outline'
                                    size='icon'
                                    disabled={!pagination.hasNext}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    <ChevronRight className='h-4 w-4' />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </PageCard>

            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
                <TabHintCard
                    icon={Network}
                    title={t('admin.vdsNodes.ips.help.what_are_ips')}
                    description={t('admin.vdsNodes.ips.help.what_are_ips_text')}
                />
                <TabHintCard
                    icon={Star}
                    title={t('admin.vdsNodes.ips.help.primary_ip')}
                    description={t('admin.vdsNodes.ips.help.primary_ip_text')}
                />
            </div>

            <Sheet open={createOpen} onOpenChange={(open) => !open && setCreateOpen(false)}>
                <SheetHeader>
                    <SheetTitle>{t('admin.vdsNodes.ips.create.title')}</SheetTitle>
                    <SheetDescription>{t('admin.vdsNodes.ips.create.description')}</SheetDescription>
                </SheetHeader>
                <div className='mt-8 space-y-6'>
                    <div className='bg-muted/50 flex gap-1 rounded-xl p-1'>
                        <Button
                            type='button'
                            variant='ghost'
                            className={
                                createMode === 'single'
                                    ? 'bg-background hover:bg-background h-9 flex-1 rounded-lg text-xs shadow-sm'
                                    : 'h-9 flex-1 rounded-lg text-xs'
                            }
                            onClick={() => setCreateMode('single')}
                        >
                            {t('admin.vdsNodes.ips.single')}
                        </Button>
                        <Button
                            type='button'
                            variant='ghost'
                            className={
                                createMode === 'bulk'
                                    ? 'bg-background hover:bg-background h-9 flex-1 rounded-lg text-xs shadow-sm'
                                    : 'h-9 flex-1 rounded-lg text-xs'
                            }
                            onClick={() => setCreateMode('bulk')}
                        >
                            {t('admin.vdsNodes.ips.bulk')}
                        </Button>
                    </div>
                    {createMode === 'bulk' && (
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>{t('admin.vdsNodes.ips.bulk_list')}</Label>
                            <Textarea
                                placeholder={'10.0.0.10\n10.0.0.11\n10.0.0.12'}
                                value={bulkIpsInput}
                                className='min-h-[120px] font-mono'
                                onChange={(e) => setBulkIpsInput(e.target.value)}
                            />
                            <p className='text-muted-foreground text-xs'>{t('admin.vdsNodes.ips.bulk_help')}</p>
                        </div>
                    )}
                    {createMode === 'single' && (
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>{t('admin.vdsNodes.ips.col_ip')}</Label>
                            <Input
                                placeholder='192.168.1.100'
                                value={createForm.ip}
                                className='h-11 font-mono'
                                onChange={(e) => setCreateForm((p) => ({ ...p, ip: e.target.value }))}
                            />
                            {createErrors.ip && (
                                <p className='text-[10px] font-bold text-red-500 uppercase'>{createErrors.ip}</p>
                            )}
                        </div>
                    )}
                    <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>{t('admin.vdsNodes.ips.col_cidr')}</Label>
                            <Input
                                type='number'
                                placeholder='24'
                                min={0}
                                max={32}
                                value={createForm.cidr}
                                className='h-11 font-mono'
                                onChange={(e) => setCreateForm((p) => ({ ...p, cidr: e.target.value }))}
                            />
                            {createErrors.cidr && (
                                <p className='text-[10px] font-bold text-red-500 uppercase'>{createErrors.cidr}</p>
                            )}
                        </div>
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>{t('admin.vdsNodes.ips.col_gateway')}</Label>
                            <Input
                                placeholder='192.168.1.1'
                                value={createForm.gateway}
                                className='h-11 font-mono'
                                onChange={(e) => setCreateForm((p) => ({ ...p, gateway: e.target.value }))}
                            />
                            {createErrors.gateway && (
                                <p className='text-[10px] font-bold text-red-500 uppercase'>{createErrors.gateway}</p>
                            )}
                        </div>
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.vdsNodes.ips.col_notes')}</Label>
                        <Textarea
                            placeholder={t('admin.vdsNodes.ips.notes_placeholder')}
                            value={createForm.notes}
                            className='min-h-[100px]'
                            onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
                        />
                    </div>
                </div>
                <SheetFooter>
                    <Button variant='outline' onClick={() => setCreateOpen(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={createMode === 'bulk' ? handleCreateBulk : handleCreate} loading={creating}>
                        {t('common.create')}
                    </Button>
                </SheetFooter>
            </Sheet>

            <Sheet open={!!editIp} onOpenChange={(open) => !open && setEditIp(null)}>
                <SheetHeader>
                    <SheetTitle>{t('admin.vdsNodes.ips.edit.title')}</SheetTitle>
                    <SheetDescription>
                        {editIp && t('admin.vdsNodes.ips.edit.description', { ip: editIp.ip })}
                    </SheetDescription>
                </SheetHeader>
                <div className='mt-8 space-y-6'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.vdsNodes.ips.col_ip')}</Label>
                        <Input value={editForm.ip} disabled className='bg-muted/30 h-11 font-mono' />
                        <p className='text-muted-foreground text-[10px] italic'>
                            {t('admin.vdsNodes.ips.edit.ip_immutable')}
                        </p>
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>{t('admin.vdsNodes.ips.col_cidr')}</Label>
                            <Input
                                type='number'
                                placeholder='24'
                                min={0}
                                max={32}
                                value={editForm.cidr}
                                className='h-11 font-mono'
                                onChange={(e) => setEditForm((p) => ({ ...p, cidr: e.target.value }))}
                            />
                            {editErrors.cidr && (
                                <p className='text-[10px] font-bold text-red-500 uppercase'>{editErrors.cidr}</p>
                            )}
                        </div>
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>{t('admin.vdsNodes.ips.col_gateway')}</Label>
                            <Input
                                placeholder='192.168.1.1'
                                value={editForm.gateway}
                                className='h-11 font-mono'
                                onChange={(e) => setEditForm((p) => ({ ...p, gateway: e.target.value }))}
                            />
                            {editErrors.gateway && (
                                <p className='text-[10px] font-bold text-red-500 uppercase'>{editErrors.gateway}</p>
                            )}
                        </div>
                    </div>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.vdsNodes.ips.col_notes')}</Label>
                        <Textarea
                            placeholder={t('admin.vdsNodes.ips.notes_placeholder')}
                            value={editForm.notes}
                            className='min-h-[100px]'
                            onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                        />
                    </div>
                </div>
                <SheetFooter>
                    <Button variant='outline' onClick={() => setEditIp(null)}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleEdit} loading={editing}>
                        {t('common.save')}
                    </Button>
                </SheetFooter>
            </Sheet>
        </div>
    );
}
