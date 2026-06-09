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

import { FileObject } from '@/types/server';
import { filterSelectableFiles } from '@/lib/feather-trash';
import { FileRow } from './FileRow';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, FolderOpen, Sparkles } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface FileListProps {
    files: FileObject[];
    loading: boolean;
    selectedFiles: string[];
    onSelect: (name: string) => void;
    onSelectAll: () => void;
    onModifierClick?: (file: FileObject, event: React.MouseEvent) => void;
    onNavigate: (name: string) => void;
    onAction: (action: string, file: FileObject) => void;
    onRowDragStart?: (file: FileObject, event: React.DragEvent) => void;
    onRowDragEnd?: (file: FileObject, event: React.DragEvent) => void;
    onDropFiles?: (destinationFolder: FileObject, event: React.DragEvent) => void;
    draggingFileNames?: string[];
    canEdit: boolean;
    canDelete: boolean;
    canDownload: boolean;
    acceptArchiveExtract?: boolean;
    serverUuid: string;
    currentDirectory: string;
    anchorName?: string | null;
}

export function FileList({
    files,
    loading,
    selectedFiles,
    onSelect,
    onSelectAll,
    onModifierClick,
    onNavigate,
    onAction,
    onRowDragStart,
    onRowDragEnd,
    onDropFiles,
    draggingFileNames,
    canEdit,
    canDelete,
    canDownload,
    acceptArchiveExtract = false,
    serverUuid,
    currentDirectory,
    anchorName = null,
}: FileListProps) {
    const { t } = useTranslation();

    const handleRowClick = (file: FileObject, event: React.MouseEvent): boolean => {
        const isCtrlLike = event.ctrlKey || event.metaKey;
        const isShift = event.shiftKey;

        if (!isCtrlLike && !isShift) {
            return false;
        }

        event.preventDefault();
        event.stopPropagation();
        onModifierClick?.(file, event);
        return true;
    };

    if (loading && files.length === 0) {
        return (
            <div className='flex h-64 items-center justify-center rounded-xl border border-white/10 bg-black/20 backdrop-blur-sm'>
                <Loader2 className='text-primary h-8 w-8 animate-spin' />
            </div>
        );
    }

    if (files.length === 0) {
        return (
            <div className='text-muted-foreground animate-in fade-in zoom-in-95 group relative flex h-[400px] flex-col items-center justify-center gap-6 overflow-hidden rounded-3xl border border-dashed border-white/10 bg-white/2 backdrop-blur-3xl duration-700'>
                <div className='from-primary/5 absolute inset-0 bg-linear-to-br via-transparent to-transparent opacity-0 transition-opacity duration-1000 group-hover:opacity-100' />

                <div className='relative'>
                    <div className='relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white/20'>
                        <FolderOpen className='h-10 w-10 opacity-40 transition-transform duration-500 group-hover:scale-110' />
                    </div>

                    <div className='bg-primary/20 absolute -top-2 -right-2 h-8 w-8 animate-pulse rounded-full blur-xl' />
                    <div className='bg-primary/10 absolute -bottom-4 -left-4 h-12 w-12 animate-pulse rounded-full blur-2xl delay-700' />
                    <Sparkles className='text-primary/40 absolute -top-6 -left-6 h-6 w-6 animate-bounce delay-300' />
                </div>

                <div className='relative z-10 space-y-2 text-center'>
                    <h3 className='bg-linear-to-br from-white to-white/40 bg-clip-text text-xl font-bold text-transparent'>
                        {t('files.list.empty_title')}
                    </h3>
                    <p className='mx-auto max-w-[280px] text-sm leading-relaxed text-white/40'>
                        {t('files.list.empty_description')}
                    </p>
                </div>
            </div>
        );
    }

    const selectableFiles = filterSelectableFiles(files);
    const selectableNames = selectableFiles.map((f) => f.name);
    const allSelected = selectableNames.length > 0 && selectableNames.every((n) => selectedFiles.includes(n));

    return (
        <div className='overflow-hidden rounded-xl border border-black/5 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-white/5'>
            <div className='text-muted-foreground flex items-center gap-3 border-b border-gray-200 px-4 py-4 text-[10px] font-bold tracking-[0.2em] uppercase dark:border-white/10'>
                <div className='flex shrink-0 items-center'>
                    <Checkbox
                        checked={allSelected}
                        onCheckedChange={onSelectAll}
                        className='border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-colors'
                    />
                </div>
                <div className='w-9 shrink-0' aria-hidden />
                <div className='min-w-0 flex-1 truncate'>{t('files.list.header_name')}</div>
                <div className='hidden w-[5.5rem] shrink-0 text-right sm:block'>{t('files.list.header_size')}</div>
                <div className='hidden w-[9rem] shrink-0 truncate text-right sm:block'>
                    {t('files.list.header_modified')}
                </div>
                <div className='w-9 shrink-0 text-center'>
                    <span className='hidden sm:block'>{t('files.list.header_actions')}</span>
                </div>
            </div>

            <div className='divide-y divide-gray-200 dark:divide-white/5'>
                {files.map((file) => (
                    <FileRow
                        key={file.name}
                        file={file}
                        selected={selectedFiles.includes(file.name)}
                        isAnchor={anchorName === file.name}
                        isDragging={draggingFileNames?.includes(file.name)}
                        onSelect={onSelect}
                        onRowClick={handleRowClick}
                        onNavigate={onNavigate}
                        onAction={onAction}
                        onDragStart={onRowDragStart}
                        onDragEnd={onRowDragEnd}
                        onDropFiles={onDropFiles}
                        canEdit={canEdit}
                        canDelete={canDelete}
                        canDownload={canDownload}
                        acceptArchiveExtract={acceptArchiveExtract}
                        serverUuid={serverUuid}
                        currentDirectory={currentDirectory}
                    />
                ))}
            </div>
        </div>
    );
}
