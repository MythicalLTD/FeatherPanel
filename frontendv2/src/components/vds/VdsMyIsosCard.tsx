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
import { Download, Loader2, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useTranslation } from '@/contexts/TranslationContext';
import type { VdsFeatures } from '@/hooks/useVdsFeatures';
import {
    apiIsoError,
    formatIsoSize,
    type IsoList,
    type UserIso,
} from '@/components/vds/VdsIsoDialog';

interface VdsMyIsosCardProps {
    vmId: number;
    features: VdsFeatures | null;
    canSettings: boolean;
    onMounted?: () => void;
}

/**
 * Manage user-supplied ISOs for a VDS: upload from the browser or ask the Proxmox node to
 * download a URL. Mounting host library images stays in the Mount ISO dialog.
 */
export function VdsMyIsosCard({ vmId, features, canSettings, onMounted }: VdsMyIsosCardProps) {
    const { t } = useTranslation();
    const iso = features?.iso;
    const [list, setList] = useState<IsoList | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [addMode, setAddMode] = useState<'upload' | 'url' | null>(null);
    const [url, setUrl] = useState('');
    const [name, setName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<UserIso | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/user/vm-instances/${vmId}/isos`);
            setList(data?.data as IsoList);
        } catch (err) {
            setList({ isos: [], my_isos: [], user_isos: false, quota: { used: 0, max: 0 } });
            toast.error(apiIsoError(err, t('vds.console.actions.iso_list_failed')));
        }
    }, [vmId, t]);

    useEffect(() => {
        void load();
    }, [load]);

    const hasPending = list?.my_isos.some((i) => i.status === 'pending') ?? false;
    useEffect(() => {
        if (!hasPending) return;
        const timer = setInterval(() => void load(), 5000);
        return () => clearInterval(timer);
    }, [hasPending, load]);

    const resetForm = () => {
        setAddMode(null);
        setUrl('');
        setName('');
        setFile(null);
        setProgress(null);
    };

    const mount = async (volid: string) => {
        setBusy(volid);
        try {
            await axios.post(`/api/user/vm-instances/${vmId}/iso-mount`, { volid });
            toast.success(t('vds.console.actions.iso_mounted'));
            onMounted?.();
        } catch (err) {
            toast.error(apiIsoError(err, t('vds.console.actions.iso_mount_failed')));
        } finally {
            setBusy(null);
        }
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
            toast.error(apiIsoError(err, t('vds.iso.add_failed')));
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
            toast.error(apiIsoError(err, t('vds.iso.delete_failed')));
        } finally {
            setBusy(null);
        }
    };

    const statusBadge = (u: UserIso) => {
        if (u.status === 'pending') return <Badge variant='secondary'>{t('vds.iso.status.downloading')}</Badge>;
        if (u.status === 'failed') return <Badge variant='destructive'>{t('vds.iso.status.failed')}</Badge>;
        if (u.approval === 'pending') return <Badge variant='secondary'>{t('vds.iso.status.awaiting_approval')}</Badge>;
        if (u.approval === 'rejected') return <Badge variant='destructive'>{t('vds.iso.status.rejected')}</Badge>;
        return <Badge variant='outline'>{t('vds.iso.status.ready')}</Badge>;
    };

    const userIsosOn = !!iso?.user_isos;
    const canAdd =
        canSettings && userIsosOn && !!iso?.can_upload && (iso.upload_enabled || iso.url_enabled);
    const quotaFull = !!list && list.quota.max > 0 && list.quota.used >= list.quota.max;

    let guideKey: string | null = null;
    if (!userIsosOn) {
        guideKey =
            iso?.user_isos_blocker === 'storage'
                ? 'vds.iso.guide_disabled_storage'
                : iso?.user_isos_blocker === 'mode'
                  ? 'vds.iso.guide_disabled_mode'
                  : 'vds.iso.guide_disabled';
    } else if (!iso?.can_upload) {
        guideKey = 'vds.iso.no_upload_permission';
    } else if (!iso.upload_enabled && !iso.url_enabled) {
        guideKey = 'vds.iso.guide_methods_off';
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className='flex items-center justify-between gap-2 text-base font-semibold tracking-tight'>
                        <span>{t('vds.iso.my_section')}</span>
                        {userIsosOn && list && (
                            <span className='text-muted-foreground text-xs font-normal'>
                                {t('vds.iso.quota', {
                                    used: String(list.quota.used),
                                    max: String(list.quota.max),
                                })}
                            </span>
                        )}
                    </CardTitle>
                    <CardDescription className='text-muted-foreground'>
                        {t('vds.iso.my_description')}
                    </CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                    {list === null ? (
                        <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            {t('vds.settings.iso.loading')}
                        </div>
                    ) : guideKey ? (
                        <p className='text-muted-foreground text-sm'>{t(guideKey)}</p>
                    ) : (
                        <>
                            {list.my_isos.length === 0 && (
                                <p className='text-muted-foreground text-sm'>{t('vds.iso.my_empty')}</p>
                            )}
                            <div className='space-y-1.5'>
                                {list.my_isos.map((u) => (
                                    <div
                                        key={u.id}
                                        className='border-border/60 flex items-center gap-3 rounded-lg border px-3 py-2'
                                    >
                                        <div className='min-w-0 flex-1'>
                                            <div className='flex items-center gap-2'>
                                                <p className='truncate text-sm font-medium'>{u.name}</p>
                                                {statusBadge(u)}
                                            </div>
                                            <p className='text-muted-foreground truncate text-xs'>
                                                {u.error ||
                                                    [
                                                        t(
                                                            u.source === 'url'
                                                                ? 'vds.iso.source_url'
                                                                : 'vds.iso.source_upload',
                                                        ),
                                                        formatIsoSize(u.size),
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                            </p>
                                        </div>
                                        <div className='flex shrink-0 items-center gap-1.5'>
                                            {u.mountable && (
                                                <Button
                                                    size='sm'
                                                    variant='outline'
                                                    disabled={busy !== null || !canSettings}
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
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {canAdd && addMode === null && (
                                <div className='flex flex-wrap gap-2'>
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
                                            disabled={
                                                busy !== null || (addMode === 'upload' ? !file : !url.trim())
                                            }
                                        >
                                            {busy === 'add' && (
                                                <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                                            )}
                                            {addMode === 'upload' ? t('vds.iso.upload') : t('vds.iso.download')}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

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
