/*
 * Allocation picker for server create: browse free allocations on a node or create new (same wizard as node page).
 *
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

'use client';

import { useState } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Plug, Search as SearchIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AllocationCreateForm, type CreatedAllocationRow } from '@/components/admin/AllocationCreateForm';
import type { Allocation } from '@/app/(app)/admin/servers/create/types';

export interface AllocationPaginationState {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}

interface AllocationPickerSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    nodeId: number;
    allocations: Allocation[];
    allocationSearch: string;
    setAllocationSearch: (v: string) => void;
    allocationPagination: AllocationPaginationState | null;
    setAllocationPagination: React.Dispatch<React.SetStateAction<AllocationPaginationState>>;
    fetchAllocations: () => void;
    onSelectAllocation: (allocation: Allocation) => void;
}

function mapCreatedToAllocation(row: CreatedAllocationRow, nodeId: number): Allocation {
    return {
        id: row.id,
        ip: row.ip,
        port: typeof row.port === 'string' ? parseInt(String(row.port).split('-')[0] || '0', 10) : row.port,
        ip_alias: row.ip_alias ?? undefined,
        server_id: row.server_id ?? null,
        node_id: row.node_id ?? nodeId,
    };
}

export function AllocationPickerSheet({
    open,
    onOpenChange,
    nodeId,
    allocations,
    allocationSearch,
    setAllocationSearch,
    allocationPagination,
    setAllocationPagination,
    fetchAllocations,
    onSelectAllocation,
}: AllocationPickerSheetProps) {
    const { t } = useTranslation();
    const [pickerMode, setPickerMode] = useState<'browse' | 'create'>('browse');

    const handleCreated = (created: CreatedAllocationRow[]) => {
        if (!created.length) return;
        if (created.length > 1) {
            toast.info(t('admin.servers.form.allocation_created_multiple_hint', { count: String(created.length) }));
        }
        const first = created[0];
        onSelectAllocation(mapCreatedToAllocation(first, nodeId));
        setPickerMode('browse');
        onOpenChange(false);
        fetchAllocations();
    };

    const pagination = allocationPagination;

    return (
        <Sheet
            open={open}
            onOpenChange={(next) => {
                if (next) setPickerMode('browse');
                onOpenChange(next);
            }}
        >
            <SheetContent className='sm:max-w-2xl overflow-y-auto'>
                <SheetHeader>
                    <SheetTitle>{t('admin.servers.form.select_allocation')}</SheetTitle>
                    <SheetDescription>
                        {pickerMode === 'browse'
                            ? pagination
                                ? t('common.showing', {
                                      from: String((pagination.current_page - 1) * pagination.per_page + 1),
                                      to: String(
                                          Math.min(
                                              pagination.current_page * pagination.per_page,
                                              pagination.total_records,
                                          ),
                                      ),
                                      total: String(pagination.total_records),
                                  })
                                : t('common.select_an_option')
                            : t('admin.servers.form.allocation_create_tab_description')}
                    </SheetDescription>
                </SheetHeader>

                <div className='mt-6 space-y-4'>
                    <div className='flex rounded-xl border border-border/60 p-1 bg-muted/30 gap-1'>
                        <button
                            type='button'
                            onClick={() => setPickerMode('browse')}
                            className={cn(
                                'flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                pickerMode === 'browse'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <SearchIcon className='h-4 w-4' />
                            {t('admin.servers.form.allocation_picker_existing')}
                        </button>
                        <button
                            type='button'
                            onClick={() => setPickerMode('create')}
                            className={cn(
                                'flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                pickerMode === 'create'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Plus className='h-4 w-4' />
                            {t('admin.servers.form.allocation_picker_create')}
                        </button>
                    </div>

                    {pickerMode === 'create' ? (
                        <AllocationCreateForm
                            nodeId={nodeId}
                            onCreated={handleCreated}
                            onCancel={() => setPickerMode('browse')}
                            showFooter
                        />
                    ) : (
                        <>
                            <div className='relative group'>
                                <SearchIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                                <Input
                                    placeholder={t('common.search')}
                                    value={allocationSearch}
                                    onChange={(e) => setAllocationSearch(e.target.value)}
                                    className='pl-10'
                                />
                            </div>

                            {pagination && pagination.total_pages > 1 && (
                                <div className='flex items-center justify-between gap-2 py-2 px-3 rounded-lg border border-border bg-muted/30'>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        disabled={!pagination.has_prev}
                                        onClick={() =>
                                            setAllocationPagination((p) => ({
                                                ...p,
                                                current_page: p.current_page - 1,
                                            }))
                                        }
                                        className='gap-1 h-8'
                                    >
                                        <ChevronLeft className='h-3 w-3' />
                                        {t('common.previous')}
                                    </Button>
                                    <span className='text-xs font-medium'>
                                        {pagination.current_page} / {pagination.total_pages}
                                    </span>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        disabled={!pagination.has_next}
                                        onClick={() =>
                                            setAllocationPagination((p) => ({
                                                ...p,
                                                current_page: p.current_page + 1,
                                            }))
                                        }
                                        className='gap-1 h-8'
                                    >
                                        {t('common.next')}
                                        <ChevronRight className='h-3 w-3' />
                                    </Button>
                                </div>
                            )}

                            <div className='space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto'>
                                {allocations.length === 0 ? (
                                    <div className='text-center py-8 text-muted-foreground'>
                                        {t('common.no_results')}
                                    </div>
                                ) : (
                                    allocations.map((allocation) => (
                                        <button
                                            key={allocation.id}
                                            type='button'
                                            onClick={() => {
                                                onSelectAllocation(allocation);
                                                onOpenChange(false);
                                            }}
                                            className='w-full p-3 rounded-xl border border-border/50 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all text-left'
                                        >
                                            <div className='flex items-start gap-3'>
                                                <div className='p-2 bg-primary/10 rounded-lg mt-0.5'>
                                                    <Plug className='h-5 w-5 text-primary' />
                                                </div>
                                                <div className='flex-1 min-w-0'>
                                                    <div className='font-semibold font-mono'>
                                                        {allocation.ip}:{allocation.port}
                                                    </div>
                                                    {allocation.ip_alias && (
                                                        <div className='text-xs text-muted-foreground mt-0.5'>
                                                            {allocation.ip_alias}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>

                            {pagination && pagination.total_pages > 1 && (
                                <div className='flex items-center justify-between pt-4 border-t border-border/50'>
                                    <div className='text-sm text-muted-foreground'>
                                        {t('common.showing', {
                                            from: String((pagination.current_page - 1) * pagination.per_page + 1),
                                            to: String(
                                                Math.min(
                                                    pagination.current_page * pagination.per_page,
                                                    pagination.total_records,
                                                ),
                                            ),
                                            total: String(pagination.total_records),
                                        })}
                                    </div>
                                    <div className='flex gap-2'>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() =>
                                                setAllocationPagination((p) => ({
                                                    ...p,
                                                    current_page: p.current_page - 1,
                                                }))
                                            }
                                            disabled={!pagination.has_prev}
                                        >
                                            <ChevronLeft className='h-4 w-4 mr-2' />
                                            {t('common.previous')}
                                        </Button>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() =>
                                                setAllocationPagination((p) => ({
                                                    ...p,
                                                    current_page: p.current_page + 1,
                                                }))
                                            }
                                            disabled={!pagination.has_next}
                                        >
                                            {t('common.next')}
                                            <ChevronRight className='h-4 w-4 ml-2' />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
