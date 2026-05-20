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

import Link from 'next/link';
import { Button } from '@/components/featherui/Button';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { ArchiveRestore, ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';

interface TrashActionToolbarProps {
    serverUuid: string;
    loading: boolean;
    selectedCount: number;
    canUpdate: boolean;
    canDelete: boolean;
    hasEntries: boolean;
    busy: boolean;
    onRefresh: () => void;
    onClearSelection: () => void;
    onRestore: () => void;
    onDeletePermanent: () => void;
    onEmpty: () => void;
}

export function TrashActionToolbar({
    serverUuid,
    loading,
    selectedCount,
    canUpdate,
    canDelete,
    hasEntries,
    busy,
    onRefresh,
    onClearSelection,
    onRestore,
    onDeletePermanent,
    onEmpty,
}: TrashActionToolbarProps) {
    const { t } = useTranslation();
    const hasSelection = selectedCount > 0;

    return (
        <div className='sticky top-0 z-20 pb-4'>
            <div className='flex flex-col gap-4 rounded-xl border border-black/5 bg-white/80 p-2 backdrop-blur-xl transition-all duration-300 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5'>
                {hasSelection ? (
                    <>
                        <div className='flex items-center gap-3 px-2'>
                            <div className='bg-primary/10 text-primary animate-in zoom-in-50 flex h-8 w-8 items-center justify-center rounded-lg duration-300'>
                                <span className='text-xs font-bold'>{selectedCount}</span>
                            </div>
                            <span className='text-muted-foreground xs:inline hidden text-sm font-medium'>
                                {t('files.toolbar.selected')}
                            </span>
                            <div className='bg-border xs:block mx-1 hidden h-4 w-px' />
                            <Button
                                variant='ghost'
                                size='sm'
                                onClick={onClearSelection}
                                className='text-muted-foreground hover:text-foreground h-8 px-3 text-xs font-bold tracking-wider uppercase'
                            >
                                {t('files.toolbar.cancel')}
                            </Button>
                        </div>
                        <div className='no-scrollbar flex items-center gap-1.5 overflow-x-auto pl-2'>
                            {canUpdate && (
                                <Button
                                    variant='secondary'
                                    size='sm'
                                    onClick={onRestore}
                                    disabled={busy}
                                    className='h-9 bg-black/5 px-4 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20'
                                >
                                    <ArchiveRestore className='mr-2 h-4 w-4' />
                                    <span className='hidden sm:inline'>{t('files.trash.restore')}</span>
                                </Button>
                            )}
                            {canDelete && (
                                <Button
                                    variant='secondary'
                                    size='sm'
                                    onClick={onDeletePermanent}
                                    disabled={busy}
                                    className='h-9 bg-red-500/10 px-3 text-red-600 hover:bg-red-500/20 dark:text-red-400'
                                >
                                    <Trash2 className='mr-2 h-4 w-4' />
                                    <span className='hidden sm:inline'>{t('files.trash.delete_permanent')}</span>
                                </Button>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className='flex flex-wrap items-center gap-1.5'>
                            <Button
                                asChild
                                variant='ghost'
                                size='sm'
                                className='text-muted-foreground hover:text-foreground h-9 px-3 hover:bg-black/5 dark:hover:bg-white/5'
                            >
                                <Link href={`/server/${serverUuid}/files`}>
                                    <ArrowLeft className='mr-2 h-4 w-4' />
                                    <span className='xs:inline hidden'>{t('files.trash.back_to_files')}</span>
                                </Link>
                            </Button>
                            <Button
                                variant='ghost'
                                size='sm'
                                onClick={onRefresh}
                                disabled={loading}
                                className='text-muted-foreground hover:text-foreground h-9 px-3 hover:bg-black/5 dark:hover:bg-white/5'
                            >
                                <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                                <span className='xs:inline hidden'>{t('files.toolbar.refresh')}</span>
                            </Button>
                        </div>
                        {canDelete && (
                            <Button
                                variant='secondary'
                                size='sm'
                                onClick={onEmpty}
                                disabled={busy || !hasEntries}
                                className='h-9 bg-red-500/10 px-3 text-red-600 hover:bg-red-500/20 dark:text-red-400'
                            >
                                <Trash2 className='mr-2 h-4 w-4' />
                                {t('files.trash.empty_all')}
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
