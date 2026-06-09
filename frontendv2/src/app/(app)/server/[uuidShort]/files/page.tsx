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

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFileManager } from '@/hooks/useFileManager';
import { useServerPermissions } from '@/hooks/useServerPermissions';
import { usePluginWidgets } from '@/hooks/usePluginWidgets';
import { PageHeader } from '@/components/featherui/PageHeader';
import { FileActionToolbar } from './components/FileActionToolbar';
import { FileBreadcrumbs } from './components/FileBreadcrumbs';
import { FileList } from './components/FileList';
import { WidgetRenderer } from '@/components/server/WidgetRenderer';
import {
    CreateFolderDialog,
    CreateFileDialog,
    DeleteDialog,
    EmptyTrashDialog,
    RenameDialog,
    ImagePreviewDialog,
    PermissionsDialog,
    MoveCopyDialog,
    PullFileDialog,
    WipeAllDialog,
    IgnoredContentDialog,
    CompressDialog,
    FileHashDialog,
    ArchiveBrowsePanel,
} from './components/dialogs';
import { useTranslation } from '@/contexts/TranslationContext';
import { useSettings } from '@/contexts/SettingsContext';
import { isEnabled } from '@/lib/utils';
import { toast } from 'sonner';
import { filesApi, ARCHIVE_EXTRACT_DRAG_MIME } from '@/lib/files-api';
import { isBinaryLikeFileName } from '@/lib/binary-like-file-names';
import { FileObject } from '@/types/server';
import {
    createTrashFolderEntry,
    FEATHER_TRASH_DIR,
    filterSelectableFiles,
    isTrashShortcut,
    trashStatsFromList,
    type TrashFolderStats,
} from '@/lib/feather-trash';
import { Download, X, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import React, { use } from 'react';
import { Button } from '@/components/featherui/Button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type FileWithPath = { file: File; relativePath: string };

const DRAG_MIME = 'application/x-featherpanel-files';

function normalizePath(p: string): string {
    const withLeading = p.startsWith('/') ? p : `/${p}`;
    const collapsed = withLeading.replace(/\/+/g, '/');
    return collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed;
}

function joinPath(dir: string, name: string): string {
    return normalizePath(`${dir}/${name}`);
}

function resolveDirectoryTarget(currentDirectory: string, nameOrPath: string): string {
    if (!nameOrPath) return normalizePath(currentDirectory || '/');
    if (nameOrPath.startsWith('/')) return normalizePath(nameOrPath);
    return joinPath(currentDirectory || '/', nameOrPath);
}

/** Server-relative destination for Wings archive/extract (no leading slash; empty = server root). */
function toDestinationRelative(absoluteDir: string): string {
    const n = normalizePath(absoluteDir || '/');
    if (n === '/') return '';
    return n.replace(/^\//, '');
}

async function collectFilesFromDataTransfer(dt: DataTransfer): Promise<FileWithPath[]> {
    const result: FileWithPath[] = [];
    const items = dt.items;
    if (!items?.length) return result;

    const readEntry = async (
        entry: FileSystemFileEntry | FileSystemDirectoryEntry,
        basePath: string,
    ): Promise<void> => {
        if (entry.isFile) {
            const file = await new Promise<File>((resolve, reject) => {
                (entry as FileSystemFileEntry).file(resolve, reject);
            });
            result.push({ file, relativePath: basePath ? `${basePath}/${file.name}` : file.name });
        } else if (entry.isDirectory) {
            const dir = entry as FileSystemDirectoryEntry;
            const reader = dir.createReader();
            const dirName = basePath ? `${basePath}/${dir.name}` : dir.name;

            // `readEntries` may return entries in batches; keep reading until no more entries are returned.
            // See: FileSystemDirectoryReader.readEntries HTML5 File API behavior.

            while (true) {
                const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
                    reader.readEntries(resolve, reject);
                });
                if (!entries.length) {
                    break;
                }
                for (const child of entries) {
                    await readEntry(child as FileSystemFileEntry | FileSystemDirectoryEntry, dirName);
                }
            }
        }
    };

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const entry = item.webkitGetAsEntry?.() ?? null;
        if (entry) {
            await readEntry(entry as FileSystemFileEntry | FileSystemDirectoryEntry, '');
        } else {
            const file = item.getAsFile();
            if (file) result.push({ file, relativePath: file.name });
        }
    }
    return result;
}

type UploadQueueItem = {
    id: string;
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'done' | 'error';
    error?: string;
    targetDirectory: string;
    batchId?: string;
};

let uploadIdCounter = 0;

const generateUploadId = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    uploadIdCounter += 1;
    return `upload-${Date.now()}-${uploadIdCounter}`;
};

export default function ServerFilesPage({ params }: { params: Promise<{ uuidShort: string }> }) {
    const router = useRouter();
    const { uuidShort } = use(params);
    const { t } = useTranslation();
    const { settings } = useSettings();
    const trashEnabled = isEnabled(settings?.file_trash_enabled);

    const {
        files,
        loading,
        error,
        currentDirectory,
        selectedFiles,
        setSelectedFiles,
        activePulls,
        searchQuery,
        setSearchQuery,
        refresh,
        refreshIgnored,
        navigate,
        toggleSelect,
        cancelPull,
    } = useFileManager(uuidShort);

    const { hasPermission } = useServerPermissions(uuidShort);

    const { fetchWidgets, getWidgets } = usePluginWidgets('server-files');

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchWidgets();
        }, 100);
        return () => clearTimeout(timer);
    }, [fetchWidgets]);

    const canRead = hasPermission('file.read');
    const canCreate = hasPermission('file.create');
    const canUpdate = hasPermission('file.update');
    const canDelete = hasPermission('file.delete');
    const canArchive = hasPermission('file.archive');

    const [createFolderOpen, setCreateFolderOpen] = useState(false);
    const [createFileOpen, setCreateFileOpen] = useState(false);
    const [renameOpen, setRenameOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [pullFileOpen, setPullFileOpen] = useState(false);
    const [wipeAllOpen, setWipeAllOpen] = useState(false);
    const [ignoredOpen, setIgnoredOpen] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [moveCopyOpen, setMoveCopyOpen] = useState(false);
    const [permissionsOpen, setPermissionsOpen] = useState(false);
    const [compressOpen, setCompressOpen] = useState(false);
    const [fileHashOpen, setFileHashOpen] = useState(false);
    const [archiveBrowseOpen, setArchiveBrowseOpen] = useState(false);
    const [filesToCompress, setFilesToCompress] = useState<string[]>([]);
    const [moveCopyAction, setMoveCopyAction] = useState<'move' | 'copy'>('move');
    const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
    const uploadProcessingRef = useRef(false);
    const createdDirectoriesRef = useRef<Set<string>>(new Set());

    const [actionFile, setActionFile] = useState<FileObject | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [anchorName, setAnchorName] = useState<string | null>(null);
    const shiftPivotRef = useRef<string | null>(null);
    const [draggingFileNames, setDraggingFileNames] = useState<string[]>([]);
    const [searchFiltersOpen, setSearchFiltersOpen] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<FileObject[] | null>(null);
    const [trashStats, setTrashStats] = useState<TrashFolderStats | null>(null);
    const [emptyTrashOpen, setEmptyTrashOpen] = useState(false);
    const [emptyTrashBusy, setEmptyTrashBusy] = useState(false);
    const [includePattern, setIncludePattern] = useState('');
    const [excludePattern, setExcludePattern] = useState('');
    const [searchCaseInsensitive, setSearchCaseInsensitive] = useState(true);
    const [contentQuery, setContentQuery] = useState('');
    const [contentCaseInsensitive, setContentCaseInsensitive] = useState(true);
    const [maxFileSizeMiB, setMaxFileSizeMiB] = useState(5);
    const [includeOversized, setIncludeOversized] = useState(false);
    const [minSizeBytes, setMinSizeBytes] = useState(0);
    const [maxSizeBytes, setMaxSizeBytes] = useState(0);
    const activeAdvancedFiltersCount = useMemo(() => {
        let count = 0;
        if (includePattern.trim()) count++;
        if (excludePattern.trim()) count++;
        if (contentQuery.trim()) count++;
        if (!searchCaseInsensitive) count++;
        if (!contentCaseInsensitive) count++;
        if (maxFileSizeMiB !== 5) count++;
        if (includeOversized) count++;
        if (minSizeBytes > 0) count++;
        if (maxSizeBytes > 0) count++;
        return count;
    }, [
        includePattern,
        excludePattern,
        contentQuery,
        searchCaseInsensitive,
        contentCaseInsensitive,
        maxFileSizeMiB,
        includeOversized,
        minSizeBytes,
        maxSizeBytes,
    ]);
    const hasAdvancedFilters = activeAdvancedFiltersCount > 0;
    const refreshTrashStats = useCallback(async () => {
        if (!trashEnabled || !uuidShort) return;
        try {
            const data = await filesApi.listTrash(uuidShort);
            setTrashStats(trashStatsFromList(data));
        } catch {
            setTrashStats({ totalSize: 0, lastModified: null, itemCount: 0 });
        }
    }, [trashEnabled, uuidShort]);

    useEffect(() => {
        void refreshTrashStats();
    }, [refreshTrashStats]);

    const baseFiles = searchResults ?? files;
    const visibleFiles = useMemo(() => {
        if (!trashEnabled || searchResults !== null) return baseFiles;
        return [createTrashFolderEntry(trashStats ?? undefined), ...baseFiles];
    }, [baseFiles, trashEnabled, searchResults, trashStats]);
    const selectableFiles = useMemo(() => filterSelectableFiles(visibleFiles), [visibleFiles]);
    const previousDirectoryRef = useRef(currentDirectory || '/');

    const closeArchiveBrowse = useCallback(() => {
        setArchiveBrowseOpen(false);
        setActionFile((file) => (file && archiveBrowseOpen ? null : file));
    }, [archiveBrowseOpen]);

    const handleArchiveBrowseOpenChange = useCallback((open: boolean) => {
        setArchiveBrowseOpen(open);
        if (!open) setActionFile(null);
    }, []);

    const navigateAndCloseArchive = useCallback(
        (path: string) => {
            closeArchiveBrowse();
            navigate(path);
        },
        [closeArchiveBrowse, navigate],
    );

    useEffect(() => {
        const nextDirectory = currentDirectory || '/';
        if (previousDirectoryRef.current !== nextDirectory) {
            previousDirectoryRef.current = nextDirectory;
            closeArchiveBrowse();
        }
    }, [closeArchiveBrowse, currentDirectory]);

    useEffect(() => {
        if (anchorName && !visibleFiles.some((f) => f.name === anchorName)) {
            setAnchorName(null);
            shiftPivotRef.current = null;
        }
    }, [visibleFiles, anchorName]);

    useEffect(() => {
        let cancelled = false;
        if (!hasAdvancedFilters) {
            setSearchResults(null);
            setSearchLoading(false);
            return;
        }

        const timeout = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const results = await filesApi.searchFiles(uuidShort, {
                    directory: currentDirectory || '/',
                    pattern: searchQuery || undefined,
                    include: includePattern || undefined,
                    exclude: excludePattern || undefined,
                    case_insensitive: searchCaseInsensitive,
                    content: contentQuery || undefined,
                    content_case_insensitive: contentCaseInsensitive,
                    min_size: minSizeBytes || undefined,
                    max_size: maxSizeBytes || undefined,
                    max_content_size: Math.max(0, maxFileSizeMiB) * 1024 * 1024,
                    include_oversized: includeOversized,
                });
                if (!cancelled) {
                    setSearchResults(results);
                }
            } catch {
                if (!cancelled) {
                    toast.error(t('files.search.search_failed'));
                    setSearchResults([]);
                }
            } finally {
                if (!cancelled) {
                    setSearchLoading(false);
                }
            }
        }, 250);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
        };
    }, [
        uuidShort,
        currentDirectory,
        searchQuery,
        includePattern,
        excludePattern,
        searchCaseInsensitive,
        contentQuery,
        contentCaseInsensitive,
        minSizeBytes,
        maxSizeBytes,
        maxFileSizeMiB,
        includeOversized,
        hasAdvancedFilters,
        t,
    ]);

    const handleSelectToggle = useCallback(
        (name: string) => {
            const entry = visibleFiles.find((f) => f.name === name);
            if (entry && isTrashShortcut(entry)) return;
            toggleSelect(name);
            setAnchorName(name);
            shiftPivotRef.current = null;
        },
        [toggleSelect, visibleFiles],
    );

    const handleSelectAllToggle = useCallback(() => {
        if (selectableFiles.length === 0) return;
        const selectableNames = selectableFiles.map((f) => f.name);
        const allSelected = selectableNames.length > 0 && selectableNames.every((n) => selectedFiles.includes(n));
        if (allSelected) {
            setSelectedFiles([]);
        } else {
            setSelectedFiles(selectableNames);
        }
        shiftPivotRef.current = null;
    }, [selectableFiles, selectedFiles, setSelectedFiles]);

    const handleModifierClick = useCallback(
        (file: FileObject, event: React.MouseEvent) => {
            if (isTrashShortcut(file)) return;
            const isCtrlLike = event.ctrlKey || event.metaKey;
            const isShift = event.shiftKey;
            const clickedIdx = visibleFiles.findIndex((f) => f.name === file.name);
            if (clickedIdx === -1) return;

            if (isShift) {
                if (!shiftPivotRef.current) {
                    shiftPivotRef.current = anchorName ?? file.name;
                }
                const pivotName = shiftPivotRef.current ?? file.name;
                const pivotIdx = visibleFiles.findIndex((f) => f.name === pivotName);
                const effectivePivotIdx = pivotIdx !== -1 ? pivotIdx : clickedIdx;
                const [s, e] =
                    effectivePivotIdx <= clickedIdx ? [effectivePivotIdx, clickedIdx] : [clickedIdx, effectivePivotIdx];
                const range = visibleFiles
                    .slice(s, e + 1)
                    .filter((f) => !isTrashShortcut(f))
                    .map((f) => f.name);
                if (isCtrlLike) {
                    setSelectedFiles(Array.from(new Set([...selectedFiles, ...range])));
                } else {
                    setSelectedFiles(range);
                }
                setAnchorName(file.name);
            } else if (isCtrlLike) {
                toggleSelect(file.name);
                setAnchorName(file.name);
                shiftPivotRef.current = null;
            }
        },
        [visibleFiles, anchorName, selectedFiles, setSelectedFiles, toggleSelect],
    );

    const performArchiveExtract = useCallback(
        async (payload: { root: string; file: string; entries: string[] }, destinationRelative: string) => {
            const toastId = toast.loading(t('files.messages.archive_members_extracting'));
            try {
                await filesApi.extractArchiveSelection(
                    uuidShort,
                    payload.root,
                    payload.file,
                    destinationRelative,
                    payload.entries,
                );
                toast.success(t('files.messages.archive_members_extracted'), { id: toastId });
                closeArchiveBrowse();
                refresh();
            } catch (error) {
                const err = error as { response?: { data?: { error?: string } } };
                const msg = err.response?.data?.error || t('files.messages.archive_members_extract_failed');
                toast.error(msg, { id: toastId });
            }
        },
        [closeArchiveBrowse, refresh, t, uuidShort],
    );

    const handleRowDragStart = useCallback(
        (file: FileObject, event: React.DragEvent) => {
            if (isTrashShortcut(file)) {
                event.preventDefault();
                return;
            }
            if (!canUpdate) {
                event.preventDefault();
                return;
            }
            const sourceRoot = currentDirectory || '/';
            const willDragMany = selectedFiles.includes(file.name) && selectedFiles.length > 1;
            const namesToDrag = willDragMany ? [...selectedFiles] : [file.name];
            const payload = JSON.stringify({ sourceRoot, files: namesToDrag });
            try {
                event.dataTransfer.setData(DRAG_MIME, payload);
                event.dataTransfer.setData('text/plain', namesToDrag.join('\n'));
            } catch {
                event.preventDefault();
                return;
            }
            event.dataTransfer.effectAllowed = 'move';
            setDraggingFileNames(namesToDrag);
        },
        [canUpdate, currentDirectory, selectedFiles],
    );

    const handleRowDragEnd = useCallback(() => {
        setDraggingFileNames([]);
    }, []);

    const performMoveFiles = useCallback(
        async (sourceRoot: string, destinationDir: string, fileNames: string[]) => {
            if (fileNames.length === 0) return;
            const src = normalizePath(sourceRoot || '/');
            const dest = normalizePath(destinationDir || '/');
            if (src === dest) {
                return;
            }
            for (const name of fileNames) {
                const movingPath = joinPath(src, name);
                if (dest === movingPath || dest.startsWith(`${movingPath}/`)) {
                    toast.error(t('files.messages.move_into_self_error'));
                    return;
                }
            }

            const updates = fileNames.map((name) => ({
                from: joinPath(src, name),
                to: joinPath(dest, name),
            }));
            const toastId = toast.loading(t('files.messages.moving', { count: String(fileNames.length) }));
            try {
                await filesApi.moveFile(uuidShort, '/', updates);
                toast.success(t('files.messages.moved', { count: String(fileNames.length) }), { id: toastId });
                setSelectedFiles([]);
                refresh();
            } catch (error) {
                const err = error as { response?: { data?: { error?: string } } };
                const msg = err.response?.data?.error || t('files.messages.move_error');
                toast.error(msg, { id: toastId });
            }
        },
        [refresh, setSelectedFiles, t, uuidShort],
    );

    const handleDropOnFolder = useCallback(
        (destinationFolder: FileObject, event: React.DragEvent) => {
            try {
                const archiveRaw = event.dataTransfer.getData(ARCHIVE_EXTRACT_DRAG_MIME);
                if (archiveRaw) {
                    if (!canArchive) return;
                    const payload = JSON.parse(archiveRaw) as { root?: string; file?: string; entries?: string[] };
                    if (
                        typeof payload.root !== 'string' ||
                        typeof payload.file !== 'string' ||
                        !Array.isArray(payload.entries) ||
                        payload.entries.length === 0
                    ) {
                        return;
                    }
                    const destAbs = joinPath(currentDirectory || '/', destinationFolder.name);
                    const destRel = toDestinationRelative(destAbs);
                    void performArchiveExtract(
                        { root: payload.root, file: payload.file, entries: payload.entries as string[] },
                        destRel,
                    );
                    return;
                }
                const raw = event.dataTransfer.getData(DRAG_MIME);
                if (!raw) return;
                const payload = JSON.parse(raw) as { sourceRoot?: string; files?: string[] };
                if (!payload.files?.length) return;
                const src = payload.sourceRoot ?? currentDirectory ?? '/';
                const dropBase = currentDirectory ?? '/';
                const dest = joinPath(dropBase, destinationFolder.name);
                performMoveFiles(src, dest, payload.files);
            } catch {
                // ignore malformed payloads
            } finally {
                setDraggingFileNames([]);
            }
        },
        [canArchive, currentDirectory, performArchiveExtract, performMoveFiles],
    );

    const handleDropOnPath = useCallback(
        (destinationPath: string, event: React.DragEvent) => {
            try {
                const archiveRaw = event.dataTransfer.getData(ARCHIVE_EXTRACT_DRAG_MIME);
                if (archiveRaw) {
                    if (!canArchive) return;
                    const payload = JSON.parse(archiveRaw) as { root?: string; file?: string; entries?: string[] };
                    if (
                        typeof payload.root !== 'string' ||
                        typeof payload.file !== 'string' ||
                        !Array.isArray(payload.entries) ||
                        payload.entries.length === 0
                    ) {
                        return;
                    }
                    const destRel = toDestinationRelative(destinationPath);
                    void performArchiveExtract(
                        { root: payload.root, file: payload.file, entries: payload.entries as string[] },
                        destRel,
                    );
                    return;
                }
                const raw = event.dataTransfer.getData(DRAG_MIME);
                if (!raw) return;
                const payload = JSON.parse(raw) as { sourceRoot?: string; files?: string[] };
                if (!payload.files?.length) return;
                const src = payload.sourceRoot ?? currentDirectory ?? '/';
                performMoveFiles(src, destinationPath, payload.files);
            } catch {
                // ignore malformed payloads
            } finally {
                setDraggingFileNames([]);
            }
        },
        [canArchive, currentDirectory, performArchiveExtract, performMoveFiles],
    );

    const handleEmptyTrash = async () => {
        setEmptyTrashBusy(true);
        try {
            await filesApi.emptyTrash(uuidShort);
            toast.success(t('files.trash.messages.emptied'));
            setEmptyTrashOpen(false);
            await refreshTrashStats();
            refresh();
        } catch {
            toast.error(t('files.trash.messages.empty_error'));
        } finally {
            setEmptyTrashBusy(false);
        }
    };

    const handleAction = (action: string, file: FileObject) => {
        if (isTrashShortcut(file)) {
            switch (action) {
                case 'trash-open':
                    router.push(`/server/${uuidShort}/files/trash`);
                    return;
                case 'trash-empty':
                    setEmptyTrashOpen(true);
                    return;
            }
            return;
        }

        const usesSelection =
            selectedFiles.length > 1 &&
            selectedFiles.includes(file.name) &&
            ['delete', 'copy', 'move', 'permissions', 'compress'].includes(action);

        if (usesSelection) {
            setActionFile(null);
        } else {
            setActionFile(file);
            if (!selectedFiles.includes(file.name)) {
                setSelectedFiles([file.name]);
                setAnchorName(file.name);
            }
        }

        switch (action) {
            case 'edit':
                {
                    const editPath = `/server/${uuidShort}/files/edit?file=${encodeURIComponent(
                        file.name,
                    )}&directory=${encodeURIComponent(currentDirectory || '/')}`;
                    router.prefetch(editPath);
                    router.push(editPath);
                }
                break;
            case 'preview':
                setPreviewOpen(true);
                break;
            case 'rename':
                setRenameOpen(true);
                break;
            case 'delete':
                setDeleteOpen(true);
                break;
            case 'download':
                handleDownload(file.name);
                break;
            case 'compress':
                handleCompress(usesSelection ? selectedFiles : [file.name]);
                break;
            case 'decompress':
                handleDecompress(file.name);
                break;
            case 'browse-archive':
                setArchiveBrowseOpen(true);
                break;
            case 'copy':
                setMoveCopyAction('copy');
                setMoveCopyOpen(true);
                break;
            case 'move':
                setMoveCopyAction('move');
                setMoveCopyOpen(true);
                break;
            case 'permissions':
                setPermissionsOpen(true);
                break;
            case 'hash':
                setFileHashOpen(true);
                break;
        }
    };

    const handleDownload = async (filename: string) => {
        try {
            const path = (currentDirectory || '/').endsWith('/')
                ? `${currentDirectory || '/'}${filename}`
                : `${currentDirectory || '/'}/${filename}`;

            const url = `/api/user/servers/${uuidShort}/download-file?path=${encodeURIComponent(path)}`;
            window.open(url, '_blank');
            setActionFile(null);
        } catch {
            toast.error(t('files.messages.failed_download'));
        }
    };

    const handleCompress = (files: string[]) => {
        setFilesToCompress(files);
        setCompressOpen(true);
    };

    const handleDecompress = async (filename: string) => {
        const toastId = toast.loading(t('files.messages.extracting'));
        try {
            await filesApi.decompressFile(uuidShort, currentDirectory || '/', filename);
            toast.success(t('files.messages.extracted'), { id: toastId });
            refresh();
        } catch (error) {
            const err = error as { response?: { data?: { error?: string } } };
            const errorMessage = err.response?.data?.error || t('files.messages.extract_failed');
            toast.error(errorMessage, { id: toastId });
        }
    };

    useEffect(() => {
        const isEditableTarget = (target: EventTarget | null): boolean => {
            if (!(target instanceof HTMLElement)) return false;
            const tag = target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
            if (target.isContentEditable) return true;
            return false;
        };

        const isImage = (name: string) => /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name);
        const isEditableFile = (size: number, name: string) =>
            size < 1024 * 1024 * 5 && !isBinaryLikeFileName(name) && !isImage(name);

        const openFile = (file: FileObject) => {
            if (isTrashShortcut(file)) {
                router.push(`/server/${uuidShort}/files/trash`);
                return;
            }
            if (!file.isFile) {
                const nextDir = resolveDirectoryTarget(currentDirectory || '/', file.name);
                navigateAndCloseArchive(nextDir);
            } else if (isEditableFile(file.size, file.name) && canUpdate) {
                const editPath = `/server/${uuidShort}/files/edit?file=${encodeURIComponent(
                    file.name,
                )}&directory=${encodeURIComponent(currentDirectory || '/')}`;
                router.prefetch(editPath);
                router.push(editPath);
            } else if (isImage(file.name)) {
                setActionFile(file);
                setPreviewOpen(true);
            }
        };

        const moveAnchor = (direction: -1 | 1 | 'start' | 'end', extend: boolean) => {
            if (visibleFiles.length === 0) return;
            const currentIdx = anchorName ? visibleFiles.findIndex((f) => f.name === anchorName) : -1;
            let nextIdx: number;
            if (direction === 'start') {
                nextIdx = 0;
            } else if (direction === 'end') {
                nextIdx = visibleFiles.length - 1;
            } else if (currentIdx === -1) {
                nextIdx = direction === 1 ? 0 : visibleFiles.length - 1;
            } else {
                nextIdx = Math.max(0, Math.min(visibleFiles.length - 1, currentIdx + direction));
            }
            const nextName = visibleFiles[nextIdx].name;

            if (extend) {
                if (!shiftPivotRef.current) {
                    shiftPivotRef.current = anchorName ?? nextName;
                }
                const pivotName = shiftPivotRef.current ?? nextName;
                const pivotIdx = visibleFiles.findIndex((f) => f.name === pivotName);
                const effectivePivotIdx = pivotIdx !== -1 ? pivotIdx : nextIdx;
                const [start, end] =
                    effectivePivotIdx <= nextIdx ? [effectivePivotIdx, nextIdx] : [nextIdx, effectivePivotIdx];
                setSelectedFiles(
                    visibleFiles
                        .slice(start, end + 1)
                        .filter((f) => !isTrashShortcut(f))
                        .map((f) => f.name),
                );
                setAnchorName(nextName);
            } else {
                shiftPivotRef.current = null;
                setSelectedFiles([nextName]);
                setAnchorName(nextName);
            }
        };

        const isAnyOverlayOpen = () => !!document.querySelector('[role="dialog"], [role="alertdialog"], [role="menu"]');

        const handleKeyDown = (e: KeyboardEvent) => {
            const modifier = e.ctrlKey || e.metaKey;

            if (isAnyOverlayOpen()) return;

            if (modifier && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                const searchInput = document.getElementById('file-search-input') as HTMLInputElement;
                if (searchInput) {
                    searchInput.focus();
                }
                return;
            }

            if (isEditableTarget(e.target)) return;

            if (modifier && e.key.toLowerCase() === 'a') {
                if (selectableFiles.length === 0) return;
                e.preventDefault();
                const selectableNames = selectableFiles.map((f) => f.name);
                const allSelected = selectableNames.every((n) => selectedFiles.includes(n));
                if (allSelected) {
                    setSelectedFiles([]);
                } else {
                    setSelectedFiles(selectableNames);
                }
                shiftPivotRef.current = null;
                return;
            }

            if (modifier && e.key.toLowerCase() === 'd') {
                if (!canDelete || selectedFiles.length === 0) return;
                e.preventDefault();
                setActionFile(null);
                setDeleteOpen(true);
                return;
            }

            if (e.key === 'Delete' && !modifier && !e.altKey) {
                if (!canDelete || selectedFiles.length === 0) return;
                e.preventDefault();
                setActionFile(null);
                setDeleteOpen(true);
                return;
            }

            if (e.key === 'F2' && !modifier && !e.shiftKey && !e.altKey) {
                if (!canUpdate || selectedFiles.length !== 1) return;
                e.preventDefault();
                const file = visibleFiles.find((f) => f.name === selectedFiles[0]);
                if (file && isTrashShortcut(file)) return;
                if (file) {
                    setActionFile(file);
                    setRenameOpen(true);
                }
                return;
            }

            if (e.key === 'F5' && !modifier && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                refresh();
                return;
            }

            if (e.key === 'Enter' && !modifier && !e.shiftKey && !e.altKey) {
                if (selectedFiles.length === 0) return;
                e.preventDefault();
                const targetName = anchorName && selectedFiles.includes(anchorName) ? anchorName : selectedFiles[0];
                const file = visibleFiles.find((f) => f.name === targetName);
                if (file) openFile(file);
                return;
            }

            if (e.key === 'Backspace' && !modifier && !e.shiftKey && !e.altKey) {
                const current = currentDirectory || '/';
                if (current === '/' || current === '') return;
                e.preventDefault();
                const parent = current.replace(/\/+$/, '').split('/').slice(0, -1).join('/') || '/';
                navigateAndCloseArchive(parent);
                return;
            }

            if (e.key === 'ArrowDown' && !modifier && !e.altKey) {
                if (visibleFiles.length === 0) return;
                e.preventDefault();
                moveAnchor(1, e.shiftKey);
                return;
            }

            if (e.key === 'ArrowUp' && !modifier && !e.altKey) {
                if (visibleFiles.length === 0) return;
                e.preventDefault();
                moveAnchor(-1, e.shiftKey);
                return;
            }

            if (e.key === 'Home' && !modifier && !e.altKey) {
                if (visibleFiles.length === 0) return;
                e.preventDefault();
                moveAnchor('start', e.shiftKey);
                return;
            }

            if (e.key === 'End' && !modifier && !e.altKey) {
                if (visibleFiles.length === 0) return;
                e.preventDefault();
                moveAnchor('end', e.shiftKey);
                return;
            }

            if (e.key === ' ' && !modifier && !e.shiftKey && !e.altKey) {
                if (!anchorName) return;
                const anchorFile = visibleFiles.find((f) => f.name === anchorName);
                if (anchorFile && isTrashShortcut(anchorFile)) return;
                e.preventDefault();
                toggleSelect(anchorName);
                shiftPivotRef.current = null;
                return;
            }

            if (e.key === 'Escape' && selectedFiles.length > 0) {
                e.preventDefault();
                setSelectedFiles([]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        visibleFiles,
        selectableFiles,
        selectedFiles,
        canDelete,
        canUpdate,
        setSelectedFiles,
        anchorName,
        currentDirectory,
        navigateAndCloseArchive,
        refresh,
        toggleSelect,
        uuidShort,
        router,
    ]);

    const folderInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const el = folderInputRef.current;
        if (el) {
            el.setAttribute('webkitdirectory', 'true');
            el.setAttribute('directory', 'true');
        }
    }, []);

    const handleUploadFiles = () => {
        fileInputRef.current?.click();
    };

    const handleUploadFolders = () => {
        folderInputRef.current?.click();
    };

    const ensureDirectoryExists = React.useCallback(
        async (directory: string) => {
            const normalizeDirectoryPath = (path: string): string => {
                if (!path) return '/';
                if (path === '/') return '/';
                const trimmed = path.replace(/\/+/g, '/').replace(/\/+$/g, '');
                return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
            };

            const target = normalizeDirectoryPath(directory);

            if (target === '/' || createdDirectoriesRef.current.has(target)) {
                return;
            }

            const segments = target.replace(/^\/+|\/+$/g, '').split('/');
            let current = '/';

            for (const segment of segments) {
                const next = current === '/' ? `/${segment}` : `${current}/${segment}`;

                if (!createdDirectoriesRef.current.has(next)) {
                    try {
                        await filesApi.createFolder(uuidShort, current, segment);
                    } catch {
                        // Ignore errors (directory may already exist or creation may fail for other reasons)
                    }
                    createdDirectoriesRef.current.add(next);
                }

                current = next;
            }
        },
        [uuidShort],
    );

    const processUploadQueue = React.useCallback(
        async (queue: UploadQueueItem[], setQueue: React.Dispatch<React.SetStateAction<UploadQueueItem[]>>) => {
            if (uploadProcessingRef.current) return;
            const next = queue.find((u) => u.status === 'pending');
            if (!next) return;

            uploadProcessingRef.current = true;
            setQueue((prev) =>
                prev.map((u) => (u.id === next.id ? { ...u, status: 'uploading' as const, progress: 0 } : u)),
            );

            try {
                await ensureDirectoryExists(next.targetDirectory);

                await filesApi.uploadFile(uuidShort, next.targetDirectory, next.file, (percent) => {
                    setUploadQueue((p) => p.map((u) => (u.id === next.id ? { ...u, progress: percent } : u)));
                });
                setUploadQueue((prev) => {
                    const updated = prev.map((u) =>
                        u.id === next.id ? { ...u, status: 'done' as const, progress: 100 } : u,
                    );
                    // If there are still pending uploads, try to process the next one.
                    if (updated.some((u) => u.status === 'pending')) {
                        processUploadQueue(updated, setUploadQueue);
                    }
                    return updated;
                });
                refresh();
            } catch (error) {
                const message =
                    (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                    t('files.editor.save_error');
                setUploadQueue((prev) => {
                    const updated = prev.map((u) =>
                        u.id === next.id ? { ...u, status: 'error' as const, error: message } : u,
                    );
                    // If there are still pending uploads, try to process the next one.
                    if (updated.some((u) => u.status === 'pending')) {
                        processUploadQueue(updated, setUploadQueue);
                    }
                    return updated;
                });
            } finally {
                uploadProcessingRef.current = false;
            }
        },
        [uuidShort, refresh, t, ensureDirectoryExists],
    );

    const addToUploadQueue = React.useCallback(
        (files: File[]) => {
            const baseDirectory = currentDirectory || '/';

            const normalizeDirectoryPath = (path: string): string => {
                if (!path) return '/';
                if (path === '/') return '/';
                const trimmed = path.replace(/\/+/g, '/').replace(/\/+$/g, '');
                return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
            };

            const joinDirectories = (base: string, relative: string): string => {
                const baseDir = normalizeDirectoryPath(base || '/');
                const cleanRelative = relative.replace(/^\/+|\/+$/g, '');

                if (!cleanRelative) {
                    return baseDir;
                }

                if (baseDir === '/') {
                    return normalizeDirectoryPath(`/${cleanRelative}`);
                }

                return normalizeDirectoryPath(`${baseDir}/${cleanRelative}`);
            };

            const batchId = files.length > 1 ? `batch-${Date.now()}` : undefined;
            const newItems: UploadQueueItem[] = files.map((file) => {
                const fileWithPath = file as File & { webkitRelativePath?: string };
                const relativePath = fileWithPath.webkitRelativePath || '';

                let subDirectory = '';
                if (relativePath && relativePath.includes('/')) {
                    subDirectory = relativePath.substring(0, relativePath.lastIndexOf('/'));
                }

                const targetDirectory = joinDirectories(baseDirectory, subDirectory);

                return {
                    id: generateUploadId(),
                    file,
                    progress: 0,
                    status: 'pending',
                    targetDirectory,
                    batchId,
                };
            });
            setUploadQueue((prev) => {
                const next = [...prev, ...newItems];
                setTimeout(() => processUploadQueue(next, setUploadQueue), 0);
                return next;
            });
        },
        [processUploadQueue, currentDirectory],
    );

    const addToUploadQueueFromDrop = React.useCallback(
        (filesWithPaths: FileWithPath[]) => {
            const baseDirectory = currentDirectory || '/';
            const normalizeDirectoryPath = (path: string): string => {
                if (!path) return '/';
                if (path === '/') return '/';
                const trimmed = path.replace(/\/+/g, '/').replace(/\/+$/g, '');
                return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
            };
            const joinDirectories = (base: string, relative: string): string => {
                const baseDir = normalizeDirectoryPath(base || '/');
                const cleanRelative = relative.replace(/^\/+|\/+$/g, '');
                if (!cleanRelative) return baseDir;
                if (baseDir === '/') return normalizeDirectoryPath(`/${cleanRelative}`);
                return normalizeDirectoryPath(`${baseDir}/${cleanRelative}`);
            };
            const batchId = `batch-${Date.now()}`;
            const newItems: UploadQueueItem[] = filesWithPaths.map(({ file, relativePath }) => {
                let subDirectory = '';
                if (relativePath && relativePath.includes('/')) {
                    subDirectory = relativePath.substring(0, relativePath.lastIndexOf('/'));
                }
                const targetDirectory = joinDirectories(baseDirectory, subDirectory);
                return {
                    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    file,
                    progress: 0,
                    status: 'pending',
                    targetDirectory,
                    batchId,
                };
            });
            setUploadQueue((prev) => {
                const next = [...prev, ...newItems];
                setTimeout(() => processUploadQueue(next, setUploadQueue), 0);
                return next;
            });
        },
        [processUploadQueue, currentDirectory],
    );

    const removeUploadFromQueue = React.useCallback((id: string) => {
        setUploadQueue((prev) => prev.filter((u) => u.id !== id));
    }, []);

    const removeUploadBatch = React.useCallback((batchId: string) => {
        setUploadQueue((prev) => prev.filter((u) => u.batchId !== batchId));
    }, []);

    const clearCompletedUploads = React.useCallback(() => {
        setUploadQueue((prev) => prev.filter((u) => u.status === 'uploading' || u.status === 'pending'));
    }, []);

    const uploadBatches = useMemo(() => {
        const byBatch = new Map<string, UploadQueueItem[]>();
        for (const item of uploadQueue) {
            const key = item.batchId ?? item.id;
            if (!byBatch.has(key)) byBatch.set(key, []);
            byBatch.get(key)!.push(item);
        }
        return Array.from(byBatch.entries()).map(([batchKey, items]) => ({
            batchKey,
            batchId: items[0]?.batchId,
            items,
        }));
    }, [uploadQueue]);

    const uploadFiles = React.useCallback(
        async (files: File[]) => {
            if (files.length) addToUploadQueue(Array.from(files));
        },
        [addToUploadQueue],
    );

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const files = Array.from(e.target.files);
        uploadFiles(files);
        e.target.value = '';
    };

    useEffect(() => {
        const isInternal = (e: DragEvent) => {
            const types = e.dataTransfer?.types;
            if (!types) return false;
            return types.includes(DRAG_MIME) || types.includes(ARCHIVE_EXTRACT_DRAG_MIME);
        };

        const handleDragOver = (e: DragEvent) => {
            if (isInternal(e)) return;
            e.preventDefault();
            if (!e.dataTransfer?.types?.includes('Files')) return;
            setIsDragging(true);
        };
        const handleDragLeave = (e: DragEvent) => {
            if (isInternal(e)) return;
            e.preventDefault();
            if (e.clientX === 0 && e.clientY === 0) {
                setIsDragging(false);
            }
        };
        const handleDrop = async (e: DragEvent) => {
            if (isInternal(e)) return;
            e.preventDefault();
            setIsDragging(false);
            const dt = e.dataTransfer;
            if (!dt) return;
            const filesWithPaths = await collectFilesFromDataTransfer(dt);
            if (filesWithPaths.length) {
                addToUploadQueueFromDrop(filesWithPaths);
            }
        };

        window.addEventListener('dragover', handleDragOver);
        window.addEventListener('dragleave', handleDragLeave);
        window.addEventListener('drop', handleDrop);

        return () => {
            window.removeEventListener('dragover', handleDragOver);
            window.removeEventListener('dragleave', handleDragLeave);
            window.removeEventListener('drop', handleDrop);
        };
    }, [currentDirectory, addToUploadQueueFromDrop]);

    return (
        <div className='relative flex min-h-screen flex-col gap-6 pb-20'>
            <WidgetRenderer widgets={getWidgets('server-files', 'top-of-page')} />
            <PageHeader
                title={t('files.title')}
                description={t('files.manage_description', { directory: currentDirectory || '/' })}
            />
            <WidgetRenderer widgets={getWidgets('server-files', 'after-header')} />

            <div className='flex flex-col gap-4'>
                <div className='flex flex-col gap-4 rounded-xl border border-black/5 bg-white/80 p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/5'>
                    <FileBreadcrumbs
                        currentDirectory={currentDirectory || '/'}
                        onNavigate={navigate}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onDropFilesToPath={canUpdate || canArchive ? handleDropOnPath : undefined}
                        onToggleFilters={() => setSearchFiltersOpen(true)}
                        activeFiltersCount={activeAdvancedFiltersCount}
                    />
                </div>
                <WidgetRenderer widgets={getWidgets('server-files', 'after-search-bar')} />

                {error ? (
                    <div className='border-destructive/30 bg-destructive/10 rounded-2xl border p-6'>
                        <div className='mb-2 flex items-center gap-2'>
                            <AlertCircle className='text-destructive h-5 w-5' />
                            <h3 className='text-base font-semibold'>
                                {t('files.messages.wings_connection_unavailable')}
                            </h3>
                        </div>
                        <p className='text-muted-foreground mb-4 text-sm'>{error}</p>
                        <div className='flex items-center gap-2'>
                            <Button variant='default' onClick={refresh}>
                                {t('files.toolbar.refresh')}
                            </Button>
                            <span className='text-muted-foreground text-xs'>{t('files.messages.contact_support')}</span>
                        </div>
                    </div>
                ) : (
                    <>
                        <FileActionToolbar
                            loading={
                                loading || uploadQueue.some((u) => u.status === 'uploading' || u.status === 'pending')
                            }
                            selectedCount={selectedFiles.length}
                            onRefresh={refresh}
                            onCreateFile={() => setCreateFileOpen(true)}
                            onCreateFolder={() => setCreateFolderOpen(true)}
                            onUploadFiles={handleUploadFiles}
                            onUploadFolders={handleUploadFolders}
                            onDeleteSelected={() => {
                                setActionFile(null);
                                setDeleteOpen(true);
                            }}
                            onArchiveSelected={() => handleCompress(selectedFiles)}
                            onClearSelection={() => setSelectedFiles([])}
                            onPullFile={() => setPullFileOpen(true)}
                            onWipeAll={() => setWipeAllOpen(true)}
                            onIgnoredContent={() => setIgnoredOpen(true)}
                            onMoveSelected={() => {
                                setActionFile(null);
                                setMoveCopyAction('move');
                                setMoveCopyOpen(true);
                            }}
                            onCopySelected={() => {
                                setActionFile(null);
                                setMoveCopyAction('copy');
                                setMoveCopyOpen(true);
                            }}
                            onPermissionsSelected={() => {
                                setActionFile(null);
                                setPermissionsOpen(true);
                            }}
                            onOpenInIDE={() => {
                                const idePath = `/server/${uuidShort}/files/ide?directory=${encodeURIComponent(
                                    currentDirectory || '/',
                                )}`;
                                window.open(idePath, '_blank', 'noopener');
                            }}
                            canCreate={canCreate}
                            canDelete={canDelete}
                            currentDirectory={currentDirectory || '/'}
                        />

                        {uploadQueue.length > 0 && (
                            <div className='animate-in slide-in-from-top-4 mb-6 grid grid-cols-1 gap-4 duration-500 md:grid-cols-2 lg:grid-cols-3'>
                                <div className='flex items-center justify-between md:col-span-2 lg:col-span-3'>
                                    <span className='text-primary/80 text-xs font-bold tracking-widest uppercase'>
                                        {uploadQueue.length === 1
                                            ? t('files.toolbar.upload')
                                            : t('files.messages.uploading_files_progress', {
                                                  current: String(uploadQueue.length),
                                                  total: String(uploadQueue.length),
                                              })}
                                    </span>
                                    {uploadQueue.some((u) => u.status === 'done' || u.status === 'error') && (
                                        <Button
                                            variant='ghost'
                                            size='sm'
                                            onClick={clearCompletedUploads}
                                            className='text-muted-foreground hover:text-foreground text-xs'
                                        >
                                            {t('files.toolbar.clear_completed')}
                                        </Button>
                                    )}
                                </div>
                                {uploadBatches.map(({ batchKey, batchId, items }) => {
                                    const isBatch = items.length > 1;
                                    const doneCount = items.filter((u) => u.status === 'done').length;
                                    const uploadingItem = items.find((u) => u.status === 'uploading');
                                    const hasError = items.some((u) => u.status === 'error');
                                    const allDone = doneCount === items.length;
                                    const batchProgress =
                                        items.length > 1
                                            ? Math.round(
                                                  (doneCount * 100 + (uploadingItem ? uploadingItem.progress : 0)) /
                                                      items.length,
                                              )
                                            : (uploadingItem?.progress ?? items[0]?.progress ?? 0);
                                    const currentLabel = items.length > 1 ? doneCount + (uploadingItem ? 1 : 0) : 1;

                                    if (isBatch) {
                                        return (
                                            <div
                                                key={batchKey}
                                                className='group border-primary/20 bg-primary/5 hover:border-primary/40 relative overflow-hidden rounded-2xl border p-4 text-left backdrop-blur-xl transition-all'
                                            >
                                                <div className='from-primary/10 absolute inset-0 bg-linear-to-br via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100' />
                                                <div className='relative flex flex-col gap-3 text-left'>
                                                    <div className='flex items-center justify-between'>
                                                        <div className='flex min-w-0 items-center gap-2'>
                                                            <div className='bg-primary/20 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg'>
                                                                {allDone && (
                                                                    <CheckCircle2 className='h-4 w-4 text-green-500' />
                                                                )}
                                                                {hasError && !allDone && (
                                                                    <AlertCircle className='text-destructive h-4 w-4' />
                                                                )}
                                                                {!allDone && !hasError && (
                                                                    <Upload className='h-4 w-4 animate-pulse' />
                                                                )}
                                                            </div>
                                                            <span className='truncate text-sm font-medium'>
                                                                {allDone
                                                                    ? t('files.messages.upload_folder_complete', {
                                                                          count: String(items.length),
                                                                      })
                                                                    : hasError
                                                                      ? t('files.messages.upload_folder_error')
                                                                      : t('files.messages.uploading_folder')}
                                                            </span>
                                                        </div>
                                                        {batchId && (
                                                            <Button
                                                                variant='ghost'
                                                                size='icon'
                                                                onClick={() => removeUploadBatch(batchId)}
                                                                className='text-muted-foreground h-7 w-7 shrink-0 hover:text-red-500'
                                                            >
                                                                <X className='h-4 w-4' />
                                                            </Button>
                                                        )}
                                                    </div>
                                                    {!allDone && !hasError && (
                                                        <div className='space-y-1.5'>
                                                            <div className='flex justify-between text-[10px] font-bold tracking-tighter text-white/40 uppercase'>
                                                                <span>
                                                                    {t('files.messages.uploading_folder_progress', {
                                                                        current: String(currentLabel),
                                                                        total: String(items.length),
                                                                    })}
                                                                </span>
                                                                <span className='text-primary'>{batchProgress}%</span>
                                                            </div>
                                                            <div className='h-1.5 w-full overflow-hidden rounded-full border border-white/5 bg-white/5'>
                                                                <div
                                                                    className='from-primary to-primary-foreground h-full bg-linear-to-r transition-all duration-300'
                                                                    style={{ width: `${batchProgress}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                    {hasError && !allDone && (
                                                        <p className='text-destructive text-xs'>
                                                            {t('files.messages.upload_folder_error')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }

                                    const item = items[0]!;
                                    return (
                                        <div
                                            key={item.id}
                                            className='group border-primary/20 bg-primary/5 hover:border-primary/40 relative overflow-hidden rounded-2xl border p-4 text-left backdrop-blur-xl transition-all'
                                        >
                                            <div className='from-primary/10 absolute inset-0 bg-linear-to-br via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100' />
                                            <div className='relative flex flex-col gap-3 text-left'>
                                                <div className='flex items-center justify-between'>
                                                    <div className='flex min-w-0 items-center gap-2'>
                                                        <div className='bg-primary/20 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg'>
                                                            {item.status === 'uploading' && (
                                                                <Upload className='h-4 w-4 animate-pulse' />
                                                            )}
                                                            {item.status === 'done' && (
                                                                <CheckCircle2 className='h-4 w-4 text-green-500' />
                                                            )}
                                                            {item.status === 'error' && (
                                                                <AlertCircle className='text-destructive h-4 w-4' />
                                                            )}
                                                            {item.status === 'pending' && (
                                                                <Upload className='text-muted-foreground h-4 w-4' />
                                                            )}
                                                        </div>
                                                        <span
                                                            className='truncate text-sm font-medium'
                                                            title={item.file.name}
                                                        >
                                                            {item.file.name}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        variant='ghost'
                                                        size='icon'
                                                        onClick={() => removeUploadFromQueue(item.id)}
                                                        className='text-muted-foreground h-7 w-7 shrink-0 hover:text-red-500'
                                                    >
                                                        <X className='h-4 w-4' />
                                                    </Button>
                                                </div>
                                                {(item.status === 'uploading' || item.status === 'pending') && (
                                                    <div className='space-y-1.5'>
                                                        <div className='flex justify-between text-[10px] font-bold tracking-tighter text-white/40 uppercase'>
                                                            <span>
                                                                {item.status === 'uploading'
                                                                    ? t('files.messages.uploading', { file: '' })
                                                                    : t('files.toolbar.upload')}
                                                            </span>
                                                            <span className='text-primary'>{item.progress}%</span>
                                                        </div>
                                                        <div className='h-1.5 w-full overflow-hidden rounded-full border border-white/5 bg-white/5'>
                                                            <div
                                                                className='from-primary to-primary-foreground h-full bg-linear-to-r transition-all duration-300'
                                                                style={{ width: `${item.progress}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                {item.status === 'done' && (
                                                    <p className='text-xs text-green-600 dark:text-green-400'>
                                                        {t('files.messages.upload_complete')}
                                                    </p>
                                                )}
                                                {item.status === 'error' && (
                                                    <p className='text-destructive truncate text-xs' title={item.error}>
                                                        {item.error}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {activePulls.length > 0 && (
                            <div className='animate-in slide-in-from-top-4 mb-6 grid grid-cols-1 gap-4 duration-500 md:grid-cols-2 lg:grid-cols-3'>
                                {activePulls.map((pull) => (
                                    <div
                                        key={pull.Identifier}
                                        className='group border-primary/20 bg-primary/5 hover:border-primary/40 relative overflow-hidden rounded-2xl border p-4 text-left backdrop-blur-xl transition-all'
                                    >
                                        <div className='from-primary/10 absolute inset-0 bg-linear-to-br via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100' />
                                        <div className='relative flex flex-col gap-3 text-left'>
                                            <div className='flex items-center justify-between'>
                                                <div className='flex items-center gap-2'>
                                                    <div className='bg-primary/20 text-primary flex h-8 w-8 items-center justify-center rounded-lg'>
                                                        <Download className='h-4 w-4 animate-bounce' />
                                                    </div>
                                                    <span className='text-primary/80 text-xs font-bold tracking-widest uppercase'>
                                                        {t('files.messages.active_pull')}
                                                    </span>
                                                </div>
                                                <Button
                                                    variant='ghost'
                                                    size='icon'
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        cancelPull(pull.Identifier);
                                                    }}
                                                    className='text-muted-foreground h-7 w-7 hover:text-red-500'
                                                >
                                                    <X className='h-4 w-4' />
                                                </Button>
                                            </div>
                                            <div className='space-y-1.5'>
                                                <div className='flex justify-between text-[10px] font-bold tracking-tighter text-white/40 uppercase'>
                                                    <span>
                                                        {t('files.messages.task_id', {
                                                            id: pull.Identifier.slice(0, 8),
                                                        })}
                                                        ...
                                                    </span>
                                                    <span className='text-primary'>{pull.Progress}%</span>
                                                </div>
                                                <div className='h-1.5 w-full overflow-hidden rounded-full border border-white/5 bg-white/5'>
                                                    <div
                                                        className='from-primary to-primary-foreground h-full bg-linear-to-r transition-all duration-500'
                                                        style={{ width: `${pull.Progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <WidgetRenderer widgets={getWidgets('server-files', 'before-files-list')} />

                        <ArchiveBrowsePanel
                            open={archiveBrowseOpen}
                            onOpenChange={handleArchiveBrowseOpenChange}
                            uuid={uuidShort}
                            serverDirectory={currentDirectory || '/'}
                            archiveFileName={actionFile?.name ?? ''}
                            canExtract={canArchive}
                            onExtractEntries={(entries, destinationPath) => {
                                if (!actionFile) return;
                                void performArchiveExtract(
                                    {
                                        root: currentDirectory || '/',
                                        file: actionFile.name,
                                        entries,
                                    },
                                    toDestinationRelative(destinationPath),
                                );
                            }}
                            onExtractComplete={() => {
                                refresh();
                            }}
                        />

                        <FileList
                            files={visibleFiles}
                            loading={loading || searchLoading}
                            selectedFiles={selectedFiles}
                            onSelect={handleSelectToggle}
                            onSelectAll={handleSelectAllToggle}
                            onModifierClick={handleModifierClick}
                            anchorName={anchorName}
                            onNavigate={(name) => {
                                if (name === FEATHER_TRASH_DIR) {
                                    router.push(`/server/${uuidShort}/files/trash`);
                                    return;
                                }
                                navigateAndCloseArchive(resolveDirectoryTarget(currentDirectory || '/', name));
                            }}
                            onAction={handleAction}
                            onRowDragStart={canUpdate ? handleRowDragStart : undefined}
                            onRowDragEnd={canUpdate ? handleRowDragEnd : undefined}
                            onDropFiles={canUpdate || canArchive ? handleDropOnFolder : undefined}
                            draggingFileNames={draggingFileNames}
                            canEdit={canUpdate}
                            canDelete={canDelete}
                            canDownload={canRead}
                            acceptArchiveExtract={canArchive}
                            serverUuid={uuidShort}
                            currentDirectory={currentDirectory || '/'}
                        />

                        <WidgetRenderer widgets={getWidgets('server-files', 'after-files-list')} />
                    </>
                )}
            </div>

            <input type='file' ref={fileInputRef} className='hidden' onChange={handleFileChange} multiple accept='*' />
            <input type='file' ref={folderInputRef} className='hidden' onChange={handleFileChange} />

            {isDragging && (
                <div className='bg-primary/20 border-primary animate-in fade-in zoom-in pointer-events-none fixed inset-0 z-50 flex items-center justify-center border-4 border-dashed backdrop-blur-md duration-300'>
                    <div className='bg-background/80 border-primary/20 flex scale-110 flex-col items-center gap-6 rounded-3xl border p-12'>
                        <div className='bg-primary text-primary-foreground flex h-24 w-24 animate-bounce items-center justify-center rounded-3xl'>
                            <Upload className='h-12 w-12' />
                        </div>
                        <div className='text-center'>
                            <h2 className='mb-2 text-3xl font-bold'>{t('files.messages.drop_to_upload')}</h2>
                            <p className='text-muted-foreground'>
                                {t('files.messages.drop_description')}{' '}
                                <span className='text-primary font-mono'>{currentDirectory || '/'}</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <CreateFolderDialog
                open={createFolderOpen}
                onOpenChange={setCreateFolderOpen}
                uuid={uuidShort}
                root={currentDirectory || '/'}
                onSuccess={refresh}
            />
            <CreateFileDialog
                open={createFileOpen}
                onOpenChange={setCreateFileOpen}
                uuid={uuidShort}
                root={currentDirectory || '/'}
                onSuccess={refresh}
            />
            <RenameDialog
                open={renameOpen}
                onOpenChange={setRenameOpen}
                uuid={uuidShort}
                root={currentDirectory || '/'}
                fileName={actionFile?.name || ''}
                onSuccess={refresh}
            />
            <DeleteDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                uuid={uuidShort}
                root={currentDirectory || '/'}
                files={actionFile ? [actionFile.name] : selectedFiles}
                onSuccess={() => {
                    refresh();
                    void refreshTrashStats();
                    setSelectedFiles([]);
                }}
            />
            <EmptyTrashDialog
                open={emptyTrashOpen}
                onOpenChange={setEmptyTrashOpen}
                onConfirm={handleEmptyTrash}
                loading={emptyTrashBusy}
                disabled={(trashStats?.itemCount ?? 0) === 0}
            />
            <PullFileDialog
                open={pullFileOpen}
                onOpenChange={setPullFileOpen}
                uuid={uuidShort}
                root={currentDirectory || '/'}
                onSuccess={refresh}
            />
            <WipeAllDialog open={wipeAllOpen} onOpenChange={setWipeAllOpen} uuid={uuidShort} onSuccess={refresh} />
            <IgnoredContentDialog
                open={ignoredOpen}
                onOpenChange={setIgnoredOpen}
                uuid={uuidShort}
                onSuccess={() => {
                    refreshIgnored();
                    refresh();
                }}
            />
            <ImagePreviewDialog
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                uuid={uuidShort}
                file={actionFile}
                currentDirectory={currentDirectory || '/'}
                onDownload={handleDownload}
            />
            <MoveCopyDialog
                open={moveCopyOpen}
                onOpenChange={setMoveCopyOpen}
                uuid={uuidShort}
                root={currentDirectory || '/'}
                files={actionFile ? [actionFile.name] : selectedFiles}
                action={moveCopyAction}
                onSuccess={() => {
                    refresh();
                    setSelectedFiles([]);
                }}
            />
            <PermissionsDialog
                open={permissionsOpen}
                onOpenChange={setPermissionsOpen}
                uuid={uuidShort}
                root={currentDirectory || '/'}
                files={actionFile ? [actionFile.name] : selectedFiles}
                onSuccess={() => {
                    refresh();
                    setSelectedFiles([]);
                }}
            />
            <CompressDialog
                open={compressOpen}
                onOpenChange={setCompressOpen}
                serverUuid={uuidShort}
                directory={currentDirectory || '/'}
                files={filesToCompress}
                onSuccess={() => {
                    refresh();
                    setSelectedFiles([]);
                }}
            />
            <FileHashDialog
                open={fileHashOpen}
                onOpenChange={setFileHashOpen}
                uuid={uuidShort}
                path={actionFile ? joinPath(currentDirectory || '/', actionFile.name) : ''}
            />
            <Dialog open={searchFiltersOpen} onOpenChange={setSearchFiltersOpen}>
                <DialogContent className='sm:max-w-4xl'>
                    <DialogHeader>
                        <DialogTitle>{t('files.search.advanced.title')}</DialogTitle>
                        <p className='text-muted-foreground text-sm'>{t('files.search.advanced.subtitle')}</p>
                    </DialogHeader>
                    <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        <div className='space-y-1'>
                            <label className='text-sm font-semibold'>{t('files.search.advanced.include_label')}</label>
                            <input
                                className='w-full rounded-md border border-white/10 bg-black/10 px-3 py-2 text-sm'
                                placeholder={t('files.search.advanced.include_placeholder')}
                                value={includePattern}
                                onChange={(e) => setIncludePattern(e.target.value)}
                            />
                            <p className='text-muted-foreground text-xs'>{t('files.search.advanced.include_help')}</p>
                        </div>
                        <div className='space-y-1'>
                            <label className='text-sm font-semibold'>{t('files.search.advanced.exclude_label')}</label>
                            <input
                                className='w-full rounded-md border border-white/10 bg-black/10 px-3 py-2 text-sm'
                                placeholder={t('files.search.advanced.exclude_placeholder')}
                                value={excludePattern}
                                onChange={(e) => setExcludePattern(e.target.value)}
                            />
                            <p className='text-muted-foreground text-xs'>{t('files.search.advanced.exclude_help')}</p>
                        </div>
                        <div className='space-y-1 md:col-span-2'>
                            <label className='text-sm font-semibold'>
                                {t('files.search.advanced.search_text_label')}
                            </label>
                            <input
                                className='w-full rounded-md border border-white/10 bg-black/10 px-3 py-2 text-sm'
                                placeholder={t('files.search.advanced.search_text_placeholder')}
                                value={contentQuery}
                                onChange={(e) => setContentQuery(e.target.value)}
                            />
                            <p className='text-muted-foreground text-xs'>
                                {t('files.search.advanced.search_text_help')}
                            </p>
                        </div>
                        <div className='space-y-1'>
                            <label className='text-sm font-semibold'>
                                {t('files.search.advanced.max_file_size_label')}
                            </label>
                            <input
                                className='w-full rounded-md border border-white/10 bg-black/10 px-3 py-2 text-sm'
                                type='number'
                                min={0}
                                placeholder={t('files.search.advanced.max_file_size')}
                                value={maxFileSizeMiB}
                                onChange={(e) => setMaxFileSizeMiB(Number(e.target.value || 0))}
                            />
                            <p className='text-muted-foreground text-xs'>
                                {t('files.search.advanced.max_file_size_help')}
                            </p>
                        </div>
                        <div className='space-y-1'>
                            <label className='text-sm font-semibold'>
                                {t('files.search.advanced.file_size_label')}
                            </label>
                            <div className='grid grid-cols-2 gap-2'>
                                <input
                                    className='w-full rounded-md border border-white/10 bg-black/10 px-3 py-2 text-sm'
                                    type='number'
                                    min={0}
                                    placeholder={t('files.search.advanced.minimum_placeholder')}
                                    value={minSizeBytes}
                                    onChange={(e) => setMinSizeBytes(Number(e.target.value || 0))}
                                />
                                <input
                                    className='w-full rounded-md border border-white/10 bg-black/10 px-3 py-2 text-sm'
                                    type='number'
                                    min={0}
                                    placeholder={t('files.search.advanced.maximum_placeholder')}
                                    value={maxSizeBytes}
                                    onChange={(e) => setMaxSizeBytes(Number(e.target.value || 0))}
                                />
                            </div>
                            <p className='text-muted-foreground text-xs'>{t('files.search.advanced.file_size_help')}</p>
                        </div>
                        <div className='grid grid-cols-1 gap-2 md:col-span-2 md:grid-cols-3'>
                            <label className='flex items-center gap-2 text-sm'>
                                <input
                                    type='checkbox'
                                    checked={searchCaseInsensitive}
                                    onChange={(e) => setSearchCaseInsensitive(e.target.checked)}
                                />
                                {t('files.search.advanced.case_insensitive')}
                            </label>
                            <label className='flex items-center gap-2 text-sm'>
                                <input
                                    type='checkbox'
                                    checked={contentCaseInsensitive}
                                    onChange={(e) => setContentCaseInsensitive(e.target.checked)}
                                />
                                {t('files.search.advanced.content_case_insensitive')}
                            </label>
                            <label className='flex items-center gap-2 text-sm'>
                                <input
                                    type='checkbox'
                                    checked={includeOversized}
                                    onChange={(e) => setIncludeOversized(e.target.checked)}
                                />
                                {t('files.search.advanced.include_oversized')}
                            </label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant='ghost'
                            onClick={() => {
                                setIncludePattern('');
                                setExcludePattern('');
                                setSearchCaseInsensitive(true);
                                setContentQuery('');
                                setContentCaseInsensitive(true);
                                setMaxFileSizeMiB(5);
                                setIncludeOversized(false);
                                setMinSizeBytes(0);
                                setMaxSizeBytes(0);
                            }}
                        >
                            {t('files.search.advanced.reset_filters')}
                        </Button>
                        <Button variant='default' onClick={() => setSearchFiltersOpen(false)}>
                            {t('files.search.advanced.apply_filters')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <WidgetRenderer widgets={getWidgets('server-files', 'bottom-of-page')} />
        </div>
    );
}
