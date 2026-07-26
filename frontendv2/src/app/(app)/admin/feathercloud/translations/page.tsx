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

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
    ArrowLeft,
    CheckCircle2,
    Download,
    ExternalLink,
    Languages,
    Loader2,
    RefreshCw,
    Search,
    Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/featherui/PageHeader';
import { Button } from '@/components/featherui/Button';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Input } from '@/components/featherui/Input';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface LocaleContributor {
    user?: { id?: number; name?: string; profilePhotoUrl?: string | null };
    lastContributedAt?: string | null;
    keysChanged?: number;
    contributionCount?: number;
}

interface LocaleRow {
    locale?: string;
    code?: string;
    name?: string;
    nativeName?: string;
    displayName?: string;
    completion?: number | string;
    completionPercent?: number;
    translatedKeys?: number;
    totalKeys?: number;
    missingKeys?: number;
    emptyKeys?: number;
    status?: string;
    source?: string;
    published?: boolean;
    isApiPublished?: boolean;
    isBaseLanguage?: boolean;
    syncedAt?: string | null;
    lastContributor?: { id?: number; name?: string; profilePhotoUrl?: string | null } | null;
    lastContributedAt?: string | null;
    contributors?: LocaleContributor[];
}

interface ProjectInfo {
    slug?: string;
    name?: string;
    description?: string;
    iconUrl?: string | null;
    githubRepoUrl?: string | null;
    upstreamSyncedAt?: string | null;
}

function normalizeLocales(data: unknown): LocaleRow[] {
    if (!data) return [];
    if (Array.isArray(data)) return data as LocaleRow[];
    if (typeof data === 'object') {
        const d = data as Record<string, unknown>;
        if (Array.isArray(d.locales)) return d.locales as LocaleRow[];
        if (Array.isArray(d.data)) return d.data as LocaleRow[];
        if (Array.isArray(d.items)) return d.items as LocaleRow[];
    }
    return [];
}

function localeCode(row: LocaleRow): string {
    return String(row.locale || row.code || '').trim();
}

function localeName(row: LocaleRow): string {
    return String(row.displayName || row.name || row.nativeName || localeCode(row)).trim();
}

function completionOf(row: LocaleRow): number {
    if (typeof row.completionPercent === 'number') return row.completionPercent;
    const raw = Number(row.completion);
    return Number.isFinite(raw) ? raw : 0;
}

function panelLangKey(code: string): string {
    return code.trim().toLowerCase().replace(/_/g, '-');
}

const MYTHIC_TRANSLATE_URL = 'https://translate.mythicalsystems.org/featherpanel';

export default function MythicTranslationsPage() {
    const router = useRouter();
    const [project, setProject] = useState('featherpanel');
    const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
    const [locales, setLocales] = useState<LocaleRow[]>([]);
    const [installedLangs, setInstalledLangs] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'complete' | 'in_progress' | 'installed'>('all');
    const [busyLocale, setBusyLocale] = useState<string | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [bulkBusy, setBulkBusy] = useState(false);

    const loadInstalled = useCallback(async () => {
        try {
            const response = await axios.get('/api/admin/translations');
            const files = response.data?.data?.translations || response.data?.data || [];
            const ids = new Set<string>();
            const list = Array.isArray(files) ? files : Object.values(files);
            for (const file of list as Array<{ code?: string; lang?: string; file?: string }>) {
                const code = String(file.code || file.lang || '').trim();
                if (code) ids.add(panelLangKey(code));
                const fromFile = String(file.file || '')
                    .replace(/\.json$/i, '')
                    .trim();
                if (fromFile) ids.add(panelLangKey(fromFile));
            }
            setInstalledLangs(ids);
        } catch {
            setInstalledLangs(new Set());
        }
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const settings = await axios.get('/api/admin/cloud/translations/settings').catch(() => null);
            const useSlug = String(settings?.data?.data?.project || 'featherpanel').trim() || 'featherpanel';
            setProject(useSlug);

            const [projectRes, localesRes] = await Promise.all([
                axios.get(`/api/admin/cloud/translations/projects/${encodeURIComponent(useSlug)}`),
                axios.get(`/api/admin/cloud/translations/projects/${encodeURIComponent(useSlug)}/locales`),
            ]);
            await loadInstalled();

            const projectPayload = projectRes.data?.data;
            if (projectPayload && typeof projectPayload === 'object') {
                setProjectInfo(projectPayload as ProjectInfo);
                if (Array.isArray((projectPayload as { locales?: LocaleRow[] }).locales)) {
                    setLocales((projectPayload as { locales: LocaleRow[] }).locales);
                } else {
                    setLocales(normalizeLocales(localesRes.data?.data));
                }
            } else {
                setProjectInfo({ slug: useSlug, name: useSlug });
                setLocales(normalizeLocales(localesRes.data?.data));
            }
            setSelected(new Set());
        } catch (err) {
            toast.error(
                axios.isAxiosError(err)
                    ? err.response?.data?.message || 'Failed to load locales'
                    : 'Failed to load locales',
            );
            setLocales([]);
        } finally {
            setLoading(false);
        }
    }, [loadInstalled]);

    useEffect(() => {
        void load();
    }, [load]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return locales.filter((row) => {
            const code = localeCode(row);
            if (!code) return false;
            const installed = installedLangs.has(panelLangKey(code));
            const completion = completionOf(row);
            const status = String(row.status || '').toLowerCase();
            if (filter === 'complete' && !(status === 'complete' || completion >= 100)) return false;
            if (filter === 'in_progress' && (status === 'complete' || completion >= 100)) return false;
            if (filter === 'installed' && !installed) return false;
            if (!q) return true;
            return `${localeName(row)} ${code} ${row.source || ''}`.toLowerCase().includes(q);
        });
    }, [locales, search, filter, installedLangs]);

    const stats = useMemo(() => {
        let complete = 0;
        let installed = 0;
        for (const row of locales) {
            const code = localeCode(row);
            if (!code) continue;
            if (completionOf(row) >= 100 || row.status === 'complete') complete += 1;
            if (installedLangs.has(panelLangKey(code))) installed += 1;
        }
        return { total: locales.length, complete, installed };
    }, [locales, installedLangs]);

    const downloadLocale = async (locale: string) => {
        setBusyLocale(locale);
        try {
            const response = await axios.get(
                `/api/admin/cloud/translations/projects/${encodeURIComponent(project)}/locales/${encodeURIComponent(locale)}/download`,
                { responseType: 'blob' },
            );
            const blob = new Blob([response.data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${locale}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            toast.success(`Downloaded ${locale}.json`);
        } catch (err) {
            toast.error(axios.isAxiosError(err) ? err.response?.data?.message || 'Download failed' : 'Download failed');
        } finally {
            setBusyLocale(null);
        }
    };

    const installLocale = async (locale: string) => {
        setBusyLocale(locale);
        try {
            await axios.post(
                `/api/admin/cloud/translations/projects/${encodeURIComponent(project)}/locales/${encodeURIComponent(locale)}/install`,
            );
            toast.success(`Installed ${locale} into panel translations`);
            await loadInstalled();
        } catch (err) {
            toast.error(axios.isAxiosError(err) ? err.response?.data?.message || 'Install failed' : 'Install failed');
        } finally {
            setBusyLocale(null);
        }
    };

    const bulkInstall = async () => {
        const codes = [...selected];
        if (codes.length === 0) {
            toast.error('Select at least one locale');
            return;
        }
        setBulkBusy(true);
        let ok = 0;
        let fail = 0;
        for (const code of codes) {
            try {
                await axios.post(
                    `/api/admin/cloud/translations/projects/${encodeURIComponent(project)}/locales/${encodeURIComponent(code)}/install`,
                );
                ok += 1;
            } catch {
                fail += 1;
            }
        }
        setBulkBusy(false);
        setSelected(new Set());
        await loadInstalled();
        if (ok) toast.success(`Installed ${ok} locale${ok === 1 ? '' : 's'}`);
        if (fail) toast.error(`${fail} install${fail === 1 ? '' : 's'} failed`);
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={projectInfo?.name || 'Translations'}
                description='Install community locales here, or contribute on Mythic Translate.'
                icon={Languages}
                actions={
                    <div className='flex flex-wrap gap-2'>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => router.push('/admin/feathercloud/marketplace')}
                        >
                            <ArrowLeft className='mr-2 h-4 w-4' />
                            Marketplace
                        </Button>
                        <Button
                            variant='outline'
                            size='sm'
                            onClick={() => router.push('/admin/translations')}
                        >
                            Local files
                        </Button>
                        <Button
                            size='sm'
                            onClick={() => window.open(MYTHIC_TRANSLATE_URL, '_blank', 'noopener,noreferrer')}
                        >
                            <ExternalLink className='mr-2 h-4 w-4' />
                            Contribute
                        </Button>
                        <Button variant='outline' size='sm' onClick={() => void load()} disabled={loading}>
                            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                            Refresh
                        </Button>
                    </div>
                }
            />

            <div className='grid gap-3 sm:grid-cols-3'>
                <div className='bg-card/60 rounded-2xl px-4 py-3'>
                    <p className='text-muted-foreground text-xs'>Locales</p>
                    <p className='mt-1 text-sm font-medium'>{stats.total}</p>
                </div>
                <div className='bg-card/60 rounded-2xl px-4 py-3'>
                    <p className='text-muted-foreground text-xs'>Complete</p>
                    <p className='mt-1 text-sm font-medium'>{stats.complete}</p>
                </div>
                <div className='bg-card/60 rounded-2xl px-4 py-3'>
                    <p className='text-muted-foreground text-xs'>Installed here</p>
                    <p className='mt-1 text-sm font-medium'>{stats.installed}</p>
                </div>
            </div>

            {projectInfo ? (
                <div className='bg-card/60 flex flex-wrap items-center gap-4 rounded-2xl px-4 py-3'>
                    {projectInfo.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={projectInfo.iconUrl}
                            alt=''
                            className='h-10 w-10 rounded-xl object-cover'
                        />
                    ) : (
                        <div className='bg-muted flex h-10 w-10 items-center justify-center rounded-xl'>
                            <Languages className='text-muted-foreground h-5 w-5' />
                        </div>
                    )}
                    <div className='min-w-0 flex-1'>
                        <p className='truncate text-sm font-medium'>{projectInfo.name || project}</p>
                        <p className='text-muted-foreground truncate font-mono text-[11px]'>{project}</p>
                    </div>
                    <Button
                        size='sm'
                        variant='outline'
                        onClick={() => window.open(MYTHIC_TRANSLATE_URL, '_blank', 'noopener,noreferrer')}
                    >
                        <ExternalLink className='mr-2 h-4 w-4' />
                        Open on Mythic Translate
                    </Button>
                    {projectInfo.githubRepoUrl ? (
                        <Button
                            size='sm'
                            variant='outline'
                            onClick={() => window.open(projectInfo.githubRepoUrl!, '_blank', 'noopener,noreferrer')}
                        >
                            GitHub
                        </Button>
                    ) : null}
                </div>
            ) : null}

            <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
                <div className='relative min-w-0 flex-1'>
                    <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder='Search locales…'
                        className='pl-9'
                    />
                </div>
                <div className='flex flex-wrap gap-2'>
                    {(
                        [
                            { key: 'all' as const, label: 'All' },
                            { key: 'complete' as const, label: 'Complete' },
                            { key: 'in_progress' as const, label: 'In progress' },
                            { key: 'installed' as const, label: 'Installed' },
                        ] as const
                    ).map((item) => (
                        <Button
                            key={item.key}
                            size='sm'
                            variant={filter === item.key ? 'default' : 'outline'}
                            onClick={() => setFilter(item.key)}
                        >
                            {item.label}
                        </Button>
                    ))}
                    {selected.size > 0 ? (
                        <Button size='sm' onClick={() => void bulkInstall()} disabled={bulkBusy}>
                            {bulkBusy ? (
                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                            ) : (
                                <Download className='mr-2 h-4 w-4' />
                            )}
                            Install selected ({selected.size})
                        </Button>
                    ) : null}
                </div>
            </div>

            {loading ? (
                <div className='text-muted-foreground flex items-center gap-2 py-16 text-sm'>
                    <Loader2 className='h-4 w-4 animate-spin' /> Loading locales…
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState
                    title='No locales'
                    description='No published locales match your search or filter. Contribute missing languages on Mythic Translate.'
                    icon={Languages}
                    action={
                        <Button
                            onClick={() => window.open(MYTHIC_TRANSLATE_URL, '_blank', 'noopener,noreferrer')}
                        >
                            <ExternalLink className='mr-2 h-4 w-4' />
                            Open Mythic Translate
                        </Button>
                    }
                />
            ) : (
                <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
                    {filtered.map((row) => {
                        const code = localeCode(row);
                        if (!code) return null;
                        const name = localeName(row);
                        const completion = completionOf(row);
                        const installed = installedLangs.has(panelLangKey(code));
                        const busy = busyLocale === code || bulkBusy;
                        const checked = selected.has(code);
                        const translated = Number(row.translatedKeys || 0);
                        const total = Number(row.totalKeys || 0);
                        const contributors = row.contributors || [];

                        return (
                            <article
                                key={code}
                                className={cn(
                                    'bg-card/80 flex flex-col overflow-hidden rounded-2xl shadow-sm ring-1 transition',
                                    'hover:bg-card hover:shadow-md',
                                    checked ? 'ring-primary/50' : 'ring-border/40',
                                )}
                            >
                                <div className='flex flex-1 flex-col space-y-3 p-4'>
                                    <div className='flex items-start gap-3'>
                                        <Checkbox
                                            checked={checked}
                                            disabled={busy}
                                            onCheckedChange={(value) => {
                                                setSelected((prev) => {
                                                    const next = new Set(prev);
                                                    if (value) next.add(code);
                                                    else next.delete(code);
                                                    return next;
                                                });
                                            }}
                                        />
                                        <div className='min-w-0 flex-1'>
                                            <h3 className='truncate text-sm font-semibold'>{name}</h3>
                                            <p className='text-muted-foreground font-mono text-[11px]'>{code}</p>
                                        </div>
                                        <div className='flex shrink-0 flex-col items-end gap-1'>
                                            {installed ? (
                                                <span className='rounded-md bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400'>
                                                    Installed
                                                </span>
                                            ) : null}
                                            {row.isBaseLanguage ? (
                                                <span className='rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400'>
                                                    Base
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div>
                                        <div className='mb-1 flex items-center justify-between text-[11px]'>
                                            <span className='text-muted-foreground'>Completion</span>
                                            <span className='font-medium'>{completion}%</span>
                                        </div>
                                        <div className='bg-muted h-1.5 overflow-hidden rounded-full'>
                                            <div
                                                className={cn(
                                                    'h-full rounded-full transition-all',
                                                    completion >= 100
                                                        ? 'bg-emerald-500'
                                                        : completion >= 50
                                                          ? 'bg-amber-500'
                                                          : 'bg-primary/70',
                                                )}
                                                style={{ width: `${Math.max(0, Math.min(100, completion))}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className='text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-[11px]'>
                                        {total > 0 ? (
                                            <span>
                                                {translated.toLocaleString()} / {total.toLocaleString()} keys
                                            </span>
                                        ) : null}
                                        {row.source ? <span className='capitalize'>{row.source}</span> : null}
                                        {row.status ? <span className='capitalize'>{row.status.replace(/_/g, ' ')}</span> : null}
                                    </div>

                                    {row.lastContributor?.name || contributors.length > 0 ? (
                                        <div className='text-muted-foreground flex items-center gap-2 text-[11px]'>
                                            {row.lastContributor?.profilePhotoUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={row.lastContributor.profilePhotoUrl}
                                                    alt=''
                                                    className='h-4 w-4 rounded-full object-cover'
                                                />
                                            ) : (
                                                <Users className='h-3.5 w-3.5' />
                                            )}
                                            <span className='truncate'>
                                                {row.lastContributor?.name ||
                                                    contributors[0]?.user?.name ||
                                                    'Community'}
                                                {contributors.length > 1
                                                    ? ` +${contributors.length - 1}`
                                                    : ''}
                                            </span>
                                        </div>
                                    ) : null}
                                </div>

                                <div className='flex items-center gap-2 px-4 pb-4'>
                                    <Button
                                        size='sm'
                                        variant='outline'
                                        className='flex-1'
                                        disabled={busy}
                                        onClick={() => void downloadLocale(code)}
                                    >
                                        {busyLocale === code ? (
                                            <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                                        ) : (
                                            <Download className='mr-1.5 h-3.5 w-3.5' />
                                        )}
                                        Download
                                    </Button>
                                    <Button
                                        size='sm'
                                        disabled={busy}
                                        onClick={() => void installLocale(code)}
                                        title={installed ? 'Reinstall / overwrite' : 'Install'}
                                    >
                                        {installed ? (
                                            <>
                                                <CheckCircle2 className='mr-1.5 h-3.5 w-3.5' />
                                                Update
                                            </>
                                        ) : (
                                            'Install'
                                        )}
                                    </Button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
