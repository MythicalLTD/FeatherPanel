/*
 * Realm picker for admin server create: browse or create a new realm.
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
import { Search as SearchIcon, ChevronLeft, ChevronRight, FolderTree, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RealmCreateForm, type CreatedRealm } from '@/components/admin/RealmCreateForm';
import type { Realm } from '@/app/(app)/admin/servers/create/types';

export interface RealmPickerPaginationState {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}

interface RealmPickerSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    realms: Realm[];
    realmSearch: string;
    setRealmSearch: (v: string) => void;
    realmPagination: RealmPickerPaginationState | null;
    setRealmPagination: React.Dispatch<React.SetStateAction<RealmPickerPaginationState>>;
    fetchRealms: () => void;
    onSelectRealm: (realm: Realm) => void;
}

export function RealmPickerSheet({
    open,
    onOpenChange,
    realms,
    realmSearch,
    setRealmSearch,
    realmPagination,
    setRealmPagination,
    fetchRealms,
    onSelectRealm,
}: RealmPickerSheetProps) {
    const { t } = useTranslation();
    const [pickerMode, setPickerMode] = useState<'browse' | 'create'>('browse');

    const handleCreated = (created: CreatedRealm) => {
        onSelectRealm({ id: created.id, name: created.name });
        setPickerMode('browse');
        fetchRealms();
    };

    const pagination = realmPagination;

    return (
        <Sheet
            open={open}
            onOpenChange={(next) => {
                if (next) setPickerMode('browse');
                onOpenChange(next);
            }}
        >
            <SheetContent className='overflow-y-auto sm:max-w-2xl'>
                <SheetHeader>
                    <SheetTitle>{t('admin.servers.form.select_realm')}</SheetTitle>
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
                            : t('admin.servers.form.realm_create_tab_description')}
                    </SheetDescription>
                </SheetHeader>

                <div className='mt-6 space-y-4'>
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
                            {t('admin.servers.form.realm_picker_existing')}
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
                            {t('admin.servers.form.realm_picker_create')}
                        </button>
                    </div>

                    {pickerMode === 'create' ? (
                        <RealmCreateForm
                            onCreated={handleCreated}
                            onCancel={() => setPickerMode('browse')}
                            showFooter
                        />
                    ) : (
                        <>
                            <div className='group relative'>
                                <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform' />
                                <Input
                                    placeholder={t('common.search')}
                                    value={realmSearch}
                                    onChange={(e) => setRealmSearch(e.target.value)}
                                    className='pl-10'
                                />
                            </div>

                            {pagination && pagination.total_pages > 1 && (
                                <div className='border-border bg-muted/30 flex items-center justify-between gap-2 rounded-lg border px-3 py-2'>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        disabled={!pagination.has_prev}
                                        onClick={() =>
                                            setRealmPagination((p) => ({ ...p, current_page: p.current_page - 1 }))
                                        }
                                        className='h-8 gap-1'
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
                                            setRealmPagination((p) => ({ ...p, current_page: p.current_page + 1 }))
                                        }
                                        className='h-8 gap-1'
                                    >
                                        {t('common.next')}
                                        <ChevronRight className='h-3 w-3' />
                                    </Button>
                                </div>
                            )}

                            <div className='max-h-[calc(100vh-300px)] space-y-2 overflow-y-auto'>
                                {realms.length === 0 ? (
                                    <div className='text-muted-foreground space-y-3 py-8 text-center'>
                                        <p>{t('common.no_results')}</p>
                                        <Button
                                            type='button'
                                            variant='outline'
                                            size='sm'
                                            onClick={() => setPickerMode('create')}
                                        >
                                            <Plus className='mr-2 h-4 w-4' />
                                            {t('admin.servers.form.realm_picker_create')}
                                        </Button>
                                    </div>
                                ) : (
                                    realms.map((realm) => (
                                        <button
                                            key={realm.id}
                                            type='button'
                                            onClick={() => onSelectRealm(realm)}
                                            className='border-border/50 hover:border-primary hover:bg-primary/5 w-full cursor-pointer rounded-xl border p-3 text-left transition-all'
                                        >
                                            <div className='flex items-start gap-3'>
                                                <div className='bg-primary/10 mt-0.5 rounded-lg p-2'>
                                                    <FolderTree className='text-primary h-5 w-5' />
                                                </div>
                                                <div className='font-semibold'>{realm.name}</div>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>

                            {pagination && pagination.total_pages > 1 && (
                                <div className='border-border/50 flex items-center justify-between border-t pt-4'>
                                    <div className='text-muted-foreground text-sm'>
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
                                                setRealmPagination((p) => ({ ...p, current_page: p.current_page - 1 }))
                                            }
                                            disabled={!pagination.has_prev}
                                        >
                                            <ChevronLeft className='mr-2 h-4 w-4' />
                                            {t('common.previous')}
                                        </Button>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() =>
                                                setRealmPagination((p) => ({ ...p, current_page: p.current_page + 1 }))
                                            }
                                            disabled={!pagination.has_next}
                                        >
                                            {t('common.next')}
                                            <ChevronRight className='ml-2 h-4 w-4' />
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
