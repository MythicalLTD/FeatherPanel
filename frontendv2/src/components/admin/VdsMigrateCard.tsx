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

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { getApiErrorMessage } from '@/lib/api-errors';
import type { CapacityResponse } from '@/components/admin/VdsCapacityOverview';

/** Live-migrate a VDS to another Proxmox node of its cluster. Hidden unless vds_migration_enabled. */
export function VdsMigrateCard({
    instanceId,
    vmNodeId,
    pveNode,
    onMigrated,
}: {
    instanceId: number;
    vmNodeId: number;
    pveNode: string;
    onMigrated: () => void;
}) {
    const { t } = useTranslation();
    const [targets, setTargets] = useState<string[] | null>(null);
    const [target, setTarget] = useState('');
    const [busy, setBusy] = useState(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        axios
            .get('/api/admin/vm-capacity')
            .then(({ data }) => {
                const cap = data?.data as CapacityResponse | undefined;
                if (!cap?.migration_enabled) return;
                const node = cap.nodes.find((n) => n.id === vmNodeId);
                setTargets((node?.pve_nodes ?? []).filter((p) => p.online && p.node !== pveNode).map((p) => p.node));
            })
            .catch(() => {
                // No capacity info: keep the card hidden.
            });
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, [vmNodeId, pveNode]);

    if (targets === null) return null;

    const poll = (upid: string, from: string, attempt: number) => {
        timer.current = setTimeout(async () => {
            try {
                const { data } = await axios.get(`/api/admin/vm-instances/${instanceId}/migrate`, {
                    params: { upid, from },
                });
                const s = data?.data?.status;
                if (s === 'completed') {
                    toast.success(t('admin.vdsMigrate.done', { node: data.data.pve_node }));
                    setBusy(false);
                    onMigrated();
                    return;
                }
                if (s === 'failed') {
                    toast.error(t('admin.vdsMigrate.failed', { error: data.data.error || '' }));
                    setBusy(false);
                    return;
                }
            } catch {
                // Keep polling on transient errors.
            }
            if (attempt < 600) poll(upid, from, attempt + 1);
            else setBusy(false);
        }, 3000);
    };

    const start = async () => {
        if (!target) return;
        setBusy(true);
        try {
            const { data } = await axios.post(`/api/admin/vm-instances/${instanceId}/migrate`, { target });
            toast.info(t('admin.vdsMigrate.started', { node: target }));
            poll(data.data.upid, data.data.from, 0);
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'admin.vdsMigrate.start_failed'));
            setBusy(false);
        }
    };

    return (
        <div className='fp-surface mt-6 space-y-3 rounded-xl border p-4'>
            <p className='flex items-center gap-2 font-semibold'>
                <ArrowRightLeft className='text-primary h-4 w-4' />
                {t('admin.vdsMigrate.title')}
            </p>
            <p className='text-muted-foreground text-xs'>{t('admin.vdsMigrate.description', { node: pveNode })}</p>
            {targets.length === 0 ? (
                <p className='text-muted-foreground text-sm'>{t('admin.vdsMigrate.no_targets')}</p>
            ) : (
                <div className='flex flex-col gap-2 sm:flex-row'>
                    <select
                        className='border-input bg-muted/30 h-10 flex-1 rounded-xl border px-3 text-sm'
                        value={target}
                        onChange={(e) => setTarget(e.target.value)}
                        disabled={busy}
                    >
                        <option value=''>{t('admin.vdsMigrate.choose')}</option>
                        {targets.map((n) => (
                            <option key={n} value={n}>
                                {n}
                            </option>
                        ))}
                    </select>
                    <Button onClick={() => void start()} disabled={!target || busy}>
                        {busy ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
                        {t('admin.vdsMigrate.start')}
                    </Button>
                </div>
            )}
        </div>
    );
}
