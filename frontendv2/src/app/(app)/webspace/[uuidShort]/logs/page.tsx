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
import axios, { isAxiosError } from 'axios';
import { Copy, Loader2, Play, RefreshCw, RotateCcw, Search, Square } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/featherui/PageHeader';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { Button } from '@/components/featherui/Button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';
import { useQuilldWebSocket } from '@/hooks/useQuilldWebSocket';
import { copyToClipboard, cn } from '@/lib/utils';

type LogTab = 'access' | 'error' | 'runtime' | 'install';

interface ProxyLogFile {
    domain: string;
    access_tail?: string;
    error_tail?: string;
    access_search_truncated?: boolean;
    error_search_truncated?: boolean;
}

export default function WebSpaceLogsPage() {
    const { t } = useTranslation();
    const params = useParams();
    const uuidShort = String(params.uuidShort || '');
    const [tab, setTab] = useState<LogTab>('access');
    const [lines, setLines] = useState('500');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [liveTail, setLiveTail] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchInput, setSearchInput] = useState('');
    const [serverSearch, setServerSearch] = useState('');
    const [useRegex, setUseRegex] = useState(false);
    const [truncated, setTruncated] = useState(false);
    const [rotateOpen, setRotateOpen] = useState(false);
    const [rotating, setRotating] = useState(false);
    const [domains, setDomains] = useState<string[]>([]);
    const [selectedDomain, setSelectedDomain] = useState('');
    const [content, setContent] = useState('');
    const preRef = useRef<HTMLPreElement>(null);
    const scrollLockRef = useRef(true);

    const lineCount = useMemo(() => Math.max(100, Math.min(2000, Number(lines) || 500)), [lines]);
    const jwtEndpoint = `/api/user/webspaces/${uuidShort}/jwt`;

    const {
        lines: tailLines,
        isConnected: tailConnected,
        connectionStatus: tailStatus,
        reconnect: reconnectTail,
    } = useQuilldWebSocket({
        jwtEndpoint,
        enabled: tab === 'runtime' && liveTail,
        wsOnly: true,
        onConsoleOutput: () => {
            if (scrollLockRef.current && preRef.current) {
                preRef.current.scrollTop = preRef.current.scrollHeight;
            }
        },
    });

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
        if (tab === 'runtime' && liveTail) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const searchParams: Record<string, string | number | boolean> = { lines: lineCount };
            if (serverSearch.trim()) {
                searchParams.q = serverSearch.trim();
                searchParams.scan_lines = 10000;
                if (useRegex) searchParams.regex = true;
            }

            if (tab === 'runtime') {
                const { data } = await axios.get(`/api/user/webspaces/${uuidShort}/logs`, {
                    params: searchParams,
                });
                const body = data?.data;
                const text =
                    typeof body?.data === 'string'
                        ? body.data
                        : typeof body?.logs === 'string'
                          ? body.logs
                          : JSON.stringify(body ?? {}, null, 2);
                setContent(text || t('webSpaces.logs.empty'));
                setTruncated(!!body?.truncated);
                return;
            }

            if (tab === 'install') {
                const { data } = await axios.get(`/api/user/webspaces/${uuidShort}/logs/install`);
                const body = data?.data;
                const text = typeof body?.data === 'string' ? body.data : JSON.stringify(body ?? {}, null, 2);
                setContent(text || t('webSpaces.logs.empty'));
                setTruncated(false);
                return;
            }

            const { data } = await axios.get(`/api/user/webspaces/${uuidShort}/proxy-logs`, {
                params: {
                    ...searchParams,
                    domain: selectedDomain || undefined,
                },
            });
            const payload = data?.data ?? data;
            const files = (payload?.files ?? []) as ProxyLogFile[];
            if (!selectedDomain && files.length > 0) {
                setSelectedDomain(files[0].domain);
            }
            const file =
                files.find((f) => f.domain === selectedDomain) ??
                files.find((f) => f.domain === (selectedDomain || domains[0])) ??
                files[0];
            const text = tab === 'error' ? (file?.error_tail ?? '') : (file?.access_tail ?? '');
            setContent(text || t('webSpaces.logs.empty'));
            setTruncated(
                tab === 'error'
                    ? !!file?.error_search_truncated || !!payload?.search_scan_lines
                    : !!file?.access_search_truncated || !!payload?.search_scan_lines,
            );
        } catch {
            setContent(t('webSpaces.logs.loadFailed'));
            setTruncated(false);
        } finally {
            setLoading(false);
        }
    }, [tab, uuidShort, lineCount, selectedDomain, domains, serverSearch, useRegex, liveTail, t]);

    const rotateLogs = useCallback(async () => {
        setRotating(true);
        try {
            await axios.post(`/api/user/webspaces/${uuidShort}/proxy-logs/rotate`, null, {
                params: selectedDomain ? { domain: selectedDomain } : undefined,
            });
            toast.success(t('webSpaces.logs.rotateDone'));
            setRotateOpen(false);
            await loadLogs();
        } catch (err) {
            toast.error(
                isAxiosError(err)
                    ? err.response?.data?.message || t('webSpaces.logs.rotateFailed')
                    : t('webSpaces.logs.rotateFailed'),
            );
        } finally {
            setRotating(false);
        }
    }, [uuidShort, selectedDomain, loadLogs, t]);

    useEffect(() => {
        void loadDomains();
    }, [loadDomains]);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    useEffect(() => {
        if (!autoRefresh || liveTail) return;
        const id = window.setInterval(() => void loadLogs(), 5000);
        return () => window.clearInterval(id);
    }, [autoRefresh, liveTail, loadLogs]);

    useEffect(() => {
        if (tab !== 'runtime' || !liveTail) return;
        if (scrollLockRef.current && preRef.current) {
            preRef.current.scrollTop = preRef.current.scrollHeight;
        }
    }, [tailLines, tab, liveTail]);

    useEffect(() => {
        if (!liveTail && preRef.current) {
            preRef.current.scrollTop = preRef.current.scrollHeight;
        }
    }, [content, liveTail]);

    const applySearch = () => {
        setServerSearch(searchInput.trim());
    };

    const displayContent = useMemo(() => {
        if (tab === 'runtime' && liveTail) {
            return tailLines.join('\n') || t('webSpaces.logs.empty');
        }
        return content;
    }, [tab, liveTail, tailLines, content, t]);

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
                                variant={autoRefresh && !liveTail ? 'default' : 'outline'}
                                size='sm'
                                onClick={() => setAutoRefresh((v) => !v)}
                                disabled={liveTail}
                            >
                                {t('webSpaces.logs.autoRefresh')}
                            </Button>
                            {tab === 'runtime' && (
                                <Button
                                    variant={liveTail ? 'default' : 'outline'}
                                    size='sm'
                                    onClick={() => {
                                        setLiveTail((v) => !v);
                                        if (!liveTail) setAutoRefresh(false);
                                    }}
                                >
                                    {liveTail ? (
                                        <>
                                            <Square className='mr-2 h-4 w-4' />
                                            {t('webSpaces.logs.stopTail')}
                                        </>
                                    ) : (
                                        <>
                                            <Play className='mr-2 h-4 w-4' />
                                            {t('webSpaces.logs.liveTail')}
                                        </>
                                    )}
                                </Button>
                            )}
                            {(tab === 'access' || tab === 'error') && (
                                <Button variant='outline' size='sm' onClick={() => setRotateOpen(true)}>
                                    <RotateCcw className='mr-2 h-4 w-4' />
                                    {t('webSpaces.logs.rotate')}
                                </Button>
                            )}
                        </div>
                    }
                />

                <div className='border-border/50 bg-card/50 flex flex-wrap gap-2 rounded-xl border p-2 backdrop-blur-xl'>
                    {tabs.map((item) => (
                        <button
                            key={item.id}
                            type='button'
                            onClick={() => {
                                setTab(item.id);
                                if (item.id !== 'runtime') setLiveTail(false);
                            }}
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

                <div className='grid gap-3 md:grid-cols-4'>
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
                    <div className='relative md:col-span-2'>
                        <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                        <input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') applySearch();
                            }}
                            placeholder={t('webSpaces.logs.search')}
                            className='border-border/50 bg-background h-10 w-full rounded-lg border pr-24 pl-9 text-sm'
                        />
                        <Button
                            type='button'
                            size='sm'
                            variant='secondary'
                            className='absolute top-1/2 right-1 h-8 -translate-y-1/2'
                            onClick={applySearch}
                        >
                            {t('webSpaces.logs.searchApply')}
                        </Button>
                    </div>
                </div>

                <div className='flex flex-wrap items-center gap-4 text-sm'>
                    <label className='flex items-center gap-2'>
                        <Checkbox checked={useRegex} onCheckedChange={(v) => setUseRegex(!!v)} />
                        {t('webSpaces.logs.regex')}
                    </label>
                    {tab === 'runtime' && liveTail && (
                        <span className='text-muted-foreground'>
                            {tailConnected
                                ? t('webSpaces.logs.tailConnected')
                                : t('webSpaces.logs.tailConnecting', { status: tailStatus })}
                            {!tailConnected && (
                                <Button variant='link' className='ml-2 h-auto p-0' onClick={() => reconnectTail()}>
                                    {t('common.retry')}
                                </Button>
                            )}
                        </span>
                    )}
                    {truncated && !liveTail && (
                        <span className='text-amber-600 dark:text-amber-400'>{t('webSpaces.logs.truncated')}</span>
                    )}
                </div>

                <div className='border-border/50 bg-card/50 rounded-xl border backdrop-blur-xl'>
                    <div className='border-border/50 flex items-center justify-between border-b px-4 py-2'>
                        <p className='text-muted-foreground text-xs font-medium uppercase'>
                            {tabs.find((x) => x.id === tab)?.label}
                        </p>
                        <Button
                            variant='ghost'
                            size='sm'
                            onClick={() => void copyToClipboard(displayContent, t)}
                            disabled={!displayContent}
                        >
                            <Copy className='mr-2 h-4 w-4' />
                            {t('common.copy')}
                        </Button>
                    </div>
                    <pre
                        ref={preRef}
                        onScroll={() => {
                            const el = preRef.current;
                            if (!el) return;
                            scrollLockRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
                        }}
                        className='max-h-[min(70vh,40rem)] overflow-auto p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap'
                    >
                        {loading && !(tab === 'runtime' && liveTail) ? t('common.loading') : displayContent}
                    </pre>
                </div>
            </div>

            <AlertDialog open={rotateOpen} onOpenChange={setRotateOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('webSpaces.logs.rotateTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('webSpaces.logs.rotateDescription')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={rotating}>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction disabled={rotating} onClick={() => void rotateLogs()}>
                            {rotating ? t('common.loading') : t('webSpaces.logs.rotateConfirm')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </WebSpacePageWidgets>
    );
}
