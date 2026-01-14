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

import { toast } from 'sonner';

import React, { useState } from 'react';
import { Package, Download, ExternalLink, ShieldCheck, CheckCircle2, ChevronDown, ChevronUp, Cpu } from 'lucide-react';
import { PageCard } from '@/components/featherui/PageCard';
import ReactMarkdown from 'react-markdown';
import { ChangelogSection } from './ChangelogSection';

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
    };
    loading?: boolean;
}

import { useTranslation } from '@/contexts/TranslationContext';

// ... imports

export function VersionInfoWidget({ version }: VersionInfoWidgetProps) {
    const { t } = useTranslation();
    const [showChangelog, setShowChangelog] = useState(version?.update_available ?? false);

    const isLatest = !version?.update_available;
    const current = version?.current;
    const latest = version?.latest;

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

    return (
        <PageCard title={t('admin.version.title')} description={t('admin.version.description')} icon={Package}>
            <div className='space-y-4 md:space-y-6'>
                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 md:p-4 rounded-2xl md:rounded-3xl bg-secondary/30 border border-border/50'>
                    <div className='space-y-1 min-w-0'>
                        <p className='text-[9px] md:text-[10px] font-black uppercase text-muted-foreground tracking-widest'>
                            {t('admin.version.current_build')}
                        </p>
                        <h4 className='text-lg md:text-xl font-black truncate'>{current?.version || 'unknown'}</h4>
                    </div>
                    <div className='text-left sm:text-right space-y-1 shrink-0'>
                        <p className='text-[9px] md:text-[10px] font-black uppercase text-muted-foreground tracking-widest'>
                            {t('admin.version.release_type')}
                        </p>
                        <span className='inline-block px-2 md:px-3 py-1 rounded-full bg-primary/20 text-primary text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-primary/30'>
                            {current?.type || 'Stable'}
                        </span>
                    </div>
                </div>

                <div className='flex flex-col gap-3'>
                    {isLatest ? (
                        <div className='flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-500'>
                            <CheckCircle2 className='h-5 w-5' />
                            <p className='text-sm font-bold'>{t('admin.version.up_to_date')}</p>
                        </div>
                    ) : (
                        <div className='flex flex-col gap-4 p-5 rounded-3xl bg-amber-500/5 border border-amber-500/20 text-amber-500'>
                            <div className='flex items-center gap-3'>
                                <Download className='h-5 w-5 animate-bounce' />
                                <div className='space-y-0.5'>
                                    <p className='text-sm font-black uppercase tracking-tight'>
                                        {t('admin.version.update_available', { version: latest?.version || 'Unknown' })}
                                    </p>
                                    <p className='text-[10px] font-bold uppercase opacity-70'>
                                        {t('admin.version.update_description')}
                                    </p>
                                </div>
                            </div>
                            <button className='w-full py-3 rounded-xl bg-amber-500 text-amber-950 text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20'>
                                {t('admin.version.update_now')}
                            </button>
                        </div>
                    )}

                    {current?.php_version && (
                        <div className='flex items-center gap-2 md:gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl bg-primary/5 border border-primary/10'>
                            <Cpu className='h-4 w-4 text-primary shrink-0' />
                            <p className='text-[10px] md:text-xs font-bold text-muted-foreground break-words'>
                                {t('admin.version.recommended_php')}{' '}
                                <span className='text-foreground'>{current.php_version}</span>
                            </p>
                        </div>
                    )}

                    {(current?.release_description || latest?.release_description) && (
                        <div className='p-3 md:p-4 rounded-xl md:rounded-2xl bg-muted/20 border border-border/50'>
                            <div className='prose prose-sm prose-invert max-w-none text-[10px] md:text-xs text-muted-foreground leading-relaxed'>
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
                                className='flex items-center justify-between w-full p-3 md:p-4 rounded-xl md:rounded-2xl bg-muted/10 border border-border/40 hover:bg-muted/20 transition-all group'
                            >
                                <div className='flex items-center gap-2 min-w-0'>
                                    <Package className='h-4 w-4 text-primary shrink-0' />
                                    <span className='text-[9px] md:text-[10px] font-black uppercase tracking-widest truncate'>
                                        {t('admin.version.view_changelog')}
                                    </span>
                                </div>
                                {showChangelog ? (
                                    <ChevronUp className='h-4 w-4 opacity-50 shrink-0' />
                                ) : (
                                    <ChevronDown className='h-4 w-4 opacity-50 shrink-0' />
                                )}
                            </button>

                            {showChangelog && (
                                <div className='p-4 md:p-6 rounded-2xl md:rounded-3xl bg-muted/5 border border-border/30 space-y-6 md:space-y-8 animate-in fade-in slide-in-from-top-2 duration-300'>
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
                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 mt-2'>
                        <button
                            onClick={() =>
                                toast.info('Integrity Check', { description: t('admin.version.integrity_coming_soon') })
                            }
                            className='flex items-center justify-center gap-2 p-2.5 md:p-3 rounded-xl bg-muted/20 border border-border/50 hover:bg-muted/30 transition-all text-[9px] md:text-[10px] font-black uppercase tracking-widest group'
                        >
                            <ShieldCheck className='h-3.5 w-3.5 md:h-4 md:w-4 text-primary group-hover:scale-110 transition-transform shrink-0' />
                            <span className='truncate'>{t('admin.version.verify_integrity')}</span>
                        </button>
                        <a
                            href='https://featherpanel.com'
                            target='_blank'
                            rel='noopener noreferrer'
                            className='flex items-center justify-center gap-2 p-2.5 md:p-3 rounded-xl bg-muted/20 border border-border/50 hover:bg-muted/30 transition-all text-[9px] md:text-[10px] font-black uppercase tracking-widest group'
                        >
                            <ExternalLink className='h-3.5 w-3.5 md:h-4 md:w-4 text-primary group-hover:scale-110 transition-transform shrink-0' />
                            <span className='truncate'>{t('admin.version.official_site')}</span>
                        </a>
                    </div>

                    {version?.last_checked && (
                        <p className='text-[9px] font-bold text-center text-muted-foreground uppercase tracking-widest opacity-40'>
                            {t('admin.version.last_checked', { date: new Date(version.last_checked).toLocaleString() })}
                        </p>
                    )}
                </div>
            </div>
        </PageCard>
    );
}
