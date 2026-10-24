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
import { Check, Disc3, Eye, EyeOff, Loader2, Pencil, Plus, RefreshCw, ScanSearch, Trash2, X } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { ListEmptyState } from '@/components/featherui/ListEmptyState';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IsoCategoryIcon, formatIsoSize } from '@/components/vds/VdsIsoDialog';
import { getApiErrorMessage } from '@/lib/api-errors';
import { cn } from '@/lib/utils';

interface LibraryIso {
    id: number;
    kind: 'provider' | 'user';
    vm_node_id: number | null;
    node_name: string | null;
    pve_node: string | null;
    volid: string;
    file: string;
    name: string;
    description: string | null;
    category: string;
    visible: boolean;
    sort_order: number;
    owner: { id: number; username: string | null; uuid: string | null } | null;
    vm_hostname: string | null;
    source: 'library' | 'upload' | 'url';
    source_url: string | null;
    size: number;
    status: 'pending' | 'ready' | 'failed';
    approval: 'approved' | 'pending' | 'rejected';
    error: string | null;
    created_at: string;
}

interface ScannedFile {
    volid: string;
    name: string;
    size: number;
    pve_node: string;
    registered: boolean;
    user_file: boolean;
    category: string;
}

interface VmNodeOption {
    id: number;
    name: string;
}

interface IsoForm {
    id?: number;
    volid: string;
    name: string;
    description: string;
    category: string;
    vm_node_id: string;
    visible: boolean;
    sort_order: number;
}

const EMPTY_FORM: IsoForm = {
    volid: '',
    name: '',
    description: '',
    category: 'linux',
    vm_node_id: '',
    visible: true,
    sort_order: 0,
};
const selectClass = 'border-input bg-muted/30 h-10 w-full rounded-xl border px-3 text-sm';

export default function AdminVdsIsosPage() {
    const { t } = useTranslation();
    const [tab, setTab] = useState<'provider' | 'user'>('provider');
    const [approvalFilter, setApprovalFilter] = useState('');
    const [isos, setIsos] = useState<LibraryIso[] | null>(null);
    const [pending, setPending] = useState(0);
    const [categories, setCategories] = useState<string[]>([]);
    const [userStorage, setUserStorage] = useState('');
    const [nodes, setNodes] = useState<VmNodeOption[]>([]);
    const [form, setForm] = useState<IsoForm | null>(null);
    const [saving, setSaving] = useState(false);
    const [scanNode, setScanNode] = useState('');
    const [scan, setScan] = useState<ScannedFile[] | null>(null);
    const [scanning, setScanning] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<LibraryIso | null>(null);

    const load = useCallback(async () => {
        setIsos(null);
        try {
            const { data } = await axios.get('/api/admin/vm-isos', {
                params: { kind: tab, approval: tab === 'user' ? approvalFilter || undefined : undefined },
            });
            setIsos(data.data.isos as LibraryIso[]);
            setPending(data.data.pending_count as number);
            setCategories(data.data.categories as string[]);
            setUserStorage((data.data.user_storage as string) ?? '');
        } catch (err) {
            setIsos([]);
            toast.error(getApiErrorMessage(err, t, 'admin.vdsIsos.load_failed'));
        }
    }, [tab, approvalFilter, t]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        axios
            .get('/api/admin/vm-nodes', { params: { page: 1, limit: 100 } })
            .then(({ data }) => {
                const list = (data?.data?.vm_nodes ?? []) as VmNodeOption[];
                setNodes(list);
                if (list[0]) setScanNode(String(list[0].id));
            })
            .catch(() => setNodes([]));
    }, []);

    const runScan = async () => {
        if (!scanNode) return;
        setScanning(true);
        try {
            const { data } = await axios.get('/api/admin/vm-isos/scan', { params: { vm_node_id: scanNode } });
            setScan(data.data.files as ScannedFile[]);
        } catch (err) {
            setScan([]);
            toast.error(getApiErrorMessage(err, t, 'admin.vdsIsos.scan_failed'));
        } finally {
            setScanning(false);
        }
    };

    const save = async () => {
        if (!form) return;
        setSaving(true);
        const payload = {
            volid: form.volid.trim(),
            name: form.name.trim(),
            description: form.description.trim(),
            category: form.category,
            vm_node_id: form.vm_node_id === '' ? null : Number(form.vm_node_id),
            visible: form.visible,
            sort_order: form.sort_order,
        };
        try {
            if (form.id) await axios.patch(`/api/admin/vm-isos/${form.id}`, payload);
            else await axios.post('/api/admin/vm-isos', payload);
            toast.success(t('admin.vdsIsos.saved'));
            setForm(null);
            setScan((s) => s?.map((f) => (f.volid === payload.volid ? { ...f, registered: true } : f)) ?? null);
            await load();
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.vdsIsos.save_failed'));
        } finally {
            setSaving(false);
        }
    };

    const act = async (iso: LibraryIso, action: 'approve' | 'reject' | 'toggle') => {
        setBusy(`${action}-${iso.id}`);
        try {
            if (action === 'toggle') await axios.patch(`/api/admin/vm-isos/${iso.id}`, { visible: !iso.visible });
            else await axios.post(`/api/admin/vm-isos/${iso.id}/${action}`);
            if (action === 'approve') toast.success(t('admin.vdsIsos.approved'));
            else if (action === 'reject') toast.success(t('admin.vdsIsos.rejected'));
            else toast.success(t('admin.vdsIsos.toggled'));
            await load();
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.vdsIsos.action_failed'));
        } finally {
            setBusy(null);
        }
    };

    const remove = async () => {
        if (!deleteTarget) return;
        setBusy(`delete-${deleteTarget.id}`);
        try {
            await axios.delete(`/api/admin/vm-isos/${deleteTarget.id}`);
            toast.success(t('admin.vdsIsos.deleted'));
            setDeleteTarget(null);
            await load();
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.vdsIsos.action_failed'));
        } finally {
            setBusy(null);
        }
    };

    const editIso = (iso: LibraryIso) =>
        setForm({
            id: iso.id,
            volid: iso.volid,
            name: iso.name,
            description: iso.description ?? '',
            category: iso.category,
            vm_node_id: iso.vm_node_id === null ? '' : String(iso.vm_node_id),
            visible: iso.visible,
            sort_order: iso.sort_order,
        });

    const userBadge = (iso: LibraryIso) => {
        if (iso.status === 'pending') return <Badge variant='secondary'>{t('vds.iso.status.downloading')}</Badge>;
        if (iso.status === 'failed') return <Badge variant='destructive'>{t('vds.iso.status.failed')}</Badge>;
        if (iso.approval === 'pending')
            return <Badge variant='secondary'>{t('vds.iso.status.awaiting_approval')}</Badge>;
        if (iso.approval === 'rejected') return <Badge variant='destructive'>{t('vds.iso.status.rejected')}</Badge>;
        return <Badge variant='outline'>{t('vds.iso.status.ready')}</Badge>;
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.vdsIsos.title')}
                description={t('admin.vdsIsos.description')}
                icon={Disc3}
                actions={
                    <div className='flex items-center gap-2'>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => void load()}
                            aria-label={t('common.refresh')}
                        >
                            <RefreshCw className='h-4 w-4' />
                        </Button>
                        {tab === 'provider' && (
                            <Button onClick={() => setForm({ ...EMPTY_FORM })}>
                                <Plus className='mr-2 h-4 w-4' />
                                {t('admin.vdsIsos.add')}
                            </Button>
                        )}
                    </div>
                }
            />

            <div className='fp-surface flex flex-wrap items-center gap-2 rounded-xl border p-2'>
                {(['provider', 'user'] as const).map((k) => (
                    <button
                        key={k}
                        type='button'
                        onClick={() => setTab(k)}
                        className={cn(
                            'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                            tab === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                        )}
                    >
                        {t(`admin.vdsIsos.tabs.${k}`)}
                        {k === 'user' && pending > 0 && (
                            <span className='rounded-full bg-amber-500 px-1.5 text-[11px] text-white'>{pending}</span>
                        )}
                    </button>
                ))}
                {tab === 'user' && (
                    <select
                        className={cn(selectClass, 'ml-auto h-9 w-auto')}
                        value={approvalFilter}
                        onChange={(e) => setApprovalFilter(e.target.value)}
                        aria-label={t('admin.vdsIsos.filter_approval')}
                    >
                        <option value=''>{t('admin.vdsIsos.filter_all')}</option>
                        {['pending', 'approved', 'rejected'].map((a) => (
                            <option key={a} value={a}>
                                {t(`admin.vdsIsos.approval.${a}`)}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {tab === 'provider' && (
                <div className='fp-surface space-y-3 rounded-xl border p-4'>
                    <div className='flex flex-wrap items-end gap-3'>
                        <div className='min-w-48 flex-1 space-y-1.5'>
                            <Label>{t('admin.vdsIsos.scan_node')}</Label>
                            <select
                                className={selectClass}
                                value={scanNode}
                                onChange={(e) => setScanNode(e.target.value)}
                            >
                                {nodes.map((n) => (
                                    <option key={n.id} value={n.id}>
                                        {n.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Button variant='outline' onClick={() => void runScan()} disabled={!scanNode || scanning}>
                            {scanning ? (
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            ) : (
                                <ScanSearch className='mr-2 h-4 w-4' />
                            )}
                            {t('admin.vdsIsos.scan')}
                        </Button>
                    </div>
                    <p className='text-muted-foreground text-xs'>{t('admin.vdsIsos.scan_help')}</p>
                    {scan !== null &&
                        (scan.length === 0 ? (
                            <p className='text-muted-foreground text-sm'>{t('admin.vdsIsos.scan_empty')}</p>
                        ) : (
                            <div className='grid gap-2 sm:grid-cols-2'>
                                {scan
                                    .filter((f) => !f.user_file)
                                    .map((f) => (
                                        <div
                                            key={f.volid}
                                            className='border-border/60 flex items-center gap-3 rounded-lg border px-3 py-2'
                                        >
                                            <IsoCategoryIcon category={f.category} />
                                            <div className='min-w-0 flex-1'>
                                                <p className='truncate text-sm font-medium'>{f.name}</p>
                                                <p className='text-muted-foreground truncate text-xs'>
                                                    {[f.volid, f.pve_node, formatIsoSize(f.size)]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </p>
                                            </div>
                                            {f.registered ? (
                                                <Badge variant='outline'>{t('admin.vdsIsos.in_library')}</Badge>
                                            ) : (
                                                <Button
                                                    size='sm'
                                                    variant='outline'
                                                    onClick={() =>
                                                        setForm({
                                                            ...EMPTY_FORM,
                                                            volid: f.volid,
                                                            name: f.name.replace(/\.iso$/i, ''),
                                                            category: f.category,
                                                        })
                                                    }
                                                >
                                                    <Plus className='mr-1 h-3.5 w-3.5' />
                                                    {t('admin.vdsIsos.add_short')}
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                            </div>
                        ))}
                </div>
            )}

            {tab === 'user' && (
                <p className='text-muted-foreground text-sm'>
                    {userStorage
                        ? t('admin.vdsIsos.user_storage', { storage: userStorage })
                        : t('admin.vdsIsos.user_storage_missing')}
                </p>
            )}

            {isos === null ? (
                <TableSkeleton count={4} />
            ) : isos.length === 0 ? (
                <ListEmptyState
                    icon={Disc3}
                    title={t(tab === 'provider' ? 'admin.vdsIsos.empty_provider' : 'admin.vdsIsos.empty_user')}
                    description={t(
                        tab === 'provider' ? 'admin.vdsIsos.empty_provider_help' : 'admin.vdsIsos.empty_user_help',
                    )}
                />
            ) : (
                <div className='space-y-2'>
                    {isos.map((iso) => (
                        <div
                            key={iso.id}
                            className={cn(
                                'fp-surface flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3',
                                iso.kind === 'provider' && !iso.visible && 'opacity-60',
                            )}
                        >
                            <IsoCategoryIcon category={iso.category} className='h-10 w-10' />
                            <div className='min-w-0 flex-1'>
                                <div className='flex flex-wrap items-center gap-2'>
                                    <p className='truncate font-medium'>{iso.name}</p>
                                    {iso.kind === 'provider' ? (
                                        <>
                                            <Badge variant='outline'>
                                                {t(`admin.vdsIsos.categories.${iso.category}`)}
                                            </Badge>
                                            <Badge variant='secondary'>
                                                {iso.vm_node_id === null
                                                    ? t('admin.vdsIsos.all_nodes')
                                                    : (iso.node_name ?? `#${iso.vm_node_id}`)}
                                            </Badge>
                                            {!iso.visible && (
                                                <Badge variant='destructive'>{t('admin.vdsIsos.hidden')}</Badge>
                                            )}
                                        </>
                                    ) : (
                                        userBadge(iso)
                                    )}
                                </div>
                                <p className='text-muted-foreground truncate text-xs'>
                                    {iso.kind === 'provider'
                                        ? [iso.description, iso.volid].filter(Boolean).join(' · ')
                                        : [
                                              iso.owner?.username ?? '—',
                                              iso.vm_hostname,
                                              iso.source === 'url' ? iso.source_url : t('vds.iso.source_upload'),
                                              formatIsoSize(iso.size),
                                              iso.error,
                                          ]
                                              .filter(Boolean)
                                              .join(' · ')}
                                </p>
                            </div>
                            <div className='flex items-center gap-1.5'>
                                {iso.kind === 'user' && iso.approval !== 'approved' && iso.status !== 'failed' && (
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        disabled={busy !== null || iso.approval === 'rejected'}
                                        onClick={() => void act(iso, 'approve')}
                                    >
                                        <Check className='mr-1 h-3.5 w-3.5' />
                                        {t('admin.vdsIsos.approve')}
                                    </Button>
                                )}
                                {iso.kind === 'user' && iso.approval === 'pending' && (
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        disabled={busy !== null}
                                        onClick={() => void act(iso, 'reject')}
                                    >
                                        <X className='mr-1 h-3.5 w-3.5' />
                                        {t('admin.vdsIsos.reject')}
                                    </Button>
                                )}
                                {iso.kind === 'provider' && (
                                    <Button
                                        size='sm'
                                        variant='ghost'
                                        disabled={busy !== null}
                                        aria-label={iso.visible ? t('admin.vdsIsos.hide') : t('admin.vdsIsos.show')}
                                        onClick={() => void act(iso, 'toggle')}
                                    >
                                        {iso.visible ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
                                    </Button>
                                )}
                                <Button
                                    size='sm'
                                    variant='ghost'
                                    aria-label={t('admin.vdsIsos.edit')}
                                    onClick={() => editIso(iso)}
                                >
                                    <Pencil className='h-4 w-4' />
                                </Button>
                                <Button
                                    size='sm'
                                    variant='ghost'
                                    aria-label={t('admin.vdsIsos.delete')}
                                    disabled={busy !== null}
                                    onClick={() => setDeleteTarget(iso)}
                                >
                                    <Trash2 className='h-4 w-4' />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)} className='max-w-lg space-y-4'>
                <DialogHeader>
                    <DialogTitle>{form?.id ? t('admin.vdsIsos.edit') : t('admin.vdsIsos.add')}</DialogTitle>
                    <DialogDescription>{t('admin.vdsIsos.form_help')}</DialogDescription>
                </DialogHeader>
                {form && (
                    <div className='space-y-3'>
                        <div className='space-y-1.5'>
                            <Label>{t('admin.vdsIsos.fields.volid')}</Label>
                            <Input
                                value={form.volid}
                                disabled={!!form.id && tab === 'user'}
                                placeholder='local:iso/debian-12.iso'
                                onChange={(e) => setForm({ ...form, volid: e.target.value })}
                            />
                        </div>
                        <div className='space-y-1.5'>
                            <Label>{t('admin.vdsIsos.fields.name')}</Label>
                            <Input
                                value={form.name}
                                maxLength={120}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                        <div className='space-y-1.5'>
                            <Label>{t('admin.vdsIsos.fields.description')}</Label>
                            <Textarea
                                value={form.description}
                                maxLength={500}
                                rows={2}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </div>
                        <div className='grid gap-3 sm:grid-cols-2'>
                            <div className='space-y-1.5'>
                                <Label>{t('admin.vdsIsos.fields.category')}</Label>
                                <select
                                    className={selectClass}
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                >
                                    {categories.map((c) => (
                                        <option key={c} value={c}>
                                            {t(`admin.vdsIsos.categories.${c}`)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {tab === 'provider' && (
                                <div className='space-y-1.5'>
                                    <Label>{t('admin.vdsIsos.fields.node')}</Label>
                                    <select
                                        className={selectClass}
                                        value={form.vm_node_id}
                                        onChange={(e) => setForm({ ...form, vm_node_id: e.target.value })}
                                    >
                                        <option value=''>{t('admin.vdsIsos.all_nodes')}</option>
                                        {nodes.map((n) => (
                                            <option key={n.id} value={n.id}>
                                                {n.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        {tab === 'provider' && (
                            <div className='grid items-end gap-3 sm:grid-cols-2'>
                                <div className='space-y-1.5'>
                                    <Label>{t('admin.vdsIsos.fields.sort_order')}</Label>
                                    <Input
                                        type='number'
                                        min={0}
                                        value={form.sort_order}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                sort_order: Math.max(0, parseInt(e.target.value, 10) || 0),
                                            })
                                        }
                                    />
                                </div>
                                <label className='flex h-10 items-center gap-3 text-sm'>
                                    <Switch
                                        checked={form.visible}
                                        onCheckedChange={(v) => setForm({ ...form, visible: v })}
                                    />
                                    {t('admin.vdsIsos.fields.visible')}
                                </label>
                            </div>
                        )}
                    </div>
                )}
                <DialogFooter>
                    <Button variant='ghost' onClick={() => setForm(null)}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={() => void save()} disabled={saving || !form?.name.trim() || !form?.volid.trim()}>
                        {saving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                        {t('common.save')}
                    </Button>
                </DialogFooter>
            </Dialog>

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(o) => !o && setDeleteTarget(null)}
                title={t('admin.vdsIsos.delete')}
                description={
                    deleteTarget?.kind === 'user'
                        ? t('admin.vdsIsos.delete_user_confirm', { name: deleteTarget.name })
                        : t('admin.vdsIsos.delete_provider_confirm', { name: deleteTarget?.name ?? '' })
                }
                confirmLabel={t('admin.vdsIsos.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={remove}
                loading={busy?.startsWith('delete-') ?? false}
                destructive
            />
        </div>
    );
}
