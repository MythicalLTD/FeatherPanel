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
    Cpu,
    X,
    AlertTriangle,
    RefreshCcw,
} from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import Link from 'next/link';
import { ReleaseNotesPanel } from './ReleaseNotesPanel';
import { IntegrityCheckDialog } from './IntegrityCheckDialog';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { adminSettingsApi } from '@/lib/admin-settings-api';
import { isDockerUpdateTriggerLikelyStartedError } from '@/lib/is-docker-update-connection-loss';
import { toast } from 'sonner';

const UPDATE_PROGRESS_STORAGE_KEY = 'featherpanel:update_in_progress';
const UPDATE_PROGRESS_TTL_MS = 10 * 60 * 1000;

interface VersionDetails {
    version: string;
    type: string;
    release_name?: string;
    release_description?: string;
    description?: string;
    php_version?: string;
    min_supported_php?: string | null;
    max_supported_php?: string | null;
    is_security_release?: boolean;
    github_html_url?: string | null;
    published_at?: string | null;
    changelog_added?: string[];
    changelog_fixed?: string[];
    changelog_improved?: string[];
    changelog_updated?: string[];
    changelog_removed?: string[];
}

interface VersionInfoWidgetProps {
    version?: {
        current: VersionDetails | null;
        latest: VersionDetails | null;
        update_available: boolean;
        last_checked: string | null;
        runtime_php?: string;
        current_listed_on_update_server?: boolean;
        project?: {
            name?: string;
            slug?: string;
            description?: string;
            github_url?: string | null;
            default_type?: string;
            min_supported_php?: string | null;
            max_supported_php?: string | null;
        } | null;
    };
    loading?: boolean;
}

export function VersionInfoWidget({ version, loading }: VersionInfoWidgetProps) {
    const { t } = useTranslation();
    const { settings } = useSettings();
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
    const settingsVersion = (settings?.app_version || '').replace(/^v/i, '').trim();
    const current = version?.current
        ? version.current
        : settingsVersion
          ? {
                version: settingsVersion,
                type: 'Stable',
                release_name: 'FeatherPanel',
            }
          : null;
    const latest = version?.latest;
    const normalizedCurrentVersion = (current?.version || '').trim().toLowerCase();
    const isCurrentVersionUnknown =
        !loading && (normalizedCurrentVersion === '' || normalizedCurrentVersion === 'unknown');
    const isDevelopmentChannel = (current?.type || '').toLowerCase() === 'development';
    const isUnlistedOnUpdateServer = version?.current_listed_on_update_server === false;
    const hasLatestKnown = Boolean((latest?.version || '').trim());
    // Dev / custom / unlisted builds often report "no update" from the catalog but can still docker pull newer images.
    const canOfferManualDockerPull =
        hasLatestKnown && (isCurrentVersionUnknown || isDevelopmentChannel || isUnlistedOnUpdateServer);
    const showUpdateSection = !isLatest || canOfferManualDockerPull;
    const useManualPullMessaging = isLatest && canOfferManualDockerPull;

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
                <div className='grid gap-3 sm:grid-cols-2'>
                    <div className='bg-secondary/30 border-border/50 rounded-2xl border p-3 md:rounded-3xl md:p-4'>
                        <p className='text-muted-foreground text-[9px] font-black tracking-widest uppercase md:text-[10px]'>
                            {t('admin.version.current_build')}
                        </p>
                        <h4 className='mt-1 truncate text-lg font-black md:text-xl'>
                            {loading ? '…' : current?.version || 'unknown'}
                        </h4>
                        {current?.release_name ? (
                            <p className='text-muted-foreground mt-1 truncate text-[10px] font-medium md:text-xs'>
                                {current.release_name}
                            </p>
                        ) : null}
                        {current?.published_at ? (
                            <p className='text-muted-foreground mt-1 text-[9px] font-medium md:text-[10px]'>
                                {t('admin.version.published_at', {
                                    date: new Date(
                                        current.published_at.includes('T')
                                            ? current.published_at
                                            : current.published_at.replace(' ', 'T') + 'Z',
                                    ).toLocaleDateString(),
                                })}
                            </p>
                        ) : null}
                        <div className='mt-3 flex flex-wrap items-center gap-2'>
                            <span className='bg-primary/20 text-primary border-primary/30 inline-block rounded-full border px-2 py-1 text-[9px] font-black tracking-widest uppercase md:px-3 md:text-[10px]'>
                                {current?.type || 'Stable'}
                            </span>
                            {current?.is_security_release ? (
                                <span className='inline-block rounded-full border border-rose-500/30 bg-rose-500/15 px-2 py-1 text-[9px] font-black tracking-widest text-rose-500 uppercase md:px-3 md:text-[10px]'>
                                    {t('admin.version.security_release')}
                                </span>
                            ) : null}
                        </div>
                    </div>

                    <div className='bg-secondary/30 border-border/50 rounded-2xl border p-3 md:rounded-3xl md:p-4'>
                        <p className='text-muted-foreground text-[9px] font-black tracking-widest uppercase md:text-[10px]'>
                            {t('admin.version.latest_build')}
                        </p>
                        <h4 className='mt-1 truncate text-lg font-black md:text-xl'>
                            {loading ? '…' : latest?.version || current?.version || t('admin.version.no_releases_yet')}
                        </h4>
                        {latest?.release_name ? (
                            <p className='text-muted-foreground mt-1 truncate text-[10px] font-medium md:text-xs'>
                                {latest.release_name}
                            </p>
                        ) : null}
                        {latest?.published_at ? (
                            <p className='text-muted-foreground mt-1 text-[9px] font-medium md:text-[10px]'>
                                {t('admin.version.published_at', {
                                    date: new Date(
                                        latest.published_at.includes('T')
                                            ? latest.published_at
                                            : latest.published_at.replace(' ', 'T') + 'Z',
                                    ).toLocaleDateString(),
                                })}
                            </p>
                        ) : null}
                        <div className='mt-3 flex flex-wrap items-center gap-2'>
                            {latest?.type ? (
                                <span className='bg-primary/20 text-primary border-primary/30 inline-block rounded-full border px-2 py-1 text-[9px] font-black tracking-widest uppercase md:px-3 md:text-[10px]'>
                                    {latest.type}
                                </span>
                            ) : null}
                            {latest?.is_security_release ? (
                                <span className='inline-block rounded-full border border-rose-500/30 bg-rose-500/15 px-2 py-1 text-[9px] font-black tracking-widest text-rose-500 uppercase md:px-3 md:text-[10px]'>
                                    {t('admin.version.security_release')}
                                </span>
                            ) : null}
                        </div>
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

                    {(current?.php_version || version?.project?.min_supported_php || version?.runtime_php) && (
                        <div className='bg-primary/5 border-primary/10 flex flex-col gap-1.5 rounded-xl border p-3 md:rounded-2xl md:p-4'>
                            <div className='flex items-center gap-2 md:gap-3'>
                                <Cpu className='text-primary h-4 w-4 shrink-0' />
                                <p className='text-muted-foreground text-[10px] font-bold wrap-break-word md:text-xs'>
                                    {t('admin.version.recommended_php')}{' '}
                                    <span className='text-foreground'>
                                        {current?.php_version ||
                                            [version?.project?.min_supported_php, version?.project?.max_supported_php]
                                                .filter(Boolean)
                                                .join('–') ||
                                            '—'}
                                    </span>
                                </p>
                            </div>
                            {version?.runtime_php ? (
                                <p className='text-muted-foreground pl-6 text-[10px] font-bold md:text-xs'>
                                    {t('admin.version.running_php')}{' '}
                                    <span className='text-foreground'>{version.runtime_php}</span>
                                </p>
                            ) : null}
                        </div>
                    )}

                    {version?.project?.description ? (
                        <p className='text-muted-foreground text-[10px] leading-relaxed md:text-xs'>
                            {version.project.description}
                        </p>
                    ) : null}

                    <ReleaseNotesPanel
                        current={current}
                        latest={latest}
                        updateAvailable={Boolean(version?.update_available)}
                        defaultOpen={Boolean(version?.update_available)}
                    />

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
                        {(latest?.github_html_url || current?.github_html_url || version?.project?.github_url) && (
                            <a
                                href={
                                    (version?.update_available ? latest?.github_html_url : current?.github_html_url) ||
                                    version?.project?.github_url ||
                                    'https://github.com/MythicaLTD/FeatherPanel'
                                }
                                target='_blank'
                                rel='noopener noreferrer'
                                className='bg-muted/20 border-border/50 hover:bg-muted/30 group flex items-center justify-center gap-2 rounded-xl border p-2.5 text-[9px] font-black tracking-widest uppercase transition-all md:p-3 md:text-[10px]'
                            >
                                <ExternalLink className='text-primary h-3.5 w-3.5 shrink-0 transition-transform group-hover:scale-110 md:h-4 md:w-4' />
                                <span className='truncate'>{t('admin.version.view_on_github')}</span>
                            </a>
                        )}
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
