/*
This file is part of FeatherPanel.
 */

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

import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { PageCard } from '@/components/featherui/PageCard';
import { cn } from '@/lib/utils';

interface SetupItem {
    id: string;
    label: string;
    ok: boolean;
    href: string;
    detail?: string;
}

export function WebSpaceSetupChecklist({ uuidShort }: { uuidShort: string }) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<SetupItem[]>([]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [spaceRes, utilRes, backupRes, gitRes, sslRes] = await Promise.all([
                axios.get(`/api/user/webspaces/${uuidShort}`),
                axios.get(`/api/user/webspaces/${uuidShort}/utilization`).catch(() => null),
                axios.get(`/api/user/webspaces/${uuidShort}/backups`).catch(() => null),
                axios.get(`/api/user/webspaces/${uuidShort}/apps/git-webhook`).catch(() => null),
                axios.get(`/api/user/webspaces/${uuidShort}/ssl`).catch(() => null),
            ]);

            const ws = spaceRes.data?.data?.webspace as {
                ssl?: boolean;
                dns_status?: string;
                webplate_runtime?: string;
            };
            const util = utilRes?.data?.data?.utilization as { state?: string } | undefined;
            const backups = (backupRes?.data?.data?.backups as unknown[]) ?? [];
            const gitConfig = gitRes?.data?.data?.config;
            const sslBody = sslRes?.data?.data;
            const domains =
                (sslBody?.domains as { days_remaining?: number | null; nginx_cert_present?: boolean }[]) ?? [];
            const minDays = domains.reduce<number | null>((min, d) => {
                const days = d.days_remaining;
                if (days == null) return min;
                return min == null ? days : Math.min(min, days);
            }, null);

            const base = `/webspace/${uuidShort}`;
            const runtime = (ws?.webplate_runtime || 'static').toLowerCase();
            const state = (util?.state || '').toLowerCase();
            const dnsOk = (ws?.dns_status || '').toLowerCase() === 'ok';
            const sslOk = !!ws?.ssl && (minDays == null || minDays > 14);
            const runtimeOk = runtime === 'static' || state === 'running';
            const backupOk = backups.length > 0;
            const gitOk = !!gitConfig?.repo;

            const list: SetupItem[] = [
                {
                    id: 'dns',
                    label: t('webSpaces.setup.dns'),
                    ok: dnsOk,
                    href: `${base}/domains`,
                    detail: dnsOk ? undefined : t('webSpaces.setup.dnsHint'),
                },
                {
                    id: 'ssl',
                    label: t('webSpaces.setup.ssl'),
                    ok: sslOk,
                    href: `${base}/domains`,
                    detail:
                        minDays != null && minDays <= 14
                            ? t('webSpaces.setup.sslExpiring', { n: String(minDays) })
                            : undefined,
                },
                {
                    id: 'runtime',
                    label: t('webSpaces.setup.runtime'),
                    ok: runtimeOk,
                    href: base,
                    detail: runtimeOk ? undefined : t('webSpaces.setup.runtimeHint'),
                },
                {
                    id: 'backup',
                    label: t('webSpaces.setup.backup'),
                    ok: backupOk,
                    href: `${base}/backups`,
                },
                {
                    id: 'git',
                    label: t('webSpaces.setup.git'),
                    ok: gitOk,
                    href: `${base}/apps`,
                },
            ];

            setItems(list);
        } catch {
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [t, uuidShort]);

    useEffect(() => {
        void load();
    }, [load]);

    const done = items.filter((i) => i.ok).length;
    const total = items.length;

    return (
        <PageCard title={t('webSpaces.setup.title')} description={t('webSpaces.setup.description')}>
            {loading ? (
                <div className='flex items-center gap-2 text-sm'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    {t('common.loading')}
                </div>
            ) : (
                <div className='space-y-3'>
                    <p className='text-muted-foreground text-sm'>
                        {t('webSpaces.setup.progress', { done: String(done), total: String(total) })}
                    </p>
                    <ul className='space-y-2'>
                        {items.map((item) => (
                            <li key={item.id}>
                                <Link
                                    href={item.href}
                                    className='hover:bg-muted/50 flex items-start gap-2 rounded-lg border p-3 transition-colors'
                                >
                                    {item.ok ? (
                                        <CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0 text-green-600' />
                                    ) : (
                                        <Circle className='text-muted-foreground mt-0.5 h-4 w-4 shrink-0' />
                                    )}
                                    <span className='min-w-0 flex-1'>
                                        <span className={cn('text-sm font-medium', item.ok && 'text-muted-foreground')}>
                                            {item.label}
                                        </span>
                                        {item.detail ? (
                                            <span className='text-muted-foreground mt-0.5 block text-xs'>
                                                {item.detail}
                                            </span>
                                        ) : null}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </PageCard>
    );
}

export function WebSpaceHealthBanners({
    util,
    space,
}: {
    util?: {
        bandwidth_over_quota?: boolean | null;
        state?: string | null;
    } | null;
    space?: {
        status?: string;
        ssl?: boolean;
    } | null;
}) {
    const { t } = useTranslation();
    const banners: { key: string; text: string; tone: 'warning' | 'error' }[] = [];

    if (util?.bandwidth_over_quota) {
        banners.push({ key: 'bw', text: t('webSpaces.health.bandwidthOver'), tone: 'error' });
    }
    if (space?.status === 'suspended') {
        banners.push({ key: 'susp', text: t('webSpaces.health.suspended'), tone: 'error' });
    }
    if (space?.status === 'failed') {
        banners.push({ key: 'fail', text: t('webSpaces.health.installFailed'), tone: 'error' });
    }
    if (util?.state && util.state !== 'running' && space?.status === 'installed') {
        banners.push({ key: 'state', text: t('webSpaces.health.runtimeStopped'), tone: 'warning' });
    }

    if (banners.length === 0) return null;

    return (
        <div className='space-y-2'>
            {banners.map((b) => (
                <div
                    key={b.key}
                    className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                        b.tone === 'error'
                            ? 'border-destructive/30 bg-destructive/10 text-destructive'
                            : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200',
                    )}
                >
                    <AlertTriangle className='h-4 w-4 shrink-0' />
                    {b.text}
                </div>
            ))}
        </div>
    );
}
