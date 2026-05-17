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

import { useEffect, useMemo, useState } from 'react';
import axios, { isAxiosError } from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Textarea } from '@/components/featherui/Textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Search as SearchIcon, Plus, Network } from 'lucide-react';
import { toast } from 'sonner';

export interface VmFreeIpOption {
    id: number;
    ip: string;
    cidr: number | null;
    gateway: string | null;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    nodeId: number;
    ips: VmFreeIpOption[];
    selectedIpId: number | null;
    onSelectIp: (ipId: number) => void;
    onIpCreated: (created: VmFreeIpOption) => void;
    onIpsCreated?: (created: VmFreeIpOption[]) => void;
    initialMode?: 'browse' | 'create';
}

export function VmIpPickerSheet({
    open,
    onOpenChange,
    nodeId,
    ips,
    selectedIpId,
    onSelectIp,
    onIpCreated,
    onIpsCreated,
    initialMode = 'browse',
}: Props) {
    const { t } = useTranslation();
    const [mode, setMode] = useState<'browse' | 'create'>('browse');
    useEffect(() => {
        if (open) setMode(initialMode);
    }, [open, initialMode]);

    const [search, setSearch] = useState('');
    const [creating, setCreating] = useState(false);
    const [createType, setCreateType] = useState<'single' | 'bulk'>('single');
    const [createForm, setCreateForm] = useState({ ip: '', cidr: '', gateway: '', notes: '' });
    const [bulkIpsInput, setBulkIpsInput] = useState('');
    const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

    const filtered = useMemo(
        () =>
            ips.filter((ip) => {
                const q = search.toLowerCase().trim();
                if (!q) return true;
                return ip.ip.toLowerCase().includes(q) || (ip.gateway || '').toLowerCase().includes(q);
            }),
        [ips, search],
    );

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

    const parseBulkIps = (input: string): string[] =>
        Array.from(
            new Set(
                input
                    .split(/[\n,\s]+/g)
                    .map((s) => s.trim())
                    .filter(Boolean),
            ),
        );

    const handleCreate = async () => {
        const errs = validateCreate();
        if (Object.keys(errs).length > 0) {
            setCreateErrors(errs);
            return;
        }
        setCreating(true);
        try {
            const { data } = await axios.put(`/api/admin/vm-nodes/${nodeId}/ips`, {
                ip: createForm.ip,
                cidr: createForm.cidr !== '' ? parseInt(createForm.cidr, 10) : null,
                gateway: createForm.gateway || null,
                notes: createForm.notes || null,
            });
            const ip = data?.data?.ip as VmFreeIpOption | undefined;
            if (!ip?.id) {
                toast.error(t('admin.vdsNodes.ips.add_failed'));
                return;
            }
            toast.success(t('admin.vdsNodes.ips.add_success'));
            onIpCreated(ip);
            setCreateForm({ ip: '', cidr: '', gateway: '', notes: '' });
            setCreateErrors({});
            setMode('browse');
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
        const entries = parseBulkIps(bulkIpsInput);
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
        const created: VmFreeIpOption[] = [];
        const failed: string[] = [];
        try {
            for (const ip of entries) {
                try {
                    const { data } = await axios.put(`/api/admin/vm-nodes/${nodeId}/ips`, {
                        ip,
                        cidr: createForm.cidr !== '' ? parseInt(createForm.cidr, 10) : null,
                        gateway: createForm.gateway || null,
                        notes: createForm.notes || null,
                    });
                    const item = data?.data?.ip as VmFreeIpOption | undefined;
                    if (item?.id) created.push(item);
                    else failed.push(ip);
                } catch {
                    failed.push(ip);
                }
            }
            if (created.length > 0) {
                if (onIpsCreated) onIpsCreated(created);
                else onIpCreated(created[0]);
                toast.success(`Created ${created.length} IP${created.length > 1 ? 's' : ''}.`);
                if (failed.length > 0) toast.warning(`Failed ${failed.length} IP${failed.length > 1 ? 's' : ''}.`);
                setBulkIpsInput('');
                setCreateForm({ ip: '', cidr: '', gateway: '', notes: '' });
                setCreateErrors({});
                setMode('browse');
            } else {
                toast.error(t('admin.vdsNodes.ips.add_failed'));
            }
        } finally {
            setCreating(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className='overflow-y-auto sm:max-w-2xl'>
                <SheetHeader>
                    <SheetTitle>{t('admin.vmInstances.primary_ip') || 'Primary IP'}</SheetTitle>
                    <SheetDescription>
                        {mode === 'browse'
                            ? t('admin.vmInstances.ip_help') || 'Pick a free IP from this node pool.'
                            : t('admin.vdsNodes.ips.create.description')}
                    </SheetDescription>
                </SheetHeader>
                <div className='mt-6 space-y-4'>
                    <div className='border-border/60 bg-muted/30 flex gap-1 rounded-xl border p-1'>
                        <button
                            type='button'
                            onClick={() => setMode('browse')}
                            className={cn(
                                'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                mode === 'browse'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <SearchIcon className='h-4 w-4' />
                            Existing
                        </button>
                        <button
                            type='button'
                            onClick={() => setMode('create')}
                            className={cn(
                                'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                mode === 'create'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Plus className='h-4 w-4' />
                            Create new
                        </button>
                    </div>

                    {mode === 'browse' ? (
                        <>
                            <div className='relative'>
                                <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                                <Input
                                    placeholder={t('common.search') || 'Search'}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className='pl-10'
                                />
                            </div>
                            <div className='max-h-[60vh] space-y-2 overflow-y-auto'>
                                {filtered.length === 0 ? (
                                    <p className='text-muted-foreground py-6 text-center'>{t('common.no_results')}</p>
                                ) : (
                                    filtered.map((ip) => (
                                        <button
                                            key={ip.id}
                                            type='button'
                                            onClick={() => {
                                                onSelectIp(ip.id);
                                                onOpenChange(false);
                                            }}
                                            className={cn(
                                                'w-full rounded-xl border p-3 text-left transition-all',
                                                selectedIpId === ip.id
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-border/50 hover:border-primary hover:bg-primary/5',
                                            )}
                                        >
                                            <div className='flex items-start gap-3'>
                                                <div className='bg-primary/10 mt-0.5 rounded-lg p-2'>
                                                    <Network className='text-primary h-4 w-4' />
                                                </div>
                                                <div>
                                                    <div className='font-mono font-semibold'>{ip.ip}</div>
                                                    <div className='text-muted-foreground font-mono text-xs'>
                                                        {ip.cidr !== null ? `/${ip.cidr}` : 'No CIDR'} ·{' '}
                                                        {ip.gateway || 'No gateway'}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <div className='space-y-6'>
                            <div className='bg-muted/50 flex gap-1 rounded-xl p-1'>
                                <Button
                                    type='button'
                                    variant='ghost'
                                    className={cn(
                                        'h-9 flex-1 rounded-lg text-xs',
                                        createType === 'single' && 'bg-background hover:bg-background shadow-sm',
                                    )}
                                    onClick={() => setCreateType('single')}
                                >
                                    {t('admin.vdsNodes.ips.single')}
                                </Button>
                                <Button
                                    type='button'
                                    variant='ghost'
                                    className={cn(
                                        'h-9 flex-1 rounded-lg text-xs',
                                        createType === 'bulk' && 'bg-background hover:bg-background shadow-sm',
                                    )}
                                    onClick={() => setCreateType('bulk')}
                                >
                                    {t('admin.vdsNodes.ips.bulk')}
                                </Button>
                            </div>
                            {createType === 'bulk' && (
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.vdsNodes.ips.bulk_list')}</Label>
                                    <Textarea
                                        placeholder={'10.0.0.10\n10.0.0.11\n10.0.0.12'}
                                        value={bulkIpsInput}
                                        className='min-h-30 font-mono'
                                        onChange={(e) => setBulkIpsInput(e.target.value)}
                                    />
                                    <p className='text-muted-foreground text-xs'>{t('admin.vdsNodes.ips.bulk_help')}</p>
                                </div>
                            )}
                            {createType === 'single' && (
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>{t('admin.vdsNodes.ips.col_ip')}</Label>
                                    <Input
                                        placeholder='192.168.1.100'
                                        value={createForm.ip}
                                        className='h-11 font-mono'
                                        onChange={(e) => setCreateForm((p) => ({ ...p, ip: e.target.value }))}
                                    />
                                    {createErrors.ip && (
                                        <p className='text-[10px] font-bold text-red-500 uppercase'>
                                            {createErrors.ip}
                                        </p>
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
                                        <p className='text-[10px] font-bold text-red-500 uppercase'>
                                            {createErrors.cidr}
                                        </p>
                                    )}
                                </div>
                                <div className='space-y-2'>
                                    <Label className='text-sm font-semibold'>
                                        {t('admin.vdsNodes.ips.col_gateway')}
                                    </Label>
                                    <Input
                                        placeholder='192.168.1.1'
                                        value={createForm.gateway}
                                        className='h-11 font-mono'
                                        onChange={(e) => setCreateForm((p) => ({ ...p, gateway: e.target.value }))}
                                    />
                                    {createErrors.gateway && (
                                        <p className='text-[10px] font-bold text-red-500 uppercase'>
                                            {createErrors.gateway}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className='space-y-2'>
                                <Label className='text-sm font-semibold'>{t('admin.vdsNodes.ips.col_notes')}</Label>
                                <Textarea
                                    placeholder={t('admin.vdsNodes.ips.notes_placeholder')}
                                    value={createForm.notes}
                                    className='min-h-25'
                                    onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))}
                                />
                            </div>
                            <div className='flex justify-end gap-2 pt-2'>
                                <Button type='button' variant='outline' onClick={() => setMode('browse')}>
                                    {t('common.cancel')}
                                </Button>
                                <Button
                                    type='button'
                                    onClick={() => void (createType === 'bulk' ? handleCreateBulk() : handleCreate())}
                                    loading={creating}
                                >
                                    <Plus className='mr-2 h-4 w-4' />
                                    {t('common.create')}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
