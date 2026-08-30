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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { Copy, Loader2, RefreshCw, Search } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';
import { copyToClipboard, cn } from '@/lib/utils';

type LogTab = 'access' | 'error' | 'runtime' | 'install';

interface ProxyLogFile {
    domain: string;
    access_tail?: string;
    error_tail?: string;
}

export default function WebSpaceLogsPage() {
    const { t } = useTranslation();
    const params = useParams();
    const uuidShort = String(params.uuidShort || '');
    const [tab, setTab] = useState<LogTab>('access');
    const [lines, setLines] = useState('500');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [domains, setDomains] = useState<string[]>([]);
    const [selectedDomain, setSelectedDomain] = useState('');
    const [content, setContent] = useState('');
    const preRef = useRef<HTMLPreElement>(null);

    const lineCount = useMemo(() => Math.max(100, Math.min(2000, Number(lines) || 500)), [lines]);

    const loadDomains = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/user/webspaces/${uuidShort}`);
            const ws = data?.data?.webspace;
            const list = Array.isArray(ws?.domains) ? ws.domains.filter(Boolean) : [];
            setDomains(list);
            setSelectedDomain((current) => (current && list.includes(current) ? current : list[0] || ''));
        } catch {
            setDomains([]);
            setSelectedDomain('');
        }
    }, [uuidShort]);

    const loadLogs = useCallback(async () => {
        setLoading(true);
        try {
            if (tab === 'runtime') {
                const { data } = await axios.get(`/api/user/webspaces/${uuidShort}/logs`, {
                    params: { lines: lineCount },
                });
                const body = data?.data;
                const text =
                    typeof body?.data === 'string'
                        ? body.data
                        : typeof body?.logs === 'string'
                          ? body.logs
                          : JSON.stringify(body ?? {}, null, 2);
                setContent(text || t('webSpaces.logs.empty'));
                return;
            }

            if (tab === 'install') {
                const { data } = await axios.get(`/api/user/webspaces/${uuidShort}/logs/install`);
                const body = data?.data;
                const text = typeof body?.data === 'string' ? body.data : JSON.stringify(body ?? {}, null, 2);
                setContent(text || t('webSpaces.logs.empty'));
                return;
            }

            const { data } = await axios.get(`/api/user/webspaces/${uuidShort}/proxy-logs`, {
                params: {
                    lines: lineCount,
                    domain: selectedDomain || undefined,
                },
            });
            const files = (data?.data?.files ?? []) as ProxyLogFile[];
            if (!selectedDomain && files.length > 0) {
                setSelectedDomain(files[0].domain);
            }
            const file =
                files.find((f) => f.domain === selectedDomain) ??
                files.find((f) => f.domain === (selectedDomain || domains[0])) ??
                files[0];
            const text = tab === 'error' ? (file?.error_tail ?? '') : (file?.access_tail ?? '');
            setContent(text || t('webSpaces.logs.empty'));
        } catch {
            setContent(t('webSpaces.logs.loadFailed'));
        } finally {
            setLoading(false);
        }
    }, [tab, uuidShort, lineCount, selectedDomain, domains, t]);

    useEffect(() => {
        void loadDomains();
    }, [loadDomains]);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    useEffect(() => {
        if (!autoRefresh) return;
        const id = window.setInterval(() => void loadLogs(), 5000);
        return () => window.clearInterval(id);
    }, [autoRefresh, loadLogs]);

    useEffect(() => {
        if (preRef.current) {
            preRef.current.scrollTop = preRef.current.scrollHeight;
        }
    }, [content]);

    const filteredContent = useMemo(() => {
        const needle = search.trim().toLowerCase();
        if (!needle) return content;
        return content
            .split('\n')
            .filter((line) => line.toLowerCase().includes(needle))
            .join('\n');
    }, [content, search]);

    const domainOptions = domains.map((domain) => ({ id: domain, name: domain }));
    const tabs: { id: LogTab; label: string }[] = [
        { id: 'access', label: t('webSpaces.logs.access') },
        { id: 'error', label: t('webSpaces.logs.error') },
        { id: 'runtime', label: t('webSpaces.logs.runtime') },
        { id: 'install', label: t('webSpaces.logs.install') },
    ];

    return (
        <WebSpacePageWidgets pageId='webspace-logs'>
            <div className='space-y-6 pb-12'>
                <PageHeader
                    title={t('webSpaces.logs.title')}
                    description={t('webSpaces.logs.description')}
                    actions={
                        <div className='flex flex-wrap items-center gap-2'>
                            <Button variant='outline' size='sm' onClick={() => void loadLogs()} disabled={loading}>
                                {loading ? (
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                ) : (
                                    <RefreshCw className='mr-2 h-4 w-4' />
                                )}
                                {t('common.refresh')}
                            </Button>
                            <Button
                                variant={autoRefresh ? 'default' : 'outline'}
                                size='sm'
                                onClick={() => setAutoRefresh((v) => !v)}
                            >
                                {t('webSpaces.logs.autoRefresh')}
                            </Button>
                        </div>
                    }
                />

                <div className='border-border/50 bg-card/50 flex flex-wrap gap-2 rounded-xl border p-2 backdrop-blur-xl'>
                    {tabs.map((item) => (
                        <button
                            key={item.id}
                            type='button'
                            onClick={() => setTab(item.id)}
                            className={cn(
                                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                                tab === item.id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted',
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className='grid gap-3 md:grid-cols-3'>
                    {(tab === 'access' || tab === 'error') && domainOptions.length > 0 && (
                        <HeadlessSelect
                            value={selectedDomain}
                            onChange={(val) => setSelectedDomain(String(val))}
                            options={domainOptions}
                            placeholder={t('webSpaces.logs.domain')}
                        />
                    )}
                    <HeadlessSelect
                        value={lines}
                        onChange={(val) => setLines(String(val))}
                        options={[
                            { id: '100', name: '100' },
                            { id: '500', name: '500' },
                            { id: '1000', name: '1000' },
                            { id: '2000', name: '2000' },
                        ]}
                        placeholder={t('webSpaces.logs.lines')}
                    />
                    <div className='relative md:col-span-1'>
                        <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('webSpaces.logs.search')}
                            className='border-border/50 bg-background h-10 w-full rounded-lg border pr-3 pl-9 text-sm'
                        />
                    </div>
                </div>

                <div className='border-border/50 bg-card/50 rounded-xl border backdrop-blur-xl'>
                    <div className='border-border/50 flex items-center justify-between border-b px-4 py-2'>
                        <p className='text-muted-foreground text-xs font-medium uppercase'>
                            {tabs.find((x) => x.id === tab)?.label}
                        </p>
                        <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => void copyToClipboard(filteredContent, t)}
                            disabled={!filteredContent}
                        >
                            <Copy className='mr-2 h-4 w-4' />
                            {t('common.copy')}
                        </Button>
                    </div>
                    <pre
                        ref={preRef}
                        className='max-h-[min(70vh,40rem)] overflow-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap'
                    >
                        {loading ? t('common.loading') : filteredContent}
                    </pre>
                </div>
            </div>
        </WebSpacePageWidgets>
    );
}
