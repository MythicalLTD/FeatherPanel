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

import { useEffect, useMemo, useState } from 'react';
import { Calendar, Cpu, ExternalLink, Package, ShieldAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/contexts/TranslationContext';
import { ChangelogSection } from './ChangelogSection';

export interface ReleaseNotesVersion {
    version: string;
    type?: string;
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

type ReleaseTab = 'current' | 'latest';

function hasChangelog(data: ReleaseNotesVersion | null | undefined): boolean {
    if (!data) return false;
    return (
        (data.changelog_added?.length || 0) > 0 ||
        (data.changelog_fixed?.length || 0) > 0 ||
        (data.changelog_improved?.length || 0) > 0 ||
        (data.changelog_updated?.length || 0) > 0 ||
        (data.changelog_removed?.length || 0) > 0
    );
}

function releaseDescription(data: ReleaseNotesVersion | null | undefined): string {
    return (data?.release_description || data?.description || '').trim();
}

function hasReleaseContent(data: ReleaseNotesVersion | null | undefined): boolean {
    if (!data) return false;
    return (
        hasChangelog(data) ||
        Boolean(releaseDescription(data)) ||
        Boolean(data.published_at) ||
        Boolean(data.php_version) ||
        Boolean(data.github_html_url) ||
        Boolean(data.is_security_release)
    );
}

function formatPublishedAt(value: string | null | undefined): string | null {
    if (!value) return null;
    const date = new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
}

interface ReleaseNotesPanelProps {
    current?: ReleaseNotesVersion | null;
    latest?: ReleaseNotesVersion | null;
    updateAvailable?: boolean;
    defaultOpen?: boolean;
    className?: string;
}

export function ReleaseNotesPanel({
    current,
    latest,
    updateAvailable = false,
    defaultOpen = false,
    className,
}: ReleaseNotesPanelProps) {
    const { t } = useTranslation();

    const sameVersion =
        Boolean(current?.version) &&
        Boolean(latest?.version) &&
        current!.version.trim().toLowerCase() === latest!.version.trim().toLowerCase();

    const tabs = useMemo(() => {
        const items: { id: ReleaseTab; label: string; data: ReleaseNotesVersion | null | undefined }[] = [];
        if (hasReleaseContent(current)) {
            items.push({
                id: 'current',
                label: t('admin.version.changelog_tab_current', { version: current?.version || '—' }),
                data: current,
            });
        }
        if (hasReleaseContent(latest) && !sameVersion) {
            items.push({
                id: 'latest',
                label: t('admin.version.changelog_tab_latest', { version: latest?.version || '—' }),
                data: latest,
            });
        }
        return items;
    }, [current, latest, sameVersion, t]);

    const initialTab: ReleaseTab =
        updateAvailable && tabs.some((tab) => tab.id === 'latest') ? 'latest' : (tabs[0]?.id ?? 'current');

    const [open, setOpen] = useState(defaultOpen || updateAvailable);
    const [activeTab, setActiveTab] = useState<ReleaseTab>(initialTab);
    const [userPickedTab, setUserPickedTab] = useState(false);

    useEffect(() => {
        if (defaultOpen || updateAvailable) {
            setOpen(true);
        }
    }, [defaultOpen, updateAvailable]);

    useEffect(() => {
        if (tabs.length === 0) return;
        if (!tabs.some((tab) => tab.id === activeTab)) {
            setActiveTab(tabs[0].id);
            return;
        }
        if (!userPickedTab && updateAvailable && tabs.some((tab) => tab.id === 'latest')) {
            setActiveTab('latest');
        }
    }, [tabs, activeTab, updateAvailable, userPickedTab]);

    if (tabs.length === 0) {
        return null;
    }

    const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
    const data = active.data;
    const description = releaseDescription(data);
    const published = formatPublishedAt(data?.published_at);

    return (
        <div className={cn('space-y-3', className)}>
            <button
                type='button'
                onClick={() => setOpen((prev) => !prev)}
                className='bg-muted/10 border-border/40 hover:bg-muted/20 group flex w-full items-center justify-between rounded-xl border p-3 transition-all md:rounded-2xl md:p-4'
            >
                <div className='flex min-w-0 items-center gap-2'>
                    <Package className='text-primary h-4 w-4 shrink-0' />
                    <span className='truncate text-[9px] font-black tracking-widest uppercase md:text-[10px]'>
                        {t('admin.version.view_changelog')}
                    </span>
                    {tabs.length > 1 ? (
                        <span className='text-muted-foreground hidden text-[9px] font-medium tracking-normal normal-case sm:inline md:text-[10px]'>
                            · {t('admin.version.changelog_both_hint')}
                        </span>
                    ) : null}
                </div>
                <span className='text-muted-foreground text-[10px] font-bold tracking-widest uppercase opacity-60'>
                    {open ? t('common.hide') : t('common.view')}
                </span>
            </button>

            {open ? (
                <div className='bg-muted/5 border-border/30 animate-in fade-in slide-in-from-top-2 space-y-4 rounded-2xl border p-4 duration-300 md:space-y-5 md:rounded-3xl md:p-6'>
                    {tabs.length > 1 ? (
                        <div className='bg-muted/20 flex flex-wrap gap-1 rounded-xl p-1'>
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    type='button'
                                    onClick={() => {
                                        setUserPickedTab(true);
                                        setActiveTab(tab.id);
                                    }}
                                    className={cn(
                                        'rounded-lg px-3 py-1.5 text-[10px] font-black tracking-wide uppercase transition-colors',
                                        active.id === tab.id
                                            ? 'bg-background text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    ) : null}

                    <div className='space-y-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                            <h4 className='text-base font-black md:text-lg'>
                                {data?.release_name || data?.version || '—'}
                            </h4>
                            {data?.type ? (
                                <span className='bg-primary/15 text-primary border-primary/25 rounded-full border px-2 py-0.5 text-[9px] font-black tracking-widest uppercase'>
                                    {data.type}
                                </span>
                            ) : null}
                            {data?.is_security_release ? (
                                <span className='inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[9px] font-black tracking-widest text-rose-500 uppercase'>
                                    <ShieldAlert className='h-3 w-3' />
                                    {t('admin.version.security_release')}
                                </span>
                            ) : null}
                        </div>
                        <p className='text-muted-foreground text-xs font-medium'>
                            {t('admin.version.release_notes_for', { version: data?.version || '—' })}
                        </p>
                    </div>

                    <div className='text-muted-foreground flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold md:text-xs'>
                        {published ? (
                            <span className='inline-flex items-center gap-1.5'>
                                <Calendar className='h-3.5 w-3.5' />
                                {t('admin.version.published_at', { date: published })}
                            </span>
                        ) : null}
                        {data?.php_version ? (
                            <span className='inline-flex items-center gap-1.5'>
                                <Cpu className='h-3.5 w-3.5' />
                                {t('admin.version.recommended_php')}
                                {data.php_version}
                            </span>
                        ) : null}
                        {data?.github_html_url ? (
                            <a
                                href={data.github_html_url}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='text-primary inline-flex items-center gap-1.5 hover:underline'
                            >
                                <ExternalLink className='h-3.5 w-3.5' />
                                {t('admin.version.view_on_github')}
                            </a>
                        ) : null}
                    </div>

                    {description ? (
                        <div className='bg-muted/20 border-border/40 rounded-xl border p-3 md:p-4'>
                            <p className='text-muted-foreground mb-2 text-[9px] font-black tracking-widest uppercase'>
                                {t('admin.version.release_summary')}
                            </p>
                            <div className='prose prose-sm dark:prose-invert text-muted-foreground max-w-none text-[10px] leading-relaxed md:text-xs'>
                                <ReactMarkdown>{description}</ReactMarkdown>
                            </div>
                        </div>
                    ) : null}

                    {hasChangelog(data) ? (
                        <div className='space-y-6 md:space-y-8'>
                            <ChangelogSection
                                title={t('admin.version.changelog.added')}
                                items={data?.changelog_added || []}
                                color='emerald'
                                icon='+'
                            />
                            <ChangelogSection
                                title={t('admin.version.changelog.fixed')}
                                items={data?.changelog_fixed || []}
                                color='red'
                                icon='!'
                            />
                            <ChangelogSection
                                title={t('admin.version.changelog.improved')}
                                items={data?.changelog_improved || []}
                                color='blue'
                                icon='~'
                            />
                            <ChangelogSection
                                title={t('admin.version.changelog.updated')}
                                items={data?.changelog_updated || []}
                                color='amber'
                                icon='^'
                            />
                            <ChangelogSection
                                title={t('admin.version.changelog.removed')}
                                items={data?.changelog_removed || []}
                                color='purple'
                                icon='-'
                            />
                        </div>
                    ) : (
                        <p className='text-muted-foreground text-xs'>{t('admin.version.no_changelog_entries')}</p>
                    )}
                </div>
            ) : null}
        </div>
    );
}
