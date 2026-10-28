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
import { Loader2, Server } from 'lucide-react';
import { Button } from '@/components/featherui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VdsIsoDialog } from '@/components/vds/VdsIsoDialog';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage, getApiErrorMessageFromPayload } from '@/lib/api-errors';
import type { VdsFeatures } from '@/hooks/useVdsFeatures';

interface MountedIso {
    slot?: string;
    volid: string;
    storage: string | null;
    filename: string | null;
}

interface VdsHostIsoCardProps {
    vmId: number;
    features: VdsFeatures | null;
    canSettings: boolean;
    onChanged?: () => void;
}

/** Current host-library ISO mount plus open picker / unmount. */
export function VdsHostIsoCard({ vmId, features, canSettings, onChanged }: VdsHostIsoCardProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [mountedIso, setMountedIso] = useState<MountedIso | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [unmounting, setUnmounting] = useState(false);

    const fetchCurrent = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/user/vm-instances/${vmId}/iso-current`);
            if (data?.success) {
                setMountedIso(data.data?.mounted_iso ?? null);
            }
        } catch {
            // Transient - leave previous state.
        } finally {
            setLoading(false);
        }
    }, [vmId]);

    useEffect(() => {
        void fetchCurrent();
    }, [fetchCurrent]);

    const unmount = async () => {
        setUnmounting(true);
        try {
            const { data } = await axios.post(`/api/user/vm-instances/${vmId}/iso-unmount`);
            if (!data?.success) {
                toast.error(getApiErrorMessageFromPayload(data, t, 'vds.settings.iso.toast_unmount_failed'));
                return;
            }
            toast.success(t('vds.settings.iso.toast_unmounted'));
            setMountedIso(null);
            onChanged?.();
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'vds.settings.iso.toast_unmount_failed'));
        } finally {
            setUnmounting(false);
        }
    };

    if (features?.iso.enabled === false) {
        return null;
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className='flex items-center gap-2 text-base font-semibold tracking-tight'>
                        <Server className='text-primary h-4 w-4' />
                        {t('vds.settings.iso.title')}
                    </CardTitle>
                    <CardDescription className='text-muted-foreground'>
                        {t('vds.settings.iso.description')}
                    </CardDescription>
                </CardHeader>
                <CardContent className='space-y-5'>
                    <div className='space-y-2'>
                        <div className='text-muted-foreground text-xs font-semibold'>
                            {t('vds.settings.iso.current_label')}
                        </div>
                        {loading ? (
                            <div className='text-muted-foreground flex items-center gap-2'>
                                <Loader2 className='h-4 w-4 animate-spin' />
                                {t('vds.settings.iso.loading')}
                            </div>
                        ) : mountedIso ? (
                            <div className='border-border/50 bg-muted/20 flex flex-col gap-1 rounded-xl border px-3 py-2'>
                                <div className='truncate font-mono text-sm font-bold'>
                                    {mountedIso.filename ?? mountedIso.volid}
                                </div>
                                <div className='text-muted-foreground text-xs'>
                                    {t('vds.settings.iso.mounted_as')}{' '}
                                    <span className='font-mono'>{mountedIso.slot ?? 'ide2'}</span>
                                </div>
                            </div>
                        ) : (
                            <p className='text-muted-foreground text-sm italic'>{t('vds.settings.iso.none')}</p>
                        )}

                        <div className='flex justify-end pt-3'>
                            <Button
                                variant='default'
                                disabled={!mountedIso || unmounting || !canSettings}
                                onClick={() => void unmount()}
                            >
                                {unmounting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                                {t('vds.settings.iso.unmount_button')}
                            </Button>
                        </div>
                    </div>

                    <div className='border-border/50 flex flex-wrap items-center justify-between gap-3 border-t pt-4'>
                        <p className='text-muted-foreground text-sm'>{t('vds.iso.library_hint')}</p>
                        <Button variant='outline' disabled={!canSettings} onClick={() => setDialogOpen(true)}>
                            {t('vds.console.actions.iso_mount')}
                        </Button>
                    </div>
                </CardContent>
            </Card>
            <VdsIsoDialog
                vmId={vmId}
                features={features}
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onMounted={() => {
                    void fetchCurrent();
                    onChanged?.();
                }}
            />
        </>
    );
}
