'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/featherui/PageHeader';
import { HeadlessSelect } from '@/components/ui/headless-select';
import { useTranslation } from '@/contexts/TranslationContext';
import { WebSpacePageWidgets } from '@/components/webspace/WebSpacePageWidgets';

interface AnalyticsSummary {
    total: number;
    by_day: { date: string; count: number }[];
    top_events: { event: string; count: number }[];
}

interface TrafficFile {
    domain: string;
    hits: number;
    bytes: number;
    access_tail?: string;
    error_tail?: string;
}

interface TrafficSummary {
    hits: number;
    bytes: number;
    status: Record<string, number>;
    files: TrafficFile[];
    by_day?: { date: string; hits: number; bytes: number }[];
}

export default function WebSpaceAnalyticsPage() {
    const { t } = useTranslation();
    const params = useParams();
    const uuidShort = String(params.uuidShort || '');
    const [days, setDays] = useState('30');
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [traffic, setTraffic] = useState<TrafficSummary | null>(null);
    const [selectedDomain, setSelectedDomain] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/api/user/webspaces/${uuidShort}/analytics`, {
                params: { days: Number(days) },
            });
            setSummary((data?.data?.summary as AnalyticsSummary) ?? null);
            const nextTraffic = (data?.data?.traffic as TrafficSummary) ?? null;
            setTraffic(nextTraffic);
            if (nextTraffic?.files?.length) {
                setSelectedDomain((current) => {
                    if (current && nextTraffic.files.some((f) => f.domain === current)) {
                        return current;
                    }
                    return nextTraffic.files[0]?.domain ?? '';
                });
            } else {
                setSelectedDomain('');
            }
        } catch {
            setSummary(null);
            setTraffic(null);
            setSelectedDomain('');
        } finally {
            setLoading(false);
        }
    }, [uuidShort, days]);

    useEffect(() => {
        void load();
    }, [load]);

    const maxDayCount = Math.max(1, ...(summary?.by_day.map((d) => d.count) ?? [1]));
    const trafficDays = traffic?.by_day ?? [];
    const maxTrafficHits = Math.max(1, ...trafficDays.map((d) => d.hits), 1);

    const statusRows = useMemo(() => {
        const entries = Object.entries(traffic?.status ?? {});
        return entries.sort(([a], [b]) => Number(a) - Number(b));
    }, [traffic?.status]);

    const maxStatusCount = Math.max(1, ...statusRows.map(([, count]) => count));

    const selectedFile = useMemo(
        () => traffic?.files?.find((f) => f.domain === selectedDomain) ?? traffic?.files?.[0] ?? null,
        [traffic?.files, selectedDomain],
    );

    const domainOptions = useMemo(
        () =>
            (traffic?.files ?? []).map((file) => ({
                id: file.domain,
                name: file.domain,
            })),
        [traffic?.files],
    );

    return (
        <WebSpacePageWidgets pageId='webspace-analytics'>
            <div className='space-y-8 pb-12'>
                <PageHeader
                    title={t('webSpaces.analytics.title')}
                    description={t('webSpaces.analytics.description')}
                    actions={
                        <HeadlessSelect
                            value={days}
                            onChange={(val) => setDays(String(val))}
                            options={[
                                { id: '7', name: `7 ${t('webSpaces.analytics.days')}` },
                                { id: '30', name: `30 ${t('webSpaces.analytics.days')}` },
                                { id: '90', name: `90 ${t('webSpaces.analytics.days')}` },
                            ]}
                        />
                    }
                />
                {loading ? (
                    <div className='flex flex-col items-center justify-center py-24'>
                        <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
                        <p className='text-muted-foreground mt-4 font-medium'>{t('common.loading')}</p>
                    </div>
                ) : (
                    <div className='grid gap-4 lg:grid-cols-2'>
                        <div className='border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl'>
                            <p className='text-3xl font-semibold'>{traffic?.hits ?? 0}</p>
                            <p className='text-muted-foreground text-sm'>{t('webSpaces.analytics.httpHits')}</p>
                        </div>
                        <div className='border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl'>
                            <p className='text-3xl font-semibold'>
                                {traffic?.bytes != null ? `${(traffic.bytes / 1024).toFixed(1)} KB` : '0'}
                            </p>
                            <p className='text-muted-foreground text-sm'>{t('webSpaces.analytics.bandwidth')}</p>
                        </div>
                        <div className='border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl lg:col-span-2'>
                            <h3 className='mb-4 text-sm font-medium'>{t('webSpaces.analytics.httpByDay')}</h3>
                            {trafficDays.length ? (
                                <ul className='space-y-2'>
                                    {trafficDays.map((row) => (
                                        <li key={row.date} className='space-y-1'>
                                            <div className='flex items-center justify-between text-sm'>
                                                <span className='font-mono'>{row.date}</span>
                                                <span>{row.hits}</span>
                                            </div>
                                            <div className='bg-muted h-2 overflow-hidden rounded-full'>
                                                <div
                                                    className='bg-primary h-full rounded-full'
                                                    style={{ width: `${(row.hits / maxTrafficHits) * 100}%` }}
                                                />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className='text-muted-foreground text-sm'>{t('webSpaces.analytics.noTraffic')}</p>
                            )}
                        </div>
                        <div className='border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl lg:col-span-2'>
                            <h3 className='mb-4 text-sm font-medium'>{t('webSpaces.analytics.statusCodes')}</h3>
                            {statusRows.length ? (
                                <ul className='space-y-2'>
                                    {statusRows.map(([code, count]) => (
                                        <li key={code} className='space-y-1'>
                                            <div className='flex items-center justify-between text-sm'>
                                                <span className='font-mono'>{code}</span>
                                                <span>{count}</span>
                                            </div>
                                            <div className='bg-muted h-2 overflow-hidden rounded-full'>
                                                <div
                                                    className='bg-primary h-full rounded-full'
                                                    style={{ width: `${(count / maxStatusCount) * 100}%` }}
                                                />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className='text-muted-foreground text-sm'>{t('webSpaces.analytics.noTraffic')}</p>
                            )}
                        </div>
                        <div className='border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl'>
                            <p className='text-3xl font-semibold'>{summary?.total ?? 0}</p>
                            <p className='text-muted-foreground text-sm'>{t('webSpaces.analytics.totalEvents')}</p>
                        </div>
                        <div className='border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl'>
                            <h3 className='mb-4 text-sm font-medium'>{t('webSpaces.analytics.byDay')}</h3>
                            {summary?.by_day.length ? (
                                <ul className='space-y-2'>
                                    {summary.by_day.map((row) => (
                                        <li key={row.date} className='space-y-1'>
                                            <div className='flex items-center justify-between text-sm'>
                                                <span className='font-mono'>{row.date}</span>
                                                <span>{row.count}</span>
                                            </div>
                                            <div className='bg-muted h-2 overflow-hidden rounded-full'>
                                                <div
                                                    className='bg-primary h-full rounded-full'
                                                    style={{ width: `${(row.count / maxDayCount) * 100}%` }}
                                                />
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className='text-muted-foreground text-sm'>{t('webSpaces.analytics.noData')}</p>
                            )}
                        </div>
                        <div className='border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl'>
                            <h3 className='mb-4 text-sm font-medium'>{t('webSpaces.analytics.topEvents')}</h3>
                            {summary?.top_events.length ? (
                                <table className='w-full text-sm'>
                                    <thead>
                                        <tr className='text-muted-foreground border-b text-left'>
                                            <th className='py-2 pr-4'>{t('webSpaces.analytics.event')}</th>
                                            <th className='py-2'>{t('webSpaces.analytics.count')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summary.top_events.map((row) => (
                                            <tr key={row.event} className='border-border/50 border-b'>
                                                <td className='py-2 pr-4 font-mono'>{row.event}</td>
                                                <td className='py-2'>{row.count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className='text-muted-foreground text-sm'>{t('webSpaces.analytics.noData')}</p>
                            )}
                        </div>
                        {(domainOptions.length > 0 || selectedFile?.access_tail || selectedFile?.error_tail) && (
                            <div className='border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl lg:col-span-2'>
                                <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                                    <h3 className='text-sm font-medium'>{t('webSpaces.analytics.accessLogs')}</h3>
                                    {domainOptions.length > 1 && (
                                        <div className='min-w-[12rem]'>
                                            <HeadlessSelect
                                                value={selectedDomain}
                                                onChange={(val) => setSelectedDomain(String(val))}
                                                options={domainOptions}
                                                placeholder={t('webSpaces.analytics.domainFilter')}
                                            />
                                        </div>
                                    )}
                                </div>
                                {selectedFile?.access_tail ? (
                                    <pre className='bg-muted/50 mb-3 max-h-48 overflow-auto rounded-lg p-3 font-mono text-xs'>
                                        {selectedFile.domain}
                                        {'\n'}
                                        {selectedFile.access_tail}
                                    </pre>
                                ) : (
                                    <p className='text-muted-foreground text-sm'>{t('webSpaces.analytics.noTraffic')}</p>
                                )}
                                {selectedFile?.error_tail && (
                                    <>
                                        <h4 className='mb-2 text-sm font-medium'>{t('webSpaces.analytics.errorLogs')}</h4>
                                        <pre className='bg-muted/50 max-h-48 overflow-auto rounded-lg p-3 font-mono text-xs'>
                                            {selectedFile.domain}
                                            {'\n'}
                                            {selectedFile.error_tail}
                                        </pre>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </WebSpacePageWidgets>
    );
}
