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
import { Loader2, FolderOpen, SearchX, UploadCloud } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { formatBytes } from '@/lib/format';

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
    canShare?: boolean;
    canBrowseArchiveFeature?: boolean;
    canDownloadDirectory?: boolean;
    serverUuid: string;
    /** When set, file edit links use this base instead of `/server/{uuid}/files`. */
    filesBasePath?: string;
    currentDirectory: string;
    anchorName?: string | null;
    isSearching?: boolean;
    view?: 'list' | 'grid';
    /** Buttons shown in the empty folder state (upload, new file, new folder). */
    emptyActions?: React.ReactNode;
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
    canShare = true,
    canBrowseArchiveFeature = true,
    canDownloadDirectory = false,
    serverUuid,
    filesBasePath,
    currentDirectory,
    anchorName = null,
    isSearching = false,
    view = 'list',
    emptyActions,
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
            <div className='fp-surface overflow-hidden rounded-xl border' aria-busy='true'>
                <div className='flex items-center gap-2 border-b border-[var(--fp-surface-border)] px-4 py-3'>
                    <Loader2 className='text-primary h-4 w-4 animate-spin' />
                    <span className='text-muted-foreground text-xs'>{t('files.list.loading')}</span>
                </div>
                <div className='divide-y divide-[var(--fp-surface-border)]'>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className='flex min-h-14 items-center gap-3 px-4'>
                            <div className='bg-muted h-4 w-4 animate-pulse rounded' />
                            <div className='bg-muted h-9 w-9 animate-pulse rounded-lg' />
                            <div
                                className='bg-muted h-3.5 animate-pulse rounded'
                                style={{ width: `${30 + ((i * 17) % 40)}%` }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (files.length === 0) {
        return (
            <div className='fp-surface text-muted-foreground flex min-h-[420px] flex-col items-center justify-center gap-6 rounded-xl border border-dashed px-6 py-12'>
                <div className='relative'>
                    <div className='bg-primary/10 absolute inset-0 -z-10 scale-150 rounded-full blur-2xl' aria-hidden />
                    <div className='fp-icon-tile text-primary flex h-28 w-28 items-center justify-center rounded-3xl'>
                        {isSearching ? <SearchX className='h-12 w-12' /> : <FolderOpen className='h-12 w-12' />}
                    </div>
                </div>

                <div className='space-y-2 text-center'>
                    <h3 className='text-foreground text-2xl font-semibold'>
                        {isSearching ? t('files.list.empty_search_title') : t('files.list.empty_title')}
                    </h3>
                    <p className='text-muted-foreground mx-auto max-w-sm text-sm leading-relaxed'>
                        {isSearching ? t('files.list.empty_search_description') : t('files.list.empty_description')}
                    </p>
                </div>
                {!isSearching && emptyActions && (
                    <div className='flex flex-wrap justify-center gap-2'>{emptyActions}</div>
                )}
                {!isSearching && (
                    <p className='text-muted-foreground/80 flex items-center gap-1.5 text-xs'>
                        <UploadCloud className='h-3.5 w-3.5' />
                        {t('files.list.empty_drop_hint')}
                    </p>
                )}
            </div>
        );
    }

    const selectableFiles = filterSelectableFiles(files);
    const selectableNames = selectableFiles.map((f) => f.name);
    const allSelected = selectableNames.length > 0 && selectableNames.every((n) => selectedFiles.includes(n));

    const fileCount = files.filter((f) => f.isFile).length;
    const folderCount = files.filter((f) => !f.isFile && !f.isTrashShortcut).length;
    const totalBytes = files.reduce((sum, f) => sum + (f.isFile ? f.size : 0), 0);
    const footer = (
        <div className='text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t border-[var(--fp-surface-border)] px-4 py-2.5 text-xs'>
            <span>
                {t('files.footer.summary', {
                    folders: String(folderCount),
                    files: String(fileCount),
                    size: formatBytes(totalBytes),
                })}
            </span>
            {selectedFiles.length > 0 && (
                <span className='text-primary'>
                    {t('files.footer.selected', { count: String(selectedFiles.length) })}
                </span>
            )}
        </div>
    );

    return (
        <div className='fp-surface overflow-hidden rounded-xl border'>
            <div className='text-muted-foreground flex items-center gap-3 border-b border-[var(--fp-surface-border)] px-4 py-3 text-xs font-medium'>
                <div className='flex shrink-0 items-center'>
                    <Checkbox
                        checked={allSelected}
                        onCheckedChange={onSelectAll}
                        aria-label={t('files.shortcuts.select_all')}
                        className='border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-colors'
                    />
                </div>
                {view === 'grid' ? (
                    <div className='min-w-0 flex-1 truncate'>{t('files.footer.select_all')}</div>
                ) : (
                    <>
                        <div className='w-9 shrink-0' aria-hidden />
                        <div className='min-w-0 flex-1 truncate'>{t('files.list.header_name')}</div>
                        <div className='hidden w-[5.5rem] shrink-0 text-right sm:block'>
                            {t('files.list.header_size')}
                        </div>
                        <div className='hidden w-[9rem] shrink-0 truncate text-right sm:block'>
                            {t('files.list.header_modified')}
                        </div>
                        <div className='w-9 shrink-0' aria-hidden />
                    </>
                )}
            </div>

            <div
                className={
                    view === 'grid'
                        ? 'grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6'
                        : 'divide-y divide-[var(--fp-surface-border)]'
                }
            >
                {files.map((file) => (
                    <FileRow
                        grid={view === 'grid'}
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
                        canShare={canShare}
                        canBrowseArchiveFeature={canBrowseArchiveFeature}
                        canDownloadDirectory={canDownloadDirectory}
                        serverUuid={serverUuid}
                        filesBasePath={filesBasePath}
                        currentDirectory={currentDirectory}
                    />
                ))}
            </div>
            {footer}
        </div>
    );
}
