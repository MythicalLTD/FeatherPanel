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

import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Disc3, HardDrive, Loader2, Network } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage, getApiErrorMessageFromPayload } from '@/lib/api-errors';
import { cn } from '@/lib/utils';

export interface BootDevice {
    id: string;
    type: 'disk' | 'cdrom' | 'net' | string;
    label: string;
    enabled: boolean;
}

interface BootOrderPayload {
    order: string[];
    devices: BootDevice[];
}

interface VdsBootOrderCardProps {
    vmId: number;
    canEdit: boolean;
    /** Bump to reload after ISO mount/unmount changes available devices. */
    refreshKey?: number;
}

function typeIcon(type: string) {
    if (type === 'cdrom') return Disc3;
    if (type === 'net') return Network;
    return HardDrive;
}

/**
 * Reorder and enable/disable Proxmox QEMU boot devices (disk / CD-ROM / NIC).
 */
export function VdsBootOrderCard({ vmId, canEdit, refreshKey = 0 }: VdsBootOrderCardProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [devices, setDevices] = useState<BootDevice[]>([]);
    const [order, setOrder] = useState<string[]>([]);
    const [baseline, setBaseline] = useState('');

    const applyPayload = useCallback((data: BootOrderPayload) => {
        const list = data.devices ?? [];
        const nextOrder = (data.order ?? []).filter((id) => list.some((d) => d.id === id));
        setDevices(list);
        setOrder(nextOrder);
        setBaseline(JSON.stringify(nextOrder));
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/user/vm-instances/${vmId}/boot-order`);
            if (data?.success) {
                applyPayload(data.data as BootOrderPayload);
            }
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'vds.boot.order.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [vmId, t, applyPayload]);

    useEffect(() => {
        void load();
    }, [load, refreshKey]);

    const dirty = useMemo(() => JSON.stringify(order) !== baseline, [order, baseline]);

    const move = (id: string, dir: -1 | 1) => {
        setOrder((prev) => {
            const idx = prev.indexOf(id);
            if (idx < 0) return prev;
            const next = idx + dir;
            if (next < 0 || next >= prev.length) return prev;
            const copy = [...prev];
            const [item] = copy.splice(idx, 1);
            copy.splice(next, 0, item);
            return copy;
        });
    };

    const toggle = (id: string, enabled: boolean) => {
        setOrder((prev) => {
            if (enabled) {
                return prev.includes(id) ? prev : [...prev, id];
            }
            return prev.filter((x) => x !== id);
        });
    };

    const save = async () => {
        if (order.length === 0) {
            toast.error(t('vds.boot.order.at_least_one'));
            return;
        }
        setSaving(true);
        try {
            const { data } = await axios.put(`/api/user/vm-instances/${vmId}/boot-order`, { order });
            if (!data?.success) {
                toast.error(getApiErrorMessageFromPayload(data, t, 'vds.boot.order.save_failed'));
                return;
            }
            applyPayload(data.data as BootOrderPayload);
            toast.success(t('vds.boot.order.saved'));
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'vds.boot.order.save_failed'));
        } finally {
            setSaving(false);
        }
    };

    const orderedEnabled = order.map((id) => devices.find((d) => d.id === id)).filter((d): d is BootDevice => !!d);
    const disabled = devices.filter((d) => !order.includes(d.id));

    return (
        <Card>
            <CardHeader>
                <CardTitle className='text-base font-semibold tracking-tight'>{t('vds.boot.order.title')}</CardTitle>
                <CardDescription className='text-muted-foreground'>{t('vds.boot.order.description')}</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
                {loading ? (
                    <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        {t('vds.boot.order.loading')}
                    </div>
                ) : devices.length === 0 ? (
                    <p className='text-muted-foreground text-sm'>{t('vds.boot.order.empty')}</p>
                ) : (
                    <>
                        <div className='space-y-1.5'>
                            {orderedEnabled.map((d, i) => {
                                const Icon = typeIcon(d.type);
                                return (
                                    <div
                                        key={d.id}
                                        className='border-border/60 flex items-center gap-3 rounded-lg border px-3 py-2'
                                    >
                                        <Checkbox
                                            checked
                                            disabled={!canEdit || saving}
                                            onCheckedChange={(v) => toggle(d.id, v)}
                                            aria-label={t('vds.boot.order.enable')}
                                        />
                                        <span className='bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg'>
                                            <Icon className='h-4 w-4' />
                                        </span>
                                        <div className='min-w-0 flex-1'>
                                            <p className='truncate text-sm font-medium'>
                                                <span className='text-muted-foreground mr-2 font-mono text-xs'>
                                                    {i + 1}.
                                                </span>
                                                {d.label}
                                            </p>
                                            <p className='text-muted-foreground font-mono text-xs'>{d.id}</p>
                                        </div>
                                        {canEdit && (
                                            <div className='flex shrink-0 gap-0.5'>
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    disabled={saving || i === 0}
                                                    onClick={() => move(d.id, -1)}
                                                    aria-label={t('vds.boot.order.move_up')}
                                                >
                                                    <ArrowUp className='h-3.5 w-3.5' />
                                                </Button>
                                                <Button
                                                    size='sm'
                                                    variant='ghost'
                                                    disabled={saving || i === orderedEnabled.length - 1}
                                                    onClick={() => move(d.id, 1)}
                                                    aria-label={t('vds.boot.order.move_down')}
                                                >
                                                    <ArrowDown className='h-3.5 w-3.5' />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {disabled.map((d) => {
                                const Icon = typeIcon(d.type);
                                return (
                                    <div
                                        key={d.id}
                                        className={cn(
                                            'border-border/40 flex items-center gap-3 rounded-lg border border-dashed px-3 py-2 opacity-70',
                                        )}
                                    >
                                        <Checkbox
                                            checked={false}
                                            disabled={!canEdit || saving}
                                            onCheckedChange={(v) => toggle(d.id, v)}
                                            aria-label={t('vds.boot.order.enable')}
                                        />
                                        <span className='bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg'>
                                            <Icon className='h-4 w-4' />
                                        </span>
                                        <div className='min-w-0 flex-1'>
                                            <p className='truncate text-sm font-medium'>{d.label}</p>
                                            <p className='text-muted-foreground font-mono text-xs'>
                                                {d.id} · {t('vds.boot.order.disabled')}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className='text-muted-foreground text-xs'>{t('vds.boot.order.apply_hint')}</p>
                        {canEdit && (
                            <div className='flex justify-end gap-2'>
                                <Button
                                    size='sm'
                                    variant='ghost'
                                    disabled={!dirty || saving}
                                    onClick={() => void load()}
                                >
                                    {t('common.cancel')}
                                </Button>
                                <Button size='sm' disabled={!dirty || saving} onClick={() => void save()}>
                                    {saving && <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />}
                                    {t('vds.boot.order.apply')}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
