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

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
    Disc3,
    Download,
    Laptop,
    LifeBuoy,
    Loader2,
    MonitorSmartphone,
    Package,
    Server,
    Trash2,
    Upload,
    Wrench,
    type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import type { VdsFeatures } from '@/hooks/useVdsFeatures';

export type IsoCategory = 'linux' | 'windows' | 'bsd' | 'rescue' | 'tools' | 'other';

const CATEGORY_ICONS: Record<IsoCategory, LucideIcon> = {
    linux: Server,
    windows: Laptop,
    bsd: MonitorSmartphone,
    rescue: LifeBuoy,
    tools: Wrench,
    other: Package,
};

/** Small tinted icon for an ISO category (shared by the user dialog and the admin library). */
export function IsoCategoryIcon({ category, className }: { category: string; className?: string }) {
    const Icon = CATEGORY_ICONS[category as IsoCategory] ?? Disc3;
    return (
        <span
            className={cn(
                'bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                className,
            )}
        >
            <Icon className='h-4 w-4' />
        </span>
    );
}

export const formatIsoSize = (bytes: number) => {
    if (bytes <= 0) return '';
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
    return `${Math.max(0.1, bytes / 1024 ** 2).toFixed(1)} MB`;
};

interface ProviderIso {
    volid: string;
    name: string;
    file: string;
    storage: string;
    size: number;
    description: string | null;
    category: string;
}

interface UserIso {
    id: number;
    volid: string;
    name: string;
    size: number;
    source: 'upload' | 'url';
    status: 'pending' | 'ready' | 'failed';
    approval: 'approved' | 'pending' | 'rejected';
    error: string | null;
    mountable: boolean;
}

interface IsoList {
    isos: ProviderIso[];
    my_isos: UserIso[];
    user_isos: boolean;
    quota: { used: number; max: number };
}

interface VdsIsoDialogProps {
    vmId: number;
    features: VdsFeatures | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onMounted?: () => void;
}

const apiError = (err: unknown, fallback: string) =>
    (axios.isAxiosError(err) && (err.response?.data?.message as string | undefined)) || fallback;

/**
 * ISO picker for a VDS: provider ISOs, the user's own ISOs (upload / URL download into the
 * admin-configured storage, subject to size, quota, domain allowlist and approval) and mounting.
 */
export function VdsIsoDialog({ vmId, features, open, onOpenChange, onMounted }: VdsIsoDialogProps) {
    const { t } = useTranslation();
    const [list, setList] = useState<IsoList | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [addMode, setAddMode] = useState<'upload' | 'url' | null>(null);
    const [url, setUrl] = useState('');
    const [name, setName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<UserIso | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const iso = features?.iso;

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/user/vm-instances/${vmId}/isos`);
            setList(data?.data as IsoList);
        } catch (err) {
            setList({ isos: [], my_isos: [], user_isos: false, quota: { used: 0, max: 0 } });
            toast.error(apiError(err, t('vds.console.actions.iso_list_failed')));
        }
    }, [vmId, t]);

    useEffect(() => {
        if (!open) return;
        setList(null);
        setAddMode(null);
        void load();
    }, [open, load]);

    // Poll while a URL download is still running on the node.
    const hasPending = list?.my_isos.some((i) => i.status === 'pending') ?? false;
    useEffect(() => {
        if (!open || !hasPending) return;
        const timer = setInterval(() => void load(), 5000);
        return () => clearInterval(timer);
    }, [open, hasPending, load]);

    const mount = async (volid: string) => {
        setBusy(volid);
        try {
            await axios.post(`/api/user/vm-instances/${vmId}/iso-mount`, { volid });
            toast.success(t('vds.console.actions.iso_mounted'));
            onOpenChange(false);
            onMounted?.();
        } catch (err) {
            toast.error(apiError(err, t('vds.console.actions.iso_mount_failed')));
        } finally {
            setBusy(null);
        }
    };

    const resetForm = () => {
        setAddMode(null);
        setUrl('');
        setName('');
        setFile(null);
        setProgress(null);
    };

    const submit = async () => {
        if (!iso) return;
        setBusy('add');
        try {
            let message: string | undefined;
            if (addMode === 'upload') {
                if (!file) return;
                if (file.size > iso.max_size_mb * 1024 * 1024) {
                    toast.error(t('vds.iso.too_large', { max: String(iso.max_size_mb) }));
                    return;
                }
                const form = new FormData();
                form.append('file', file);
                if (name.trim()) form.append('name', name.trim());
                setProgress(0);
                const { data } = await axios.post(`/api/user/vm-instances/${vmId}/isos/upload`, form, {
                    onUploadProgress: (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100)),
                });
                message = data?.message;
            } else {
                const { data } = await axios.post(`/api/user/vm-instances/${vmId}/isos/url`, {
                    url: url.trim(),
                    name: name.trim() || undefined,
                });
                message = data?.message;
            }
            toast.success(message ?? t('vds.iso.added'));
            resetForm();
            await load();
        } catch (err) {
            toast.error(apiError(err, t('vds.iso.add_failed')));
        } finally {
            setBusy(null);
            setProgress(null);
        }
    };

    const remove = async () => {
        if (!deleteTarget) return;
        setBusy(`del-${deleteTarget.id}`);
        try {
            await axios.delete(`/api/user/vm-instances/${vmId}/isos/${deleteTarget.id}`);
            toast.success(t('vds.iso.deleted'));
            setDeleteTarget(null);
            await load();
        } catch (err) {
            toast.error(apiError(err, t('vds.iso.delete_failed')));
        } finally {
            setBusy(null);
        }
    };

    const canAdd = !!list?.user_isos && !!iso?.can_upload && (iso.upload_enabled || iso.url_enabled);
    const quotaFull = !!list && list.quota.used >= list.quota.max;

    const statusBadge = (u: UserIso) => {
        if (u.status === 'pending') return <Badge variant='secondary'>{t('vds.iso.status.downloading')}</Badge>;
        if (u.status === 'failed') return <Badge variant='destructive'>{t('vds.iso.status.failed')}</Badge>;
        if (u.approval === 'pending') return <Badge variant='secondary'>{t('vds.iso.status.awaiting_approval')}</Badge>;
        if (u.approval === 'rejected') return <Badge variant='destructive'>{t('vds.iso.status.rejected')}</Badge>;
        return <Badge variant='outline'>{t('vds.iso.status.ready')}</Badge>;
    };

    const row = (
        key: string,
        category: string,
        title: string,
        subtitle: string,
        actions: React.ReactNode,
        extra?: React.ReactNode,
    ) => (
        <div key={key} className='border-border/60 flex items-center gap-3 rounded-lg border px-3 py-2'>
            <IsoCategoryIcon category={category} />
            <div className='min-w-0 flex-1'>
                <div className='flex items-center gap-2'>
                    <p className='truncate text-sm font-medium'>{title}</p>
                    {extra}
                </div>
                <p className='text-muted-foreground truncate text-xs'>{subtitle}</p>
            </div>
            <div className='flex shrink-0 items-center gap-1.5'>{actions}</div>
        </div>
    );

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange} className='max-w-xl space-y-4'>
                <DialogHeader>
                    <DialogTitle>{t('vds.console.actions.iso_title')}</DialogTitle>
                    <DialogDescription>{t('vds.console.actions.iso_description')}</DialogDescription>
                </DialogHeader>
                {list === null ? (
                    <div className='flex justify-center py-8'>
                        <Loader2 className='text-muted-foreground h-5 w-5 animate-spin' />
                    </div>
                ) : (
                    <div className='max-h-[60vh] space-y-5 overflow-y-auto pr-1'>
                        <section className='space-y-1.5'>
                            <h4 className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
                                {t('vds.iso.provider_section')}
                            </h4>
                            {list.isos.length === 0 ? (
                                <p className='text-muted-foreground py-4 text-center text-sm'>
                                    {t('vds.console.actions.iso_empty')}
                                </p>
                            ) : (
                                list.isos.map((p) =>
                                    row(
                                        p.volid,
                                        p.category,
                                        p.name,
                                        [p.description || p.file, formatIsoSize(p.size)].filter(Boolean).join(' · '),
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            disabled={busy !== null}
                                            onClick={() => void mount(p.volid)}
                                        >
                                            {busy === p.volid && (
                                                <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                                            )}
                                            {t('vds.console.actions.iso_mount_one')}
                                        </Button>,
                                    ),
                                )
                            )}
                        </section>

                        {list.user_isos && (
                            <section className='space-y-1.5'>
                                <div className='flex items-center justify-between gap-2'>
                                    <h4 className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
                                        {t('vds.iso.my_section')}
                                    </h4>
                                    <span className='text-muted-foreground text-xs'>
                                        {t('vds.iso.quota', {
                                            used: String(list.quota.used),
                                            max: String(list.quota.max),
                                        })}
                                    </span>
                                </div>
                                {list.my_isos.length === 0 && (
                                    <p className='text-muted-foreground py-2 text-sm'>{t('vds.iso.my_empty')}</p>
                                )}
                                {list.my_isos.map((u) =>
                                    row(
                                        `u-${u.id}`,
                                        'other',
                                        u.name,
                                        u.error ||
                                            [
                                                t(u.source === 'url' ? 'vds.iso.source_url' : 'vds.iso.source_upload'),
                                                formatIsoSize(u.size),
                                            ]
                                                .filter(Boolean)
                                                .join(' · '),
                                        <>
                                            {u.mountable && (
                                                <Button
                                                    size='sm'
                                                    variant='outline'
                                                    disabled={busy !== null}
                                                    onClick={() => void mount(u.volid)}
                                                >
                                                    {busy === u.volid && (
                                                        <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                                                    )}
                                                    {t('vds.console.actions.iso_mount_one')}
                                                </Button>
                                            )}
                                            {iso?.can_upload && (
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    aria-label={t('vds.iso.delete')}
                                                    disabled={busy !== null}
                                                    onClick={() => setDeleteTarget(u)}
                                                >
                                                    <Trash2 className='h-3.5 w-3.5' />
                                                </Button>
                                            )}
                                        </>,
                                        statusBadge(u),
                                    ),
                                )}

                                {canAdd && addMode === null && (
                                    <div className='flex flex-wrap gap-2 pt-1'>
                                        {iso?.upload_enabled && (
                                            <Button
                                                size='sm'
                                                variant='outline'
                                                disabled={quotaFull}
                                                onClick={() => setAddMode('upload')}
                                            >
                                                <Upload className='mr-1.5 h-3.5 w-3.5' />
                                                {t('vds.iso.upload')}
                                            </Button>
                                        )}
                                        {iso?.url_enabled && (
                                            <Button
                                                size='sm'
                                                variant='outline'
                                                disabled={quotaFull}
                                                onClick={() => setAddMode('url')}
                                            >
                                                <Download className='mr-1.5 h-3.5 w-3.5' />
                                                {t('vds.iso.from_url')}
                                            </Button>
                                        )}
                                    </div>
                                )}
                                {canAdd && addMode !== null && iso && (
                                    <div className='border-border/60 bg-muted/30 space-y-3 rounded-lg border p-3'>
                                        {addMode === 'upload' ? (
                                            <div className='space-y-1.5'>
                                                <input
                                                    ref={fileRef}
                                                    type='file'
                                                    accept='.iso'
                                                    className='hidden'
                                                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                                />
                                                <Button
                                                    size='sm'
                                                    variant='outline'
                                                    onClick={() => fileRef.current?.click()}
                                                >
                                                    {file ? file.name : t('vds.iso.choose_file')}
                                                </Button>
                                            </div>
                                        ) : (
                                            <Input
                                                value={url}
                                                onChange={(e) => setUrl(e.target.value)}
                                                placeholder='https://example.org/os.iso'
                                            />
                                        )}
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder={t('vds.iso.name_placeholder')}
                                            maxLength={120}
                                        />
                                        <p className='text-muted-foreground text-xs'>
                                            {t('vds.iso.limits', { max: String(iso.max_size_mb) })}
                                            {addMode === 'url' && iso.url_domains.length > 0
                                                ? ` ${t('vds.iso.domains', { domains: iso.url_domains.join(', ') })}`
                                                : ''}
                                            {iso.require_approval ? ` ${t('vds.iso.approval_hint')}` : ''}
                                        </p>
                                        {progress !== null && (
                                            <div className='bg-muted h-1.5 overflow-hidden rounded-full'>
                                                <div
                                                    className='bg-primary h-full transition-all'
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        )}
                                        <div className='flex justify-end gap-2'>
                                            <Button
                                                size='sm'
                                                variant='ghost'
                                                onClick={resetForm}
                                                disabled={busy === 'add'}
                                            >
                                                {t('common.cancel')}
                                            </Button>
                                            <Button
                                                size='sm'
                                                onClick={() => void submit()}
                                                disabled={busy !== null || (addMode === 'upload' ? !file : !url.trim())}
                                            >
                                                {busy === 'add' && (
                                                    <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                                                )}
                                                {addMode === 'upload' ? t('vds.iso.upload') : t('vds.iso.download')}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                {list.user_isos && !iso?.can_upload && (
                                    <p className='text-muted-foreground text-xs'>{t('vds.iso.no_upload_permission')}</p>
                                )}
                            </section>
                        )}
                    </div>
                )}
            </Dialog>

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(o) => !o && setDeleteTarget(null)}
                title={t('vds.iso.delete')}
                description={t('vds.iso.delete_confirm', { name: deleteTarget?.name ?? '' })}
                confirmLabel={t('vds.iso.delete')}
                cancelLabel={t('common.cancel')}
                onConfirm={remove}
                loading={busy?.startsWith('del-') ?? false}
                destructive
            />
        </>
    );
}
