/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
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
import { ResourceCard } from '@/components/featherui/ResourceCard';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/ui/button';
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
        <div className='space-y-8 animate-in fade-in duration-700'>
            <PageHeader
                title={t('admin.cloud_management.title')}
                description={t('admin.cloud_management.subtitle')}
                icon={Cloud}
                actions={
                    <>
                        <Button variant='outline' disabled={isLoading || isLinking} onClick={fetchKeys}>
                            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
                            {t('admin.cloud_management.refresh_status')}
                        </Button>
                        <Button
                            variant='outline'
                            disabled={isRegenerating || isLinking}
                            onClick={() => setShowRotateConfirmDialog(true)}
                        >
                            <Key className={cn('h-4 w-4 mr-2', isRegenerating && 'animate-spin')} />
                            {t('admin.cloud_management.rotate_keys')}
                        </Button>
                        <Button disabled={isLinking || isRegenerating} onClick={linkWithFeatherCloud}>
                            <PlugZap className={cn('h-4 w-4 mr-2', isLinking && 'animate-spin')} />
                            {isLinking
                                ? t('admin.cloud_management.linking')
                                : isConnected
                                  ? t('admin.cloud_management.relink')
                                  : t('admin.cloud_management.link')}
                        </Button>
                    </>
                }
            />

            {/* Connection Status */}
            <ResourceCard
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
                badges={[
                    {
                        label: isConnected
                            ? t('admin.cloud_management.connection_status.active')
                            : t('admin.cloud_management.connection_status.inactive'),
                        className: isConnected
                            ? 'bg-green-500/10 text-green-600 border-green-500/20'
                            : 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
                    },
                ]}
                className={cn(
                    'shadow-none bg-card/50 backdrop-blur-sm',
                    isConnected ? 'border-green-500/20' : 'border-yellow-500/20',
                )}
            />

            {/* Credentials Info */}
            {isConnected && (
                <PageCard
                    title={t('admin.cloud_management.credentials.title')}
                    description={t('admin.cloud_management.credentials.description')}
                    icon={Key}
                >
                    <div className='grid gap-4 md:grid-cols-2'>
                        <div className='space-y-2'>
                            <p className='text-sm font-medium text-foreground'>
                                {t('admin.cloud_management.credentials.cloud_to_panel')}
                            </p>
                            <p className='text-sm text-muted-foreground'>
                                {keys.cloudCredentials.lastRotatedAt
                                    ? new Date(keys.cloudCredentials.lastRotatedAt).toLocaleString()
                                    : t('admin.cloud_management.credentials.never_rotated')}
                            </p>
                        </div>
                        <div className='space-y-2'>
                            <p className='text-sm font-medium text-foreground'>
                                {t('admin.cloud_management.credentials.panel_to_cloud')}
                            </p>
                            <p className='text-sm text-muted-foreground'>
                                {keys.panelCredentials.lastRotatedAt
                                    ? new Date(keys.panelCredentials.lastRotatedAt).toLocaleString()
                                    : t('admin.cloud_management.credentials.never_rotated')}
                            </p>
                        </div>
                    </div>
                </PageCard>
            )}

            {/* Feature Showcase */}
            <div className='space-y-4'>
                <h2 className='text-xl font-semibold text-foreground'>{t('admin.cloud_management.features.title')}</h2>
                <div className='grid gap-6 md:grid-cols-3'>
                    <ResourceCard
                        title={t('admin.cloud_management.features.feather_ai.title')}
                        description={t('admin.cloud_management.features.feather_ai.description')}
                        icon={Brain}
                        badges={[
                            {
                                label: t('admin.cloud_management.features.feather_ai.coming_soon'),
                                className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                            },
                        ]}
                        className='shadow-none bg-card/50 backdrop-blur-sm'
                    />

                    <ResourceCard
                        title={t('admin.cloud_management.features.premium_plugins.title')}
                        description={t('admin.cloud_management.features.premium_plugins.description')}
                        icon={Store}
                        badges={[
                            {
                                label: t('admin.cloud_management.features.premium_plugins.premium'),
                                className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                            },
                        ]}
                        className='shadow-none bg-card/50 backdrop-blur-sm'
                    />

                    <ResourceCard
                        title={t('admin.cloud_management.features.cloud_intelligence.title')}
                        description={t('admin.cloud_management.features.cloud_intelligence.description')}
                        icon={ShieldCheck}
                        badges={[
                            {
                                label: t('admin.cloud_management.features.cloud_intelligence.active'),
                                className: 'bg-green-500/10 text-green-600 border-green-500/20',
                            },
                        ]}
                        className='shadow-none bg-card/50 backdrop-blur-sm'
                    />
                </div>
            </div>

            {/* Cloud Statistics */}
            {isConnected && (cloudSummary || cloudCredits || cloudTeam) && (
                <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                        <h2 className='text-xl font-semibold text-foreground'>
                            {t('admin.cloud_management.cloud_info.title')}
                        </h2>
                        <Button
                            variant='outline'
                            size='sm'
                            disabled={isRefreshingCloudData || cloudLoading}
                            onClick={refreshCloudData}
                        >
                            <RefreshCw
                                className={cn(
                                    'h-4 w-4 mr-2',
                                    (isRefreshingCloudData || cloudLoading) && 'animate-spin',
                                )}
                            />
                            {t('admin.cloud_management.cloud_info.refresh')}
                        </Button>
                    </div>

                    {cloudLoading || isRefreshingCloudData ? (
                        <div className='flex items-center justify-center py-12'>
                            <div className='flex items-center gap-3'>
                                <div className='animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent'></div>
                                <span className='text-muted-foreground'>
                                    {t('admin.cloud_management.cloud_info.loading')}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className='grid gap-6 md:grid-cols-3'>
                            {cloudTeam && (
                                <ResourceCard
                                    title={cloudTeam.team.name}
                                    subtitle={t('admin.cloud_management.cloud_info.team')}
                                    description={cloudTeam.team.description || 'Your FeatherCloud team'}
                                    icon={Users}
                                    className='shadow-none bg-card/50 backdrop-blur-sm'
                                />
                            )}

                            {cloudCredits && (
                                <ResourceCard
                                    title={cloudCredits.total_credits.toLocaleString()}
                                    subtitle={t('admin.cloud_management.cloud_info.total_credits')}
                                    description={t('admin.cloud_management.cloud_info.team_members', {
                                        count: cloudCredits.member_count.toString(),
                                    })}
                                    icon={Coins}
                                    className='shadow-none bg-card/50 backdrop-blur-sm'
                                />
                            )}

                            {cloudSummary && (
                                <ResourceCard
                                    title={cloudSummary.statistics.total_purchases.toString()}
                                    subtitle={t('admin.cloud_management.cloud_info.total_purchases')}
                                    description={cloudSummary.cloud.cloud_name}
                                    icon={BarChart3}
                                    className='shadow-none bg-card/50 backdrop-blur-sm'
                                />
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Security Benefits */}
            <div className='space-y-4'>
                <h2 className='text-xl font-semibold text-foreground'>{t('admin.cloud_management.security.title')}</h2>
                <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
                    <ResourceCard
                        title={t('admin.cloud_management.security.identification.title')}
                        description={t('admin.cloud_management.security.identification.description')}
                        icon={Key}
                        className='shadow-none bg-card/50 backdrop-blur-sm'
                    />
                    <ResourceCard
                        title={t('admin.cloud_management.security.privacy.title')}
                        description={t('admin.cloud_management.security.privacy.description')}
                        icon={LockKeyhole}
                        className='shadow-none bg-card/50 backdrop-blur-sm'
                    />
                    <ResourceCard
                        title={t('admin.cloud_management.security.permissions.title')}
                        description={t('admin.cloud_management.security.permissions.description')}
                        icon={ShieldCheck}
                        className='shadow-none bg-card/50 backdrop-blur-sm'
                    />
                    <ResourceCard
                        title={t('admin.cloud_management.security.audit.title')}
                        description={t('admin.cloud_management.security.audit.description')}
                        icon={BarChart3}
                        className='shadow-none bg-card/50 backdrop-blur-sm'
                    />
                </div>
            </div>

            {/* OAuth2 Integration Info */}
            <PageCard
                title={t('admin.cloud_management.oauth2.title')}
                description={t('admin.cloud_management.oauth2.description')}
                icon={PlugZap}
            >
                <div className='space-y-4'>
                    <div className='rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 space-y-2'>
                        <p className='text-sm font-semibold text-blue-800 dark:text-blue-300'>
                            {t('admin.cloud_management.oauth2.how_it_works')}
                        </p>
                        <ul className='list-disc list-inside space-y-1 text-sm text-blue-700 dark:text-blue-400 pl-2'>
                            <li>{t('admin.cloud_management.oauth2.step1')}</li>
                            <li>{t('admin.cloud_management.oauth2.step2')}</li>
                            <li>{t('admin.cloud_management.oauth2.step3')}</li>
                            <li>{t('admin.cloud_management.oauth2.step4')}</li>
                        </ul>
                    </div>
                </div>
            </PageCard>

            {/* Rotate Keys Confirmation Dialog */}
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
                            <div className='rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 space-y-2'>
                                <p className='text-sm font-semibold text-yellow-800 dark:text-yellow-300'>
                                    {t('admin.cloud_management.rotate_dialog.important')}
                                </p>
                                <ul className='list-disc list-inside space-y-1 text-sm text-yellow-700 dark:text-yellow-400 pl-2'>
                                    <li>{t('admin.cloud_management.rotate_dialog.warning1')}</li>
                                    <li>{t('admin.cloud_management.rotate_dialog.warning2')}</li>
                                    <li>{t('admin.cloud_management.rotate_dialog.warning3')}</li>
                                    {!hasCloudKeys && (
                                        <li className='font-semibold'>
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
                            className='bg-primary hover:bg-primary/90'
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
