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

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/featherui/EmptyState';
import { Loader2, RefreshCw, ShieldAlert, Search, ExternalLink, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface ScanUser {
    uuid: string;
    username: string;
    email: string;
    banned: string;
    matched_fields: string[];
}

interface ScanResult {
    ip: string;
    abuse_confidence_score: number;
    total_reports: number;
    country_code: string | null;
    isp: string | null;
    usage_type: string | null;
    is_tor: boolean;
    last_reported_at: string | null;
    users: ScanUser[];
    flagged: boolean;
}

interface StatusData {
    enabled: boolean;
    configured: boolean;
    has_api_key: boolean;
    min_confidence_score: number;
    max_age_days: number;
    register_action: string;
}

function axiosApiMessage(err: unknown, fallback: string): string {
    if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object') {
        const msg = (err.response.data as { message?: string }).message;
        if (typeof msg === 'string' && msg.trim()) {
            return msg;
        }
    }
    return fallback;
}

export default function AbuseIPDBPage() {
    const { t } = useTranslation();
    const [status, setStatus] = useState<StatusData | null>(null);
    const [statusLoading, setStatusLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [minScore, setMinScore] = useState(75);
    const [maxAgeDays, setMaxAgeDays] = useState(90);
    const [results, setResults] = useState<ScanResult[]>([]);
    const [progress, setProgress] = useState({
        checked: 0,
        total: 0,
        flagged: 0,
        done: false,
    });
    const [checkIp, setCheckIp] = useState('');
    const [checkingIp, setCheckingIp] = useState(false);
    const [singleResult, setSingleResult] = useState<Record<string, unknown> | null>(null);

    const loadStatus = useCallback(async () => {
        setStatusLoading(true);
        try {
            const { data } = await axios.get('/api/admin/abuseipdb/status');
            if (data?.success && data?.data) {
                const next = data.data as StatusData;
                setStatus(next);
                setMinScore(next.min_confidence_score || 75);
                setMaxAgeDays(next.max_age_days || 90);
            }
        } catch (err) {
            toast.error(axiosApiMessage(err, t('admin.abuseipdb.status_failed')));
        } finally {
            setStatusLoading(false);
        }
    }, [t]);

    useEffect(() => {
        void loadStatus();
    }, [loadStatus]);

    const runScan = async () => {
        if (!status?.configured) {
            toast.error(t('admin.abuseipdb.not_configured'));
            return;
        }

        setScanning(true);
        setResults([]);
        setProgress({ checked: 0, total: 0, flagged: 0, done: false });

        let offset = 0;
        let hasMore = true;
        const accumulated: ScanResult[] = [];
        let totalFlagged = 0;
        let totalChecked = 0;
        let totalIps = 0;

        try {
            while (hasMore) {
                const { data } = await axios.post('/api/admin/abuseipdb/scan', {
                    offset,
                    limit: 25,
                    min_score: minScore,
                    max_age_days: maxAgeDays,
                    only_flagged: true,
                });

                if (!data?.success) {
                    toast.error(data?.message || t('admin.abuseipdb.scan_failed'));
                    break;
                }

                const batch = data.data;
                totalIps = Number(batch.total_unique_ips || 0);
                totalChecked += Number(batch.checked_count || 0);
                totalFlagged += Number(batch.flagged_count || 0);

                const batchResults = Array.isArray(batch.results) ? (batch.results as ScanResult[]) : [];
                accumulated.push(...batchResults);
                setResults([...accumulated]);
                setProgress({
                    checked: Math.min(offset + Number(batch.batch_size || 0), totalIps),
                    total: totalIps,
                    flagged: totalFlagged,
                    done: false,
                });

                if (batch.stopped_early) {
                    toast.error(t('admin.abuseipdb.rate_limited'));
                    break;
                }

                hasMore = Boolean(batch.has_more);
                offset = Number(batch.next_offset ?? offset + Number(batch.batch_size || 0));
            }

            setProgress((prev) => ({
                ...prev,
                done: true,
                flagged: totalFlagged,
                checked: totalChecked || prev.checked,
            }));
            toast.success(
                t('admin.abuseipdb.scan_complete', {
                    flagged: String(totalFlagged),
                    checked: String(totalChecked),
                }),
            );
        } catch (err) {
            toast.error(axiosApiMessage(err, t('admin.abuseipdb.scan_failed')));
        } finally {
            setScanning(false);
        }
    };

    const runSingleCheck = async () => {
        const ip = checkIp.trim();
        if (!ip) {
            toast.error(t('admin.abuseipdb.ip_required'));
            return;
        }
        setCheckingIp(true);
        setSingleResult(null);
        try {
            const { data } = await axios.get('/api/admin/abuseipdb/check', {
                params: { ip, max_age_days: maxAgeDays },
            });
            if (data?.success) {
                setSingleResult(data.data.result || null);
            } else {
                toast.error(data?.message || t('admin.abuseipdb.check_failed'));
            }
        } catch (err) {
            toast.error(axiosApiMessage(err, t('admin.abuseipdb.check_failed')));
        } finally {
            setCheckingIp(false);
        }
    };

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.abuseipdb.title')}
                description={t('admin.abuseipdb.description')}
                actions={
                    <Button asChild variant='outline'>
                        <Link href='/admin/settings?category=security'>
                            <Settings className='mr-2 h-4 w-4' />
                            {t('admin.abuseipdb.open_settings')}
                        </Link>
                    </Button>
                }
            />

            <PageCard title={t('admin.abuseipdb.status_title')}>
                {statusLoading ? (
                    <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        {t('common.loading')}
                    </div>
                ) : (
                    <div className='flex flex-wrap items-center gap-3'>
                        <Badge variant={status?.configured ? 'default' : 'secondary'}>
                            {status?.configured
                                ? t('admin.abuseipdb.status_configured')
                                : t('admin.abuseipdb.status_not_configured')}
                        </Badge>
                        <span className='text-muted-foreground text-sm'>
                            {t('admin.abuseipdb.status_summary', {
                                score: String(status?.min_confidence_score ?? 75),
                                days: String(status?.max_age_days ?? 90),
                                action: String(status?.register_action ?? 'block'),
                            })}
                        </span>
                        <Button variant='ghost' size='sm' onClick={() => void loadStatus()}>
                            <RefreshCw className='h-4 w-4' />
                        </Button>
                    </div>
                )}
            </PageCard>

            <PageCard title={t('admin.abuseipdb.scan_title')}>
                <div className='mb-4 grid gap-4 sm:grid-cols-3'>
                    <div className='space-y-2'>
                        <Label htmlFor='min-score'>{t('admin.abuseipdb.min_score')}</Label>
                        <Input
                            id='min-score'
                            type='number'
                            min={0}
                            max={100}
                            value={minScore}
                            onChange={(e) => setMinScore(Number(e.target.value))}
                            disabled={scanning}
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='max-age'>{t('admin.abuseipdb.max_age_days')}</Label>
                        <Input
                            id='max-age'
                            type='number'
                            min={1}
                            max={365}
                            value={maxAgeDays}
                            onChange={(e) => setMaxAgeDays(Number(e.target.value))}
                            disabled={scanning}
                        />
                    </div>
                    <div className='flex items-end'>
                        <Button onClick={() => void runScan()} disabled={scanning || !status?.configured}>
                            {scanning ? (
                                <>
                                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                                    {t('admin.abuseipdb.scanning')}
                                </>
                            ) : (
                                <>
                                    <ShieldAlert className='mr-2 h-4 w-4' />
                                    {t('admin.abuseipdb.start_scan')}
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {(scanning || progress.done || progress.total > 0) && (
                    <p className='text-muted-foreground mb-4 text-sm'>
                        {t('admin.abuseipdb.scan_progress', {
                            checked: String(progress.checked),
                            total: String(progress.total),
                            flagged: String(progress.flagged),
                        })}
                    </p>
                )}

                {results.length === 0 && !scanning ? (
                    <EmptyState
                        icon={ShieldAlert}
                        title={t('admin.abuseipdb.no_results_title')}
                        description={t('admin.abuseipdb.no_results_description')}
                    />
                ) : (
                    <div className='space-y-3'>
                        {results.map((result) => (
                            <div key={result.ip} className='border-border/60 rounded-md border p-4'>
                                <div className='mb-2 flex flex-wrap items-center gap-2'>
                                    <code className='text-sm font-semibold'>{result.ip}</code>
                                    <Badge variant='destructive'>{result.abuse_confidence_score}%</Badge>
                                    {result.country_code && <Badge variant='secondary'>{result.country_code}</Badge>}
                                    {result.is_tor && <Badge variant='outline'>Tor</Badge>}
                                    <a
                                        href={`https://www.abuseipdb.com/check/${encodeURIComponent(result.ip)}`}
                                        target='_blank'
                                        rel='noreferrer'
                                        className='text-muted-foreground inline-flex items-center gap-1 text-xs hover:underline'
                                    >
                                        AbuseIPDB <ExternalLink className='h-3 w-3' />
                                    </a>
                                </div>
                                <p className='text-muted-foreground mb-2 text-xs'>
                                    {[result.isp, result.usage_type, `${result.total_reports} reports`]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </p>
                                <div className='flex flex-wrap gap-2'>
                                    {result.users.map((user) => (
                                        <Link
                                            key={user.uuid}
                                            href={`/admin/users/${user.uuid}/edit`}
                                            className='bg-muted/50 hover:bg-muted inline-flex items-center gap-2 rounded px-2 py-1 text-sm'
                                        >
                                            <span className='font-medium'>{user.username}</span>
                                            {user.banned === 'true' && (
                                                <Badge variant='destructive' className='text-[10px]'>
                                                    {t('admin.users.badges.banned')}
                                                </Badge>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </PageCard>

            <PageCard title={t('admin.abuseipdb.check_title')}>
                <div className='mb-4 flex flex-col gap-3 sm:flex-row'>
                    <Input
                        placeholder={t('admin.abuseipdb.check_placeholder')}
                        value={checkIp}
                        onChange={(e) => setCheckIp(e.target.value)}
                        disabled={checkingIp || !status?.configured}
                    />
                    <Button onClick={() => void runSingleCheck()} disabled={checkingIp || !status?.configured}>
                        {checkingIp ? (
                            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        ) : (
                            <Search className='mr-2 h-4 w-4' />
                        )}
                        {t('admin.abuseipdb.check_button')}
                    </Button>
                </div>
                {singleResult && (
                    <pre className='bg-muted/40 overflow-x-auto rounded-md p-3 text-xs'>
                        {JSON.stringify(singleResult, null, 2)}
                    </pre>
                )}
            </PageCard>
        </div>
    );
}
