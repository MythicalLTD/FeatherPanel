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
import { PickerSheet } from '@/components/ui/picker-sheet';
import { Plug, Search as SearchIcon, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AllocationCreateForm, type CreatedAllocationRow } from '@/components/admin/AllocationCreateForm';

export interface PickerAllocation {
    id: number;
    ip: string;
    port: number;
    ip_alias?: string | null;
    notes?: string | null;
    server_id: number | null;
    node_id: number;
}

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
    allocations: PickerAllocation[];
    allocationSearch: string;
    setAllocationSearch: (v: string) => void;
    allocationPagination: AllocationPaginationState | null;
    setAllocationPagination: React.Dispatch<React.SetStateAction<AllocationPaginationState>>;
    fetchAllocations: () => void;
    onSelectAllocation: (allocation: PickerAllocation) => void | Promise<void>;
}

function mapCreatedToAllocation(row: CreatedAllocationRow, nodeId: number): PickerAllocation {
    return {
        id: row.id,
        ip: row.ip,
        port: typeof row.port === 'string' ? parseInt(String(row.port).split('-')[0] || '0', 10) : row.port,
        ip_alias: row.ip_alias ?? undefined,
        notes: row.notes ?? undefined,
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
        <PickerSheet
            open={open}
            onOpenChange={(next) => {
                if (next) setPickerMode('browse');
                onOpenChange(next);
            }}
            title={t('admin.servers.form.select_allocation')}
            description={
                pickerMode === 'browse' ? undefined : t('admin.servers.form.allocation_create_tab_description')
            }
            search={allocationSearch}
            onSearchChange={setAllocationSearch}
            pagination={pickerMode === 'browse' ? pagination : null}
            onPageChange={(page) => setAllocationPagination((p) => ({ ...p, current_page: page }))}
            showBrowseChrome={pickerMode === 'browse'}
            toolbar={
                <div className='border-border/60 bg-muted/30 flex gap-1 rounded-xl border p-1'>
                    <button
                        type='button'
                        onClick={() => setPickerMode('browse')}
                        className={cn(
                            'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
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
                            'inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            pickerMode === 'create'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <Plus className='h-4 w-4' />
                        {t('admin.servers.form.allocation_picker_create')}
                    </button>
                </div>
            }
        >
            {pickerMode === 'create' ? (
                <AllocationCreateForm
                    nodeId={nodeId}
                    onCreated={handleCreated}
                    onCancel={() => setPickerMode('browse')}
                    showFooter
                />
            ) : allocations.length === 0 ? (
                <div className='text-muted-foreground py-8 text-center'>{t('common.no_results')}</div>
            ) : (
                allocations.map((allocation) => (
                    <button
                        key={allocation.id}
                        type='button'
                        onClick={() => {
                            onSelectAllocation(allocation);
                            onOpenChange(false);
                        }}
                        className='border-border/50 hover:border-primary hover:bg-primary/5 w-full cursor-pointer rounded-xl border p-3 text-left transition-all'
                    >
                        <div className='flex items-start gap-3'>
                            <div className='bg-primary/10 mt-0.5 rounded-lg p-2'>
                                <Plug className='text-primary h-5 w-5' />
                            </div>
                            <div className='min-w-0 flex-1'>
                                <div className='font-mono font-semibold'>
                                    {allocation.ip}:{allocation.port}
                                </div>
                                {allocation.ip_alias && (
                                    <div className='text-muted-foreground mt-0.5 text-xs'>{allocation.ip_alias}</div>
                                )}
                                {allocation.notes && (
                                    <div
                                        className='text-muted-foreground mt-0.5 truncate text-xs italic'
                                        title={allocation.notes}
                                    >
                                        {allocation.notes}
                                    </div>
                                )}
                            </div>
                        </div>
                    </button>
                ))
            )}
        </PickerSheet>
    );
}
