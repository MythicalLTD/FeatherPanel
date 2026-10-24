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

import { VdsUsagePill } from '@/components/vds/VdsUsagePill';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import { Camera, Calendar, Loader2, MemoryStick, Plus, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { useVmInstance } from '@/contexts/VmInstanceContext';
import { formatDateTimeInTz } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-errors';
import { isReauthCancelled, useVdsReauth } from '@/components/vds/VdsReauth';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { EmptyState } from '@/components/featherui/EmptyState';
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { VdsPageHeader } from '@/components/vds/VdsPageHeader';
import { VdsPageLoading } from '@/components/vds/VdsPageLoading';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useVdsFeatures } from '@/hooks/useVdsFeatures';

interface Snapshot {
    name: string;
    description: string;
    snaptime: number | null;
    vmstate: boolean;
    parent: string | null;
}

const NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{1,39}$/;

export default function VdsSnapshotsPage() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { t } = useTranslation();
    const withReauth = useVdsReauth();
    const dateOpts = useDateFormatOptions();
    const { instance, loading: instanceLoading, hasPermission } = useVmInstance();
    const features = useVdsFeatures(instance?.id);

    const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
    const [limit, setLimit] = useState(0);
    const [ramAllowed, setRamAllowed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [includeRam, setIncludeRam] = useState(false);
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState<{ snapshot: Snapshot; action: 'rollback' | 'delete' } | null>(null);

    const fetchSnapshots = useCallback(
        async (quiet = false) => {
            if (!id) return;
            if (!quiet) setLoading(true);
            try {
                const { data } = await axios.get(`/api/user/vm-instances/${id}/snapshots`);
                setSnapshots(data.data.snapshots ?? []);
                setLimit(data.data.limit ?? 0);
                setRamAllowed(Boolean(data.data.include_ram_allowed));
                setLoadError(false);
            } catch (err) {
                setLoadError(true);
                if (!quiet) toast.error(getApiErrorMessage(err, t, 'vds.snapshots.fetch_failed'));
            } finally {
                if (!quiet) setLoading(false);
            }
        },
        [id, t],
    );

    useEffect(() => {
        if (!instanceLoading && !instance) {
            router.push('/dashboard');
            return;
        }
        if (!instanceLoading && instance) void fetchSnapshots();
    }, [instanceLoading, instance, fetchSnapshots, router]);

    const refreshSoon = () => {
        // Proxmox runs snapshot jobs as tasks; re-read after they had time to finish.
        setTimeout(() => void fetchSnapshots(true), 3000);
        setTimeout(() => void fetchSnapshots(true), 10000);
    };

    const create = async () => {
        setBusy(true);
        try {
            await axios.post(`/api/user/vm-instances/${id}/snapshots`, {
                name,
                description,
                include_ram: includeRam,
            });
            toast.success(t('vds.snapshots.create_started'));
            setCreateOpen(false);
            setName('');
            setDescription('');
            setIncludeRam(false);
            refreshSoon();
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'vds.snapshots.create_failed'));
        } finally {
            setBusy(false);
        }
    };

    const runConfirm = async () => {
        if (!confirm) return;
        setBusy(true);
        const { snapshot, action } = confirm;
        const name = encodeURIComponent(snapshot.name);
        try {
            if (action === 'rollback') {
                await withReauth((headers) =>
                    axios.post(`/api/user/vm-instances/${id}/snapshots/${name}/rollback`, {}, { headers }),
                );
            } else {
                await axios.delete(`/api/user/vm-instances/${id}/snapshots/${name}`);
            }
            toast.success(t(`vds.snapshots.${action}_started`));
            setConfirm(null);
            refreshSoon();
        } catch (err) {
            if (isReauthCancelled(err)) return;
            toast.error(getApiErrorMessage(err, t, `vds.snapshots.${action}_failed`));
        } finally {
            setBusy(false);
        }
    };

    if (instanceLoading || (loading && snapshots.length === 0 && !loadError)) {
        return <VdsPageLoading label={t('common.loading')} />;
    }

    const disabled = features !== null && !features.snapshots.enabled;
    const canManage = hasPermission('snapshot');
    const limitReached = snapshots.length >= limit;
    const nameValid = NAME_PATTERN.test(name);
    const latestName = snapshots.reduce<{ name: string; time: number } | null>(
        (best, s) => ((s.snaptime ?? 0) > (best?.time ?? -1) ? { name: s.name, time: s.snaptime ?? 0 } : best),
        null,
    )?.name;

    return (
        <div className='space-y-6 pb-12'>
            <VdsPageHeader
                title={t('vds.snapshots.title')}
                description={
                    <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
                        <span>{t('vds.snapshots.description')}</span>
                        {!disabled && <VdsUsagePill used={snapshots.length} max={limit} />}
                    </div>
                }
                actions={
                    <div className='flex items-center gap-2'>
                        <Button
                            variant='outline'
                            onClick={() => void fetchSnapshots()}
                            disabled={loading}
                            aria-label={t('navigation.items.refresh')}
                        >
                            <RefreshCw className={cn('h-4 w-4 sm:mr-2', loading && 'animate-spin')} />
                            <span className='hidden sm:inline'>{t('navigation.items.refresh')}</span>
                        </Button>
                        <Button onClick={() => setCreateOpen(true)} disabled={disabled || !canManage || limitReached}>
                            <Plus className='mr-2 h-4 w-4' />
                            {t('vds.snapshots.create')}
                        </Button>
                    </div>
                }
            />

            {limitReached && limit > 0 && (
                <div className='rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-300'>
                    {t('vds.snapshots.limit_reached', { limit: String(limit) })}
                </div>
            )}

            {disabled ? (
                <EmptyState
                    icon={Camera}
                    title={t('vds.snapshots.disabled_title')}
                    description={t('vds.snapshots.disabled_description')}
                />
            ) : snapshots.length === 0 ? (
                <EmptyState
                    icon={Camera}
                    title={loadError ? t('vds.snapshots.fetch_failed') : t('vds.snapshots.empty_title')}
                    description={
                        loadError
                            ? t('vds.snapshots.fetch_failed_description')
                            : limit === 0
                              ? t('vds.snapshots.empty_no_quota')
                              : t('vds.snapshots.empty_description')
                    }
                />
            ) : (
                <div className='grid grid-cols-1 gap-3'>
                    {snapshots.map((snap) => (
                        <ResourceCard
                            key={snap.name}
                            icon={Camera}
                            title={snap.name}
                            description={
                                <div className='text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1 text-sm'>
                                    <span className='flex items-center gap-1.5'>
                                        <Calendar className='h-4 w-4 opacity-60' />
                                        {snap.snaptime ? formatDateTimeInTz(snap.snaptime, dateOpts) : '-'}
                                    </span>
                                    {snap.description && <span className='truncate'>{snap.description}</span>}
                                </div>
                            }
                            badges={
                                snap.vmstate || snap.name === latestName ? (
                                    <span className='flex items-center gap-1.5'>
                                        {snap.name === latestName && (
                                            <span className='rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400'>
                                                {t('vds.snapshots.latest')}
                                            </span>
                                        )}
                                        {snap.vmstate ? (
                                            <span className='bg-primary/10 text-primary flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium'>
                                                <MemoryStick className='h-3 w-3' />
                                                {t('vds.snapshots.with_ram')}
                                            </span>
                                        ) : null}
                                    </span>
                                ) : undefined
                            }
                            actions={
                                <div className='flex items-center gap-2'>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        disabled={!canManage}
                                        onClick={() => setConfirm({ snapshot: snap, action: 'rollback' })}
                                    >
                                        <RotateCcw className='mr-1.5 h-4 w-4' />
                                        {t('vds.snapshots.rollback')}
                                    </Button>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        disabled={!canManage}
                                        className='text-red-500 hover:bg-red-500/10'
                                        onClick={() => setConfirm({ snapshot: snap, action: 'delete' })}
                                        aria-label={t('vds.snapshots.delete')}
                                    >
                                        <Trash2 className='h-4 w-4' />
                                    </Button>
                                </div>
                            }
                        />
                    ))}
                </div>
            )}

            <Dialog open={createOpen} onOpenChange={(o) => !busy && setCreateOpen(o)} className='max-w-md space-y-4'>
                <DialogHeader>
                    <DialogTitle>{t('vds.snapshots.create')}</DialogTitle>
                    <DialogDescription>{t('vds.snapshots.create_description')}</DialogDescription>
                </DialogHeader>
                <div className='space-y-3'>
                    <div className='space-y-1.5'>
                        <label className='text-sm font-medium' htmlFor='snap-name'>
                            {t('vds.snapshots.name')}
                        </label>
                        <Input
                            id='snap-name'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder='before-upgrade'
                            maxLength={40}
                        />
                        {name && !nameValid && (
                            <p className='text-xs text-red-500'>{t('vds.snapshots.name_invalid')}</p>
                        )}
                    </div>
                    <div className='space-y-1.5'>
                        <label className='text-sm font-medium' htmlFor='snap-desc'>
                            {t('vds.snapshots.note')}
                        </label>
                        <Input
                            id='snap-desc'
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            maxLength={255}
                        />
                    </div>
                    {ramAllowed && (
                        <label className='flex items-start gap-2 text-sm'>
                            <Checkbox checked={includeRam} onCheckedChange={(v) => setIncludeRam(Boolean(v))} />
                            <span>
                                {t('vds.snapshots.include_ram')}
                                <span className='text-muted-foreground block text-xs'>
                                    {t('vds.snapshots.include_ram_hint')}
                                </span>
                            </span>
                        </label>
                    )}
                </div>
                <DialogFooter>
                    <Button variant='outline' onClick={() => setCreateOpen(false)} disabled={busy}>
                        {t('common.cancel')}
                    </Button>
                    <Button onClick={() => void create()} disabled={busy || !nameValid}>
                        {busy && <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />}
                        {t('vds.snapshots.create')}
                    </Button>
                </DialogFooter>
            </Dialog>

            <ConfirmDialog
                open={confirm !== null}
                onOpenChange={(o) => !o && setConfirm(null)}
                title={
                    confirm?.action === 'rollback'
                        ? t('vds.snapshots.rollback_title', { name: confirm.snapshot.name })
                        : t('vds.snapshots.delete_title', { name: confirm?.snapshot.name ?? '' })
                }
                description={
                    confirm?.action === 'rollback'
                        ? t('vds.snapshots.rollback_confirm')
                        : t('vds.snapshots.delete_confirm')
                }
                confirmLabel={confirm?.action === 'rollback' ? t('vds.snapshots.rollback') : t('vds.snapshots.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={runConfirm}
                loading={busy}
                destructive
            />
        </div>
    );
}
