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
import { PickerSheet } from '@/components/ui/picker-sheet';
import { Button } from '@/components/featherui/Button';
import { UserCircle, Search as SearchIcon, Plus } from 'lucide-react';
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
        <PickerSheet
            open={open}
            onOpenChange={(next) => {
                if (next) setPickerMode('browse');
                onOpenChange(next);
            }}
            title={t('admin.servers.form.select_owner')}
            description={pickerMode === 'browse' ? undefined : t('admin.servers.form.owner_create_tab_description')}
            search={ownerSearch}
            onSearchChange={setOwnerSearch}
            searchPlaceholder={t('admin.servers.form.search_users')}
            pagination={pickerMode === 'browse' ? pagination : null}
            onPageChange={(page) => setOwnerPagination((p) => ({ ...p, current_page: page }))}
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
                        {t('admin.servers.form.owner_picker_existing')}
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
                        {t('admin.servers.form.owner_picker_create')}
                    </button>
                </div>
            }
        >
            {pickerMode === 'create' ? (
                <OwnerCreateForm onCreated={handleCreated} onCancel={() => setPickerMode('browse')} showFooter />
            ) : owners.length === 0 ? (
                <div className='text-muted-foreground space-y-3 py-8 text-center'>
                    <p>{t('admin.servers.form.no_users_found')}</p>
                    <Button type='button' variant='outline' size='sm' onClick={() => setPickerMode('create')}>
                        <Plus className='mr-2 h-4 w-4' />
                        {t('admin.servers.form.owner_picker_create')}
                    </Button>
                </div>
            ) : (
                owners.map((owner) => (
                    <button
                        key={owner.id}
                        type='button'
                        onClick={() => onSelectOwner(owner)}
                        className='border-border/50 hover:border-primary hover:bg-primary/5 w-full cursor-pointer rounded-xl border p-3 text-left transition-all'
                    >
                        <div className='flex items-start gap-3'>
                            <div className='bg-primary/10 mt-0.5 rounded-lg p-2'>
                                <UserCircle className='text-primary h-5 w-5' />
                            </div>
                            <div className='min-w-0'>
                                <div className='truncate font-semibold'>{owner.username}</div>
                                <div className='text-muted-foreground truncate text-xs'>{owner.email}</div>
                            </div>
                        </div>
                    </button>
                ))
            )}
        </PickerSheet>
    );
}
