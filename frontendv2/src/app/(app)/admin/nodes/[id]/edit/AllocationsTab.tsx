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

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Label } from '@/components/ui/label';
import { HeadlessSelect } from '@/components/ui/headless-select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sheet, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { toast } from 'sonner';
import {
    Plus,
    Eye,
    Pencil,
    Trash2,
    Search,
    RefreshCw,
    Network,
    MapPin,
    Gamepad2,
    Shield,
    ChevronLeft,
    ChevronRight,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Allocation {
    id: number;
    ip: string;
    port: number;
    ip_alias: string | null;
    server_id: number | null;
    server_name: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

interface GamePreset {
    id: string;
    name: string;
    defaultPort: number;
}

const gamePresets: GamePreset[] = [
    { id: 'minecraft_java', name: 'Minecraft Java Edition', defaultPort: 25565 },
    { id: 'minecraft_bedrock', name: 'Minecraft Bedrock Edition', defaultPort: 19132 },
    { id: 'rust', name: 'Rust', defaultPort: 28015 },
    { id: 'csgo', name: 'CS:GO / Source', defaultPort: 27015 },
    { id: 'ark', name: 'ARK: Survival Evolved', defaultPort: 7777 },
    { id: 'ark_query', name: 'ARK: Survival Evolved (Query)', defaultPort: 27015 },
    { id: 'valheim', name: 'Valheim', defaultPort: 2456 },
    { id: 'terraria', name: 'Terraria', defaultPort: 7777 },
    { id: 'starbound', name: 'Starbound', defaultPort: 21025 },
    { id: '7dtd', name: '7 Days to Die', defaultPort: 26900 },
    { id: 'unturned', name: 'Unturned', defaultPort: 27015 },
    { id: 'gmod', name: "Garry's Mod", defaultPort: 27015 },
    { id: 'tf2', name: 'Team Fortress 2', defaultPort: 27015 },
    { id: 'satisfactory', name: 'Satisfactory', defaultPort: 15777 },
    { id: 'palworld', name: 'Palworld', defaultPort: 8211 },
];

interface AllocationsTabProps {
    nodeId: string | number;
    nodeName: string;
}

export function AllocationsTab({ nodeId, nodeName }: AllocationsTabProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [allocations, setAllocations] = useState<Allocation[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
    });

    const [nodeIPs, setNodeIPs] = useState<string[]>([]);
    const [isCheckingHealth, setIsCheckingHealth] = useState(false);

    const [, setNodeHealthStatus] = useState<'healthy' | 'unhealthy' | 'unknown'>('unknown');

    const [viewingAllocation, setViewingAllocation] = useState<Allocation | null>(null);
    const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
    const [editForm, setEditForm] = useState({ ip: '', port: '', ip_alias: '', notes: '' });
    const [creatingAllocation, setCreatingAllocation] = useState(false);
    const [createMode, setCreateMode] = useState<'manual' | 'preset'>('manual');
    const [createForm, setCreateForm] = useState({ ip: '', port: '', ip_alias: '', notes: '' });
    const [selectedGamePreset, setSelectedGamePreset] = useState('');
    const [presetPortCount, setPresetPortCount] = useState(100);
    const [includeDefaultPort, setIncludeDefaultPort] = useState(true);
    const [customIP, setCustomIP] = useState(false);
    const [editCustomIP, setEditCustomIP] = useState(false);

    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
    const [deleteUnusedConfirm, setDeleteUnusedConfirm] = useState(false);
    const [deleteUnusedIpFilter, setDeleteUnusedIpFilter] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const availableIPs = ['0.0.0.0', ...nodeIPs.filter((ip) => ip !== '0.0.0.0')];

    const fetchAllocations = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/admin/allocations', {
                params: {
                    node_id: nodeId,
                    search: searchQuery,
                    page: pagination.page,
                    limit: pagination.pageSize,
                },
            });
            setAllocations(data.data.allocations || []);
            const apiPagination = data.data.pagination;
            if (apiPagination) {
                setPagination({
                    page: apiPagination.current_page,
                    pageSize: apiPagination.per_page,
                    total: apiPagination.total_records,
                    totalPages: apiPagination.total_pages,
                    hasNext: apiPagination.has_next,
                    hasPrev: apiPagination.has_prev,
                });
            }
        } catch (error) {
            console.error('Error fetching allocations:', error);
            toast.error(t('admin.node.allocations.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [nodeId, searchQuery, pagination.page, pagination.pageSize, t]);

    const checkHealthAndIPs = useCallback(async () => {
        setIsCheckingHealth(true);
        try {
            const [healthRes, ipsRes] = await Promise.all([
                axios.get(`/api/wings/admin/node/${nodeId}/system`),
                axios.get(`/api/wings/admin/node/${nodeId}/ips`),
            ]);
            setNodeHealthStatus(healthRes.data.success ? 'healthy' : 'unhealthy');
            if (ipsRes.data.success) {
                setNodeIPs(ipsRes.data.data.ips.ip_addresses || []);
            }
        } catch (error) {
            console.error('Error checking health/IPs:', error);
            setNodeHealthStatus('unhealthy');
        } finally {
            setIsCheckingHealth(false);
        }
    }, [nodeId]);

    useEffect(() => {
        fetchAllocations();
        checkHealthAndIPs();
    }, [nodeId, fetchAllocations, checkHealthAndIPs]);

    const handleCreate = async () => {
        setSubmitting(true);
        try {
            let port = createForm.port;
            if (createMode === 'preset') {
                const preset = gamePresets.find((p) => p.id === selectedGamePreset);
                if (preset) {
                    const start = includeDefaultPort ? preset.defaultPort : preset.defaultPort + 1;
                    const end = start + presetPortCount - 1;
                    port = `${start}-${end}`;
                }
            }

            await axios.put('/api/admin/allocations', {
                ...createForm,
                node_id: nodeId,
                port,
            });
            toast.success(t('admin.node.allocations.messages.create_success'));
            setCreatingAllocation(false);
            fetchAllocations();
        } catch (error: unknown) {
            console.error('Error creating allocation:', error);
            const errorMessage = axios.isAxiosError(error)
                ? error.response?.data?.message
                : t('admin.node.allocations.messages.create_failed');
            toast.error(errorMessage || t('admin.node.allocations.messages.create_failed'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!editingAllocation) return;
        setSubmitting(true);
        try {
            await axios.patch(`/api/admin/allocations/${editingAllocation.id}`, editForm);
            toast.success(t('admin.node.allocations.messages.update_success'));
            setEditingAllocation(null);
            fetchAllocations();
        } catch (error: unknown) {
            console.error('Error updating allocation:', error);
            const errorMessage = axios.isAxiosError(error)
                ? error.response?.data?.message
                : t('admin.node.allocations.messages.update_failed');
            toast.error(errorMessage || t('admin.node.allocations.messages.update_failed'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await axios.delete(`/api/admin/allocations/${id}`);
            toast.success(t('admin.node.allocations.messages.delete_success'));
            fetchAllocations();
        } catch (error: unknown) {
            console.error('Error deleting allocation:', error);
            const errorMessage = axios.isAxiosError(error)
                ? error.response?.data?.message
                : t('admin.node.allocations.messages.delete_failed');
            toast.error(errorMessage || t('admin.node.allocations.messages.delete_failed'));
        } finally {
            setDeleteConfirmId(null);
        }
    };

    const handleBulkDelete = async () => {
        try {
            await axios.delete('/api/admin/allocations/bulk-delete', { data: { ids: selectedIds } });
            toast.success(t('admin.node.allocations.messages.bulk_delete_success'));
            setSelectedIds([]);
            fetchAllocations();
        } catch (error: unknown) {
            console.error('Error bulk deleting:', error);
            const errorMessage = axios.isAxiosError(error)
                ? error.response?.data?.message
                : t('admin.node.allocations.messages.bulk_delete_failed');
            toast.error(errorMessage || t('admin.node.allocations.messages.bulk_delete_failed'));
        } finally {
            setBulkDeleteConfirm(false);
        }
    };

    const handleDeleteUnused = async () => {
        try {
            await axios.delete('/api/admin/allocations/delete-unused', {
                data: { node_id: nodeId, ip: deleteUnusedIpFilter || undefined },
            });
            toast.success(t('admin.node.allocations.messages.delete_unused_success'));
            fetchAllocations();
        } catch (error: unknown) {
            console.error('Error deleting unused:', error);
            const errorMessage = axios.isAxiosError(error)
                ? error.response?.data?.message
                : t('admin.node.allocations.messages.delete_unused_failed');
            toast.error(errorMessage || t('admin.node.allocations.messages.delete_unused_failed'));
        } finally {
            setDeleteUnusedConfirm(false);
        }
    };

    const toggleSelection = (id: number) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    };

    return (
        <div className='space-y-6'>
            <PageCard
                title={t('admin.node.allocations.title')}
                icon={Network}
                description={t('admin.node.allocations.description', { name: nodeName })}
                action={
                    <div className='flex items-center gap-3'>
                        {isCheckingHealth && (
                            <div className='flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-lg text-xs text-muted-foreground animate-pulse'>
                                <div className='h-2 w-2 bg-blue-500 rounded-full' />
                                {t('admin.node.health.checking')}
                            </div>
                        )}
                        {selectedIds.length > 0 && (
                            <Button variant='destructive' size='sm' onClick={() => setBulkDeleteConfirm(true)}>
                                <Trash2 className='h-4 w-4 mr-2' />
                                {t('admin.node.allocations.delete_selected')} ({selectedIds.length})
                            </Button>
                        )}
                        <Button variant='outline' size='sm' onClick={() => setDeleteUnusedConfirm(true)}>
                            <Trash2 className='h-4 w-4 mr-2' />
                            {t('admin.node.allocations.delete_unused')}
                        </Button>
                        <Button size='sm' onClick={() => setCreatingAllocation(true)}>
                            <Plus className='h-4 w-4 mr-2' />
                            {t('admin.node.allocations.create_allocation')}
                        </Button>
                    </div>
                }
            >
                <div className='space-y-4'>
                    <div className='flex items-center gap-4'>
                        <div className='relative flex-1'>
                            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                            <Input
                                placeholder={t('admin.node.allocations.search_placeholder')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className='pl-10'
                            />
                        </div>
                        <Button variant='outline' size='icon' onClick={() => fetchAllocations()} loading={loading}>
                            <RefreshCw className='h-4 w-4' />
                        </Button>
                    </div>

                    <div className='rounded-xl border border-border/50 overflow-hidden'>
                        <table className='w-full text-sm'>
                            <thead className='bg-muted/30 border-b border-border/50'>
                                <tr>
                                    <th className='px-4 py-3 text-left w-10'>
                                        <input
                                            type='checkbox'
                                            className='rounded border-border bg-background'
                                            checked={
                                                allocations.length > 0 && selectedIds.length === allocations.length
                                            }
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedIds(allocations.map((a) => a.id));
                                                else setSelectedIds([]);
                                            }}
                                        />
                                    </th>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>ID</th>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                                        {t('admin.node.allocations.ip_address')}
                                    </th>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                                        {t('admin.node.allocations.port')}
                                    </th>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                                        {t('admin.node.allocations.ip_alias')}
                                    </th>
                                    <th className='px-4 py-3 text-left font-medium text-muted-foreground'>
                                        {t('admin.node.allocations.server')}
                                    </th>
                                    <th className='px-4 py-3 text-right font-medium text-muted-foreground'>
                                        {t('common.actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className='divide-y divide-border/50'>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className='px-4 py-8 text-center'>
                                            <Loader2 className='h-6 w-6 animate-spin mx-auto text-primary' />
                                        </td>
                                    </tr>
                                ) : allocations.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className='px-4 py-8 text-center text-muted-foreground italic'>
                                            {t('admin.node.allocations.no_results')}
                                        </td>
                                    </tr>
                                ) : (
                                    allocations.map((allocation) => (
                                        <tr key={allocation.id} className='hover:bg-muted/20 transition-colors'>
                                            <td className='px-4 py-3 text-left'>
                                                <input
                                                    type='checkbox'
                                                    className='rounded border-border bg-background'
                                                    checked={selectedIds.includes(allocation.id)}
                                                    onChange={() => toggleSelection(allocation.id)}
                                                />
                                            </td>
                                            <td className='px-4 py-3 font-mono text-xs'>{allocation.id}</td>
                                            <td className='px-4 py-3'>
                                                <div className='flex items-center gap-2'>
                                                    <span className='font-mono'>{allocation.ip}</span>
                                                    {allocation.server_id ? (
                                                        <span className='px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase rounded-full border border-green-500/20'>
                                                            {t('admin.node.allocations.assigned')}
                                                        </span>
                                                    ) : (
                                                        <span className='px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-bold uppercase rounded-full'>
                                                            {t('admin.node.allocations.available')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className='px-4 py-3 font-mono'>{allocation.port}</td>
                                            <td className='px-4 py-3 text-muted-foreground truncate max-w-[150px]'>
                                                {allocation.ip_alias || '-'}
                                            </td>
                                            <td className='px-4 py-3'>
                                                {allocation.server_id ? (
                                                    <span className='text-primary font-medium'>
                                                        {allocation.server_name || allocation.server_id}
                                                    </span>
                                                ) : (
                                                    <span className='text-muted-foreground'>-</span>
                                                )}
                                            </td>
                                            <td className='px-4 py-3 text-right'>
                                                <div className='flex items-center justify-end gap-1'>
                                                    <Button
                                                        variant='ghost'
                                                        size='sm'
                                                        onClick={() => setViewingAllocation(allocation)}
                                                        title={t('admin.node.allocations.view_details')}
                                                    >
                                                        <Eye className='h-4 w-4' />
                                                    </Button>
                                                    <Button
                                                        variant='ghost'
                                                        size='sm'
                                                        onClick={() => {
                                                            setEditingAllocation(allocation);
                                                            setEditForm({
                                                                ip: allocation.ip,
                                                                port: allocation.port.toString(),
                                                                ip_alias: allocation.ip_alias || '',
                                                                notes: allocation.notes || '',
                                                            });
                                                            setEditCustomIP(!availableIPs.includes(allocation.ip));
                                                        }}
                                                        title={t('admin.node.allocations.edit_allocation')}
                                                    >
                                                        <Pencil className='h-4 w-4' />
                                                    </Button>
                                                    {deleteConfirmId === allocation.id ? (
                                                        <div className='flex items-center gap-1'>
                                                            <Button
                                                                variant='destructive'
                                                                size='sm'
                                                                onClick={() => handleDelete(allocation.id)}
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
                                                            onClick={() => setDeleteConfirmId(allocation.id)}
                                                            title={t('admin.node.allocations.delete_allocation')}
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
                                    from: String((pagination.page - 1) * pagination.pageSize + 1),
                                    to: String(Math.min(pagination.page * pagination.pageSize, pagination.total)),
                                    total: String(pagination.total),
                                })}
                            </p>
                            <div className='flex items-center gap-2'>
                                <Button
                                    variant='outline'
                                    size='icon'
                                    disabled={!pagination.hasPrev}
                                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                                >
                                    <ChevronLeft className='h-4 w-4' />
                                </Button>
                                <span className='text-xs font-medium px-2'>
                                    {pagination.page} / {pagination.totalPages}
                                </span>
                                <Button
                                    variant='outline'
                                    size='icon'
                                    disabled={!pagination.hasNext}
                                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                                >
                                    <ChevronRight className='h-4 w-4' />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </PageCard>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8'>
                <div className='p-6 bg-card/40 border border-border/50 rounded-2xl space-y-3'>
                    <div className='flex items-center gap-3 text-primary'>
                        <Network className='h-5 w-5' />
                        <h4 className='font-bold'>{t('admin.node.allocations.help.what_are_allocations')}</h4>
                    </div>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.node.allocations.help.what_are_allocations_text')}
                    </p>
                </div>
                <div className='p-6 bg-card/40 border border-border/50 rounded-2xl space-y-3'>
                    <div className='flex items-center gap-3 text-primary'>
                        <MapPin className='h-5 w-5' />
                        <h4 className='font-bold'>{t('admin.node.allocations.help.what_you_will_need')}</h4>
                    </div>
                    <ul className='text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1'>
                        <li>{t('admin.node.allocations.help.what_you_will_need_ip')}</li>
                        <li>{t('admin.node.allocations.help.what_you_will_need_port')}</li>
                        <li>{t('admin.node.allocations.help.what_you_will_need_alias')}</li>
                        <li>{t('admin.node.allocations.help.what_you_will_need_notes')}</li>
                    </ul>
                </div>
                <div className='p-6 bg-card/40 border border-border/50 rounded-2xl space-y-3'>
                    <div className='flex items-center gap-3 text-primary'>
                        <Gamepad2 className='h-5 w-5' />
                        <h4 className='font-bold'>{t('admin.node.allocations.help.popular_game_ranges')}</h4>
                    </div>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.node.allocations.help.recommendation')}
                    </p>
                </div>
                <div className='p-6 bg-card/40 border border-border/50 rounded-2xl space-y-3 md:col-span-2 lg:col-span-3'>
                    <div className='flex items-center gap-3 text-primary'>
                        <Shield className='h-5 w-5' />
                        <h4 className='font-bold'>{t('admin.node.allocations.help.protocols_and_firewall')}</h4>
                    </div>
                    <p className='text-sm text-muted-foreground leading-relaxed'>
                        {t('admin.node.allocations.help.protocols_and_firewall_text')}
                    </p>
                </div>
            </div>

            <Sheet open={!!viewingAllocation} onOpenChange={(open) => !open && setViewingAllocation(null)}>
                <SheetHeader>
                    <SheetTitle>{t('common.details')}</SheetTitle>
                    <SheetDescription>
                        {viewingAllocation && `${viewingAllocation.ip}:${viewingAllocation.port}`}
                    </SheetDescription>
                </SheetHeader>
                {viewingAllocation && (
                    <div className='space-y-6 mt-8'>
                        <div className='grid grid-cols-2 gap-x-4 gap-y-6'>
                            <div className='space-y-1'>
                                <Label className='text-xs text-muted-foreground uppercase tracking-wider font-bold'>
                                    {t('admin.node.allocations.ip_address')}
                                </Label>
                                <p className='font-mono bg-muted/30 px-3 py-2 rounded-lg border border-border/50'>
                                    {viewingAllocation.ip}
                                </p>
                            </div>
                            <div className='space-y-1'>
                                <Label className='text-xs text-muted-foreground uppercase tracking-wider font-bold'>
                                    {t('admin.node.allocations.port')}
                                </Label>
                                <p className='font-mono bg-muted/30 px-3 py-2 rounded-lg border border-border/50'>
                                    {viewingAllocation.port}
                                </p>
                            </div>
                            <div className='space-y-1 col-span-2'>
                                <Label className='text-xs text-muted-foreground uppercase tracking-wider font-bold'>
                                    {t('admin.node.allocations.ip_alias')}
                                </Label>
                                <p className='bg-muted/30 px-3 py-2 rounded-lg border border-border/50'>
                                    {viewingAllocation.ip_alias || '-'}
                                </p>
                            </div>
                            <div className='space-y-1 col-span-2'>
                                <Label className='text-xs text-muted-foreground uppercase tracking-wider font-bold'>
                                    {t('admin.node.allocations.server')}
                                </Label>
                                <p className='bg-muted/30 px-3 py-2 rounded-lg border border-border/50 font-medium text-primary'>
                                    {viewingAllocation.server_name ||
                                        (viewingAllocation.server_id ? `ID: ${viewingAllocation.server_id}` : '-')}
                                </p>
                            </div>
                            <div className='space-y-1 col-span-2'>
                                <Label className='text-xs text-muted-foreground uppercase tracking-wider font-bold'>
                                    {t('admin.node.allocations.notes')}
                                </Label>
                                <p className='bg-muted/30 px-3 py-2 rounded-lg border border-border/50 min-h-[100px]'>
                                    {viewingAllocation.notes || '-'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                <SheetFooter>
                    <Button variant='outline' className='w-full' onClick={() => setViewingAllocation(null)}>
                        {t('common.close')}
                    </Button>
                </SheetFooter>
            </Sheet>

            <Sheet open={!!editingAllocation} onOpenChange={(open) => !open && setEditingAllocation(null)}>
                <SheetHeader>
                    <SheetTitle>{t('admin.node.allocations.edit.title')}</SheetTitle>
                    <SheetDescription>
                        {editingAllocation &&
                            t('admin.node.allocations.edit.description', {
                                ip: editingAllocation.ip,
                                port: String(editingAllocation.port),
                            })}
                    </SheetDescription>
                </SheetHeader>
                <div className='space-y-6 mt-8'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.node.allocations.ip_address')}</Label>
                        {!editCustomIP ? (
                            <div className='flex gap-2'>
                                <HeadlessSelect
                                    value={editForm.ip}
                                    onChange={(val) => setEditForm((prev) => ({ ...prev, ip: String(val) }))}
                                    options={availableIPs.map((ip) => ({ id: ip, name: ip }))}
                                    className='flex-1'
                                />
                                <Button
                                    variant='outline'
                                    size='icon'
                                    className='h-11 w-11 shrink-0'
                                    onClick={() => setEditCustomIP(true)}
                                >
                                    <Plus className='h-4 w-4' />
                                </Button>
                            </div>
                        ) : (
                            <div className='flex gap-2'>
                                <Input
                                    placeholder='0.0.0.0'
                                    value={editForm.ip}
                                    className='h-11'
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, ip: e.target.value }))}
                                />
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='shrink-0'
                                    onClick={() => setEditCustomIP(false)}
                                >
                                    {t('admin.node.allocations.create.manual')}
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.node.allocations.port')}</Label>
                        <Input
                            type='number'
                            value={editForm.port}
                            className='h-11 font-mono'
                            onChange={(e) => setEditForm((prev) => ({ ...prev, port: e.target.value }))}
                        />
                    </div>

                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.node.allocations.ip_alias')}</Label>
                        <Input
                            placeholder='domain.com'
                            value={editForm.ip_alias}
                            className='h-11 font-mono'
                            onChange={(e) => setEditForm((prev) => ({ ...prev, ip_alias: e.target.value }))}
                        />
                    </div>

                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.node.allocations.notes')}</Label>
                        <Textarea
                            placeholder='Notes...'
                            value={editForm.notes}
                            className='min-h-[120px]'
                            onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                        />
                    </div>
                </div>
                <SheetFooter>
                    <Button variant='outline' onClick={() => setEditingAllocation(null)}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleEdit} loading={submitting}>
                        {t('common.save')}
                    </Button>
                </SheetFooter>
            </Sheet>

            <Sheet open={creatingAllocation} onOpenChange={(open) => !open && setCreatingAllocation(false)}>
                <SheetHeader>
                    <SheetTitle>{t('admin.node.allocations.create.title')}</SheetTitle>
                    <SheetDescription>{t('admin.node.allocations.create.description')}</SheetDescription>
                </SheetHeader>
                <div className='space-y-6 mt-8'>
                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.node.allocations.create.mode')}</Label>
                        <div className='flex p-1 bg-muted/50 rounded-xl gap-1'>
                            <Button
                                variant='ghost'
                                className={cn(
                                    'flex-1 rounded-lg h-9 text-xs',
                                    createMode === 'manual' && 'bg-background shadow-sm hover:bg-background',
                                )}
                                onClick={() => setCreateMode('manual')}
                            >
                                {t('admin.node.allocations.create.manual')}
                            </Button>
                            <Button
                                variant='ghost'
                                className={cn(
                                    'flex-1 rounded-lg h-9 text-xs',
                                    createMode === 'preset' && 'bg-background shadow-sm hover:bg-background',
                                )}
                                onClick={() => setCreateMode('preset')}
                            >
                                {t('admin.node.allocations.create.preset')}
                            </Button>
                        </div>
                    </div>

                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.node.allocations.ip_address')}</Label>
                        {!customIP ? (
                            <div className='flex gap-2'>
                                <HeadlessSelect
                                    value={createForm.ip}
                                    onChange={(val) => setCreateForm((prev) => ({ ...prev, ip: String(val) }))}
                                    options={availableIPs.map((ip) => ({ id: ip, name: ip }))}
                                    className='flex-1'
                                />
                                <Button
                                    variant='outline'
                                    size='icon'
                                    className='h-11 w-11 shrink-0'
                                    onClick={() => setCustomIP(true)}
                                >
                                    <Plus className='h-4 w-4' />
                                </Button>
                            </div>
                        ) : (
                            <div className='flex gap-2'>
                                <Input
                                    placeholder='0.0.0.0'
                                    value={createForm.ip}
                                    className='h-11 font-mono'
                                    onChange={(e) => setCreateForm((prev) => ({ ...prev, ip: e.target.value }))}
                                />
                                <Button
                                    variant='outline'
                                    size='sm'
                                    className='shrink-0'
                                    onClick={() => setCustomIP(false)}
                                >
                                    Dropdown
                                </Button>
                            </div>
                        )}
                    </div>

                    {createMode === 'preset' ? (
                        <div className='space-y-6'>
                            <div className='space-y-2'>
                                <Label className='text-sm font-semibold'>
                                    {t('admin.node.allocations.create.game_preset')}
                                </Label>
                                <HeadlessSelect
                                    value={selectedGamePreset}
                                    onChange={(val) => setSelectedGamePreset(String(val))}
                                    options={gamePresets.map((preset) => ({
                                        id: preset.id,
                                        name: `${preset.name} (Default: ${preset.defaultPort})`,
                                    }))}
                                />
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-sm font-semibold'>
                                    {t('admin.node.allocations.create.port_count')}
                                </Label>
                                <Input
                                    type='number'
                                    value={presetPortCount}
                                    className='h-11'
                                    min={1}
                                    max={1000}
                                    onChange={(e) => setPresetPortCount(Number(e.target.value))}
                                />
                            </div>
                            <div className='flex items-center gap-2 p-4 bg-muted/30 rounded-2xl border border-border/50'>
                                <input
                                    type='checkbox'
                                    id='includeDefault'
                                    className='rounded border-border bg-background h-4 w-4 text-primary'
                                    checked={includeDefaultPort}
                                    onChange={(e) => setIncludeDefaultPort(e.target.checked)}
                                />
                                <Label htmlFor='includeDefault' className='flex-1 cursor-pointer'>
                                    <span className='block text-sm font-medium'>
                                        {t('admin.node.allocations.create.include_default')}
                                    </span>
                                    {selectedGamePreset && (
                                        <span className='block text-[10px] text-muted-foreground mt-0.5 uppercase font-bold tracking-wider'>
                                            {includeDefaultPort
                                                ? t('admin.node.allocations.create.include_default_help', {
                                                      port: String(
                                                          gamePresets.find((p) => p.id === selectedGamePreset)
                                                              ?.defaultPort,
                                                      ),
                                                  })
                                                : t('admin.node.allocations.create.exclude_default_help', {
                                                      port: String(
                                                          (gamePresets.find((p) => p.id === selectedGamePreset)
                                                              ?.defaultPort || 0) + 1,
                                                      ),
                                                      default: String(
                                                          gamePresets.find((p) => p.id === selectedGamePreset)
                                                              ?.defaultPort,
                                                      ),
                                                  })}
                                        </span>
                                    )}
                                </Label>
                            </div>
                        </div>
                    ) : (
                        <div className='space-y-2'>
                            <Label className='text-sm font-semibold'>{t('admin.node.allocations.port')}</Label>
                            <Input
                                placeholder='25565 or 25565-25700'
                                value={createForm.port}
                                className='h-11 font-mono'
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, port: e.target.value }))}
                            />
                            <p className='text-[10px] text-muted-foreground italic'>
                                {t('admin.node.allocations.create.port_range_help')}
                            </p>
                        </div>
                    )}

                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.node.allocations.ip_alias')}</Label>
                        <Input
                            placeholder='domain.com'
                            value={createForm.ip_alias}
                            className='h-11 font-mono'
                            onChange={(e) => setCreateForm((prev) => ({ ...prev, ip_alias: e.target.value }))}
                        />
                    </div>

                    <div className='space-y-2'>
                        <Label className='text-sm font-semibold'>{t('admin.node.allocations.notes')}</Label>
                        <Textarea
                            placeholder='Notes...'
                            value={createForm.notes}
                            className='min-h-[100px]'
                            onChange={(e) => setCreateForm((prev) => ({ ...prev, notes: e.target.value }))}
                        />
                    </div>
                </div>
                <SheetFooter>
                    <Button variant='outline' onClick={() => setCreatingAllocation(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={handleCreate} loading={submitting}>
                        {t('common.create')}
                    </Button>
                </SheetFooter>
            </Sheet>

            <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin.node.allocations.confirm_bulk_delete_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('admin.node.allocations.confirm_bulk_delete_description', {
                                count: String(selectedIds.length),
                            })}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setBulkDeleteConfirm(false)}>
                            {t('common.cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                            onClick={handleBulkDelete}
                        >
                            {t('common.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={deleteUnusedConfirm} onOpenChange={setDeleteUnusedConfirm}>
                <AlertDialogContent className='max-w-lg'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin.node.allocations.confirm_delete_unused_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('admin.node.allocations.confirm_delete_unused_description')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className='py-6 space-y-2'>
                        <Label className='text-sm font-semibold'>
                            {t('admin.node.allocations.delete_unused_ip_filter')}
                        </Label>
                        <Input
                            placeholder='0.0.0.0'
                            value={deleteUnusedIpFilter}
                            className='h-11 font-mono'
                            onChange={(e) => setDeleteUnusedIpFilter(e.target.value)}
                        />
                        <p className='text-[10px] text-muted-foreground italic leading-relaxed'>
                            {t('admin.node.allocations.delete_unused_ip_help')}
                        </p>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeleteUnusedConfirm(false)}>
                            {t('common.cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                            onClick={handleDeleteUnused}
                        >
                            {t('admin.node.allocations.delete_unused')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
