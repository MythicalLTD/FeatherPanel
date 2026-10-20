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

import { useEffect, useState } from 'react';
import axios from 'axios';
import { ScrollText, Search, Download, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/TranslationContext';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { formatDateInTz } from '@/lib/dateUtils';
import { PageHeader } from '@/components/featherui/PageHeader';
import { DataTable } from '@/components/featherui/DataTable';
import { ListEmptyState } from '@/components/featherui/ListEmptyState';
import { TableSkeleton } from '@/components/featherui/TableSkeleton';
import { ListPagination } from '@/components/featherui/ListPagination';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Select } from '@/components/ui/select-native';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Sensitive } from '@/components/common/Sensitive';
import { usePersistedListFilters } from '@/hooks/usePersistedListFilters';

interface AuditEntry {
    id: number;
    user_uuid: string;
    name: string;
    context: string | null;
    ip_address: string | null;
    created_at: string;
    target: string;
    username: string | null;
    email: string | null;
    avatar: string | null;
}

const FILTERS_KEY = 'featherpanel_admin_audit_log_filters_v1';
const FILTER_DEFAULTS = { search: '', user: '', action: '', target: '', from: '', to: '', page: 1 };
const PAGE_SIZE = 25;

export default function AuditLogPage() {
    const { t } = useTranslation();
    const dateOpts = useDateFormatOptions();
    const { filters, patchFilters, hydrated, resetFilters, isFiltered } = usePersistedListFilters(
        FILTERS_KEY,
        FILTER_DEFAULTS,
    );
    const [debounced, setDebounced] = useState({ search: filters.search, user: filters.user });
    const [rows, setRows] = useState<AuditEntry[]>([]);
    const [totalPages, setTotalPages] = useState(0);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [actions, setActions] = useState<{ name: string; total: number }[]>([]);
    const [targets, setTargets] = useState<string[]>([]);
    const [selected, setSelected] = useState<AuditEntry | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced({ search: filters.search, user: filters.user }), 400);
        return () => clearTimeout(timer);
    }, [filters.search, filters.user]);

    useEffect(() => {
        axios
            .get('/api/admin/audit-log/filters')
            .then(({ data }) => {
                setActions(data.data.actions || []);
                setTargets(data.data.targets || []);
            })
            .catch(() => {});
    }, []);

    const params = {
        search: debounced.search || undefined,
        user: debounced.user || undefined,
        action: filters.action || undefined,
        target: filters.target || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
    };
    const paramsKey = JSON.stringify(params);

    useEffect(() => {
        if (!hydrated) return;
        const controller = new AbortController();
        setLoading(true);
        axios
            .get('/api/admin/audit-log', {
                params: { ...JSON.parse(paramsKey), page: filters.page, limit: PAGE_SIZE },
                signal: controller.signal,
            })
            .then(({ data }) => {
                setRows(data.data.items || []);
                setTotal(data.data.pagination?.total_records ?? 0);
                setTotalPages(data.data.pagination?.total_pages ?? 0);
            })
            .catch((error) => {
                if (!axios.isCancel(error)) toast.error(t('admin.audit_log.fetch_failed'));
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [paramsKey, filters.page, hydrated, t]);

    const exportCsv = async () => {
        setExporting(true);
        try {
            const res = await axios.get('/api/admin/audit-log/export', { params, responseType: 'blob' });
            const url = URL.createObjectURL(res.data as Blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error(t('admin.audit_log.export_failed'));
        } finally {
            setExporting(false);
        }
    };

    const targetLabel = (target: string) => t(`admin.audit_log.targets.${target}`);
    const userLabel = (row: AuditEntry) => row.username ?? t('admin.audit_log.deleted_user');

    return (
        <div className='space-y-6'>
            <PageHeader
                title={t('admin.audit_log.title')}
                description={t('admin.audit_log.description')}
                icon={ScrollText}
                actions={
                    <Button onClick={exportCsv} disabled={exporting} className='gap-2'>
                        <Download className='h-4 w-4' />
                        {t('admin.audit_log.export')}
                    </Button>
                }
            />

            <div className='fp-surface grid gap-3 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-6'>
                <div className='group relative sm:col-span-2'>
                    <Search className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
                    <Input
                        placeholder={t('admin.audit_log.search_placeholder')}
                        value={filters.search}
                        onChange={(e) => patchFilters({ search: e.target.value, page: 1 })}
                        className='h-11 w-full pl-10'
                    />
                </div>
                <Input
                    placeholder={t('admin.audit_log.user_placeholder')}
                    value={filters.user}
                    onChange={(e) => patchFilters({ user: e.target.value, page: 1 })}
                    className='h-11 w-full'
                />
                <Select
                    value={filters.action}
                    onChange={(e) => patchFilters({ action: e.target.value, page: 1 })}
                    className='h-11 w-full rounded-xl'
                    aria-label={t('admin.audit_log.action')}
                >
                    <option value=''>{t('admin.audit_log.all_actions')}</option>
                    {actions.map((a) => (
                        <option key={a.name} value={a.name}>
                            {a.name} ({a.total})
                        </option>
                    ))}
                </Select>
                <Select
                    value={filters.target}
                    onChange={(e) => patchFilters({ target: e.target.value, page: 1 })}
                    className='h-11 w-full rounded-xl'
                    aria-label={t('admin.audit_log.target')}
                >
                    <option value=''>{t('admin.audit_log.all_targets')}</option>
                    {targets.map((target) => (
                        <option key={target} value={target}>
                            {targetLabel(target)}
                        </option>
                    ))}
                </Select>
                <div className='flex items-center gap-2'>
                    <Input
                        type='date'
                        value={filters.from}
                        onChange={(e) => patchFilters({ from: e.target.value, page: 1 })}
                        className='h-11 w-full'
                        aria-label={t('admin.audit_log.from')}
                    />
                    <Input
                        type='date'
                        value={filters.to}
                        onChange={(e) => patchFilters({ to: e.target.value, page: 1 })}
                        className='h-11 w-full'
                        aria-label={t('admin.audit_log.to')}
                    />
                </div>
                <div className='text-muted-foreground flex items-center justify-between gap-2 text-sm sm:col-span-2 lg:col-span-6'>
                    <span className='flex items-center gap-2'>
                        <Filter className='h-4 w-4' />
                        {t('admin.audit_log.total', { count: String(total) })}
                    </span>
                    {isFiltered && (
                        <Button variant='ghost' size='sm' onClick={resetFilters} className='gap-1.5'>
                            <X className='h-4 w-4' />
                            {t('admin.audit_log.clear')}
                        </Button>
                    )}
                </div>
            </div>

            {loading ? (
                <TableSkeleton count={5} />
            ) : rows.length === 0 ? (
                <ListEmptyState
                    icon={ScrollText}
                    title={t('admin.audit_log.empty_title')}
                    description={t('admin.audit_log.empty_description')}
                    filtered={isFiltered}
                    onClearFilters={resetFilters}
                />
            ) : (
                <DataTable
                    rows={rows}
                    rowKey={(row) => row.id}
                    onRowClick={setSelected}
                    columns={[
                        {
                            key: 'when',
                            header: t('admin.audit_log.when'),
                            className: 'text-muted-foreground whitespace-nowrap',
                            cell: (row) => formatDateInTz(row.created_at, dateOpts),
                        },
                        {
                            key: 'user',
                            header: t('admin.audit_log.user'),
                            cell: (row) => <span className='font-medium'>{userLabel(row)}</span>,
                        },
                        {
                            key: 'action',
                            header: t('admin.audit_log.action'),
                            cell: (row) => <code className='text-xs'>{row.name}</code>,
                        },
                        {
                            key: 'target',
                            header: t('admin.audit_log.target'),
                            cell: (row) => (
                                <span className='bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs'>
                                    {targetLabel(row.target)}
                                </span>
                            ),
                        },
                        {
                            key: 'context',
                            header: t('admin.audit_log.context'),
                            className: 'text-muted-foreground max-w-[22rem] truncate',
                            cell: (row) => row.context,
                        },
                        {
                            key: 'ip',
                            header: t('admin.audit_log.ip'),
                            className: 'text-muted-foreground font-mono text-xs',
                            cell: (row) => <Sensitive>{row.ip_address}</Sensitive>,
                        },
                    ]}
                    mobileCard={(row) => (
                        <div className='min-w-0 space-y-1'>
                            <div className='flex items-center justify-between gap-2'>
                                <code className='truncate text-xs'>{row.name}</code>
                                <span className='bg-primary/10 text-primary shrink-0 rounded-md px-2 py-0.5 text-xs'>
                                    {targetLabel(row.target)}
                                </span>
                            </div>
                            <p className='text-muted-foreground truncate text-sm'>{row.context}</p>
                            <p className='text-muted-foreground text-xs'>
                                {userLabel(row)} · {formatDateInTz(row.created_at, dateOpts)}
                            </p>
                        </div>
                    )}
                />
            )}

            {!loading && totalPages > 1 && (
                <ListPagination
                    page={filters.page}
                    totalPages={totalPages}
                    onPageChange={(p) => patchFilters({ page: p })}
                />
            )}

            <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
                <SheetContent side='right'>
                    {selected && (
                        <>
                            <SheetHeader>
                                <SheetTitle>{selected.name}</SheetTitle>
                                <SheetDescription>{formatDateInTz(selected.created_at, dateOpts)}</SheetDescription>
                            </SheetHeader>
                            <dl className='mt-6 space-y-4 text-sm'>
                                {[
                                    [t('admin.audit_log.user'), userLabel(selected)],
                                    [t('admin.audit_log.email'), <Sensitive key='e'>{selected.email}</Sensitive>],
                                    [t('admin.audit_log.user_uuid'), selected.user_uuid],
                                    [t('admin.audit_log.target'), targetLabel(selected.target)],
                                    [t('admin.audit_log.ip'), <Sensitive key='i'>{selected.ip_address}</Sensitive>],
                                    [t('admin.audit_log.event_id'), `#${selected.id}`],
                                ].map(([label, value]) => (
                                    <div key={String(label)} className='fp-surface-inset rounded-xl border p-3'>
                                        <dt className='text-muted-foreground text-xs'>{label}</dt>
                                        <dd className='mt-1 font-mono text-xs break-all'>{value || '-'}</dd>
                                    </div>
                                ))}
                                <div className='fp-surface-inset rounded-xl border p-3'>
                                    <dt className='text-muted-foreground text-xs'>{t('admin.audit_log.context')}</dt>
                                    <dd className='mt-1 text-sm break-words whitespace-pre-wrap'>
                                        {selected.context || '-'}
                                    </dd>
                                </div>
                            </dl>
                            <Button
                                variant='outline'
                                className='mt-4 w-full'
                                onClick={() => {
                                    patchFilters({ user: selected.user_uuid, page: 1 });
                                    setSelected(null);
                                }}
                            >
                                {t('admin.audit_log.filter_user')}
                            </Button>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
