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

import { useEffect, useState } from 'react';
import {
    Package,
    Download,
    ExternalLink,
    ShieldCheck,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Cpu,
    X,
    AlertTriangle,
    RefreshCcw,
} from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { ChangelogSection } from './ChangelogSection';
import { IntegrityCheckDialog } from './IntegrityCheckDialog';
import { useTranslation } from '@/contexts/TranslationContext';
import { adminSettingsApi } from '@/lib/admin-settings-api';
import { isDockerUpdateTriggerLikelyStartedError } from '@/lib/is-docker-update-connection-loss';
import { toast } from 'sonner';

const UPDATE_PROGRESS_STORAGE_KEY = 'featherpanel:update_in_progress';
const UPDATE_PROGRESS_TTL_MS = 10 * 60 * 1000;

interface ChangelogData {
    changelog_added?: string[];
    changelog_fixed?: string[];
    changelog_improved?: string[];
    changelog_updated?: string[];
    changelog_removed?: string[];
    release_description?: string;
}

interface VersionInfoWidgetProps {
    version?: {
        current: {
            version: string;
            type: string;
            release_name: string;
            release_description?: string;
            php_version?: string;
            changelog_added?: string[];
            changelog_fixed?: string[];
            changelog_improved?: string[];
            changelog_updated?: string[];
            changelog_removed?: string[];
        } | null;
        latest: {
            version: string;
            type: string;
            release_description?: string;
            changelog_added?: string[];
            changelog_fixed?: string[];
            changelog_improved?: string[];
            changelog_updated?: string[];
            changelog_removed?: string[];
        } | null;
        update_available: boolean;
        last_checked: string | null;
        current_listed_on_update_server?: boolean;
    };
    loading?: boolean;
}

export function VersionInfoWidget({ version }: VersionInfoWidgetProps) {
    const { t } = useTranslation();
    const [showChangelog, setShowChangelog] = useState(version?.update_available ?? false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [integrityOpen, setIntegrityOpen] = useState(false);
    const [isUpdatingDocker, setIsUpdatingDocker] = useState(false);
    const [updateInProgress, setUpdateInProgress] = useState(() => {
        if (typeof window === 'undefined') return false;
        const raw = window.localStorage.getItem(UPDATE_PROGRESS_STORAGE_KEY);
        if (!raw) return false;
        const startedAt = Number(raw);
        if (Number.isFinite(startedAt) && Date.now() - startedAt <= UPDATE_PROGRESS_TTL_MS) {
            return true;
        }
        window.localStorage.removeItem(UPDATE_PROGRESS_STORAGE_KEY);
        return false;
    });

    useEffect(() => {
        if (!updateInProgress || typeof window === 'undefined') return;
        const interval = window.setInterval(() => {
            window.location.reload();
        }, 10000);
        return () => window.clearInterval(interval);
    }, [updateInProgress]);

    // Panel is reachable again after Docker update — stop "System update ongoing" and reload loop.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!version?.last_checked) return;
        window.localStorage.removeItem(UPDATE_PROGRESS_STORAGE_KEY);
        setUpdateInProgress(false);
    }, [version?.last_checked]);

    const isLatest = !version?.update_available;
    const current = version?.current;
    const latest = version?.latest;
    const normalizedCurrentVersion = (current?.version || '').trim().toLowerCase();
    const isCurrentVersionUnknown = normalizedCurrentVersion === '' || normalizedCurrentVersion === 'unknown';
    const isDevelopmentChannel = (current?.type || '').toLowerCase() === 'development';
    const isUnlistedOnUpdateServer = version?.current_listed_on_update_server === false;
    const hasLatestKnown = Boolean((latest?.version || '').trim());
    // Dev / custom / unlisted builds often report "no update" from the catalog but can still docker pull newer images.
    const canOfferManualDockerPull =
        hasLatestKnown && (isCurrentVersionUnknown || isDevelopmentChannel || isUnlistedOnUpdateServer);
    const showUpdateSection = !isLatest || canOfferManualDockerPull;
    const useManualPullMessaging = isLatest && canOfferManualDockerPull;

    const hasChangelog = (data: ChangelogData | null) => {
        if (!data) return false;
        return (
            (data.changelog_added?.length || 0) > 0 ||
            (data.changelog_fixed?.length || 0) > 0 ||
            (data.changelog_improved?.length || 0) > 0 ||
            (data.changelog_updated?.length || 0) > 0 ||
            (data.changelog_removed?.length || 0) > 0
        );
    };

    const changelogData = version?.update_available ? latest : current;

    const handleUpdateNow = async () => {
        if (isUpdatingDocker || updateInProgress) return;

        setIsUpdatingDocker(true);
        try {
            const response = await adminSettingsApi.triggerDockerUpdate();
            if (response.success) {
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(UPDATE_PROGRESS_STORAGE_KEY, String(Date.now()));
                }
                setUpdateInProgress(true);
                setShowUpdateModal(true);
                toast.success(response.message || t('admin.settings.docker_update.success'));
                return;
            }

            toast.error(response.message || t('admin.settings.docker_update.failed'));
        } catch (error: unknown) {
            if (isDockerUpdateTriggerLikelyStartedError(error)) {
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(UPDATE_PROGRESS_STORAGE_KEY, String(Date.now()));
                }
                setUpdateInProgress(true);
                setShowUpdateModal(true);
                return;
            }
            toast.error(t('admin.settings.docker_update.failed'));
        } finally {
            setIsUpdatingDocker(false);
        }
    };

    return (
        <PageCard title={t('admin.version.title')} description={t('admin.version.description')} icon={Package}>
            <div className='space-y-4 md:space-y-6'>
                <div className='bg-secondary/30 border-border/50 flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:rounded-3xl md:p-4'>
                    <div className='min-w-0 space-y-1'>
                        <p className='text-muted-foreground text-[9px] font-black tracking-widest uppercase md:text-[10px]'>
                            {t('admin.version.current_build')}
                        </p>
                        <h4 className='truncate text-lg font-black md:text-xl'>{current?.version || 'unknown'}</h4>
                    </div>
                    <div className='shrink-0 space-y-1 text-left sm:text-right'>
                        <p className='text-muted-foreground text-[9px] font-black tracking-widest uppercase md:text-[10px]'>
                            {t('admin.version.release_type')}
                        </p>
                        <span className='bg-primary/20 text-primary border-primary/30 inline-block rounded-full border px-2 py-1 text-[9px] font-black tracking-widest uppercase md:px-3 md:text-[10px]'>
                            {current?.type || 'Stable'}
                        </span>
                    </div>
                </div>

                {version?.current_listed_on_update_server === false && Boolean(current?.version) ? (
                    <div
                        className='flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-amber-600 md:rounded-2xl md:p-4 dark:text-amber-400'
                        role='status'
                    >
                        <AlertTriangle className='mt-0.5 h-5 w-5 shrink-0' aria-hidden />
                        <div className='min-w-0 space-y-1'>
                            <p className='text-[10px] font-black tracking-wide uppercase md:text-xs'>
                                {t('admin.version.unlisted_update_server_badge')}
                            </p>
                            <p className='text-[10px] leading-relaxed font-medium opacity-90 md:text-xs'>
                                {t('admin.version.unlisted_update_server_hint')}
                            </p>
                        </div>
                    </div>
                ) : null}

                <div className='flex flex-col gap-3'>
                    {!showUpdateSection ? (
                        <div className='flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4 text-emerald-500'>
                            <div className='flex items-center gap-3'>
                                <CheckCircle2 className='h-5 w-5' />
                                <p className='text-sm font-bold'>{t('admin.version.up_to_date')}</p>
                            </div>
                            <Link
                                href='/admin/updates'
                                className='rounded-lg bg-emerald-500/10 px-3 py-1 text-[10px] font-black tracking-widest uppercase transition-colors hover:bg-emerald-500/20'
                            >
                                {t('common.view')}
                            </Link>
                        </div>
                    ) : (
                        <div className='flex flex-col gap-4 rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5 text-amber-500'>
                            <div className='flex items-center justify-between gap-3'>
                                <div className='flex items-center gap-3'>
                                    <Download className='h-5 w-5 animate-bounce' />
                                    <div className='space-y-0.5'>
                                        <p className='text-sm font-black tracking-tight uppercase'>
                                            {useManualPullMessaging
                                                ? t('admin.version.docker_pull_offer_title')
                                                : isCurrentVersionUnknown
                                                  ? t('admin.version.current_version_unknown')
                                                  : t('admin.version.update_available', {
                                                        version: latest?.version || 'Unknown',
                                                    })}
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    href='/admin/updates'
                                    className='rounded-lg bg-amber-500 px-3 py-1 text-[10px] font-black tracking-widest text-amber-950 uppercase transition-colors hover:bg-amber-400'
                                >
                                    {t('admin_updates.title')}
                                </Link>
                            </div>
                            <button
                                onClick={() => setShowUpdateModal(true)}
                                disabled={isUpdatingDocker || updateInProgress}
                                className='w-full rounded-xl border border-amber-500/20 bg-amber-500/10 py-3 text-[10px] font-black tracking-widest text-amber-500 uppercase transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60'
                            >
                                {isUpdatingDocker
                                    ? t('admin.settings.docker_update.updating')
                                    : t('admin.version.update_now')}
                            </button>
                        </div>
                    )}

                    {current?.php_version && (
                        <div className='bg-primary/5 border-primary/10 flex items-center gap-2 rounded-xl border p-3 md:gap-3 md:rounded-2xl md:p-4'>
                            <Cpu className='text-primary h-4 w-4 shrink-0' />
                            <p className='text-muted-foreground text-[10px] font-bold wrap-break-word md:text-xs'>
                                {t('admin.version.recommended_php')}{' '}
                                <span className='text-foreground'>{current.php_version}</span>
                            </p>
                        </div>
                    )}

                    {(current?.release_description || latest?.release_description) && (
                        <div className='bg-muted/20 border-border/50 rounded-xl border p-3 md:rounded-2xl md:p-4'>
                            <div className='prose prose-sm prose-invert text-muted-foreground max-w-none text-[10px] leading-relaxed md:text-xs'>
                                <ReactMarkdown>
                                    {version?.update_available
                                        ? latest?.release_description
                                        : current?.release_description}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {hasChangelog(changelogData as ChangelogData) && (
                        <div className='space-y-3'>
                            <button
                                onClick={() => setShowChangelog(!showChangelog)}
                                className='bg-muted/10 border-border/40 hover:bg-muted/20 group flex w-full items-center justify-between rounded-xl border p-3 transition-all md:rounded-2xl md:p-4'
                            >
                                <div className='flex min-w-0 items-center gap-2'>
                                    <Package className='text-primary h-4 w-4 shrink-0' />
                                    <span className='truncate text-[9px] font-black tracking-widest uppercase md:text-[10px]'>
                                        {t('admin.version.view_changelog')}
                                    </span>
                                </div>
                                {showChangelog ? (
                                    <ChevronUp className='h-4 w-4 shrink-0 opacity-50' />
                                ) : (
                                    <ChevronDown className='h-4 w-4 shrink-0 opacity-50' />
                                )}
                            </button>

                            {showChangelog && (
                                <div className='bg-muted/5 border-border/30 animate-in fade-in slide-in-from-top-2 space-y-6 rounded-2xl border p-4 duration-300 md:space-y-8 md:rounded-3xl md:p-6'>
                                    <ChangelogSection
                                        title={t('admin.version.changelog.added')}
                                        items={changelogData?.changelog_added || []}
                                        color='emerald'
                                        icon='+'
                                    />
                                    <ChangelogSection
                                        title={t('admin.version.changelog.fixed')}
                                        items={changelogData?.changelog_fixed || []}
                                        color='red'
                                        icon='!'
                                    />
                                    <ChangelogSection
                                        title={t('admin.version.changelog.improved')}
                                        items={changelogData?.changelog_improved || []}
                                        color='blue'
                                        icon='~'
                                    />
                                    <ChangelogSection
                                        title={t('admin.version.changelog.updated')}
                                        items={changelogData?.changelog_updated || []}
                                        color='amber'
                                        icon='^'
                                    />
                                    <ChangelogSection
                                        title={t('admin.version.changelog.removed')}
                                        items={changelogData?.changelog_removed || []}
                                        color='purple'
                                        icon='-'
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    <div className='mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 md:gap-3'>
                        <Link
                            href='/admin/updates'
                            className='bg-muted/20 border-border/50 hover:bg-muted/30 group flex items-center justify-center gap-2 rounded-xl border p-2.5 text-[9px] font-black tracking-widest uppercase transition-all md:p-3 md:text-[10px]'
                        >
                            <RefreshCcw className='text-primary h-3.5 w-3.5 shrink-0 transition-transform duration-500 group-hover:rotate-180 md:h-4 md:w-4' />
                            <span className='truncate'>{t('admin_updates.title')}</span>
                        </Link>
                        <button
                            type='button'
                            onClick={() => setIntegrityOpen(true)}
                            className='bg-muted/20 border-border/50 hover:bg-muted/30 group flex items-center justify-center gap-2 rounded-xl border p-2.5 text-[9px] font-black tracking-widest uppercase transition-all md:p-3 md:text-[10px]'
                        >
                            <ShieldCheck className='text-primary h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110 md:h-4 md:w-4' />
                            <span className='truncate'>{t('admin.version.verify_integrity')}</span>
                        </button>
                        <a
                            href='https://featherpanel.com'
                            target='_blank'
                            rel='noopener noreferrer'
                            className='bg-muted/20 border-border/50 hover:bg-muted/30 group flex items-center justify-center gap-2 rounded-xl border p-2.5 text-[9px] font-black tracking-widest uppercase transition-all md:p-3 md:text-[10px]'
                        >
                            <ExternalLink className='text-primary h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110 md:h-4 md:w-4' />
                            <span className='truncate'>{t('admin.version.official_site')}</span>
                        </a>
                    </div>

                    {version?.last_checked && (
                        <p className='text-muted-foreground text-center text-[9px] font-bold tracking-widest uppercase opacity-40'>
                            {t('admin.version.last_checked', { date: new Date(version.last_checked).toLocaleString() })}
                        </p>
                    )}
                </div>
            </div>

            <IntegrityCheckDialog open={integrityOpen} onOpenChange={setIntegrityOpen} />

            {showUpdateModal && !updateInProgress && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'>
                    <div className='bg-background border-border animate-in fade-in zoom-in-95 w-full max-w-xl rounded-2xl border shadow-2xl duration-300 md:rounded-3xl'>
                        <div className='border-border bg-card/50 border-b p-4 backdrop-blur-xl md:p-6'>
                            <h2 className='text-lg font-black md:text-2xl'>
                                {t('admin.settings.docker_update.confirm_modal.title')}
                            </h2>
                            <p className='text-muted-foreground mt-2 text-sm leading-relaxed md:text-base'>
                                {t('admin.settings.docker_update.confirm_modal.description')}
                            </p>
                        </div>
                        <div className='flex justify-end gap-2 p-4 md:p-6'>
                            <button
                                onClick={() => setShowUpdateModal(false)}
                                className='border-border hover:bg-muted rounded-xl border px-4 py-2 text-sm font-semibold transition-colors md:px-6 md:py-3 md:text-base'
                            >
                                {t('admin.settings.docker_update.confirm_modal.cancel')}
                            </button>
                            <button
                                onClick={handleUpdateNow}
                                disabled={isUpdatingDocker}
                                className='bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 md:px-6 md:py-3 md:text-base'
                            >
                                {isUpdatingDocker
                                    ? t('admin.settings.docker_update.updating')
                                    : t('admin.settings.docker_update.confirm_modal.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showUpdateModal && updateInProgress && (
                <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'>
                    <div className='bg-background border-border animate-in fade-in zoom-in-95 w-full max-w-xl rounded-2xl border shadow-2xl duration-300 md:rounded-3xl'>
                        <div className='border-border bg-card/50 flex items-center justify-between border-b p-4 backdrop-blur-xl md:p-6'>
                            <div>
                                <h2 className='text-lg font-black md:text-2xl'>
                                    {t('admin.settings.docker_update.progress_modal.title')}
                                </h2>
                            </div>
                            <X className='text-muted-foreground/60 h-5 w-5 shrink-0' />
                        </div>
                        <div className='p-4 md:p-6'>
                            <p className='text-muted-foreground text-sm leading-relaxed md:text-base'>
                                {t('admin.settings.docker_update.progress_modal.description')}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </PageCard>
    );
}
