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
import { useParams } from 'next/navigation';
import axios, { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useWebSpacePermissions } from '@/hooks/useWebSpacePermissions';
import { WebSpaceSubuserPermissions } from '@/lib/webspace-permissions';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';
import { WebSpaceHeader } from '@/components/webspace/WebSpaceHeader';
import { WebSpaceInfoCards, type WebSpaceUtilization } from '@/components/webspace/WebSpaceInfoCards';

interface WebSpace {
    uuid: string;
    uuidShort?: string;
    name: string;
    description?: string | null;
    domains?: string[];
    ssl?: boolean;
    dns_status?: string | null;
    status?: string;
    state?: string;
    backend_port?: number;
    web_node_name?: string | null;
    webplate_name?: string | null;
    document_root?: string;
    disk_used_bytes?: number;
    disk_limit_bytes?: number;
}

export default function WebSpaceOverviewPage() {
    const params = useParams();
    const uuidShort = String(params.uuidShort || '');
    const { t } = useTranslation();
    const { hasPermission, webspace: ctxSpace } = useWebSpacePermissions(uuidShort);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [space, setSpace] = useState<WebSpace | null>(null);
    const [util, setUtil] = useState<WebSpaceUtilization | null>(null);
    const [showReinstall, setShowReinstall] = useState(false);
    const [transfer, setTransfer] = useState<{
        phase?: string;
        message?: string | null;
        panel_status?: string;
    } | null>(null);

    const load = useCallback(async () => {
        try {
            const [showRes, , , utilRes, xferRes] = await Promise.all([
                axios.get(`/api/user/webspaces/${uuidShort}`),
                axios.get(`/api/user/webspaces/${uuidShort}/status`).catch(() => null),
                axios.get(`/api/user/webspaces/${uuidShort}/ssl`).catch(() => null),
                axios.get(`/api/user/webspaces/${uuidShort}/utilization`).catch(() => null),
                axios.get(`/api/user/webspaces/${uuidShort}/transfer/status`).catch(() => null),
            ]);
            if (showRes.data?.data?.webspace) setSpace(showRes.data.data.webspace);
            if (utilRes?.data?.data) setUtil(utilRes.data.data);
            const xfer = xferRes?.data?.data;
            if (xfer) {
                setTransfer({
                    phase: xfer.daemon?.phase,
                    message: xfer.daemon?.message,
                    panel_status: xfer.panel_status,
                });
            }
        } catch (error) {
            console.error(error);
            toast.error(t('webSpaces.messages.fetch_failed'));
        } finally {
            setLoading(false);
        }
    }, [t, uuidShort]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        const id = window.setInterval(() => {
            void axios
                .get(`/api/user/webspaces/${uuidShort}/utilization`)
                .then(({ data }) => {
                    if (data?.data) setUtil(data.data);
                })
                .catch(() => null);
            void axios
                .get(`/api/user/webspaces/${uuidShort}/transfer/status`)
                .then(({ data }) => {
                    const d = data?.data;
                    if (!d) {
                        setTransfer(null);
                        return;
                    }
                    setTransfer({
                        phase: d.daemon?.phase,
                        message: d.daemon?.message,
                        panel_status: d.panel_status,
                    });
                })
                .catch(() => setTransfer(null));
        }, 5000);
        return () => window.clearInterval(id);
    }, [uuidShort]);

    const power = async (action: 'start' | 'stop' | 'restart') => {
        const perm =
            action === 'start'
                ? WebSpaceSubuserPermissions['control.start']
                : action === 'stop'
                  ? WebSpaceSubuserPermissions['control.stop']
                  : WebSpaceSubuserPermissions['control.restart'];
        if (!hasPermission(perm)) {
            toast.error(t('webSpaces.overview.permissionDenied'));
            return;
        }
        setBusy(action);
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/power`, { action });
            if (data?.data?.webspace) setSpace(data.data.webspace);
            toast.success(t('webSpaces.overview.powerOk', { action }));
        } catch (error) {
            let msg = t('webSpaces.overview.powerFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setBusy(null);
        }
    };

    const reinstall = async () => {
        setBusy('reinstall');
        try {
            const { data } = await axios.post(`/api/user/webspaces/${uuidShort}/reinstall`, {
                wipe_files: true,
                start_on_completion: true,
            });
            if (data?.data?.webspace) setSpace(data.data.webspace);
            toast.success(t('webSpaces.overview.reinstallStarted'));
        } catch (error) {
            let msg = t('webSpaces.overview.reinstallFailed');
            if (isAxiosError(error) && error.response?.data?.message) msg = error.response.data.message;
            toast.error(msg);
        } finally {
            setBusy(null);
            setShowReinstall(false);
        }
    };

    if (loading || !space) {
        return <TableSkeleton count={3} />;
    }

    const domains = Array.isArray(space.domains) ? space.domains : [];
    const mergedUtil: WebSpaceUtilization = {
        ...util,
        disk_used_bytes: util?.disk_used_bytes ?? space.disk_used_bytes ?? ctxSpace?.disk_used_bytes,
        disk_limit_bytes: util?.disk_limit_bytes ?? space.disk_limit_bytes ?? ctxSpace?.disk_limit_bytes,
    };

    return (
        <WebSpacePageWidgets pageId='webspace-overview'>
            <div className='space-y-4'>
                <WebSpaceHeader
                    name={space.name}
                    state={space.state}
                    status={space.status}
                    uuidShort={space.uuidShort || uuidShort}
                    uuid={space.uuid}
                    nodeName={space.web_node_name}
                    plateName={space.webplate_name}
                    dnsStatus={space.dns_status}
                    canStart={hasPermission(WebSpaceSubuserPermissions['control.start'])}
                    canStop={hasPermission(WebSpaceSubuserPermissions['control.stop'])}
                    canRestart={hasPermission(WebSpaceSubuserPermissions['control.restart'])}
                    busy={busy}
                    onStart={() => power('start')}
                    onStop={() => power('stop')}
                    onRestart={() => power('restart')}
                    onRefresh={() => load()}
                />

                {(transfer?.phase === 'running' || space.status === 'transferring') && (
                    <div className='border-border/50 bg-card/50 rounded-xl border px-4 py-3 text-sm backdrop-blur-xl'>
                        <p className='font-medium'>{t('webSpaces.overview.transferInProgress')}</p>
                        <p className='text-muted-foreground mt-1'>
                            {transfer?.message || t('webSpaces.overview.transferInProgressHelp')}
                        </p>
                    </div>
                )}

                {transfer?.phase === 'failed' && (
                    <div className='border-destructive/40 bg-destructive/5 rounded-xl border px-4 py-3 text-sm'>
                        <p className='font-medium'>{t('webSpaces.overview.transferFailed')}</p>
                        <p className='text-muted-foreground mt-1'>
                            {transfer.message || t('webSpaces.overview.transferFailedHelp')}
                        </p>
                    </div>
                )}

                <WebSpaceInfoCards
                    domains={domains}
                    ssl={space.ssl}
                    backendPort={space.backend_port}
                    documentRoot={space.document_root}
                    util={mergedUtil}
                />

                <PageCard title={t('webSpaces.overview.dangerZone')} variant='warning'>
                    <p className='text-muted-foreground mb-4 text-sm'>{t('webSpaces.overview.reinstall')}</p>
                    <Button
                        variant='outline'
                        loading={busy === 'reinstall'}
                        disabled={!!busy}
                        onClick={() => setShowReinstall(true)}
                    >
                        {t('webSpaces.overview.reinstall')}
                    </Button>
                </PageCard>

                <ConfirmDialog
                    open={showReinstall}
                    onOpenChange={setShowReinstall}
                    title={t('webSpaces.overview.reinstall')}
                    description={t('webSpaces.overview.reinstallConfirm')}
                    confirmLabel={t('webSpaces.overview.reinstall')}
                    cancelLabel={t('common.cancel')}
                    onConfirm={() => void reinstall()}
                />
            </div>
        </WebSpacePageWidgets>
    );
}
