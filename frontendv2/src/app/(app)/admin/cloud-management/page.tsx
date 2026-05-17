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

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useFeatherCloud, type CloudSummary, type CreditsData, type TeamData } from '@/hooks/useFeatherCloud';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import axios from 'axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
    Cloud,
    Key,
    LockKeyhole,
    PlugZap,
    RefreshCw,
    ShieldCheck,
    Store,
    Users,
    Coins,
    Brain,
    BarChart3,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
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

interface CredentialPair {
    publicKey: string;
    privateKey: string;
    lastRotatedAt?: string;
}

interface CredentialResponse {
    panelCredentials: CredentialPair;
    cloudCredentials: CredentialPair;
}

function StatusBadge({ connected }: { connected: boolean }) {
    const { t } = useTranslation();
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold',
                connected
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-muted/50 text-muted-foreground border-border/50',
            )}
        >
            {connected ? <CheckCircle2 className='h-3.5 w-3.5' /> : <XCircle className='h-3.5 w-3.5' />}
            {connected
                ? t('admin.cloud_management.connection_status.active')
                : t('admin.cloud_management.connection_status.inactive')}
        </span>
    );
}

export default function CloudManagementPage() {
    const { t } = useTranslation();
    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-cloud-management');
    const { fetchSummary, fetchCredits, fetchTeam, loading: cloudLoading } = useFeatherCloud();

    const [keys, setKeys] = useState<CredentialResponse>({
        panelCredentials: { publicKey: '', privateKey: '', lastRotatedAt: undefined },
        cloudCredentials: { publicKey: '', privateKey: '', lastRotatedAt: undefined },
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    const [showRotateConfirmDialog, setShowRotateConfirmDialog] = useState(false);

    const [cloudSummary, setCloudSummary] = useState<CloudSummary | null>(null);
    const [cloudCredits, setCloudCredits] = useState<CreditsData | null>(null);
    const [cloudTeam, setCloudTeam] = useState<TeamData | null>(null);
    const [isRefreshingCloudData, setIsRefreshingCloudData] = useState(false);

    const hasPanelKeys = Boolean(keys.panelCredentials.publicKey && keys.panelCredentials.privateKey);
    const hasCloudKeys = Boolean(keys.cloudCredentials.publicKey && keys.cloudCredentials.privateKey);
    const isConnected = hasPanelKeys && hasCloudKeys;

    const fetchKeys = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('/api/admin/cloud/credentials');
            const data = response.data?.data;
            setKeys({
                panelCredentials: {
                    publicKey: data?.panel_credentials?.public_key ?? '',
                    privateKey: data?.panel_credentials?.private_key ?? '',
                    lastRotatedAt: data?.panel_credentials?.last_rotated_at,
                },
                cloudCredentials: {
                    publicKey: data?.cloud_credentials?.public_key ?? '',
                    privateKey: data?.cloud_credentials?.private_key ?? '',
                    lastRotatedAt: data?.cloud_credentials?.last_rotated_at,
                },
            });
        } catch (error) {
            toast.error(t('admin.cloud_management.messages.credentials_load_failed'));
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    const regenerateKeys = async () => {
        setIsRegenerating(true);
        try {
            const response = await axios.post('/api/admin/cloud/credentials/rotate');
            const data = response.data?.data;
            setKeys({
                panelCredentials: {
                    publicKey: data?.panel_credentials?.public_key ?? '',
                    privateKey: data?.panel_credentials?.private_key ?? '',
                    lastRotatedAt: data?.panel_credentials?.last_rotated_at,
                },
                cloudCredentials: {
                    publicKey: data?.cloud_credentials?.public_key ?? keys.cloudCredentials.publicKey,
                    privateKey: data?.cloud_credentials?.private_key ?? keys.cloudCredentials.privateKey,
                    lastRotatedAt: data?.cloud_credentials?.last_rotated_at ?? keys.cloudCredentials.lastRotatedAt,
                },
            });

            const cloudCredsEmpty = !data?.cloud_credentials?.public_key || !data?.cloud_credentials?.private_key;
            if (cloudCredsEmpty) {
                toast.warning(t('admin.cloud_management.messages.cloud_credentials_empty'));
            } else {
                toast.success(t('admin.cloud_management.messages.credentials_rotated'));
            }
        } catch (error) {
            toast.error(t('admin.cloud_management.messages.credentials_rotate_failed'));
            console.error(error);
        } finally {
            setIsRegenerating(false);
        }
    };

    const linkWithFeatherCloud = async () => {
        setIsLinking(true);
        try {
            const response = await axios.get('/api/admin/cloud/oauth2/link');
            const oauth2Url = response.data?.data?.oauth2_url;
            if (oauth2Url) {
                window.location.href = oauth2Url;
            } else {
                toast.error(t('admin.cloud_management.messages.oauth_link_failed'));
            }
        } catch (error) {
            toast.error(t('admin.cloud_management.messages.oauth_link_failed'));
            console.error(error);
        } finally {
            setIsLinking(false);
        }
    };

    const refreshCloudData = async () => {
        if (!hasCloudKeys) return;
        setIsRefreshingCloudData(true);
        try {
            const [summary, credits, team] = await Promise.all([fetchSummary(), fetchCredits(), fetchTeam()]);
            setCloudSummary(summary);
            setCloudCredits(credits);
            setCloudTeam(team);
        } catch (error) {
            console.error('Failed to refresh cloud data:', error);
        } finally {
            setIsRefreshingCloudData(false);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, [fetchKeys]);

    useEffect(() => {
        if (hasCloudKeys) {
            refreshCloudData();
        } else {
            setCloudSummary(null);
            setCloudCredits(null);
            setCloudTeam(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasCloudKeys]);

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    return (
        <>
            <WidgetRenderer widgets={getWidgets('admin-cloud-management', 'top-of-page')} />
            <div className='space-y-6 md:space-y-8'>
                <PageHeader
                    title={t('admin.cloud_management.title')}
                    description={t('admin.cloud_management.subtitle')}
                    icon={Cloud}
                    actions={
                        <div className='flex flex-wrap items-center gap-2'>
                            <Button variant='outline' size='sm' disabled={isLoading || isLinking} onClick={fetchKeys}>
                                <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
                                {t('admin.cloud_management.refresh_status')}
                            </Button>
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={isRegenerating || isLinking}
                                onClick={() => setShowRotateConfirmDialog(true)}
                            >
                                <Key className={cn('mr-2 h-4 w-4', isRegenerating && 'animate-spin')} />
                                {t('admin.cloud_management.rotate_keys')}
                            </Button>
                            <Button size='sm' disabled={isLinking || isRegenerating} onClick={linkWithFeatherCloud}>
                                <PlugZap className={cn('mr-2 h-4 w-4', isLinking && 'animate-spin')} />
                                {isLinking
                                    ? t('admin.cloud_management.linking')
                                    : isConnected
                                      ? t('admin.cloud_management.relink')
                                      : t('admin.cloud_management.link')}
                            </Button>
                        </div>
                    }
                />

                <PageCard
                    title={
                        isConnected
                            ? t('admin.cloud_management.connection_status.connected')
                            : t('admin.cloud_management.connection_status.not_connected')
                    }
                    description={
                        isConnected
                            ? t('admin.cloud_management.connection_status.connected_desc')
                            : t('admin.cloud_management.connection_status.not_connected_desc')
                    }
                    icon={isConnected ? CheckCircle2 : XCircle}
                    action={<StatusBadge connected={isConnected} />}
                >
                    {null}
                </PageCard>

                {isConnected && (
                    <PageCard
                        title={t('admin.cloud_management.credentials.title')}
                        description={t('admin.cloud_management.credentials.description')}
                        icon={Key}
                    >
                        <div className='grid gap-6 sm:grid-cols-2'>
                            <div className='border-border/50 bg-muted/10 rounded-xl border p-4'>
                                <p className='text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase'>
                                    {t('admin.cloud_management.credentials.cloud_to_panel')}
                                </p>
                                <p className='text-foreground text-sm'>
                                    {keys.cloudCredentials.lastRotatedAt
                                        ? new Date(keys.cloudCredentials.lastRotatedAt).toLocaleString()
                                        : t('admin.cloud_management.credentials.never_rotated')}
                                </p>
                            </div>
                            <div className='border-border/50 bg-muted/10 rounded-xl border p-4'>
                                <p className='text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase'>
                                    {t('admin.cloud_management.credentials.panel_to_cloud')}
                                </p>
                                <p className='text-foreground text-sm'>
                                    {keys.panelCredentials.lastRotatedAt
                                        ? new Date(keys.panelCredentials.lastRotatedAt).toLocaleString()
                                        : t('admin.cloud_management.credentials.never_rotated')}
                                </p>
                            </div>
                        </div>
                    </PageCard>
                )}

                <PageCard title={t('admin.cloud_management.features.title')} icon={Store}>
                    <ul className='space-y-4'>
                        <li className='border-border/50 bg-muted/5 flex gap-4 rounded-xl border p-4'>
                            <div className='bg-primary/10 border-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border'>
                                <Brain className='text-primary h-5 w-5' />
                            </div>
                            <div className='min-w-0'>
                                <p className='text-foreground font-semibold'>
                                    {t('admin.cloud_management.features.feather_ai.title')}
                                </p>
                                <p className='text-muted-foreground mt-0.5 text-sm'>
                                    {t('admin.cloud_management.features.feather_ai.description')}
                                </p>
                                <span className='text-primary border-primary/20 bg-primary/10 mt-2 inline-block rounded-md border px-2 py-0.5 text-xs font-medium'>
                                    {t('admin.cloud_management.features.feather_ai.coming_soon')}
                                </span>
                            </div>
                        </li>
                        <li className='border-border/50 bg-muted/5 flex gap-4 rounded-xl border p-4'>
                            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10'>
                                <Store className='h-5 w-5 text-amber-600 dark:text-amber-400' />
                            </div>
                            <div className='min-w-0'>
                                <p className='text-foreground font-semibold'>
                                    {t('admin.cloud_management.features.premium_plugins.title')}
                                </p>
                                <p className='text-muted-foreground mt-0.5 text-sm'>
                                    {t('admin.cloud_management.features.premium_plugins.description')}
                                </p>
                                <span className='mt-2 inline-block rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400'>
                                    {t('admin.cloud_management.features.premium_plugins.premium')}
                                </span>
                            </div>
                        </li>
                        <li className='border-border/50 bg-muted/5 flex gap-4 rounded-xl border p-4'>
                            <div className='bg-primary/10 border-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border'>
                                <ShieldCheck className='text-primary h-5 w-5' />
                            </div>
                            <div className='min-w-0'>
                                <p className='text-foreground font-semibold'>
                                    {t('admin.cloud_management.features.cloud_intelligence.title')}
                                </p>
                                <p className='text-muted-foreground mt-0.5 text-sm'>
                                    {t('admin.cloud_management.features.cloud_intelligence.description')}
                                </p>
                                <span className='text-primary border-primary/20 bg-primary/10 mt-2 inline-block rounded-md border px-2 py-0.5 text-xs font-medium'>
                                    {t('admin.cloud_management.features.cloud_intelligence.active')}
                                </span>
                            </div>
                        </li>
                    </ul>
                </PageCard>

                {isConnected && (cloudSummary || cloudCredits || cloudTeam) && (
                    <PageCard
                        title={t('admin.cloud_management.cloud_info.title')}
                        icon={BarChart3}
                        action={
                            <Button
                                variant='outline'
                                size='sm'
                                disabled={isRefreshingCloudData || cloudLoading}
                                onClick={refreshCloudData}
                            >
                                <RefreshCw
                                    className={cn(
                                        'mr-2 h-4 w-4',
                                        (isRefreshingCloudData || cloudLoading) && 'animate-spin',
                                    )}
                                />
                                {t('admin.cloud_management.cloud_info.refresh')}
                            </Button>
                        }
                    >
                        {cloudLoading || isRefreshingCloudData ? (
                            <div className='flex items-center justify-center py-12'>
                                <RefreshCw className='text-muted-foreground h-8 w-8 animate-spin' />
                            </div>
                        ) : (
                            <div className='grid gap-4 sm:grid-cols-3'>
                                {cloudTeam && (
                                    <div className='border-border/50 bg-muted/10 flex items-center gap-3 rounded-xl border p-4'>
                                        <div className='bg-primary/10 border-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border'>
                                            <Users className='text-primary h-5 w-5' />
                                        </div>
                                        <div className='min-w-0'>
                                            <p className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
                                                {t('admin.cloud_management.cloud_info.team')}
                                            </p>
                                            <p className='text-foreground truncate font-semibold'>
                                                {cloudTeam.team.name}
                                            </p>
                                            {cloudTeam.team.description && (
                                                <p className='text-muted-foreground truncate text-sm'>
                                                    {cloudTeam.team.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {cloudCredits && (
                                    <div className='border-border/50 bg-muted/10 flex items-center gap-3 rounded-xl border p-4'>
                                        <div className='bg-primary/10 border-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border'>
                                            <Coins className='text-primary h-5 w-5' />
                                        </div>
                                        <div className='min-w-0'>
                                            <p className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
                                                {t('admin.cloud_management.cloud_info.total_credits')}
                                            </p>
                                            <p className='text-foreground font-semibold'>
                                                {cloudCredits.total_credits.toLocaleString()}
                                            </p>
                                            <p className='text-muted-foreground text-sm'>
                                                {t('admin.cloud_management.cloud_info.team_members', {
                                                    count: cloudCredits.member_count.toString(),
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {cloudSummary && (
                                    <div className='border-border/50 bg-muted/10 flex items-center gap-3 rounded-xl border p-4'>
                                        <div className='bg-primary/10 border-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border'>
                                            <BarChart3 className='text-primary h-5 w-5' />
                                        </div>
                                        <div className='min-w-0'>
                                            <p className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>
                                                {t('admin.cloud_management.cloud_info.total_purchases')}
                                            </p>
                                            <p className='text-foreground font-semibold'>
                                                {cloudSummary.statistics.total_purchases}
                                            </p>
                                            <p className='text-muted-foreground truncate text-sm'>
                                                {cloudSummary.cloud.cloud_name}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </PageCard>
                )}

                <PageCard title={t('admin.cloud_management.security.title')} icon={LockKeyhole}>
                    <div className='grid gap-4 sm:grid-cols-2'>
                        <div className='border-border/50 bg-muted/5 flex gap-3 rounded-xl border p-4'>
                            <Key className='text-muted-foreground h-5 w-5 shrink-0' />
                            <div>
                                <p className='text-foreground font-semibold'>
                                    {t('admin.cloud_management.security.identification.title')}
                                </p>
                                <p className='text-muted-foreground mt-0.5 text-sm'>
                                    {t('admin.cloud_management.security.identification.description')}
                                </p>
                            </div>
                        </div>
                        <div className='border-border/50 bg-muted/5 flex gap-3 rounded-xl border p-4'>
                            <LockKeyhole className='text-muted-foreground h-5 w-5 shrink-0' />
                            <div>
                                <p className='text-foreground font-semibold'>
                                    {t('admin.cloud_management.security.privacy.title')}
                                </p>
                                <p className='text-muted-foreground mt-0.5 text-sm'>
                                    {t('admin.cloud_management.security.privacy.description')}
                                </p>
                            </div>
                        </div>
                        <div className='border-border/50 bg-muted/5 flex gap-3 rounded-xl border p-4'>
                            <ShieldCheck className='text-muted-foreground h-5 w-5 shrink-0' />
                            <div>
                                <p className='text-foreground font-semibold'>
                                    {t('admin.cloud_management.security.permissions.title')}
                                </p>
                                <p className='text-muted-foreground mt-0.5 text-sm'>
                                    {t('admin.cloud_management.security.permissions.description')}
                                </p>
                            </div>
                        </div>
                        <div className='border-border/50 bg-muted/5 flex gap-3 rounded-xl border p-4'>
                            <BarChart3 className='text-muted-foreground h-5 w-5 shrink-0' />
                            <div>
                                <p className='text-foreground font-semibold'>
                                    {t('admin.cloud_management.security.audit.title')}
                                </p>
                                <p className='text-muted-foreground mt-0.5 text-sm'>
                                    {t('admin.cloud_management.security.audit.description')}
                                </p>
                            </div>
                        </div>
                    </div>
                </PageCard>

                <PageCard
                    title={t('admin.cloud_management.oauth2.title')}
                    description={t('admin.cloud_management.oauth2.description')}
                    icon={PlugZap}
                >
                    <div className='border-border/50 bg-muted/10 space-y-3 rounded-xl border p-4'>
                        <p className='text-foreground text-sm font-semibold'>
                            {t('admin.cloud_management.oauth2.how_it_works')}
                        </p>
                        <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm'>
                            <li>{t('admin.cloud_management.oauth2.step1')}</li>
                            <li>{t('admin.cloud_management.oauth2.step2')}</li>
                            <li>{t('admin.cloud_management.oauth2.step3')}</li>
                            <li>{t('admin.cloud_management.oauth2.step4')}</li>
                        </ul>
                    </div>
                </PageCard>

                <AlertDialog open={showRotateConfirmDialog} onOpenChange={setShowRotateConfirmDialog}>
                    <AlertDialogContent className='max-w-lg'>
                        <AlertDialogHeader>
                            <AlertDialogTitle className='flex items-center gap-2'>
                                <RefreshCw className='text-primary h-5 w-5' />
                                {t('admin.cloud_management.rotate_dialog.title')}
                            </AlertDialogTitle>
                            <AlertDialogDescription className='space-y-3 pt-2'>
                                <p className='text-foreground text-sm'>
                                    {t('admin.cloud_management.rotate_dialog.description')}
                                </p>
                                <div className='border-border/50 bg-muted/10 space-y-2 rounded-xl border p-3'>
                                    <p className='text-foreground text-sm font-semibold'>
                                        {t('admin.cloud_management.rotate_dialog.important')}
                                    </p>
                                    <ul className='text-muted-foreground list-inside list-disc space-y-1 text-sm'>
                                        <li>{t('admin.cloud_management.rotate_dialog.warning1')}</li>
                                        <li>{t('admin.cloud_management.rotate_dialog.warning2')}</li>
                                        <li>{t('admin.cloud_management.rotate_dialog.warning3')}</li>
                                        {!hasCloudKeys && (
                                            <li className='text-foreground font-semibold'>
                                                {t('admin.cloud_management.rotate_dialog.warning4')}
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t('admin.cloud_management.rotate_dialog.cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                                disabled={isRegenerating}
                                onClick={() => {
                                    setShowRotateConfirmDialog(false);
                                    regenerateKeys();
                                }}
                            >
                                <RefreshCw className={cn('mr-2 h-4 w-4', isRegenerating && 'animate-spin')} />
                                {isRegenerating
                                    ? t('admin.cloud_management.rotate_dialog.rotating')
                                    : t('admin.cloud_management.rotate_dialog.confirm')}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <WidgetRenderer widgets={getWidgets('admin-cloud-management', 'bottom-of-page')} />
        </>
    );
}
