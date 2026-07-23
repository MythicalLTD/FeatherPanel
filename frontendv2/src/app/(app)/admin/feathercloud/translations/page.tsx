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
import { ArrowLeft, Download, Languages, Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Input } from '@/components/featherui/Input';

interface LocaleRow {
    locale?: string;
    code?: string;
    name?: string;
    nativeName?: string;
    completion?: number | string;
    published?: boolean;
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

export default function MythicTranslationsPage() {
    const router = useRouter();
    const [project, setProject] = useState('featherpanel');
    const [locales, setLocales] = useState<LocaleRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [busyLocale, setBusyLocale] = useState<string | null>(null);
    const [selected, setSelected] = useState<Record<string, boolean>>({});

    const load = useCallback(async (slug: string) => {
        setLoading(true);
        try {
            const settings = await axios.get('/api/admin/cloud/translations/settings').catch(() => null);
            const configured = settings?.data?.data?.project;
            const useSlug = slug || configured || 'featherpanel';
            setProject(useSlug);

            const response = await axios.get(
                `/api/admin/cloud/translations/projects/${encodeURIComponent(useSlug)}/locales`,
            );
            const list = normalizeLocales(response.data?.data);
            setLocales(list);
            setSelected({});
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
    }, []);

    useEffect(() => {
        void load('featherpanel');
    }, [load]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return locales;
        return locales.filter((row) => {
            const code = localeCode(row).toLowerCase();
            const name = String(row.name || row.nativeName || '').toLowerCase();
            return code.includes(q) || name.includes(q);
        });
    }, [locales, search]);

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
        } catch (err) {
            toast.error(axios.isAxiosError(err) ? err.response?.data?.message || 'Install failed' : 'Install failed');
        } finally {
            setBusyLocale(null);
        }
    };

    const bulkDownload = async () => {
        const codes = Object.entries(selected)
            .filter(([, on]) => on)
            .map(([code]) => code);
        if (codes.length === 0) {
            toast.error('Select at least one locale');
            return;
        }
        for (const code of codes) {
            await downloadLocale(code);
        }
    };

    return (
        <div className='space-y-6 md:space-y-8'>
            <PageHeader
                title='Mythic Translations'
                description='Browse published locales from translate.mythicalsystems.org and download or install {locale}.json into this panel.'
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
                        <Button variant='outline' size='sm' onClick={() => void load(project)} disabled={loading}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                }
            />

            <PageCard title='Project' icon={Languages}>
                <div className='flex flex-wrap items-end gap-3'>
                    <div className='min-w-[220px] flex-1'>
                        <label className='text-muted-foreground mb-1 block text-xs font-semibold uppercase'>
                            Project slug
                        </label>
                        <Input
                            value={project}
                            onChange={(e) => setProject(e.target.value)}
                            placeholder='featherpanel'
                        />
                    </div>
                    <Button onClick={() => void load(project)} disabled={loading || !project.trim()}>
                        Load locales
                    </Button>
                    <Button variant='outline' onClick={() => void bulkDownload()}>
                        Download selected
                    </Button>
                </div>
                <p className='text-muted-foreground mt-2 text-xs'>
                    Public API — no Mythic Cloud link required. API serves the last published snapshot only.
                </p>
            </PageCard>

            <PageCard title='Locales' icon={Languages}>
                <div className='mb-4'>
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder='Filter locales…' />
                </div>
                {loading ? (
                    <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin' /> Loading locales…
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        title='No locales'
                        description='No published locales found for this project.'
                        icon={Languages}
                    />
                ) : (
                    <ul className='space-y-2'>
                        {filtered.map((row) => {
                            const code = localeCode(row);
                            if (!code) return null;
                            const busy = busyLocale === code;
                            return (
                                <li
                                    key={code}
                                    className='border-border/50 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3'
                                >
                                    <div className='flex items-center gap-3'>
                                        <input
                                            type='checkbox'
                                            checked={Boolean(selected[code])}
                                            onChange={(e) =>
                                                setSelected((prev) => ({ ...prev, [code]: e.target.checked }))
                                            }
                                        />
                                        <div>
                                            <p className='font-semibold'>
                                                {row.name || row.nativeName || code}{' '}
                                                <span className='text-muted-foreground font-mono text-xs'>{code}</span>
                                            </p>
                                            {row.completion != null && (
                                                <p className='text-muted-foreground text-xs'>
                                                    Completion: {String(row.completion)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className='flex gap-2'>
                                        <Button
                                            size='sm'
                                            variant='outline'
                                            disabled={busy}
                                            onClick={() => void downloadLocale(code)}
                                        >
                                            {busy ? (
                                                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                            ) : (
                                                <Download className='mr-2 h-4 w-4' />
                                            )}
                                            Download
                                        </Button>
                                        <Button size='sm' disabled={busy} onClick={() => void installLocale(code)}>
                                            Install
                                        </Button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </PageCard>
        </div>
    );
}
