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
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border',
                connected
                    ? 'bg-primary/10 text-primary border-primary/20'
                    : 'bg-muted/50 text-muted-foreground border-border/50',
            )}
        >
            {connected ? (
                <CheckCircle2 className='h-3.5 w-3.5' />
            ) : (
                <XCircle className='h-3.5 w-3.5' />
            )}
            {connected
                ? t('admin.cloud_management.connection_status.active')
                : t('admin.cloud_management.connection_status.inactive')}
        </span>
    );
}

export default function CloudManagementPage() {
    const { t } = useTranslation();
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
            toast.error('Failed to load cloud credentials');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

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
                toast.warning(
                    'Cloud credentials are empty. Premium plugins cannot be downloaded until FeatherCloud credentials are configured.',
                );
            } else {
                toast.success('Cloud credentials rotated');
            }
        } catch (error) {
            toast.error('Failed to rotate cloud credentials');
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
                toast.error('Failed to generate OAuth2 link');
            }
        } catch (error) {
            toast.error('Failed to generate OAuth2 link');
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

    return (
        <div className='space-y-6 md:space-y-8'>
            <PageHeader
                title={t('admin.cloud_management.title')}
                description={t('admin.cloud_management.subtitle')}
                icon={Cloud}
                actions={
                    <div className='flex flex-wrap items-center gap-2'>
                        <Button variant='outline' size='sm' disabled={isLoading || isLinking} onClick={fetchKeys}>
                            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
                            {t('admin.cloud_management.refresh_status')}
                        </Button>
                        <Button
                            variant='outline'
                            size='sm'
                            disabled={isRegenerating || isLinking}
                            onClick={() => setShowRotateConfirmDialog(true)}
                        >
                            <Key className={cn('h-4 w-4 mr-2', isRegenerating && 'animate-spin')} />
                            {t('admin.cloud_management.rotate_keys')}
                        </Button>
                        <Button size='sm' disabled={isLinking || isRegenerating} onClick={linkWithFeatherCloud}>
                            <PlugZap className={cn('h-4 w-4 mr-2', isLinking && 'animate-spin')} />
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
                        <div className='rounded-xl border border-border/50 bg-muted/10 p-4'>
                            <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1'>
                                {t('admin.cloud_management.credentials.cloud_to_panel')}
                            </p>
                            <p className='text-sm text-foreground'>
                                {keys.cloudCredentials.lastRotatedAt
                                    ? new Date(keys.cloudCredentials.lastRotatedAt).toLocaleString()
                                    : t('admin.cloud_management.credentials.never_rotated')}
                            </p>
                        </div>
                        <div className='rounded-xl border border-border/50 bg-muted/10 p-4'>
                            <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1'>
                                {t('admin.cloud_management.credentials.panel_to_cloud')}
                            </p>
                            <p className='text-sm text-foreground'>
                                {keys.panelCredentials.lastRotatedAt
                                    ? new Date(keys.panelCredentials.lastRotatedAt).toLocaleString()
                                    : t('admin.cloud_management.credentials.never_rotated')}
                            </p>
                        </div>
                    </div>
                </PageCard>
            )}

            <PageCard
                title={t('admin.cloud_management.features.title')}
                icon={Store}
            >
                <ul className='space-y-4'>
                    <li className='flex gap-4 rounded-xl border border-border/50 bg-muted/5 p-4'>
                        <div className='h-10 w-10 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center'>
                            <Brain className='h-5 w-5 text-primary' />
                        </div>
                        <div className='min-w-0'>
                            <p className='font-semibold text-foreground'>
                                {t('admin.cloud_management.features.feather_ai.title')}
                            </p>
                            <p className='text-sm text-muted-foreground mt-0.5'>
                                {t('admin.cloud_management.features.feather_ai.description')}
                            </p>
                            <span className='mt-2 inline-block text-xs font-medium text-primary border border-primary/20 bg-primary/10 px-2 py-0.5 rounded-md'>
                                {t('admin.cloud_management.features.feather_ai.coming_soon')}
                            </span>
                        </div>
                    </li>
                    <li className='flex gap-4 rounded-xl border border-border/50 bg-muted/5 p-4'>
                        <div className='h-10 w-10 shrink-0 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center'>
                            <Store className='h-5 w-5 text-amber-600 dark:text-amber-400' />
                        </div>
                        <div className='min-w-0'>
                            <p className='font-semibold text-foreground'>
                                {t('admin.cloud_management.features.premium_plugins.title')}
                            </p>
                            <p className='text-sm text-muted-foreground mt-0.5'>
                                {t('admin.cloud_management.features.premium_plugins.description')}
                            </p>
                            <span className='mt-2 inline-block text-xs font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 rounded-md'>
                                {t('admin.cloud_management.features.premium_plugins.premium')}
                            </span>
                        </div>
                    </li>
                    <li className='flex gap-4 rounded-xl border border-border/50 bg-muted/5 p-4'>
                        <div className='h-10 w-10 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center'>
                            <ShieldCheck className='h-5 w-5 text-primary' />
                        </div>
                        <div className='min-w-0'>
                            <p className='font-semibold text-foreground'>
                                {t('admin.cloud_management.features.cloud_intelligence.title')}
                            </p>
                            <p className='text-sm text-muted-foreground mt-0.5'>
                                {t('admin.cloud_management.features.cloud_intelligence.description')}
                            </p>
                            <span className='mt-2 inline-block text-xs font-medium text-primary border border-primary/20 bg-primary/10 px-2 py-0.5 rounded-md'>
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
                                className={cn('h-4 w-4 mr-2', (isRefreshingCloudData || cloudLoading) && 'animate-spin')}
                            />
                            {t('admin.cloud_management.cloud_info.refresh')}
                        </Button>
                    }
                >
                    {cloudLoading || isRefreshingCloudData ? (
                        <div className='flex items-center justify-center py-12'>
                            <RefreshCw className='h-8 w-8 animate-spin text-muted-foreground' />
                        </div>
                    ) : (
                        <div className='grid gap-4 sm:grid-cols-3'>
                            {cloudTeam && (
                                <div className='rounded-xl border border-border/50 bg-muted/10 p-4 flex items-center gap-3'>
                                    <div className='h-10 w-10 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center'>
                                        <Users className='h-5 w-5 text-primary' />
                                    </div>
                                    <div className='min-w-0'>
                                        <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                                            {t('admin.cloud_management.cloud_info.team')}
                                        </p>
                                        <p className='font-semibold text-foreground truncate'>{cloudTeam.team.name}</p>
                                        {cloudTeam.team.description && (
                                            <p className='text-sm text-muted-foreground truncate'>
                                                {cloudTeam.team.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                            {cloudCredits && (
                                <div className='rounded-xl border border-border/50 bg-muted/10 p-4 flex items-center gap-3'>
                                    <div className='h-10 w-10 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center'>
                                        <Coins className='h-5 w-5 text-primary' />
                                    </div>
                                    <div className='min-w-0'>
                                        <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                                            {t('admin.cloud_management.cloud_info.total_credits')}
                                        </p>
                                        <p className='font-semibold text-foreground'>
                                            {cloudCredits.total_credits.toLocaleString()}
                                        </p>
                                        <p className='text-sm text-muted-foreground'>
                                            {t('admin.cloud_management.cloud_info.team_members', {
                                                count: cloudCredits.member_count.toString(),
                                            })}
                                        </p>
                                    </div>
                                </div>
                            )}
                            {cloudSummary && (
                                <div className='rounded-xl border border-border/50 bg-muted/10 p-4 flex items-center gap-3'>
                                    <div className='h-10 w-10 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center'>
                                        <BarChart3 className='h-5 w-5 text-primary' />
                                    </div>
                                    <div className='min-w-0'>
                                        <p className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                                            {t('admin.cloud_management.cloud_info.total_purchases')}
                                        </p>
                                        <p className='font-semibold text-foreground'>
                                            {cloudSummary.statistics.total_purchases}
                                        </p>
                                        <p className='text-sm text-muted-foreground truncate'>
                                            {cloudSummary.cloud.cloud_name}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </PageCard>
            )}

            <PageCard
                title={t('admin.cloud_management.security.title')}
                icon={LockKeyhole}
            >
                <div className='grid gap-4 sm:grid-cols-2'>
                    <div className='flex gap-3 rounded-xl border border-border/50 bg-muted/5 p-4'>
                        <Key className='h-5 w-5 shrink-0 text-muted-foreground' />
                        <div>
                            <p className='font-semibold text-foreground'>
                                {t('admin.cloud_management.security.identification.title')}
                            </p>
                            <p className='text-sm text-muted-foreground mt-0.5'>
                                {t('admin.cloud_management.security.identification.description')}
                            </p>
                        </div>
                    </div>
                    <div className='flex gap-3 rounded-xl border border-border/50 bg-muted/5 p-4'>
                        <LockKeyhole className='h-5 w-5 shrink-0 text-muted-foreground' />
                        <div>
                            <p className='font-semibold text-foreground'>
                                {t('admin.cloud_management.security.privacy.title')}
                            </p>
                            <p className='text-sm text-muted-foreground mt-0.5'>
                                {t('admin.cloud_management.security.privacy.description')}
                            </p>
                        </div>
                    </div>
                    <div className='flex gap-3 rounded-xl border border-border/50 bg-muted/5 p-4'>
                        <ShieldCheck className='h-5 w-5 shrink-0 text-muted-foreground' />
                        <div>
                            <p className='font-semibold text-foreground'>
                                {t('admin.cloud_management.security.permissions.title')}
                            </p>
                            <p className='text-sm text-muted-foreground mt-0.5'>
                                {t('admin.cloud_management.security.permissions.description')}
                            </p>
                        </div>
                    </div>
                    <div className='flex gap-3 rounded-xl border border-border/50 bg-muted/5 p-4'>
                        <BarChart3 className='h-5 w-5 shrink-0 text-muted-foreground' />
                        <div>
                            <p className='font-semibold text-foreground'>
                                {t('admin.cloud_management.security.audit.title')}
                            </p>
                            <p className='text-sm text-muted-foreground mt-0.5'>
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
                <div className='rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3'>
                    <p className='text-sm font-semibold text-foreground'>
                        {t('admin.cloud_management.oauth2.how_it_works')}
                    </p>
                    <ul className='list-disc list-inside space-y-1 text-sm text-muted-foreground'>
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
                            <RefreshCw className='h-5 w-5 text-primary' />
                            {t('admin.cloud_management.rotate_dialog.title')}
                        </AlertDialogTitle>
                        <AlertDialogDescription className='space-y-3 pt-2'>
                            <p className='text-sm text-foreground'>
                                {t('admin.cloud_management.rotate_dialog.description')}
                            </p>
                            <div className='rounded-xl border border-border/50 bg-muted/10 p-3 space-y-2'>
                                <p className='text-sm font-semibold text-foreground'>
                                    {t('admin.cloud_management.rotate_dialog.important')}
                                </p>
                                <ul className='list-disc list-inside space-y-1 text-sm text-muted-foreground'>
                                    <li>{t('admin.cloud_management.rotate_dialog.warning1')}</li>
                                    <li>{t('admin.cloud_management.rotate_dialog.warning2')}</li>
                                    <li>{t('admin.cloud_management.rotate_dialog.warning3')}</li>
                                    {!hasCloudKeys && (
                                        <li className='font-semibold text-foreground'>
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
                            <RefreshCw className={cn('h-4 w-4 mr-2', isRegenerating && 'animate-spin')} />
                            {isRegenerating
                                ? t('admin.cloud_management.rotate_dialog.rotating')
                                : t('admin.cloud_management.rotate_dialog.confirm')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
