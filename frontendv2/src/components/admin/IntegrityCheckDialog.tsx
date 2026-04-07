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
import api from '@/lib/api';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSession } from '@/contexts/SessionContext';
import Permissions from '@/lib/permissions';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/featherui/Button';
import { Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { copyToClipboard, cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface IntegrityComparison {
    matches: number;
    modified: { path: string; expected: string; actual: string }[];
    missing: { path: string; expected: string }[];
    extra: { path: string; actual: string }[];
}

export interface IntegrityCheckData {
    scanned_at: string;
    duration_ms: number;
    app_root_label: string;
    files_scanned: number;
    total_bytes_hashed: number;
    skipped_large_files: { path: string; bytes: number }[];
    read_errors: { path: string; message: string }[];
    files: { path: string; sha256: string; bytes: number }[];
    baseline_present: boolean;
    baseline_created_at: string | null;
    baseline_panel_version: string | null;
    comparison: IntegrityComparison | null;
}

interface IntegrityCheckDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function IntegrityCheckDialog({ open, onOpenChange }: IntegrityCheckDialogProps) {
    const { t } = useTranslation();
    const { hasPermission } = useSession();
    const canSaveBaseline = hasPermission(Permissions.ADMIN_SETTINGS_EDIT);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [data, setData] = useState<IntegrityCheckData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const runScan = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: res } = await api.get<{ success: boolean; data?: IntegrityCheckData; message?: string }>(
                '/admin/integrity/check',
                { params: { include_files: 1 } },
            );
            if (res.success && res.data) {
                setData(res.data);
            } else {
                setData(null);
                setError(res.message || t('admin.version.integrity_scan_failed'));
            }
        } catch (e: unknown) {
            setData(null);
            let msg: string | null = null;
            if (e && typeof e === 'object' && 'response' in e) {
                const data = (e as { response?: { data?: { error_message?: string } } }).response?.data;
                if (data?.error_message) msg = data.error_message;
            }
            setError(msg || t('admin.version.integrity_scan_failed'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (open) {
            void runScan();
        } else {
            setData(null);
            setError(null);
        }
    }, [open, runScan]);

    const handleSaveBaseline = async () => {
        if (!canSaveBaseline) return;
        setSaving(true);
        try {
            const { data: res } = await api.post<{ success: boolean; message?: string }>('/admin/integrity/baseline');
            if (res.success) {
                toast.success(t('admin.version.integrity_baseline_saved'));
                await runScan();
            } else {
                toast.error(res.message || t('admin.version.integrity_baseline_failed'));
            }
        } catch {
            toast.error(t('admin.version.integrity_baseline_failed'));
        } finally {
            setSaving(false);
        }
    };

    const driftTotal =
        data?.comparison === null || data?.comparison === undefined
            ? null
            : data.comparison.modified.length + data.comparison.missing.length + data.comparison.extra.length;

    const baselineOk = data?.baseline_present && data.comparison !== null && driftTotal === 0;

    const baselineUntracked = data && !data.baseline_present;

    return (
        <Dialog open={open} onOpenChange={onOpenChange} className='max-w-2xl'>
            <DialogContent className='flex max-h-[min(90dvh,40rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl'>
                <DialogHeader className='border-b border-border/50 px-4 py-4 text-left sm:px-6'>
                    <div className='flex items-start gap-3'>
                        <div
                            className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60',
                                baselineOk ? 'bg-emerald-500/15 text-emerald-600' : 'bg-primary/10 text-primary',
                            )}
                        >
                            {baselineOk ? (
                                <ShieldCheck className='h-5 w-5' aria-hidden />
                            ) : (
                                <ShieldAlert className='h-5 w-5' aria-hidden />
                            )}
                        </div>
                        <div className='min-w-0 flex-1 space-y-1'>
                            <DialogTitle className='text-base sm:text-lg'>
                                {t('admin.version.integrity_modal_title')}
                            </DialogTitle>
                            <DialogDescription className='text-xs sm:text-sm'>
                                {t('admin.version.integrity_modal_desc')}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className='min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6'>
                    {loading ? (
                        <div className='flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground'>
                            <Loader2 className='h-8 w-8 animate-spin' />
                            <p className='text-sm'>{t('admin.version.integrity_scan_running')}</p>
                        </div>
                    ) : error ? (
                        <p className='rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
                            {error}
                        </p>
                    ) : data ? (
                        <div className='space-y-4 text-sm'>
                            <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                                <div className='rounded-lg border border-border/50 bg-muted/20 px-3 py-2'>
                                    <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                                        {t('admin.version.integrity_files')}
                                    </p>
                                    <p className='text-lg font-semibold tabular-nums'>{data.files_scanned}</p>
                                </div>
                                <div className='rounded-lg border border-border/50 bg-muted/20 px-3 py-2'>
                                    <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                                        {t('admin.version.integrity_duration')}
                                    </p>
                                    <p className='text-lg font-semibold tabular-nums'>{data.duration_ms} ms</p>
                                </div>
                                <div className='col-span-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 sm:col-span-1'>
                                    <p className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
                                        {t('admin.version.integrity_bytes')}
                                    </p>
                                    <p className='text-lg font-semibold tabular-nums'>
                                        {data.total_bytes_hashed.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <p className='text-xs text-muted-foreground'>{t('admin.version.integrity_scope')}</p>

                            {data.baseline_present ? (
                                <div className='rounded-lg border border-border/40 bg-card/50 px-3 py-2 text-xs'>
                                    <p className='font-semibold text-foreground'>
                                        {t('admin.version.integrity_baseline_title')}
                                    </p>
                                    <p className='mt-1 text-muted-foreground'>
                                        {data.baseline_created_at
                                            ? t('admin.version.integrity_baseline_saved_at', {
                                                  date: data.baseline_created_at,
                                              })
                                            : t('admin.version.integrity_baseline_unknown_date')}
                                        {data.baseline_panel_version
                                            ? ` · ${t('admin.version.integrity_baseline_version', { v: data.baseline_panel_version })}`
                                            : ''}
                                    </p>
                                </div>
                            ) : (
                                <div className='rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300'>
                                    {t('admin.version.integrity_no_baseline')}
                                </div>
                            )}

                            {data.comparison && (
                                <div className='space-y-2'>
                                    <p className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                                        {t('admin.version.integrity_drift_heading')}
                                    </p>
                                    <div className='grid grid-cols-3 gap-2 text-center text-xs'>
                                        <div className='rounded-md border border-border/50 py-2'>
                                            <p className='font-bold text-destructive'>
                                                {data.comparison.modified.length}
                                            </p>
                                            <p className='text-muted-foreground'>
                                                {t('admin.version.integrity_modified')}
                                            </p>
                                        </div>
                                        <div className='rounded-md border border-border/50 py-2'>
                                            <p className='font-bold text-amber-600'>{data.comparison.missing.length}</p>
                                            <p className='text-muted-foreground'>
                                                {t('admin.version.integrity_missing')}
                                            </p>
                                        </div>
                                        <div className='rounded-md border border-border/50 py-2'>
                                            <p className='font-bold text-blue-600'>{data.comparison.extra.length}</p>
                                            <p className='text-muted-foreground'>
                                                {t('admin.version.integrity_extra')}
                                            </p>
                                        </div>
                                    </div>
                                    {data.comparison.modified.length > 0 && (
                                        <div className='max-h-32 overflow-y-auto rounded-md border border-border/40 bg-muted/10 p-2 font-mono text-[10px]'>
                                            {data.comparison.modified.map((m) => (
                                                <div
                                                    key={m.path}
                                                    className='truncate border-b border-border/30 py-1 last:border-0'
                                                >
                                                    {m.path}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {(data.read_errors.length > 0 || data.skipped_large_files.length > 0) && (
                                <div className='rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs'>
                                    {data.read_errors.length > 0 && (
                                        <p className='text-destructive'>
                                            {t('admin.version.integrity_read_errors', {
                                                count: String(data.read_errors.length),
                                            })}
                                        </p>
                                    )}
                                    {data.skipped_large_files.length > 0 && (
                                        <p className='text-muted-foreground'>
                                            {t('admin.version.integrity_skipped_large', {
                                                count: String(data.skipped_large_files.length),
                                            })}
                                        </p>
                                    )}
                                </div>
                            )}

                            {baselineOk && (
                                <p className='text-xs font-medium text-emerald-600 dark:text-emerald-400'>
                                    {t('admin.version.integrity_match_ok')}
                                </p>
                            )}
                            {!baselineUntracked && driftTotal !== null && driftTotal > 0 && (
                                <p className='text-xs text-amber-600 dark:text-amber-400'>
                                    {t('admin.version.integrity_drift_warning')}
                                </p>
                            )}
                        </div>
                    ) : null}
                </div>

                <DialogFooter className='flex-col gap-2 border-t border-border/50 bg-muted/10 px-4 py-3 sm:flex-row sm:flex-wrap sm:justify-end sm:px-6'>
                    {canSaveBaseline && !loading && data && (
                        <Button
                            type='button'
                            variant='secondary'
                            className='inline-flex w-full items-center justify-center sm:order-first sm:mr-auto sm:w-auto'
                            disabled={saving}
                            onClick={() => void handleSaveBaseline()}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className='h-4 w-4 animate-spin' />
                                    <span className='ml-2'>{t('common.saving')}</span>
                                </>
                            ) : (
                                t('admin.version.integrity_save_baseline')
                            )}
                        </Button>
                    )}
                    {!loading && data && (
                        <Button
                            type='button'
                            variant='outline'
                            className='w-full sm:w-auto'
                            onClick={() => void copyToClipboard(JSON.stringify(data, null, 2), t)}
                        >
                            {t('admin.version.integrity_copy_report')}
                        </Button>
                    )}
                    <Button
                        type='button'
                        variant='outline'
                        className='w-full sm:w-auto'
                        onClick={() => onOpenChange(false)}
                    >
                        {t('common.close')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
