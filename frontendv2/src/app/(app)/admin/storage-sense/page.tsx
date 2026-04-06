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

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import Permissions from '@/lib/permissions';
import { PageHeader } from '@/components/featherui/PageHeader';
import { PageCard } from '@/components/featherui/PageCard';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Bot,
    BrushCleaning,
    Database,
    FileText,
    KeyRound,
    Loader2,
    Mail,
    RefreshCw,
    ScrollText,
    Search,
    Server,
    Cloud,
    Shield,
    Trash2,
    TriangleAlert,
    Bell,
    History,
    HardDrive,
    Copy,
    CheckSquare,
    type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
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
import { cn, formatFileSize, copyToClipboard } from '@/lib/utils';

interface StorageCategory {
    id: string;
    table: string;
    available: boolean;
    uses_retention_days: boolean;
    row_count: number;
    purgeable_count: number;
    approx_data_bytes: number;
}

interface Totals {
    tables_tracked: number;
    total_rows: number;
    total_purgeable: number;
    approx_data_bytes: number;
}

interface DiskInfo {
    path: string;
    bytes: number;
}

const MIN_DAYS = 7;
const MAX_DAYS = 3650;

const PRESETS = [30, 90, 180, 365] as const;

const CATEGORY_ICONS: Record<string, LucideIcon> = {
    user_activity: History,
    server_activity: Server,
    vm_instance_activity: Cloud,
    vm_panel_logs: ScrollText,
    chatbot_data: Bot,
    mail_history: Mail,
    admin_notifications: Bell,
    featherzerotrust_logs: Shield,
    sso_expired_tokens: KeyRound,
};

export default function StorageSensePage() {
    const { t } = useTranslation();
    const { hasPermission } = useSession();
    const canPurge = hasPermission(Permissions.ADMIN_STORAGE_SENSE_MANAGE);

    const [daysOld, setDaysOld] = useState(90);
    const [daysInput, setDaysInput] = useState('90');
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<StorageCategory[]>([]);
    const [totals, setTotals] = useState<Totals | null>(null);
    const [disk, setDisk] = useState<DiskInfo | null>(null);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [purgeTarget, setPurgeTarget] = useState<StorageCategory | null>(null);
    const [batchOpen, setBatchOpen] = useState(false);
    const [purging, setPurging] = useState(false);

    const { fetchWidgets, getWidgets } = usePluginWidgets('admin-storage-sense');

    const fetchSummary = useCallback(
        async (overrideDays?: number) => {
            const fromField = parseInt(daysInput, 10) || MIN_DAYS;
            const parsed = Math.max(
                MIN_DAYS,
                Math.min(MAX_DAYS, overrideDays !== undefined ? overrideDays : fromField),
            );
            setDaysOld(parsed);
            setDaysInput(String(parsed));
            setLoading(true);
            try {
                const { data } = await axios.get<{
                    success: boolean;
                    data?: {
                        categories: StorageCategory[];
                        days_old: number;
                        totals: Totals;
                        disk: DiskInfo;
                    };
                    message?: string;
                }>('/api/admin/storage-sense', { params: { days_old: parsed } });
                if (data.success && data.data?.categories) {
                    setCategories(data.data.categories);
                    setTotals(data.data.totals ?? null);
                    setDisk(data.data.disk ?? null);
                    setSelected(new Set());
                } else {
                    toast.error(data.message || t('admin.storage_sense.load_failed'));
                }
            } catch {
                toast.error(t('admin.storage_sense.load_failed'));
            } finally {
                setLoading(false);
            }
        },
        [daysInput, t],
    );

    useEffect(() => {
        fetchWidgets();
    }, [fetchWidgets]);

    useEffect(() => {
        void fetchSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const categoryTitle = (id: string) =>
        t(`admin.storage_sense.categories.${id}.title` as 'admin.storage_sense.categories.user_activity.title');
    const categoryDesc = (id: string) =>
        t(
            `admin.storage_sense.categories.${id}.description` as 'admin.storage_sense.categories.user_activity.description',
        );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return categories;
        return categories.filter((row) => {
            const title = t(`admin.storage_sense.categories.${row.id}.title` as never)
                .toString()
                .toLowerCase();
            return row.table.toLowerCase().includes(q) || row.id.toLowerCase().includes(q) || title.includes(q);
        });
    }, [categories, search, t]);

    const selectAllEligible = () => {
        const next = new Set<string>();
        for (const row of filtered) {
            if (row.available && row.purgeable_count > 0) next.add(row.id);
        }
        setSelected(next);
    };

    const toggleRow = (id: string) => {
        setSelected((prev) => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id);
            else n.add(id);
            return n;
        });
    };

    const copyJsonSummary = async () => {
        const payload = {
            generated_at: new Date().toISOString(),
            days_old: daysOld,
            totals,
            disk,
            categories,
        };
        await copyToClipboard(JSON.stringify(payload, null, 2), t);
    };

    const runSinglePurge = async () => {
        if (!purgeTarget || !canPurge) return;
        if (purgeTarget.purgeable_count === 0) {
            toast.message(t('admin.storage_sense.purge_none'));
            setPurgeTarget(null);
            return;
        }
        setPurging(true);
        try {
            const { data } = await axios.post<{
                success: boolean;
                data?: { deleted: number };
                message?: string;
            }>('/api/admin/storage-sense/purge', {
                target: purgeTarget.id,
                days_old: daysOld,
            });
            if (data.success && data.data) {
                if (data.data.deleted === 0) {
                    toast.message(t('admin.storage_sense.purge_none'));
                } else {
                    toast.success(t('admin.storage_sense.purge_success', { count: String(data.data.deleted) }));
                }
                await fetchSummary();
            } else {
                toast.error(data.message || t('admin.storage_sense.purge_failed'));
            }
        } catch {
            toast.error(t('admin.storage_sense.purge_failed'));
        } finally {
            setPurging(false);
            setPurgeTarget(null);
        }
    };

    const runBatchPurge = async () => {
        if (!canPurge || selected.size === 0) return;
        setPurging(true);
        try {
            const { data } = await axios.post<{
                success: boolean;
                data?: { deleted_total: number; results: { target: string; deleted: number; success: boolean }[] };
                message?: string;
            }>('/api/admin/storage-sense/purge-batch', {
                targets: Array.from(selected),
                days_old: daysOld,
            });
            if (data.success && data.data) {
                const total = data.data.deleted_total;
                const anyFail = data.data.results.some((r) => !r.success);
                if (total === 0 && !anyFail) {
                    toast.message(t('admin.storage_sense.purge_none'));
                } else if (anyFail && total > 0) {
                    toast.success(t('admin.storage_sense.batch_done_with_skips', { count: String(total) }));
                } else if (total > 0) {
                    toast.success(t('admin.storage_sense.batch_success', { count: String(total) }));
                } else {
                    toast.message(t('admin.storage_sense.purge_none'));
                }
                await fetchSummary();
            } else {
                toast.error(data.message || t('admin.storage_sense.purge_failed'));
            }
        } catch {
            toast.error(t('admin.storage_sense.purge_failed'));
        } finally {
            setPurging(false);
            setBatchOpen(false);
        }
    };

    const StatMini = ({
        label,
        value,
        sub,
        icon: Icon,
    }: {
        label: string;
        value: string;
        sub?: string;
        icon: LucideIcon;
    }) => (
        <div className='rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-4 flex gap-3'>
            <div className='rounded-lg bg-primary/10 p-2.5 h-fit text-primary'>
                <Icon className='h-5 w-5' />
            </div>
            <div className='min-w-0'>
                <p className='text-xs font-medium text-muted-foreground uppercase tracking-wide'>{label}</p>
                <p className='text-xl font-semibold tabular-nums truncate'>{value}</p>
                {sub ? <p className='text-xs text-muted-foreground mt-0.5'>{sub}</p> : null}
            </div>
        </div>
    );

    return (
        <div className='space-y-6 pb-10'>
            <WidgetRenderer widgets={getWidgets('admin-storage-sense', 'top-of-page')} />
            <PageHeader
                title={t('admin.storage_sense.title')}
                description={t('admin.storage_sense.subtitle')}
                icon={BrushCleaning}
            />

            <div className='relative overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-br from-primary/10 via-background to-background p-4 sm:p-5'>
                <div className='relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4'>
                    <TriangleAlert className='h-10 w-10 text-amber-600 dark:text-amber-400 shrink-0' />
                    <div>
                        <p className='font-semibold text-foreground'>{t('common.warning')}</p>
                        <p className='text-sm text-muted-foreground mt-1 max-w-3xl'>
                            {t('admin.storage_sense.warning')}
                        </p>
                    </div>
                </div>
                <div className='absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl pointer-events-none' />
            </div>

            {totals && !loading ? (
                <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3'>
                    <StatMini
                        label={t('admin.storage_sense.stats_tables')}
                        value={String(totals.tables_tracked)}
                        icon={Database}
                    />
                    <StatMini
                        label={t('admin.storage_sense.stats_total_rows')}
                        value={totals.total_rows.toLocaleString()}
                        icon={FileText}
                    />
                    <StatMini
                        label={t('admin.storage_sense.stats_purgeable')}
                        value={totals.total_purgeable.toLocaleString()}
                        sub={
                            totals.total_rows > 0
                                ? `${Math.min(100, Math.round((totals.total_purgeable / totals.total_rows) * 100))}% ${t('admin.storage_sense.share_of_db')}`
                                : undefined
                        }
                        icon={Trash2}
                    />
                    <StatMini
                        label={t('admin.storage_sense.stats_db_bytes')}
                        value={formatFileSize(totals.approx_data_bytes)}
                        sub={t('admin.storage_sense.estimate_note')}
                        icon={HardDrive}
                    />
                </div>
            ) : null}

            {disk && !loading ? (
                <PageCard>
                    <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
                        <div>
                            <h3 className='font-semibold flex items-center gap-2'>
                                <HardDrive className='h-4 w-4' />
                                {t('admin.storage_sense.disk_card_title')}
                            </h3>
                            <p className='text-sm text-muted-foreground mt-1 max-w-xl'>
                                {t('admin.storage_sense.disk_card_desc')}
                            </p>
                            <p className='text-xs font-mono text-muted-foreground mt-2'>
                                {disk.path} · {formatFileSize(disk.bytes)}
                            </p>
                        </div>
                        <Button variant='outline' asChild>
                            <Link href='/admin/logs'>{t('admin.storage_sense.open_logs')}</Link>
                        </Button>
                    </div>
                </PageCard>
            ) : null}

            <PageCard className='space-y-4'>
                <div className='flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end'>
                    <div className='space-y-2 flex-1 min-w-[12rem]'>
                        <Label>{t('admin.storage_sense.retention_label')}</Label>
                        <p className='text-xs text-muted-foreground'>{t('admin.storage_sense.retention_presets')}</p>
                        <div className='flex flex-wrap gap-2'>
                            {PRESETS.map((d) => (
                                <Button
                                    key={d}
                                    type='button'
                                    size='sm'
                                    variant={daysOld === d ? 'default' : 'outline'}
                                    onClick={() => void fetchSummary(d)}
                                >
                                    {d}d
                                </Button>
                            ))}
                        </div>
                        <Input
                            id='kwd-retention'
                            type='number'
                            min={MIN_DAYS}
                            max={MAX_DAYS}
                            value={daysInput}
                            onChange={(e) => setDaysInput(e.target.value)}
                            className='max-w-[11rem]'
                        />
                        <p className='text-xs text-muted-foreground'>{t('admin.storage_sense.retention_hint')}</p>
                    </div>
                    <div className='flex flex-1 flex-wrap gap-2 items-center min-w-48'>
                        <div className='relative flex-1 min-w-40'>
                            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                            <Input
                                placeholder={t('admin.storage_sense.search_placeholder')}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className='pl-9'
                            />
                        </div>
                        <Button type='button' variant='outline' onClick={() => void fetchSummary()} disabled={loading}>
                            <RefreshCw className={cn('h-4 w-4 sm:mr-2', loading && 'animate-spin')} />
                            <span className='hidden sm:inline'>{t('admin.storage_sense.refresh')}</span>
                        </Button>
                        <Button
                            type='button'
                            variant='outline'
                            onClick={() => void copyJsonSummary()}
                            disabled={loading || !categories.length}
                        >
                            <Copy className='h-4 w-4 sm:mr-2' />
                            <span className='hidden sm:inline'>{t('admin.storage_sense.copy_summary')}</span>
                        </Button>
                    </div>
                </div>

                {!canPurge ? (
                    <p className='text-sm text-amber-700 dark:text-amber-300'>
                        {t('admin.storage_sense.no_edit_permission')}
                    </p>
                ) : (
                    <div className='flex flex-wrap items-center gap-2 pt-2 border-t border-border/50'>
                        <Button
                            type='button'
                            variant='secondary'
                            size='sm'
                            onClick={selectAllEligible}
                            disabled={loading}
                        >
                            <CheckSquare className='h-4 w-4 mr-2' />
                            {t('admin.storage_sense.select_visible')}
                        </Button>
                        <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => setSelected(new Set())}
                            disabled={loading || selected.size === 0}
                        >
                            {t('admin.storage_sense.clear_selection')}
                        </Button>
                        <span className='text-sm text-muted-foreground mx-1'>
                            {t('admin.storage_sense.batch_selected', { count: String(selected.size) })}
                        </span>
                        <Button
                            type='button'
                            variant='destructive'
                            size='sm'
                            disabled={loading || selected.size === 0}
                            onClick={() => setBatchOpen(true)}
                        >
                            <Trash2 className='h-4 w-4 mr-2' />
                            {t('admin.storage_sense.batch_purge')}
                        </Button>
                    </div>
                )}
            </PageCard>

            <PageCard className='overflow-hidden p-0'>
                {loading ? (
                    <div className='p-8 space-y-4 animate-pulse'>
                        <div className='h-10 bg-muted rounded-lg' />
                        <div className='h-12 bg-muted rounded-lg' />
                        <div className='h-12 bg-muted rounded-lg' />
                        <div className='h-12 bg-muted rounded-lg' />
                    </div>
                ) : (
                    <div className='overflow-x-auto'>
                        <table className='w-full text-sm'>
                            <thead>
                                <tr className='border-b border-border bg-muted/40 text-left'>
                                    {canPurge ? (
                                        <th className='p-3 w-10'>
                                            <span className='sr-only'>{t('admin.storage_sense.select')}</span>
                                        </th>
                                    ) : null}
                                    <th className='p-3 min-w-56'>{t('admin.storage_sense.table')}</th>
                                    <th className='p-3 text-right tabular-nums whitespace-nowrap'>
                                        {t('admin.storage_sense.rows_total')}
                                    </th>
                                    <th className='p-3 text-right tabular-nums whitespace-nowrap'>
                                        {t('admin.storage_sense.rows_purgeable')}
                                    </th>
                                    <th className='p-3 text-right whitespace-nowrap hidden md:table-cell'>
                                        {t('admin.storage_sense.approx_size')}
                                    </th>
                                    <th className='p-3 min-w-32 hidden lg:table-cell'>
                                        {t('admin.storage_sense.progress_legend')}
                                    </th>
                                    <th className='p-3 text-right'>{t('common.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className='divide-y divide-border/60'>
                                {filtered.map((row) => {
                                    const Icon = CATEGORY_ICONS[row.id] ?? Database;
                                    const ratio =
                                        row.available && row.row_count > 0
                                            ? Math.min(100, Math.round((row.purgeable_count / row.row_count) * 100))
                                            : 0;
                                    const shareDb =
                                        totals && totals.approx_data_bytes > 0
                                            ? Math.round((row.approx_data_bytes / totals.approx_data_bytes) * 100)
                                            : 0;
                                    return (
                                        <tr key={row.id} className='hover:bg-muted/30 transition-colors'>
                                            {canPurge ? (
                                                <td className='p-3 align-middle'>
                                                    <Checkbox
                                                        checked={selected.has(row.id)}
                                                        onCheckedChange={() => toggleRow(row.id)}
                                                        disabled={!row.available || row.purgeable_count === 0}
                                                        aria-label={categoryTitle(row.id)}
                                                    />
                                                </td>
                                            ) : null}
                                            <td className='p-3 align-middle'>
                                                <div className='flex gap-3 min-w-0'>
                                                    <div className='rounded-lg bg-primary/10 p-2 text-primary h-fit shrink-0'>
                                                        <Icon className='h-4 w-4' />
                                                    </div>
                                                    <div className='min-w-0'>
                                                        <div className='font-medium'>{categoryTitle(row.id)}</div>
                                                        <div className='text-xs text-muted-foreground line-clamp-2'>
                                                            {categoryDesc(row.id)}
                                                        </div>
                                                        <div className='text-[10px] font-mono text-muted-foreground/90 mt-1 truncate'>
                                                            {row.table}
                                                        </div>
                                                        {!row.uses_retention_days ? (
                                                            <span className='inline-flex mt-1 text-[10px] font-semibold uppercase tracking-wide text-primary'>
                                                                {t('admin.storage_sense.retention_na')}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className='p-3 text-right tabular-nums align-middle'>
                                                {row.available ? row.row_count.toLocaleString() : '—'}
                                            </td>
                                            <td className='p-3 text-right tabular-nums align-middle font-medium'>
                                                {!row.available
                                                    ? t('admin.storage_sense.not_installed')
                                                    : row.purgeable_count.toLocaleString()}
                                            </td>
                                            <td className='p-3 text-right align-middle hidden md:table-cell'>
                                                {row.available ? (
                                                    <div>
                                                        <div>{formatFileSize(row.approx_data_bytes)}</div>
                                                        {totals && totals.approx_data_bytes > 0 ? (
                                                            <div className='text-[10px] text-muted-foreground'>
                                                                {t('admin.storage_sense.tracked_percent', {
                                                                    percent: String(shareDb),
                                                                })}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                            <td className='p-3 align-middle hidden lg:table-cell'>
                                                {row.available && row.row_count > 0 ? (
                                                    <div className='space-y-1 max-w-[180px]'>
                                                        <div className='h-2 rounded-full bg-muted overflow-hidden'>
                                                            <div
                                                                className='h-full rounded-full bg-amber-500/80'
                                                                style={{ width: `${ratio}%` }}
                                                            />
                                                        </div>
                                                        <span className='text-[10px] text-muted-foreground'>
                                                            {t('admin.storage_sense.eligible_percent', {
                                                                percent: String(ratio),
                                                            })}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className='text-muted-foreground'>—</span>
                                                )}
                                            </td>
                                            <td className='p-3 text-right align-middle'>
                                                <Button
                                                    type='button'
                                                    variant='outline'
                                                    size='sm'
                                                    className='border-destructive/40 text-destructive hover:bg-destructive/10'
                                                    disabled={!canPurge || !row.available || row.purgeable_count === 0}
                                                    onClick={() => setPurgeTarget(row)}
                                                >
                                                    <Trash2 className='h-3.5 w-3.5 sm:mr-1' />
                                                    <span className='hidden sm:inline'>
                                                        {t('admin.storage_sense.purge')}
                                                    </span>
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </PageCard>

            <AlertDialog open={purgeTarget !== null} onOpenChange={(open) => !open && !purging && setPurgeTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin.storage_sense.purge_confirm_title')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {purgeTarget
                                ? purgeTarget.uses_retention_days
                                    ? t('admin.storage_sense.purge_confirm_desc', {
                                          count: String(purgeTarget.purgeable_count),
                                          label: categoryTitle(purgeTarget.id),
                                          days: String(daysOld),
                                      })
                                    : t('admin.storage_sense.purge_confirm_desc_sso', {
                                          count: String(purgeTarget.purgeable_count),
                                          label: categoryTitle(purgeTarget.id),
                                      })
                                : null}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={purging}>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                void runSinglePurge();
                            }}
                            disabled={purging}
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        >
                            {purging ? (
                                <>
                                    <Loader2 className='h-4 w-4 animate-spin mr-2 inline' />
                                    {t('admin.storage_sense.purge')}
                                </>
                            ) : (
                                t('admin.storage_sense.purge')
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={batchOpen} onOpenChange={(open) => !open && !purging && setBatchOpen(false)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('admin.storage_sense.batch_confirm_title')}</AlertDialogTitle>
                        <AlertDialogDescription className='space-y-2'>
                            <p>
                                {t('admin.storage_sense.batch_confirm_desc', {
                                    count: String(selected.size),
                                    days: String(daysOld),
                                })}
                            </p>
                            <ul className='list-disc pl-4 max-h-40 overflow-y-auto text-sm'>
                                {Array.from(selected).map((id) => (
                                    <li key={id}>{categoryTitle(id)}</li>
                                ))}
                            </ul>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={purging}>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                void runBatchPurge();
                            }}
                            disabled={purging}
                            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        >
                            {purging ? (
                                <>
                                    <Loader2 className='h-4 w-4 animate-spin mr-2 inline' />
                                    {t('admin.storage_sense.batch_purge')}
                                </>
                            ) : (
                                t('admin.storage_sense.batch_purge')
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <WidgetRenderer widgets={getWidgets('admin-storage-sense', 'bottom-of-page')} />
        </div>
    );
}
