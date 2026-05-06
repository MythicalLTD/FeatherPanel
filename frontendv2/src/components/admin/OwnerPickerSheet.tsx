/*
 * Owner (user) picker for admin server create: browse or create a new user.
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
import { UserCircle, Search as SearchIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OwnerCreateForm } from '@/components/admin/OwnerCreateForm';
import type { User } from '@/app/(app)/admin/servers/create/types';

export interface OwnerPickerPaginationState {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}

interface OwnerPickerSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    owners: User[];
    ownerSearch: string;
    setOwnerSearch: (v: string) => void;
    ownerPagination: OwnerPickerPaginationState | null;
    setOwnerPagination: React.Dispatch<React.SetStateAction<OwnerPickerPaginationState>>;
    fetchOwners: () => void;
    onSelectOwner: (user: User) => void;
}

export function OwnerPickerSheet({
    open,
    onOpenChange,
    owners,
    ownerSearch,
    setOwnerSearch,
    ownerPagination,
    setOwnerPagination,
    fetchOwners,
    onSelectOwner,
}: OwnerPickerSheetProps) {
    const { t } = useTranslation();
    const [pickerMode, setPickerMode] = useState<'browse' | 'create'>('browse');

    const handleCreated = (user: User) => {
        onSelectOwner(user);
        setPickerMode('browse');
        fetchOwners();
    };

    const pagination = ownerPagination;

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
                    <SheetTitle>{t('admin.servers.form.select_owner')}</SheetTitle>
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
                            : t('admin.servers.form.owner_create_tab_description')}
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
                            {t('admin.servers.form.owner_picker_existing')}
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
                            {t('admin.servers.form.owner_picker_create')}
                        </button>
                    </div>

                    {pickerMode === 'create' ? (
                        <OwnerCreateForm onCreated={handleCreated} onCancel={() => setPickerMode('browse')} showFooter />
                    ) : (
                        <>
                            <div className='relative group'>
                                <SearchIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                                <Input
                                    placeholder={t('admin.servers.form.search_users')}
                                    value={ownerSearch}
                                    onChange={(e) => setOwnerSearch(e.target.value)}
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
                                            setOwnerPagination((p) => ({ ...p, current_page: p.current_page - 1 }))
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
                                            setOwnerPagination((p) => ({ ...p, current_page: p.current_page + 1 }))
                                        }
                                        className='gap-1 h-8'
                                    >
                                        {t('common.next')}
                                        <ChevronRight className='h-3 w-3' />
                                    </Button>
                                </div>
                            )}

                            <div className='space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto'>
                                {owners.length === 0 ? (
                                    <div className='text-center py-8 text-muted-foreground space-y-3'>
                                        <p>{t('admin.servers.form.no_users_found')}</p>
                                        <Button type='button' variant='outline' size='sm' onClick={() => setPickerMode('create')}>
                                            <Plus className='h-4 w-4 mr-2' />
                                            {t('admin.servers.form.owner_picker_create')}
                                        </Button>
                                    </div>
                                ) : (
                                    owners.map((owner) => (
                                        <button
                                            key={owner.id}
                                            type='button'
                                            onClick={() => onSelectOwner(owner)}
                                            className='w-full p-3 rounded-xl border border-border/50 hover:border-primary hover:bg-primary/5 cursor-pointer transition-all text-left'
                                        >
                                            <div className='flex items-start gap-3'>
                                                <div className='p-2 bg-primary/10 rounded-lg mt-0.5'>
                                                    <UserCircle className='h-5 w-5 text-primary' />
                                                </div>
                                                <div className='min-w-0'>
                                                    <div className='font-semibold truncate'>{owner.username}</div>
                                                    <div className='text-xs text-muted-foreground truncate'>{owner.email}</div>
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
                                                setOwnerPagination((p) => ({ ...p, current_page: p.current_page - 1 }))
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
                                                setOwnerPagination((p) => ({ ...p, current_page: p.current_page + 1 }))
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
