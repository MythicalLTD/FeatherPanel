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
import {
    Disc3,
    Laptop,
    LifeBuoy,
    Loader2,
    MonitorSmartphone,
    Package,
    Server,
    Wrench,
    type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

export interface ProviderIso {
    volid: string;
    name: string;
    file: string;
    storage: string;
    size: number;
    description: string | null;
    category: string;
}

export interface UserIso {
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

export interface IsoList {
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

export const apiIsoError = (err: unknown, fallback: string) =>
    (axios.isAxiosError(err) && (err.response?.data?.message as string | undefined)) || fallback;

/**
 * Host ISO picker for a VDS: curated provider library only. User uploads / URL downloads live on
 * the VDS Settings → My ISOs card.
 */
export function VdsIsoDialog({ vmId, open, onOpenChange, onMounted }: VdsIsoDialogProps) {
    const { t } = useTranslation();
    const [list, setList] = useState<ProviderIso[] | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/user/vm-instances/${vmId}/isos`);
            setList((data?.data as IsoList | undefined)?.isos ?? []);
        } catch (err) {
            setList([]);
            toast.error(apiIsoError(err, t('vds.console.actions.iso_list_failed')));
        }
    }, [vmId, t]);

    useEffect(() => {
        if (!open) return;
        setList(null);
        void load();
    }, [open, load]);

    const mount = async (volid: string) => {
        setBusy(volid);
        try {
            await axios.post(`/api/user/vm-instances/${vmId}/iso-mount`, { volid });
            toast.success(t('vds.console.actions.iso_mounted'));
            onOpenChange(false);
            onMounted?.();
        } catch (err) {
            toast.error(apiIsoError(err, t('vds.console.actions.iso_mount_failed')));
        } finally {
            setBusy(null);
        }
    };

    return (
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
                <div className='max-h-[60vh] space-y-1.5 overflow-y-auto pr-1'>
                    <h4 className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
                        {t('vds.iso.provider_section')}
                    </h4>
                    {list.length === 0 ? (
                        <p className='text-muted-foreground py-4 text-center text-sm'>
                            {t('vds.console.actions.iso_empty')}
                        </p>
                    ) : (
                        list.map((p) => (
                            <div
                                key={p.volid}
                                className='border-border/60 flex items-center gap-3 rounded-lg border px-3 py-2'
                            >
                                <IsoCategoryIcon category={p.category} />
                                <div className='min-w-0 flex-1'>
                                    <p className='truncate text-sm font-medium'>{p.name}</p>
                                    <p className='text-muted-foreground truncate text-xs'>
                                        {[p.description || p.file, formatIsoSize(p.size)].filter(Boolean).join(' · ')}
                                    </p>
                                </div>
                                <Button
                                    size='sm'
                                    variant='outline'
                                    disabled={busy !== null}
                                    onClick={() => void mount(p.volid)}
                                >
                                    {busy === p.volid && <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />}
                                    {t('vds.console.actions.iso_mount_one')}
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </Dialog>
    );
}
