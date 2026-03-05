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
import { Label } from '@/components/ui/label';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Plus, Trash2, Search, RefreshCw, Network, Star, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

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
    const [createForm, setCreateForm] = useState({ ip: '', cidr: '', gateway: '', notes: '' });
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
                        <Plus className='h-4 w-4 mr-2' />
                        {t('admin.vdsNodes.ips.add_button')}
                    </Button>
                }
            >
                <div className='space-y-4'>
                    <div className='flex items-center gap-4'>
                        <div className='relative flex-1'>
                            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
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
                    </div>

                    {pagination.totalPages > 1 && (
                        <div className='flex items-center justify-between gap-4 py-3 px-4 rounded-xl border border-border bg-card/50'>
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

                    <div className='rounded-xl border border-border/50 overflow-hidden'>
                        <table className='w-full text-sm'>
                            <thead className='bg-muted/30 border-b border-border/50'>
                                <tr>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>ID</th>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                                        {t('admin.vdsNodes.ips.col_ip')}
                                    </th>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                                        {t('admin.vdsNodes.ips.col_cidr')}
                                    </th>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                                        {t('admin.vdsNodes.ips.col_gateway')}
                                    </th>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                                        {t('admin.vdsNodes.ips.col_notes')}
                                    </th>
                                    <th className='px-4 py-3 text-right font-medium text-muted-foreground'>
                                        {t('common.actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className='divide-y divide-border/50'>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className='px-4 py-8 text-center'>
                                            <Loader2 className='h-6 w-6 animate-spin mx-auto text-primary' />
                                        </td>
                                    </tr>
                                ) : filteredIps.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className='px-4 py-8 text-center text-muted-foreground italic'>
                                            {searchQuery
                                                ? t('admin.vdsNodes.ips.no_results')
                                                : t('admin.vdsNodes.ips.empty')}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredIps.map((ip) => (
                                        <tr key={ip.id} className='hover:bg-muted/20 transition-colors'>
                                            <td className='px-4 py-3 font-mono text-xs text-muted-foreground'>
                                                {ip.id}
                                            </td>
                                            <td className='px-4 py-3'>
                                                <div className='flex items-center gap-2'>
                                                    <span className='font-mono'>{ip.ip}</span>
                                                    {ip.is_primary === 'true' && (
                                                        <span className='px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold uppercase rounded-full border border-primary/30'>
                                                            {t('admin.vdsNodes.ips.primary_badge')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className='px-4 py-3 font-mono text-muted-foreground'>
                                                {ip.cidr !== null ? `/${ip.cidr}` : '-'}
                                            </td>
                                            <td className='px-4 py-3 font-mono text-muted-foreground'>
                                                {ip.gateway || '-'}
                                            </td>
                                            <td className='px-4 py-3 text-muted-foreground truncate max-w-[180px]'>
                                                {ip.notes || '-'}
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
                                                        <Search className='h-4 w-4' />
                                                    </Button>
                                                    {deleteConfirmId === ip.id ? (
                                                        <div className='flex items-center gap-1'>
                                                            <Button
                                                                variant='destructive'
                                                                size='sm'
                                                                onClick={() => handleDelete(ip.id)}
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
                                                            onClick={() => setDeleteConfirmId(ip.id)}
                                                        >
                                                            <Trash2 className='h-4 w-4' />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {pagination.totalPages > 1 && (
                        <div className='flex items-center justify-between mt-4'>
                            <p className='text-xs text-muted-foreground'>
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
                                <span className='text-xs font-medium px-2'>
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

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='p-6 bg-card/40 border border-border/50 rounded-2xl space-y-3'>
                    <div className='flex items-center gap-3 text-primary'>
                        <Network className='h-5 w-5' />
                        <h4 className='font-bold'>{t('admin.vdsNodes.ips.help.what_are_ips')}</h4>
                    </div>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.vdsNodes.ips.help.what_are_ips_text')}
                    </p>
                </div>
                <div className='p-6 bg-card/40 border border-border/50 rounded-2xl space-y-3'>
                    <div className='flex items-center gap-3 text-primary'>
                        <Star className='h-5 w-5' />
                        <h4 className='font-bold'>{t('admin.vdsNodes.ips.help.primary_ip')}</h4>
                    </div>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.vdsNodes.ips.help.primary_ip_text')}
                    </p>
                </div>
            </div>

            <Sheet open={createOpen} onOpenChange={(open) => !open && setCreateOpen(false)}>
                <SheetHeader>
                    <SheetTitle>{t('admin.vdsNodes.ips.create.title')}</SheetTitle>
                    <SheetDescription>{t('admin.vdsNodes.ips.create.description')}</SheetDescription>
                </SheetHeader>
                <div className='space-y-6 mt-8'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.vdsNodes.ips.col_ip')}</Label>
                        <Input
                            placeholder='192.168.1.100'
                            value={createForm.ip}
                            className='h-11 font-mono'
                            onChange={(e) => setCreateForm((p) => ({ ...p, ip: e.target.value }))}
                        />
                        {createErrors.ip && (
                            <p className='text-[10px] uppercase font-bold text-red-500'>{createErrors.ip}</p>
                        )}
                    </div>
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
                                <p className='text-[10px] uppercase font-bold text-red-500'>{createErrors.cidr}</p>
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
                                <p className='text-[10px] uppercase font-bold text-red-500'>{createErrors.gateway}</p>
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
                    <Button onClick={handleCreate} loading={creating}>
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
                <div className='space-y-6 mt-8'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.vdsNodes.ips.col_ip')}</Label>
                        <Input value={editForm.ip} disabled className='h-11 font-mono bg-muted/30' />
                        <p className='text-[10px] text-muted-foreground italic'>
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
                                <p className='text-[10px] uppercase font-bold text-red-500'>{editErrors.cidr}</p>
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
                                <p className='text-[10px] uppercase font-bold text-red-500'>{editErrors.gateway}</p>
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
