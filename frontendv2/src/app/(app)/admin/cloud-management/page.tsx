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

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useFeatherCloud, type CloudSummary } from '@/hooks/useFeatherCloud';
import axios from 'axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    Check,
    CheckCircle2,
    Cloud,
    Coins,
    ExternalLink,
    Link2,
    Loader2,
    RefreshCw,
    Unplug,
    X,
    XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const GRANTED_SCOPES = [
    'Read linked cloud connection details',
    'Read linked team profile, members, and credit balance',
    'Read team marketplace purchases / licenses and download allowed .fpa releases',
    'Browse Mythic egg catalog and download eggs',
    'Create pastes/logs under the team paste quota; delete team pastes via API',
    'List issue tracker projects; read/create issues; comment on issues (as mapped team members)',
    'Submit/update/delete product & egg reviews as mapped team members',
    'Use team-billed AI / related cloud features tied to the connection (if enabled)',
] as const;

const NOT_GRANTED_SCOPES = [
    'Cannot log into Mythic as the user',
    'Cannot change team billing methods, remove members, or manage invoices',
    'Cannot read Mythic account passwords / 2FA / session cookies',
    'Cannot access unrelated teams',
    'Cannot wipe or take over the FeatherPanel database outside approved cloud scopes',
    'Connection can be revoked anytime from here and from Mythic team cloud connections',
] as const;

interface CloudLinkSettings {
    linked?: boolean;
    linked_at?: string | null;
    has_access_keys?: boolean;
    has_identity_keys?: boolean;
    team_uuid?: string | null;
    team_name?: string | null;
    cloud_name?: string | null;
    mythic_user_id?: string | null;
    mythic_user_email?: string | null;
    mythic_user_name?: string | null;
    current_user_mapped?: boolean;
    last_synced_at?: string | null;
}

export default function CloudManagementPage() {
    const { t } = useTranslation();
    const { fetchSummary } = useFeatherCloud();

    const [linked, setLinked] = useState(false);
    const [linkInfo, setLinkInfo] = useState<CloudLinkSettings>({});
    const [loading, setLoading] = useState(true);
    const [linking, setLinking] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [showConsent, setShowConsent] = useState(false);
    const [disconnectOpen, setDisconnectOpen] = useState(false);
    const [summary, setSummary] = useState<CloudSummary | null>(null);
    const [credits, setCredits] = useState<number | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const loadStatus = useCallback(async () => {
        setLoading(true);
        try {
            const settingsRes = await axios.get('/api/admin/cloud/settings');
            const settings = (settingsRes.data?.data || {}) as CloudLinkSettings;
            const isLinked = Boolean(settings.linked);
            setLinkInfo(settings);
            setLinked(isLinked);

            if (isLinked) {
                setRefreshing(true);
                try {
                    const s = await fetchSummary();
                    setSummary(s);
                    const creditVal =
                        (s as { statistics?: { total_credits?: number } })?.statistics?.total_credits ?? null;
                    setCredits(typeof creditVal === 'number' ? creditVal : null);
                    const summaryTeam =
                        (s as { team?: { name?: string } })?.team?.name ||
                        (s as { cloud?: { cloud_name?: string } })?.cloud?.cloud_name ||
                        null;
                    if (summaryTeam && !settings.team_name) {
                        setLinkInfo((prev) => ({ ...prev, team_name: summaryTeam }));
                    }
                } catch {
                    setSummary(null);
                } finally {
                    setRefreshing(false);
                }
            } else {
                setSummary(null);
                setCredits(null);
            }
        } catch {
            toast.error(t('admin.cloud_management.messages.credentials_load_failed'));
            setLinked(false);
        } finally {
            setLoading(false);
        }
    }, [fetchSummary, t]);

    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

    const startConnect = async () => {
        setLinking(true);
        try {
            const response = await axios.get('/api/admin/cloud/oauth2/link');
            const oauth2Url = response.data?.data?.oauth2_url;
            if (!oauth2Url) {
                toast.error(t('admin.cloud_management.messages.oauth_link_failed'));
                setLinking(false);
                return;
            }
            window.location.href = oauth2Url;
        } catch {
            toast.error(t('admin.cloud_management.messages.oauth_link_failed'));
            setLinking(false);
        }
    };

    const disconnect = async () => {
        setDisconnecting(true);
        try {
            await axios.post('/api/admin/cloud/disconnect', {});
            toast.success(t('admin.cloud_management.messages.disconnected'));
            setDisconnectOpen(false);
            setLinked(false);
            setLinkInfo({});
            setSummary(null);
            setCredits(null);
            await loadStatus();
        } catch {
            toast.error(t('admin.cloud_management.messages.disconnect_failed'));
        } finally {
            setDisconnecting(false);
        }
    };

    const syncNow = async () => {
        setSyncing(true);
        try {
            const response = await axios.post('/api/admin/cloud/sync');
            const count = response.data?.data?.purchases_count;
            toast.success(
                typeof count === 'number' ? `Synced ${count} purchase(s) from Mythic` : 'Synced with Mythic Cloud',
            );
            await loadStatus();
        } catch (err) {
            toast.error(axios.isAxiosError(err) ? err.response?.data?.message || 'Sync failed' : 'Sync failed');
        } finally {
            setSyncing(false);
        }
    };

    const openMythicClouds = () => {
        window.open('https://my.mythicalsystems.org/clouds', '_blank', 'noopener,noreferrer');
    };

    const displayTeam =
        linkInfo.team_name || linkInfo.cloud_name || (summary as { team?: { name?: string } })?.team?.name || null;

    return (
        <div className='space-y-6 md:space-y-8'>
            <PageHeader
                title={t('admin.cloud_management.title')}
                description={t('admin.cloud_management.subtitle')}
                icon={Cloud}
                actions={
                    <Button variant='outline' size='sm' disabled={loading || refreshing} onClick={loadStatus}>
                        <RefreshCw className={cn('mr-2 h-4 w-4', (loading || refreshing) && 'animate-spin')} />
                        {t('admin.cloud_management.refresh_status')}
                    </Button>
                }
            />

            <PageCard title={t('admin.cloud_management.connection_status.card_title')} icon={Link2}>
                {loading ? (
                    <div className='flex justify-center py-10'>
                        <Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
                    </div>
                ) : linked ? (
                    <div className='space-y-5'>
                        <div className='flex flex-wrap items-start justify-between gap-4'>
                            <div className='space-y-2'>
                                <div className='flex items-center gap-2'>
                                    <CheckCircle2 className='text-primary h-5 w-5' />
                                    <p className='text-foreground text-lg font-semibold'>
                                        {displayTeam
                                            ? t('admin.cloud_management.connection_status.connected_to', {
                                                  team: displayTeam,
                                              })
                                            : t('admin.cloud_management.connection_status.connected')}
                                    </p>
                                </div>
                                <p className='text-muted-foreground text-sm'>
                                    {t('admin.cloud_management.connection_status.connected_desc')}
                                </p>
                                <div className='flex flex-wrap gap-2 pt-1'>
                                    {linkInfo.mythic_user_email && (
                                        <span className='bg-muted text-muted-foreground rounded-md border px-2 py-1 text-xs'>
                                            {linkInfo.mythic_user_name
                                                ? `${linkInfo.mythic_user_name} · ${linkInfo.mythic_user_email}`
                                                : linkInfo.mythic_user_email}
                                        </span>
                                    )}
                                    {linkInfo.mythic_user_id && (
                                        <span className='bg-muted text-muted-foreground rounded-md border px-2 py-1 font-mono text-xs'>
                                            Mythic ID {linkInfo.mythic_user_id}
                                        </span>
                                    )}
                                </div>
                                {credits !== null && (
                                    <p className='text-muted-foreground flex items-center gap-1.5 text-sm'>
                                        <Coins className='h-3.5 w-3.5' />
                                        {t('admin.cloud_management.cloud_info.total_credits')}: {credits}
                                    </p>
                                )}
                                {linkInfo.current_user_mapped === false && (
                                    <p className='mt-2 text-sm text-amber-600 dark:text-amber-400'>
                                        {t('admin.cloud_management.mapping.unmapped_hint')}
                                    </p>
                                )}
                                {linkInfo.has_access_keys === false && (
                                    <p className='mt-2 text-sm text-amber-600 dark:text-amber-400'>
                                        Mythic→panel credentials (cloud_api_key/secret) were not stored. Mythic may show
                                        Pending until you re-link or complete OAuth with those params.
                                    </p>
                                )}
                                {linkInfo.last_synced_at && (
                                    <p className='text-muted-foreground mt-1 text-xs'>
                                        Last sync: {linkInfo.last_synced_at}
                                    </p>
                                )}
                            </div>
                            <div className='flex flex-wrap gap-2'>
                                <Button
                                    variant='default'
                                    size='sm'
                                    onClick={() => void syncNow()}
                                    disabled={syncing || linking || disconnecting}
                                >
                                    {syncing ? (
                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    ) : (
                                        <RefreshCw className='mr-2 h-4 w-4' />
                                    )}
                                    Sync now
                                </Button>
                                <Button variant='outline' size='sm' onClick={openMythicClouds}>
                                    <ExternalLink className='mr-2 h-4 w-4' />
                                    Open Mythic Clouds
                                </Button>
                                <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={() => setShowConsent(true)}
                                    disabled={linking || disconnecting}
                                >
                                    {t('admin.cloud_management.relink')}
                                </Button>
                                <Button
                                    variant='destructive'
                                    size='sm'
                                    disabled={disconnecting}
                                    onClick={() => setDisconnectOpen(true)}
                                >
                                    {disconnecting ? (
                                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    ) : (
                                        <Unplug className='mr-2 h-4 w-4' />
                                    )}
                                    {t('admin.cloud_management.disconnect')}
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className='space-y-5'>
                        <div className='flex items-center gap-2'>
                            <XCircle className='text-muted-foreground h-5 w-5' />
                            <p className='text-foreground text-lg font-semibold'>
                                {t('admin.cloud_management.connection_status.not_connected')}
                            </p>
                        </div>
                        <p className='text-muted-foreground text-sm'>
                            {t('admin.cloud_management.connection_status.not_connected_desc')}
                        </p>
                        <Button size='lg' onClick={() => setShowConsent(true)} disabled={linking} className='gap-2'>
                            {linking ? <Loader2 className='h-4 w-4 animate-spin' /> : <Cloud className='h-4 w-4' />}
                            {t('admin.cloud_management.connect_cta')}
                        </Button>
                    </div>
                )}
            </PageCard>

            <AlertDialog open={showConsent} onOpenChange={setShowConsent}>
                <AlertDialogContent className='max-h-[90vh] max-w-lg overflow-y-auto'>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin.cloud_management.consent.title')}</AlertDialogTitle>
                        <AlertDialogDescription className='space-y-4 text-left'>
                            <p>{t('admin.cloud_management.consent.intro')}</p>
                            <div>
                                <p className='text-foreground mb-2 text-sm font-semibold'>
                                    {t('admin.cloud_management.consent.granted_title')}
                                </p>
                                <ul className='space-y-1.5'>
                                    {GRANTED_SCOPES.map((scope) => (
                                        <li key={scope} className='text-muted-foreground flex gap-2 text-sm'>
                                            <Check className='text-primary mt-0.5 h-3.5 w-3.5 shrink-0' />
                                            <span>{scope}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <p className='text-foreground mb-2 text-sm font-semibold'>
                                    {t('admin.cloud_management.consent.denied_title')}
                                </p>
                                <ul className='space-y-1.5'>
                                    {NOT_GRANTED_SCOPES.map((scope) => (
                                        <li key={scope} className='text-muted-foreground flex gap-2 text-sm'>
                                            <X className='mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500' />
                                            <span>{scope}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <p className='text-muted-foreground text-xs'>
                                {t('admin.cloud_management.consent.acting_note')}
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={linking}>
                            {t('admin.cloud_management.consent.cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={linking}
                            onClick={(e) => {
                                e.preventDefault();
                                void startConnect();
                            }}
                        >
                            {linking ? (
                                <>
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    {t('admin.cloud_management.linking')}
                                </>
                            ) : (
                                t('admin.cloud_management.consent.authorize')
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={disconnectOpen}
                onOpenChange={(open) => {
                    if (!disconnecting) setDisconnectOpen(open);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin.cloud_management.disconnect_dialog.title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('admin.cloud_management.disconnect_dialog.description')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={disconnecting}>
                            {t('admin.cloud_management.consent.cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={disconnecting}
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                            onClick={(e) => {
                                e.preventDefault();
                                void disconnect();
                            }}
                        >
                            {disconnecting ? (
                                <>
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    {t('admin.cloud_management.disconnect')}
                                </>
                            ) : (
                                t('admin.cloud_management.disconnect')
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
